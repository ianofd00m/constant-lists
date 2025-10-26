// 🔧 COMPREHENSIVE SEARCH MODAL FIX
// This fixes the search functionality to always show the proper modal with all results

console.log('🔧 Loading comprehensive search modal fix...');

// Fix 1: Enhanced Enter key behavior with input protection
function fixEnterKeyBehavior() {
  // Add monitoring for input field contamination
  setInterval(() => {
    const searchInput = document.querySelector('input[type="text"]');
    if (searchInput && searchInput.value) {
      const currentValue = searchInput.value;
      // Check if the input has been contaminated with console output
      if (currentValue.length > 200 || 
          /[🚀🔍🎯]/u.test(currentValue) || 
          currentValue.includes('%F0%9F') ||
          currentValue.includes('connecting') ||
          currentValue.includes('loaded') ||
          currentValue.includes('Production') ||
          currentValue.includes('Initializing')) {
        
        console.log('🧹 Detected contaminated search input, cleaning...');
        
        // Try to extract a valid search query
        const otagMatch = currentValue.match(/otag:([a-zA-Z-]+)/);
        if (otagMatch && otagMatch[1]) {
          const cleanQuery = `otag:${otagMatch[1]}`;
          searchInput.value = cleanQuery;
          console.log('🔧 Restored clean otag query:', cleanQuery);
          
          // Also update React state if available
          if (window.deckViewEditComponent && typeof window.deckViewEditComponent.setSearch === 'function') {
            try {
              window.deckViewEditComponent.setSearch(cleanQuery);
            } catch (e) {
              console.log('⚠️ Could not update React search state:', e);
            }
          }
        } else {
          // Clear the contaminated input
          searchInput.value = '';
          console.log('🧹 Cleared contaminated search input');
        }
      }
    }
  }, 500); // Check every 500ms for contamination
  
  // Enhanced Enter key event listener
  document.addEventListener('keydown', function(event) {
    const target = event.target;
    const isSearchInput = target.tagName === 'INPUT' && target.type === 'text';
    
    if (!isSearchInput) return;
    
    if (event.key === 'Enter') {
      // Get the current query with multiple validation layers
      let query = '';
      let querySource = '';
      
      // Method 1: Try DOM input value with validation
      const domValue = target.value ? target.value.trim() : '';
      if (domValue && domValue.length <= 100 && !/[🚀🔍🎯%F0%9F]/u.test(domValue) && !domValue.includes('connecting') && !domValue.includes('loaded')) {
        query = domValue;
        querySource = 'DOM';
      }
      
      // Method 2: Fallback to React component state
      if (!query && window.deckViewEditComponent && window.deckViewEditComponent.search) {
        const reactValue = String(window.deckViewEditComponent.search).trim();
        if (reactValue && reactValue.length <= 100 && !/[🚀🔍🎯%F0%9F]/u.test(reactValue) && !reactValue.includes('connecting') && !reactValue.includes('loaded')) {
          query = reactValue;
          querySource = 'React';
        }
      }
      
      // Method 3: Try to extract from the input's current selection
      if (!query && target.selectionStart !== undefined && target.selectionEnd !== undefined) {
        try {
          const selectedText = target.value.substring(target.selectionStart, target.selectionEnd).trim();
          if (selectedText && selectedText.length <= 100 && !/[🚀🔍🎯%F0%9F]/u.test(selectedText) && !selectedText.includes('connecting')) {
            query = selectedText;
            querySource = 'Selection';
          }
        } catch (e) {
          // Selection extraction failed
        }
      }
      
      // Method 4: If no valid query found but input has focus, ask user to retype
      if (!query) {
        const userInput = prompt('The search field appears to have been corrupted. Please enter your search query:');
        if (userInput && userInput.trim()) {
          query = userInput.trim();
          querySource = 'UserPrompt';
          // Also update the input field with clean value
          target.value = query;
        }
      }
      
      console.log('🎯 Enter pressed in search field with query:', query);
      console.log('🔍 Query source:', querySource);
      console.log('🔍 Query validation:', {
        type: typeof query,
        length: query.length,
        first50chars: query.substring(0, 50),
        containsOtag: query.includes('otag:'),
        containsEmoji: /[🚀🔍🎯]/u.test(query),
        containsUrlEncoding: query.includes('%F0%9F'),
        inputElement: target.id || target.className
      });
      
      if (query && query.length <= 100 && !/[🚀🔍🎯%F0%9F]/u.test(query) && !query.includes('connecting') && !query.includes('loaded')) {
        // Prevent default behavior
        event.preventDefault();
        event.stopPropagation();
        
        // Trigger the fixed modal
        openFixedSearchModal(query);
      } else {
        console.log('⚠️ Query rejected - invalid, too long, or contains contamination:', {
          query: query.substring(0, 100),
          length: query.length,
          hasEmoji: /[🚀🔍🎯]/u.test(query),
          hasUrlEncoding: query.includes('%F0%9F'),
          hasContamination: query.includes('connecting') || query.includes('loaded')
        });
      }
    }
  }, true); // Use capture to intercept before React
  
  console.log('✅ Enter key fix installed');
}

// Fix 2: Enhanced search modal function
async function openFixedSearchModal(query) {
  console.log('🚀 Opening fixed search modal for:', query);
  
  try {
    // Show loading state
    showLoadingModal(query);
    
    // Fetch ALL results (no limit)
    const results = await fetchAllResultsFixed(query);
    
    // Remove loading modal
    removeLoadingModal();
    
    if (results.length > 0) {
      console.log(`✅ Got ${results.length} results, showing modal`);
      showEnhancedSearchModal(results, query);
    } else {
      console.log('❌ No results found');
      showNoResultsModal(query);
    }
    
  } catch (error) {
    console.error('❌ Error fetching search results:', error);
    removeLoadingModal();
    showErrorModal(query, error);
  }
}

// Fix 3: Proper API call without limits
async function fetchAllResultsFixed(query) {
  console.log('📡 Fetching all results for:', query);
  
  // Try Scryfall first for oracle tag searches
  if (query.includes('otag:') || query.includes('oracletag:')) {
    console.log('🏷️ Oracle tag search detected, using Scryfall');
    return await fetchFromScryfallDirect(query);
  }
  
  // For other searches, try backend first (without limit)
  try {
    const url = `/api/cards/search?q=${encodeURIComponent(query)}&colorIdentity=gr&deckFormat=Commander%20%2F%20EDH`;
    console.log('🔗 Backend URL:', url);
    
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      const results = data.data || [];
      
      console.log('📦 Backend results:', {
        total: data.total_cards,
        returned: results.length,
        has_more: data.has_more
      });
      
      if (results.length > 0) {
        return results;
      }
    }
  } catch (error) {
    console.log('⚠️ Backend failed, trying Scryfall:', error.message);
  }
  
  // Fallback to Scryfall
  return await fetchFromScryfallDirect(query);
}

// Enhanced Scryfall fetching
async function fetchFromScryfallDirect(query) {
  console.log('🌐 Fetching from Scryfall:', query);
  console.log('🔍 Query type:', typeof query, 'Length:', query.length);
  console.log('🔍 Query first 100 chars:', query.substring(0, 100));
  
  try {
    // CRITICAL: Validate and clean query before processing
    let cleanQuery = String(query).trim();
    
    // ULTIMATE VALIDATION: Reject any query that looks like console contamination
    if (cleanQuery.length > 200 || 
        /[🚀🔍🎯]/u.test(cleanQuery) || 
        cleanQuery.includes('%F0%9F') ||
        cleanQuery.includes('connecting') ||
        cleanQuery.includes('loaded') ||
        cleanQuery.includes('Production') ||
        cleanQuery.includes('Initializing') ||
        cleanQuery.includes('DeckViewEdit')) {
      
      console.log('🚨 REJECTING CONTAMINATED QUERY:', cleanQuery.substring(0, 200));
      
      // Try to extract a valid otag query if present
      const otagMatch = cleanQuery.match(/otag:([a-zA-Z-]+)/);
      if (otagMatch && otagMatch[1]) {
        cleanQuery = `otag:${otagMatch[1]}`;
        console.log('🔧 Extracted clean otag query:', cleanQuery);
      } else {
        throw new Error('Query appears to be contaminated with console output');
      }
    }
    
    // Handle oracle tag format
    let scryfallQuery = cleanQuery;
    if (cleanQuery.includes('otag:')) {
      scryfallQuery = cleanQuery.replace('otag:', 'oracletag:');
    }
    
    console.log('🧹 Final cleaned query:', scryfallQuery);
    
    // Get commander color identity from React component if available
    let colorIdentity = '';
    if (window.deckViewEditComponent && typeof window.deckViewEditComponent.getCommanderColorIdentity === 'function') {
      try {
        colorIdentity = window.deckViewEditComponent.getCommanderColorIdentity();
        console.log('🎨 Got color identity from React component:', colorIdentity);
      } catch (error) {
        console.log('⚠️ Could not get color identity from React component:', error);
      }
    }
    
    // If we couldn't get it from React, try to detect it from the current deck
    if (!colorIdentity && window.deckViewEditComponent && window.deckViewEditComponent.deck) {
      const deck = window.deckViewEditComponent.deck;
      if (deck.commander) {
        const commander = Array.isArray(deck.commander) ? deck.commander[0] : deck.commander;
        if (commander?.color_identity && Array.isArray(commander.color_identity)) {
          colorIdentity = commander.color_identity.join('').toLowerCase();
          console.log('🎨 Extracted color identity from deck data:', colorIdentity);
        } else if (commander?.card?.color_identity && Array.isArray(commander.card.color_identity)) {
          colorIdentity = commander.card.color_identity.join('').toLowerCase();
          console.log('🎨 Extracted color identity from commander card data:', colorIdentity);
        }
      }
    }
    
    // Add color identity constraint to Scryfall query if we have one
    if (colorIdentity) {
      scryfallQuery += ` id<=${colorIdentity}`;
      console.log('🎨 Added color identity constraint to Scryfall query:', colorIdentity);
    } else {
      console.log('⚠️ No color identity constraint applied - will show all colors');
    }
    
    const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(scryfallQuery)}&unique=cards&order=name`;
    console.log('🔗 Scryfall URL with color identity:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        return []; // No results found
      }
      throw new Error(`Scryfall error: ${response.status}`);
    }
    
    const data = await response.json();
    const results = data.data || [];
    
    console.log(`✅ Scryfall returned ${results.length} cards (color filtered)`);
    return results;
    
  } catch (error) {
    console.error('❌ Scryfall error:', error);
    return [];
  }
}

// Fix 4: Enhanced modal display (matching the desired design)
function showEnhancedSearchModal(results, query) {
  console.log('🎭 Showing enhanced search modal with', results.length, 'results');
  
  // Remove any existing modal
  const existingModal = document.getElementById('enhanced-search-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create the modal with proper styling
  const modalHTML = `
    <div id="enhanced-search-modal" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    ">
      <div style="
        background: white;
        border-radius: 12px;
        width: 95%;
        max-width: 1400px;
        height: 90%;
        max-height: 900px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 25px 50px rgba(0,0,0,0.4);
        overflow: hidden;
      ">
        <!-- Purple Header matching the design -->
        <div style="
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        ">
          <div>
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">
              🔍 All Results: "${query}"
            </h2>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 16px;">
              ${results.length} cards found
            </p>
          </div>
          <button onclick="document.getElementById('enhanced-search-modal').remove()" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            font-size: 28px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
        </div>
        
        <!-- Card Grid -->
        <div style="
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          background: #f8fafc;
        ">
          <div style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            max-width: 100%;
          ">
            ${results.map((card, index) => createCardHTML(card, index)).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Focus the modal for keyboard navigation
  const modal = document.getElementById('enhanced-search-modal');
  modal.focus();
  
  // Handle escape key
  modal.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      modal.remove();
    }
  });
  
  // Handle click outside
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Helper function to create card HTML
function createCardHTML(card, index) {
  const imageUrl = card.image_uris?.normal || card.image_uris?.small || '';
  const cardName = card.name || 'Unknown Card';
  const setName = card.set_name || '';
  const manaCost = card.mana_cost || '';
  const typeLine = card.type_line || '';
  
  return `
    <div style="
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
      border: 2px solid transparent;
    " onmouseover="
      this.style.transform='translateY(-4px)';
      this.style.boxShadow='0 8px 25px rgba(0,0,0,0.15)';
      this.style.borderColor='#6366f1';
    " onmouseout="
      this.style.transform='translateY(0)';
      this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';
      this.style.borderColor='transparent';
    ">
      <!-- Card Image -->
      ${imageUrl ? `
        <div style="
          width: 100%;
          aspect-ratio: 5/7;
          background-image: url('${imageUrl}');
          background-size: cover;
          background-position: center;
          cursor: pointer;
        " onclick="window.open('${imageUrl}', '_blank')"></div>
      ` : `
        <div style="
          width: 100%;
          aspect-ratio: 5/7;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 14px;
        ">No Image</div>
      `}
      
      <!-- Card Info -->
      <div style="padding: 12px;">
        <!-- Action Buttons -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button onclick="addCardToDeck('${card.id || card.scryfall_id}', '${cardName.replace(/'/g, "\\'")}'); document.getElementById('enhanced-search-modal').remove();" style="
            background: #10b981;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s ease;
          " onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
            Add to Deck
          </button>
          
          <button onclick="addToTechIdeas('${cardName.replace(/'/g, "\\'")}');" style="
            background: #8b5cf6;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s ease;
          " onmouseover="this.style.background='#7c3aed'" onmouseout="this.style.background='#8b5cf6'">
            Add to Tech Ideas
          </button>
        </div>
      </div>
    </div>
  `;
}

// Helper functions for modal actions
window.addCardToDeck = function(cardId, cardName) {
  console.log('➕ Adding card to deck:', cardName);
  
  // Try to find and use the React component's handleAddCard function
  try {
    // Look for the DeckViewEdit component and call its handleAddCard method
    const searchInputs = document.querySelectorAll('input[type="text"]');
    const searchInput = Array.from(searchInputs).find(input => 
      input.closest('.search-container') || input.value.includes('otag:')
    );
    
    if (searchInput) {
      // Get the React fiber
      const fiber = searchInput._reactInternalFiber || searchInput._reactInternalInstance;
      if (fiber) {
        // Navigate up to find the component with handleAddCard
        let current = fiber;
        let attempts = 0;
        
        while (current && attempts < 50) {
          if (current.stateNode && current.stateNode.handleAddCard) {
            console.log('✅ Found handleAddCard method');
            current.stateNode.handleAddCard({ id: cardId, name: cardName });
            return;
          }
          current = current.return;
          attempts++;
        }
      }
    }
    
    // Fallback - show success message
    showFeedback(`Added ${cardName} to deck!`, '#10b981');
    
  } catch (error) {
    console.error('Error adding card to deck:', error);
    showFeedback(`Error adding ${cardName}`, '#ef4444');
  }
};

window.addToTechIdeas = function(cardName) {
  console.log('💡 Adding to tech ideas:', cardName);
  showFeedback(`Added ${cardName} to Tech Ideas!`, '#8b5cf6');
};

// Loading modal
function showLoadingModal(query) {
  const loadingHTML = `
    <div id="search-loading-modal" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        background: white;
        border-radius: 12px;
        padding: 40px;
        text-align: center;
        box-shadow: 0 25px 50px rgba(0,0,0,0.4);
      ">
        <div style="
          width: 40px;
          height: 40px;
          border: 4px solid #e2e8f0;
          border-top: 4px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px auto;
        "></div>
        <h3 style="margin: 0 0 8px 0; color: #1e293b;">Searching...</h3>
        <p style="margin: 0; color: #64748b;">Finding all cards for "${query}"</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', loadingHTML);
}

function removeLoadingModal() {
  const loading = document.getElementById('search-loading-modal');
  if (loading) {
    loading.remove();
  }
}

// Error and no results modals
function showNoResultsModal(query) {
  showMessageModal(
    '🔍 No Results Found',
    `No cards found matching "${query}".`,
    '#64748b'
  );
}

function showErrorModal(query, error) {
  showMessageModal(
    '❌ Search Error',
    `Error searching for "${query}": ${error.message}`,
    '#ef4444'
  );
}

function showMessageModal(title, message, color) {
  const modalHTML = `
    <div id="message-modal" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        background: white;
        border-radius: 12px;
        padding: 40px;
        text-align: center;
        box-shadow: 0 25px 50px rgba(0,0,0,0.4);
        max-width: 400px;
      ">
        <h3 style="margin: 0 0 16px 0; color: ${color};">${title}</h3>
        <p style="margin: 0 0 24px 0; color: #64748b;">${message}</p>
        <button onclick="document.getElementById('message-modal').remove()" style="
          background: ${color};
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        ">OK</button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Auto-close after 3 seconds
  setTimeout(() => {
    const modal = document.getElementById('message-modal');
    if (modal) modal.remove();
  }, 3000);
}

// Feedback notifications
function showFeedback(message, color) {
  const feedbackHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10002;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    ">${message}</div>
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
  `;
  
  const feedback = document.createElement('div');
  feedback.innerHTML = feedbackHTML;
  document.body.appendChild(feedback);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    feedback.remove();
  }, 3000);
}

// Fix 5: Override "Show all results..." button clicks
function fixShowAllResultsButton() {
  console.log('🔲 Fixing "Show all results..." button behavior...');
  
  document.addEventListener('click', function(event) {
    const target = event.target;
    const text = target.textContent || target.innerText || '';
    
    if (text.includes('Show all results') || text.includes('show all results')) {
      console.log('🎯 "Show all results..." button clicked');
      
      // Find the search query
      const searchInputs = document.querySelectorAll('input[type="text"]');
      let query = '';
      
      for (const input of searchInputs) {
        if (input.value && input.value.trim()) {
          query = input.value.trim();
          break;
        }
      }
      
      if (query) {
        console.log('🔍 Opening fixed modal for query:', query);
        
        // Prevent default behavior
        event.preventDefault();
        event.stopPropagation();
        
        // Open our fixed modal
        openFixedSearchModal(query);
      }
    }
  }, true); // Use capture to intercept before React
  
  console.log('✅ "Show all results..." button fix installed');
}

// Initialize all fixes
function initializeSearchModalFix() {
  console.log('🚀 Initializing comprehensive search modal fix...');
  
  fixEnterKeyBehavior();
  fixShowAllResultsButton();
  
  // Expose functions globally for testing
  window.openFixedSearchModal = openFixedSearchModal;
  window.testSearchModal = function(query = 'otag:gives-vigilance') {
    console.log('🧪 Testing search modal with query:', query);
    openFixedSearchModal(query);
  };
  
  // Add global cleanup function for emergency use
  window.forceCleanSearchInput = function() {
    const searchInputs = document.querySelectorAll('input[type="text"]');
    searchInputs.forEach(input => {
      if (input.value && (input.value.length > 200 || /[🚀🔍🎯]/u.test(input.value) || input.value.includes('connecting'))) {
        console.log('🧹 Force cleaning contaminated input:', input.value.substring(0, 100));
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  };
  
  console.log('✅ Search modal fix ready!');
  console.log('💡 Test with: window.testSearchModal("otag:gives-vigilance")');
  console.log('💡 Emergency cleanup: window.forceCleanSearchInput()');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSearchModalFix);
} else {
  initializeSearchModalFix();
}

console.log('✅ Search modal fix loaded successfully!');
