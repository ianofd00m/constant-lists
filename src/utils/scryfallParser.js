// Scryfall JSON Parser - Handles Scryfall API JSON data and bulk data exports
// Supports single cards, search results, and bulk data formats

import { processImportedCards } from './cardDataEnrichment.js';

export async function parseScryfallJSON(jsonInput, options = {}) {
  if (!jsonInput || !jsonInput.trim()) {
    throw new Error('JSON input is empty');
  }

  let data;
  try {
    data = JSON.parse(jsonInput);
  } catch (error) {
    throw new Error(`Invalid JSON format: ${error.message}`);
  }

  const cards = [];

  // Handle different Scryfall JSON formats
  if (data.object === 'deck' && data.entries) {
    // Scryfall deck format
    return parseScryfallDeck(data);
  } else if (data.object === 'card') {
    // Single card
    const card = parseScryfallCard(data);
    if (card) cards.push(card);
  } else if (data.object === 'list' && data.data) {
    // Search results or list format
    for (const cardData of data.data) {
      if (cardData.object === 'card') {
        const card = parseScryfallCard(cardData);
        if (card) cards.push(card);
      }
    }
  } else if (Array.isArray(data)) {
    // Array of cards (bulk data)
    for (const cardData of data) {
      if (cardData.object === 'card') {
        const card = parseScryfallCard(cardData);
        if (card) cards.push(card);
      }
    }
  } else {
    throw new Error('Unrecognized JSON format. Expected Scryfall card data.');
  }

  if (cards.length === 0) {
    throw new Error('No valid cards found in JSON data');
  }

  // Scryfall data is already complete, but process for consistency
  const { enrichData = false, showProgress = false } = options;
  if (enrichData) {
    return await processImportedCards(cards, { showProgress, skipEnrichment: true });
  }

  return cards;
}

function parseScryfallCard(cardData, quantity = 1) {
  if (!cardData || !cardData.name) {
    throw new Error('Invalid card data: missing name');
  }

  // Handle double-faced cards and split cards
  const cardName = getCardName(cardData);
  
  // Extract basic information
  const setCode = cardData.set || '';
  const setName = cardData.set_name || '';
  const collectorNumber = cardData.collector_number || '';
  const rarity = cardData.rarity || '';
  const manaCost = cardData.mana_cost || '';
  const cmc = cardData.cmc || 0;
  const typeLine = cardData.type_line || '';
  const oracleText = cardData.oracle_text || '';
  const power = cardData.power || '';
  const toughness = cardData.toughness || '';
  const loyalty = cardData.loyalty || '';
  
  // Colors and color identity
  const colors = Array.isArray(cardData.colors) ? cardData.colors.join('') : '';
  const colorIdentity = Array.isArray(cardData.color_identity) ? cardData.color_identity.join('') : '';
  
  // Foil information
  const foil = determineFoilStatus(cardData);
  
  // Pricing information
  const prices = extractPrices(cardData.prices);
  
  // Language
  const language = cardData.lang || 'en';
  
  // Legalities
  const legalities = cardData.legalities || {};
  
  // Images
  const imageUris = cardData.image_uris || {};
  
  // Generate unique ID
  const id = generateCardId(cardName, setCode, foil, collectorNumber);
  
  return {
    id,
    name: cardName,
    quantity,
    set: setCode.toLowerCase(),
    set_name: setName,
    foil,
    condition: 'NM', // Default condition
    language: language.toUpperCase(),
    collector_number: collectorNumber,
    mana_cost: manaCost,
    cmc,
    rarity: rarity.toLowerCase(),
    type_line: typeLine,
    oracle_text: oracleText,
    power,
    toughness,
    loyalty,
    colors,
    color_identity: colorIdentity,
    legalities,
    prices,
    image_uris: imageUris,
    scryfall_id: cardData.id,
    oracle_id: cardData.oracle_id,
    multiverse_ids: cardData.multiverse_ids || [],
    mtgo_id: cardData.mtgo_id,
    arena_id: cardData.arena_id,
    tcgplayer_id: cardData.tcgplayer_id,
    dateAdded: new Date().toISOString(),
    source: 'scryfall_import'
  };
}

function getCardName(cardData) {
  // Handle split cards, double-faced cards, etc.
  if (cardData.card_faces && cardData.card_faces.length > 0) {
    // Double-faced or split cards
    const faces = cardData.card_faces.map(face => face.name).join(' // ');
    return faces;
  }
  
  return cardData.name;
}

function determineFoilStatus(cardData) {
  // Check if card has foil treatments
  const finishes = cardData.finishes || [];
  const hasFoil = finishes.includes('foil') || finishes.includes('etched') || finishes.includes('glossy');
  
  // For import purposes, default to non-foil unless specifically indicated
  // Users can specify foil quantity separately
  return false;
}

function extractPrices(pricesData) {
  if (!pricesData) return {};
  
  return {
    usd: parseFloat(pricesData.usd) || 0,
    usd_foil: parseFloat(pricesData.usd_foil) || 0,
    usd_etched: parseFloat(pricesData.usd_etched) || 0,
    eur: parseFloat(pricesData.eur) || 0,
    eur_foil: parseFloat(pricesData.eur_foil) || 0,
    tix: parseFloat(pricesData.tix) || 0
  };
}

function generateCardId(name, set, foil, collectorNumber) {
  const parts = [
    name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
    set || 'unknown',
    foil ? 'foil' : 'normal',
    collectorNumber || ''
  ];
  
  return parts.join('-') + '-' + Date.now() + '-' + Math.random().toString(36).substring(7);
}

// Parse Scryfall collection format (with quantities)
export async function parseScryfallCollection(jsonInput, options = {}) {
  if (!jsonInput || !jsonInput.trim()) {
    throw new Error('JSON input is empty');
  }

  let data;
  try {
    data = JSON.parse(jsonInput);
  } catch (error) {
    throw new Error(`Invalid JSON format: ${error.message}`);
  }

  const cards = [];

  // Handle collection format where each entry has quantity and card data
  if (Array.isArray(data)) {
    for (const entry of data) {
      if (entry.card && entry.quantity) {
        const card = parseScryfallCard(entry.card, parseInt(entry.quantity) || 1);
        if (card) cards.push(card);
      } else if (entry.object === 'card') {
        // Direct card array
        const card = parseScryfallCard(entry);
        if (card) cards.push(card);
      }
    }
  } else if (data.collection && Array.isArray(data.collection)) {
    // Collection wrapper format
    for (const entry of data.collection) {
      if (entry.card && entry.quantity) {
        const card = parseScryfallCard(entry.card, parseInt(entry.quantity) || 1);
        if (card) cards.push(card);
      }
    }
  } else {
    // Fall back to standard parsing
    return parseScryfallJSON(jsonInput, options);
  }

  if (cards.length === 0) {
    throw new Error('No valid cards found in collection data');
  }

  // Apply enrichment if requested
  if (options.enrichData) {
    return await processImportedCards(cards);
  }

  return cards;
}

// Utility function to fetch card by Scryfall ID
export async function fetchScryfallCard(scryfallId) {
  try {
    const response = await fetch(`https://api.scryfall.com/cards/${scryfallId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const cardData = await response.json();
    return parseScryfallCard(cardData);
  } catch (error) {
    throw new Error(`Failed to fetch card: ${error.message}`);
  }
}

// Parse Scryfall deck format 
function parseScryfallDeck(deckData) {
  const cards = [];
  
  if (!deckData.entries) {
    throw new Error('No entries found in deck data');
  }

  // Process each section (mainboard, sideboard, maybeboard)
  Object.keys(deckData.entries).forEach(sectionName => {
    const entries = deckData.entries[sectionName];
    if (!Array.isArray(entries)) return;

    entries.forEach(entry => {
      if (entry.card_digest && entry.count) {
        const card = parseDeckEntry(entry, sectionName);
        if (card) cards.push(card);
      }
    });
  });

  return cards;
}

function parseDeckEntry(entry, section) {
  const cardDigest = entry.card_digest;
  if (!cardDigest || !cardDigest.name) {
    return null;
  }

  const quantity = parseInt(entry.count) || 1;
  const sideboard = section === 'sideboard' || section === 'maybeboard';
  
  // Create card data from digest
  const cardData = {
    id: cardDigest.id,
    oracle_id: cardDigest.oracle_id,
    name: cardDigest.name,
    set: cardDigest.set,
    collector_number: cardDigest.collector_number,
    mana_cost: cardDigest.mana_cost,
    type_line: cardDigest.type_line,
    image_uris: cardDigest.image_uris || {}
  };

  const card = parseScryfallCard(cardData, quantity);
  card.sideboard = sideboard;
  card.deck_section = section;
  
  return card;
}

// Utility function to search Scryfall
export async function searchScryfall(query, limit = 100) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodedQuery}&order=name&unique=cards&page=1`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return []; // No cards found
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const searchData = await response.json();
    const cards = [];
    
    if (searchData.data && searchData.data.length > 0) {
      const limitedData = searchData.data.slice(0, limit);
      for (const cardData of limitedData) {
        const card = parseScryfallCard(cardData);
        if (card) cards.push(card);
      }
    }
    
    return cards;
  } catch (error) {
    throw new Error(`Search failed: ${error.message}`);
  }
}