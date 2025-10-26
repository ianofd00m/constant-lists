import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const loggedIn = !!localStorage.getItem('token');
  const [cartItemCount, setCartItemCount] = useState(0);

  // Update cart item count from localStorage
  useEffect(() => {
    const updateCartCount = () => {
      try {
        const savedCart = localStorage.getItem('shoppingCart');
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          const totalItems = parsedCart.reduce((sum, item) => sum + parseInt(item.quantity || 1), 0);
          setCartItemCount(totalItems);
        } else {
          setCartItemCount(0);
        }
      } catch (error) {
        console.error('Error reading cart from localStorage:', error);
        setCartItemCount(0);
      }
    };

    // Update count on mount
    updateCartCount();

    // Listen for localStorage changes (when items are added to cart)
    const handleStorageChange = (e) => {
      if (e.key === 'shoppingCart') {
        updateCartCount();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom cart update events
    const handleCartUpdate = () => {
      updateCartCount();
    };
    window.addEventListener('cartUpdated', handleCartUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav style={{
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      background: '#1976d2', 
      color: '#fff', 
      padding: '0.5rem 2rem', 
      marginBottom: 24,
      position: 'relative',
      zIndex: 1000
    }}>
      <div style={{ fontWeight: 'bold', fontSize: 22 }}>
        <Link to="/home" style={{ color: '#fff', textDecoration: 'none' }}>Constant Lists</Link>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Link to="/research" style={{ color: '#fff' }}>Research</Link>
        <Link to="/build" style={{ color: '#fff' }}>Build</Link>
        <Link to="/collect" style={{ color: '#fff' }}>Collect</Link>
        <Link to="/trade" style={{ color: '#fff' }}>Trade</Link>
        
        {/* Shopping Cart Icon */}
        <Link 
          to="/shopping-cart" 
          style={{ 
            color: '#fff', 
            display: 'flex', 
            alignItems: 'center', 
            position: 'relative',
            textDecoration: 'none'
          }}
          title="Shopping Cart"
        >
          <img 
            src="/SVGs/shopping-cart-outline.svg" 
            alt="Shopping Cart" 
            style={{ 
              width: '20px', 
              height: '20px', 
              filter: 'invert(1)' // Makes the SVG white to match navbar text
            }} 
          />
          {cartItemCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: '#ef4444',
              color: 'white',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              minWidth: '16px'
            }}>
              {cartItemCount > 99 ? '99+' : cartItemCount}
            </span>
          )}
        </Link>
        
        {loggedIn && <Link to="/profile" style={{ color: '#fff' }}>Profile</Link>}
        {!loggedIn && <Link to="/login" style={{ color: '#fff' }}>Login</Link>}
        {loggedIn && <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>Logout</button>}
      </div>
    </nav>
  );
}
