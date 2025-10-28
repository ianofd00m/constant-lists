import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import debounce from 'lodash.debounce';
import CardPreview from './CardPreview';
import { getUnifiedCardPrice, formatPrice } from '../utils/UnifiedPricing';
import './TradeManagementPage.css';

// TradeCardModal component for adding cards with printing selection and trader assignment
const TradeCardModal = ({ isOpen, onClose, card, onAddCard, onUpdateCard }) => {
  const [selectedPrinting, setSelectedPrinting] = useState(null);
  const [printings, setPrintings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isFoil, setIsFoil] = useState(false);
  const [assignTo, setAssignTo] = useState('user1'); // 'user1' or 'user2'
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen && card) {
      // Check if we're editing an existing card
      const editing = card.editing || false;
      setIsEditing(editing);
      
      if (editing) {
        // Pre-populate with existing values
        setQuantity(card.quantity || 1);
        setIsFoil(card.foil || false);
        setAssignTo(card.assignedTo || card.originalAssignment || 'user1');
        setSelectedPrinting(card.card || card.scryfall_json || card);
      } else {
        // New card - use defaults
        setQuantity(1);
        setIsFoil(false);
        setAssignTo('user1');
      }
      
      fetchPrintings();
    }
  }, [isOpen, card]);

  const fetchPrintings = async () => {
    if (!card) return;
    
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/cards/printings?name=${encodeURIComponent(card.name)}`);
      const data = await response.json();
      
      setPrintings(data.data || []);
      setSelectedPrinting(data.data?.[0] || card);
    } catch (error) {
      console.error('Error fetching printings:', error);
      setPrintings([]);
      setSelectedPrinting(card);
    }
    setLoading(false);
  };

  const getCurrentPrice = () => {
    if (!selectedPrinting) return null;
    
    const mockCardData = {
      ...selectedPrinting,
      scryfall_json: selectedPrinting,
      foil: isFoil
    };
    
    return getUnifiedCardPrice(mockCardData, { preferStoredPrice: false });
  };

  const handleAddCard = () => {
    if (!selectedPrinting) return;
    
    const tradeCard = {
      id: isEditing ? card.id : `${selectedPrinting.id || selectedPrinting.name}_${Date.now()}`,
      name: selectedPrinting.name,
      card: selectedPrinting,
      printing: selectedPrinting.id,
      quantity: quantity,
      foil: isFoil,
      price: getCurrentPrice(),
      assignedTo: assignTo,
      scryfall_json: selectedPrinting
    };

    if (isEditing && onUpdateCard) {
      onUpdateCard(tradeCard, card.originalAssignment);
    } else {
      onAddCard(tradeCard);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content trade-card-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Trade Card' : 'Add Card to Trade'}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body" style={{ display: 'flex', gap: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Card Image and Info */}
          <div className="card-info" style={{ flex: '0 0 280px' }}>
            {selectedPrinting && (
              <>
                <img 
                  src={selectedPrinting.image_uris?.normal || selectedPrinting.image_uris?.small}
                  alt={selectedPrinting.name}
                  style={{ 
                    width: '100%', 
                    maxWidth: '280px', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                    marginBottom: '15px'
                  }}
                />
                <div style={{ padding: '10px 0' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>{card?.name}</h3>
                  {getCurrentPrice() && (
                    <div style={{ 
                      backgroundColor: '#f8f9fa', 
                      padding: '8px 12px', 
                      borderRadius: '6px',
                      marginBottom: '10px'
                    }}>
                      <strong>Price:</strong> {formatPrice(getCurrentPrice())}
                    </div>
                  )}
                  {selectedPrinting.type_line && (
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                      {selectedPrinting.type_line}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Options */}
          <div className="card-options" style={{ flex: 1, padding: '0 10px' }}>
            {/* Trader Assignment - Most Important */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="assign-to" style={{ 
                display: 'block', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                fontSize: '16px'
              }}>
                Assign to:
              </label>
              <select 
                id="assign-to"
                value={assignTo} 
                onChange={(e) => setAssignTo(e.target.value)}
                style={{ 
                  padding: '10px', 
                  width: '100%',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value="user1">Me</option>
                <option value="user2">Trading Partner</option>
              </select>
            </div>

            {/* Quantity and Foil in a row */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="quantity" style={{ 
                  display: 'block', 
                  fontWeight: 'bold', 
                  marginBottom: '8px'
                }}>
                  Quantity:
                </label>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  style={{ 
                    width: '100%', 
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #ddd'
                  }}
                />
              </div>

              <div className="form-group" style={{ flex: 1, display: 'flex', alignItems: 'end' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  backgroundColor: isFoil ? '#fff3cd' : '#f8f9fa',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={isFoil}
                    onChange={(e) => setIsFoil(e.target.checked)}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontWeight: 'bold' }}>Foil ✨</span>
                </label>
              </div>
            </div>

            {/* Printings Selection */}
            <div className="form-group" style={{ marginBottom: '25px' }}>
              <label htmlFor="printing" style={{ 
                display: 'block', 
                fontWeight: 'bold', 
                marginBottom: '8px'
              }}>
                Printing:
              </label>
              {loading ? (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  color: '#666',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px'
                }}>
                  Loading printings...
                </div>
              ) : (
                <select
                  id="printing"
                  value={selectedPrinting?.id || ''}
                  onChange={(e) => {
                    const printing = printings.find(p => p.id === e.target.value);
                    setSelectedPrinting(printing);
                  }}
                  style={{ 
                    padding: '10px', 
                    width: '100%',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '14px'
                  }}
                >
                  {printings.map(printing => (
                    <option key={printing.id} value={printing.id}>
                      {printing.set_name} ({printing.set.toUpperCase()}) #{printing.collector_number}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleAddCard}
                disabled={!selectedPrinting}
                style={{ 
                  flex: 1,
                  padding: '12px 20px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {isEditing ? 'Update Card' : 'Add to Trade'}
              </button>
              
              {isEditing && (
                <button 
                  className="btn btn-secondary" 
                  onClick={onClose}
                  style={{ 
                    padding: '12px 20px',
                    fontSize: '16px'
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TradeManagementPage = ({ isNew }) => {
  const { tradeId } = useParams();
  const navigate = useNavigate();
  
  // Trade state
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Search functionality (identical to DeckViewEdit)
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const [noResultsMsg, setNoResultsMsg] = useState('');
  
  // Card preview
  const [previewCard, setPreviewCard] = useState(null);
  
  // Modal state
  const [modalCard, setModalCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // User names (editable)
  const [user1Name, setUser1Name] = useState('Me');
  const [user2Name, setUser2Name] = useState('Trading Partner');
  const [editingUser1, setEditingUser1] = useState(false);
  const [editingUser2, setEditingUser2] = useState(false);
  
  // Trade cards
  const [user1Cards, setUser1Cards] = useState([]);
  const [user2Cards, setUser2Cards] = useState([]);
  
  // Refs for search functionality
  const searchAbortControllerRef = useRef(null);
  const lastSearchTimeRef = useRef(0);
  const MIN_SEARCH_INTERVAL = 100;

  // Initialize new trade or load existing
  useEffect(() => {
    if (isNew) {
      // Create a new trade
      const newTrade = {
        id: `trade_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        user1_name: 'Me',
        user2_name: 'Trading Partner',
        user1_cards: [],
        user2_cards: []
      };
      setTrade(newTrade);
      setLoading(false);
    } else if (tradeId) {
      // Load existing trade (implement server call here later)
      // For now, create a mock trade
      setTrade({
        id: tradeId,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        user1_name: 'Me',
        user2_name: 'Trading Partner',
        user1_cards: [],
        user2_cards: []
      });
      setLoading(false);
    }
  }, [isNew, tradeId]);

  // Debounced search function (identical to DeckViewEdit pattern)
  const debouncedSearch = debounce(async (q) => {
    const now = Date.now();
    if (now - lastSearchTimeRef.current < MIN_SEARCH_INTERVAL) {
      return;
    }
    lastSearchTimeRef.current = now;
    
    if (!q.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      setNoResultsMsg('');
      setSearchLoading(false);
      return;
    }
    
    // Cancel previous request
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    
    searchAbortControllerRef.current = new AbortController();
    const signal = searchAbortControllerRef.current.signal;
    
    setSearchLoading(true);
    
    try {
      const query = q.trim();
      const url = `/api/cards/typesense-search?q=${encodeURIComponent(query)}&limit=20`;
      const apiUrl = import.meta.env.VITE_API_URL;
      const isDev = import.meta.env.DEV;
      const finalUrl = isDev ? url : `${apiUrl}${url}`;
      
      const res = await fetch(finalUrl, { signal });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      let results = data.data || data || [];
      
      // Remove duplicates by name
      const uniqueResults = [];
      const seenNames = new Set();
      
      for (const result of results) {
        if (!seenNames.has(result.name)) {
          seenNames.add(result.name);
          uniqueResults.push(result);
        }
      }
      
      setSearchResults(uniqueResults.slice(0, 10)); // Limit to 10 results
      setShowDropdown(uniqueResults.length > 0);
      setNoResultsMsg(uniqueResults.length === 0 ? 'No cards found' : '');
      setSelectedSearchIndex(-1);
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
        setSearchResults([]);
        setShowDropdown(false);
        setNoResultsMsg('Search failed');
      }
    }
    
    setSearchLoading(false);
  }, 300);

  // Handle search input changes
  useEffect(() => {
    if (search.trim()) {
      debouncedSearch(search);
    } else {
      debouncedSearch.cancel();
    }
  }, [search, debouncedSearch]);

  // Handle card selection from search results
  const handleSearchCardClick = (card) => {
    setModalCard(card);
    setIsModalOpen(true);
    setSearch('');
    setShowDropdown(false);
    setSearchResults([]);
  };

  // Handle card hover for preview
  const handleCardHover = (card) => {
    setPreviewCard(card);
  };

  // Add card to trade
  const handleAddCard = (tradeCard) => {
    if (tradeCard.assignedTo === 'user1') {
      setUser1Cards(prev => [...prev, tradeCard]);
    } else {
      setUser2Cards(prev => [...prev, tradeCard]);
    }
  };

  // Update existing card in trade
  const handleUpdateCard = (updatedCard, originalAssignment) => {
    const newAssignment = updatedCard.assignedTo;
    
    // Remove from original location
    if (originalAssignment === 'user1') {
      setUser1Cards(prev => prev.filter(card => card.id !== updatedCard.id));
    } else {
      setUser2Cards(prev => prev.filter(card => card.id !== updatedCard.id));
    }
    
    // Add to new location
    if (newAssignment === 'user1') {
      setUser1Cards(prev => [...prev, updatedCard]);
    } else {
      setUser2Cards(prev => [...prev, updatedCard]);
    }
  };

  // Remove card from trade
  const handleRemoveCard = (cardId, fromUser) => {
    if (fromUser === 'user1') {
      setUser1Cards(prev => prev.filter(card => card.id !== cardId));
    } else {
      setUser2Cards(prev => prev.filter(card => card.id !== cardId));
    }
  };

  // Calculate totals
  const user1Total = useMemo(() => {
    return user1Cards.reduce((sum, card) => {
      const price = card.price || 0;
      const quantity = card.quantity || 1;
      return sum + (price * quantity);
    }, 0);
  }, [user1Cards]);

  const user2Total = useMemo(() => {
    return user2Cards.reduce((sum, card) => {
      const price = card.price || 0;
      const quantity = card.quantity || 1;
      return sum + (price * quantity);
    }, 0);
  }, [user2Cards]);

  if (loading) {
    return (
      <div className="container">
        <h2>Loading Trade...</h2>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '100%', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1>{isNew ? 'Create New Trade' : `Trade ${trade?.id}`}</h1>
        <button 
          onClick={() => navigate('/trade')} 
          className="btn btn-secondary"
          style={{ marginBottom: '10px' }}
        >
          ← Back to Trades
        </button>
      </div>

      {/* Three-column layout */}
      <div style={{ display: 'flex', gap: '20px', minHeight: '600px' }}>
        
        {/* Left Column - Card Search and Preview */}
        <div style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column' }}>
          {/* Card Preview */}
          <div style={{ 
            marginBottom: '20px', 
            minHeight: '300px', 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            padding: '10px',
            backgroundColor: '#f9f9f9'
          }}>
            <h3>Card Preview</h3>
            {previewCard ? (
              <CardPreview card={previewCard} />
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '200px',
                color: '#666'
              }}>
                Hover over cards to preview
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="search-container" style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search for cards to add..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                // Handle keyboard navigation for search dropdown
                if (showDropdown && searchResults.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedSearchIndex(prev => {
                      const newIndex = prev < searchResults.length - 1 ? prev + 1 : 0;
                      // Show preview for the selected card
                      if (searchResults[newIndex]) {
                        handleCardHover(searchResults[newIndex]);
                      }
                      return newIndex;
                    });
                    return;
                  }
                  
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedSearchIndex(prev => {
                      const newIndex = prev > 0 ? prev - 1 : searchResults.length - 1;
                      // Show preview for the selected card
                      if (searchResults[newIndex]) {
                        handleCardHover(searchResults[newIndex]);
                      }
                      return newIndex;
                    });
                    return;
                  }
                  
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (selectedSearchIndex >= 0 && selectedSearchIndex < searchResults.length) {
                      const selectedCard = searchResults[selectedSearchIndex];
                      handleSearchCardClick(selectedCard);
                      return;
                    }
                  }
                }
                
                // Handle Escape key to close dropdown
                if (e.key === "Escape") {
                  setSearch("");
                  setShowDropdown(false);
                  setSearchResults([]);
                  setSelectedSearchIndex(-1);
                }
              }}
              onBlur={(e) => {
                // Prevent immediate hiding - allow clicks on dropdown items
                setTimeout(() => {
                  const activeElement = document.activeElement;
                  const searchContainer = e.currentTarget.closest('.search-container');
                  const dropdown = searchContainer?.querySelector('[data-search-dropdown]');
                  
                  // Only hide if not focused on dropdown
                  if (!dropdown || !dropdown.contains(activeElement)) {
                    setShowDropdown(false);
                    setSelectedSearchIndex(-1);
                  }
                }, 150);
              }}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '14px'
              }}
            />
            
            {/* Search Dropdown */}
            {showDropdown && (searchResults.length > 0 || noResultsMsg) && (
              <div 
                data-search-dropdown="true"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderTop: 'none',
                  borderRadius: '0 0 4px 4px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseDown={(e) => {
                  // Prevent input blur when clicking in dropdown
                  e.preventDefault();
                }}
              >
                {searchLoading && (
                  <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                    Searching...
                  </div>
                )}
                
                {!searchLoading && noResultsMsg && (
                  <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                    {noResultsMsg}
                  </div>
                )}
                
                {!searchLoading && searchResults.map((card, index) => (
                  <div
                    key={`${card.id || card.name}_${index}`}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: index < searchResults.length - 1 ? '1px solid #eee' : 'none',
                      backgroundColor: index === selectedSearchIndex ? '#f0f0f0' : 'transparent'
                    }}
                    onMouseEnter={() => {
                      setSelectedSearchIndex(index);
                      handleCardHover(card);
                    }}
                    onMouseDown={(e) => {
                      // Prevent input blur
                      e.preventDefault();
                    }}
                    onClick={() => handleSearchCardClick(card)}
                  >
                    <div style={{ fontWeight: 'bold' }}>{card.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {card.set_name} ({card.set}) • {card.type_line}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Column - User 1 (Me) */}
        <div 
          style={{ flex: 1, border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = '#007bff';
            e.currentTarget.style.backgroundColor = '#f8f9ff';
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = '#ddd';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = '#ddd';
            e.currentTarget.style.backgroundColor = 'transparent';
            
            try {
              const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
              const { card, sourceUser } = dragData;
              
              // Don't move if dropping on same column
              if (sourceUser === 'user1') return;
              
              // Move card from user2 to user1
              const updatedCard = { ...card, assignedTo: 'user1' };
              handleUpdateCard(updatedCard, 'user2');
            } catch (error) {
              console.error('Error handling drop:', error);
            }
          }}
        >
          {/* Editable User Name */}
          <div style={{ marginBottom: '15px' }}>
            {editingUser1 ? (
              <input
                type="text"
                value={user1Name}
                onChange={(e) => setUser1Name(e.target.value)}
                onBlur={() => setEditingUser1(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingUser1(false);
                }}
                autoFocus
                style={{ fontSize: '18px', fontWeight: 'bold', border: '1px solid #ddd', padding: '5px' }}
              />
            ) : (
              <h2 
                onClick={() => setEditingUser1(true)}
                style={{ cursor: 'pointer', margin: 0 }}
                title="Click to edit name"
              >
                {user1Name} ✏️
              </h2>
            )}
          </div>

          {/* Card List */}
          <div style={{ marginBottom: '20px', minHeight: '400px' }}>
            {user1Cards.length === 0 ? (
              <div style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', marginTop: '50px' }}>
                No cards added yet
              </div>
            ) : (
              user1Cards.map(card => (
                <div 
                  key={card.id}
                  draggable
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px',
                    marginBottom: '5px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '4px',
                    cursor: 'grab',
                    transition: 'all 0.2s ease',
                    border: '1px solid transparent'
                  }}
                  onMouseEnter={() => {
                    // Create proper card object for preview
                    const previewCard = {
                      name: card.name,
                      card: card.card || {
                        name: card.name,
                        image_uris: card.scryfall_json?.image_uris,
                        mana_cost: card.scryfall_json?.mana_cost,
                        type_line: card.scryfall_json?.type_line,
                        oracle_text: card.scryfall_json?.oracle_text,
                        power: card.scryfall_json?.power,
                        toughness: card.scryfall_json?.toughness
                      },
                      scryfall_json: card.scryfall_json,
                      image_uris: card.scryfall_json?.image_uris,
                      foil: card.foil
                    };
                    handleCardHover(previewCard);
                  }}
                  onClick={(e) => {
                    // Don't open modal if clicking remove button
                    if (e.target.closest('button')) return;
                    // Open edit modal for this card
                    setModalCard({
                      ...card,
                      editing: true,
                      originalAssignment: 'user1'
                    });
                    setIsModalOpen(true);
                  }}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      card: card,
                      sourceUser: 'user1'
                    }));
                    e.currentTarget.style.cursor = 'grabbing';
                    e.currentTarget.style.opacity = '0.5';
                  }}
                  onDragEnd={(e) => {
                    e.currentTarget.style.cursor = 'grab';
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold' }}>
                      {card.name} {card.foil && '✨'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Qty: {card.quantity} • {formatPrice(card.price || 0)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCard(card.id, 'user1');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc3545',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '4px',
                      borderRadius: '4px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Total */}
          <div style={{
            borderTop: '2px solid #ddd',
            paddingTop: '10px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            Total: {formatPrice(user1Total)}
          </div>
        </div>

        {/* Right Column - User 2 (Trading Partner) */}
        <div 
          style={{ flex: 1, border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = '#28a745';
            e.currentTarget.style.backgroundColor = '#f8fff9';
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = '#ddd';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = '#ddd';
            e.currentTarget.style.backgroundColor = 'transparent';
            
            try {
              const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
              const { card, sourceUser } = dragData;
              
              // Don't move if dropping on same column
              if (sourceUser === 'user2') return;
              
              // Move card from user1 to user2
              const updatedCard = { ...card, assignedTo: 'user2' };
              handleUpdateCard(updatedCard, 'user1');
            } catch (error) {
              console.error('Error handling drop:', error);
            }
          }}
        >
          {/* Editable User Name */}
          <div style={{ marginBottom: '15px' }}>
            {editingUser2 ? (
              <input
                type="text"
                value={user2Name}
                onChange={(e) => setUser2Name(e.target.value)}
                onBlur={() => setEditingUser2(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingUser2(false);
                }}
                autoFocus
                style={{ fontSize: '18px', fontWeight: 'bold', border: '1px solid #ddd', padding: '5px' }}
              />
            ) : (
              <h2 
                onClick={() => setEditingUser2(true)}
                style={{ cursor: 'pointer', margin: 0 }}
                title="Click to edit name"
              >
                {user2Name} ✏️
              </h2>
            )}
          </div>

          {/* Card List */}
          <div style={{ marginBottom: '20px', minHeight: '400px' }}>
            {user2Cards.length === 0 ? (
              <div style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', marginTop: '50px' }}>
                No cards added yet
              </div>
            ) : (
              user2Cards.map(card => (
                <div 
                  key={card.id}
                  draggable
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px',
                    marginBottom: '5px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '4px',
                    cursor: 'grab',
                    transition: 'all 0.2s ease',
                    border: '1px solid transparent'
                  }}
                  onMouseEnter={() => {
                    // Create proper card object for preview
                    const previewCard = {
                      name: card.name,
                      card: card.card || {
                        name: card.name,
                        image_uris: card.scryfall_json?.image_uris,
                        mana_cost: card.scryfall_json?.mana_cost,
                        type_line: card.scryfall_json?.type_line,
                        oracle_text: card.scryfall_json?.oracle_text,
                        power: card.scryfall_json?.power,
                        toughness: card.scryfall_json?.toughness
                      },
                      scryfall_json: card.scryfall_json,
                      image_uris: card.scryfall_json?.image_uris,
                      foil: card.foil
                    };
                    handleCardHover(previewCard);
                  }}
                  onClick={(e) => {
                    // Don't open modal if clicking remove button
                    if (e.target.closest('button')) return;
                    // Open edit modal for this card
                    setModalCard({
                      ...card,
                      editing: true,
                      originalAssignment: 'user2'
                    });
                    setIsModalOpen(true);
                  }}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      card: card,
                      sourceUser: 'user2'
                    }));
                    e.currentTarget.style.cursor = 'grabbing';
                    e.currentTarget.style.opacity = '0.5';
                  }}
                  onDragEnd={(e) => {
                    e.currentTarget.style.cursor = 'grab';
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold' }}>
                      {card.name} {card.foil && '✨'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Qty: {card.quantity} • {formatPrice(card.price || 0)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCard(card.id, 'user2');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc3545',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '4px',
                      borderRadius: '4px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Total */}
          <div style={{
            borderTop: '2px solid #ddd',
            paddingTop: '10px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            Total: {formatPrice(user2Total)}
          </div>
        </div>
      </div>

      {/* Trade Card Modal */}
      <TradeCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        card={modalCard}
        onAddCard={handleAddCard}
        onUpdateCard={handleUpdateCard}
      />
      
      {/* Bottom Actions */}
      <div style={{ 
        marginTop: '20px', 
        textAlign: 'center',
        borderTop: '1px solid #ddd',
        paddingTop: '20px'
      }}>
        <div style={{ marginBottom: '10px', fontSize: '16px' }}>
          <strong>Trade Difference: </strong>
          <span style={{ 
            color: user1Total > user2Total ? '#28a745' : user1Total < user2Total ? '#dc3545' : '#6c757d',
            fontWeight: 'bold'
          }}>
            {formatPrice(Math.abs(user1Total - user2Total))} 
            {user1Total > user2Total && ` in ${user1Name}'s favor`}
            {user1Total < user2Total && ` in ${user2Name}'s favor`}
            {user1Total === user2Total && ' (balanced)'}
          </span>
        </div>
        
        <button className="btn btn-success" style={{ marginRight: '10px' }}>
          Save Trade
        </button>
        <button className="btn btn-secondary">
          Export to Text
        </button>
      </div>
    </div>
  );
};

export default TradeManagementPage;
