// .DEK Parser - Handles XML deck files (.dek format)
// Supports the XML format used by various deck building applications

export async function parseDek(xmlContent) {
  if (!xmlContent || !xmlContent.trim()) {
    throw new Error('DEK content is empty');
  }

  try {
    // Parse XML content
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid XML format');
    }

    // Get the root Deck element
    const deckElement = xmlDoc.querySelector('Deck');
    if (!deckElement) {
      throw new Error('No Deck element found in XML');
    }

    // Extract deck metadata
    const deckName = deckElement.querySelector('Name')?.textContent || 'Imported Deck';
    const netDeckID = deckElement.querySelector('NetDeckID')?.textContent || '0';
    const preconstructedDeckID = deckElement.querySelector('PreconstructedDeckID')?.textContent || '0';

    // Get all Cards elements
    const cardElements = deckElement.querySelectorAll('Cards');
    
    if (cardElements.length === 0) {
      throw new Error('No cards found in deck');
    }

    const cards = [];
    
    cardElements.forEach(cardElement => {
      const card = parseCardElement(cardElement);
      if (card) {
        cards.push(card);
      }
    });

    if (cards.length === 0) {
      throw new Error('No valid cards found in deck');
    }

    return {
      cards,
      metadata: {
        deckName,
        netDeckID,
        preconstructedDeckID,
        totalCards: cards.reduce((sum, card) => sum + card.quantity, 0),
        mainboardCount: cards.filter(c => !c.sideboard).reduce((sum, card) => sum + card.quantity, 0),
        sideboardCount: cards.filter(c => c.sideboard).reduce((sum, card) => sum + card.quantity, 0)
      }
    };

  } catch (error) {
    console.error('Error parsing DEK file:', error);
    throw new Error(`Failed to parse DEK file: ${error.message}`);
  }
}

function parseCardElement(cardElement) {
  try {
    // Extract attributes
    const catID = cardElement.getAttribute('CatID');
    const quantity = parseInt(cardElement.getAttribute('Quantity'), 10);
    const sideboard = cardElement.getAttribute('Sideboard') === 'true';
    const name = cardElement.getAttribute('Name');

    if (!name || isNaN(quantity) || quantity <= 0) {
      console.warn('Invalid card element:', cardElement);
      return null;
    }

    // Generate card data with normalized defaults
    const card = {
      id: generateCardId(name, catID),
      name: name.trim(),
      quantity,
      sideboard,
      catID,
      set: '', // DEK format doesn't typically include set info
      set_name: '',
      foil: false, // DEK format doesn't typically include foil info
      condition: 'NM', // DEK format defaults to Near Mint
      language: 'EN', // DEK format defaults to English
      dateAdded: new Date().toISOString(),
      source: 'dek_import'
    };

    return card;

  } catch (error) {
    console.warn('Error parsing card element:', error);
    return null;
  }
}

function generateCardId(name, catID = '') {
  const parts = [
    name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
    catID || 'unknown',
    'dek'
  ];
  
  return parts.join('-') + '-' + Date.now() + '-' + Math.random().toString(36).substring(7);
}

// Helper function to validate DEK format
export function isDekFormat(content) {
  if (!content || typeof content !== 'string') {
    return false;
  }

  // Check for basic XML structure and Deck element
  return content.trim().startsWith('<?xml') && 
         content.includes('<Deck') && 
         content.includes('<Cards') &&
         content.includes('Name=');
}

// Convert DEK cards to standard format for collection
export function convertDekToCollection(dekResult) {
  if (!dekResult || !dekResult.cards) {
    throw new Error('Invalid DEK result');
  }

  return dekResult.cards.map(card => ({
    id: card.id,
    name: card.name,
    quantity: card.quantity,
    set: card.set || '',
    set_name: card.set_name || '',
    foil: card.foil || false,
    condition: card.condition || 'NM',
    language: card.language || 'EN',
    sideboard: card.sideboard || false,
    catID: card.catID,
    dateAdded: card.dateAdded,
    source: 'dek_import'
  }));
}