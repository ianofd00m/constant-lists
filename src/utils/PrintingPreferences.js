// PrintingPreferences utility class - replaces static basic land preferences
class PrintingPreferences {
  static STORAGE_KEY = 'mtg_printing_preferences';
  
  // Get user's preferred printing for a card
  static get(cardName) {
    try {
      const prefs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      return prefs[cardName] || null;
    } catch (error) {
      console.warn('[PrintingPreferences] Error reading preferences:', error);
      return null;
    }
  }
  
  // Save user's preferred printing for a card
  static set(cardName, printingData) {
    try {
      const prefs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      
      // Store essential printing data
      prefs[cardName] = {
        id: printingData.id,
        set: printingData.set,
        set_name: printingData.set_name,
        collector_number: printingData.collector_number,
        image_uris: printingData.image_uris,
        selectedAt: Date.now(),
        selectionCount: (prefs[cardName]?.selectionCount || 0) + 1
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
      console.log(`[PrintingPreferences] Saved preference for ${cardName}: ${printingData.set.toUpperCase()} #${printingData.collector_number}`);
    } catch (error) {
      console.warn('[PrintingPreferences] Error saving preference:', error);
    }
  }
  
  // Check if user has a preference for a card
  static has(cardName) {
    return this.get(cardName) !== null;
  }
  
  // Clear preference for a specific card or all cards
  static clear(cardName = null) {
    try {
      if (cardName) {
        const prefs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        delete prefs[cardName];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
        console.log(`[PrintingPreferences] Cleared preference for ${cardName}`);
      } else {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('[PrintingPreferences] Cleared all preferences');
      }
    } catch (error) {
      console.warn('[PrintingPreferences] Error clearing preferences:', error);
    }
  }
  
  // Get all preferences (for debugging/settings)
  static getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
    } catch (error) {
      console.warn('[PrintingPreferences] Error reading all preferences:', error);
      return {};
    }
  }
  
  // Get user's printing patterns for smart defaults
  static getPatterns() {
    const prefs = this.getAll();
    const patterns = {
      preferredSets: {},
      recentSelections: [],
      totalSelections: 0
    };
    
    Object.values(prefs).forEach(pref => {
      // Count set preferences
      patterns.preferredSets[pref.set] = (patterns.preferredSets[pref.set] || 0) + pref.selectionCount;
      
      // Track recent selections
      patterns.recentSelections.push({
        set: pref.set,
        selectedAt: pref.selectedAt,
        count: pref.selectionCount
      });
      
      patterns.totalSelections += pref.selectionCount;
    });
    
    // Sort recent selections
    patterns.recentSelections.sort((a, b) => b.selectedAt - a.selectedAt);
    
    return patterns;
  }
}

export default PrintingPreferences;
