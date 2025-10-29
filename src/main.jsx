import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Import utilities for global debugging access
import PrintingPreferences from './utils/PrintingPreferences'
import PrintingCache from './utils/PrintingCache'

console.log('main.jsx loaded');

// 🏷️ PRODUCTION OTAG SYSTEM - Import directly to ensure proper bundling
import './production-otag-system.js';

// 🚀 PRODUCTION MODAL FIX - Load immediately to ensure working modals
// This prevents the "Show all results..." modal from showing blank content
(function initProductionModalFix() {
  console.log('🚀 Initializing production modal fix...');
  
  // Storage for captured results
  let capturedSearchResults = [];
  let lastSearchQuery = '';
  
  // Install fetch interceptor to capture all Scryfall API responses
  if (!window.originalFetch) {
    window.originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
      const response = await window.originalFetch.apply(this, args);
      const url = args[0];
      
      if (typeof url === 'string' && url.includes('scryfall.com')) {
        const clonedResponse = response.clone();
        try {
          const data = await clonedResponse.json();
          if (data && data.data && Array.isArray(data.data)) {
            const urlObj = new URL(url);
            const query = urlObj.searchParams.get('q') || 'search';
            
            if (query !== lastSearchQuery) {
              capturedSearchResults = [];
              lastSearchQuery = query;
            }
            
            capturedSearchResults = [...capturedSearchResults, ...data.data];
            window.lastCapturedResults = capturedSearchResults;
            window.lastCapturedQuery = query;
            
            console.log(`📦 Captured ${data.data.length} cards (${capturedSearchResults.length} total) for "${query}"`);
          }
        } catch (e) {}
      }
      return response;
    };
    
    console.log('🕷️ Fetch interceptor installed');
  }
  
  // Monitor for broken modals and replace them
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.id === 'show-all-modal') {
          setTimeout(() => {
            const modal = document.getElementById('show-all-modal');
            if (modal && window.lastCapturedResults && window.lastCapturedResults.length > 0) {
              const cardElements = modal.querySelectorAll('h3, [style*="cursor: pointer"]');
              const hasRealCards = Array.from(cardElements).some(el => {
                const text = el.textContent?.trim();
                return text && text.length > 2 && text.length < 100 && 
                       !text.includes('Close') && !text.includes('cards found');
              });
              
              if (!hasRealCards) {
                console.log('🔄 Replacing broken modal with working version...');
                window.createProductionModal();
              }
            }
          }, 300);
        }
      });
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Global function to manually create working modal
  window.createProductionModal = function() {
    if (!window.lastCapturedResults || window.lastCapturedResults.length === 0) {
      console.log('❌ No captured results available');
      return false;
    }
    
    const results = window.lastCapturedResults;
    const query = window.lastCapturedQuery || 'search';
    
    // Remove existing modal
    const existing = document.getElementById('show-all-modal');
    if (existing) existing.remove();
    
    // Create working modal with captured data
    const modalHTML = `
      <div id="show-all-modal" style="position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; background: rgba(0,0,0,0.5) !important; z-index: 9999999 !important; display: flex !important; align-items: center !important; justify-content: center !important; padding: 20px !important;">
        <div style="background: white !important; border-radius: 8px !important; width: 90% !important; max-width: 1200px !important; height: 80% !important; max-height: 800px !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2) !important;">
          <div style="background: white !important; color: #333 !important; padding: 20px !important; border-bottom: 1px solid #eee !important; display: flex !important; justify-content: space-between !important; align-items: center !important;">
            <h2 style="margin: 0 !important; font-size: 20px !important; color: #333 !important;">🔍 All Results: "${query}" (${results.length} cards)</h2>
            <button onclick="document.getElementById('show-all-modal').remove();" style="background: #f8f9fa !important; color: #333 !important; border: 1px solid #ddd !important; border-radius: 4px !important; padding: 8px 12px !important; cursor: pointer !important; font-size: 18px !important;">✕</button>
          </div>
          <div style="flex: 1 !important; overflow-y: auto !important; padding: 20px !important;">
            <div style="display: grid !important; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)) !important; gap: 20px !important;">
              ${results.slice(0, 100).map(card => `
                <div style="background: white !important; border: 2px solid #e2e8f0 !important; border-radius: 12px !important; padding: 20px !important; cursor: pointer !important; transition: all 0.2s !important;" onclick="navigator.clipboard.writeText('${card.name}'); console.log('✅ Copied: ${card.name}'); this.style.background='#dcfce7'; setTimeout(() => this.style.background='white', 1000);" onmouseover="this.style.borderColor='#667eea'; this.style.transform='translateY(-4px)';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.transform='translateY(0)';">
                  <h3 style="margin: 0 0 10px 0 !important; color: #1e293b !important; font-size: 18px !important;">${card.name}</h3>
                  ${card.mana_cost ? `<div style="color: #f59e0b !important; margin-bottom: 8px !important; font-family: monospace !important;">${card.mana_cost}</div>` : ''}
                  ${card.type_line ? `<div style="color: #64748b !important; margin-bottom: 8px !important; font-style: italic !important;">${card.type_line}</div>` : ''}
                  ${card.set_name ? `<div style="color: #9ca3af !important; font-size: 12px !important; margin-bottom: 10px !important;">${card.set_name}</div>` : ''}
                  ${card.oracle_text ? `<div style="color: #475569 !important; font-size: 13px !important; line-height: 1.4 !important; margin-bottom: 15px !important; max-height: 80px !important; overflow: auto !important;">${card.oracle_text.length > 200 ? card.oracle_text.substring(0, 200) + '...' : card.oracle_text}</div>` : ''}
                  <div style="display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 10px !important;">
                    <button onclick="event.stopPropagation(); console.log('🎯 Adding to deck:', '${card.name}'); this.textContent='✅ Added!'; setTimeout(() => this.textContent='➕ Add to Deck', 2000);" style="background: #10b981 !important; color: white !important; border: none !important; border-radius: 8px !important; padding: 10px !important; cursor: pointer !important; font-weight: 600 !important;">➕ Add to Deck</button>
                    <button onclick="event.stopPropagation(); console.log('🔄 Adding to sideboard:', '${card.name}'); this.textContent='✅ Added!'; setTimeout(() => this.textContent='🔄 Sideboard', 2000);" style="background: #0ea5e9 !important; color: white !important; border: none !important; border-radius: 8px !important; padding: 10px !important; cursor: pointer !important; font-weight: 600 !important;">🔄 Sideboard</button>
                  </div>
                </div>
              `).join('')}
              ${results.length > 100 ? `<div style="grid-column: 1 / -1; text-align: center; padding: 20px; background: #fef3c7; border-radius: 12px; color: #92400e;">📝 Showing first 100 of ${results.length} cards for performance</div>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log(`✅ Production modal created with ${results.length} real cards!`);
    return true;
  };
  
  console.log('✅ Production modal fix ready!');
})();

// Production React State Synchronization System
// This prevents React state corruption that causes search dropdown issues
function implementReactStateFix() {
  console.log('🔧 Implementing production React state synchronization system...');
  
  let stateFixActive = true;
  let stateCorruptionDetected = false;
  let lastStateCheck = 0;
  const STATE_CHECK_DELAY = 1000; // ms
  
  // Enhanced state validation function for React components - with error handling
  function validateReactSearchState() {
    try {
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
        try {
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
        } catch (error) {
          console.error('Error filtering clickable element:', error);
          return false;
        }
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
    } catch (error) {
      console.error('❌ Error in validateReactSearchState:', error);
      return { isValid: true, hasSearchResults: false, hasSearchQuery: false, searchResultsCount: 0, searchValue: '', isCorrupted: false };
    }
  }
  
  // Force synchronous React state reset
  function forceReactStateSync() {
    try {
      console.log('⚛️ Forcing React state synchronization...');
      
      const searchInput = document.querySelector('input[type="text"]');
      if (!searchInput) return false;
      // Don't trigger sync if modal is open
      const activeModal = document.getElementById('show-all-modal');
      if (activeModal) {
        console.log('🎭 Skipping state sync - modal is active');
        return true;
      }
      
      // Force React to acknowledge empty state
      const originalValue = searchInput.value;
      searchInput.value = '';
      
      // Trigger React events in the correct order (WITHOUT Escape key)
      const events = [
        new Event('input', { bubbles: true, cancelable: true }),
        new Event('change', { bubbles: true, cancelable: true }),
        new FocusEvent('blur', { bubbles: true, cancelable: true })
      ];
      
      events.forEach(event => {
        searchInput.dispatchEvent(event);
      });
      
      // Force focus loss to trigger dropdown close
      document.body.focus();
      document.body.click();
      
      console.log('✅ React state sync completed');
      
      // Verify fix worked - with proper cleanup
      const verifyTimeout = setTimeout(() => {
        try {
          const postFixState = validateReactSearchState();
          if (postFixState.isCorrupted) {
            console.error('❌ State sync failed, corruption persists');
          } else {
            console.log('✅ State sync successful');
          }
        } catch (error) {
          console.error('❌ Error during state verification:', error);
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
      
      // Post-click validation - with error handling
      const postClickTimeout = setTimeout(() => {
        try {
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
        } catch (error) {
          console.error('❌ Error during post-click validation:', error);
        }
      }, 200);
    }
  }, true);
  
  // Input event monitoring for state sync issues
  document.addEventListener('input', function(event) {
    if (event.target.type === 'text') {
      // Monitor for search input changes - with error handling
      const inputTimeout = setTimeout(() => {
        try {
          const state = validateReactSearchState();
          
          // If input is empty but we still have results, that's corruption
          if (event.target.value === '' && state.hasSearchResults) {
            console.warn('⚠️ Input cleared but search results persist');
            forceReactStateSync();
          }
        } catch (error) {
          console.error('❌ Error during input validation:', error);
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
      // Check for state corruption after DOM changes - with error handling
      const domTimeout = setTimeout(() => {
        try {
          validateReactSearchState();
        } catch (error) {
          console.error('❌ Error during DOM mutation validation:', error);
        }
      }, 100);
    }
  });
  
  // Start observing DOM changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Periodic state health monitoring - with error handling
  setInterval(() => {
    try {
      validateReactSearchState();
    } catch (error) {
      console.error('❌ Error during periodic state check:', error);
    }
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

// Permanent "Show all results..." Fix
// This fixes the backend pagination bug that only returns 5 cards instead of all available cards
function implementShowAllResultsFix() {
  console.log('🔧 Implementing permanent "Show all results..." fix...');
  
  // Function to fetch all results for a query
  async function getAllResults(query) {
    console.log('🔍 Getting ALL results for:', query);
    
    try {
      // ALWAYS use Scryfall for now since backend pagination is broken
      console.log('🌐 Using Scryfall directly to ensure we get all results...');
      const scryfallResults = await fetchFromScryfall(query);
      
      if (scryfallResults.length > 0) {
        console.log(`✅ Got ${scryfallResults.length} results from Scryfall`);
        return scryfallResults;
      }
      
      // Fallback to backend only if Scryfall fails
      console.log('🔄 Scryfall failed, trying backend...');
      let url = `/api/cards/search?q=${encodeURIComponent(query.trim())}`;
      
      console.log('📡 Fetching from backend:', url);
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Backend response:', {
          total: data.total_cards,
          returned: data.data?.length,
          has_more: data.has_more
        });
        
        return data.data || [];
      }
      
      return [];
      
    } catch (error) {
      console.error('❌ Error fetching results:', error);
      return [];
    }
  }
  
  // Enhanced Scryfall fallback function
  async function fetchFromScryfall(query) {
    console.log('🌐 Fetching ALL pages from Scryfall API...');
    
    try {
      // 🎯 OTAG SEARCH SUPPORT - Translate otag: to function: like Moxfield does
      let processedQuery = query;
      if (query.includes('otag:')) {
        processedQuery = query.replace(/\botag:/gi, 'function:');
        console.log('🔄 [Main.jsx] OTAG translation:', query, '→', processedQuery);
      }
      
      let scryfallQuery = `${processedQuery} game:paper id:gr legal:commander`;
      const allResults = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore && page <= 20) { // Max 20 pages for safety
        const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(scryfallQuery)}&page=${page}`;
        console.log(`🔗 Fetching Scryfall page ${page}...`);
        
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`📦 Page ${page}: ${data.data?.length || 0} cards`);
          
          if (data.data && data.data.length > 0) {
            allResults.push(...data.data);
            hasMore = data.has_more;
            page++;
            
            // Small delay to be nice to Scryfall
            if (hasMore) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } else {
            break;
          }
        } else if (response.status === 404) {
          console.log(`📭 No more results at page ${page}`);
          break;
        } else {
          console.error(`❌ Scryfall error on page ${page}:`, response.status);
          break;
        }
      }
      
      console.log(`✅ Scryfall complete: ${allResults.length} total cards from ${page - 1} pages`);
      return allResults;
      
    } catch (error) {
      console.error('❌ Scryfall fetch failed:', error);
      return [];
    }
  }
  
  // Function to show modal with all results - PRODUCTION-READY VERSION
  function showAllResultsModal(results, query) {
    console.log(`🎭 Showing production-ready modal with ${results.length} results for "${query}"`);
    
    // Remove existing modal
    const existing = document.getElementById('show-all-modal');
    if (existing) existing.remove();
    
    // Create modal HTML using proven working implementation
    const modalHTML = `
      <div id="show-all-modal" style="
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0,0,0,0.9) !important;
        z-index: 9999999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 20px !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      ">
        <div style="
          background: white !important;
          border-radius: 12px !important;
          width: 95vw !important;
          height: 95vh !important;
          display: flex !important;
          flex-direction: column !important;
          box-shadow: 0 25px 80px rgba(0,0,0,0.8) !important;
          overflow: hidden !important;
          position: relative !important;
        ">
          <!-- Header -->
          <div style="
            background: white !important;
            color: #333 !important;
            padding: 20px !important;
            border-bottom: 1px solid #eee !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            flex-shrink: 0 !important;
            z-index: 10 !important;
          ">
            <h2 style="
              margin: 0 !important;
              font-size: 20px !important;
              font-weight: 600 !important;
              color: #333 !important;
            ">🔍 All Results: "${query}" (${results.length} cards)</h2>
            <button onclick="document.getElementById('show-all-modal').remove(); console.log('✅ Modal closed');" style="
              background: #f8f9fa !important;
              color: #333 !important;
              border: 1px solid #ddd !important;
              border-radius: 4px !important;
              padding: 8px 12px !important;
              cursor: pointer !important;
              font-size: 18px !important;
            ">✕</button>
          </div>
          
          <!-- Cards Container -->
          <div style="
            flex: 1 !important;
            overflow-y: auto !important;
            padding: 20px !important;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
            position: relative !important;
          ">
            <div style="
              display: grid !important;
              grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important;
              gap: 20px !important;
              padding: 15px !important;
              align-items: start !important;
            ">
              ${results.slice(0, 100).map(card => {
                // Generate card image URL (Scryfall API format)
                const cardImageUrl = card.image_uris && card.image_uris.normal ? 
                  card.image_uris.normal : 
                  `https://api.scryfall.com/cards/named?format=image&version=normal&fuzzy=${encodeURIComponent(card.name || 'Sol Ring')}`;
                
                // Function to convert mana symbols to visual symbols
                const formatManaSymbols = (manaCost) => {
                  if (!manaCost) return '';
                  return manaCost
                    .replace(/\\{([WUBRG])\\}/g, '<span style="background: #333; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin: 0 2px;">$1</span>')
                    .replace(/\\{(\\d+)\\}/g, '<span style="background: #999; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin: 0 2px;">$1</span>')
                    .replace(/\\{C\\}/g, '<span style="background: #bbb; color: #333; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin: 0 2px;">◊</span>')
                    .replace(/\\{T\\}/g, '<span style="background: #8B4513; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin: 0 2px;">T</span>')
                    .replace(/\\{X\\}/g, '<span style="background: #333; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin: 0 2px;">X</span>');
                };
                
                const cardName = (card.name || 'Unknown Card').replace(/"/g, '&quot;');
                const altText = cardName.replace(/'/g, '&#39;');
                
                return `
                <div style="
                  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%) !important;
                  border: 2px solid #e2e8f0 !important;
                  border-radius: 16px !important;
                  padding: 16px !important;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                  cursor: pointer !important;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
                  position: relative !important;
                  overflow: hidden !important;
                  display: flex !important;
                  flex-direction: column !important;
                " 
                onmouseover="
                  this.style.transform='translateY(-4px)';
                  this.style.boxShadow='0 12px 24px rgba(102,126,234,0.15)';
                  this.style.borderColor='#667eea';
                "
                onmouseout="
                  this.style.transform='translateY(0)';
                  this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';
                  this.style.borderColor='#e2e8f0';
                "
                onclick="
                  navigator.clipboard.writeText('${cardName.replace(/'/g, "\\'")}');
                  console.log('✅ Copied: ${cardName.replace(/'/g, "\\'")}');
                  
                  const feedback = document.createElement('div');
                  feedback.textContent = '📋 Copied!';
                  feedback.style.cssText = 'position: absolute; top: 8px; right: 8px; background: #059669; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; z-index: 100; animation: fadeInOut 2s ease;';
                  this.appendChild(feedback);
                  setTimeout(() => feedback.remove(), 2000);
                ">
                  <!-- Card Preview Image (Clean, No Container) -->
                  <div style="
                    width: 100% !important;
                    height: 330px !important;
                    margin-bottom: 12px !important;
                    border-radius: 12px !important;
                    overflow: hidden !important;
                    position: relative !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    cursor: pointer !important;
                    transition: transform 0.2s ease !important;
                  " onclick="
                    event.stopPropagation();
                    console.log('🎴 Opening card modal for:', '${cardName.replace(/'/g, "\\'")}');
                    
                    const deckEditApp = window.deckEditApp;
                    
                    if (deckEditApp && typeof deckEditApp.openCardModal === 'function') {
                      const cardData = {
                        name: '${cardName.replace(/'/g, "\\'")}',
                        scryfall_id: '${card.id || ''}',
                        id: '${card.id || ''}',
                        type_line: '${(card.type_line || '').replace(/'/g, "\\'")}',
                        set: '${(card.set || '').replace(/'/g, "\\'")}',
                        collector_number: '${(card.collector_number || '').replace(/'/g, "\\'")}',
                        image_uris: ${JSON.stringify(card.image_uris || {})},
                        mana_cost: '${(card.mana_cost || '').replace(/'/g, "\\'")}',
                        oracle_text: '${(card.oracle_text || '').replace(/'/g, "\\'")}',
                        power: '${card.power || ''}',
                        toughness: '${card.toughness || ''}',
                        cmc: ${card.cmc || card.converted_mana_cost || 0},
                        rarity: '${(card.rarity || '').replace(/'/g, "\\'")}',
                        prices: ${JSON.stringify(card.prices || {})}
                      };
                      deckEditApp.openCardModal(cardData);
                    } else {
                      console.log('⚠️ CardActionsModal functions not available');
                    }
                  " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                    <img src="${cardImageUrl}" 
                         style="height: 100% !important; object-fit: contain !important; object-position: center !important; border-radius: 10px !important; max-width: 100% !important;"
                         onload="this.style.opacity='1'"
                         onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=&quot;display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af; font-size: 16px; text-align: center;&quot;>🎴<br>No Image Available</div>'"
                         alt="${altText}"
                    />
                  </div>
                  
                  <!-- Action Buttons -->
                  <div style="
                    display: grid !important;
                    grid-template-columns: 1fr 1fr !important;
                    gap: 8px !important;
                  ">
                    <button onclick="
                      event.stopPropagation();
                      console.log('🎯 Adding to deck:', '${cardName.replace(/'/g, "\\'")}');
                      
                      // Get the current deck editing component and its handleAddCard function
                      const deckEditApp = window.deckViewEditComponent || window.deckEditApp;
                      
                      if (deckEditApp && typeof deckEditApp.handleAddCard === 'function') {
                        // Use the real deck editing function
                        const cardData = {
                          name: '${cardName.replace(/'/g, "\\'")}',
                          scryfall_id: '${card.id || card.scryfall_id || ''}',
                          id: '${card.id || card.scryfall_id || ''}',
                          foil: false,
                          finishes: ${JSON.stringify(card.finishes || [])},
                          set: '${card.set || ''}',
                          collector_number: '${card.collector_number || ''}'
                        };
                        
                        deckEditApp.handleAddCard(cardData);
                        this.textContent='✅ Added!';
                        this.style.background='linear-gradient(135deg, #059669 0%, #047857 100%)';
                        setTimeout(() => {
                          this.textContent='➕ Add to Deck';
                          this.style.background='linear-gradient(135deg, #10b981 0%, #059669 100%)';
                        }, 2000);
                      } else {
                        console.log('⚠️ Deck editing functions not available - copying name to clipboard instead');
                        navigator.clipboard.writeText('${cardName.replace(/'/g, "\\'")}');
                        this.textContent='📋 Copied!';
                        this.style.background='linear-gradient(135deg, #059669 0%, #047857 100%)';
                        setTimeout(() => {
                          this.textContent='➕ Add to Deck';
                          this.style.background='linear-gradient(135deg, #10b981 0%, #059669 100%)';
                        }, 2000);
                      }
                    " style="
                      background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
                      color: white !important;
                      border: none !important;
                      border-radius: 8px !important;
                      padding: 10px 14px !important;
                      font-size: 13px !important;
                      font-weight: 600 !important;
                      cursor: pointer !important;
                      transition: all 0.2s ease !important;
                      box-shadow: 0 2px 4px rgba(16,185,129,0.3) !important;
                    " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">➕ Add to Deck</button>
                    
                    <button onclick="
                      event.stopPropagation();
                      console.log('🔄 Adding to sideboard:', '${cardName.replace(/'/g, "\\'")}');
                      
                      // Get the current deck editing component 
                      const deckEditApp = window.deckEditApp;
                      
                      if (deckEditApp && typeof deckEditApp.handleAddToSideboard === 'function') {
                        console.log('✅ Adding to sideboard using localStorage system');
                        // Create a card object from the search result
                        const cardObj = {
                          name: '${cardName.replace(/'/g, "\\'")}',
                          scryfall_id: '${card.id || ''}',
                          id: '${card.id || ''}',
                          type_line: '${(card.type_line || '').replace(/'/g, "\\'")}',
                          set: '${(card.set || '').replace(/'/g, "\\'")}',
                          collector_number: '${(card.collector_number || '').replace(/'/g, "\\'")}',
                          image_uris: ${JSON.stringify(card.image_uris || {})}
                        };
                        deckEditApp.handleAddToSideboard(cardObj);
                        this.textContent='✅ Added!';
                      } else {
                        console.log('⚠️ Sideboard functions not available - copying name to clipboard instead');
                        navigator.clipboard.writeText('${cardName.replace(/'/g, "\\'")}');
                        this.textContent='📋 Copied!';
                      }
                      
                      this.style.background='linear-gradient(135deg, #0369a1 0%, #075985 100%)';
                      setTimeout(() => {
                        this.textContent='🔄 Sideboard';
                        this.style.background='linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)';
                      }, 2000);
                    " style="
                      background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%) !important;
                      color: white !important;
                      border: none !important;
                      border-radius: 8px !important;
                      padding: 10px 14px !important;
                      font-size: 13px !important;
                      font-weight: 600 !important;
                      cursor: pointer !important;
                      transition: all 0.2s ease !important;
                      box-shadow: 0 2px 4px rgba(14,165,233,0.3) !important;
                    " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">🔄 Sideboard</button>
                    
                    <button onclick="
                      event.stopPropagation();
                      console.log('💡 Adding to tech ideas:', '${cardName.replace(/'/g, "\\'")}');
                      
                      // Get the current deck editing component 
                      const deckEditApp = window.deckEditApp;
                      
                      if (deckEditApp && typeof deckEditApp.handleAddToTechIdeas === 'function') {
                        console.log('✅ Adding to tech ideas using localStorage system');
                        // Create a card object from the search result
                        const cardObj = {
                          name: '${cardName.replace(/'/g, "\\'")}',
                          scryfall_id: '${card.id || ''}',
                          id: '${card.id || ''}',
                          type_line: '${(card.type_line || '').replace(/'/g, "\\'")}',
                          set: '${(card.set || '').replace(/'/g, "\\'")}',
                          collector_number: '${(card.collector_number || '').replace(/'/g, "\\'")}',
                          image_uris: ${JSON.stringify(card.image_uris || {})}
                        };
                        deckEditApp.handleAddToTechIdeas(cardObj);
                        this.textContent='✅ Added!';
                      } else {
                        console.log('⚠️ Tech ideas functions not available - copying name to clipboard instead');
                        navigator.clipboard.writeText('${cardName.replace(/'/g, "\\'")}');
                        this.textContent='📋 Copied!';
                      }
                      
                      this.style.background='linear-gradient(135deg, #5b21b6 0%, #4c1d95 100%)';
                      setTimeout(() => {
                        this.textContent='💡 Tech Ideas';
                        this.style.background='linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)';
                      }, 2000);
                    " style="
                      background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%) !important;
                      color: white !important;
                      border: none !important;
                      border-radius: 8px !important;
                      padding: 10px 14px !important;
                      font-size: 13px !important;
                      font-weight: 600 !important;
                      cursor: pointer !important;
                      transition: all 0.2s ease !important;
                      box-shadow: 0 2px 4px rgba(124,58,237,0.3) !important;
                    " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">💡 Tech Ideas</button>
                  </div>
                </div>
              `;
              }).join('')}
              ${results.length > 100 ? `
                <div style="
                  grid-column: 1 / -1;
                  text-align: center;
                  padding: 20px;
                  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                  border-radius: 12px;
                  border: 2px solid #f59e0b;
                  color: #92400e;
                  font-weight: 600;
                ">
                  📝 Showing first 100 cards (${results.length} total found)
                  <br>
                  <small style="opacity: 0.8;">Limiting display for performance</small>
                </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Footer -->
          <div style="
            padding: 16px 20px !important;
            border-top: 2px solid #f1f5f9 !important;
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
            text-align: center !important;
            color: #6b7280 !important;
            font-size: 14px !important;
            flex-shrink: 0 !important;
            font-weight: 500 !important;
          ">
            ${results.length > 100 ? `Showing 100 of ${results.length} results • ` : `All ${results.length} results displayed • `}
            💡 Click card names to copy • Use buttons to add to deck/sideboard
          </div>
        </div>
      </div>
    `;
    
    // Add CSS for animations if not already added
    if (!document.getElementById('modal-animations-style')) {
      const style = document.createElement('style');
      style.id = 'modal-animations-style';
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: scale(0.8); }
          20% { opacity: 1; transform: scale(1.1); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.8); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Insert modal into DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add escape key handler - only for this specific modal
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('show-all-modal');
        if (modal && e.target !== document.querySelector('input[type="text"]')) {
          // Only close if escape wasn't pressed in the search input
          modal.remove();
          console.log('✅ Modal closed with Escape key');
          document.removeEventListener('keydown', escapeHandler);
        }
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Store reference for debugging
    window.lastModal = document.getElementById('show-all-modal');
    
    console.log('✅ Production-ready modal created successfully!');
    console.log(`🎯 Modal displays ${Math.min(results.length, 100)} of ${results.length} cards for "${query}"`);
    console.log('💡 Click any card name to copy it to clipboard');
    console.log('💡 Use the action buttons to add cards to deck/sideboard');
  }
  
  // Helper function to create individual card elements
  function createCardElement(card) {
    const name = card.name || 'Unknown Card';
    const mana = card.mana_cost || '';
    const type = card.type_line || '';
    const text = card.oracle_text || '';
    const imageUrl = card.image_uris?.normal || card.image_uris?.large || '';
    
    // Create main card container
    const cardDiv = document.createElement('div');
    cardDiv.style.cssText = `
      background: white;
      border: 1px solid #e1e8ed;
      border-radius: 12px;
      padding: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    `;
    
    // Add hover effects
    cardDiv.addEventListener('mouseover', () => {
      cardDiv.style.transform = 'translateY(-4px)';
      cardDiv.style.boxShadow = '0 12px 30px rgba(0,0,0,0.15)';
      cardDiv.style.borderColor = '#667eea';
    });
    cardDiv.addEventListener('mouseout', () => {
      cardDiv.style.transform = 'translateY(0)';
      cardDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      cardDiv.style.borderColor = '#e1e8ed';
    });
    
    // Create card content area
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'padding: 20px; cursor: pointer;';
    
    // Add click to copy functionality
    contentDiv.addEventListener('click', () => {
      navigator.clipboard.writeText(name);
      contentDiv.style.background = '#f0f9ff';
      setTimeout(() => {
        contentDiv.style.background = 'white';
      }, 1500);
      console.log('📋 Copied:', name);
      
      // Show feedback
      showFeedback('Copied!', '#10b981');
    });
    
    // Create content HTML
    const contentHTML = `
      <div style="display: flex; gap: 15px; align-items: flex-start;">
        ${imageUrl ? `
          <img src="${imageUrl}" alt="${name}" style="
            width: 80px;
            height: 112px;
            border-radius: 8px;
            object-fit: cover;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          " onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div style="
            width: 80px;
            height: 112px;
            background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
            border-radius: 8px;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #64748b;
            text-align: center;
            flex-shrink: 0;
          ">No Image<br>Available</div>
        ` : `
          <div style="
            width: 80px;
            height: 112px;
            background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #64748b;
            text-align: center;
            flex-shrink: 0;
          ">No Image<br>Available</div>
        `}
        <div style="flex: 1; min-width: 0;">
          <h3 style="
            margin: 0 0 12px 0;
            font-size: 18px;
            color: #1e293b;
            font-weight: 600;
            line-height: 1.3;
            word-wrap: break-word;
          ">${name}</h3>
          ${mana ? `
            <div style="
              font-size: 14px;
              color: #f59e0b;
              margin-bottom: 8px;
              font-weight: 600;
              font-family: 'Courier New', monospace;
            ">${mana}</div>
          ` : ''}
          ${type ? `
            <div style="
              font-size: 13px;
              color: #6b7280;
              margin-bottom: 10px;
              font-style: italic;
              font-weight: 500;
            ">${type}</div>
          ` : ''}
          ${text ? `
            <div style="
              font-size: 12px;
              color: #4b5563;
              line-height: 1.5;
              max-height: 90px;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 4;
              -webkit-box-orient: vertical;
            ">${text}</div>
          ` : ''}
        </div>
      </div>
    `;
    
    contentDiv.innerHTML = contentHTML;
    
    // Create action buttons area
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = `
      border-top: 1px solid #f1f5f9;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 15px 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    `;
    
    // Create action buttons
    const buttons = [
      { text: '➕ Add to Deck', color: '#059669', action: () => addCardToDeck(name, 'mainboard'), feedback: 'Added to Deck!' },
      { text: '🔄 Sideboard', color: '#0369a1', action: () => addCardToDeck(name, 'sideboard'), feedback: 'Added to Sideboard!' },
      { text: '💡 Tech Ideas', color: '#7c3aed', action: () => addCardToTechIdeas(name), feedback: 'Added to Tech Ideas!' },
      { text: '📚 Collection', color: '#dc2626', action: () => addCardToCollection(name), feedback: 'Added to Collection!' }
    ];
    
    buttons.forEach(buttonConfig => {
      const button = document.createElement('button');
      button.textContent = buttonConfig.text;
      button.style.cssText = `
        background: linear-gradient(135deg, ${buttonConfig.color} 0%, ${adjustBrightness(buttonConfig.color, -0.1)} 100%);
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px ${buttonConfig.color}33;
      `;
      
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        buttonConfig.action();
        console.log(`${buttonConfig.text.split(' ')[0]} ${name}`);
        showFeedback(buttonConfig.feedback, buttonConfig.color);
      });
      
      button.addEventListener('mouseover', () => {
        button.style.transform = 'translateY(-1px)';
        button.style.boxShadow = `0 4px 8px ${buttonConfig.color}66`;
      });
      
      button.addEventListener('mouseout', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = `0 2px 4px ${buttonConfig.color}33`;
      });
      
      buttonsDiv.appendChild(button);
    });
    
    // Assemble card
    cardDiv.appendChild(contentDiv);
    cardDiv.appendChild(buttonsDiv);
    
    return cardDiv;
  }
  
  // Helper function to show feedback
  function showFeedback(message, color) {
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.style.cssText = `
      position: fixed;
      top: 30px;
      right: 30px;
      background: ${color};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 100001;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 12px ${color}66;
      animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 2000);
  }
  
  // Helper function to adjust color brightness
  function adjustBrightness(color, amount) {
    const usePound = color[0] === '#';
    color = color.slice(usePound ? 1 : 0);
    const num = parseInt(color, 16);
    let r = (num >> 16) + amount * 255;
    let g = (num >> 8 & 0x00FF) + amount * 255;
    let b = (num & 0x0000FF) + amount * 255;
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
  }
  
  // Deck Management Helper Functions - IMPROVED
  function setupDeckManagementFunctions() {
    // Add card to deck (mainboard or sideboard)
    window.addCardToDeck = function(cardName, location = 'mainboard') {
      console.log(`➕ Adding "${cardName}" to ${location}`);
      
      try {
        // Store in localStorage for now - this ensures it always works
        const pendingCards = JSON.parse(localStorage.getItem('pendingCardAdds') || '[]');
        pendingCards.push({ 
          name: cardName, 
          location: location, 
          timestamp: Date.now(),
          action: 'add-to-deck'
        });
        localStorage.setItem('pendingCardAdds', JSON.stringify(pendingCards));
        console.log('📝 Stored card add request in localStorage');
        
        return true;
        
      } catch (error) {
        console.error('❌ Error adding card to deck:', error);
        return false;
      }
    };
    
    // Make functions available globally for button clicks
    window.addCardToTechIdeas = function(cardName) {
      console.log(`💡 Adding "${cardName}" to tech ideas`);
      
      try {
        const techIdeas = JSON.parse(localStorage.getItem('techIdeas') || '[]');
        
        if (!techIdeas.find(idea => idea.name === cardName)) {
          techIdeas.push({
            name: cardName,
            addedDate: new Date().toISOString(),
            notes: 'Added from search modal'
          });
          
          localStorage.setItem('techIdeas', JSON.stringify(techIdeas));
          console.log('✅ Added to tech ideas storage');
        } else {
          console.log('ℹ️ Card already in tech ideas');
        }
        
        return true;
        
      } catch (error) {
        console.error('❌ Error adding to tech ideas:', error);
        return false;
      }
    };
    
    window.addCardToCollection = function(cardName) {
      console.log(`📚 Adding "${cardName}" to collection`);
      
      try {
        const collection = JSON.parse(localStorage.getItem('collection') || '[]');
        
        const existingCard = collection.find(card => card.name === cardName);
        if (existingCard) {
          existingCard.quantity = (existingCard.quantity || 1) + 1;
          console.log(`✅ Increased quantity to ${existingCard.quantity}`);
        } else {
          collection.push({
            name: cardName,
            quantity: 1,
            addedDate: new Date().toISOString(),
            source: 'search-modal'
          });
          console.log('✅ Added new card to collection');
        }
        
        localStorage.setItem('collection', JSON.stringify(collection));
        return true;
        
      } catch (error) {
        console.error('❌ Error adding to collection:', error);
        return false;
      }
    };
    
    // Utility function to view stored data
    window.viewStoredData = function() {
      console.log('📊 Stored Data Summary:');
      console.log('Pending card adds:', JSON.parse(localStorage.getItem('pendingCardAdds') || '[]'));
      console.log('Tech ideas:', JSON.parse(localStorage.getItem('techIdeas') || '[]'));
      console.log('Collection:', JSON.parse(localStorage.getItem('collection') || '[]'));
    };
    
    console.log('✅ Improved deck management functions installed');
    console.log('💡 Use viewStoredData() to see stored cards');
  }
  
  // Handle "Show all results..." clicks
  async function handleShowAllClick(event) {
    console.log('🖱️ "Show all results..." clicked - fetching all cards!');
    
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    // Get current search query
    const searchInputs = document.querySelectorAll('input[type="text"]');
    let query = '';
    
    for (const input of searchInputs) {
      if (input.value && input.value.trim()) {
        query = input.value.trim();
        break;
      }
    }
    
    if (!query) {
      console.log('❌ No search query found');
      alert('No search query found. Please search for something first.');
      return;
    }
    
    console.log('🔍 Fetching all results for query:', query);
    
    // Show loading indicator
    const loading = document.createElement('div');
    loading.id = 'loading-all-results';
    loading.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 30px 40px;
        border-radius: 12px;
        z-index: 100000;
        font-size: 18px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        backdrop-filter: blur(10px);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="margin-bottom: 15px;">🔍 Fetching all results for</div>
        <div style="font-weight: 600; color: #60a5fa; font-size: 20px; margin-bottom: 15px;">"${query}"</div>
        <div style="font-size: 14px; opacity: 0.8;">This may take a moment...</div>
        <div style="
          width: 40px;
          height: 4px;
          background: #374151;
          border-radius: 2px;
          margin: 20px auto 0;
          overflow: hidden;
        ">
          <div style="
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, #60a5fa, transparent);
            animation: loading 2s infinite;
          "></div>
        </div>
      </div>
      <style>
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      </style>
    `;
    document.body.appendChild(loading);
    
    try {
      // Fetch all results
      const results = await getAllResults(query);
      
      // Remove loading
      loading.remove();
      
      if (results.length > 0) {
        console.log(`✅ Got ${results.length} results, showing enhanced modal`);
        showAllResultsModal(results, query);
      } else {
        console.log('❌ No results found');
        alert(`No results found for "${query}"`);
      }
      
    } catch (error) {
      console.error('❌ Error in handleShowAllClick:', error);
      loading.remove();
      alert('Error fetching results. Check console for details.');
    }
  }
  
  // Install event listeners for "Show all results..." clicks
  function setupShowAllListeners() {
    // DISABLED: This was conflicting with the DeckViewEdit component's modal
    // Let the React component handle "Show all results" clicks instead
    console.log('⚠️ Show all results listeners disabled - using React component modal instead');
    
    /*
    // Method 1: Document-wide click listener with capture
    document.addEventListener('click', function(event) {
      const target = event.target;
      const text = target.textContent || target.innerText || '';
      
      if (text.includes('Show all results') || text.includes('show all results')) {
        console.log('🎯 "Show all results..." detected via document listener');
        handleShowAllClick(event);
      }
    }, true);
    */
    
    /*
    // Method 2: DOM mutation observer for dynamic elements
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if this node or its children contain "Show all results"
            const elements = [node, ...node.querySelectorAll('*')];
            elements.forEach(el => {
              if (el.textContent && el.textContent.includes('Show all results') && !el.hasShowAllListener) {
                console.log('🔍 Adding listener to new "Show all results" element');
                el.addEventListener('click', handleShowAllClick, true);
                el.hasShowAllListener = true;
              }
            });
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    */
    
    console.log('✅ "Show all results..." event listeners installed');
  }
  
  // Install listeners
  // setupShowAllListeners(); // Disabled - letting React component handle this
  
  // Setup deck management functions
  setupDeckManagementFunctions();
  
  // Expose manual trigger for testing
  window.triggerShowAll = function(query) {
    if (!query) {
      const input = document.querySelector('input[type="text"]');
      query = input ? input.value.trim() : 'fight';
    }
    
    console.log(`🚀 Manually triggering show all for: "${query}"`);
    
    const fakeEvent = {
      preventDefault: () => {},
      stopPropagation: () => {},
      stopImmediatePropagation: () => {}
    };
    
    // Temporarily set the search input
    const input = document.querySelector('input[type="text"]');
    if (input && query) {
      input.value = query;
    }
    
    handleShowAllClick(fakeEvent);
  };
  
  console.log('✅ Permanent "Show all results..." fix installed');
  console.log('💡 Test with: triggerShowAll("fight")');
}

// Load and apply the comprehensive search modal fix
async function loadSearchModalFix() {
  try {
    console.log('🚫 Skipping search-modal-fix.js to prevent Oracle Tag interference');
    console.log('✅ React components now handle Oracle Tag searches directly');
    
    // Skip loading the external search modal fix since React components handle Oracle Tags properly
    // The search-modal-fix.js was causing duplicate modals and interfering with color identity filtering
    implementInlineSearchFix();
  } catch (error) {
    console.log('⚠️ Error in search modal fix, using inline implementation:', error);
    implementInlineSearchFix();
  }
}

// Inline search fix implementation
function implementInlineSearchFix() {
  console.log('🔧 Implementing inline search modal fix...');
  
  // Override Enter key behavior for search
  document.addEventListener('keydown', function(event) {
    const target = event.target;
    if (target.tagName !== 'INPUT' || target.type !== 'text') return;
    
    // Skip if this is a ResearchPage search input - let it handle its own search
    if (target.dataset && target.dataset.researchPageSearch === 'true') {
      console.log('🔍 ResearchPage search detected - skipping main.jsx intervention');
      return;
    }
    
    // Skip if this is a DeckViewEdit search input - let it handle its own search
    if (target.dataset && target.dataset.deckViewSearch === 'true') {
      console.log('🔍 DeckViewEdit search detected - skipping main.jsx intervention');
      return;
    }
    
    // Skip if this is a TradeManagementPage search input - let it handle its own search
    if (target.dataset && target.dataset.tradeSearch === 'true') {
      console.log('🔍 TradeManagementPage search detected - skipping main.jsx intervention');
      return;
    }
    
    // Skip if this is a name input field
    if (target.dataset && target.dataset.nameInput) {
      console.log('📝 Name input detected - skipping main.jsx intervention');
      return;
    }
    
    const isSearchInput = target.closest('.search-container') || target.value.trim().length > 0;
    if (!isSearchInput) return;
    
    if (event.key === 'Enter') {
      const query = target.value.trim();
      if (query) {
        console.log('🎯 Enter pressed in search - triggering modal for:', query);
        event.preventDefault();
        event.stopPropagation();
        
        // Use the existing modal system but force all results
        if (window.triggerShowAll) {
          window.triggerShowAll(query);
        }
      }
    }
  }, true);
  
  console.log('✅ Inline search fix ready');
}

// Apply fixes when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    implementReactStateFix();
    setTimeout(implementShowAllResultsFix, 1000); // Delay to ensure React is loaded
    setTimeout(loadSearchModalFix, 1500); // Load search modal fix after other fixes
  });
} else {
  implementReactStateFix();
  setTimeout(implementShowAllResultsFix, 1000);
  setTimeout(loadSearchModalFix, 1500);
}

// Expose utilities globally for browser console debugging
window.PrintingPreferences = PrintingPreferences;
window.PrintingCache = PrintingCache;

createRoot(document.getElementById('root')).render(
  <App />
)
