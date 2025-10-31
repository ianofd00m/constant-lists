import React from 'react';

// Helper to get mana value from a card object
const getManaValue = (cardObj) => {
  const scryfall = cardObj?.scryfall_json || cardObj?.card?.scryfall_json;
  if (scryfall?.cmc) return scryfall.cmc;
  if (cardObj?.card?.cmc) return cardObj.card.cmc;
  if (cardObj?.cmc) return cardObj.cmc;
  return 0;
};

// Helper to get color identity from a card object
const getColorIdentity = (cardObj) => {
  const scryfall = cardObj?.scryfall_json || cardObj?.card?.scryfall_json;
  const identity = scryfall?.color_identity || cardObj?.card?.color_identity || [];
  
  if (identity.length === 0) {
    return 'C'; // Colorless
  }
  
  // Sort to ensure consistent keys, e.g., 'BG' is always 'BG', not 'GB'
  const colorOrder = ['W', 'U', 'B', 'R', 'G'];
  return identity.sort((a, b) => colorOrder.indexOf(a) - colorOrder.indexOf(b)).join('');
};

// Group cards by Mana Value
export function groupCardsByManaValue(cards) {
  if (!Array.isArray(cards)) {
    console.error('[FOREACH DEBUG] groupCardsByManaValue: cards is not an array:', typeof cards, cards);
    return [];
  }
  const typeMap = {};
  for (const cardObj of cards) {
    if (!cardObj) continue;
    const manaValue = getManaValue(cardObj);
    const key = `${manaValue}`;
    if (!typeMap[key]) typeMap[key] = [];
    typeMap[key].push(cardObj);
  }

  return Object.entries(typeMap)
    .map(([manaValue, cardGroup]) => ({ type: `${manaValue} CMC`, cards: cardGroup }))
    .sort((a, b) => parseInt(a.type) - parseInt(b.type));
}

// Group cards by Color Identity
export function groupCardsByColorIdentity(cards) {
  if (!Array.isArray(cards)) {
    console.error('[FOREACH DEBUG] groupCardsByColorIdentity: cards is not an array:', typeof cards, cards);
    return [];
  }
  const typeMap = {};

  const colorIdentityNames = {
    'C': 'Colorless',
    'W': 'White',
    'U': 'Blue',
    'B': 'Black',
    'R': 'Red',
    'G': 'Green',
    // Guilds
    'WU': 'Azorius', 'WB': 'Orzhov', 'WR': 'Boros', 'WG': 'Selesnya', 'UB': 'Dimir',
    'UR': 'Izzet', 'UG': 'Simic', 'BR': 'Rakdos', 'BG': 'Golgari', 'RG': 'Gruul',
    // Shards
    'WUB': 'Esper', 'UBR': 'Grixis', 'BRG': 'Jund', 'WRG': 'Naya', 'WUG': 'Bant',
    // Wedges
    'WBG': 'Abzan', 'WUR': 'Jeskai', 'UBG': 'Sultai', 'WBR': 'Mardu', 'URG': 'Temur',
    // 4-color
    'WUBR': 'Non-Green', 'UBRG': 'Non-White', 'WBRG': 'Non-Blue',
    'WURG': 'Non-Black', 'WUBG': 'Non-Red',
    // 5-color
    'WUBRG': 'Five-Color'
  };

  const groupOrder = [
    'C', 'W', 'U', 'B', 'R', 'G', // Colorless & Monocolor
    // Allied 2-color pairs (WUBRG order)
    'WU', 'UB', 'BR', 'RG', 'WG',
    // Enemy 2-color pairs
    'WB', 'UR', 'BG', 'WR', 'UG',
    // Shards (allied 3-color)
    'WUG', 'WUB', 'UBR', 'BRG', 'WRG',
    // Wedges (enemy 3-color)
    'WBG', 'WUR', 'UBG', 'WBR', 'URG',
    // 4-color
    'WUBR', 'UBRG', 'WBRG', 'WURG', 'WUBG',
    // 5-color
    'WUBRG'
  ];

  for (const cardObj of cards) {
    if (!cardObj) continue;
    const colorKey = getColorIdentity(cardObj);
    if (!typeMap[colorKey]) typeMap[colorKey] = [];
    typeMap[colorKey].push(cardObj);
  }

  const allGroupKeys = Object.keys(typeMap);

  return allGroupKeys
    .map(key => ({
      type: colorIdentityNames[key] || key,
      cards: typeMap[key],
      originalKey: key,
    }))
    .sort((a, b) => {
      const indexA = groupOrder.indexOf(a.originalKey);
      const indexB = groupOrder.indexOf(b.originalKey);

      if (indexA === -1 && indexB === -1) {
        // Sort by length first, then alphabetically for unknown groups
        if (a.originalKey.length !== b.originalKey.length) {
          return a.originalKey.length - b.originalKey.length;
        }
        return a.originalKey.localeCompare(b.originalKey);
      }
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
}

// Group cards by Collection Status
export function groupCardsByCollectionStatus(cards) {
  if (!Array.isArray(cards)) {
    console.error('[FOREACH DEBUG] groupCardsByCollectionStatus: cards is not an array:', typeof cards, cards);
    return [];
  }
  console.log('[CollectionGrouping] Regrouping cards by collection status, total cards:', cards.length);
  try {
    // Get collection from localStorage
    const collection = JSON.parse(localStorage.getItem('cardCollection') || '[]');
    console.log('[CollectionGrouping] Current collection size:', collection.length);
    
    // Create a map for faster lookup: printing_id + foil -> quantity
    const collectionMap = new Map();
    
    // Also create a map by card name to check for different versions
    const cardNameMap = new Map();
    
    collection.forEach(item => {
      const key = `${item.printing_id}_${item.foil}`;
      collectionMap.set(key, (collectionMap.get(key) || 0) + item.quantity);
      
      // Track card names for different version checking
      // Try multiple possible card name fields - collection items use 'name' field
      const cardName = item.name || item.card_name || item.cardName;
      if (cardName) {
        if (!cardNameMap.has(cardName)) {
          cardNameMap.set(cardName, new Set());
        }
        cardNameMap.get(cardName).add(`${item.printing_id}_${item.foil}`);
      }
    });
    
    console.log('[CollectionGrouping] Card name map:', Array.from(cardNameMap.keys()).slice(0, 10));
    
    const exactMatch = [];
    const differentVersion = [];
    const notOwned = [];
    
    for (const card of cards) {
      if (!card) {
        notOwned.push(card);
        continue;
      }
      
      // Get card name from various possible locations
      const cardName = card.name || 
                      card.cardObj?.name ||
                      card.cardObj?.card?.name ||
                      card.card?.name ||
                      card.cardObj?.card?.scryfall_json?.name ||
                      card.scryfall_json?.name;
      
      // Get printing ID from various possible locations
      const printingId = card.printing || 
                        card.cardObj?.printing || 
                        card.cardObj?.card?.printing ||
                        card.card?.printing ||
                        card.scryfall_id ||
                        card.id ||
                        card.cardObj?.scryfall_id ||
                        card.cardObj?.id ||
                        card.cardObj?.card?.scryfall_id ||
                        card.cardObj?.card?.id;
      
      // Get foil status
      const isFoil = card.foil === true || 
                    card.isFoil === true ||
                    card.cardObj?.foil === true ||
                    card.cardObj?.isFoil === true ||
                    card.cardObj?.card?.foil === true ||
                    card.cardObj?.card?.isFoil === true;
      
      if (!printingId || !cardName) {
        console.log('[CollectionGrouping] Missing data for card:', { 
          cardName, 
          printingId, 
          cardStructure: Object.keys(card) 
        });
        notOwned.push(card);
        continue;
      }
      
      console.log('[CollectionGrouping] Processing card:', { 
        cardName, 
        printingId, 
        isFoil,
        ownedVersions: cardNameMap.get(cardName) 
      });
      
      // Check for exact match (same printing + foil status)
      const exactKey = `${printingId}_${isFoil}`;
      const hasExactMatch = (collectionMap.get(exactKey) || 0) > 0;
      
      if (hasExactMatch) {
        console.log('[CollectionGrouping] Exact match found for:', cardName);
        exactMatch.push(card);
      } else {
        // Check if we own any other version of this card
        const ownedVersions = cardNameMap.get(cardName);
        if (ownedVersions && ownedVersions.size > 0) {
          console.log('[CollectionGrouping] Different version owned for:', cardName, 'versions:', Array.from(ownedVersions));
          // We own the card but not this specific version
          differentVersion.push(card);
        } else {
          console.log('[CollectionGrouping] Not owned:', cardName);
          notOwned.push(card);
        }
      }
    }
    
    const groups = [];
    if (exactMatch.length > 0) {
      groups.push({ type: 'Exact Match', cards: exactMatch });
    }
    if (differentVersion.length > 0) {
      groups.push({ type: 'Different Version Owned', cards: differentVersion });
    }
    if (notOwned.length > 0) {
      groups.push({ type: 'Not Owned', cards: notOwned });
    }
    
    return groups;
    
  } catch (error) {
    console.error('Error checking collection status:', error);
    // Fallback to treating all cards as not owned
    return [{ type: 'Not Owned', cards }];
  }
}
