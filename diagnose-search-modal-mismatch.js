// Diagnostic tool for search preview vs modal mismatch issue
console.log('🔍 SEARCH PREVIEW vs MODAL MISMATCH DIAGNOSTIC');
console.log('================================================');

function diagnoseSearchModalMismatch() {
  console.log('\n📊 Analyzing search preview vs modal card display mismatch...');
  
  // Check if we're in the deck view
  const deckEditApp = window.deckEditApp || window.deckViewEditComponent;
  if (!deckEditApp) {
    console.log('❌ Not in deck view - please navigate to a deck first');
    return false;
  }
  
  console.log('✅ Deck view detected');
  
  // Monitor search results and preview
  let lastSearchResults = null;
  let lastPreview = null;
  let lastModalCard = null;
  
  // Backup original functions to wrap them with monitoring
  const originalHandleCardHover = deckEditApp.handleCardHover;
  const originalSetModalState = deckEditApp.setModalState;
  const originalHandleAddCard = deckEditApp.handleAddCard;
  
  // Wrap handleCardHover to monitor preview changes
  deckEditApp.handleCardHover = function(cardObj) {
    if (cardObj && cardObj.name) {
      lastPreview = {
        name: cardObj.name,
        printing: cardObj.printing || cardObj.scryfall_json?.id || cardObj.card?.scryfall_json?.id,
        set: cardObj.set || cardObj.scryfall_json?.set || cardObj.card?.scryfall_json?.set,
        image_uris: cardObj.image_uris || cardObj.scryfall_json?.image_uris || cardObj.card?.scryfall_json?.image_uris,
        finishes: cardObj.finishes || cardObj.scryfall_json?.finishes,
        source: 'search_preview'
      };
      console.log(`🔍 [PREVIEW] Showing ${lastPreview.name} (${lastPreview.set?.toUpperCase()}) - printing: ${lastPreview.printing}`);
    }
    return originalHandleCardHover.call(this, cardObj);
  };
  
  // Wrap setModalState to monitor modal opening
  const originalSetModalStateFunc = deckEditApp.setModalState;
  deckEditApp.setModalState = function(newState) {
    if (newState.isOpen && newState.cardObj && newState.cardObj.name) {
      lastModalCard = {
        name: newState.cardObj.name,
        printing: newState.cardObj.printing || newState.cardObj.scryfall_json?.id || newState.cardObj.card?.scryfall_json?.id,
        set: newState.cardObj.set || newState.cardObj.scryfall_json?.set || newState.cardObj.card?.scryfall_json?.set,
        image_uris: newState.cardObj.image_uris || newState.cardObj.scryfall_json?.image_uris || newState.cardObj.card?.scryfall_json?.image_uris,
        finishes: newState.cardObj.finishes || newState.cardObj.scryfall_json?.finishes,
        source: 'modal_open',
        debugData: {
          cardObjStructure: Object.keys(newState.cardObj),
          hasCard: !!newState.cardObj.card,
          hasCardObj: !!newState.cardObj.cardObj,
          hasScryfallJson: !!newState.cardObj.scryfall_json,
          cardObjHasScryfallJson: !!newState.cardObj.card?.scryfall_json,
          cardObjCardObjHasScryfallJson: !!newState.cardObj.cardObj?.scryfall_json
        }
      };
      
      console.log(`🎯 [MODAL] Opening modal for ${lastModalCard.name} (${lastModalCard.set?.toUpperCase()}) - printing: ${lastModalCard.printing}`);
      console.log(`🔍 [MODAL] Debug data:`, lastModalCard.debugData);
      
      // Check for mismatch
      if (lastPreview && lastPreview.name === lastModalCard.name) {
        const previewPrinting = lastPreview.printing;
        const modalPrinting = lastModalCard.printing;
        
        if (previewPrinting !== modalPrinting) {
          console.log(`⚠️  [MISMATCH DETECTED] ${lastPreview.name}:`);
          console.log(`   Preview: ${lastPreview.set?.toUpperCase()} (${previewPrinting})`);
          console.log(`   Modal:   ${lastModalCard.set?.toUpperCase()} (${modalPrinting})`);
          console.log(`   🔍 This explains why the preview doesn't match the modal!`);
          
          // Analyze why the mismatch occurred
          analyzeMismatchCause(lastPreview, lastModalCard);
        } else {
          console.log(`✅ [NO MISMATCH] Preview and modal show same printing: ${previewPrinting}`);
        }
      }
    }
    return originalSetModalStateFunc.call(this, newState);
  };
  
  // Wrap handleAddCard to monitor search results
  deckEditApp.handleAddCard = async function(cardToAdd) {
    if (cardToAdd && cardToAdd.name) {
      lastSearchResults = {
        name: cardToAdd.name,
        printing: cardToAdd.scryfall_id || cardToAdd.id,
        set: cardToAdd.set,
        image_uris: cardToAdd.image_uris,
        finishes: cardToAdd.finishes,
        source: 'search_result'
      };
      console.log(`🔍 [SEARCH] Adding ${lastSearchResults.name} from search (${lastSearchResults.set?.toUpperCase()}) - printing: ${lastSearchResults.printing}`);
    }
    return originalHandleAddCard.call(this, cardToAdd);
  };
  
  console.log('✅ Monitoring installed! Now search for a card, hover over it, add it, then click it to see mismatch analysis.');
  
  return {
    getLastPreview: () => lastPreview,
    getLastModal: () => lastModalCard,
    getLastSearch: () => lastSearchResults
  };
}

function analyzeMismatchCause(preview, modal) {
  console.log('\n🔍 ANALYZING MISMATCH CAUSE:');
  
  // Check printing preferences
  try {
    const userPreference = window.PrintingPreferences?.get(preview.name);
    if (userPreference && userPreference.id) {
      console.log(`🎯 User has printing preference: ${userPreference.set?.toUpperCase()} #${userPreference.collector_number} (${userPreference.id})`);
      if (modal.printing === userPreference.id) {
        console.log(`✅ Modal is using user preference (correct behavior)`);
        console.log(`📝 Fix needed: Update search preview to also use user preference`);
      }
    } else {
      console.log(`❌ No user preference found for ${preview.name}`);
    }
  } catch (e) {
    console.log(`❌ Could not check printing preferences: ${e.message}`);
  }
  
  // Check printing cache
  try {
    const cachedData = window.PrintingCache?.get(preview.name);
    if (cachedData && cachedData.selectedPrinting) {
      console.log(`💾 Cached printing: ${cachedData.selectedPrinting.set?.toUpperCase()} (${cachedData.selectedPrinting.id})`);
      if (modal.printing === cachedData.selectedPrinting.id) {
        console.log(`✅ Modal is using cached printing (expected behavior)`);
        console.log(`📝 Fix needed: Update search preview to also use cached printing`);
      }
    } else {
      console.log(`❌ No cached printing found for ${preview.name}`);
    }
  } catch (e) {
    console.log(`❌ Could not check printing cache: ${e.message}`);
  }
  
  // Basic land check
  try {
    const basicLandPrintings = window.BASIC_LAND_PRINTINGS || {};
    if (basicLandPrintings[preview.name]) {
      console.log(`🏔️  Basic land detected: preferred printing ${basicLandPrintings[preview.name]}`);
      if (modal.printing === basicLandPrintings[preview.name]) {
        console.log(`✅ Modal is using basic land preference (correct behavior)`);
        console.log(`📝 Fix needed: Update search preview to also use basic land preference`);
      }
    }
  } catch (e) {
    console.log(`❌ Could not check basic land preferences: ${e.message}`);
  }
  
  console.log('\n💡 SOLUTION: The search preview needs to respect the same printing priority logic as the modal:');
  console.log('   1. User printing preferences (highest priority)');
  console.log('   2. Cached printing data');
  console.log('   3. Basic land default printings');
  console.log('   4. Search result printing (fallback)');
}

function implementSearchPreviewFix() {
  console.log('\n🔧 IMPLEMENTING SEARCH PREVIEW FIX...');
  
  const deckEditApp = window.deckEditApp || window.deckViewEditComponent;
  if (!deckEditApp) {
    console.log('❌ Not in deck view - cannot implement fix');
    return false;
  }
  
  // Backup original handleCardHover if not already backed up
  if (!deckEditApp._originalHandleCardHover) {
    deckEditApp._originalHandleCardHover = deckEditApp.handleCardHover;
    console.log('✅ Backed up original handleCardHover');
  }
  
  // Enhanced handleCardHover that respects printing priorities
  deckEditApp.handleCardHover = function(cardObj) {
    if (!cardObj || !cardObj.name) {
      return this._originalHandleCardHover.call(this, cardObj);
    }
    
    const cardName = cardObj.name;
    let finalPrintingId = cardObj.printing || cardObj.scryfall_json?.id || cardObj.card?.scryfall_json?.id;
    let finalSet = cardObj.set || cardObj.scryfall_json?.set || cardObj.card?.scryfall_json?.set;
    
    // Apply same printing priority logic as modal
    try {
      // 1. Check user preferences first (highest priority)
      const userPreference = window.PrintingPreferences?.get(cardName);
      if (userPreference && userPreference.id) {
        finalPrintingId = userPreference.id;
        finalSet = userPreference.set;
        console.log(`🎯 [PREVIEW FIX] Using user preference for ${cardName}: ${userPreference.set?.toUpperCase()} #${userPreference.collector_number}`);
      }
      
      // 2. Check cached printing data
      else {
        const cachedData = window.PrintingCache?.get(cardName);
        if (cachedData && cachedData.selectedPrinting) {
          finalPrintingId = cachedData.selectedPrinting.id;
          finalSet = cachedData.selectedPrinting.set;
          console.log(`💾 [PREVIEW FIX] Using cached printing for ${cardName}: ${cachedData.selectedPrinting.set?.toUpperCase()}`);
        }
        
        // 3. Check basic land preferences
        else {
          const basicLandPrintings = window.BASIC_LAND_PRINTINGS || {};
          if (basicLandPrintings[cardName]) {
            finalPrintingId = basicLandPrintings[cardName];
            console.log(`🏔️  [PREVIEW FIX] Using basic land preference for ${cardName}: ${finalPrintingId}`);
          }
        }
      }
    } catch (error) {
      console.warn(`[PREVIEW FIX] Error checking preferences for ${cardName}:`, error);
    }
    
    // Create enhanced card object with correct printing
    const enhancedCardObj = {
      ...cardObj,
      printing: finalPrintingId,
      set: finalSet,
      // If we changed the printing, we should fetch the correct image
      _printingChanged: finalPrintingId !== (cardObj.printing || cardObj.scryfall_json?.id || cardObj.card?.scryfall_json?.id)
    };
    
    // If printing changed, try to get correct image URL
    if (enhancedCardObj._printingChanged && finalPrintingId) {
      // Use Scryfall API format for the correct printing image
      enhancedCardObj.image_uris = {
        normal: `https://api.scryfall.com/cards/${finalPrintingId}?format=image&version=normal`,
        small: `https://api.scryfall.com/cards/${finalPrintingId}?format=image&version=small`
      };
      console.log(`🖼️  [PREVIEW FIX] Updated image for ${cardName} to use printing ${finalPrintingId}`);
    }
    
    return this._originalHandleCardHover.call(this, enhancedCardObj);
  };
  
  console.log('✅ Search preview fix installed!');
  console.log('📝 Now search for a card, hover over it - the preview should match what the modal will show');
  
  return true;
}

// Main execution
const diagnostic = diagnoseSearchModalMismatch();

// Make functions available globally
window.searchModalMismatchFix = {
  diagnose: diagnoseSearchModalMismatch,
  implementFix: implementSearchPreviewFix,
  analyze: analyzeMismatchCause
};

console.log('\n🔧 Functions available:');
console.log('• window.searchModalMismatchFix.diagnose() - Start monitoring for mismatches');
console.log('• window.searchModalMismatchFix.implementFix() - Apply preview fix');
console.log('• window.searchModalMismatchFix.analyze(preview, modal) - Analyze specific mismatch');

console.log('\n🧪 TEST INSTRUCTIONS:');
console.log('1. Search for a card (try "Lightning Bolt" or "Sol Ring")');
console.log('2. Hover over the search result to see preview');
console.log('3. Add the card to deck');
console.log('4. Click the card in deck to open modal');
console.log('5. Check console for mismatch analysis');
console.log('\n📝 Then run window.searchModalMismatchFix.implementFix() to apply the fix');
