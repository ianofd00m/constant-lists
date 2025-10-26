// Quick test for double-faced card logic in text view
console.log('🧪 Testing double-faced card improvements...');

// Mock double-faced card structure
const mockDoubleFacedCard = {
  id: 'test-dfc',
  name: 'Delver of Secrets // Insectile Aberration',
  layout: 'transform',
  card_faces: [
    {
      name: 'Delver of Secrets',
      mana_cost: '{U}',
      type_line: 'Creature — Human Wizard',
      cmc: 1,
      image_uris: {
        normal: 'https://example.com/front.jpg'
      }
    },
    {
      name: 'Insectile Aberration',
      mana_cost: '',
      type_line: 'Creature — Human Insect',
      cmc: 1,
      image_uris: {
        normal: 'https://example.com/back.jpg'
      }
    }
  ]
};

// Mock regular card for comparison
const mockRegularCard = {
  id: 'test-regular',
  name: 'Lightning Bolt',
  mana_cost: '{R}',
  type_line: 'Instant',
  cmc: 1,
  image_uris: {
    normal: 'https://example.com/bolt.jpg'
  }
};

// Test isDoubleFacedCard function logic
function testIsDoubleFacedCard(card) {
  const cardFaces = card.card_faces;
  const layout = card.layout;
  
  const isTransformCard = layout === 'transform' || 
                         layout === 'modal_dfc' || 
                         layout === 'reversible_card';
                         
  return (cardFaces && Array.isArray(cardFaces) && cardFaces.length >= 2) || isTransformCard;
}

console.log('✅ Double-faced card detection:');
console.log(`  Regular card: ${testIsDoubleFacedCard(mockRegularCard)} (should be false)`);
console.log(`  DFC card: ${testIsDoubleFacedCard(mockDoubleFacedCard)} (should be true)`);

// Test mana cost extraction
function testManaCostExtraction(card) {
  const isDoubleFaced = testIsDoubleFacedCard(card);
  let manaCost;
  
  if (isDoubleFaced && card.card_faces?.[0]) {
    manaCost = card.card_faces[0].mana_cost || '';
  } else {
    manaCost = card.mana_cost || '';
  }
  
  return manaCost;
}

console.log('✅ Mana cost extraction:');
console.log(`  Regular card: "${testManaCostExtraction(mockRegularCard)}" (should be "{R}")`);
console.log(`  DFC card: "${testManaCostExtraction(mockDoubleFacedCard)}" (should be "{U}")`);

// Test type line extraction
function testTypeLineExtraction(card) {
  const isDoubleFaced = testIsDoubleFacedCard(card);
  let typeLineToUse;
  
  if (isDoubleFaced && card.card_faces?.[0]) {
    typeLineToUse = card.card_faces[0].type_line || card.type_line;
  } else {
    typeLineToUse = card.type_line;
  }
  
  return typeLineToUse;
}

console.log('✅ Type line extraction:');
console.log(`  Regular card: "${testTypeLineExtraction(mockRegularCard)}" (should be "Instant")`);
console.log(`  DFC card: "${testTypeLineExtraction(mockDoubleFacedCard)}" (should be "Creature — Human Wizard")`);

console.log('🎉 All double-faced card logic tests completed!');
