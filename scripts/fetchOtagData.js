// Script to fetch otag data from Scryfall API and update MongoDB cards
// Usage: node scripts/fetchOtagData.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';

const cardSchema = new mongoose.Schema({}, { collection: 'cards' });
const Card = mongoose.model('Card', cardSchema);

// Rate limiting to respect Scryfall's API limits (50-100 requests per second)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchOtagsForCard(scryfallId) {
  try {
    const response = await fetch(`https://api.scryfall.com/cards/${scryfallId}`);
    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited, wait longer
        console.log('Rate limited, waiting 1 second...');
        await delay(1000);
        return await fetchOtagsForCard(scryfallId);
      }
      return null;
    }
    const data = await response.json();
    return data.otags || [];
  } catch (error) {
    console.error(`Error fetching otags for ${scryfallId}:`, error.message);
    return null;
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Find some popular cards first to test with
  const popularCardNames = [
    'Lightning Bolt', 'Sol Ring', 'Path to Exile', 'Counterspell', 'Swords to Plowshares',
    'Dark Ritual', 'Giant Growth', 'Llanowar Elves', 'Wrath of God', 'Ancestral Recall',
    'Time Walk', 'Black Lotus', 'Mox Pearl', 'Force of Will', 'Brainstorm'
  ];

  // First, find cards with scryfall_id that match popular names
  const cardsToUpdate = await Card.find({
    name: { $in: popularCardNames },
    scryfall_id: { $exists: true },
    otags: { $exists: false }
  }).limit(50).lean();

  console.log(`Found ${cardsToUpdate.length} popular cards to update with otag data`);

  if (cardsToUpdate.length === 0) {
    // If no popular cards found, get any cards with scryfall_id
    const anyCards = await Card.find({
      scryfall_id: { $exists: true },
      otags: { $exists: false }
    }).limit(50).lean();
    
    console.log(`Found ${anyCards.length} cards with scryfall_id to update`);
    cardsToUpdate.push(...anyCards);
  }

  let updatedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < cardsToUpdate.length; i++) {
    const card = cardsToUpdate[i];
    
    console.log(`Processing card ${i + 1}/${cardsToUpdate.length}: ${card.name} (${card.scryfall_id})`);

    if (!card.scryfall_id) {
      console.log(`Skipping ${card.name} - no scryfall_id`);
      continue;
    }

    const otags = await fetchOtagsForCard(card.scryfall_id);
    
    if (otags !== null) {
      try {
        await Card.updateOne(
          { _id: card._id },
          { $set: { otags: otags } }
        );
        
        if (otags.length > 0) {
          console.log(`✓ Updated ${card.name} with ${otags.length} otags: ${otags.join(', ')}`);
        } else {
          console.log(`✓ Updated ${card.name} with no otags`);
        }
        updatedCount++;
      } catch (error) {
        console.error(`Error updating ${card.name}:`, error.message);
        errorCount++;
      }
    } else {
      console.log(`✗ Failed to fetch otags for ${card.name}`);
      errorCount++;
    }

    // Rate limiting - wait 50ms between requests (20 requests per second)
    await delay(50);
  }

  console.log(`\nCompleted! Updated ${updatedCount} cards, ${errorCount} errors`);
  
  // Show some statistics
  const cardsWithOtags = await Card.countDocuments({ otags: { $exists: true, $ne: [] } });
  const totalCards = await Card.countDocuments({});
  console.log(`Cards with otags: ${cardsWithOtags}/${totalCards}`);

  await mongoose.disconnect();
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
