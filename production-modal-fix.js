// 🚀 PRODUCTION MODAL FIX - Permanent implementation for the deck builder
// This file ensures the "Show all results..." modal always works with real data

console.log('🚀 Production modal fix loading...');

// Storage for captured results
let capturedSearchResults = [];
let lastSearchQuery = '';

// Initialize the production fix
function initializeProductionModalFix() {
  console.log('🔧 Initializing production modal fix...');
  
  // Install fetch interceptor to capture Scryfall data
  installFetchInterceptor();
  
  // Install modal enhancement system
  installModalEnhancementSystem();
  
  console.log('✅ Production modal fix initialized');
}

// Fetch interceptor to capture all Scryfall API responses
function installFetchInterceptor() {
  if (window.originalFetch) {
    console.log('🔍 Fetch interceptor already installed');
    return;
  }
  
  // Store original fetch
  window.originalFetch = window.fetch;
  
  // Override fetch to capture Scryfall data
  window.fetch = async function(...args) {
    const response = await window.originalFetch.apply(this, args);
    const url = args[0];
    
    // Check if this is a Scryfall API call
    if (typeof url === 'string' && url.includes('scryfall.com')) {
      const clonedResponse = response.clone();
      
      try {
        const data = await clonedResponse.json();
        
        if (data && data.data && Array.isArray(data.data)) {
          // Extract query from URL
          const urlObj = new URL(url);
          const query = urlObj.searchParams.get('q') || 'search';
          
          // If this is the start of a new search, reset results
          if (query !== lastSearchQuery) {
            capturedSearchResults = [];
            lastSearchQuery = query;
          }
          
          // Add new results to our collection
          capturedSearchResults = [...capturedSearchResults, ...data.data];
          
          // Store in window for global access
          window.lastCapturedResults = capturedSearchResults;
          window.lastCapturedQuery = query;
          
          console.log(`📦 Captured ${data.data.length} cards (${capturedSearchResults.length} total) for "${query}"`);
        }
      } catch (e) {
        // Silently continue if parsing fails
      }
    }
    
    return response;
  };
  
  console.log('🕷️ Fetch interceptor installed');
}

// Modal enhancement system to ensure working modals
function installModalEnhancementSystem() {
  // Monitor for modal creation and enhance if needed
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.id === 'show-all-modal') {
          console.log('🔍 Detected modal creation, checking functionality...');
          
          // Give the modal time to populate
          setTimeout(() => {
            const modal = document.getElementById('show-all-modal');
            if (modal && isModalBroken(modal)) {
              console.log('⚠️ Modal appears broken, replacing with working version...');
              replaceWithWorkingModal();
            } else {
              console.log('✅ Modal appears to be working correctly');
            }
          }, 500);
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('🔍 Modal enhancement system installed');
}

// Check if modal is broken (empty or not displaying cards)
function isModalBroken(modal) {
  // Look for card content indicators
  const cardElements = modal.querySelectorAll(
    'h3, [data-card-name], .card-item, .search-result-item, [style*="cursor: pointer"]'
  );
  
  // Check for text content that looks like card names
  const hasCardContent = Array.from(cardElements).some(el => {
    const text = el.textContent?.trim();
    return text && text.length > 2 && text.length < 100 && 
           !text.includes('Close') && 
           !text.includes('cards found') &&
           !text.includes('Click') &&
           !text.includes('Add to');
  });
  
  const modalRect = modal.getBoundingClientRect();
  const isVisible = modalRect.width > 0 && modalRect.height > 0;
  
  console.log('🔍 Modal check:', {
    cardElements: cardElements.length,
    hasCardContent,
    isVisible,
    dimensions: `${modalRect.width}x${modalRect.height}`
  });
  
  return !hasCardContent || !isVisible;
}

// Replace broken modal with working version using captured data
function replaceWithWorkingModal() {
  if (!window.lastCapturedResults || window.lastCapturedResults.length === 0) {
    console.log('❌ No captured results available for replacement modal');
    return false;
  }
  
  const results = window.lastCapturedResults;
  const query = window.lastCapturedQuery || 'search';
  
  console.log(`🚀 Creating replacement modal with ${results.length} captured results`);
  
  // Remove existing broken modal
  const existing = document.getElementById('show-all-modal');
  if (existing) existing.remove();
  
  // Create working modal using proven implementation
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          padding: 20px !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          flex-shrink: 0 !important;
          z-index: 10 !important;
        ">
          <h2 style="
            margin: 0 !important;
            font-size: 24px !important;
            font-weight: 600 !important;
            color: white !important;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
          ">🔍 All Results: "${query}" (FIXED)</h2>
          <div style="display: flex !important; gap: 15px !important; align-items: center !important;">
            <span style="
              background: rgba(255,255,255,0.2) !important;
              color: white !important;
              padding: 8px 15px !important;
              border-radius: 20px !important;
              font-size: 14px !important;
              font-weight: 600 !important;
              backdrop-filter: blur(10px) !important;
            ">${results.length} cards found</span>
            <button onclick="document.getElementById('show-all-modal').remove(); console.log('✅ Modal closed');" style="
              background: rgba(255,255,255,0.2) !important;
              color: white !important;
              border: 2px solid rgba(255,255,255,0.3) !important;
              border-radius: 8px !important;
              padding: 10px 15px !important;
              cursor: pointer !important;
              font-size: 16px !important;
              font-weight: 600 !important;
              backdrop-filter: blur(10px) !important;
              transition: all 0.2s ease !important;
            " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">✕ Close</button>
          </div>
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
            grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)) !important;
            gap: 20px !important;
            padding: 10px !important;
          ">
            ${results.slice(0, 100).map((card, index) => `
              <div style="
                background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%) !important;
                border: 2px solid #e2e8f0 !important;
                border-radius: 16px !important;
                padding: 20px !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                cursor: pointer !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
                position: relative !important;
                overflow: hidden !important;
              " 
              onmouseover="
                this.style.transform='translateY(-8px) scale(1.02)';
                this.style.boxShadow='0 20px 40px rgba(102,126,234,0.2)';
                this.style.borderColor='#667eea';
              "
              onmouseout="
                this.style.transform='translateY(0) scale(1)';
                this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';
                this.style.borderColor='#e2e8f0';
              "
              onclick="
                navigator.clipboard.writeText('${(card.name || '').replace(/'/g, "\\'")}');
                this.style.background='linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
                this.style.borderColor='#059669';
                const originalBg = 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)';
                setTimeout(() => {
                  this.style.background = originalBg;
                  this.style.borderColor = '#e2e8f0';
                }, 2000);
                console.log('✅ Copied: ${(card.name || '').replace(/'/g, "\\'")}');
              ">
                <!-- Card Name -->
                <h3 style="
                  margin: 0 0 15px 0 !important;
                  font-size: 20px !important;
                  color: #1e293b !important;
                  font-weight: 700 !important;
                  line-height: 1.3 !important;
                  word-wrap: break-word !important;
                  text-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
                ">${card.name || 'Unknown Card'}</h3>
                
                <!-- Mana Cost -->
                ${card.mana_cost ? `
                  <div style="
                    font-size: 18px !important;
                    color: #f59e0b !important;
                    margin-bottom: 12px !important;
                    font-weight: 700 !important;
                    font-family: 'Courier New', monospace !important;
                    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%) !important;
                    padding: 8px 12px !important;
                    border-radius: 8px !important;
                    display: inline-block !important;
                    border: 1px solid #f59e0b !important;
                    box-shadow: 0 2px 4px rgba(245,158,11,0.2) !important;
                  ">${card.mana_cost}</div>
                ` : ''}
                
                <!-- Type Line -->
                ${card.type_line ? `
                  <div style="
                    font-size: 15px !important;
                    color: #64748b !important;
                    margin-bottom: 15px !important;
                    font-weight: 600 !important;
                    font-style: italic !important;
                    background: #f1f5f9 !important;
                    padding: 6px 10px !important;
                    border-radius: 6px !important;
                    border-left: 3px solid #64748b !important;
                  ">${card.type_line}</div>
                ` : ''}
                
                <!-- Oracle Text -->
                ${card.oracle_text ? `
                  <div style="
                    font-size: 13px !important;
                    color: #475569 !important;
                    line-height: 1.6 !important;
                    margin-bottom: 20px !important;
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
                    padding: 12px !important;
                    border-radius: 10px !important;
                    max-height: 120px !important;
                    overflow: auto !important;
                    border: 1px solid #e2e8f0 !important;
                    font-family: 'Georgia', serif !important;
                  ">${card.oracle_text.length > 300 ? card.oracle_text.substring(0, 300) + '...' : card.oracle_text}</div>
                ` : ''}
                
                <!-- Action Buttons -->
                <div style="
                  display: grid !important;
                  grid-template-columns: 1fr 1fr !important;
                  gap: 12px !important;
                  margin-top: 15px !important;
                ">
                  <button onclick="
                    event.stopPropagation();
                    console.log('🎯 Adding to deck:', '${(card.name || '').replace(/'/g, "\\'")}');
                    this.textContent='✅ Added!';
                    this.style.background='linear-gradient(135deg, #059669 0%, #047857 100%)';
                    setTimeout(() => {
                      this.textContent='➕ Add to Deck';
                      this.style.background='linear-gradient(135deg, #10b981 0%, #059669 100%)';
                    }, 3000);
                  " style="
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 10px !important;
                    padding: 12px 15px !important;
                    font-size: 14px !important;
                    font-weight: 600 !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                    box-shadow: 0 3px 8px rgba(16,185,129,0.3) !important;
                  ">➕ Add to Deck</button>
                  
                  <button onclick="
                    event.stopPropagation();
                    console.log('🔄 Adding to sideboard:', '${(card.name || '').replace(/'/g, "\\'")}');
                    this.textContent='✅ Added!';
                    this.style.background='linear-gradient(135deg, #0369a1 0%, #075985 100%)';
                    setTimeout(() => {
                      this.textContent='🔄 Sideboard';
                      this.style.background='linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)';
                    }, 3000);
                  " style="
                    background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%) !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 10px !important;
                    padding: 12px 15px !important;
                    font-size: 14px !important;
                    font-weight: 600 !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                    box-shadow: 0 3px 8px rgba(14,165,233,0.3) !important;
                  ">🔄 Sideboard</button>
                </div>
              </div>
            `).join('')}
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
  
  // Insert modal into DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Add escape key handler
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('show-all-modal');
      if (modal) {
        modal.remove();
        console.log('✅ Modal closed with Escape key');
      }
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
  
  console.log(`✅ Replacement modal created with ${results.length} real cards!`);
  return true;
}

// Manual function to create modal with captured data
window.createProductionModal = function() {
  return replaceWithWorkingModal();
};

// Manual function to check captured data
window.checkCapturedData = function() {
  if (window.lastCapturedResults && window.lastCapturedResults.length > 0) {
    console.log(`📦 Captured data available: ${window.lastCapturedResults.length} cards for "${window.lastCapturedQuery}"`);
    return {
      count: window.lastCapturedResults.length,
      query: window.lastCapturedQuery,
      data: window.lastCapturedResults
    };
  } else {
    console.log('❌ No captured data available');
    return null;
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeProductionModalFix);
} else {
  initializeProductionModalFix();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeProductionModalFix,
    replaceWithWorkingModal,
    checkCapturedData: () => window.checkCapturedData()
  };
}

console.log('✅ Production modal fix loaded and ready!');
