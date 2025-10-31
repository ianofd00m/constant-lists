// CSV Parser - Handles multiple CSV formats from different MTG collection sites
// Supports Moxfield, Archidekt, MTGGoldfish, Deckbox, and more

import { processImportedCards } from './cardDataEnrichment.js';

export async function parseCSV(csvText, options = {}) {
  if (!csvText || !csvText.trim()) {
    throw new Error('CSV data is empty');
  }

  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  // Parse CSV with proper quote handling
  const rows = lines.map(line => parseCSVLine(line));
  const headers = rows[0].map(h => h.toLowerCase().trim());
  const dataRows = rows.slice(1);

  // Detect CSV format and column mappings
  const columnMap = detectColumnMapping(headers);
  
  // Debug: Log detected columns
  console.log('Detected column mappings:', columnMap);
  console.log('CSV headers:', headers);
  
  const cards = [];
  
  for (const row of dataRows) {
    try {
      const card = parseCardRow(row, headers, columnMap);
      if (card && card.name) {
        cards.push(card);
      }
    } catch (error) {
      console.warn('Skipping invalid row:', row, error.message);
    }
  }

  if (cards.length === 0) {
    throw new Error('No valid cards found in CSV');
  }

  // Enrich card data if requested
  const { enrichData = false, showProgress = true } = options;
  if (enrichData) {
    return await processImportedCards(cards, showProgress);
  }

  return cards;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  result.push(current);
  return result;
}

function detectColumnMapping(headers) {
  const map = {};
  
  // Quantity mappings
  const quantityColumns = ['quantity', 'qty', 'count', 'amount', 'copies'];
  map.quantity = findColumn(headers, quantityColumns);
  
  // Name mappings
  const nameColumns = ['name', 'card name', 'cardname', 'card_name', 'title'];
  map.name = findColumn(headers, nameColumns);
  
  // Set mappings
  const setColumns = [
    'set', 'set name', 'setname', 'set_name', 'edition', 'edition name', 
    'edition_name', 'expansion', 'exp', 'set code', 'setcode'
  ];
  map.set = findColumn(headers, setColumns);
  
  // Set code mappings
  const setCodeColumns = [
    'set code', 'setcode', 'set_code', 'edition code', 'edition_code', 
    'exp', 'expansion code', 'code', 'set_abbr', 'abbr'
  ];
  map.setCode = findColumn(headers, setCodeColumns);
  
  // Foil mappings
  const foilColumns = ['foil', 'finish', 'treatment', 'printing'];
  map.foil = findColumn(headers, foilColumns);
  
  // Condition mappings
  const conditionColumns = ['condition', 'cond', 'grade', 'state'];
  map.condition = findColumn(headers, conditionColumns);
  
  // Language mappings
  const languageColumns = ['language', 'lang', 'locale'];
  map.language = findColumn(headers, languageColumns);
  
  // Collector number mappings
  const collectorColumns = ['collector number', 'collector_number', 'number', 'card number', 'card_number', '#'];
  map.collectorNumber = findColumn(headers, collectorColumns);
  
  // Mana cost mappings
  const manaColumns = ['mana cost', 'mana_cost', 'manacost', 'cost', 'cmc', 'mana value', 'mana_value'];
  map.manaCost = findColumn(headers, manaColumns);
  
  // Rarity mappings
  const rarityColumns = ['rarity', 'rare'];
  map.rarity = findColumn(headers, rarityColumns);
  
  // Price mappings
  const priceColumns = ['price', 'value', 'cost', 'purchase price', 'purchase_price', 'market_price', 'tcg_price'];
  map.price = findColumn(headers, priceColumns);
  
  // Additional comprehensive column mappings for all platforms
  const typeColumns = ['type', 'card_type', 'types', 'type_line'];
  map.cardType = findColumn(headers, typeColumns);
  
  const colorColumns = ['color', 'colors', 'color_identity'];
  map.colors = findColumn(headers, colorColumns);
  
  const cmcColumns = ['cmc', 'converted_mana_cost', 'mana_value'];
  map.cmc = findColumn(headers, cmcColumns);
  
  // Deckbox specific columns
  const signedColumns = ['signed', 'artist_signed'];
  map.signed = findColumn(headers, signedColumns);
  
  const artistProofColumns = ['artist proof', 'artist_proof'];
  map.artistProof = findColumn(headers, artistProofColumns);
  
  const alteredColumns = ['altered art', 'altered_art', 'altered', 'alter'];
  map.altered = findColumn(headers, alteredColumns);
  
  const misprintColumns = ['misprint', 'error'];
  map.misprint = findColumn(headers, misprintColumns);
  
  const promoColumns = ['promo', 'promotional'];
  map.promo = findColumn(headers, promoColumns);
  
  const textlessColumns = ['textless', 'no_text'];
  map.textless = findColumn(headers, textlessColumns);
  
  const myPriceColumns = ['my price', 'my_price', 'personal_price', 'purchase_price'];
  map.myPrice = findColumn(headers, myPriceColumns);
  
  // Card number variations
  const cardNumberColumns = ['card number', 'card_number', '#', 'number', 'num'];
  map.cardNumber = findColumn(headers, cardNumberColumns);
  
  // Edition variations
  const editionColumns = ['edition', 'expansion', 'set name', 'set_name'];
  map.edition = findColumn(headers, editionColumns);
  
  // Additional pricing columns
  const marketPriceColumns = ['market price', 'market_price', 'current_price'];
  map.marketPrice = findColumn(headers, marketPriceColumns);
  
  const lowPriceColumns = ['low price', 'low_price', 'tcg_low'];
  map.lowPrice = findColumn(headers, lowPriceColumns);
  
  const midPriceColumns = ['mid price', 'mid_price', 'tcg_mid'];
  map.midPrice = findColumn(headers, midPriceColumns);
  
  const highPriceColumns = ['high price', 'high_price', 'tcg_high'];
  map.highPrice = findColumn(headers, highPriceColumns);
  
  // Tradelist columns
  const tradelistColumns = ['tradelist', 'tradelist count', 'tradelist_count', 'for_trade'];
  map.tradelist = findColumn(headers, tradelistColumns);
  
  // Wishlist columns
  const wishlistColumns = ['wishlist', 'wishlist count', 'wishlist_count', 'wanted'];
  map.wishlist = findColumn(headers, wishlistColumns);
  
  // Notes/Tags columns
  const notesColumns = ['notes', 'comment', 'comments', 'description'];
  map.notes = findColumn(headers, notesColumns);
  
  const tagsColumns = ['tags', 'tag', 'categories'];
  map.tags = findColumn(headers, tagsColumns);
  
  // Date columns
  const dateAddedColumns = ['date added', 'date_added', 'added_date', 'created_date', 'last modified', 'last_modified'];
  map.dateAdded = findColumn(headers, dateAddedColumns);
  
  // Power/Toughness/Loyalty
  const powerColumns = ['power', 'pow'];
  map.power = findColumn(headers, powerColumns);
  
  const toughness = ['toughness', 'tou'];
  map.toughness = findColumn(headers, toughness);
  
  const loyaltyColumns = ['loyalty', 'starting_loyalty'];
  map.loyalty = findColumn(headers, loyaltyColumns);
  
  return map;
}

function findColumn(headers, possibleNames) {
  for (const name of possibleNames) {
    const index = headers.findIndex(h => h.includes(name));
    if (index !== -1) return index;
  }
  return -1;
}

function normalizeCondition(condition) {
  if (!condition) return 'NM';
  
  // TCGPlayer standard conditions with comprehensive mapping
  const conditionMap = {
    // Near Mint - appears Mint to Slightly Played
    'mint': 'NM',
    'near mint': 'NM',
    'nm': 'NM',
    'mint/near mint': 'NM',
    'm/nm': 'NM',
    
    // Lightly Played - light wear visible upon close inspection
    'light play': 'LP',
    'lightly played': 'LP',
    'lp': 'LP',
    'slightly played': 'LP',
    'sp': 'LP',
    
    // Moderately Played - moderate wear, still tournament legal in sleeves
    'moderate play': 'MP',
    'moderately played': 'MP',
    'mp': 'MP',
    'played': 'MP',
    'pl': 'MP',
    
    // Heavily Played - heavy wear but still recognizable and playable
    'heavy play': 'HP',
    'heavily played': 'HP',
    'hp': 'HP',
    'worn': 'HP',
    
    // Damaged - card damaged but still tournament legal in sleeves
    'damaged': 'DMG',
    'dmg': 'DMG',
    'poor': 'DMG',
    'p': 'DMG',
    
    // Additional common variations
    'excellent': 'NM',
    'ex': 'NM',
    'very fine': 'LP',
    'vf': 'LP',
    'fine': 'MP',
    'f': 'MP',
    'good': 'HP',
    'g': 'HP',
    'fair': 'DMG',
    'fr': 'DMG'
  };
  
  return conditionMap[condition.toLowerCase()] || 'NM';
}

function normalizeLanguage(language) {
  if (!language) return 'EN';
  
  // MTG language codes with comprehensive mapping
  const languageMap = {
    // English variations
    'english': 'EN',
    'en': 'EN',
    'eng': 'EN',
    'us': 'EN',
    'usa': 'EN',
    
    // Spanish variations
    'spanish': 'ES',
    'es': 'ES',
    'esp': 'ES',
    'castellano': 'ES',
    
    // French variations
    'french': 'FR',
    'fr': 'FR',
    'français': 'FR',
    'francais': 'FR',
    
    // German variations
    'german': 'DE',
    'de': 'DE',
    'deutsch': 'DE',
    'ger': 'DE',
    
    // Italian variations
    'italian': 'IT',
    'it': 'IT',
    'italiano': 'IT',
    'ita': 'IT',
    
    // Portuguese variations
    'portuguese': 'PT',
    'pt': 'PT',
    'português': 'PT',
    'portugues': 'PT',
    'brazilian': 'PT',
    'br': 'PT',
    
    // Japanese variations
    'japanese': 'JA',
    'ja': 'JA',
    'jp': 'JA',
    'jpn': 'JA',
    '日本語': 'JA',
    
    // Korean variations
    'korean': 'KO',
    'ko': 'KO',
    'kor': 'KO',
    '한국어': 'KO',
    
    // Chinese variations
    'chinese': 'ZH',
    'zh': 'ZH',
    'chi': 'ZH',
    'chinese simplified': 'ZHS',
    'simplified chinese': 'ZHS',
    'zhs': 'ZHS',
    'chinese traditional': 'ZHT',
    'traditional chinese': 'ZHT',
    'zht': 'ZHT',
    '中文': 'ZH',
    
    // Russian variations
    'russian': 'RU',
    'ru': 'RU',
    'rus': 'RU',
    'русский': 'RU',
    
    // Other languages
    'dutch': 'NL',
    'nl': 'NL',
    'nederlands': 'NL',
    'swedish': 'SV',
    'sv': 'SV',
    'svenska': 'SV',
    'norwegian': 'NO',
    'no': 'NO',
    'norsk': 'NO',
    'danish': 'DA',
    'da': 'DA',
    'dansk': 'DA',
    'finnish': 'FI',
    'fi': 'FI',
    'suomi': 'FI',
    
    // Special languages
    'phyrexian': 'PH',
    'ph': 'PH',
    'phyrexian (hybrid)': 'PH',
    'hybrid phyrexian': 'PH'
  };
  
  return languageMap[language.toLowerCase()] || 'EN';
}

function parseCardRow(row, headers, columnMap) {
  // Extract basic required fields
  const quantity = parseQuantity(getColumnValue(row, columnMap.quantity));
  const name = getColumnValue(row, columnMap.name);
  
  if (!name || quantity <= 0) {
    throw new Error('Invalid card: missing name or quantity');
  }
  
  // Extract optional fields
  const setName = getColumnValue(row, columnMap.set);
  const setCode = getColumnValue(row, columnMap.setCode);
  const foilText = getColumnValue(row, columnMap.foil);
  const condition = normalizeCondition(getColumnValue(row, columnMap.condition)) || 'NM';
  const language = normalizeLanguage(getColumnValue(row, columnMap.language)) || 'EN';
  const collectorNumber = getColumnValue(row, columnMap.collectorNumber);
  const manaCost = getColumnValue(row, columnMap.manaCost);
  const rarity = getColumnValue(row, columnMap.rarity);
  const price = parseFloat(getColumnValue(row, columnMap.price)) || 0;
  
  // Additional comprehensive data fields
  const cardType = getColumnValue(row, columnMap.cardType);
  const colors = getColumnValue(row, columnMap.colors);
  const cmc = parseInt(getColumnValue(row, columnMap.cmc)) || 0;
  
  // Deckbox specific fields
  const signed = parseBooleanField(getColumnValue(row, columnMap.signed));
  const artistProof = parseBooleanField(getColumnValue(row, columnMap.artistProof));
  const altered = parseBooleanField(getColumnValue(row, columnMap.altered));
  const misprint = parseBooleanField(getColumnValue(row, columnMap.misprint));
  const promo = parseBooleanField(getColumnValue(row, columnMap.promo));
  const textless = parseBooleanField(getColumnValue(row, columnMap.textless));
  
  // Additional pricing
  const myPrice = parseFloat(getColumnValue(row, columnMap.myPrice)) || 0;
  const marketPrice = parseFloat(getColumnValue(row, columnMap.marketPrice)) || 0;
  const lowPrice = parseFloat(getColumnValue(row, columnMap.lowPrice)) || 0;
  const midPrice = parseFloat(getColumnValue(row, columnMap.midPrice)) || 0;
  const highPrice = parseFloat(getColumnValue(row, columnMap.highPrice)) || 0;
  
  // Trade/Wish quantities
  const tradelistCount = parseInt(getColumnValue(row, columnMap.tradelist)) || 0;
  const wishlistCount = parseInt(getColumnValue(row, columnMap.wishlist)) || 0;
  
  // Additional card info
  const notes = getColumnValue(row, columnMap.notes);
  const tags = getColumnValue(row, columnMap.tags);
  const dateAddedStr = getColumnValue(row, columnMap.dateAdded);
  const power = getColumnValue(row, columnMap.power);
  const toughness = getColumnValue(row, columnMap.toughness);
  const loyalty = getColumnValue(row, columnMap.loyalty);
  
  // Card number (try multiple columns)
  const cardNumber = collectorNumber || getColumnValue(row, columnMap.cardNumber);
  
  // Edition (try multiple columns)
  const edition = setName || getColumnValue(row, columnMap.edition);
  
  // Determine foil status
  const foil = parseFoilStatus(foilText);
  
  // Generate unique ID
  const id = generateCardId(name, setCode || setName, foil, collectorNumber);
  
  return {
    id,
    name: cleanCardName(name),
    quantity,
    set: setCode || extractSetCode(setName),
    set_name: setName || setCode,
    foil,
    condition,
    language,
    collector_number: collectorNumber,
    mana_cost: manaCost,
    rarity,
    price,
    card_type: cardType,
    colors,
    cmc,
    power,
    toughness,
    loyalty,
    
    // Special properties
    signed,
    artist_proof: artistProof,
    altered,
    misprint,
    promo,
    textless,
    
    // Pricing information
    my_price: myPrice,
    market_price: marketPrice,
    low_price: lowPrice,
    mid_price: midPrice,
    high_price: highPrice,
    
    // Trade/Wishlist quantities
    tradelist_count: tradelistCount,
    wishlist_count: wishlistCount,
    
    // Additional metadata
    notes,
    tags,
    card_number: cardNumber,
    edition,
    
    dateAdded: parseDateField(dateAddedStr) || new Date().toISOString(),
    source: 'csv_import'
  };
}

function getColumnValue(row, columnIndex) {
  if (columnIndex === -1 || columnIndex >= row.length) return '';
  return row[columnIndex]?.trim() || '';
}

function parseQuantity(quantityStr) {
  if (!quantityStr) return 0;
  
  // Handle formats like "4x", "x4", "4.0", or just "4"
  const match = quantityStr.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    return Math.max(1, Math.floor(num)); // Ensure at least 1 and integer
  }
  return 0;
}

function parseFoilStatus(foilText) {
  if (!foilText) return false;
  
  const foilLower = foilText.toLowerCase();
  
  // Common foil indicators
  const foilIndicators = [
    'foil', 'etched', 'showcase', 'borderless', 'extended',
    'alternate', 'promo', 'prerelease', 'gilded', 'textured',
    'premium', 'special', 'holographic', 'holo'
  ];
  
  // Check for boolean values
  if (foilLower === 'true' || foilLower === '1' || foilLower === 'yes') {
    return true;
  }
  
  if (foilLower === 'false' || foilLower === '0' || foilLower === 'no' || foilLower === 'normal') {
    return false;
  }
  
  return foilIndicators.some(indicator => foilLower.includes(indicator));
}

function cleanCardName(name) {
  if (!name) return '';
  
  // Remove common artifacts from card names
  return name
    .replace(/^\d+x?\s+/, '') // Remove quantity prefix
    .replace(/\s+\([^)]*\)$/, '') // Remove trailing parentheses
    .replace(/\s+\[[^\]]*\]$/, '') // Remove trailing brackets
    .replace(/\s*-\s*foil$/i, '') // Remove foil suffix
    .replace(/\s*\*f\*$/i, '') // Remove *F* foil indicator
    .trim();
}

function extractSetCode(setName) {
  if (!setName) return '';
  
  // Common set name to code mappings
  const setMappings = {
    'alpha': 'lea',
    'beta': 'leb',
    'unlimited': 'ced',
    'revised': '3ed',
    'fourth edition': '4ed',
    'ice age': 'ice',
    'tempest': 'tmp',
    'urza\'s saga': 'usg',
    'mercadian masques': 'mmq',
    'invasion': 'inv',
    'odyssey': 'ody',
    'onslaught': 'ons',
    'mirrodin': 'mrd',
    'kamigawa': 'chk',
    'ravnica': 'rav',
    'time spiral': 'tsp',
    'lorwyn': 'lrw',
    'shadowmoor': 'shm',
    'alara': 'ala',
    'zendikar': 'zen',
    'scars of mirrodin': 'som',
    'innistrad': 'isd',
    'return to ravnica': 'rtr',
    'theros': 'ths',
    'khans of tarkir': 'ktk',
    'battle for zendikar': 'bfz',
    'shadows over innistrad': 'soi',
    'kaladesh': 'kld',
    'amonkhet': 'akh',
    'ixalan': 'xln',
    'dominaria': 'dom',
    'guilds of ravnica': 'grn',
    'ravnica allegiance': 'rna',
    'war of the spark': 'war',
    'throne of eldraine': 'eld',
    'theros beyond death': 'thb',
    'ikoria': 'iko',
    'zendikar rising': 'znr',
    'kaldheim': 'khm',
    'strixhaven': 'stx',
    'modern horizons': 'mh1',
    'modern horizons 2': 'mh2'
  };
  
  const lowerSetName = setName.toLowerCase();
  
  // Try exact match first
  if (setMappings[lowerSetName]) {
    return setMappings[lowerSetName];
  }
  
  // Try partial matches
  for (const [key, code] of Object.entries(setMappings)) {
    if (lowerSetName.includes(key) || key.includes(lowerSetName)) {
      return code;
    }
  }
  
  // If no match found, try to extract from parentheses or brackets
  const codeMatch = setName.match(/\(([^)]+)\)|\[([^\]]+)\]/);
  if (codeMatch) {
    const extractedCode = (codeMatch[1] || codeMatch[2]).toLowerCase();
    if (extractedCode.length === 3) {
      return extractedCode;
    }
  }
  
  // Last resort: use first 3 characters
  return setName.substring(0, 3).toLowerCase();
}

function parseBooleanField(value) {
  if (!value) return false;
  
  const lowerValue = value.toLowerCase().trim();
  return lowerValue === 'true' || 
         lowerValue === 'yes' || 
         lowerValue === '1' || 
         lowerValue === 'x' ||
         lowerValue === 'y';
}

function parseDateField(dateStr) {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch {
    return null;
  }
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