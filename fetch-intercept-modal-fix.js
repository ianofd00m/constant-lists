// 🚀 FETCH INTERCEPT MODAL FIX - Capture Scryfall data directly from fetch calls
console.log('🚀 Fetch intercept modal fix loading...');

// Store the original fetch function
const originalFetch = window.fetch;
let lastScryfallResults = [];

// Function to create modal with real data
function createWorkingModal(results, query = 'search') {
  console.log(`🎭 Creating modal with ${results.length} real cards for "${query}"`);
  
  // Remove any existing modal
  const existing = document.getElementById('show-all-modal');
  if (existing) {
    existing.remove();
    console.log('✅ Removed existing modal');
  }
  
  // Create modal HTML with all cards
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
          ">🔍 All Results: "${query}" (REAL DATA)</h2>
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
                
                // Show copy feedback
                const feedback = document.createElement('div');
                feedback.textContent = '📋 Copied!';
                feedback.style.cssText = \`
                  position: absolute;
                  top: 10px;
                  right: 10px;
                  background: #059669;
                  color: white;
                  padding: 4px 8px;
                  border-radius: 4px;
                  font-size: 12px;
                  font-weight: 600;
                  z-index: 100;
                  animation: fadeInOut 2s ease;
                \`;
                this.appendChild(feedback);
                setTimeout(() => feedback.remove(), 2000);
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
                
                <!-- Set Info -->
                ${card.set_name ? `
                  <div style="
                    font-size: 12px !important;
                    color: #9ca3af !important;
                    margin-bottom: 10px !important;
                    font-weight: 500 !important;
                    background: #f9fafb !important;
                    padding: 4px 8px !important;
                    border-radius: 4px !important;
                    display: inline-block !important;
                  ">${card.set_name} (${card.set || ''})</div>
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
                    
                    // Show success animation
                    this.style.transform = 'scale(0.95)';
                    setTimeout(() => this.style.transform = 'scale(1)', 150);
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
                  " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(16,185,129,0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 8px rgba(16,185,129,0.3)'">➕ Add to Deck</button>
                  
                  <button onclick="
                    event.stopPropagation();
                    console.log('🔄 Adding to sideboard:', '${(card.name || '').replace(/'/g, "\\'")}');
                    this.textContent='✅ Added!';
                    this.style.background='linear-gradient(135deg, #0369a1 0%, #075985 100%)';
                    setTimeout(() => {
                      this.textContent='🔄 Sideboard';
                      this.style.background='linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)';
                    }, 3000);
                    
                    // Show success animation
                    this.style.transform = 'scale(0.95)';
                    setTimeout(() => this.style.transform = 'scale(1)', 150);
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
                  " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(14,165,233,0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 8px rgba(14,165,233,0.3)'">🔄 Sideboard</button>
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
  
  // Add CSS for animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInOut {
      0% { opacity: 0; transform: scale(0.8); }
      20% { opacity: 1; transform: scale(1.1); }
      80% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(0.8); }
    }
  `;
  document.head.appendChild(style);
  
  // Insert modal into DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  console.log('✅ Working modal created with REAL DATA!');
  console.log(`🎯 Modal displays ${Math.min(results.length, 100)} of ${results.length} cards for "${query}"`);
  
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
  
  return true;
}

// Override fetch to capture Scryfall responses
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  
  // Check if this is a Scryfall API call
  const url = args[0];
  if (typeof url === 'string' && url.includes('scryfall.com')) {
    console.log('🕷️ Intercepted Scryfall API call:', url);
    
    // Clone the response to read it without consuming the original
    const clonedResponse = response.clone();
    
    try {
      const data = await clonedResponse.json();
      
      if (data && data.data && Array.isArray(data.data)) {
        console.log(`📦 Captured ${data.data.length} cards from Scryfall`);
        
        // Store the results
        lastScryfallResults = [...lastScryfallResults, ...data.data];
        window.lastScryfallResults = lastScryfallResults;
        
        // If this looks like a complete set and we have enough cards, auto-create modal
        if (lastScryfallResults.length >= 50 && !data.has_more) {
          console.log(`🚀 Auto-creating modal with ${lastScryfallResults.length} intercepted cards!`);
          setTimeout(() => {
            createWorkingModal(lastScryfallResults, 'intercepted');
          }, 500);
        }
      }
    } catch (e) {
      console.log('⚠️ Could not parse Scryfall response:', e);
    }
  }
  
  return response;
};

// Function to manually create modal with last results
function showLastResults() {
  if (lastScryfallResults.length > 0) {
    console.log(`🎯 Creating modal with ${lastScryfallResults.length} intercepted results`);
    createWorkingModal(lastScryfallResults, 'manual');
    return true;
  } else {
    console.log('❌ No intercepted results available yet');
    return false;
  }
}

// Function to clear intercepted results
function clearResults() {
  lastScryfallResults = [];
  window.lastScryfallResults = [];
  console.log('🧹 Cleared intercepted results');
}

// Expose functions globally
window.createWorkingModal = createWorkingModal;
window.showLastResults = showLastResults;
window.clearResults = clearResults;
window.lastScryfallResults = lastScryfallResults;

console.log('✅ Fetch intercept modal fix ready!');
console.log('🕷️ Now intercepting all Scryfall API calls');
console.log('💡 Use: showLastResults() to show intercepted data');
console.log('💡 Use: clearResults() to clear intercepted data');
console.log('💡 Will auto-create modal when complete Scryfall response is detected');
