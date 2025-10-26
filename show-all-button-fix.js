// 🎯 TARGETED FIX: Hook into "Show all results" button to force all results
console.log('🔧 Applying show-all-results button fix...');

// The issue: The button doesn't trigger our overridden function
// This fix intercepts the button click and injects the proper results

// Function to force all results into the modal
async function forceAllResultsIntoModal(query) {
  console.log('🚀 Forcing all results for query:', query);
  
  try {
    // Get the current deck context
    let colorIdentity = 'gr'; // Default for Wolverine deck
    let deckFormat = 'Commander / EDH';
    
    // Build the request URL without limit
    let url = `/api/cards/search?q=${encodeURIComponent(query.trim())}`;
    url += `&colorIdentity=${colorIdentity}`;
    url += `&deckFormat=${encodeURIComponent(deckFormat)}`;
    
    console.log('🔗 Fetching all results from:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const results = data.data || [];
    
    console.log('📦 API Response:', {
      total_cards: data.total_cards,
      returned_count: results.length,
      has_more: data.has_more
    });
    
    // If backend is still broken, try Scryfall directly
    if (!data.has_more && data.total_cards > results.length) {
      console.log('⚠️ Backend broken, trying Scryfall...');
      return await fetchFromScryfall(query, colorIdentity);
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Error fetching all results:', error);
    return [];
  }
}

// Direct Scryfall fetch
async function fetchFromScryfall(query, colorIdentity) {
  console.log('🌐 Fetching from Scryfall...');
  
  let scryfallQuery = query.includes('game:') ? query : `${query} game:paper`;
  if (colorIdentity) scryfallQuery += ` id:${colorIdentity}`;
  scryfallQuery += ' legal:commander';
  
  const allResults = [];
  let page = 1;
  
  while (page <= 10) { // Limit to 10 pages for safety
    try {
      const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(scryfallQuery)}&page=${page}`;
      console.log(`🔍 Fetching Scryfall page ${page}...`);
      
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) break;
        throw new Error(`Scryfall error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        allResults.push(...data.data);
        if (!data.has_more) break;
        page++;
        
        // Delay to be nice to Scryfall
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        break;
      }
    } catch (error) {
      console.error(`❌ Error fetching page ${page}:`, error);
      break;
    }
  }
  
  console.log(`✅ Scryfall fetch complete: ${allResults.length} cards`);
  return allResults;
}

// Function to inject results into React state
function injectResultsIntoModal(results, query) {
  console.log(`🎯 Injecting ${results.length} results into modal...`);
  
  // Try to find the React component and update its state
  // This is a bit hacky but should work
  
  // Look for the search modal or any element that might have React state
  const modalElements = document.querySelectorAll('[class*="modal"], [class*="Modal"], [id*="modal"], [id*="Modal"]');
  const searchElements = document.querySelectorAll('[class*="search"], [class*="Search"]');
  
  // Try to find React fiber nodes and update state
  const allElements = [...modalElements, ...searchElements, document.body];
  
  for (const element of allElements) {
    const fiberKey = Object.keys(element).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'));
    
    if (fiberKey) {
      const fiber = element[fiberKey];
      if (fiber && fiber.return) {
        console.log('🔍 Found React fiber, trying to update state...');
        
        // Try to find a component with setAllSearchResults or similar
        let currentFiber = fiber;
        let depth = 0;
        
        while (currentFiber && depth < 20) {
          if (currentFiber.stateNode && typeof currentFiber.stateNode === 'object') {
            const instance = currentFiber.stateNode;
            
            // Look for setState method and state with search results
            if (instance.setState && instance.state) {
              console.log('🎯 Found component with state:', Object.keys(instance.state));
              
              // Try to update allSearchResults if it exists
              if ('allSearchResults' in instance.state) {
                console.log('✅ Updating allSearchResults state directly');
                instance.setState({
                  allSearchResults: results,
                  showSearchModal: true,
                  showDropdown: false
                });
                return true;
              }
            }
          }
          
          currentFiber = currentFiber.return;
          depth++;
        }
      }
    }
  }
  
  console.log('⚠️ Could not find React component to update');
  return false;
}

// Hook into button clicks
function hookShowAllResultsButton() {
  // Listen for clicks on "Show all results..." buttons
  document.addEventListener('click', async function(event) {
    const target = event.target;
    
    // Check if this is a "Show all results..." button
    if (target.textContent && target.textContent.includes('Show all results')) {
      console.log('🖱️ "Show all results..." button clicked!');
      
      // Try to get the current search query
      const searchInputs = document.querySelectorAll('input[type="text"]');
      let currentQuery = '';
      
      for (const input of searchInputs) {
        if (input.value && input.value.trim()) {
          currentQuery = input.value.trim();
          break;
        }
      }
      
      if (!currentQuery) {
        console.log('❌ No search query found');
        return;
      }
      
      console.log('🔍 Current search query:', currentQuery);
      
      // Prevent the default behavior
      event.preventDefault();
      event.stopPropagation();
      
      // Fetch all results
      const allResults = await forceAllResultsIntoModal(currentQuery);
      
      if (allResults.length > 0) {
        console.log(`✅ Got ${allResults.length} results, injecting into modal...`);
        
        // Try to inject into React state
        const injected = injectResultsIntoModal(allResults, currentQuery);
        
        if (!injected) {
          // Fallback: try to manually open modal
          console.log('🔄 Trying manual modal approach...');
          
          // Store results globally for debugging
          window.lastAllResults = allResults;
          window.lastQuery = currentQuery;
          
          console.log('📊 Results stored in window.lastAllResults');
          console.log('💡 You can inspect them with: console.log(window.lastAllResults)');
        }
      } else {
        console.log('❌ No results fetched');
      }
    }
  }, true); // Use capture phase to intercept before React
  
  console.log('✅ "Show all results..." button hook installed');
}

// Install the hook
hookShowAllResultsButton();

// Test function
window.testButtonFix = function() {
  console.log('🧪 Testing button fix...');
  
  // Simulate a click on "Show all results..." button
  const buttons = document.querySelectorAll('div, span, button, a');
  for (const button of buttons) {
    if (button.textContent && button.textContent.includes('Show all results')) {
      console.log('🎯 Found "Show all results..." button, simulating click...');
      button.click();
      return true;
    }
  }
  
  console.log('❌ "Show all results..." button not found');
  return false;
};

console.log('✅ Show-all-results button fix applied!');
console.log('💡 Test with: testButtonFix()');
console.log('💡 Or just click "Show all results..." normally');
