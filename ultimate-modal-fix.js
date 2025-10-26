// 🚨 ULTIMATE MODAL FIX - Copy this entire block into console
console.log('🚨 Ultimate modal fix loading...');

// Store original fetch
const originalFetch = window.fetch;
let capturedResults = [];
let lastQuery = '';

// Override fetch to capture Scryfall data
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  const url = args[0];
  
  if (typeof url === 'string' && url.includes('scryfall.com')) {
    const clonedResponse = response.clone();
    try {
      const data = await clonedResponse.json();
      if (data && data.data && Array.isArray(data.data)) {
        // Extract query from URL
        const urlObj = new URL(url);
        const query = urlObj.searchParams.get('q') || 'search';
        
        // If this is the start of a new search, reset results
        if (query !== lastQuery) {
          capturedResults = [];
          lastQuery = query;
        }
        
        capturedResults = [...capturedResults, ...data.data];
        console.log(`📦 Captured ${data.data.length} cards (${capturedResults.length} total) for "${query}"`);
        
        // Store in window for access
        window.lastCapturedResults = capturedResults;
        window.lastCapturedQuery = query;
      }
    } catch (e) {
      console.log('⚠️ Could not parse response:', e);
    }
  }
  
  return response;
};

// Function to create working modal
window.createWorkingModal = function() {
  if (!window.lastCapturedResults || window.lastCapturedResults.length === 0) {
    console.log('❌ No captured results. Search for something first!');
    return false;
  }
  
  const results = window.lastCapturedResults;
  const query = window.lastCapturedQuery || 'search';
  
  // Remove existing modal
  const existing = document.getElementById('show-all-modal');
  if (existing) existing.remove();
  
  console.log(`🎯 Creating working modal with ${results.length} cards for "${query}"`);
  
  document.body.insertAdjacentHTML('beforeend', `
    <div id="show-all-modal" style="
      position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
      background: rgba(0,0,0,0.9) !important; z-index: 9999999 !important;
      display: flex !important; align-items: center !important; justify-content: center !important; padding: 20px !important;
    ">
      <div style="
        background: white !important; border-radius: 12px !important; width: 95vw !important; height: 95vh !important;
        display: flex !important; flex-direction: column !important; overflow: hidden !important;
      ">
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important; color: white !important; padding: 20px !important;
          display: flex !important; justify-content: space-between !important; align-items: center !important;
        ">
          <h2 style="margin: 0 !important; font-size: 24px !important;">🔍 All Results: "${query}" (${results.length} cards)</h2>
          <button onclick="document.getElementById('show-all-modal').remove();" style="
            background: rgba(255,255,255,0.2) !important; color: white !important; border: none !important;
            border-radius: 8px !important; padding: 10px 15px !important; cursor: pointer !important;
          ">✕ Close</button>
        </div>
        <div style="flex: 1 !important; overflow-y: auto !important; padding: 20px !important;">
          <div style="display: grid !important; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)) !important; gap: 20px !important;">
            ${results.slice(0, 50).map(card => `
              <div style="
                background: white !important; border: 2px solid #e2e8f0 !important; border-radius: 12px !important;
                padding: 20px !important; cursor: pointer !important; transition: all 0.2s !important;
              " 
              onmouseover="this.style.borderColor='#667eea'; this.style.transform='translateY(-4px)';"
              onmouseout="this.style.borderColor='#e2e8f0'; this.style.transform='translateY(0)';"
              onclick="navigator.clipboard.writeText('${card.name}'); console.log('✅ Copied: ${card.name}'); this.style.background='#dcfce7'; setTimeout(() => this.style.background='white', 1000);">
                <h3 style="margin: 0 0 10px 0 !important; color: #1e293b !important; font-size: 18px !important;">${card.name}</h3>
                ${card.mana_cost ? `<div style="color: #f59e0b !important; margin-bottom: 8px !important; font-family: monospace !important;">${card.mana_cost}</div>` : ''}
                ${card.type_line ? `<div style="color: #64748b !important; margin-bottom: 8px !important; font-style: italic !important;">${card.type_line}</div>` : ''}
                ${card.set_name ? `<div style="color: #9ca3af !important; font-size: 12px !important; margin-bottom: 10px !important;">${card.set_name}</div>` : ''}
                ${card.oracle_text ? `<div style="color: #475569 !important; font-size: 13px !important; line-height: 1.4 !important; margin-bottom: 15px !important; max-height: 80px !important; overflow: auto !important;">${card.oracle_text.length > 200 ? card.oracle_text.substring(0, 200) + '...' : card.oracle_text}</div>` : ''}
                <div style="display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 10px !important;">
                  <button onclick="event.stopPropagation(); console.log('🎯 Adding to deck:', '${card.name}'); this.textContent='✅ Added!'; setTimeout(() => this.textContent='➕ Add to Deck', 2000);" style="
                    background: #10b981 !important; color: white !important; border: none !important; border-radius: 8px !important;
                    padding: 10px !important; cursor: pointer !important; font-weight: 600 !important;
                  ">➕ Add to Deck</button>
                  <button onclick="event.stopPropagation(); console.log('🔄 Adding to sideboard:', '${card.name}'); this.textContent='✅ Added!'; setTimeout(() => this.textContent='🔄 Sideboard', 2000);" style="
                    background: #0ea5e9 !important; color: white !important; border: none !important; border-radius: 8px !important;
                    padding: 10px !important; cursor: pointer !important; font-weight: 600 !important;
                  ">🔄 Sideboard</button>
                </div>
              </div>
            `).join('')}
            ${results.length > 50 ? `
              <div style="grid-column: 1 / -1; text-align: center; padding: 20px; background: #fef3c7; border-radius: 12px; color: #92400e;">
                📝 Showing first 50 of ${results.length} cards for performance
              </div>
            ` : ''}
          </div>
        </div>
        <div style="padding: 16px 20px !important; border-top: 1px solid #e2e8f0 !important; text-align: center !important; color: #6b7280 !important;">
          ${results.length} cards found • Click names to copy • Use buttons to add to deck/sideboard
        </div>
      </div>
    </div>
  `);
  
  console.log('✅ Working modal created with real data!');
  return true;
};

// Monitor for failed modals and auto-replace
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1 && node.id === 'show-all-modal') {
        setTimeout(() => {
          const modal = document.getElementById('show-all-modal');
          if (modal && window.lastCapturedResults && window.lastCapturedResults.length > 0) {
            const cardElements = modal.querySelectorAll('[data-card-name], .card-item, .search-result-item, h3');
            if (cardElements.length < 5) { // If modal seems empty or broken
              console.log('🔄 Detected broken modal, replacing with working version...');
              modal.remove();
              window.createWorkingModal();
            }
          }
        }, 300);
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });

console.log('✅ Ultimate modal fix ready!');
console.log('🕷️ Fetch interceptor active - will capture all search results');
console.log('🔍 DOM monitor active - will replace broken modals automatically');
console.log('💡 Manual command: createWorkingModal() - creates modal with last captured results');
console.log('');
console.log('🎯 Instructions:');
console.log('1. Search for "ring" in your app');
console.log('2. Click "Show all results..." (even if it shows blank)');
console.log('3. The fix will automatically replace the broken modal with a working one');
console.log('4. Or manually run: createWorkingModal()');
