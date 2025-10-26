// Debug script for bulk movement and card duplication issues
console.log('=== Debugging Bulk Movement and Card Duplication Issues ===\n');

// This script will help us understand why bulk movements fail and cards are split into duplicates
// Run this in the browser console while on the deck edit page

function debugBulkMovementIssues() {
  console.log('🔍 Starting bulk movement diagnostics...');
  
  // Check if we're on the deck edit page
  const deckViewEditComponent = window.deckViewEditComponent;
  if (!deckViewEditComponent) {
    console.log('❌ DeckViewEdit component not found. Make sure you\'re on the deck edit page.');
    return;
  }
  
  const deck = deckViewEditComponent.state?.deck;
  const cards = deckViewEditComponent.state?.cards;
  const selectedCards = deckViewEditComponent.state?.selectedCards;
  
  if (!deck) {
    console.log('❌ Deck data not found.');
    return;
  }
  
  console.log('\n📊 CURRENT DECK STATE:');
  console.log('Main deck cards:', cards?.length || 0);
  console.log('Tech ideas cards:', deck.techIdeas?.length || 0);
  console.log('Sideboard cards:', deck.sideboard?.length || 0);
  console.log('Selected cards:', selectedCards?.size || 0);
  
  // Analyze card duplication in main deck
  console.log('\n🔍 ANALYZING CARD DUPLICATION IN MAIN DECK:');
  if (cards && cards.length > 0) {
    const cardNameCounts = {};
    const duplicatedCards = {};
    
    cards.forEach((card, index) => {
      const cardName = card.card?.name || card.name;
      if (cardName) {
        if (!cardNameCounts[cardName]) {
          cardNameCounts[cardName] = [];
        }
        cardNameCounts[cardName].push({
          index,
          card,
          count: card.count || card.quantity || 1,
          printing: card.printing || card.scryfall_json?.id || card.card?.scryfall_json?.id,
          foil: card.foil || false,
          selectionId: generateCardSelectionId ? generateCardSelectionId(card) : 'N/A'
        });
      }
    });
    
    // Find duplicated cards
    Object.entries(cardNameCounts).forEach(([cardName, instances]) => {
      if (instances.length > 1) {
        duplicatedCards[cardName] = instances;
        console.log(`🚨 DUPLICATED CARD: ${cardName} (${instances.length} instances)`);
        instances.forEach((instance, idx) => {
          console.log(`  Instance ${idx + 1}:`, {
            count: instance.count,
            printing: instance.printing?.substring(0, 8) + '...',
            foil: instance.foil,
            selectionId: instance.selectionId?.substring(0, 20) + '...'
          });
        });
      }
    });
    
    if (Object.keys(duplicatedCards).length === 0) {
      console.log('✅ No duplicated cards found in main deck');
    } else {
      console.log(`\n📊 DUPLICATION SUMMARY: ${Object.keys(duplicatedCards).length} cards have duplicates`);
    }
  }
  
  // Analyze selected cards
  console.log('\n🎯 ANALYZING SELECTED CARDS:');
  if (selectedCards && selectedCards.size > 0) {
    console.log('Selected card IDs:');
    const selectedArray = Array.from(selectedCards);
    selectedArray.forEach((cardId, index) => {
      console.log(`  ${index + 1}. ${cardId.substring(0, 40)}...`);
      
      // Try to find the corresponding card
      const foundCard = cards?.find(card => {
        const generatedId = generateCardSelectionId ? generateCardSelectionId(card) : null;
        return generatedId === cardId;
      });
      
      if (foundCard) {
        console.log(`     ✅ Card found: ${foundCard.card?.name || foundCard.name} (count: ${foundCard.count || 1})`);
      } else {
        console.log(`     ❌ Card not found in main deck - checking other zones...`);
        
        // Check tech ideas
        const techCard = deck.techIdeas?.find(card => {
          const generatedId = generateCardSelectionId ? generateCardSelectionId(card) : null;
          return generatedId === cardId;
        });
        
        if (techCard) {
          console.log(`     ✅ Card found in tech ideas: ${techCard.card?.name || techCard.name}`);
        }
        
        // Check sideboard
        const sideboardCard = deck.sideboard?.find(card => {
          const generatedId = generateCardSelectionId ? generateCardSelectionId(card) : null;
          return generatedId === cardId;
        });
        
        if (sideboardCard) {
          console.log(`     ✅ Card found in sideboard: ${sideboardCard.card?.name || sideboardCard.name}`);
        }
      }
    });
  } else {
    console.log('No cards currently selected');
  }
  
  // Test card selection ID generation
  console.log('\n🔧 TESTING CARD SELECTION ID GENERATION:');
  if (cards && cards.length > 0 && generateCardSelectionId) {
    const sampleCard = cards[0];
    const selectionId = generateCardSelectionId(sampleCard);
    console.log('Sample card:', sampleCard.card?.name || sampleCard.name);
    console.log('Generated selection ID:', selectionId);
    console.log('Selection ID components:', {
      name: sampleCard.card?.name || sampleCard.name,
      printing: sampleCard.printing || sampleCard.scryfall_json?.id || sampleCard.card?.scryfall_json?.id,
      foil: sampleCard.foil || false
    });
  }
  
  return {
    deck,
    cards,
    selectedCards: selectedCards ? Array.from(selectedCards) : [],
    duplicatedCards: Object.keys(cardNameCounts || {}).filter(name => (cardNameCounts[name] || []).length > 1)
  };
}

// Test bulk movement logic
function testBulkMovementLogic() {
  console.log('\n🧪 TESTING BULK MOVEMENT LOGIC:');
  
  const deckViewEditComponent = window.deckViewEditComponent;
  if (!deckViewEditComponent) {
    console.log('❌ DeckViewEdit component not found.');
    return;
  }
  
  const selectedCards = deckViewEditComponent.state?.selectedCards;
  const deck = deckViewEditComponent.state?.deck;
  const cards = deckViewEditComponent.state?.cards;
  
  if (!selectedCards || selectedCards.size === 0) {
    console.log('❌ No cards selected for testing');
    return;
  }
  
  console.log(`Testing bulk movement logic for ${selectedCards.size} selected cards...`);
  
  const mainDeckCardsToMove = [];
  const sideboardCardsToMove = [];
  
  // Simulate the bulk movement card identification logic
  for (const cardId of selectedCards) {
    console.log(`\n🔍 Processing card ID: ${cardId.substring(0, 40)}...`);
    
    // Check if already in tech ideas (skip if so)
    const techCard = deck.techIdeas?.find(card => {
      const generatedId = generateCardSelectionId ? generateCardSelectionId(card) : null;
      return generatedId === cardId;
    });
    
    if (techCard) {
      console.log('  ⏭️  Card already in tech ideas, skipping');
      continue;
    }
    
    // Check main deck
    const mainCard = (cards || deck?.cards || []).find(card => {
      const generatedId = generateCardSelectionId ? generateCardSelectionId(card) : null;
      return generatedId === cardId;
    });
    
    if (mainCard) {
      console.log(`  ✅ Found in main deck: ${mainCard.card?.name || mainCard.name}`);
      mainDeckCardsToMove.push(mainCard);
      continue;
    }
    
    // Check sideboard
    const sideboardCard = deck.sideboard?.find(card => {
      const generatedId = generateCardSelectionId ? generateCardSelectionId(card) : null;
      return generatedId === cardId;
    });
    
    if (sideboardCard) {
      console.log(`  ✅ Found in sideboard: ${sideboardCard.card?.name || sideboardCard.name}`);
      const sideboardIndex = deck.sideboard.findIndex(card => card === sideboardCard);
      sideboardCardsToMove.push({ card: sideboardCard, index: sideboardIndex });
      continue;
    }
    
    console.log('  ❌ Card not found in any zone!');
  }
  
  console.log(`\n📊 BULK MOVEMENT ANALYSIS RESULTS:`);
  console.log(`Main deck cards to move: ${mainDeckCardsToMove.length}`);
  console.log(`Sideboard cards to move: ${sideboardCardsToMove.length}`);
  
  if (mainDeckCardsToMove.length > 0) {
    console.log('\nMain deck cards to move:', mainDeckCardsToMove.map(card => card.card?.name || card.name));
  }
  
  if (sideboardCardsToMove.length > 0) {
    console.log('\nSideboard cards to move:', sideboardCardsToMove.map(item => item.card.card?.name || item.card.name));
  }
  
  return {
    mainDeckCardsToMove,
    sideboardCardsToMove,
    totalSelectedCards: selectedCards.size,
    cardsFoundForMovement: mainDeckCardsToMove.length + sideboardCardsToMove.length
  };
}

// Test modal quantity update logic
function testModalQuantityLogic(cardName) {
  console.log('\n🔢 TESTING MODAL QUANTITY UPDATE LOGIC:');
  
  if (!cardName) {
    console.log('❌ Please provide a card name to test, e.g., testModalQuantityLogic("Dragon Sniper")');
    return;
  }
  
  const deckViewEditComponent = window.deckViewEditComponent;
  if (!deckViewEditComponent) {
    console.log('❌ DeckViewEdit component not found.');
    return;
  }
  
  const cards = deckViewEditComponent.state?.cards;
  
  if (!cards) {
    console.log('❌ Cards data not found.');
    return;
  }
  
  console.log(`Testing quantity update logic for: ${cardName}`);
  
  // Find all instances of the card
  const cardInstances = cards.filter(card => {
    const name = card.card?.name || card.name;
    return name && name.toLowerCase().includes(cardName.toLowerCase());
  });
  
  if (cardInstances.length === 0) {
    console.log(`❌ No cards found matching: ${cardName}`);
    return;
  }
  
  console.log(`\n📊 Found ${cardInstances.length} instances of ${cardName}:`);
  cardInstances.forEach((card, index) => {
    console.log(`  Instance ${index + 1}:`, {
      name: card.card?.name || card.name,
      count: card.count || card.quantity || 'undefined',
      printing: (card.printing || card.scryfall_json?.id || '').substring(0, 8) + '...',
      foil: card.foil || false,
      selectionId: generateCardSelectionId ? generateCardSelectionId(card).substring(0, 20) + '...' : 'N/A'
    });
  });
  
  // Simulate quantity update
  console.log('\n🔧 Simulating quantity update to 3 for first instance...');
  const testCard = cardInstances[0];
  console.log('Test card object structure:', {
    hasTopLevelCount: testCard.count !== undefined,
    hasTopLevelQuantity: testCard.quantity !== undefined,
    hasCardCount: testCard.card?.count !== undefined,
    hasCardQuantity: testCard.card?.quantity !== undefined,
    hasCardObjCount: testCard.cardObj?.count !== undefined,
    hasCardObjQuantity: testCard.cardObj?.quantity !== undefined
  });
  
  return cardInstances;
}

// Export functions for manual use
window.debugBulkMovementIssues = debugBulkMovementIssues;
window.testBulkMovementLogic = testBulkMovementLogic;
window.testModalQuantityLogic = testModalQuantityLogic;

// Auto-run diagnostics
debugBulkMovementIssues();

console.log('\n🎮 AVAILABLE COMMANDS:');
console.log('- debugBulkMovementIssues() - Analyze current deck state and duplication');
console.log('- testBulkMovementLogic() - Test bulk movement logic with selected cards');
console.log('- testModalQuantityLogic("Card Name") - Test quantity update logic for a specific card');
