// Quick test to verify the price extraction and sorting functionality
// This can be run with node test-research-price-sorting.js

// Copy the extractPrice function from ResearchPage
const extractPrice = (c) => {
  if (!c || typeof c !== "object") {
    return { price: null, source: "invalid_card_object", cardType: "unknown" };
  }

  // For research page, we use simpler price extraction since cards come directly from Scryfall
  const prices = c.prices || {};
  
  // Default to non-foil price, but could be enhanced later to support foil toggle
  let price = prices.usd || null;
  let source = "regular_usd";
  let cardType = "normal";
  
  return {
    price,
    source,
    isFoil: false,
    cardType,
  };
};

// Test data mimicking Scryfall API response
const testCards = [
  {
    id: "1",
    name: "Lightning Bolt",
    prices: { usd: "0.50", usd_foil: "2.00" },
    type_line: "Instant"
  },
  {
    id: "2", 
    name: "Black Lotus",
    prices: { usd: "50000.00" },
    type_line: "Artifact"
  },
  {
    id: "3",
    name: "Basic Plains",
    prices: { usd: "0.05" },
    type_line: "Basic Land — Plains"
  },
  {
    id: "4",
    name: "Expensive Card",
    prices: { usd: null }, // No price available
    type_line: "Creature — Human"
  }
];

console.log("Testing price extraction:");
testCards.forEach(card => {
  const result = extractPrice(card);
  console.log(`${card.name}: $${result.price || 'N/A'} (${result.source})`);
});

// Test price sorting
console.log("\nTesting price sorting (ascending):");
const sortedCards = [...testCards].sort((a, b) => {
  const getPriceValue = card => {
    const { price } = extractPrice(card);
    return price ? Number(price) : 0;
  };
  const priceA = getPriceValue(a);
  const priceB = getPriceValue(b);
  return priceA - priceB;
});

sortedCards.forEach(card => {
  const { price } = extractPrice(card);
  console.log(`${card.name}: $${price || 'N/A'}`);
});

console.log("\nTesting price sorting (descending):");
const sortedCardsDesc = [...testCards].sort((a, b) => {
  const getPriceValue = card => {
    const { price } = extractPrice(card);
    return price ? Number(price) : 0;
  };
  const priceA = getPriceValue(a);
  const priceB = getPriceValue(b);
  return priceB - priceA; // Reversed for descending
});

sortedCardsDesc.forEach(card => {
  const { price } = extractPrice(card);
  console.log(`${card.name}: $${price || 'N/A'}`);
});
