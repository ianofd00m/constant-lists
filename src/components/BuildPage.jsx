import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import RequireAuth from './RequireAuth';
import CommanderSuggest from './CommanderSuggest';
import { parseMoxfieldList } from '../utils/parseMoxfieldList';

// Parse simple deck list format like "4 Lightning Bolt" or "2 Frostwalk Bastion [MH1] 240"
function parseSimpleDeckList(listText) {
  const lines = listText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const result = [];
  
  for (const line of lines) {
    // Skip headers and dividers
    if (line.includes('MAIN DECK:') || line.includes('TECH IDEAS:') || line.includes('SIDEBOARD:') || 
        line.includes('===') || line.includes('Generated on') || line.includes('Format:') || 
        line.includes('Total:') || line === '') {
      continue;
    }
    
    // Match patterns like:
    // "4 Lightning Bolt"
    // "2 Frostwalk Bastion [MH1] 240"
    // "1 Jorn, God of Winter // Kaldring, the Rimestaff"
    const match = line.match(/^(\d+)\s+(.+?)(?:\s+\[([^\]]+)\]\s+(\S+))?$/);
    if (match) {
      const [, count, name, set, collectorNumber] = match;
      result.push({
        count: parseInt(count, 10),
        name: name.trim(),
        set: set?.trim(),
        collectorNumber: collectorNumber?.trim(),
        foil: false // Default to non-foil
      });
    }
  }
  
  return result;
}

const FORMATS = [
  'Alchemy', 'Alpha 40', 'Archon', 'Australian Highlander', 'Brawl', 'Canadian Highlander', 'Centurion',
  'Commander / EDH', 'Conquest', 'Dandan', 'Duel Commander', 'European Highlander', 'Gladiator',
  'Highlander Gauntlet', 'Historic', 'Legacy', 'Leviathan', 'Modern', 'Oathbreaker', 'Old School',
  'Pauper', 'Pauper EDH', 'Pendragon', 'Penny Dreadful', 'Pioneer', 'PreDH', 'Premodern', 'Primordial',
  'Russian Duel Commander', 'Standard', 'Standard Brawl', 'Timeless', 'Tiny Leaders', 'Value Vintage', 'Vintage', 'None'
];
const IMPORT_OPTIONS = ['Paste List', 'Import File', 'Import from Website'];
const COMMANDER_FORMATS = [
  'Commander / EDH',
  'Brawl',
  'Oathbreaker',
  'Duel Commander',
  'Tiny Leaders',
  'Pauper EDH',
  'Centurion',
  'PreDH',
  'Archon',
  'Conquest',
];

function DeckList({ onCreate }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <button style={{ marginTop: 8 }} onClick={() => { console.log('Create New Deck clicked'); onCreate(); }}>Create New Deck</button>
    </div>
  );
}

const DANDAN_DECKLIST = `4 Accumulated Knowledge\n2 Brainstorm\n10 Dandân\n2 Diminishing Returns\n1 Foil\n2 Halimar Depths\n22 Island\n2 Izzet Boilerworks\n2 Lonely Sandbar\n4 Magical Hack\n8 Memory Lapse\n2 Mental Note\n1 Mind Bend\n1 Miscalculation\n2 Mystic Retrieval\n2 Portent\n2 Ray of Command\n2 Remote Isle\n1 Supplant Form\n4 Telling Time\n2 Temple of Epiphany\n2 Vision Charm`;

function CreateDeckModal({ open, onClose }) {
  console.log('CreateDeckModal rendered, open:', open);
  const [name, setName] = useState('');
  const [format, setFormat] = useState(FORMATS[0]);
  const [importType, setImportType] = useState('');
  const [pastedList, setPastedList] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deckPreview, setDeckPreview] = useState(null);
  const [commander, setCommander] = useState('');
  const nameInputRef = React.useRef();
  const pasteInputRef = React.useRef();
  const websiteInputRef = React.useRef();
  const fileInputRef = React.useRef();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (open) {
      setName('');
      setFormat(FORMATS[0]);
      setImportType('');
      setPastedList('');
      setWebsiteUrl('');
      setFile(null);
      setError('');
      setDeckPreview(null);
      setCommander('');
      setTimeout(() => {
        if (nameInputRef.current) nameInputRef.current.focus();
      }, 100);
    }
  }, [open]);

  React.useEffect(() => {
    if (importType === 'Paste List' && pasteInputRef.current) pasteInputRef.current.focus();
    if (importType === 'Import from Website' && websiteInputRef.current) websiteInputRef.current.focus();
    if (importType === 'Import File' && fileInputRef.current) fileInputRef.current.value = '';
  }, [importType]);

  React.useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  React.useEffect(() => {
    if (format === 'Dandan') {
      setImportType('Paste List');
      setPastedList(DANDAN_DECKLIST);
    }
  }, [format]);

  const handleCreate = async () => {
    setError('');
    setDeckPreview(null);
    if (!name.trim()) {
      setError('Deck name is required');
      return;
    }
    setLoading(true);
    try {
      let res, data;
      const token = localStorage.getItem('token');
      
      // If no import type is selected, create a blank deck using the regular deck API
      if (!importType) {
        let body = { name, format, cards: [] };
        
        // If commander is selected, add it to the cards array with full Scryfall data
        if (commander && COMMANDER_FORMATS.includes(format)) {
          // Send only the commander name as a string for the commander field
          body.commander = typeof commander === 'string' ? commander : commander.name;
          
          // Debug: Log commander data structure
          console.log('🎯 Commander being added to deck:', {
            commanderType: typeof commander,
            commanderName: commander.name || commander,
            hasImageUris: !!(commander.image_uris),
            hasArtCrop: !!(commander.image_uris?.art_crop),
            artCropUrl: commander.image_uris?.art_crop,
            fullCommander: commander
          });
          
          // Also add the commander as a card in the cards array if it's a full object with Scryfall data
          if (typeof commander === 'object' && commander.name) {
            body.cards.push({
              quantity: 1,
              scryfallCard: commander,
              printing: commander.set || 'unknown'
            });
            
            console.log('✅ Commander added to cards array:', {
              quantity: 1,
              scryfallCard: !!commander,
              printing: commander.set || 'unknown',
              hasArtCrop: !!(commander.image_uris?.art_crop)
            });
          }
        }
        
        // DEBUG: Log what's being sent to server
        console.log('[DEBUG] Creating deck with body:', body);
        
        const apiUrl = import.meta.env.VITE_API_URL;
        res = await fetch(`${apiUrl}/api/decks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(body),
          credentials: 'include',
        });
        data = await res.json();
        
        // DEBUG: Log server response
        console.log('[DEBUG] Server response after deck creation:', data);
        console.log('[DEBUG] Server response commander properties:', {
          commander: data.commander,
          commanderNames: data.commanderNames,
          hasCommander: 'commander' in data,
          hasCommanderNames: 'commanderNames' in data,
          allKeys: Object.keys(data)
        });

        // CRITICAL FIX: Server loses commander data during creation, restore from original request
        if (body.commander && !data.commander) {
          console.log('[COMMANDER FIX] Server lost commander data during creation, restoring:', {
            originalCommander: body.commander,
            originalCommanderNames: body.commanderNames,
            serverResponse: data.commander
          });
          
          // Restore commander data that server failed to preserve
          data.commander = body.commander;
          if (body.commanderNames) {
            data.commanderNames = body.commanderNames;
          }
        }
        
        if (!res.ok) throw new Error(data.error || 'Failed to create deck');
        
        // Clear loading state before navigation
        setLoading(false);
        // Close the modal
        onClose();
        // Navigate to the new deck
        if (data._id) {
          navigate(`/decks/${data._id}`);
        }
        return;
      }
      
      // If import type is selected, use the import API
      if (importType === 'Import File') {
        if (!file) {
          setError('Please select a file to import');
          setLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', name);
        formData.append('format', format);
        if (commander && COMMANDER_FORMATS.includes(format)) formData.append('commander', commander);
        const apiUrl = import.meta.env.VITE_API_URL;
        // Use standard deck creation endpoint for file imports too
        res = await fetch(`${apiUrl}/api/decks`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
      } else {
        // Use standard deck creation endpoint with parsed cards
        let body = { name, format };
        if (importType === 'Paste List') {
          // Try to parse as Moxfield/MTG text decklist first
          let parsed = parseMoxfieldList(pastedList);
          if (!parsed || parsed.length === 0) {
            // If Moxfield parsing failed, try simple format parsing
            parsed = parseSimpleDeckList(pastedList);
          }
          if (parsed && parsed.length > 0) {
            body.cards = parsed;
          } else {
            // If all parsing failed, send raw text for server-side parsing
            body.pastedList = pastedList;
          }
        }
        if (importType === 'Import from Website') body.websiteUrl = websiteUrl;
        if (commander && COMMANDER_FORMATS.includes(format)) {
          // Send only the commander name as a string, not the full object
          body.commander = typeof commander === 'string' ? commander : commander.name;
        }
        const apiUrl = import.meta.env.VITE_API_URL;
        // Use standard deck creation endpoint instead of import endpoint
        res = await fetch(`${apiUrl}/api/decks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(body),
          credentials: 'include',
        });
      }
      data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setDeckPreview(data.deck);
      if (data.deck && data.deck._id) {
        // Clear loading state before navigation
        setLoading(false);
        // Close the modal
        onClose();
        navigate(`/decks/${data.deck._id}`);
        return;
      }
    } catch (e) {
      if (
        importType === 'Import from Website' &&
        websiteUrl &&
        /moxfield\.com/.test(websiteUrl) &&
        /moxfield/i.test(e.message)
      ) {
        setError('Automatic import from Moxfield is currently not supported due to site restrictions. Please export your deck as text from Moxfield and upload or paste it here.');
        setImportType('Paste List');
        setTimeout(() => {
          if (pasteInputRef.current) pasteInputRef.current.focus();
        }, 100);
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.35)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
        padding: 28,
        minWidth: 340,
        maxWidth: 420,
        width: '100%',
        position: 'relative',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }} aria-label="Close">×</button>
        <h2 style={{ marginTop: 0, marginBottom: 18 }}>Create New Deck</h2>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Name</label>
          <input
            ref={nameInputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Deck Name"
            required
            style={{ 
              width: '100%', 
              marginBottom: 10, 
              padding: 10, 
              borderRadius: 4, 
              border: '1px solid #ddd',
              backgroundColor: 'white',
              fontSize: '14px',
              color: '#333'
            }}
            maxLength={100}
            title="Deck name can include letters, numbers, spaces, and basic punctuation."
          />
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Format</label>
          <select value={format} onChange={e => setFormat(e.target.value)} style={{ 
            width: '100%', 
            marginBottom: 10, 
            padding: 10, 
            borderRadius: 4, 
            border: '1px solid #ddd',
            backgroundColor: 'white',
            fontSize: '14px',
            color: '#333'
          }}>
            {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        {/* Commander Suggest Field */}
        {COMMANDER_FORMATS.includes(format) && (
          <div style={{ marginBottom: 18 }}>
            <CommanderSuggest value={commander} onChange={setCommander} onSelect={setCommander} />
          </div>
        )}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Deck Import (optional)</label>
          <select value={importType} onChange={e => setImportType(e.target.value)} style={{ 
            width: '100%', 
            marginBottom: 10, 
            padding: 10, 
            borderRadius: 4, 
            border: '1px solid #ddd',
            backgroundColor: 'white',
            fontSize: '14px',
            color: '#333'
          }} disabled={format === 'Dandan'}>
            <option value="">Choose import method here...</option>
            {IMPORT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          {importType === 'Paste List' && (
            format === 'Dandan' ? (
              <textarea
                value={DANDAN_DECKLIST}
                readOnly
                style={{ 
                  width: '100%', 
                  minHeight: 180, 
                  marginBottom: 8, 
                  padding: 10, 
                  borderRadius: 4, 
                  border: '1px solid #ddd', 
                  background: '#f8f8f8', 
                  color: '#333', 
                  fontSize: '14px',
                  fontWeight: 500 
                }}
              />
            ) : (
              <textarea
                ref={pasteInputRef}
                value={pastedList}
                onChange={e => setPastedList(e.target.value)}
                placeholder="Paste your deck list here..."
                style={{ 
                  width: '100%', 
                  minHeight: 80, 
                  marginBottom: 8, 
                  padding: 10, 
                  borderRadius: 4, 
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  color: '#333'
                }}
              />
            )
          )}
          {importType === 'Import File' && (
            <div style={{ marginBottom: 8 }}>
              <label style={{
                display: 'inline-block',
                padding: '8px 16px',
                background: '#eee',
                borderRadius: 4,
                border: '1px solid #bbb',
                color: '#333',
                cursor: 'pointer',
                marginBottom: 8,
                fontWeight: 500
              }}>
                Choose file...
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.dek,.csv,.mwDeck,.cod,.json"
                  onChange={e => setFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </label>
              {file && <span style={{ marginLeft: 10 }}>{file.name}</span>}
              <button
                style={{ width: '100%', padding: 8, borderRadius: 4, background: '#1976d2', color: '#fff', border: 'none', fontWeight: 500, marginTop: 8 }}
                onClick={handleCreate}
                disabled={loading || !file}
              >
                {loading ? 'Importing...' : 'Import from file...'}
              </button>
            </div>
          )}
          {importType === 'Import from Website' && (
            <div style={{ marginBottom: 8 }}>
              <input
                ref={websiteInputRef}
                type="text"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="Paste website link here"
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #bbb', marginBottom: 4 }}
              />
              <div style={{ color: '#888', fontSize: 13 }}>Paste website link here</div>
            </div>
          )}
        </div>
        {error && <div style={{ color: '#c00', background: '#ffeaea', borderRadius: 4, padding: '6px 10px', marginBottom: 10 }}>{error}</div>}
        {deckPreview && (
          <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, marginBottom: 10, maxHeight: 180, overflow: 'auto' }}>
            <b>Deck Preview:</b>
            <pre style={{ fontSize: 13, whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(deckPreview, null, 2)}</pre>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {importType !== 'Import File' && (
            <button onClick={handleCreate} style={{ padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 500 }} disabled={loading}>
              {loading ? 'Importing...' : 'Create'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentDecks({ decks, onSelect }) {
  if (!decks || decks.length === 0) return null;
  const sorted = [...decks].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  const recent = sorted.slice(0, 5);

  // Helper function to get total card count (sum of quantities)
  const getTotalCardCount = (deck) => {
    if (!deck.cards || deck.cards.length === 0) return 0;
    return deck.cards.reduce((total, card) => total + (card.quantity || 1), 0);
  };

  // Helper function to generate art crop URL from card ID
  const getArtCropUrl = (cardId) => {
    if (!cardId || cardId.length < 36) return null;
    return `https://cards.scryfall.io/art_crop/front/${cardId.substring(0, 1)}/${cardId.substring(1, 2)}/${cardId}.jpg`;
  };

  // Helper function to get preview image from deck with specific printing preference
  const getDeckPreviewImage = (deck) => {
    if (!deck.cards || deck.cards.length === 0) return null;
    
    // Priority 0: Check for custom preview image set by user
    if (deck.customPreviewImage) {
      console.log('🖼️ Using custom preview image for deck:', deck.name, deck.customPreviewImage);
      return deck.customPreviewImage;
    }
    
    // Priority 1: Look for commander with specific printing
    const commander = deck.cards.find(cardObj => {
      const typeLine = cardObj.scryfallCard?.type_line || 
                      cardObj.card?.scryfall_json?.type_line || 
                      cardObj.scryfall_json?.type_line || 
                      cardObj.type_line ||
                      cardObj.card?.type_line;
      
      return typeLine && typeLine.toLowerCase().includes('legendary') && 
             typeLine.toLowerCase().includes('creature');
    });
    
    if (commander) {
      // Try to get art_crop from existing data
      const commanderArt = commander?.scryfallCard?.image_uris?.art_crop || 
                          commander?.card?.scryfall_json?.image_uris?.art_crop ||
                          commander?.scryfall_json?.image_uris?.art_crop ||
                          commander?.image_uris?.art_crop ||
                          commander?.card?.image_uris?.art_crop;
      
      if (commanderArt) {
        console.log('🖼️ Found commander art crop from data:', deck.name, commanderArt);
        return commanderArt;
      }
      
      // Fallback: Generate art crop URL from card ID
      const commanderId = commander?.scryfallCard?.id || 
                         commander?.card?.scryfall_json?.id ||
                         commander?.scryfall_json?.id ||
                         commander?.id ||
                         commander?.card?.id;
      
      if (commanderId) {
        const generatedArt = getArtCropUrl(commanderId);
        console.log('🖼️ Generated commander art crop URL for:', deck.name, generatedArt);
        return generatedArt;
      }
    }
    
    // Priority 2: Find any card with existing art_crop data
    const cardWithArt = deck.cards.find(cardObj => {
      const artCrop = cardObj.scryfallCard?.image_uris?.art_crop || 
                     cardObj.card?.scryfall_json?.image_uris?.art_crop ||
                     cardObj.scryfall_json?.image_uris?.art_crop ||
                     cardObj.image_uris?.art_crop ||
                     cardObj.card?.image_uris?.art_crop;
      return !!artCrop;
    });
    
    if (cardWithArt) {
      const artUrl = cardWithArt?.scryfallCard?.image_uris?.art_crop || 
                     cardWithArt?.card?.scryfall_json?.image_uris?.art_crop ||
                     cardWithArt?.scryfall_json?.image_uris?.art_crop ||
                     cardWithArt?.image_uris?.art_crop ||
                     cardWithArt?.card?.image_uris?.art_crop;
      console.log('🖼️ Found card art crop from data:', deck.name, artUrl);
      return artUrl;
    }
    
    // Priority 3: Generate art crop from any card with an ID
    const cardWithId = deck.cards.find(cardObj => {
      const cardId = cardObj.scryfallCard?.id || 
                    cardObj.card?.scryfall_json?.id ||
                    cardObj.scryfall_json?.id ||
                    cardObj.id ||
                    cardObj.card?.id;
      return cardId && cardId.length >= 36;
    });
    
    if (cardWithId) {
      const cardId = cardWithId.scryfallCard?.id || 
                    cardWithId.card?.scryfall_json?.id ||
                    cardWithId.scryfall_json?.id ||
                    cardWithId.id ||
                    cardWithId.card?.id;
      
      const generatedArt = getArtCropUrl(cardId);
      console.log('🖼️ Generated art crop from any card ID for:', deck.name, generatedArt);
      return generatedArt;
    }
    
    return null;
  };

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#333' }}>Recent Decks</h3>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 32, // Larger gap for the bigger cards
        flexWrap: 'nowrap',
        overflowX: 'auto',
        paddingBottom: 20,
        maxWidth: '100vw',
        padding: '16px 2rem 24px 2rem', // More generous padding for larger cards
      }}>
        {recent.map(deck => {
          const previewImage = getDeckPreviewImage(deck);
          return (
            <div
              key={deck._id}
              style={{
                width: 180, // Adjusted to better match art crop aspect ratio
                height: 130, // Better proportions to eliminate white space
                minWidth: 180,
                position: 'relative',
                transition: 'all 0.3s ease',
                transformOrigin: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.08)';
                e.currentTarget.style.zIndex = '10';
                const button = e.currentTarget.querySelector('button');
                if (button) {
                  button.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
                  button.style.border = '3px solid #4CAF50';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.zIndex = '1';
                const button = e.currentTarget.querySelector('button');
                if (button) {
                  button.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                  button.style.border = '2px solid #ddd';
                }
              }}
            >
              <button
                onClick={() => onSelect(deck._id)}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 16, // Larger border radius for more premium look
                  border: '2px solid #ddd',
                  background: previewImage ? 'transparent' : '#f5f5f5',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  position: 'relative',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                }}
              >
              {/* Full-size background image */}
              {previewImage && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: `url(${previewImage})`,
                  backgroundSize: 'cover', // Back to 'cover' to eliminate white space
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  borderRadius: '14px', // Slightly smaller to stay within border
                }}/>
              )}
              
              {/* Gradient overlay for better text readability */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '40%',
                background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
                borderBottomLeftRadius: 14,
                borderBottomRightRadius: 14,
              }}/>
              
              {/* Text overlay with better styling */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                zIndex: 2,
              }}>
                <span style={{ 
                  color: '#fff',
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  maxWidth: '100%',
                  fontSize: '14px',
                  fontWeight: '700',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                  marginBottom: '2px'
                }}>
                  {deck.name}
                </span>
                <span style={{ 
                  color: 'rgba(255,255,255,0.9)', 
                  fontSize: '11px',
                  fontWeight: '500',
                  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                }}>
                  {getTotalCardCount(deck)} cards
                </span>
              </div>
              
              {/* Fallback content when no image */}
              {!previewImage && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: '#666',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  <div style={{ marginBottom: '8px', fontSize: '16px' }}>📋</div>
                  <div style={{ color: '#333', marginBottom: '4px' }}>{deck.name}</div>
                  <div style={{ color: '#666', fontSize: '11px' }}>{getTotalCardCount(deck)} cards</div>
                </div>
              )}
            </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AllDecksTable({ decks, onSelect, refreshDecks }) {
  if (!decks || decks.length === 0) return null;
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    open: false,
    x: 0,
    y: 0,
    deck: null,
  });

  // Helper function to get total card count (sum of quantities)
  const getTotalCardCount = (deck) => {
    if (!deck.cards || deck.cards.length === 0) return 0;
    return deck.cards.reduce((total, card) => total + (card.quantity || 1), 0);
  };

  // Context menu component
  const DeckContextMenu = ({ x, y, onClose, onCopyLink, onDelete, onDuplicate }) => {
    console.log('DeckContextMenu rendering at', { x, y });
    return (
      <div
        style={{
          position: 'fixed',
          top: Math.min(y, window.innerHeight - 200), // Prevent menu from going off-screen
          left: Math.min(x, window.innerWidth - 200),
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10001, // Higher z-index
          minWidth: '150px',
        }}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()} // Prevent click from bubbling
      >
        <button
          onClick={() => {
            console.log('Copy link clicked');
            onCopyLink();
            onClose();
          }}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 12px',
            border: 'none',
            background: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#333',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          Copy Deck Link
        </button>
        <button
          onClick={() => {
            console.log('Duplicate clicked');
            onDuplicate();
            onClose();
          }}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 12px',
            border: 'none',
            background: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#333',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          Duplicate Deck
        </button>
        <hr style={{ margin: '4px 0', border: '0', borderTop: '1px solid #eee' }} />
        <button
          onClick={() => {
            console.log('Delete clicked');
            onDelete();
            onClose();
          }}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 12px',
            border: 'none',
            background: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#dc3545',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#fff5f5'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          Delete Deck
        </button>
      </div>
    );
  };

  // Close context menu when clicking outside
  useEffect(() => {
    if (!contextMenu.open) return;
    console.log('Context menu useEffect triggered, open:', contextMenu.open);
    const close = (e) => {
      console.log('Close event triggered:', e.type);
      setContextMenu({ open: false, x: 0, y: 0, deck: null });
    };
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, [contextMenu.open]);

  const handleDeleteDeck = async (deckId) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/decks/${deckId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
      });

      if (response.ok) {
        console.log('✅ Deck deleted successfully, calling refreshDecks()');
        // Refresh the decks list by triggering a re-fetch (no more page reload!)
        refreshDecks();
        console.log('🔄 refreshDecks() called');
      } else {
        console.error('Failed to delete deck');
        alert('Failed to delete deck. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting deck:', error);
      alert('Error deleting deck. Please try again.');
    }
    setDeleteConfirm(null);
  };

  const handleCopyDeckLink = async (deck) => {
    try {
      const url = window.location.origin + `/decks/${deck._id}`;
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
      console.log('Deck link copied:', url);
    } catch (error) {
      console.error('Failed to copy deck link:', error);
    }
  };

  const handleDuplicateDeck = async (deck) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/decks/${deck._id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh the page to show the new deck
        window.location.reload();
      } else {
        console.error('Failed to duplicate deck');
        alert('Failed to duplicate deck. Please try again.');
      }
    } catch (error) {
      console.error('Error duplicating deck:', error);
      alert('Error duplicating deck. Please try again.');
    }
  };

  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ marginBottom: '1rem', color: '#333' }}>All Decks</h3>
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse', 
        background: '#fafbfc', 
        borderRadius: 8, 
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ textAlign: 'left', padding: '12px' }}>Name</th>
            <th style={{ textAlign: 'left', padding: '12px' }}>Format</th>
            <th style={{ textAlign: 'left', padding: '12px' }}>Cards</th>
            <th style={{ textAlign: 'left', padding: '12px' }}>Last Modified</th>
            <th style={{ padding: '12px', width: '50px' }}></th>
          </tr>
        </thead>
        <tbody>
          {decks.map((deck) => (
            <tr 
              key={deck._id} 
              style={{ 
                borderBottom: '1px solid #eee',
                transition: 'background-color 0.2s ease',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                // Don't trigger if clicking on the delete button
                if (!e.target.closest('.delete-button')) {
                  onSelect(deck._id);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Context menu triggered', { x: e.clientX, y: e.clientY, deck: deck.name });
                setContextMenu({
                  open: true,
                  x: e.clientX,
                  y: e.clientY,
                  deck: deck,
                });
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <td style={{ padding: '8px 12px', fontWeight: 500 }}>{deck.name}</td>
              <td style={{ padding: '8px 12px', color: '#666' }}>{deck.format || '-'}</td>
              <td style={{ padding: '8px 12px', color: '#666' }}>{getTotalCardCount(deck)}</td>
                <td style={{ padding: '8px 12px', color: '#666', fontSize: '13px' }}>
                  {deck.updatedAt ? new Date(deck.updatedAt).toLocaleDateString() : (deck.createdAt ? new Date(deck.createdAt).toLocaleDateString() : '')}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <button 
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(deck._id);
                    }}
                    style={{ 
                      padding: '6px 8px', 
                      borderRadius: 4, 
                      border: 'none', 
                      background: 'transparent',
                      color: '#dc3545',
                      cursor: 'pointer',
                      fontSize: '16px',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#fff5f5';
                      e.target.style.color = '#b02a37';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent';
                      e.target.style.color = '#dc3545';
                    }}
                    title="Delete deck"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 8,
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Delete Deck</h3>
            <p style={{ margin: '0 0 20px 0', color: '#666' }}>
              Are you sure you want to delete "{decks.find(d => d._id === deleteConfirm)?.name}"? 
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 4,
                  border: '1px solid #ccc',
                  background: 'white',
                  color: '#333',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDeck(deleteConfirm)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 4,
                  border: 'none',
                  background: '#dc3545',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.open && (
        <>
          {console.log('Rendering context menu:', contextMenu)}
          <DeckContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu({ open: false, x: 0, y: 0, deck: null })}
            onCopyLink={() => handleCopyDeckLink(contextMenu.deck)}
            onDelete={() => setDeleteConfirm(contextMenu.deck._id)}
            onDuplicate={() => handleDuplicateDeck(contextMenu.deck)}
          />
        </>
      )}
    </div>
  );
}

export default function BuildPage() {
  console.log('BuildPage rendered');
  const [modalOpen, setModalOpen] = useState(false);
  const [decks, setDecks] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  const fetchTimeout = useRef();

  // Function to refresh decks data
  const refreshDecks = useCallback(() => {
    console.log('🚀 refreshDecks called, incrementing refreshKey');
    setRefreshKey(prev => {
      console.log('🔢 refreshKey changed from', prev, 'to', prev + 1);
      return prev + 1;
    });
  }, []);

  // Check for recent deck updates on component mount
  useEffect(() => {
    const lastUpdateTime = localStorage.getItem('deck-updated-timestamp');
    if (lastUpdateTime) {
      const updateTime = parseInt(lastUpdateTime);
      const timeSinceUpdate = Date.now() - updateTime;
      // If update was within the last 2 minutes, refresh immediately
      if (timeSinceUpdate < 2 * 60 * 1000) {
        console.log('Detected recent deck update on mount, refreshing...');
        refreshDecks();
      }
    }
  }, []); // Only run on mount

  // Listen for window focus and visibility changes to refresh decks when returning to the page
  useEffect(() => {
    const handleFocus = () => {
      // Check if decks were updated while away
      const lastUpdateTime = localStorage.getItem('deck-updated-timestamp');
      if (lastUpdateTime) {
        const updateTime = parseInt(lastUpdateTime);
        const timeSinceUpdate = Date.now() - updateTime;
        // If update was within the last 5 minutes, refresh
        if (timeSinceUpdate < 5 * 60 * 1000) {
          console.log('Detected recent deck update, refreshing...');
          refreshDecks();
        }
      }
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleFocus(); // Use the same logic
      }
    };
    
    // Listen for custom events that indicate deck updates
    const handleDeckUpdate = () => {
      refreshDecks();
    };
    
    // Listen for localStorage changes (if user has multiple tabs open)
    const handleStorageChange = (e) => {
      if (e.key === 'deck-updated-timestamp') {
        console.log('Detected deck update from another tab, refreshing...');
        refreshDecks();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('deck-updated', handleDeckUpdate);
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('deck-updated', handleDeckUpdate);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshDecks]);

  useEffect(() => {
    console.log('🔄 useEffect triggered with refreshKey:', refreshKey, 'modalOpen:', modalOpen);
    if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
    fetchTimeout.current = setTimeout(() => {
      const token = localStorage.getItem('token');
      console.log('Fetching /api/decks/mine with token:', token);
      const apiUrl = import.meta.env.VITE_API_URL;
      fetch(`${apiUrl}/api/decks/mine`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
      })
        .then(async r => {
          console.log('🌐 Fetch response received:', r.status, r.statusText);
          if (r.status === 429) {
            console.log('🚫 Rate limited, setting empty decks');
            setDecks([]);
            return;
          }
          try {
            const json = await r.json();
            console.log('✅ JSON parsed successfully:', json);
            return json;
          } catch (error) {
            console.error('❌ JSON parse error:', error);
            return [];
          }
        })
        .catch(error => {
          console.error('🚨 Initial fetch failed:', error);
          console.warn('🔄 Fetch failed, retrying in 500ms:', error.message);
          // Retry once after a brief delay for connection issues
          return new Promise(resolve => {
            setTimeout(() => {
              fetch(`${apiUrl}/api/decks/mine`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                credentials: 'include',
              })
                .then(async r => {
                  try {
                    return await r.json();
                  } catch {
                    return [];
                  }
                })
                .then(resolve)
                .catch(() => {
                  console.warn('🔄 Retry failed, setting empty decks');
                  resolve([]);
                });
            }, 500);
          });
        })
        .then(data => {
          console.log('📥 Fetched deck data:', data);
          if (Array.isArray(data)) {
            console.log('📊 Deck data is array, first deck:', data[0]);
            setDecks(data);
          } else if (data && Array.isArray(data.decks)) {
            console.log('📊 Deck data has .decks property, first deck:', data.decks[0]);
            setDecks(data.decks);
          } else {
            console.log('⚠️ Unexpected deck data format:', data);
            setDecks([]);
          }
        });
    }, 300); // debounce 300ms
    return () => clearTimeout(fetchTimeout.current);
  }, [modalOpen, refreshKey]);
  return (
    <div style={{
      maxWidth: '1400px',
      margin: '2rem auto',
      padding: '0 2rem',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <h1 style={{ 
        textAlign: 'center', 
        fontSize: '2.5rem', 
        fontWeight: 700, 
        marginBottom: '2rem',
        color: '#333' 
      }}>Build</h1>
      <DeckList onCreate={() => setModalOpen(true)} />
      <RecentDecks decks={decks} onSelect={id => navigate(`/decks/${id}`)} />
      <AllDecksTable decks={decks} onSelect={id => navigate(`/decks/${id}`)} refreshDecks={refreshDecks} />
      <CreateDeckModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

// Wrap BuildPage with RequireAuth
export const BuildPageWithAuth = (props) => (
  <RequireAuth>
    <BuildPage {...props} />
  </RequireAuth>
);
