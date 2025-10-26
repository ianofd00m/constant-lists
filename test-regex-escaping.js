#!/usr/bin/env node

// Test regex escaping for dual face card names
function escapeRegexChars(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function testCardNameRegex(cardName) {
  console.log(`\nTesting: "${cardName}"`);
  
  // Old approach (broken for // characters)
  const oldRegex = new RegExp(`^${cardName.trim()}$`, 'i');
  console.log('  Old regex:', oldRegex.toString());
  
  // New approach (with escaping)
  const escapedName = escapeRegexChars(cardName.trim());
  const newRegex = new RegExp(`^${escapedName}$`, 'i');
  console.log('  New regex:', newRegex.toString());
  
  // Test matching
  const testNames = [
    cardName,
    cardName.toLowerCase(),
    cardName.toUpperCase(),
    'Miles Morales',  // Should NOT match
    'Ultimate Spider-Man',  // Should NOT match
    'Different Card // Another Name'  // Should NOT match
  ];
  
  console.log('  Old regex matches:');
  testNames.forEach(name => {
    const matches = oldRegex.test(name);
    console.log(`    "${name}": ${matches}`);
  });
  
  console.log('  New regex matches:');
  testNames.forEach(name => {
    const matches = newRegex.test(name);
    console.log(`    "${name}": ${matches}`);
  });
}

// Test cases
console.log('=== Testing regex escaping for dual face card names ===');
testCardNameRegex('Miles Morales // Ultimate Spider-Man');
testCardNameRegex('Delver of Secrets // Insectile Aberration');
testCardNameRegex('Regular Card Name');

console.log('\n=== Test completed ===');
