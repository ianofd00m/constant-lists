// Card Data Enrichment Utility
// This utility ensures all imported cards have complete data including type_line, color_identity, etc.

import { toast } from 'react-toastify';

// Cache for Scryfall lookups to avoid duplicate API calls
const scryfallCache = new Map();

// Rate limiting and retry configuration
const RATE_LIMIT = {
  maxRequestsPerSecond: 9.5, // Closer to Scryfall's 10/sec limit but safe
  maxConcurrent: 5,          // Increase concurrent requests (Scryfall can handle this)
  retryAttempts: 2,          // Reduce retries (most 404s won't succeed anyway)
  baseDelay: 105,            // Slightly faster base delay (9.5 req/sec)
  retryDelay: 800,           // Faster retry delay
  backoffMultiplier: 1.8     // Less aggressive backoff
};

// Track active requests for rate limiting
let activeRequests = 0;
let lastRequestTime = 0;
let requestQueue = [];

// Session-level cache for cards (survives multiple imports in same session)
const sessionCache = new Map();
let cacheHits = 0;

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

  // Check session cache first (huge time saver for duplicates)
  const cacheKey = `${card.name}|${card.set}|${card.collector_number}`;
  const cachedCard = sessionCache.get(cacheKey);
  if (cachedCard) {
    cacheHits++;
    return { ...cachedCard, quantity: card.quantity }; // Preserve original quantity
  }

  try {
    // Try to get data from Scryfall API
    const scryfallData = await fetchCardFromScryfall(card);
    
    if (scryfallData) {
      const enrichedCard = mergeCardData(card, scryfallData);
      
      // Cache the result for future use (without quantity to avoid conflicts)
      const cacheVersion = { ...enrichedCard };
      delete cacheVersion.quantity;
      sessionCache.set(cacheKey, cacheVersion);
      
      return enrichedCard;
    }
  } catch (error) {
    if (error.message.includes('Card not found')) {
      // 404 - card doesn't exist with this exact printing
      console.log(`📝 ${card.name} (${card.set}/${card.collector_number}) not found in Scryfall, using basic data`);
      
      // Return card with basic data structure for consistency
      return {
        ...card,
        enrichment_status: 'not_found',
        enrichment_note: 'Card printing not found in Scryfall database'
      };
    } else {
      // Other API errors (network, rate limit, etc.)
      console.warn(`⚠️ Failed to enrich ${card.name}:`, error.message);
      
      return {
        ...card,
        enrichment_status: 'failed',
        enrichment_note: `API error: ${error.message}`
      };
    }
  }

  return {
    ...card,
    enrichment_status: 'no_data',
    enrichment_note: 'No additional data available'
  };
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
    // Handle 404s differently - they're expected for some cards
    if (error.message.includes('404') || (error.response && error.response.status === 404)) {
      console.log(`ℹ️ Card not found in Scryfall: ${context.cardName || 'unknown'} - this is normal for some promotional/limited cards`);
      reject(new Error(`Card not found: ${context.cardName || 'unknown'}`));
      return;
    }
    
    // Implement exponential backoff for retries (network issues, rate limits)
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
      console.warn(`❌ API call failed permanently: ${error.message}`);
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
    maxConcurrent = 5,                     // Increased concurrency 
    enableRetries = true,                  // Enable retry logic
    isLargeImport = false                  // Optimize for very large imports (>5000 cards)
  } = options;

  // Set batch size and progress interval based on import size
  const batchSize = isLargeImport ? 40 : 25;  // Larger batches for big imports
  const progressInterval = isLargeImport ? 200 : 50; // Less frequent progress updates for large imports

  const enrichedCards = [];
  const errors = [];
  let processed = 0;

  // Deduplicate cards to avoid unnecessary API calls
  const uniqueCards = deduplicateCards(cards);
  console.log(`📊 Processing ${uniqueCards.length} unique cards (${cards.length} total)`);

  // Optimize settings for very large imports
  let adjustedBatchSize = batchSize;
  let adjustedProgressInterval = progressInterval;
  
  if (isLargeImport && cards.length > 5000) {
    console.log('� Optimizing for large import (>5000 cards) - using aggressive performance settings');
    adjustedBatchSize = 50; // Larger batches for better throughput
    adjustedProgressInterval = Math.max(progressInterval, 250); // Less frequent updates
    
    // Log performance expectations
    const estimatedTime = Math.ceil(uniqueCards.length / (RATE_LIMIT.maxRequestsPerSecond * 60));
    console.log(`📊 Estimated processing time: ~${estimatedTime} minutes for ${uniqueCards.length} unique cards`);
  }

  // Process cards in optimized batches
  for (let i = 0; i < uniqueCards.length; i += adjustedBatchSize) {
    const batch = uniqueCards.slice(i, i + adjustedBatchSize);
    
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

      // Process results with better error categorization
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const originalCard = batch[j];
        
        if (result.status === 'fulfilled') {
          const enrichedCard = result.value;
          enrichedCards.push(enrichedCard);
          
          // Track enrichment issues for reporting
          if (enrichedCard.enrichment_status === 'not_found') {
            errors.push({
              card: originalCard.name,
              type: '404_not_found',
              error: 'Card printing not in Scryfall database (normal for some promotional cards)'
            });
          } else if (enrichedCard.enrichment_status === 'failed') {
            errors.push({
              card: originalCard.name,
              type: 'api_error', 
              error: enrichedCard.enrichment_note
            });
          }
        } else {
          // Enrichment completely failed
          const isNotFound = result.reason?.message?.includes('Card not found') || 
                           result.reason?.message?.includes('404');
          
          enrichedCards.push({
            ...originalCard,
            enrichment_status: isNotFound ? 'not_found' : 'failed',
            enrichment_note: result.reason?.message || 'Unknown enrichment error'
          });
          
          errors.push({
            card: originalCard.name,
            type: isNotFound ? '404_not_found' : 'api_error',
            error: result.reason?.message || 'Unknown error'
          });
        }
        
        processed++;
        
        // Update progress periodically
        if (processed % adjustedProgressInterval === 0 || processed === uniqueCards.length) {
          if (onProgress) {
            onProgress(processed, uniqueCards.length, {
              enriched: processed - errors.length,
              errors: errors.length,
              cacheHits: cacheHits,
              cacheSize: sessionCache.size
            });
          }
        }
      }

      // Minimal delay between batches for large imports
      if (i + adjustedBatchSize < uniqueCards.length) {
        const batchDelay = isLargeImport ? 50 : 200; // Much faster for large imports
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }

    } catch (batchError) {
      console.error(`❌ Batch error processing cards ${i}-${i + adjustedBatchSize}:`, batchError);
      
      // Add failed cards as-is
      for (const card of batch) {
        enrichedCards.push(card);
        errors.push({
          card: card.name,
          type: 'batch_error',
          error: batchError.message
        });
      }
    }
  }

  // Restore original quantities for duplicate cards
  const finalCards = restoreCardQuantities(cards, enrichedCards);

  // Generate comprehensive error summary
  if (errors.length > 0) {
    const errorTypes = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {});

    console.log(`📊 Import Summary for ${cards.length} cards:`);
    console.log(`   ✅ Successfully processed: ${finalCards.length - errors.length}`);
    console.log(`   🚀 Cache hits: ${cacheHits} (saved ${cacheHits} API calls)`);
    console.log(`   💾 Session cache size: ${sessionCache.size} unique cards`);
    
    if (errorTypes['404_not_found']) {
      console.log(`   📝 Cards not found in Scryfall: ${errorTypes['404_not_found']} (normal for promotional/limited cards)`);
    }
    
    if (errorTypes['api_error']) {
      console.log(`   ❌ API errors: ${errorTypes['api_error']}`);
    }

    // Show a few examples of 404s for user awareness
    const notFoundCards = errors.filter(e => e.type === '404_not_found').slice(0, 3);
    if (notFoundCards.length > 0) {
      console.log(`   📋 Example cards not found: ${notFoundCards.map(e => e.card).join(', ')}`);
    }
    
    // Performance metrics
    const actualApiCalls = uniqueCards.length - cacheHits;
    const timeSaved = cacheHits * 0.11; // ~110ms per API call saved
    console.log(`   ⚡ Performance: ${actualApiCalls} API calls made, saved ~${timeSaved.toFixed(1)}s with caching`);
  } else {
    console.log(`✅ All ${cards.length} cards processed successfully!`);
    console.log(`🚀 Cache performance: ${cacheHits} hits, ${sessionCache.size} entries`);
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
 * Normalizes collector numbers for Scryfall API compatibility
 * EchoMTG exports "018" but Scryfall uses "18"
 * @param {string} collectorNumber - The collector number to normalize
 * @returns {string} - Normalized collector number
 */
function normalizeCollectorNumber(collectorNumber) {
  if (!collectorNumber || typeof collectorNumber !== 'string') {
    return collectorNumber;
  }
  
  // Remove leading zeros, but keep letters and special characters
  // "018" -> "18", "018a" -> "18a", "★001" -> "★1"
  return collectorNumber.replace(/^0+([0-9])/, '$1');
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
    // Normalize collector number - remove leading zeros for Scryfall
    const normalizedNumber = normalizeCollectorNumber(card.collector_number);
    
    if (normalizedNumber !== card.collector_number) {
      console.log(`🔧 Normalizing collector number for ${card.name}: "${card.collector_number}" -> "${normalizedNumber}"`);
    }
    
    scryfallUrl = `https://api.scryfall.com/cards/${card.set.toLowerCase()}/${normalizedNumber}`;
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
      // If specific printing fails, try fallback strategies
      if (card.set && card.collector_number && response.status === 404) {
        const originalNumber = card.collector_number;
        const normalizedNumber = normalizeCollectorNumber(originalNumber);
        
        console.log(`🔍 Card not found: ${card.name} (${card.set}/${originalNumber})`);
        
        // Try with original collector number if we normalized it
        if (originalNumber !== normalizedNumber) {
          console.log(`   🔄 Trying original collector number: ${originalNumber}`);
          const fallbackUrl = `https://api.scryfall.com/cards/${card.set.toLowerCase()}/${originalNumber}`;
          
          try {
            const fallbackResponse = await fetch(fallbackUrl);
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              console.log(`   ✅ Found with original collector number!`);
              scryfallCache.set(cacheKey, fallbackData);
              return fallbackData;
            }
          } catch (fallbackError) {
            console.log(`   ❌ Original collector number also failed`);
          }
        }
        
        // Final fallback: name search
        console.log(`   🔄 Trying name-only search for: ${card.name}`);
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