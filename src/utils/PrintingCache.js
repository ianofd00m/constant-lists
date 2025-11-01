// Global printing cache utility for instant loading of card printings
class PrintingCache {
  static STORAGE_KEY = 'printingsCache';
  static CACHE_VERSION = '1.0';
  static MAX_CACHE_SIZE = 1000; // Maximum number of cards to cache
  static CACHE_EXPIRY_HOURS = 24; // Cache expires after 24 hours

  // Get cached printings for a card
  static get(cardName) {
    try {
      const cache = this.getCache();
      const entry = cache[cardName];
      
      if (!entry) return null;
      
      // Check if cache entry is expired
      const now = Date.now();
      const entryAge = now - entry.timestamp;
      const maxAge = this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
      
      if (entryAge > maxAge) {
        // console.log(`[PrintingCache] Cache expired for ${cardName}, age: ${Math.round(entryAge / 1000 / 60)} minutes`);
        this.remove(cardName);
        return null;
      }
      
      // console.log(`[PrintingCache] Cache hit for ${cardName}, age: ${Math.round(entryAge / 1000 / 60)} minutes`);
      return entry.data;
    } catch (error) {
      console.error('[PrintingCache] Error reading cache:', error);
      return null;
    }
  }

  // Set cached printings for a card
  static set(cardName, printingsData, selectedPrinting) {
    try {
      if (!cardName || !printingsData) {
        // console.warn('[PrintingCache] Invalid data provided to cache');
        return;
      }

      const cache = this.getCache();
      
      // Check cache size and remove oldest entries if needed
      const cacheKeys = Object.keys(cache);
      if (cacheKeys.length >= this.MAX_CACHE_SIZE) {
        // console.log(`[PrintingCache] Cache full (${cacheKeys.length}), removing oldest entries`);
        
        // Sort by timestamp and remove oldest 20%
        const sortedEntries = cacheKeys
          .map(key => ({ key, timestamp: cache[key].timestamp }))
          .sort((a, b) => a.timestamp - b.timestamp);
        
        const entriesToRemove = Math.floor(this.MAX_CACHE_SIZE * 0.2);
        for (let i = 0; i < entriesToRemove; i++) {
          delete cache[sortedEntries[i].key];
        }
      }

      // Store the data with timestamp
      cache[cardName] = {
        data: {
          printings: printingsData,
          selectedPrinting: selectedPrinting
        },
        timestamp: Date.now(),
        version: this.CACHE_VERSION
      };
      
      this.saveCache(cache);
      // console.log(`[PrintingCache] Cached ${printingsData.length} printings for ${cardName}`);
    } catch (error) {
      console.error('[PrintingCache] Error writing cache:', error);
    }
  }

  // Remove a specific card from cache
  static remove(cardName) {
    try {
      const cache = this.getCache();
      delete cache[cardName];
      this.saveCache(cache);
      // console.log(`[PrintingCache] Removed ${cardName} from cache`);
    } catch (error) {
      console.error('[PrintingCache] Error removing from cache:', error);
    }
  }

  // Check if a card is cached and not expired
  static has(cardName) {
    return this.get(cardName) !== null;
  }

  // INSTANT LOADING: Seed cache with existing card data to avoid initial API calls
  static seedFromExistingData(cardName, existingPrintingData) {
    try {
      // DISABLED: This was causing cache corruption by seeding with only 1 printing
      // Instead, let cards fetch their full printing lists naturally
      // console.log(`[PrintingCache] 🚫 Skipping cache seeding for ${cardName} to prevent corruption`);
      return false; // Don't seed, force full fetch
    } catch (error) {
      console.error(`[PrintingCache] Error seeding cache for ${cardName}:`, error);
      return false;
    }
  }

  // INSTANT LOADING: Bulk seed cache from deck card data for instant first loads
  static seedFromDeckCards(deckCards) {
    if (!Array.isArray(deckCards)) {
      return 0;
    }

    let seededCount = 0;
    const uniqueCards = new Map(); // Use Map to avoid duplicates

    // Extract all available printing data from deck cards
    deckCards.forEach(cardObj => {
      try {
        let cardName = null;
        let printingData = null;

        // Extract card name
        if (cardObj.cardObj?.card?.name) {
          cardName = cardObj.cardObj.card.name;
          printingData = cardObj.cardObj.card.scryfall_json || cardObj.cardObj.scryfall_json;
        } else if (cardObj.cardObj?.name) {
          cardName = cardObj.cardObj.name;
          printingData = cardObj.cardObj.scryfall_json;
        } else if (cardObj.name) {
          cardName = cardObj.name;
          printingData = cardObj.scryfall_json;
        } else if (cardObj.card?.name) {
          cardName = cardObj.card.name;
          printingData = cardObj.card.scryfall_json;
        }

        // If we have valid data and haven't seen this card yet
        if (cardName && printingData && printingData.id && !uniqueCards.has(cardName)) {
          uniqueCards.set(cardName, printingData);
        }
      } catch (error) {
        console.warn('[PrintingCache] Error processing deck card for seeding:', error);
      }
    });

    // Seed cache with extracted data
    for (const [cardName, printingData] of uniqueCards) {
      if (this.seedFromExistingData(cardName, printingData)) {
        seededCount++;
      }
    }

    if (seededCount > 0) {
      // console.log(`[PrintingCache] 🚀 Seeded cache with ${seededCount} cards from deck data for instant loading`);
    }

    return seededCount;
  }

  // Get the raw cache object
  static getCache() {
    try {
      const cacheData = localStorage.getItem(this.STORAGE_KEY);
      if (!cacheData) return {};
      
      const cache = JSON.parse(cacheData);
      
      // Check cache version and clear if outdated
      if (cache._version !== this.CACHE_VERSION) {
        // console.log('[PrintingCache] Cache version mismatch, clearing cache');
        localStorage.removeItem(this.STORAGE_KEY);
        return {};
      }
      
      return cache;
    } catch (error) {
      console.error('[PrintingCache] Error parsing cache, clearing:', error);
      localStorage.removeItem(this.STORAGE_KEY);
      return {};
    }
  }

  // Save cache to localStorage
  static saveCache(cache) {
    try {
      cache._version = this.CACHE_VERSION;
      cache._lastUpdated = Date.now();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        // console.warn('[PrintingCache] Storage quota exceeded, clearing old entries');
        this.clearOldEntries();
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
        } catch (retryError) {
          console.error('[PrintingCache] Still cannot save after clearing:', retryError);
        }
      } else {
        console.error('[PrintingCache] Error saving cache:', error);
      }
    }
  }

  // Clear old cache entries to free up space
  static clearOldEntries() {
    try {
      const cache = this.getCache();
      const now = Date.now();
      const maxAge = this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
      
      let removedCount = 0;
      for (const [cardName, entry] of Object.entries(cache)) {
        if (cardName.startsWith('_')) continue; // Skip metadata
        
        if (now - entry.timestamp > maxAge) {
          delete cache[cardName];
          removedCount++;
        }
      }
      
      // console.log(`[PrintingCache] Cleared ${removedCount} expired entries`);
      this.saveCache(cache);
    } catch (error) {
      console.error('[PrintingCache] Error clearing old entries:', error);
    }
  }

  // Get cache statistics
  static getStats() {
    try {
      const cache = this.getCache();
      const entries = Object.keys(cache).filter(key => !key.startsWith('_'));
      const totalSize = JSON.stringify(cache).length;
      
      return {
        entries: entries.length,
        totalSizeKB: Math.round(totalSize / 1024),
        maxEntries: this.MAX_CACHE_SIZE,
        cacheVersion: this.CACHE_VERSION
      };
    } catch (error) {
      console.error('[PrintingCache] Error getting stats:', error);
      return { entries: 0, totalSizeKB: 0, maxEntries: this.MAX_CACHE_SIZE, cacheVersion: this.CACHE_VERSION };
    }
  }

  // Clear entire cache
  static clear() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      // console.log('[PrintingCache] Cache cleared');
    } catch (error) {
      console.error('[PrintingCache] Error clearing cache:', error);
    }
  }

  // INSTANT LOADING: Preload most common Magic cards for instant access
  static async preloadCommonCards() {
    const commonCards = [
      // Basic lands (most common cards in Magic)
      'Forest', 'Island', 'Mountain', 'Plains', 'Swamp', 'Wastes',
      'Snow-Covered Forest', 'Snow-Covered Island', 'Snow-Covered Mountain', 
      'Snow-Covered Plains', 'Snow-Covered Swamp', 'Snow-Covered Wastes',
      
      // Most played artifacts and spells
      'Sol Ring', 'Command Tower', 'Arcane Signet', 'Lightning Bolt',
      'Counterspell', 'Swords to Plowshares', 'Path to Exile',
      'Rampant Growth', 'Cultivate', 'Kodama\'s Reach',
      
      // Popular commanders and staples
      'Atraxa, Praetors\' Voice', 'Edgar Markov', 'Korvold, Fae-Cursed King',
      'Mana Crypt', 'Mana Vault', 'Chrome Mox', 'Mystical Tutor'
    ];

    // console.log(`[PrintingCache] 🏃‍♂️ Preloading ${commonCards.length} common cards`);
    
    try {
      await this.prefetchCards(commonCards, (completed, total) => {
        if (completed % 5 === 0 || completed === total) {
          // console.log(`[PrintingCache] 🏃‍♂️ Common cards preload: ${completed}/${total}`);
        }
      });
      // console.log('[PrintingCache] ✅ Common cards preloaded successfully');
    } catch (error) {
      console.warn('[PrintingCache] ⚠️ Some common cards failed to preload:', error);
    }
  }

  // INSTANT LOADING: Warm up cache for a single card (used on hover)
  static warmUpCard(cardName) {
    // Don't fetch if already cached
    if (this.has(cardName)) {
      return Promise.resolve();
    }

    // Start background fetch without waiting
    return this.fetchAndCacheCard(cardName).catch(error => {
      // console.warn(`[PrintingCache] Warm-up failed for ${cardName}:`, error.message);
    });
  }

  // Prefetch printings for a list of card names in the background
  static async prefetchCards(cardNames, onProgress) {
    // console.log(`[PrintingCache] Starting prefetch for ${cardNames.length} cards`);
    
    const uncachedCards = cardNames.filter(name => !this.has(name));
    if (uncachedCards.length === 0) {
      // console.log('[PrintingCache] All cards already cached');
      return;
    }
    
    // console.log(`[PrintingCache] 🚀 FAST prefetching ${uncachedCards.length} uncached cards`);
    
    // SPEED OPTIMIZATION: Larger batch size and parallel processing
    const batchSize = 6; // Increased from 3 for faster loading
    const maxConcurrentBatches = 2; // Process multiple batches simultaneously
    
    const batches = [];
    for (let i = 0; i < uncachedCards.length; i += batchSize) {
      batches.push(uncachedCards.slice(i, i + batchSize));
    }
    
    // Process batches with controlled concurrency
    for (let i = 0; i < batches.length; i += maxConcurrentBatches) {
      const currentBatches = batches.slice(i, i + maxConcurrentBatches);
      
      const batchPromises = currentBatches.map(async (batch, batchIndex) => {
        const globalBatchIndex = i + batchIndex;
        
        // Process cards in this batch in parallel
        const cardPromises = batch.map(async (cardName, cardIndex) => {
          try {
            await this.fetchAndCacheCard(cardName);
            const globalIndex = globalBatchIndex * batchSize + cardIndex + 1;
            if (onProgress) {
              onProgress(globalIndex, uncachedCards.length);
            }
          } catch (error) {
            // console.warn(`[PrintingCache] Failed to prefetch ${cardName}:`, error.message);
            // Don't throw - continue with other cards
          }
        });
        
        await Promise.all(cardPromises);
      });
      
      await Promise.all(batchPromises);
      
      // Shorter delay between batch groups for faster loading
      if (i + maxConcurrentBatches < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 100ms
      }
    }
    
    // console.log('[PrintingCache] ✅ Fast prefetch completed');
  }

  // Fetch and cache a single card's printings
  static async fetchAndCacheCard(cardName) {
    try {
      // Use the same API pattern as CardActionsModal via proxy
      const encodedName = encodeURIComponent(cardName);
      const uri = `https://constant-lists-api.onrender.com/api/cards/printings?name=${encodedName}`;
      
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (!Array.isArray(data.data) || data.data.length === 0) {
        throw new Error('No printings found');
      }
      
      // Cache the first 20 printings (same as modal behavior)
      const limitedPrintings = data.data.slice(0, 20);
      const selectedPrinting = limitedPrintings[0]; // Default to first printing
      
      this.set(cardName, limitedPrintings, selectedPrinting);
      
      return { printings: limitedPrintings, selectedPrinting };
    } catch (error) {
      console.error(`[PrintingCache] Error fetching ${cardName}:`, error);
      throw error;
    }
  }
}

export default PrintingCache;
