import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { fetchOtagRecommendations } from '../utils/fetchOtagRecommendations';
import { parseMoxfieldList } from '../utils/parseMoxfieldList';

const FORMATS = [
  'Alchemy', 'Alpha 40', 'Archon', 'Australian Highlander', 'Brawl', 'Canadian Highlander', 'Centurion',
  'Commander / EDH', 'Conquest', 'Dandan', 'Duel Commander', 'European Highlander', 'Gladiator',
  'Highlander Gauntlet', 'Historic', 'Legacy', 'Leviathan', 'Modern', 'Oathbreaker', 'Old School',
  'Pauper', 'Pauper EDH', 'Pendragon', 'Penny Dreadful', 'Pioneer', 'PreDH', 'Premodern', 'Primordial',
  'Russian Duel Commander', 'Standard', 'Standard Brawl', 'Timeless', 'Tiny Leaders', 'Value Vintage', 'Vintage', 'None'
];

export default function DeckBuilder() {
  const [name, setName] = useState('');
  const [cards, setCards] = useState([]); // Now array of card objects
  const [loading, setLoading] = useState(false);
  const [otagSuggestions, setOtagSuggestions] = useState([]);
  const [decklistText, setDecklistText] = useState('');
  const [format, setFormat] = useState(FORMATS[0]);

  // Handle manual card field change
  const handleCardChange = (i, field, value) => {
    const newCards = [...cards];
    newCards[i] = { ...newCards[i], [field]: value };
    setCards(newCards);
  };

  const addCard = () => setCards([...cards, { name: '', set: '', collectorNumber: '', count: 1, foil: false }]);
  const removeCard = (i) => setCards(cards.filter((_, idx) => idx !== i));

  // Handle decklist import
  const handleImportDecklist = () => {
    const parsed = parseMoxfieldList(decklistText);
    if (parsed.length === 0) {
      toast.error('No valid cards found in decklist.');
      return;
    }
    setCards(parsed);
    toast.success(`Imported ${parsed.length} cards!`);
  };

  // Helper to fetch otag suggestions for current cards
  const handleGetOtagSuggestions = async () => {
    setLoading(true);
    try {
      // Only send cards with name, set, collectorNumber
      const cardList = cards
        .filter(card => card.name && card.set && card.collectorNumber)
        .map(card => ({
          name: card.name,
          set: card.set,
          collectorNumber: card.collectorNumber,
        }));
      const otags = await fetchOtagRecommendations(cardList);
      setOtagSuggestions(otags);
    } catch (err) {
      toast.error('Failed to fetch otag suggestions');
    }
    setLoading(false);
  };

  // Helper function to check if a card is digital-only
  const isDigitalOnly = async (cardName, cardSet) => {
    try {
      // First check our local cache
      if (window.digitalOnlyCards && window.digitalOnlyCards[`${cardName}-${cardSet}`] !== undefined) {
        return window.digitalOnlyCards[`${cardName}-${cardSet}`];
      }
      
      // If not in cache, fetch from Scryfall
      const encodedName = encodeURIComponent(cardName);
      const encodedSet = encodeURIComponent(cardSet);
      // Scryfall API call, leave as is
      const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodedName}+set:${encodedSet}`);
      const data = await res.json();
      
      // Initialize cache if needed
      if (!window.digitalOnlyCards) {
        window.digitalOnlyCards = {};
      }
      
      // Check if any of the returned cards are digital-only
      if (data.data && data.data.length > 0) {
        const isDigital = data.data.some(card => 
          card.digital === true || 
          (Array.isArray(card.games) && !card.games.includes('paper'))
        );
        
        // Cache the result
        window.digitalOnlyCards[`${cardName}-${cardSet}`] = isDigital;
        return isDigital;
      }
      
      return false;
    } catch (err) {
      console.error('Error checking digital status:', err);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Check if any cards are digital-only
      let hasDigitalOnlyCards = false;
      const digitalCards = [];
      
      for (const card of cards) {
        if (card.name && card.set) {
          const digital = await isDigitalOnly(card.name, card.set);
          if (digital) {
            hasDigitalOnlyCards = true;
            digitalCards.push(card.name);
          }
        }
      }
      
      // If there are digital-only cards, ask for confirmation
      if (hasDigitalOnlyCards) {
        const confirmed = window.confirm(
          `Warning: This deck contains digital-only cards (${digitalCards.join(', ')}) which cannot be used in paper play.\n\nDo you want to continue?`
        );
        
        if (!confirmed) {
          setLoading(false);
          return;
        }
      }
      
      // Continue with deck submission
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/decks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          name, 
          cards, 
          format,
          hasDigitalOnlyCards // Add flag to indicate digital-only cards
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('Deck saved!');
        setName('');
        setCards([]);
        setDecklistText('');
      } else {
        toast.error(data.error || data.errors?.[0]?.msg || 'Error');
      }
    } catch (err) {
      console.error('Error submitting deck:', err);
      toast.error('Network error');
    }
    
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', maxWidth: 900, margin: '2rem auto' }}>
      {/* Left: Static preview card and otag button */}
      <div style={{ flex: '0 0 260px', marginRight: 32 }}>
        {/* Static preview card placeholder */}
        <div style={{ width: 240, height: 340, background: '#eee', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18 }}>
          Card Preview
        </div>
        <button type="button" onClick={handleGetOtagSuggestions} disabled={loading || cards.length === 0} style={{ width: '100%', marginBottom: 8 }}>
          {loading ? 'Loading Otag Suggestions...' : 'Suggest Otag Tags'}
        </button>
        {otagSuggestions.length > 0 && (
          <div style={{ margin: '1rem 0', padding: '0.5rem', background: '#f6f6f6', borderRadius: 4 }}>
            <strong>Recommended Otag Tags:</strong>
            <ul>
              {otagSuggestions.map(({ tag, count }) => (
                <li key={tag}>{tag} ({count})</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* Right: Deck form */}
      <form onSubmit={handleSubmit} style={{ flex: 1, maxWidth: 400 }}>
        <h2>Deck Builder</h2>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Deck Name"
          required
          style={{ width: '100%', marginBottom: 8, padding: 8 }}
        />
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Format</label>
          <select value={format} onChange={e => setFormat(e.target.value)} style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #bbb' }}>
            {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <textarea
            value={decklistText}
            onChange={e => setDecklistText(e.target.value)}
            placeholder="Paste Moxfield/MTG decklist here"
            rows={6}
            style={{ width: '100%', padding: 8, fontFamily: 'monospace' }}
          />
          <button type="button" onClick={handleImportDecklist} style={{ marginTop: 4, marginBottom: 8 }}>
            Import Decklist
          </button>
        </div>
        {cards.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <strong>Cards:</strong>
            {cards.map((card, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 4, gap: 4 }}>
                <input
                  value={card.name}
                  onChange={e => handleCardChange(i, 'name', e.target.value)}
                  placeholder="Name"
                  required
                  style={{ flex: 2, padding: 6 }}
                />
                <input
                  value={card.set}
                  onChange={e => handleCardChange(i, 'set', e.target.value)}
                  placeholder="Set"
                  required
                  style={{ width: 50, padding: 6 }}
                />
                <input
                  value={card.collectorNumber}
                  onChange={e => handleCardChange(i, 'collectorNumber', e.target.value)}
                  placeholder="#"
                  required
                  style={{ width: 50, padding: 6 }}
                />
                <input
                  type="number"
                  min={1}
                  value={card.count}
                  onChange={e => handleCardChange(i, 'count', parseInt(e.target.value, 10) || 1)}
                  placeholder="Count"
                  style={{ width: 45, padding: 6 }}
                />
                <label style={{ fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={!!card.foil}
                    onChange={e => handleCardChange(i, 'foil', e.target.checked)}
                  />
                  Foil
                </label>
                <button type="button" onClick={() => removeCard(i)} disabled={cards.length === 1}>-</button>
              </div>
            ))}
            <button type="button" onClick={addCard} style={{ marginBottom: 8 }}>Add Card</button>
          </div>
        )}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 8 }}>
          {loading ? 'Saving...' : 'Save Deck'}
        </button>
      </form>
    </div>
  );
}
