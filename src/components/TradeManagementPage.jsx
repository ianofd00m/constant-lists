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
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);
  const [noResultsMsg, setNoResultsMsg] = useState('');
  
  // Trading Post placeholder card to prevent sidebar layout jumps
  const tradingPostPlaceholder = {
    id: "1b65d800-c517-4a9d-b588-757235c26fe3",
    name: "Trading Post",
    mana_cost: "{4}",
    cmc: 4.0,
    type_line: "Artifact",
    oracle_text: "{1}, {T}, Discard a card: You gain 4 life.\n{1}, {T}, Pay 1 life: Create a 0/1 white Goat creature token.\n{1}, {T}, Sacrifice a creature: Return target artifact card from your graveyard to your hand.\n{1}, {T}, Sacrifice an artifact: Draw a card.",
    colors: [],
    color_identity: [],
    set: "c14",
    set_name: "Commander 2014",
    rarity: "rare",
    artist: "Adam Paquette",
    collector_number: "279",
    image_uris: {
      small: "https://cards.scryfall.io/small/front/1/b/1b65d800-c517-4a9d-b588-757235c26fe3.jpg?1561935035",
      normal: "https://cards.scryfall.io/normal/front/1/b/1b65d800-c517-4a9d-b588-757235c26fe3.jpg?1561935035",
      large: "https://cards.scryfall.io/large/front/1/b/1b65d800-c517-4a9d-b588-757235c26fe3.jpg?1561935035"
    },
    prices: {
      usd: "0.34",
      eur: "0.31"
    },
    scryfall_uri: "https://scryfall.com/card/c14/279/trading-post?utm_source=api"
  };

  // Card preview - initialize with Trading Post to prevent layout jumps
  const [previewCard, setPreviewCard] = useState(tradingPostPlaceholder);
  
  // Modal states
  const [modalCard, setModalCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Search modal states (for Enter key functionality)
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [allSearchResults, setAllSearchResults] = useState([]);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalSearch, setModalSearch] = useState('');
  const [searchModalLoading, setSearchModalLoading] = useState(false);
  
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

  // Debounced search function (stable reference to prevent re-creation)
  const debouncedSearch = useCallback(
    debounce(async (q) => {
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
        setIsKeyboardNavigation(false); // Reset keyboard navigation when search is cleared
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
        
        setSearchResults(uniqueResults.slice(0, 20)); // Show more results with scrolling
        setShowDropdown(uniqueResults.length > 0);
        setNoResultsMsg(uniqueResults.length === 0 ? 'No cards found' : '');
        setSelectedSearchIndex(-1);
        setIsKeyboardNavigation(false); // Reset keyboard navigation on new search results
        
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Search error:', error);
          setSearchResults([]);
          setShowDropdown(false);
          setNoResultsMsg('Search failed');
        }
      }
      
      setSearchLoading(false);
    }, 500),
    [] // Empty dependency array - function is stable
  );

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
    return () => {
      debouncedSearch.cancel();
    };
  }, [search]);

  // Handle modal focus and escape key functionality
  useEffect(() => {
    if (!showSearchModal) return;

    // Focus the modal immediately when it opens
    const focusModal = () => {
      const modalElement = document.querySelector('[data-search-modal="true"]');
      if (modalElement) {
        modalElement.focus();
      }
    };

    // Use setTimeout to ensure the modal is in the DOM
    setTimeout(focusModal, 0);

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowSearchModal(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showSearchModal]);

  // Function to fetch all search results for the modal (triggered by Enter key)
  const fetchAllSearchResults = async (query) => {
    if (!query.trim()) return;
    
    setSearchModalLoading(true);
    
    try {
      // Fetch all results with a high limit for the modal
      const url = `/api/cards/typesense-search?q=${encodeURIComponent(query.trim())}&limit=1000`;
      const apiUrl = import.meta.env.VITE_API_URL;
      const isDev = import.meta.env.DEV;
      const finalUrl = isDev ? url : `${apiUrl}${url}`;
      
      const res = await fetch(finalUrl);
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
      
      setAllSearchResults(uniqueResults);
      setModalSearchTerm(query.trim()); // Store the original search term that opened the modal
      setModalSearch(""); // Clear modal search input so users can search freely
      setShowSearchModal(true);
      setShowDropdown(false); // Close the dropdown only after successful fetch
      
    } catch (error) {
      console.error('Error fetching all search results:', error);
      setAllSearchResults([]);
    } finally {
      setSearchModalLoading(false);
    }
  };

  // Close search dropdown when clicking outside or pressing Escape (mirrors DeckViewEdit)
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (event) => {
      // Check if the click is outside the search container
      const searchContainer = event.target.closest(".search-container");
      if (!searchContainer) {
        setShowDropdown(false);
        setSearch(''); // Clear the search input when clicking outside
        setSearchResults([]);
        setSelectedSearchIndex(-1);
        setIsKeyboardNavigation(false); // Reset keyboard navigation when clicking outside
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        setShowDropdown(false);
        setSearch(''); // Clear the search input when pressing Escape
        setSearchResults([]);
        setSelectedSearchIndex(-1);
      }
    };

    // Add event listeners
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    // Cleanup event listeners
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showDropdown]);

  // Handle card selection from search results
  const handleSearchCardClick = (card) => {
    setModalCard(card);
    setIsModalOpen(true);
    setSearch('');
    setShowDropdown(false);
    setSearchResults([]);
  };

  // Handle card hover for preview (with null safety)
  const handleCardHover = useCallback((cardObj) => {
    if (!cardObj) {
      // If cardObj is null/undefined, keep the current preview (don't clear)
      return;
    }

    // Ensure we have a complete card object with all necessary data
    try {
      let card = { ...cardObj };
      
      // Handle different card object structures
      if (cardObj.card && typeof cardObj.card === 'object') {
        // If card has nested card object, flatten it
        card = { ...cardObj.card, ...cardObj };
      }
      
      // Ensure required fields exist for CardPreview
      if (!card.name || (!card.id && !card.scryfall_id && !card.scryfall_json)) {
        console.warn('Card hover attempted with invalid card object - missing name or id:', cardObj);
        return; // Don't update preview with invalid card
      }
      
      setPreviewCard(card);
    } catch (error) {
      console.error('Error in handleCardHover:', error, 'Card object:', cardObj);
      // Don't update preview if there's an error
    }
  }, []);

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
      {/* Subtle back navigation */}
      <div style={{ marginBottom: '10px' }}>
        <span 
          onClick={() => navigate('/trade')} 
          style={{
            color: '#6c757d',
            fontSize: '14px',
            cursor: 'pointer',
            textDecoration: 'none',
            borderBottom: '1px dotted transparent',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.color = '#007bff';
            e.target.style.borderBottomColor = '#007bff';
          }}
          onMouseLeave={(e) => {
            e.target.style.color = '#6c757d';
            e.target.style.borderBottomColor = 'transparent';
          }}
        >
          ← Back to Trades
        </span>
      </div>
      
      {/* Main header */}
      <div style={{ marginBottom: '15px' }}>
        <h1 style={{ margin: '0', fontSize: '24px' }}>{isNew ? 'Create New Trade' : `Trade ${trade?.id}`}</h1>
      </div>

      {/* Three-column layout */}
      <div style={{ display: 'flex', gap: '15px', minHeight: '600px', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Left Column - Card Search and Preview */}
        <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column' }}>
          {/* Card Preview */}
          <div style={{ 
            marginBottom: '20px', 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            padding: '10px',
            backgroundColor: '#f9f9f9',
            display: 'flex',
            flexDirection: 'column'
          }}>

            {previewCard && previewCard.name && (previewCard.id || previewCard.scryfall_id) ? (
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
              placeholder="Search for cards to add (Scryfall syntax supported)..."
              value={search}
              data-trade-search="true"
              onChange={(e) => {
                setSearch(e.target.value);
                // Don't call debouncedSearch directly - let useEffect handle it to avoid double triggers
              }}
              onBlur={(e) => {
                // Capture references before setTimeout to avoid stale references
                const searchInput = e.currentTarget;
                const searchContainer = searchInput.closest('.search-container');
                
                // Clear dropdown when clicking outside the search input
                // Use setTimeout to allow dropdown clicks to register first
                setTimeout(() => {
                  const activeElement = document.activeElement;
                  const dropdown = searchContainer?.querySelector('[data-search-dropdown]');
                  
                  // Check if focus moved to the dropdown or its children
                  const focusedOnDropdown = dropdown && dropdown.contains(activeElement);
                  
                  // Don't close if focus is still within the search container or dropdown
                  if (!focusedOnDropdown && !searchContainer?.contains(activeElement)) {
                    setShowDropdown(false);
                    setSearch(''); // Clear search when losing focus
                    setSearchResults([]);
                    setSelectedSearchIndex(-1);
                  }
                }, 150);
              }}
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
                // Handle keyboard navigation for search dropdown - make condition more permissive
                if ((showDropdown || searchResults.length > 0) && searchResults.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsKeyboardNavigation(true); // Mark as keyboard navigation
                    setSelectedSearchIndex(prev => {
                      const newIndex = prev < searchResults.length - 1 ? prev + 1 : 0;
                      // Show preview for the selected card (with safety check)
                      const selectedCard = searchResults[newIndex];
                      if (selectedCard && selectedCard.name) {
                        handleCardHover(selectedCard);
                      }
                      return newIndex;
                    });
                    return;
                  }
                  
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsKeyboardNavigation(true); // Mark as keyboard navigation
                    setSelectedSearchIndex(prev => {
                      const newIndex = prev > 0 ? prev - 1 : searchResults.length - 1;
                      // Show preview for the selected card (with safety check)
                      const selectedCard = searchResults[newIndex];
                      if (selectedCard && selectedCard.name) {
                        handleCardHover(selectedCard);
                      }
                      return newIndex;
                    });
                    return;
                  }
                  
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent global event handlers from firing
                    
                    // Only select card if user navigated with keyboard AND has a valid selection
                    if (isKeyboardNavigation && selectedSearchIndex >= 0 && selectedSearchIndex < searchResults.length) {
                      const cardToSelect = searchResults[selectedSearchIndex];
                      if (cardToSelect) {
                        handleSearchCardClick(cardToSelect);
                        return;
                      }
                    }
                    
                    // If no keyboard navigation occurred, open search modal with all results
                    if (search.trim()) {
                      fetchAllSearchResults(search.trim());
                    }
                    return;
                  }
                }
                
                // Handle Enter key - open search modal if no specific result selected
                if (e.key === "Enter" && search.trim()) {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // If no result is specifically selected, open the search modal
                  if (selectedSearchIndex < 0) {
                    fetchAllSearchResults(search.trim());
                  }
                  return;
                }
                
                // Handle Escape key to clear search and close dropdown
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setSearch(''); // Clear the search text
                  setShowDropdown(false);
                  setSearchResults([]);
                  setSelectedSearchIndex(-1);
                  setIsKeyboardNavigation(false); // Reset keyboard navigation on escape
                }
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
                  backgroundColor: '#f9f9f9',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  marginTop: '2px',
                  maxHeight: '200px', // Smaller for 5 results
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
                onMouseDown={(e) => {
                  // Prevent input blur when clicking in dropdown
                  e.preventDefault();
                }}
                tabIndex={-1}
              >
                {searchLoading && (
                  <div style={{ padding: '6px 8px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
                    Searching...
                  </div>
                )}
                
                {!searchLoading && noResultsMsg && (
                  <div style={{ padding: '6px 8px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
                    {noResultsMsg}
                  </div>
                )}
                
                {!searchLoading && searchResults.map((card, index) => {
                  const isSelected = index === selectedSearchIndex;
                  return (
                    <div
                      key={`${card.id || card.name}_${index}`}
                      style={{
                        padding: '6px 8px',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                        borderBottom: index < searchResults.length - 1 ? '1px solid #eee' : 'none',
                        backgroundColor: isSelected ? '#e3f2fd' : 'transparent'
                      }}
                      onMouseEnter={() => {
                        setSelectedSearchIndex(index);
                        setIsKeyboardNavigation(false); // Reset keyboard navigation flag on mouse hover
                        // Safety check before hovering
                        if (card && card.name) {
                          handleCardHover(card);
                        }
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
                      <div style={{ 
                        fontWeight: isSelected ? '600' : '500',
                        fontSize: '12px',
                        color: isSelected ? '#1976d2' : '#333'
                      }}>
                        {card.name}
                      </div>
                    </div>
                  );
                })}
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
                data-name-input="user1"
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
                    alignItems: 'center',
                    padding: '8px',
                    marginBottom: '5px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '4px',
                    cursor: 'grab',
                    transition: 'all 0.2s ease',
                    border: '1px solid transparent',
                    gap: '8px'
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
                  {/* Card Info Section - Clickable for modal */}
                  <div 
                    style={{ 
                      flex: 1, 
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      // Don't open modal if clicking control buttons
                      if (e.target.closest('.trade-controls')) return;
                      // Open edit modal for this card
                      setModalCard({
                        ...card,
                        editing: true,
                        originalAssignment: 'user1'
                      });
                      setIsModalOpen(true);
                    }}
                  >
                    <span style={{ fontWeight: '500', color: '#333', minWidth: '20px' }}>
                      {card.quantity}
                    </span>
                    <span style={{ color: '#666', fontSize: '12px' }}>-</span>
                    <span style={{ 
                      fontWeight: card.foil ? '600' : '500',
                      color: card.foil ? '#d4af37' : '#333',
                      flex: 1,
                      minWidth: '80px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {card.name} {card.foil && '✨'}
                    </span>
                    {card.scryfall_json?.set && (
                      <img 
                        src={`https://svgs.scryfall.io/sets/${card.scryfall_json.set.toLowerCase()}.svg`}
                        alt={card.scryfall_json.set}
                        style={{ 
                          width: '14px', 
                          height: '14px', 
                          flexShrink: 0 
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <span style={{ 
                      fontSize: '11px', 
                      color: '#666', 
                      flexShrink: 0,
                      fontFamily: 'monospace',
                      minWidth: '30px'
                    }}>
                      {card.scryfall_json?.set?.toUpperCase() || 'UNK'}
                    </span>
                    {card.scryfall_json?.collector_number && (
                      <span style={{ 
                        fontSize: '11px', 
                        color: '#666', 
                        flexShrink: 0,
                        fontFamily: 'monospace',
                        minWidth: '25px'
                      }}>
                        {card.scryfall_json.collector_number}
                      </span>
                    )}
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#059669', 
                      fontWeight: '600',
                      flexShrink: 0,
                      fontFamily: 'monospace',
                      minWidth: '40px',
                      textAlign: 'right'
                    }}>
                      {formatPrice(card.price || 0)}
                    </span>
                  </div>

                  {/* Control Buttons */}
                  <div className="trade-controls" style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                    {/* Quantity Controls */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newQuantity = Math.max(1, card.quantity - 1);
                        setUser1Cards(prev => prev.map(c => 
                          c.id === card.id ? { ...c, quantity: newQuantity } : c
                        ));
                      }}
                      style={{
                        width: '18px',
                        height: '18px',
                        padding: '0',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Decrease quantity"
                    >
                      -
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUser1Cards(prev => prev.map(c => 
                          c.id === card.id ? { ...c, quantity: card.quantity + 1 } : c
                        ));
                      }}
                      style={{
                        width: '18px',
                        height: '18px',
                        padding: '0',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Increase quantity"
                    >
                      +
                    </button>

                    {/* Foil Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUser1Cards(prev => prev.map(c => 
                          c.id === card.id ? { ...c, foil: !c.foil } : c
                        ));
                      }}
                      style={{
                        width: '20px',
                        height: '18px',
                        padding: '0',
                        backgroundColor: card.foil ? '#d4af37' : '#f3f4f6',
                        color: card.foil ? 'white' : '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '9px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Toggle foil"
                    >
                      ✨
                    </button>

                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCard(card.id, 'user1');
                      }}
                      style={{
                        width: '18px',
                        height: '18px',
                        padding: '0',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Remove card"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Total for User 1 */}
          <div style={{
            marginTop: '15px',
            padding: '10px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '16px',
            borderTop: '2px solid #28a745'
          }}>
            Total: {formatPrice(user1Total)}
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
                data-name-input="user2"
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
                    alignItems: 'center',
                    padding: '8px',
                    marginBottom: '5px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '4px',
                    cursor: 'grab',
                    transition: 'all 0.2s ease',
                    border: '1px solid transparent',
                    gap: '8px'
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
                  {/* Card Info Section - Clickable for modal */}
                  <div 
                    style={{ 
                      flex: 1, 
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      // Don't open modal if clicking control buttons
                      if (e.target.closest('.trade-controls')) return;
                      // Open edit modal for this card
                      setModalCard({
                        ...card,
                        editing: true,
                        originalAssignment: 'user2'
                      });
                      setIsModalOpen(true);
                    }}
                  >
                    <span style={{ fontWeight: '500', color: '#333', minWidth: '20px' }}>
                      {card.quantity}
                    </span>
                    <span style={{ color: '#666', fontSize: '12px' }}>-</span>
                    <span style={{ 
                      fontWeight: card.foil ? '600' : '500',
                      color: card.foil ? '#d4af37' : '#333',
                      flex: 1,
                      minWidth: '80px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {card.name} {card.foil && '✨'}
                    </span>
                    {card.scryfall_json?.set && (
                      <img 
                        src={`https://svgs.scryfall.io/sets/${card.scryfall_json.set.toLowerCase()}.svg`}
                        alt={card.scryfall_json.set}
                        style={{ 
                          width: '14px', 
                          height: '14px', 
                          flexShrink: 0 
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <span style={{ 
                      fontSize: '11px', 
                      color: '#666', 
                      flexShrink: 0,
                      fontFamily: 'monospace',
                      minWidth: '30px'
                    }}>
                      {card.scryfall_json?.set?.toUpperCase() || 'UNK'}
                    </span>
                    {card.scryfall_json?.collector_number && (
                      <span style={{ 
                        fontSize: '11px', 
                        color: '#666', 
                        flexShrink: 0,
                        fontFamily: 'monospace',
                        minWidth: '25px'
                      }}>
                        {card.scryfall_json.collector_number}
                      </span>
                    )}
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#059669', 
                      fontWeight: '600',
                      flexShrink: 0,
                      fontFamily: 'monospace',
                      minWidth: '40px',
                      textAlign: 'right'
                    }}>
                      {formatPrice(card.price || 0)}
                    </span>
                  </div>

                  {/* Control Buttons */}
                  <div className="trade-controls" style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                    {/* Quantity Controls */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newQuantity = Math.max(1, card.quantity - 1);
                        setUser2Cards(prev => prev.map(c => 
                          c.id === card.id ? { ...c, quantity: newQuantity } : c
                        ));
                      }}
                      style={{
                        width: '18px',
                        height: '18px',
                        padding: '0',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Decrease quantity"
                    >
                      -
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUser2Cards(prev => prev.map(c => 
                          c.id === card.id ? { ...c, quantity: card.quantity + 1 } : c
                        ));
                      }}
                      style={{
                        width: '18px',
                        height: '18px',
                        padding: '0',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Increase quantity"
                    >
                      +
                    </button>

                    {/* Foil Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUser2Cards(prev => prev.map(c => 
                          c.id === card.id ? { ...c, foil: !c.foil } : c
                        ));
                      }}
                      style={{
                        width: '20px',
                        height: '18px',
                        padding: '0',
                        backgroundColor: card.foil ? '#d4af37' : '#f3f4f6',
                        color: card.foil ? 'white' : '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '9px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Toggle foil"
                    >
                      ✨
                    </button>

                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCard(card.id, 'user2');
                      }}
                      style={{
                        width: '18px',
                        height: '18px',
                        padding: '0',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Remove card"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Total for User 2 */}
          <div style={{
            marginTop: '15px',
            padding: '10px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '16px',
            borderTop: '2px solid #dc3545'
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

      {/* Search Results Modal (triggered by Enter key) */}
      {showSearchModal && (
        <div
          data-search-modal="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 10000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
            outline: "none",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSearchModal(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowSearchModal(false);
            }
          }}
          tabIndex={0}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "1200px",
              height: "80%",
              maxHeight: "800px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px",
                borderBottom: "1px solid #eee",
                position: "relative",
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setShowSearchModal(false)}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  border: "none",
                  backgroundColor: "#f5f5f5",
                  color: "#666",
                  fontSize: "18px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#e0e0e0";
                  e.target.style.color = "#333";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#f5f5f5";
                  e.target.style.color = "#666";
                }}
              >
                ×
              </button>

              <h3 style={{ margin: 0, marginBottom: "10px", color: "#333" }}>
                Search Results for "{modalSearchTerm}"
              </h3>
            </div>

            {/* Modal Content */}
            <div
              style={{
                flex: 1,
                padding: "20px",
                overflowY: "auto",
              }}
            >
              {searchModalLoading ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "200px",
                    fontSize: "16px",
                    color: "#666",
                  }}
                >
                  Loading search results...
                </div>
              ) : allSearchResults.length > 0 ? (
                <>
                  <div
                    style={{
                      marginBottom: "16px",
                      fontSize: "14px",
                      color: "#666",
                    }}
                  >
                    Found {allSearchResults.length} result{allSearchResults.length !== 1 ? 's' : ''}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(240px, 240px))",
                      gap: "20px",
                      justifyContent: "center",
                    }}
                  >
                    {allSearchResults.map((card, index) => (
                      <div
                        key={`${card.scryfall_id || card.id}-${index}`}
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          padding: "12px",
                          backgroundColor: "#fafafa",
                          transition: "all 0.2s ease",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#1976d2";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(25, 118, 210, 0.15)";
                          e.currentTarget.style.backgroundColor = "#f8fbff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#ddd";
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.backgroundColor = "#fafafa";
                        }}
                        onClick={() => {
                          setModalCard(card);
                          setIsModalOpen(true);
                          setShowSearchModal(false);
                        }}
                      >
                        {/* Card Image */}
                        <div
                          style={{
                            width: "100%",
                            height: "240px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            marginBottom: "12px",
                          }}
                        >
                          <img
                            src={`https://cards.scryfall.io/normal/front/${(card.id || card.scryfall_id)[0]}/${(card.id || card.scryfall_id)[1]}/${card.id || card.scryfall_id}.jpg`}
                            alt={card.name}
                            style={{
                              maxWidth: "100%",
                              maxHeight: "100%",
                              borderRadius: "8px",
                              objectFit: "contain",
                            }}
                            onError={(e) => {
                              // Fallback to direct image URL if available
                              const directUrl = card.image_uris?.normal || card.image_uris?.small;
                              if (directUrl && e.target.src !== directUrl) {
                                e.target.src = directUrl;
                              } else {
                                e.target.style.display = 'none';
                              }
                            }}
                          />
                        </div>

                        {/* Card Name */}
                        <div
                          style={{
                            fontWeight: "bold",
                            fontSize: "16px",
                            textAlign: "center",
                            color: "#333",
                            lineHeight: "1.3",
                            marginBottom: "8px",
                            padding: "0 8px",
                          }}
                        >
                          {card.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "200px",
                    fontSize: "16px",
                    color: "#666",
                  }}
                >
                  No cards found for "{modalSearchTerm}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeManagementPage;
