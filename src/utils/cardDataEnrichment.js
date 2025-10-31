// Card Data Enrichment Utility
// This utility ensures all imported cards have complete data including type_line, color_identity, etc.

import { toast } from 'react-toastify';

// Cache for Scryfall lookups to avoid duplicate API calls
const scryfallCache = new Map();

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
 * Enriches multiple cards in batches to respect API rate limits
 * @param {Array} cards - Array of cards to enrich
 * @param {Function} onProgress - Optional progress callback
 * @returns {Array} - Enriched cards
 */
export async function enrichCardsBatch(cards, onProgress) {
  const enrichedCards = [];
  const batchSize = 10; // Process in small batches
  const delay = 150; // Delay between requests (respecting Scryfall's rate limit)

  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);
    const enrichedBatch = await Promise.all(
      batch.map(card => enrichCardData(card))
    );
    
    enrichedCards.push(...enrichedBatch);
    
    // Progress callback
    if (onProgress) {
      onProgress(enrichedCards.length, cards.length);
    }
    
    // Delay to respect rate limits (except for last batch)
    if (i + batchSize < cards.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return enrichedCards;
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
 * Fetches card data from Scryfall API with caching
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
    const response = await fetch(scryfallUrl);
    
    if (!response.ok) {
      // If specific printing fails, try name search
      if (card.set && card.collector_number && response.status === 404) {
        return await fetchCardByName(card.name);
      }
      return null;
    }

    const data = await response.json();
    
    // Cache the result
    scryfallCache.set(cacheKey, data);
    
    return data;
  } catch (error) {
    console.warn(`Scryfall API error for ${card.name}:`, error.message);
    return null;
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
    const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    scryfallCache.set(cacheKey, data);
    return data;
  } catch (error) {
    return null;
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
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
export function getCacheStats() {
  return {
    size: scryfallCache.size,
    keys: Array.from(scryfallCache.keys()).slice(0, 10) // Show first 10 keys
  };
}