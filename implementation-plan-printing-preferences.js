// Implementation Plan: Printing Preferences Cache System

const implementationPlan = {
  step1: "Create PrintingPreferences utility class",
  step2: "Enhance CardPreview to check preferences first", 
  step3: "Update CardActionsModal to save preferences",
  step4: "Add preference management UI (optional)",

  // Step 1: Utility class
  printingPreferencesClass: `
// Create: src/utils/PrintingPreferences.js
class PrintingPreferences {
  static STORAGE_KEY = 'mtg_printing_preferences';
  
  static get(cardName) {
    const prefs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
    return prefs[cardName] || null;
  }
  
  static set(cardName, printingData) {
    const prefs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
    prefs[cardName] = {
      id: printingData.id,
      set: printingData.set,
      collector_number: printingData.collector_number,
      image_uris: printingData.image_uris,
      selectedAt: Date.now()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
  }
  
  static has(cardName) {
    return this.get(cardName) !== null;
  }
  
  static clear(cardName = null) {
    if (cardName) {
      const prefs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      delete prefs[cardName];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }
}
  `,

  // Step 2: Enhanced CardPreview
  cardPreviewEnhancement: `
// Update CardPreview.jsx - Add to printing selection logic:

// NEW: Priority 0.5 - User's stored preference
const userPreference = PrintingPreferences.get(cardName);
if (userPreference && userPreference.id) {
  imageUrl = getFastImageUrl(userPreference.id);
  console.log(\`[CardPreview] Using stored preference for \${cardName}: \${userPreference.set} #\${userPreference.collector_number}\`);
}
// EXISTING: Priority 1 - Specific printing ID from modal
else if (specificPrintingId && specificPrintingId.length >= 36) {
  // ... existing logic
}
  `,

  // Step 3: Modal integration  
  modalIntegration: `
// Update CardActionsModal.jsx - Add to handleSelectPrinting:

// Save user's preference when they select a printing
PrintingPreferences.set(card.name, printing);
console.log(\`[PrintingPreferences] Saved preference for \${card.name}: \${printing.set} #\${printing.collector_number}\`);

// Existing modal logic continues...
  `,

  // Step 4: User experience flow
  userExperienceFlow: `
1. User first hovers over "Arcane Signet"
   → Preview shows default/deck printing (WOC #26)

2. User opens modal and selects PF25 #10  
   → Modal saves preference to localStorage
   → Preview updates to PF25 #10

3. User closes modal and hovers again
   → Preview IMMEDIATELY shows PF25 #10 (no modal needed!)

4. User refreshes page and hovers
   → Preview STILL shows PF25 #10 (preference persisted)

5. User can reset preferences in settings if desired
  `
};

console.log('🎯 Implementation Benefits:');
console.log('- Preview learns user preferences permanently');
console.log('- No more "wrong printing" visual confusion');
console.log('- Gradual improvement of user experience');
console.log('- Works with existing modal system');
console.log('- Simple localStorage-based implementation');

console.log('\n📋 Implementation Order:');
console.log('1. Create PrintingPreferences utility');
console.log('2. Add preference checking to CardPreview');
console.log('3. Add preference saving to CardActionsModal');
console.log('4. Test and refine');

console.log('\n🚀 Ready to implement this approach?');
