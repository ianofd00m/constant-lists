// Fix for "Show all results" - Force backend to fetch all pages
console.log('🔧 Applying "Show all results" fix...');

// Enhanced fetchAllSearchResults function that ensures we get ALL results
function enhancedFetchAllResults() {
  // Find the DeckViewEdit component instance (this is a bit hacky but works)
  const searchInput = document.querySelector('input[type="text"]');
  if (!searchInput) {
    console.log('❌ Search input not found');
    return;
  }

  // Override the fetchAllSearchResults function if possible
  // This is a runtime patch to ensure we get all results
  
  window.originalFetchAllSearchResults = window.fetchAllSearchResults;
  
  window.fetchAllSearchResults = async function(query) {
    console.log('🚀 Enhanced fetchAllSearchResults called with query:', query);
    
    if (!query.trim()) return;
    
    // Show loading state
    console.log('📊 Fetching ALL search results...');
    
    try {
      // Get current deck context
      const currentUrl = window.location.href;
      let colorIdentity = '';
      let deckFormat = '';
      
      // Extract from URL or use defaults
      if (currentUrl.includes('/deck/')) {
        // You might need to adjust this based on your URL structure
        const urlParts = currentUrl.split('/');
        console.log('🔍 Current URL parts:', urlParts);
      }
      
      // Try to get from existing state if available
      if (window.deck) {
        deckFormat = window.deck.format || 'Commander / EDH';
        console.log('🎯 Found deck format:', deckFormat);
      }
      
      // For Commander decks, extract color identity
      if (window.getCommanderColorIdentity) {
        colorIdentity = window.getCommanderColorIdentity();
        console.log('🎯 Found color identity:', colorIdentity);
      }
      
      // Build the URL without ANY limit parameter
      let url = `/api/cards/search?q=${encodeURIComponent(query.trim())}`;
      if (colorIdentity) url += `&colorIdentity=${colorIdentity}`;
      if (deckFormat) url += `&deckFormat=${encodeURIComponent(deckFormat)}`;
      
      // Add a special parameter to force fetching all pages
      url += '&fetchAll=true';
      
      // Check if we're in development mode by looking at the hostname
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const finalUrl = url; // For dev mode, use relative URLs
      
      console.log('🔗 Enhanced URL:', finalUrl);
      
      const response = await fetch(finalUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const results = data.data || data || [];
      
      console.log('📦 Enhanced search results:', {
        totalFromAPI: data.total_cards,
        returnedCount: results.length,
        hasMore: data.has_more,
        firstFew: results.slice(0, 3).map(card => card.name)
      });
      
      // If we still don't have all results and there are more pages, try direct Scryfall
      if (data.has_more && results.length < (data.total_cards || 100)) {
        console.log('⚠️ Backend didn\'t fetch all pages, trying direct approach...');
        
        // Try fetching directly from Scryfall with pagination
        const allResults = await fetchAllFromScryfall(query, colorIdentity);
        if (allResults.length > results.length) {
          console.log(`✅ Got more results from direct fetch: ${allResults.length} vs ${results.length}`);
          return allResults;
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Enhanced search error:', error);
      return [];
    }
  };
  
  // Direct Scryfall fetch function
  async function fetchAllFromScryfall(query, colorIdentity) {
    console.log('🌐 Fetching directly from Scryfall...');
    
    let scryfallQuery = query.includes('game:') ? query : `${query} game:paper`;
    if (colorIdentity) scryfallQuery += ` id:${colorIdentity}`;
    
    const allResults = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore && page <= 20) { // Max 20 pages = 3500 cards
      try {
        const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(scryfallQuery)}&page=${page}`;
        console.log(`🔍 Fetching Scryfall page ${page}...`);
        
        const response = await fetch(url);
        if (!response.ok) {
          if (response.status === 404) {
            console.log('📭 No more results');
            break;
          }
          throw new Error(`Scryfall error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
          allResults.push(...data.data);
          hasMore = data.has_more;
          page++;
          console.log(`📦 Page ${page - 1}: ${data.data.length} cards (total: ${allResults.length})`);
          
          // Small delay to be nice to Scryfall
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          break;
        }
      } catch (error) {
        console.error(`❌ Error fetching page ${page}:`, error);
        break;
      }
    }
    
    console.log(`✅ Direct Scryfall fetch complete: ${allResults.length} total cards`);
    return allResults;
  }
  
  console.log('✅ Enhanced fetchAllSearchResults installed');
  return true;
}

// Apply the enhancement
enhancedFetchAllResults();

// Test function
window.testEnhancedSearch = async function(query = 'fight') {
  console.log(`🧪 Testing enhanced search with: "${query}"`);
  
  if (window.fetchAllSearchResults) {
    const results = await window.fetchAllSearchResults(query);
    console.log('🎯 Test results:', {
      count: results.length,
      names: results.slice(0, 10).map(card => card.name)
    });
    return results;
  } else {
    console.log('❌ fetchAllSearchResults not available');
  }
};

console.log('🔧 "Show all results" fix applied');
console.log('💡 Test with: testEnhancedSearch("fight")');
console.log('💡 Or try clicking "Show all results..." in the UI');
