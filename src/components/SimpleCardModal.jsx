import React, { useState, useEffect } from 'react';
import './CardActionsModal.css';
import OracleTagsIntegration from './OracleTagsIntegration';

const SimpleCardModal = ({ card, isOpen, onClose, userDecks, onOracleTagSearch }) => {
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedPrinting, setSelectedPrinting] = useState(null);
  const [printings, setPrintings] = useState([]);
  const [loadingPrintings, setLoadingPrintings] = useState(false);

  useEffect(() => {
    if (isOpen && card) {
      if (userDecks?.length > 0) {
        setSelectedDeckId(userDecks[0]._id);
      }
      setSelectedPrinting(card);
      loadPrintings(card.name);
    } else {
      setSelectedDeckId('');
      setSelectedPrinting(null);
      setPrintings([]);
    }
  }, [isOpen, card, userDecks]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store the current scroll position
      const scrollY = window.scrollY;
      
      // Prevent scrolling on the body
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore scrolling
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        // Restore the scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const loadPrintings = async (cardName) => {
    if (!cardName) return;
    
    setLoadingPrintings(true);
    try {
      console.log(`[SimpleCardModal] Loading printings for: "${cardName}"`);
      
      // Direct Scryfall call
      const scryfallUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`!"${cardName}"`)}&unique=prints&order=released&dir=desc`;
      const response = await fetch(scryfallUrl);
      
      let allPrintings = [];
      
      if (response.ok) {
        const data = await response.json();
        allPrintings = data.data || [];
        
        // Fetch additional pages if available
        let nextUrl = data.next_page;
        while (nextUrl && allPrintings.length < 50) { // Reasonable limit
          const nextResponse = await fetch(nextUrl);
          if (nextResponse.ok) {
            const nextData = await nextResponse.json();
            allPrintings = [...allPrintings, ...(nextData.data || [])];
            nextUrl = nextData.next_page;
          } else {
            break;
          }
        }
      } else {
        if (card) allPrintings = [card];
      }
      
      // Ensure current card is included
      const currentCardInPrintings = allPrintings.some(p => p.id === card.id);
      if (!currentCardInPrintings && card) {
        allPrintings.unshift(card);
      }
      
      // Sort with current printing at top
      const sortedPrintings = sortPrintingsWithCurrentFirst(allPrintings, card);
      setPrintings(sortedPrintings);
      console.log(`[SimpleCardModal] Loaded ${allPrintings.length} printings`);
      
    } catch (error) {
      console.error('Error loading printings:', error);
      if (card) setPrintings([card]);
    } finally {
      setLoadingPrintings(false);
    }
  };

  const handleAddToDeck = async () => {
    if (!selectedDeckId || !selectedPrinting) return;

    setIsAdding(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to add cards to decks');
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl || ''}/api/decks/${selectedDeckId}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          scryfall_id: selectedPrinting.id,
          quantity: 1,
          section: 'mainboard'
        })
      });

      if (response.ok) {
        alert(`Added ${selectedPrinting.name} to deck!`);
        onClose();
      } else {
        const error = await response.json();
        alert(`Error adding card: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding card to deck:', error);
      alert('Error adding card to deck');
    } finally {
      setIsAdding(false);
    }
  };

  const formatPrice = (priceObj) => {
    if (!priceObj) return 'N/A';
    const price = priceObj.usd || priceObj.usd_foil;
    return price ? `$${Number(price).toFixed(2)}` : 'N/A';
  };

  const sortPrintingsWithCurrentFirst = (printingsList, currentPrinting) => {
    if (!currentPrinting) return printingsList;
    
    const currentId = currentPrinting.id;
    const current = printingsList.find(p => p.id === currentId);
    const others = printingsList.filter(p => p.id !== currentId);
    
    return current ? [current, ...others] : printingsList;
  };

  const handlePrintingSelect = (printing) => {
    setSelectedPrinting(printing);
    
    // Re-sort printings to put the newly selected one at the top
    const reorderedPrintings = sortPrintingsWithCurrentFirst(printings, printing);
    setPrintings(reorderedPrintings);
  };

  const handleAddToWishlist = async () => {
    if (!selectedPrinting) return;
    alert(`Added ${selectedPrinting.name} to wishlist! (Feature coming soon)`);
  };

  const handleAddToCollection = async () => {
    if (!selectedPrinting) return;
    alert(`Added ${selectedPrinting.name} to collection! (Feature coming soon)`);
  };

  // Function to render mana symbols
  const renderManaSymbols = (text) => {
    if (!text) return text;
    
    // Replace mana symbols like {W}, {U}, {B}, {R}, {G}, {C}, {X}, {T}, etc.
    return text.split(/(\{[^}]+\})/).map((part, index) => {
      const match = part.match(/^\{([^}]+)\}$/);
      if (match) {
        let symbol = match[1].toLowerCase();
        
        // Handle special cases for symbol mapping
        if (symbol === 't') symbol = 'tap'; // Map {T} to tap.svg
        if (symbol === 'q') symbol = 'untap'; // Map {Q} to untap.svg
        
        return (
          <img
            key={index}
            src={`/svgs/${symbol}.svg`}
            alt={part}
            className="mana-symbol"
            style={{ 
              width: '10px', 
              height: '10px', 
              display: 'inline-block', 
              verticalAlign: 'middle',
              margin: '0 0.5px'
            }}
            onError={(e) => {
              // Fallback to text if SVG not found
              e.target.outerHTML = part;
            }}
          />
        );
      }
      return part;
    });
  };

  if (!isOpen || !selectedPrinting) return null;

  return (
    <div className="modal-backdrop card-actions-modal" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button onClick={onClose} className="close-button">&times;</button>
        </div>

        <div className="modal-body">
          <div className="card-actions">
            <div className="action-row">
              <label className="control-label">Add to Deck:</label>
              <div className="deck-selection-controls">
                {userDecks?.length > 0 ? (
                  <>
                    <select 
                      value={selectedDeckId} 
                      onChange={e => setSelectedDeckId(e.target.value)}
                      className="deck-select"
                      style={{ width: '100%', marginBottom: '8px' }}
                    >
                      {userDecks.map(deck => (
                        <option key={deck._id} value={deck._id}>
                          {deck.name}
                        </option>
                      ))}
                    </select>
                    <button 
                      onClick={handleAddToDeck}
                      disabled={isAdding || !selectedDeckId}
                      className={`action-button ${isAdding ? 'loading' : ''}`}
                      style={{ width: '100%' }}
                    >
                      {isAdding ? 'Adding...' : 'Add to Deck'}
                    </button>
                  </>
                ) : (
                  <div className="no-decks-message" style={{ fontSize: '12px', color: '#666' }}>
                    Please log in and create a deck to add cards.
                  </div>
                )}
              </div>
            </div>

            <div className="action-row">
              <button 
                onClick={handleAddToWishlist}
                className="action-button wishlist-button"
                style={{ width: '100%', backgroundColor: '#ff9800', marginBottom: '8px' }}
              >
                Add to Wishlist
              </button>
              <button 
                onClick={handleAddToCollection}
                className="action-button collection-button"
                style={{ width: '100%', backgroundColor: '#4caf50' }}
              >
                Add to Collection
              </button>
            </div>

            <div className="printings-section">
              <h3>Select Printing</h3>
              <div className="printings-list">
                {loadingPrintings ? (
                  <div className="loading-printings">
                    <p>Loading printings...</p>
                    <div className="spinner"></div>
                  </div>
                ) : printings.length === 0 ? (
                  <p>No printings found for this card.</p>
                ) : (
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textAlign: 'center' }}>
                      Found {printings.length} printings
                    </div>
                    <div className="printings-grid">
                      {printings.map((printing) => {
                        const isSelected = selectedPrinting.id === printing.id;
                        const price = formatPrice(printing.prices);
                        const setIconUrl = printing.set ? `/svgs/${printing.set}.svg` : null;
                        
                        return (
                          <div
                            key={printing.id}
                            className={`printing-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => handlePrintingSelect(printing)}
                            title={`${printing.set_name} - ${printing.set?.toUpperCase()} ${printing.collector_number ? `(#${printing.collector_number})` : ''} - ${price}`}
                          >
                            {isSelected && <div className="current-label">CURRENT</div>}
                            
                            {(() => {
                              // Handle double-faced cards
                              let imageUrl = null;
                              if (printing.image_uris?.normal || printing.image_uris?.small) {
                                imageUrl = printing.image_uris.normal || printing.image_uris.small;
                              } else if (printing.card_faces?.[0]?.image_uris) {
                                // For double-faced cards, use the front face image
                                imageUrl = printing.card_faces[0].image_uris.normal || printing.card_faces[0].image_uris.small;
                              }
                              
                              return imageUrl && (
                                <div className="printing-image-preview">
                                  <img 
                                    src={imageUrl} 
                                    alt={printing.name}
                                    className="printing-preview-img"
                                  />
                                </div>
                              );
                            })()}
                            
                            <div className="printing-label">
                              <div className="set-info">
                                <div className="set-details-row">
                                  {setIconUrl && (
                                    <img 
                                      src={setIconUrl} 
                                      alt={printing.set?.toUpperCase()} 
                                      className="set-symbol"
                                      onError={(e) => e.target.style.display = 'none'}
                                    />
                                  )}
                                  <span>{printing.set?.toUpperCase()} #{printing.collector_number || '?'}</span>
                                </div>
                                
                                <div className="price-row">
                                  <span>{price}</span>
                                  <div className="collection-dot not-owned" title="Not in Collection"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="printings-container">
            <div className="current-printing-container">              
              <div className="current-printing-info">
                <h2 className="card-name-title">{selectedPrinting.name}</h2>
                
                <div className="card-details-columns">
                  <div className="detail-column">
                    <div className="detail-row">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value">{selectedPrinting.type_line}</span>
                    </div>
                    
                    {selectedPrinting.mana_cost && (
                      <div className="detail-row">
                        <span className="detail-label">Mana Cost:</span>
                        <span className="detail-value">{renderManaSymbols(selectedPrinting.mana_cost)}</span>
                      </div>
                    )}
                    
                    <div className="detail-row">
                      <span className="detail-label">Price:</span>
                      <span className="detail-value price-highlight">{formatPrice(selectedPrinting.prices)}</span>
                    </div>
                  </div>
                  
                  <div className="detail-column">
                    <div className="detail-row">
                      <span className="detail-label">Set:</span>
                      <span className="detail-value">{selectedPrinting.set_name} ({selectedPrinting.set?.toUpperCase()})</span>
                    </div>
                    
                    {selectedPrinting.released_at && (
                      <div className="detail-row">
                        <span className="detail-label">Released:</span>
                        <span className="detail-value">{new Date(selectedPrinting.released_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedPrinting.oracle_text && (
                  <div className="oracle-text-content-compact">
                    {renderManaSymbols(selectedPrinting.oracle_text)}
                  </div>
                )}
                
                {/* Oracle Tags Integration - Using Production OTAG System data */}
                <OracleTagsIntegration 
                  card={selectedPrinting}
                  onOracleTagSearch={(oracleTag) => {
                    console.log(`[SimpleCardModal] Oracle tag search requested: ${oracleTag}`);
                    // Use the passed handler if available, otherwise show alert
                    if (onOracleTagSearch) {
                      onOracleTagSearch(oracleTag);
                    } else {
                      alert(`Search for oracle tag: "${oracleTag}"\n\nThis feature can be enhanced to integrate with your search system.`);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleCardModal;
