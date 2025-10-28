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
  const [assignTo, setAssignTo] = useState(null); // 'user1' or 'user2' - no default selection
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
        setAssignTo(card.assignedTo || card.originalAssignment || null);
        setSelectedPrinting(card.card || card.scryfall_json || card);
      } else {
        // New card - use defaults
        setQuantity(1);
        setIsFoil(false);
        setAssignTo(null); // No default selection
      }
      
      fetchPrintings();
    }
  }, [isOpen, card]);

  const fetchPrintings = async () => {
    if (!card) {
      console.log('🚫 No card provided to fetchPrintings');
      return;
    }
    
    console.log('📚 Fetching printings for:', card.name);
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const url = `${apiUrl}/api/cards/printings?name=${encodeURIComponent(card.name)}`;
      console.log('🔗 Printings URL:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Printings response:', data);
      
      const printingsData = data.data || [];
      console.log(`📦 Found ${printingsData.length} printings for "${card.name}"`);
      
      setPrintings(printingsData);
      
      // Auto-select first printing if available
      if (printingsData.length > 0) {
        setSelectedPrinting(printingsData[0]);
        console.log('🎯 Auto-selected first printing:', printingsData[0].set_name);
      } else {
        setSelectedPrinting(card);
        console.log('🎯 Fallback to original card');
      }
    } catch (error) {
      console.error('❌ Error fetching printings:', error);
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
    if (!selectedPrinting || !assignTo) return;
    
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
    <div 
      className="modal-backdrop card-actions-modal" 
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      tabIndex={0}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
        maxWidth: '800px',
        width: '90%',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div className="modal-header">
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        
        <div className="modal-body" style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '15px',
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* Left side controls */}
          <div className="card-actions" style={{
            flex: '0 0 280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#333' }}>
              {isEditing ? 'Edit Trade Card' : 'Add Card to Trade'}
            </h3>
            
            {/* Trader Assignment - Toggle Buttons */}
            <div className="action-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <label className="control-label" style={{ marginBottom: '8px', textAlign: 'left', minWidth: 'auto', width: 'auto' }}>Assign to:</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setAssignTo('user1')}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: assignTo === 'user1' ? '2px solid #1976d2' : '1px solid #ddd',
                    backgroundColor: assignTo === 'user1' ? '#e3f2fd' : 'white',
                    color: assignTo === 'user1' ? '#1976d2' : '#666',
                    fontSize: '14px',
                    fontWeight: assignTo === 'user1' ? '600' : '400',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Me
                </button>
                <button
                  onClick={() => setAssignTo('user2')}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: assignTo === 'user2' ? '2px solid #1976d2' : '1px solid #ddd',
                    backgroundColor: assignTo === 'user2' ? '#e3f2fd' : 'white',
                    color: assignTo === 'user2' ? '#1976d2' : '#666',
                    fontSize: '14px',
                    fontWeight: assignTo === 'user2' ? '600' : '400',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Trading Partner
                </button>
              </div>
            </div>

            {/* Quantity controls */}
            <div className="action-row quantity-row">
              <label className="control-label">Quantity:</label>
              <div className="quantity-controls">
                <button 
                  className="quantity-btn" 
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  disabled={quantity <= 1}
                >−</button>
                <input 
                  type="number" 
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="quantity-input"
                  min="1"
                />
                <button 
                  className="quantity-btn" 
                  onClick={() => setQuantity(prev => prev + 1)}
                >+</button>
              </div>
            </div>

            {/* Foil toggle */}
            <div className="action-row foil-selector">
              <label className="control-label">Foil:</label>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={isFoil}
                  onChange={(e) => setIsFoil(e.target.checked)}
                />
                <span className={`toggle-slider ${isFoil ? 'foil-active' : ''}`}></span>
              </label>
            </div>

            {/* Price display */}
            {getCurrentPrice() && (
              <div className="action-row">
                <label className="control-label">Price:</label>
                <div className="price-display">
                  {formatPrice(getCurrentPrice())}
                </div>
              </div>
            )}
            
            {/* Action buttons */}
            <div className="modal-buttons" style={{ marginTop: '20px' }}>
              <button 
                className="btn btn-primary modal-btn-primary" 
                onClick={handleAddCard}
                disabled={!selectedPrinting || !assignTo}
              >
                {isEditing ? 'Update Card' : 'Add to Trade'}
              </button>
              
              {isEditing && (
                <button 
                  className="btn btn-secondary modal-btn-secondary" 
                  onClick={onClose}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Right side - Card image and details */}
          <div className="card-display" style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px'
          }}>
            {(selectedPrinting || card) && (
              <>
                <div style={{ 
                  width: '240px', 
                  height: '336px', 
                  border: '1px solid #ddd', 
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '15px'
                }}>
                  {((selectedPrinting?.image_uris?.normal || selectedPrinting?.image_uris?.small) || (card?.image_uris?.normal || card?.image_uris?.small)) ? (
                    <img 
                      src={selectedPrinting?.image_uris?.normal || selectedPrinting?.image_uris?.small || card?.image_uris?.normal || card?.image_uris?.small}
                      alt={selectedPrinting?.name || card?.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div style={{
                    display: ((selectedPrinting?.image_uris?.normal || selectedPrinting?.image_uris?.small) || (card?.image_uris?.normal || card?.image_uris?.small)) ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#9ca3af',
                    fontSize: '16px',
                    textAlign: 'center',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div>🎴</div>
                    <div>No Image Available</div>
                  </div>
                </div>
                
                <div className="card-details" style={{
                  textAlign: 'center',
                  fontSize: '14px',
                  maxWidth: '240px'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{(selectedPrinting || card)?.name}</h4>
                  {(selectedPrinting || card)?.type_line && (
                    <p className="type-line" style={{ margin: '4px 0', color: '#666' }}>{(selectedPrinting || card).type_line}</p>
                  )}
                  {(selectedPrinting || card)?.mana_cost && (
                    <p className="mana-cost" style={{ margin: '4px 0', color: '#333', fontFamily: 'monospace' }}>{(selectedPrinting || card).mana_cost}</p>
                  )}
                  {(selectedPrinting || card)?.set_name && (
                    <p className="set-name" style={{ margin: '4px 0', color: '#888', fontSize: '12px' }}>{(selectedPrinting || card).set_name}</p>
                  )}
                </div>
              </>
            )}
            {/* Printings Selection */}
            <div className="action-row">
              <label className="control-label">Printing:</label>
              {loading ? (
                <div className="loading-printings">Loading printings...</div>
              ) : (
                <select
                  value={selectedPrinting?.id || ''}
                  onChange={(e) => {
                    const printing = printings.find(p => p.id === e.target.value);
                    setSelectedPrinting(printing);
                  }}
                  className="printing-select"
                  style={{ 
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    width: '100%'
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
      // Clear everything when search is empty
      debouncedSearch.cancel();
      setSearchResults([]);
      setShowDropdown(false);
      setNoResultsMsg('');
      setSearchLoading(false);
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
    <div className="container" style={{ maxWidth: '100%', padding: '10px 20px', margin: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: '15px', marginTop: 0 }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>{isNew ? 'Create New Trade' : `Trade ${trade?.id}`}</h1>
        <button 
          onClick={() => navigate('/trade')} 
          className="btn btn-secondary"
          style={{ marginBottom: '0' }}
        >
          ← Back to Trades
        </button>
      </div>

      {/* Three-column layout */}
      <div style={{ display: 'flex', gap: '15px', minHeight: '600px', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Left Column - Card Search and Preview */}
        <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column' }}>
          {/* Card Preview */}
          <div style={{ 
            marginBottom: '20px', 
            height: '520px', 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            padding: '10px',
            backgroundColor: '#f9f9f9',
            display: 'flex',
            flexDirection: 'column'
          }}>

            {previewCard ? (
              <CardPreview preview={previewCard} isFixed={true} showPreview={true} />
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flex: 1,
                color: '#666'
              }}>
                Hover over cards to preview
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="search-container" style={{ position: 'relative', marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Search for cards to add..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                color: 'black',
                fontSize: '14px'
              }}
              onKeyDown={(e) => {
                // Debug logging for arrow key navigation
                console.log('🔍 KeyDown:', e.key, 'showDropdown:', showDropdown, 'results:', searchResults.length);
                
                // Handle keyboard navigation for search dropdown - make condition more permissive
                if ((showDropdown || searchResults.length > 0) && searchResults.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedSearchIndex(prev => {
                      const newIndex = prev < searchResults.length - 1 ? prev + 1 : 0;
                      console.log('🔽 Arrow down to index:', newIndex);
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
                      console.log('🔼 Arrow up to index:', newIndex);
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
                    e.stopPropagation(); // Prevent global event handlers from firing
                    
                    // If no specific result is selected but there are results, select the first one
                    let cardToSelect = null;
                    if (selectedSearchIndex >= 0 && selectedSearchIndex < searchResults.length) {
                      cardToSelect = searchResults[selectedSearchIndex];
                    } else if (searchResults.length > 0) {
                      cardToSelect = searchResults[0]; // Default to first result
                    }
                    
                    if (cardToSelect) {
                      console.log('⏎ Enter pressed for card:', cardToSelect.name);
                      handleSearchCardClick(cardToSelect);
                    }
                    return;
                  }
                }
                
                // Always prevent Enter key to avoid unwanted form submissions
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation(); // Prevent global event handlers from firing
                  return;
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
                tabIndex={-1}
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
                    onClick={(e) => {
                      e.preventDefault();
                      handleSearchCardClick(card);
                    }}
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

          {/* Save and Export Actions */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button className="btn btn-success" style={{ flex: 1 }}>
              Save Trade
            </button>
            <button className="btn btn-secondary" style={{ flex: 1 }}>
              Export Trade
            </button>
          </div>
        </div>

        {/* Center Column - User 1 (Me) */}
        <div 
          style={{ flex: '1 1 350px', maxWidth: '400px', border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}
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
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingUser1(false);
                  }
                }}
                onFocus={(e) => e.target.select()}
                autoFocus
                style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  border: '1px solid #ddd', 
                  padding: '5px',
                  backgroundColor: 'white',
                  color: 'black',
                  borderRadius: '4px'
                }}
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


        </div>

        {/* Right Column - User 2 (Trading Partner) */}
        <div 
          style={{ flex: '1 1 350px', maxWidth: '400px', border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}
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
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingUser2(false);
                  }
                }}
                onFocus={(e) => e.target.select()}
                autoFocus
                style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  border: '1px solid #ddd', 
                  padding: '5px',
                  backgroundColor: 'white',
                  color: 'black',
                  borderRadius: '4px'
                }}
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
      
      {/* Trade Summary */}
      <div style={{ 
        marginTop: '15px', 
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        {/* Individual Totals */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '15px',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          <div>
            <span style={{ color: '#666' }}>{user1Name} Total:</span>{' '}
            <span style={{ color: '#28a745' }}>{formatPrice(user1Total)}</span>
          </div>
          <div>
            <span style={{ color: '#666' }}>{user2Name} Total:</span>{' '}
            <span style={{ color: '#dc3545' }}>{formatPrice(user2Total)}</span>
          </div>
        </div>
        
        {/* Trade Difference */}
        <div style={{ 
          textAlign: 'center',
          paddingTop: '15px',
          borderTop: '1px solid #ddd',
          fontSize: '16px'
        }}>
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
      </div>
    </div>
  );
};

export default TradeManagementPage;
