// Debug script to test quantity update persistence
// Run this in the browser console while on the deck edit page

function debugQuantityPersistence() {
  console.log('=== QUANTITY PERSISTENCE DEBUG ===');
  
  // Check current deck state
  const currentCards = window.testGetCards ? window.testGetCards() : 'testGetCards not available';
  console.log('Current cards from testGetCards:', currentCards);
  
  // Look for Islands specifically
  if (Array.isArray(currentCards)) {
    const islands = currentCards.filter(card => {
      const name = card.card?.name || card.name;
      return name === 'Island';
    });
    
    console.log('Found Islands:', islands.map(island => ({
      name: island.card?.name || island.name,
      count: island.count,
      quantity: island.quantity,
      foil: island.foil || island.card?.foil
    })));
  }
  
  // Check if we have access to handleUpdateCard for testing
  console.log('Available test functions:', Object.keys(window).filter(key => key.startsWith('test')));
  
  // Check localStorage for any persistence issues
  console.log('Auth token exists:', !!localStorage.getItem('token'));
  console.log('User preferences:', localStorage.getItem('BASIC_LAND_PRINTINGS'));
  
  return {
    currentCards,
    authToken: !!localStorage.getItem('token'),
    testFunctions: Object.keys(window).filter(key => key.startsWith('test'))
  };
}

// Make it available globally for browser console
window.debugQuantityPersistence = debugQuantityPersistence;

console.log('Debug function loaded. Run debugQuantityPersistence() in browser console.');