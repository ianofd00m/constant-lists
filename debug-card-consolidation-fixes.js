// Card consolidation and bulk movement fixes
console.log('=== Card Consolidation and Bulk Movement Fixes ===\n');

// Fix 1: Card consolidation function
function consolidateCardInstances(cards) {
  if (!cards || !Array.isArray(cards)) return cards;
  
  console.log('🔧 Starting card consolidation...');
  console.log('Input cards:', cards.length);
  
  const cardMap = new Map();
  
  cards.forEach((card, index) => {
    const cardName = card.card?.name || card.name;
    const printing = card.printing || card.scryfall_json?.id || card.card?.scryfall_json?.id;
    const foil = card.foil || card.card?.foil || false;
    
    if (!cardName) {
      console.warn('Skipping card without name at index:', index);
      return;
    }
    
    // Create a unique key for each card+printing+foil combination
    const key = `${cardName}|${printing || 'unknown'}|${foil}`;
    
    if (cardMap.has(key)) {
      // Add to existing entry
      const existing = cardMap.get(key);
      const currentCount = card.count || card.quantity || 1;
      existing.count = (existing.count || 1) + currentCount;
      existing.quantity = existing.count; // Ensure quantity matches count
      
      // Update nested structures too
      if (existing.card) {
        existing.card.count = existing.count;
        existing.card.quantity = existing.count;
      }
      if (existing.cardObj) {
        existing.cardObj.count = existing.count;
        existing.cardObj.quantity = existing.count;
        if (existing.cardObj.card) {
          existing.cardObj.card.count = existing.count;
          existing.cardObj.card.quantity = existing.count;
        }
      }
      
      console.log(`📈 Consolidated ${cardName}: ${existing.count} total`);
    } else {
      // Create new entry
      const consolidatedCard = {
        ...card,
        count: card.count || card.quantity || 1,
        quantity: card.count || card.quantity || 1
      };
      
      // Ensure count/quantity is set in nested structures too
      if (consolidatedCard.card) {
        consolidatedCard.card.count = consolidatedCard.count;
        consolidatedCard.card.quantity = consolidatedCard.count;
      }
      if (consolidatedCard.cardObj) {
        consolidatedCard.cardObj.count = consolidatedCard.count;
        consolidatedCard.cardObj.quantity = consolidatedCard.count;
        if (consolidatedCard.cardObj.card) {
          consolidatedCard.cardObj.card.count = consolidatedCard.count;
          consolidatedCard.cardObj.card.quantity = consolidatedCard.count;
        }
      }
      
      cardMap.set(key, consolidatedCard);
      console.log(`➕ Added ${cardName}: ${consolidatedCard.count}`);
    }
  });
  
  const consolidatedCards = Array.from(cardMap.values());
  console.log('Output cards:', consolidatedCards.length);
  console.log('Consolidation complete!\n');
  
  return consolidatedCards;
}

// Fix 2: Improved bulk movement function
async function improvedBulkMoveToTechIdeas(deckViewEditComponent) {
  const selectedCards = deckViewEditComponent.state?.selectedCards;
  const deck = deckViewEditComponent.state?.deck;
  const cards = deckViewEditComponent.state?.cards;
  
  if (!selectedCards || selectedCards.size === 0) {
    console.log('❌ No cards selected');
    return;
  }
  
  console.log('🚀 Starting improved bulk movement...');
  console.log('Selected cards:', selectedCards.size);
  
  // Group selected cards by card name to consolidate duplicates
  const cardGroups = new Map();
  
  for (const cardId of selectedCards) {
    // Find the card in main deck
    const foundCard = (cards || deck?.cards || []).find(card => {
      const generatedId = generateCardSelectionId ? generateCardSelectionId(card) : null;
      return generatedId === cardId;
    });
    
    if (!foundCard) {
      console.log('⚠️  Card not found:', cardId.substring(0, 40) + '...');
      continue;
    }
    
    const cardName = foundCard.card?.name || foundCard.name;
    const printing = foundCard.printing || foundCard.scryfall_json?.id || foundCard.card?.scryfall_json?.id;
    const foil = foundCard.foil || foundCard.card?.foil || false;
    
    // Group by name+printing+foil
    const groupKey = `${cardName}|${printing || 'unknown'}|${foil}`;
    
    if (cardGroups.has(groupKey)) {
      const group = cardGroups.get(groupKey);
      group.totalCount += (foundCard.count || foundCard.quantity || 1);
      group.cards.push(foundCard);
    } else {
      cardGroups.set(groupKey, {
        cardName,
        printing,
        foil,
        totalCount: foundCard.count || foundCard.quantity || 1,
        cards: [foundCard],
        representative: foundCard // Use first card as representative
      });
    }
  }
  
  console.log(`📊 Grouped ${selectedCards.size} selected cards into ${cardGroups.size} unique card groups`);
  
  // Process each group
  for (const [groupKey, group] of cardGroups) {
    console.log(`\n🎯 Processing group: ${group.cardName} (${group.totalCount} total)`);
    
    // Use the representative card but update its count to the total
    const consolidatedCard = {
      ...group.representative,
      count: group.totalCount,
      quantity: group.totalCount
    };
    
    // Update nested structures
    if (consolidatedCard.card) {
      consolidatedCard.card.count = group.totalCount;
      consolidatedCard.card.quantity = group.totalCount;
    }
    if (consolidatedCard.cardObj) {
      consolidatedCard.cardObj.count = group.totalCount;
      consolidatedCard.cardObj.quantity = group.totalCount;
      if (consolidatedCard.cardObj.card) {
        consolidatedCard.cardObj.card.count = group.totalCount;
        consolidatedCard.cardObj.card.quantity = group.totalCount;
      }
    }
    
    console.log(`  📤 Moving ${group.cardName} with consolidated count: ${group.totalCount}`);
    
    // Use the existing handleMoveToTechIdeas function
    if (deckViewEditComponent.handleMoveToTechIdeas) {
      try {
        await deckViewEditComponent.handleMoveToTechIdeas(consolidatedCard);
        console.log(`  ✅ Successfully moved ${group.cardName}`);
      } catch (error) {
        console.error(`  ❌ Failed to move ${group.cardName}:`, error);
      }
    } else {
      console.error('  ❌ handleMoveToTechIdeas function not available');
    }
  }
  
  console.log('\n🎉 Bulk movement complete!');
}

// Fix 3: Card deduplication for existing deck
function deduplicateDeck(deckViewEditComponent) {
  console.log('🧹 Starting deck deduplication...');
  
  const cards = deckViewEditComponent.state?.cards;
  const deck = deckViewEditComponent.state?.deck;
  
  if (!cards || !Array.isArray(cards)) {
    console.log('❌ No cards to deduplicate');
    return;
  }
  
  const originalCount = cards.length;
  const consolidatedCards = consolidateCardInstances(cards);
  
  console.log(`📊 Deduplication results:`);
  console.log(`  Original cards: ${originalCount}`);
  console.log(`  Consolidated cards: ${consolidatedCards.length}`);
  console.log(`  Duplicates removed: ${originalCount - consolidatedCards.length}`);
  
  if (consolidatedCards.length < originalCount) {
    // Update the component state
    if (deckViewEditComponent.setCards) {
      deckViewEditComponent.setCards(consolidatedCards);
      console.log('✅ Updated cards state');
    }
    
    if (deckViewEditComponent.setDeck && deck) {
      const updatedDeck = {
        ...deck,
        cards: consolidatedCards
      };
      deckViewEditComponent.setDeck(updatedDeck);
      console.log('✅ Updated deck state');
    }
    
    console.log('🎉 Deduplication complete!');
    return consolidatedCards;
  } else {
    console.log('ℹ️  No duplicates found');
    return cards;
  }
}

// Export functions
window.consolidateCardInstances = consolidateCardInstances;
window.improvedBulkMoveToTechIdeas = improvedBulkMoveToTechIdeas;
window.deduplicateDeck = deduplicateDeck;

console.log('🎮 AVAILABLE FIXES:');
console.log('- deduplicateDeck(window.deckViewEditComponent) - Remove duplicate card instances');
console.log('- improvedBulkMoveToTechIdeas(window.deckViewEditComponent) - Better bulk movement logic');
console.log('- consolidateCardInstances(cards) - Consolidate card array');
