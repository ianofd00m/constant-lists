// Helper function to get the actual Scryfall ID for a card from search results
// This handles the mapping from Typesense local IDs to real Scryfall IDs

export async function getActualScryfallId(searchResultCard) {
  // If we already have a properly formatted Scryfall ID, use it
  if (searchResultCard.scryfall_id && 
      typeof searchResultCard.scryfall_id === 'string' && 
      searchResultCard.scryfall_id.includes('-') && 
      searchResultCard.scryfall_id.length === 36) {
    return searchResultCard.scryfall_id;
  }

  // Check for nested Scryfall data
  if (searchResultCard.scryfall_json?.id) {
    return searchResultCard.scryfall_json.id;
  }

  // If we don't have a real Scryfall ID, we need to look it up
  // Use Scryfall's search API to find the card by name and set
  try {
    const searchQuery = `"${searchResultCard.name}"`;
    const setFilter = searchResultCard.set ? ` set:${searchResultCard.set}` : '';
    const collectorFilter = searchResultCard.collector_number ? ` cn:${searchResultCard.collector_number}` : '';
    
    const fullQuery = searchQuery + setFilter + collectorFilter;
    
    const response = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(fullQuery)}&unique=prints`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        // Return the first match - this should be the exact printing we want
        return data.data[0].id;
      }
    }
  } catch (error) {
    console.warn('Failed to lookup Scryfall ID for card:', searchResultCard.name, error);
  }

  // Fallback: return null to indicate we need to use name lookup
  return null;
}

export async function addCardWithCorrectPrinting(cardToAdd, deck, addCardFunction) {
  try {
    // Get the actual Scryfall ID for this specific printing
    const actualScryfallId = await getActualScryfallId(cardToAdd);
    
    if (actualScryfallId) {
      // We have a real Scryfall ID, use it directly
      console.log(`Adding card ${cardToAdd.name} with Scryfall ID: ${actualScryfallId}`);
      return await addCardFunction(actualScryfallId, 1);
    } else {
      // Fall back to name lookup, then correct the printing
      console.log(`Adding card ${cardToAdd.name} by name, will correct printing afterwards`);
      const result = await addCardFunction(`name:${cardToAdd.name}`, 1);
      
      // If the result doesn't match our desired printing, correct it
      // This would need to be implemented based on your card update mechanism
      return result;
    }
  } catch (error) {
    console.error('Error adding card with correct printing:', error);
    throw error;
  }
}
