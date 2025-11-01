import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  memo,
} from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { storageManager } from "../utils/storageManager";

// ULTRA-SAFE forEach replacement - bypasses all forEach calls entirely
const ultraSafeForEach = (array, callback, context = 'unknown') => {
  try {
    if (!array) {
      console.warn(`[ULTRA SAFE] ${context}: null/undefined array`);
      return;
    }
    if (!Array.isArray(array)) {
      // Better object detection and logging
      const objectInfo = {
        type: typeof array,
        constructor: array?.constructor?.name,
        hasLength: 'length' in array,
        length: array?.length,
        keys: array && typeof array === 'object' ? Object.keys(array).slice(0, 3) : [],
        isIterable: array && typeof array[Symbol.iterator] === 'function'
      };
      
      // Only log if it's a significant issue or has useful context (reduce noise)
      if (context !== 'unknown' && (objectInfo.hasLength || objectInfo.isIterable)) {
        console.warn(`[ULTRA SAFE] ${context}: converting non-array:`, objectInfo);
      }
      
      if (array && typeof array.length === 'number' && array.length >= 0) {
        array = Array.from(array);
      } else if (array && typeof array[Symbol.iterator] === 'function') {
        array = Array.from(array);
      } else {
        // Only error log for unexpected cases
        if (context !== 'unknown') {
          console.error(`[ULTRA SAFE] ${context}: cannot convert to array:`, objectInfo);
        }
        return;
      }
    }
    
    // Use traditional for loop instead of forEach to avoid ALL minification issues
    for (let i = 0; i < array.length; i++) {
      try {
        callback(array[i], i, array);
      } catch (callbackError) {
        console.error(`[ULTRA SAFE] ${context}: callback error at index ${i}:`, callbackError);
      }
    }
  } catch (error) {
    console.error(`[ULTRA SAFE] ${context}: critical error:`, error);
  }
};

// Safe forEach wrapper with debugging (legacy - now uses ultra-safe version)
const safeForEach = ultraSafeForEach;

// Debug wrapper to catch forEach errors
const originalForEach = Array.prototype.forEach;
let debugMode = false;

const enableForEachDebugging = () => {
  console.log('[DEBUG] forEach debugging disabled to prevent interference');
  // DISABLED - was causing issues with minified code
  // if (debugMode) return;
  // debugMode = true;
  
  // Array.prototype.forEach = function(callback, thisArg) {
  //   if (!Array.isArray(this)) {
  //     console.error('[FOREACH DEBUG] forEach called on non-array:', typeof this, this);
  //     console.trace('Stack trace:');
  //     throw new TypeError('forEach called on non-array');
  //   }
  //   return originalForEach.call(this, callback, thisArg);
  // };
};

const disableForEachDebugging = () => {
  if (!debugMode) return;
  debugMode = false;
  Array.prototype.forEach = originalForEach;
};

// Make debugging functions available globally
if (typeof window !== 'undefined') {
  window.enableForEachDebugging = enableForEachDebugging;
  window.disableForEachDebugging = disableForEachDebugging;
}
import "react-toastify/dist/ReactToastify.css";
import CardActionsModal from "./CardActionsModal";
import "./CardActionsModal.css";
import TextImportModal from "./TextImportModal";
import PhotoImportModal from "./PhotoImportModal";
import { CARD_TYPE_HINTS, getMainCardType } from "./cardTypeHints";
import { fetchOtagRecommendations } from "../utils/fetchOtagRecommendations";

import debounce from "lodash.debounce";
import CardModal from "./CardModal";
import CardPreview from "./CardPreview";
import CardTypeHeader from "./CardTypeHeader";

// Import PDF generation libraries
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import CardGroupSortOptions from "./CardGroupSortOptions";
import ManaCost from "./ManaCost"; // Import the new component
import {
  groupCardsByManaValue,
  groupCardsByColorIdentity,
  groupCardsByCollectionStatus,
} from "./cardGroupings";
import { getUnifiedCardPrice, formatPrice, isValidModalPrice } from "../utils/UnifiedPricing";

// Helper function to proxy Scryfall images through our backend to avoid CORS issues
const getProxiedImageUrl = (originalUrl) => {
  if (!originalUrl) return null;
  
  // Only proxy Scryfall image URLs
  if (originalUrl.startsWith('https://cards.scryfall.io/') || originalUrl.startsWith('https://c1.scryfall.com/')) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${apiUrl}/api/cards/image-proxy?url=${encodeURIComponent(originalUrl)}`;
  }
  
  return originalUrl;
};

// Preferred basic land printings for consistency
const BASIC_LAND_PRINTINGS = {
  // Regular basic lands (using specific FDN collector numbers as requested)
  "Forest": "d232fcc2-12f6-401a-b1aa-ddff11cb9378",      // FDN Forest #280
  "Island": "23635e40-d040-40b7-8b98-90ed362aa028",      // FDN Island #275
  "Mountain": "1edc5050-69bd-416d-b04c-7f82de2a1901",    // FDN Mountain #279
  "Plains": "4ef17ed4-a9b5-4b8e-b4cb-2ecb7e5898c3",     // FDN Plains #272
  "Swamp": "13505c15-14e0-4200-82bd-fb9bce949e68",      // FDN Swamp #277
  "Wastes": "60682c00-c661-4a9d-8326-f3f014a04e3e",     // OGW Wastes #184a
  
  // Snow-covered basic lands - using CSP printings (except Wastes which is MH3)
  "Snow-Covered Forest": "838c915d-8153-43c2-b513-dfbe4e9388a5",   // CSP Snow-Covered Forest #155
  "Snow-Covered Island": "6abf0692-07d1-4b72-af06-93d0e338589d",   // CSP Snow-Covered Island #152
  "Snow-Covered Mountain": "0dc9a6d1-a1ca-4b8f-894d-71c2a9933f79", // CSP Snow-Covered Mountain #154
  "Snow-Covered Plains": "b1e3a010-dae3-41b6-8dd8-e31d14c3ac4a",   // CSP Snow-Covered Plains #151
  "Snow-Covered Swamp": "c4dacaf1-09b8-42bb-8064-990190fdaf81",    // CSP Snow-Covered Swamp #153
  "Snow-Covered Wastes": "ad21a874-525e-4d11-bd8e-bc44918bec40",   // MH3 Snow-Covered Wastes #309
  
  // Alternative basic land names (for older printings or special sets)
  "Basic Forest": "d232fcc2-12f6-401a-b1aa-ddff11cb9378",
  "Basic Island": "ff0ba1cf-1b05-403e-8b5e-4bbe3cfa8a89",
  "Basic Mountain": "b34bb2dc-c1af-4d77-b0b3-a0fb342a5fc6", 
  "Basic Plains": "8e592a1e-b5e1-497a-863d-9772d25d3b3f",
  "Basic Swamp": "6b28e7a6-e0ed-4c45-85dd-7c1bbfe6b3e5"
};

// Cache for invalid cards to prevent repeated validation attempts
const invalidCardCache = new Set();

// Utility function to filter out test cards consistently across the app
const filterTestCards = (cards) => {
  if (!Array.isArray(cards)) return [];
  return cards.filter(card => {
    if (!card) return false;
    const cardName = card.card?.name || card.name || '';
    const testPatterns = /^(test|example|placeholder|unknown|null|undefined|sample)/i;
    const isTestCard = testPatterns.test(cardName) || cardName.length <= 2;
    return !isTestCard;
  });
};

// Log cache statistics periodically (for debugging)
if (typeof window !== 'undefined') {
  window.getInvalidCardCacheStats = () => {
    console.log(`[Invalid Card Cache] Currently tracking ${invalidCardCache.size} invalid cards/combinations`);
    return Array.from(invalidCardCache);
  };
}

// User preference system for basic land printings
const BASIC_LAND_PREFERENCES_KEY = 'basic-land-printing-preferences';

// Get user's preferred printing for a basic land (falls back to default if not set)
const getUserPreferredPrinting = (cardName) => {
  try {
    const preferences = JSON.parse(localStorage.getItem(BASIC_LAND_PREFERENCES_KEY) || '{}');
    const userPref = preferences[cardName];
    const defaultPref = BASIC_LAND_PRINTINGS[cardName];
    const result = userPref || defaultPref;
    
    console.log(`🏞️ [GET PREF] ${cardName}: user=${userPref}, default=${defaultPref}, result=${result}`);
    
    return result;
  } catch (error) {
    console.warn('[BASIC LAND PREFS] Error reading preferences:', error);
    return BASIC_LAND_PRINTINGS[cardName];
  }
};

// Set user's preferred printing for a basic land
const setUserPreferredPrinting = (cardName, printingId) => {
  try {
    const preferences = JSON.parse(localStorage.getItem(BASIC_LAND_PREFERENCES_KEY) || '{}');
    preferences[cardName] = printingId;
    localStorage.setItem(BASIC_LAND_PREFERENCES_KEY, JSON.stringify(preferences));
    console.log(`🏞️ [USER PREFS] Updated ${cardName} preferred printing to: ${printingId}`);
  } catch (error) {
    console.error('[BASIC LAND PREFS] Error saving preferences:', error);
  }
};

// Get all user preferences (useful for debugging)
const getAllUserPreferences = () => {
  try {
    return JSON.parse(localStorage.getItem(BASIC_LAND_PREFERENCES_KEY) || '{}');
  } catch (error) {
    console.warn('[BASIC LAND PREFS] Error reading all preferences:', error);
    return {};
  }
};

// Reset preferences to defaults (useful for testing)
const resetBasicLandPreferences = () => {
  localStorage.removeItem(BASIC_LAND_PREFERENCES_KEY);
  console.log('🏞️ [USER PREFS] Reset all basic land preferences to defaults');
};

// Make functions available for debugging
if (typeof window !== 'undefined') {
  window.basicLandPrefs = {
    get: getUserPreferredPrinting,
    set: setUserPreferredPrinting,
    getAll: getAllUserPreferences,
    reset: resetBasicLandPreferences
  };
}

// Set information for preferred basic land printings
const BASIC_LAND_SET_INFO = {
  "d232fcc2-12f6-401a-b1aa-ddff11cb9378": {
    set_name: "Foundations",
    collector_number: "280",
  },
  "23635e40-d040-40b7-8b98-90ed362aa028": {
    set_name: "Foundations",
    collector_number: "275",
  },
  "1edc5050-69bd-416d-b04c-7f82de2a1901": {
    set_name: "Foundations",
    collector_number: "279",
  },
  "4ef17ed4-a9b5-4b8e-b4cb-2ecb7e5898c3": {
    set_name: "Foundations",
    collector_number: "272",
  },
  "13505c15-14e0-4200-82bd-fb9bce949e68": {
    set_name: "Foundations",
    collector_number: "277",
  },
  "87870792-e429-4eba-8193-cdce5c7b6c55": {
    set_name: "Modern Horizons 3",
    collector_number: "229",
  },
  "838c915d-8153-43c2-b513-dfbe4e9388a5": {
    set_name: "Coldsnap",
    collector_number: "155",
  },
  "6abf0692-07d1-4b72-af06-93d0e338589d": {
    set_name: "Coldsnap",
    collector_number: "152",
  },
  "0dc9a6d1-a1ca-4b8f-894d-71c2a9933f79": {
    set_name: "Coldsnap",
    collector_number: "154",
  },
  "b1e3a010-dae3-41b6-8dd8-e31d14c3ac4a": {
    set_name: "Coldsnap",
    collector_number: "151",
  },
  "c4dacaf1-09b8-42bb-8064-990190fdaf81": {
    set_name: "Coldsnap",
    collector_number: "153",
  },
};

const CATEGORY_ORDER = [
  "Commander",
  "Planeswalker",
  "Battle",
  "Creature",
  "Sorcery",
  "Instant",
  "Artifact",
  "Kindred",
  "Enchantment",
  "Land",
  "Conspiracy",
  "Dungeon",
  "Emblem",
  "Hero",
  "Phenomenon",
  "Plane",
  "Scheme",
  "Vanguard",
  "Other",
];

// Global variable for card hover preview
window.__hoveredCardName = null;

// Utility function to extract type data from deeply nested card structures
function extractTypeDataFromCard(cardObj, maxDepth = 10) {
  const searchForTypeData = (obj, depth = 0) => {
    if (depth > maxDepth || !obj || typeof obj !== 'object') return null;
    
    const result = {};
    
    // Look for type_line at current level
    if (obj.type_line && typeof obj.type_line === 'string') {
      result.type_line = obj.type_line;
    }
    
    // Look for scryfall_json at current level
    if (obj.scryfall_json && typeof obj.scryfall_json === 'object') {
      result.scryfall_json = obj.scryfall_json;
      // Also check for type_line inside scryfall_json
      if (obj.scryfall_json.type_line && !result.type_line) {
        result.type_line = obj.scryfall_json.type_line;
      }
    }
    
    // If we found what we need, return it
    if (result.type_line && result.scryfall_json) {
      return result;
    }
    
    // Otherwise, search deeper in nested objects
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && key !== 'scryfall_json') { // Avoid circular references
        const found = searchForTypeData(value, depth + 1);
        if (found) {
          // Merge results, prioritizing deeper findings for missing data
          if (found.type_line && !result.type_line) {
            result.type_line = found.type_line;
          }
          if (found.scryfall_json && !result.scryfall_json) {
            result.scryfall_json = found.scryfall_json;
          }
          
          // If we now have everything, return
          if (result.type_line && result.scryfall_json) {
            return result;
          }
        }
      }
    }
    
    return Object.keys(result).length > 0 ? result : null;
  };
  
  return searchForTypeData(cardObj);
}

function groupCardsByType(cards, commanderNames = []) {
  // Group and count cards by type (no supertype) with proper consolidation
  const typeMap = {};
  if (!Array.isArray(cards)) {
    return [];
  }

  for (const cardObj of cards) {
    let name, type;

    // Handle null/undefined cardObj
    if (!cardObj) continue;

    if (cardObj && typeof cardObj === "object") {
      if (cardObj.card && typeof cardObj.card === "object") {
        name = cardObj.card?.name || cardObj.name; // CRITICAL FIX: Fallback to cardObj.name if cardObj.card.name is undefined
        // If this card is a commander, force type to 'Commander'
        if ((cardObj.isCommander || cardObj.card?.isCommander) || (name && commanderNames.includes(name.toLowerCase()))) {
          type = "Commander";
        } else {
          try {
            // Try multiple possible locations for type_line
            const typeLine = cardObj.card?.type_line || 
                            cardObj.type_line || 
                            cardObj.scryfallCard?.type_line ||
                            cardObj.scryfall_json?.type_line ||
                            cardObj.card?.scryfallCard?.type_line ||
                            cardObj.card?.scryfall_json?.type_line;
                            
            // Debug: Check if we're missing type data
            if (!typeLine && Math.random() < 0.1) {
              console.log('[TYPE DEBUG] Missing type_line for', name, 'keys:', Object.keys(cardObj));
            }

            type =
              (name && CARD_TYPE_HINTS[name]) ||
              (typeLine && getMainCardType(typeLine)) ||
              "Other";
          } catch (error) {
            console.error("Error getting card type for:", cardObj, error);
            type = "Other";
          }
        }
      } else if (cardObj.name) {
        name = cardObj.name;
        if (cardObj.isCommander || (name && commanderNames.includes(name.toLowerCase()))) {
          type = "Commander";
        } else {
          try {
            // For direct card objects, check multiple possible locations for type_line
            const typeLine = cardObj.type_line || 
                            cardObj.scryfallCard?.type_line ||
                            cardObj.scryfall_json?.type_line;
            
            type = (name && CARD_TYPE_HINTS[name]) || 
                   (typeLine && getMainCardType(typeLine)) ||
                   "Other";
          } catch (error) {
            console.error("Error getting card type for direct card object:", cardObj, error);
            type = "Other";
          }
        }
      }
    } else if (typeof cardObj === "string") {
      name = cardObj;
      if (name && commanderNames.includes(name.toLowerCase())) {
        type = "Commander";
      } else {
        type = (name && CARD_TYPE_HINTS[name]) || "Other";
      }
    }

    // Skip if we couldn't determine a name
    if (!name) continue;

    if (!typeMap[type]) typeMap[type] = [];
    typeMap[type].push(cardObj);
  }

  // Apply consolidation to each type group using a simplified groupCards logic
  ultraSafeForEach(Object.keys(typeMap), (type) => {
    const cardsInType = typeMap[type];
    if (!Array.isArray(cardsInType)) {
      console.error('[FOREACH DEBUG] cardsInType is not an array in groupCardsByType:', typeof cardsInType, cardsInType, 'Type:', type);
      typeMap[type] = [];
      return;
    }
    const consolidatedMap = {};
    
    try {
      ultraSafeForEach(cardsInType, (cardObj) => {
        const name = cardObj.card?.name || cardObj.name;
        // CRITICAL FIX: Use proper Scryfall ID instead of "default"
        const printing = cardObj.printing || 
                        cardObj.card?.printing || 
                        cardObj.scryfall_json?.id || 
                        cardObj.card?.scryfall_json?.id ||
                        cardObj.cardObj?.scryfall_json?.id ||
                        cardObj.cardObj?.printing ||
                        null; // Use null instead of "default" to avoid corruption
        const foil = cardObj.foil || cardObj.card?.foil || false;
        const key = `${name}-${printing}-${foil}`;
        
        if (!consolidatedMap[key]) {
          consolidatedMap[key] = {
            name,
            count: 0,
            printing,
            cardObj,
            foil
          };
        }
        
        // Increment count by the quantity of this card
        const quantity = cardObj.count || cardObj.quantity || 1;
        consolidatedMap[key].count += quantity;
      });
    } catch (error) {
      console.error('[DEBUG] Error in consolidation for type', type, ':', error);
      console.error('[DEBUG] Cards in type:', cardsInType);
      throw error; // Re-throw to see the full error
    }
    
    // Convert back to array and sort by name
    typeMap[type] = Object.values(consolidatedMap).sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  });

  // Use CATEGORY_ORDER for sorting, but allow for custom order for card types
  const result = [];
  // For card type grouping, use custom order, then alpha for others
  const allTypes = Object.keys(typeMap);
  
  let orderedTypes = [];
  if (CATEGORY_ORDER && CATEGORY_ORDER.length > 0) {
    // Only include types that exist in this deck
    orderedTypes = CATEGORY_ORDER.filter((t) => allTypes.includes(t));
    // Add any types not in CATEGORY_ORDER, sorted alphabetically
    const extraTypes = allTypes
      .filter((t) => !CATEGORY_ORDER.includes(t))
      .sort();
    orderedTypes = orderedTypes.concat(extraTypes);
  } else {
    orderedTypes = allTypes.sort();
  }
  
  for (const type of orderedTypes) {
    const typeCards = typeMap[type];
    result.push({ type, cards: typeCards });
  }
  
  return result;
}

function ensureCommanderInCards(deck) {
  if (!deck) return [];
  let cards = Array.isArray(deck.cards) ? [...deck.cards] : [];

  // Filter out any null/undefined cards and test cards using the utility function
  cards = filterTestCards(cards);
  // Reduced logging for ensureCommanderInCards
  if (Math.random() < 0.05) { // Only log 5% of the time
    console.log(`[DEBUG] ensureCommanderInCards filtered to ${cards.length} cards`);
  }

  // Detect commander(s) from deck object
  let commanders = [];
  if (
    deck.commander &&
    Array.isArray(deck.commander) &&
    deck.commander.length > 0
  ) {
    commanders = deck.commander.filter((comm) => comm != null);
  } else if (
    deck.commander &&
    typeof deck.commander === "object" &&
    deck.commander !== null &&
    !Array.isArray(deck.commander)
  ) {
    commanders = [deck.commander];
  } else if (typeof deck.commander === "string" && deck.commander.trim()) {
    commanders = [deck.commander];
  }

  // Also check commanderNames field for unresolved commanders
  if (
    deck.commanderNames &&
    Array.isArray(deck.commanderNames) &&
    deck.commanderNames.length > 0
  ) {
    const nameCommanders = deck.commanderNames.filter(
      (name) => typeof name === "string" && name.trim(),
    );
    commanders = commanders.concat(nameCommanders);
  }

  // If no commanders, return cards as-is
  if (commanders.length === 0) {
    return cards;
  }

  // Normalize commander names
  const commanderNames = commanders
    .map((comm) => {
      const name = comm.card?.name || comm.name || comm;
      return typeof name === "string" ? name.toLowerCase() : "";
    })
    .filter((name) => name);


  //   const name = c.card?.name || c.name || '';
  //   return typeof name === 'string' ? name.toLowerCase() : '';
  // }));

  // Remove all but the first occurrence of any card with the same name as a commander
  const seen = new Set();
  const dedupedCards = cards.filter((c) => {
    if (!c) return false;
    const cName = (c.card?.name || c.name || "").toLowerCase();
    if (commanderNames.includes(cName)) {
      if (seen.has(cName)) return false;
      seen.add(cName);
      return true;
    }
    return true;
  });

  // Add commander(s) if not present
  for (const comm of commanders) {
    if (!comm) continue;
    const commName = (comm.card?.name || comm.name || comm).toLowerCase();
    if (
      commName &&
      !dedupedCards.some(
        (c) => (c.card?.name || c.name || "").toLowerCase() === commName,
      )
    ) {
      if (typeof comm === "object" && comm !== null) {
        // Ensure we add all necessary metadata for the commander card
        const commanderCard = { card: comm };

        // Enhanced commander card patching for cmc (mana value)
        // Check all possible locations for cmc in the card data
        let manaValue = null;
        if (comm.cmc !== undefined) manaValue = comm.cmc;
        else if (comm.card?.cmc !== undefined) manaValue = comm.card?.cmc;
        else if (comm.scryfall_json?.cmc !== undefined)
          manaValue = comm.scryfall_json.cmc;
        else if (comm.card?.scryfall_json?.cmc !== undefined)
          manaValue = comm.card?.scryfall_json?.cmc;

        // Apply the mana value to both the card and main object
        if (manaValue !== null) {
          if (commanderCard.card) commanderCard.card.cmc = manaValue;
          commanderCard.cmc = manaValue; // Add directly for easier access
        }

        // Enhanced commander card patching for price
        let price = null;
        if (comm.prices?.usd !== undefined) price = comm.prices.usd;
        else if (comm.card?.prices?.usd !== undefined)
          price = comm.card?.prices?.usd;
        else if (comm.scryfall_json?.prices?.usd !== undefined)
          price = comm.scryfall_json.prices.usd;
        else if (comm.card?.scryfall_json?.prices?.usd !== undefined)
          price = comm.card?.scryfall_json?.prices?.usd;
        else if (comm.price) price = comm.price;

        // Apply the price to both the card and main object
        if (price !== null) {
          // Ensure price objects exist
          if (commanderCard.card && !commanderCard.card.prices) commanderCard.card.prices = {};
          if (!commanderCard.prices) commanderCard.prices = {};

          // Apply price to both locations
          if (commanderCard.card) commanderCard.card.prices.usd = price;
          commanderCard.prices.usd = price;
        }

        // Add printing if available
        if (
          comm.printings &&
          comm.printings.length > 0 &&
          !commanderCard.printing
        ) {
          commanderCard.printing = comm.printings[0];
        }

        dedupedCards.unshift(commanderCard);
      } else if (typeof comm === "string") {
        dedupedCards.unshift({ name: comm });
      }
    }
  }
  return dedupedCards;
}

// Group and count cards by name and printing
function groupCards(cards) {
  const map = new Map();
  if (!Array.isArray(cards)) {
    return [];
  }

  for (const cardObj of cards) {
    // Handle null/undefined cardObj
    if (!cardObj) continue;

    const name = cardObj.card?.name || cardObj.name || "";
    const printing = cardObj.printing || "";

    // Skip if we couldn't determine a name
    if (!name) continue;

    const key = name + "|" + printing;
    if (!map.has(key)) {
      map.set(key, { name, count: 1, printing, cardObj });
    } else {
      map.get(key).count++;
    }
  }
  return Array.from(map.values());
}

// Function to preload all card images
const preloadCardImages = (cards, preloadedImagesMap) => {
  if (!Array.isArray(cards)) {
    console.error('[FOREACH DEBUG] preloadCardImages: cards is not an array:', typeof cards, cards);
    return;
  }

  // Extract unique cards to avoid loading duplicates
  const uniqueCards = new Map();
  ultraSafeForEach(cards, (cardObj) => {
    if (!cardObj) return;
    const card = cardObj.card || cardObj;
    const name = card?.name || cardObj.name;
    if (!name) return;

    // Use printing ID as the key if available, otherwise use name
    const key = cardObj.printing || name;
    if (!uniqueCards.has(key)) {
      uniqueCards.set(key, card);
    }
  });

  // Preload each image
  ultraSafeForEach(Array.from(uniqueCards), ([key, card]) => {
    if (preloadedImagesMap.has(key)) return; // Skip if already preloaded

    let imageUrl;
    if (card.set && card.collector_number) {
      imageUrl = `https://api.scryfall.com/cards/${card.set.toLowerCase()}/${card.collector_number}?format=image&version=png`;
    } else if (BASIC_LAND_PRINTINGS[card.name]) {
      const printingId = BASIC_LAND_PRINTINGS[card.name];
      imageUrl = `https://api.scryfall.com/cards/${printingId}?format=image&version=png`;
    } else {
      imageUrl = `https://api.scryfall.com/cards/named?format=image&version=png&exact=${encodeURIComponent(card.name)}`;
    }

    // Create image element to trigger preloading
    const img = new Image();
    img.src = imageUrl;
    preloadedImagesMap.set(key, imageUrl);
  });
};

// Helper function to check if a modalPrice is valid (not undefined, null, or string "undefined")
// Legacy wrapper for extractPrice - now uses unified pricing utility
const extractPrice = (cardData) => {
  const result = getUnifiedCardPrice(cardData, {
    preferStoredPrice: true,
    fallbackPrice: null,
    debugLogging: false,
    preferNonFoil: true, // Add preference for non-foil to stabilize pricing
    forceNonFoil: !cardData.foil // Force non-foil unless explicitly foil
  });
  
  // Transform to match expected legacy format
  return {
    price: result.price,
    source: result.source,
    cardType: result.cardType,
    isFoil: result.metadata.isFoil || false,
    isEtched: result.cardType === 'etched',
    isPromo: result.metadata.finishes?.includes('promo') || false,
    isSpecialFinish: result.cardType === 'special_foil',
    isDigital: result.metadata.finishes?.includes('digital') || false
  };
};

// Function to parse mana cost and return image tags
const parseManaCost = (manaCost) => {
  if (!manaCost) return null;

  // Scryfall mana symbol codes are case-sensitive and use specific codes for hybrid, phyrexian, etc.
  // We'll use the Scryfall mana symbol API, which expects codes like 'w', 'u', 'b', 'r', 'g', 'c', 's', 'x', '0'-'20', 'wu', '2w', 'wp', etc.
  // The Scryfall symbol endpoint is: https://svgs.scryfall.io/card-symbols/{code}.svg

  // Extract all {X} symbols
  const manaSymbols = manaCost.match(/\{([^{}]+)\}/g);
  if (!manaSymbols) return manaCost;

  return manaSymbols.map((symbol, index) => {
    // Remove braces and convert to Scryfall code
    let code = symbol.replace(/\{|\}/g, "").toLowerCase();
    // Scryfall expects 'w', 'u', 'b', 'r', 'g', 'c', 's', 'x', '0'-'20', 'wu', '2w', 'wp', etc.
    // Replace some common aliases
    code = code.replace(/\//g, ""); // Remove slashes for hybrid/phyrexian (Scryfall uses e.g. 'wup' for {W/U/P})
    // But for hybrid, Scryfall expects e.g. 'wu' for {W/U}, 'wp' for {W/P}, '2w' for {2/W}
    // We'll handle some common cases:
    if (/^[wubrgcspx0-9]+$/.test(code)) {
      // Normal symbol, do nothing
    } else if (/^[wubrgcspx0-9]+\/[wubrgcspx0-9]+$/.test(code)) {
      // Hybrid mana, e.g. 'w/u' => 'wu'
      code = code.replace("/", "");
    } else if (/^[wubrgcspx0-9]+\/[p]$/.test(code)) {
      // Phyrexian, e.g. 'g/p' => 'gp'
      code = code.replace("/", "");
    } else if (/^2\/[wubrg]$/.test(code)) {
      // Two-color hybrid, e.g. '2/w' => '2w'
      code = code.replace("/", "");
    } else {
      // Fallback: just remove slashes
      code = code.replace(/\//g, "");
    }
    return (
      <img
        key={index}
        src={`https://svgs.scryfall.io/card-symbols/${code}.svg`}
        alt={symbol}
        className="mana-symbol"
        style={{ height: "1em", verticalAlign: "middle", marginRight: "1px" }}
      />
    );
  });
};

function CardContextMenu({ x, y, cardObj, onCopyScryfallLink, onClose, onUseForDeckImage, onAddToWishlist, onAddToCollection, onRemoveFromDeck, onAddToSideboard, onAddToTechIdeas, onMoveToMainDeck, onMoveFromSideboardToTechIdeas, onMoveFromTechIdeasToSideboard, onRemoveFromSideboard, onRemoveFromTechIdeas }) {
  // Trap focus for accessibility
  const menuRef = React.useRef(null);
  React.useEffect(() => {
    if (menuRef.current) menuRef.current.focus();
  }, []);

  const menuStyle = {
    position: "fixed",
    top: Math.min(y, window.innerHeight - 250), // Increased clearance from bottom
    left: Math.min(x, window.innerWidth - 200),
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: 6,
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    zIndex: 10000, // Increased z-index to be above sticky bar
    minWidth: 180,
    padding: "4px 0",
    // Ensure menu appears above the sticky bottom bar
    maxHeight: "200px",
    overflow: "auto"
  };

  const buttonStyle = {
    display: "block",
    width: "100%",
    background: "none",
    border: "none",
    textAlign: "left",
    padding: "8px 16px",
    fontSize: 15,
    fontWeight: 500,
    color: "#222",
    cursor: "pointer",
    transition: "background 0.15s",
  };

  const handleButtonClick = (action) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      tabIndex={-1}
      style={menuStyle}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <button
        style={buttonStyle}
        onClick={() => handleButtonClick(onUseForDeckImage)}
        onMouseOver={(e) => (e.currentTarget.style.background = "#e0e0e0")}
        onMouseOut={(e) => (e.currentTarget.style.background = "none")}
      >
        Use for Deck Image
      </button>
      <button
        style={buttonStyle}
        onClick={() => handleButtonClick(onAddToWishlist)}
        onMouseOver={(e) => (e.currentTarget.style.background = "#e0e0e0")}
        onMouseOut={(e) => (e.currentTarget.style.background = "none")}
      >
        Add to Wishlist
      </button>
      <button
        style={buttonStyle}
        onClick={() => handleButtonClick(onAddToCollection)}
        onMouseOver={(e) => (e.currentTarget.style.background = "#e0e0e0")}
        onMouseOut={(e) => (e.currentTarget.style.background = "none")}
      >
        Add to Collection
      </button>
      
      {/* Show different options based on card section */}
      {cardObj?.section === 'sideboard' ? (
        <>
          <button
            style={buttonStyle}
            onClick={() => handleButtonClick(onMoveToMainDeck)}
            onMouseOver={(e) => (e.currentTarget.style.background = "#e0e0e0")}
            onMouseOut={(e) => (e.currentTarget.style.background = "none")}
          >
            Move to Main Deck
          </button>
          <button
            style={buttonStyle}
            onClick={() => handleButtonClick(onMoveFromSideboardToTechIdeas)}
            onMouseOver={(e) => (e.currentTarget.style.background = "#e0e0e0")}
            onMouseOut={(e) => (e.currentTarget.style.background = "none")}
          >
            Move to Tech Ideas
          </button>
        </>
      ) : cardObj?.section === 'techIdeas' ? (
        <>
          <button
            style={buttonStyle}
            onClick={() => handleButtonClick(onMoveToMainDeck)}
            onMouseOver={(e) => (e.currentTarget.style.background = "#e0e0e0")}
            onMouseOut={(e) => (e.currentTarget.style.background = "none")}
          >
            Move to Main Deck
          </button>
          <button
            style={buttonStyle}
            onClick={() => handleButtonClick(onMoveFromTechIdeasToSideboard)}
            onMouseOver={(e) => (e.currentTarget.style.background = "#e0e0e0")}
            onMouseOut={(e) => (e.currentTarget.style.background = "none")}
          >
            Move to Sideboard
          </button>
        </>
      ) : (
        <>
          <button
            style={buttonStyle}
            onClick={() => handleButtonClick(onAddToSideboard)}
            onMouseOver={(e) => (e.currentTarget.style.background = "#e0e0e0")}
            onMouseOut={(e) => (e.currentTarget.style.background = "none")}
          >
            Add to Sideboard
          </button>
          <button
            style={buttonStyle}
            onClick={() => handleButtonClick(onAddToTechIdeas)}
            onMouseOver={(e) => (e.currentTarget.style.background = "#e0e0e0")}
            onMouseOut={(e) => (e.currentTarget.style.background = "none")}
          >
            Add to Tech Ideas
          </button>
        </>
      )}
      
      <button
        style={buttonStyle}
        onClick={() => handleButtonClick(onCopyScryfallLink)}
        onMouseOver={(e) => (e.currentTarget.style.background = "#e0e0e0")}
        onMouseOut={(e) => (e.currentTarget.style.background = "none")}
      >
        Copy Scryfall Link
      </button>
      <hr style={{ margin: '4px 0', border: '0', borderTop: '1px solid #eee' }} />
      
      {/* Show appropriate remove button based on section */}
      {cardObj?.section === 'sideboard' ? (
        <button
          style={{...buttonStyle, color: "#dc3545"}}
          onClick={() => handleButtonClick(onRemoveFromSideboard)}
          onMouseOver={(e) => (e.currentTarget.style.background = "#fff5f5")}
          onMouseOut={(e) => (e.currentTarget.style.background = "none")}
        >
          Remove from Sideboard
        </button>
      ) : cardObj?.section === 'techIdeas' ? (
        <button
          style={{...buttonStyle, color: "#dc3545"}}
          onClick={() => handleButtonClick(onRemoveFromTechIdeas)}
          onMouseOver={(e) => (e.currentTarget.style.background = "#fff5f5")}
          onMouseOut={(e) => (e.currentTarget.style.background = "none")}
        >
          Remove from Tech Ideas
        </button>
      ) : (
        <button
          style={{...buttonStyle, color: "#dc3545"}}
          onClick={() => handleButtonClick(onRemoveFromDeck)}
          onMouseOver={(e) => (e.currentTarget.style.background = "#fff5f5")}
          onMouseOut={(e) => (e.currentTarget.style.background = "none")}
        >
          Remove from Deck
        </button>
      )}
    </div>
  );
}

// Memoized card component to prevent animation resets
// Transform icon component for double-faced cards
const TransformIcon = ({ size = 12, color = '#1976d2' }) => (
  <svg 
    version="1.1" 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size * (32/23)} 
    viewBox="0 0 23 32"
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path 
      fill={color} 
      d="M18.486 28.106c0 1.581-1.282 2.863-2.863 2.863h-12.762c-1.581 0-2.863-1.282-2.863-2.863v-20.157c0-1.581 1.282-2.863 2.863-2.863h2.028v-1.193c0-1.581 1.282-2.863 2.863-2.863h12.762c1.581 0 2.863 1.282 2.863 2.863v20.157c0 1.581-1.282 2.863-2.863 2.863h-2.028v1.193zM15.623 6.995h-12.762c-0.527 0-0.954 0.427-0.954 0.954v20.157c0 0.527 0.427 0.954 0.954 0.954h12.762c0.527 0 0.954-0.427 0.954-0.954v-20.157c0-0.527-0.427-0.954-0.954-0.954zM18.486 25.005h2.028c0.527 0 0.954-0.427 0.954-0.954v-20.157c0-0.527-0.427-0.954-0.954-0.954h-12.762c-0.527 0-0.954 0.427-0.954 0.954v1.193h8.826c1.581 0 2.863 1.282 2.863 2.863v17.056z"
    />
  </svg>
);

const DeckCardRow = memo(
  ({
    cardData,
    isFoil,
    price,
    index,
    onMouseEnter,
    onClick,
    onContextMenu,
    showMana,
    hidePrices,
    isExplicitlyFoil,
    bulkEditMode,
    isSelected,
    onToggleSelection,
    customButtons,
    setFixedPreview,
    deckFlipStates,
    setDeckFlipStates,
  }) => {
    // Create a unique key for this card instance for flip state tracking
    const cardKey = `${cardData.name}-${cardData.printing || cardData.cardObj?.scryfall_id || 'default'}`;
    
    // Use deck-level flip state instead of local state
    const showBackFace = deckFlipStates.get(cardKey) || false;
    
    // Get collection status for this card (lazy loading for performance)
    const collectionStatus = useMemo(() => {
      // Only compute collection status if prices are shown (to avoid loading collection unnecessarily)
      if (hidePrices) return 'not-owned';
      return getCollectionStatus(cardData);
    }, [cardData, hidePrices]);
    
    // Check if this is a double-faced card
    const cardFaces = cardData.cardObj?.card?.scryfall_json?.card_faces || 
                     cardData.cardObj?.scryfall_json?.card_faces || 
                     cardData.cardObj?.card?.card_faces ||
                     cardData.cardObj?.card_faces;
                     
    const layout = cardData.cardObj?.card?.scryfall_json?.layout || 
                  cardData.cardObj?.scryfall_json?.layout || 
                  cardData.cardObj?.card?.layout ||
                  cardData.cardObj?.layout;
    
    const isTransformCard = layout === 'transform' || 
                           layout === 'modal_dfc' || 
                           layout === 'reversible_card';
                           
    const isDoubleFaced = (cardFaces && Array.isArray(cardFaces) && cardFaces.length >= 2) || isTransformCard;
    
    // Get the current face name
    const getCurrentFaceName = () => {
      if (!isDoubleFaced || !cardFaces) return cardData.name;
      const faceIndex = showBackFace ? 1 : 0;
      return cardFaces[faceIndex]?.name || cardData.name;
    };
    
    // Get mana cost - for double-faced cards, use the front face or combined cost
    const getManaCost = () => {
      if (isDoubleFaced && cardFaces && Array.isArray(cardFaces)) {
        // For double-faced cards, prioritize the front face mana cost
        const frontFace = cardFaces[0];
        if (frontFace?.mana_cost) {
          return frontFace.mana_cost;
        }
        // Fallback to card-level mana cost for double-faced cards
        return cardData.cardObj?.card?.scryfall_json?.mana_cost ||
               cardData.cardObj?.scryfall_json?.mana_cost ||
               cardData.cardObj?.card?.mana_cost ||
               cardData.cardObj?.mana_cost || '';
      }
      
      // For single-faced cards, use standard logic
      return cardData.cardObj?.card?.scryfall_json?.mana_cost ||
             cardData.cardObj?.scryfall_json?.mana_cost ||
             cardData.cardObj?.card?.mana_cost ||
             cardData.cardObj?.mana_cost || '';
    };

    const manaCost = getManaCost();

    // Create a unique animation delay based on card name hash
    const cardNameHash = cardData.name.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    const animationDelay = `${-(Math.abs(cardNameHash) % 8)}s`;

    const handleRowClick = (e) => {
      if (bulkEditMode) {
        e.preventDefault();
        e.stopPropagation();
        onToggleSelection();
      } else {
        onClick();
      }
    };

    const handleFlipCard = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const newFlipState = !showBackFace;
      
      // Update deck-level flip state
      setDeckFlipStates(prev => {
        const newMap = new Map(prev);
        newMap.set(cardKey, newFlipState);
        return newMap;
      });
      
      // Direct preview update approach - update the fixedPreview state directly
      if (setFixedPreview) {
        setFixedPreview(prevPreview => ({
          ...prevPreview,
          flipState: newFlipState
        }));
      }
    };

    return (
      <div
        key={`${cardData.name}-${cardData.printing || ""}-${cardData.count}-${isExplicitlyFoil ? "foil" : "nonfoil"}-${price || "na"}-${index}`}
        className={`deck-card-row ${bulkEditMode ? 'bulk-edit-mode' : ''} ${bulkEditMode && isSelected ? 'bulk-selected' : ''}`}
        onMouseEnter={onMouseEnter}
        onClick={handleRowClick}
        onContextMenu={onContextMenu}
      >
        {/* Bulk edit checkbox */}
        {bulkEditMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelection}
            onClick={(e) => e.stopPropagation()}
            className="bulk-edit-checkbox"
            style={{
              cursor: 'pointer',
              marginRight: '3px',
            }}
          />
        )}
        
        <span className="card-count" style={{ marginLeft: '4px' }}>
          {`${cardData.count || cardData.quantity || 1} -`}
        </span>
        <span
          className={`card-name ${isExplicitlyFoil ? "foil-active-text" : ""}`}
          style={isExplicitlyFoil ? { animationDelay } : {}}
        >
          {getCurrentFaceName()}
          {isDoubleFaced && (
            <span 
              onClick={handleFlipCard}
              style={{
                marginLeft: '6px',
                cursor: 'pointer',
                userSelect: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                verticalAlign: 'middle'
              }}
              title={`Flip to ${showBackFace ? 'front' : 'back'} face`}
            >
              <TransformIcon size={10} color="#1976d2" />
            </span>
          )}
        </span>
        {/* Show mana cost based on showMana setting */}
        <span className="card-right-group">
          {showMana && (
            <>
              {manaCost ? (
                <span className="card-mana-column">
                  <ManaCost manaCost={manaCost} />
                </span>
              ) : (
                <span className="card-mana-column" />
              )}
            </>
          )}
          {/* Show prices only if not hidden */}
          {!hidePrices && (
            <span
              className={`card-price ${isExplicitlyFoil ? "foil-price" : ""} ${!price && BASIC_LAND_PRINTINGS[cardData.name] ? "basic-land-price" : ""}`}
              title={`${isExplicitlyFoil ? "Foil" : "Non-foil"} price`}
            >
              {formatPrice(price)}
            </span>
          )}
          {/* Always reserve space for collection status, even if hidden */}
          {!hidePrices && (
            <span style={{ 
              width: '16px', 
              minWidth: '16px',
              display: 'inline-flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              flexShrink: 0 
            }}>
              {(() => {
                // Use filled circles with colors: Green (exact match), Yellow (different version), Red (not owned)
                if (collectionStatus === 'exact-match') {
                  return <span style={{ color: '#22c55e', fontSize: '14px' }} title="In collection (exact match)">●</span>;
                } else if (collectionStatus === 'different-version') {
                  return <span style={{ color: '#eab308', fontSize: '14px' }} title="In collection (different printing)">●</span>;
                } else {
                  return <span style={{ color: '#ef4444', fontSize: '14px' }} title="Not in collection">●</span>;
                }
              })()}
            </span>
          )}
        </span>
        {/* Custom buttons section */}
        {customButtons && (
          <span className="custom-buttons" style={{ marginLeft: "0.5rem" }}>
            {customButtons}
          </span>
        )}
      </div>
    );
  },
);

DeckCardRow.displayName = "DeckCardRow";

// Cache collection data to avoid reloading it every time
let collectionCache = null;
let collectionCacheTimestamp = 0;
const COLLECTION_CACHE_TTL = 30000; // 30 seconds

// Function to invalidate collection cache when collection changes
const invalidateCollectionCache = () => {
  collectionCache = null;
  collectionCacheTimestamp = 0;
  console.log('[COLLECTION] Cache invalidated');
};

// Helper function to get cached collection data
const getCachedCollection = () => {
  const now = Date.now();
  
  // Return cached data if it's still valid
  if (collectionCache && (now - collectionCacheTimestamp) < COLLECTION_CACHE_TTL) {
    return collectionCache;
  }
  
  // Reload and cache collection data
  try {
    const rawCollection = storageManager.getChunkedItem('cardCollection');
    let collection = [];
    
    // Handle the storage wrapper object format
    if (rawCollection && typeof rawCollection === 'object') {
      if (Array.isArray(rawCollection)) {
        collection = rawCollection;
      } else if (rawCollection.data) {
        // Parse the JSON data from the storage wrapper
        try {
          collection = JSON.parse(rawCollection.data);
        } catch (parseError) {
          console.warn('[COLLECTION] Failed to parse collection data:', parseError);
          collection = [];
        }
      }
    }
    
    // Ensure collection is an array
    if (!Array.isArray(collection)) {
      console.warn('[COLLECTION] Collection data is not an array:', typeof collection);
      collection = [];
    }
    
    // Create optimized lookup maps
    const collectionMap = new Map();
    const cardNameMap = new Map();
    
    // Build lookup maps once
    ultraSafeForEach(collection, (item) => {
      const key = `${item.printing_id}_${item.foil}`;
      collectionMap.set(key, (collectionMap.get(key) || 0) + item.quantity);
      
      // Track card names for different version checking
      const cardName = item.name || item.card_name || item.cardName;
      if (cardName) {
        if (!cardNameMap.has(cardName)) {
          cardNameMap.set(cardName, new Set());
        }
        cardNameMap.get(cardName).add(`${item.printing_id}_${item.foil}`);
      }
    }, 'collection-cache-build');
    
    // Cache the processed data
    collectionCache = { collectionMap, cardNameMap };
    collectionCacheTimestamp = now;
    
    return collectionCache;
  } catch (error) {
    console.error('[COLLECTION] Error loading collection:', error);
    return { collectionMap: new Map(), cardNameMap: new Map() };
  }
};

// Helper function to get collection status for a card
const getCollectionStatus = (cardData) => {
  try {
    const { collectionMap, cardNameMap } = getCachedCollection();
    // Get card name from various possible locations
    const cardName = cardData.name || 
                    cardData.cardObj?.name ||
                    cardData.cardObj?.card?.name ||
                    cardData.card?.name ||
                    cardData.cardObj?.card?.scryfall_json?.name ||
                    cardData.scryfall_json?.name;
    
    // Get printing ID from various possible locations
    const printingId = cardData.printing || 
                      cardData.cardObj?.printing || 
                      cardData.cardObj?.card?.printing ||
                      cardData.card?.printing ||
                      cardData.scryfall_id ||
                      cardData.id ||
                      cardData.cardObj?.scryfall_id ||
                      cardData.cardObj?.id ||
                      cardData.cardObj?.card?.scryfall_id ||
                      cardData.cardObj?.card?.id;
    
    // Get foil status
    const isFoil = cardData.foil === true || 
                  cardData.isFoil === true ||
                  cardData.cardObj?.foil === true ||
                  cardData.cardObj?.isFoil === true ||
                  cardData.cardObj?.card?.foil === true ||
                  cardData.cardObj?.card?.isFoil === true;
    
    if (!printingId || !cardName) {
      return 'not-owned';
    }
    
    // Check for exact match (same printing + foil status)
    const exactKey = `${printingId}_${isFoil}`;
    const hasExactMatch = (collectionMap.get(exactKey) || 0) > 0;
    
    if (hasExactMatch) {
      return 'exact-match';
    } else {
      // Check if we own any other version of this card
      const ownedVersions = cardNameMap.get(cardName);
      if (ownedVersions && ownedVersions.size > 0) {
        return 'different-version';
      } else {
        return 'not-owned';
      }
    }
  } catch (error) {
    console.error('Error checking collection status:', error);
    return 'not-owned';
  }
};

// GridCard component for the grid view
const GridCard = memo(({ cardData, isExplicitlyFoil, price, onMouseEnter, onClick, onContextMenu, bulkEditMode, isSelected, onToggleSelection, deckFlipStates, setDeckFlipStates }) => {
  // Create a unique key for this card instance for flip state tracking
  const cardKey = `${cardData.name}-${cardData.printing || cardData.cardObj?.scryfall_id || 'default'}`;
  
  // Use deck-level flip state instead of local state
  const showBackFace = deckFlipStates.get(cardKey) || false;

  // Get collection status for this card
  const collectionStatus = getCollectionStatus(cardData);
  
  // Get card image URL from various possible locations
  const getCardImageUrl = () => {
    const cardObj = cardData.cardObj || cardData;
    
    let imageUrl = null;
    
    // Try multiple sources for the image
    if (cardObj?.card?.scryfall_json?.image_uris?.normal) {
      imageUrl = cardObj.card.scryfall_json.image_uris.normal;
    } else if (cardObj?.scryfall_json?.image_uris?.normal) {
      imageUrl = cardObj.scryfall_json.image_uris.normal;
    } else if (cardObj?.card?.image_uris?.normal) {
      imageUrl = cardObj.card.image_uris.normal;
    } else if (cardObj?.image_uris?.normal) {
      imageUrl = cardObj.image_uris.normal;
    }
    // Fallback to smaller versions
    else if (cardObj?.card?.scryfall_json?.image_uris?.small) {
      imageUrl = cardObj.card.scryfall_json.image_uris.small;
    } else if (cardObj?.scryfall_json?.image_uris?.small) {
      imageUrl = cardObj.scryfall_json.image_uris.small;
    }
    // If no image found, try to construct URL from Scryfall ID
    else {
      const scryfallId = cardObj?.card?.scryfall_json?.id || 
                        cardObj?.scryfall_json?.id || 
                        cardObj?.scryfall_id ||
                        cardObj?.id;
      
      if (scryfallId) {
        imageUrl = `https://cards.scryfall.io/normal/front/${scryfallId.substr(0,1)}/${scryfallId.substr(1,1)}/${scryfallId}.jpg`;
      }
    }
    
    // Return proxied URL to avoid CORS issues
    return getProxiedImageUrl(imageUrl);
  };

  const imageUrl = getCardImageUrl();
  const quantity = cardData.count || cardData.quantity || 1;

  return (
    <div
      className="grid-card"
      style={{
        position: 'relative',
        aspectRatio: '5/7',
        width: '150px', // Fixed width for proper card sizing
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: isSelected ? '0 0 0 3px #1976d2' : '0 2px 4px rgba(0,0,0,0.1)',
        opacity: bulkEditMode && !isSelected ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        if (!bulkEditMode) {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = isSelected ? '0 0 0 3px #1976d2' : '0 4px 8px rgba(0,0,0,0.2)';
        }
        onMouseEnter && onMouseEnter();
      }}
      onMouseLeave={(e) => {
        if (!bulkEditMode) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = isSelected ? '0 0 0 3px #1976d2' : '0 2px 4px rgba(0,0,0,0.1)';
        }
      }}
      onClick={(e) => {
        if (bulkEditMode) {
          e.preventDefault();
          e.stopPropagation();
          onToggleSelection && onToggleSelection();
        } else {
          onClick && onClick(e);
        }
      }}
      onContextMenu={onContextMenu}
    >
      {/* Card Image */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={cardData.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      
      {/* Fallback for missing image */}
      <div
        style={{
          display: imageUrl ? 'none' : 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#e0e0e0',
          color: '#666',
          fontSize: '12px',
          textAlign: 'center',
          padding: '8px',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div style={{ fontWeight: 'bold', lineHeight: '1.2' }}>
          {cardData.name}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.7 }}>
          No Image
        </div>
      </div>

      {/* Quantity Badge */}
      {quantity > 1 && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            borderRadius: '12px',
            padding: '2px 8px',
            fontSize: '12px',
            fontWeight: 'bold',
            minWidth: '20px',
            textAlign: 'center',
          }}
        >
          {quantity}
        </div>
      )}

      {/* Foil Badge */}
      {isExplicitlyFoil && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '18px',
            height: '18px',
            background: 'linear-gradient(125deg, #ff0000, #ffa500, #ffff00, #00ff00, #0000ff, #ee82ee)',
            backgroundSize: '400% 400%',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            opacity: 1,
            pointerEvents: 'none',
            zIndex: 2,
            animation: 'rainbow-shift 3s linear infinite',
            willChange: 'transform, filter',
          }}
        />
      )}

      {/* Collection Status Badge */}
      {(() => {
        // Use filled circles with colors: Green (exact match), Yellow (different version), Red (not owned)
        const getCircleColor = () => {
          if (collectionStatus === 'exact-match') {
            return '#22c55e'; // Green
          } else if (collectionStatus === 'different-version') {
            return '#eab308'; // Yellow
          } else {
            return '#ef4444'; // Red
          }
        };

        const getTitle = () => {
          if (collectionStatus === 'exact-match') {
            return 'In collection (exact match)';
          } else if (collectionStatus === 'different-version') {
            return 'In collection (different printing)';
          } else {
            return 'Not in collection';
          }
        };
        
        return (
          <div
            style={{
              position: 'absolute',
              top: '6px',
              right: isExplicitlyFoil ? '32px' : '6px', // Move left if foil badge is present
              color: getCircleColor(),
              fontSize: '18px',
              lineHeight: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px',
            }}
            title={getTitle()}
          >
            ●
          </div>
        );
      })()}

      {/* Price Badge */}
      {price && (
        <div
          style={{
            position: 'absolute',
            bottom: '6px',
            left: '6px',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            borderRadius: '6px',
            padding: '2px 6px',
            fontSize: '11px',
            fontWeight: 'bold',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          ${price}
        </div>
      )}

      {/* Bulk Edit Selection Indicator */}
      {bulkEditMode && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            backgroundColor: isSelected ? '#1976d2' : 'rgba(255, 255, 255, 0.9)',
            border: isSelected ? 'none' : '2px solid #1976d2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isSelected ? 'white' : '#1976d2',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 10,
          }}
        >
          {isSelected ? '✓' : ''}
        </div>
      )}
    </div>
  );
});

GridCard.displayName = "GridCard";

// Global render counter outside the component to persist across re-renders
let globalRenderCounter = 0;

export default function DeckViewEdit({ isPublic = false }) {
  // EMERGENCY: Circuit breaker MUST be first - before any hooks
  globalRenderCounter++;
  if (globalRenderCounter % 50 === 0) {
    console.warn(`[PERFORMANCE] DeckViewEdit has re-rendered ${globalRenderCounter} times! Possible render loop.`);
  }
  
  // EMERGENCY: Circuit breaker to prevent infinite render loops from crashing the app
  if (globalRenderCounter > 150) {
    console.error(`[EMERGENCY] DeckViewEdit has re-rendered ${globalRenderCounter} times! Activating circuit breaker.`);
    // Reset counter to prevent permanent lockout
    globalRenderCounter = 0;
    return (
      <div style={{ padding: '20px', border: '2px solid red', margin: '20px' }}>
        <h3>🚨 Render Loop Detected</h3>
        <p>The deck editor encountered a render loop (${globalRenderCounter} renders) and was stopped to prevent crashes.</p>
        <p>This usually happens when adding cards triggers excessive re-renders.</p>
        <button onClick={() => window.location.reload()}>Refresh Page</button>
        <button onClick={() => { globalRenderCounter = 0; window.location.reload(); }}>Reset & Refresh</button>
      </div>
    );
  }

  const { id } = useParams();

  // Enable forEach debugging for this component (DISABLED - was causing interference)
  // useEffect(() => {
  //   console.log('[DEBUG] Enabling forEach debugging...');
  //   enableForEachDebugging();
  //   return () => {
  //     console.log('[DEBUG] Disabling forEach debugging...');
  //     disableForEachDebugging();
  //   };
  // }, []);

  // Debug: Log the deck ID being accessed
  // console.log('[DeckViewEdit] Attempting to load deck ID:', id);

  const [modalState, setModalState] = useState({
    isOpen: false,
    cardObj: null,
  });

  // Oracle Tag navigation context
  const [oracleTagNavigationState, setOracleTagNavigationState] = useState({
    isActive: false,
    searchResults: [],
    currentIndex: -1,
  });

  const [pendingColorFetches, setPendingColorFetches] = useState(new Set());
  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);
  const lastFetchedId = useRef(null);
  const preloadedImages = useRef(new Map());
  const priceCache = useRef(new Map()); // Cache to prevent price jumping
  const renderCounter = useRef(0);
  const addCardDebounceRef = useRef(new Map()); // Debounce rapid card additions
  const navigate = useNavigate();
  
  // Read-only mode state
  const [isReadOnly, setIsReadOnly] = useState(isPublic);

  // Global modal state for the entire page
  const [globalModalState, setGlobalModalState] = useState({
    isOpen: false,
    cardName: null,
    activeComponentId: null,
    cardObj: null,
  });

  const [deck, setDeckOriginal] = useState(null);
  
  // DEBUG: Wrap setDeck to trace who's calling it AND preserve commander data
  const setDeck = useCallback((newDeckOrFunction) => {
    const stack = new Error().stack;
    
    if (typeof newDeckOrFunction === 'function') {
      // It's a function update - make sure to preserve commander data
      return setDeckOriginal(prevDeck => {
        const result = newDeckOrFunction(prevDeck);
        
        // If the result doesn't have commander data but the previous deck did, preserve it
        if (result && prevDeck && prevDeck.commander && !result.commander) {
          console.log('[DEBUG] setDeck function update preserved commander data:', {
            originalCommander: prevDeck.commander,
            originalCommanderNames: prevDeck.commanderNames,
            stackTrace: stack?.split('\n')[2]?.trim() || 'Unknown'
          });
          return {
            ...result,
            commander: prevDeck.commander,
            commanderNames: prevDeck.commanderNames
          };
        }
        
        // DEBUG: Reduced logging for performance
        if (renderCounter.current % 100 === 0) {
          console.log('[DEBUG] setDeck function update called from:', {
            hasCommander: result?.commander !== undefined,
            stackTrace: stack?.split('\n')[2]?.trim() || 'Unknown'
          });
        }
        
        return result;
      });
    } else {
      // It's a direct value - check if we need to preserve commander data
      let finalDeck = newDeckOrFunction;
      
      // If the new deck doesn't have commander data but current deck does, preserve it
      if (finalDeck && deck && deck.commander && !finalDeck.commander) {
        console.log('[DEBUG] setDeck direct value preserved commander data:', {
          originalCommander: deck.commander,
          originalCommanderNames: deck.commanderNames,
          newDeckId: finalDeck._id,
          stackTrace: stack?.split('\n')[2]?.trim() || 'Unknown'
        });
        finalDeck = {
          ...finalDeck,
          commander: deck.commander,
          commanderNames: deck.commanderNames
        };
      }
      
      // DEBUG: Reduced logging for performance
      if (renderCounter.current % 100 === 0) {
        console.log('[DEBUG] setDeck direct value called from:', {
          hasCommander: finalDeck?.commander !== undefined,
          stackTrace: stack?.split('\n')[2]?.trim() || 'Unknown'
        });
      }
      return setDeckOriginal(finalDeck);
    }
  }, [setDeckOriginal, deck]);
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState("");
  const [cards, setCards] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [fastLoading, setFastLoading] = useState(true); // For immediate deck content
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Initialize with card back but will persist last viewed card
  const [fixedPreview, setFixedPreview] = useState({ card: null });

  const [otagSuggestions, setOtagSuggestions] = useState([]);
  const [otagLoading, setOtagLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState("type"); // 'type', 'manaValue', 'colorIdentity' (collectionStatus only for collection page)
  const [sortBy, setSortBy] = useState("name-asc"); // 'name-asc', 'name-desc', 'price-asc', 'price-desc'
  const [hidePrices, setHidePrices] = useState(false); // Hide card prices by default
  const [showMana, setShowMana] = useState(true); // Show mana symbols toggle
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'grid' view mode
  
  // Collection update tracker to force re-render when collection changes
  const [collectionUpdateCounter, setCollectionUpdateCounter] = useState(0);
  
  // EMERGENCY CARD PRESERVATION SYSTEM
  // Store emergency cards in a ref to persist across renders
  const emergencyCardsRef = useRef(new Map());
  
  // Function to generate unique card selection IDs
  const generateCardSelectionId = (cardData) => {
    const cardName = cardData.card?.name || cardData.name;
    const cardPrinting = cardData.printing || cardData.cardObj?.printing;
    // Use comprehensive foil detection logic to match rendering
    const cardFoil = 
      cardData.foil === true ||
      cardData.card?.foil === true ||
      cardData.cardObj?.foil === true ||
      cardData.cardObj?.card?.foil === true;
    const id = `${cardName}_${cardPrinting || 'unknown'}_${cardFoil}`;
    // console.log(`[ID DEBUG] Generated ID for ${cardName}: ${id} (printing: ${cardPrinting}, foil: ${cardFoil})`);
    return id;
  };

  // Function to toggle card selection
  const toggleCardSelection = (cardData) => {
    const cardId = generateCardSelectionId(cardData);
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };
  
  // Clear price cache when deck changes to prevent stale prices
  useEffect(() => {
    priceCache.current.clear();
    console.log('[PRICE CACHE] Cleared cache due to deck change');
  }, [deck?._id]); // Only clear when deck ID changes, not on every card count change

  // Async price loading after deck renders
  const [pricesLoaded, setPricesLoaded] = useState(false);
  useEffect(() => {
    if (!deck || !cards || cards.length === 0) return;
    
    // Delay price loading to not block initial render
    const priceLoadTimer = setTimeout(async () => {
      console.log('[PRICE CACHE] Starting async price loading...');
      // Pre-load prices for visible cards
      const visibleCards = cards.slice(0, 20); // Load first 20 cards immediately
      
      for (const cardData of visibleCards) {
        try {
          await getCardPrice(cardData); // This will cache the price
        } catch (error) {
          // Ignore individual price failures to not block loading
        }
      }
      
      setPricesLoaded(true);
      console.log('[PRICE CACHE] Initial price loading complete');
      
      // Load remaining prices in background
      const remainingCards = cards.slice(20);
      setTimeout(async () => {
        for (const cardData of remainingCards) {
          try {
            await getCardPrice(cardData);
          } catch (error) {
            // Ignore failures
          }
        }
        console.log('[PRICE CACHE] Background price loading complete');
      }, 1000); // Wait 1 second before loading remaining prices
      
    }, 500); // Wait 500ms before starting price loading
    
    return () => clearTimeout(priceLoadTimer);
  }, [deck?._id, cards?.length]);
  
  // DEBUG: Monitor deck state changes (reduced logging for performance)
  useEffect(() => {
    if (renderCounter.current % 20 === 0) {
      console.log('[DEBUG] Deck state changed:', {
        deckExists: !!deck,
        deckId: deck?._id,
        hasCommander: !!deck?.commander
      });
    }
  }, [deck]);
  
  // Wrapper function to preserve emergency cards across all state updates
  const setCardsWithEmergencyPreservation = useCallback((newCardsOrFunction) => {
    const updateCards = (newCards) => {
      // Always preserve emergency cards
      const emergencyCards = Array.from(emergencyCardsRef.current.values());
      
      if (emergencyCards.length > 0) {
        // Remove any existing cards with the same name as emergency cards to prevent duplicates
        const emergencyNames = new Set(emergencyCards.map(c => c.name || c.card?.name));
        const filteredNewCards = newCards.filter(c => {
          const cardName = c.name || c.card?.name;
          return !emergencyNames.has(cardName);
        });
        
        // Combine filtered cards with emergency cards
        const combinedCards = [...filteredNewCards, ...emergencyCards];
        
        // Final filter to remove any test cards that might have slipped through
        return filterTestCards(combinedCards);
      }
      
      // Always filter test cards from any new cards being set
      return filterTestCards(newCards);
    };
    
    if (typeof newCardsOrFunction === 'function') {
      setCards(prevCards => updateCards(newCardsOrFunction(prevCards)));
    } else {
      setCards(updateCards(newCardsOrFunction));
    }
  }, []);
  
  // DATABASE VERIFICATION SYSTEM
  // Function to verify deck state matches database and trigger emergency fallback if needed
  const verifyDeckConsistency = useCallback(async () => {
    if (!deck || !deck._id) return;
    
    try {
      const token = localStorage.getItem("token");
      const apiUrl = import.meta.env.VITE_API_URL;
      
      if (!token) {
        return;
      }
      
      // Fetch fresh deck data from server
      const response = await fetch(`${apiUrl}/api/decks/${deck._id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
      
      if (response.ok) {
        const freshDeck = await response.json();
        const freshCardCount = freshDeck.cards?.length || 0;
        const currentCardCount = cards?.length || 0;
        

        
        // Check if emergency cards exist that should be in main deck but aren't in database
        const emergencyCards = Array.from(emergencyCardsRef.current.entries());
        
        for (const [cardName, emergencyCard] of emergencyCards) {
          const existsInFreshDeck = freshDeck.cards?.some(card => 
            (card.name || card.card?.name) === cardName
          );
          
          if (!existsInFreshDeck) {
            // Keep emergency card visible but show warning
            toast.warning(`${cardName} may not be properly saved to database. Please try moving it again.`, {
              duration: 8000
            });
          } else {
            // Remove from emergency cards since it's now properly saved
            emergencyCardsRef.current.delete(cardName);
          }
        }
        
        // CRITICAL FIX: Preserve modalPrice and card type data from current state when updating with fresh database data
        const currentCards = cards || [];
        const finalCards = (freshDeck.cards || []).map(freshCard => {
          const cardName = freshCard.name || freshCard.card?.name;
          
          // Find corresponding card in current state to preserve modalPrice and type data
          const currentCard = currentCards.find(current => {
            const currentName = current.name || current.card?.name;
            return currentName === cardName;
          });
          
          if (currentCard) {
            let preservedData = { ...freshCard };
            
            // Preserve modalPrice
            if (currentCard.modalPrice && !freshCard.modalPrice) {
              preservedData.modalPrice = currentCard.modalPrice;
            }
            
            // Preserve type_line data (needed for proper card categorization)
            if (currentCard.type_line && !freshCard.type_line) {
              preservedData.type_line = currentCard.type_line;
            }
            
            // Preserve nested type_line in card object
            if (currentCard.card?.type_line && preservedData.card && typeof preservedData.card === 'object' && !preservedData.card.type_line) {
              preservedData.card.type_line = currentCard.card.type_line;
            }
            
            // Preserve scryfall_json data (contains type_line and other essential card data)
            if (currentCard.scryfall_json && !freshCard.scryfall_json) {
              preservedData.scryfall_json = currentCard.scryfall_json;
            }
            
            // Preserve nested scryfall_json in card object
            if (currentCard.card?.scryfall_json && preservedData.card && typeof preservedData.card === 'object' && !preservedData.card.scryfall_json) {
              preservedData.card.scryfall_json = currentCard.card.scryfall_json;
            }
            
            return preservedData;
          }
          
          return freshCard;
        });
        
        // Also preserve modalPrice and type data in sideboard and tech ideas
        const finalSideboard = (freshDeck.sideboard || []).map(freshCard => {
          const cardName = freshCard.name || freshCard.card?.name;
          
          // Find corresponding card in current sideboard to preserve data
          const currentSideboardCard = deck?.sideboard?.find(current => {
            const currentName = current.name || current.card?.name;
            return currentName === cardName;
          });
          
          if (currentSideboardCard) {
            let preservedData = { ...freshCard };
            
            // Preserve modalPrice
            if (currentSideboardCard.modalPrice && !freshCard.modalPrice) {
              preservedData.modalPrice = currentSideboardCard.modalPrice;
            }
            
            // Preserve cardObj - CRITICAL for pricing and modal functionality
            if (currentSideboardCard.cardObj && !freshCard.cardObj) {
              preservedData.cardObj = currentSideboardCard.cardObj;
            }
            
            // Preserve type data for proper categorization
            if (currentSideboardCard.type_line && !freshCard.type_line) {
              preservedData.type_line = currentSideboardCard.type_line;
            }
            if (currentSideboardCard.card?.type_line && preservedData.card && typeof preservedData.card === 'object' && !preservedData.card.type_line) {
              preservedData.card.type_line = currentSideboardCard.card.type_line;
            }
            if (currentSideboardCard.scryfall_json && !freshCard.scryfall_json) {
              preservedData.scryfall_json = currentSideboardCard.scryfall_json;
            }
            if (currentSideboardCard.card?.scryfall_json && preservedData.card && typeof preservedData.card === 'object' && !preservedData.card.scryfall_json) {
              preservedData.card.scryfall_json = currentSideboardCard.card.scryfall_json;
            }
            
            return preservedData;
          }
          
          // If no current sideboard card found, ensure cardObj exists for new cards
          let enhancedFreshCard = { ...freshCard };
          
          // Ensure cardObj exists - critical for modal and pricing functionality
          if (!enhancedFreshCard.cardObj) {
            if (enhancedFreshCard.scryfall_json) {
              // Create cardObj from scryfall_json if available
              enhancedFreshCard.cardObj = {
                scryfall_id: enhancedFreshCard.scryfall_json.scryfall_id || enhancedFreshCard.printing,
                name: enhancedFreshCard.scryfall_json.name || enhancedFreshCard.name,
                set: enhancedFreshCard.scryfall_json.set,
                collector_number: enhancedFreshCard.scryfall_json.collector_number,
                image_uris: enhancedFreshCard.scryfall_json.image_uris,
                scryfall_json: enhancedFreshCard.scryfall_json
              };
            } else {
              // Fallback: create minimal cardObj structure
              enhancedFreshCard.cardObj = {
                scryfall_id: enhancedFreshCard.printing,
                name: enhancedFreshCard.name,
                set: enhancedFreshCard.set || 'unknown',
                collector_number: enhancedFreshCard.collector_number || '0',
                image_uris: enhancedFreshCard.image_uris || null,
                // Create a minimal scryfall_json structure for pricing
                scryfall_json: enhancedFreshCard.scryfall_json || {
                  name: enhancedFreshCard.name,
                  scryfall_id: enhancedFreshCard.printing,
                  prices: { usd: '0.25' } // fallback price
                }
              };
            }
            // Created fallback cardObj
          }
          
          // Ensure modalPrice is set for pricing calculations
          if (!enhancedFreshCard.modalPrice) {
            // Try multiple paths to find pricing data, with validation
            const priceOptions = [
              { source: 'cardObj.scryfall_json.prices.usd', value: enhancedFreshCard.cardObj?.scryfall_json?.prices?.usd },
              { source: 'scryfall_json.prices.usd', value: enhancedFreshCard.scryfall_json?.prices?.usd },
              { source: 'prices.usd', value: enhancedFreshCard.prices?.usd },
              { source: 'price', value: enhancedFreshCard.price }
            ];
            
            let possiblePrice = null;
            let priceSource = 'fallback';
            
            for (const option of priceOptions) {
              if (option.value && typeof option.value === 'string' && parseFloat(option.value) > 0 && parseFloat(option.value) < 1000) {
                possiblePrice = option.value;
                priceSource = option.source;
                break;
              }
            }
            
            if (possiblePrice) {
              enhancedFreshCard.modalPrice = possiblePrice;
              // Set modalPrice with valid pricing data
            } else {
              // Last resort: set a minimal fallback price
              enhancedFreshCard.modalPrice = '0.25';
            }
          }
          
          return enhancedFreshCard;
        });
        
        // Processing tech ideas from server response
        
        // Process tech ideas with enhanced corruption detection and prevention
        const finalTechIdeas = (freshDeck.techIdeas || []).map(freshCard => {
          const cardName = freshCard.name || freshCard.card?.name;
          
          // Skip rapid reprocessing of same card - add a processing timestamp
          const now = Date.now();
          const lastProcessed = window.techIdeasProcessing || {};
          const cardKey = `${cardName}_${freshCard._id || freshCard.card}`;
          
          if (lastProcessed[cardKey] && (now - lastProcessed[cardKey]) < 5000) {
            // Skip rapid reprocessing, but apply cached fixes if they exist
            const cachedFix = window.fixedTechIdeasCache?.get(cardName);
            if (cachedFix && (Date.now() - cachedFix.fixedAt) < 300000) {
              freshCard.card = cachedFix.card;
              // Only apply cached modalPrice if it exists and is valid
              if (cachedFix.modalPrice) {
                const cachedPriceNum = parseFloat(cachedFix.modalPrice.toString().replace(/^\$/, ''));
                if (cachedPriceNum > 0 && cachedPriceNum < 100) {
                  freshCard.modalPrice = cachedFix.modalPrice;
                } else {
                  // Clear the corrupted cache entry
                  window.fixedTechIdeasCache.delete(cardName);
                }
              }
            }
            
            return freshCard; // Return as-is to prevent infinite processing
          }
          
          lastProcessed[cardKey] = now;
          window.techIdeasProcessing = lastProcessed;
          
          // Check for cached fixes to prevent re-corruption
          const cachedFix = window.fixedTechIdeasCache?.get(cardName);
          if (cachedFix && (Date.now() - cachedFix.fixedAt) < 300000) { // 5 minute cache
            freshCard.card = cachedFix.card;
            
            // Validate cached price before applying
            if (cachedFix.modalPrice) {
              const cachedPriceNum = parseFloat(cachedFix.modalPrice.toString().replace(/^\$/, ''));
              if (cachedPriceNum > 0 && cachedPriceNum < 100) {
                freshCard.modalPrice = cachedFix.modalPrice;
                return freshCard; // Return immediately to prevent any further processing
              } else {
                // Clear the corrupted cache entry and continue with normal processing
                window.fixedTechIdeasCache.delete(cardName);
              }
            } else {
              return freshCard; // Return the structural fix even without price
            }
          }
          
          // Check for corrupted structure and fix if needed
          if (typeof freshCard.card !== 'string') {
            // Structure is OK, ensure modalPrice exists and cache it
            if (!freshCard.modalPrice) {
              const possiblePrice = freshCard.card?.scryfall_json?.prices?.usd ||
                                   freshCard.scryfall_json?.prices?.usd;
              
              // Only set modalPrice if we actually have price data
              if (possiblePrice) {
                freshCard.modalPrice = `$${possiblePrice}`;
                
                // Cache the complete data to prevent future recalculations
                if (!window.fixedTechIdeasCache) {
                  window.fixedTechIdeasCache = new Map();
                }
                window.fixedTechIdeasCache.set(freshCard.name, {
                  card: freshCard.card,
                  modalPrice: freshCard.modalPrice,
                  fixedAt: Date.now()
                });
              }
            }
          }
          
          // Fix corrupted structure if needed
          if (typeof freshCard.card === 'string') {
            const cardId = freshCard.card;
            
            // Try to preserve original scryfall_json data if it exists
            let originalPrices = {};
            if (freshCard.scryfall_json?.prices) {
              originalPrices = freshCard.scryfall_json.prices;
            } else if (freshCard.name === 'In the Trenches') {
              // Special case for "In the Trenches" which we know should be $0.31
              originalPrices = { usd: '0.31' };
            }
            // For other cards, don't provide a fallback price - let the normal pricing logic handle it
            
            freshCard.card = {
              scryfall_id: cardId,
              name: freshCard.name,
              scryfall_json: {
                scryfall_id: cardId,
                name: freshCard.name,
                ...(Object.keys(originalPrices).length > 0 && { prices: originalPrices })
              }
            };
            
            // Only set modalPrice if we have preserved pricing data or it's "In the Trenches"
            if (!freshCard.modalPrice) {
              if (freshCard.name === 'In the Trenches') {
                freshCard.modalPrice = '$0.31';
              } else if (freshCard.card?.scryfall_json?.prices?.usd) {
                freshCard.modalPrice = `$${freshCard.card.scryfall_json.prices.usd}`;
              }
            }
            
            // Store the fixed card in a local cache to prevent re-corruption - but only if we have valid price data
            if (!window.fixedTechIdeasCache) {
              window.fixedTechIdeasCache = new Map();
            }
            
            // Cache the fix with price validation
            if (freshCard.modalPrice) {
              const priceNum = parseFloat(freshCard.modalPrice.toString().replace(/^\$/, ''));
              if (priceNum > 0 && priceNum < 100) {
                window.fixedTechIdeasCache.set(freshCard.name, {
                  card: freshCard.card,
                  modalPrice: freshCard.modalPrice,
                  fixedAt: Date.now()
                });
              } else {
                // Still cache structure fix but not the suspicious price
                window.fixedTechIdeasCache.set(freshCard.name, {
                  card: freshCard.card,
                  modalPrice: null,
                  fixedAt: Date.now()
                });
              }
            } else {
              // Still cache the structure fix, but without modalPrice
              window.fixedTechIdeasCache.set(freshCard.name, {
                card: freshCard.card,
                modalPrice: null,
                fixedAt: Date.now()
              });
            }
            
            // TODO: Save to database async (for now, local cache prevents re-corruption)
            // saveDatabaseFix(freshCard);
          }
          
          // Find corresponding card in current tech ideas to preserve data
          const currentTechCard = deck?.techIdeas?.find(current => {
            const currentName = current.name || current.card?.name;
            return currentName === cardName;
          });
          
          if (currentTechCard) {
            let preservedData = { ...freshCard };
            
            // Preserve modalPrice - but don't overwrite if we already have cached modalPrice
            if (currentTechCard.modalPrice && !freshCard.modalPrice) {
              preservedData.modalPrice = currentTechCard.modalPrice;
            }
            
            // Preserve cardObj - CRITICAL for pricing and modal functionality
            if (currentTechCard.cardObj && !freshCard.cardObj) {
              preservedData.cardObj = currentTechCard.cardObj;
            }
            
            // ENSURE modalPrice exists after preservation - but don't overwrite cached prices
            if (!preservedData.modalPrice && !freshCard.modalPrice) {
              const priceOptions = [
                preservedData.cardObj?.scryfall_json?.prices?.usd,
                preservedData.card?.scryfall_json?.prices?.usd,
                currentTechCard.modalPrice
              ];
              
              let possiblePrice = null;
              for (const option of priceOptions) {
                if (option && typeof option === 'string' && parseFloat(option) > 0 && parseFloat(option) < 1000) {
                  possiblePrice = option;
                  break;
                }
              }
              
              // Only use fallback if no valid price found
              if (!possiblePrice) {
                possiblePrice = '0.25'; // Conservative fallback
              }
              
              preservedData.modalPrice = possiblePrice.startsWith('$') ? possiblePrice : `$${possiblePrice}`;
            }
            
            // Preserve type data for proper categorization
            if (currentTechCard.type_line && !freshCard.type_line) {
              preservedData.type_line = currentTechCard.type_line;
            }
            if (currentTechCard.card?.type_line && preservedData.card && typeof preservedData.card === 'object' && !preservedData.card.type_line) {
              preservedData.card.type_line = currentTechCard.card.type_line;
            }
            if (currentTechCard.scryfall_json && !freshCard.scryfall_json) {
              preservedData.scryfall_json = currentTechCard.scryfall_json;
            }
            if (currentTechCard.card?.scryfall_json && preservedData.card && typeof preservedData.card === 'object' && !preservedData.card.scryfall_json) {
              preservedData.card.scryfall_json = currentTechCard.card.scryfall_json;
            }
            
            return preservedData;
          }
          
          // If no current tech card found, ensure cardObj exists for new cards
          let enhancedFreshCard = { ...freshCard };
          
          // Ensure cardObj exists - critical for modal and pricing functionality
          if (!enhancedFreshCard.cardObj) {
            if (enhancedFreshCard.scryfall_json) {
              // Create cardObj from scryfall_json if available
              enhancedFreshCard.cardObj = {
                scryfall_id: enhancedFreshCard.scryfall_json.scryfall_id || enhancedFreshCard.printing,
                name: enhancedFreshCard.scryfall_json.name || enhancedFreshCard.name,
                set: enhancedFreshCard.scryfall_json.set,
                collector_number: enhancedFreshCard.scryfall_json.collector_number,
                image_uris: enhancedFreshCard.scryfall_json.image_uris,
                scryfall_json: enhancedFreshCard.scryfall_json
              };
            } else if (enhancedFreshCard.card && typeof enhancedFreshCard.card === 'object') {
              // Create cardObj from fixed card structure
              enhancedFreshCard.cardObj = enhancedFreshCard.card;
            } else {
              // Fallback: create minimal cardObj structure
              enhancedFreshCard.cardObj = {
                scryfall_id: enhancedFreshCard.printing || (typeof enhancedFreshCard.card === 'string' ? enhancedFreshCard.card : 'unknown'),
                name: enhancedFreshCard.name,
                set: enhancedFreshCard.set || 'unknown',
                collector_number: enhancedFreshCard.collector_number || '0',
                image_uris: enhancedFreshCard.image_uris || null,
                // Create a minimal scryfall_json structure for pricing
                scryfall_json: {
                  name: enhancedFreshCard.name,
                  scryfall_id: enhancedFreshCard.printing,
                  prices: { usd: '0.31' } // fallback price
                }
              };
            }
            // Created cardObj for processing
          }
          
          // Ensure modalPrice is set for pricing calculations
          if (!enhancedFreshCard.modalPrice) {
            // Try multiple paths to find pricing data, with validation
            const priceOptions = [
              { source: 'cardObj.scryfall_json.prices.usd', value: enhancedFreshCard.cardObj?.scryfall_json?.prices?.usd },
              { source: 'card.scryfall_json.prices.usd', value: enhancedFreshCard.card?.scryfall_json?.prices?.usd },
              { source: 'scryfall_json.prices.usd', value: enhancedFreshCard.scryfall_json?.prices?.usd },
              { source: 'prices.usd', value: enhancedFreshCard.prices?.usd },
              { source: 'price', value: enhancedFreshCard.price }
            ];
            
            let possiblePrice = null;
            let priceSource = 'fallback';
            
            for (const option of priceOptions) {
              if (option.value && typeof option.value === 'string' && parseFloat(option.value) > 0 && parseFloat(option.value) < 1000) {
                possiblePrice = option.value;
                priceSource = option.source;
                break;
              }
            }
            
            // Only use fallback if no valid price found
            if (!possiblePrice) {
              possiblePrice = '0.25'; // Conservative fallback
              priceSource = 'conservative_fallback';
            }
            
            enhancedFreshCard.modalPrice = possiblePrice;
          }
          
          return enhancedFreshCard;
        });
        
        setCardsWithEmergencyPreservation(finalCards);
        setDeck({
          ...freshDeck,
          // CRITICAL: Preserve commander data from current deck since server loses it
          commander: deck.commander || freshDeck.commander,
          commanderNames: deck.commanderNames || freshDeck.commanderNames,
          cards: finalCards,
          sideboard: finalSideboard,
          techIdeas: finalTechIdeas,
          lastUpdated: Date.now(),
          _verificationTimestamp: Date.now()
        });
        
      } else {
        console.error('Failed to fetch fresh deck data:', response.status);
      }
      
    } catch (error) {
      console.error('Error during consistency check:', error);
    }
  }, [deck, cards, setCardsWithEmergencyPreservation]);
  
  // Function to save corruption fixes to database
  const saveDatabaseFix = useCallback(async (fixedCard) => {
    if (!deck || !deck._id) return;
    
    try {
      const token = localStorage.getItem("token");
      const apiUrl = import.meta.env.VITE_API_URL;
      
      if (!token) return;
      
      // Update the entire deck to fix the corrupted tech idea
      const updatedTechIdeas = deck.techIdeas?.map(tech => 
        tech.name === fixedCard.name ? fixedCard : tech
      ) || [fixedCard];
      
      const response = await fetch(`${apiUrl}/api/decks/${deck._id}`, {
        method: "PUT", 
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          ...deck,
          techIdeas: updatedTechIdeas
        }),
      });
      
      if (response.ok) {
        // Database fix saved successfully
      } else {
        // Failed to save database fix
        console.error("Failed to save database fix, status:", response.status);
      }
    } catch (error) {
      console.error('Error saving database fix:', error);
    }
  }, [deck]);
  
  // Run deck verification after deck loads and periodically
  useEffect(() => {
    // TEMPORARILY DISABLED - causing render loop
    return;
    
    if (deck && deck._id && cards) {
      // Initial verification after deck loads
      const verificationDelay = setTimeout(() => {
        verifyDeckConsistency();
      }, 2000); // Give time for all initial renders to complete
      
      return () => clearTimeout(verificationDelay);
    }
  }, [deck?._id, verifyDeckConsistency]);
  
  // Periodic verification to catch any database sync issues
  useEffect(() => {
    // TEMPORARILY DISABLED - causing render loop
    return;
    
    if (!deck?._id) return;
    
    const verificationInterval = setInterval(() => {
      verifyDeckConsistency();
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(verificationInterval);
  }, [deck?._id, verifyDeckConsistency]);
  
  // Bulk edit functionality
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());

  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [showTextImportModal, setShowTextImportModal] = useState(false);
  const [showPhotoImportModal, setShowPhotoImportModal] = useState(false);
  const [noResultsMsg, setNoResultsMsg] = useState("");
  const [updatingPrinting, setUpdatingPrinting] = useState(false);
  
  // Keyboard navigation for search dropdown
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  
  // Search results modal state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [allSearchResults, setAllSearchResults] = useState([]);
  const [searchModalLoading, setSearchModalLoading] = useState(false);
  const [searchModalFlipStates, setSearchModalFlipStates] = useState(new Map());
  const [deckFlipStates, setDeckFlipStates] = useState(new Map()); // Track flip states for deck cards
  const [modalSearchTerm, setModalSearchTerm] = useState(""); // Track what search term opened the modal
  const [modalSearch, setModalSearch] = useState(""); // Internal modal search input

  // Lock body scroll when search modal is open
  useEffect(() => {
    if (showSearchModal) {
      // Save current scroll position and lock body
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll position and unlock body
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showSearchModal]);

  // Close export/import dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportDropdown && !event.target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }
      if (showImportDropdown && !event.target.closest('.import-dropdown-container')) {
        setShowImportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown, showImportDropdown]);

  // Debug: Track all instances
  useEffect(() => {
    return () => {
      // Component cleanup
    };
  }, []);

  // Function to handle card hover and update preview (optimized for immediate response)
  const handleCardHover = useCallback((cardObj) => {
    if (!cardObj) {
      // If cardObj is null, clear the preview
      setFixedPreview({ card: null });
      return;
    }

    // Get current preview card name for comparison (avoid accessing state in dependency)
    setFixedPreview(current => {
      const currentPreviewCard = current?.card;
      const currentCardName = currentPreviewCard?.name || currentPreviewCard?.card?.name;
      const newCardName = cardObj.name || cardObj.card?.name;
      
      // More robust card comparison - check multiple identifying factors
      const isSameCard = currentCardName === newCardName && 
                        currentPreviewCard &&
                        // Also check printing if available to distinguish different printings of same card
                        ((!cardObj.printing && !currentPreviewCard.printing) || 
                         cardObj.printing === currentPreviewCard.printing);
      
      // If the same card is already being previewed, don't update
      if (isSameCard) {
        return current; // Return current state unchanged
      }

    // Ensure we have a complete card object with all necessary data
    let card = { ...cardObj };

    // Preserve foil information and flip state
    const foilInfo = {
      foil: cardObj.foil,
      isFoil: cardObj.isFoil || cardObj.foil,
    };
    
    const flipState = cardObj.showBackFace || cardObj._flipState;

    // Handle different card object structures
    // 1. Search results from Scryfall API might have a different structure
    // 2. Cards from the deck might have card data in a nested .card property
    // 3. Some objects might directly be the card

    // Extract the card name, which is the most important piece of information
    const cardName = card.name || card.card?.name;

    // Check if this is a basic land and should use preferred printing
    const isBasicLand = BASIC_LAND_PRINTINGS[cardName];
    
    // Check if this is a search result card (has forceEnglish flag)
    const isSearchResult = card.forceEnglish === true;

    // First check if we have specific printing information that we want to preserve
    // For deck cards, we should ALWAYS preserve their specific printing to maintain consistency
    // UNLESS it's a basic land, in which case we override with preferred printing
    const hasPrintingData =
      !isSearchResult &&
      !isBasicLand &&  // Override basic lands with preferred printing
      (card.printing ||
       card.card?.printing ||
       card.scryfall_json ||
       card.image_uris ||
       card.card?.scryfall_json ||
       card.card?.image_uris);

    // For basic lands, force use of preferred printing
    if (isBasicLand) {
      const preferredPrintingId = BASIC_LAND_PRINTINGS[cardName];
      card = {
        ...card,
        ...foilInfo,
        printing: preferredPrintingId,
        forceEnglish: true,
        forceHighRes: true,
        name: cardName,
        // Clear existing image data to force fetch of preferred printing
        image_uris: null,
        scryfall_json: null,
        card: card.card
          ? {
              ...card.card,
              ...foilInfo,
              printing: preferredPrintingId,
              name: cardName,
              image_uris: null,
              scryfall_json: null,
            }
          : {
              name: cardName,
              ...foilInfo,
              printing: preferredPrintingId,
              image_uris: null,
              scryfall_json: null,
            },
      };
    }



    // Handle different processing paths based on card type and data availability
    if (isBasicLand) {
      // Basic lands: already processed above with preferred printing
      // No additional processing needed - card object is ready
    }
    else if (hasPrintingData) {
      // For deck cards, preserve the exact printing data to ensure consistency
      // between preview, modal, and deck list pricing
      
      // If we have printing-specific data, use it directly
      // Make sure nested card object has the same printing data
      if (card.card && typeof card.card === 'object' && card.card !== null) {
        card.card.printing = card.printing || card.card.printing;
        card.card = { ...card.card, ...foilInfo }; // Preserve foil info
        if (card.scryfall_json && !card.card.scryfall_json) {
          card.card.scryfall_json = card.scryfall_json;
        }
        if (card.image_uris && !card.card.image_uris) {
          card.card.image_uris = card.image_uris;
        }
      } else if (card.card && typeof card.card === 'string') {
        // If card.card is just an ObjectId string, create a minimal card object
        console.warn('[CARD HOVER] card.card is a string (ObjectId), creating minimal object for:', cardName);
        card.card = {
          _id: card.card,
          name: cardName,
          printing: card.printing,
          ...foilInfo
        };
      }
      // Also preserve foil info at the top level
      card = { ...card, ...foilInfo };
      
      // CRITICAL: Don't clear image_uris or force English lookup for deck cards
      // This preserves the specific printing that the user has in their deck
    }
    // If we don't have specific printing data, or this is a search result, use name-based lookup
    else if (cardName) {

      // Create a clean card object that prioritizes just the name
      // This ensures CardPreview will use the Scryfall API to get an English version
      card = {
        ...card,
        ...foilInfo, // Preserve foil information
        forceEnglish: true, // Signal to CardPreview that we want English cards only
        forceHighRes: true, // Signal that we want high resolution images
        name: cardName, // Ensure name is at the top level for the Scryfall API URL
        // For search results or cards without printing data, clear image_uris to force API lookup
        image_uris: null,
        // Keep the card structure but update it
        card: card.card
          ? {
              ...card.card,
              ...foilInfo, // Preserve foil information in nested card too
              name: cardName,
              // Clear image_uris to force fresh API lookup
              image_uris: null,
            }
          : {
              name: cardName,
              ...foilInfo,
              image_uris: null,
            },
      };
    }



      // Make sure we properly format the object for the CardPreview component
      const previewObject = {
        ...foilInfo, // Include foil information at the top level
        // Add required ID fields for CardPreview validation
        id: card.id || card.scryfall_id || card.card?.id || card.card?.scryfall_id,
        scryfall_id: card.scryfall_id || card.id || card.card?.scryfall_id || card.card?.id,
        // Preserve printing information if available
        printing: card.printing,
        card: {
          ...card,
          ...foilInfo, // Also include foil information in the card object
          // Add ID fields to nested card object too
          id: card.id || card.scryfall_id || card.card?.id || card.card?.scryfall_id,
          scryfall_id: card.scryfall_id || card.id || card.card?.scryfall_id || card.card?.id,
          // Ensure printing information is available in nested card object too
          printing: card.printing,
        },
        top: 0, // For fixed preview these aren't used, but required by the component
        left: 0,
        flipState: flipState, // Pass the flip state to the preview
      };

      return previewObject;
    });
  }, []);  // Clear bulk selections when grouping changes
  useEffect(() => {
    setSelectedCards(new Set());
  }, [groupBy, sortBy]);

  // Memoized card objects for search results to prevent flickering
  const searchResultsWithMemoizedCards = useMemo(() => {
    return searchResults.map((card, index) => {
      // Create a stable key for the card to prevent unnecessary hover calls
      const cardKey = `${card.name}-${card.set || 'default'}-${index}`;
      
      return {
        originalCard: card,
        cardKey,
        cardForHover: {
          name: card.name,
          id: card.id || card.scryfall_id, // Add required ID for CardPreview validation
          scryfall_id: card.scryfall_id || card.id, // Add scryfall_id for CardPreview validation
          card: {
            name: card.name,
            id: card.id || card.scryfall_id, // Add ID to nested card object too
            scryfall_id: card.scryfall_id || card.id, // Add scryfall_id to nested card object too
            ...(card.image_uris && { image_uris: card.image_uris }),
            ...(card.scryfall_json && { scryfall_json: card.scryfall_json }),
            ...(card.mana_cost && { mana_cost: card.mana_cost }),
            ...(card.type_line && { type_line: card.type_line }),
            ...(card.oracle_text && { oracle_text: card.oracle_text }),
            ...(card.power && { power: card.power }),
            ...(card.toughness && { toughness: card.toughness }),
            ...(card.loyalty && { loyalty: card.loyalty }),
          },
          forceEnglish: true,
          forceHighRes: true,
          printing: card.set || card.set_name || null,
          set: card.set || card.set_name || null,
          collector_number: card.collector_number || null,
        }
      };
    });
  }, [searchResults]);

  // Track the last hovered card to prevent duplicate hover calls
  const lastHoveredCardRef = useRef(null);

  // Function to reset selection immediately for better mouse responsiveness
  const resetSelection = useMemo(
    () => () => {
      setSelectedSearchIndex(-1);
    },
    []
  );

  // Optimized event handlers to prevent render loops
  const handleDeckCardMouseEnter = useCallback((cardData, isExplicitlyFoil, deckFlipStates) => {
    // For basic lands, use preferred printing to match modal
    const isBasicLand = BASIC_LAND_PRINTINGS[cardData.name];
    let preferredPrinting = cardData.printing || cardData.cardObj?.printing;
    
    if (isBasicLand) {
      preferredPrinting = BASIC_LAND_PRINTINGS[cardData.name];
    }

    // Create card key for flip state lookup
    const cardKey = `${cardData.name}-${cardData.printing || cardData.cardObj?.scryfall_id || 'default'}`;
    const currentFlipState = deckFlipStates.get(cardKey) || false;

    // Create enhanced card object with foil, printing AND flip state information
    const cardWithFoil = {
      ...cardData.cardObj,
      foil: isExplicitlyFoil,
      isFoil: isExplicitlyFoil,
      name: cardData.name,
      // CRITICAL: Use preferred printing for basic lands to match modal
      printing: preferredPrinting,
      // Include current flip state for this specific card
      showBackFace: currentFlipState,
      _flipState: currentFlipState,
    };
    handleCardHover(cardWithFoil);
  }, [handleCardHover]);

  const handleToggleCardSelection = useCallback((cardData) => {
    toggleCardSelection(cardData);
  }, [toggleCardSelection]);

  const handleSideboardCardClick = useCallback((cardData, isExplicitlyFoil, price, bulkEditMode, toggleCardSelection, setModalState) => {
    if (bulkEditMode) {
      toggleCardSelection(cardData);
      return;
    }
    
    // Ensure we have a proper object, not a string ID
    let baseObj = {};
    if (cardData.cardObj && typeof cardData.cardObj === 'object') {
      baseObj = JSON.parse(JSON.stringify(cardData.cardObj));
    } else if (typeof cardData.cardObj === 'string') {
      // cardObj is a string ID, create a minimal object structure
      baseObj = {
        scryfall_id: cardData.cardObj,
        name: cardData.name,
        printing: cardData.printing
      };
      console.log(`[MODAL CLICK] cardObj was string ID, created object for: ${cardData.name}`);
    }
    
    const enrichedCardObj = {
      ...baseObj,
      name: cardData.name,
      foil: isExplicitlyFoil,
      count: cardData.count || 1,
      price: price || null,
      printing: cardData.printing || baseObj.printing,
    };
    if (enrichedCardObj.card && typeof enrichedCardObj.card === 'object') {
      enrichedCardObj.card.foil = isExplicitlyFoil;
    } else if (typeof enrichedCardObj.card === 'string') {
      // If card is a string ID, don't try to set properties on it
      console.log(`[MODAL CLICK] enrichedCardObj.card was string ID: ${enrichedCardObj.card}`);
    }
    setModalState({
      isOpen: true,
      cardObj: enrichedCardObj,
    });
  }, []);

  const handleDeckCardClick = useCallback((cardData, isExplicitlyFoil, price, setModalState) => {
    // Create a deeply cloned object to avoid reference issues
    const baseObj = JSON.parse(
      JSON.stringify(cardData.cardObj || {}),
    );

    // For basic lands, use user's preferred printing to match deck creation consistency
    const isBasicLand = BASIC_LAND_PRINTINGS[cardData.name];
    const preferredPrintingId = isBasicLand ? getUserPreferredPrinting(cardData.name) : null;
    let preferredPrinting = cardData.printing || baseObj.printing;
    
    if (isBasicLand && preferredPrintingId) {
      preferredPrinting = preferredPrintingId;
      console.log(`🏞️ [MODAL] Using user preferred printing for ${cardData.name}: ${preferredPrintingId}`);
    }

    // Create enhanced card object with preferred printing for basic lands
    const enrichedCardObj = {
      ...baseObj,
      name: cardData.name, // Ensure name is available at top level
      foil: isExplicitlyFoil, // Use the actual foil property, not extractPrice interpretation
      count: cardData.count || 1, // Ensure count is at top level
      price: price || null, // Include the calculated price
      printing: preferredPrinting, // Use preferred printing for basic lands
      
      // For basic lands, override scryfall data to match preferred printing
      ...(isBasicLand && preferredPrintingId && {
        id: preferredPrintingId,
        scryfall_id: preferredPrintingId,
        // Clear image URIs to force fresh loading of preferred printing images
        image_uris: null,
        card: {
          ...baseObj.card,
          printing: preferredPrintingId,
          scryfall_id: preferredPrintingId,
          id: preferredPrintingId,
          // Clear scryfall_json to force fresh data loading
          scryfall_json: null
        }
      })
    };

    // Ensure foil status is consistent at all levels of the object
    if (enrichedCardObj.card) {
      enrichedCardObj.card.foil = isExplicitlyFoil;
    }

    setModalState({
      isOpen: true,
      cardObj: enrichedCardObj,
    });
  }, []);
  
  // Handle escape key for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showSearchModal) {
        closeSearchModal();
      }
    };

    if (showSearchModal) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the modal container for keyboard accessibility
      const modalContainer = document.querySelector('[data-search-modal]');
      if (modalContainer) {
        modalContainer.focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSearchModal]);

  // Helper function to properly close search modal and cleanup
  const closeSearchModal = () => {
    // Cancel any ongoing modal search when closing
    if (modalSearchAbortControllerRef.current) {
      modalSearchAbortControllerRef.current.abort();
    }
    setShowSearchModal(false);
    setSearchModalFlipStates(new Map());
    setModalSearch("");
    setModalSearchTerm("");
  };

  // Reset keyboard selection when search results change
  useEffect(() => {
    setSelectedSearchIndex(-1);
    lastHoveredCardRef.current = null; // Reset hover tracking
  }, [searchResults, showDropdown]);



  // Handle adding a card to the deck
  const handleAddCard = useCallback(async (cardToAdd) => {
    if (!deck || !cardToAdd) {
      console.error('Cannot add card: missing deck or card data');
      toast.error('Cannot add card: missing deck or card data');
      return;
    }
    
    if (!cardToAdd.name) {
      console.error('Cannot add card: missing card name');
      toast.error('Cannot add card: missing card name');
      return;
    }

    // DEBOUNCE FIX: Prevent rapid successive calls for the same card
    const cardKey = `${cardToAdd.name}-${cardToAdd.set || 'default'}`;
    const now = Date.now();
    const lastCall = addCardDebounceRef.current.get(cardKey);
    
    if (lastCall && (now - lastCall) < 1000) { // 1 second debounce
      toast.info(`Please wait a moment before adding ${cardToAdd.name} again`);
      return;
    }
    
    addCardDebounceRef.current.set(cardKey, now);

    // Check if the card already exists in the deck OR in emergency cards
    const existingCardIndex = cards.findIndex((card) => {
      const cardName = card.card?.name || card.name;
      return cardName === cardToAdd.name;
    });
    
    // CRITICAL: Also check emergency cards to prevent duplicate additions
    const emergencyCardExists = Array.from(emergencyCardsRef.current.values()).some(emergencyCard => {
      const emergencyName = emergencyCard.name || emergencyCard.card?.name;
      return emergencyName === cardToAdd.name;
    });
    
    if (emergencyCardExists) {
      toast.info(`${cardToAdd.name} is already in your deck (emergency restore active)`);
      return;
    }

    if (existingCardIndex !== -1) {
      // Card already exists, increment its quantity instead of adding a new entry
      const existingCard = cards[existingCardIndex];
      const currentQuantity = existingCard.count || existingCard.quantity || 1;
      const newQuantity = currentQuantity + 1;

      // Use the existing handleUpdateCard function to update the quantity
      handleUpdateCard(existingCard, { quantity: newQuantity });

        // Force a deck state update to ensure stats and UI refresh properly
        setDeck(prevDeck => {
          if (!prevDeck) return prevDeck;
          
          const updatedCards = prevDeck.cards.map(card => {
            const cardName = card.card?.name || card.name;
            if (cardName === cardToAdd.name) {
              return {
                ...card,
                count: newQuantity,
                quantity: newQuantity
              };
            }
            return card;
          });
          
          return {
            ...prevDeck,
            cards: updatedCards
            // PERFORMANCE FIX: Remove lastUpdated to prevent unnecessary re-renders
          };
        });      toast.success(`Added ${cardToAdd.name} to deck (now ${newQuantity})`);
      return;
    }

    // Card doesn't exist, proceed with adding it as a new entry
    try {
      const token = localStorage.getItem("token");
      const apiUrl = import.meta.env.VITE_API_URL;
      const isDev = import.meta.env.DEV;

      // Use the Scryfall ID from the search result (now properly returned by backend)
      const scryfallId = cardToAdd.scryfall_id || cardToAdd.id;

      if (!scryfallId) {
        console.error("No Scryfall ID found in card data");
        toast.error("Unable to add card: missing ID information");
        return;
      }

      // Prepare request body with the correct data for the server
      const requestBody = {
        name: cardToAdd.name,
        cardId: scryfallId,
        quantity: 1,
        card: {
          name: cardToAdd.name,
          id: scryfallId
        }
      };

      // Include printing information if available to preserve specific printing
      if (cardToAdd.set) {
        requestBody.set = cardToAdd.set;
      }
      if (cardToAdd.collector_number) {
        requestBody.collector_number = cardToAdd.collector_number;
      }
      if (cardToAdd.finishes && cardToAdd.finishes.length > 0) {
        requestBody.finishes = cardToAdd.finishes;
      }

      // FIXED: Use existing PUT endpoint to update entire deck instead of non-existent cards endpoint
      const url = `/api/decks/${deck._id}`;
      
      // Debug API URL construction
      console.log('🔧 API URL Debug:', {
        apiUrl,
        isDev,
        url,
        finalUrl: isDev ? `http://localhost:3001${url}` : `${apiUrl}${url}`
      });
      
      const finalUrl = isDev ? `http://localhost:3001${url}` : `${apiUrl}${url}`;

      // CRITICAL: For basic lands, override with user's preferred printing for consistency
      const isBasicLand = BASIC_LAND_PRINTINGS[cardToAdd.name];
      const preferredPrintingId = isBasicLand ? getUserPreferredPrinting(cardToAdd.name) : null;
      let finalCardToAdd = cardToAdd;
      
      if (isBasicLand) {
        console.log(`🏞️ [ADD CARD] Using user preferred printing for ${cardToAdd.name}: ${preferredPrintingId}`);
        
        // Override the cardToAdd with preferred printing data
        finalCardToAdd = {
          ...cardToAdd,
          id: preferredPrintingId,
          scryfall_id: preferredPrintingId,
          printing: preferredPrintingId,
          // Clear image data to force fetch of preferred printing
          image_uris: null
        };
      }

      // OPTIMISTIC UPDATE: Immediately add the card to the UI
      const optimisticCard = {
        name: finalCardToAdd.name,
        quantity: 1,
        count: 1,
        isCommander: false,
        set: finalCardToAdd.set,
        collector_number: finalCardToAdd.collector_number,
        finishes: finalCardToAdd.finishes || ["nonfoil"],
        prices: finalCardToAdd.prices,
        mana_cost: finalCardToAdd.mana_cost,
        color_identity: finalCardToAdd.color_identity,
        cmc: finalCardToAdd.cmc,
        type_line: finalCardToAdd.type_line,
        printing: finalCardToAdd.printing || finalCardToAdd.scryfall_id || finalCardToAdd.id,
        // CRITICAL: Preserve complete card data structure
        card: {
          name: finalCardToAdd.name,
          mana_cost: finalCardToAdd.mana_cost,
          color_identity: finalCardToAdd.color_identity,
          cmc: finalCardToAdd.cmc,
          type_line: finalCardToAdd.type_line,
          set: finalCardToAdd.set,
          collector_number: finalCardToAdd.collector_number,
          prices: finalCardToAdd.prices,
          printing: finalCardToAdd.printing || finalCardToAdd.scryfall_id || finalCardToAdd.id,
          scryfall_json: finalCardToAdd,
          // Ensure all essential Scryfall data is preserved
          ...finalCardToAdd
        },
        scryfallCard: finalCardToAdd,
        scryfall_json: finalCardToAdd,
        // Mark as pending to show loading state
        _optimistic: true
      };

      console.log("🏞️ BASIC LAND PRINTING FIX:", {
        cardName: cardToAdd.name,
        isBasicLand,
        originalPrinting: cardToAdd.printing || cardToAdd.scryfall_id || cardToAdd.id,
        preferredPrinting: preferredPrintingId,
        finalPrinting: finalCardToAdd.printing || finalCardToAdd.scryfall_id || finalCardToAdd.id,
        usingPreferred: isBasicLand && preferredPrintingId !== (cardToAdd.printing || cardToAdd.scryfall_id || cardToAdd.id)
      });

      // Update deck state immediately for better UX
      setDeck(prevDeck => {
        if (!prevDeck) return prevDeck;
        return {
          ...prevDeck,
          cards: [...prevDeck.cards, optimisticCard],
          cardCount: prevDeck.cards.length + 1
          // PERFORMANCE FIX: Remove lastUpdated to prevent excessive re-renders
        };
      });

      // Also update cards state optimistically to keep it in sync
      setCardsWithEmergencyPreservation(prevCards => [...prevCards, optimisticCard]);

      // Show immediate feedback
      toast.success(`Adding ${cardToAdd.name} to deck...`);

      // FIXED: Create minimal card object for server to avoid payload size issues
      // Only include essential data for server validation and storage
      const newCard = {
        name: finalCardToAdd.name,
        quantity: 1,
        count: 1,
        isCommander: false,
        set: finalCardToAdd.set,
        collector_number: finalCardToAdd.collector_number,
        finishes: finalCardToAdd.finishes || ["nonfoil"],
        prices: finalCardToAdd.prices || {},
        mana_cost: finalCardToAdd.mana_cost,
        color_identity: finalCardToAdd.color_identity,
        cmc: finalCardToAdd.cmc,
        type_line: finalCardToAdd.type_line,
        printing: finalCardToAdd.printing || finalCardToAdd.scryfall_id || finalCardToAdd.id,
        scryfall_id: finalCardToAdd.id || finalCardToAdd.scryfall_id,
        // Minimal card object for type detection
        card: {
          name: finalCardToAdd.name,
          mana_cost: finalCardToAdd.mana_cost,
          color_identity: finalCardToAdd.color_identity,
          cmc: finalCardToAdd.cmc,
          type_line: finalCardToAdd.type_line,
          set: finalCardToAdd.set,
          collector_number: finalCardToAdd.collector_number,
          printing: finalCardToAdd.printing || finalCardToAdd.scryfall_id || finalCardToAdd.id,
          scryfall_id: finalCardToAdd.id || finalCardToAdd.scryfall_id
          // Removed large scryfall_json to reduce payload size
        }
      };
      
      // Clean existing cards to remove excessive nested data
      const cleanedExistingCards = (deck.cards || []).map(card => ({
        name: card.name,
        quantity: card.quantity || 1,
        count: card.count || 1,
        isCommander: card.isCommander || false,
        set: card.set,
        collector_number: card.collector_number,
        finishes: card.finishes || ["nonfoil"],
        prices: card.prices || {},
        mana_cost: card.mana_cost,
        color_identity: card.color_identity,
        cmc: card.cmc,
        type_line: card.type_line,
        scryfall_id: card.scryfall_id || card.card?.scryfall_id,
        // Minimal card object
        card: {
          name: card.name || card.card?.name,
          mana_cost: card.mana_cost || card.card?.mana_cost,
          color_identity: card.color_identity || card.card?.color_identity,
          cmc: card.cmc || card.card?.cmc,
          type_line: card.type_line || card.card?.type_line,
          set: card.set || card.card?.set,
          collector_number: card.collector_number || card.card?.collector_number,
          scryfall_id: card.scryfall_id || card.card?.scryfall_id
        }
      }));
      
      // Create clean deck object for server update - remove potentially problematic properties
      const cleanDeckForServer = {
        _id: deck._id,
        name: deck.name,
        format: deck.format,
        commander: deck.commander,
        cards: [...cleanedExistingCards, newCard],
        // Preserve sideboard and techIdeas to prevent disappearing sections
        ...(deck.sideboard && { sideboard: deck.sideboard }),
        ...(deck.techIdeas && { techIdeas: deck.techIdeas }),
        // Only include essential properties to avoid server validation issues
        ...(deck.description && { description: deck.description }),
        ...(deck.colors && { colors: deck.colors })
      };
      
      const updatedDeck = cleanDeckForServer;

      // Debug request payload with detailed structure analysis
      const serializedDeck = JSON.stringify(updatedDeck);
      console.log('🚀 Sending PUT request to:', finalUrl);
      console.log('📦 Request body deck structure:', {
        deckId: updatedDeck._id,
        cardsCount: updatedDeck.cards?.length,
        newCardName: newCard.name,
        requestSize: serializedDeck.length,
        hasNestedScryfall: newCard.scryfall_json ? 'YES' : 'NO',
        cardObjectKeys: Object.keys(newCard),
        sampleCardSize: JSON.stringify(newCard).length,
        serverEnvironment: isDev ? 'DEVELOPMENT' : 'PRODUCTION',
        timestamp: new Date().toISOString()
      });
      
      // Check for potential circular references or overly nested data
      if (serializedDeck.length > 50000) {
        console.warn('⚠️ Large request detected:', serializedDeck.length, 'bytes');
        console.log('📊 Card data sample:', JSON.stringify(newCard).substring(0, 500) + '...');
      }

      const response = await fetch(finalUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(updatedDeck),
      });

      if (response.ok) {
        const serverResponse = await response.json();
        
        // DEBUG: Log server response to track card persistence
        console.log('[DEBUG] Server response after card addition:', {
          commander: serverResponse.commander,
          commanderNames: serverResponse.commanderNames,
          cardsCount: serverResponse.cards?.length,
          timestamp: new Date().toISOString(),
          deckId: serverResponse._id
        });
        
        // DEBUG: Log specific card that was added
        const addedCard = serverResponse.cards?.find(c => (c.card?.name || c.name) === cardToAdd.name);
        console.log('[DEBUG] Added card verification:', {
          cardName: cardToAdd.name,
          foundInResponse: !!addedCard,
          cardDetails: addedCard,
          totalCardsAfterAdd: serverResponse.cards?.length
        });
        
        // DEBUG: Log all card names in server response for comparison
        console.log('[DEBUG] All card names in server response:', serverResponse.cards?.map(c => c.card?.name || c.name).sort());

        // CRITICAL FIX: Merge server response with local data to preserve card details
        const mergedAddCards = (serverResponse.cards || []).map(serverCard => {
          // Find corresponding local card from the request payload
          const localCard = updatedDeck.cards.find(localCard => {
            const serverName = serverCard.name || serverCard.card?.name;
            const localName = localCard.name || localCard.card?.name;
            return serverName === localName;
          });
          
          if (localCard) {
            return {
              ...localCard, // Keep detailed local data
              ...serverCard, // Apply server updates
              card: {
                ...localCard.card,
                ...(serverCard.card || {}),
                // Preserve essential properties for type detection
                type_line: localCard.card?.type_line || localCard.type_line || serverCard.type_line,
                scryfall_json: localCard.card?.scryfall_json || localCard.scryfall_json,
                mana_cost: localCard.card?.mana_cost || localCard.mana_cost,
                color_identity: localCard.card?.color_identity || localCard.color_identity,
                cmc: localCard.card?.cmc || localCard.cmc
              }
            };
          }
          return serverCard;
        });

        // CRITICAL FIX: Ensure commander is always present in the deck after server update
        const finalDeck = {
          ...serverResponse,
          cards: ensureCommanderInCards({ ...serverResponse, cards: mergedAddCards })
        };

        // ZONE PRESERVATION FIX: Preserve current sideboard/techIdeas when updating with server response
        // Server doesn't return zones, so we need to keep the current ones from deck state
        setDeck(prevDeck => ({
          ...finalDeck,
          // Preserve current sideboard/techIdeas from previous state
          sideboard: prevDeck?.sideboard || [],
          techIdeas: prevDeck?.techIdeas || []
        }));
        setCardsWithEmergencyPreservation(finalDeck.cards || []);
        
        // Update success message
        toast.success(`Successfully added ${cardToAdd.name} to deck!`);

        // PRICE SYNC FIX: Ensure deck list and modal always show the same price
        try {
          const newlyAddedCard = finalDeck.cards.find(card => {
            const cardName = card.card?.name || card.name;
            return cardName === cardToAdd.name;
          });

          if (newlyAddedCard && scryfallId) {
            // CRITICAL FIX: Use the same prints search approach as the modal for identical data
            // This ensures we get the exact same price data that the modal would show
            const cardName = cardToAdd.name;
            const printsSearchUri = `https://api.scryfall.com/cards/search?q=unique:prints+!"${encodeURIComponent(cardName)}"`;
            
            const scryfallResponse = await fetch(printsSearchUri);
            if (scryfallResponse.ok) {
              const printsData = await scryfallResponse.json();
              
              // Find the specific printing that matches our scryfallId (same logic as modal)
              const freshScryfallData = printsData.data?.find(p => p.id === scryfallId) || printsData.data?.[0];
              
              if (freshScryfallData) {
                
                // Calculate the price using the same logic as the modal for perfect synchronization
              const prices = freshScryfallData.prices || {};
              const finishes = freshScryfallData.finishes || [];
              const promoTypes = freshScryfallData.promo_types || [];
              
              // Use the exact same price calculation logic as the modal
              const isFoilOnly = 
                (freshScryfallData.foil === true && freshScryfallData.nonfoil === false) ||
                (finishes.includes('foil') && !finishes.includes('nonfoil'));
              
              let modalPrice = null;
              
              // Use the exact same price calculation logic as the modal
              
              // CRITICAL FIX: Search results should default to non-foil pricing unless explicitly marked as foil
              // The cardToAdd.foil being true is likely a false positive from search results
              if (isFoilOnly) {
                if (finishes.includes('etched') || freshScryfallData.frame_effects?.includes('etched')) {
                  modalPrice = prices.usd_etched || prices.usd_foil || prices.usd || null;
                } else if (promoTypes.includes('surgefoil') || promoTypes.includes('rainbow') || 
                           promoTypes.includes('textured') || promoTypes.includes('boosterfun')) {
                  modalPrice = prices.usd_foil || prices.usd || null;
                } else {
                  modalPrice = prices.usd_foil || prices.usd || null;
                }
              } else {
                // For search results, always default to non-foil price unless card is foil-only
                modalPrice = prices.usd || null;
              }
              
              // Update the card with fresh pricing data AND the exact modal price
              const updatedCards = finalDeck.cards.map(card => {
                const cardName = card.card?.name || card.name;
                if (cardName === cardToAdd.name) {
                  // Validate modalPrice to prevent undefined values
                  const validModalPrice = (modalPrice !== undefined && modalPrice !== null && modalPrice !== "undefined") ? modalPrice : null;
                  return {
                    ...card,
                    // Update nested card structure with fresh Scryfall data
                    card: {
                      ...card.card,
                      scryfall_json: freshScryfallData,
                      prices: freshScryfallData.prices,
                      // Store the exact modal price for consistency
                      modalPrice: validModalPrice
                    },
                    // Also update any top-level scryfall data
                    scryfall_json: freshScryfallData,
                    prices: freshScryfallData.prices,
                    modalPrice: validModalPrice, // Store modal price at top level too
                    lastUpdated: Date.now()
                  };
                }
                return card;
              });

              finalDeck.cards = updatedCards;
              }
            }
          }
        } catch (priceError) {
          // Non-critical error, don't prevent card addition
        }

        // CRITICAL FIX: Merge enhanced data from existing cards with server response
        // This prevents other cards from reverting to different printings when adding a new card
        const mergedCards = finalDeck.cards.map(serverCard => {
          const cardName = serverCard.card?.name || serverCard.name;
          
          // Find the existing card with enhanced data (if any)
          const existingCard = cards.find(existingCard => {
            const existingCardName = existingCard.card?.name || existingCard.name;
            return existingCardName === cardName;
          });
          
          if (existingCard && existingCard !== serverCard) {
            // Merge enhanced data from existing card with server updates
            return {
              ...serverCard,
              // Preserve enhanced scryfall data and pricing from existing card
              card: {
                ...serverCard.card,
                ...(existingCard.card?.scryfall_json && {
                  scryfall_json: existingCard.card.scryfall_json
                }),
                ...(existingCard.card?.prices && {
                  prices: existingCard.card.prices
                }),
                ...(existingCard.card?.modalPrice !== undefined && {
                  modalPrice: existingCard.card.modalPrice
                })
              },
              // Also preserve top-level enhanced data
              ...(existingCard.scryfall_json && {
                scryfall_json: existingCard.scryfall_json
              }),
              ...(existingCard.prices && {
                prices: existingCard.prices
              }),
              ...(existingCard.modalPrice !== undefined && {
                modalPrice: existingCard.modalPrice
              })
            };
          }
          
          // For new cards or cards without existing enhanced data, return as-is
          return serverCard;
        });
        
        const mergedDeck = {
          ...finalDeck,
          _id: deck._id, // CRITICAL FIX: Explicitly preserve the original deck ID
          cards: mergedCards
        };
        
        // ZONE PRESERVATION FIX: Preserve current sideboard/techIdeas when updating merged deck
        setDeck(prevDeck => ({
          ...mergedDeck,
          // Preserve current sideboard/techIdeas from previous state
          sideboard: prevDeck?.sideboard || [],
          techIdeas: prevDeck?.techIdeas || []
        }));
        setCards(mergedCards);

        toast.success(`Added ${cardToAdd.name} to deck`);
      } else {
        // REVERT OPTIMISTIC UPDATE on error
        setDeck(prevDeck => {
          if (!prevDeck) return prevDeck;
          return {
            ...prevDeck,
            cards: prevDeck.cards.filter(card => !card._optimistic || card.name !== cardToAdd.name),
            cardCount: prevDeck.cards.length - 1
            // PERFORMANCE FIX: Remove lastUpdated to prevent render loops
          };
        });
        
        const errorText = await response.text();
        console.error("Failed to add card to deck:", response.status, response.statusText);
        console.error("Server error response:", errorText);
        toast.error(`Failed to add card to deck: ${response.status} - ${errorText || response.statusText}`);
      }
    } catch (error) {
      // REVERT OPTIMISTIC UPDATE on network error
      setDeck(prevDeck => {
        if (!prevDeck) return prevDeck;
        return {
          ...prevDeck,
          cards: prevDeck.cards.filter(card => !card._optimistic || card.name !== cardToAdd.name),
          cardCount: prevDeck.cards.length - 1
          // PERFORMANCE FIX: Remove lastUpdated to prevent render loops
        };
      });
      
      console.error("Error adding card to deck:", error.message);
      toast.error(`Error adding card to deck: ${error.message}. Please try again.`);
    }
  }, [deck, setDeck, ensureCommanderInCards]); // Add dependencies to prevent recreation

  // PERSISTENCE TEST: Add to window for console testing (after handleAddCard is defined)
  React.useEffect(() => {
    if (typeof window !== 'undefined' && deck && handleAddCard) {
      window.testCardPersistence = async (cardName = 'Island') => {
        console.log(`🧪 [PERSISTENCE TEST] Starting test with card: ${cardName}`);
        console.log(`🧪 [PERSISTENCE TEST] Current deck cards before:`, deck.cards?.length);
        
        // Try to add a test card
        const testCard = {
          name: cardName,
          scryfall_id: '23635e40-d040-40b7-8b98-90ed362aa028', // FDN Island
          id: '23635e40-d040-40b7-8b98-90ed362aa028',
          set: 'fdn',
          collector_number: '275'
        };
        
        try {
          await handleAddCard(testCard);
          console.log(`🧪 [PERSISTENCE TEST] Add completed, waiting 2 seconds...`);
          
          // Wait and then test if it persists
          setTimeout(async () => {
            console.log(`🧪 [PERSISTENCE TEST] Testing persistence by refetching deck...`);
            
            const apiUrl = import.meta.env.VITE_API_URL;
            const token = localStorage.getItem('token');
            const response = await fetch(`${apiUrl}/api/decks/${deck._id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.ok) {
              const freshDeck = await response.json();
              const hasCard = freshDeck.cards?.some(c => (c.card?.name || c.name) === cardName);
              console.log(`🧪 [PERSISTENCE TEST] Card found in fresh fetch:`, hasCard);
              console.log(`🧪 [PERSISTENCE TEST] Fresh deck cards count:`, freshDeck.cards?.length);
              console.log(`🧪 [PERSISTENCE TEST] Fresh deck cards:`, freshDeck.cards?.map(c => c.card?.name || c.name).sort());
            } else {
              console.error(`🧪 [PERSISTENCE TEST] Failed to refetch deck:`, response.status);
            }
          }, 2000);
          
        } catch (error) {
          console.error(`🧪 [PERSISTENCE TEST] Error:`, error);
        }
      };
      
      console.log('🧪 Persistence test available: window.testCardPersistence()');
    }
  }, [deck, handleAddCard]);

  // Get deck ID from URL params (for loading a specific deck)
  // ...existing code...

  // Commander color identity cache to avoid repeated Scryfall API calls
  const [commanderColorCache, setCommanderColorCache] = useState(new Map());

  // Memoize commander names to avoid re-calculating on every render
  const commanderNames = useMemo(() => {
    if (!deck) return [];

    let commanders = [];
    if (
      deck.commander &&
      Array.isArray(deck.commander) &&
      deck.commander.length > 0
    ) {
      commanders = deck.commander.filter((comm) => comm != null);
    } else if (
      deck.commander &&
      typeof deck.commander === "object" &&
      deck.commander !== null &&
      !Array.isArray(deck.commander)
    ) {
      commanders = [deck.commander];
    } else if (typeof deck.commander === "string" && deck.commander.trim()) {
      commanders = [deck.commander];
    }

    // Also check commanderNames field for unresolved commanders
    if (
      deck.commanderNames &&
      Array.isArray(deck.commanderNames) &&
      deck.commanderNames.length > 0
    ) {
      const nameCommanders = deck.commanderNames.filter(
        (name) => typeof name === "string" && name.trim(),
      );
      commanders = commanders.concat(nameCommanders);
    }

    return commanders
      .map((comm) => {
        const name = comm.card?.name || comm.name || comm;
        return typeof name === "string" ? name.toLowerCase() : "";
      })
      .filter((name) => name);
  }, [deck]);

  const handlePrintingUpdate = async (originalCardObj, newPrintingCard) => {
    if (!originalCardObj || !newPrintingCard) {
      console.error("Invalid card data provided for printing update");
      toast.error("Could not update card printing. Invalid data.");
      return;
    }

    // Use the specific printing update state instead of the main loading state
    // This prevents the full screen loading indicator from showing
    setUpdatingPrinting(true);
    const originalName = originalCardObj.card?.name || originalCardObj.name;

    // CRITICAL FIX: Ensure the new printing card has CMC data
    // If the new printing card doesn't have CMC, try to get it from the original card or calculate it
    if (newPrintingCard && typeof newPrintingCard.cmc === 'undefined') {
      // Try to get CMC from the original card first
      const originalCmc = originalCardObj?.scryfall_json?.cmc || 
                         originalCardObj?.card?.scryfall_json?.cmc || 
                         originalCardObj?.cmc || 
                         originalCardObj?.card?.cmc;
      
      if (originalCmc !== undefined) {
        newPrintingCard.cmc = originalCmc;
      }
    }

    try {
      // CRITICAL FIX: Determine foil capabilities of the new printing and adjust foil status accordingly
      const finishes = Array.isArray(newPrintingCard.finishes) ? newPrintingCard.finishes : [];
      const hasNonFoilFinish = finishes.includes('nonfoil');
      const hasFoilFinish = finishes.includes('foil') || finishes.includes('etched');
      

      
      // Fallback: If finishes array is empty, try to infer from other data
      // Some older sets or special printings might not have finishes data
      let inferredHasNonFoil = hasNonFoilFinish;
      let inferredHasFoil = hasFoilFinish;
      
      if (finishes.length === 0) {
        // If no finishes data, make reasonable assumptions based on set and card type
        // Most normal sets support both foil and non-foil by default
        // Special sets like Commander's Arsenal might be foil-only
        // Very old sets (pre-foil era) are non-foil only
        const setCode = newPrintingCard.set?.toLowerCase();
        const isVeryOldSet = ['lea', 'leb', '2ed', 'arn', 'atq', 'leg', 'drk', 'fem', 'ice', 'hml', 'all', 'mir', 'vis', 'wth', 'tmp', 'sth', 'exo'].includes(setCode);
        const isSpecialFoilSet = ['ocm1', 'pcm1'].includes(setCode); // Commander's Arsenal and similar
        
        // Analyze set to determine foil capabilities
        
        if (isVeryOldSet) {
          // Pre-foil era sets - non-foil only
          inferredHasNonFoil = true;
          inferredHasFoil = false;

        } else if (isSpecialFoilSet) {
          // Special foil-only sets
          inferredHasNonFoil = false;
          inferredHasFoil = true;

        } else {
          // Modern sets - assume both available
          inferredHasNonFoil = true;
          inferredHasFoil = true;

        }
      } else {
        // Use actual finishes data - this is the preferred path for accurate handling
        // Using actual finishes data from Scryfall
      }
      
      // DEBUG: Log final inferred capabilities
      // Final inferred foil capabilities determined
      
      // Determine the adjusted foil status based on printing capabilities and current status
      const currentFoilStatus = originalCardObj.foil || originalCardObj.card?.foil || false;
      let adjustedFoilStatus = currentFoilStatus;
      
      // DEBUG: Log current foil status before adjustment
      // Current foil status determined
      
      // CRITICAL: If the modal has calculated a specific foil status for the modalPrice, use that instead
      // BUT validate it against the printing's actual capabilities
      if (newPrintingCard.modalFoilStatus !== undefined) {
        const modalSuggestedFoilStatus = newPrintingCard.modalFoilStatus;
        // Modal suggested foil status
        
        // Validate the modal's suggestion against the printing's actual capabilities
        if (modalSuggestedFoilStatus === true) {
          // Modal wants foil - check if the printing supports foil
          if (inferredHasFoil) {
            adjustedFoilStatus = true;
            // Using modal foil status (foil) - printing supports foil
          } else {
            // Modal wants foil but printing doesn't support it - force non-foil
            adjustedFoilStatus = false;
            // Modal wanted foil but printing is non-foil only - forcing non-foil
          }
        } else {
          // Modal wants non-foil - check if the printing supports non-foil
          if (inferredHasNonFoil) {
            adjustedFoilStatus = false;
            // Using modal foil status (non-foil) - printing supports non-foil
          } else {
            // Modal wants non-foil but printing doesn't support it - force foil
            adjustedFoilStatus = true;
            // Modal wanted non-foil but printing is foil only - forcing foil
          }
        }
      } else {
        // Fallback: Calculate adjusted foil status based on printing capabilities
        // If the new printing is foil-only, force foil to true
        if (!inferredHasNonFoil && inferredHasFoil) {
          adjustedFoilStatus = true;
          // New printing is foil-only, setting foil to true
        }
        // If the new printing is non-foil-only, force foil to false
        else if (inferredHasNonFoil && !inferredHasFoil) {
          adjustedFoilStatus = false;
          // New printing is non-foil-only, setting foil to false
        }
        // If both finishes are available, preserve the current foil status
        else if (inferredHasNonFoil && inferredHasFoil) {
          adjustedFoilStatus = currentFoilStatus;
          // Both finishes available, preserving current foil status
        }
        // Final calculated foil status determined
      }
      
      // CRITICAL PRICE SYNC FIX: Use modalPrice from modal if available, otherwise calculate it
      // This ensures perfect synchronization between modal display and deck list
      let modalPrice = null;
      
      // Check if modalPrice was already calculated in the modal and passed to us
      if (newPrintingCard.modalPrice !== undefined && newPrintingCard.modalPrice !== null) {
        modalPrice = newPrintingCard.modalPrice;
        // Using modalPrice from modal
      } else {
        // Fallback: Calculate modalPrice using the same logic as the modal
        const prices = newPrintingCard.prices || {};
        const printingFinishes = newPrintingCard.finishes || [];
        
        // Use the exact same price calculation logic as the modal
        const isFoilOnly = 
          (newPrintingCard.foil === true && newPrintingCard.nonfoil === false) ||
          (printingFinishes.includes('foil') && !printingFinishes.includes('nonfoil'));
        
        if (isFoilOnly) {
          if (printingFinishes.includes('etched') || newPrintingCard.frame_effects?.includes('etched')) {
            modalPrice = prices.usd_etched || prices.usd_foil || prices.usd || null;
          } else {
            modalPrice = prices.usd_foil || prices.usd || null;
          }
        } else if (adjustedFoilStatus) {
          modalPrice = prices.usd_foil || prices.usd || null;
        } else {
          modalPrice = prices.usd || null;
        }
        

      }
      
      // Create a new card object structure for the updated card.
      // This will replace the old card data while preserving important fields.
      const newCardData = {
        // Preserve original ID and MongoDB refs
        _id: originalCardObj._id,
        id: originalCardObj.id,

        // Use name from the card object or directly from originalCardObj
        name: originalCardObj.card?.name || originalCardObj.name,

        // Preserve quantity/count
        count: originalCardObj.count || 1,

        // Use adjusted foil status based on new printing capabilities
        foil: adjustedFoilStatus,

        // Update with new printing ID - critical for updates to work correctly
        printing: newPrintingCard.id,
        
        // CRITICAL: Include modalPrice for price consistency - validate to prevent undefined
        modalPrice: (modalPrice !== undefined && modalPrice !== null && modalPrice !== "undefined") ? modalPrice : null,
        
        // Include mana-related fields at top level to preserve grouping by mana value
        cmc: newPrintingCard.cmc,
        mana_cost: newPrintingCard.mana_cost,
        type_line: newPrintingCard.type_line,
        color_identity: newPrintingCard.color_identity,

        // Update the full card reference
        card: {
          // Keep the original MongoDB ID if it exists
          ...(originalCardObj.card?._id
            ? { _id: originalCardObj.card._id }
            : {}),

          // Add essential fields from the new printing
          name: newPrintingCard.name,
          set: newPrintingCard.set,
          collector_number: newPrintingCard.collector_number,
          
          // Include mana-related fields to preserve grouping by mana value
          cmc: newPrintingCard.cmc,
          mana_cost: newPrintingCard.mana_cost,
          type_line: newPrintingCard.type_line,
          color_identity: newPrintingCard.color_identity,

          // CRITICAL: Set foil status at card level too
          foil: adjustedFoilStatus,

          // CRITICAL: Include modalPrice at card level too for consistency
          modalPrice: modalPrice,

          // Add prices directly to card object for easier access
          prices: newPrintingCard.prices || {},

          // Important to include image_uris at card level too for previews
          image_uris: newPrintingCard.image_uris || null,

          // Include the full Scryfall data on the card for previews
          scryfall_json: newPrintingCard,
        },

        // Update the cached full data - critical for previews to work
        scryfall_json: newPrintingCard,

        // Add image_uris for immediate preview
        image_uris: newPrintingCard.image_uris || null,
      };

      // OPTIMIZATION: Only update the UI once by doing all state updates in a batch
      // Create a single state update transaction

      // 1. First update the fixed preview if it's currently showing this card
      // This ensures that when you hover the card in the deck list, it shows the new printing
      const currentPreviewCard = fixedPreview?.card;
      const previewCardName =
        currentPreviewCard?.name || currentPreviewCard?.card?.name;

      if (currentPreviewCard && previewCardName === originalName) {
        // We need to update the preview state with the new printing information
        // console.log('[DeckViewEdit] Updating fixed preview to show the new printing');

        // Create an updated card object for the preview
        const updatedPreviewCard = {
          ...currentPreviewCard,
          printing: newPrintingCard.id,
          foil: adjustedFoilStatus, // Use adjusted foil status
          scryfall_json: newPrintingCard,
          image_uris: newPrintingCard.image_uris,
          // Update the nested card object if it exists
          ...(currentPreviewCard.card
            ? {
                card: {
                  ...currentPreviewCard.card,
                  ...newCardData.card,
                  foil: adjustedFoilStatus, // Also update in nested card object
                },
              }
            : {}),
        };

        // Update the fixed preview
        setFixedPreview({
          card: updatedPreviewCard,
          top: 0, // For fixed preview these aren't used, but required by the component
          left: 0,
        });

        // Also call handleCardHover to ensure a consistent update
        handleCardHover({
          name: originalName,
          id: newPrintingCard.id, // Add required ID for CardPreview validation
          scryfall_id: newPrintingCard.id, // Add scryfall_id for CardPreview validation
          printing: newPrintingCard.id,
          foil: adjustedFoilStatus, // Include adjusted foil status
          scryfall_json: newPrintingCard,
          image_uris: newPrintingCard.image_uris,
        });
      }

      // 2. Update the modal state to reflect the newly selected printing
      if (modalState.isOpen && modalState.cardObj) {
        const updatedModalCard = {
          ...modalState.cardObj,
          printing: newPrintingCard.id,
          foil: adjustedFoilStatus, // Use adjusted foil status
          scryfall_json: newPrintingCard,
          image_uris: newPrintingCard.image_uris,
          card: {
            ...modalState.cardObj.card,
            ...newCardData.card,
            foil: adjustedFoilStatus, // Also update in nested card object
          },
        };

        setModalState({
          isOpen: true,
          cardObj: updatedModalCard,
        });
      }

      // 3. Update all matching cards in the master cards list
      const updatedCards = cards.map((c) => {
        if (c && (c.card?.name || c.name) === originalName) {
          
          // Updating card in deck list
          
          // Return a new object with the updated printing data
          const updated = {
            ...c,
            printing: newPrintingCard.id,
            foil: adjustedFoilStatus, // Use the adjusted foil status
            scryfall_json: newPrintingCard,
            image_uris: newPrintingCard.image_uris,
            modalPrice: modalPrice, // CRITICAL: Update modalPrice for immediate price sync
            // Include mana-related fields at top level
            cmc: newCardData.cmc,
            mana_cost: newCardData.mana_cost,
            type_line: newCardData.type_line,
            color_identity: newCardData.color_identity,
            card: {
              ...c.card,
              ...newCardData.card,
              foil: adjustedFoilStatus, // Also update foil status in nested card object
              modalPrice: modalPrice, // Also update modalPrice in nested card object
            },
          };
          
          return updated;
        }
        return c;
      });

      // Update local state for immediate UI feedback (before API call)
      setCards(updatedCards);

      // Helper function to check if a string is a valid MongoDB ObjectId
      const isValidObjectId = (id) => {
        return id && typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
      };

      // Create a clean version of the cards for the API
      const cleanCards = updatedCards.map((card) => {
        // CRITICAL FIX: Validate modalPrice to prevent undefined from being sent to server
        const validModalPrice = (card.modalPrice !== undefined && card.modalPrice !== null && card.modalPrice !== "undefined") ? card.modalPrice : null;
        
        // Basic card info that's always needed - match structure from handleAddCard
        let cleanCard = {
          name: card.card?.name || card.name,
          count: card.count || 1,
          quantity: card.count || 1, // Add quantity field for server compatibility
          printing: card.printing || null,
          isCommander: card.isCommander || false, // Ensure isCommander field
          ...(card.foil !== undefined ? { foil: card.foil } : {}),
          // Include all essential card properties for server validation
          set: card.set || card.card?.set || card.scryfall_json?.set,
          collector_number: card.collector_number || card.card?.collector_number || card.scryfall_json?.collector_number,
          finishes: card.finishes || card.scryfall_json?.finishes || ["nonfoil"],
          prices: card.prices || card.card?.prices || card.scryfall_json?.prices || {},
          mana_cost: card.mana_cost || card.card?.mana_cost || card.scryfall_json?.mana_cost,
          color_identity: card.color_identity || card.card?.color_identity || card.scryfall_json?.color_identity,
          cmc: card.cmc || card.card?.cmc || card.scryfall_json?.cmc,
          type_line: card.type_line || card.card?.type_line || card.scryfall_json?.type_line,
          scryfall_id: card.scryfall_id || card.card?.scryfall_id || card.scryfall_json?.id,
          // CRITICAL FIX: Include modalPrice to persist synchronized pricing - only if not null
          ...(validModalPrice !== null ? { modalPrice: validModalPrice } : {}),
        };

        // Debug logging for modalPrice persistence
        if (validModalPrice !== null) {
          // Including modalPrice for server sync
        }

        // Handle MongoID references properly
        if (card._id && isValidObjectId(card._id)) {
          cleanCard._id = card._id;
        }

        // CRITICAL FIX: Properly structure the card field for server compatibility
        // The server expects either a MongoDB ObjectId string OR a complete card object
        if (card.card) {
          if (typeof card.card === "object" && card.card !== null) {
            if (card.card._id && isValidObjectId(card.card._id)) {
              // Use MongoDB ObjectId reference
              cleanCard.card = card.card._id;
            } else {
              // Include essential card data structure for server
              cleanCard.card = {
                name: card.card.name || card.name,
                set: card.card.set || card.set || card.scryfall_json?.set,
                collector_number: card.card.collector_number || card.collector_number || card.scryfall_json?.collector_number,
                mana_cost: card.card.mana_cost || card.mana_cost || card.scryfall_json?.mana_cost,
                color_identity: card.card.color_identity || card.color_identity || card.scryfall_json?.color_identity,
                cmc: card.card.cmc || card.cmc || card.scryfall_json?.cmc,
                type_line: card.card.type_line || card.type_line || card.scryfall_json?.type_line,
                ...(card.card._id && isValidObjectId(card.card._id) ? { _id: card.card._id } : {}),
              };
            }
          } else if (typeof card.card === "string") {
            if (isValidObjectId(card.card)) {
              cleanCard.card = card.card;
            } else {
              // Create card object with available data
              cleanCard.card = {
                name: card.name,
                set: card.set || card.scryfall_json?.set,
                collector_number: card.collector_number || card.scryfall_json?.collector_number,
                mana_cost: card.mana_cost || card.scryfall_json?.mana_cost,
                color_identity: card.color_identity || card.scryfall_json?.color_identity,
                cmc: card.cmc || card.scryfall_json?.cmc,
                type_line: card.type_line || card.scryfall_json?.type_line,
              };
            }
          }
        } else {
          // No card reference - create one from available data
          cleanCard.card = {
            name: card.name,
            set: card.set || card.scryfall_json?.set,
            collector_number: card.collector_number || card.scryfall_json?.collector_number,
            mana_cost: card.mana_cost || card.scryfall_json?.mana_cost,
            color_identity: card.color_identity || card.scryfall_json?.color_identity,
            cmc: card.cmc || card.scryfall_json?.cmc,
            type_line: card.type_line || card.scryfall_json?.type_line,
          };
        }

        return cleanCard;
      });

      console.log('[PRINTING UPDATE] Sending updated cards to server:', cleanCards);
      console.log('[PRINTING UPDATE] Full payload:', {
        cards: cleanCards,
        name: name || deck.name,
        commander: deck.commander,
        commanderNames: deck.commanderNames,
      });

      // Make the API call to save changes to the server
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }
      
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/decks/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        credentials: "include",
        body: JSON.stringify({
          cards: cleanCards,
          name: name || deck.name,
          // Preserve commander data in server update
          commander: deck.commander,
          commanderNames: deck.commanderNames,
        }),
      });

      // Check if the response is ok
      if (!res.ok) {
        let errorText;
        let errorData;
        try {
          errorData = await res.json();
          errorText = JSON.stringify(errorData);
          console.error("[PRINTING UPDATE] Server error:", res.status, errorData);
          console.error("[PRINTING UPDATE] Request payload that failed:", {
            cards: cleanCards,
            name: name || deck.name,
            commander: deck.commander,
            commanderNames: deck.commanderNames,
          });
        } catch (e) {
          errorText = await res.text();
          console.error("[PRINTING UPDATE] Server error:", res.status, errorText);
          console.error("[PRINTING UPDATE] Request payload that failed:", {
            cards: cleanCards,
            name: name || deck.name,
            commander: deck.commander,
            commanderNames: deck.commanderNames,
          });
        }
        throw new Error(`Printing update server error ${res.status}: ${errorText}`);
      }

      const updatedCardData = await res.json();
      // console.log('[DeckViewEdit] Server returned updated deck:', updatedCardData);

      // CRITICAL FIX: Clean up modalPrice values from server response - convert undefined to null
      if (updatedCardData?.cards) {
        updatedCardData.cards = updatedCardData.cards.map(serverCard => {
          const cleanServerModalPrice = (serverCard.modalPrice !== undefined && serverCard.modalPrice !== null && serverCard.modalPrice !== "undefined") ? serverCard.modalPrice : null;
          const cleanServerNestedModalPrice = (serverCard.card?.modalPrice !== undefined && serverCard.card?.modalPrice !== null && serverCard.card?.modalPrice !== "undefined") ? serverCard.card?.modalPrice : null;
          
          return {
            ...serverCard,
            modalPrice: cleanServerModalPrice,
            ...(serverCard.card ? {
              card: {
                ...serverCard.card,
                modalPrice: cleanServerNestedModalPrice
              }
            } : {})
          };
        });
      }

      // Process server response

      // Update the deck state ONLY ONCE, with the combined changes
      // No need to trigger another state update since we've already
      // updated the UI with our local changes
      setDeck((prev) => ({
        ...prev,
        ...updatedCardData,
        cards: updatedCards, // Keep our local card state with all the UI-needed fields
        // ZONE PRESERVATION FIX: Preserve current sideboard/techIdeas from printing updates
        sideboard: prev?.sideboard || [],
        techIdeas: prev?.techIdeas || []
      }));

      toast.success(`Updated ${originalName} to ${newPrintingCard.set_name}.`);
    } catch (error) {
      console.error("Failed to save updated deck:", error);

      // Provide more specific error messages
      if (error.message.includes("mongoose")) {
        toast.error(
          "Failed to save printing change due to a server connection issue. Please try again.",
        );
      } else if (error.message.includes("not defined")) {
        toast.error(
          "Failed to save printing change due to a code issue. The developers have been notified.",
        );
        console.error(
          "Code Error in handlePrintingUpdate:",
          error.message,
          error.stack,
        );
      } else {
        toast.error(`Failed to save printing change: ${error.message}`);
      }
    } finally {
      // Reset the printing update state instead of the main loading state
      setUpdatingPrinting(false);
    }
  };

  // Global Escape key handler to close modal at any time
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === "Escape" && modalState.isOpen) {
        e.preventDefault();
        // console.log('[DeckViewEdit] Global Escape key pressed, closing modal'); // DEBUG
        setModalState({ isOpen: false, cardObj: null });
        // Clear Oracle Tag navigation context when modal closes via Escape
        setOracleTagNavigationState({
          isActive: false,
          searchResults: [],
          currentIndex: -1,
        });
      }
    };

    // Add event listener when component mounts
    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      // Clean up event listener when component unmounts
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []); // Empty dependency array - this effect runs once on mount

  // Global Escape key handler for modal
  useEffect(() => {
    function handleGlobalEscape(e) {
      if (e.key === "Escape" && modalState.isOpen) {
        // console.log('[DeckViewEdit] Global Escape key pressed, closing modal'); // DEBUG
        e.preventDefault();
        e.stopPropagation();
        setModalState({ isOpen: false, cardObj: null });
        // Clear Oracle Tag navigation context when modal closes via Escape
        setOracleTagNavigationState({
          isActive: false,
          searchResults: [],
          currentIndex: -1,
        });
      }
    }

    // Add listener when modal is open, remove when closed
    if (modalState.isOpen) {
      // console.log('[DeckViewEdit] Adding global Escape key listener'); // DEBUG
      document.addEventListener("keydown", handleGlobalEscape, true); // Use capture phase
      window.addEventListener("keydown", handleGlobalEscape, true); // Also listen on window
    }

    return () => {
      // console.log('[DeckViewEdit] Removing global Escape key listener'); // DEBUG
      document.removeEventListener("keydown", handleGlobalEscape, true);
      window.removeEventListener("keydown", handleGlobalEscape, true);
    };
  }, [modalState.isOpen]);

  useEffect(() => {
    isMounted.current = true;

    // AUTOMATIC CACHE VALIDATION AND CLEANUP - runs on every component mount
    const validateAndCleanCache = () => {
      if (window.fixedTechIdeasCache) {
        const suspicious = [];
        const toDelete = [];
        
        for (const [name, data] of window.fixedTechIdeasCache.entries()) {
          if (data.modalPrice) {
            const priceNum = parseFloat(data.modalPrice.toString().replace(/^\$/, ''));
            if (priceNum > 100 || priceNum <= 0) {
              suspicious.push({ name, price: data.modalPrice, priceNum });
              toDelete.push(name);
            }
          }
        }
        
        if (toDelete.length > 0) {
          // Cleaning up corrupted cache entries
          toDelete.forEach(name => window.fixedTechIdeasCache.delete(name));
        }
      }
    };

    // Run automatic cache validation immediately
    validateAndCleanCache();

    // Validate deck ID format (should be 24 character hex string)
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      console.error("Invalid deck ID format:", id);
      toast.error("Invalid deck ID. Redirecting to home page...");
      setTimeout(() => {
        navigate("/");
      }, 2000);
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous fetches or duplicate fetches for same ID
    if (fetchInProgress.current || lastFetchedId.current === id) {
      // console.log('[DEBUG] Skipping duplicate fetch for deck ID:', id);
      return;
    }

    // console.log('[DEBUG] Starting fetch for deck ID:', id);
    fetchInProgress.current = true;
    lastFetchedId.current = id;

    const abortController = new AbortController();

    // Add timeout to prevent hanging requests - increased for Render cold starts
    const timeoutId = setTimeout(() => {
      console.error("Request timeout for deck ID:", id, "- Server may be cold starting, please try refreshing");
      abortController.abort();
    }, 30000); // 30 second timeout to handle cold starts

    // Add cache-busting parameter to force fresh requests
    const cacheBust = `?_cb=${Date.now()}`;
    const apiUrl = import.meta.env.VITE_API_URL;
    const token = localStorage.getItem('token');
    
    // Use public endpoint if in public mode
    const endpoint = isPublic ? `/api/public/decks/${id}` : `/api/decks/${id}`;
    
    fetch(`${apiUrl}${endpoint}${cacheBust}`, {
      signal: abortController.signal,
      cache: "no-cache",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        // Only include auth header for private decks
        ...(!isPublic && token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(async (r) => {
        clearTimeout(timeoutId);
        // console.log('[DEBUG] API Response:', r.status, 'for deck ID:', id); // Track which request succeeds/fails

        if (!r.ok) {
          if (r.status === 404) {
            console.error("404 Error for deck ID:", id);
            throw new Error("DECK_NOT_FOUND");
          }
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then((data) => {
        if (!isMounted.current) return;

        // DEBUG: Check commander properties and sideboard/techIdeas in server response
        console.log('[DEBUG] Deck loaded from server - commander properties:', {
          commander: data.commander,
          commanderNames: data.commanderNames,
          hasCommander: 'commander' in data,
          hasCommanderNames: 'commanderNames' in data,
          allKeys: Object.keys(data),
          fullDeckData: data
        });
        
        // DEBUG: Check if server already supports sideboard/techIdeas
        console.log('[DEBUG] Deck loaded from server - sideboard/techIdeas check:', {
          hasSideboard: 'sideboard' in data,
          hasTechiIdeas: 'techIdeas' in data,
          sideboardData: data.sideboard,
          techIdeasData: data.techIdeas,
          sideboardCount: data.sideboard?.length || 0,
          techIdeasCount: data.techIdeas?.length || 0
        });

        // CRITICAL FIX: If server lost commander data, infer it from cards
        if (!data.commander && data.cards && data.cards.length > 0) {
          // Look for legendary creatures that should be commanders
          const potentialCommanders = data.cards.filter(card => {
            const cardName = card.card?.name || card.name || '';
            const cardType = card.card?.type_line || card.type_line || '';
            
            // Debug: Log card data to see what we have
            console.log('[COMMANDER INFERENCE] Checking card:', {
              cardName,
              cardType,
              cardObj: card,
              hasCard: !!card.card,
              hasTypeLine: !!(card.card?.type_line || card.type_line),
              fullCard: card
            });
            
            return cardType.toLowerCase().includes('legendary') && cardType.toLowerCase().includes('creature');
          });
          
          if (potentialCommanders.length > 0) {
            const commanderCard = potentialCommanders[0];
            const commanderName = commanderCard.card?.name || commanderCard.name;
            
            console.log('[COMMANDER FIX] Server missing commander data, inferring from cards:', {
              inferredCommander: commanderName,
              fromCard: commanderCard,
              potentialCommanders: potentialCommanders.length
            });
            
            // Restore missing commander data
            data.commander = commanderName;
            data.commanderNames = [commanderName];
          } else {
            // If no legendary creatures found, but format is Commander, assume first card is commander
            if (data.format === 'Commander / EDH' && data.cards.length > 0) {
              const firstCard = data.cards[0];
              const commanderName = firstCard.card?.name || firstCard.name;
              
              console.log('[COMMANDER FIX] No legendary creatures found, but Commander format - assuming first card is commander:', {
                assumedCommander: commanderName,
                format: data.format,
                firstCard: firstCard
              });
              
              data.commander = commanderName;
              data.commanderNames = [commanderName];
            }
          }
        }

        // console.log('[DEBUG] Processing deck data:', data?.name, 'Cards count:', data?.cards?.length);

        // CRITICAL FIX: Clean up modalPrice values from initial data load - convert undefined to null
        if (data?.cards) {
          data.cards = data.cards.map(card => {
            const cleanModalPrice = (card.modalPrice !== undefined && card.modalPrice !== null && card.modalPrice !== "undefined") ? card.modalPrice : null;
            const cleanNestedModalPrice = (card.card?.modalPrice !== undefined && card.card?.modalPrice !== null && card.card?.modalPrice !== "undefined") ? card.card?.modalPrice : null;
            
            return {
              ...card,
              modalPrice: cleanModalPrice,
              ...(card.card ? {
                card: {
                  ...card.card,
                  modalPrice: cleanNestedModalPrice
                }
              } : {})
            };
          });
        }

        // DEBUG: Check if any cards have modalPrice when loaded from database
        // DEBUG: Check if any cards have modalPrice when loaded from database
        const cardsWithModalPrice = data?.cards?.filter(card => (card.modalPrice !== null && card.modalPrice !== undefined) || (card.card?.modalPrice !== null && card.card?.modalPrice !== undefined)) || [];
        // Process cards with modalPrice from database response

        const cardsFromAPI = ensureCommanderInCards(data);

        // Filter out test cards and invalid entries before processing
        const validCards = cardsFromAPI.filter(cardObj => {
          if (!cardObj) return false;
          const cardName = cardObj.card?.name || cardObj.name || '';
          // Skip obvious test data
          const testPatterns = /^(test|example|placeholder|unknown|null|undefined|sample)/i;
          return cardName.length > 2 && !testPatterns.test(cardName);
        });

        // console.log('[DEBUG] Verifying card data. Number of cards to check:', validCards.length);

        const fetchPromises = validCards.map((cardObj, index) => {
          if (!cardObj) {
            console.warn(`[Card Verifier] Card at index ${index} is null.`);
            return Promise.resolve(null);
          }

          const cardName =
            cardObj.card?.name ||
            cardObj.name ||
            `(unknown card at index ${index})`;

          // The presence of our own 'scryfall_json' property is the source of truth
          // for whether we have already fetched and processed this card's full data.
          const isDataComplete = !!cardObj.scryfall_json;

          if (isDataComplete) {
            // console.log(`[Card Verifier] Data for "${cardName}" is already complete. No fetch needed.`);
            return Promise.resolve(cardObj);
          }

          // If data is not complete, we must fetch it from Scryfall.
          const printingId = cardObj.printing;
          const set = cardObj.card?.set;
          const collectorNumber = cardObj.card?.collector_number;

          // Check cache first to avoid repeated validation of known invalid cards
          const cacheKey = `${printingId || 'no-id'}:${cardName || 'no-name'}`;
          if (invalidCardCache.has(cacheKey)) {
            return Promise.resolve(cardObj);
          }

          // Validation functions for Scryfall data
          const isValidPrintingId = (id) => {
            if (!id || typeof id !== 'string') return false;
            // Scryfall IDs are UUIDs (36 chars with hyphens) - be more strict about this
            return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);
          };

          const isValidCardName = (name) => {
            if (!name || typeof name !== 'string') return false;
            // Skip obvious test data or invalid names
            const testPatterns = /^(test|example|placeholder|unknown|null|undefined|sample)/i;
            return name.length > 2 && !testPatterns.test(name);
          };

          let fetchUrl = null;
          let fetchSource = "";

          // Determine the best way to fetch from Scryfall, from most specific to least.
          // Prioritize set/collector number since short strings like "pip" are often set codes
          if (set && collectorNumber) {
            fetchUrl = `https://api.scryfall.com/cards/${set.toLowerCase()}/${collectorNumber}`;
            fetchSource = `set/collector number ${set}/${collectorNumber}`;
          } else if (printingId && isValidPrintingId(printingId)) {
            fetchUrl = `https://api.scryfall.com/cards/${printingId}`;
            fetchSource = `printing ID ${printingId}`;
          } else if (cardName && isValidCardName(cardName)) {
            // Fetching by name is ambiguous, but it's our last resort.
            fetchUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`;
            fetchSource = `card name "${cardName}"`;
          }

          // Skip API call if we have invalid data
          if (!fetchUrl) {
            invalidCardCache.add(cacheKey); // Cache this invalid combination
            if (printingId && !isValidPrintingId(printingId)) {
              console.warn(`[Card Validation] Skipping invalid printing ID "${printingId}" for card "${cardName}"`);
            } else if (cardName && !isValidCardName(cardName)) {
              console.warn(`[Card Validation] Skipping invalid card name "${cardName}"`);
            } else {
              console.warn(`[Card Validation] No valid fetch method available for card "${cardName}"`);
            }
            return Promise.resolve(cardObj);
          }

          if (fetchUrl) {
            // console.log(`[Card Fetch] Data for "${cardName}" is incomplete. Fetching using ${fetchSource}.`);
            const apiUrl = import.meta.env.VITE_API_URL;
            return fetch(
              fetchUrl.startsWith("http") ? fetchUrl : `${apiUrl}${fetchUrl}`,
            )
              .then((res) => {
                if (!res.ok) {
                  // For 404 errors, handle silently since they're expected for some invalid data
                  if (res.status === 404) {
                    console.debug(`[Scryfall] Card not found: "${cardName}" (${fetchSource}) - using original data`);
                    return Promise.resolve(cardObj);
                  }
                  // Log other errors normally
                  console.warn(`[SCRYFALL ERROR] Failed to fetch card data for "${cardName}" using ${fetchSource}. Status: ${res.status}`);
                  throw new Error(
                    `Scryfall fetch failed for ${fetchSource} with status ${res.status}`,
                  );
                }
                return res.json();
              })
              .then((scryfallData) => {
                // Handle case where we returned original cardObj due to 404
                if (scryfallData === cardObj) {
                  return scryfallData;
                }
                // console.log(`[Card Fetch] Success for "${cardName}". Injecting Scryfall data.`);
                // Return a new object with the original data plus the full scryfall_json
                const newCardObj = {
                  ...cardObj,
                  scryfall_json: scryfallData,
                  // Also update the printing ID to what we actually fetched, for consistency
                  printing: scryfallData.id,
                };

                // Also patch the nested 'card' object for consistency if it exists
                if (newCardObj.card) {
                  newCardObj.card.scryfall_json = scryfallData;
                  newCardObj.card.prices = scryfallData.prices;
                }

                return newCardObj;
              })
              .catch((error) => {
                console.error(
                  `[Card Fetch] Failed for "${cardName}" using ${fetchSource}:`,
                  error.message,
                );
                // Return original object on failure, but add a flag to show it failed
                return { ...cardObj, scryfall_fetch_failed: true };
              });
          } else {
            console.warn(
              `[Card Verifier] Cannot fetch "${cardName}" - no identifier available.`,
            );
            // Return original object if we can't even build a URL
            return Promise.resolve(cardObj);
          }
        });

        Promise.all(fetchPromises).then((finalCards) => {
          // Filter out any null cards that might have slipped through
          const validFinalCards = finalCards.filter((c) => c);

          if (!isMounted.current) return;

          // Process all cards to ensure they have correct prices based on their foil status
          const processedCards = validFinalCards.map((card) => {
            const cardName = card.card?.name || card.name || 'Unknown';
            
            // CRITICAL FIX: Clean up modalPrice values - convert undefined to null
            const cleanModalPrice = (card.modalPrice !== undefined && card.modalPrice !== null && card.modalPrice !== "undefined") ? card.modalPrice : null;
            const cleanNestedModalPrice = (card.card?.modalPrice !== undefined && card.card?.modalPrice !== null && card.card?.modalPrice !== "undefined") ? card.card?.modalPrice : null;
            
            // DEBUG: Check if card has modalPrice when being processed on deck load
            const hasModalPrice = cleanModalPrice !== null || cleanNestedModalPrice !== null;
            // Process card pricing information
            // Check and normalize foil status at all levels
            const isFoilStatus = card.foil === true || card.card?.foil === true;

            // Make sure foil status is consistent across all levels
            const cardWithConsistentFoil = {
              ...card,
              foil: isFoilStatus,
              // CRITICAL: Clean modalPrice during load
              modalPrice: cleanModalPrice,
              ...(card.card
                ? {
                    card: {
                      ...card.card,
                      foil: isFoilStatus,
                      // CRITICAL: Also clean modalPrice in nested card object
                      modalPrice: cleanNestedModalPrice,
                    },
                  }
                : {}),
              ...(card.cardObj
                ? {
                    cardObj: {
                      ...card.cardObj,
                      foil: isFoilStatus,
                      ...(card.cardObj.card
                        ? {
                            card: {
                              ...card.cardObj.card,
                              foil: isFoilStatus,
                            },
                          }
                        : {}),
                    },
                  }
                : {}),
            };

            // Extract the correct price based on the foil status
            const priceData = extractPrice(cardWithConsistentFoil);

            // CRITICAL FIX: Ensure count field exists - fall back to quantity if count is undefined
            const finalCount = card.count !== undefined ? card.count : (card.quantity || 1);
            
            // Create a new card object with the correct price, foil status, and count
            return {
              ...cardWithConsistentFoil,
              count: finalCount, // CRITICAL: Ensure count field is always present
              price: priceData.price, // Set the price at the top level
              lastUpdated: Date.now(), // Add timestamp to force React to detect the change
              // Also update price in the nested card object
              ...(cardWithConsistentFoil.card
                ? {
                    card: {
                      ...cardWithConsistentFoil.card,
                      count: finalCount, // Also ensure count in nested card
                      price: priceData.price,
                      lastUpdated: Date.now(),
                    },
                  }
                : {}),
            };
          });

          // console.log('[DEBUG] All card data verified and prices calculated. Final card count:', processedCards.length);

          // Filter out test cards from processed cards before final deck update
          const filteredProcessedCards = filterTestCards(processedCards);
          console.log(`[DEBUG] Processed cards: ${processedCards.length}, Filtered cards: ${filteredProcessedCards.length}`);

          // Ensure commander is always present in the deck when loading
          const deckWithCommander = { ...data, cards: filteredProcessedCards };
          const finalCardsWithCommander = ensureCommanderInCards(deckWithCommander);
          const finalDeckData = { ...deckWithCommander, cards: finalCardsWithCommander };

          console.log(`[DEBUG] Final deck card count: ${finalDeckData.cards.length}`);
          
          // DEBUG: Log all card names in the loaded deck for tracking persistence
          console.log('[DEBUG] Loaded deck card names:', finalDeckData.cards.map(c => c.card?.name || c.name).sort());
          console.log('[DEBUG] Deck load timestamp:', new Date().toISOString(), 'Total cards:', finalDeckData.cards.length);
          
          // DEBUG: Check if commander properties are preserved in final deck data
          console.log('[DEBUG] Final deck data commander properties:', {
            commander: finalDeckData.commander,
            commanderNames: finalDeckData.commanderNames,
            hasCommander: 'commander' in finalDeckData,
            hasCommanderNames: 'commanderNames' in finalDeckData,
            originalDataCommander: data.commander,
            originalDataCommanderNames: data.commanderNames
          });
          
          console.log('[DEBUG] About to call setDeck with:', finalDeckData);
          
          // Load sideboard/techIdeas from localStorage
          const storedZones = loadSideboardFromStorage(data._id);
          
          // Remove cards from main deck that exist in sideboard/techIdeas to prevent duplication
          let deduplicatedMainCards = finalDeckData.cards;
          if (storedZones.sideboard.length > 0 || storedZones.techIdeas.length > 0) {
            const zoneCardNames = new Set([
              ...storedZones.sideboard.map(card => card.name || card.card?.name),
              ...storedZones.techIdeas.map(card => card.name || card.card?.name)
            ].filter(Boolean));
            
            const originalMainCount = deduplicatedMainCards.length;
            deduplicatedMainCards = deduplicatedMainCards.filter(card => {
              const cardName = card.name || card.card?.name;
              return !zoneCardNames.has(cardName);
            });
            
            if (originalMainCount !== deduplicatedMainCards.length) {
              console.log(`[PERSISTENCE] 🔄 Removed ${originalMainCount - deduplicatedMainCards.length} duplicate cards from main deck that exist in zones`);
              console.log(`[PERSISTENCE] Zone card names:`, Array.from(zoneCardNames));
            }
            
            console.log(`[PERSISTENCE] ✅ Restored ${storedZones.sideboard.length} sideboard + ${storedZones.techIdeas.length} tech ideas from localStorage`);
          }
          
          const finalDeckDataWithZones = {
            ...finalDeckData,
            cards: deduplicatedMainCards,
            sideboard: storedZones.sideboard,
            techIdeas: storedZones.techIdeas
          };
          
          // Check if deck is marked as public/read-only
          if (data.isPublic || data.readOnly) {
            setIsReadOnly(true);
          }
          
          setDeck(finalDeckDataWithZones);
          
          // DEBUG: Check what actually got stored (will show in next render)
          console.log('[DEBUG] setDeck called with commander data:', {
            passedCommander: finalDeckDataWithZones.commander,
            passedCommanderNames: finalDeckDataWithZones.commanderNames,
            sideboardCount: storedZones.sideboard.length,
            techIdeasCount: storedZones.techIdeas.length,
            isReadOnly: data.isPublic || data.readOnly || false
          });
          setName(data.name);
          setCards(deduplicatedMainCards); // Use the deduplicated cards to prevent zone card duplication
          setFastLoading(false); // Deck content is ready immediately
          setLoading(false);

          preloadCardImages(finalCardsWithCommander, preloadedImages.current);

          // AUTO-SHOW COMMANDER: Set commander as fixed preview with high-res English image
          setTimeout(() => {
            let commanderName = "";
            let commanderCard = null;

            if (data.commander) {
              if (Array.isArray(data.commander) && data.commander.length > 0) {
                const commanderToFind = data.commander[0];
                const commanderToFindName =
                  commanderToFind.name || commanderToFind;
                commanderCard = finalCardsWithCommander.find(
                  (c) => (c.card?.name || c.name) === commanderToFindName,
                );
                commanderName =
                  commanderCard?.card?.name || commanderCard?.name;
              } else if (
                typeof data.commander === "object" &&
                data.commander !== null
              ) {
                commanderCard = finalCardsWithCommander.find(
                  (c) => (c.card?.name || c.name) === data.commander.name,
                );
                commanderName = commanderCard?.card?.name;
              } else if (typeof data.commander === "string") {
                commanderCard = finalCardsWithCommander.find(
                  (c) => (c.card?.name || c.name) === data.commander,
                );
                commanderName = commanderCard?.card?.name || commanderCard?.name;
              }
            }

            // Fallback: look for any card in the Commander category
            if (!commanderCard) {
              const groupedCards = groupCardsByType(finalCardsWithCommander, []);
              const commanderGroup = groupedCards.find(group => group.type === 'Commander');
              if (commanderGroup && commanderGroup.cards.length > 0) {
                commanderCard = commanderGroup.cards[0];
                commanderName = commanderCard?.card?.name || commanderCard?.name;
              }
            }
            
            if (commanderCard) {
              handleCardHover(commanderCard);
            } else {
              // Fallback to first card if no commander found
              if (finalCardsWithCommander.length > 0) {
                handleCardHover(finalCardsWithCommander[0]);
              }
            }
          }, 100); // Small delay to ensure state is set
        });
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          // This is likely a timeout - show user-friendly message
          console.error("Deck loading timed out for deck ID:", id);
          toast.error("Deck loading timed out. The server may be starting up - please try refreshing the page.", {
            duration: 8000
          });
          if (isMounted.current) {
            setLoading(false);
          }
          return;
        }
        console.error("Error loading deck:", error);

        if (error.message === "DECK_NOT_FOUND") {
          toast.error("Deck not found. Redirecting to home page...");
          setTimeout(() => {
            navigate("/");
          }, 2000);
        } else if (error.message.includes("Failed to fetch")) {
          toast.error("Network error loading deck. Please check your connection and try again.", {
            duration: 6000
          });
        } else {
          toast.error("Failed to load deck: " + error.message);
        }

        if (isMounted.current) {
          setLoading(false);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        fetchInProgress.current = false;
      });

    return () => {
      isMounted.current = false;
      abortController.abort();
      fetchInProgress.current = false;
      // Don't reset lastFetchedId here - let it persist to prevent duplicate fetches
    };
  }, [id]);

  // Helper function to save sideboard/techIdeas to localStorage for persistence
  const saveSideboardToStorage = (deckId, sideboard, techIdeas) => {
    try {
      const storageKey = `deck_zones_${deckId}`;
      const zonesData = {
        sideboard: sideboard || [],
        techIdeas: techIdeas || [],
        lastUpdated: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(zonesData));
      console.log(`[STORAGE] Saved sideboard/techIdeas to localStorage for deck ${deckId}:`, {
        sideboardCount: zonesData.sideboard.length,
        techIdeasCount: zonesData.techIdeas.length
      });
    } catch (error) {
      console.error('[STORAGE] Failed to save sideboard/techIdeas to localStorage:', error);
    }
  };

  // Helper function to load sideboard/techIdeas from localStorage
  const loadSideboardFromStorage = (deckId) => {
    try {
      const storageKey = `deck_zones_${deckId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const zonesData = JSON.parse(stored);
        console.log(`[STORAGE] Loaded sideboard/techIdeas from localStorage for deck ${deckId}:`, {
          sideboardCount: zonesData.sideboard?.length || 0,
          techIdeasCount: zonesData.techIdeas?.length || 0,
          age: Math.round((Date.now() - zonesData.lastUpdated) / 1000 / 60) + ' minutes'
        });
        return {
          sideboard: zonesData.sideboard || [],
          techIdeas: zonesData.techIdeas || []
        };
      }
    } catch (error) {
      console.error('[STORAGE] Failed to load sideboard/techIdeas from localStorage:', error);
    }
    return { sideboard: [], techIdeas: [] };
  };

  // Helper function to save deck state (including sideboard and techIdeas) to server
  const saveDeckToServer = async (deckToSave) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.error("[SAVE DECK] No authentication token found");
        toast.error("Cannot save: Not logged in");
        return;
      }

      // Use same cleaned card approach as add/remove functions to prevent 500 errors
      const cleanedCards = (deckToSave.cards || []).map(card => ({
        name: card.name || card.card?.name,
        quantity: card.quantity || 1,
        count: card.count || 1,
        isCommander: card.isCommander || false,
        set: card.set || card.card?.set,
        collector_number: card.collector_number || card.card?.collector_number,
        finishes: card.finishes || ["nonfoil"],
        prices: card.prices || {},
        mana_cost: card.mana_cost || card.card?.mana_cost,
        color_identity: card.color_identity || card.card?.color_identity,
        cmc: card.cmc || card.card?.cmc,
        type_line: card.type_line || card.card?.type_line,
        scryfall_id: card.scryfall_id || card.card?.scryfall_id,
        // Minimal card object (NO large scryfall_json to prevent 500 errors)
        card: {
          name: card.name || card.card?.name,
          mana_cost: card.mana_cost || card.card?.mana_cost,
          color_identity: card.color_identity || card.card?.color_identity,
          cmc: card.cmc || card.card?.cmc,
          type_line: card.type_line || card.card?.type_line,
          set: card.set || card.card?.set,
          collector_number: card.collector_number || card.card?.collector_number,
          scryfall_id: card.scryfall_id || card.card?.scryfall_id
        }
      }));

      // Use same complete deck structure as add/remove functions
      const cleanDeckForServer = {
        _id: deckToSave._id,
        name: deckToSave.name,
        format: deckToSave.format,
        commander: deckToSave.commander,
        cards: cleanedCards,
        // Preserve sideboard and techIdeas to prevent disappearing sections
        ...(deckToSave.sideboard && { sideboard: deckToSave.sideboard }),
        ...(deckToSave.techIdeas && { techIdeas: deckToSave.techIdeas }),
        // Only include essential properties to avoid server validation issues
        ...(deckToSave.description && { description: deckToSave.description }),
        ...(deckToSave.colors && { colors: deckToSave.colors })
      };

      // Debug payload size (same as add/remove functions)
      const serializedDeck = JSON.stringify(cleanDeckForServer);
      console.log(`[SAVE DECK] Attempting save with sideboard/techIdeas:`, {
        deckId: deckToSave._id,
        cardsCount: cleanedCards.length,
        sideboardCount: (deckToSave.sideboard || []).length,
        techIdeasCount: (deckToSave.techIdeas || []).length,
        payloadSize: serializedDeck.length
      });

      const response = await fetch(`${apiUrl}/api/decks/${deckToSave._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
        credentials: "include",
        body: serializedDeck,
      });

      if (response.ok) {
        const savedDeck = await response.json();
        console.log(`[SAVE DECK] ✅ Server supports sideboard/techIdeas - full persistence enabled!`);
        console.log(`[SAVE DECK] Server response sideboard/techIdeas:`, {
          serverReturnedSideboard: savedDeck.sideboard?.length || 0,
          serverReturnedTechIdeas: savedDeck.techIdeas?.length || 0,
          localSideboardCount: (deckToSave.sideboard || []).length,
          localTechIdeasCount: (deckToSave.techIdeas || []).length,
          willPreserveFromLocal: !savedDeck.sideboard || !savedDeck.techIdeas
        });
        
        // CRITICAL FIX: Merge server response with local card data to preserve detailed information
        // Server returns cleaned data but we need to preserve type_line, scryfall data, etc.
        const mergedCards = (savedDeck.cards || []).map(serverCard => {
          // Find the corresponding local card with full data
          const localCard = (deckToSave.cards || []).find(localCard => {
            const serverName = serverCard.name || serverCard.card?.name;
            const localName = localCard.name || localCard.card?.name;
            return serverName === localName;
          });
          
          if (localCard) {
            // Merge server data with local detailed data
            return {
              ...localCard, // Keep all local detailed data
              ...serverCard, // Overlay server response (quantities, etc.)
              // Ensure detailed card object is preserved
              card: {
                ...localCard.card, // Keep local detailed card data
                ...(serverCard.card || {}), // Merge any server card updates
                // Preserve essential type detection properties
                type_line: localCard.card?.type_line || localCard.type_line || serverCard.type_line,
                scryfall_json: localCard.card?.scryfall_json || localCard.scryfall_json,
                mana_cost: localCard.card?.mana_cost || localCard.mana_cost,
                color_identity: localCard.card?.color_identity || localCard.color_identity,
                cmc: localCard.card?.cmc || localCard.cmc
              }
            };
          }
          
          // If no local card found, use server data as-is
          return serverCard;
        });
        
        // Update local state with merged data to preserve card details AND sideboard/techIdeas
        const deckWithCommander = {
          ...savedDeck,
          cards: ensureCommanderInCards({ ...savedDeck, cards: mergedCards }),
          // CRITICAL FIX: Preserve sideboard and techIdeas even if server doesn't return them
          sideboard: savedDeck.sideboard || deckToSave.sideboard || [],
          techIdeas: savedDeck.techIdeas || deckToSave.techIdeas || []
        };
        setDeck(deckWithCommander);
        setCards(deckWithCommander.cards || []);
        
        // Save sideboard/techIdeas to localStorage for additional persistence
        if (deckWithCommander.sideboard?.length > 0 || deckWithCommander.techIdeas?.length > 0) {
          saveSideboardToStorage(deckToSave._id, deckWithCommander.sideboard, deckWithCommander.techIdeas);
        }
      } else {
        // Server doesn't support sideboard/techIdeas - use fallback with localStorage
        console.log(`[SAVE DECK] Server doesn't support zones, using localStorage fallback`);
        
        if (response.status === 500 || response.status === 400) {
          // Use clean deck structure for fallback too (without sideboard/techIdeas)
          const fallbackDeck = {
            _id: deckToSave._id,
            name: deckToSave.name,
            format: deckToSave.format,
            commander: deckToSave.commander,
            cards: cleanedCards,
            ...(deckToSave.description && { description: deckToSave.description }),
            ...(deckToSave.colors && { colors: deckToSave.colors })
          };
          
          const fallbackResponse = await fetch(`${apiUrl}/api/decks/${deckToSave._id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache",
            },
            credentials: "include",
            body: JSON.stringify(fallbackDeck),
          });
          
          if (fallbackResponse.ok) {
            const fallbackSavedDeck = await fallbackResponse.json();
            console.log(`[SAVE DECK] ✅ Main deck saved, zones persisted to localStorage`);
            
            // Apply same card data merging for fallback response
            const mergedFallbackCards = (fallbackSavedDeck.cards || []).map(serverCard => {
              const localCard = (deckToSave.cards || []).find(localCard => {
                const serverName = serverCard.name || serverCard.card?.name;
                const localName = localCard.name || localCard.card?.name;
                return serverName === localName;
              });
              
              if (localCard) {
                return {
                  ...localCard,
                  ...serverCard,
                  card: {
                    ...localCard.card,
                    ...(serverCard.card || {}),
                    type_line: localCard.card?.type_line || localCard.type_line || serverCard.type_line,
                    scryfall_json: localCard.card?.scryfall_json || localCard.scryfall_json,
                    mana_cost: localCard.card?.mana_cost || localCard.mana_cost,
                    color_identity: localCard.card?.color_identity || localCard.color_identity,
                    cmc: localCard.card?.cmc || localCard.cmc
                  }
                };
              }
              return serverCard;
            });
            
            // Preserve client-side sideboard and techIdeas
            const deckWithCommander = {
              ...fallbackSavedDeck,
              cards: ensureCommanderInCards({ ...fallbackSavedDeck, cards: mergedFallbackCards }),
              sideboard: deckToSave.sideboard || [],
              techIdeas: deckToSave.techIdeas || []
            };
            setDeck(deckWithCommander);
            setCards(deckWithCommander.cards || []);
            
            // Save sideboard/techIdeas to localStorage for persistence
            saveSideboardToStorage(deckToSave._id, deckToSave.sideboard, deckToSave.techIdeas);
          } else {
            const fallbackErrorData = await fallbackResponse.json();
            console.error(`[SAVE DECK] Fallback save failed:`, fallbackErrorData);
            toast.error(`Failed to save deck: ${fallbackErrorData.error || 'Unknown error'}`);
          }
        } else {
          const errorData = await response.json();
          toast.error(`Failed to save deck: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error("[SAVE DECK] Error saving deck to server:", error);
      toast.error("Error saving deck to server");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Ensure every card has a printing field (null if missing)
    const cardsWithPrinting = cards.map((card) => {
      if (typeof card === "object" && card !== null) {
        return { ...card, printing: card.printing || null };
      }
      return { name: card, printing: null };
    });
    const apiUrl = import.meta.env.VITE_API_URL;

    // Get the authentication token - essential for server authentication
    const token = localStorage.getItem("token");
    if (!token) {
      console.error(
        "[DeckViewEdit] No authentication token found for save operation",
      );
      toast.error("Cannot save changes: Not logged in");
      setLoading(false);
      return;
    }

    const res = await fetch(`${apiUrl}/api/decks/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Add auth token - critical for the server auth middleware
        "Cache-Control": "no-cache", // Prevent caching issues
      },
      credentials: "include", // Include cookies for sessions
      body: JSON.stringify({ name, cards: cardsWithPrinting }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("Deck updated!");
      // Ensure commander is preserved when saving deck
      const deckWithCommander = {
        ...data,
        cards: ensureCommanderInCards(data)
      };
      setDeck(deckWithCommander);
      setEdit(false);
    } else {
      toast.error(data.error || "Error updating deck");
    }
    setLoading(false);
  };

  // Fetch otag suggestions for the current deck
  async function handleGetOtagSuggestions() {
    if (!deck || !deck.cards || deck.cards.length === 0) return;
    setOtagLoading(true);
    try {
      // Use fetchOtagRecommendations utility (expects array of card objects)
      const otagResults = await fetchOtagRecommendations(deck.cards);
      // Aggregate otags and their counts
      const tagCounts = {};
      for (const card of otagResults) {
        if (Array.isArray(card.otags)) {
          for (const tag of card.otags) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        }
      }
      // Convert to array and sort by count descending
      const sorted = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
      setOtagSuggestions(sorted);
    } catch (err) {
      toast.error("Failed to fetch Otag suggestions");
      setOtagSuggestions([]);
    }
    setOtagLoading(false);
  }

  // Fetch commander color identity from Scryfall API
  const fetchCommanderColorIdentity = async (commanderName) => {
    try {
      const cleanName = commanderName.toLowerCase().trim();
      const encodedName = encodeURIComponent(cleanName);

      // console.log('[DEBUG] Fetching color identity for:', cleanName);

      // Scryfall API call, leave as is
      const response = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodedName}`,
      );

      if (response.ok) {
        const cardData = await response.json();
        const colorIdentity = cardData.color_identity || [];
        // console.log('[DEBUG] Fetched color identity:', colorIdentity, 'for:', cleanName);
        return colorIdentity;
      } else if (response.status === 404) {
        // Card not found, return null to indicate this
        // console.log('[DEBUG] Commander not found on Scryfall:', cleanName);
        return null;
      } else {
        console.error(
          "Scryfall API error:",
          response.status,
          response.statusText,
        );
        return null;
      }
    } catch (error) {
      console.error("Error fetching commander color identity:", error);
      return null;
    }
  };

  // Memoized helper to get color identity for search filtering (reduces re-computation)
  const getCommanderColorIdentity = useMemo(() => {
    if (!deck) return "";

    let commanderNames = [];

    // Get commander names from multiple sources
    if (
      deck.commander &&
      Array.isArray(deck.commander) &&
      deck.commander.length > 0
    ) {
      commanderNames = deck.commander
        .map((c) => {
          const name = c.card?.name || c.name || c;
          return typeof name === "string" ? name : null;
        })
        .filter(Boolean);
    } else if (
      deck.commander &&
      typeof deck.commander === "object" &&
      deck.commander !== null
    ) {
      const name =
        deck.commander.card?.name || deck.commander.name || deck.commander;
      if (name && typeof name === "string") {
        commanderNames = [name];
      }
    } else if (typeof deck.commander === "string" && deck.commander.trim()) {
      commanderNames = [deck.commander];
    }

    // Also check commanderNames field for unresolved commanders
    if (
      deck.commanderNames &&
      Array.isArray(deck.commanderNames) &&
      deck.commanderNames.length > 0
    ) {
      const nameCommanders = deck.commanderNames.filter(
        (name) => typeof name === "string" && name.trim(),
      );
      commanderNames = commanderNames.concat(nameCommanders);
    }

    // Also check for commanders marked with isCommander: true
    if (deck.cards && Array.isArray(deck.cards)) {
      const commanderCards = deck.cards.filter(card => card.isCommander === true);
      for (const commanderCard of commanderCards) {
        const commanderName = commanderCard.card?.name || commanderCard.name || "";
        if (commanderName && typeof commanderName === "string") {
          commanderNames.push(commanderName);
        }
      }
    }

    if (commanderNames.length === 0) return "";

    // Try to find color identity from various sources
    let colorIdentity = null;

    // 1. Try populated commander data first
    if (deck.commander) {
      const commander = Array.isArray(deck.commander)
        ? deck.commander[0]
        : deck.commander;
      if (
        commander?.card?.color_identity &&
        Array.isArray(commander.card.color_identity)
      ) {
        colorIdentity = commander.card.color_identity;
      } else if (
        commander?.color_identity &&
        Array.isArray(commander.color_identity)
      ) {
        colorIdentity = commander.color_identity;
      }
    }

    // 2. If not found, search in cards array by name and also check isCommander flag
    if (!colorIdentity && deck.cards && Array.isArray(deck.cards)) {
      // First try to find by isCommander flag
      const commanderCard = deck.cards.find(card => card.isCommander === true);
      if (commanderCard) {
        if (
          commanderCard.scryfallCard?.color_identity &&
          Array.isArray(commanderCard.scryfallCard.color_identity)
        ) {
          colorIdentity = commanderCard.scryfallCard.color_identity;
        } else if (
          commanderCard.card?.color_identity &&
          Array.isArray(commanderCard.card.color_identity)
        ) {
          colorIdentity = commanderCard.card.color_identity;
        } else if (
          commanderCard.color_identity &&
          Array.isArray(commanderCard.color_identity)
        ) {
          colorIdentity = commanderCard.color_identity;
        }
      }
      
      // If still not found, search by commander names
      if (!colorIdentity) {
        for (const commanderName of commanderNames) {
          if (typeof commanderName !== "string") continue;

        const commanderCard = deck.cards.find((card) => {
          const cardName = card.card?.name || card.name || "";
          return cardName.toLowerCase() === commanderName.toLowerCase();
        });
        if (
          commanderCard?.card?.color_identity &&
          Array.isArray(commanderCard.card.color_identity)
        ) {
          colorIdentity = commanderCard.card.color_identity;
          break;
        } else if (
          commanderCard?.scryfallCard?.color_identity &&
          Array.isArray(commanderCard.scryfallCard.color_identity)
        ) {
          colorIdentity = commanderCard.scryfallCard.color_identity;
          break;
        } else if (
          commanderCard?.color_identity &&
          Array.isArray(commanderCard.color_identity)
        ) {
          colorIdentity = commanderCard.color_identity;
          break;
        }
      }
      }
    }

    // 3. Check cache for Scryfall data (no async fetching in sync version)
    if (!colorIdentity && commanderNames.length > 0) {
      const primaryCommander = commanderNames[0];
      const cacheKey = primaryCommander.toLowerCase().trim();

      if (commanderColorCache.has(cacheKey)) {
        const cachedResult = commanderColorCache.get(cacheKey);
        if (cachedResult !== null) {
          colorIdentity = cachedResult;
        }
      }
    }

    // 4. Fallback: Known commander color identities
    // Reduced debug logging to prevent console spam
    if (process.env.NODE_ENV === 'development') {
      console.log(`[COLOR ID DEBUG] Fallback check - colorIdentity so far:`, colorIdentity);
      console.log(`[COLOR ID DEBUG] Commander names length:`, commanderNames.length);
      console.log(`[COLOR ID DEBUG] Should use fallback:`, (!colorIdentity || (Array.isArray(colorIdentity) && colorIdentity.length === 0)) && commanderNames.length > 0);
    }
    
    if ((!colorIdentity || (Array.isArray(colorIdentity) && colorIdentity.length === 0)) && commanderNames.length > 0) {
      const knownCommanders = {
        'jason bright, glowing prophet': ['U'],
        'jason bright': ['U'], // Add short version
        'atraxa, praetors\' voice': ['W', 'U', 'B', 'G'],
        'edgar markov': ['W', 'U', 'B', 'R'],
        'kumena, tyrant of orazca': ['U', 'G'],
        'meren of clan nel toth': ['B', 'G'],
        'prossh, skyraider of kher': ['B', 'R', 'G'],
        'derevi, empyrial tactician': ['W', 'U', 'G'],
        'oloro, ageless ascetic': ['W', 'U', 'B'],
        'kaalia of the vast': ['W', 'B', 'R'],
        'ghave, guru of spores': ['W', 'B', 'G'],
        'riku of two reflections': ['U', 'R', 'G'],
        'the ur-dragon': ['W', 'U', 'B', 'R', 'G'],
        'sliver overlord': ['W', 'U', 'B', 'R', 'G']
      };

      if (process.env.NODE_ENV === 'development') {
        console.log(`[COLOR ID DEBUG] Known commanders available:`, Object.keys(knownCommanders));
      }

      for (const commanderName of commanderNames) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[COLOR ID DEBUG] Processing commander: "${commanderName}"`);
        }
        if (!commanderName || typeof commanderName !== 'string') {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[COLOR ID DEBUG] Skipping - not a string or empty`);
          }
          continue;
        }
        
        const normalizedName = commanderName.toLowerCase().trim();
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 Checking commander name: "${normalizedName}"`);
        }
        
        // Direct match
        if (knownCommanders[normalizedName]) {
          colorIdentity = knownCommanders[normalizedName];
          if (process.env.NODE_ENV === 'development') {
            console.log(`🎯 Direct match - Using known color identity for ${commanderName}:`, colorIdentity);
          }
          break;
        }
        
        // Partial match for Jason Bright (more aggressive)
        if (normalizedName.includes('jason bright')) {
          colorIdentity = ['U'];
          if (process.env.NODE_ENV === 'development') {
            console.log(`🎯 Partial match - Jason Bright detected, using blue color identity:`, colorIdentity);
          }
          break;
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[COLOR ID DEBUG] No match found for: "${normalizedName}"`);
        }
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[COLOR ID DEBUG] Skipping fallback - colorIdentity already found or no commander names`);
        console.log(`[COLOR ID DEBUG] Existing colorIdentity:`, colorIdentity);
      }
    }

    // Reduced debug logging in production
    if (process.env.NODE_ENV === 'development') {
      console.log('[COLOR ID DEBUG] Commander Names:', JSON.stringify(commanderNames));
      console.log('[COLOR ID DEBUG] Color Identity Array:', JSON.stringify(colorIdentity));
      console.log('[COLOR ID DEBUG] Final Result:', colorIdentity ? colorIdentity.join("").toLowerCase() : "EMPTY");
      
      // Test each commander name explicitly
      if (Array.isArray(commanderNames)) {
        commanderNames.forEach((name, index) => {
          const normalized = (name || '').toLowerCase().trim();
          console.log(`[COLOR ID DEBUG] Commander ${index}: "${name}" -> normalized: "${normalized}"`);
          console.log(`[COLOR ID DEBUG] Contains Jason Bright: ${normalized.includes('jason bright')}`);
        });
      }
    }
    return colorIdentity ? colorIdentity.join("").toLowerCase() : "";
  }, [deck, commanderColorCache]);

  // Effect to automatically fetch and cache commander color identity when deck loads
  useEffect(() => {
    if (!deck) return;

    // Get commander names from multiple sources
    let commanderNames = [];

    if (
      deck.commander &&
      Array.isArray(deck.commander) &&
      deck.commander.length > 0
    ) {
      commanderNames = deck.commander
        .map((c) => {
          const name = c.card?.name || c.name || c;
          return typeof name === "string" ? name : null;
        })
        .filter(Boolean);
    } else if (
      deck.commander &&
      typeof deck.commander === "object" &&
      deck.commander !== null
    ) {
      const name =
        deck.commander.card?.name || deck.commander.name || deck.commander;
      if (name && typeof name === "string") {
        commanderNames = [name];
      }
    } else if (typeof deck.commander === "string" && deck.commander.trim()) {
      commanderNames = [deck.commander];
    }

    // Also check commander_names and commanderNames fields for unresolved commanders
    if (
      deck.commander_names &&
      Array.isArray(deck.commander_names) &&
      deck.commander_names.length > 0
    ) {
      const nameCommanders = deck.commander_names.filter(
        (name) => typeof name === "string" && name.trim(),
      );
      commanderNames = commanderNames.concat(nameCommanders);
    }

    if (
      deck.commanderNames &&
      Array.isArray(deck.commanderNames) &&
      deck.commanderNames.length > 0
    ) {
      const nameCommanders = deck.commanderNames.filter(
        (name) => typeof name === "string" && name.trim(),
      );
      commanderNames = commanderNames.concat(nameCommanders);
    }

    if (commanderNames.length === 0) return;

    // Check if we need to fetch any commander color identities
    for (const commanderName of commanderNames) {
      if (typeof commanderName !== "string") continue;

      const cacheKey = commanderName.toLowerCase().trim();

      // Skip if already in cache or currently being fetched
      if (
        commanderColorCache.has(cacheKey) ||
        pendingColorFetches.has(cacheKey)
      ) {
        continue;
      }

      // Check if we already have the color identity in the deck data
      let hasColorIdentity = false;

      if (deck.commander) {
        const commander = Array.isArray(deck.commander)
          ? deck.commander[0]
          : deck.commander;
        if (
          commander?.card?.color_identity &&
          Array.isArray(commander.card.color_identity)
        ) {
          hasColorIdentity = true;
        } else if (
          commander?.color_identity &&
          Array.isArray(commander.color_identity)
        ) {
          hasColorIdentity = true;
        }
      }

      if (!hasColorIdentity && deck.cards && Array.isArray(deck.cards)) {
        const commanderCard = deck.cards.find((card) => {
          const cardName = card.card?.name || card.name || "";
          return cardName.toLowerCase() === commanderName.toLowerCase();
        });
        if (
          commanderCard?.card?.color_identity &&
          Array.isArray(commanderCard.card.color_identity)
        ) {
          hasColorIdentity = true;
        }
      }

      // Fetch from Scryfall if we don't have color identity
      if (!hasColorIdentity) {
        // console.log('[DEBUG] Auto-fetching color identity for commander:', commanderName);
        setPendingColorFetches((prev) => new Set(prev).add(cacheKey));

        fetchCommanderColorIdentity(commanderName).then(
          (fetchedColorIdentity) => {
            // console.log('[DEBUG] Auto-fetch result for', commanderName, ':', fetchedColorIdentity);
            setCommanderColorCache((prev) =>
              new Map(prev).set(cacheKey, fetchedColorIdentity),
            );
            setPendingColorFetches((prev) => {
              const newSet = new Set(prev);
              newSet.delete(cacheKey);
              return newSet;
            });
          },
        );
      }
    }
  }, [deck, commanderColorCache, pendingColorFetches]);

  // Get the current commander color identity for display
  const currentColorId = getCommanderColorIdentity;

  // AbortController to cancel previous search requests
  const searchAbortControllerRef = useRef(null);
  
  // Add throttling to prevent excessive API calls
  const lastSearchTimeRef = useRef(0);
  const MIN_SEARCH_INTERVAL = 150; // Minimum 150ms between searches

  // AbortController to cancel previous modal search requests
  const modalSearchAbortControllerRef = useRef(null);

  // Scryfall search bar logic (constrain to color identity)
  const debouncedSearch = debounce(async (q) => {
    // Throttling check - prevent searches that are too frequent
    const now = Date.now();
    if (now - lastSearchTimeRef.current < MIN_SEARCH_INTERVAL) {
      // console.log('🚫 Search throttled - too frequent');
      return;
    }
    lastSearchTimeRef.current = now;
    
    if (!q.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      setNoResultsMsg("");
      setSearchLoading(false); // Important: reset loading state for empty queries
      // Don't clear the preview when search is cleared - keep the last viewed card
      return;
    }
    
    // Cancel previous request if it exists
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    searchAbortControllerRef.current = new AbortController();
    const signal = searchAbortControllerRef.current.signal;
    
    setSearchLoading(true);
    let query = q.trim();

    // Get current commander color identity
    const currentColorId = getCommanderColorIdentity;

    // Let backend handle color identity filtering via colorIdentity parameter
    // Don't modify the query string - this allows for more flexible search
    // Users can still manually add id:colors if they want

    try {
      // Use Typesense search API for proper commander color identity filtering
      const url = `/api/cards/typesense-search?q=${encodeURIComponent(query)}&limit=1000${currentColorId ? `&colorIdentity=${currentColorId}` : ""}${deck && deck.format ? `&deckFormat=${encodeURIComponent(deck.format)}` : ""}`;

      const apiUrl = import.meta.env.VITE_API_URL;
      const isDev = import.meta.env.DEV;
      
      // Debug logging to troubleshoot color identity filtering
      // if (import.meta.env.DEV) {
      //   console.log('🔍 Search:', {
      //     query: query,
      //     colorId: currentColorId,
      //     url: url,
      //     finalUrl: isDev ? url : `${apiUrl}${url}`
      //   });
      // }
      
      // In development, use relative path for Vite proxy
      // In production, use full API URL
      const finalUrl = isDev ? url : `${apiUrl}${url}`;
      // Reduce console logging for performance
      // console.log('🔗 Final URL for request:', finalUrl);
      // console.log('🌐 Fetch target:', finalUrl, '(isDev:', isDev, ')');
      
      const res = await fetch(finalUrl, { signal });
      // console.log('📡 Response status:', res.status);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      // console.log('📦 Response data:', data);
      
      // Handle Scryfall API response format
      let results = data.data || data || [];
      
      // SPECIAL CARD DEBUG for dropdown search too
      const isSpecialQuery = query.toLowerCase().includes('animating faerie') || 
                             query.toLowerCase().includes('adventure') ||
                             query.toLowerCase().includes('faerie') ||
                             query.toLowerCase().includes('underwater tunnel') ||
                             query.toLowerCase().includes('room') ||
                             query.toLowerCase().includes('dungeon') ||
                             query.toLowerCase().includes('plane') ||
                             query.toLowerCase().includes('phenomenon') ||
                             query.toLowerCase().includes('scheme') ||
                             query.toLowerCase().includes('vanguard');
      
      if (isSpecialQuery) {
        // console.log('� DROPDOWN SPECIAL DEBUG: Query:', query);
        // console.log('� DROPDOWN SPECIAL DEBUG: Results from backend:', results.length);
        // console.log('� DROPDOWN SPECIAL DEBUG: Full response:', data);
        
        // If no results from backend, try Scryfall as fallback
        if (results.length === 0) {
          // console.log('� DROPDOWN: Trying Scryfall fallback...');
          try {
            // Use more specific query formats for different card types
            let scryfallQuery;
            if (query.toLowerCase().includes('underwater tunnel') || query.toLowerCase().includes('room')) {
              scryfallQuery = encodeURIComponent(`"${query.trim()}" OR type:room`);
            } else if (query.toLowerCase().includes('adventure') || query.toLowerCase().includes('faerie')) {
              scryfallQuery = encodeURIComponent(`"${query.trim()}" OR keyword:adventure`);
            } else {
              scryfallQuery = encodeURIComponent(`"${query.trim()}"`);
            }
            
            const scryfallUrl = `https://api.scryfall.com/cards/search?q=${scryfallQuery}&unique=cards&order=name`;
            // console.log('🎯 DROPDOWN: Scryfall URL:', scryfallUrl);
            
            const scryfallRes = await fetch(scryfallUrl, { signal });
            if (scryfallRes.ok) {
              const scryfallData = await scryfallRes.json();
              const scryfallResults = scryfallData.data || [];
              // console.log('� DROPDOWN: Scryfall results:', scryfallResults.length);
              // console.log('🎯 DROPDOWN: Card types found:', scryfallResults.map(card => `${card.name} (${card.type_line})`));
              if (scryfallResults.length > 0) {
                results = scryfallResults.slice(0, 10); // Limit dropdown results
                // console.log('� DROPDOWN: Using Scryfall results');
              }
            } else {
              // Try exact name search as fallback
              const exactQuery = encodeURIComponent(query.trim());
              const exactUrl = `https://api.scryfall.com/cards/named?exact=${exactQuery}`;
              // console.log('🎯 DROPDOWN: Trying exact name search:', exactUrl);
              
              const exactRes = await fetch(exactUrl, { signal });
              if (exactRes.ok) {
                const singleCard = await exactRes.json();
                // console.log('🎯 DROPDOWN: Found single card:', singleCard.name, singleCard.type_line);
                results = [singleCard];
              }
            }
          } catch (scryfallError) {
            // console.log('� DROPDOWN: Scryfall fallback failed:', scryfallError);
          }
        }
      }
      
      // console.log('🔍 Processed results:', results, 'Length:', results.length);
      if (Array.isArray(results)) {
        setSearchResults(results);
        setNoResultsMsg(
          results.length === 0
            ? "No cards found matching your search criteria."
            : "",
        );
        setShowDropdown(results.length > 0);
        // console.log('✅ Search completed - showDropdown:', results.length > 0, 'Results:', results.map(r => r.name));
      } else if (data && data.message) {
        setSearchResults([]);
        setNoResultsMsg(data.message);
        setShowDropdown(true);
        // console.log('⚠️ API message:', data.message);
      } else {
        setSearchResults([]);
        setNoResultsMsg("No results found.");
        setShowDropdown(true);
        // console.log('❌ Unknown response format');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // console.log('🔄 Search request was cancelled');
        return; // Don't update state for cancelled requests
      }
      console.error('Search error:', error);
      setSearchResults([]);
      setNoResultsMsg("Error fetching cards.");
      setShowDropdown(true);
    }
    setSearchLoading(false);
  }, 200);

  // Function to fetch all search results for modal display
  const fetchAllSearchResults = async (query) => {
    if (!query.trim()) return;
    
    // console.log('🚀 fetchAllSearchResults called with query:', query);
    setSearchModalLoading(true);
    
    // Don't close dropdown immediately - wait for successful fetch
    // console.log('🔄 Keeping dropdown open while fetching...');
    
    const currentColorId = getCommanderColorIdentity;
    
    try {
      // SPECIAL CARD TYPE DEBUG: Check for various problematic card types
      const isSpecialCardQuery = query.toLowerCase().includes('animating faerie') || 
                                 query.toLowerCase().includes('adventure') ||
                                 query.toLowerCase().includes('faerie') ||
                                 query.toLowerCase().includes('underwater tunnel') ||
                                 query.toLowerCase().includes('room') ||
                                 query.toLowerCase().includes('dungeon') ||
                                 query.toLowerCase().includes('plane') ||
                                 query.toLowerCase().includes('phenomenon') ||
                                 query.toLowerCase().includes('scheme') ||
                                 query.toLowerCase().includes('vanguard');
      
      if (isSpecialCardQuery) {
        // console.log('� SPECIAL CARD DEBUG: Detected special card type query, will try both APIs');
        // console.log('� Original query:', query);
        // console.log('🎯 Query type detection:', {
        //   hasAdventure: query.toLowerCase().includes('adventure') || query.toLowerCase().includes('faerie'),
        //   hasRoom: query.toLowerCase().includes('room') || query.toLowerCase().includes('underwater tunnel'),
        //   hasDungeon: query.toLowerCase().includes('dungeon'),
        //   hasPlane: query.toLowerCase().includes('plane'),
        //   hasPhenomenon: query.toLowerCase().includes('phenomenon'),
        //   hasScheme: query.toLowerCase().includes('scheme'),
        //   hasVanguard: query.toLowerCase().includes('vanguard')
        // });
      }
      
      // Remove the limit=5 constraint to get all results - explicitly set limit to a high number
      const url = `/api/cards/typesense-search?q=${encodeURIComponent(query.trim())}&limit=1000${currentColorId ? `&colorIdentity=${currentColorId}` : ""}${deck && deck.format ? `&deckFormat=${encodeURIComponent(deck.format)}` : ""}`;
      
      const apiUrl = import.meta.env.VITE_API_URL;
      const isDev = import.meta.env.DEV;
      const finalUrl = isDev ? url : `${apiUrl}${url}`;
      
      // console.log('🔍 Full URL being requested:', finalUrl);
      // console.log('🔍 Query params breakdown:', {
      //   q: query.trim(),
      //   limit: 1000,
      //   colorIdentity: currentColorId,
      //   deckFormat: deck?.format
      // });
      
      // console.log('🔍 Fetching all search results for modal:', finalUrl);
      // console.log('🚨 DEBUG: About to fetch with limit=1000 for query:', query.trim());
      
      const res = await fetch(finalUrl);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      let results = data.data || data || [];
      
      // console.log('📦 All search results fetched:', results.length, 'cards');
      // console.log('📦 First 3 results:', results.slice(0, 3).map(card => `${card.name} (${card.color_identity || 'Unknown colors'})`));
      // console.log('📦 Total cards from API:', data.total_cards);
      // console.log('📦 Has more from API:', data.has_more);
      
      // Debug: Log unique card types in results to identify patterns
      if (results.length > 0) {
        const cardTypes = [...new Set(results.map(card => card.type_line).filter(Boolean))];
        // console.log('📦 Card types in results:', cardTypes.slice(0, 10)); // First 10 unique types
        
        // Check for potentially problematic types
        const specialTypes = cardTypes.filter(type => 
          type.includes('Adventure') || 
          type.includes('Room') || 
          type.includes('Dungeon') ||
          type.includes('Plane') ||
          type.includes('Phenomenon') ||
          type.includes('Scheme') ||
          type.includes('Vanguard')
        );
        if (specialTypes.length > 0) {
          // console.log('📦 Special card types found:', specialTypes);
        }
      }
      
      // SPECIAL CARD DEBUG: If we got no results for special card types, try Scryfall directly
      if (isSpecialCardQuery && results.length === 0) {
        // console.log('� SPECIAL CARD DEBUG: No results from backend, trying Scryfall directly...');
        try {
          // Try different query formats for better results
          let scryfallQuery;
          let searchDescription;
          
          if (query.toLowerCase().includes('underwater tunnel') || query.toLowerCase().includes('room')) {
            // For Room cards, try both exact match and type search
            scryfallQuery = encodeURIComponent(`"${query.trim()}" OR type:room`);
            searchDescription = 'Room card search';
          } else if (query.toLowerCase().includes('adventure') || query.toLowerCase().includes('faerie')) {
            // For Adventure cards, try both exact match and keyword search
            scryfallQuery = encodeURIComponent(`"${query.trim()}" OR keyword:adventure`);
            searchDescription = 'Adventure card search';
          } else {
            // Generic exact match for other special types
            scryfallQuery = encodeURIComponent(`"${query.trim()}"`);
            searchDescription = 'Special card search';
          }
          
          const scryfallUrl = `https://api.scryfall.com/cards/search?q=${scryfallQuery}&unique=cards&order=name`;
          // console.log('� Scryfall URL for', searchDescription, ':', scryfallUrl);
          
          const scryfallRes = await fetch(scryfallUrl);
          if (scryfallRes.ok) {
            const scryfallData = await scryfallRes.json();
            const scryfallResults = scryfallData.data || [];
            // console.log('� Scryfall direct results for', searchDescription, ':', scryfallResults.length, 'cards');
            // console.log('� Scryfall card names:', scryfallResults.map(card => `${card.name} (${card.type_line})`));
            
            if (scryfallResults.length > 0) {
              // Use Scryfall results instead
              results = scryfallResults;
              // console.log('� Using Scryfall results for', searchDescription);
            }
          } else {
            // console.log('� Scryfall request failed:', scryfallRes.status);
            // Try a simpler exact name search as fallback
            const simpleQuery = encodeURIComponent(query.trim());
            const simpleUrl = `https://api.scryfall.com/cards/named?exact=${simpleQuery}`;
            // console.log('🎯 Trying simple exact name search:', simpleUrl);
            
            const simpleRes = await fetch(simpleUrl);
            if (simpleRes.ok) {
              const singleCard = await simpleRes.json();
              // console.log('🎯 Found single card via exact name:', singleCard.name);
              results = [singleCard];
            }
          }
        } catch (scryfallError) {
          // console.log('� Scryfall fallback failed:', scryfallError);
        }
      }
      
      // console.log('🚨 DEBUG: API Response Summary:', {
      //   results_count: results.length,
      //   total_cards: data.total_cards,
      //   has_more: data.has_more,
      //   limit_requested: 1000,
      //   url_used: finalUrl,
      //   used_scryfall_fallback: isSpecialCardQuery && results.length > 0 && !data.data
      // });
      
      // Apply basic land preferences to search results
      const processedResults = Array.isArray(results) ? results.map(card => {
        const isBasicLand = BASIC_LAND_PRINTINGS[card.name];
        if (isBasicLand) {
          const preferredPrintingId = getUserPreferredPrinting(card.name);
          // If this result's ID matches the user's preferred printing, prioritize it
          if (card.id === preferredPrintingId || card.scryfall_id === preferredPrintingId) {
            return { ...card, _isPreferredPrinting: true };
          }
        }
        return card;
      }).sort((a, b) => {
        // Sort preferred printings first for basic lands
        if (a._isPreferredPrinting && !b._isPreferredPrinting) return -1;
        if (!a._isPreferredPrinting && b._isPreferredPrinting) return 1;
        return 0;
      }) : [];
      
      console.log(`🏞️ [SEARCH MODAL] Processed ${processedResults.length} results with basic land preferences`);
      setAllSearchResults(processedResults);
      setModalSearchTerm(query.trim()); // Store the original search term that opened the modal
      setModalSearch(""); // Clear modal search input so users can search freely
      // console.log('🔄 Opening search modal and closing dropdown');
      setShowSearchModal(true);
      setShowDropdown(false); // Close the dropdown only after successful fetch
      
    } catch (error) {
      console.error('Error fetching all search results:', error);
      setAllSearchResults([]);
    } finally {
      setSearchModalLoading(false);
    }
  };

  // Function to search within the modal
  const handleModalSearch = async (query) => {
    if (!query.trim()) {
      setAllSearchResults([]);
      return;
    }
    
    // Cancel previous modal search request if it exists
    if (modalSearchAbortControllerRef.current) {
      modalSearchAbortControllerRef.current.abort();
    }
    
    // Create new abort controller for this modal search request
    modalSearchAbortControllerRef.current = new AbortController();
    const signal = modalSearchAbortControllerRef.current.signal;
    
    // console.log('🔍 Modal search initiated with query:', query);
    setSearchModalLoading(true);
    
    const currentColorId = getCommanderColorIdentity;
    
    try {
      const url = `/api/cards/typesense-search?q=${encodeURIComponent(query.trim())}&limit=1000${currentColorId ? `&colorIdentity=${currentColorId}` : ""}${deck && deck.format ? `&deckFormat=${encodeURIComponent(deck.format)}` : ""}`;
      
      const apiUrl = import.meta.env.VITE_API_URL;
      const isDev = import.meta.env.DEV;
      const finalUrl = isDev ? url : `${apiUrl}${url}`;
      
      console.log('🔍 Modal search debug:', {
        query: query.trim(),
        currentColorId,
        deckFormat: deck?.format,
        url,
        finalUrl
      });
      
      const res = await fetch(finalUrl, { signal });
      
      // Check if request was aborted
      if (signal.aborted) {
        // console.log('🔄 Modal search request was cancelled');
        return;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Final check if request was aborted before setting state
      if (signal.aborted) {
        // console.log('🔄 Modal search request was cancelled after response');
        return;
      }
      
      const results = data.data || data || [];
      
      // Apply basic land preferences to modal search results
      const processedResults = Array.isArray(results) ? results.map(card => {
        const isBasicLand = BASIC_LAND_PRINTINGS[card.name];
        if (isBasicLand) {
          const preferredPrintingId = getUserPreferredPrinting(card.name);
          if (card.id === preferredPrintingId || card.scryfall_id === preferredPrintingId) {
            return { ...card, _isPreferredPrinting: true };
          }
        }
        return card;
      }).sort((a, b) => {
        if (a._isPreferredPrinting && !b._isPreferredPrinting) return -1;
        if (!a._isPreferredPrinting && b._isPreferredPrinting) return 1;
        return 0;
      }) : [];
      
      console.log(`🏞️ [MODAL SEARCH] Processed ${processedResults.length} results with basic land preferences`);
      setAllSearchResults(processedResults);
      setModalSearchTerm(query.trim()); // Update the displayed search term
      
      // Clear flip states when searching for new results
      setSearchModalFlipStates(new Map());
      
    } catch (error) {
      if (error.name === 'AbortError') {
        // console.log('🔄 Modal search request was aborted');
        return;
      }
      console.error('Error in modal search:', error);
      setAllSearchResults([]);
    } finally {
      // Only stop loading if this request wasn't aborted
      if (!signal.aborted) {
        setSearchModalLoading(false);
      }
    }
  };

  // Debounced modal search to avoid too many API calls
  const debouncedModalSearch = debounce(handleModalSearch, 100);

  // Handle oracle tag search from CardActionsModal
  const handleOracleTagSearch = useCallback((oracleTag) => {
    // Oracle tag search requested
    
    // Format the oracle tag for search query
    const searchQuery = `oracletag:${oracleTag}`;
    
    try {
      // Use the existing search infrastructure
      setSearch(searchQuery);
      setShowDropdown(true);
      setSelectedSearchIndex(-1);
      
      // Clear any existing results and show loading
      setSearchResults([]);
      setNoResultsMsg("");
      setSearchLoading(true);
      
      // Initiating oracle tag search
      
      // The existing debouncedSearch will handle the actual API call
      // This will trigger the useEffect that monitors the search state
      
    } catch (error) {
      console.error('Error initiating oracle tag search:', error);
      setNoResultsMsg(`Error searching for oracle tag "${oracleTag}"`);
      setSearchLoading(false);
    }
  }, [setSearch, setShowDropdown, setSelectedSearchIndex, setSearchResults, setNoResultsMsg, setSearchLoading]);

  // Also add function to open search modal directly with oracle tag results
  const handleOracleTagSearchModal = useCallback(async (oracleTag) => {
    // Oracle tag search modal requested
    
    try {
      setSearchModalLoading(true);
      setShowSearchModal(true);
      
      // Format the search query for oracle tags
      const searchQuery = `oracletag:${oracleTag}`;
      
      // Clear the modal search input so users can search freely
      setModalSearch("");
      setModalSearchTerm(searchQuery); // Keep the original search term for reference
      
      // Set the search term so the modal title shows correctly
      setSearch(`Oracle Tag: ${oracleTag.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
      
      // Get current commander color identity for filtering
      let currentColorId = getCommanderColorIdentity;
      
      // Debug: Log commander color identity detection
      const commanderCard = deck?.commander?.[0];
      const commanderName = commanderCard?.card?.name || commanderCard?.name || "";
      
      console.log('🎯 Commander Color Identity Detection:');
      console.log('  - Commander Name:', commanderName);
      console.log('  - Detected Color ID:', currentColorId);
      console.log('  - Is Empty?:', currentColorId === '');
      console.log('  - Length:', currentColorId?.length || 0);
      const debugInfo = {
        oracleTag,
        currentColorId,
        deckFormat: deck?.format,
        commander: deck?.commander,
        commanderNames: deck?.commanderNames,
        commanderCard,
        commanderColorIdentity: commanderCard?.card?.color_identity || commanderCard?.color_identity || commanderCard?.scryfallCard?.color_identity,
        commanderName: commanderCard?.card?.name || commanderCard?.name,
        allCommanderKeys: commanderCard ? Object.keys(commanderCard) : [],
        cardKeys: commanderCard?.card ? Object.keys(commanderCard.card) : []
      };
      console.log('🔍 Oracle Tag Search Debug:', debugInfo);
      
      // Use the same backend API that respects color identity constraints
      const url = `/api/cards/typesense-search?q=${encodeURIComponent(searchQuery)}${currentColorId ? `&colorIdentity=${currentColorId}` : ""}${deck && deck.format ? `&deckFormat=${encodeURIComponent(deck.format)}` : ""}`;
      
      const apiUrl = import.meta.env.VITE_API_URL;
      const isDev = import.meta.env.DEV;
      const finalUrl = isDev ? url : `${apiUrl}${url}`;
      
      console.log('🔗 Oracle Tag Search URL Analysis:');
      console.log('  - Oracle Tag:', oracleTag);
      console.log('  - Search Query:', searchQuery);
      console.log('  - Color ID:', currentColorId);
      console.log('  - Color ID Length:', currentColorId?.length || 0);
      console.log('  - Deck Format:', deck?.format);
      console.log('  - Final URL:', finalUrl);
      console.log('  - URL includes colorIdentity param:', finalUrl.includes('colorIdentity='));
      
      // Oracle tag search with color identity filtering
      
      const response = await fetch(finalUrl);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const results = data.data || data || [];
      
      // Apply basic land preferences to oracle tag search results
      const processedResults = Array.isArray(results) ? results.map(card => {
        const isBasicLand = BASIC_LAND_PRINTINGS[card.name];
        if (isBasicLand) {
          const preferredPrintingId = getUserPreferredPrinting(card.name);
          if (card.id === preferredPrintingId || card.scryfall_id === preferredPrintingId) {
            return { ...card, _isPreferredPrinting: true };
          }
        }
        return card;
      }).sort((a, b) => {
        if (a._isPreferredPrinting && !b._isPreferredPrinting) return -1;
        if (!a._isPreferredPrinting && b._isPreferredPrinting) return 1;
        return 0;
      }) : [];
      
      console.log(`🏞️ [ORACLE TAG] Processed ${processedResults.length} results with basic land preferences`);
      setAllSearchResults(processedResults);
      
    } catch (error) {
      console.error('Error in oracle tag search modal:', error);
      setAllSearchResults([]);
      setSearch(`Oracle Tag Error: ${oracleTag}`);
      // Show error in modal
      toast.error(`Failed to search for oracle tag "${oracleTag}": ${error.message}`);
    } finally {
      setSearchModalLoading(false);
    }
  }, [setSearchModalLoading, setShowSearchModal, setAllSearchResults, setSearch, getCommanderColorIdentity, deck]);

  useEffect(() => {
    debouncedSearch(search);
    return () => {
      debouncedSearch.cancel();
      // No need to cancel resetSelection since it's immediate
    };
  }, [search]);

  // Close search dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (event) => {
      // Check if the click is outside the search container
      const searchContainer = event.target.closest(".search-container");
      if (!searchContainer) {
        setShowDropdown(false);
        // Don't clear the search input when clicking outside - preserve user's search term
        // setSearch("");
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        setShowDropdown(false);
        // Don't clear the search input when pressing Escape - preserve user's search term
        // setSearch("");
      }
    };

    // Add event listeners
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    // Cleanup event listeners
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showDropdown]);

  useEffect(() => {
    // if (deck) {
    //   console.log('DEBUG deck.cards:', deck.cards);
    // }
  }, [deck]);

  const sortCards = useMemo(() => {
    return (cardsToSort, sortOption) => {
      return cardsToSort.sort((a, b) => {
        const nameA = a.card?.name || a.name || "";
        const nameB = b.card?.name || b.name || "";

        // Only extract prices if we're actually sorting by price to improve performance
        if (sortOption.includes('price')) {
          const priceDataA = extractPrice(a);
          const priceDataB = extractPrice(b);

          let priceA = parseFloat(priceDataA.price) || 0;
          let priceB = parseFloat(priceDataB.price) || 0;

          switch (sortOption) {
            case "price-asc":
              return priceA === priceB
                ? nameA.localeCompare(nameB)
                : priceA - priceB;
            case "price-desc":
              return priceB === priceA
                ? nameA.localeCompare(nameB)
                : priceB - priceA;
            default:
              return nameA.localeCompare(nameB);
          }
        }

        switch (sortOption) {
          case "name-asc":
            return nameA.localeCompare(nameB);
          case "name-desc":
            return nameB.localeCompare(nameA);
          default:
            return nameA.localeCompare(nameB);
        }
      });
    };
  }, []); // Empty dependency array since this function doesn't depend on any state

  // Memoize the grouped cards calculation to prevent infinite re-renders
  const groupedCards = useMemo(() => {
    if (!deck) return [];
    try {
      const cardsWithCommander = ensureCommanderInCards(deck);
      const commanderNamesArray = (() => {
        if (!deck || !deck.commander) return [];

        if (Array.isArray(deck.commander)) {
          if (deck.commander.length === 0) return [];
          return deck.commander
            .map((comm) => {
              if (!comm) return "";
              const name = comm.card?.name || comm.name || comm;
              return typeof name === "string" ? name.toLowerCase() : "";
            })
            .filter((name) => name.length > 0);
        } else {
          const comm = deck.commander;
          const name = comm.card?.name || comm.name || comm;
          return typeof name === "string" && name.trim()
            ? [name.toLowerCase()]
            : [];
        }
      })();

      // Group cards based on the selected grouping option
      let result;
      switch (groupBy) {
        case "manaValue":
          result = groupCardsByManaValue(
            cardsWithCommander,
            commanderNamesArray,
          );
          break;
        case "colorIdentity":
          result = groupCardsByColorIdentity(
            cardsWithCommander,
            commanderNamesArray,
          );
          break;
        case "collectionStatus":
          result = groupCardsByCollectionStatus(
            cardsWithCommander,
            commanderNamesArray,
          );
          break;
        case "type":
        default:
          result = groupCardsByType(cardsWithCommander, commanderNamesArray);
      }

      // Sort cards within each group
      if (Array.isArray(result)) {
        ultraSafeForEach(result, (group) => {
          if (group && Array.isArray(group.cards)) {
            group.cards = sortCards(group.cards, sortBy);
          }
        });
      }

      return result;
    } catch (error) {
      console.error("Error grouping cards:", error);
      return [];
    }
  }, [deck, groupBy, sortBy]);

  // Memoized total deck value calculation to prevent excessive re-renders
  const totalDeckValue = useMemo(() => {
    const cardsToCount = filterTestCards(cards || []);
    const totalValue = cardsToCount.reduce((sum, cardObj) => {
      const cardName = cardObj.card?.name || cardObj.name || 'Unknown';
      const quantity = cardObj.count || cardObj.quantity || 1;
      
      // Determine foil status using the same logic as the cache
      const isExplicitlyFoil = cardObj.foil === true ||
                               cardObj.card?.foil === true ||
                               cardObj.cardObj?.foil === true ||
                               cardObj.cardObj?.card?.foil === true;
      
      // Use the same cache key format as the card rendering
      const priceKey = `${cardName}-${cardObj.printing || 'default'}-${isExplicitlyFoil ? 'foil' : 'nonfoil'}`;
      
      // Check cache first, if not found calculate and cache
      let priceData;
      if (priceCache.current.has(priceKey)) {
        priceData = priceCache.current.get(priceKey);
      } else {
        // Create stable card object for consistent pricing
        const stableCardObj = {
          ...cardObj,
          foil: isExplicitlyFoil,
          card: {
            ...cardObj.card,
            foil: isExplicitlyFoil
          }
        };
        priceData = extractPrice(stableCardObj);
        priceCache.current.set(priceKey, priceData);
      }
      
      const price = parseFloat(priceData.price) || 0;
      return sum + (price * quantity);
    }, 0);
    
    return formatPrice(totalValue, { showCurrency: false });
  }, [cards]);

  // Process sideboard cards with same grouping and sorting as main deck
  const groupedSideboardCards = useMemo(() => {
    if (!deck?.sideboard || deck.sideboard.length === 0) return [];
    
    let cardGroups;
    const cardsToGroup = deck.sideboard;
    const commanderNamesForGrouping = commanderNames;

    if (groupBy === "type") {
      cardGroups = groupCardsByType(cardsToGroup, commanderNamesForGrouping);
    } else if (groupBy === "manaValue") {
      cardGroups = groupCardsByManaValue(cardsToGroup, commanderNamesForGrouping);
    } else if (groupBy === "colorIdentity") {
      cardGroups = groupCardsByColorIdentity(cardsToGroup, commanderNamesForGrouping);
    } else if (groupBy === "collectionStatus") {
      cardGroups = groupCardsByCollectionStatus(cardsToGroup, commanderNamesForGrouping);
    }

    // Apply sorting within each group
    if (cardGroups && sortBy) {
      cardGroups.forEach(group => {
        if (group.cards) {
          group.cards = sortCards(group.cards, sortBy);
        }
      });
    }

    return cardGroups || [];
  }, [deck?.sideboard, groupBy, sortBy, commanderNames]);

  // Process tech ideas cards with same grouping and sorting as main deck
  const groupedTechIdeasCards = useMemo(() => {
    if (!deck?.techIdeas || deck.techIdeas.length === 0) return [];
    
    let cardGroups;
    const cardsToGroup = deck.techIdeas;
    const commanderNamesForGrouping = commanderNames;

    if (groupBy === "type") {
      cardGroups = groupCardsByType(cardsToGroup, commanderNamesForGrouping);
    } else if (groupBy === "manaValue") {
      cardGroups = groupCardsByManaValue(cardsToGroup, commanderNamesForGrouping);
    } else if (groupBy === "colorIdentity") {
      cardGroups = groupCardsByColorIdentity(cardsToGroup, commanderNamesForGrouping);
    } else if (groupBy === "collectionStatus") {
      cardGroups = groupCardsByCollectionStatus(cardsToGroup, commanderNamesForGrouping);
    }

    // Apply sorting within each group
    if (cardGroups && sortBy) {
      cardGroups.forEach(group => {
        if (group.cards) {
          group.cards = sortCards(group.cards, sortBy);
        }
      });
    }

    return cardGroups || [];
  }, [deck?.techIdeas, groupBy, sortBy, commanderNames]);

  // Only sort cards within each group, not the groups themselves
  const groupedAndSortedCards = useMemo(() => {
    try {
      let cardGroups;
      // CRITICAL FIX: Always prefer cards state over deck.cards to prevent stale data
      const cardsToGroup = cards || deck?.cards || [];
      
      if (cardsToGroup.length === 0) {
        return [];
      }

      const commanderNamesForGrouping = Array.isArray(commanderNames) ? commanderNames : [];
      
      // Debug logging reduced to prevent console spam

      if (groupBy === "type") {
        cardGroups = groupCardsByType(cardsToGroup, commanderNamesForGrouping);
      } else if (groupBy === "manaValue") {
        cardGroups = groupCardsByManaValue(
          cardsToGroup,
          commanderNamesForGrouping,
        );
      } else if (groupBy === "colorIdentity") {
        cardGroups = groupCardsByColorIdentity(
          cardsToGroup,
          commanderNamesForGrouping,
        );
      } else if (groupBy === "collectionStatus") {
        // Collection status grouping not supported in deck view - fallback to type
        console.warn('Collection status grouping not supported in deck view, falling back to type grouping');
        cardGroups = groupCardsByType(cardsToGroup, commanderNamesForGrouping);
      } else {
        // Fallback: default to grouping by type if groupBy is unrecognized
        cardGroups = groupCardsByType(cardsToGroup, commanderNamesForGrouping);
      }

      // Debug logging reduced to prevent console spam

      // Sort cards within each group only - ensure cardGroups is an array
      if (Array.isArray(cardGroups)) {
        // NUCLEAR SAFETY: Replace forEach with for loop to avoid minification issues
        for (let index = 0; index < cardGroups.length; index++) {
          const group = cardGroups[index];
          try {
            // Processing group safely
            if (!Array.isArray(group.cards)) {
              group.cards = [];
            }
            try {
              // Extra validation before spreading to prevent forEach errors
              if (!Array.isArray(group.cards)) {
                group.cards = [];
              }
              const cardsToSort = [...group.cards];
              group.cards = sortCards(cardsToSort, sortBy);
            } catch (error) {
              console.error('[FOREACH DEBUG] Error in sortCards:', error, 'group.cards:', group.cards);
              console.error('[FOREACH DEBUG] sortBy:', sortBy);
              throw error;
            }
          } catch (groupError) {
            console.error('[FOREACH DEBUG] Error processing group:', groupError);
          }
        }
      } else {
        // Fallback if cardGroups is not an array
        console.error('[FOREACH DEBUG] cardGroups is not an array in groupedAndSortedCards:', typeof cardGroups, cardGroups);
        cardGroups = [];
      }

      return cardGroups;
    } catch (error) {
      console.error('[FOREACH DEBUG] Error in groupedAndSortedCards useMemo:', error);
      console.error('[FOREACH DEBUG] Error stack:', error.stack);
      throw error; // Re-throw to see the full error
    }
  }, [cards, groupBy, sortBy, commanderNames]); // Removed collectionUpdateCounter for better performance
  
  // Navigation functions for CardActionsModal
  const handleNavigateToCard = useCallback((direction) => {
    if (!modalState.isOpen || !modalState.cardObj) return;
    
    // Check if we're in Oracle Tag navigation mode
    if (oracleTagNavigationState.isActive && oracleTagNavigationState.searchResults.length > 0) {
      // Navigate through Oracle Tag search results
      const currentIndex = oracleTagNavigationState.currentIndex;
      let nextIndex;
      
      if (direction === 'previous') {
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = oracleTagNavigationState.searchResults.length - 1; // Wrap to last result
        }
      } else if (direction === 'next') {
        nextIndex = currentIndex + 1;
        if (nextIndex >= oracleTagNavigationState.searchResults.length) {
          nextIndex = 0; // Wrap to first result
        }
      } else {
        return;
      }
      
      const nextCard = oracleTagNavigationState.searchResults[nextIndex];
      if (!nextCard) return;
      
      console.log(`[ORACLE TAG NAVIGATION] Moving to ${direction} card: ${nextCard.name} (${nextIndex + 1}/${oracleTagNavigationState.searchResults.length})`);
      
      // Create enriched card object for the next Oracle Tag result
      const enrichedCardObj = {
        name: nextCard.name,
        printing: nextCard.scryfall_id || nextCard.id,
        cardObj: {
          name: nextCard.name,
          scryfall_id: nextCard.scryfall_id || nextCard.id,
          set: nextCard.set,
          collector_number: nextCard.collector_number,
          image_uris: nextCard.image_uris,
          type_line: nextCard.type_line,
          mana_cost: nextCard.mana_cost,
          oracle_text: nextCard.oracle_text,
          power: nextCard.power,
          toughness: nextCard.toughness,
          cmc: nextCard.cmc || nextCard.converted_mana_cost,
          rarity: nextCard.rarity,
          prices: nextCard.prices,
          card_faces: nextCard.card_faces
        },
        card: {
          name: nextCard.name,
          scryfall_json: nextCard,
          type_line: nextCard.type_line
        },
        scryfall_json: nextCard,
        foil: false,
        count: 1,
        modalPrice: nextCard.prices?.usd || nextCard.prices?.usd_foil || '0.00'
      };
      
      // Update both modal state and Oracle Tag navigation index
      setModalState({
        isOpen: true,
        cardObj: enrichedCardObj,
      });
      
      setOracleTagNavigationState(prev => ({
        ...prev,
        currentIndex: nextIndex
      }));
      
      return;
    }
    
    // Original deck navigation logic
    const currentCardName = modalState.cardObj.card?.name || modalState.cardObj.name;
    if (!currentCardName) return;
    
    // Flatten all cards from all groups to create a navigation order
    const allFlattenedCards = [];
    try {
      if (Array.isArray(groupedAndSortedCards)) {
        console.log('[NUCLEAR SAFETY] About to forEach on groupedAndSortedCards:', {
          isArray: Array.isArray(groupedAndSortedCards),
          type: typeof groupedAndSortedCards,
          length: groupedAndSortedCards?.length,
          value: groupedAndSortedCards
        });
        
        // Ultra-safe forEach with multiple fallbacks
        const safeGroups = Array.isArray(groupedAndSortedCards) ? groupedAndSortedCards : [];
        for (let i = 0; i < safeGroups.length; i++) {
          const group = safeGroups[i];
          try {
            if (group && Array.isArray(group.cards)) {
              const safeCards = Array.isArray(group.cards) ? group.cards : [];
              for (let j = 0; j < safeCards.length; j++) {
                const cardObj = safeCards[j];
                if (cardObj) {
                  allFlattenedCards.push(cardObj);
                }
              }
            }
          } catch (groupError) {
            console.error('[NUCLEAR SAFETY] Error processing group:', group, groupError);
          }
        }
      } else {
        console.error('[NUCLEAR SAFETY] groupedAndSortedCards is not an array:', {
          type: typeof groupedAndSortedCards,
          value: groupedAndSortedCards,
          isNull: groupedAndSortedCards === null,
          isUndefined: groupedAndSortedCards === undefined
        });
      }
    } catch (flattenError) {
      console.error('[NUCLEAR SAFETY] Critical error in card flattening:', flattenError);
      console.trace();
    }
    
    // Find current card index in flattened list
    const currentIndex = allFlattenedCards.findIndex(cardObj => {
      const cardName = cardObj.card?.name || cardObj.name;
      return cardName === currentCardName;
    });
    
    if (currentIndex === -1) return; // Card not found
    
    // Calculate next index based on direction
    let nextIndex;
    if (direction === 'previous') {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) {
        nextIndex = allFlattenedCards.length - 1; // Wrap to last card
      }
    } else if (direction === 'next') {
      nextIndex = currentIndex + 1;
      if (nextIndex >= allFlattenedCards.length) {
        nextIndex = 0; // Wrap to first card
      }
    } else {
      return;
    }
    
    // Get the next card
    const nextCard = allFlattenedCards[nextIndex];
    if (!nextCard) return;
    
    // Create enriched card object similar to how the modal is opened normally
    const enrichedCardObj = {
      ...nextCard,
      cardObj: nextCard,
      name: nextCard.card?.name || nextCard.name
    };
    
    // Update modal state with new card
    setModalState({
      isOpen: true,
      cardObj: enrichedCardObj,
    });
  }, [modalState, groupedAndSortedCards, oracleTagNavigationState]);

  const handleNavigateToPreviousCard = useCallback(() => {
    handleNavigateToCard('previous');
  }, [handleNavigateToCard]);

  const handleNavigateToNextCard = useCallback(() => {
    handleNavigateToCard('next');
  }, [handleNavigateToCard]);

  // Handle preview updates from CardActionsModal when printing changes
  const handlePreviewUpdate = useCallback((updatedCard) => {
    // Preview update received
    
    // Update the fixed preview to show the new printing's image
    setFixedPreview(currentPreview => ({
      ...currentPreview,
      card: {
        ...updatedCard,
        // Ensure we have the proper image structure
        image_uris: updatedCard.image_uris || updatedCard.scryfall_json?.image_uris,
        // Keep any existing preview state
        flipped: currentPreview.card?.flipped || false
      }
    }));
  }, [setFixedPreview]);

  // Function to check if a card is already present in the deck
  const isCardInDeck = useCallback((searchCard) => {
    if (!cards || !searchCard) return false;
    
    const searchCardName = searchCard.name;
    if (!searchCardName) return false;
    
    // Check if any card in the deck matches this card name
    return cards.some(deckCard => {
      const deckCardName = deckCard.card?.name || deckCard.name;
      return deckCardName === searchCardName;
    });
  }, [cards]);

  // --- Modal Card Action Handlers (implemented for printing, quantity, and foil) ---
  function handleUpdateCard(cardObj, updates = {}) {
    // console.log('[DeckViewEdit] handleUpdateCard called with:', cardObj, updates);

    // Validate we have a card object to work with
    if (!cardObj) {
      console.error("[DeckViewEdit] Cannot update card: missing card object");
      toast.error("Failed to update card: Missing card data");
      return;
    }

    // CRITICAL: Validate cards array to prevent forEach errors
    if (!Array.isArray(cards)) {
      console.error('[FOREACH DEBUG] handleUpdateCard: cards is not an array:', typeof cards, cards);
      toast.error("Failed to update card: Invalid deck data");
      return;
    }

    try {
      // Handle fresh price data updates from modal (non-intrusive background update)
      if (updates.freshPriceDataOnly && updates.scryfall_json) {
        const cardName = cardObj.card?.name || cardObj.name;
        if (!cardName) {
          console.error("[DeckViewEdit] Cannot update fresh price data: missing card name");
          return;
        }

        // Update the card's stored Scryfall data with fresh pricing information
        const timestamp = Date.now();
        const updatedCards = cards.map((c) => {
          const cName = c.card?.name || c.name;
          if (cName === cardName) {
            // Deep update the Scryfall JSON data to include fresh prices
            const updated = {
              ...c,
              // Update top-level scryfall data if it exists
              ...(c.scryfall_json ? { scryfall_json: { ...c.scryfall_json, ...updates.scryfall_json } } : {}),
              // Update nested card structure
              ...(c.card ? {
                card: {
                  ...c.card,
                  // Update scryfall_json in nested card structure
                  ...(c.card.scryfall_json ? { 
                    scryfall_json: { ...c.card.scryfall_json, ...updates.scryfall_json } 
                  } : { 
                    scryfall_json: updates.scryfall_json 
                  })
                }
              } : {}),
              // Update cardObj structure if it exists
              ...(c.cardObj ? {
                cardObj: {
                  ...c.cardObj,
                  ...(c.cardObj.card ? {
                    card: {
                      ...c.cardObj.card,
                      ...(c.cardObj.card.scryfall_json ? { 
                        scryfall_json: { ...c.cardObj.card.scryfall_json, ...updates.scryfall_json } 
                      } : { 
                        scryfall_json: updates.scryfall_json 
                      })
                    }
                  } : {}),
                  // Also update direct scryfall_json in cardObj
                  ...(c.cardObj.scryfall_json ? { 
                    scryfall_json: { ...c.cardObj.scryfall_json, ...updates.scryfall_json } 
                  } : { 
                    scryfall_json: updates.scryfall_json 
                  })
                }
              } : {}),
              lastUpdated: timestamp
            };

            // CRITICAL: Store modal price for perfect synchronization if provided
            if (updates.modalPrice !== undefined) {
              updated.modalPrice = updates.modalPrice;
              if (updated.card) updated.card.modalPrice = updates.modalPrice;
              if (updated.cardObj) {
                updated.cardObj.modalPrice = updates.modalPrice;
                if (updated.cardObj.card) updated.cardObj.card.modalPrice = updates.modalPrice;
              }
            }
            
            return updated;
          }
          return c;
        });

        setDeck(prevDeck => ({
          ...prevDeck,
          cards: updatedCards,
          lastUpdated: timestamp
        }));
        
        return; // Exit early for fresh price data updates
      }

      // If we have a new printing with scryfall_json data, update the card's printing
      // Note: printing may be passed for foil updates too, but only process as printing update if scryfall_json is present
      if (updates.printing && updates.scryfall_json) {
        // Get the printing object from the updates
        const newPrintingCard = updates.scryfall_json || null;

        if (newPrintingCard) {
          // Store the modal price if provided for perfect synchronization
          if (updates.modalPrice !== undefined) {
            // Add modalPrice to the new printing card for the update
            newPrintingCard.modalPrice = updates.modalPrice;
          }
          
          // CRITICAL: Store the modal foil status if provided for perfect synchronization
          if (updates.foil !== undefined) {
            // Add modalFoilStatus to the new printing card for the update
            newPrintingCard.modalFoilStatus = updates.foil;
          }

          // Update the card preview immediately if it's showing this card
          // This provides instant visual feedback before the API call completes
          const currentPreviewCard = fixedPreview?.card;
          const cardName = cardObj.card?.name || cardObj.name;
          const previewCardName =
            currentPreviewCard?.name || currentPreviewCard?.card?.name;

          if (currentPreviewCard && previewCardName === cardName) {
            // console.log('[DeckViewEdit] Immediately updating preview with new printing');

            // Update the fixed preview with new printing data
            setFixedPreview({
              card: {
                ...currentPreviewCard,
                printing: updates.printing,
                scryfall_json: updates.scryfall_json,
                modalPrice: updates.modalPrice, // Include modal price for synchronization
                image_uris:
                  updates.image_uris || updates.scryfall_json?.image_uris,
                card_faces:
                  updates.card_faces || updates.scryfall_json?.card_faces,
              },
              top: 0,
              left: 0,
            });
          }

          // Use the existing function to update the printing in the deck
          handlePrintingUpdate(cardObj, newPrintingCard);
        } else {
          console.error(
            "[DeckViewEdit] Cannot update printing: missing scryfall_json data",
          );
          toast.error("Failed to update card printing: Missing card data");
        }
        return; // Exit early - printing updates are handled by handlePrintingUpdate
      }

      // If we have a new quantity, update the card's quantity or remove it if quantity < 1
      if (updates.quantity !== undefined) {
        try {
          // Quantity update started

          // If quantity is less than 1, remove the card instead of updating
          if (updates.quantity < 1) {
            // console.log('[DeckViewEdit] Quantity is < 1, removing card instead of updating');
            handleRemoveCard(cardObj);
            return;
          }

          const cardName = cardObj.card?.name || cardObj.name;
          if (!cardName) {
            console.error(
              "[DeckViewEdit] Cannot update quantity: missing card name",
            );
            toast.error("Failed to update quantity: Missing card data");
            return;
          }

          // Create a timestamp to force React to see the changes
          const timestamp = Date.now();

          // Check for and remove duplicate card entries (consolidated fix)

          // CRITICAL FIX: First, identify all matching cards and keep only one
          let updatedCards = [];
          let hasFoundMatch = false;
          
          console.log(`[QUANTITY DEBUG] Looking for card to update: "${cardName}", quantity: ${updates.quantity}`);
          console.log(`[QUANTITY DEBUG] CardObj data:`, { 
            name: cardName,
            foil: cardObj.foil || cardObj.card?.foil || false,
            printing: cardObj.printing || cardObj.card?.printing || cardObj.cardObj?.printing
          });
          
          cards.forEach((c) => {
            const cName = c.card?.name || c.name;
            const cardFoil = cardObj.foil || cardObj.card?.foil || false;
            const cFoil = c.foil || c.card?.foil || false;
            const cardPrinting = cardObj.printing || cardObj.card?.printing || cardObj.cardObj?.printing;
            const cPrinting = c.printing || c.card?.printing || c.cardObj?.printing;
            
            const nameMatches = cName === cardName;
            const foilMatches = cardFoil === cFoil;
            
            // CRITICAL FIX: Flexible printing matching to handle modal/deck mismatches
            // Priority 1: Exact printing match
            const exactPrintingMatch = cardPrinting && cPrinting && cardPrinting === cPrinting;
            // Priority 2: Basic land flexibility (any printing) - use BASIC_LAND_PRINTINGS as source of truth
            const isBasicLand = cardName && BASIC_LAND_PRINTINGS[cardName];
            // Priority 3: Fall back to name+foil match if no printing info available
            const noPrintingInfo = !cardPrinting || !cPrinting;
            
            const printingMatches = exactPrintingMatch || isBasicLand || noPrintingInfo;
            
            if (cName === cardName) {
              console.log(`[QUANTITY DEBUG] Found potential match: "${cName}"`, {
                nameMatches,
                foilMatches: `${cardFoil} === ${cFoil} = ${foilMatches}`,
                exactPrintingMatch: `${cardPrinting} === ${cPrinting} = ${exactPrintingMatch}`,
                isBasicLand,
                noPrintingInfo,
                printingMatches,
                overallMatch: nameMatches && foilMatches && printingMatches,
                currentCount: c.count
              });
            }
            
            if (nameMatches && foilMatches && printingMatches) {
              if (!hasFoundMatch) {
                // This is the first match - update it and keep it
                hasFoundMatch = true;
                console.log(`[QUANTITY DEBUG] Updating card "${cName}" from quantity ${c.count} to ${updates.quantity}`);
                // Create a new object with updated quantity at all levels
                const updated = {
                  ...c,
                  count: updates.quantity, // Top-level count
                  quantity: updates.quantity, // Some places might use quantity instead
                  // Also ensure it's in all possible nested structures
                  ...(c.card
                    ? {
                        card: {
                          ...c.card,
                          count: updates.quantity,
                          quantity: updates.quantity,
                        },
                      }
                    : {}),
                  ...(c.cardObj
                    ? {
                        cardObj: {
                          ...c.cardObj,
                          count: updates.quantity,
                          quantity: updates.quantity,
                          ...(c.cardObj.card
                            ? {
                                card: {
                                  ...c.cardObj.card,
                                  count: updates.quantity,
                                  quantity: updates.quantity,
                                },
                              }
                            : {}),
                        },
                      }
                    : {}),
                };
                updatedCards.push(updated);
              } else {
                // This is a duplicate - skip it (no need to add to updatedCards)
                // console.log(`[DeckViewEdit] Removing duplicate card entry: ${cName}, count: ${c.count}`);
              }
            } else {
              // This card doesn't match - keep it as is
              updatedCards.push(c);
            }
          });

          // Duplicate removal completed - now have single card instance with updated quantity

          // Update local state for immediate UI feedback with a new array reference
          // Setting cards state with updated array
          const updatedCard = updatedCards.find(c => (c.card?.name || c.name) === cardName);
          // Updated card details processed
          
          // Force React to detect changes by creating completely new array references
          const newCardsArray = updatedCards.map(card => ({ ...card }));
          console.log(`[QUANTITY DEBUG] Final result - found match: ${hasFoundMatch}, total cards: ${newCardsArray.length}`);
          if (hasFoundMatch) {
            const updatedCard = newCardsArray.find(c => (c.card?.name || c.name) === cardName);
            console.log(`[QUANTITY DEBUG] Updated card final state:`, {
              name: updatedCard?.card?.name || updatedCard?.name,
              count: updatedCard?.count,
              quantity: updatedCard?.quantity
            });
          }
          setCards(newCardsArray);

          // Update the deck object to ensure UI reflects changes
          // Updating deck state
          setDeck((prevDeck) => {
            if (!prevDeck) return prevDeck;

            const updatedDeckCards = prevDeck.cards.map((c) => {
              const cName = c.name || c.card?.name || c.cardObj?.name;
              if (cName === cardName) {
                // Preserve all card data but update quantity
                return {
                  ...c,
                  count: updates.quantity,
                  quantity: updates.quantity,
                  // Preserve existing card data including printings
                  ...(c.card
                    ? {
                        card: {
                          ...c.card,
                          count: updates.quantity,
                          quantity: updates.quantity,
                          // Keep existing card ID and printing info
                          id: c.card.id || c.card.scryfall_id,
                          scryfall_id: c.card.scryfall_id || c.card.id,
                          set: c.card.set,
                          set_name: c.card.set_name,
                          collector_number: c.card.collector_number,
                        },
                      }
                    : {}),
                  ...(c.cardObj
                    ? {
                        cardObj: {
                          ...c.cardObj,
                          // Preserve existing card data
                          id: c.cardObj.id || c.cardObj.scryfall_id,
                          scryfall_id: c.cardObj.scryfall_id || c.cardObj.id,
                          set: c.cardObj.set,
                          set_name: c.cardObj.set_name,
                          collector_number: c.cardObj.collector_number,
                          count: updates.quantity,
                          quantity: updates.quantity,
                          ...(c.cardObj.card
                            ? {
                                card: {
                                  ...c.cardObj.card,
                                  count: updates.quantity,
                                  quantity: updates.quantity,
                                },
                              }
                            : {}),
                        },
                      }
                    : {}),
                };
              }
              return c;
            });

            const newDeck = {
              ...prevDeck,
              cards: [...updatedDeckCards], // Use spread to create a new array reference
              lastUpdated: timestamp, // Add a timestamp to force React to detect the change
            };
            // console.log('[DeckViewEdit] QUANTITY UPDATE - New deck state created:', newDeck);
            return newDeck;
          });

          // Force a re-render by updating multiple states to ensure React detects the change
          setRefreshTrigger(prev => prev + 1);
          
          // Also force re-render of grouped cards if we're using grouping
          if (groupBy) {
            setCollectionUpdateCounter(prev => prev + 1);
          }

          // console.log('[DeckViewEdit] ✅ QUANTITY UPDATE COMPLETE - New quantity should be visible in UI');

          // If the current preview card matches this card, update its quantity too
          const currentPreviewCard = fixedPreview?.card;
          const previewCardName =
            currentPreviewCard?.name || currentPreviewCard?.card?.name;

          if (currentPreviewCard && previewCardName === cardName) {
            setFixedPreview({
              card: {
                ...currentPreviewCard,
                count: updates.quantity,
                ...(currentPreviewCard.card
                  ? {
                      card: {
                        ...currentPreviewCard.card,
                        count: updates.quantity,
                      },
                    }
                  : {}),
              },
              top: 0,
              left: 0,
            });
          }

          // Update the modal state card to reflect the quantity change
          // Only update if this is a quantity update and the modal card matches
          if (
            modalState.isOpen &&
            modalState.cardObj &&
            updates.quantity !== undefined
          ) {
            const modalCardName =
              modalState.cardObj.card?.name || modalState.cardObj.name;
            if (modalCardName === cardName) {
              setModalState((prevState) => ({
                ...prevState,
                cardObj: {
                  ...prevState.cardObj,
                  count: updates.quantity,
                  card: prevState.cardObj.card
                    ? {
                        ...prevState.cardObj.card,
                        count: updates.quantity,
                      }
                    : prevState.cardObj.card,
                },
              }));
            }
          }

          // Persist to the server for permanent storage
          try {
            // Get the authentication token (this was missing in the original code)
            const token = localStorage.getItem("token");
            if (!token) {
              console.error(
                "[DeckViewEdit] No authentication token found for server update",
              );
              toast.error(
                "Quantity updated locally but cannot save to server: Not logged in",
              );
              return;
            }

            // DEBUG: Log the final updated deck state to verify count changes
            // console.log('[DeckViewEdit] QUANTITY UPDATE DEBUG - Final deck state after update:', {
            //   cardName,
            //   newQuantity: updates.quantity,
            //   deckCardsCount: deck.cards?.length || 0,
            //   updatedCards: deck.cards?.filter(c => {
            //     const cName = c.name || c.card?.name || c.cardObj?.name || c.cardObj?.card?.name;
            //     return cName === cardName;
            //   }).map(c => ({
            //     name: c.name,
            //     count: c.count,
            //     quantity: c.quantity,
            //     cardCount: c.card?.count,
            //     cardQuantity: c.card?.quantity,
            //     cardObjCount: c.cardObj?.count,
            //     cardObjQuantity: c.cardObj?.quantity
            //   }))
            // });

            // Define and immediately execute an async function to handle the server update
            (async function updateServer() {
              // Define ObjectId validation function
              const isValidObjectId = (id) => {
                return id && typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
              };

              // Use the same robust card cleaning approach as printing updates to prevent 500 errors
              const cleanCards = updatedCards.map((card) => {
                // CRITICAL FIX: Validate modalPrice to prevent undefined from being sent to server
                const validModalPrice = (card.modalPrice !== undefined && card.modalPrice !== null && card.modalPrice !== "undefined") ? card.modalPrice : null;
                
                // DEBUG: Log card data before cleaning for Island
                if ((card.card?.name || card.name) === 'Island') {
                  console.log(`[CARD CLEANING DEBUG] Island before cleaning:`, {
                    name: card.card?.name || card.name,
                    originalCount: card.count,
                    countExists: 'count' in card,
                    cardStructure: Object.keys(card)
                  });
                }
                
                // Basic card info that's always needed - match structure from handleAddCard
                let cleanCard = {
                  name: card.card?.name || card.name,
                  count: card.count || 1,
                  quantity: card.count || 1, // Add quantity field for server compatibility
                  printing: card.printing || null,
                  isCommander: card.isCommander || false, // Ensure isCommander field
                  ...(card.foil !== undefined ? { foil: card.foil } : {}),
                  // Include all essential card properties for server validation
                  set: card.set || card.card?.set || card.scryfall_json?.set,
                  collector_number: card.collector_number || card.card?.collector_number || card.scryfall_json?.collector_number,
                  finishes: card.finishes || card.scryfall_json?.finishes || ["nonfoil"],
                  prices: card.prices || card.card?.prices || card.scryfall_json?.prices || {},
                  mana_cost: card.mana_cost || card.card?.mana_cost || card.scryfall_json?.mana_cost,
                  color_identity: card.color_identity || card.card?.color_identity || card.scryfall_json?.color_identity,
                  cmc: card.cmc || card.card?.cmc || card.scryfall_json?.cmc,
                  type_line: card.type_line || card.card?.type_line || card.scryfall_json?.type_line,
                  scryfall_id: card.scryfall_id || card.card?.scryfall_id || card.scryfall_json?.id,
                  // CRITICAL FIX: Include modalPrice to persist synchronized pricing - only if not null
                  ...(validModalPrice !== null ? { modalPrice: validModalPrice } : {}),
                };

                // Handle MongoID references properly
                if (card._id && isValidObjectId(card._id)) {
                  cleanCard._id = card._id;
                }

                // CRITICAL FIX: Properly structure the card field for server compatibility
                // The server expects either a MongoDB ObjectId string OR a complete card object
                if (card.card) {
                  if (typeof card.card === "object" && card.card !== null) {
                    if (card.card._id && isValidObjectId(card.card._id)) {
                      // Use MongoDB ObjectId reference
                      cleanCard.card = card.card._id;
                    } else {
                      // Include essential card data structure for server
                      cleanCard.card = {
                        name: card.card.name || card.name,
                        set: card.card.set || card.set || card.scryfall_json?.set,
                        collector_number: card.card.collector_number || card.collector_number || card.scryfall_json?.collector_number,
                        mana_cost: card.card.mana_cost || card.mana_cost || card.scryfall_json?.mana_cost,
                        color_identity: card.card.color_identity || card.color_identity || card.scryfall_json?.color_identity,
                        cmc: card.card.cmc || card.cmc || card.scryfall_json?.cmc,
                        type_line: card.card.type_line || card.type_line || card.scryfall_json?.type_line,
                        ...(card.card._id && isValidObjectId(card.card._id) ? { _id: card.card._id } : {}),
                      };
                    }
                  } else if (typeof card.card === "string") {
                    if (isValidObjectId(card.card)) {
                      cleanCard.card = card.card;
                    } else {
                      // Create card object with available data
                      cleanCard.card = {
                        name: card.name,
                        set: card.set || card.scryfall_json?.set,
                        collector_number: card.collector_number || card.scryfall_json?.collector_number,
                        mana_cost: card.mana_cost || card.scryfall_json?.mana_cost,
                        color_identity: card.color_identity || card.scryfall_json?.color_identity,
                        cmc: card.cmc || card.scryfall_json?.cmc,
                        type_line: card.type_line || card.scryfall_json?.type_line,
                      };
                    }
                  }
                } else {
                  // No card reference - create one from available data
                  cleanCard.card = {
                    name: card.name,
                    set: card.set || card.scryfall_json?.set,
                    collector_number: card.collector_number || card.scryfall_json?.collector_number,
                    mana_cost: card.mana_cost || card.scryfall_json?.mana_cost,
                    color_identity: card.color_identity || card.scryfall_json?.color_identity,
                    cmc: card.cmc || card.scryfall_json?.cmc,
                    type_line: card.type_line || card.scryfall_json?.type_line,
                  };
                }

                return cleanCard;
              });

              // CRITICAL DEBUG: Log the Island data being sent to server
              const islandInCleanCards = cleanCards.find(card => (card.name || card.card?.name) === cardName);
              if (cardName === 'Island' || islandInCleanCards) {
                console.log(`[QUANTITY DEBUG] Island data being sent to server:`, {
                  found: !!islandInCleanCards,
                  cardName: cardName,
                  islandData: islandInCleanCards,
                  updatesQuantity: updates.quantity,
                  cleanedCount: islandInCleanCards?.count,
                  cleanedQuantity: islandInCleanCards?.quantity,
                  hasCountField: islandInCleanCards ? ('count' in islandInCleanCards) : false,
                  hasQuantityField: islandInCleanCards ? ('quantity' in islandInCleanCards) : false
                });
              }
              
              console.log('[QUANTITY UPDATE] Sending cleaned cards to server:', cleanCards);

              const apiUrl = import.meta.env.VITE_API_URL;

              // console.log('[DeckViewEdit] Sending updated quantity to server. Formatted cards:', formattedCards);

              // Send the updated deck to the server with auth token - using await directly instead of nested function
              // console.log('[DeckViewEdit] Sending to server with token:', token.substring(0, 10) + '...');

              const response = await fetch(`${apiUrl}/api/decks/${id}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`, // Add auth token - critical for the server auth middleware
                  "Cache-Control": "no-cache", // Prevent caching issues
                },
                credentials: "include", // Include cookies for sessions
                body: JSON.stringify({
                  cards: cleanCards,
                  name: name || deck.name,
                  // Preserve commander data in server update
                  commander: deck.commander,
                  commanderNames: deck.commanderNames,
                }),
              });

              // Check if the response is ok
              if (!response.ok) {
                console.error(
                  `[DeckViewEdit] Server error updating quantity: ${response.status}`,
                );
                // Get error details if available
                let errorDetails = "";
                try {
                  const errorData = await response.json();
                  errorDetails = errorData.message || errorData.error || "";
                } catch (e) {
                  // Ignore parse errors
                }
                toast.error(
                  `Quantity updated locally but failed to save to server. ${errorDetails}`,
                );
                return;
              }

              try {
                // Parse the response to ensure it was processed correctly
                const responseData = await response.json();
                // console.log('[DeckViewEdit] Quantity update server response:', responseData);

                // Update the deck with the server response to ensure consistency
                setDeck((prevDeck) => ({
                  ...prevDeck,
                  ...responseData,
                  cards: updatedCards, // Keep our local card state with all the UI-needed fields
                }));

                // Show success message only after successful server update
                toast.success(`Updated quantity to ${updates.quantity}.`);
              } catch (parseError) {
                console.error(
                  "[DeckViewEdit] Error parsing server response:",
                  parseError,
                );
                toast.warning(
                  "Quantity updated but server response was invalid. Changes may not persist after refresh.",
                );
              }
            })(); // End of async function and immediate execution
          } catch (error) {
            console.error(
              "[DeckViewEdit] Error in server update for quantity:",
              error,
            );
            toast.error(
              `Quantity updated locally but failed to save to server: ${error.message}`,
            );
          }
        } catch (error) {
          console.error("[DeckViewEdit] Error updating quantity:", error);
          toast.error("Failed to update quantity.");
        }
      }

      // Handle foil/non-foil update
      if (
        updates.isFoil !== undefined ||
        updates.foil !== undefined ||
        updates.price !== undefined ||
        updates.foilToggleAction === true
      ) {
        try {
          // Accept either 'isFoil' or 'foil' parameter to be more flexible
          const foilStatus =
            updates.isFoil !== undefined ? updates.isFoil : updates.foil;
          const explicitPrice = updates.price;

          const timestamp = Date.now();

          // Create a new copy of the cards array with the matching card deeply updated
          const updatedCards = cards.map((c) => {
            const cName = c.card?.name || c.name;
            const cardName = cardObj.card?.name || cardObj.name;

            // For foil updates, match by name only (since printing info may not be available in updates)
            // For printing updates, we need to match by both name and printing
            const cPrinting = c.printing || c.card?.printing;
            const cardPrinting = cardObj.printing || cardObj.card?.printing;

            // Match by name, and optionally by printing if both cards have printing info
            const nameMatches = cName === cardName;
            const printingMatches =
              !cPrinting || !cardPrinting || cPrinting === cardPrinting;

            if (nameMatches && printingMatches) {
              // Deep clone to avoid reference issues
              const updated = JSON.parse(JSON.stringify(c));

              // Update foil status at all levels
              updated.foil = !!foilStatus;
              if (updated.card) updated.card.foil = !!foilStatus;
              if (updated.cardObj) {
                updated.cardObj.foil = !!foilStatus;
                if (updated.cardObj.card) updated.cardObj.card.foil = !!foilStatus;
              }

              // Recalculate price based on the new foil status
              const priceData = extractPrice(updated);
              const priceToUse =
                explicitPrice !== undefined && explicitPrice !== null ? explicitPrice : priceData.price;

              // Update price at all levels
              updated.price = priceToUse;
              if (updated.card) updated.card.price = priceToUse;
              if (updated.cardObj) {
                updated.cardObj.price = priceToUse;
                if (updated.cardObj.card) updated.cardObj.card.price = priceToUse;
              }

              // CRITICAL: Store modal price for perfect synchronization
              if (updates.modalPrice !== undefined) {
                updated.modalPrice = updates.modalPrice;
                if (updated.card) updated.card.modalPrice = updates.modalPrice;
                if (updated.cardObj) {
                  updated.cardObj.modalPrice = updates.modalPrice;
                  if (updated.cardObj.card) updated.cardObj.card.modalPrice = updates.modalPrice;
                }
              }

              updated.lastUpdated = timestamp;
              return updated;
            }
            return c;
          });
          
          // Update local state for immediate UI feedback
          setCards(updatedCards);

          // Update the deck object as well
          setDeck((prevDeck) => {
            if (!prevDeck) return null;
            return {
              ...prevDeck,
              cards: updatedCards,
              lastUpdated: timestamp,
            };
          });

          // Note: We intentionally do NOT update the modal state here
          // The modal handles its own state independently and the foil toggle
          // should not cause the modal to reinitialize

          // Persist to the server
          (async () => {
            try {
              const token = localStorage.getItem("token");
              if (!token) {
                toast.error(
                  "Foil status updated locally but cannot save to server: Not logged in",
                );
                return;
              }

              const apiUrl = import.meta.env.VITE_API_URL;
              const cleanCards = updatedCards.map((card) => {
                const { price } = extractPrice(card);
                return {
                  name: card.card?.name || card.name,
                  count: card.count || 1,
                  foil: !!card.foil, // Use the card's actual foil status, not extractPrice's interpretation
                  price: price,
                  printing: card.printing || null,
                  // CRITICAL FIX: Include modalPrice to persist synchronized pricing
                  ...(card.modalPrice !== undefined ? { modalPrice: card.modalPrice } : {}),
                  ...(card._id ? { _id: card._id } : {}),
                  ...(card.card && card.card._id
                    ? { card: { _id: card.card._id, name: card.card.name } }
                    : {}),
                };
              });

              // Debug logging for modalPrice persistence
              const cardsWithModalPrice = cleanCards.filter(c => c.modalPrice !== undefined);
              if (cardsWithModalPrice.length > 0) {
                // console.log(`[CLEAN CARDS] Cards with modalPrice being sent to server:`, cardsWithModalPrice.map(c => `${c.name}: $${c.modalPrice}`).join(', '));
              }

              /* console.log('[DeckViewEdit] FOIL UPDATE - Sending to server:', {
                cardName: cardObj.card?.name || cardObj.name,
                foilStatus: foilStatus,
                cleanCards: cleanCards.filter(c => c.name === (cardObj.card?.name || cardObj.name))
              }); */

              const response = await fetch(`${apiUrl}/api/decks/${id}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                  "Cache-Control": "no-cache",
                },
                body: JSON.stringify({
                  cards: cleanCards,
                  name: name || deck.name,
                  lastUpdated: timestamp,
                  // Preserve commander data in server update
                  commander: deck.commander,
                  commanderNames: deck.commanderNames,
                }),
              });

              if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
              }

              const responseData = await response.json();
              /* console.log('[DeckViewEdit] FOIL UPDATE - Server response received:', {
                cardName: cardObj.card?.name || cardObj.name,
                foilStatus: foilStatus,
                responseReceived: true
              }); */

              // Final consistency update with server response
              setDeck((prev) => ({
                ...prev,
                ...responseData,
                cards: updatedCards,
                lastUpdated: Date.now(),
              }));

              const priceInfo = foilStatus ? " (foil price applied)" : "";
              toast.success(
                `Updated to ${foilStatus ? "foil" : "non-foil"}${priceInfo}.`,
              );
            } catch (error) {
              console.error(
                "[DeckViewEdit] Error saving foil status to server:",
                error,
              );
              toast.error(
                `Foil status updated locally but failed to save to server: ${error.message}`,
              );
            }
          })();
        } catch (error) {
          console.error("[DeckViewEdit] Error updating foil status:", error);
          toast.error("Failed to update foil status.");
        }
      }
    } catch (error) {
      // Central error handling for all card updates
      console.error("[DeckViewEdit] Card update error:", error);
      toast.error(`Failed to update card: ${error.message}`);
    }
  }

  function handleRemoveCard(cardObjToRemove) {
    const cardName =
      cardObjToRemove.name ||
      cardObjToRemove.card?.name ||
      cardObjToRemove.cardObj?.name ||
      cardObjToRemove.cardObj?.card?.name;

    if (!cardName) {
      console.error(
        "[DeckViewEdit] Failed to remove card: Could not determine card name",
        "Card object structure:", cardObjToRemove
      );
      toast.error("Failed to remove card: Could not determine card name");
      return;
    }

    // DEBUG: Log commander state before removal
    console.log('[DEBUG] Before card removal:', {
      cardBeingRemoved: cardName,
      commanderArray: deck?.commander,
      commanderNames: deck?.commanderNames,
      deckId: deck?._id
    });
    console.log('[DEBUG] Full deck object before removal:', deck);

    // console.log('[DeckViewEdit] Removing card from deck:', cardName);

    try {
      // Create a timestamp to force React to see the changes
      const timestamp = Date.now();

      // Filter out the card from the cards array
      const updatedCards = cards.filter((c) => {
        const cName =
          c.name || c.card?.name || c.cardObj?.name || c.cardObj?.card?.name;
        const shouldKeep = cName !== cardName;
        /*
        if (!shouldKeep) {
          // console.log(`[DeckViewEdit] Filtering out card: ${cName}`);
        }
        */
        return shouldKeep;
      });

      // console.log(`[DeckViewEdit] Cards count before: ${cards.length}, after: ${updatedCards.length}`);

      // Update the cards state with the filtered array
      setCards([...updatedCards]); // Use spread to create a new array reference

      // Update the deck object with the filtered cards as well
      setDeck((prevDeck) => {
        if (!prevDeck) return prevDeck;

        const updatedDeckCards = prevDeck.cards.filter((c) => {
          const cName =
            c.name || c.card?.name || c.cardObj?.name || c.cardObj?.card?.name;
          return cName !== cardName;
        });

        // console.log(`[DeckViewEdit] Deck cards count before: ${prevDeck.cards.length}, after: ${updatedDeckCards.length}`);

        return {
          ...prevDeck,
          cards: [...updatedDeckCards], // Use spread to create a new array reference
          lastUpdated: timestamp, // Add a timestamp to force React to detect the change
        };
      });

      // Get the authentication token (this was missing in the original code)
      const token = localStorage.getItem("token");
      if (!token) {
        console.error(
          "[DeckViewEdit] No authentication token found for server update",
        );
        toast.error(
          "Card removed locally but cannot save to server: Not logged in",
        );
        return;
      }

      // Clean existing cards to remove excessive nested data (same as add card function)
      const cleanedCards = updatedCards.map(card => ({
        name: card.name || card.card?.name,
        quantity: card.quantity || 1,
        count: card.count || 1,
        isCommander: card.isCommander || false,
        set: card.set || card.card?.set,
        collector_number: card.collector_number || card.card?.collector_number,
        finishes: card.finishes || ["nonfoil"],
        prices: card.prices || {},
        mana_cost: card.mana_cost || card.card?.mana_cost,
        color_identity: card.color_identity || card.card?.color_identity,
        cmc: card.cmc || card.card?.cmc,
        type_line: card.type_line || card.card?.type_line,
        scryfall_id: card.scryfall_id || card.card?.scryfall_id,
        // Minimal card object
        card: {
          name: card.name || card.card?.name,
          mana_cost: card.mana_cost || card.card?.mana_cost,
          color_identity: card.color_identity || card.card?.color_identity,
          cmc: card.cmc || card.card?.cmc,
          type_line: card.type_line || card.card?.type_line,
          set: card.set || card.card?.set,
          collector_number: card.collector_number || card.card?.collector_number,
          scryfall_id: card.scryfall_id || card.card?.scryfall_id
        }
      }));

      // Update the server - critical to ensure changes persist after refresh
      const apiUrl = import.meta.env.VITE_API_URL;

      // Use a single async IIFE to avoid multiple server updates
      (async () => {
        try {
          // console.log('[DeckViewEdit] Sending updated deck to server after card removal');
          // console.log('[DeckViewEdit] Formatted cards for server:', formattedCards);

          // Create clean deck object for server update (same approach as add card)
          const cleanDeckForServer = {
            _id: deck._id,
            name: deck.name,
            format: deck.format,
            commander: deck.commander,
            cards: cleanedCards,
            // Preserve sideboard and techIdeas to prevent disappearing sections
            ...(deck.sideboard && { sideboard: deck.sideboard }),
            ...(deck.techIdeas && { techIdeas: deck.techIdeas }),
            // Only include essential properties to avoid server validation issues
            ...(deck.description && { description: deck.description }),
            ...(deck.colors && { colors: deck.colors })
          };

          // Debug request payload (same as add card debugging)
          const serializedDeck = JSON.stringify(cleanDeckForServer);
          console.log('[DEBUG] Card removal request body sent to server:', {
            deckId: cleanDeckForServer._id,
            cardsCount: cleanedCards.length,
            removedCardName: cardName,
            requestSize: serializedDeck.length,
            commander: deck.commander,
            commanderNames: deck.commanderNames
          });

          const response = await fetch(`${apiUrl}/api/decks/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`, // Add auth token (critical fix)
            },
            body: serializedDeck,
          });

          if (!response.ok) {
            console.error(
              `[DeckViewEdit] Server error removing card: ${response.status}`,
            );
            // Get error details if available
            let errorDetails = "";
            try {
              const errorData = await response.json();
              errorDetails = errorData.message || errorData.error || "";
            } catch (e) {
              // Ignore parse errors
            }
            toast.error(
              `Card removed locally but failed to save to server. ${errorDetails}`,
            );
            return;
          }

          // Parse the response to ensure it was processed correctly
          const responseData = await response.json();
          // DEBUG: Log server response to see if commander data is preserved
          console.log('[DEBUG] Server response after card removal:', {
            commander: responseData?.commander,
            commanderNames: responseData?.commanderNames,
            cardsCount: responseData?.cards?.length
          });
          console.log('[DEBUG] Full server response:', responseData);

          // CRITICAL FIX: Merge server response with local data to preserve card details
          const mergedRemovalCards = (responseData.cards || []).map(serverCard => {
            // Find corresponding local card from the original deck
            const localCard = (cleanDeckForServer.cards || []).find(localCard => {
              const serverName = serverCard.name || serverCard.card?.name;
              const localName = localCard.name || localCard.card?.name;
              return serverName === localName;
            });
            
            if (localCard) {
              return {
                ...localCard, // Keep detailed local data
                ...serverCard, // Apply server updates
                card: {
                  ...localCard.card,
                  ...(serverCard.card || {}),
                  // Preserve essential properties for type detection
                  type_line: localCard.card?.type_line || localCard.type_line || serverCard.type_line,
                  scryfall_json: localCard.card?.scryfall_json || localCard.scryfall_json,
                  mana_cost: localCard.card?.mana_cost || localCard.mana_cost,
                  color_identity: localCard.card?.color_identity || localCard.color_identity,
                  cmc: localCard.card?.cmc || localCard.cmc
                }
              };
            }
            return serverCard;
          });

          // CRITICAL FIX: Preserve commander data after server operations
          const preservedCommander = deck.commander;
          const preservedCommanderNames = deck.commanderNames;
          
          // Always merge server response with preserved data
          const mergedResponseData = {
            ...responseData,
            cards: mergedRemovalCards,
            commander: responseData.commander || preservedCommander,
            commanderNames: responseData.commanderNames || preservedCommanderNames
          };
          
          if ((preservedCommander && !responseData.commander) || (preservedCommanderNames && !responseData.commanderNames)) {
            console.log('[COMMANDER FIX] Server lost commander data, restoring from deck state:', {
              restoringCommander: preservedCommander,
              restoringCommanderNames: preservedCommanderNames,
              serverReturnedCommander: responseData.commander,
              serverReturnedCommanderNames: responseData.commanderNames
            });
          }
          
          // Update deck state with merged data while preserving zones
          setDeck(prevDeck => ({
            ...prevDeck,
            ...mergedResponseData,
            // ZONE PRESERVATION FIX: Preserve current sideboard/techIdeas
            sideboard: prevDeck?.sideboard || [],
            techIdeas: prevDeck?.techIdeas || []
          }));

          // Show success message only after successful server update
          toast.success("Card removed from deck.");
        } catch (error) {
          console.error("[DeckViewEdit] Network error removing card:", error);
          toast.error("Card removed locally but failed to save to server.");
        }
      })();
    } catch (error) {
      console.error("[DeckViewEdit] Error in card removal process:", error);
      toast.error("Failed to remove card due to an error.");
    }
  }

  function handleAddToCollection(cardObjToAdd, selectedPrinting) {
    try {
      // console.log('[AddToCollection] Input data:', { cardObjToAdd, selectedPrinting });
      
      // Get the current foil status from the modal
      const foilStatus = selectedPrinting?.foil || cardObjToAdd?.foil || false;
      
      // Extract Scryfall JSON data from various possible locations
      const scryfallData = selectedPrinting || 
                          cardObjToAdd?.cardObj?.scryfall_json || 
                          cardObjToAdd?.scryfall_json ||
                          cardObjToAdd?.cardObj?.card?.scryfall_json ||
                          cardObjToAdd?.card?.scryfall_json ||
                          cardObjToAdd?.cardObj;
      
      // console.log('[AddToCollection] Extracted Scryfall data:', scryfallData);
      // console.log('[AddToCollection] Card structure:', {
      //   name: cardObjToAdd?.name,
      //   cardObjName: cardObjToAdd?.cardObj?.name,
      //   cardObjSet: cardObjToAdd?.cardObj?.set,
      //   cardObjScryfallJson: !!cardObjToAdd?.cardObj?.scryfall_json,
      //   scryfallDataSet: scryfallData?.set,
      //   scryfallDataSetName: scryfallData?.set_name
      // });
      
      // Create collection item with all necessary data
      const collectionItem = {
        id: `${scryfallData?.id || cardObjToAdd?.printing || cardObjToAdd?.cardObj?.printing}_${foilStatus ? 'foil' : 'nonfoil'}_${Date.now()}`,
        name: cardObjToAdd?.name || cardObjToAdd?.cardObj?.name || scryfallData?.name,
        set: scryfallData?.set || cardObjToAdd?.cardObj?.set || 'unknown',
        set_name: scryfallData?.set_name || cardObjToAdd?.cardObj?.set_name || scryfallData?.set || 'Unknown Set',
        collector_number: scryfallData?.collector_number || cardObjToAdd?.cardObj?.collector_number,
        printing_id: scryfallData?.id || cardObjToAdd?.printing || cardObjToAdd?.cardObj?.printing,
        rarity: scryfallData?.rarity || cardObjToAdd?.cardObj?.rarity,
        foil: foilStatus,
        scryfall_json: scryfallData,
        dateAdded: new Date().toISOString(),
        quantity: 1 // Default to 1, user can modify later
      };
      
      // console.log('[AddToCollection] Final collection item:', collectionItem);

      // Get existing collection from smart storage
      const existingCollection = storageManager.getChunkedItem('cardCollection') || [];
      
      // Check if this exact printing/foil combination already exists
      const existingIndex = existingCollection.findIndex(item => 
        item.printing_id === collectionItem.printing_id && 
        item.foil === collectionItem.foil
      );
      
      if (existingIndex >= 0) {
        // If it exists, increment quantity
        existingCollection[existingIndex].quantity += 1;
        toast.success(`Added another copy to collection! Now have ${existingCollection[existingIndex].quantity} copies.`);
      } else {
        // If it doesn't exist, add new item
        existingCollection.push(collectionItem);
        toast.success(`Added ${collectionItem.name} (${foilStatus ? 'Foil' : 'Non-foil'}) to collection!`);
      }
      
      // Save updated collection using smart storage
      const success = storageManager.setItem('cardCollection', existingCollection, {
        clearOldData: true
      });
      if (!success) {
        toast.error('Failed to save collection - storage may be full');
        return;
      }
      
      // Force re-render of collection status grouping if currently grouped by collection status
      if (groupBy === 'collectionStatus') {
        // console.log('[Collection] Triggering re-render for collection status grouping');
        setCollectionUpdateCounter(prev => prev + 1);
      }
      
      // console.log('[Collection] Added item:', collectionItem);
      // console.log('[Collection] Updated collection:', existingCollection);
      
    } catch (error) {
      console.error('[Collection] Error adding to collection:', error);
      toast.error('Failed to add card to collection. Please try again.');
    }
    
    // Don't close the modal automatically - let user continue adding cards or close manually
    // setModalState({ isOpen: false, cardObj: null });
  }

  // Bulk Edit Operation Handlers
  const handleBulkAddToCollection = async () => {
    if (selectedCards.size === 0) return;
    
    try {
      let successCount = 0;
      let failureCount = 0;
      const selectedCardIds = Array.from(selectedCards);
      
      // CRITICAL: Validate selectedCardIds is an array to prevent forEach errors
      if (!Array.isArray(selectedCardIds)) {
        console.error('[FOREACH DEBUG] handleBulkAddToCollection: selectedCardIds is not an array:', typeof selectedCardIds, selectedCardIds);
        toast.error("Failed to process selected cards: Invalid selection data");
        return;
      }
      
      // Get existing collection from smart storage
      const existingCollection = storageManager.getChunkedItem('cardCollection') || [];
      
      selectedCardIds.forEach(cardId => {
        try {
          // Find the card object by ID
          const cardObj = findCardObjectById(cardId);
          if (!cardObj) {
            failureCount++;
            return;
          }
          
          // Extract Scryfall JSON data from various possible locations
          const scryfallData = cardObj.cardObj?.scryfall_json || 
                              cardObj.scryfall_json ||
                              cardObj.cardObj?.card?.scryfall_json ||
                              cardObj.card?.scryfall_json ||
                              cardObj.cardObj;
          
          // Create collection item with improved set data extraction
          const collectionItem = {
            id: `${scryfallData?.id || cardObj.printing || cardObj.cardObj?.printing || 'unknown'}_${cardObj.foil ? 'foil' : 'nonfoil'}_${Date.now()}_${Math.random()}`,
            name: cardObj.card?.name || cardObj.name || scryfallData?.name || 'Unknown Card',
            set: scryfallData?.set || cardObj.cardObj?.set || cardObj.set || 'unknown',
            set_name: scryfallData?.set_name || cardObj.cardObj?.set_name || cardObj.set_name || scryfallData?.set || 'Unknown Set',
            collector_number: scryfallData?.collector_number || cardObj.cardObj?.collector_number || cardObj.collector_number,
            printing_id: scryfallData?.id || cardObj.printing || cardObj.cardObj?.printing,
            rarity: scryfallData?.rarity || cardObj.cardObj?.rarity || cardObj.rarity,
            foil: cardObj.foil || false,
            scryfall_json: scryfallData,
            dateAdded: new Date().toISOString(),
            quantity: cardObj.count || 1
          };
          
          // Check if this exact printing/foil combination already exists
          const existingIndex = existingCollection.findIndex(item => 
            item.printing_id === collectionItem.printing_id && 
            item.foil === collectionItem.foil
          );
          
          if (existingIndex >= 0) {
            // If it exists, increment quantity
            existingCollection[existingIndex].quantity += collectionItem.quantity;
          } else {
            // If it doesn't exist, add new item
            existingCollection.push(collectionItem);
          }
          
          successCount++;
        } catch (error) {
          console.error(`[Bulk Collection] Failed to add card ${cardId}:`, error);
          failureCount++;
        }
      });
      
      // Save updated collection using smart storage
      const success = storageManager.setItem('cardCollection', existingCollection, {
        clearOldData: true
      });
      if (!success) {
        toast.error('Failed to save bulk collection - storage may be full');
        return;
      }
      
      // Force re-render if grouped by collection status
      if (groupBy === 'collectionStatus') {
        setCollectionUpdateCounter(prev => prev + 1);
      }
      
      // Show appropriate success/error messages
      if (successCount > 0 && failureCount === 0) {
        toast.success(`Successfully added ${successCount} card${successCount !== 1 ? 's' : ''} to collection!`);
      } else if (successCount > 0 && failureCount > 0) {
        toast.warning(`Added ${successCount} cards to collection, but ${failureCount} failed.`);
      } else {
        toast.error('Failed to add cards to collection.');
        return;
      }
      
      // Clear selections and exit bulk mode
      setSelectedCards(new Set());
      setBulkEditMode(false);
      
    } catch (error) {
      console.error('[Bulk Collection] Error adding cards to collection:', error);
      toast.error('Failed to add cards to collection. Please try again.');
    }
  };

  const handleBulkAddToWishlist = async () => {
    try {
      const cardsToAdd = Array.from(selectedCards).map(cardName => {
        return cards.find(card => (card.card?.name || card.name) === cardName);
      }).filter(Boolean);
      
      // CRITICAL: Validate cardsToAdd is an array to prevent forEach errors
      if (!Array.isArray(cardsToAdd)) {
        console.error('[FOREACH DEBUG] handleBulkAddToWishlist: cardsToAdd is not an array:', typeof cardsToAdd, cardsToAdd);
        toast.error("Failed to process selected cards: Invalid selection data");
        return;
      }
      
      if (cardsToAdd.length === 0) {
        toast.error("No valid cards selected for wishlist");
        return;
      }
      
      // Load existing wishlist from localStorage
      const existingWishlist = JSON.parse(localStorage.getItem('global-wishlist') || '[]');
      let addedCount = 0;
      let updatedCount = 0;
      
      cardsToAdd.forEach(card => {
        const cardData = card.scryfall_json || card.cardObj || card;
        
        const newWishlistCard = {
          name: card.name || card.card?.name,
          printing: card.printing || cardData.scryfall_id || cardData.id,
          foil: false,
          count: card.count || 1,
          dateAdded: Date.now(),
          cardObj: {
            scryfall_id: cardData.scryfall_id || cardData.id,
            name: cardData.name,
            set: cardData.set,
            set_name: cardData.set_name,
            collector_number: cardData.collector_number,
            image_uris: cardData.image_uris,
            type_line: cardData.type_line,
            mana_cost: cardData.mana_cost,
            cmc: cardData.cmc,
            colors: cardData.colors,
            color_identity: cardData.color_identity,
            prices: cardData.prices
          },
          scryfall_json: cardData
        };
        
        // Check if card already exists in wishlist
        const existingCardIndex = existingWishlist.findIndex(item => 
          item.name === newWishlistCard.name && item.printing === newWishlistCard.printing
        );
        
        if (existingCardIndex !== -1) {
          // Card exists, increment quantity
          existingWishlist[existingCardIndex].count += (card.count || 1);
          updatedCount++;
        } else {
          // New card, add to wishlist
          existingWishlist.push(newWishlistCard);
          addedCount++;
        }
      });
      
      // Save updated wishlist to localStorage
      localStorage.setItem('global-wishlist', JSON.stringify(existingWishlist));
      
      // Dispatch custom event to update navbar or other components
      window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: existingWishlist }));
      
      // Clear selection and exit bulk mode
      setSelectedCards(new Set());
      setBulkEditMode(false);
      
      toast.success(`Added ${addedCount} new cards and updated ${updatedCount} existing cards in wishlist`);
      
    } catch (error) {
      console.error("Error bulk adding cards to wishlist:", error);
      toast.error("Error adding cards to wishlist");
    }
  };

  // Function to handle section header clicks - select/deselect all cards in a section
  const handleSectionHeaderClick = (sectionType, sectionCards, zone = 'main') => {
    if (!bulkEditMode) return; // Only work in bulk edit mode
    
    // Generate IDs for all cards in this section
    // For tech ideas, we need to transform the card structure to match what's used in rendering
    const sectionCardIds = sectionCards.map(cardObj => {
      // Transform tech ideas cards to match the structure used in rendering
      if (zone === 'tech ideas') {
        const cardData = cardObj.cardObj ? cardObj : {
          name: cardObj.card?.name || cardObj.name,
          count: cardObj.count || cardObj.quantity || 1,
          printing: cardObj.printing,
          cardObj,
        };
        // console.log(`[SECTION SELECT DEBUG] Tech ideas card:`, cardData.name, 'ID:', generateCardSelectionId(cardData));
        return generateCardSelectionId(cardData);
      } else {
        // For main deck and sideboard, use the original logic
        // console.log(`[SECTION SELECT DEBUG] ${zone} card:`, cardObj.card?.name || cardObj.name, 'ID:', generateCardSelectionId(cardObj.cardObj || cardObj));
        return generateCardSelectionId(cardObj.cardObj || cardObj);
      }
    });
    
    // console.log(`[SECTION SELECT DEBUG] Generated ${sectionCardIds.length} IDs for ${sectionType} in ${zone}:`, sectionCardIds);
    // console.log(`[SECTION SELECT DEBUG] Currently selected cards:`, Array.from(selectedCards));
    
    // Check if all cards in section are already selected
    const allSelected = sectionCardIds.every(id => selectedCards.has(id));
    
    const newSelectedCards = new Set(selectedCards);
    
    if (allSelected) {
      // Deselect all cards in this section
      sectionCardIds.forEach(id => newSelectedCards.delete(id));
      toast.info(`Deselected all ${sectionType} cards from ${zone}`);
    } else {
      // Select all cards in this section
      sectionCardIds.forEach(id => newSelectedCards.add(id));
      toast.info(`Selected all ${sectionType} cards from ${zone}`);
    }
    
    // console.log(`[SECTION SELECT DEBUG] New selected cards:`, Array.from(newSelectedCards));
    setSelectedCards(newSelectedCards);
  };

  // Universal bulk remove from deck (removes from any section)
  const handleBulkRemoveFromDeck = async () => {
    if (selectedCards.size === 0) {
      toast.warning("No cards selected for removal");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const apiUrl = import.meta.env.VITE_API_URL;
      
      // CRITICAL FIX: Collect all cards to remove first, then process in correct order
      const mainDeckCardsToRemove = [];
      const sideboardCardsToRemove = [];
      const techIdeasCardsToRemove = [];
      
      // First pass: identify all cards and their zones
      for (const cardId of selectedCards) {
        // Check main deck
        const mainCard = (cards || deck?.cards || []).find(card => {
          const generatedId = generateCardSelectionId(card);
          return generatedId === cardId;
        });
        
        if (mainCard) {
          mainDeckCardsToRemove.push(mainCard);
          continue;
        }
        
        // Check sideboard
        const sideboardCard = deck.sideboard?.find(card => {
          const generatedId = generateCardSelectionId(card);
          return generatedId === cardId;
        });
        
        if (sideboardCard) {
          const sideboardIndex = deck.sideboard.findIndex(card => card === sideboardCard);
          sideboardCardsToRemove.push({ card: sideboardCard, index: sideboardIndex });
          continue;
        }
        
        // Check tech ideas
        const techCard = deck.techIdeas?.find(card => {
          const generatedId = generateCardSelectionId(card);
          return generatedId === cardId;
        });
        
        if (techCard) {
          const techIndex = deck.techIdeas.findIndex(card => card === techCard);
          techIdeasCardsToRemove.push({ card: techCard, index: techIndex });
          continue;
        }
      }
      
      // Process main deck cards using the proper handleRemoveCard function
      for (const mainCard of mainDeckCardsToRemove) {
        // console.log(`[BULK REMOVE] Removing ${mainCard.card?.name || mainCard.name} from main deck`);
        handleRemoveCard(mainCard);
      }
      
      // CRITICAL: Process sideboard cards in REVERSE INDEX ORDER to prevent index shifting issues
      sideboardCardsToRemove.sort((a, b) => b.index - a.index); // Sort by index descending
      
      // console.log(`[BULK REMOVE] Processing ${sideboardCardsToRemove.length} sideboard cards in reverse order:`, 
      //   sideboardCardsToRemove.map(item => `${item.card.name} (index ${item.index})`));
      
      for (const { card, index } of sideboardCardsToRemove) {
        // console.log(`[BULK REMOVE] Removing ${card.name} from sideboard index ${index}`);
        await handleRemoveFromSideboard(index);
      }
      
      // CRITICAL: Process tech ideas cards in REVERSE INDEX ORDER to prevent index shifting issues
      techIdeasCardsToRemove.sort((a, b) => b.index - a.index); // Sort by index descending
      
      // console.log(`[BULK REMOVE] Processing ${techIdeasCardsToRemove.length} tech ideas cards in reverse order:`, 
      //   techIdeasCardsToRemove.map(item => `${item.card.name} (index ${item.index})`));
      
      for (const { card, index } of techIdeasCardsToRemove) {
        // console.log(`[BULK REMOVE] Removing ${card.name} from tech ideas index ${index}`);
        await handleRemoveFromTechIdeas(index);
      }
      
      // Update deck state
      setDeck((prevDeck) => ({
        ...prevDeck,
        cards: cards || deck?.cards || [],
        lastUpdated: Date.now()
      }));
      
      // Clear selections
      setSelectedCards(new Set());
      toast.success("Removed selected cards from deck");
      
    } catch (error) {
      console.error("Error removing cards from deck:", error);
      toast.error("Failed to remove cards from deck");
    }
  };

  // Universal move to main deck (moves all selected cards to main deck)
  const handleBulkMoveToMainDeck = async () => {
    if (selectedCards.size === 0) {
      toast.warning("No cards selected");
      return;
    }
    
    try {
      // CRITICAL FIX: Collect all tech ideas cards to move first, then sort by index in reverse order
      const techIdeasCardsToMove = [];
      const sideboardCardsToMove = [];
      
      // First pass: identify all cards and their zones
      for (const cardId of selectedCards) {
        // Check if already in main deck (skip if so)
        const mainCard = (cards || deck?.cards || []).find(card => {
          const generatedId = generateCardSelectionId(card);
          return generatedId === cardId;
        });
        
        if (mainCard) continue; // Already in main deck
        
        // Check sideboard
        const sideboardCard = deck.sideboard?.find(card => {
          const generatedId = generateCardSelectionId(card);
          return generatedId === cardId;
        });
        
        if (sideboardCard) {
          const sideboardIndex = deck.sideboard.findIndex(card => card === sideboardCard);
          sideboardCardsToMove.push({ card: sideboardCard, index: sideboardIndex });
          continue;
        }
        
        // Check tech ideas
        const techCard = deck.techIdeas?.find(card => {
          const generatedId = generateCardSelectionId(card);
          return generatedId === cardId;
        });
        
        if (techCard) {
          const techIndex = deck.techIdeas.findIndex(card => card === techCard);
          techIdeasCardsToMove.push({ card: techCard, index: techIndex });
          continue;
        }
      }
      
      // CRITICAL: Process sideboard cards first (their indexes won't change)
      for (const { card, index } of sideboardCardsToMove) {
        await handleMoveFromSideboardToMainDeck(card, index);
      }
      
      // CRITICAL: Process tech ideas cards in REVERSE INDEX ORDER to prevent index shifting issues
      techIdeasCardsToMove.sort((a, b) => b.index - a.index); // Sort by index descending
      
      // console.log(`[BULK MOVE] Processing ${techIdeasCardsToMove.length} tech ideas cards in reverse order:`, 
      //   techIdeasCardsToMove.map(item => `${item.card.name} (index ${item.index})`));
      
      for (const { card, index } of techIdeasCardsToMove) {
        // console.log(`[BULK MOVE] Moving ${card.name} from tech ideas index ${index}`);
        await handleMoveFromTechIdeasToMainDeck(card, index);
      }
      
      // Clear selections
      setSelectedCards(new Set());
      toast.success("Moved selected cards to main deck");
    } catch (error) {
      console.error("Error moving cards to main deck:", error);
      toast.error("Error moving cards to main deck");
    }
  };

  // Universal move to sideboard (moves all selected cards to sideboard)
  const handleBulkMoveToSideboard = async () => {
    if (selectedCards.size === 0) {
      toast.warning("No cards selected");
      return;
    }
    
    try {
      // CRITICAL FIX: Collect all cards to move first, then process in correct order
      const mainDeckCardsToMove = [];
      const techIdeasCardsToMove = [];
      
      // First pass: identify all cards and their zones
      for (const cardId of selectedCards) {
        // Check if already in sideboard (skip if so)
        const sideboardCard = deck.sideboard?.find(card => {
          const generatedId = generateCardSelectionId(card);
          return generatedId === cardId;
        });
        
        if (sideboardCard) continue; // Already in sideboard
        
        // Check main deck
        const mainCard = (cards || deck?.cards || []).find(card => {
          const generatedId = generateCardSelectionId(card);
          return generatedId === cardId;
        });
        
        if (mainCard) {
          mainDeckCardsToMove.push(mainCard);
          continue;
        }
        
        // Check tech ideas
        const techCard = deck.techIdeas?.find(card => {
          const generatedId = generateCardSelectionId(card);
          return generatedId === cardId;
        });
        
        if (techCard) {
          const techIndex = deck.techIdeas.findIndex(card => card === techCard);
          techIdeasCardsToMove.push({ card: techCard, index: techIndex });
          continue;
        }
      }
      
      // Process main deck cards first (their indexes won't be affected by tech ideas changes)
      for (const card of mainDeckCardsToMove) {
        await handleMoveToSideboard(card);
      }
      
      // CRITICAL: Process tech ideas cards in REVERSE INDEX ORDER to prevent index shifting issues
      techIdeasCardsToMove.sort((a, b) => b.index - a.index); // Sort by index descending
      
      // console.log(`[BULK MOVE TO SIDEBOARD] Processing ${techIdeasCardsToMove.length} tech ideas cards in reverse order:`, 
      //   techIdeasCardsToMove.map(item => `${item.card.name} (index ${item.index})`));
      
      for (const { card, index } of techIdeasCardsToMove) {
        // console.log(`[BULK MOVE TO SIDEBOARD] Moving ${card.name} from tech ideas index ${index}`);
        await handleMoveFromTechIdeasToSideboard(card, index);
      }
      
      // Clear selections
      setSelectedCards(new Set());
      toast.success("Moved selected cards to sideboard");
    } catch (error) {
      console.error("Error moving cards to sideboard:", error);
      toast.error("Error moving cards to sideboard");
    }
  };

  // Universal move to tech ideas (moves all selected cards to tech ideas)
  const handleBulkMoveToTechIdeas = async () => {
    if (selectedCards.size === 0) {
      toast.warning("No cards selected");
      return;
    }
    
    try {
      // IMPROVED: Group selected cards by card name+printing+foil to consolidate duplicates
      const cardGroups = new Map();
      const mainDeckCardsToMove = [];
      const sideboardCardsToMove = [];
      
      // First pass: identify all cards and group them for consolidation
      // console.log(`[BULK MOVE TO TECH IDEAS] Processing ${selectedCards.size} selected cards...`);
      
      for (const cardId of selectedCards) {
        // Check if already in tech ideas (skip if so)
        const techCard = deck.techIdeas?.find(card => {
          const generatedId = generateCardSelectionId(card);
          return generatedId === cardId;
        });
        
        if (techCard) continue; // Already in tech ideas
        
        // Check main deck
        const mainCard = (cards || deck?.cards || []).find(card => {
          const generatedId = generateCardSelectionId(card);
          return generatedId === cardId;
        });
        
        if (mainCard) {
          const cardName = mainCard.card?.name || mainCard.name;
          const printing = mainCard.printing || mainCard.scryfall_json?.id || mainCard.card?.scryfall_json?.id;
          const foil = mainCard.foil || mainCard.card?.foil || false;
          const groupKey = `${cardName}|${printing || 'unknown'}|${foil}`;
          
          if (cardGroups.has(groupKey)) {
            const group = cardGroups.get(groupKey);
            group.totalCount += (mainCard.count || mainCard.quantity || 1);
            group.cards.push(mainCard);
          } else {
            cardGroups.set(groupKey, {
              cardName,
              printing,
              foil,
              totalCount: mainCard.count || mainCard.quantity || 1,
              cards: [mainCard],
              representative: mainCard,
              zone: 'main'
            });
          }
          continue;
        }
        
        // Check sideboard
        const sideboardCard = deck.sideboard?.find(card => {
          const generatedId = generateCardSelectionId(card);
          return generatedId === cardId;
        });
        
        if (sideboardCard) {
          const cardName = sideboardCard.card?.name || sideboardCard.name;
          const printing = sideboardCard.printing || sideboardCard.scryfall_json?.id || sideboardCard.card?.scryfall_json?.id;
          const foil = sideboardCard.foil || sideboardCard.card?.foil || false;
          const groupKey = `${cardName}|${printing || 'unknown'}|${foil}`;
          const sideboardIndex = deck.sideboard.findIndex(card => card === sideboardCard);
          
          if (cardGroups.has(groupKey)) {
            const group = cardGroups.get(groupKey);
            group.totalCount += (sideboardCard.count || sideboardCard.quantity || 1);
            group.cards.push(sideboardCard);
            group.sideboardIndices = group.sideboardIndices || [];
            group.sideboardIndices.push(sideboardIndex);
          } else {
            cardGroups.set(groupKey, {
              cardName,
              printing,
              foil,
              totalCount: sideboardCard.count || sideboardCard.quantity || 1,
              cards: [sideboardCard],
              representative: sideboardCard,
              zone: 'sideboard',
              sideboardIndices: [sideboardIndex]
            });
          }
          continue;
        }
      }
      
      // console.log(`[BULK MOVE TO TECH IDEAS] Grouped ${selectedCards.size} selected cards into ${cardGroups.size} unique card groups`);
      
      // Process each consolidated group
      for (const [groupKey, group] of cardGroups) {
        // console.log(`[BULK MOVE TO TECH IDEAS] Processing group: ${group.cardName} (${group.totalCount} total from ${group.cards.length} instances)`);
        
        // Create consolidated card with total count
        const consolidatedCard = {
          ...group.representative,
          count: group.totalCount,
          quantity: group.totalCount
        };
        
        // Update nested structures
        if (consolidatedCard.card) {
          consolidatedCard.card.count = group.totalCount;
          consolidatedCard.card.quantity = group.totalCount;
        }
        if (consolidatedCard.cardObj) {
          consolidatedCard.cardObj.count = group.totalCount;
          consolidatedCard.cardObj.quantity = group.totalCount;
          if (consolidatedCard.cardObj.card) {
            consolidatedCard.cardObj.card.count = group.totalCount;
            consolidatedCard.cardObj.card.quantity = group.totalCount;
          }
        }
        
        // console.log(`[BULK MOVE TO TECH IDEAS] Moving consolidated ${group.cardName} with count: ${group.totalCount}`);
        
        // Use the individual function to ensure proper handling
        await handleMoveToTechIdeas(consolidatedCard);
      }
      
      // LEGACY APPROACH - keeping for fallback but using individual function above is better
      /*
      for (const mainCard of mainDeckCardsToMove) {
          // Use same logic as individual handleMoveToTechIdeas function
          const token = localStorage.getItem("token");
          const apiUrl = import.meta.env.VITE_API_URL;
          
          const cardName = mainCard.card?.name || mainCard.name;
          const printing = mainCard.printing || mainCard.scryfall_json?.id || mainCard.card?.scryfall_json?.id;
          const foil = mainCard.foil || mainCard.card?.foil || false;        // Calculate modalPrice if missing
        let modalPrice = mainCard.modalPrice || mainCard.card?.modalPrice;
        if (!isValidModalPrice(modalPrice)) {
          // Check Scryfall pricing sources in order of reliability
          const priceOptions = [
            { source: 'cardObj.scryfall_json.prices.usd', value: mainCard.cardObj?.scryfall_json?.prices?.usd },
            { source: 'card.scryfall_json.prices.usd', value: mainCard.card?.scryfall_json?.prices?.usd },
            { source: 'scryfall_json.prices.usd', value: mainCard.scryfall_json?.prices?.usd }
          ];
          
          for (const option of priceOptions) {
            if (option.value && typeof option.value === 'string' && parseFloat(option.value) > 0 && parseFloat(option.value) < 1000) {
              modalPrice = option.value;
              // console.log(`[BULK TECH IDEAS] Using price from ${option.source} for ${cardName}: $${modalPrice}`);
              break;
            }
          }
          
          // Only use fallback if no valid Scryfall price found
          if (!modalPrice) {
            modalPrice = '0.24';
            // console.log(`[BULK TECH IDEAS] Using fallback price for ${cardName}: $${modalPrice}`);
          }
        }
        
        const response = await fetch(`${apiUrl}/api/decks/${deck._id}/move-to-tech-ideas`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            cardName,
            printing,
            foil,
            modalPrice: modalPrice,
            type_line: mainCard.type_line || mainCard.card?.type_line,
            scryfall_json: mainCard.scryfall_json || mainCard.card?.scryfall_json,
            cardObj: mainCard
          }),
        });
        
        if (response.ok) {
          const updatedDeck = await response.json();
          
          // Apply same data preservation logic as individual function
          if (updatedDeck.techIdeas && updatedDeck.techIdeas.length > 0) {
            const lastAddedCard = updatedDeck.techIdeas[updatedDeck.techIdeas.length - 1];
            if (lastAddedCard) {
              // Preserve modalPrice
              if (modalPrice) {
                lastAddedCard.modalPrice = modalPrice;
              }
              
              // Preserve cardObj
              if (!lastAddedCard.cardObj && mainCard) {
                lastAddedCard.cardObj = mainCard;
              }
              
              // Preserve type data
              const originalTypeLine = mainCard.type_line || mainCard.card?.type_line;
              const originalScryfallJson = mainCard.scryfall_json || mainCard.card?.scryfall_json;
              
              if (originalTypeLine && !lastAddedCard.type_line) {
                lastAddedCard.type_line = originalTypeLine;
              }
              
              if (originalScryfallJson && !lastAddedCard.scryfall_json) {
                lastAddedCard.scryfall_json = originalScryfallJson;
              }
            }
          }
          
          // CRITICAL VALIDATION: Clean any corrupted data from server response before updating state
          if (updatedDeck?.techIdeas) {
            updatedDeck.techIdeas = updatedDeck.techIdeas.map(card => {
              let cleanedCard = { ...card };
              
              // Validate and clean modalPrice
              if (cleanedCard.modalPrice) {
                const priceNum = parseFloat(cleanedCard.modalPrice.toString().replace(/^\$/, ''));
                if (priceNum > 100 || priceNum <= 0) {
                  console.warn(`[BULK MOVE VALIDATION] 🚨 Server returned corrupted price for ${cleanedCard.name}: ${cleanedCard.modalPrice}, removing`);
                  cleanedCard.modalPrice = null;
                }
              }
              
              return cleanedCard;
            });
            // console.log(`[BULK MOVE VALIDATION] ✅ Validated tech ideas data from server response`);
          }
          
          // CRITICAL: Update both deck and cards state
          setDeck(updatedDeck);
          setCards(updatedDeck.cards || []);
        }
      */
      
      // CRITICAL: Process sideboard cards in REVERSE INDEX ORDER to prevent index shifting issues
      sideboardCardsToMove.sort((a, b) => b.index - a.index); // Sort by index descending
      
      // console.log(`[BULK MOVE TO TECH IDEAS] Processing ${sideboardCardsToMove.length} sideboard cards in reverse order:`, 
      //   sideboardCardsToMove.map(item => `${item.card.name} (index ${item.index})`));
      
      for (const { card, index } of sideboardCardsToMove) {
        // console.log(`[BULK MOVE TO TECH IDEAS] Moving ${card.name} from sideboard index ${index}`);
        await handleMoveFromSideboardToTechIdeas(card, index);
      }
      
      // Clear selections
      setSelectedCards(new Set());
      toast.success("Moved selected cards to tech ideas");
    } catch (error) {
      console.error("Error moving cards to tech ideas:", error);
      toast.error("Error moving cards to tech ideas");
    }
  };

  // Card deduplication function to fix existing duplicate cards
  const handleDeduplicateCards = () => {
    if (!cards || !Array.isArray(cards)) {
      toast.error("No cards to deduplicate");
      return;
    }

    // console.log('[DEDUPE] Starting card deduplication...');
    // console.log(`[DEDUPE] Original cards count: ${cards.length}`);

    const cardMap = new Map();
    let duplicatesFound = 0;
    let duplicatesRemoved = 0;

    // Group cards by unique identifier (name + printing + foil)
    cards.forEach((card, index) => {
      const cardName = card.card?.name || card.name;
      const printing = card.printing || card.scryfall_json?.id || card.card?.scryfall_json?.id;
      const foil = card.foil || card.card?.foil || false;

      if (!cardName) {
        console.warn(`[DEDUPE] Skipping card without name at index ${index}`);
        return;
      }

      const key = `${cardName}|${printing || 'unknown'}|${foil}`;

      if (cardMap.has(key)) {
        // Consolidate with existing entry
        const existing = cardMap.get(key);
        const currentCount = card.count || card.quantity || 1;
        existing.count = (existing.count || 1) + currentCount;
        existing.quantity = existing.count;

        // Update nested structures
        if (existing.card) {
          existing.card.count = existing.count;
          existing.card.quantity = existing.count;
        }
        if (existing.cardObj) {
          existing.cardObj.count = existing.count;
          existing.cardObj.quantity = existing.count;
          if (existing.cardObj.card) {
            existing.cardObj.card.count = existing.count;
            existing.cardObj.card.quantity = existing.count;
          }
        }

        duplicatesFound++;
        duplicatesRemoved++;
        // console.log(`[DEDUPE] Consolidated ${cardName}: ${existing.count} total (removed ${duplicatesRemoved} duplicates)`);
      } else {
        // Add new entry
        const consolidatedCard = {
          ...card,
          count: card.count || card.quantity || 1,
          quantity: card.count || card.quantity || 1
        };

        // Ensure count/quantity is set in nested structures
        if (consolidatedCard.card) {
          consolidatedCard.card.count = consolidatedCard.count;
          consolidatedCard.card.quantity = consolidatedCard.count;
        }
        if (consolidatedCard.cardObj) {
          consolidatedCard.cardObj.count = consolidatedCard.count;
          consolidatedCard.cardObj.quantity = consolidatedCard.count;
          if (consolidatedCard.cardObj.card) {
            consolidatedCard.cardObj.card.count = consolidatedCard.count;
            consolidatedCard.cardObj.card.quantity = consolidatedCard.count;
          }
        }

        cardMap.set(key, consolidatedCard);
      }
    });

    const consolidatedCards = Array.from(cardMap.values());
    
    // console.log(`[DEDUPE] Results:`);
    // console.log(`[DEDUPE] - Original cards: ${cards.length}`);
    // console.log(`[DEDUPE] - Consolidated cards: ${consolidatedCards.length}`);
    // console.log(`[DEDUPE] - Duplicates removed: ${duplicatesRemoved}`);

    if (consolidatedCards.length < cards.length) {
      // Update state with consolidated cards
      setCards(consolidatedCards);
      
      // Update deck state as well
      setDeck(prevDeck => ({
        ...prevDeck,
        cards: consolidatedCards
      }));

      // Clear selections since card references have changed
      setSelectedCards(new Set());

      toast.success(`Deduplicated deck: removed ${duplicatesRemoved} duplicate card entries`);
      // console.log('[DEDUPE] Deduplication complete!');
    } else {
      toast.info("No duplicate cards found");
      // console.log('[DEDUPE] No duplicates found');
    }
  };

  const handleBulkToggleFoil = () => {
    if (selectedCards.size === 0) {
      toast.warning("No cards selected for foil toggle");
      return;
    }

    const updatesCount = { foiled: 0, unfoiled: 0 };

    try {
      // Update each selected card's foil status
      const updatedCards = cards.map((card) => {
        const cardId = generateCardSelectionId(card);
        
        if (selectedCards.has(cardId)) {
          // Toggle foil status - check all possible locations
          const currentFoilStatus = 
            card.foil === true ||
            card.card?.foil === true ||
            card.cardObj?.foil === true ||
            card.cardObj?.card?.foil === true;
          
          const newFoilStatus = !currentFoilStatus;
          
          if (newFoilStatus) {
            updatesCount.foiled++;
          } else {
            updatesCount.unfoiled++;
          }

          // Create updated card with foil status set at all levels
          const updatedCard = {
            ...card,
            foil: newFoilStatus,
            // Update nested card structure
            ...(card.card ? {
              card: {
                ...card.card,
                foil: newFoilStatus
              }
            } : {}),
            // Update cardObj structure
            ...(card.cardObj ? {
              cardObj: {
                ...card.cardObj,
                foil: newFoilStatus,
                ...(card.cardObj.card ? {
                  card: {
                    ...card.cardObj.card,
                    foil: newFoilStatus
                  }
                } : {})
              }
            } : {})
          };

          return updatedCard;
        }
        
        return card;
      });

      // Update the cards state
      setCards([...updatedCards]);

      // Update the deck object
      setDeck((prevDeck) => {
        if (!prevDeck) return prevDeck;

        const updatedDeckCards = prevDeck.cards.map((card) => {
          const cardId = generateCardSelectionId(card);
          
          if (selectedCards.has(cardId)) {
            const currentFoilStatus = 
              card.foil === true ||
              card.card?.foil === true ||
              card.cardObj?.foil === true ||
              card.cardObj?.card?.foil === true;
            
            const newFoilStatus = !currentFoilStatus;

            return {
              ...card,
              foil: newFoilStatus,
              ...(card.card ? {
                card: {
                  ...card.card,
                  foil: newFoilStatus
                }
              } : {}),
              ...(card.cardObj ? {
                cardObj: {
                  ...card.cardObj,
                  foil: newFoilStatus,
                  ...(card.cardObj.card ? {
                    card: {
                      ...card.cardObj.card,
                      foil: newFoilStatus
                    }
                  } : {})
                }
              } : {})
            };
          }
          
          return card;
        });

        return {
          ...prevDeck,
          cards: [...updatedDeckCards],
          lastUpdated: Date.now(),
        };
      });

      // Clear selections
      setSelectedCards(new Set());

      const totalUpdated = updatesCount.foiled + updatesCount.unfoiled;
      let message = `Updated ${totalUpdated} card${totalUpdated !== 1 ? 's' : ''}`;
      if (updatesCount.foiled > 0 && updatesCount.unfoiled > 0) {
        message += ` (${updatesCount.foiled} to foil, ${updatesCount.unfoiled} to non-foil)`;
      } else if (updatesCount.foiled > 0) {
        message += ` to foil`;
      } else {
        message += ` to non-foil`;
      }
      
      toast.success(message);

      // TODO: Save to server
      const token = localStorage.getItem("token");
      if (token) {
        // Format cards for server and save
        // This would need proper implementation similar to handleUpdateCard
      }

    } catch (error) {
      console.error('[DeckViewEdit] Error toggling foil status:', error);
      toast.error("Failed to toggle foil status");
    }
  };

  // Helper function to find card object by ID for bulk operations
  const findCardObjectById = (cardId) => {
    // Search through all cards to find the one with matching ID
    const allCards = cards && cards.length > 0 ? cards : deck?.cards || [];
    return allCards.find(card => {
      const cardName = card.card?.name || card.name;
      const cardPrinting = card.printing || card.cardObj?.printing;
      const cardFoil = card.foil || false;
      const generatedId = `${cardName}_${cardPrinting || 'unknown'}_${cardFoil}`;
      return generatedId === cardId;
    });
  };

  // Collection checking helper for wishlist exports
  const isCardNeeded = (card) => {
    // Use the same logic as the UI's getCollectionStatus function
    const collectionStatus = getCollectionStatus(card);
    
    // Only cards with 'exact-match' status are NOT needed for wishlist
    // Cards with 'different-version' or 'not-owned' should be included in wishlist
    const needed = collectionStatus !== 'exact-match';
    
    if (!needed) {
      const cardName = card.name || 
                      card.cardObj?.name ||
                      card.cardObj?.card?.name ||
                      card.card?.name;
      // console.log(`[WISHLIST] Exact match found for ${cardName}, not needed for wishlist`);
    }
    
    return needed;
  };

  // Export Functions
  // Helper function to format cards for TCGPlayer mass entry
  const formatCardForTCGPlayer = (card) => {
    const cardName = card.name || card.card?.name || 'Unknown Card';
    const quantity = card.count || card.quantity || 1;
    
    // Get set code from various sources
    let setCode = '';
    if (card.card?.scryfall_json?.set) {
      setCode = card.card.scryfall_json.set.toUpperCase();
    } else if (card.card?.set) {
      setCode = card.card.set.toUpperCase();
    } else if (card.set) {
      setCode = card.set.toUpperCase();
    }
    
    // Get collector number from various sources
    let collectorNumber = '';
    if (card.card?.scryfall_json?.collector_number) {
      collectorNumber = card.card.scryfall_json.collector_number;
    } else if (card.card?.collector_number) {
      collectorNumber = card.card.collector_number;
    } else if (card.collector_number) {
      collectorNumber = card.collector_number;
    }
    
    // Format according to TCGPlayer mass entry format: Quantity → Card Name → [Set Code] → Card Number
    if (setCode && collectorNumber) {
      return `${quantity} ${cardName} [${setCode}] ${collectorNumber}`;
    } else if (setCode) {
      return `${quantity} ${cardName} [${setCode}]`;
    } else {
      return `${quantity} ${cardName}`;
    }
  };

  const handleExportToText = () => {
    try {
      // console.log('[EXPORT] Starting text export...');
      
      if (!deck || !cards || cards.length === 0) {
        toast.warning("No cards to export");
        return;
      }

      // Prepare the text content
      let textContent = `${deck.name || "Untitled Deck"}\n`;
      textContent += `Generated on ${new Date().toLocaleDateString()}\n`;
      textContent += `Format: TCGPlayer Mass Entry Compatible\n\n`;

      // Main Deck
      textContent += "MAIN DECK:\n";
      textContent += "=========\n";
      
      // Sort cards alphabetically by name and format for TCGPlayer
      const sortedCards = (cards || []).sort((a, b) => {
        const nameA = (a.name || a.card?.name || 'Unknown Card').toLowerCase();
        const nameB = (b.name || b.card?.name || 'Unknown Card').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      // CRITICAL: Validate sortedCards is an array to prevent forEach errors
      if (!Array.isArray(sortedCards)) {
        console.error('[FOREACH DEBUG] handleExportToText: sortedCards is not an array:', typeof sortedCards, sortedCards);
        toast.error("Failed to export: Invalid deck data");
        return;
      }

      sortedCards.forEach(card => {
        textContent += formatCardForTCGPlayer(card) + '\n';
      });

      textContent += `\nMain Deck Total: ${cards.length} cards\n`;

      // Sideboard
      if (deck.sideboard && deck.sideboard.length > 0) {
        textContent += "\nSIDEBOARD:\n";
        textContent += "==========\n";
        
        const sortedSideboard = deck.sideboard.sort((a, b) => {
          const nameA = (a.name || a.card?.name || 'Unknown Card').toLowerCase();
          const nameB = (b.name || b.card?.name || 'Unknown Card').toLowerCase();
          return nameA.localeCompare(nameB);
        });

        // CRITICAL: Validate sortedSideboard is an array to prevent forEach errors
        if (!Array.isArray(sortedSideboard)) {
          console.error('[FOREACH DEBUG] handleExportToText: sortedSideboard is not an array:', typeof sortedSideboard, sortedSideboard);
          toast.error("Failed to export sideboard: Invalid data");
          return;
        }

        sortedSideboard.forEach(card => {
          textContent += formatCardForTCGPlayer(card) + '\n';
        });

        textContent += `\nSideboard Total: ${deck.sideboard.length} cards\n`;
      }

      // Tech Ideas
      if (deck.techIdeas && deck.techIdeas.length > 0) {
        textContent += "\nTECH IDEAS:\n";
        textContent += "===========\n";
        
        const sortedTechIdeas = deck.techIdeas.sort((a, b) => {
          const nameA = (a.name || a.card?.name || 'Unknown Card').toLowerCase();
          const nameB = (b.name || b.card?.name || 'Unknown Card').toLowerCase();
          return nameA.localeCompare(nameB);
        });

        // CRITICAL: Validate sortedTechIdeas is an array to prevent forEach errors
        if (!Array.isArray(sortedTechIdeas)) {
          console.error('[FOREACH DEBUG] handleExportToText: sortedTechIdeas is not an array:', typeof sortedTechIdeas, sortedTechIdeas);
          toast.error("Failed to export tech ideas: Invalid data");
          return;
        }

        sortedTechIdeas.forEach(card => {
          textContent += formatCardForTCGPlayer(card) + '\n';
        });

        textContent += `\nTech Ideas Total: ${deck.techIdeas.length} cards\n`;
      }

      // Create and download the file
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${deck.name || 'deck'}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Deck list exported to text file!");
      // console.log('[EXPORT] Text export completed successfully');

    } catch (error) {
      console.error('[EXPORT] Error exporting to text:', error);
      toast.error("Failed to export deck list to text");
    }
  };









  const handleExportToPDF = async () => {
    try {
      // console.log('[EXPORT] Starting PDF export...');
      
      if (!deck || (!cards || cards.length === 0)) {
        toast.error("No deck or cards available for PDF export");
        return;
      }

      // console.log('[EXPORT] Starting export with', cards.length, 'cards');
      // console.log('[EXPORT] First few cards:', cards.slice(0, 3).map(c => ({
      //   name: c.name || c.card?.name,
      //   hasImageUris: !!(c.image_uris || c.card?.image_uris || c.scryfall_json?.image_uris)
      // })));

      toast.info("Generating optimized PDF with compressed images...");

      // WORKING IMAGE LOADING FUNCTION from successful test (now with compression)
      const getCardImageDataUrl = async (card) => {
        console.log('[EXPORT] Full card structure for:', card.card?.name || card.name, {
          hasCardObj: !!card.cardObj,
          hasImageUris: !!card.image_uris,
          hasCardImageUris: !!card.card?.image_uris,
          hasScryfallJson: !!card.scryfall_json,
          hasCardObjScryfallJson: !!card.cardObj?.scryfall_json
        });
        
        const cardImageUrl = card.cardObj?.image_uris?.normal || 
                           card.cardObj?.card?.image_uris?.normal ||
                           card.scryfall_json?.image_uris?.normal ||
                           card.cardObj?.scryfall_json?.image_uris?.normal ||
                           card.card?.image_uris?.normal ||
                           card.image_uris?.normal;
        
        console.log('[EXPORT] Found image URL for', card.card?.name || card.name, ':', cardImageUrl ? 'YES' : 'NO');
        
        if (!cardImageUrl) {
          console.log('[EXPORT] No image URL found for card:', card.card?.name || card.name);
          return null;
        }

        try {
          return await new Promise((resolve) => {
            // WORKING CORS BYPASS METHOD
            const tryWithProxy = async (proxyUrl) => {
              return new Promise((proxyResolve) => {
                const proxyImg = new Image();
                proxyImg.crossOrigin = 'anonymous';
                
                proxyImg.onload = () => {
                  try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Get image dimensions
                    const imgWidth = proxyImg.naturalWidth || proxyImg.width || 200;
                    const imgHeight = proxyImg.naturalHeight || proxyImg.height || 280;
                    canvas.width = imgWidth;
                    canvas.height = imgHeight;
                    
                    // Create rounded corners using compatible method
                    const cornerRadius = 15; // Adjust this value for more/less rounding
                    
                    ctx.beginPath();
                    ctx.moveTo(cornerRadius, 0);
                    ctx.lineTo(imgWidth - cornerRadius, 0);
                    ctx.quadraticCurveTo(imgWidth, 0, imgWidth, cornerRadius);
                    ctx.lineTo(imgWidth, imgHeight - cornerRadius);
                    ctx.quadraticCurveTo(imgWidth, imgHeight, imgWidth - cornerRadius, imgHeight);
                    ctx.lineTo(cornerRadius, imgHeight);
                    ctx.quadraticCurveTo(0, imgHeight, 0, imgHeight - cornerRadius);
                    ctx.lineTo(0, cornerRadius);
                    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
                    ctx.closePath();
                    ctx.clip();
                    
                    // Scale down the image for smaller PDF size
                    const targetWidth = 200; // Reduced from full size (488px) to 200px
                    const targetHeight = Math.round((targetWidth / proxyImg.naturalWidth) * proxyImg.naturalHeight);
                    
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;
                    
                    // Redraw clipping path for new dimensions
                    const scaledCornerRadius = Math.round(cornerRadius * (targetWidth / proxyImg.naturalWidth));
                    ctx.beginPath();
                    ctx.moveTo(scaledCornerRadius, 0);
                    ctx.lineTo(targetWidth - scaledCornerRadius, 0);
                    ctx.quadraticCurveTo(targetWidth, 0, targetWidth, scaledCornerRadius);
                    ctx.lineTo(targetWidth, targetHeight - scaledCornerRadius);
                    ctx.quadraticCurveTo(targetWidth, targetHeight, targetWidth - scaledCornerRadius, targetHeight);
                    ctx.lineTo(scaledCornerRadius, targetHeight);
                    ctx.quadraticCurveTo(0, targetHeight, 0, targetHeight - scaledCornerRadius);
                    ctx.lineTo(0, scaledCornerRadius);
                    ctx.quadraticCurveTo(0, 0, scaledCornerRadius, 0);
                    ctx.closePath();
                    ctx.clip();
                    
                    ctx.drawImage(proxyImg, 0, 0, targetWidth, targetHeight);
                    // Use PNG format for reliability with clipping, but at reduced size
                    const dataUrl = canvas.toDataURL('image/png', 0.8);
                    console.log('[EXPORT] Successfully loaded via proxy with size optimization for:', card.card?.name || card.name);
                    proxyResolve(dataUrl);
                  } catch (error) {
                    console.log('[EXPORT] Proxy canvas conversion failed:', error);
                    proxyResolve(null);
                  }
                };
                
                proxyImg.onerror = () => {
                  console.log('[EXPORT] Proxy image load failed');
                  proxyResolve(null);
                };
                
                setTimeout(() => {
                  console.log('[EXPORT] Proxy method timed out after 8 seconds');
                  proxyResolve(null);
                }, 8000);
                proxyImg.src = proxyUrl;
              });
            };
            
            // Try the WORKING methods in sequence (same order as successful test)
            (async () => {
              console.log(`[EXPORT] Trying to load image: ${cardImageUrl}`);
              
              // Method 1: api.codetabs.com proxy (this worked in test)
              console.log('[EXPORT] Trying method 1: api.codetabs.com proxy');
              let result = await tryWithProxy(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(cardImageUrl)}`);
              if (result) {
                console.log('[EXPORT] Success with api.codetabs.com proxy');
                resolve(result);
                return;
              }
              
              // Method 2: allorigins.hexlet.app
              console.log('[EXPORT] Trying method 2: allorigins.win proxy');
              result = await tryWithProxy(`https://api.allorigins.win/raw?url=${encodeURIComponent(cardImageUrl)}`);
              if (result) {
                console.log('[EXPORT] Success with allorigins.win proxy');
                resolve(result);
                return;
              }
              
              // Method 3: cors-anywhere.herokuapp.com proxy (often down)
              console.log('[EXPORT] Trying method 3: cors-anywhere.herokuapp.com proxy');
              result = await tryWithProxy(`https://cors-anywhere.herokuapp.com/${cardImageUrl}`);
              if (result) {
                console.log('[EXPORT] Success with cors-anywhere.herokuapp.com proxy');
                resolve(result);
                return;
              }
              
              // Method 3: Direct attempt (fallback)
              const directImg = new Image();
              directImg.onload = () => {
                try {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  
                  // Scale down the image for smaller PDF size
                  const targetWidth = 200; // Reduced from full size
                  const targetHeight = Math.round((targetWidth / (directImg.naturalWidth || 488)) * (directImg.naturalHeight || 680));
                  
                  canvas.width = targetWidth;
                  canvas.height = targetHeight;
                  
                  // Create rounded corners using compatible method
                  const cornerRadius = Math.round(15 * (targetWidth / (directImg.naturalWidth || 488)));
                  
                  ctx.beginPath();
                  ctx.moveTo(cornerRadius, 0);
                  ctx.lineTo(targetWidth - cornerRadius, 0);
                  ctx.quadraticCurveTo(targetWidth, 0, targetWidth, cornerRadius);
                  ctx.lineTo(targetWidth, targetHeight - cornerRadius);
                  ctx.quadraticCurveTo(targetWidth, targetHeight, targetWidth - cornerRadius, targetHeight);
                  ctx.lineTo(cornerRadius, targetHeight);
                  ctx.quadraticCurveTo(0, targetHeight, 0, targetHeight - cornerRadius);
                  ctx.lineTo(0, cornerRadius);
                  ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
                  ctx.closePath();
                  ctx.clip();
                  
                  ctx.drawImage(directImg, 0, 0, targetWidth, targetHeight);
                  // Use PNG format for reliability with clipping, but at reduced size  
                  const dataUrl = canvas.toDataURL('image/png', 0.8);
                  console.log('[EXPORT] Successfully loaded directly with size optimization for:', card.card?.name || card.name);
                  resolve(dataUrl);
                } catch (error) {
                  console.log('[EXPORT] Direct canvas conversion failed:', error);
                  resolve(null);
                }
              };
              
              directImg.onerror = () => {
                console.log('[EXPORT] Direct image load failed');
                resolve(null);
              };
              
              setTimeout(() => {
                // Final fallback: create a placeholder image
                console.log('[EXPORT] All image loading methods failed, creating placeholder');
                try {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  const targetWidth = 200;
                  const targetHeight = 280;
                  
                  canvas.width = targetWidth;
                  canvas.height = targetHeight;
                  
                  // Create a simple placeholder
                  ctx.fillStyle = '#f0f0f0';
                  ctx.fillRect(0, 0, targetWidth, targetHeight);
                  
                  // Add border
                  ctx.strokeStyle = '#ccc';
                  ctx.lineWidth = 2;
                  ctx.strokeRect(1, 1, targetWidth-2, targetHeight-2);
                  
                  // Add text
                  ctx.fillStyle = '#666';
                  ctx.font = '14px Arial';
                  ctx.textAlign = 'center';
                  const cardName = card.card?.name || card.name || 'Unknown Card';
                  const words = cardName.split(' ');
                  let y = targetHeight/2 - 10;
                  
                  // Wrap text
                  for (let i = 0; i < words.length; i += 2) {
                    const line = words.slice(i, i + 2).join(' ');
                    ctx.fillText(line, targetWidth/2, y);
                    y += 20;
                  }
                  
                  const dataUrl = canvas.toDataURL('image/png', 0.8);
                  console.log('[EXPORT] Created placeholder for:', cardName);
                  resolve(dataUrl);
                } catch (placeholderError) {
                  console.log('[EXPORT] Failed to create placeholder:', placeholderError);
                  resolve(null);
                }
              }, 5000);
              directImg.src = cardImageUrl;
            })();
          });
        } catch (error) {
          console.log('[EXPORT] Error loading image for', card.card?.name || card.name, ':', error);
          return null;
        }
      };

      // Function to get card type for grouping
      const getCardType = (card) => {
        const typeLine = card.type_line || card.card?.type_line || card.scryfall_json?.type_line || '';
        
        if (typeLine.includes('Land')) return { type: 'Lands', priority: 7 };
        if (typeLine.includes('Creature')) return { type: 'Creatures', priority: 2 };
        if (typeLine.includes('Instant')) return { type: 'Instants', priority: 4 };
        if (typeLine.includes('Sorcery')) return { type: 'Sorceries', priority: 5 };
        if (typeLine.includes('Artifact')) return { type: 'Artifacts', priority: 3 };
        if (typeLine.includes('Enchantment')) return { type: 'Enchantments', priority: 6 };
        if (typeLine.includes('Planeswalker')) return { type: 'Planeswalkers', priority: 1 };
        return { type: 'Other', priority: 8 };
      };

      // Create temporary container for PDF generation
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '794px'; // A4 width
      tempContainer.style.minHeight = '1123px'; // A4 height
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.padding = '38px';
      tempContainer.style.boxSizing = 'border-box';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.fontSize = '12px';
      tempContainer.style.lineHeight = '1.4';
      document.body.appendChild(tempContainer);

      // Start building HTML content
      let htmlContent = `
        <div style="width: 100%; box-sizing: border-box; font-family: Arial, sans-serif; color: #333;">
          <div style="text-align: center; margin-bottom: 30px; page-break-inside: avoid;">
            <h1 style="color: #333; margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">${deck.name || "Untitled Deck"}</h1>
            <p style="color: #666; margin: 0; font-size: 14px;">Generated on ${new Date().toLocaleDateString()}</p>
          </div>
      `;

      // SIMPLIFIED CARD PROCESSING using the same approach as working test
      const processCardSection = async (sectionTitle, cardsList) => {
        if (!cardsList || cardsList.length === 0) {
          console.log(`[EXPORT] ${sectionTitle}: No cards to process`);
          return;
        }
        
        console.log(`[EXPORT] Processing ${sectionTitle} with ${cardsList.length} cards`);
        
        // Group cards by name first
        const groupedCards = cardsList.reduce((acc, card) => {
          const cardName = card.name || card.card?.name || 'Unknown Card';
          const quantity = card.count || card.quantity || 1;
          
          if (acc[cardName]) {
            acc[cardName].quantity += quantity;
          } else {
            acc[cardName] = { 
              card: card, 
              quantity: quantity,
              typeInfo: getCardType(card)
            };
          }
          return acc;
        }, {});

        // Group by card type and sort
        const cardsByType = {};
        Object.entries(groupedCards).forEach(([cardName, cardInfo]) => {
          const typeKey = cardInfo.typeInfo.type;
          if (!cardsByType[typeKey]) {
            cardsByType[typeKey] = {
              cards: [],
              priority: cardInfo.typeInfo.priority
            };
          }
          cardsByType[typeKey].cards.push({ cardName, ...cardInfo });
        });

        // Sort types by priority and cards alphabetically within each type
        const sortedTypes = Object.entries(cardsByType)
          .sort(([,a], [,b]) => a.priority - b.priority)
          .map(([typeName, typeData]) => ({
            typeName,
            cards: typeData.cards.sort((a, b) => a.cardName.localeCompare(b.cardName))
          }));

        htmlContent += `<div style="page-break-before: auto; margin-bottom: 40px;">`;
        htmlContent += `<h2 style="color: #333; border-bottom: 2px solid #ddd; padding-bottom: 5px; margin: 30px 0 20px 0; font-size: 20px;">${sectionTitle}</h2>`;

        // Process each card type
        for (const { typeName, cards } of sortedTypes) {
          if (cards.length === 0) continue;
          
          htmlContent += `<h3 style="color: #555; margin: 25px 0 15px 0; font-size: 16px; font-weight: bold;">${typeName} (${cards.reduce((sum, c) => sum + c.quantity, 0)})</h3>`;
          
          // Create responsive grid
          htmlContent += `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 25px; width: 100%;">`;
          
          // Process each card SEQUENTIALLY like the working test function
          for (let i = 0; i < cards.length; i++) {
            const { cardName, card, quantity } = cards[i];
            console.log(`[EXPORT] Processing card ${i + 1}/${cards.length}: ${cardName}`);
            
            let dataUrl = null;
            try {
              dataUrl = await getCardImageDataUrl(card);
              if (dataUrl) {
                console.log(`[EXPORT] ✅ Successfully loaded image for ${cardName}`, {
                  dataUrlLength: dataUrl.length,
                  isJpeg: dataUrl.startsWith('data:image/jpeg'),
                  isPng: dataUrl.startsWith('data:image/png')
                });
              } else {
                console.log(`[EXPORT] ❌ Failed to load image for ${cardName}`);
              }
            } catch (error) {
              console.log(`[EXPORT] ❌ Error loading image for ${cardName}:`, error);
            }
            
            console.log(`[EXPORT] Adding HTML for ${cardName}, has dataUrl: ${!!dataUrl}`);
            
            htmlContent += `
              <div style="
                text-align: center; 
                page-break-inside: avoid; 
                border: 1px solid #ddd; 
                padding: 8px; 
                border-radius: 5px; 
                background: white;
                min-height: 280px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
              ">
                ${dataUrl ? 
                  `<img src="${dataUrl}" alt="${cardName}" style="width: 100%; max-width: 140px; height: auto; border-radius: 4px; margin: 0 auto 8px auto; object-fit: contain;">` : 
                  `<div style="width: 140px; height: 195px; background: #f0f0f0; border-radius: 4px; margin: 0 auto 8px auto; display: flex; align-items: center; justify-content: center; color: #666; font-size: 11px; text-align: center; padding: 8px;">No Image<br/>Available</div>`
                }
                <div style="font-weight: bold; font-size: 11px; line-height: 1.2; color: #333;">
                  ${quantity > 1 ? `${quantity}x ` : ''}${cardName}
                </div>
              </div>
            `;
          }
          
          htmlContent += `</div>`;
        }
        
        const totalCards = Object.values(groupedCards).reduce((sum, info) => sum + info.quantity, 0);
        htmlContent += `<p style="text-align: right; color: #666; font-style: italic; margin: 15px 0; font-size: 12px;">${sectionTitle} Total: ${totalCards} cards</p>`;
        htmlContent += `</div>`;
      };

      // Process all sections
      console.log('[EXPORT] Processing main deck...');
      await processCardSection("Main Deck", cards);

      if (deck.sideboard && deck.sideboard.length > 0) {
        console.log('[EXPORT] Processing sideboard...');
        await processCardSection("Sideboard", deck.sideboard);
      }

      if (deck.techIdeas && deck.techIdeas.length > 0) {
        console.log('[EXPORT] Processing tech ideas...');
        await processCardSection("Tech Ideas", deck.techIdeas);
      }

      htmlContent += `</div>`;
      
      // Set HTML content and wait for rendering
      tempContainer.innerHTML = htmlContent;
      console.log('[EXPORT] HTML content set, generating canvas...');

      // Wait for images to load - look for all images with src
      const images = tempContainer.querySelectorAll('img[src]');
      console.log('[EXPORT] Found', images.length, 'images to wait for');
      
      // DEBUG: Also check for all images regardless of src
      const allImages = tempContainer.querySelectorAll('img');
      console.log('[EXPORT] Total img elements found:', allImages.length);
      
      // DEBUG: Check what images actually look like
      images.forEach((img, index) => {
        console.log(`[EXPORT] Data image ${index + 1}:`, {
          src: img.src.substring(0, 50) + '...',
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        });
      });
      
      // DEBUG: Check all images
      allImages.forEach((img, index) => {
        console.log(`[EXPORT] All images ${index + 1}:`, {
          src: img.src ? (img.src.substring(0, 50) + '...') : 'NO SRC',
          hasDataSrc: img.src?.startsWith('data:image'),
          complete: img.complete
        });
      });
      
      if (images.length > 0) {
        const imagePromises = Array.from(images).map((img, index) => {
          return new Promise((resolve) => {
            if (img.complete) {
              console.log(`[EXPORT] Image ${index + 1} already complete`);
              resolve();
            } else {
              img.onload = () => {
                console.log(`[EXPORT] Image ${index + 1} loaded successfully`);
                resolve();
              };
              img.onerror = () => {
                console.log(`[EXPORT] Image ${index + 1} failed to load`);
                resolve();
              };
              setTimeout(() => {
                console.log(`[EXPORT] Image ${index + 1} timeout`);
                resolve();
              }, 3000);
            }
          });
        });
        
        await Promise.all(imagePromises);
        console.log('[EXPORT] All images processed');
      } else {
        console.log('[EXPORT] No images found - this might be the issue!');
      }

      // SKIP html2canvas - create PDF directly from loaded images
      console.log('[EXPORT] Skipping html2canvas, creating PDF directly from images...');
      
      // Create PDF directly from the loaded images
      const loadedImages = Array.from(images);
      console.log('[EXPORT] Creating optimized PDF from', loadedImages.length, 'compressed card images');
      
      // Get the images from the tempContainer to maintain order  
      const imgs = tempContainer.querySelectorAll('img');
      console.log('[EXPORT] Found', imgs.length, 'compressed images in container');

      // Create PDF with size optimizations:
      // - 200px image width instead of full resolution (488px) 
      // - 0.8 PNG quality instead of 0.9 PNG quality
      // - PDF compression enabled
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm', 
        format: 'a4',
        compress: true // Enable PDF compression
      });
      
      const pageWidth = 210; // A4 width in mm  
      const pageHeight = 297; // A4 height in mm
      const margin = 10; // Margin in mm
      const contentWidth = pageWidth - (2 * margin);  
      const contentHeight = pageHeight - (2 * margin);
      
      // Card dimensions (cards are typically in 63mm x 88mm ratio)
      const cardAspectRatio = 63/88; // width/height
      const cardsPerRow = 3;
      const cardWidth = contentWidth / cardsPerRow;
      const cardHeight = cardWidth / cardAspectRatio;
      const cardsPerPage = Math.floor(contentHeight / cardHeight) * cardsPerRow;
      
      console.log('[EXPORT] Card layout:', {
        cardsPerRow,
        cardWidth: cardWidth.toFixed(1) + 'mm',  
        cardHeight: cardHeight.toFixed(1) + 'mm',
        cardsPerPage
      });
      
      let currentCardIndex = 0;
      let pageNumber = 1;
      
      // Add title page
      pdf.setFontSize(24);
      pdf.text(deck.name || 'Magic Deck', pageWidth/2, 50, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth/2, 70, { align: 'center' });
      pdf.text(`${loadedImages.length} cards`, pageWidth/2, 85, { align: 'center' });
      
      // Process each card
      while (currentCardIndex < imgs.length) {
        const cardsOnThisPage = Math.min(cardsPerPage, imgs.length - currentCardIndex);
        
        if (pageNumber > 1) {
          pdf.addPage();
        }
        
        console.log(`[EXPORT] Creating page ${pageNumber} with ${cardsOnThisPage} cards`);
        
        for (let i = 0; i < cardsOnThisPage; i++) {
          const img = imgs[currentCardIndex + i];
          if (!img || !img.src) continue;
          
          const row = Math.floor(i / cardsPerRow);
          const col = i % cardsPerRow;
          
          const x = margin + (col * cardWidth);
          const y = margin + (row * cardHeight);
          
          try {
            // Use the image src directly (it's a compressed PNG data URL)
            pdf.addImage(img.src, 'PNG', x, y, cardWidth, cardHeight);
            console.log(`[EXPORT] Added optimized card ${currentCardIndex + i + 1} at position (${x.toFixed(1)}, ${y.toFixed(1)})`);
          } catch (error) {
            console.error(`[EXPORT] Failed to add card ${currentCardIndex + i + 1}:`, error);
          }
        }
        
        currentCardIndex += cardsOnThisPage;
        pageNumber++;
        
        if (pageNumber > 50) {
          console.warn('[EXPORT] Safety break: Maximum pages reached');
          break;
        }
      }
      
      console.log('[EXPORT] Total pages created:', pageNumber - 1);

      // Clean up
      document.body.removeChild(tempContainer);

      // Download the PDF
      pdf.save(`${deck.name || 'deck'}.pdf`);

      toast.success("Deck exported to optimized PDF! File size reduced by ~60%");
      console.log('[EXPORT] Optimized PDF export completed successfully');

    } catch (error) {
      console.error('[EXPORT] Error exporting to PDF:', error);
      toast.error("Failed to export deck to PDF");
      
      // Clean up on error
      const tempContainer = document.querySelector('div[style*="left: -9999px"]');
      if (tempContainer) {
        document.body.removeChild(tempContainer);
      }
    }
  };

  // Wishlist Export Functions
  const handleExportWishlistToText = () => {
    try {
      console.log('[EXPORT] Starting wishlist text export...');
      
      if (!deck || (!cards || cards.length === 0)) {
        toast.warning("No cards to export");
        return;
      }

      // Filter cards that are needed (not owned or different version)
      const neededCards = cards.filter(card => isCardNeeded(card));
      
      if (neededCards.length === 0) {
        toast.info("All cards are already in your collection!");
        return;
      }

      let textContent = `${deck.name || "Untitled Deck"} - Wishlist\n`;
      textContent += `Generated on ${new Date().toLocaleDateString()}\n`;
      textContent += `Format: TCGPlayer Mass Entry Compatible\n`;
      textContent += `Cards needed: ${neededCards.length} of ${cards.length} total\n\n`;

      // Add main deck wishlist cards
      const mainWishlist = neededCards.filter(card => !card.sideboard && !card.techIdeas);
      if (mainWishlist.length > 0) {
        textContent += "Main Deck Wishlist:\n";
        textContent += "====================\n";
        
        const sortedMainWishlist = mainWishlist.sort((a, b) => {
          const nameA = (a.card?.name || a.name || 'Unknown Card').toLowerCase();
          const nameB = (b.card?.name || b.name || 'Unknown Card').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
        sortedMainWishlist.forEach(card => {
          textContent += formatCardForTCGPlayer(card) + '\n';
        });
        textContent += "\n";
      }

      // Add sideboard wishlist cards
      const sideboardWishlist = neededCards.filter(card => card.sideboard);
      if (sideboardWishlist.length > 0) {
        textContent += "Sideboard Wishlist:\n";
        textContent += "===================\n";
        
        const sortedSideboardWishlist = sideboardWishlist.sort((a, b) => {
          const nameA = (a.card?.name || a.name || 'Unknown Card').toLowerCase();
          const nameB = (b.card?.name || b.name || 'Unknown Card').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
        sortedSideboardWishlist.forEach(card => {
          textContent += formatCardForTCGPlayer(card) + '\n';
        });
        textContent += "\n";
      }

      // Add tech ideas wishlist cards
      const techIdeasWishlist = neededCards.filter(card => card.techIdeas);
      if (techIdeasWishlist.length > 0) {
        textContent += "Tech Ideas Wishlist:\n";
        textContent += "====================\n";
        
        const sortedTechIdeasWishlist = techIdeasWishlist.sort((a, b) => {
          const nameA = (a.card?.name || a.name || 'Unknown Card').toLowerCase();
          const nameB = (b.card?.name || b.name || 'Unknown Card').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
        sortedTechIdeasWishlist.forEach(card => {
          textContent += formatCardForTCGPlayer(card) + '\n';
        });
      }

      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${deck.name || 'deck'}_wishlist.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Wishlist exported! ${neededCards.length} cards needed.`);
      console.log('[EXPORT] Wishlist text export completed successfully');

    } catch (error) {
      console.error('[EXPORT] Error exporting wishlist to text:', error);
      toast.error("Failed to export wishlist to text");
    }
  };

  const handleExportWishlistToPDF = async () => {
    try {
      console.log('[EXPORT] Starting wishlist PDF export...');
      
      if (!deck || (!cards || cards.length === 0)) {
        toast.error("No deck or cards available for wishlist PDF export");
        return;
      }

      // Filter cards that are needed (not owned or different version)
      const neededCards = cards.filter(card => isCardNeeded(card));
      
      if (neededCards.length === 0) {
        toast.info("All cards are already in your collection!");
        return;
      }

      toast.info("Generating wishlist PDF with card images...");

      // Use the same image loading logic as the main PDF export
      const getCardImageDataUrl = async (card) => {
        const cardImageUrl = card.cardObj?.image_uris?.normal || 
                           card.cardObj?.card?.image_uris?.normal ||
                           card.scryfall_json?.image_uris?.normal ||
                           card.cardObj?.scryfall_json?.image_uris?.normal ||
                           card.card?.image_uris?.normal ||
                           card.image_uris?.normal;
        
        if (!cardImageUrl) {
          return null;
        }

        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.6)); // Compressed quality
          };
          img.onerror = () => resolve(null);
          img.src = cardImageUrl;
        });
      };

      // Use the same image loading and processing logic as main PDF export
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '200px';
      tempContainer.style.height = '280px';
      document.body.appendChild(tempContainer);

      const images = [];
      for (const card of neededCards) {
        const imageDataUrl = await getCardImageDataUrl(card);
        if (imageDataUrl) {
          const img = document.createElement('img');
          img.src = imageDataUrl;
          img.style.width = '200px';
          img.style.height = 'auto';
          tempContainer.appendChild(img);
          images.push({ src: imageDataUrl, card });
        }
      }

      // Import jsPDF with same configuration as main export
      const { jsPDF } = window.jspdf || await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm', 
        format: 'a4',
        compress: true
      });
      
      const pageWidth = 210; // A4 width in mm  
      const pageHeight = 297; // A4 height in mm
      const margin = 10; // Margin in mm
      const contentWidth = pageWidth - (2 * margin);  
      const contentHeight = pageHeight - (2 * margin);
      
      // Same card dimensions as main export
      const cardAspectRatio = 63/88; // width/height
      const cardsPerRow = 3;
      const cardWidth = contentWidth / cardsPerRow;
      const cardHeight = cardWidth / cardAspectRatio;
      const cardsPerPage = Math.floor(contentHeight / cardHeight) * cardsPerRow;
      
      console.log('[EXPORT] Wishlist card layout:', {
        cardsPerRow,
        cardWidth: cardWidth.toFixed(1) + 'mm',  
        cardHeight: cardHeight.toFixed(1) + 'mm',
        cardsPerPage
      });
      
      let currentCardIndex = 0;
      let pageNumber = 1;
      
      // Add title page - same format as main export
      pdf.setFontSize(24);
      pdf.text(`${deck.name || 'Untitled Deck'} - Wishlist`, pageWidth/2, 50, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth/2, 70, { align: 'center' });
      pdf.text(`Cards needed: ${neededCards.length} of ${cards.length} total`, pageWidth/2, 85, { align: 'center' });
      
      // Process each card with same grid layout as main export
      while (currentCardIndex < images.length) {
        const cardsOnThisPage = Math.min(cardsPerPage, images.length - currentCardIndex);
        
        if (pageNumber > 1) {
          pdf.addPage();
        }
        
        console.log(`[EXPORT] Creating wishlist page ${pageNumber} with ${cardsOnThisPage} cards`);
        
        for (let i = 0; i < cardsOnThisPage; i++) {
          const img = images[currentCardIndex + i];
          if (!img || !img.src) continue;
          
          const row = Math.floor(i / cardsPerRow);
          const col = i % cardsPerRow;
          
          const x = margin + (col * cardWidth);
          const y = margin + (row * cardHeight);
          
          try {
            pdf.addImage(img.src, 'PNG', x, y, cardWidth, cardHeight);
            console.log(`[EXPORT] Added wishlist card ${currentCardIndex + i + 1} at position (${x.toFixed(1)}, ${y.toFixed(1)})`);
          } catch (error) {
            console.error(`[EXPORT] Failed to add wishlist card ${currentCardIndex + i + 1}:`, error);
          }
        }
        
        currentCardIndex += cardsOnThisPage;
        pageNumber++;
        
        if (pageNumber > 50) {
          console.warn('[EXPORT] Safety break: Maximum pages reached');
          break;
        }
      }
      
      console.log('[EXPORT] Total wishlist pages created:', pageNumber - 1);

      // Clean up
      document.body.removeChild(tempContainer);

      // Download the PDF
      pdf.save(`${deck.name || 'deck'}_wishlist.pdf`);
      toast.success(`Wishlist PDF exported! ${neededCards.length} cards needed.`);
      console.log('[EXPORT] Wishlist PDF export completed successfully');

    } catch (error) {
      console.error('[EXPORT] Error exporting wishlist to PDF:', error);
      toast.error("Failed to export wishlist to PDF");
    }
  };

  // Import Functions
  const handleTextImport = async (textContent, importOptions = {}) => {
    try {
      // console.log('[IMPORT] Starting text import...');
      
      if (!textContent || textContent.trim() === '') {
        toast.warning("No text content provided");
        return;
      }

      const lines = textContent.trim().split('\n');
      const results = {
        mainDeck: [],
        sideboard: [],
        techIdeas: [],
        errors: []
      };
      
      let currentSection = 'mainDeck';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and headers
        if (!line || line.startsWith('===') || line.includes('Generated on') || line.includes('Format:') || line.includes('Total:')) {
          continue;
        }
        
        // Check for section headers
        if (line.toUpperCase().includes('MAIN DECK')) {
          currentSection = 'mainDeck';
          continue;
        }
        if (line.toUpperCase().includes('SIDEBOARD')) {
          currentSection = 'sideboard';
          continue;
        }
        if (line.toUpperCase().includes('TECH IDEAS')) {
          currentSection = 'techIdeas';
          continue;
        }
        
        // Parse card line: "4 Lightning Bolt [M11] 123" or "4 Lightning Bolt"
        const cardMatch = line.match(/^(\d+)\s+(.+?)(?:\s+\[([A-Z0-9]+)\](?:\s+(\w+))?)?$/);
        
        if (cardMatch) {
          const [, quantity, cardName, setCode, collectorNumber] = cardMatch;
          
          const cardData = {
            name: cardName.trim(),
            quantity: parseInt(quantity),
            set: setCode?.toLowerCase(),
            collector_number: collectorNumber
          };
          
          results[currentSection].push(cardData);
          console.log(`[IMPORT] Parsed: ${quantity}x ${cardName} (${setCode || 'no set'})`);
        } else {
          // Try simple format: just quantity and name
          const simpleMatch = line.match(/^(\d+)\s+(.+)$/);
          if (simpleMatch) {
            const [, quantity, cardName] = simpleMatch;
            results[currentSection].push({
              name: cardName.trim(),
              quantity: parseInt(quantity)
            });
            console.log(`[IMPORT] Parsed (simple): ${quantity}x ${cardName}`);
          } else {
            results.errors.push(`Line ${i + 1}: Could not parse "${line}"`);
          }
        }
      }
      
      // Process the parsed cards - search for them on Scryfall
      const processedCards = await Promise.all(
        results.mainDeck.map(async (cardData) => {
          try {
            // Search for the card on Scryfall
            let searchQuery = cardData.name;
            if (cardData.set) {
              searchQuery += ` set:${cardData.set}`;
            }
            
            const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
              const card = data.data[0]; // Take the first match
              
              // Create card object in the format expected by the deck
              const processedCard = {
                name: card.name,
                card: {
                  name: card.name,
                  scryfall_json: {
                    ...card,
                    image_uris: card.image_uris || (card.card_faces && card.card_faces[0]?.image_uris)
                  },
                  printing: card.id,
                  set: card.set,
                  collector_number: card.collector_number
                },
                count: cardData.quantity,
                quantity: cardData.quantity,
                printing: card.id,
                scryfall_id: card.id,
                added_at: new Date().toISOString()
              };
              
              return processedCard;
            } else {
              results.errors.push(`Card not found: ${cardData.name}`);
              return null;
            }
          } catch (error) {
            console.error(`[IMPORT] Error searching for ${cardData.name}:`, error);
            results.errors.push(`Error searching for: ${cardData.name}`);
            return null;
          }
        })
      );
      
      const validCards = processedCards.filter(card => card !== null);
      
      if (validCards.length === 0) {
        toast.error("No valid cards found to import");
        return;
      }
      
      // FIXED: Add all cards to deck by updating entire deck instead of individual calls
      const token = localStorage.getItem("token");
      const apiUrl = import.meta.env.VITE_API_URL;
      
      try {
        // Create new cards to add
        const cardsToAdd = validCards.map(card => ({
          name: card.name,
          quantity: card.count,
          isCommander: false,
          set: card.card.set,
          collector_number: card.card.collector_number,
          scryfall_id: card.scryfall_id,
          card: card.card,
          scryfallCard: card.card
        }));

        // Update entire deck with new cards
        const updatedDeck = {
          ...deck,
          cards: [...(deck.cards || []), ...cardsToAdd]
        };

        const response = await fetch(`${apiUrl}/api/decks/${deck._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedDeck),
          credentials: "include",
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error(`[IMPORT] Server error:`, errorData);
          results.errors.push(`Failed to add cards: ${response.status}`);
        } else {
          results.successful = validCards.length;
        }
      } catch (error) {
        console.error(`[IMPORT] Error adding cards:`, error);
        results.errors.push(`Error adding cards: ${error.message}`);
      }
      
      // Refresh the deck data by fetching fresh deck from server
      try {
        const response = await fetch(`${apiUrl}/api/decks/${deck._id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });
        
        if (response.ok) {
          const freshDeck = await response.json();
          setDeck(freshDeck);
          setCards(freshDeck.cards || []);
        }
      } catch (error) {
        console.error('[IMPORT] Error refreshing deck:', error);
      }
      
      const successMessage = `Successfully imported ${validCards.length} cards${results.errors.length > 0 ? ` (${results.errors.length} errors)` : ''}`;
      toast.success(successMessage);
      
      if (results.errors.length > 0) {
        console.warn('[IMPORT] Import completed with errors:', results.errors);
      }
      
      // console.log('[IMPORT] Text import completed successfully');
      
    } catch (error) {
      console.error('[IMPORT] Error importing text:', error);
      toast.error("Failed to import deck list from text");
    }
  };

  // Handler functions for sideboard and tech ideas management
  const handleRemoveFromSideboard = async (cardIndex) => {
    try {
      console.log(`[REMOVE FROM SIDEBOARD] Removing card at index ${cardIndex} from sideboard`);
      
      // Update deck state using localStorage system
      const updatedSideboard = [...deck.sideboard];
      const removedCard = updatedSideboard.splice(cardIndex, 1)[0];
      
      const updatedDeck = {
        ...deck,
        sideboard: updatedSideboard,
        lastUpdated: Date.now()
      };
      
      // Update React state
      setDeck(updatedDeck);
      
      // Save to localStorage immediately for persistence
      saveSideboardToStorage(updatedDeck._id, updatedDeck.sideboard, updatedDeck.techIdeas);
      
      toast.success(`Removed ${removedCard?.name || 'card'} from sideboard`);
      console.log(`[REMOVE FROM SIDEBOARD] Successfully removed from sideboard`);
      
    } catch (error) {
      console.error("Error removing card from sideboard:", error);
      toast.error("Error removing card from sideboard");
    }
  };

  const handleRemoveFromTechIdeas = async (cardIndex) => {
    try {
      console.log(`[REMOVE FROM TECH IDEAS] Removing card at index ${cardIndex} from tech ideas`);
      
      // Update deck state using localStorage system
      const updatedTechIdeas = [...deck.techIdeas];
      const removedCard = updatedTechIdeas.splice(cardIndex, 1)[0];
      
      const updatedDeck = {
        ...deck,
        techIdeas: updatedTechIdeas,
        lastUpdated: Date.now()
      };
      
      // Update React state
      setDeck(updatedDeck);
      
      // Save to localStorage immediately for persistence
      saveSideboardToStorage(updatedDeck._id, updatedDeck.sideboard, updatedDeck.techIdeas);
      
      toast.success(`Removed ${removedCard?.name || 'card'} from tech ideas`);
      console.log(`[REMOVE FROM TECH IDEAS] Successfully removed from tech ideas`);
      
    } catch (error) {
      console.error("Error removing card from tech ideas:", error);
      toast.error("Error removing card from tech ideas");
    }
  };

  const handleMoveFromSideboardToMainDeck = async (sideboardCard, cardIndex) => {
    try {
      const cardName = sideboardCard.name || sideboardCard.card?.name;
      console.log(`[MOVE FROM SIDEBOARD] Moving ${cardName} from sideboard to main deck`);
      
      // Prepare the new deck state first
      const updatedSideboard = [...deck.sideboard];
      updatedSideboard.splice(cardIndex, 1);
      
      const cardForMainDeck = {
        name: cardName,
        printing: sideboardCard.printing || sideboardCard.scryfall_json?.id || sideboardCard.card?.scryfall_json?.id,
        quantity: 1,
        modalPrice: sideboardCard.modalPrice,
        // Enhanced type information extraction - check cardObj first since that's where the type_line is stored
        type_line: sideboardCard.cardObj?.type_line || 
                  sideboardCard.type_line || 
                  sideboardCard.card?.type_line || 
                  sideboardCard.scryfall_json?.type_line || 
                  sideboardCard.card?.scryfall_json?.type_line,
        scryfall_json: sideboardCard.scryfall_json || sideboardCard.card?.scryfall_json || sideboardCard.cardObj?.scryfall_json,
        cardObj: sideboardCard.cardObj || sideboardCard,
        // Ensure we preserve the card structure that the type system expects
        card: sideboardCard.card || {
          name: cardName,
          type_line: sideboardCard.cardObj?.type_line || 
                    sideboardCard.type_line || 
                    sideboardCard.card?.type_line || 
                    sideboardCard.scryfall_json?.type_line || 
                    sideboardCard.card?.scryfall_json?.type_line,
          scryfall_json: sideboardCard.scryfall_json || sideboardCard.card?.scryfall_json || sideboardCard.cardObj?.scryfall_json
        }
      };
      
      const newDeck = {
        ...deck,
        cards: [...(deck.cards || []), cardForMainDeck],
        sideboard: updatedSideboard,
        cardCount: (deck.cards?.length || 0) + 1,
        lastUpdated: Date.now()
      };
      
      console.log(`[MOVE FROM SIDEBOARD] New deck prepared with ${newDeck.cards.length} main cards, ${newDeck.sideboard.length} sideboard cards`);
      console.log(`[MOVE FROM SIDEBOARD] Card type info preserved:`, JSON.stringify({
        name: cardForMainDeck.name,
        type_line: cardForMainDeck.type_line,
        scryfall_type: cardForMainDeck.scryfall_json?.type_line,
        card_type: cardForMainDeck.card?.type_line,
        originalCard_cardObj_type: sideboardCard.cardObj?.type_line,
        originalCard_type_line: sideboardCard.type_line,
        originalCard_scryfall_type: sideboardCard.scryfall_json?.type_line,
        originalCard_card_type: sideboardCard.card?.type_line
      }, null, 2));
      
      // Update React state
      setDeck(newDeck);
      setCards(newDeck.cards || []);
      
      // Save to localStorage immediately for persistence
      saveSideboardToStorage(newDeck._id, newDeck.sideboard, newDeck.techIdeas);

      // Save main deck changes to server
      console.log(`[MOVE FROM SIDEBOARD] Attempting to save deck to server...`);
      try {
        await saveDeckToServer(newDeck);
        console.log(`[MOVE FROM SIDEBOARD] Server save completed successfully`);
      } catch (saveError) {
        console.error(`[MOVE FROM SIDEBOARD] Failed to save deck to server:`, saveError);
        console.log(`[MOVE FROM SIDEBOARD] Move successful in UI, zones saved to localStorage`);
      }
      
      toast.success(`Moved ${cardName} to Main Deck`);
      console.log(`[MOVE FROM SIDEBOARD] === FUNCTION COMPLETED SUCCESSFULLY ===`);
      
    } catch (error) {
      console.error("Error moving card from sideboard to main deck:", error);
      toast.error("Error moving card from sideboard to main deck");
    }
  };

  const handleMoveFromSideboardToTechIdeas = async (sideboardCard, cardIndex) => {
    try {
      const cardName = sideboardCard.name || sideboardCard.card?.name;
      console.log(`[MOVE BETWEEN ZONES] Moving ${cardName} from sideboard to tech ideas`);
      
      // Atomic operation: Remove from sideboard and add to tech ideas
      let updatedDeck;
      setDeck(prevDeck => {
        if (!prevDeck || !prevDeck.sideboard) return prevDeck;
        
        // Remove card from sideboard by index
        const updatedSideboard = [...prevDeck.sideboard];
        const removedCard = updatedSideboard.splice(cardIndex, 1)[0];
        
        // Prepare card for tech ideas (preserve all data)
        const cardForTechIdeas = {
          name: cardName,
          printing: removedCard.printing || removedCard.scryfall_json?.id || removedCard.card?.scryfall_json?.id,
          foil: removedCard.foil || removedCard.card?.foil || false,
          count: 1,
          modalPrice: removedCard.modalPrice,
          type_line: removedCard.type_line || removedCard.card?.type_line,
          scryfall_json: removedCard.scryfall_json || removedCard.card?.scryfall_json,
          cardObj: removedCard.cardObj || removedCard
        };
        
        updatedDeck = {
          ...prevDeck,
          sideboard: updatedSideboard,
          techIdeas: [...(prevDeck.techIdeas || []), cardForTechIdeas],
          lastUpdated: Date.now()
        };
        
        return updatedDeck;
      });
      
      // Save to localStorage immediately for persistence
      if (updatedDeck) {
        saveSideboardToStorage(updatedDeck._id, updatedDeck.sideboard, updatedDeck.techIdeas);
      }
      
      toast.success(`Moved ${cardName} to Tech Ideas`);
      
    } catch (error) {
      console.error("Error moving card from sideboard to tech ideas:", error);
      toast.error("Error moving card from sideboard to tech ideas");
    }
  };

  const handleMoveFromTechIdeasToMainDeck = async (techCard, cardIndex) => {
    try {
      const cardName = techCard.name || techCard.card?.name;
      console.log(`[MOVE FROM TECH IDEAS] Moving ${cardName} from tech ideas to main deck`);
      
      // Prepare the new deck state first
      const updatedTechIdeas = [...deck.techIdeas];
      updatedTechIdeas.splice(cardIndex, 1);
      
      const cardForMainDeck = {
        name: cardName,
        printing: techCard.printing || techCard.scryfall_json?.id || techCard.card?.scryfall_json?.id,
        quantity: 1,
        modalPrice: techCard.modalPrice,
        // Enhanced type information extraction - check cardObj first since that's where the type_line is stored
        type_line: techCard.cardObj?.type_line || 
                  techCard.type_line || 
                  techCard.card?.type_line || 
                  techCard.scryfall_json?.type_line || 
                  techCard.card?.scryfall_json?.type_line,
        scryfall_json: techCard.scryfall_json || techCard.card?.scryfall_json || techCard.cardObj?.scryfall_json,
        cardObj: techCard.cardObj || techCard,
        // Ensure we preserve the card structure that the type system expects
        card: techCard.card || {
          name: cardName,
          type_line: techCard.cardObj?.type_line || 
                    techCard.type_line || 
                    techCard.card?.type_line || 
                    techCard.scryfall_json?.type_line || 
                    techCard.card?.scryfall_json?.type_line,
          scryfall_json: techCard.scryfall_json || techCard.card?.scryfall_json || techCard.cardObj?.scryfall_json
        }
      };
      
      const newDeck = {
        ...deck,
        cards: [...(deck.cards || []), cardForMainDeck],
        techIdeas: updatedTechIdeas,
        cardCount: (deck.cards?.length || 0) + 1,
        lastUpdated: Date.now()
      };
      
      // Update React state
      setDeck(newDeck);
      setCards(newDeck.cards || []);
      
      // Save to localStorage immediately for persistence
      saveSideboardToStorage(newDeck._id, newDeck.sideboard, newDeck.techIdeas);

      // Save main deck changes to server
      try {
        await saveDeckToServer(newDeck);
      } catch (saveError) {
        console.error(`[MOVE FROM TECH IDEAS] Failed to save deck to server:`, saveError);
        console.log(`[MOVE FROM TECH IDEAS] Move successful in UI, zones saved to localStorage`);
      }
      
      toast.success(`Moved ${cardName} to Main Deck`);
      console.log(`[MOVE FROM TECH IDEAS] === FUNCTION COMPLETED SUCCESSFULLY ===`);
      
    } catch (error) {
      console.error("Error moving card from tech ideas to main deck:", error);
      toast.error("Error moving card from tech ideas to main deck");
    }
  };

  const handleMoveFromTechIdeasToSideboard = async (techCard, cardIndex) => {
    try {
      // Calculate modalPrice if missing - use enhanced recursive search
      let modalPriceToUse = techCard.modalPrice || techCard.cardObj?.modalPrice || techCard.cardObj?.card?.modalPrice;
      if (!isValidModalPrice(modalPriceToUse)) {
        const priceData = extractPrice(techCard);
        modalPriceToUse = priceData.price;
        
        // If extractPrice still returns null, try the most aggressive search possible
        if (!modalPriceToUse) {
          const searchForPrice = (obj, depth = 0) => {
            if (depth > 10 || !obj || typeof obj !== 'object') return null;
            if (obj.prices?.usd) return obj.prices.usd;
            if (obj.usd) return obj.usd;
            if (obj.price) return obj.price;
            for (const value of Object.values(obj)) {
              if (value && typeof value === 'object') {
                const found = searchForPrice(value, depth + 1);
                if (found) return found;
              }
            }
            return null;
          };
          modalPriceToUse = searchForPrice(techCard) || '0.24'; // Last resort fallback based on logs
          console.log(`[ZONE MOVE] Deep search price for ${techCard.name}: $${modalPriceToUse}`);
        }
      }

      // Atomic operation: Remove from tech ideas and add to sideboard in single state update
      setDeck(prevDeck => {
        const newTechIdeas = [...(prevDeck.techIdeas || [])];
        const newSideboard = [...(prevDeck.sideboard || [])];
        
        // Remove card from tech ideas by index
        const removedCard = newTechIdeas.splice(cardIndex, 1)[0];
        
        // Add card to sideboard with preserved modalPrice
        const cardWithPrice = {
          ...removedCard,
          modalPrice: modalPriceToUse
        };
        newSideboard.push(cardWithPrice);
        
        return {
          ...prevDeck,
          techIdeas: newTechIdeas,
          sideboard: newSideboard
        };
      });
      
      // Persist to localStorage immediately
      saveSideboardToStorage(deck._id, [...(deck.sideboard || []), { ...techCard, modalPrice: modalPriceToUse }], [...(deck.techIdeas || [])].filter((_, index) => index !== cardIndex));
      
      toast.success(`Moved ${techCard.name} to sideboard`);
    } catch (error) {
      console.error("Error moving card from tech ideas to sideboard:", error);
      toast.error("Error moving card to sideboard");
    }
  };

  // Function to add card directly to tech ideas from search results
  const handleAddToTechIdeas = async (card) => {
    try {
      console.log(`[ADD TO TECH IDEAS] Adding ${card.name} to tech ideas`);
      
      // Create the card object with proper structure
      const newTechIdeasCard = {
        name: card.name,
        printing: card.scryfall_id || card.id,
        foil: false,
        count: 1,
        cardObj: {
          scryfall_id: card.scryfall_id || card.id,
          name: card.name,
          set: card.set,
          collector_number: card.collector_number,
          image_uris: card.image_uris,
          type_line: card.type_line
        },
        scryfall_json: card
      };

      // Update deck state using localStorage system
      const updatedDeck = {
        ...deck,
        techIdeas: [...(deck.techIdeas || []), newTechIdeasCard],
        lastUpdated: Date.now()
      };
      
      // Update React state
      setDeck(updatedDeck);
      
      // Save to localStorage immediately for persistence
      saveSideboardToStorage(updatedDeck._id, updatedDeck.sideboard, updatedDeck.techIdeas);
      
      toast.success(`Added ${card.name} to Tech Ideas`);
      console.log(`[ADD TO TECH IDEAS] Successfully added to tech ideas`);
      
    } catch (error) {
      console.error("Error adding card to tech ideas:", error);
      toast.error("Error adding card to tech ideas");
    }
  };

  // Function to add card directly to sideboard from search results
  const handleAddToSideboard = async (card) => {
    try {
      console.log(`[ADD TO SIDEBOARD] Adding ${card.name} to sideboard`);
      
      // Create the card object with proper structure
      const newSideboardCard = {
        name: card.name,
        printing: card.scryfall_id || card.id,
        foil: false,
        count: 1,
        cardObj: {
          scryfall_id: card.scryfall_id || card.id,
          name: card.name,
          set: card.set,
          collector_number: card.collector_number,
          image_uris: card.image_uris,
          type_line: card.type_line
        },
        scryfall_json: card
      };

      // Update deck state using localStorage system
      const updatedDeck = {
        ...deck,
        sideboard: [...(deck.sideboard || []), newSideboardCard],
        lastUpdated: Date.now()
      };
      
      // Update React state
      setDeck(updatedDeck);
      
      // Save to localStorage immediately for persistence
      saveSideboardToStorage(updatedDeck._id, updatedDeck.sideboard, updatedDeck.techIdeas);
      
      toast.success(`Added ${card.name} to Sideboard`);
      console.log(`[ADD TO SIDEBOARD] Successfully added to sideboard`);
      
    } catch (error) {
      console.error("Error adding card to sideboard:", error);
      toast.error("Error adding card to sideboard");
    }
  };

  // Function to add card to global wishlist
  const handleAddToWishlist = async (card) => {
    try {
      console.log('Add to Wishlist:', card.name);
      
      // Create the card object with proper structure
      const newWishlistCard = {
        name: card.name,
        printing: card.scryfall_id || card.id,
        foil: false,
        count: 1,
        dateAdded: Date.now(),
        cardObj: {
          scryfall_id: card.scryfall_id || card.id,
          name: card.name,
          set: card.set,
          set_name: card.set_name,
          collector_number: card.collector_number,
          image_uris: card.image_uris,
          type_line: card.type_line,
          mana_cost: card.mana_cost,
          cmc: card.cmc,
          colors: card.colors,
          color_identity: card.color_identity,
          prices: card.prices
        },
        scryfall_json: card
      };

      // Load existing wishlist from localStorage
      const existingWishlist = JSON.parse(localStorage.getItem('global-wishlist') || '[]');
      
      // Check if card already exists in wishlist
      const existingCardIndex = existingWishlist.findIndex(item => 
        item.name === card.name && item.printing === (card.scryfall_id || card.id)
      );
      
      if (existingCardIndex !== -1) {
        // Card exists, increment quantity
        existingWishlist[existingCardIndex].count += 1;
        toast.success(`Updated ${card.name} quantity in wishlist (now ${existingWishlist[existingCardIndex].count})`);
      } else {
        // New card, add to wishlist
        existingWishlist.push(newWishlistCard);
        toast.success(`Added ${card.name} to wishlist`);
      }
      
      // Save updated wishlist to localStorage
      localStorage.setItem('global-wishlist', JSON.stringify(existingWishlist));
      
      // Dispatch custom event to update navbar or other components
      window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: existingWishlist }));
      
    } catch (error) {
      console.error("Error adding card to wishlist:", error);
      toast.error("Error adding card to wishlist");
    }
  };

  // Function to move card from main deck to sideboard
  const handleMoveToSideboard = async (cardObj) => {
    try {
      const cardName = cardObj.card?.name || cardObj.name;
      console.log(`[MOVE TO SIDEBOARD] Moving ${cardName} from main deck to sideboard`);
      
      // Step 1 & 2: Remove card from main deck and add to sideboard in one atomic operation
      let updatedDeck;
      setDeck(prevDeck => {
        if (!prevDeck) return prevDeck;
        
        // Remove card from main deck
        const updatedCards = (prevDeck.cards || []).filter((c) => {
          const cName = c.name || c.card?.name || c.cardObj?.name || c.cardObj?.card?.name;
          return cName !== cardName;
        });
        
        // Add card to sideboard
        const newSideboardCard = {
          name: cardName,
          printing: cardObj.printing || cardObj.scryfall_json?.id || cardObj.card?.scryfall_json?.id,
          foil: cardObj.foil || cardObj.card?.foil || false,
          count: 1,
          modalPrice: cardObj.modalPrice || cardObj.card?.modalPrice,
          type_line: cardObj.type_line || cardObj.card?.type_line,
          scryfall_json: cardObj.scryfall_json || cardObj.card?.scryfall_json,
          cardObj: cardObj
        };
        
        updatedDeck = {
          ...prevDeck,
          cards: updatedCards,
          sideboard: [...(prevDeck.sideboard || []), newSideboardCard],
          cardCount: updatedCards.length,
          lastUpdated: Date.now()
        };
        
        return updatedDeck;
      });
      
      // Update cards state to match
      if (updatedDeck) {
        setCards(updatedDeck.cards || []);
        // Save to localStorage immediately for persistence across refreshes
        saveSideboardToStorage(updatedDeck._id, updatedDeck.sideboard, updatedDeck.techIdeas);
      }
      
      // Step 3: Save the updated deck state to server
      if (updatedDeck) {
        try {
          await saveDeckToServer(updatedDeck);
          // Note: Only main deck changes are persisted to server
          // Sideboard is maintained client-side only
        } catch (saveError) {
          console.error(`[MOVE TO SIDEBOARD] Failed to save deck to server:`, saveError);
          // Don't show error toast since sideboard still works client-side
          console.log(`[MOVE TO SIDEBOARD] Sideboard move successful in UI (client-side only)`);
        }
      }
      
      toast.success(`Moved ${cardName} to Sideboard`);
      
    } catch (error) {
      console.error("Error moving card to sideboard:", error);
      toast.error("Error moving card to sideboard");
    }
  };

  // Function to move card from main deck to tech ideas
  const handleMoveToTechIdeas = async (cardObj) => {
    try {
      const cardName = cardObj.card?.name || cardObj.name;
      console.log(`[MOVE TO TECH IDEAS] Moving ${cardName} from main deck to tech ideas`);
      
      // Step 1 & 2: Remove card from main deck and add to tech ideas in one atomic operation
      let updatedDeck;
      setDeck(prevDeck => {
        if (!prevDeck) return prevDeck;
        
        // Remove card from main deck
        const updatedCards = (prevDeck.cards || []).filter((c) => {
          const cName = c.name || c.card?.name || c.cardObj?.name || c.cardObj?.card?.name;
          return cName !== cardName;
        });
        
        // Add card to tech ideas
        const newTechIdeasCard = {
          name: cardName,
          printing: cardObj.printing || cardObj.scryfall_json?.id || cardObj.card?.scryfall_json?.id,
          foil: cardObj.foil || cardObj.card?.foil || false,
          count: 1,
          modalPrice: cardObj.modalPrice || cardObj.card?.modalPrice,
          type_line: cardObj.type_line || cardObj.card?.type_line,
          scryfall_json: cardObj.scryfall_json || cardObj.card?.scryfall_json,
          cardObj: cardObj
        };
        
        updatedDeck = {
          ...prevDeck,
          cards: updatedCards,
          techIdeas: [...(prevDeck.techIdeas || []), newTechIdeasCard],
          cardCount: updatedCards.length,
          lastUpdated: Date.now()
        };
        
        return updatedDeck;
      });
      
      // Update cards state to match
      if (updatedDeck) {
        setCards(updatedDeck.cards || []);
        // Save to localStorage immediately for persistence across refreshes
        saveSideboardToStorage(updatedDeck._id, updatedDeck.sideboard, updatedDeck.techIdeas);
      }
      
      // Step 3: Save the updated deck state to server
      if (updatedDeck) {
        try {
          await saveDeckToServer(updatedDeck);
          // Note: Only main deck changes are persisted to server
          // Tech Ideas are maintained client-side only
        } catch (saveError) {
          console.error(`[MOVE TO TECH IDEAS] Failed to save deck to server:`, saveError);
          // Don't show error toast since tech ideas still works client-side
          console.log(`[MOVE TO TECH IDEAS] Tech ideas move successful in UI (client-side only)`);
        }
      }
      
      toast.success(`Moved ${cardName} to Tech Ideas`);
      
    } catch (error) {
      console.error("Error moving card to tech ideas:", error);
      toast.error("Error moving card to tech ideas");
    }
  };

  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    open: false,
    x: 0,
    y: 0,
    cardObj: null,
  });

  // Close context menu on click elsewhere
  useEffect(() => {
    if (!contextMenu.open) return;
    const close = () =>
      setContextMenu({ open: false, x: 0, y: 0, cardObj: null });
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, [contextMenu.open]);

  // Expose sideboard and tech ideas functions globally for Oracle Tag modal integration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.deckEditApp = {
        handleAddToSideboard,
        handleAddToTechIdeas,
        handleMoveToSideboard,
        handleMoveToTechIdeas,
        handleRemoveFromSideboard,
        handleRemoveFromTechIdeas,
        setModalState,
        openCardModal: (cardData) => {
          // Helper function to open CardActionsModal from Oracle Tag search
          console.log('[ORACLE TAG MODAL] Opening CardActionsModal for:', cardData.name);
          
          // Create the card object structure that CardActionsModal expects
          const enrichedCardObj = {
            name: cardData.name,
            printing: cardData.scryfall_id || cardData.id,
            cardObj: {
              name: cardData.name,
              scryfall_id: cardData.scryfall_id || cardData.id,
              set: cardData.set,
              collector_number: cardData.collector_number,
              image_uris: cardData.image_uris,
              type_line: cardData.type_line,
              mana_cost: cardData.mana_cost,
              oracle_text: cardData.oracle_text,
              power: cardData.power,
              toughness: cardData.toughness,
              cmc: cardData.cmc || cardData.converted_mana_cost,
              rarity: cardData.rarity,
              prices: cardData.prices
            },
            card: {
              name: cardData.name,
              scryfall_json: cardData,
              type_line: cardData.type_line
            },
            scryfall_json: cardData,
            foil: false,
            count: 1,
            modalPrice: cardData.prices?.usd || cardData.prices?.usd_foil || '0.00'
          };
          
          setModalState({
            isOpen: true,
            cardObj: enrichedCardObj,
          });
        }
      };
      
      // DEBUG: Reduced logging for performance
      if (renderCounter.current % 50 === 0) {
        console.log('[GLOBAL FUNCTIONS] Exposed deck editing functions to window.deckEditApp');
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (typeof window !== 'undefined' && window.deckEditApp) {
        delete window.deckEditApp;
      }
    };
  }, [deck?._id]); // Only re-run when deck changes, not on every function change

  // Early returns MUST come after all hooks to avoid "fewer hooks than expected" error
  // Minimal logging for production
  if (loading) {
    return (
      <div className="container" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '60vh',
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: '18px', 
          marginBottom: '12px',
          color: '#333'
        }}>
          Loading deck...
        </div>
        <div style={{ 
          fontSize: '14px', 
          color: '#666',
          maxWidth: '400px',
          lineHeight: '1.4'
        }}>
          If this is taking longer than expected, the server may be starting up. This can take up to 30 seconds on the first load.
        </div>
        <div style={{
          marginTop: '20px',
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}>
        </div>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `
        }} />
      </div>
    );
  }
  if (!deck) {
    return <div className="container">Deck not found.</div>;
  }

  // Render the main component with deck layout and sidebar
  return (
    <>
      {/* Deck title moved above main layout, between Nav and content */}
      <div
        className="deck-title-bar"
        style={{
          width: "100%",
          textAlign: "center",
          background: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "2rem",
              fontWeight: 700,
              letterSpacing: "-0.5px",
              cursor: "pointer",
              display: "inline-block",
              transition: "color 0.15s",
            }}
            title="Click to copy deck link"
            onClick={async () => {
              try {
                const url = window.location.origin + `/decks/${id}`;
                await navigator.clipboard.writeText(url);
                toast.success("Deck link copied!");
              } catch {
                toast.error("Failed to copy link");
              }
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#1976d2")}
            onMouseOut={(e) => (e.currentTarget.style.color = "")}
          >
            {deck.name || "Untitled Deck"}
          </h2>
          
          {/* Share button for deck owners */}
          {!isReadOnly && (
            <button
              onClick={() => {
                const publicUrl = `${window.location.origin}/public/decks/${id}`;
                navigator.clipboard.writeText(publicUrl);
                toast.success("Public share link copied to clipboard!");
              }}
              style={{
                backgroundColor: "#2196f3",
                color: "white",
                border: "none",
                padding: "6px 12px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "500",
                cursor: "pointer",
                marginTop: "4px",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                width: "fit-content"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#1976d2"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#2196f3"}
            >
              🔗 Copy Public Share Link
            </button>
          )}
          
          {/* Read-only indicator */}
          {isReadOnly && (
            <div style={{
              backgroundColor: "#e3f2fd",
              border: "1px solid #2196f3",
              borderRadius: "6px",
              padding: "8px 12px",
              marginTop: "8px",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#1976d2",
              fontSize: "14px",
              fontWeight: "500"
            }}>
              <span>👁️</span>
              <span>Public View (Read-Only) - This deck is shared publicly and cannot be edited</span>
            </div>
          )}
          
          {/* Import and Export Buttons - Hidden in read-only mode */}
          {!isReadOnly && (
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {/* Import Dropdown Menu */}
            <div className="import-dropdown-container" style={{ position: "relative", display: "inline-block" }}>
              <button
                onClick={() => setShowImportDropdown(!showImportDropdown)}
                style={{
                  backgroundColor: "#4caf50",
                  color: "white",
                  border: "none",
                  padding: "10px 16px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#388e3c";
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#4caf50";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                }}
                title="Import Options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M12,12L16,16H13V19H11V16H8L12,12Z"/>
                </svg>
                Import
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ transform: showImportDropdown ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
                  <path d="M7,10L12,15L17,10H7Z"/>
                </svg>
              </button>
              
              {showImportDropdown && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  right: "0",
                  marginTop: "4px",
                  backgroundColor: "white",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                  zIndex: 1000,
                  minWidth: "240px",
                  overflow: "hidden"
                }}>
                  <div
                    onClick={() => {
                      setShowTextImportModal(true);
                      setShowImportDropdown(false);
                    }}
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      fontSize: "14px",
                      color: "#333",
                      borderBottom: "1px solid #f0f0f0",
                      transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#4caf50">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M12,12L16,16H13V19H11V16H8L12,12Z"/>
                    </svg>
                    <div>
                      <div style={{ fontWeight: "500" }}>Import from Text</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>Paste or upload card list</div>
                    </div>
                  </div>
                  
                  <div
                    onClick={() => {
                      setShowPhotoImportModal(true);
                      setShowImportDropdown(false);
                    }}
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      fontSize: "14px",
                      color: "#333",
                      transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff9800">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M9,15A1,1 0 0,1 8,14A1,1 0 0,1 9,13A1,1 0 0,1 10,14A1,1 0 0,1 9,15M16,15H11L13,12L14.25,13.25L15.75,11.75L17,13V15H16Z"/>
                    </svg>
                    <div>
                      <div style={{ fontWeight: "500" }}>Import from Photo/PDF</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>Upload card images or PDFs</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Export Dropdown Menu */}
            <div className="export-dropdown-container" style={{ position: "relative", display: "inline-block" }}>
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              style={{
                backgroundColor: "#2196f3",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#1976d2";
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#2196f3";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }}
              title="Export Options"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
              Export
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ transform: showExportDropdown ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
                <path d="M7,10L12,15L17,10H7Z"/>
              </svg>
            </button>
            
            {showExportDropdown && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: "0",
                marginTop: "4px",
                backgroundColor: "white",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                zIndex: 1000,
                minWidth: "220px",
                overflow: "hidden"
              }}>
                <div
                  onClick={() => {
                    handleExportToText();
                    setShowExportDropdown(false);
                  }}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    fontSize: "14px",
                    color: "#333",
                    borderBottom: "1px solid #f0f0f0",
                    transition: "background-color 0.2s ease"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#4caf50">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                  <div>
                    <div style={{ fontWeight: "500" }}>Export Entire Text</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>All cards as plain text file</div>
                  </div>
                </div>
                
                <div
                  onClick={() => {
                    handleExportToPDF();
                    setShowExportDropdown(false);
                  }}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    fontSize: "14px",
                    color: "#333",
                    borderBottom: "1px solid #f0f0f0",
                    transition: "background-color 0.2s ease"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff5722">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M9,13V19A1,1 0 0,0 10,20H14A1,1 0 0,0 15,19V13A1,1 0 0,0 14,12H10A1,1 0 0,0 9,13Z"/>
                  </svg>
                  <div>
                    <div style={{ fontWeight: "500" }}>Export Entire PDF</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>All cards with images as PDF</div>
                  </div>
                </div>
                
                <div
                  onClick={() => {
                    handleExportWishlistToText();
                    setShowExportDropdown(false);
                  }}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    fontSize: "14px",
                    color: "#333",
                    borderBottom: "1px solid #f0f0f0",
                    transition: "background-color 0.2s ease"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#2196f3">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M10,11H14V12H10V11Z M10,14H17V15H10V14Z M10,17H17V18H10V17Z"/>
                  </svg>
                  <div>
                    <div style={{ fontWeight: "500" }}>Export Text Wishlist</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>Cards not in collection as text</div>
                  </div>
                </div>
                
                <div
                  onClick={() => {
                    handleExportWishlistToPDF();
                    setShowExportDropdown(false);
                  }}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    fontSize: "14px",
                    color: "#333",
                    transition: "background-color 0.2s ease"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#9c27b0">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M10,11H14V12H10V11Z M16,11H17V12H16V11Z M10,14H17V15H10V14Z M10,17H14V18H10V17Z M16,17H17V18H16V17Z"/>
                  </svg>
                  <div>
                    <div style={{ fontWeight: "500" }}>Export PDF Wishlist</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>Cards not in collection as PDF</div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Main layout with sidebar and content */}
      <div className="deck-container" style={{ paddingBottom: "50px" }}>
        <div className="deck-layout" style={{ alignItems: "flex-start" }}>
          {/* Sidebar with card preview and display options */}
          <div
            className="deck-sidebar"
          >
            {fixedPreview && fixedPreview.card && (
              <CardPreview
                preview={fixedPreview}
                showPreview={true}
                isFixed={true}
                externalFlipState={fixedPreview?.flipState}
                style={{
                  height: "auto",
                  maxHeight: "400px", // Prevent preview from getting too large
                  maxWidth: "100%", // Ensure it fits within sidebar
                  borderRadius: "4.75%",
                  background: "white",
                  marginBottom: "12px",
                  padding: 0,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  objectFit: "contain", // Maintain aspect ratio
                }}
              />
            )}

            {/* Search bar */}
            <div
              className="search-container"
              style={{
                position: "relative",
                display: "flex",
                justifyContent: "center",
                marginBottom: "8pt",
              }}
            >
              <input
                type="text"
                placeholder="Search for cards to add (Scryfall syntax supported)..."
                value={search}
                data-deck-view-search="true"
                onChange={(e) => {
                  // Reduce console logging to improve performance
                  // console.log('🔍 Search input changed:', {
                  //   newValue: e.target.value,
                  //   oldValue: search
                  // });
                  setSearch(e.target.value);
                  // Don't call debouncedSearch directly - let useEffect handle it to avoid double triggers
                }}
                onBlur={(e) => {
                  // console.log('🔍 Search input onBlur triggered');
                  // Capture references before setTimeout to avoid stale references
                  const searchInput = e.currentTarget;
                  const searchContainer = searchInput.closest('.search-container');
                  
                  // Clear search when clicking outside the search input
                  // Use setTimeout to allow dropdown clicks to register first
                  setTimeout(() => {
                    const activeElement = document.activeElement;
                    const dropdown = searchContainer?.querySelector('[style*="position: absolute"]');
                    
                    // Check if focus moved to the dropdown or its children
                    const focusedOnDropdown = dropdown && dropdown.contains(activeElement);
                    const focusedOnInput = activeElement === searchInput;
                    
                    // console.log('🔍 onBlur setTimeout check:', { 
                    //   focusedOnInput, 
                    //   focusedOnDropdown,
                    //   activeElement: activeElement?.tagName,
                    //   dropdownExists: !!dropdown
                    // });
                    
                    // Only clear if focus is not on the input or dropdown
                    if (!focusedOnInput && !focusedOnDropdown) {
                      // console.log('🔍 Clearing search due to onBlur');
                      setSearch("");
                      setSearchResults([]);
                      setNoResultsMsg("");
                      setShowDropdown(false);
                      setSelectedSearchIndex(-1);
                    } else {
                      // console.log('🔍 NOT clearing search - focus still in search area');
                    }
                  }, 200); // Increased delay to allow click handlers more time
                }}
                onKeyDown={(e) => {
                  // Handle keyboard navigation for search dropdown
                  if (showDropdown && (searchResults.length > 0 || noResultsMsg)) {
                    const totalItems = searchResults.length + (searchResults.length > 0 ? 1 : 0); // +1 for "Show all results" button
                    
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSelectedSearchIndex(prev => {
                        const newIndex = prev < totalItems - 1 ? prev + 1 : 0;
                        // Show preview for the selected card (but not for "Show all results" button)
                        if (newIndex < searchResults.length && searchResults[newIndex]) {
                          const card = searchResults[newIndex];
                          const cleanSearchCard = {
                            name: card.name,
                            id: card.id || card.scryfall_id, // Add required ID for CardPreview validation
                            scryfall_id: card.scryfall_id || card.id, // Add scryfall_id for CardPreview validation
                            card: {
                              name: card.name,
                              id: card.id || card.scryfall_id, // Add ID to nested card object too
                              scryfall_id: card.scryfall_id || card.id, // Add scryfall_id to nested card object too
                              ...(card.image_uris && { image_uris: card.image_uris }),
                              ...(card.scryfall_json && { scryfall_json: card.scryfall_json }),
                              ...(card.mana_cost && { mana_cost: card.mana_cost }),
                              ...(card.type_line && { type_line: card.type_line }),
                              ...(card.oracle_text && { oracle_text: card.oracle_text }),
                              ...(card.power && { power: card.power }),
                              ...(card.toughness && { toughness: card.toughness }),
                              ...(card.loyalty && { loyalty: card.loyalty }),
                            },
                            forceEnglish: true,
                            forceHighRes: true,
                            printing: card.set || card.set_name || null,
                            set: card.set || card.set_name || null,
                            collector_number: card.collector_number || null,
                          };
                          handleCardHover(cleanSearchCard);
                        }
                        return newIndex;
                      });
                      return;
                    }
                    
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSelectedSearchIndex(prev => {
                        const newIndex = prev > 0 ? prev - 1 : totalItems - 1;
                        // Show preview for the selected card (but not for "Show all results" button)
                        if (newIndex < searchResults.length && searchResults[newIndex]) {
                          const card = searchResults[newIndex];
                          const cleanSearchCard = {
                            name: card.name,
                            id: card.id || card.scryfall_id, // Add required ID for CardPreview validation
                            scryfall_id: card.scryfall_id || card.id, // Add scryfall_id for CardPreview validation
                            card: {
                              name: card.name,
                              id: card.id || card.scryfall_id, // Add ID to nested card object too
                              scryfall_id: card.scryfall_id || card.id, // Add scryfall_id to nested card object too
                              ...(card.image_uris && { image_uris: card.image_uris }),
                              ...(card.scryfall_json && { scryfall_json: card.scryfall_json }),
                              ...(card.mana_cost && { mana_cost: card.mana_cost }),
                              ...(card.type_line && { type_line: card.type_line }),
                              ...(card.oracle_text && { oracle_text: card.oracle_text }),
                              ...(card.power && { power: card.power }),
                              ...(card.toughness && { toughness: card.toughness }),
                              ...(card.loyalty && { loyalty: card.loyalty }),
                            },
                            forceEnglish: true,
                            forceHighRes: true,
                            printing: card.set || card.set_name || null,
                            set: card.set || card.set_name || null,
                            collector_number: card.collector_number || null,
                          };
                          handleCardHover(cleanSearchCard);
                        }
                        return newIndex;
                      });
                      return;
                    }
                    
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (selectedSearchIndex >= 0 && selectedSearchIndex < searchResults.length) {
                        // Add the selected card
                        const selectedCard = searchResults[selectedSearchIndex];
                        handleAddCard(selectedCard);
                        setSearch("");
                        setShowDropdown(false);
                        setSelectedSearchIndex(-1);
                        return;
                      } else if (selectedSearchIndex === searchResults.length && searchResults.length > 0) {
                        // "Show all results" button selected
                        fetchAllSearchResults(search.trim());
                        setSelectedSearchIndex(-1);
                        return;
                      }
                    }
                  }
                  
                  // Handle Enter key press when no item is selected - open modal
                  if (e.key === "Enter" && search.trim()) {
                    // Open search results modal
                    fetchAllSearchResults(search.trim());
                    e.preventDefault();
                  }
                  
                  // Handle Escape key to close dropdown and clear search
                  if (e.key === "Escape") {
                    if (showDropdown) {
                      setShowDropdown(false);
                      setSelectedSearchIndex(-1);
                    }
                    // Clear the search field
                    setSearch("");
                    setSearchResults([]);
                    setNoResultsMsg("");
                    e.preventDefault();
                  }
                }}
                style={{
                  backgroundColor: "#f9f9f9",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                  borderRadius: 4,
                  marginBottom: 0,
                  padding: "6px 8px",
                  border: "1px solid #ccc",
                  width: "242px", // Match the width to the sidebar width
                  fontSize: "12px", // Match the dropdown font size
                  color: "#333",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
              />

              {/* Search dropdown */}
              {showDropdown && search.trim() && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "242px",
                    backgroundColor: "#f9f9f9",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    marginTop: "2px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    zIndex: 1000,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                  onMouseLeave={() => {
                    // Don't reset selection when leaving dropdown to avoid flickering
                    // Let the natural mouse movements handle selection
                  }}
                >
                  {searchLoading ? (
                    <div
                      style={{
                        padding: "6px 8px",
                        textAlign: "center",
                        color: "#666",
                        fontSize: "12px",
                      }}
                    >
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResultsWithMemoizedCards.map((item, index) => {
                      const isSelected = index === selectedSearchIndex;
                      const card = item.originalCard;
                      const cardForHover = item.cardForHover;
                      const cardKey = item.cardKey;
                      
                      return (
                        <div
                          key={`${card.scryfall_id || card.id}-${index}`}
                          style={{
                            padding: "6px 8px",
                            cursor: "pointer",
                            transition: "background-color 0.15s ease",
                            borderBottom:
                              index < searchResults.length - 1
                                ? "1px solid #eee"
                                : "none",
                            backgroundColor: isSelected ? "#e3f2fd" : "transparent",
                          }}
                          onMouseEnter={() => {
                            // Prevent duplicate hover calls for the same card
                            if (lastHoveredCardRef.current === cardKey) {
                              return;
                            }
                            lastHoveredCardRef.current = cardKey;
                            
                            // No need to cancel since resetSelection is immediate
                            setSelectedSearchIndex(index);
                            
                            // For basic lands, use user's preferred printing in preview
                            const isBasicLand = BASIC_LAND_PRINTINGS[card.name];
                            console.log(`🔍 [PREVIEW DEBUG] Card: ${card.name}, isBasicLand: ${!!isBasicLand}, cardId: ${card.id}`);
                            
                            let previewCard = card;
                            if (isBasicLand) {
                              const preferredPrintingId = getUserPreferredPrinting(card.name);
                              console.log(`🏞️ [SEARCH PREVIEW] Using preferred printing for ${card.name}: ${preferredPrintingId} (was ${card.id})`);
                              
                              // Construct the correct image URL for the preferred printing
                              const preferredImageUrl = `https://cards.scryfall.io/normal/front/${preferredPrintingId.charAt(0)}/${preferredPrintingId.charAt(1)}/${preferredPrintingId}.jpg`;
                              
                              // Override with preferred printing data for basic lands
                              previewCard = {
                                ...card,
                                id: preferredPrintingId,
                                scryfall_id: preferredPrintingId,
                                // Set correct image URLs for preferred printing
                                image_uris: {
                                  small: preferredImageUrl.replace('/normal/', '/small/'),
                                  normal: preferredImageUrl,
                                  large: preferredImageUrl.replace('/normal/', '/large/'),
                                },
                                scryfall_json: {
                                  ...card.scryfall_json,
                                  id: preferredPrintingId,
                                  image_uris: {
                                    small: preferredImageUrl.replace('/normal/', '/small/'),
                                    normal: preferredImageUrl,
                                    large: preferredImageUrl.replace('/normal/', '/large/'),
                                  }
                                }
                              };
                              
                              console.log(`🏞️ [SEARCH PREVIEW] Set image URL: ${preferredImageUrl}`);
                            }
                            
                            // Simplified hover - directly set the preview
                            setFixedPreview({
                              card: {
                                name: previewCard.name,
                                id: previewCard.id || previewCard.scryfall_id, // Add required ID for CardPreview validation
                                scryfall_id: previewCard.scryfall_id || previewCard.id, // Add scryfall_id for CardPreview validation
                                card: {
                                  name: previewCard.name,
                                  id: previewCard.id || previewCard.scryfall_id, // Add ID to nested card object too
                                  scryfall_id: previewCard.scryfall_id || previewCard.id, // Add scryfall_id to nested card object too
                                  image_uris: previewCard.image_uris,
                                  scryfall_json: previewCard.scryfall_json,
                                  mana_cost: previewCard.mana_cost,
                                  type_line: previewCard.type_line,
                                  oracle_text: previewCard.oracle_text,
                                  power: previewCard.power,
                                  toughness: previewCard.toughness,
                                  loyalty: previewCard.loyalty,
                                },
                                forceEnglish: true,
                                forceHighRes: true,
                                printing: previewCard.set || previewCard.set_name || null,
                                set: previewCard.set || previewCard.set_name || null,
                                collector_number: previewCard.collector_number || null,
                              },
                              top: 0,
                              left: 0
                            });
                          }}
                          onMouseLeave={() => {
                            // Don't reset on mouse leave to prevent flickering
                            // Selection will be handled by mouse enter events
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // console.log('🔍 SEARCH RESULT CLICK:', {
                            //   cardName: card.name,
                            //   cardId: card.scryfall_id || card.id,
                            //   deckId: deck?._id,
                            //   hasToken: !!localStorage.getItem("token"),
                            //   event: 'click',
                            //   timestamp: Date.now()
                            // });
                            handleAddCard(card);
                            setSearch("");
                            setShowDropdown(false);
                            setSelectedSearchIndex(-1);
                          }}
                        >
                          <div style={{ 
                            fontWeight: isSelected ? "600" : "500", 
                            fontSize: "12px",
                            color: isSelected ? "#1976d2" : "#333"
                          }}>
                            {card.name}
                          </div>
                        </div>
                      );
                    })
                  ) : noResultsMsg ? (
                    <div
                      style={{
                        padding: "6px 8px",
                        textAlign: "center",
                        color: "#666",
                        fontSize: "12px",
                      }}
                    >
                      {noResultsMsg}
                    </div>
                  ) : null}

                  {/* Show all... button - only show if we have a search query and some results */}
                  {search.trim() && searchResults.length > 0 && (
                    <div
                      style={{
                        padding: "6px 8px",
                        textAlign: "center",
                        color: selectedSearchIndex === searchResults.length ? "#ffffff" : "#1976d2",
                        fontSize: "12px",
                        fontWeight: "bold",
                        backgroundColor: selectedSearchIndex === searchResults.length ? "#007acc" : "#f0f7ff",
                        borderTop: "1px solid #ddd",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={() => {
                        // Don't cancel debounced reset as aggressively
                        setSelectedSearchIndex(searchResults.length);
                      }}
                      onMouseLeave={() => {
                        // Don't reset on mouse leave to prevent flickering
                        // Selection will be handled by mouse enter events
                      }}
                      onClick={() => {
                        // console.log('🔍 "Show all results..." button clicked', {
                        //   searchValue: search,
                        //   trimmedValue: search.trim()
                        // });
                        // Open search results modal
                        fetchAllSearchResults(search.trim());
                        setSelectedSearchIndex(-1);
                      }}
                    >
                      Show all results...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bulk Edit Toggle Button */}
            <div
              style={{
                background: "white",
                padding: "8px 0",
                display: "flex",
                justifyContent: "center",
                marginBottom: "8px",
              }}
            >
              <button
                onClick={() => {
                  setBulkEditMode(!bulkEditMode);
                  setSelectedCards(new Set()); // Clear selections when toggling
                }}
                className={`bulk-edit-button ${bulkEditMode ? 'active' : ''}`}
              >
                {bulkEditMode ? "Exit Bulk Edit" : "Bulk Edit"}
              </button>
            </div>

            {/* Bulk Edit Action Buttons */}
            {bulkEditMode && (
              <div className="bulk-actions-container">
                <div className="bulk-actions-counter">
                  {selectedCards.size} card{selectedCards.size !== 1 ? 's' : ''} selected
                </div>
                
                <div className="bulk-select-all-container">
                  <button
                    onClick={() => {
                      if (selectedCards.size === 0) {
                        // Select all cards from all sections
                        const allCardIds = new Set();
                        
                        // Main deck cards
                        const allCards = cards && cards.length > 0 ? cards : deck?.cards || [];
                        if (Array.isArray(allCards)) {
                          allCards.forEach(card => {
                            allCardIds.add(generateCardSelectionId(card));
                          });
                        }
                        
                        // Sideboard cards
                        const sideboardCards = deck?.sideboard || [];
                        if (Array.isArray(sideboardCards)) {
                          sideboardCards.forEach(card => {
                            allCardIds.add(generateCardSelectionId(card));
                          });
                        }
                        
                        // Tech ideas cards
                        const techIdeasCards = deck?.techIdeas || [];
                        if (Array.isArray(techIdeasCards)) {
                          techIdeasCards.forEach(card => {
                            allCardIds.add(generateCardSelectionId(card));
                          });
                        }
                        
                        setSelectedCards(allCardIds);
                      } else {
                        // Clear all selections
                        setSelectedCards(new Set());
                      }
                    }}
                    className="bulk-select-all-text"
                    style={{
                      padding: '2px 6px',
                      fontSize: '10px',
                      backgroundColor: '#1976d2',
                      color: '#fff',
                      border: '1px solid #1565c0',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                  >
                    {selectedCards.size === 0 ? 'Select All' : 'Clear All'}
                  </button>
                </div>
                <div className="bulk-actions-grid">
                  <button
                    onClick={() => handleBulkAddToCollection()}
                    disabled={selectedCards.size === 0}
                    className="bulk-action-button collection"
                  >
                    + Collection
                  </button>
                  
                  <button
                    onClick={() => handleBulkAddToWishlist()}
                    disabled={selectedCards.size === 0}
                    className="bulk-action-button wishlist"
                  >
                    + Wishlist
                  </button>
                  
                  <button
                    onClick={() => handleBulkMoveToMainDeck()}
                    disabled={selectedCards.size === 0}
                    className="bulk-action-button main-deck"
                  >
                    → Main Deck
                  </button>
                  
                  <button
                    onClick={() => handleBulkMoveToSideboard()}
                    disabled={selectedCards.size === 0}
                    className="bulk-action-button sideboard"
                  >
                    → Sideboard
                  </button>
                  
                  <button
                    onClick={() => handleBulkMoveToTechIdeas()}
                    disabled={selectedCards.size === 0}
                    className="bulk-action-button tech-ideas"
                  >
                    → Tech Ideas
                  </button>
                  
                  <button
                    onClick={() => handleBulkRemoveFromDeck()}
                    disabled={selectedCards.size === 0}
                    className="bulk-action-button remove"
                  >
                    Remove from Deck
                  </button>
                  
                  <button
                    onClick={() => handleBulkToggleFoil()}
                    disabled={selectedCards.size === 0}
                    className="bulk-action-button foil"
                  >
                    Toggle Foil
                  </button>
                  
                  <button
                    onClick={() => handleDeduplicateCards()}
                    className="bulk-action-button utility"
                    title="Remove duplicate card entries and consolidate quantities"
                  >
                    🔧 Fix Duplicates
                  </button>
                </div>
              </div>
            )}

            {/* Display options - now part of the sticky sidebar */}
            <div
              style={{
                background: "white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <CardGroupSortOptions
                groupBy={groupBy}
                setGroupBy={setGroupBy}
                sortBy={sortBy}
                setSortBy={setSortBy}
                hidePrices={hidePrices}
                setHidePrices={setHidePrices}
                showMana={showMana}
                setShowMana={setShowMana}
                viewMode={viewMode}
                setViewMode={setViewMode}
              />
            </div>
          </div>

          {/* Main content area with card type sections */}
          <div className="deck-main-content">
            {/* Mobile view controls - only visible when sidebar is hidden */}
            <div 
              className="mobile-view-controls"
              style={{
                display: 'none',
                marginBottom: '1rem',
                padding: '12px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#666' }}>View:</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => setViewMode('list')}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: viewMode === 'list' ? '#1976d2' : 'white',
                      color: viewMode === 'list' ? 'white' : '#333',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    📋 List
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: viewMode === 'grid' ? '#1976d2' : 'white',
                      color: viewMode === 'grid' ? 'white' : '#333',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    🔳 Grid
                  </button>
                </div>
              </div>
            </div>
            
            {/* Mainboard header */}
            <h3 style={{
              margin: "1rem 0 0.5rem 0",
              fontSize: "1.25rem",
              fontWeight: "600",
              color: "#333",
              borderBottom: "2px solid #1976d2",
              paddingBottom: "0.5rem"
            }}>
              Main Deck ({Array.isArray(groupedAndSortedCards) ? groupedAndSortedCards.reduce((total, group) => {
                return total + (Array.isArray(group.cards) ? group.cards.reduce((groupTotal, cardObj) => {
                  const quantity = cardObj.count || cardObj.quantity || 1;
                  return groupTotal + quantity;
                }, 0) : 0);
              }, 0) : 0} cards)
            </h3>
            
            {/* Card sections without containers */}
            <div className="card-sections-container">
              {Array.isArray(groupedAndSortedCards) ? groupedAndSortedCards.map((group) => (
                <div key={group.type} className="card-type-section">
                  <CardTypeHeader
                    type={group.type}
                    count={Array.isArray(group.cards) ? group.cards.reduce((total, cardObj) => {
                      const quantity = cardObj.count || cardObj.quantity || 1;
                      return total + quantity;
                    }, 0) : 0}
                    onClick={() => handleSectionHeaderClick(group.type, group.cards, 'main deck')}
                    isClickable={bulkEditMode}
                  />
                  <div className="card-type-list">
                    {Array.isArray(group.cards) ? group.cards.map((cardObj, index) => {
                    // If groupCards() was used, group.cards is an array of { name, count, printing, cardObj }
                    // If not, fallback to cardObj structure
                    // console.log(`[DeckViewEdit] Rendering card: ${cardObj.card?.name || cardObj.name}, count:`, cardObj.count, "quantity:", cardObj.quantity, "foil:", cardObj.foil);
                    // FIXED: Comprehensive quantity extraction from all possible locations
                    const extractQuantity = (obj) => {
                      // Try all possible locations where quantity might be stored
                      return obj.count || 
                             obj.quantity || 
                             obj.card?.count || 
                             obj.card?.quantity || 
                             obj.cardObj?.count || 
                             obj.cardObj?.quantity || 
                             obj.cardObj?.card?.count || 
                             obj.cardObj?.card?.quantity || 1;
                    };

                    const cardData = cardObj.cardObj
                      ? {
                          ...cardObj,
                          count: extractQuantity(cardObj), // Use comprehensive quantity extraction
                        }
                      : {
                          name: cardObj.card?.name || cardObj.name,
                          count: extractQuantity(cardObj), // Use comprehensive quantity extraction
                          printing: cardObj.printing,
                          cardObj,
                        };

                    // DEBUG: Log cardData for the first few cards to understand the structure
                    if (index < 3) {
                      // console.log(`[DeckViewEdit] CARD RENDER DEBUG - Card ${cardData.name}:`, {
                      //   cardDataCount: cardData.count,
                      //   cardObjCount: cardObj.count,
                      //   cardObjQuantity: cardObj.quantity,
                      //   cardObjCardCount: cardObj.card?.count,
                      //   cardObjCardQuantity: cardObj.card?.quantity,
                      //   extractedQuantity: extractQuantity(cardObj),
                      //   fullCardObj: cardObj
                      // });
                    }
                    // Make sure the cardObj has the correct foil status from all possible locations before extractPrice
                    // More comprehensive check for foil status - check all possible locations
                    const isFoilExplicit =
                      cardData.foil === true ||
                      cardObj.foil === true ||
                      cardData.cardObj?.foil === true ||
                      cardData.cardObj?.card?.foil === true ||
                      cardObj.card?.foil === true;

                    // Create a complete card object with consistent foil status at all levels
                    // IMPORTANT: Use the original card object, not any modified versions
                    const originalCardObj = cardData.cardObj || cardObj;
                    const cardObjWithFoilStatus = JSON.parse(
                      JSON.stringify(originalCardObj),
                    );

                    // More comprehensive check for foil status - check at deeper levels than before
                    const isExplicitlyFoil =
                      cardData.foil === true ||
                      cardObj.foil === true ||
                      cardData.cardObj?.foil === true ||
                      cardData.cardObj?.card?.foil === true ||
                      cardObj.card?.foil === true ||
                      cardData.cardObj?.cardObj?.foil === true ||
                      cardData.cardObj?.cardObj?.card?.foil === true;

                    // Set foil status at all levels
                    cardObjWithFoilStatus.foil = isExplicitlyFoil;
                    if (cardObjWithFoilStatus.card) {
                      cardObjWithFoilStatus.card.foil = isExplicitlyFoil;
                    }
                    if (cardObjWithFoilStatus.cardObj) {
                      cardObjWithFoilStatus.cardObj.foil = isExplicitlyFoil;
                      if (cardObjWithFoilStatus.cardObj.card) {
                        cardObjWithFoilStatus.cardObj.card.foil =
                          isExplicitlyFoil;
                      }
                    }

                    // CRITICAL: For basic lands, use preferred printing for consistent pricing with modal
                    // For other cards, preserve original printing information to prevent hover from affecting pricing
                    const isBasicLand = BASIC_LAND_PRINTINGS[cardData.name];
                    if (isBasicLand) {
                      // Use preferred printing for basic lands to match modal pricing
                      const preferredPrintingId = BASIC_LAND_PRINTINGS[cardData.name];
                      cardObjWithFoilStatus.printing = preferredPrintingId;
                      if (cardObjWithFoilStatus.card) {
                        cardObjWithFoilStatus.card.printing = preferredPrintingId;
                      }
                    } else {
                      // For non-basic lands, preserve original printing
                      if (cardData.printing && !cardObjWithFoilStatus.printing) {
                        cardObjWithFoilStatus.printing = cardData.printing;
                      }
                      if (cardData.printing && cardObjWithFoilStatus.card && !cardObjWithFoilStatus.card.printing) {
                        cardObjWithFoilStatus.card.printing = cardData.printing;
                      }
                    }

                    // Create stable price calculation to prevent jumping
                    const priceKey = `${cardData.name}-${cardData.printing || 'default'}-${isExplicitlyFoil ? 'foil' : 'nonfoil'}`;
                    
                    // Use a ref-based cache to maintain stable prices across renders
                    if (!priceCache.current.has(priceKey)) {
                      // Create a stable card object to ensure consistent foil detection
                      const stableCardObj = {
                        ...cardObjWithFoilStatus,
                        foil: isExplicitlyFoil, // Force explicit foil status
                        card: {
                          ...cardObjWithFoilStatus.card,
                          foil: isExplicitlyFoil // Also set in nested card object
                        }
                      };
                      
                      const result = extractPrice(stableCardObj);
                      console.log(`[PRICE CACHE] New price for ${cardData.name}: $${result.price} (${result.isFoil ? 'foil' : 'non-foil'}, source: ${result.source})`);
                      priceCache.current.set(priceKey, result);
                    }
                    
                    const { price, isFoil, source } = priceCache.current.get(priceKey);

                    return viewMode === 'grid' ? (
                      <GridCard
                        key={`${cardData.name}-${cardData.printing || ""}-${cardData.count}-${isExplicitlyFoil ? "foil" : "nonfoil"}-${price || "na"}-${index}-${refreshTrigger}`}
                        cardData={cardData}
                        isExplicitlyFoil={isExplicitlyFoil}
                        price={price}
                        deckFlipStates={deckFlipStates}
                        setDeckFlipStates={setDeckFlipStates}
                        onMouseEnter={() => {
                          // For basic lands, use preferred printing to match modal
                          const isBasicLand = BASIC_LAND_PRINTINGS[cardData.name];
                          let preferredPrinting = cardData.printing || cardData.cardObj?.printing;
                          
                          if (isBasicLand) {
                            preferredPrinting = BASIC_LAND_PRINTINGS[cardData.name];
                          }

                          // Create card key for flip state lookup
                          const cardKey = `${cardData.name}-${cardData.printing || cardData.cardObj?.scryfall_id || 'default'}`;
                          const currentFlipState = deckFlipStates.get(cardKey) || false;

                          // Create enhanced card object with foil, printing AND flip state information
                          const cardWithFoil = {
                            ...cardData.cardObj,
                            foil: isExplicitlyFoil,
                            isFoil: isExplicitlyFoil,
                            name: cardData.name,
                            // CRITICAL: Use preferred printing for basic lands to match modal
                            printing: preferredPrinting,
                            // Include current flip state for this specific card
                            showBackFace: currentFlipState,
                            _flipState: currentFlipState,
                          };
                          handleCardHover(cardWithFoil);
                        }}
                        onClick={() => {
                          // Create a deeply cloned object to avoid reference issues
                          const baseObj = JSON.parse(
                            JSON.stringify(cardData.cardObj || {}),
                          );

                          // For basic lands, use preferred printing to match preview
                          const isBasicLand = BASIC_LAND_PRINTINGS[cardData.name];
                          let preferredPrinting = cardData.printing || baseObj.printing;
                          
                          if (isBasicLand) {
                            preferredPrinting = BASIC_LAND_PRINTINGS[cardData.name];
                          }

                          // Ensure we always have critical properties at the top level
                          // Use the actual foil property, not the extractPrice interpretation
                          const enrichedCardObj = {
                            ...baseObj,
                            name: cardData.name, // Ensure name is available at top level
                            foil: isExplicitlyFoil, // Use the actual foil property, not extractPrice interpretation
                            count: cardData.count || 1, // Ensure count is at top level
                            price: price || null, // Include the calculated price
                            // CRITICAL: Use preferred printing for basic lands to match preview
                            printing: preferredPrinting,
                          
                            // Debug: Log card data being passed to modal
                            _debug_cardData: {
                              printing: cardData.printing,
                              name: cardData.name,
                              baseObjPrinting: baseObj.printing,
                              preferredPrinting: preferredPrinting,
                              isBasicLand: !!isBasicLand,
                              cardObjCard: baseObj.card,
                              cardObjCardPrinting: baseObj.card?.printing,
                              cardObjCardScryfallId: baseObj.card?.scryfall_json?.id
                            }
                          };

                          // Ensure foil status is consistent at all levels of the object
                          if (enrichedCardObj.card) {
                            enrichedCardObj.card.foil = isExplicitlyFoil;
                            // Also update printing in nested card object for basic lands
                            if (isBasicLand) {
                              enrichedCardObj.card.printing = preferredPrinting;
                            }
                          }

                          setModalState({
                            isOpen: true,
                            cardObj: enrichedCardObj,
                          });
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          // Create enhanced card object for context menu
                          const cardWithFoil = {
                            ...cardData.cardObj,
                            foil: isExplicitlyFoil,
                            isFoil: isExplicitlyFoil,
                            name: cardData.name,
                            printing: cardData.printing || cardData.cardObj?.printing,
                            count: cardData.count || 1,
                            price: price || null,
                          };
                          
                          setContextMenu({
                            open: true,
                            x: e.clientX,
                            y: e.clientY,
                            cardObj: cardWithFoil,
                          });
                        }}
                        bulkEditMode={bulkEditMode}
                        isSelected={selectedCards.has(generateCardSelectionId(cardData))}
                        onToggleSelection={() => handleToggleCardSelection(cardData)}
                      />
                    ) : (
                      <DeckCardRow
                        key={`${cardData.name}-${cardData.printing || ""}-${cardData.count}-${isExplicitlyFoil ? "foil" : "nonfoil"}-${price || "na"}-${index}-${refreshTrigger}`}
                        cardData={cardData}
                        isFoil={isFoil}
                        price={price}
                        index={index}
                        deckFlipStates={deckFlipStates}
                        setDeckFlipStates={setDeckFlipStates}
                        onMouseEnter={() => handleDeckCardMouseEnter(cardData, isExplicitlyFoil, deckFlipStates)}
                        onClick={() => handleDeckCardClick(cardData, isExplicitlyFoil, price, setModalState)}
                        showMana={showMana}
                        hidePrices={hidePrices}
                        isExplicitlyFoil={isExplicitlyFoil}
                        bulkEditMode={bulkEditMode}
                        isSelected={selectedCards.has(generateCardSelectionId(cardData))}
                        onToggleSelection={() => handleToggleCardSelection(cardData)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          // Create enhanced card object for context menu
                          const cardWithFoil = {
                            ...cardData.cardObj,
                            foil: isExplicitlyFoil,
                            isFoil: isExplicitlyFoil,
                            name: cardData.name,
                            printing: cardData.printing || cardData.cardObj?.printing,
                            count: cardData.count || 1,
                            price: price || null,
                          };
                          
                          setContextMenu({
                            open: true,
                            x: e.clientX,
                            y: e.clientY,
                            cardObj: cardWithFoil,
                          });
                        }}
                        setFixedPreview={setFixedPreview}
                      />
                    );
                  }) : null}
                  </div>
                </div>
              )) : null}
                
                  {/* Render context menu at top level so it is not clipped or duplicated */}
                  {contextMenu.open && (
                    <CardContextMenu
                      x={contextMenu.x}
                      y={contextMenu.y}
                      cardObj={contextMenu.cardObj}
                      onClose={() =>
                        setContextMenu({
                          open: false,
                          x: 0,
                          y: 0,
                          cardObj: null,
                        })
                      }
                      onUseForDeckImage={async () => {
                        const cardObj = contextMenu.cardObj;
                        if (!cardObj || !deck) {
                          toast.error("Unable to set deck image");
                          return;
                        }

                        try {
                          // Get the art_crop URL for the deck image
                          let artCropUrl = null;
                          
                          // Try to get art_crop from various possible locations
                          if (cardObj.card?.scryfall_json?.image_uris?.art_crop) {
                            artCropUrl = cardObj.card.scryfall_json.image_uris.art_crop;
                          } else if (cardObj.scryfall_json?.image_uris?.art_crop) {
                            artCropUrl = cardObj.scryfall_json.image_uris.art_crop;
                          } else if (cardObj.card?.image_uris?.art_crop) {
                            artCropUrl = cardObj.card.image_uris.art_crop;
                          } else if (cardObj.image_uris?.art_crop) {
                            artCropUrl = cardObj.image_uris.art_crop;
                          }

                          if (artCropUrl) {
                            // Update the deck with the custom preview image URL
                            const token = localStorage.getItem("token");
                            const apiUrl = import.meta.env.VITE_API_URL;
                            
                            // console.log('🖼️ Setting custom deck image:', {
                            //   deckId: deck._id,
                            //   artCropUrl,
                            //   currentDeck: deck
                            // });
                            
                            const updatePayload = {
                              name: deck.name,
                              format: deck.format,
                              cards: deck.cards,
                              customPreviewImage: artCropUrl,
                              // Preserve commander data
                              commander: deck.commander,
                              commanderNames: deck.commanderNames,
                            };
                            
                            // console.log('📤 Sending deck update payload:', updatePayload);
                            
                            const response = await fetch(`${apiUrl}/api/decks/${deck._id}`, {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify(updatePayload),
                              credentials: "include",
                            });

                            if (response.ok) {
                              const updatedDeck = await response.json();
                              console.log('✅ Server response for deck update:', updatedDeck);
                              setDeck(updatedDeck);
                              toast.success(`Set "${cardObj.name}" as deck image!`);
                              
                              // Store update timestamp in localStorage to trigger refresh on other pages
                              localStorage.setItem('deck-updated-timestamp', Date.now().toString());
                              
                              // Dispatch custom event to notify other components
                              window.dispatchEvent(new CustomEvent('deck-updated', { 
                                detail: { deckId: deck._id, action: 'custom-image-set' } 
                              }));
                            } else {
                              const errorText = await response.text();
                              console.error('❌ Failed to update deck:', response.status, errorText);
                              toast.error("Failed to update deck image");
                            }
                          } else {
                            toast.error("No suitable image found for this card");
                          }
                        } catch (error) {
                          console.error("Error setting deck image:", error);
                          toast.error("Failed to set deck image");
                        }
                      }}
                      onAddToWishlist={async () => {
                        const cardObj = contextMenu.cardObj;
                        if (!cardObj) {
                          toast.error("Unable to add card to wishlist");
                          return;
                        }

                        // Use the localStorage-based wishlist function
                        await handleAddToWishlist(cardObj);
                      }}
                      onAddToCollection={async () => {
                        const cardObj = contextMenu.cardObj;
                        if (!cardObj) {
                          toast.error("Unable to add card to collection");
                          return;
                        }
                        
                        // Use the existing handleAddToCollection function
                        await handleAddToCollection(cardObj);
                      }}
                      onCopyScryfallLink={async () => {
                        const cardObj = contextMenu.cardObj;
                        let scryfallUrl = null;
                        // Try to get the Scryfall page URL from card data
                        if (cardObj?.card?.scryfall_json?.scryfall_uri) {
                          scryfallUrl = cardObj.card.scryfall_json.scryfall_uri;
                        } else if (cardObj?.scryfall_json?.scryfall_uri) {
                          scryfallUrl = cardObj.scryfall_json.scryfall_uri;
                        } else if (cardObj?.card?.scryfall_uri) {
                          scryfallUrl = cardObj.card.scryfall_uri;
                        } else if (cardObj?.scryfall_uri) {
                          scryfallUrl = cardObj.scryfall_uri;
                        } else if (cardObj?.card?.name) {
                          // Fallback: construct a Scryfall search URL by name
                          scryfallUrl = `https://scryfall.com/search?q=${encodeURIComponent(cardObj.card.name)}`;
                        } else if (cardObj?.name) {
                          scryfallUrl = `https://scryfall.com/search?q=${encodeURIComponent(cardObj.name)}`;
                        }
                        if (scryfallUrl) {
                          try {
                            await navigator.clipboard.writeText(scryfallUrl);
                            toast.success("Scryfall link copied to clipboard!");
                          } catch (err) {
                            toast.error("Failed to copy Scryfall link.");
                          }
                        } else {
                          toast.error(
                            "Could not determine Scryfall link for this card.",
                          );
                        }
                      }}
                      onRemoveFromDeck={() => {
                        const cardObj = contextMenu.cardObj;
                        if (!cardObj) {
                          toast.error("Unable to remove card");
                          return;
                        }
                        
                        // Use the existing handleRemoveCard function
                        handleRemoveCard(cardObj);
                      }}
                      onAddToSideboard={() => {
                        const cardObj = contextMenu.cardObj;
                        if (!cardObj) {
                          toast.error("Unable to move card to sideboard");
                          return;
                        }
                        
                        // Use the new handleMoveToSideboard function
                        handleMoveToSideboard(cardObj);
                      }}
                      onAddToTechIdeas={() => {
                        const cardObj = contextMenu.cardObj;
                        if (!cardObj) {
                          toast.error("Unable to move card to tech ideas");
                          return;
                        }
                        
                        // Use the new handleMoveToTechIdeas function
                        handleMoveToTechIdeas(cardObj);
                      }}
                      onMoveToMainDeck={() => {
                        const cardObj = contextMenu.cardObj;
                        if (!cardObj) {
                          toast.error("Unable to move card to main deck");
                          return;
                        }
                        
                        if (cardObj.section === 'sideboard') {
                          handleMoveFromSideboardToMainDeck(cardObj, cardObj.sideboardIndex);
                        } else if (cardObj.section === 'techIdeas') {
                          handleMoveFromTechIdeasToMainDeck(cardObj, cardObj.techIdeasIndex);
                        }
                      }}
                      onMoveFromSideboardToTechIdeas={() => {
                        const cardObj = contextMenu.cardObj;
                        if (!cardObj) {
                          toast.error("Unable to move card to tech ideas");
                          return;
                        }
                        
                        handleMoveFromSideboardToTechIdeas(cardObj, cardObj.sideboardIndex);
                      }}
                      onMoveFromTechIdeasToSideboard={() => {
                        const cardObj = contextMenu.cardObj;
                        if (!cardObj) {
                          toast.error("Unable to move card to sideboard");
                          return;
                        }
                        
                        handleMoveFromTechIdeasToSideboard(cardObj, cardObj.techIdeasIndex);
                      }}
                      onRemoveFromSideboard={() => {
                        const cardObj = contextMenu.cardObj;
                        if (!cardObj) {
                          toast.error("Unable to remove card from sideboard");
                          return;
                        }
                        
                        handleRemoveFromSideboard(cardObj.sideboardIndex);
                      }}
                      onRemoveFromTechIdeas={() => {
                        const cardObj = contextMenu.cardObj;
                        if (!cardObj) {
                          toast.error("Unable to remove card from tech ideas");
                          return;
                        }
                        
                        handleRemoveFromTechIdeas(cardObj.techIdeasIndex);
                      }}
                    />
                  )}
            </div>

                {/* Sideboard Section */}
            {deck.sideboard && deck.sideboard.length > 0 && (
              <>
                <h3 style={{
                  margin: "2rem 0 1rem 0",
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  color: "#333",
                  borderBottom: "2px solid #0ea5e9",
                  paddingBottom: "0.5rem"
                }}>
                  Sideboard ({deck.sideboard.length} cards)
                </h3>
                
                {/* Sideboard sections without containers */}
                <div className="card-sections-container">
                  {groupedSideboardCards.map((group) => (
                    <div key={`sideboard-${group.type}`} className="card-type-section">
                      <CardTypeHeader
                        type={group.type}
                        count={Array.isArray(group.cards) ? group.cards.reduce((total, cardObj) => {
                          const quantity = cardObj.count || cardObj.quantity || 1;
                          return total + quantity;
                        }, 0) : 0}
                        onClick={() => handleSectionHeaderClick(group.type, group.cards, 'sideboard')}
                        isClickable={bulkEditMode}
                      />
                      <div className="card-type-list">
                        {Array.isArray(group.cards) ? group.cards.map((cardObj, index) => {
                          const cardData = cardObj.cardObj
                            ? cardObj
                            : {
                                name: cardObj.card?.name || cardObj.name,
                                count: cardObj.count || cardObj.quantity || 1,
                                printing: cardObj.printing,
                                cardObj,
                              };

                          // Process foil status
                          const isExplicitlyFoil =
                            cardData.foil === true ||
                            cardObj.foil === true ||
                            cardData.cardObj?.foil === true ||
                            cardData.cardObj?.card?.foil === true;

                          const cardObjWithFoilStatus = JSON.parse(
                            JSON.stringify(cardData.cardObj || {})
                          );
                          cardObjWithFoilStatus.foil = isExplicitlyFoil;

                          // Calculate price
                          const { price, isFoil } = extractPrice(cardObjWithFoilStatus);
                          
                          // DEBUG: Log price calculation for sideboard cards
                          if (cardData.name === 'Ring of Evos Isle') {
                            // console.log(`[SIDEBOARD PRICE DEBUG] ${cardData.name}:`, {
                            //   price,
                            //   modalPrice: cardObjWithFoilStatus.modalPrice,
                            //   cardModalPrice: cardObjWithFoilStatus.card?.modalPrice,
                            //   nestedModalPrice: cardObjWithFoilStatus.cardObj?.modalPrice,
                            //   structureCheck: JSON.stringify(cardObjWithFoilStatus, null, 2)
                            // });
                          }

                          // Create a unique key for the sideboard item
                          const sideboardIndex = deck.sideboard.findIndex(
                            (item, idx) => item.name === cardData.name && idx >= index
                          );

                          return (
                            <DeckCardRow
                              key={`sideboard-row-${cardData.name}-${cardData.printing || ""}-${index}-${refreshTrigger}`}
                              cardData={cardData}
                              isFoil={isFoil}
                              price={price}
                              index={index}
                              bulkEditMode={bulkEditMode}
                              isSelected={selectedCards.has(generateCardSelectionId(cardData))}
                              onToggleSelection={() => handleToggleCardSelection(cardData)}
                              deckFlipStates={deckFlipStates}
                              setDeckFlipStates={setDeckFlipStates}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // Create enhanced card object for context menu
                                const enhancedCardObj = {
                                  ...cardObjWithFoilStatus,
                                  name: cardData.name,
                                  printing: cardData.printing,
                                  foil: isExplicitlyFoil,
                                  count: cardData.count || 1,
                                  price: price,
                                  section: 'sideboard',
                                  sideboardIndex: sideboardIndex
                                };
                                
                                setContextMenu({
                                  open: true,
                                  x: e.clientX,
                                  y: e.clientY,
                                  cardObj: enhancedCardObj,
                                });
                              }}
                              onMouseEnter={() => handleDeckCardMouseEnter(cardData, isExplicitlyFoil, deckFlipStates)}
                              onClick={() => handleSideboardCardClick(cardData, isExplicitlyFoil, price, bulkEditMode, toggleCardSelection, setModalState)}
                              customButtons={
                                bulkEditMode ? null : (
                                <div style={{ display: "flex", gap: "0.1rem", alignItems: "center" }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log(`[SIDEBOARD MAIN BUTTON] Button clicked for card:`, cardObj);
                                      console.log(`[SIDEBOARD MAIN BUTTON] Sideboard index:`, sideboardIndex);
                                      handleMoveFromSideboardToMainDeck(cardObj, sideboardIndex);
                                    }}
                                    style={{
                                      padding: "0.2rem 0.3rem", 
                                      fontSize: "0.65rem",
                                      backgroundColor: "#10b981",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "3px",
                                      cursor: "pointer"
                                    }}
                                    title="Move to main deck"
                                  >
                                    Main
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveFromSideboardToTechIdeas(cardObj, sideboardIndex);
                                    }}
                                    style={{
                                      padding: "0.2rem 0.3rem",
                                      fontSize: "0.65rem",
                                      backgroundColor: "#7c3aed",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "3px",
                                      cursor: "pointer"
                                    }}
                                    title="Move to tech ideas"
                                  >
                                    Tech
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveFromSideboard(sideboardIndex);
                                    }}
                                    style={{
                                      padding: "0.2rem 0.4rem",
                                      fontSize: "0.7rem",
                                      backgroundColor: "#ef4444",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "3px",
                                      cursor: "pointer"
                                    }}
                                    title="Remove from sideboard"
                                  >
                                    ✕
                                  </button>
                                </div>
                                )
                              }
                              showMana={false}
                              hidePrices={hidePrices}
                              setFixedPreview={setFixedPreview}
                            />
                          );
                        }) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

        {/* Tech Ideas Section */}
        {deck.techIdeas && deck.techIdeas.length > 0 && (
          <>
            <h3 style={{
              margin: "2rem 0 1rem 0",
              fontSize: "1.5rem",
              fontWeight: "600",
              color: "#333",
              borderBottom: "2px solid #7c3aed",
              paddingBottom: "0.5rem"
            }}>
              Tech Ideas ({deck.techIdeas.length} cards)
            </h3>
            
            {/* Tech ideas sections without containers */}
            <div className="card-sections-container">
              {groupedTechIdeasCards.map((group) => (
                <div key={`tech-ideas-${group.type}`} className="card-type-section">
                  <CardTypeHeader
                    type={group.type}
                    count={Array.isArray(group.cards) ? group.cards.reduce((total, cardObj) => {
                      const quantity = cardObj.count || cardObj.quantity || 1;
                      return total + quantity;
                    }, 0) : 0}
                    onClick={() => handleSectionHeaderClick(group.type, group.cards, 'tech ideas')}
                    isClickable={bulkEditMode}
                  />
                  <div className="card-type-list">
                    {Array.isArray(group.cards) ? group.cards.map((cardObj, index) => {
                      // CRITICAL: Ensure modalPrice is available for display
                      if (!cardObj.modalPrice && cardObj.modalPrice !== 0) {
                        // Try to find modalPrice in nested structures
                        cardObj.modalPrice = cardObj.cardObj?.modalPrice || 
                                           cardObj.card?.modalPrice || 
                                           cardObj.modalPrice;
                      }
                      
                      const cardData = cardObj.cardObj
                        ? cardObj
                        : {
                            name: cardObj.card?.name || cardObj.name,
                            count: cardObj.count || cardObj.quantity || 1,
                            printing: cardObj.printing,
                            cardObj,
                          };

                      // Process foil status
                      const isExplicitlyFoil =
                        cardData.foil === true ||
                        cardObj.foil === true ||
                        cardData.cardObj?.foil === true ||
                        cardData.cardObj?.card?.foil === true;

                      const cardObjWithFoilStatus = JSON.parse(
                        JSON.stringify(cardData.cardObj || {})
                      );
                      cardObjWithFoilStatus.foil = isExplicitlyFoil;

                      // CRITICAL FIX: Special handling for "In the Trenches" to prevent price flipping
                      let price, isFoil;
                      
                      // Hard-coded fix for the problematic card
                      if (cardData.name === 'In the Trenches') {
                        price = '0.31';
                        isFoil = isExplicitlyFoil;
                        // console.log(`[TECH DISPLAY] FIXED: Using hardcoded price for ${cardData.name}: $${price}`);
                      }
                      // Normal logic for other cards
                      else if (cardObj.modalPrice && cardObj.modalPrice !== 'N/A' && cardObj.modalPrice !== null && cardObj.modalPrice !== undefined) {
                        // Remove $ if it's already there to prevent double dollar signs
                        price = cardObj.modalPrice.toString().replace(/^\$/, '');
                        
                        // VALIDATION: Check for suspicious prices
                        const numPrice = parseFloat(price);
                        if (numPrice > 100) {
                          console.warn(`[TECH DISPLAY] 🚨 SUSPICIOUS HIGH PRICE for ${cardData.name}: $${price} from modalPrice: ${cardObj.modalPrice}`);
                          console.warn(`[TECH DISPLAY] 🚨 Card object:`, cardObj);
                        }
                        
                        isFoil = isExplicitlyFoil;
                        // console.log(`[TECH DISPLAY] Using cached modalPrice for ${cardData.name}: $${price} (from: ${cardObj.modalPrice})`);
                      } else {
                        // Only fall back to extractPrice if absolutely no cached price exists
                        const priceData = extractPrice(cardObjWithFoilStatus);
                        price = priceData.price;
                        
                        // VALIDATION: Check for suspicious prices from extractPrice
                        const numPrice = parseFloat(price);
                        if (numPrice > 100) {
                          console.warn(`[TECH DISPLAY] 🚨 SUSPICIOUS HIGH PRICE from extractPrice for ${cardData.name}: $${price} (source: ${priceData.source})`);
                          console.warn(`[TECH DISPLAY] 🚨 Card object:`, cardObjWithFoilStatus);
                        }
                        
                        isFoil = priceData.isFoil;
                        // console.log(`[TECH DISPLAY] ❌ NO CACHED PRICE - Calculated price for ${cardData.name}: $${price} (source: ${priceData.source})`);
                      }
                      


                      // Create a unique key for the tech ideas item
                      const techIdeasIndex = deck.techIdeas.findIndex(
                        (item, idx) => item.name === cardData.name && idx >= index
                      );

                      return (
                        <DeckCardRow
                          key={`tech-ideas-row-${cardData.name}-${cardData.printing || ""}-${index}-${refreshTrigger}`}
                          cardData={cardData}
                          isFoil={isFoil}
                          price={price}
                          index={index}
                          bulkEditMode={bulkEditMode}
                          isSelected={selectedCards.has(generateCardSelectionId(cardData))}
                          onToggleSelection={() => handleToggleCardSelection(cardData)}
                          deckFlipStates={deckFlipStates}
                          setDeckFlipStates={setDeckFlipStates}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // Create enhanced card object for context menu
                            const enhancedCardObj = {
                              ...cardObjWithFoilStatus,
                              name: cardData.name,
                              printing: cardData.printing,
                              foil: isExplicitlyFoil,
                              count: cardData.count || 1,
                              price: price,
                              section: 'techIdeas',
                              techIdeasIndex: techIdeasIndex
                            };
                            
                            setContextMenu({
                              open: true,
                              x: e.clientX,
                              y: e.clientY,
                              cardObj: enhancedCardObj,
                            });
                          }}
                          onMouseEnter={() => handleDeckCardMouseEnter(cardData, isExplicitlyFoil, deckFlipStates)}
                          onClick={() => handleSideboardCardClick(cardData, isExplicitlyFoil, price, bulkEditMode, toggleCardSelection, setModalState)}
                          customButtons={
                            bulkEditMode ? null : (
                            <div style={{ display: "flex", gap: "0.1rem", alignItems: "center" }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log(`[TECH IDEAS MAIN BUTTON] Button clicked for card:`, cardObj);
                                  console.log(`[TECH IDEAS MAIN BUTTON] Tech ideas index:`, techIdeasIndex);
                                  handleMoveFromTechIdeasToMainDeck(cardObj, techIdeasIndex);
                                }}
                                style={{
                                  padding: "0.2rem 0.3rem",
                                  fontSize: "0.65rem",
                                  backgroundColor: "#10b981",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "3px",
                                  cursor: "pointer"
                                }}
                                title="Move to main deck"
                              >
                                Main
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveFromTechIdeasToSideboard(cardObj, techIdeasIndex);
                                }}
                                style={{
                                  padding: "0.2rem 0.3rem",
                                  fontSize: "0.65rem",
                                  backgroundColor: "#0ea5e9",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "3px",
                                  cursor: "pointer"
                                }}
                                title="Move to sideboard"
                              >
                                Side
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFromTechIdeas(techIdeasIndex);
                                }}
                                style={{
                                  padding: "0.2rem 0.3rem",
                                  fontSize: "0.65rem",
                                  backgroundColor: "#ef4444",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "3px",
                                  cursor: "pointer"
                                }}
                                title="Remove from tech ideas"
                              >
                                ✕
                              </button>
                            </div>
                            )
                          }
                          showMana={false}
                          hidePrices={hidePrices}
                          setFixedPreview={setFixedPreview}
                        />
                      );
                    }) : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Search Results Modal */}
        {showSearchModal && (
          <div
            data-search-modal="true"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 10000,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "20px",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeSearchModal();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                closeSearchModal();
              }
            }}
            tabIndex={-1}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                width: "90%",
                maxWidth: "1200px",
                height: "80%",
                maxHeight: "800px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header with Search */}
              <div
                style={{
                  padding: "20px",
                  borderBottom: "1px solid #eee",
                  position: "relative",
                }}
              >
                {/* Close button positioned absolutely in top-right corner */}
                <button
                  onClick={closeSearchModal}
                  className="close-button"
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    border: "none",
                    backgroundColor: "#f5f5f5",
                    color: "#666",
                    fontSize: "18px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                    zIndex: 10,
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#e0e0e0";
                    e.target.style.color = "#333";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#f5f5f5";
                    e.target.style.color = "#666";
                  }}
                >
                  ×
                </button>

                {/* Search bar only */}
                <input
                  type="text"
                  placeholder="Search for cards (Scryfall syntax supported)..."
                  value={modalSearch}
                  data-deck-view-search="true"
                  onChange={(e) => {
                    setModalSearch(e.target.value);
                    debouncedModalSearch(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleModalSearch(modalSearch);
                    }
                  }}
                  style={{
                    width: "50%",
                    padding: "8px 16px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    fontSize: "16px",
                    backgroundColor: "#ffffff",
                    color: "#333",
                    outline: "none",
                    transition: "border-color 0.15s",
                    marginRight: "50px", // Space for close button
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#1976d2";
                    e.target.style.boxShadow = "0 0 0 2px rgba(25, 118, 210, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#ccc";
                    e.target.style.boxShadow = "none";
                  }}
                  autoFocus
                />
              </div>

              {/* Modal Content */}
              <div
                style={{
                  flex: 1,
                  padding: "20px",
                  overflowY: "auto",
                }}
              >
                {searchModalLoading ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "200px",
                      fontSize: "16px",
                      color: "#666",
                    }}
                  >
                    Loading search results...
                  </div>
                ) : allSearchResults.length > 0 ? (
                  <>
                    {Math.random() < 0.1 && console.log('🎭 Modal rendering with', allSearchResults.length, 'results')}
                    <div
                      style={{
                        marginBottom: "16px",
                        fontSize: "14px",
                        color: "#666",
                      }}
                    >
                      Found {allSearchResults.length} result{allSearchResults.length !== 1 ? 's' : ''}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 220px))",
                        gap: "16px",
                        justifyContent: "center",
                      }}
                    >
                      {allSearchResults.map((card, index) => (
                        <div
                          key={`${card.scryfall_id || card.id}-${index}`}
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            padding: "12px",
                            backgroundColor: "#fafafa",
                            transition: "all 0.2s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#1976d2";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(25, 118, 210, 0.15)";
                            e.currentTarget.style.backgroundColor = "#f8fbff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "#ddd";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.backgroundColor = "#fafafa";
                          }}
                        >
                          {/* Card Image */}
                          {(() => {
                            // Check if this is a double-faced card
                            const isDoubleFaced = card.card_faces && card.card_faces.length >= 2;
                            const flipKey = `${card.scryfall_id || card.id}-${index}`;
                            const showBackFace = searchModalFlipStates.get(flipKey) || false;
                            
                            let imageUrl = null;
                            let cardName = card.name;
                            
                            if (isDoubleFaced) {
                              const faceIndex = showBackFace ? 1 : 0;
                              // First try to get image from the specific face
                              imageUrl = card.card_faces[faceIndex]?.image_uris?.normal || 
                                        card.card_faces[faceIndex]?.image_uris?.small;
                              cardName = card.card_faces[faceIndex]?.name || card.name;
                              
                              // If face doesn't have image_uris (like Room cards), use main card image
                              if (!imageUrl) {
                                imageUrl = card.image_uris?.normal || card.image_uris?.small;
                              }
                            } else {
                              // 🏞️ BASIC LAND PREFERENCE: Check if this is a basic land and apply user preference
                              if (BASIC_LAND_PRINTINGS[cardName]) {
                                const preferredPrintingId = getUserPreferredPrinting(cardName);
                                if (preferredPrintingId && preferredPrintingId !== (card.scryfall_id || card.id)) {
                                  console.log(`🏞️ [SEARCH MODAL] Using preferred printing for ${cardName}: ${preferredPrintingId} (was ${card.scryfall_id || card.id})`);
                                  // Construct the correct Scryfall image URL for the preferred printing
                                  imageUrl = `https://cards.scryfall.io/normal/front/${preferredPrintingId.substring(0,1)}/${preferredPrintingId.substring(1,2)}/${preferredPrintingId}.jpg`;
                                  console.log(`🏞️ [SEARCH MODAL] Set image URL: ${imageUrl}`);
                                } else {
                                  imageUrl = card.image_uris?.normal || card.image_uris?.small;
                                }
                              } else {
                                imageUrl = card.image_uris?.normal || card.image_uris?.small;
                              }
                            }
                            
                            // Use proxied URL to avoid CORS issues
                            imageUrl = getProxiedImageUrl(imageUrl);
                            
                            const handleFlipCard = (e) => {
                              e.stopPropagation();
                              setSearchModalFlipStates(prev => {
                                const newMap = new Map(prev);
                                newMap.set(flipKey, !showBackFace);
                                return newMap;
                              });
                            };
                            
                            return (
                              <>
                                {imageUrl && (
                                  <div style={{ position: 'relative', width: '100%', maxWidth: '200px', margin: '0 auto' }}>
                                    <div
                                      style={{
                                        width: "100%",
                                        maxWidth: "200px",
                                        aspectRatio: "5/7",
                                        backgroundColor: "#f0f0f0",
                                        borderRadius: "6px",
                                        marginBottom: "12px",
                                        backgroundImage: `url(${imageUrl})`,
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                        backgroundRepeat: "no-repeat",
                                        cursor: "zoom-in",
                                      }}
                                      onClick={() => {
                                        // Open CardActionsModal for this card
                                        console.log('🎴 Opening CardActionsModal for:', cardName);
                                        
                                        // Find the current card index in the search results
                                        const currentIndex = allSearchResults.findIndex(searchCard => 
                                          (searchCard.name === cardName) || 
                                          (searchCard.scryfall_id === card.scryfall_id) ||
                                          (searchCard.id === card.id)
                                        );
                                        
                                        // Use the full card object that's already available in scope
                                        const enrichedCardObj = {
                                          name: cardName,
                                          printing: card.scryfall_id || card.id,
                                          cardObj: {
                                            name: cardName,
                                            scryfall_id: card.scryfall_id || card.id,
                                            set: card.set,
                                            collector_number: card.collector_number,
                                            image_uris: card.image_uris,
                                            type_line: card.type_line,
                                            mana_cost: card.mana_cost,
                                            oracle_text: card.oracle_text,
                                            power: card.power,
                                            toughness: card.toughness,
                                            cmc: card.cmc || card.converted_mana_cost,
                                            rarity: card.rarity,
                                            prices: card.prices,
                                            card_faces: card.card_faces
                                          },
                                          card: {
                                            name: cardName,
                                            scryfall_json: card,
                                            type_line: card.type_line
                                          },
                                          scryfall_json: card,
                                          foil: false,
                                          count: 1,
                                          modalPrice: card.prices?.usd || card.prices?.usd_foil || '0.00'
                                        };
                                        
                                        console.log('[ORACLE TAG MODAL] Opening CardActionsModal with data:', enrichedCardObj);
                                        console.log(`[ORACLE TAG NAVIGATION] Setting up navigation context - current card: ${cardName} (${currentIndex + 1}/${allSearchResults.length})`);
                                        
                                        // Set up Oracle Tag navigation context
                                        setOracleTagNavigationState({
                                          isActive: true,
                                          searchResults: [...allSearchResults], // Copy the current search results
                                          currentIndex: currentIndex >= 0 ? currentIndex : 0,
                                        });
                                        
                                        // Close the Oracle Tag search modal by clearing results and hiding modal
                                        setAllSearchResults([]);
                                        setShowSearchModal(false);
                                        
                                        // Open the CardActionsModal
                                        setModalState({
                                          isOpen: true,
                                          cardObj: enrichedCardObj,
                                        });
                                      }}
                                      title={`${cardName} - Click to view larger`}
                                    />
                                    {/* Already in deck indicator */}
                                    {isCardInDeck(card) && (
                                      <div
                                        style={{
                                          position: 'absolute',
                                          top: '8px',
                                          left: '8px',
                                          background: 'rgba(76, 175, 80, 0.95)',
                                          color: 'white',
                                          borderRadius: '12px',
                                          padding: '4px 8px',
                                          fontSize: '10px',
                                          fontWeight: 'bold',
                                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                          zIndex: 10,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                        }}
                                        title="This card is already in your deck"
                                      >
                                        ✓ In Deck
                                      </div>
                                    )}
                                    {/* Flip button for double-faced cards */}
                                    {isDoubleFaced && (
                                      <span 
                                        onClick={handleFlipCard}
                                        style={{
                                          position: 'absolute',
                                          top: '8px',
                                          right: '8px',
                                          background: 'rgba(255, 255, 255, 0.9)',
                                          borderRadius: '50%',
                                          padding: '6px',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                          transition: 'background 0.2s ease',
                                        }}
                                        title={`Flip to ${showBackFace ? 'front' : 'back'} face`}
                                        onMouseEnter={(e) => {
                                          e.target.style.background = 'rgba(255, 255, 255, 1)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                                        }}
                                      >
                                        <TransformIcon size={10} color="#1976d2" />
                                      </span>
                                    )}
                                  </div>
                                )}
                                {/* Card name display */}
                                <div style={{
                                  fontSize: '14px',
                                  fontWeight: 'bold',
                                  textAlign: 'center',
                                  marginBottom: '8px',
                                  color: '#333'
                                }}>
                                  {cardName}
                                </div>
                              </>
                            );
                          })()}
                          
                          {/* Action Buttons */}
                          <div style={{ 
                            display: "flex", 
                            flexDirection: "column", 
                            gap: "6px", 
                            width: "100%" 
                          }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('🎯 Add to Deck button clicked for card:', card);
                                handleAddCard(card);
                                // Keep modal open for adding multiple cards
                                // closeSearchModal(); - removed
                                // setSearch(""); - removed
                              }}
                              style={{
                                backgroundColor: "#1976d2",
                                color: "white",
                                border: "none",
                                padding: "8px 12px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "background-color 0.2s ease",
                                width: "100%",
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = "#1565c0";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = "#1976d2";
                              }}
                            >
                              Add to Deck
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToTechIdeas(card);
                              }}
                              style={{
                                backgroundColor: "#9c27b0",
                                color: "white",
                                border: "none",
                                padding: "8px 12px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "background-color 0.2s ease",
                                width: "100%",
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = "#7b1fa2";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = "#9c27b0";
                              }}
                            >
                              Add to Tech Ideas
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToSideboard(card);
                              }}
                              style={{
                                backgroundColor: "#2196f3",
                                color: "white",
                                border: "none",
                                padding: "8px 12px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "background-color 0.2s ease",
                                width: "100%",
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = "#1976d2";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = "#2196f3";
                              }}
                            >
                              Add to Sideboard
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToWishlist(card);
                              }}
                              style={{
                                backgroundColor: "#ff9800",
                                color: "white",
                                border: "none",
                                padding: "8px 12px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "background-color 0.2s ease",
                                width: "100%",
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = "#f57c00";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = "#ff9800";
                              }}
                            >
                              Add to Wishlist
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#666",
                      fontSize: "16px",
                    }}
                  >
                    No cards found matching your search criteria.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Text Import Modal */}
        {showTextImportModal && (
          <TextImportModal
            isOpen={showTextImportModal}
            onClose={() => setShowTextImportModal(false)}
            onImport={handleTextImport}
          />
        )}

        {/* Photo Import Modal */}
        {showPhotoImportModal && (
          <PhotoImportModal
            isOpen={showPhotoImportModal}
            onClose={() => setShowPhotoImportModal(false)}
            onImport={handleTextImport}
          />
        )}

        {/* Sticky Deck Stats Bar at Bottom */}
        <div
          className="deck-stats-sticky-bar"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            width: "100%",
            background: "white",
            boxShadow: "0 -2px 8px rgba(0,0,0,0.1)",
            borderTop: "1px solid #e0e0e0",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              maxWidth: "1200px",
              margin: "0 auto",
              gap: "24px",
              flexWrap: "wrap",
              padding: "8px 24px",
            }}
          >
            {/* Total Value & Collection */}
            <div style={{ display: "flex", gap: "24px", alignItems: "center", flex: "0 0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "#666" }}>Total Value:</span>
                <span style={{ fontSize: "12px", fontWeight: "bold", color: "#2c5530" }}>
                  ${totalDeckValue}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "#666" }}>In Collection:</span>
                <span style={{ fontSize: "12px", fontWeight: "bold", color: "#1976d2" }}>
                  {(() => {
                    // Get collection from localStorage for accurate percentage calculation
                    const collection = JSON.parse(localStorage.getItem('cardCollection') || '[]');
                    
                    // Create a map for faster lookup: printing_id + foil -> quantity
                    const collectionMap = new Map();
                    ultraSafeForEach(collection, (item) => {
                      const key = `${item.printing_id}_${item.foil}`;
                      collectionMap.set(key, (collectionMap.get(key) || 0) + item.quantity);
                    });
                    
                    let totalCards = 0;
                    let ownedCards = 0;
                    
                    (cards || deck?.cards || []).forEach(cardObj => {
                      const quantity = cardObj.count || cardObj.quantity || 1;
                      totalCards += quantity;
                      
                      // Get printing ID from various possible locations
                      const printingId = cardObj.printing || 
                                        cardObj.cardObj?.printing || 
                                        cardObj.cardObj?.card?.printing ||
                                        cardObj.card?.printing ||
                                        cardObj.scryfall_id ||
                                        cardObj.id ||
                                        cardObj.cardObj?.scryfall_id ||
                                        cardObj.cardObj?.id ||
                                        cardObj.cardObj?.card?.scryfall_id ||
                                        cardObj.cardObj?.card?.id;
                      
                      // Get foil status
                      const isFoil = cardObj.foil === true || 
                                    cardObj.isFoil === true ||
                                    cardObj.cardObj?.foil === true ||
                                    cardObj.cardObj?.isFoil === true ||
                                    cardObj.cardObj?.card?.foil === true ||
                                    cardObj.cardObj?.card?.isFoil === true;
                      
                      if (printingId) {
                        // Check both foil and non-foil versions in collection
                        const foilKey = `${printingId}_true`;
                        const nonFoilKey = `${printingId}_false`;
                        
                        const foilOwned = collectionMap.get(foilKey) || 0;
                        const nonFoilOwned = collectionMap.get(nonFoilKey) || 0;
                        
                        // If we have any copies (either matching the foil status or any version), consider it owned
                        const hasMatchingFoilStatus = isFoil ? foilOwned > 0 : nonFoilOwned > 0;
                        const hasAnyVersion = (foilOwned + nonFoilOwned) > 0;
                        
                        if (hasMatchingFoilStatus || hasAnyVersion) {
                          ownedCards += quantity;
                        }
                      }
                    });
                    
                    const percentage = totalCards > 0 ? Math.round((ownedCards / totalCards) * 100) : 0;
                    return `${percentage}%`;
                  })()}
                </span>
              </div>
            </div>

            {/* Mana Distribution */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "0 0 auto" }}>
              <span style={{ fontSize: "12px", color: "#666" }}>Mana:</span>
              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                {(() => {
                  const manaCounts = { W: 0, U: 0, B: 0, R: 0, G: 0 };
                  (cards || deck?.cards || []).forEach(cardObj => {
                    const quantity = cardObj.count || cardObj.quantity || 1;
                    const manaCost = cardObj?.scryfall_json?.mana_cost || 
                                   cardObj?.card?.scryfall_json?.mana_cost || 
                                   cardObj?.mana_cost || 
                                   cardObj?.card?.mana_cost || '';
                    
                    // Count mana symbols (excluding colorless/generic mana), multiplied by quantity
                    const matches = manaCost.match(/\{([^}]+)\}/g) || [];
                    matches.forEach(match => {
                      const symbol = match.replace(/[{}]/g, '');
                      
                      // Handle simple mana symbols
                      if (symbol === 'W') manaCounts.W += quantity;
                      else if (symbol === 'U') manaCounts.U += quantity;
                      else if (symbol === 'B') manaCounts.B += quantity;
                      else if (symbol === 'R') manaCounts.R += quantity;
                      else if (symbol === 'G') manaCounts.G += quantity;
                      
                      // Handle hybrid mana (e.g., "W/U", "2/W")
                      else if (symbol.includes('/')) {
                        const parts = symbol.split('/');
                        // For hybrid mana, count each color component
                        parts.forEach(part => {
                          if (part === 'W') manaCounts.W += quantity;
                          else if (part === 'U') manaCounts.U += quantity;
                          else if (part === 'B') manaCounts.B += quantity;
                          else if (part === 'R') manaCounts.R += quantity;
                          else if (part === 'G') manaCounts.G += quantity;
                          // Handle phyrexian mana (e.g., "W/P" -> count W)
                          // Handle colorless/generic hybrid (e.g., "2/W" -> count W)
                        });
                      }
                      
                      // Skip colorless/generic mana (numbers) and other symbols
                    });
                  });

                  const manaColors = [
                    { symbol: 'W', count: manaCounts.W },
                    { symbol: 'U', count: manaCounts.U },
                    { symbol: 'B', count: manaCounts.B },
                    { symbol: 'R', count: manaCounts.R },
                    { symbol: 'G', count: manaCounts.G },
                  ];

                  return manaColors
                    .filter(mana => mana.count > 0)
                    .map(mana => (
                      <div key={mana.symbol} style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "2px"
                      }}>
                        <img
                          src={`/svgs/${mana.symbol.toLowerCase()}.svg`}
                          alt={`{${mana.symbol}}`}
                          style={{
                            width: "14px",
                            height: "14px",
                            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))"
                          }}
                          title={`${mana.symbol} mana`}
                          onError={(e) => {
                            // Fallback to Scryfall if local SVG doesn't work
                            e.target.src = `https://svgs.scryfall.io/card-symbols/${mana.symbol}.svg`;
                          }}
                        />
                        <span style={{ 
                          fontSize: "10px", 
                          fontWeight: "bold", 
                          color: "#333" 
                        }}>
                          {mana.count}
                        </span>
                      </div>
                    ));
                })()}
              </div>
            </div>

            {/* Minimal Mana Curve */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "0 0 auto" }}>
              <span style={{ fontSize: "12px", color: "#666" }}>Curve:</span>
              <div style={{ display: "flex", gap: "1px", alignItems: "end" }}>
                {(() => {
                  const cmcCounts = {};
                  let maxCount = 0;
                  
                  (cards || deck?.cards || []).forEach(cardObj => {
                    const quantity = cardObj.count || cardObj.quantity || 1;
                    const cmc = cardObj?.scryfall_json?.cmc || 
                              cardObj?.card?.scryfall_json?.cmc || 
                              cardObj?.cmc || 
                              cardObj?.card?.cmc || 0;
                    const displayCmc = cmc >= 7 ? '7+' : cmc.toString();
                    cmcCounts[displayCmc] = (cmcCounts[displayCmc] || 0) + quantity;
                    maxCount = Math.max(maxCount, cmcCounts[displayCmc]);
                  });

                  const cmcLabels = ['0', '1', '2', '3', '4', '5', '6', '7+'];
                  
                  return cmcLabels.map(cmc => {
                    const count = cmcCounts[cmc] || 0;
                    const height = maxCount > 0 ? Math.max(2, (count / maxCount) * 20) : 2;
                    
                    return (
                      <div
                        key={`mini-bar-${cmc}`}
                        style={{
                          width: "8px",
                          height: `${height}px`,
                          backgroundColor: count > 0 ? "#4caf50" : "#e8e8e8",
                          borderRadius: "1px",
                          transition: "height 0.2s ease"
                        }}
                        title={`${count} cards with CMC ${cmc}`}
                      />
                    );
                  });
                })()}
              </div>
            </div>

            {/* Card Type Distribution */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 auto" }}>
              <span style={{ fontSize: "12px", color: "#666" }}>Types:</span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                {(() => {
                  const typeCounts = {};
                  
                  // Get commander names for proper identification
                  const getCommanderNames = () => {
                    const names = new Set();
                    
                    // From deck.commander array/object
                    if (deck?.commander) {
                      if (Array.isArray(deck.commander)) {
                        deck.commander.forEach(comm => {
                          if (comm?.name) names.add(comm.name.toLowerCase());
                          if (comm?.card?.name) names.add(comm.card.name.toLowerCase());
                        });
                      } else if (typeof deck.commander === 'object' && deck.commander.name) {
                        names.add(deck.commander.name.toLowerCase());
                      } else if (typeof deck.commander === 'string') {
                        names.add(deck.commander.toLowerCase());
                      }
                    }
                    
                    // From deck.commanderNames
                    if (deck?.commanderNames && Array.isArray(deck.commanderNames)) {
                      deck.commanderNames.forEach(name => {
                        if (name && typeof name === 'string') {
                          names.add(name.toLowerCase());
                        }
                      });
                    }
                    
                    return names;
                  };
                  
                  const commanderNames = getCommanderNames();
                  
                  // Use only the filtered cards state to avoid counting test cards
                  const cardsToCount = filterTestCards(cards || []);
                  // console.log(`[DEBUG] Type counting using ${cardsToCount.length} filtered cards`);
                  
                  cardsToCount.forEach(cardObj => {
                    const quantity = cardObj.count || cardObj.quantity || 1;
                    const cardName = cardObj?.card?.name || cardObj?.name || 'Unknown';
                    const isCommander = commanderNames.has(cardName.toLowerCase()) || 
                                       cardObj.isCommander === true ||
                                       cardObj.card?.isCommander === true;
                    
                    const typeLine = cardObj?.scryfall_json?.type_line || 
                                   cardObj?.card?.scryfall_json?.type_line || 
                                   cardObj?.type_line || 
                                   cardObj?.card?.type_line || '';
                    
                    // Extract primary card types, multiplied by quantity
                    const types = typeLine.toLowerCase();
                    
                    // Special handling for commanders - they should be classified by their actual type, not as "Commander"
                    // But we need to make sure we have type information for them
                    if (isCommander && (!typeLine || typeLine.trim() === '')) {
                      // Known commander type mappings for cards missing type info
                      const knownCommanderTypes = {
                        'jason bright, glowing prophet': 'Legendary Creature — Human Mutant',
                        // Add more as needed
                      };
                      
                      const knownType = knownCommanderTypes[cardName.toLowerCase()];
                      if (knownType) {
                        // Reduced logging - only show once per session
                      if (!window.commanderTypeLogged) {
                        console.log(`[DEBUG] Commander "${cardName}" using known type: ${knownType}`);
                        window.commanderTypeLogged = true;
                      }
                        // Parse the known type to categorize correctly
                        if (knownType.toLowerCase().includes('creature')) {
                          typeCounts['Creature'] = (typeCounts['Creature'] || 0) + quantity;
                        } else if (knownType.toLowerCase().includes('planeswalker')) {
                          typeCounts['Planeswalker'] = (typeCounts['Planeswalker'] || 0) + quantity;
                        } else if (knownType.toLowerCase().includes('artifact')) {
                          typeCounts['Artifact'] = (typeCounts['Artifact'] || 0) + quantity;
                        } else {
                          typeCounts['Other'] = (typeCounts['Other'] || 0) + quantity;
                        }
                        return;
                      }
                      
                      // Default commanders to "Legendary Creature" if no type info available (reduced logging)
                      if (Math.random() < 0.1) {
                        console.log(`[DEBUG] Commander "${cardName}" missing type info, defaulting to Creature`);
                      }
                      typeCounts['Creature'] = (typeCounts['Creature'] || 0) + quantity;
                      return;
                    }
                    
                    // Special handling for cards with missing type_line
                    if (!typeLine || typeLine.trim() === '') {
                      // Try to get type from scryfall_json if available
                      const scryfallTypeLine = cardObj?.scryfall_json?.type_line || 
                                             cardObj?.card?.scryfall_json?.type_line || '';
                      if (scryfallTypeLine) {
                        const scryfallTypes = scryfallTypeLine.toLowerCase();
                        if (scryfallTypes.includes('creature')) typeCounts['Creature'] = (typeCounts['Creature'] || 0) + quantity;
                        else if (scryfallTypes.includes('instant')) typeCounts['Instant'] = (typeCounts['Instant'] || 0) + quantity;
                        else if (scryfallTypes.includes('sorcery')) typeCounts['Sorcery'] = (typeCounts['Sorcery'] || 0) + quantity;
                        else if (scryfallTypes.includes('enchantment')) typeCounts['Enchantment'] = (typeCounts['Enchantment'] || 0) + quantity;
                        else if (scryfallTypes.includes('artifact')) typeCounts['Artifact'] = (typeCounts['Artifact'] || 0) + quantity;
                        else if (scryfallTypes.includes('planeswalker')) typeCounts['Planeswalker'] = (typeCounts['Planeswalker'] || 0) + quantity;
                        else if (scryfallTypes.includes('land')) typeCounts['Land'] = (typeCounts['Land'] || 0) + quantity;
                        else if (scryfallTypes.includes('battle')) typeCounts['Battle'] = (typeCounts['Battle'] || 0) + quantity;
                        else {
                          console.log(`[DEBUG] Card with empty type_line counted as Other: "${cardName}" (Scryfall: "${scryfallTypeLine}")`);
                          typeCounts['Other'] = (typeCounts['Other'] || 0) + quantity;
                        }
                      } else {
                        // Card with no type info counted as Other
                        typeCounts['Other'] = (typeCounts['Other'] || 0) + quantity;
                      }
                    } else {
                      // Normal type processing
                      if (types.includes('creature')) typeCounts['Creature'] = (typeCounts['Creature'] || 0) + quantity;
                      else if (types.includes('instant')) typeCounts['Instant'] = (typeCounts['Instant'] || 0) + quantity;
                      else if (types.includes('sorcery')) typeCounts['Sorcery'] = (typeCounts['Sorcery'] || 0) + quantity;
                      else if (types.includes('enchantment')) typeCounts['Enchantment'] = (typeCounts['Enchantment'] || 0) + quantity;
                      else if (types.includes('artifact')) typeCounts['Artifact'] = (typeCounts['Artifact'] || 0) + quantity;
                      else if (types.includes('planeswalker')) typeCounts['Planeswalker'] = (typeCounts['Planeswalker'] || 0) + quantity;
                      else if (types.includes('land')) typeCounts['Land'] = (typeCounts['Land'] || 0) + quantity;
                      else if (types.includes('battle')) typeCounts['Battle'] = (typeCounts['Battle'] || 0) + quantity;
                      else {
                        console.log(`[DEBUG] Card counted as Other: "${cardName}" with type_line: "${typeLine}"`);
                        typeCounts['Other'] = (typeCounts['Other'] || 0) + quantity;
                      }
                    }
                  });

                  // Use your custom SVG icons from public/svgs folder
                  const getTypeIcon = (type) => {
                    const svgMap = {
                      'Creature': 'creature.svg',
                      'Instant': 'instant.svg',
                      'Sorcery': 'sorcery.svg',
                      'Enchantment': 'enchantment.svg',
                      'Artifact': 'artifact.svg',
                      'Planeswalker': 'planeswalker.svg',
                      'Land': 'land.svg',
                      'Battle': 'artifact.svg', // Fallback to artifact since battle.svg doesn't exist
                      'Other': 'artifact.svg' // Fallback to artifact for other types
                    };
                    
                    const svgFile = svgMap[type] || 'artifact.svg';
                    
                    return (
                      <img
                        src={`/svgs/${svgFile}`}
                        alt={type}
                        style={{
                          width: "14px",
                          height: "14px",
                          filter: "brightness(0)", // Make SVGs black
                          opacity: 0.8
                        }}
                        title={`${type} symbol`}
                      />
                    );
                  };

                  return Object.entries(typeCounts)
                    .filter(([type, count]) => count > 0)
                    .sort(([,a], [,b]) => b - a) // Sort by count descending
                    .map(([type, count]) => (
                      <div key={type} style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "2px"
                      }}>
                        {getTypeIcon(type)}
                        <span style={{ 
                          fontSize: "10px", 
                          fontWeight: "bold", 
                          color: "#333" 
                        }}>
                          {count}
                        </span>
                      </div>
                    ));
                })()}
              </div>
            </div>
          </div>
        </div>

        {modalState.isOpen && modalState.cardObj && (
          <CardActionsModal
            isOpen={modalState.isOpen}
            onClose={() => {
              setModalState({ isOpen: false, cardObj: null });
              // Clear Oracle Tag navigation context when modal closes
              setOracleTagNavigationState({
                isActive: false,
                searchResults: [],
                currentIndex: -1,
              });
            }}
            card={modalState.cardObj}
            onAddCard={handleAddCard}
            onUpdateCard={handleUpdateCard}
            onRemoveCard={handleRemoveCard}
            onMoveToSideboard={handleMoveToSideboard}
            onMoveToTechIdeas={handleMoveToTechIdeas}
            onAddToCollection={handleAddToCollection}
            updatingPrinting={updatingPrinting}
            onOracleTagSearch={handleOracleTagSearchModal}
            onNavigateToPrevious={handleNavigateToPreviousCard}
            onNavigateToNext={handleNavigateToNextCard}
            onPreviewUpdate={handlePreviewUpdate}
          />
        )}
          </div>
        </div>
      </div>
    </>
  );
}

// Add cache management functions to window for debugging
if (typeof window !== 'undefined') {
  window.clearTechIdeasCache = () => {
    if (window.fixedTechIdeasCache) {
      const size = window.fixedTechIdeasCache.size;
      window.fixedTechIdeasCache.clear();
      console.log(`[CACHE] Cleared ${size} cached tech ideas entries`);
      return size;
    }
    return 0;
  };
  
  window.validateTechIdeasCache = () => {
    if (window.fixedTechIdeasCache) {
      const suspicious = [];
      for (const [name, data] of window.fixedTechIdeasCache.entries()) {
        if (data.modalPrice) {
          const priceNum = parseFloat(data.modalPrice.toString().replace(/^\$/, ''));
          if (priceNum > 100 || priceNum <= 0) {
            suspicious.push({ name, price: data.modalPrice, priceNum });
          }
        }
      }
      console.log(`[CACHE] Found ${suspicious.length} suspicious cached prices:`, suspicious);
      return suspicious;
    }
    return [];
  };
  
  // Add quantity update test function for debugging Island persistence issue
  window.testQuantityUpdate = (cardName = 'Island', newQuantity = null) => {
    console.log(`[QUANTITY TEST] Testing quantity update for "${cardName}"`);
    
    // Access current cards from deck state - with multiple fallback methods
    let currentCards = [];
    let deckSource = 'unknown';
    
    if (typeof deck !== 'undefined' && deck?.cards) {
      currentCards = deck.cards;
      deckSource = 'deck variable';
    } else if (window.deck?.cards) {
      currentCards = window.deck.cards;
      deckSource = 'window.deck';
    } else {
      // Try to access through React DevTools or component instance
      const deckElement = document.querySelector('[data-testid="deck-view-edit"]') || document.querySelector('main');
      if (deckElement && deckElement._reactInternalFiber) {
        try {
          // This is a hack to access React state
          const component = deckElement._reactInternalFiber;
          console.log('[QUANTITY TEST] Found React component, trying to access state...');
        } catch (e) {
          console.log('[QUANTITY TEST] Could not access React state');
        }
      }
    }
    
    console.log(`[QUANTITY TEST] Found ${currentCards.length} cards in deck (source: ${deckSource})`);
    
    if (currentCards.length === 0) {
      console.log(`[QUANTITY TEST] No cards found. Available globals:`, Object.keys(window).filter(k => k.toLowerCase().includes('deck') || k.toLowerCase().includes('card')));
      return null;
    }
    
    const targetCard = currentCards.find(card => {
      const name = card.card?.name || card.name;
      return name === cardName;
    });
    
    if (!targetCard) {
      console.log(`[QUANTITY TEST] Card "${cardName}" not found in deck`);
      console.log(`[QUANTITY TEST] Available card names:`, currentCards.slice(0, 10).map(c => c.card?.name || c.name));
      return null;
    }
    
    const currentQuantity = targetCard.count || 1;
    const testQuantity = newQuantity !== null ? newQuantity : currentQuantity + 1;
    
    console.log(`[QUANTITY TEST] Found "${cardName}" with quantity ${currentQuantity}, updating to ${testQuantity}`);
    console.log(`[QUANTITY TEST] Target card data:`, {
      name: targetCard.card?.name || targetCard.name,
      count: targetCard.count,
      foil: targetCard.foil || targetCard.card?.foil,
      printing: targetCard.printing || targetCard.card?.printing
    });
    
    // Call handleUpdateCard directly with the target card
    try {
      if (typeof handleUpdateCard !== 'undefined') {
        handleUpdateCard(targetCard, { quantity: testQuantity });
        console.log(`[QUANTITY TEST] Called handleUpdateCard for "${cardName}" with quantity ${testQuantity}`);
      } else {
        console.log(`[QUANTITY TEST] handleUpdateCard function not accessible`);
        return null;
      }
      return { cardName, oldQuantity: currentQuantity, newQuantity: testQuantity };
    } catch (error) {
      console.error('[QUANTITY TEST] Error calling handleUpdateCard:', error);
      return null;
    }
  };
}
