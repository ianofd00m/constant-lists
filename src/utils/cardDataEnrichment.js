// Card Data Enrichment Utility
// This utility ensures all imported cards have complete data including type_line, color_identity, etc.

import { toast } from 'react-toastify';

// Cache for Scryfall lookups to avoid duplicate API calls
const scryfallCache = new Map();

// Rate limiting and retry configuration
const RATE_LIMIT = {
  maxRequestsPerSecond: 8, // Conservative limit (Scryfall allows 10/sec)
  maxConcurrent: 3,        // Maximum concurrent requests
  retryAttempts: 3,        // Number of retry attempts
  baseDelay: 125,          // Base delay between requests (ms)
  retryDelay: 1000,        // Delay for retries (ms)
  backoffMultiplier: 2     // Exponential backoff multiplier
};

// Track active requests for rate limiting
let activeRequests = 0;
let lastRequestTime = 0;
let requestQueue = [];

/**
 * Enriches a card with complete data from Scryfall API
 * @param {Object} card - The card object to enrich
 * @returns {Object} - Enriched card with complete data
 */
export async function enrichCardData(card) {
  if (!card || !card.name) {
    return card;
  }

  // Check if card already has all required fields
  if (hasCompleteData(card)) {
    return card;
  }

  try {
    // Try to get data from Scryfall API
    const scryfallData = await fetchCardFromScryfall(card);
    
    if (scryfallData) {
      return mergeCardData(card, scryfallData);
    }
  } catch (error) {
    console.warn(`Failed to enrich card data for ${card.name}:`, error.message);
  }

  return card;
}

/**
 * Rate-limited API call manager
 * @param {Function} apiCall - The API call function to execute
 * @param {Object} context - Context for the API call (e.g., card name)
 * @returns {Promise} - The API call result
 */
async function rateLimitedCall(apiCall, context = {}) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ apiCall, context, resolve, reject, attempts: 0 });
    processQueue();
  });
}

/**
 * Processes the request queue with rate limiting
 */
async function processQueue() {
  if (activeRequests >= RATE_LIMIT.maxConcurrent || requestQueue.length === 0) {
    return;
  }

  const { apiCall, context, resolve, reject, attempts } = requestQueue.shift();
  activeRequests++;

  try {
    // Enforce rate limiting with progress tracking
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    const minDelay = 1000 / RATE_LIMIT.maxRequestsPerSecond;
    
    if (timeSinceLastRequest < minDelay) {
      await new Promise(r => setTimeout(r, minDelay - timeSinceLastRequest));
    }
    
    lastRequestTime = Date.now();
    
    // Update progress for large imports
    if (context && context.progressCallback) {
      context.progressCallback({
        phase: 'api',
        current: context.processed || 0,
        total: context.total || 0,
        message: `Enriching card data...`
      });
    }
    
    const result = await apiCall();
    resolve(result);
    
  } catch (error) {
    // Implement exponential backoff for retries
    if (attempts < RATE_LIMIT.retryAttempts && 
        (error.message.includes('Failed to fetch') || 
         error.message.includes('CORS') || 
         error.message.includes('429'))) {
      
      const backoffDelay = RATE_LIMIT.retryDelay * Math.pow(RATE_LIMIT.backoffMultiplier, attempts);
      console.log(`⏳ Retrying ${context.cardName || 'API call'} after ${backoffDelay}ms (attempt ${attempts + 1})`);
      
      setTimeout(() => {
        requestQueue.unshift({ apiCall, context, resolve, reject, attempts: attempts + 1 });
        processQueue();
      }, backoffDelay);
    } else {
      reject(error);
    }
  } finally {
    activeRequests--;
    // Process next item in queue
    setTimeout(processQueue, RATE_LIMIT.baseDelay);
  }
}

/**
 * Enriches multiple cards in batches with intelligent rate limiting and retry logic
 * @param {Array} cards - Array of cards to enrich
 * @param {Function} onProgress - Optional progress callback
 * @param {Object} options - Additional options
 * @returns {Array} - Enriched cards
 */
export async function enrichCardsBatch(cards, onProgress, options = {}) {
  const {
    batchSize = 25,           // Smaller batches for better error handling
    maxConcurrent = 3,        // Control concurrency
    enableRetries = true,     // Enable retry logic
    progressInterval = 50,    // Update progress every N cards
    isLargeImport = false     // Optimize for very large imports (>5000 cards)
  } = options;

  const enrichedCards = [];
  const errors = [];
  let processed = 0;

  // Deduplicate cards to avoid unnecessary API calls
  const uniqueCards = deduplicateCards(cards);
  console.log(`📊 Processing ${uniqueCards.length} unique cards (${cards.length} total)`);

  // Adjust settings for very large imports
  if (isLargeImport && cards.length > 5000) {
    console.log('🔧 Optimizing for large import (>5000 cards)');
    options.batchSize = Math.min(batchSize, 15); // Smaller batches
    options.progressInterval = Math.max(progressInterval, 100); // Less frequent updates
  }

  // Process cards in smaller batches with better error handling
  for (let i = 0; i < uniqueCards.length; i += batchSize) {
    const batch = uniqueCards.slice(i, i + batchSize);
    
    try {
      // Use Promise.allSettled for better error handling
      const results = await Promise.allSettled(
        batch.map((card, idx) => rateLimitedCall(
          () => enrichCardData(card), 
          { 
            cardName: card.name,
            processed: processed + idx,
            total: uniqueCards.length,
            progressCallback: onProgress
          }
        ))
      );

      // Process results
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const originalCard = batch[j];
        
        if (result.status === 'fulfilled') {
          enrichedCards.push(result.value);
        } else {
          // Keep original card data if enrichment fails
          enrichedCards.push(originalCard);
          errors.push({
            card: originalCard.name,
            error: result.reason?.message || 'Unknown error'
          });
        }
        
        processed++;
        
        // Update progress periodically
        if (processed % progressInterval === 0 || processed === uniqueCards.length) {
          if (onProgress) {
            onProgress(processed, uniqueCards.length, {
              enriched: processed - errors.length,
              errors: errors.length,
              cacheHits: scryfallCache.size
            });
          }
        }
      }

      // Small delay between batches
      if (i + batchSize < uniqueCards.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } catch (batchError) {
      console.error(`❌ Batch error processing cards ${i}-${i + batchSize}:`, batchError);
      
      // Add failed cards as-is
      for (const card of batch) {
        enrichedCards.push(card);
        errors.push({
          card: card.name,
          error: batchError.message
        });
      }
    }
  }

  // Restore original quantities for duplicate cards
  const finalCards = restoreCardQuantities(cards, enrichedCards);

  if (errors.length > 0) {
    console.warn(`⚠️ ${errors.length} cards failed to enrich:`, errors.slice(0, 5));
  }

  return finalCards;
}

/**
 * Checks if a card has all the essential data we need
 * @param {Object} card - The card to check
 * @returns {boolean} - True if card has complete data
 */
function hasCompleteData(card) {
  return Boolean(
    card.type_line && 
    card.color_identity !== undefined &&
    card.set_name &&
    card.mana_cost !== undefined &&
    card.cmc !== undefined
  );
}

/**
 * Fetches card data from Scryfall API with caching and improved error handling
 * @param {Object} card - The card to lookup
 * @returns {Object|null} - Scryfall card data or null if not found
 */
async function fetchCardFromScryfall(card) {
  // Create cache key
  const cacheKey = createCacheKey(card);
  
  // Check cache first
  if (scryfallCache.has(cacheKey)) {
    return scryfallCache.get(cacheKey);
  }

  let scryfallUrl = '';
  
  // Try specific printing first (most accurate)
  if (card.set && card.collector_number) {
    scryfallUrl = `https://api.scryfall.com/cards/${card.set.toLowerCase()}/${card.collector_number}`;
  } 
  // Fallback to exact name search
  else if (card.name) {
    scryfallUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}`;
  }

  if (!scryfallUrl) {
    return null;
  }

  try {
    const response = await fetch(scryfallUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ConstantLists/1.0'
      }
    });
    
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '2';
      throw new Error(`Rate limited, retry after ${retryAfter}s`);
    }
    
    if (!response.ok) {
      // If specific printing fails, try name search
      if (card.set && card.collector_number && response.status === 404) {
        return await fetchCardByName(card.name);
      }
      
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      return null;
    }

    const data = await response.json();
    
    // Cache successful results
    scryfallCache.set(cacheKey, data);
    
    return data;
  } catch (error) {
    // Don't log every single error to avoid console spam
    if (!error.message.includes('Failed to fetch')) {
      console.warn(`Scryfall API error for ${card.name}:`, error.message);
    }
    throw error; // Re-throw for retry logic
  }
}

/**
 * Fetches card data by name only (fallback method)
 * @param {string} name - Card name
 * @returns {Object|null} - Scryfall card data or null if not found
 */
async function fetchCardByName(name) {
  const cacheKey = `name:${name}`;
  
  if (scryfallCache.has(cacheKey)) {
    return scryfallCache.get(cacheKey);
  }

  try {
    const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ConstantLists/1.0'
      }
    });
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '2';
      throw new Error(`Rate limited, retry after ${retryAfter}s`);
    }
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    scryfallCache.set(cacheKey, data);
    return data;
  } catch (error) {
    if (!error.message.includes('Failed to fetch')) {
      console.warn(`Name search error for ${name}:`, error.message);
    }
    throw error;
  }
}

/**
 * Merges original card data with Scryfall data
 * @param {Object} originalCard - Original card data
 * @param {Object} scryfallData - Scryfall API response
 * @returns {Object} - Merged card data
 */
function mergeCardData(originalCard, scryfallData) {
  return {
    ...originalCard,
    // Preserve original data but fill in missing fields
    type_line: originalCard.type_line || scryfallData.type_line,
    color_identity: originalCard.color_identity || scryfallData.color_identity || [],
    colors: originalCard.colors || scryfallData.colors || [],
    set_name: originalCard.set_name || scryfallData.set_name,
    mana_cost: originalCard.mana_cost || scryfallData.mana_cost || '',
    cmc: originalCard.cmc !== undefined ? originalCard.cmc : scryfallData.cmc || 0,
    rarity: originalCard.rarity || scryfallData.rarity,
    oracle_text: originalCard.oracle_text || scryfallData.oracle_text,
    power: originalCard.power || scryfallData.power,
    toughness: originalCard.toughness || scryfallData.toughness,
    loyalty: originalCard.loyalty || scryfallData.loyalty,
    // Add scryfall_json for future reference
    scryfall_json: scryfallData,
    // Mark as enriched
    enriched: true,
    enrichedAt: new Date().toISOString()
  };
}

/**
 * Creates a cache key for the card
 * @param {Object} card - The card
 * @returns {string} - Cache key
 */
function createCacheKey(card) {
  if (card.set && card.collector_number) {
    return `${card.set.toLowerCase()}:${card.collector_number}`;
  }
  return `name:${card.name}`;
}

/**
 * Processes imported cards to ensure they have complete data
 * This is the main function to be called from import flows
 * @param {Array} cards - Imported cards
 * @param {Object} options - Options for processing
 * @returns {Array} - Processed cards with complete data
 */
export async function processImportedCards(cards, options = {}) {
  const { 
    showProgress = true, 
    batchSize = 50,
    skipEnrichment = false 
  } = options;

  if (!Array.isArray(cards) || cards.length === 0) {
    return cards;
  }

  console.log(`🔧 Processing ${cards.length} imported cards...`);

  // If enrichment is skipped, just return processed cards
  if (skipEnrichment) {
    return cards.map(card => ({
      ...card,
      dateAdded: card.dateAdded || new Date().toISOString(),
      source: card.source || 'import'
    }));
  }

  // Show progress toast if enabled
  let progressToast;
  if (showProgress) {
    progressToast = toast.info('Enriching card data...', { autoClose: false });
  }

  try {
    const enrichedCards = await enrichCardsBatch(cards, (completed, total) => {
      if (showProgress) {
        toast.update(progressToast, {
          render: `Enriching card data... ${completed}/${total}`,
          type: 'info'
        });
      }
    });

    if (showProgress) {
      toast.update(progressToast, {
        render: `✅ Enriched ${enrichedCards.length} cards with complete data!`,
        type: 'success',
        autoClose: 3000
      });
    }

    console.log(`✅ Card processing complete: ${enrichedCards.length} cards enriched`);
    return enrichedCards;

  } catch (error) {
    console.error('Error processing imported cards:', error);
    
    if (showProgress) {
      toast.update(progressToast, {
        render: 'Error enriching card data',
        type: 'error',
        autoClose: 3000
      });
    }
    
    // Return original cards if enrichment fails
    return cards;
  }
}

/**
 * Clear the Scryfall cache (useful for testing or memory management)
 */
export function clearScryfallCache() {
  scryfallCache.clear();
  console.log('🗑️ Scryfall cache cleared');
}

/**
 * Deduplicates cards to avoid redundant API calls
 * @param {Array} cards - Array of cards
 * @returns {Array} - Unique cards with aggregated quantities
 */
function deduplicateCards(cards) {
  const cardMap = new Map();
  
  for (const card of cards) {
    const key = createCacheKey(card);
    
    if (cardMap.has(key)) {
      // Aggregate quantities for duplicate cards
      const existing = cardMap.get(key);
      existing.quantity = (existing.quantity || 1) + (card.quantity || 1);
      existing._duplicates = (existing._duplicates || 1) + 1;
    } else {
      cardMap.set(key, { ...card, _duplicates: 1 });
    }
  }
  
  return Array.from(cardMap.values());
}

/**
 * Restores original card quantities after enrichment
 * @param {Array} originalCards - Original cards with duplicates
 * @param {Array} uniqueCards - Enriched unique cards
 * @returns {Array} - Cards with restored quantities
 */
function restoreCardQuantities(originalCards, uniqueCards) {
  const enrichedMap = new Map();
  
  // Index enriched cards by cache key
  for (const card of uniqueCards) {
    const key = createCacheKey(card);
    enrichedMap.set(key, card);
  }
  
  // Restore original structure with enriched data
  return originalCards.map(originalCard => {
    const key = createCacheKey(originalCard);
    const enrichedCard = enrichedMap.get(key);
    
    if (enrichedCard) {
      return {
        ...enrichedCard,
        quantity: originalCard.quantity, // Restore original quantity
        id: originalCard.id,             // Preserve original ID
        dateAdded: originalCard.dateAdded || new Date().toISOString()
      };
    }
    
    return originalCard;
  });
}

/**
 * Compresses card data for storage by removing unnecessary fields
 * @param {Array} cards - Cards to compress
 * @returns {Array} - Compressed cards
 */
export function compressCardsForStorage(cards) {
  return cards.map(card => {
    // Remove or minimize heavy data fields for storage
    const compressed = { ...card };
    
    // Keep only essential scryfall data
    if (compressed.scryfall_json) {
      compressed.scryfall_json = {
        id: compressed.scryfall_json.id,
        uri: compressed.scryfall_json.uri,
        image_uris: compressed.scryfall_json.image_uris,
        prices: compressed.scryfall_json.prices
      };
    }
    
    // Remove internal processing fields
    delete compressed._duplicates;
    delete compressed.enrichedAt;
    
    return compressed;
  });
}

/**
 * Get cache statistics and performance metrics
 * @returns {Object} - Cache stats and performance info
 */
export function getCacheStats() {
  return {
    size: scryfallCache.size,
    activeRequests: activeRequests,
    queueLength: requestQueue.length,
    memoryUsage: {
      cache: Math.round(JSON.stringify(Array.from(scryfallCache.entries())).length / 1024) + 'KB',
      cacheEntries: scryfallCache.size
    },
    keys: Array.from(scryfallCache.keys()).slice(0, 10) // Show first 10 keys
  };
}

/**
 * Clears cache and resets rate limiting state
 */
export function resetEnrichmentSystem() {
  scryfallCache.clear();
  requestQueue.length = 0;
  activeRequests = 0;
  lastRequestTime = 0;
  console.log('🔄 Enrichment system reset');
}