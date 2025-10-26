import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

export default function ShoppingCart() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPrice, setTotalPrice] = useState(0);

  // Load cart items from localStorage on component mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('shoppingCart');
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        setCartItems(parsedCart);
        calculateTotal(parsedCart);
      }
    } catch (error) {
      console.error('Error loading shopping cart:', error);
      toast.error('Error loading shopping cart');
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate total price of all items in cart
  const calculateTotal = (items) => {
    const total = items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return sum + (price * quantity);
    }, 0);
    setTotalPrice(total);
  };

  // Save cart to localStorage
  const saveCart = (newCart) => {
    try {
      localStorage.setItem('shoppingCart', JSON.stringify(newCart));
      setCartItems(newCart);
      calculateTotal(newCart);
      
      // Dispatch custom event to update navbar counter
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch (error) {
      console.error('Error saving shopping cart:', error);
      toast.error('Error saving shopping cart');
    }
  };

  // Remove item from cart
  const removeFromCart = (cardId) => {
    const newCart = cartItems.filter(item => item.id !== cardId);
    saveCart(newCart);
    toast.success('Item removed from shopping cart');
  };

  // Update quantity of item in cart
  const updateQuantity = (cardId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cardId);
      return;
    }

    const newCart = cartItems.map(item => 
      item.id === cardId ? { ...item, quantity: newQuantity } : item
    );
    saveCart(newCart);
  };

  // Clear entire cart
  const clearCart = () => {
    if (cartItems.length === 0) return;
    
    if (window.confirm('Are you sure you want to clear your entire shopping cart?')) {
      saveCart([]);
      toast.success('Shopping cart cleared');
    }
  };

  // Format price for display
  const formatPrice = (price) => {
    const numPrice = parseFloat(price) || 0;
    return numPrice.toFixed(2);
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
          <p>Loading shopping cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '16px'
      }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>
            🛒 Shopping Cart
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>
            Track cards you want to buy someday
          </p>
        </div>
        
        {cartItems.length > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669', marginBottom: '8px' }}>
              Total: ${formatPrice(totalPrice)}
            </div>
            <button
              onClick={clearCart}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>

      {/* Cart Content */}
      {cartItems.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          color: '#64748b'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛒</div>
          <h2 style={{ margin: '0 0 12px 0', color: '#374151' }}>Your shopping cart is empty</h2>
          <p style={{ margin: '0 0 24px 0', fontSize: '16px' }}>
            Add cards from search results to start building your wishlist!
          </p>
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            maxWidth: '500px',
            margin: '0 auto',
            textAlign: 'left'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#374151' }}>How to add cards:</h3>
            <ol style={{ margin: 0, paddingLeft: '20px', color: '#64748b' }}>
              <li>Go to any deck and search for cards</li>
              <li>Click "Show all results" to open the search modal</li>
              <li>Click "Add to Shopping Cart" on any card</li>
              <li>Come back here to track your wishlist!</li>
            </ol>
          </div>
        </div>
      ) : (
        <>
          {/* Cart Statistics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px'
          }}>
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#0369a1' }}>
                {cartItems.length}
              </div>
              <div style={{ fontSize: '14px', color: '#0369a1' }}>
                Unique Cards
              </div>
            </div>
            
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
                {cartItems.reduce((sum, item) => sum + parseInt(item.quantity || 1), 0)}
              </div>
              <div style={{ fontSize: '14px', color: '#059669' }}>
                Total Quantity
              </div>
            </div>
            
            <div style={{
              background: '#fefce8',
              border: '1px solid #fde047',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#ca8a04' }}>
                ${formatPrice(totalPrice)}
              </div>
              <div style={{ fontSize: '14px', color: '#ca8a04' }}>
                Estimated Total
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {cartItems.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                }}
              >
                {/* Card Image */}
                {item.image_url && (
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '5/7',
                      backgroundImage: `url(${item.image_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      cursor: 'zoom-in'
                    }}
                    onClick={() => window.open(item.image_url, '_blank')}
                    title="Click to view larger"
                  />
                )}
                
                {/* Card Details */}
                <div style={{ padding: '16px' }}>
                  <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1e293b',
                    lineHeight: '1.3'
                  }}>
                    {item.name}
                  </h3>
                  
                  {item.set_name && (
                    <div style={{
                      fontSize: '13px',
                      color: '#64748b',
                      marginBottom: '4px'
                    }}>
                      {item.set_name}
                    </div>
                  )}
                  
                  {item.type_line && (
                    <div style={{
                      fontSize: '13px',
                      color: '#64748b',
                      marginBottom: '12px'
                    }}>
                      {item.type_line}
                    </div>
                  )}
                  
                  <div style={{
                    fontSize: '14px',
                    color: '#059669',
                    fontWeight: '600',
                    marginBottom: '12px'
                  }}>
                    ${formatPrice(item.price)} each
                  </div>
                  
                  {/* Quantity Controls */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                      Qty:
                    </label>
                    <button
                      onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                      style={{
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}
                    >
                      −
                    </button>
                    <span style={{
                      minWidth: '24px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {item.quantity || 1}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                      style={{
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}
                    >
                      +
                    </button>
                    <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#374151', fontWeight: '600' }}>
                      ${formatPrice(parseFloat(item.price || 0) * parseInt(item.quantity || 1))}
                    </div>
                  </div>
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.id)}
                    style={{
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      width: '100%',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#fee2e2';
                      e.target.style.borderColor = '#fca5a5';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#fef2f2';
                      e.target.style.borderColor = '#fecaca';
                    }}
                  >
                    Remove from Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
