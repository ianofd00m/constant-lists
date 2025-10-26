// Debug script to test card movement fixes
console.log('🔧 Testing card movement logic...');

// Simulate what happens in the move-from-tech-ideas-to-main endpoint
function testCardObjectIdExtraction() {
  console.log('\n📋 Testing card ObjectId extraction:');
  
  // Case 1: Card with nested _id (populated card)
  const cardWithNestedId = {
    name: "Test Card",
    card: {
      _id: "507f1f77bcf86cd799439011",
      name: "Test Card"
    },
    printing: "some-printing-id",
    foil: false
  };
  
  const extractedId1 = cardWithNestedId.card && cardWithNestedId.card._id ? cardWithNestedId.card._id : cardWithNestedId.card;
  console.log('Case 1 (nested _id):', extractedId1);
  
  // Case 2: Card with direct ObjectId string
  const cardWithDirectId = {
    name: "Test Card",
    card: "507f1f77bcf86cd799439011",
    printing: "some-printing-id",
    foil: false
  };
  
  const extractedId2 = cardWithDirectId.card && cardWithDirectId.card._id ? cardWithDirectId.card._id : cardWithDirectId.card;
  console.log('Case 2 (direct ObjectId):', extractedId2);
  
  // Case 3: No card reference (this should fail)
  const cardWithoutId = {
    name: "Test Card",
    card: null,
    printing: "some-printing-id",
    foil: false
  };
  
  const extractedId3 = cardWithoutId.card && cardWithoutId.card._id ? cardWithoutId.card._id : cardWithoutId.card;
  console.log('Case 3 (no card reference):', extractedId3);
  
  console.log('\n✅ Card ObjectId extraction test completed');
}

testCardObjectIdExtraction();

// Simulate what the frontend should send vs what it's currently sending
function testApiPayloads() {
  console.log('\n📡 Testing API payloads:');
  
  console.log('Current frontend payload for move-to-tech-ideas:');
  console.log({
    cardName: "Angelic Destiny",
    printing: "066d73fa-369b-44a3-b1a9-d22176ac3566",
    foil: false
  });
  
  console.log('\nCurrent frontend payload for move-from-tech-ideas-to-main:');
  console.log({
    cardIndex: 0
  });
  
  console.log('\n✅ API payload test completed');
}

testApiPayloads();

console.log('\n🎯 Conclusion: The backend fixes should resolve the ObjectId extraction issues.');
console.log('The main problem was trying to use cardToMove.card directly without checking if it\'s a nested object.');
