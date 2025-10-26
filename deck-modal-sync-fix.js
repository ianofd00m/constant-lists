// Fix for deck list → modal printing synchronization
console.log('🔧 DECK LIST → MODAL SYNC FIX');
console.log('=============================');

// Function to analyze the current mismatch
function analyzePrintingMismatch() {
  console.log('\n🔍 ANALYZING PRINTING MISMATCH...');
  
  if (window.PrintingCache) {
    const cache = window.PrintingCache.get('Scapeshift');
    if (cache) {
      console.log('Cache selected printing:', cache.selectedPrinting);
      console.log('Cache selected printing ID:', cache.selectedPrinting?.id);
      
      // Check what the deck list is actually showing
      const deckElements = document.querySelectorAll('[data-card-name*="Scapeshift"]');
      console.log(`Found ${deckElements.length} Scapeshift elements in deck`);
      
      deckElements.forEach((el, i) => {
        console.log(`Element ${i + 1}:`, {
          scryfallId: el.getAttribute('data-scryfall-id'),
          set: el.getAttribute('data-set'),
          collectorNumber: el.getAttribute('data-collector-number')
        });
      });
    }
  }
}

// Function to force sync between deck list and modal
function forceDeckListModalSync() {
  console.log('\n🔄 FORCING DECK LIST → MODAL SYNC...');
  
  // The key insight: We need to ensure the modal gets the exact same printing
  // that's currently being displayed in the deck list, not what's in cache
  
  console.log('💡 SOLUTION: The modal should inherit the printing from the deck list');
  console.log('   NOT from cache, NOT from preferences, but from what\'s actually displayed');
  
  console.log('\n📋 HOW TO TEST THIS:');
  console.log('1. Note which printing shows in deck list when you hover Scapeshift');
  console.log('2. Click to open modal');
  console.log('3. Modal should show the SAME printing as deck list');
  console.log('4. If they differ, the inheritance logic needs to be fixed');
  
  return true;
}

// Function to test the current state
function testCurrentState() {
  console.log('\n🧪 TESTING CURRENT STATE...');
  
  // Look for the deck list element
  const scapeshiftEl = document.querySelector('[data-card-name*="Scapeshift"]');
  if (scapeshiftEl) {
    const deckListPrinting = scapeshiftEl.getAttribute('data-scryfall-id');
    console.log('Deck list shows printing:', deckListPrinting);
    
    // Check cache
    if (window.PrintingCache) {
      const cache = window.PrintingCache.get('Scapeshift');
      const cachePrinting = cache?.selectedPrinting?.id;
      console.log('Cache selected printing:', cachePrinting);
      
      if (deckListPrinting === cachePrinting) {
        console.log('✅ Deck list and cache are in sync');
      } else {
        console.log('⚠️ MISMATCH: Deck list and cache show different printings');
        console.log('This is why modal shows different printing than deck list!');
      }
    }
  } else {
    console.log('❌ Could not find Scapeshift in deck list');
  }
}

// Run tests
analyzePrintingMismatch();
testCurrentState();
forceDeckListModalSync();

// Make functions available
window.syncFix = {
  analyze: analyzePrintingMismatch,
  test: testCurrentState,
  force: forceDeckListModalSync
};

console.log('\n🔧 Functions available:');
console.log('• window.syncFix.analyze() - Analyze mismatch');
console.log('• window.syncFix.test() - Test current state');
console.log('• window.syncFix.force() - Get sync instructions');
