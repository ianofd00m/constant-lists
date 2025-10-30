import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import debounce from 'lodash.debounce';
import CardPreview from './CardPreview';
import { getUnifiedCardPrice, formatPrice } from '../utils/UnifiedPricing';
import './TradeManagementPage.css';

// TradeCardModal component for adding cards with printing selection and trader assignment
const TradeCardModal = ({ isOpen, onClose, card, onAddCard, onUpdateCard }) => {
  const modalRef = useRef(null);
  const [selectedPrinting, setSelectedPrinting] = useState(null);
  const [printings, setPrintings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isFoil, setIsFoil] = useState(false);
  const [assignTo, setAssignTo] = useState(null); // 'user1' or 'user2' - no default selection
  const [isEditing, setIsEditing] = useState(false);
  
  // Quantity editing states
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [tempQuantity, setTempQuantity] = useState('1');

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
        // New card - use defaults and set initial printing to search result card
        setQuantity(1);
        setIsFoil(false);
        setAssignTo(null); // No default selection
        setSelectedPrinting(card); // Start with the card from search results
      }

      fetchPrintings();
    }
  }, [isOpen, card]); // Simplified - only depend on isOpen and card

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
      
      // Auto-select the printing that matches the card, prioritizing stored printing data
      if (printingsData.length > 0) {
        let matchingPrinting = null;
        
        // Smart printing selection logic
        const scryfallData = card.scryfall_json || card.card || card;
        
        // First, try to match using stored printingData (for cards from trade)
        if (card.printingData) {
          matchingPrinting = printingsData.find(printing => 
            printing.id === card.printingData.id || 
            (printing.set === card.printingData.set && printing.collector_number === card.printingData.collector_number)
          );
          if (matchingPrinting) {
            console.log('🎯 Auto-selected from printingData:', matchingPrinting.set_name);
          }
        }
        
        // If no match from printingData, try to match using scryfall_json data
        if (!matchingPrinting) {
          matchingPrinting = printingsData.find(printing => 
            printing.id === scryfallData.id || 
            (printing.set === scryfallData.set && printing.collector_number === scryfallData.collector_number)
          );
          if (matchingPrinting) {
            console.log('🎯 Auto-selected from scryfall data:', matchingPrinting.set_name);
          }
        }
        
        // If still no match, try to match the card itself (fallback for search results)
        if (!matchingPrinting) {
          matchingPrinting = printingsData.find(printing => 
            printing.id === card.id || 
            (printing.set === card.set && printing.collector_number === card.collector_number)
          );
          if (matchingPrinting) {
            console.log('🎯 Auto-selected matching printing from search:', matchingPrinting.set_name);
          }
        }
        
        if (matchingPrinting) {
          setSelectedPrinting(matchingPrinting);
        } else {
          setSelectedPrinting(printingsData[0]);
          console.log('🎯 Auto-selected first printing (no match found):', printingsData[0].set_name);
        }
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
      scryfall_json: selectedPrinting,
      // Ensure printing data is preserved
      printingData: {
        id: selectedPrinting.id,
        set_name: selectedPrinting.set_name,
        set: selectedPrinting.set,
        collector_number: selectedPrinting.collector_number,
        image_uris: selectedPrinting.image_uris
      }
    };

    if (isEditing && onUpdateCard) {
      onUpdateCard(tradeCard, card.originalAssignment);
    } else {
      onAddCard(tradeCard);
    }
    onClose();
  };

  if (!isOpen) return null;

  // DISABLED: Escape key useEffect also causes infinite loops 
  // Need to implement keyboard shortcuts differently

  return (
    <div 
      ref={(el) => {
        modalRef.current = el;
        // Auto-focus when modal opens
        if (isOpen && el) {
          setTimeout(() => el.focus(), 0);
        }
      }}
      className="modal-backdrop card-actions-modal" 
      onClick={onClose}
      tabIndex={0}
      autoFocus
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
        maxWidth: '800px',
        width: '90%',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div className="modal-header">
          {/* Navigation arrows would go here when card list navigation is implemented */}
          {/* Left arrow for previous card */}
          <button 
            className="nav-arrow nav-arrow-left"
            title="Previous card (Left arrow key)"
            style={{
              position: 'absolute',
              left: '-60px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '2px solid #ddd',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              fontSize: '2rem',
              cursor: 'pointer',
              color: '#666',
              display: 'none', // Hidden until navigation is implemented
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            &#8249;
          </button>
          
          <button onClick={onClose} className="close-button">&times;</button>
          
          {/* Right arrow for next card */}
          <button 
            className="nav-arrow nav-arrow-right"
            title="Next card (Right arrow key)"
            style={{
              position: 'absolute',
              right: '-60px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '2px solid #ddd',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              fontSize: '2rem',
              cursor: 'pointer',
              color: '#666',
              display: 'none', // Hidden until navigation is implemented
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            &#8250;
          </button>
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

            {/* Quantity controls with Foil toggle positioned to the right */}
            <div className="action-row" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label className="control-label">Quantity:</label>
                <div className="quantity-controls" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <button 
                    className="quantity-btn" 
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    disabled={quantity <= 1}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px 0 0 4px',
                      border: '1px solid #ddd',
                      background: '#f8f9fa',
                      cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >−</button>
                  <input 
                    type="number" 
                    value={isEditingQuantity ? tempQuantity : quantity}
                    onChange={(e) => {
                      if (isEditingQuantity) {
                        setTempQuantity(e.target.value);
                      } else {
                        setQuantity(Math.max(1, parseInt(e.target.value) || 1));
                      }
                    }}
                    onFocus={(e) => {
                      setTempQuantity(quantity.toString());
                      setIsEditingQuantity(true);
                      setTimeout(() => e.target.select(), 0);
                    }}
                    onBlur={() => {
                      if (isEditingQuantity) {
                        const newQuantity = Math.max(1, parseInt(tempQuantity) || 1);
                        setQuantity(newQuantity);
                        setIsEditingQuantity(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const newQuantity = Math.max(1, parseInt(tempQuantity) || 1);
                        setQuantity(newQuantity);
                        setIsEditingQuantity(false);
                        e.target.blur();
                      } else if (e.key === 'Escape') {
                        setIsEditingQuantity(false);
                        e.target.blur();
                      }
                    }}
                    className={`quantity-input ${isEditingQuantity ? 'editing' : ''}`}
                    min="1"
                    style={{
                      width: '50px',
                      height: '28px',
                      border: isEditingQuantity ? '2px solid #1976d2' : '1px solid #ddd',
                      borderLeft: 'none',
                      borderRight: 'none',
                      textAlign: 'center',
                      fontSize: '14px',
                      backgroundColor: isEditingQuantity ? '#f0f8ff' : 'white'
                    }}
                  />
                  {isEditingQuantity && (
                    <span style={{ 
                      position: 'absolute', 
                      fontSize: '11px', 
                      color: '#666', 
                      top: '-18px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap',
                      backgroundColor: 'white',
                      padding: '2px 4px',
                      border: '1px solid #ddd',
                      borderRadius: '3px'
                    }}>
                      Enter to save, Esc to cancel
                    </span>
                  )}
                  <button 
                    className="quantity-btn" 
                    onClick={() => setQuantity(prev => prev + 1)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '0 4px 4px 0',
                      border: '1px solid #ddd',
                      background: '#f8f9fa',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >+</button>
                </div>
                
                {/* Foil toggle positioned to the right of quantity controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '15px' }}>
                  <label className="control-label">Foil:</label>
                  <label className="toggle-switch" style={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={isFoil}
                      onChange={(e) => setIsFoil(e.target.checked)}
                      style={{ margin: 0 }}
                    />
                    <span className={`toggle-slider ${isFoil ? 'foil-active' : ''}`} style={{
                      width: '44px',
                      height: '24px',
                      backgroundColor: isFoil ? '#d4af37' : '#ccc',
                      borderRadius: '12px',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      marginLeft: '8px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        top: '2px',
                        left: isFoil ? '22px' : '2px',
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}></span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Printings Selection - moved below quantity and foil controls */}
            <div style={{ marginTop: '15px' }}>
              <label className="control-label" style={{ marginBottom: '8px', display: 'block' }}>Printing:</label>
              {loading ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>Loading printings...</div>
              ) : (
                <select
                  value={selectedPrinting?.id || ''}
                  onChange={(e) => {
                    const printing = printings.find(p => p.id === e.target.value);
                    setSelectedPrinting(printing);
                  }}
                  style={{ 
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    width: '100%',
                    backgroundColor: 'white',
                    color: '#000',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: 'none'
                  }}
                >
                  {printings.map(printing => {
                    // Get price for this printing for display
                    const mockCardData = {
                      ...printing,
                      scryfall_json: printing,
                      foil: isFoil
                    };
                    const priceData = getUnifiedCardPrice(mockCardData, { preferStoredPrice: false });
                    const price = priceData?.price ? formatPrice(priceData.price) : 'N/A';
                    
                    return (
                      <option key={printing.id} value={printing.id}>
                        {printing.set_name} ({printing.set}) #{printing.collector_number} • {price}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

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
                  width: '360px', 
                  height: '504px', 
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
                

              </>
            )}

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
  
  // Refs for auto-focus functionality
  const mainSearchInputRef = useRef(null);
  
  // Printing dropdown states
  const [printingDropdowns, setPrintingDropdowns] = useState({});
  const [availablePrintings, setAvailablePrintings] = useState({});
  const [dropdownPositions, setDropdownPositions] = useState({});
  const [activeCard, setActiveCard] = useState(null); // Track which card has active dropdown
  
  // User names (editable)
  const [user1Name, setUser1Name] = useState('Me');
  const [user2Name, setUser2Name] = useState('Trading Partner');
  const [editingUser1, setEditingUser1] = useState(false);
  const [editingUser2, setEditingUser2] = useState(false);
  
  // Trade cards
  const [user1Cards, setUser1Cards] = useState([]);
  const [user2Cards, setUser2Cards] = useState([]);
  
  // Sort state
  const [sortOption, setSortOption] = useState('name'); // 'name', 'price', 'color', 'type', 'set'

  // Fetch card printings function
  const fetchCardPrintings = async (card) => {
    if (!card || !card.name) {
      throw new Error('Card name is required');
    }
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const url = `${apiUrl}/api/cards/printings?name=${encodeURIComponent(card.name)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch printings for', card.name, ':', error);
      throw error;
    }
  };
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [savingTrade, setSavingTrade] = useState(false);
  
  // Refs for search functionality
  const searchAbortControllerRef = useRef(null);
  const lastSearchTimeRef = useRef(0);
  const MIN_SEARCH_INTERVAL = 100;

  // Track if trade has been initialized to prevent re-initialization
  const tradeInitializedRef = useRef(false);
  
  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportDropdown && !event.target.closest('[data-export-dropdown]')) {
        setShowExportDropdown(false);
      }
    };
    
    if (showExportDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showExportDropdown]);
  
  // Initialize new trade or load existing
  useEffect(() => {
    if (tradeInitializedRef.current) {
      return;
    }
    
    if (isNew) {
      // Create a new trade with stable ID
      const newTradeId = `trade_${Date.now()}`;
      const newTrade = {
        id: newTradeId,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        user1_name: 'Me',
        user2_name: 'Trading Partner',
        user1_cards: [],
        user2_cards: []
      };
      setTrade(newTrade);
      setLoading(false);
      tradeInitializedRef.current = true;
    } else if (tradeId) {
      // Load existing trade from localStorage
      const savedTrades = JSON.parse(localStorage.getItem('savedTrades') || '[]');
      const existingTrade = savedTrades.find(t => t.id === tradeId);
      
      if (existingTrade) {
        setTrade(existingTrade);
        // Restore the sorting option
        if (existingTrade.sortOption) {
          setSortOption(existingTrade.sortOption);
        }
        // Restore the card lists
        if (existingTrade.user1_cards) {
          setUser1Cards(existingTrade.user1_cards);
        }
        if (existingTrade.user2_cards) {
          setUser2Cards(existingTrade.user2_cards);
        }
        // Restore user names
        if (existingTrade.user1_name) {
          setUser1Name(existingTrade.user1_name);
        }
        if (existingTrade.user2_name) {
          setUser2Name(existingTrade.user2_name);
        }
      } else {
        // Trade not found, redirect to trade list
        toast.error('Trade not found');
        navigate('/trade');
        return;
      }
      setLoading(false);
      tradeInitializedRef.current = true;
    } else {
      // Fallback - if neither isNew nor tradeId, treat as new trade
      const fallbackTradeId = `trade_${Date.now()}`;
      const fallbackTrade = {
        id: fallbackTradeId,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        user1_name: 'Me',
        user2_name: 'Trading Partner',
        user1_cards: [],
        user2_cards: []
      };
      setTrade(fallbackTrade);
      setLoading(false);
      tradeInitializedRef.current = true;
    }
  }, [isNew, tradeId]);

  // Search function removed - now using stable ref-based approach

  // Debounced search function - using stable ref to prevent infinite loop
  const debouncedSearchRef = useRef();
  
  // Create debounced search only once
  if (!debouncedSearchRef.current) {
    debouncedSearchRef.current = debounce(async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        setShowDropdown(false);
        setNoResultsMsg('');
        setSearchLoading(false);
        setIsKeyboardNavigation(false);
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
        
        setSearchResults(uniqueResults.slice(0, 20));
        setShowDropdown(uniqueResults.length > 0);
        setNoResultsMsg(uniqueResults.length === 0 ? 'No cards found' : '');
        setSelectedSearchIndex(-1);
        setIsKeyboardNavigation(false);
        
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Search error:', error);
          setSearchResults([]);
          setShowDropdown(false);
          setNoResultsMsg('Search failed');
        }
      }
      
      setSearchLoading(false);
    }, 500);
  }

  // DISABLED: Search useEffect causes infinite loops - need alternative approach
  // useEffect(() => {
  //   if (search.trim()) {
  //     debouncedSearchRef.current(search);
  //   } else {
  //     // Clear immediately when search is empty
  //     setSearchResults([]);
  //     setShowDropdown(false);
  //     setNoResultsMsg('');
  //     setSearchLoading(false);
  //     setIsKeyboardNavigation(false);
  //   }
  //   return () => debouncedSearchRef.current?.cancel();
  // }, [search]); // Only depend on search, not the function

  // Handle modal focus and escape key functionality - DISABLED to debug infinite loop
  // useEffect(() => {
  //   if (!showSearchModal) return;

  //   // Focus the modal immediately when it opens
  //   const focusModal = () => {
  //     const modalElement = document.querySelector('[data-search-modal="true"]');
  //     if (modalElement) {
  //       modalElement.focus();
  //     }
  //   };

  //   // Use setTimeout to ensure the modal is in the DOM - with proper cleanup
  //   const timeoutId = setTimeout(focusModal, 0);

  //   const handleEscape = (event) => {
  //     if (event.key === 'Escape') {
  //       event.preventDefault();
  //       setShowSearchModal(false);
  //     }
  //   };

  //   document.addEventListener('keydown', handleEscape);
  //   return () => {
  //     clearTimeout(timeoutId); // Clear timeout on cleanup
  //     document.removeEventListener('keydown', handleEscape);
  //   };
  // }, [showSearchModal]);

  // Auto-focus main search input on component mount and when modal closes
  useEffect(() => {
    // Focus on initial load
    if (mainSearchInputRef.current) {
      mainSearchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    // Focus main search when modal closes
    if (!showSearchModal && mainSearchInputRef.current) {
      // Small delay to ensure modal is fully closed
      setTimeout(() => {
        if (mainSearchInputRef.current) {
          mainSearchInputRef.current.focus();
        }
      }, 100);
    }
  }, [showSearchModal]);

  // Handle escape key and click outside to close printing dropdowns
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        setPrintingDropdowns({});
      }
    };

    const handleClickOutside = (e) => {
      // Check if click is outside any printing dropdown
      if (!e.target.closest('[data-printing-dropdown]') && !e.target.closest('[data-card-name]')) {
        setPrintingDropdowns({});
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Close search dropdown when clicking outside or pressing Escape - DISABLED to debug infinite loop
  // useEffect(() => {
  //   if (!showDropdown) return;

  //   const handleClickOutside = (event) => {
  //     // Check if the click is outside the search container
  //     const searchContainer = event.target.closest(".search-container");
  //     if (!searchContainer) {
  //       setShowDropdown(false);
  //       setSearch(''); // Clear the search input when clicking outside
  //       setSearchResults([]);
  //       setSelectedSearchIndex(-1);
  //       setIsKeyboardNavigation(false); // Reset keyboard navigation when clicking outside
  //     }
  //   };

  //   const handleEscapeKey = (event) => {
  //     if (event.key === "Escape") {
  //       setShowDropdown(false);
  //       setSearch(''); // Clear the search input when pressing Escape
  //       setSearchResults([]);
  //       setSelectedSearchIndex(-1);
  //     }
  //   };

  //   // Add event listeners
  //   document.addEventListener("mousedown", handleClickOutside);
  //   document.addEventListener("keydown", handleEscapeKey);

  //   // Cleanup event listeners
  //   return () => {
  //     document.removeEventListener("mousedown", handleClickOutside);
  //     document.removeEventListener("keydown", handleEscapeKey);
  //   };
  // }, [showDropdown]);

  // Handle card selection from search results
  const handleSearchCardClick = (card) => {
    // Instead of opening modal, show dropdown selection for user assignment
    setModalCard(card);
    setIsModalOpen(true);
    setSearch('');
    setShowDropdown(false);
    setSearchResults([]);
    
    console.log('🔥 DEBUGGING: handleSearchCardClick finished');
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
  const handleAddCard = useCallback((tradeCard) => {
    if (tradeCard.assignedTo === 'user1') {
      setUser1Cards(prev => [...prev, tradeCard]);
    } else {
      setUser2Cards(prev => [...prev, tradeCard]);
    }
  }, []);

  // Update existing card in trade
  const handleUpdateCard = useCallback((updatedCard, originalAssignment) => {
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
  }, []);

  // Add card directly to User 1 from search modal
  const addCardToUser1 = (card) => {
    const tradeCard = {
      id: `${card.id || card.scryfall_id}-${Date.now()}-user1`,
      name: card.name,
      quantity: 1,
      foil: false,
      scryfall_json: card,
      assignedTo: 'user1',
      // Add fields needed for card preview
      card: {
        name: card.name,
        image_uris: card.image_uris,
        mana_cost: card.mana_cost,
        type_line: card.type_line,
        oracle_text: card.oracle_text,
        power: card.power,
        toughness: card.toughness,
        scryfall_id: card.id || card.scryfall_id
      }
    };
    setUser1Cards(prev => [...prev, tradeCard]);
  };

  // Add card directly to User 2 from search modal
  const addCardToUser2 = (card) => {
    const tradeCard = {
      id: `${card.id || card.scryfall_id}-${Date.now()}-user2`,
      name: card.name,
      quantity: 1,
      foil: false,
      scryfall_json: card,
      assignedTo: 'user2',
      // Add fields needed for card preview
      card: {
        name: card.name,
        image_uris: card.image_uris,
        mana_cost: card.mana_cost,
        type_line: card.type_line,
        oracle_text: card.oracle_text,
        power: card.power,
        toughness: card.toughness,
        scryfall_id: card.id || card.scryfall_id
      }
    };
    setUser2Cards(prev => [...prev, tradeCard]);
  };

  // Remove card from trade
  const handleRemoveCard = (cardId, fromUser) => {
    if (fromUser === 'user1') {
      setUser1Cards(prev => prev.filter(card => card.id !== cardId));
    } else {
      setUser2Cards(prev => prev.filter(card => card.id !== cardId));
    }
  };

  // Calculate optimal dropdown position to keep it visible within containers
  const calculateDropdownPosition = (event) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const dropdownHeight = 200; // max height of dropdown
    
    // Find the closest scrollable container (trade list container)
    const container = element.closest('[style*="overflow"], [style*="scroll"]') || 
                     element.closest('.trade-container') ||
                     document.body;
    
    const containerRect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Check space within container and viewport
    const spaceBelow = Math.min(
      containerRect.bottom - rect.bottom,
      viewportHeight - rect.bottom
    );
    const spaceAbove = Math.min(
      rect.top - containerRect.top,
      rect.top
    );
    
    const shouldShowAbove = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
    
    return {
      position: shouldShowAbove ? 'above' : 'below',
      top: shouldShowAbove ? 'auto' : '100%',
      bottom: shouldShowAbove ? '100%' : 'auto'
    };
  };

  // Preload card printings on hover for instant dropdown
  const preloadCardPrintings = (cardName) => {
    if (!availablePrintings[cardName]) {
      fetchCardPrintings({ name: cardName }).then(printings => {
        setAvailablePrintings(prev => ({
          ...prev,
          [cardName]: printings
        }));
      }).catch(error => {
        // Silent fail for preloading
      });
    }
  };

  // Handle printing dropdown toggle and fetching
  const handleCardNameClick = (card, cardIndex, userType, event) => {
    const dropdownKey = `${userType}-${card.id}`;
    
    // Close if already open
    if (printingDropdowns[dropdownKey]) {
      setPrintingDropdowns(prev => ({
        ...prev,
        [dropdownKey]: false
      }));
      setDropdownPositions(prev => {
        const newPos = {...prev};
        delete newPos[dropdownKey];
        return newPos;
      });
      setActiveCard(null);
      return;
    }
    
    // Calculate position for better visibility
    const position = calculateDropdownPosition(event);
    setDropdownPositions(prev => ({
      ...prev,
      [dropdownKey]: position
    }));
    
    // Set this card as active and close all other dropdowns
    setActiveCard(dropdownKey);
    setPrintingDropdowns({ [dropdownKey]: true });
    
    // Fetch printings in background if not already cached
    if (!availablePrintings[card.name]) {
      // Don't await - let it fetch in background while dropdown shows
      fetchCardPrintings(card).then(printings => {
        setAvailablePrintings(prev => ({
          ...prev,
          [card.name]: printings
        }));
      }).catch(error => {
        console.error('Failed to fetch printings:', error);
        // Keep dropdown open even on error to show the current printing
      });
    }
  };

  // Handle selecting a different printing
  const handlePrintingSelect = (newPrinting, originalCard, userType) => {
    const updatedCard = {
      ...newPrinting,
      id: `${newPrinting.id || newPrinting.scryfall_id}-${Date.now()}-${userType}`,
      quantity: originalCard.quantity,
      foil: originalCard.foil,
      assignedTo: userType,
      scryfall_json: newPrinting,
      card: newPrinting
    };

    if (userType === 'user1') {
      setUser1Cards(prev => prev.map(card => 
        card.id === originalCard.id ? updatedCard : card
      ));
    } else {
      setUser2Cards(prev => prev.map(card => 
        card.id === originalCard.id ? updatedCard : card
      ));
    }

    // Close dropdown
    setPrintingDropdowns({});
  };

  // Duplicate card as separate line item
  const handleDuplicateCard = (cardToDuplicate, fromUser) => {
    const duplicatedCard = {
      ...cardToDuplicate,
      id: `${cardToDuplicate.id}_duplicate_${Date.now()}`, // New unique ID
      quantity: 1 // Start with quantity 1 for the duplicate
    };
    
    if (fromUser === 'user1') {
      setUser1Cards(prev => [...prev, duplicatedCard]);
    } else {
      setUser2Cards(prev => [...prev, duplicatedCard]);
    }
  };

  // Save trade to pending trades
  const handleSaveTrade = async () => {
    if (savingTrade) return;
    
    setSavingTrade(true);
    try {
      // Generate trade name in format: yyyy.mm.dd - user1 name(#items) & user2 name(#items)
      const today = new Date();
      const dateStr = today.getFullYear() + '.' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '.' + 
                    String(today.getDate()).padStart(2, '0');
      
      const user1Count = user1Cards.length;
      const user2Count = user2Cards.length;
      const tradeName = `${dateStr} - ${user1Name}(${user1Count}) & ${user2Name}(${user2Count})`;
      
      // Create trade object
      const tradeToSave = {
        id: trade?.id || `trade_${Date.now()}`,
        name: tradeName,
        date: today.toISOString().split('T')[0],
        status: 'pending',
        user1_name: user1Name,
        user2_name: user2Name,
        user1_cards: user1Cards,
        user2_cards: user2Cards,
        sortOption: sortOption, // Preserve sorting preference
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Get existing trades from localStorage or create empty array
      const existingTrades = JSON.parse(localStorage.getItem('savedTrades') || '[]');
      
      // Check if trade already exists (updating vs creating new)
      const existingIndex = existingTrades.findIndex(t => t.id === tradeToSave.id);
      if (existingIndex >= 0) {
        // Update existing trade
        existingTrades[existingIndex] = { ...existingTrades[existingIndex], ...tradeToSave };
        toast.success('Trade updated successfully!');
      } else {
        // Add new trade
        existingTrades.push(tradeToSave);
        toast.success('Trade saved successfully!');
      }
      
      // Save back to localStorage
      localStorage.setItem('savedTrades', JSON.stringify(existingTrades));
      
      // Update current trade state
      setTrade(tradeToSave);
      
    } catch (error) {
      console.error('Error saving trade:', error);
      toast.error('Failed to save trade');
    } finally {
      setSavingTrade(false);
    }
  };

  // Export trade as text file
  const handleExportText = () => {
    try {
      // Create formatted text content
      let textContent = `TRADE EXPORT\n`;
      textContent += `Date: ${new Date().toLocaleDateString()}\n`;
      textContent += `${user1Name} & ${user2Name}\n`;
      textContent += `\n${'='.repeat(50)}\n\n`;
      
      // User 1 section
      textContent += `${user1Name.toUpperCase()}'S CARDS (${user1Cards.length} items):\n`;
      textContent += `-${'-'.repeat(user1Name.length + 15)}\n`;
      
      const sortedUser1Cards = getSortedCardsWithSeparators(user1Cards);
      let currentGroup = '';
      
      sortedUser1Cards.forEach(item => {
        if (item.isSeparator) {
          if (currentGroup) textContent += '\n';
          textContent += `\n--- ${item.groupName.toUpperCase()} ---\n`;
          currentGroup = item.groupName;
        } else {
          const card = item;
          const setInfo = card.scryfall_json?.set_name || card.set || '';
          const collectorNumber = card.scryfall_json?.collector_number || card.collector_number || '';
          // Use unified pricing system for individual cards like we do for totals
          const priceData = getUnifiedCardPrice(card, { fallbackPrice: '0.00' });
          const price = priceData.price && parseFloat(priceData.price) > 0 ? ` - ${formatPrice(priceData.price)}` : ' - N/A';
          const foilText = card.foil ? ' (Foil)' : '';
          
          textContent += `${card.quantity}x ${card.name}`;
          if (setInfo) textContent += ` [${setInfo}${collectorNumber ? ' #' + collectorNumber : ''}]`;
          textContent += `${foilText}${price}\n`;
        }
      });
      
      textContent += `\n${'='.repeat(50)}\n\n`;
      
      // User 2 section
      textContent += `${user2Name.toUpperCase()}'S CARDS (${user2Cards.length} items):\n`;
      textContent += `-${'-'.repeat(user2Name.length + 15)}\n`;
      
      const sortedUser2Cards = getSortedCardsWithSeparators(user2Cards);
      currentGroup = '';
      
      sortedUser2Cards.forEach(item => {
        if (item.isSeparator) {
          if (currentGroup) textContent += '\n';
          textContent += `\n--- ${item.groupName.toUpperCase()} ---\n`;
          currentGroup = item.groupName;
        } else {
          const card = item;
          const setInfo = card.scryfall_json?.set_name || card.set || '';
          const collectorNumber = card.scryfall_json?.collector_number || card.collector_number || '';
          // Use unified pricing system for individual cards like we do for totals
          const priceData = getUnifiedCardPrice(card, { fallbackPrice: '0.00' });
          const price = priceData.price && parseFloat(priceData.price) > 0 ? ` - ${formatPrice(priceData.price)}` : ' - N/A';
          const foilText = card.foil ? ' (Foil)' : '';
          
          textContent += `${card.quantity}x ${card.name}`;
          if (setInfo) textContent += ` [${setInfo}${collectorNumber ? ' #' + collectorNumber : ''}]`;
          textContent += `${foilText}${price}\n`;
        }
      });
      
      // Calculate totals using proper pricing system
      const calculateTotal = (cards) => {
        return cards.reduce((sum, card) => {
          const priceData = getUnifiedCardPrice(card, { fallbackPrice: '0.00' });
          const price = parseFloat(priceData.price || 0);
          const quantity = card.quantity || 1;
          return sum + (price * quantity);
        }, 0);
      };
      
      const user1Total = calculateTotal(user1Cards);
      const user2Total = calculateTotal(user2Cards);
      
      textContent += `\n${'='.repeat(50)}\n`;
      textContent += `TOTALS:\n`;
      textContent += `${user1Name}: ${formatPrice(user1Total)}\n`;
      textContent += `${user2Name}: ${formatPrice(user2Total)}\n`;
      
      // Create and download file
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trade_${user1Name}_${user2Name}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setShowExportDropdown(false);
      toast.success('Text file exported successfully!');
    } catch (error) {
      console.error('Error exporting text:', error);
      toast.error('Failed to export text file');
    }
  };

  // Export trade as PDF
  const handleExportPDF = async () => {
    try {
      // Dynamic import of jsPDF
      const { default: jsPDF } = await import('jspdf');
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      const margin = 20;
      const columnWidth = (pageWidth - margin * 3) / 2; // Two columns with margins
      
      let yPosition = margin;
      
      // Title
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text('TRADE SUMMARY', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      
      // Date and names
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
      pdf.text(`${user1Name} & ${user2Name}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Column headers
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${user1Name} (${user1Cards.length} cards)`, margin, yPosition);
      pdf.text(`${user2Name} (${user2Cards.length} cards)`, margin + columnWidth + margin, yPosition);
      yPosition += 10;
      
      // Reset font for content
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      
      // Helper function to add card list to PDF
      const addCardsToPDF = (cards, startX) => {
        let currentY = yPosition;
        const sortedCards = getSortedCardsWithSeparators(cards);
        
        sortedCards.forEach(item => {
          if (currentY > pageHeight - 20) {
            pdf.addPage();
            currentY = margin;
            // Re-add headers on new page
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'bold');
            pdf.text(`${user1Name} (${user1Cards.length} cards)`, margin, currentY);
            pdf.text(`${user2Name} (${user2Cards.length} cards)`, margin + columnWidth + margin, currentY);
            currentY += 10;
            pdf.setFontSize(8);
            pdf.setFont(undefined, 'normal');
          }
          
          if (item.isSeparator) {
            pdf.setFont(undefined, 'bold');
            pdf.text(`--- ${item.groupName} ---`, startX, currentY);
            pdf.setFont(undefined, 'normal');
            currentY += 4;
          } else {
            const card = item;
            const setInfo = card.scryfall_json?.set_name || card.set || '';
            const collectorNumber = card.scryfall_json?.collector_number || card.collector_number || '';
            // Use unified pricing system for individual cards like we do for totals
            const priceData = getUnifiedCardPrice(card, { fallbackPrice: '0.00' });
            const price = priceData.price && parseFloat(priceData.price) > 0 ? ` - ${formatPrice(priceData.price)}` : ' - N/A';
            const foilText = card.foil ? ' (F)' : '';
            
            let cardText = `${card.quantity}x ${card.name}`;
            if (setInfo) cardText += ` [${setInfo}${collectorNumber ? ' #' + collectorNumber : ''}]`;
            cardText += `${foilText}${price}`;
            
            // Split long text if needed
            const lines = pdf.splitTextToSize(cardText, columnWidth - 5);
            lines.forEach(line => {
              pdf.text(line, startX, currentY);
              currentY += 3;
            });
          }
        });
        
        return currentY;
      };
      
      // Add cards for both users in parallel columns
      const user1EndY = addCardsToPDF(user1Cards, margin);
      const user2EndY = addCardsToPDF(user2Cards, margin + columnWidth + margin);
      
      // Add totals at the bottom
      const finalY = Math.max(user1EndY, user2EndY) + 10;
      if (finalY > pageHeight - 30) {
        pdf.addPage();
        yPosition = margin;
      } else {
        yPosition = finalY;
      }
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.text('TOTALS:', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
      
      // Calculate totals using proper pricing system  
      const calculateTotal = (cards) => {
        return cards.reduce((sum, card) => {
          const priceData = getUnifiedCardPrice(card, { fallbackPrice: '0.00' });
          const price = parseFloat(priceData.price || 0);
          const quantity = card.quantity || 1;
          return sum + (price * quantity);
        }, 0);
      };
      
      const user1Total = calculateTotal(user1Cards);
      const user2Total = calculateTotal(user2Cards);
      
      pdf.text(`${user1Name}: ${formatPrice(user1Total)}`, margin, yPosition);
      pdf.text(`${user2Name}: ${formatPrice(user2Total)}`, margin + columnWidth + margin, yPosition);
      
      // Save the PDF
      const filename = `trade_${user1Name}_${user2Name}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      
      setShowExportDropdown(false);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  // Get sorted cards with separator elements
  const getSortedCardsWithSeparators = (cards) => {
    const sortedCards = [...cards];
    let result = [];
    
    switch (sortOption) {
      case 'color':
        const colorGroups = {};
        const colorMap = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };
        
        sortedCards.forEach(card => {
          const colors = card.scryfall_json?.colors || [];
          let colorKey;
          
          if (colors.length === 0) {
            colorKey = 'Colorless';
          } else if (colors.length === 1) {
            colorKey = colorMap[colors[0]] || colors[0];
          } else {
            colorKey = 'Multicolor';
          }
          
          if (!colorGroups[colorKey]) colorGroups[colorKey] = [];
          colorGroups[colorKey].push(card);
        });
        
        const colorOrder = ['White', 'Blue', 'Black', 'Red', 'Green', 'Multicolor', 'Colorless'];
        colorOrder.forEach((color, index) => {
          if (colorGroups[color] && colorGroups[color].length > 0) {
            // Always add separator for group headers
            result.push({ isSeparator: true, groupName: color, id: `sep-${color}` });
            result.push(...colorGroups[color].sort((a, b) => a.name.localeCompare(b.name)));
          }
        });
        return result;

      case 'type':
        const typeGroups = {};
        sortedCards.forEach(card => {
          const typeLine = card.scryfall_json?.type_line?.split('—')[0]?.trim() || 'Unknown';
          const basicTypes = ['Artifact', 'Creature', 'Enchantment', 'Instant', 'Land', 'Planeswalker', 'Sorcery'];
          const type = basicTypes.find(t => typeLine.includes(t)) || typeLine;
          
          if (!typeGroups[type]) typeGroups[type] = [];
          typeGroups[type].push(card);
        });
        
        const sortedTypes = Object.keys(typeGroups).sort();
        sortedTypes.forEach((type, index) => {
          // Always add separator for group headers
          result.push({ isSeparator: true, groupName: type, id: `sep-${type}` });
          result.push(...typeGroups[type].sort((a, b) => a.name.localeCompare(b.name)));
        });
        return result;

      case 'set':
        const setGroups = {};
        sortedCards.forEach(card => {
          const set = card.scryfall_json?.set_name || card.set || 'Unknown';
          if (!setGroups[set]) setGroups[set] = [];
          setGroups[set].push(card);
        });
        
        const sortedSets = Object.keys(setGroups).sort();
        sortedSets.forEach((set, index) => {
          // Always add separator for group headers
          result.push({ isSeparator: true, groupName: set, id: `sep-${set}` });
          result.push(...setGroups[set].sort((a, b) => a.name.localeCompare(b.name)));
        });
        return result;

      default:
        return sortCards(sortedCards);
    }
  };

  // Sort function with group detection
  const sortCardsWithGroups = (cards) => {
    const sortedCards = [...cards];
    
    switch (sortOption) {
      case 'color':
      case 'type':
      case 'set':
        // These need group separators
        return getSortedCardsWithSeparators(sortedCards);
      default:
        // Simple sorts don't need separators
        return sortCards(sortedCards);
    }
  };

  // Sort function
  const sortCards = (cards) => {
    const sortedCards = [...cards];
    
    switch (sortOption) {
      case 'name':
        return sortedCards.sort((a, b) => a.name.localeCompare(b.name));
      
      case 'price':
        return sortedCards.sort((a, b) => {
          const priceA = getUnifiedCardPrice(a, { fallbackPrice: '0.00' }).price;
          const priceB = getUnifiedCardPrice(b, { fallbackPrice: '0.00' }).price;
          return parseFloat(priceB || 0) - parseFloat(priceA || 0); // High to low
        });
      
      case 'color':
        const colorGroups = {};
        const colorMap = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };
        
        sortedCards.forEach(card => {
          const colors = card.scryfall_json?.colors || [];
          let colorKey;
          
          if (colors.length === 0) {
            colorKey = 'Colorless';
          } else if (colors.length === 1) {
            colorKey = colorMap[colors[0]] || colors[0];
          } else {
            colorKey = 'Multicolor';
          }
          
          if (!colorGroups[colorKey]) colorGroups[colorKey] = [];
          colorGroups[colorKey].push(card);
        });
        
        const colorOrder = ['White', 'Blue', 'Black', 'Red', 'Green', 'Multicolor', 'Colorless'];
        return colorOrder.reduce((result, color) => {
          if (colorGroups[color]) {
            result.push(...colorGroups[color].sort((a, b) => a.name.localeCompare(b.name)));
          }
          return result;
        }, []);
      
      case 'type':
        const typeGroups = {};
        sortedCards.forEach(card => {
          const typeLine = card.scryfall_json?.type_line?.split('—')[0]?.trim() || 'Unknown';
          // Extract the basic type (last word before subtypes)
          const basicTypes = ['Artifact', 'Creature', 'Enchantment', 'Instant', 'Land', 'Planeswalker', 'Sorcery'];
          const type = basicTypes.find(t => typeLine.includes(t)) || typeLine;
          
          if (!typeGroups[type]) typeGroups[type] = [];
          typeGroups[type].push(card);
        });
        
        return Object.keys(typeGroups).sort().reduce((result, type) => {
          result.push(...typeGroups[type].sort((a, b) => a.name.localeCompare(b.name)));
          return result;
        }, []);
      
      case 'set':
        const setGroups = {};
        sortedCards.forEach(card => {
          const set = card.scryfall_json?.set_name || 'Unknown Set';
          if (!setGroups[set]) setGroups[set] = [];
          setGroups[set].push(card);
        });
        
        return Object.keys(setGroups).sort().reduce((result, set) => {
          result.push(...setGroups[set].sort((a, b) => a.name.localeCompare(b.name)));
          return result;
        }, []);
      
      default:
        return sortedCards;
    }
  };

  // Calculate totals
  const user1Total = useMemo(() => {
    return user1Cards.reduce((sum, card) => {
      const priceData = getUnifiedCardPrice(card, { fallbackPrice: '0.00' });
      const price = parseFloat(priceData.price || 0);
      const quantity = card.quantity || 1;
      return sum + (price * quantity);
    }, 0);
  }, [user1Cards]);

  const user2Total = useMemo(() => {
    return user2Cards.reduce((sum, card) => {
      const priceData = getUnifiedCardPrice(card, { fallbackPrice: '0.00' });
      const price = parseFloat(priceData.price || 0);
      const quantity = card.quantity || 1;
      return sum + (price * quantity);
    }, 0);
  }, [user2Cards]);

  // Navigation functions removed to prevent infinite loops

  // Modal close function
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  if (loading) {
    return (
      <div className="container">
        <h2>Loading Trade...</h2>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '1200px', padding: '10px 20px', margin: '0 auto' }}>
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
        <h1 style={{ margin: '0', fontSize: '24px' }}>{isNew ? 'Create New Trade' : (trade?.name || `Trade ${trade?.id}`)}</h1>
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
              ref={mainSearchInputRef}
              type="text"
              placeholder="Search for cards to add (Scryfall syntax supported)..."
              value={search}
              data-trade-search="true"
              onChange={(e) => {
                const newSearch = e.target.value;
                setSearch(newSearch);
                // Trigger search directly since useEffect is disabled to prevent infinite loops
                if (newSearch.trim()) {
                  debouncedSearchRef.current(newSearch);
                } else {
                  setSearchResults([]);
                  setShowDropdown(false);
                  setNoResultsMsg('');
                  setSearchLoading(false);
                  setIsKeyboardNavigation(false);
                }
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

          {/* Sort Dropdown */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              Sort by:
            </label>
            <select 
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                fontSize: '14px'
              }}
            >
              <option value="name">A-Z (Name)</option>
              <option value="price">$ - $$$ (Price)</option>
              <option value="color">Color</option>
              <option value="type">Card Type</option>
              <option value="set">Set</option>
            </select>
          </div>

          {/* Save and Export Actions */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button 
              className="btn btn-success" 
              style={{ flex: 1 }}
              onClick={handleSaveTrade}
              disabled={savingTrade}
            >
              {savingTrade ? 'Saving...' : 'Save Trade'}
            </button>
            
            {/* Export Dropdown */}
            <div style={{ flex: 1, position: 'relative' }} data-export-dropdown>
              <button 
                className="btn btn-secondary" 
                style={{ width: '100%' }}
                onClick={() => setShowExportDropdown(!showExportDropdown)}
              >
                Export ▼
              </button>
              
              {showExportDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  zIndex: 1000
                }}>
                  <button
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: 'none',
                      background: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderBottom: '1px solid #eee',
                      color: '#333'
                    }}
                    onClick={handleExportText}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    Export Text
                  </button>
                  <button
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: 'none',
                      background: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: '#333'
                    }}
                    onClick={handleExportPDF}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    Export PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Column - User 1 (Me) */}
        <div 
          style={{ flex: '1 1 350px', maxWidth: '400px', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column' }}
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
                {user1Name}
              </h2>
            )}
          </div>

          {/* Card List */}
          <div 
            className="trade-container trade-container-user1"
            style={{ 
              marginBottom: '20px', 
              height: '400px', 
              overflowY: 'auto',
              overflowX: 'visible',
              scrollbarWidth: 'none', /* Firefox */
              msOverflowStyle: 'none' /* IE and Edge */
            }}
          >
            {user1Cards.length === 0 ? (
              <div style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', marginTop: '50px' }}>
                No cards added yet
              </div>
            ) : (
              sortCardsWithGroups(user1Cards).map((item, index) => {
                // Handle separator elements
                if (item.isSeparator) {
                  return (
                    <div 
                      key={item.id}
                      style={{
                        borderTop: '1px solid #ddd',
                        margin: '10px 0 5px 0',
                        paddingTop: '5px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#666',
                        textAlign: 'left'
                      }}
                    >
                      {item.groupName}
                    </div>
                  );
                }
                
                // Handle regular cards
                const card = item;
                const isActiveCard = activeCard?.id === card.id && activeCard?.userType === 'user1';
                return (
                <div 
                  key={card.id}
                  draggable
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '5px',
                    cursor: 'grab',
                    transition: 'all 0.2s ease',
                    border: isActiveCard ? '1px solid #007bff' : '1px solid transparent',
                    backgroundColor: isActiveCard ? '#e3f2fd' : 'transparent',
                    borderRadius: isActiveCard ? '4px 4px 0 0' : '4px', // Open bottom when active
                    padding: isActiveCard ? '2px' : '0',
                    outline: isActiveCard ? '2px solid #007bff' : 'none',
                    outlineOffset: isActiveCard ? '1px' : '0',
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
                      // Don't open dropdown if clicking control buttons
                      if (e.target.closest('.trade-controls')) return;
                      // Show printing dropdown instead of modal for better UX
                      handleCardNameClick(card, null, 'user1', e);
                    }}
                  >
                    <span style={{ fontWeight: 'bold', color: '#333', minWidth: '20px', fontSize: '11px' }}>
                      {card.quantity}
                    </span>
                    <div style={{ position: 'relative', flex: 1, minWidth: '80px' }}>
                      <span 
                        data-card-name="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardNameClick(card, null, 'user1', e);
                        }}
                        style={{ 
                          fontWeight: 'bold',
                          color: card.foil ? '#d4af37' : '#333',
                          fontSize: '11px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          display: 'block'
                        }}
                        title="Click to see other printings"
                      >
                        {card.name}
                      </span>
                      
                      {/* Printing Dropdown - Seamless Card List */}
                      {printingDropdowns[`user1-${card.id}`] && availablePrintings[card.name] && (
                        <div 
                          data-printing-dropdown="true"
                          style={{
                          position: 'absolute',
                          top: '-4px',
                          left: '0px',
                          width: '400px',
                          backgroundColor: 'white',
                          border: '1px solid #007bff',
                          borderRadius: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          zIndex: 9999,
                          maxHeight: '300px',
                          overflowY: 'auto'
                        }}>
                          {/* Current Selection - Overlay Card Layout Exactly */}
                          <div style={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            backgroundColor: '#e3f2fd',
                            borderBottom: '1px solid #007bff',
                            padding: '0 8px', // Add padding to align with card content
                            minHeight: '24px' // Match card height exactly
                          }}>
                            <span style={{ fontWeight: 'bold', color: '#333', minWidth: '20px', fontSize: '11px' }}>
                              {/* No quantity display */}
                            </span>
                            <div style={{ position: 'relative', flex: 1, minWidth: '80px' }}>
                              <span 
                                style={{
                                  fontWeight: 'bold',
                                  color: '#d4af37',
                                  fontSize: '11px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'block'
                                }}
                              >
                                {card.name}
                              </span>
                            </div>
                            <img 
                              alt={card.scryfall_json?.set}
                              src={`/svgs/${card.scryfall_json?.set}.svg`}
                              style={{ width: '14px', height: '14px', flexShrink: 0 }}
                              onError={(e) => { 
                                if (e.target.src.includes('/svgs/')) { 
                                  const setCode = e.target.src.split('/').pop().replace('.svg', ''); 
                                  e.target.src = `https://svgs.scryfall.io/sets/${setCode}.svg`; 
                                } else { 
                                  e.target.style.display = 'none'; 
                                } 
                              }}
                            />
                            <span style={{ 
                              fontSize: '11px', 
                              color: '#666', 
                              flexShrink: 0,
                              fontFamily: 'monospace',
                              minWidth: '25px',
                              width: '25px'
                            }}>
                              {card.scryfall_json?.set?.toUpperCase() || 'UNK'}
                            </span>
                            <span style={{ 
                              fontSize: '11px', 
                              color: '#666', 
                              flexShrink: 0,
                              fontFamily: 'monospace',
                              minWidth: '25px'
                            }}>
                              {card.scryfall_json?.collector_number}
                            </span>
                            <span style={{ 
                              fontSize: '12px', 
                              color: '#059669', 
                              fontWeight: '600',
                              flexShrink: 0,
                              fontFamily: 'monospace',
                              minWidth: '40px',
                              textAlign: 'right'
                            }}>
                              {card.price ? `$${parseFloat(card.price).toFixed(2)}` : '$0.00'}
                            </span>
                          </div>
                          
                          {/* Alternative Printings - Same Layout */}
                          {availablePrintings[card.name]
                            .filter(printing => printing.id !== card.scryfall_json?.id)
                            .map((printing, pIndex) => (
                            <div
                              key={`${printing.id}-${pIndex}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintingSelect(printing, card, 'user1');
                              }}
                              style={{
                                flex: 1,
                                minWidth: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '14px',
                                cursor: 'pointer',
                                backgroundColor: 'white',
                                borderBottom: pIndex < availablePrintings[card.name].filter(p => p.id !== card.scryfall_json?.id).length - 1 ? '1px solid #eee' : 'none',
                                padding: '0 8px', // Add padding to align with card content
                                minHeight: '24px', // Match card height exactly
                                transition: 'background-color 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#f5f5f5';
                                // Update card preview on hover
                                handleCardHover({
                                  ...printing,
                                  card: printing,
                                  scryfall_json: printing,
                                  image_uris: printing.image_uris,
                                  foil: card.foil
                                });
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'white';
                                // Reset to original card preview on mouse leave
                                handleCardHover({
                                  ...card,
                                  card: card.card || card.scryfall_json || card,
                                  scryfall_json: card.scryfall_json,
                                  image_uris: card.scryfall_json?.image_uris,
                                  foil: card.foil
                                });
                              }}
                            >
                              {/* Match exact card structure */}
                              <span style={{ fontWeight: 'bold', color: '#333', minWidth: '20px', fontSize: '11px' }}>
                                {/* No quantity display */}
                              </span>
                              <div style={{ position: 'relative', flex: 1, minWidth: '80px' }}>
                                <span 
                                  style={{
                                    fontWeight: 'bold',
                                    color: '#d4af37',
                                    fontSize: '11px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    display: 'block'
                                  }}
                                >
                                  {printing.name}
                                </span>
                              </div>
                              <img 
                                alt={printing.set}
                                src={`/svgs/${printing.set.toLowerCase()}.svg`}
                                style={{ width: '14px', height: '14px', flexShrink: 0 }}
                                onError={(e) => { 
                                  if (e.target.src.includes('/svgs/')) { 
                                    const setCode = e.target.src.split('/').pop().replace('.svg', ''); 
                                    e.target.src = `https://svgs.scryfall.io/sets/${setCode}.svg`; 
                                  } else { 
                                    e.target.style.display = 'none'; 
                                  } 
                                }}
                              />
                              <span style={{ 
                                fontSize: '11px', 
                                color: '#666', 
                                flexShrink: 0,
                                fontFamily: 'monospace',
                                minWidth: '25px',
                                width: '25px'
                              }}>
                                {printing.set?.toUpperCase() || 'UNK'}
                              </span>
                              <span style={{ 
                                fontSize: '11px', 
                                color: '#666', 
                                flexShrink: 0,
                                fontFamily: 'monospace',
                                minWidth: '25px'
                              }}>
                                {printing.collector_number}
                              </span>
                              <span style={{ 
                                fontSize: '12px', 
                                color: '#059669', 
                                fontWeight: '600',
                                flexShrink: 0,
                                fontFamily: 'monospace',
                                minWidth: '40px',
                                textAlign: 'right'
                              }}>
                                {formatPrice(getUnifiedCardPrice(printing, { fallbackPrice: '0.00' }).price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {card.scryfall_json?.set && (
                      <img 
                        src={`/svgs/${card.scryfall_json.set.toLowerCase()}.svg`}
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
                      minWidth: '25px',
                      width: '25px'
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
                      {formatPrice(getUnifiedCardPrice(card, { fallbackPrice: '0.00' }).price)}
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
                        justifyContent: 'center',
                        outline: 'none'
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
                        justifyContent: 'center',
                        outline: 'none'
                      }}
                      title="Increase quantity"
                    >
                      +
                    </button>
                    
                    {/* Duplicate Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateCard(card, 'user1');
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
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        outline: 'none'
                      }}
                      title="Duplicate as separate line item"
                    >
                      ⧉
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
                        justifyContent: 'center',
                        outline: 'none'
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
                        justifyContent: 'center',
                        outline: 'none'
                      }}
                      title="Remove card"
                    >
                      ×
                    </button>
                  </div>
                </div>
                );
              })
            )}
          </div>

          {/* Total for User 1 */}
          <div style={{
            marginTop: 'auto',
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
          style={{ flex: '1 1 350px', maxWidth: '400px', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column' }}
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
                {user2Name}
              </h2>
            )}
          </div>

          {/* Card List */}
          <div 
            className="trade-container trade-container-user2"
            style={{ 
              marginBottom: '20px', 
              height: '400px', 
              overflowY: 'auto',
              overflowX: 'visible',
              scrollbarWidth: 'none', /* Firefox */
              msOverflowStyle: 'none' /* IE and Edge */
            }}
          >
            {user2Cards.length === 0 ? (
              <div style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', marginTop: '50px' }}>
                No cards added yet
              </div>
            ) : (
              sortCardsWithGroups(user2Cards).map(item => {
                // Handle separator elements
                if (item.isSeparator) {
                  return (
                    <div 
                      key={item.id}
                      style={{
                        borderTop: '1px solid #ddd',
                        margin: '10px 0 5px 0',
                        paddingTop: '5px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#666',
                        textAlign: 'left'
                      }}
                    >
                      {item.groupName}
                    </div>
                  );
                }
                
                // Handle regular cards
                const card = item;
                const isActiveCard = activeCard?.id === card.id && activeCard?.userType === 'user2';
                return (
                <div 
                  key={card.id}
                  draggable
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '5px',
                    cursor: 'grab',
                    transition: 'all 0.2s ease',
                    border: isActiveCard ? '1px solid #007bff' : '1px solid transparent',
                    backgroundColor: isActiveCard ? '#e3f2fd' : 'transparent',
                    borderRadius: isActiveCard ? '4px 4px 0 0' : '4px', // Open bottom when active
                    padding: isActiveCard ? '2px' : '0',
                    outline: isActiveCard ? '2px solid #007bff' : 'none',
                    outlineOffset: isActiveCard ? '1px' : '0',
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
                      // Don't open dropdown if clicking control buttons
                      if (e.target.closest('.trade-controls')) return;
                      // Show printing dropdown instead of modal for better UX
                      handleCardNameClick(card, null, 'user2', e);
                    }}
                  >
                    <span style={{ fontWeight: 'bold', color: '#333', minWidth: '20px', fontSize: '11px' }}>
                      {card.quantity}
                    </span>
                    <div style={{ position: 'relative', flex: 1, minWidth: '80px' }}>
                      <span 
                        data-card-name="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardNameClick(card, null, 'user2', e);
                        }}
                        style={{ 
                          fontWeight: 'bold',
                          color: card.foil ? '#d4af37' : '#333',
                          fontSize: '11px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          display: 'block'
                        }}
                        title="Click to see other printings"
                      >
                        {card.name}
                      </span>
                      
                      {/* Printing Dropdown */}
                      {printingDropdowns[`user2-${card.id}`] && availablePrintings[card.name] && (
                        <div 
                          data-printing-dropdown="true"
                          style={{
                          position: 'absolute',
                          top: '-4px',
                          left: '0px',
                          width: '400px',
                          backgroundColor: 'white',
                          border: '1px solid #007bff',
                          borderRadius: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          zIndex: 9999,
                          maxHeight: '300px',
                          overflowY: 'auto'
                        }}>
                          {/* Current Selection - Match Card Layout Exactly */}
                          <div style={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            backgroundColor: '#e3f2fd',
                            borderBottom: '1px solid #007bff',
                            padding: '0 8px', // Add padding to align with card content
                            minHeight: '24px' // Match card height exactly
                          }}>
                            <span style={{ fontWeight: 'bold', color: '#333', minWidth: '20px', fontSize: '11px' }}>
                              {/* No quantity display */}
                            </span>
                            <div style={{ position: 'relative', flex: 1, minWidth: '80px' }}>
                              <span 
                                style={{
                                  fontWeight: 'bold',
                                  color: '#d4af37',
                                  fontSize: '11px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'block'
                                }}
                              >
                                {card.name}
                              </span>
                            </div>
                            <img 
                              alt={card.scryfall_json?.set}
                              src={`/svgs/${card.scryfall_json?.set}.svg`}
                              style={{ width: '14px', height: '14px', flexShrink: 0 }}
                              onError={(e) => { 
                                if (e.target.src.includes('/svgs/')) { 
                                  const setCode = e.target.src.split('/').pop().replace('.svg', ''); 
                                  e.target.src = `https://svgs.scryfall.io/sets/${setCode}.svg`; 
                                } else { 
                                  e.target.style.display = 'none'; 
                                } 
                              }}
                            />
                            <span style={{ 
                              fontSize: '11px', 
                              color: '#666', 
                              flexShrink: 0,
                              fontFamily: 'monospace',
                              minWidth: '25px',
                              width: '25px'
                            }}>
                              {card.scryfall_json?.set?.toUpperCase() || 'UNK'}
                            </span>
                            <span style={{ 
                              fontSize: '11px', 
                              color: '#666', 
                              flexShrink: 0,
                              fontFamily: 'monospace',
                              minWidth: '25px'
                            }}>
                              {card.scryfall_json?.collector_number}
                            </span>
                            <span style={{ 
                              fontSize: '12px', 
                              color: '#059669', 
                              fontWeight: '600',
                              flexShrink: 0,
                              fontFamily: 'monospace',
                              minWidth: '40px',
                              textAlign: 'right'
                            }}>
                              {card.price ? `$${parseFloat(card.price).toFixed(2)}` : '$0.00'}
                            </span>
                          </div>
                          
                          {/* Alternative Printings - Same Layout */}
                          {availablePrintings[card.name]
                            .filter(printing => printing.id !== card.scryfall_json?.id)
                            .map((printing, pIndex) => (
                            <div
                              key={`${printing.id}-${pIndex}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintingSelect(printing, card, 'user2');
                              }}
                              style={{
                                flex: 1,
                                minWidth: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '14px',
                                cursor: 'pointer',
                                backgroundColor: 'white',
                                borderBottom: pIndex < availablePrintings[card.name].filter(p => p.id !== card.scryfall_json?.id).length - 1 ? '1px solid #eee' : 'none',
                                padding: '0 8px', // Add padding to align with card content
                                minHeight: '24px', // Match card height exactly
                                transition: 'background-color 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#f5f5f5';
                                // Update card preview on hover
                                handleCardHover({
                                  ...printing,
                                  card: printing,
                                  scryfall_json: printing,
                                  image_uris: printing.image_uris,
                                  foil: card.foil
                                });
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'white';
                                // Reset to original card preview on mouse leave
                                handleCardHover({
                                  ...card,
                                  card: card.card || card.scryfall_json || card,
                                  scryfall_json: card.scryfall_json,
                                  image_uris: card.scryfall_json?.image_uris,
                                  foil: card.foil
                                });
                              }}
                            >
                              {/* Match exact card structure */}
                              <span style={{ fontWeight: 'bold', color: '#333', minWidth: '20px', fontSize: '11px' }}>
                                {/* No quantity display */}
                              </span>
                              <div style={{ position: 'relative', flex: 1, minWidth: '80px' }}>
                                <span 
                                  style={{
                                    fontWeight: 'bold',
                                    color: '#d4af37',
                                    fontSize: '11px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    display: 'block'
                                  }}
                                >
                                  {printing.name}
                                </span>
                              </div>
                              <img 
                                alt={printing.set}
                                src={`/svgs/${printing.set.toLowerCase()}.svg`}
                                style={{ width: '14px', height: '14px', flexShrink: 0 }}
                                onError={(e) => { 
                                  if (e.target.src.includes('/svgs/')) { 
                                    const setCode = e.target.src.split('/').pop().replace('.svg', ''); 
                                    e.target.src = `https://svgs.scryfall.io/sets/${setCode}.svg`; 
                                  } else { 
                                    e.target.style.display = 'none'; 
                                  } 
                                }}
                              />
                              <span style={{ 
                                fontSize: '11px', 
                                color: '#666', 
                                flexShrink: 0,
                                fontFamily: 'monospace',
                                minWidth: '25px',
                                width: '25px'
                              }}>
                                {printing.set?.toUpperCase() || 'UNK'}
                              </span>
                              <span style={{ 
                                fontSize: '11px', 
                                color: '#666', 
                                flexShrink: 0,
                                fontFamily: 'monospace',
                                minWidth: '25px'
                              }}>
                                {printing.collector_number}
                              </span>
                              <span style={{ 
                                fontSize: '12px', 
                                color: '#059669', 
                                fontWeight: '600',
                                flexShrink: 0,
                                fontFamily: 'monospace',
                                minWidth: '40px',
                                textAlign: 'right'
                              }}>
                                {formatPrice(getUnifiedCardPrice(printing, { fallbackPrice: '0.00' }).price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {card.scryfall_json?.set && (
                      <img 
                        src={`/svgs/${card.scryfall_json.set.toLowerCase()}.svg`}
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
                      minWidth: '25px',
                      width: '25px'
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
                      {formatPrice(getUnifiedCardPrice(card, { fallbackPrice: '0.00' }).price)}
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
                        justifyContent: 'center',
                        outline: 'none'
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
                        justifyContent: 'center',
                        outline: 'none'
                      }}
                      title="Increase quantity"
                    >
                      +
                    </button>
                    
                    {/* Duplicate Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateCard(card, 'user2');
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
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        outline: 'none'
                      }}
                      title="Duplicate as separate line item"
                    >
                      ⧉
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
                        justifyContent: 'center',
                        outline: 'none'
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
                        justifyContent: 'center',
                        outline: 'none'
                      }}
                      title="Remove card"
                    >
                      ×
                    </button>
                  </div>
                </div>
                );
              })
            )}
          </div>

          {/* Total for User 2 */}
          <div style={{
            marginTop: 'auto',
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
        onClose={closeModal}
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
              
              {/* Search Input Inside Modal */}
              <div style={{ marginTop: "10px" }}>
                <input
                  type="text"
                  placeholder="Search for cards..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && search.trim()) {
                      setModalSearchTerm(search.trim());
                      // Trigger search with new term
                      if (search.trim()) {
                        debouncedSearchRef.current(search);
                      }
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "2px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "16px",
                    outline: "none",
                    transition: "border-color 0.2s ease",
                    backgroundColor: "white",
                    color: "#333",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#007bff";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#ddd";
                  }}
                  autoFocus
                />
              </div>
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
                        onClick={(e) => {
                          // Only open modal if clicking on the card image/name area, not buttons
                          if (!e.target.closest('.add-card-buttons')) {
                            setModalCard(card);
                            setIsModalOpen(true);
                            setShowSearchModal(false);
                          }
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
                            marginBottom: "12px",
                            padding: "0 8px",
                          }}
                        >
                          {card.name}
                        </div>

                        {/* Add Card Buttons */}
                        <div 
                          className="add-card-buttons"
                          style={{
                            display: "flex",
                            gap: "8px",
                            width: "100%",
                            justifyContent: "space-between",
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addCardToUser1(card);
                            }}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              backgroundColor: "#1976d2",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = "#1565c0";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = "#1976d2";
                            }}
                          >
                            Add to Me
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addCardToUser2(card);
                            }}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              backgroundColor: "#dc004e",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = "#c2185b";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = "#dc004e";
                            }}
                          >
                            Add to Pal
                          </button>
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
