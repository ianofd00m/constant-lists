// Concept: Printing Preferences Cache
// This approach uses localStorage to remember user's printing selections

const printingPreferencesConcept = {
  // 1. Preferences storage system
  printingPreferences: {
    // Store user's preferred printings in localStorage
    storageKey: 'mtg_printing_preferences',
    
    get(cardName) {
      const prefs = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      return prefs[cardName] || null;
    },
    
    set(cardName, printingData) {
      const prefs = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      prefs[cardName] = {
        id: printingData.id,
        set: printingData.set,
        collector_number: printingData.collector_number,
        image_uris: printingData.image_uris,
        selectedAt: Date.now()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(prefs));
    },
    
    has(cardName) {
      return this.get(cardName) !== null;
    }
  },

  // 2. Enhanced CardPreview logic
  enhancedPreviewLogic: function(card) {
    const cardName = card.name;
    
    // Priority 1: User's stored preference
    const userPreference = this.printingPreferences.get(cardName);
    if (userPreference) {
      console.log(`[CardPreview] Using stored preference for ${cardName}: ${userPreference.set} #${userPreference.collector_number}`);
      return {
        printingId: userPreference.id,
        imageUrl: getFastImageUrl(userPreference.id),
        printingData: userPreference
      };
    }

    // Priority 2: Basic land preferences (existing)
    if (BASIC_LAND_PRINTINGS[cardName]) {
      return {
        printingId: BASIC_LAND_PRINTINGS[cardName],
        imageUrl: getFastImageUrl(BASIC_LAND_PRINTINGS[cardName])
      };
    }

    // Priority 3: Card's current printing (existing logic)
    const specificPrintingId = card.printing || card.scryfall_json?.id;
    if (specificPrintingId) {
      return {
        printingId: specificPrintingId,
        imageUrl: getFastImageUrl(specificPrintingId)
      };
    }

    // Fallback to default logic
    return null;
  },

  // 3. Modal saves preferences when user selects
  modalPrintingSelection: function(card, selectedPrinting) {
    const cardName = card.name;
    
    // Save user's preference
    this.printingPreferences.set(cardName, selectedPrinting);
    
    // Update preview immediately (if callback exists)
    if (onPreviewUpdate) {
      onPreviewUpdate({
        ...card,
        printing: selectedPrinting.id,
        scryfall_json: selectedPrinting
      });
    }
    
    console.log(`[PrintingPreferences] Saved preference for ${cardName}: ${selectedPrinting.set} #${selectedPrinting.collector_number}`);
  }
};

// 4. Implementation example
const exampleUsage = {
  // When user first hovers over Arcane Signet
  firstHover: function() {
    const card = { name: "Arcane Signet" };
    
    // Check if user has a preference
    const hasPreference = printingPreferencesConcept.printingPreferences.has("Arcane Signet");
    
    if (!hasPreference) {
      console.log("No preference stored, using default printing");
      // Show default printing (whatever the deck has)
    } else {
      const preference = printingPreferencesConcept.printingPreferences.get("Arcane Signet");
      console.log(`Using stored preference: ${preference.set} #${preference.collector_number}`);
      // Show user's preferred printing immediately
    }
  },

  // When user selects PF25 #10 in modal
  modalSelection: function() {
    const selectedPrinting = {
      id: "9ce66ebc-b39f-4b40-9d95-981629a5dd06",
      set: "pf25", 
      collector_number: "10"
    };
    
    // Save preference
    printingPreferencesConcept.modalPrintingSelection({ name: "Arcane Signet" }, selectedPrinting);
    
    // Now ALL future hovers over Arcane Signet will show PF25 #10
    console.log("Future hovers will show PF25 #10 automatically!");
  }
};

console.log('✅ Printing Preferences Cache Benefits:');
console.log('- Remembers user choices across sessions');
console.log('- Preview shows preferred printing immediately');
console.log('- No backend changes required');
console.log('- Works with existing modal system');
console.log('- Gradual learning of user preferences');
