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
          // Could trigger page reload as last resort
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
        
        // Ensure the element is properly interactive
        if (result.style.cursor === 'pointer') {
          result.style.pointerEvents = 'auto';
          
          // Force a repaint by briefly changing a style
          const originalTransform = result.style.transform;
          result.style.transform = 'translateZ(0)';
          
          // Use requestAnimationFrame to ensure the change is applied
          requestAnimationFrame(() => {
            result.style.transform = originalTransform;
          });
        }
        
  // Enhanced click monitoring with state validation
  document.addEventListener('click', function(event) {
    const target = event.target;
    const isSearchResult = target.tagName === 'DIV' && 
                          target.className === '' && 
                          target.style?.cursor === 'pointer';
    
    if (isSearchResult) {
      const cardText = target.textContent?.trim();
      console.log('�️ Search result clicked:', cardText);
      
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
    
    // Detect search result clicks
    const isSearchResult = target.tagName === 'DIV' && 
                          target.className === '' && 
                          text.trim().length > 0 && 
                          text.length < 100 && 
                          !text.includes('$') && 
                          !text.includes('×') && 
                          target.style.cursor === 'pointer';
    
    if (isSearchResult) {
      console.log('🖱️ Search click detected:', {
        cardName: text.trim(),
        timestamp: new Date().toISOString()
      });
      
      // Immediate stabilization for the clicked element
      target.getBoundingClientRect();
      window.getComputedStyle(target).getPropertyValue('display');
      
      // Check for problematic cards and provide extra handling
      const textLower = text.toLowerCase();
      if (textLower.includes('constant mists') || 
          textLower.includes('gateway plaza') ||
          textLower.includes('world shaper') ||
          textLower.includes('barren moor')) {
        console.log('� PROBLEMATIC CARD CLICKED:', text.trim());
        
        // Emergency post-click verification
        setTimeout(() => {
          const searchInput = document.querySelector('input[type="text"]');
          const dropdown = document.querySelector('[style*="cursor: pointer"]');
          console.log('Post-click verification:', {
            searchCleared: searchInput ? searchInput.value === '' : 'no input',
            dropdownHidden: !dropdown
          });
        }, 200);
      }
    }
  }, true);
  
  // Watch for DOM mutations and stabilize immediately
  const observer = new MutationObserver(function(mutations) {
    if (!stabilizationActive) return;
    
    let shouldStabilize = false;
    
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        // Check if search results were added
        const addedNodes = Array.from(mutation.addedNodes);
        const hasSearchResults = addedNodes.some(node => {
          return node.nodeType === Node.ELEMENT_NODE && 
                 (node.querySelector && node.querySelector('[style*="cursor: pointer"]')) ||
                 (node.style && node.style.cursor === 'pointer');
        });
        
        if (hasSearchResults) {
          shouldStabilize = true;
        }
      }
    });
    
    if (shouldStabilize) {
      const currentSearchResults = document.querySelectorAll('[style*="cursor: pointer"]');
      // Only log DOM mutations occasionally to reduce noise
      if (Math.random() < 0.3) { // 30% chance to log
        console.log(`🔄 DOM mutation detected: ${currentSearchResults.length > 0 ? 'search results changed' : 'general change'}`);
      }
      // Use a small delay to let React finish updating
      setTimeout(stabilizeSearchResults, 50);
    }
  });
          
          // Brief pause to let React finish updates
  
  // Start observing DOM changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Periodic stabilization to catch issues that develop over time
  setInterval(() => {
    if (!stabilizationActive) return;
    
    const searchResults = document.querySelectorAll('[style*="cursor: pointer"]');
    if (searchResults.length > 0) {
      // Only log and stabilize if we haven't stabilized recently or if the count changed
      const currentTime = Date.now();
      const timeSinceLastStabilization = currentTime - lastStabilization;
      
      // Only run periodic stabilization if it's been a while since the last one
      if (timeSinceLastStabilization > 8000) { // 8 seconds minimum
        // Only log occasionally to reduce noise
        if (stabilizationCount % 10 === 0) {
          console.log(`🔄 Periodic stabilization check: ${searchResults.length} results`);
        }
        stabilizeSearchResults();
      }
    }
  }, 10000); // Every 10 seconds (less frequent)
  
  // Automatic cleanup for accumulated search results
  setInterval(() => {
    if (!stabilizationActive) return;
    
    const allClickable = document.querySelectorAll('[style*="cursor: pointer"]');
    const actualSearchResults = Array.from(allClickable).filter(el => {
      const text = el.textContent.trim();
      return el.tagName === 'DIV' && 
             el.className === '' && 
             text.length > 0 && 
             text.length < 100 && 
             !text.includes('$') && 
             !text.includes('×') &&
             !text.includes('📋') &&
             !text.includes('🖼️') &&
             !text.includes('🔳') &&
             text !== 'Logout' &&
             text !== 'Necrobloom';
    });
    
    // If we have more than 5 search results without an active search, clean up
    const searchInput = document.querySelector('input[type="text"]');
    const hasActiveSearch = searchInput && searchInput.value.trim().length > 0;
    
    if (actualSearchResults.length > 5 && !hasActiveSearch) {
      console.log(`🧹 Auto-cleanup: Found ${actualSearchResults.length} leftover search results, clearing...`);
      
      // Try to clear them by triggering escape and clicking elsewhere
      document.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'Escape', 
        code: 'Escape',
        keyCode: 27,
        bubbles: true 
      }));
      
      document.body.click();
      
      // Force a brief search clear cycle
      if (searchInput) {
        const originalValue = searchInput.value;
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(() => {
          searchInput.value = originalValue;
          if (originalValue.trim()) {
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, 50);
      }
    }
  }, 15000); // Every 15 seconds
  
  // Initial stabilization
  setTimeout(stabilizeSearchResults, 100);
  
  // Expose control function for debugging
  window.toggleClickStabilization = function(enabled) {
    stabilizationActive = enabled;
    console.log(`🔧 Auto-stabilization ${enabled ? 'enabled' : 'disabled'}`);
  };
  
  // Debug function to see what search results are currently on page
  window.debugCurrentSearchResults = function() {
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
    
    if (actualSearchResults.length > 5) {
      console.log('⚠️ Too many search results detected - this may cause click issues');
      console.log('💡 Run forceCleanup() to clear leftover search results');
    }
    
    return { actualSearchResults, otherElements };
  };
  
  // Manual cleanup function
  window.forceCleanup = function() {
    console.log('🧹 Manual cleanup triggered...');
    
    const searchInput = document.querySelector('input[type="text"]');
    const originalValue = searchInput ? searchInput.value : '';
    
    // Clear search input
    if (searchInput) {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Trigger escape
    document.dispatchEvent(new KeyboardEvent('keydown', { 
      key: 'Escape', 
      code: 'Escape',
      keyCode: 27,
      bubbles: true 
    }));
    
    // Click elsewhere
    document.body.click();
    
    setTimeout(() => {
      const remainingResults = document.querySelectorAll('[style*="cursor: pointer"]');
      console.log(`After cleanup: ${remainingResults.length} clickable elements remain`);
      
      // Restore search if there was one
      if (searchInput && originalValue.trim()) {
        console.log(`Restoring search: "${originalValue}"`);
        searchInput.value = originalValue;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, 100);
  };
  
  console.log('✅ Production auto-stabilization system active');
  console.log('💡 Use debugCurrentSearchResults() to see what search results are on page');
  console.log('💡 Use forceCleanup() to manually clear leftover search results');
}

// Apply fix when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', implementClickStabilization);
} else {
  implementClickStabilization();
}

// Expose utilities globally for browser console debugging
window.PrintingPreferences = PrintingPreferences;
window.PrintingCache = PrintingCache;

createRoot(document.getElementById('root')).render(
  <App />
)
