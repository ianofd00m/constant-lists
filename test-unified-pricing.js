// Unified Pricing Test Suite
// This script tests the unified pricing system across all areas of the application

console.log('🧪 === UNIFIED PRICING TEST SUITE ===\n');

// Test cases covering different card types and scenarios
const testCases = [
  {
    name: 'Regular non-foil card',
    cardData: {
      name: 'Lightning Bolt',
      scryfall_json: {
        prices: { usd: '0.15', usd_foil: '0.50' },
        finishes: ['nonfoil', 'foil'],
        foil: true,
        nonfoil: true
      },
      foil: false
    },
    expected: { price: '0.15', type: 'normal' }
  },
  {
    name: 'Regular foil card',
    cardData: {
      name: 'Lightning Bolt',
      scryfall_json: {
        prices: { usd: '0.15', usd_foil: '0.50' },
        finishes: ['nonfoil', 'foil'],
        foil: true,
        nonfoil: true
      },
      foil: true
    },
    expected: { price: '0.50', type: 'foil' }
  },
  {
    name: 'Foil-only card',
    cardData: {
      name: 'Etched Champion',
      scryfall_json: {
        prices: { usd: null, usd_foil: '2.00' },
        finishes: ['foil'],
        foil: true,
        nonfoil: false
      },
      foil: false // Even though foil=false, should use foil price because it's foil-only
    },
    expected: { price: '2.00', type: 'foil' }
  },
  {
    name: 'Etched foil card',
    cardData: {
      name: 'Etched Planeswalker',
      scryfall_json: {
        prices: { usd: '5.00', usd_foil: '8.00', usd_etched: '12.00' },
        finishes: ['nonfoil', 'foil', 'etched'],
        frame_effects: ['etched']
      },
      foil: true
    },
    expected: { price: '12.00', type: 'etched' }
  },
  {
    name: 'Basic land without price',
    cardData: {
      name: 'Forest',
      scryfall_json: {
        prices: { usd: null },
        type_line: 'Basic Land — Forest'
      },
      foil: false
    },
    expected: { price: '0.10', type: 'normal' }
  },
  {
    name: 'Card with stored modalPrice',
    cardData: {
      name: 'Expensive Card',
      modalPrice: '25.99',
      scryfall_json: {
        prices: { usd: '20.00' }
      },
      foil: false
    },
    expected: { price: '25.99', type: 'normal' }
  },
  {
    name: 'Card with nested structure',
    cardData: {
      card: {
        name: 'Nested Card',
        scryfall_json: {
          prices: { usd: '3.50' }
        }
      },
      cardObj: {
        foil: true
      }
    },
    expected: { price: '3.50', type: 'normal' } // Complex nested cases
  }
];

// Function to run all tests
function runUnifiedPricingTests() {
  console.log('🚀 Starting unified pricing tests...\n');
  
  // Test if getUnifiedCardPrice is available
  if (typeof window.getUnifiedCardPrice === 'undefined') {
    console.error('❌ getUnifiedCardPrice not available. Make sure UnifiedPricing.js is loaded.');
    return;
  }
  
  const getUnifiedCardPrice = window.getUnifiedCardPrice;
  const formatPrice = window.formatPrice;
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  testCases.forEach((testCase, index) => {
    console.log(`\n🧪 Test ${index + 1}: ${testCase.name}`);
    console.log('Input:', testCase.cardData);
    
    try {
      const result = getUnifiedCardPrice(testCase.cardData, { debugLogging: true });
      
      console.log('Result:', {
        price: result.price,
        cardType: result.cardType,
        source: result.source,
        isValid: result.isValid
      });
      
      // Check if price matches expected
      const priceMatches = result.price === testCase.expected.price;
      const typeMatches = result.cardType === testCase.expected.type;
      
      if (priceMatches && typeMatches) {
        console.log('✅ PASSED');
        passedTests++;
      } else {
        console.log('❌ FAILED');
        console.log(`Expected: price=${testCase.expected.price}, type=${testCase.expected.type}`);
        console.log(`Got: price=${result.price}, type=${result.cardType}`);
      }
      
      // Test formatting
      const formatted = formatPrice(result.price);
      console.log(`Formatted price: ${formatted}`);
      
    } catch (error) {
      console.log('❌ FAILED with error:', error.message);
    }
  });
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the unified pricing logic.');
  }
}

// Test consistency across different areas
function testPricingConsistency() {
  console.log('\n🔄 === PRICING CONSISTENCY TESTS ===\n');
  
  // Test the same card data through different functions
  const testCard = {
    name: 'Consistency Test Card',
    scryfall_json: {
      prices: { usd: '1.50', usd_foil: '3.00' },
      finishes: ['nonfoil', 'foil']
    },
    foil: true
  };
  
  console.log('Testing consistency across different pricing functions...');
  
  // Test unified pricing
  if (typeof window.getUnifiedCardPrice !== 'undefined') {
    const unifiedResult = window.getUnifiedCardPrice(testCard);
    console.log('Unified pricing result:', {
      price: unifiedResult.price,
      source: unifiedResult.source,
      cardType: unifiedResult.cardType
    });
  }
  
  // Test legacy extractPrice (if available)
  if (typeof window.extractPrice !== 'undefined') {
    const legacyResult = window.extractPrice(testCard);
    console.log('Legacy extractPrice result:', {
      price: legacyResult.price,
      source: legacyResult.source,
      cardType: legacyResult.cardType
    });
  }
  
  // Test modal getCurrentPrice logic
  console.log('\n📋 To test modal consistency:');
  console.log('1. Open a card modal');
  console.log('2. Toggle foil status');
  console.log('3. Check that prices update consistently');
  console.log('4. Switch between different printings');
  console.log('5. Verify prices match between modal and deck display');
}

// Test foil/non-foil switching
function testFoilConsistency(cardName = 'Lightning Bolt') {
  console.log(`\n⚡ === FOIL CONSISTENCY TEST: ${cardName} ===\n`);
  
  if (typeof window.getUnifiedCardPrice === 'undefined') {
    console.log('❌ getUnifiedCardPrice not available');
    return;
  }
  
  const mockCard = {
    name: cardName,
    scryfall_json: {
      prices: { usd: '0.15', usd_foil: '0.50' },
      finishes: ['nonfoil', 'foil'],
      foil: true,
      nonfoil: true
    }
  };
  
  // Test non-foil
  const nonFoilCard = { ...mockCard, foil: false };
  const nonFoilResult = window.getUnifiedCardPrice(nonFoilCard);
  
  // Test foil
  const foilCard = { ...mockCard, foil: true };
  const foilResult = window.getUnifiedCardPrice(foilCard);
  
  console.log('Non-foil pricing:', {
    price: nonFoilResult.price,
    cardType: nonFoilResult.cardType,
    formatted: window.formatPrice ? window.formatPrice(nonFoilResult.price) : nonFoilResult.price
  });
  
  console.log('Foil pricing:', {
    price: foilResult.price,
    cardType: foilResult.cardType,
    formatted: window.formatPrice ? window.formatPrice(foilResult.price) : foilResult.price
  });
  
  // Verify they're different
  if (nonFoilResult.price !== foilResult.price) {
    console.log('✅ Foil and non-foil pricing are correctly different');
  } else {
    console.log('⚠️  Foil and non-foil pricing are the same - this may indicate an issue');
  }
}

// Manual testing guide
function printManualTestingGuide() {
  console.log('\n📋 === MANUAL TESTING GUIDE ===\n');
  
  console.log('🎯 Areas to test for pricing consistency:');
  console.log('');
  console.log('1. MAIN DECK DISPLAY:');
  console.log('   - Check prices shown next to card names');
  console.log('   - Verify foil vs non-foil prices are different');
  console.log('   - Check total deck value calculation');
  console.log('');
  console.log('2. SIDEBOARD DISPLAY:');
  console.log('   - Check sideboard card prices');
  console.log('   - Verify consistency with main deck pricing');
  console.log('');
  console.log('3. TECH IDEAS DISPLAY:');
  console.log('   - Check tech ideas card prices');
  console.log('   - Verify pricing after moving cards to/from tech ideas');
  console.log('');
  console.log('4. CARD ACTIONS MODAL:');
  console.log('   - Open any card modal');
  console.log('   - Check price in card information section');
  console.log('   - Toggle foil status and verify price changes');
  console.log('   - Switch between different printings');
  console.log('   - Verify printings list shows correct prices');
  console.log('');
  console.log('5. BULK OPERATIONS:');
  console.log('   - Select multiple cards and move between zones');
  console.log('   - Verify prices remain consistent after moves');
  console.log('   - Test quantity changes via modal');
  console.log('');
  console.log('🔍 What to look for:');
  console.log('   ✅ Prices are consistent across all areas');
  console.log('   ✅ Foil cards show higher prices than non-foil');
  console.log('   ✅ Basic lands show $0.10 when no price available');
  console.log('   ✅ Modal price updates immediately reflect in deck');
  console.log('   ✅ All prices are formatted as $X.XX');
  console.log('   ❌ No "N/A" prices except for cards without any pricing data');
  console.log('   ❌ No inconsistent prices between modal and deck display');
  console.log('   ❌ No pricing corruption during bulk operations');
}

// Export functions for manual use
window.runUnifiedPricingTests = runUnifiedPricingTests;
window.testPricingConsistency = testPricingConsistency;
window.testFoilConsistency = testFoilConsistency;
window.printManualTestingGuide = printManualTestingGuide;

// Auto-run basic tests
console.log('🎮 AVAILABLE TEST FUNCTIONS:');
console.log('- runUnifiedPricingTests() - Run automated test suite');
console.log('- testPricingConsistency() - Test consistency across functions');
console.log('- testFoilConsistency("Card Name") - Test foil vs non-foil pricing');
console.log('- printManualTestingGuide() - Show manual testing instructions');

console.log('\n🚀 Running basic tests automatically...');
printManualTestingGuide();
