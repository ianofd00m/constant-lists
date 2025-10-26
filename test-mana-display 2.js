// Test double-faced card mana cost display logic
console.log('🧪 Testing double-faced card mana cost display...');

// Mock double-faced card with different mana costs
const mockDoubleFacedCard = {
  id: 'test-dfc',
  name: 'Delver of Secrets // Insectile Aberration',
  layout: 'transform',
  card_faces: [
    {
      name: 'Delver of Secrets',
      mana_cost: '{U}',
      type_line: 'Creature — Human Wizard',
      cmc: 1
    },
    {
      name: 'Insectile Aberration',
      mana_cost: '',  // Transformed creatures typically have no mana cost
      type_line: 'Creature — Human Insect',
      cmc: 1
    }
  ]
};

// Mock double-faced card with mana costs on both sides
const mockModalDFC = {
  id: 'test-modal',
  name: 'Valakut Awakening // Valakut Stoneforge',
  layout: 'modal_dfc',
  card_faces: [
    {
      name: 'Valakut Awakening',
      mana_cost: '{2}{R}',
      type_line: 'Instant',
      cmc: 3
    },
    {
      name: 'Valakut Stoneforge',
      mana_cost: '',  // Lands typically have no mana cost
      type_line: 'Land',
      cmc: 0
    }
  ]
};

// Test isDoubleFacedCard logic
function testIsDoubleFacedCard(card) {
  const cardFaces = card.card_faces;
  const layout = card.layout;
  
  const isTransformCard = layout === 'transform' || 
                         layout === 'modal_dfc' || 
                         layout === 'reversible_card';
                         
  return (cardFaces && Array.isArray(cardFaces) && cardFaces.length >= 2) || isTransformCard;
}

// Test mana cost extraction
function testManaCostExtraction(card) {
  const isDoubleFaced = testIsDoubleFacedCard(card);
  let frontManaCost, backManaCost;
  
  if (isDoubleFaced && card.card_faces) {
    frontManaCost = card.card_faces[0]?.mana_cost || '';
    backManaCost = card.card_faces[1]?.mana_cost || '';
    return { front: frontManaCost, back: backManaCost, display: `${frontManaCost} // ${backManaCost}` };
  } else {
    frontManaCost = card.mana_cost || '';
    return { front: frontManaCost, back: null, display: frontManaCost };
  }
}

console.log('✅ Transform card test:');
const transformResult = testManaCostExtraction(mockDoubleFacedCard);
console.log(`  Front: "${transformResult.front}" (should be "{U}")`);
console.log(`  Back: "${transformResult.back}" (should be "")`);
console.log(`  Display: "${transformResult.display}" (should be "{U} // ")`);

console.log('✅ Modal DFC test:');
const modalResult = testManaCostExtraction(mockModalDFC);
console.log(`  Front: "${modalResult.front}" (should be "{2}{R}")`);
console.log(`  Back: "${modalResult.back}" (should be "")`);
console.log(`  Display: "${modalResult.display}" (should be "{2}{R} // ")`);

console.log('🎉 All mana cost display tests completed!');
