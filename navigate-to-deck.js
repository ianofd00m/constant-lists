// Navigate to deck page
console.clear();
console.log('🧭 NAVIGATING TO DECK PAGE');
console.log('=' .repeat(40));

// You're currently on Build page, need to go to a deck
console.log('Current page: Build page');
console.log('Need to navigate to: Deck view page');

// Navigate to the deck URL we used before
const deckUrl = 'http://localhost:5173/decks/685ce3457ee3d3135a9bdd02';
console.log('Navigating to:', deckUrl);

// Navigate in 2 seconds
setTimeout(() => {
  console.log('Navigation in progress...');
  window.location.href = deckUrl;
}, 2000);

console.log('Navigating in 2 seconds...');
