// Simple Text Parser - Handles plain text files (.txt format)
// Supports simple card lists with quantities and sideboard sections

export async function parseSimpleText(textContent) {
  if (!textContent || !textContent.trim()) {
    throw new Error('Text content is empty');
  }

  const lines = textContent
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const cards = [];
  let currentSection = 'mainboard';
  
  for (const line of lines) {
    try {
      // Check for section headers
      if (isSectionHeader(line)) {
        currentSection = determineSectionType(line);
        continue;
      }

      // Skip empty lines and comments
      if (!line || line.startsWith('//') || line.startsWith('#')) {
        continue;
      }

      const parsedCard = parseSimpleTextLine(line, currentSection);
      if (parsedCard) {
        cards.push(parsedCard);
      }
    } catch (error) {
      console.warn('Skipping invalid line:', line, error.message);
    }
  }

  if (cards.length === 0) {
    throw new Error('No valid cards found in text');
  }

  return cards;
}

function parseSimpleTextLine(line, section = 'mainboard') {
  if (!line || line.trim().length === 0) {
    return null;
  }

  // Pattern: "4 Lightning Bolt" or "1 Hazezon, Shaper of Sand"
  const match = line.match(/^(\d+)\s+(.+)$/);
  
  if (!match) {
    // Try without quantity (assume 1)
    const cardName = extractCardName(line);
    if (cardName) {
      return createCard(cardName, 1, section);
    }
    return null;
  }

  const quantity = parseInt(match[1], 10);
  const cardInfo = match[2].trim();
  
  if (!cardInfo || quantity <= 0) {
    return null;
  }

  const cardName = extractCardName(cardInfo);
  if (!cardName) {
    return null;
  }

  return createCard(cardName, quantity, section);
}

function createCard(name, quantity, section) {
  const sideboard = section === 'sideboard' || section === 'maybeboard';
  
  // Apply basic normalization for consistency
  const normalizedCondition = 'NM'; // Simple text doesn't specify condition
  const normalizedLanguage = 'EN'; // Simple text defaults to English
  
  return {
    id: generateCardId(name, section),
    name: name,
    quantity: quantity,
    sideboard: sideboard,
    section: section,
    set: '',
    set_name: '',
    foil: false,
    condition: normalizedCondition,
    language: normalizedLanguage,
    dateAdded: new Date().toISOString(),
    source: 'txt_import'
  };
}

function extractCardName(text) {
  if (!text) return '';
  
  // Remove common patterns and clean up
  let name = text
    .replace(/^\d+\s*[xX]?\s*/, '') // Remove quantity prefix
    .replace(/\s*\([^)]*\)\s*$/, '') // Remove trailing parentheses (like set codes)
    .replace(/\s*\[[^\]]*\]\s*$/, '') // Remove trailing brackets
    .replace(/\s*\*[fF]\*\s*$/, '') // Remove foil indicators
    .trim();

  // Basic validation - should have at least one letter
  if (!/[a-zA-Z]/.test(name)) {
    return '';
  }

  return cleanCardName(name);
}

function cleanCardName(name) {
  return name
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/['']/g, "'") // Normalize apostrophes
    .trim();
}

function isSectionHeader(line) {
  const sectionKeywords = [
    'sideboard', 'side board', 'sb',
    'maybeboard', 'maybe board', 'mb',
    'mainboard', 'main board', 'main',
    'deck', 'commander', 'command zone'
  ];
  
  const lowerLine = line.toLowerCase();
  
  // Check for section markers
  if (lowerLine.startsWith('//') && sectionKeywords.some(keyword => lowerLine.includes(keyword))) {
    return true;
  }
  
  // Check for standalone section headers
  return sectionKeywords.some(keyword => 
    lowerLine === keyword || 
    lowerLine === `${keyword}:` ||
    lowerLine === `// ${keyword}` ||
    lowerLine === `# ${keyword}`
  );
}

function determineSectionType(line) {
  const lowerLine = line.toLowerCase();
  
  if (lowerLine.includes('sideboard') || lowerLine.includes('side board') || lowerLine.includes('sb')) {
    return 'sideboard';
  }
  
  if (lowerLine.includes('maybeboard') || lowerLine.includes('maybe board') || lowerLine.includes('mb')) {
    return 'maybeboard';
  }
  
  if (lowerLine.includes('commander') || lowerLine.includes('command zone')) {
    return 'commander';
  }
  
  return 'mainboard';
}

function generateCardId(name, section = 'mainboard') {
  const parts = [
    name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
    section,
    'txt'
  ];
  
  return parts.join('-') + '-' + Date.now() + '-' + Math.random().toString(36).substring(7);
}

// Helper function to validate simple text format
export function isSimpleTextFormat(content) {
  if (!content || typeof content !== 'string') {
    return false;
  }

  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  // Check if most lines follow the pattern "number cardname"
  let validLines = 0;
  let totalLines = 0;
  
  for (const line of lines) {
    if (line.startsWith('//') || line.startsWith('#') || isSectionHeader(line)) {
      continue; // Skip comments and headers
    }
    
    totalLines++;
    
    if (line.match(/^\d+\s+[a-zA-Z]/) || line.match(/^[a-zA-Z]/)) {
      validLines++;
    }
  }
  
  // Consider it valid if at least 70% of lines follow the pattern
  return totalLines > 0 && (validLines / totalLines) >= 0.7;
}

// Convert simple text cards to standard format for collection
export function convertSimpleTextToCollection(cards) {
  if (!Array.isArray(cards)) {
    throw new Error('Invalid cards array');
  }

  return cards.map(card => ({
    id: card.id,
    name: card.name,
    quantity: card.quantity,
    set: card.set || '',
    set_name: card.set_name || '',
    foil: card.foil || false,
    condition: card.condition || 'NM',
    language: card.language || 'EN',
    sideboard: card.sideboard || false,
    section: card.section || 'mainboard',
    dateAdded: card.dateAdded,
    source: 'txt_import'
  }));
}