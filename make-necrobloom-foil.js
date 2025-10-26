// Script to add foil property to The Necrobloom card and test the foil effect
console.log("=== ADDING FOIL TO NECROBLOOM CARD ===");

// Function to modify the deck data to make The Necrobloom foil
async function makeFoilNecrobloom() {
  try {
    // Get the current URL to extract deck ID
    const urlParts = window.location.pathname.split('/');
    const deckId = urlParts[urlParts.length - 1];
    console.log("Current deck ID:", deckId);
    
    if (!deckId || deckId === 'decks') {
      console.log("❌ No deck ID found in URL");
      return;
    }
    
    // Get the current deck data
    const response = await fetch(`/api/decks/${deckId}`);
    const deck = await response.json();
    console.log("Current deck data:", deck);
    
    // Find The Necrobloom card in the deck
    const necrobloomCard = deck.cards.find(card => 
      card.card.name.toLowerCase().includes('necrobloom') ||
      card.card.scryfall_json?.name?.toLowerCase().includes('necrobloom')
    );
    
    if (!necrobloomCard) {
      console.log("❌ Necrobloom card not found in deck");
      return;
    }
    
    console.log("Found Necrobloom card:", necrobloomCard);
    
    // Set the foil property
    necrobloomCard.foil = true;
    console.log("Set foil property to true");
    
    // Update the deck in the database
    const updateResponse = await fetch(`/api/decks/${deckId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deck)
    });
    
    if (updateResponse.ok) {
      console.log("✅ Successfully updated deck with foil Necrobloom!");
      console.log("Refreshing page to see changes...");
      window.location.reload();
    } else {
      console.log("❌ Failed to update deck:", updateResponse.status);
    }
    
  } catch (error) {
    console.error("Error updating deck:", error);
  }
}

// Run the function
makeFoilNecrobloom();

// Also make it globally available
window.makeFoilNecrobloom = makeFoilNecrobloom;
console.log("💡 Function available globally: makeFoilNecrobloom()");
