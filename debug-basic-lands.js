// Test basic land pricing specifically
import { getUnifiedCardPrice, formatPrice } from './src/utils/UnifiedPricing.js';

console.log('🌲 === BASIC LAND PRICING TEST ===\n');

// Test basic lands which should get $0.10 fallback
const basicLands = [
  {
    name: 'Forest',
    scryfall_json: { 
      type_line: 'Basic Land — Forest',
      prices: {} // Empty prices
    },
    foil: false
  },
  {
    name: 'Island',
    scryfall_json: { 
      type_line: 'Basic Land — Island',
      // No prices at all
    },
    foil: false
  },
  {
    name: 'Mountain',
    // No scryfall_json at all, should still work via name lookup
    foil: false
  }
];

basicLands.forEach((land, index) => {
  console.log(`\n🏝️ Test ${index + 1}: ${land.name}`);
  console.log('Input:', JSON.stringify(land, null, 2));
  
  const result = getUnifiedCardPrice(land, {
    preferStoredPrice: false,
    fallbackPrice: null,
    debugLogging: true
  });
  
  console.log('Result:', {
    price: result.price,
    source: result.source,
    isValid: result.isValid
  });
  console.log('Formatted:', formatPrice(result.price));
  console.log('-'.repeat(40));
});