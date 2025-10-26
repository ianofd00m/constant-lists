import React, { useEffect, useState } from 'react';

function CardModal({ 
  cardObj, 
  cardName, 
  activeComponentId, 
  deckId, 
  deckName, 
  deckCards, 
  setDeckCards, 
  setDeck, 
  onClose 
}) {
  const [printings, setPrintings] = useState([]);
  const [selectedPrinting, setSelectedPrinting] = useState(cardObj?.printing || null);
  const [loadingPrintings, setLoadingPrintings] = useState(false);

  // Fetch printings when modal opens
  useEffect(() => {
    if (!cardName) return;
    
    setLoadingPrintings(true);
    // Scryfall API call, leave as is
    fetch(`https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(cardName)}"+game:paper&unique=prints&order=released`)
      .then(r => r.json())
      .then(data => {
        const fetchedPrintings = data && data.data ? data.data : [];
        setPrintings(fetchedPrintings);
        if (!selectedPrinting && fetchedPrintings.length > 0) {
          setSelectedPrinting(fetchedPrintings[0].id);
        }
        setLoadingPrintings(false);
      })
      .catch(() => {
        setPrintings([]);
        setLoadingPrintings(false);
      });
  }, [cardName, selectedPrinting]);

  // Handle printing selection
  const handleSelectPrinting = async (printing) => {
    setSelectedPrinting(printing.id);
    
    // Update the card's printing in the deck
    const updatedCards = deckCards.map(c => {
      const name = c.card?.name || c.name;
      if (name === cardName && c === cardObj) {
        return { ...c, printing: printing.id };
      }
      return c;
    });
    
    setDeckCards(updatedCards);
    
    // Save to backend
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/decks/${deckId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: deckName, cards: updatedCards }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data && data.cards) {
          setDeckCards(data.cards);
          setDeck(data);
        }
      }
    } catch (err) {
      console.error('Failed to save printing change:', err);
    }
    
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!cardName) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ×
        </button>
        
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>{cardName}</h2>
        
        {loadingPrintings ? (
          <div>Loading printings...</div>
        ) : (
          <div>
            <h3>Select Printing:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {printings.map((printing) => (
                <div
                  key={printing.id}
                  style={{
                    border: selectedPrinting === printing.id ? '2px solid #1976d2' : '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '10px',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                  onClick={() => handleSelectPrinting(printing)}
                >
                  {printing.image_uris?.small && (
                    <img 
                      src={printing.image_uris.small} 
                      alt={printing.name}
                      style={{ width: '100%', maxWidth: '150px', borderRadius: '4px' }}
                    />
                  )}
                  <div style={{ marginTop: '5px', fontSize: '14px' }}>
                    {printing.set_name} ({printing.set})
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    #{printing.collector_number}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CardModal;
