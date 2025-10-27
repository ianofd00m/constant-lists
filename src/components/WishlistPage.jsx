import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './CardActionsModal.css';

export default function WishlistPage() {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPrice, setTotalPrice] = useState(0);
  const [groupBy, setGroupBy] = useState('none');

  // Load wishlist items from localStorage on component mount
  useEffect(() => {
    try {
      const savedWishlist = localStorage.getItem('global-wishlist');
      if (savedWishlist) {
        const parsedWishlist = JSON.parse(savedWishlist);
        setWishlistItems(parsedWishlist);
        calculateTotal(parsedWishlist);
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
      toast.error('Error loading wishlist');
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for wishlist updates from other components
  useEffect(() => {
    const handleWishlistUpdate = (event) => {
      const updatedWishlist = event.detail;
      setWishlistItems(updatedWishlist);
      calculateTotal(updatedWishlist);
    };

    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    return () => window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
  }, []);

  // Calculate total price of all items in wishlist
  const calculateTotal = (items) => {
    const total = items.reduce((sum, item) => {
      const price = parseFloat(item.cardObj?.prices?.usd) || 0;
      const quantity = parseInt(item.count) || 1;
      return sum + (price * quantity);
    }, 0);
    setTotalPrice(total);
  };

  // Save wishlist to localStorage
  const saveWishlist = (newWishlist) => {
    try {
      localStorage.setItem('global-wishlist', JSON.stringify(newWishlist));
      setWishlistItems(newWishlist);
      calculateTotal(newWishlist);
      
      // Dispatch custom event to update other components
      window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: newWishlist }));
    } catch (error) {
      console.error('Error saving wishlist:', error);
      toast.error('Error saving wishlist');
    }
  };

  // Remove item from wishlist
  const removeFromWishlist = (cardId) => {
    const newWishlist = wishlistItems.filter(item => item.printing !== cardId);
    saveWishlist(newWishlist);
    toast.success('Item removed from wishlist');
  };

  // Update quantity of item in wishlist
  const updateQuantity = (cardId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromWishlist(cardId);
      return;
    }

    const newWishlist = wishlistItems.map(item => 
      item.printing === cardId ? { ...item, count: newQuantity } : item
    );
    saveWishlist(newWishlist);
  };

  // Clear entire wishlist
  const clearWishlist = () => {
    if (wishlistItems.length === 0) return;
    
    if (window.confirm('Are you sure you want to clear your entire wishlist?')) {
      saveWishlist([]);
      toast.success('Wishlist cleared');
    }
  };

  // Format price for display
  const formatPrice = (price) => {
    const numPrice = parseFloat(price) || 0;
    return numPrice.toFixed(2);
  };

  // Group items by type, set, etc.
  const getGroupedItems = () => {
    if (groupBy === 'none') return { 'All Cards': wishlistItems };
    
    const grouped = {};
    wishlistItems.forEach(item => {
      let key = 'Other';
      
      if (groupBy === 'type') {
        const typeLine = item.cardObj?.type_line || '';
        if (typeLine.includes('Creature')) key = 'Creatures';
        else if (typeLine.includes('Instant')) key = 'Instants';
        else if (typeLine.includes('Sorcery')) key = 'Sorceries';
        else if (typeLine.includes('Enchantment')) key = 'Enchantments';
        else if (typeLine.includes('Artifact')) key = 'Artifacts';
        else if (typeLine.includes('Planeswalker')) key = 'Planeswalkers';
        else if (typeLine.includes('Land')) key = 'Lands';
      } else if (groupBy === 'set') {
        key = item.cardObj?.set_name || item.cardObj?.set?.toUpperCase() || 'Unknown Set';
      } else if (groupBy === 'cmc') {
        const cmc = item.cardObj?.cmc || 0;
        key = `${cmc} CMC`;
      }
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    
    return grouped;
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p>Loading wishlist...</p>
        </div>
      </div>
    );
  }

  const groupedItems = getGroupedItems();

  return (
    <div className="container" style={{ padding: '20px', maxWidth: '1200px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h1 style={{ margin: 0, color: '#1f2937' }}>My Wishlist</h1>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label htmlFor="groupBy" style={{ fontSize: '14px', color: '#6b7280' }}>
            Group by:
          </label>
          <select
            id="groupBy"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              fontSize: '14px'
            }}
          >
            <option value="none">None</option>
            <option value="type">Card Type</option>
            <option value="set">Set</option>
            <option value="cmc">Mana Cost</option>
          </select>
          
          {wishlistItems.length > 0 && (
            <button
              onClick={clearWishlist}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Clear Wishlist
            </button>
          )}
        </div>
      </div>

      {wishlistItems.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ color: '#6b7280', marginBottom: '12px' }}>Your wishlist is empty</h3>
          <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
            Add cards from deck builders or search results to start building your wishlist!
          </p>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>
            Use the "Add to Wishlist" button when viewing cards to save them here.
          </p>
        </div>
      ) : (
        <>
          <div style={{
            padding: '16px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#374151' }}>
                Total Items: {wishlistItems.reduce((sum, item) => sum + item.count, 0)}
              </span>
              <span style={{ fontWeight: 'bold', color: '#374151' }}>
                Est. Total Value: ${formatPrice(totalPrice)}
              </span>
            </div>
          </div>

          {Object.entries(groupedItems).map(([groupName, items]) => (
            <div key={groupName} style={{ marginBottom: '30px' }}>
              {groupBy !== 'none' && (
                <h3 style={{ 
                  color: '#374151', 
                  borderBottom: '2px solid #e5e7eb',
                  paddingBottom: '8px',
                  marginBottom: '16px'
                }}>
                  {groupName} ({items.length} cards)
                </h3>
              )}
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px'
              }}>
                {items.map((item) => (
                  <div
                    key={`${item.printing}-${item.name}`}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: 'white',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>
                          {item.name}
                        </h4>
                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
                          {item.cardObj?.set_name || item.cardObj?.set?.toUpperCase()} 
                          {item.cardObj?.collector_number && ` #${item.cardObj.collector_number}`}
                        </p>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#9ca3af' }}>
                          {item.cardObj?.type_line}
                        </p>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', color: '#6b7280' }}>Qty:</span>
                            <input
                              type="number"
                              value={item.count}
                              min="1"
                              max="999"
                              onChange={(e) => updateQuantity(item.printing, parseInt(e.target.value))}
                              style={{
                                width: '60px',
                                padding: '4px 8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '14px'
                              }}
                            />
                          </div>
                          
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669' }}>
                            ${formatPrice(item.cardObj?.prices?.usd || '0')}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => removeFromWishlist(item.printing)}
                        style={{
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginLeft: '12px'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    
                    {item.cardObj?.image_uris?.small && (
                      <div style={{ marginTop: '12px', textAlign: 'center' }}>
                        <img
                          src={item.cardObj.image_uris.small}
                          alt={item.name}
                          style={{
                            maxWidth: '100px',
                            height: 'auto',
                            borderRadius: '4px',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}