// 🔧 ROBUST "Show all results..." FIX
// This fix uses multiple event capture methods to ensure we catch the click

console.log('🚀 Installing robust "Show all results..." button fix...');

// Store original results for fallback
window.robustFixActive = true;

// Function to get all results for a query
async function getAllResults(query) {
  console.log('🔍 Getting all results for:', query);
  
  try {
    // Try backend first (without limit)
    let url = `/api/cards/search?q=${encodeURIComponent(query.trim())}`;
    url += `&colorIdentity=gr&deckFormat=Commander%20%2F%20EDH`;
    
    console.log('📡 Fetching from backend:', url);
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📦 Backend response:', {
        total: data.total_cards,
        returned: data.data?.length,
        has_more: data.has_more
      });
      
      // If backend is broken (says no more but missing cards), use Scryfall
      if (!data.has_more && data.total_cards > data.data?.length) {
        console.log('⚠️ Backend broken, using Scryfall...');
        return await fetchFromScryfall(query);
      }
      
      return data.data || [];
    }
    
    // If backend fails, go straight to Scryfall
    console.log('❌ Backend failed, using Scryfall...');
    return await fetchFromScryfall(query);
    
  } catch (error) {
    console.error('❌ Error fetching results:', error);
    return await fetchFromScryfall(query);
  }
}

// Scryfall fallback
async function fetchFromScryfall(query) {
  console.log('🌐 Fetching from Scryfall API...');
  
  try {
    let scryfallQuery = `${query} game:paper id:gr legal:commander`;
    const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(scryfallQuery)}`;
    
    console.log('🔗 Scryfall URL:', url);
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Scryfall success: ${data.data?.length || 0} cards`);
      return data.data || [];
    } else if (response.status === 404) {
      console.log('📭 No results found in Scryfall');
      return [];
    } else {
      console.error('❌ Scryfall error:', response.status);
      return [];
    }
  } catch (error) {
    console.error('❌ Scryfall fetch failed:', error);
    return [];
  }
}

// Function to show modal with results
function showResultsModal(results, query) {
  console.log(`🎭 Showing modal with ${results.length} results for "${query}"`);
  
  // Remove existing modal
  const existing = document.getElementById('robust-modal');
  if (existing) existing.remove();
  
  // Create modal
  const modalHTML = `
    <div id="robust-modal" style="
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    ">
      <div style="
        background: white;
        border-radius: 8px;
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
        padding: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #eee;
        ">
          <h2 style="margin: 0; color: #333; font-size: 24px;">
            All Results: "${query}"
          </h2>
          <div style="display: flex; gap: 15px; align-items: center;">
            <span style="
              background: #4CAF50;
              color: white;
              padding: 6px 12px;
              border-radius: 4px;
              font-size: 14px;
              font-weight: bold;
            ">${results.length} cards</span>
            <button onclick="document.getElementById('robust-modal').remove()" style="
              background: #f44336;
              color: white;
              border: none;
              border-radius: 6px;
              padding: 10px 15px;
              cursor: pointer;
              font-size: 16px;
              font-weight: bold;
            ">✕ Close</button>
          </div>
        </div>
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 15px;
          max-height: 70vh;
          overflow-y: auto;
          padding-right: 10px;
        ">
          ${results.map(card => {
            const name = card.name || 'Unknown Card';
            const mana = card.mana_cost || '';
            const type = card.type_line || '';
            const text = card.oracle_text || '';
            const imageUrl = card.image_uris?.normal || card.image_uris?.large || '';
            
            return `
              <div style="
                border: 2px solid #ddd;
                border-radius: 8px;
                padding: 15px;
                background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              " onmouseover="
                this.style.transform='translateY(-2px)';
                this.style.boxShadow='0 8px 25px rgba(0,0,0,0.2)';
                this.style.borderColor='#4CAF50';
              " onmouseout="
                this.style.transform='translateY(0)';
                this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)';
                this.style.borderColor='#ddd';
              " onclick="
                navigator.clipboard.writeText('${name}');
                this.style.background='#e8f5e8';
                setTimeout(() => this.style.background='linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)', 1000);
                console.log('📋 Copied: ${name}');
              ">
                <div style="display: flex; gap: 12px; align-items: flex-start;">
                  ${imageUrl ? `
                    <img src="${imageUrl}" alt="${name}" style="
                      width: 70px;
                      height: 98px;
                      border-radius: 6px;
                      object-fit: cover;
                      flex-shrink: 0;
                      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                    ">
                  ` : `
                    <div style="
                      width: 70px;
                      height: 98px;
                      background: #e0e0e0;
                      border-radius: 6px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 12px;
                      color: #666;
                      flex-shrink: 0;
                    ">No Image</div>
                  `}
                  <div style="flex: 1; min-width: 0;">
                    <h3 style="
                      margin: 0 0 8px 0;
                      font-size: 18px;
                      color: #2c3e50;
                      font-weight: bold;
                      word-wrap: break-word;
                      line-height: 1.3;
                    ">${name}</h3>
                    ${mana ? `
                      <div style="
                        font-size: 14px;
                        color: #e67e22;
                        margin-bottom: 6px;
                        font-weight: bold;
                      ">${mana}</div>
                    ` : ''}
                    ${type ? `
                      <div style="
                        font-size: 13px;
                        color: #7f8c8d;
                        margin-bottom: 8px;
                        font-style: italic;
                      ">${type}</div>
                    ` : ''}
                    ${text ? `
                      <div style="
                        font-size: 12px;
                        color: #34495e;
                        line-height: 1.4;
                        max-height: 80px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      ">${text.length > 120 ? text.substring(0, 120) + '...' : text}</div>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #eee;
          text-align: center;
          color: #666;
          font-size: 14px;
        ">
          💡 Click any card to copy its name to clipboard
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  console.log('✅ Modal created and displayed');
}

// Multiple event listeners to catch the click
function setupEventListeners() {
  // Method 1: Document-wide click listener with capture
  document.addEventListener('click', function(event) {
    const target = event.target;
    const text = target.textContent || target.innerText || '';
    
    if (text.includes('Show all results') || text.includes('show all results')) {
      console.log('🎯 Method 1: "Show all results" clicked!');
      handleShowAllClick(event);
    }
  }, true);
  
  // Method 2: Specific element monitoring
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if this node or its children contain "Show all results"
          const elements = [node, ...node.querySelectorAll('*')];
          elements.forEach(el => {
            if (el.textContent && el.textContent.includes('Show all results')) {
              console.log('🔍 Method 2: Found "Show all results" element, adding listener');
              el.addEventListener('click', handleShowAllClick, true);
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
  
  // Method 3: Periodic scanning
  setInterval(() => {
    const showAllElements = document.querySelectorAll('*');
    for (const el of showAllElements) {
      if (el.textContent && el.textContent.includes('Show all results') && !el.hasRobustListener) {
        console.log('🔍 Method 3: Adding listener to found element');
        el.addEventListener('click', handleShowAllClick, true);
        el.hasRobustListener = true;
      }
    }
  }, 1000);
  
  console.log('✅ All event listeners installed');
}

// Handle the show all click
async function handleShowAllClick(event) {
  console.log('🖱️ SHOW ALL RESULTS CLICKED!');
  
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
  
  console.log('🔍 Current query:', query);
  
  // Show loading indicator
  const loading = document.createElement('div');
  loading.id = 'loading-indicator';
  loading.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 20px 30px;
      border-radius: 8px;
      z-index: 100000;
      font-size: 18px;
      text-align: center;
    ">
      🔍 Fetching all results for "${query}"...<br>
      <div style="margin-top: 10px; font-size: 14px; opacity: 0.8;">Please wait...</div>
    </div>
  `;
  document.body.appendChild(loading);
  
  try {
    // Fetch all results
    const results = await getAllResults(query);
    
    // Remove loading
    loading.remove();
    
    if (results.length > 0) {
      console.log(`✅ Got ${results.length} results, showing modal`);
      showResultsModal(results, query);
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

// Install everything
setupEventListeners();

// Test function
window.testRobustFix = function() {
  console.log('🧪 Testing robust fix...');
  
  // Simulate the click
  const testEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  
  handleShowAllClick(testEvent);
};

// Manual trigger function
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

console.log('🎉 Robust "Show all results..." fix installed!');
console.log('💡 Test with: testRobustFix() or triggerShowAll("fight")');
console.log('💡 Now try clicking "Show all results..." - it should work!');
