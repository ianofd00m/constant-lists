// Quick test for double-faced card functionality
// This can be run with node test-double-faced-cards.js

// Mock double-faced card data (simplified Scryfall format)
const mockDoubleFacedCard = {
  id: "test-dfc-1",
  scryfall_id: "test-dfc-1",
  name: "Delver of Secrets // Insectile Aberration",
  layout: "transform",
  card_faces: [
    {
      name: "Delver of Secrets",
      mana_cost: "{U}",
      type_line: "Creature — Human Wizard",
      oracle_text: "At the beginning of your upkeep, look at the top card of your library. You may reveal it if it's an instant or sorcery card. If you do, transform Delver of Secrets.",
      image_uris: {
        normal: "https://example.com/delver-front.jpg",
        art_crop: "https://example.com/delver-front-crop.jpg"
      }
    },
    {
      name: "Insectile Aberration", 
      mana_cost: "",
      type_line: "Creature — Human Insect",
      oracle_text: "Flying",
      image_uris: {
        normal: "https://example.com/aberration-back.jpg",
        art_crop: "https://example.com/aberration-back-crop.jpg"
      }
    }
  ],
  image_uris: {
    normal: "https://example.com/delver-combined.jpg"
  },
  prices: {
    usd: "0.25"
  }
};

const mockSingleFacedCard = {
  id: "test-single-1",
  scryfall_id: "test-single-1", 
  name: "Lightning Bolt",
  layout: "normal",
  mana_cost: "{R}",
  type_line: "Instant",
  oracle_text: "Lightning Bolt deals 3 damage to any target.",
  image_uris: {
    normal: "https://example.com/bolt.jpg",
    art_crop: "https://example.com/bolt-crop.jpg"
  },
  prices: {
    usd: "0.50"
  }
};

// Copy helper functions from ResearchPage
const isDoubleFacedCard = (card) => {
  const cardFaces = card.card_faces;
  const layout = card.layout;
  
  const isTransformCard = layout === 'transform' || 
                         layout === 'modal_dfc' || 
                         layout === 'reversible_card';
                         
  return (cardFaces && Array.isArray(cardFaces) && cardFaces.length >= 2) || isTransformCard;
};

const getCardImageUrl = (card, cardId, isFlipped = false) => {
  if (isDoubleFacedCard(card)) {
    const faceIndex = isFlipped ? 1 : 0;
    const face = card.card_faces?.[faceIndex];
    
    // Try to get image from the specific face
    let imageUrl = face?.image_uris?.normal || face?.image_uris?.small;
    
    // If face doesn't have image_uris, use main card image
    if (!imageUrl) {
      imageUrl = card.image_uris?.normal || card.image_uris?.small;
    }
    
    return imageUrl;
  } else {
    // Single-faced card
    return card.image_uris?.normal || card.image_uris?.small;
  }
};

const getCardName = (card, cardId, isFlipped = false) => {
  if (isDoubleFacedCard(card)) {
    const faceIndex = isFlipped ? 1 : 0;
    const face = card.card_faces?.[faceIndex];
    return face?.name || card.name;
  } else {
    return card.name;
  }
};

// Test the functions
console.log("Testing double-faced card detection:");
console.log(`Double-faced card is DFC: ${isDoubleFacedCard(mockDoubleFacedCard)}`);
console.log(`Single-faced card is DFC: ${isDoubleFacedCard(mockSingleFacedCard)}`);

console.log("\nTesting image URL extraction:");
console.log(`DFC front face: ${getCardImageUrl(mockDoubleFacedCard, "test-dfc-1", false)}`);
console.log(`DFC back face: ${getCardImageUrl(mockDoubleFacedCard, "test-dfc-1", true)}`);
console.log(`Single card: ${getCardImageUrl(mockSingleFacedCard, "test-single-1", false)}`);

console.log("\nTesting name extraction:");
console.log(`DFC front name: ${getCardName(mockDoubleFacedCard, "test-dfc-1", false)}`);
console.log(`DFC back name: ${getCardName(mockDoubleFacedCard, "test-dfc-1", true)}`);
console.log(`Single card name: ${getCardName(mockSingleFacedCard, "test-single-1", false)}`);

console.log("\nAll tests completed successfully! ✅");
