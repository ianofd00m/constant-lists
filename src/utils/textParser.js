// Text Parser - Handles free-form text input with various card list formats
// Supports formats like "4x Lightning Bolt", "1 Black Lotus (LEA)", "Mox Pearl - Alpha - Near Mint"

import { processImportedCards } from './cardDataEnrichment.js';

export async function parseText(textInput, options = {}) {
  if (!textInput || !textInput.trim()) {
    throw new Error('Text input is empty');
  }

  const { 
    enrichData = true,
    showProgress = true 
  } = options;

  const lines = textInput
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const cards = [];
  
  for (const line of lines) {
    try {
      const parsedCards = parseTextLine(line);
      cards.push(...parsedCards);
    } catch (error) {
      console.warn('Skipping invalid line:', line, error.message);
    }
  }

  if (cards.length === 0) {
    throw new Error('No valid cards found in text');
  }

  // Enrich cards with complete data from Scryfall
  if (enrichData) {
    return await processImportedCards(cards, { showProgress });
  }

  return cards;
}

function parseTextLine(line) {
  if (!line || line.trim().length === 0) {
    return [];
  }

  // Skip comment lines
  if (line.startsWith('//') || line.startsWith('#') || line.startsWith('--')) {
    return [];
  }

  // Try different parsing patterns in order of specificity
  const patterns = [
    parseSetCodeFoilFormat,    // "1 Hazezon, Shaper of Sand (DMC) 32 *F*"
    parseQuantityXFormat,      // "4x Lightning Bolt"
    parseQuantitySpaceFormat,  // "4 Lightning Bolt"
    parseParenthesesFormat,    // "Lightning Bolt (4)"
    parseBracketFormat,        // "Lightning Bolt [4]"
    parseDashSeparatedFormat,  // "4 - Lightning Bolt - Ice Age - Foil"
    parseDetailedFormat,       // "Lightning Bolt - Ice Age - Near Mint - Foil"
    parseSimpleFormat,         // "Lightning Bolt"
  ];

  for (const pattern of patterns) {
    try {
      const result = pattern(line);
      if (result && result.length > 0) {
        return result;
      }
    } catch (error) {
      // Continue to next pattern
      continue;
    }
  }

  // If no pattern matches, try to extract just the card name
  const cardName = extractCardName(line);
  if (cardName) {
    return [{
      id: generateCardId(cardName),
      name: cardName,
      quantity: 1,
      set: '',
      set_name: '',
      foil: false,
      condition: 'NM',
      language: 'EN',
      dateAdded: new Date().toISOString(),
      source: 'text_import'
    }];
  }

  return [];
}

// Pattern: "1 Hazezon, Shaper of Sand (DMC) 32 *F*"
function parseSetCodeFoilFormat(line) {
  const match = line.match(/^(\d+)\s+(.+?)\s*\(([A-Z0-9]{2,4})\)\s*(\d+)?\s*(\*[fF]\*)?(.*)$/);
  if (!match) return null;

  const quantity = parseInt(match[1], 10);
  const cardName = match[2].trim();
  const setCode = match[3];
  const collectorNumber = match[4] || '';
  const foilMarker = match[5];
  const rest = match[6].trim();

  const foil = !!foilMarker;

  // Check for additional attributes in the rest
  let condition = 'NM';
  if (rest) {
    if (isFoilIndicator(rest)) {
      // Additional foil indicators might be present
    }
    if (isConditionIndicator(rest)) {
      condition = normalizeCondition(rest);
    }
  }

  // Detect language from the rest of the text
  const language = detectLanguage(rest);

  return [{
    id: generateCardId(cardName, setCode, foil),
    name: cardName,
    quantity,
    set: setCode.toLowerCase(),
    set_name: setCode,
    collector_number: collectorNumber,
    foil,
    condition,
    language,
    dateAdded: new Date().toISOString(),
    source: 'text_import'
  }];
}

// Pattern: "4x Lightning Bolt" or "4X Lightning Bolt"
function parseQuantityXFormat(line) {
  const match = line.match(/^(\d+)\s*[xX]\s*(.+)$/);
  if (!match) return null;

  const quantity = parseInt(match[1], 10);
  const rest = match[2].trim();
  
  return parseCardDetails(rest, quantity);
}

// Pattern: "4 Lightning Bolt" 
function parseQuantitySpaceFormat(line) {
  const match = line.match(/^(\d+)\s+(.+)$/);
  if (!match) return null;

  const quantity = parseInt(match[1], 10);
  const rest = match[2].trim();
  
  // Make sure the rest doesn't start with a number (to avoid false positives)
  if (/^\d/.test(rest)) return null;
  
  return parseCardDetails(rest, quantity);
}

// Pattern: "Lightning Bolt (4)" 
function parseParenthesesFormat(line) {
  const match = line.match(/^(.+?)\s*\((\d+)\)\s*(.*)$/);
  if (!match) return null;

  const cardPart = match[1].trim();
  const quantity = parseInt(match[2], 10);
  const rest = match[3].trim();
  
  const fullCardInfo = rest ? `${cardPart} ${rest}` : cardPart;
  return parseCardDetails(fullCardInfo, quantity);
}

// Pattern: "Lightning Bolt [4]"
function parseBracketFormat(line) {
  const match = line.match(/^(.+?)\s*\[(\d+)\]\s*(.*)$/);
  if (!match) return null;

  const cardPart = match[1].trim();
  const quantity = parseInt(match[2], 10);
  const rest = match[3].trim();
  
  const fullCardInfo = rest ? `${cardPart} ${rest}` : cardPart;
  return parseCardDetails(fullCardInfo, quantity);
}

// Pattern: "4 - Lightning Bolt - Ice Age - Foil"
function parseDashSeparatedFormat(line) {
  const parts = line.split('-').map(p => p.trim());
  if (parts.length < 2) return null;

  // First part should be quantity
  const firstPart = parts[0];
  const quantityMatch = firstPart.match(/^\d+$/);
  if (!quantityMatch) return null;

  const quantity = parseInt(firstPart, 10);
  const cardName = parts[1];
  
  if (!cardName) return null;

  let set = '';
  let foil = false;
  let condition = 'NM';

  // Parse additional parts
  for (let i = 2; i < parts.length; i++) {
    const part = parts[i].toLowerCase();
    
    if (isFoilIndicator(part)) {
      foil = true;
    } else if (isConditionIndicator(part)) {
      condition = normalizeCondition(part);
    } else if (isSetIndicator(part)) {
      set = parts[i];
    }
  }

  return [{
    id: generateCardId(cardName, set, foil),
    name: cardName,
    quantity,
    set: extractSetCode(set),
    set_name: set,
    foil,
    condition,
    language: 'EN',
    dateAdded: new Date().toISOString(),
    source: 'text_import'
  }];
}

// Pattern: "Lightning Bolt - Ice Age - Near Mint - Foil"
function parseDetailedFormat(line) {
  const parts = line.split('-').map(p => p.trim());
  if (parts.length < 2) return null;

  const cardName = parts[0];
  let set = '';
  let foil = false;
  let condition = 'NM';
  
  // Parse additional parts
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].toLowerCase();
    
    if (isFoilIndicator(part)) {
      foil = true;
    } else if (isConditionIndicator(part)) {
      condition = normalizeCondition(part);
    } else if (isSetIndicator(part)) {
      set = parts[i];
    }
  }

  return [{
    id: generateCardId(cardName, set, foil),
    name: cardName,
    quantity: 1,
    set: extractSetCode(set),
    set_name: set,
    foil,
    condition,
    language: 'EN',
    dateAdded: new Date().toISOString(),
    source: 'text_import'
  }];
}

// Pattern: "Lightning Bolt" (just card name)
function parseSimpleFormat(line) {
  const cardName = extractCardName(line);
  if (!cardName) return null;

  return [{
    id: generateCardId(cardName),
    name: cardName,
    quantity: 1,
    set: '',
    set_name: '',
    foil: false,
    condition: 'NM',
    language: 'EN',
    dateAdded: new Date().toISOString(),
    source: 'text_import'
  }];
}

function parseCardDetails(cardInfo, quantity = 1) {
  const { name, set, foil, condition, language } = extractCardInfo(cardInfo);
  
  if (!name) return null;

  return [{
    id: generateCardId(name, set, foil),
    name,
    quantity,
    set: extractSetCode(set),
    set_name: set,
    foil,
    condition,
    language,
    dateAdded: new Date().toISOString(),
    source: 'text_import'
  }];
}

function extractCardInfo(text) {
  let name = text;
  let set = '';
  let foil = false;
  let condition = 'NM';
  let language = 'EN';

  // Extract set from parentheses: "Lightning Bolt (LEA)"
  const setMatch = text.match(/^(.+?)\s*\(([^)]+)\)(.*)$/);
  if (setMatch) {
    name = setMatch[1].trim();
    set = setMatch[2].trim();
    const rest = setMatch[3].trim();
    if (rest) {
      text = `${name} ${rest}`;
    }
  }

  // Extract set from brackets: "Lightning Bolt [ICE]"
  const bracketSetMatch = text.match(/^(.+?)\s*\[([^\]]+)\](.*)$/);
  if (bracketSetMatch) {
    name = bracketSetMatch[1].trim();
    set = bracketSetMatch[2].trim();
    const rest = bracketSetMatch[3].trim();
    if (rest) {
      text = `${name} ${rest}`;
    }
  }

  // Check for foil indicators
  const foilIndicators = [
    'foil', 'etched', 'showcase', 'borderless', 'extended',
    'alternate', 'promo', 'prerelease', '*f*', '*F*', '(f)', '[f]'
  ];
  
  for (const indicator of foilIndicators) {
    if (text.toLowerCase().includes(indicator.toLowerCase())) {
      foil = true;
      // Remove foil indicator from name
      name = name.replace(new RegExp(indicator.replace(/\*/g, '\\*'), 'gi'), '').trim();
      break;
    }
  }

  // Check for condition indicators
  const conditionIndicators = [
    'mint', 'nm', 'near mint', 'lp', 'light play', 'lightly played', 
    'mp', 'moderate play', 'moderately played', 'hp', 'heavy play', 'heavily played',
    'damaged', 'dmg', 'poor', 'played', 'excellent', 'ex', 'very fine', 'vf', 
    'fine', 'f', 'good', 'g', 'fair', 'fr', 'slightly played', 'sp', 'worn'
  ];
  
  for (const indicator of conditionIndicators) {
    if (text.toLowerCase().includes(indicator.toLowerCase())) {
      condition = normalizeCondition(indicator);
      // Remove condition indicator from text for further processing
      text = text.replace(new RegExp(indicator, 'gi'), '').trim();
      break;
    }
  }

  // Detect language
  language = detectLanguage(text);

  return {
    name: cleanCardName(name),
    set,
    foil,
    condition,
    language
  };
}

function extractCardName(text) {
  if (!text) return '';
  
  // Remove common prefixes and suffixes
  let name = text
    .replace(/^\d+\s*[xX]?\s*/, '') // Remove quantity prefix
    .replace(/\s*\([^)]*\)\s*$/, '') // Remove trailing parentheses
    .replace(/\s*\[[^\]]*\]\s*$/, '') // Remove trailing brackets
    .replace(/\s*-\s*(foil|etched|showcase).*$/i, '') // Remove foil suffixes
    .replace(/\s*\*[fF]\*\s*$/, '') // Remove *F* indicators
    .trim();

  // Basic validation - should have at least one letter
  if (!/[a-zA-Z]/.test(name)) {
    return '';
  }

  return name;
}

function cleanCardName(name) {
  return name
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/['']/g, "'") // Normalize apostrophes
    .trim();
}

function isFoilIndicator(text) {
  const foilKeywords = [
    'foil', 'etched', 'showcase', 'borderless', 'extended',
    'alternate', 'promo', 'prerelease', 'gilded', 'textured', '*f*', '*F*'
  ];
  return foilKeywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()));
}

function isConditionIndicator(text) {
  const conditionKeywords = [
    // TCGPlayer standard conditions
    'mint', 'nm', 'near mint', 'lp', 'light play', 'lightly played', 
    'mp', 'moderate play', 'moderately played', 'hp', 'heavy play', 'heavily played',
    'damaged', 'dmg', 'poor', 'played',
    // Additional variations
    'excellent', 'ex', 'very fine', 'vf', 'fine', 'f', 'good', 'g', 
    'fair', 'fr', 'slightly played', 'sp', 'worn', 'pl'
  ];
  return conditionKeywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()));
}

function isSetIndicator(text) {
  // Check if text looks like a set name or code
  return text.length >= 2 && (
    text.length === 3 || // 3-letter set codes
    text.match(/^[A-Z0-9]{2,4}$/i) || // 2-4 character codes
    text.match(/\b(edition|masters|horizons|remastered|chronicles)\b/i) // Set name indicators
  );
}

function normalizeCondition(condition) {
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

function extractSetCode(setName) {
  if (!setName) return '';
  
  // If it's already a short code, return as-is
  if (setName.length <= 4 && /^[A-Z0-9]+$/i.test(setName)) {
    return setName.toLowerCase();
  }
  
  // Common set mappings (same as in csvParser.js)
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
  return setMappings[lowerSetName] || setName.substring(0, 3).toLowerCase();
}

function normalizeLanguage(language) {
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

function detectLanguage(text) {
  // Common language indicators in card descriptions
  const languageIndicators = [
    'english', 'en', 'spanish', 'es', 'french', 'fr', 'german', 'de',
    'italian', 'it', 'portuguese', 'pt', 'japanese', 'ja', 'korean', 'ko',
    'chinese', 'zh', 'russian', 'ru', 'phyrexian', 'ph'
  ];
  
  const lowerText = text.toLowerCase();
  for (const indicator of languageIndicators) {
    if (lowerText.includes(indicator)) {
      return normalizeLanguage(indicator);
    }
  }
  
  return 'EN'; // Default to English
}

function generateCardId(name, set = '', foil = false) {
  const parts = [
    name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
    set || 'unknown',
    foil ? 'foil' : 'normal'
  ];
  
  return parts.join('-') + '-' + Date.now() + '-' + Math.random().toString(36).substring(7);
}