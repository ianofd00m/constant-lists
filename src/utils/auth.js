/**
 * Authentication utilities for session management and token validation
 */

// Check if JWT token is expired
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if token has expired (exp is in seconds, Date.now() is in milliseconds)
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.log('🔒 Token has expired');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('🔒 Error checking token expiration:', error);
    return true;
  }
};

// Get valid token or null if expired/invalid
export const getValidToken = () => {
  const token = localStorage.getItem('token');
  
  if (!token || isTokenExpired(token)) {
    if (token) {
      console.log('🔒 Removing expired token');
      localStorage.removeItem('token');
      
      // Only clear temporary cache data, NOT user deck data
      // These are temporary caches that should be refreshed on login
      localStorage.removeItem('priceCache');
      localStorage.removeItem('cardPriceCache');
      localStorage.removeItem('lastDeckFetch');
      
      // Clear session-specific cache keys (but preserve deck data)
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_') ||
            key.includes('PriceCache') ||
            key.includes('searchResults')) {
          localStorage.removeItem(key);
        }
      });
    }
    return null;
  }
  
  return token;
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getValidToken();
};

// Auto-logout if token is expired (call this on app mount or route changes)
export const checkAuthAndRedirect = (navigate, redirectReason = 'access') => {
  if (!isAuthenticated()) {
    console.log('🔒 User not authenticated, redirecting to login');
    // Add reason as URL parameter to provide context on login page
    const reasons = {
      'access': 'Please log in or create an account to create, edit, or view decks.',
      'expired': 'Your session has expired. Please log in again.',
      'required': 'Login required to access this feature.'
    };
    const message = encodeURIComponent(reasons[redirectReason] || reasons['access']);
    navigate(`/login?message=${message}`);
    return false;
  }
  return true;
};

// Set up automatic token checking (every 5 minutes)
export const setupAutoTokenCheck = (navigate) => {
  const checkInterval = setInterval(() => {
    if (!isAuthenticated()) {
      console.log('🔒 Auto-logout: Token expired');
      clearInterval(checkInterval);
      const message = encodeURIComponent('Your session has expired. Please log in again.');
      navigate(`/login?message=${message}`);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
  
  return checkInterval;
};

// Manual logout function
export const logout = (navigate) => {
  console.log('🚪 Manual logout initiated');
  localStorage.removeItem('token');
  
  // ONLY clear temporary cache data - PRESERVE user deck data
  // User decks are stored on the server and should persist across sessions
  localStorage.removeItem('priceCache');
  localStorage.removeItem('cardPriceCache');
  localStorage.removeItem('lastDeckFetch');
  
  // Clear only session-specific cache keys (preserve user content)
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('cache_') ||
        key.includes('PriceCache') ||
        key.includes('searchResults') ||
        key.includes('sessionCache')) {
      localStorage.removeItem(key);
    }
  });
  
  console.log('🔒 Logout: Cleared only temporary cache data, preserved user decks');
  navigate('/login');
};