// Debug script to investigate the pricing issues in collection table
// This will help us understand what data structure is causing the problem

console.log('🔍 === COLLECTION PRICING DEBUG ===\n');

// Test the unified pricing system directly
import { getUnifiedCardPrice, formatPrice } from './src/utils/UnifiedPricing.js';

// Create test collection items with different data structures
const testCollectionItems = [
  // Case 1: Complete Scryfall data
  {
    id: 'test1',
    name: 'Lightning Bolt',
    set: 'lea',
    collector_number: '161',
    foil: false,
    scryfall_json: {
      name: 'Lightning Bolt',
      set: 'lea',
      collector_number: '161',
      prices: {
        usd: '15.99',
        usd_foil: '45.00'
      }
    }
  },
  
  // Case 2: Missing scryfall_json (common issue)
  {
    id: 'test2',
    name: 'Sol Ring',
    set: 'c14',
    collector_number: '270',
    foil: false,
    // No scryfall_json
  },
  
  // Case 3: Empty scryfall_json
  {
    id: 'test3',
    name: 'Forest',
    set: 'unb',
    collector_number: '267',
    foil: false,
    scryfall_json: {}
  },
  
  // Case 4: Foil card with pricing
  {
    id: 'test4',
    name: 'Mox Diamond',
    set: 'tpr',
    collector_number: '228',
    foil: true,
    scryfall_json: {
      name: 'Mox Diamond',
      prices: {
        usd: '450.00',
        usd_foil: '850.00'
      }
    }
  }
];

console.log('Testing different collection item structures:\n');

testCollectionItems.forEach((item, index) => {
  console.log(`\n📋 Test Case ${index + 1}: ${item.name}`);
  console.log('Input data:', JSON.stringify(item, null, 2));
  
  try {
    const result = getUnifiedCardPrice(item, {
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
    
    const formatted = formatPrice(result.price);
    console.log(`Formatted: ${formatted}`);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('-'.repeat(50));
});

// Test the specific issue - empty scryfall_json with no price data
console.log('\n🚨 Testing the specific "no price data" case:');
const problematicItem = {
  name: 'Mystery Card',
  set: 'unk',
  foil: false,
  scryfall_json: {}, // Empty object - this might be the issue
};

const problemResult = getUnifiedCardPrice(problematicItem, {
  preferStoredPrice: false,
  fallbackPrice: null,
  debugLogging: true
});

console.log('Problematic result:', problemResult);