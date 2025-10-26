// frontend-card-patch.js
// This script adds direct cmc and price fields to card objects when loading a deck
// Add this code to the end of the src/components/DeckViewEdit.jsx file

// Helper function to enhance cards with cmc and price data
function enhanceCardsWithCmcAndPrice(cards) {
  console.log('[DEBUG] Enhancing cards with direct cmc and price fields', cards.length);
  return cards.map(card => {
    // Skip null or non-object cards
    if (!card || typeof card !== 'object') return card;
    
    // Clone to avoid modifying original
    const enhancedCard = { ...card };
    
    // For nested card objects
    if (enhancedCard.card && typeof enhancedCard.card === 'object') {
      // Add CMC if available in any location
      const cmcValue = 
        enhancedCard.card.cmc !== undefined ? enhancedCard.card.cmc :
        enhancedCard.card.scryfall_json?.cmc !== undefined ? enhancedCard.card.scryfall_json.cmc :
        null;
      
      if (cmcValue !== null) {
        // Add to both levels
        enhancedCard.cmc = cmcValue;
        enhancedCard.card.cmc = cmcValue;
      }
      
      // Add price if available in any location
      const priceValue = 
        enhancedCard.card.prices?.usd !== undefined ? enhancedCard.card.prices.usd :
        enhancedCard.card.scryfall_json?.prices?.usd !== undefined ? enhancedCard.card.scryfall_json.prices.usd :
        null;
      
      if (priceValue !== null) {
        // Create prices objects if needed
        if (!enhancedCard.prices) enhancedCard.prices = {};
        if (!enhancedCard.card.prices) enhancedCard.card.prices = {};
        
        // Add to both levels
        enhancedCard.prices.usd = priceValue;
        enhancedCard.card.prices.usd = priceValue;
      }
    } else {
      // For flat card objects
      const cmcValue = 
        enhancedCard.cmc !== undefined ? enhancedCard.cmc :
        enhancedCard.scryfall_json?.cmc !== undefined ? enhancedCard.scryfall_json.cmc :
        null;
      
      if (cmcValue !== null) {
        enhancedCard.cmc = cmcValue;
      }
      
      const priceValue = 
        enhancedCard.prices?.usd !== undefined ? enhancedCard.prices.usd :
        enhancedCard.scryfall_json?.prices?.usd !== undefined ? enhancedCard.scryfall_json.prices.usd :
        null;
      
      if (priceValue !== null) {
        if (!enhancedCard.prices) enhancedCard.prices = {};
        enhancedCard.prices.usd = priceValue;
      }
    }
    
    return enhancedCard;
  });
}

// Add this to DeckViewEdit.jsx's useEffect block that loads deck data
// Insert after this line: const responseData = await response.json();
// responseData.cards = enhanceCardsWithCmcAndPrice(responseData.cards);

// Enhanced debug version of logCardStructure function
function logCardStructure(card, prefix = '') {
  if (!card) {
    console.log(`${prefix} Card is null or undefined`);
    return;
  }
  
  if (typeof card === 'string') {
    console.log(`${prefix} String card: "${card}"`);
    return;
  }
  
  if (typeof card !== 'object') {
    console.log(`${prefix} Not an object: ${typeof card}`);
    return;
  }
  
  // Basic info
  const name = card.card?.name || card.name || 'No name';
  console.log(`${prefix} Name: ${name}`);
  
  // Check all possible locations for mana value (cmc)
  const cmcDirectOnCard = card.cmc !== undefined ? card.cmc : undefined;
  const cmcOnNestedCard = card.card?.cmc !== undefined ? card.card.cmc : undefined;
  const cmcInScryfallJson = card.card?.scryfall_json?.cmc !== undefined ? card.card.scryfall_json.cmc : undefined;
  const cmcInCardScryfallJson = card.scryfall_json?.cmc !== undefined ? card.scryfall_json.cmc : undefined;
  
  console.log(`${prefix} cmc (direct): ${cmcDirectOnCard !== undefined ? cmcDirectOnCard : 'Missing'}`);
  console.log(`${prefix} cmc (card.cmc): ${cmcOnNestedCard !== undefined ? cmcOnNestedCard : 'Missing'}`);
  console.log(`${prefix} cmc (card.scryfall_json.cmc): ${cmcInScryfallJson !== undefined ? cmcInScryfallJson : 'Missing'}`);
  console.log(`${prefix} cmc (scryfall_json.cmc): ${cmcInCardScryfallJson !== undefined ? cmcInCardScryfallJson : 'Missing'}`);
  
  // Check all possible locations for price
  const priceDirectOnCard = card.prices?.usd !== undefined ? card.prices.usd : undefined;
  const priceOnNestedCard = card.card?.prices?.usd !== undefined ? card.card.prices.usd : undefined;
  const priceInScryfallJson = card.card?.scryfall_json?.prices?.usd !== undefined ? card.card.scryfall_json.prices.usd : undefined;
  const priceInCardScryfallJson = card.scryfall_json?.prices?.usd !== undefined ? card.scryfall_json.prices.usd : undefined;
  
  console.log(`${prefix} price (prices.usd): ${priceDirectOnCard !== undefined ? priceDirectOnCard : 'Missing'}`);
  console.log(`${prefix} price (card.prices.usd): ${priceOnNestedCard !== undefined ? priceOnNestedCard : 'Missing'}`);
  console.log(`${prefix} price (card.scryfall_json.prices.usd): ${priceInScryfallJson !== undefined ? priceInScryfallJson : 'Missing'}`);
  console.log(`${prefix} price (scryfall_json.prices.usd): ${priceInCardScryfallJson !== undefined ? priceInCardScryfallJson : 'Missing'}`);
}

// Add this to small helper function for logging card groups
function logCardGroup(cards, groupName) {
  if (!Array.isArray(cards) || cards.length === 0) return;
  console.log(`==== Group: ${groupName} (${cards.length} cards) ====`);
  
  // Log the first card in detail
  if (cards.length > 0) {
    const firstCard = cards[0];
    logCardStructure(firstCard, 'First card in group:');
  }
  
  // Count cards with/without mana values
  let cardsWithCmc = 0;
  let cardsWithPrice = 0;
  
  for (const card of cards) {
    if (!card) continue;
    
    // Check if card has cmc in any form
    const hasCmc = 
      card.cmc !== undefined || 
      card.card?.cmc !== undefined || 
      card.card?.scryfall_json?.cmc !== undefined ||
      card.scryfall_json?.cmc !== undefined;
    
    if (hasCmc) cardsWithCmc++;
    
    // Check if card has price in any form
    const hasPrice = 
      card.prices?.usd !== undefined || 
      card.card?.prices?.usd !== undefined || 
      card.card?.scryfall_json?.prices?.usd !== undefined ||
      card.scryfall_json?.prices?.usd !== undefined;
    
    if (hasPrice) cardsWithPrice++;
  }
  
  console.log(`Cards with mana value: ${cardsWithCmc}/${cards.length}`);
  console.log(`Cards with price: ${cardsWithPrice}/${cards.length}`);
}

console.log('Frontend card patch loaded');
