// Debug script to check Sphere Grid pricing in tech ideas
console.log('=== Debugging Sphere Grid Pricing ===\n');

// This script will help us understand why Sphere Grid shows $31.92
// Run this in the browser console while on the deck edit page

function debugCardPricing(cardName = 'Sphere Grid') {
  console.log(`🔍 Debugging pricing for: ${cardName}`);
  
  // Check if we're on the deck edit page
  const deckViewEditComponent = window.deckViewEditComponent;
  if (!deckViewEditComponent) {
    console.log('❌ DeckViewEdit component not found. Make sure you\'re on the deck edit page.');
    return;
  }
  
  const deck = deckViewEditComponent.state?.deck;
  if (!deck) {
    console.log('❌ Deck data not found.');
    return;
  }
  
  // Find the card in tech ideas
  const techCard = deck.techIdeas?.find(card => {
    const name = card.name || card.card?.name;
    return name && name.toLowerCase().includes(cardName.toLowerCase());
  });
  
  if (!techCard) {
    console.log(`❌ ${cardName} not found in tech ideas`);
    console.log('Available tech ideas cards:', deck.techIdeas?.map(c => c.name || c.card?.name));
    return;
  }
  
  console.log(`✅ Found ${cardName} in tech ideas:`, techCard);
  
  // Deep analysis of the card data structure
  console.log('\n📊 COMPLETE CARD DATA ANALYSIS:');
  console.log('Card structure:', JSON.stringify(techCard, null, 2));
  
  // Check all possible price sources
  console.log('\n💰 PRICE SOURCE ANALYSIS:');
  
  const priceChecks = [
    { path: 'modalPrice', value: techCard.modalPrice },
    { path: 'card.modalPrice', value: techCard.card?.modalPrice },
    { path: 'cardObj.modalPrice', value: techCard.cardObj?.modalPrice },
    { path: 'scryfall_json.prices.usd', value: techCard.scryfall_json?.prices?.usd },
    { path: 'card.scryfall_json.prices.usd', value: techCard.card?.scryfall_json?.prices?.usd },
    { path: 'cardObj.scryfall_json.prices.usd', value: techCard.cardObj?.scryfall_json?.prices?.usd },
    { path: 'prices.usd', value: techCard.prices?.usd },
    { path: 'price', value: techCard.price },
    { path: 'usd', value: techCard.usd }
  ];
  
  priceChecks.forEach(check => {
    if (check.value !== undefined && check.value !== null) {
      console.log(`  ${check.path}: ${check.value} ${check.value === '31.92' || check.value === '$31.92' ? '🚨 FOUND THE PROBLEMATIC PRICE!' : ''}`);
    }
  });
  
  // Search for the problematic $31.92 price recursively
  console.log('\n🕵️ SEARCHING FOR $31.92 RECURSIVELY:');
  
  function findPriceRecursively(obj, path = '', depth = 0) {
    if (depth > 10) return;
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string' || typeof value === 'number') {
        const strValue = String(value);
        if (strValue === '31.92' || strValue === '$31.92' || strValue === 31.92) {
          console.log(`  🚨 FOUND $31.92 at: ${currentPath} = ${value}`);
        }
      } else if (value && typeof value === 'object') {
        findPriceRecursively(value, currentPath, depth + 1);
      }
    }
  }
  
  findPriceRecursively(techCard);
  
  // Test the extractPrice function
  console.log('\n🧮 EXTRACT PRICE FUNCTION TEST:');
  if (window.extractPrice && typeof window.extractPrice === 'function') {
    const result = window.extractPrice(techCard);
    console.log('extractPrice result:', result);
  } else {
    console.log('extractPrice function not available globally');
  }
  
  return techCard;
}

// Also check current Scryfall price
async function checkCurrentScryfallPrice(cardName = 'Sphere Grid') {
  console.log(`\n🌐 Checking current Scryfall price for: ${cardName}`);
  
  try {
    const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`);
    const data = await response.json();
    
    if (data.prices) {
      console.log('Current Scryfall prices:');
      console.log(`  USD: $${data.prices.usd || 'N/A'}`);
      console.log(`  USD Foil: $${data.prices.usd_foil || 'N/A'}`);
      console.log(`  USD Etched: $${data.prices.usd_etched || 'N/A'}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching Scryfall data:', error);
  }
}

// Run the debug functions
debugCardPricing();
checkCurrentScryfallPrice();

// Export for manual use
window.debugCardPricing = debugCardPricing;
window.checkCurrentScryfallPrice = checkCurrentScryfallPrice;
