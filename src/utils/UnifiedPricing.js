// Unified Pricing Utility - Single source of truth for all card pricing
// This utility ensures consistent pricing across all areas of the application

/**
 * Validates if a modal price is properly formatted and within reasonable bounds
 * @param {string|number} price - The price to validate
 * @returns {boolean} True if the price is valid
 */
export const isValidModalPrice = (price) => {
  if (!price && price !== 0) return false;
  const numPrice = parseFloat(price.toString().replace(/^\$/, ''));
  return !isNaN(numPrice) && numPrice >= 0 && numPrice <= 1000;
};

/**
 * Recursively searches through nested object structures to find a value
 * Handles complex nested card data structures from different sources
 * @param {object} obj - The object to search through
 * @param {string} path - Dot-notation path (e.g., 'scryfall_json.prices.usd')
 * @param {number} maxDepth - Maximum recursion depth to prevent infinite loops
 * @returns {any} The found value or null
 */
const findNestedValue = (obj, path, maxDepth = 10) => {
  if (!obj || typeof obj !== 'object' || maxDepth <= 0) return null;
  
  // Try direct path first
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      current = null;
      break;
    }
  }
  if (current !== null && current !== undefined) return current;
  
  // If direct path fails, search recursively through nested structures
  const searchRecursively = (obj, targetKey, depth = 0) => {
    if (depth >= maxDepth) return null;
    if (!obj || typeof obj !== 'object') return null;
    
    // Check if this object has the target key
    if (targetKey in obj && obj[targetKey] !== null && obj[targetKey] !== undefined) {
      return obj[targetKey];
    }
    
    // Search through nested objects
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object') {
        const result = searchRecursively(value, targetKey, depth + 1);
        if (result !== null && result !== undefined) return result;
      }
    }
    return null;
  };
  
  const finalKey = keys[keys.length - 1];
  return searchRecursively(obj, finalKey);
};

/**
 * Determines the foil status of a card from various possible locations
 * @param {object} cardData - The card data object
 * @returns {boolean} True if the card is foil
 */
const determineFoilStatus = (cardData) => {
  return findNestedValue(cardData, 'foil') === true;
};

/**
 * Determines if a card is foil-only based on its finishes and availability
 * @param {object} cardData - The card data object (should be scryfall_json or similar)
 * @returns {boolean} True if the card is only available in foil
 */
const isFoilOnlyCard = (cardData) => {
  if (!cardData) return false;
  
  // Check explicit foil/nonfoil flags
  if (cardData.foil === true && cardData.nonfoil === false) {
    return true;
  }
  
  // Check finishes array
  const finishes = cardData.finishes || [];
  return finishes.includes('foil') && !finishes.includes('nonfoil');
};

/**
 * Determines card finish type (normal, foil, etched, etc.)
 * @param {object} cardData - The card data object
 * @param {boolean} isFoil - Whether the card instance is foil
 * @returns {object} Finish information including type and display name
 */
const determineCardFinish = (cardData, isFoil) => {
  if (!cardData) return { type: 'normal', display: 'Normal' };
  
  const finishes = cardData.finishes || [];
  const promoTypes = cardData.promo_types || [];
  const frameEffects = cardData.frame_effects || [];
  
  // Check for etched finish
  const isEtched = finishes.includes('etched') || frameEffects.includes('etched');
  
  // Check for special finishes
  const hasSpecialFinish = promoTypes.some(type => 
    ['surgefoil', 'rainbow', 'textured', 'boosterfun'].includes(type)
  );
  
  if (isFoil) {
    if (isEtched) {
      return { type: 'etched', display: 'Etched' };
    } else if (hasSpecialFinish) {
      return { type: 'special_foil', display: 'Special Foil' };
    } else {
      return { type: 'foil', display: 'Foil' };
    }
  } else {
    return { type: 'normal', display: 'Normal' };
  }
};

/**
 * Basic land preferred printings for consistent fallback pricing
 */
const BASIC_LAND_PRINTINGS = {
  "Forest": "d232fcc2-12f6-401a-b1aa-ddff11cb9378",
  "Island": "23635e40-d040-40b7-8b98-90ed362aa028", 
  "Mountain": "1edc5050-69bd-416d-b04c-7f82de2a1901",
  "Plains": "4ef17ed4-a9b5-4b8e-b4cb-2ecb7e5898c3",
  "Swamp": "13505c15-14e0-4200-82bd-fb9bce949e68",
  "Wastes": "60682c00-c661-4a9d-8326-f3f014a04e3e",
  "Snow-Covered Forest": "838c915d-8153-43c2-b513-dfbe4e9388a5",
  "Snow-Covered Island": "6abf0692-07d1-4b72-af06-93d0e338589d",
  "Snow-Covered Mountain": "0dc9a6d1-a1ca-4b8f-894d-71c2a9933f79",
  "Snow-Covered Plains": "b1e3a010-dae3-41b6-8dd8-e31d14c3ac4a",
  "Snow-Covered Swamp": "c4dacaf1-09b8-42bb-8064-990190fdaf81",
  "Snow-Covered Wastes": "ad21a874-525e-4d11-bd8e-bc44918bec40"
};

/**
 * UNIFIED CARD PRICING FUNCTION
 * This is the single source of truth for all card pricing in the application
 * 
 * @param {object} cardData - The card data object (can be from any source/structure)
 * @param {object} options - Pricing options
 * @param {boolean} options.preferStoredPrice - Whether to prefer stored modal prices
 * @param {string} options.fallbackPrice - Fallback price if no price found
 * @param {boolean} options.debugLogging - Whether to log debugging information
 * @returns {object} Pricing result with price, source, and metadata
 */
export const getUnifiedCardPrice = (cardData, options = {}) => {
  const {
    preferStoredPrice = true,
    fallbackPrice = null,
    debugLogging = false
  } = options;
  
  if (!cardData || typeof cardData !== 'object') {
    return {
      price: fallbackPrice,
      source: 'invalid_card_object',
      cardType: 'unknown',
      finishType: 'normal',
      isValid: false,
      metadata: { error: 'Invalid card data' }
    };
  }
  
  const cardName = findNestedValue(cardData, 'name') || 'Unknown Card';
  const debugLog = debugLogging ? console.log : () => {};
  
  debugLog(`[UNIFIED PRICING] Processing: ${cardName}`);
  
  // Step 1: Check for stored modal price (highest priority if preferStoredPrice is true)
  if (preferStoredPrice) {
    const storedModalPrice = findNestedValue(cardData, 'modalPrice');
    if (isValidModalPrice(storedModalPrice)) {
      const isFoil = determineFoilStatus(cardData);
      const finish = determineCardFinish(cardData, isFoil);
      
      debugLog(`[UNIFIED PRICING] Using stored modal price: $${storedModalPrice}`);
      return {
        price: storedModalPrice,
        source: 'stored_modal_price',
        cardType: finish.type,
        finishType: finish.display,
        isValid: true,
        metadata: {
          cardName,
          isFoil,
          wasStored: true
        }
      };
    }
  }
  
  // Step 2: Extract Scryfall pricing data
  const scryfallData = findNestedValue(cardData, 'scryfall_json') || {};
  const prices = scryfallData.prices || findNestedValue(cardData, 'prices') || {};
  
  // Check for basic land and prepare fallback data
  const typeLine = findNestedValue(cardData, 'type_line') || '';
  const isBasicLand = typeLine.toLowerCase().includes('basic land') || 
                     BASIC_LAND_PRINTINGS[cardName];
  
  const hasPriceData = prices && Object.keys(prices).length > 0;
  
  if (!hasPriceData) {
    debugLog(`[UNIFIED PRICING] No price data found for ${cardName}`);
  }
  
  // Step 3: Determine foil status and card characteristics
  const isFoil = determineFoilStatus(cardData);
  const isFoilOnly = isFoilOnlyCard(scryfallData);
  const finish = determineCardFinish(scryfallData, isFoil || isFoilOnly);
  
  debugLog(`[UNIFIED PRICING] Card characteristics:`, {
    isFoil,
    isFoilOnly,
    finish: finish.type
  });
  
  // Step 4: Select appropriate price based on card characteristics
  let price = null;
  let source = 'not_found';
  
  // Only try to extract pricing if we have price data
  if (hasPriceData) {
    // Handle foil-only cards (always use foil pricing regardless of explicit foil flag)
    if (isFoilOnly) {
      switch (finish.type) {
        case 'etched':
          price = prices.usd_etched || prices.usd_foil || prices.usd || null;
          source = 'foil_only_etched';
          break;
        case 'special_foil':
          price = prices.usd_foil || prices.usd || null;
          source = 'foil_only_special';
          break;
        default:
          price = prices.usd_foil || prices.usd || null;
          source = 'foil_only_regular';
      }
    }
    // Handle explicitly foil cards
    else if (isFoil) {
      switch (finish.type) {
        case 'etched':
          price = prices.usd_etched || prices.usd_foil || prices.usd || null;
          source = 'explicit_foil_etched';
          break;
        case 'special_foil':
          price = prices.usd_foil || prices.usd || null;
          source = 'explicit_foil_special';
          break;
        default:
          price = prices.usd_foil || prices.usd || null;
          source = 'explicit_foil_regular';
      }
    }
    // Handle non-foil cards
    else {
      price = prices.usd || null;
      source = 'regular_usd';
    }
  }
  
  // Step 5: Legacy fallback search (check direct price field first)
  if (!price) {
    // Check for direct price field (common in imported card data)
    const directPrice = cardData.price || cardData.usd;
    const legacyPrice = directPrice || findNestedValue(cardData, 'price') || 
                       findNestedValue(cardData, 'usd');
    if (legacyPrice && isValidModalPrice(legacyPrice)) {
      price = legacyPrice.toString();
      source = 'legacy_fallback';
      debugLog(`[UNIFIED PRICING] Applied legacy fallback: $${price}`);
    }
  }

  // Step 6: Basic land fallback 
  if (!price && isBasicLand) {
    price = '0.10';
    source = 'basic_land_fallback';
    debugLog(`[UNIFIED PRICING] Applied basic land fallback: $${price}`);
  }

  // Step 7: Reasonable fallback for common cards without pricing
  if (!price && !isBasicLand) {
    // For cards without any pricing data, use a small fallback
    // This prevents "N/A" from showing everywhere while still indicating missing data
    const typeLine = findNestedValue(cardData, 'type_line') || '';
    
    // Different fallbacks based on card type
    if (typeLine.toLowerCase().includes('token')) {
      price = '0.00';
      source = 'token_fallback';
      debugLog(`[UNIFIED PRICING] Applied token fallback: $${price}`);
    } else if (typeLine.toLowerCase().includes('basic land')) {
      // This should already be handled above, but just in case
      price = '0.10';
      source = 'basic_land_secondary_fallback';
      debugLog(`[UNIFIED PRICING] Applied basic land secondary fallback: $${price}`);
    } else {
      // For other cards, use a minimal fallback to indicate "needs pricing data"
      price = '0.05';
      source = 'generic_fallback';
      debugLog(`[UNIFIED PRICING] Applied generic fallback (missing data): $${price}`);
    }
  }
  
  // Step 8: Final fallback
  if (!price && fallbackPrice) {
    price = fallbackPrice;
    source = 'provided_fallback';
    debugLog(`[UNIFIED PRICING] Applied provided fallback: $${price}`);
  }
  
  // Step 9: Last resort fallback - prevent N/A when no other options
  if (!price && !fallbackPrice) {
    // If we still don't have a price, we need to return null to show N/A
    // This preserves the behavior where cards without data show N/A
    debugLog(`[UNIFIED PRICING] No price available for ${cardName}`);
  }
  
  const finalPrice = price;
  const isValid = isValidModalPrice(finalPrice);
  
  debugLog(`[UNIFIED PRICING] Final result for ${cardName}:`, {
    price: finalPrice,
    source,
    cardType: finish.type,
    isValid
  });
  
  return {
    price: finalPrice,
    source,
    cardType: finish.type,
    finishType: finish.display,
    isValid,
    metadata: {
      cardName,
      isFoil: isFoil || isFoilOnly,
      isFoilOnly,
      availablePrices: Object.keys(prices),
      scryfallId: scryfallData.id,
      finishes: scryfallData.finishes || []
    }
  };
};

/**
 * Formats a price for display with consistent formatting
 * @param {string|number} price - The price to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted price string
 */
export const formatPrice = (price, options = {}) => {
  const { showCurrency = true, precision = 2 } = options;
  
  if (!price && price !== 0) return 'N/A';
  
  const numPrice = parseFloat(price.toString().replace(/^\$/, ''));
  if (isNaN(numPrice)) return 'N/A';
  
  const formatted = numPrice.toFixed(precision);
  return showCurrency ? `$${formatted}` : formatted;
};

/**
 * Convenience function for getting price with debug logging
 * Useful for development and troubleshooting
 */
export const debugGetCardPrice = (cardData, options = {}) => {
  return getUnifiedCardPrice(cardData, { ...options, debugLogging: true });
};

export default {
  getUnifiedCardPrice,
  formatPrice,
  debugGetCardPrice,
  isValidModalPrice
};
