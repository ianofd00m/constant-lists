/**
 * Debug logger for DeckViewEdit component
 * 
 * This file adds a small logging utility that can be imported
 * to log card structures and debug grouping and sorting issues
 */

// Maximum number of cards to log to avoid console spam
const MAX_CARDS_TO_LOG = 3;

// Debug flag - set to true to enable verbose logging
const DEBUG_ENABLED = false;

/**
 * Log card structure details
 * @param {Object|String} cardObj - The card object to log
 * @param {String} prefix - Optional prefix for the log message
 */
export function logCardStructure(cardObj, prefix = 'Card') {
  if (!DEBUG_ENABLED) return;
  
  try {
    if (!cardObj) {
      console.log(`[DEBUG] ${prefix}: null or undefined`);
      return;
    }
    
    if (typeof cardObj === 'string') {
      console.log(`[DEBUG] ${prefix} (string): ${cardObj}`);
      return;
    }
    
    const name = cardObj.card?.name || cardObj.name || 'Unknown';
    const structure = cardObj.card ? 'Nested' : 'Flat';
    let manaValue = null;
    let price = null;
    
    // Extract mana value
    if (cardObj.cmc !== undefined) {
      manaValue = cardObj.cmc;
    } else if (cardObj.card?.cmc !== undefined) {
      manaValue = cardObj.card.cmc;
    } else if (cardObj.card?.scryfall_json?.cmc !== undefined) {
      manaValue = cardObj.card.scryfall_json.cmc;
    } else if (cardObj.scryfall_json?.cmc !== undefined) {
      manaValue = cardObj.scryfall_json.cmc;
    }
    
    // Extract price
    if (cardObj.card?.prices?.usd) {
      price = cardObj.card.prices.usd;
    } else if (cardObj.card?.scryfall_json?.prices?.usd) {
      price = cardObj.card.scryfall_json.prices.usd;
    } else if (cardObj.prices?.usd) {
      price = cardObj.prices.usd;
    } else if (cardObj.scryfall_json?.prices?.usd) {
      price = cardObj.scryfall_json.prices.usd;
    } else if (cardObj.price) {
      price = cardObj.price;
    }
    
    console.log(`[DEBUG] ${prefix} "${name}" (${structure}): MV=${manaValue !== null ? manaValue : 'Unknown'}, Price=${price !== null ? price : 'Unknown'}`);
    
  } catch (error) {
    console.error(`[DEBUG] Error logging card structure:`, error);
  }
}

/**
 * Log details for a group of cards
 * @param {Array} cards - Array of card objects
 * @param {String} groupName - Name of the group
 */
export function logCardGroup(cards, groupName) {
  if (!DEBUG_ENABLED) return;
  
  try {
    if (!Array.isArray(cards) || cards.length === 0) {
      console.log(`[DEBUG] Group "${groupName}": Empty`);
      return;
    }
    
    console.log(`[DEBUG] Group "${groupName}": ${cards.length} cards`);
    
    // Log a sample of cards
    for (let i = 0; i < Math.min(cards.length, MAX_CARDS_TO_LOG); i++) {
      logCardStructure(cards[i], `  ${i+1}.`);
    }
    
    if (cards.length > MAX_CARDS_TO_LOG) {
      console.log(`[DEBUG]   ... and ${cards.length - MAX_CARDS_TO_LOG} more cards`);
    }
    
  } catch (error) {
    console.error(`[DEBUG] Error logging card group:`, error);
  }
}

/**
 * Add this debug logger to a component
 * Just import and call at key points during rendering
 */
export default {
  logCardStructure,
  logCardGroup
};
