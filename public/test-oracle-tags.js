// Oracle Tags Test Script
// Run this in the browser console to test oracle tags functionality

const testOracleTags = () => {
  console.log('🧪 Testing Oracle Tags Integration...');
  
  // Test CSV data loading
  fetch('/scryfall-COMPLETE-oracle-tags-2025-08-08.csv')
    .then(response => {
      console.log('✅ CSV Response:', response.status, response.statusText);
      return response.text();
    })
    .then(csvText => {
      const lines = csvText.split('\n');
      console.log(`📊 CSV loaded: ${lines.length} lines`);
      
      // Parse first few lines to verify structure
      for (let i = 1; i <= 5 && i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const match = line.match(/^"([^"]+)","(.+)"$/);
          if (match) {
            const cardName = match[1];
            const tags = match[2].split('|');
            console.log(`🃏 ${cardName}: ${tags.length} tags`);
            console.log(`   First 5 tags: ${tags.slice(0, 5).join(', ')}`);
          }
        }
      }
      
      // Test oracle tag search
      console.log('🔍 Testing oracle tag search...');
      const testTag = 'removal';
      const searchQuery = `oracletag:${testTag}`;
      console.log(`   Search query: ${searchQuery}`);
      
      return fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchQuery)}&page=1`);
    })
    .then(response => {
      console.log('✅ Search Response:', response.status, response.statusText);
      return response.json();
    })
    .then(data => {
      console.log(`🎯 Search Results: ${data.total_cards} cards found`);
      if (data.data && data.data.length > 0) {
        console.log(`   First 3 cards: ${data.data.slice(0, 3).map(c => c.name).join(', ')}`);
      }
      console.log('✅ Oracle Tags Integration Test Complete!');
    })
    .catch(error => {
      console.error('❌ Test Error:', error);
    });
};

// Export to window so it can be called from console
window.testOracleTags = testOracleTags;

console.log('🏷️ Oracle Tags Test Script Loaded');
console.log('💡 Run testOracleTags() to test the integration');
