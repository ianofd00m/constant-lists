import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Import utilities for global debugging access
import PrintingPreferences from './utils/PrintingPreferences'
import PrintingCache from './utils/PrintingCache'

console.log('main.jsx loaded');

// Production React State Synchronization System
// This prevents React state corruption that causes search dropdown issues
function implementReactStateFix() {
  console.log('🔧 Implementing production React state synchronization system...');
  
  let stateFixActive = true;
  let stateCorruptionDetected = false;
  let lastStateCheck = 0;
  const STATE_CHECK_DELAY = 1000; // ms
  
  // Enhanced state validation function for React components
  function validateReactSearchState() {
    if (!stateFixActive) return { isValid: true };
    
    const now = Date.now();
    if (now - lastStateCheck < STATE_CHECK_DELAY) {
      return { isValid: !stateCorruptionDetected };
    }
    
    lastStateCheck = now;
    
    const searchInput = document.querySelector('input[type="text"]');
    const searchValue = searchInput ? searchInput.value.trim() : '';
    
    const allClickable = document.querySelectorAll('[style*="cursor: pointer"]');
    const searchResults = Array.from(allClickable).filter(el => {
      const text = el.textContent?.trim();
      return el.tagName === 'DIV' && 
             el.className === '' && 
             text?.length > 0 && 
             text?.length < 100 && 
             !text.includes('$') && 
             !text.includes('×') &&
             !text.includes('📋') &&
             !text.includes('🖼️') &&
             !text.includes('🔳') &&
             text !== 'Logout' &&
             text !== 'Necrobloom';
    });
    
    // State corruption detection: search results without search query
    const hasSearchResults = searchResults.length > 0;
    const hasSearchQuery = searchValue.length > 0;
    const isCorrupted = hasSearchResults && !hasSearchQuery;
    
    const state = {
      isValid: !isCorrupted,
      hasSearchResults,
      hasSearchQuery,
      searchResultsCount: searchResults.length,
      searchValue,
      isCorrupted
    };
    
    if (isCorrupted && !stateCorruptionDetected) {
      stateCorruptionDetected = true;
      console.error('🚨 React state corruption detected!', state);
      forceReactStateSync();
    } else if (!isCorrupted && stateCorruptionDetected) {
      console.log('✅ React state corruption resolved');
      stateCorruptionDetected = false;
    }
    
    return state;
  }
  
  // Force synchronous React state reset
  function forceReactStateSync() {
    console.log('⚛️ Forcing React state synchronization...');
    
    const searchInput = document.querySelector('input[type="text"]');
    if (!searchInput) return false;
    
    try {
      // Force React to acknowledge empty state
      const originalValue = searchInput.value;
      searchInput.value = '';
      
      // Trigger React events in the correct order
      const events = [
        new Event('input', { bubbles: true, cancelable: true }),
        new Event('change', { bubbles: true, cancelable: true }),
        new FocusEvent('blur', { bubbles: true, cancelable: true }),
        new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true })
      ];
      
      events.forEach(event => {
        searchInput.dispatchEvent(event);
      });
      
      // Force focus loss to trigger dropdown close
      document.body.focus();
      document.body.click();
      
      console.log('✅ React state sync completed');
      
      // Verify fix worked
      setTimeout(() => {
        const postFixState = validateReactSearchState();
        if (postFixState.isCorrupted) {
          console.error('❌ State sync failed, corruption persists');
        } else {
          console.log('✅ State sync successful');
        }
      }, 300);
      
      return true;
    } catch (error) {
      console.error('❌ React state sync failed:', error);
      return false;
    }
  }
  
  // Enhanced click monitoring with state validation
  document.addEventListener('click', function(event) {
    const target = event.target;
    const isSearchResult = target.tagName === 'DIV' && 
                          target.className === '' && 
                          target.style?.cursor === 'pointer';
    
    if (isSearchResult) {
      const cardText = target.textContent?.trim();
      console.log('🖱️ Search result clicked:', cardText);
      
      // Pre-click state validation
      const preClickState = validateReactSearchState();
      if (preClickState.isCorrupted) {
        console.warn('⚠️ Click on corrupted state detected, applying fix...');
        forceReactStateSync();
      }
      
      // Post-click validation
      setTimeout(() => {
        const postClickState = validateReactSearchState();
        console.log('📊 Post-click state:', {
          cardClicked: cardText,
          searchCleared: !postClickState.hasSearchQuery,
          resultsCleared: !postClickState.hasSearchResults,
          success: !postClickState.hasSearchResults && !postClickState.hasSearchQuery
        });
        
        if (postClickState.isCorrupted) {
          console.error('🚨 Click failed to clear state properly');
          forceReactStateSync();
        }
      }, 200);
    }
  }, true);
  
  // Input event monitoring for state sync issues
  document.addEventListener('input', function(event) {
    if (event.target.type === 'text') {
      // Monitor for search input changes
      setTimeout(() => {
        const state = validateReactSearchState();
        
        // If input is empty but we still have results, that's corruption
        if (event.target.value === '' && state.hasSearchResults) {
          console.warn('⚠️ Input cleared but search results persist');
          forceReactStateSync();
        }
      }, 100);
    }
  }, true);
  
  // DOM mutation monitoring for search result accumulation
  const observer = new MutationObserver(function(mutations) {
    if (!stateFixActive) return;
    
    let searchResultsChanged = false;
    
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        const addedNodes = Array.from(mutation.addedNodes);
        const hasSearchResults = addedNodes.some(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return false;
          const text = node.textContent?.trim();
          return node.tagName === 'DIV' && 
                 node.className === '' && 
                 text?.length > 0 && 
                 text?.length < 100 &&
                 node.style?.cursor === 'pointer';
        });
        
        if (hasSearchResults) {
          searchResultsChanged = true;
        }
      }
    });
    
    if (searchResultsChanged) {
      // Check for state corruption after DOM changes
      setTimeout(() => {
        validateReactSearchState();
      }, 100);
    }
  });
  
  // Start observing DOM changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Periodic state health monitoring
  setInterval(() => {
    validateReactSearchState();
  }, 5000); // Every 5 seconds
  
  // Initial state check
  const initialState = validateReactSearchState();
  console.log('🔍 Initial state check:', initialState);
  
  // Expose control function for debugging
  window.toggleReactStateFix = function(enabled) {
    stateFixActive = enabled;
    console.log(`🔧 React state fix ${enabled ? 'enabled' : 'disabled'}`);
  };
  
  // Enhanced debug function to see what search results are currently on page
  window.debugCurrentSearchResults = function() {
    const state = validateReactSearchState();
    const searchResults = document.querySelectorAll('[style*="cursor: pointer"]');
    console.log(`🔍 Found ${searchResults.length} clickable elements:`);
    
    const actualSearchResults = [];
    const otherElements = [];
    
    searchResults.forEach((result, index) => {
      const text = result.textContent.trim();
      const isSearchResult = result.tagName === 'DIV' && 
                            result.className === '' && 
                            text.length > 0 && 
                            text.length < 100 && 
                            !text.includes('$') && 
                            !text.includes('×') &&
                            !text.includes('📋') &&
                            !text.includes('🖼️') &&
                            !text.includes('🔳') &&
                            text !== 'Logout' &&
                            text !== 'Necrobloom';
      
      if (isSearchResult) {
        actualSearchResults.push({ index: index + 1, text, element: result });
        console.log(`  ${index + 1}: "${text}" (${result.tagName}, SEARCH RESULT)`);
      } else {
        otherElements.push({ index: index + 1, text, element: result });
        console.log(`  ${index + 1}: "${text}" (${result.tagName}, OTHER)`);
      }
    });
    
    console.log(`📊 Summary: ${actualSearchResults.length} search results, ${otherElements.length} other elements`);
    console.log(`🔍 State validation:`, state);
    
    if (state.isCorrupted) {
      console.warn('⚠️ State corruption detected!');
      console.log('💡 Run forceCleanup() to fix state corruption');
    }
    
    return { actualSearchResults, otherElements, state };
  };
  
  // Manual cleanup function
  window.forceCleanup = function() {
    console.log('🧹 Manual cleanup triggered...');
    return forceReactStateSync();
  };
  
  console.log('✅ Production React state fix active');
  console.log('💡 Use debugCurrentSearchResults() to see current state');
  console.log('💡 Use forceCleanup() to manually fix state corruption');
}

// Apply fix when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', implementReactStateFix);
} else {
  implementReactStateFix();
}

// Expose utilities globally for browser console debugging
window.PrintingPreferences = PrintingPreferences;
window.PrintingCache = PrintingCache;

createRoot(document.getElementById('root')).render(
  <App />
)
