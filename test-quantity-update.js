// Quantity Update Test Script
// This script will help us debug the Island quantity persistence issue

function testQuantityUpdateFlow() {
  console.log('=== TESTING QUANTITY UPDATE FLOW ===');
  
  // Step 1: Get current cards
  let currentCards;
  try {
    currentCards = window.testGetCards();
    console.log('1. Current cards retrieved:', currentCards?.length || 'failed');
  } catch (e) {
    console.error('Failed to get current cards:', e);
    return;
  }
  
  // Step 2: Find an Island
  const island = currentCards.find(card => {
    const name = card.card?.name || card.name;
    return name === 'Island';
  });
  
  if (!island) {
    console.log('2. No Island found in deck');
    return;
  }
  
  console.log('2. Found Island:', {
    name: island.card?.name || island.name,
    currentCount: island.count,
    foil: island.foil || island.card?.foil,
    printing: island.printing || island.card?.printing
  });
  
  // Step 3: Test quantity increment
  const newQuantity = (island.count || 1) + 1;
  console.log(`3. Testing quantity increment from ${island.count} to ${newQuantity}`);
  
  // Step 4: Simulate the handleUpdateCard call
  try {
    // Check if we can access handleUpdateCard through any window properties
    const deckComponent = document.querySelector('[data-testid="deck-view-edit"]') || 
                          document.querySelector('.deck-view-edit') ||
                          document.querySelector('main');
    
    if (deckComponent && deckComponent._reactInternalFiber) {
      console.log('4. Found React component, attempting to access handleUpdateCard');
    } else {
      console.log('4. Cannot access React component directly');
    }
    
    // Alternative: Check if there's a global function we can use
    if (window.testUpdateCard) {
      console.log('5. Found testUpdateCard function, testing quantity update');
      window.testUpdateCard(island, { quantity: newQuantity });
    } else {
      console.log('5. testUpdateCard not available, creating manual test');
      
      // Manual simulation of the update logic
      console.log('Simulating handleUpdateCard logic:');
      console.log('- Card to update:', island.card?.name || island.name);
      console.log('- New quantity:', newQuantity);
      console.log('- Auth token available:', !!localStorage.getItem('token'));
      
      // Check if the server would receive the right data
      const cleanCard = {
        name: island.card?.name || island.name,
        count: newQuantity,
        quantity: newQuantity,
        printing: island.printing || null,
        isCommander: island.isCommander || false,
        foil: island.foil || false,
        set: island.set || island.card?.set,
        collector_number: island.collector_number || island.card?.collector_number
      };
      
      console.log('- Clean card data for server:', cleanCard);
    }
    
  } catch (e) {
    console.error('Error during quantity update test:', e);
  }
  
  return { island, newQuantity };
}

// Also create a function to check server persistence after a page refresh
function checkPersistenceAfterRefresh() {
  console.log('=== CHECKING PERSISTENCE AFTER REFRESH ===');
  
  const currentCards = window.testGetCards ? window.testGetCards() : null;
  if (!currentCards) {
    console.log('Cannot get cards after refresh');
    return;
  }
  
  const islands = currentCards.filter(card => {
    const name = card.card?.name || card.name;
    return name === 'Island';
  });
  
  console.log('Islands after refresh:', islands.map(island => ({
    name: island.card?.name || island.name,
    count: island.count,
    quantity: island.quantity,
    foil: island.foil || island.card?.foil
  })));
  
  return islands;
}

// Make functions available globally
window.testQuantityUpdateFlow = testQuantityUpdateFlow;
window.checkPersistenceAfterRefresh = checkPersistenceAfterRefresh;

console.log('Quantity test functions loaded:');
console.log('- Run testQuantityUpdateFlow() to test the update process');
console.log('- Run checkPersistenceAfterRefresh() after refreshing to check persistence');