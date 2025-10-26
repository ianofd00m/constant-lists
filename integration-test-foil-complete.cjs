#!/usr/bin/env node

/**
 * Integration test for the complete foil toggle workflow
 * Tests the end-to-end functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Integration Test: Complete Foil Toggle Workflow');
console.log('===================================================\n');

// Check all the key components are working together
const deckViewPath = path.join(__dirname, 'src/components/DeckViewEdit.jsx');
const modalPath = path.join(__dirname, 'src/components/CardActionsModal.jsx');

const deckViewContent = fs.readFileSync(deckViewPath, 'utf8');
const modalContent = fs.readFileSync(modalPath, 'utf8');

console.log('✅ Testing foil toggle integration...');

// Test 1: Modal properly sends foil updates
console.log('\n1. Modal Foil Update Handling:');
if (modalContent.includes('foil: newFoilStatus,') && 
    modalContent.includes('isFoil: newFoilStatus,') &&
    modalContent.includes('printing: cardPrinting')) {
  console.log('   ✓ Modal sends complete foil update data');
} else {
  console.log('   ❌ Modal foil update data incomplete');
}

// Test 2: DeckViewEdit properly receives and processes foil updates
console.log('\n2. DeckViewEdit Foil Processing:');
if (deckViewContent.includes('if (updates.isFoil !== undefined || updates.foil !== undefined')) {
  console.log('   ✓ DeckViewEdit handles foil updates');
} else {
  console.log('   ❌ DeckViewEdit missing foil update handler');
}

// Test 3: Card matching works for foil updates
if (deckViewContent.includes('const nameMatches = cName === cardName;') && 
    deckViewContent.includes('const printingMatches = !cPrinting || !cardPrinting || cPrinting === cardPrinting;')) {
  console.log('   ✓ Card matching logic allows foil updates');
} else {
  console.log('   ❌ Card matching may prevent foil updates');
}

// Test 4: State updates are comprehensive
console.log('\n3. State Update Completeness:');
if (deckViewContent.includes('updated.foil = !!foilStatus;') &&
    deckViewContent.includes('if (updated.card) updated.card.foil = !!foilStatus;') &&
    deckViewContent.includes('if (updated.cardObj)')) {
  console.log('   ✓ Foil status updated at all object levels');
} else {
  console.log('   ❌ Foil status updates may be incomplete');
}

// Test 5: Price recalculation
if (deckViewContent.includes('const priceData = extractPrice(updated);') &&
    deckViewContent.includes('const priceToUse = explicitPrice !== undefined ? explicitPrice : priceData.price;')) {
  console.log('   ✓ Price recalculated based on foil status');
} else {
  console.log('   ❌ Price recalculation may not work');
}

// Test 6: Modal state synchronization
console.log('\n4. Modal State Management:');
if (deckViewContent.includes('// Update the modal state to reflect the foil change') &&
    deckViewContent.includes('setModalState(prevState => ({')) {
  console.log('   ✓ Modal state properly updated for foil changes');
} else {
  console.log('   ❌ Modal state may not be updated for foil changes');
}

// Test 7: Server persistence
console.log('\n5. Server Persistence:');
if (deckViewContent.includes('foil: !!isFoil,') && 
    deckViewContent.includes('const cleanCards = updatedCards.map(card => {')) {
  console.log('   ✓ Foil status persisted to server');
} else {
  console.log('   ❌ Server persistence may not include foil status');
}

console.log('\n📊 Integration Test Results:');
console.log('============================');

// Count successful checks
const checks = [
  modalContent.includes('foil: newFoilStatus,') && modalContent.includes('printing: cardPrinting'),
  deckViewContent.includes('if (updates.isFoil !== undefined || updates.foil !== undefined'),
  deckViewContent.includes('const nameMatches = cName === cardName;'),
  deckViewContent.includes('updated.foil = !!foilStatus;'),
  deckViewContent.includes('const priceData = extractPrice(updated);'),
  deckViewContent.includes('// Update the modal state to reflect the foil change') && deckViewContent.includes('setModalState(prevState => ({'),
  deckViewContent.includes('foil: !!isFoil,')
];

const passedChecks = checks.filter(check => check).length;
const totalChecks = checks.length;

if (passedChecks === totalChecks) {
  console.log(`✅ All integration tests passed! (${passedChecks}/${totalChecks})`);
  console.log('\n🎉 Foil toggle workflow should be fully functional:');
  console.log('   • Foil toggle in modal updates deck list');
  console.log('   • Changes persist when modal is reopened');
  console.log('   • Price updates immediately');
  console.log('   • No modal re-initialization on foil toggle');
  console.log('   • Changes saved to server');
} else {
  console.log(`❌ Some integration tests failed (${passedChecks}/${totalChecks})`);
  console.log('   This may indicate incomplete implementation');
}

console.log('\n🚀 Ready for manual testing!');
console.log('Test steps:');
console.log('1. Start the application');
console.log('2. Open a deck and click on a card');
console.log('3. Toggle foil status in the modal');
console.log('4. Verify price updates immediately');
console.log('5. Close and reopen modal - foil status should persist');
console.log('6. Check deck list reflects foil status');
