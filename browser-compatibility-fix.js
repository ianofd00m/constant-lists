// Browser Compatibility Fix for Windows 11/Brave Browser
// This script addresses common network and authentication issues

// 1. Enhanced CORS and Network Error Handling
function enhanceFetchWithRetry() {
  const originalFetch = window.fetch;
  
  window.fetch = async function(url, options = {}) {
    // CRITICAL: Check for AbortController usage - don't interfere with user cancellation
    const hasAbortSignal = options.signal && options.signal instanceof AbortSignal;
    if (hasAbortSignal && options.signal.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    // Default options for better Brave compatibility
    const enhancedOptions = {
      ...options,
      credentials: options.credentials || 'same-origin', // More conservative for Brave
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...options.headers
      }
    };

    // If there's an abort signal, don't retry - honor the cancellation
    const maxRetries = hasAbortSignal ? 1 : 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🌐 Fetch attempt ${attempt}/${maxRetries} to:`, url);
        
        // CRITICAL: Check if request was aborted before making the call
        if (hasAbortSignal && options.signal.aborted) {
          throw new DOMException('The operation was aborted.', 'AbortError');
        }
        
        const response = await originalFetch(url, enhancedOptions);
        
        // Log response for debugging
        console.log(`✅ Response ${response.status}:`, url);
        
        // Handle specific error codes that Brave treats differently
        if (response.status === 0) {
          throw new Error('Network error (Status 0) - possible CORS or connectivity issue');
        }
        
        return response;
        
      } catch (error) {
        console.error(`❌ Fetch attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        // CRITICAL: Don't retry on abort errors - user cancelled
        if (error.name === 'AbortError' || error.message.includes('aborted')) {
          throw error;
        }
        
        // Don't retry on authentication errors
        if (error.message.includes('401') || error.message.includes('403')) {
          throw error;
        }
        
        // Check abort signal before retrying
        if (hasAbortSignal && options.signal.aborted) {
          throw new DOMException('The operation was aborted.', 'AbortError');
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`⏳ Retrying in ${delay}ms...`);
          
          // Create a promise that can be aborted
          await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(resolve, delay);
            
            // If there's an abort signal, listen for it
            if (hasAbortSignal) {
              const abortHandler = () => {
                clearTimeout(timeoutId);
                reject(new DOMException('The operation was aborted.', 'AbortError'));
              };
              
              if (options.signal.aborted) {
                clearTimeout(timeoutId);
                reject(new DOMException('The operation was aborted.', 'AbortError'));
              } else {
                options.signal.addEventListener('abort', abortHandler, { once: true });
                
                // Clean up listener when promise resolves
                const originalResolve = resolve;
                resolve = (value) => {
                  options.signal.removeEventListener('abort', abortHandler);
                  originalResolve(value);
                };
              }
            }
          });
        }
      }
    }
    
    throw lastError;
  };
}

// 2. Brave-specific localStorage handling
function enhanceLocalStorage() {
  const originalSetItem = localStorage.setItem;
  const originalGetItem = localStorage.getItem;
  
  localStorage.setItem = function(key, value) {
    try {
      return originalSetItem.call(this, key, value);
    } catch (error) {
      console.warn('⚠️ localStorage.setItem failed (Brave privacy settings?):', error);
      // Fallback to sessionStorage for Brave strict mode
      try {
        sessionStorage.setItem(key, value);
      } catch (sessionError) {
        console.error('❌ Both localStorage and sessionStorage failed:', sessionError);
      }
    }
  };
  
  localStorage.getItem = function(key) {
    try {
      const value = originalGetItem.call(this, key);
      if (value !== null) return value;
      
      // Fallback to sessionStorage
      return sessionStorage.getItem(key);
    } catch (error) {
      console.warn('⚠️ localStorage.getItem failed:', error);
      try {
        return sessionStorage.getItem(key);
      } catch (sessionError) {
        console.error('❌ Both localStorage and sessionStorage getItem failed:', sessionError);
        return null;
      }
    }
  };
}

// 3. Network connectivity checker
function createConnectivityChecker() {
  let isOnline = navigator.onLine;
  let connectionQuality = 'unknown';
  
  // Check connection quality
  function checkConnectionQuality() {
    if (navigator.connection) {
      const connection = navigator.connection;
      connectionQuality = connection.effectiveType || 'unknown';
      console.log('📶 Connection info:', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      });
    }
  }
  
  // Monitor online/offline status
  window.addEventListener('online', () => {
    isOnline = true;
    console.log('🟢 Connection restored');
    checkConnectionQuality();
  });
  
  window.addEventListener('offline', () => {
    isOnline = false;
    console.log('🔴 Connection lost');
  });
  
  // Check connection on load
  checkConnectionQuality();
  
  return {
    isOnline: () => isOnline,
    getQuality: () => connectionQuality,
    check: checkConnectionQuality
  };
}

// 4. Enhanced authentication with Brave-specific handling
function enhanceAuthentication() {
  const originalSetToken = (token) => {
    try {
      localStorage.setItem('token', token);
      // Also set a backup in case Brave blocks localStorage
      sessionStorage.setItem('token_backup', token);
      console.log('✅ Token stored successfully');
    } catch (error) {
      console.warn('⚠️ Token storage failed, using sessionStorage only:', error);
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('token_backup', token);
    }
  };
  
  const getToken = () => {
    try {
      // Try localStorage first
      let token = localStorage.getItem('token');
      if (token) return token;
      
      // Fallback to sessionStorage
      token = sessionStorage.getItem('token') || sessionStorage.getItem('token_backup');
      if (token) {
        console.log('📝 Using token from sessionStorage fallback');
        return token;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Token retrieval failed:', error);
      return null;
    }
  };
  
  return { setToken: originalSetToken, getToken };
}

// 5. Windows-specific timezone handling
function handleTimezoneIssues() {
  // Windows tablets sometimes have timezone issues
  const fixedDate = new Date();
  console.log('⏰ Current timezone info:', {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    offset: fixedDate.getTimezoneOffset(),
    locale: navigator.language
  });
}

// 6. Initialize all fixes
function initializeBrowserCompatibility() {
  console.log('🔧 Initializing browser compatibility fixes for Windows 11/Brave...');
  
  // Check if we're on Windows
  const isWindows = navigator.platform.includes('Win');
  const isBrave = navigator.userAgent.includes('Brave') || (navigator.brave && navigator.brave.isBrave);
  
  console.log('🖥️ Browser detection:', {
    platform: navigator.platform,
    userAgent: navigator.userAgent.substring(0, 100) + '...',
    isWindows,
    isBrave,
    cookiesEnabled: navigator.cookieEnabled,
    language: navigator.language
  });
  
  // Apply fixes
  enhanceFetchWithRetry();
  enhanceLocalStorage();
  const connectivity = createConnectivityChecker();
  const auth = enhanceAuthentication();
  handleTimezoneIssues();
  
  // Make utilities available globally for debugging
  window.browserCompatibility = {
    connectivity,
    auth,
    isWindows,
    isBrave,
    checkConnection: () => {
      console.log('🔍 Connection status:', {
        online: connectivity.isOnline(),
        quality: connectivity.getQuality(),
        cookiesEnabled: navigator.cookieEnabled
      });
    }
  };
  
  console.log('✅ Browser compatibility fixes applied');
  console.log('🐛 Debug: Run window.browserCompatibility.checkConnection() to test connectivity');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeBrowserCompatibility);
} else {
  initializeBrowserCompatibility();
}

export default initializeBrowserCompatibility;