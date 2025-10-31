// Test the complete fallback system
import { getUnifiedCardPrice, formatPrice } from './src/utils/UnifiedPricing.js';

console.log('🎯 === COMPLETE FALLBACK SYSTEM TEST ===\n');

// Test different types of cards without pricing data
const testCards = [
  {
    name: 'Sol Ring',
    set: 'c14',
    foil: false,
    // No scryfall_json at all - should get generic fallback
  },
  {
    name: 'Lightning Bolt',
    scryfall_json: {
      type_line: 'Instant',
      // No prices
    },
    foil: false,
    // Should get generic fallback
  },
  {
    name: 'Soldier Token',
    scryfall_json: {
      type_line: 'Token Creature — Soldier',
      // No prices
    },
    foil: false,
    // Should get token fallback ($0.00)
  },
  {
    name: 'Forest',
    scryfall_json: {
      type_line: 'Basic Land — Forest',
      // No prices
    },
    foil: false,
    // Should get basic land fallback ($0.10)
  }
];

testCards.forEach((card, index) => {
  console.log(`\n🃏 Test ${index + 1}: ${card.name}`);
  console.log('Input:', JSON.stringify(card, null, 2));
  
  const result = getUnifiedCardPrice(card, {
    preferStoredPrice: false,
    fallbackPrice: null,
    debugLogging: true
  });
  
  console.log('Result:', {
    price: result.price,
    source: result.source,
    isValid: result.isValid,
    cardType: result.cardType
  });
  console.log('Formatted:', formatPrice(result.price));
  console.log('-'.repeat(50));
});