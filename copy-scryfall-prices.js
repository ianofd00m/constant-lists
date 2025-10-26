// copy-scryfall-prices.js
// This script copies price data from scryfall_json.prices to the top-level prices field

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { exit } from 'process';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  exit(1);
});

// Define Card schema
const CardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  scryfall_id: { type: String },
  set: { type: String },
  collector_number: { type: String },
  type_line: String,
  cmc: Number,
  mana_cost: String,
  color_identity: [String],
  prices: {
    usd: String,
    usd_foil: String,
    eur: String,
    eur_foil: String,
    tix: String
  },
  scryfall_json: Object,
});

// Create Card model
const Card = mongoose.model('Card', CardSchema, 'cards');

async function copyCardPrices() {
  try {
    console.log('Starting price copying process...');
    
    // Count cards without proper price data
    const cardsWithoutPrices = await Card.countDocuments({
      'prices.usd': { $in: [null, "", "0.01"] },
      'scryfall_json.prices.usd': { $exists: true, $ne: null, $ne: "" }
    });
    
    console.log(`Found ${cardsWithoutPrices} cards that need price copying from Scryfall data`);
    
    // Process in batches to avoid memory issues
    const batchSize = 1000;
    let processedCount = 0;
    let updatedCount = 0;
    let totalCards = await Card.countDocuments();
    
    // Use a cursor for efficient processing
    const cursor = Card.find().cursor();
    
    for (let i = 0; i < totalCards; i += batchSize) {
      const cards = [];
      
      // Collect a batch of cards
      for (let j = 0; j < batchSize && processedCount < totalCards; j++) {
        const card = await cursor.next();
        if (!card) break;
        cards.push(card);
        processedCount++;
      }
      
      // Process this batch
      console.log(`Processing batch: ${processedCount}/${totalCards} cards`);
      
      // Keep track of how many we update in this batch
      let batchUpdates = 0;
      
      // Create update operations for this batch
      const updateOperations = cards.map(card => {
        // Skip if card already has a real USD price at top level
        const currentPrice = card.prices?.usd;
        if (currentPrice && currentPrice !== "0.01" && currentPrice !== "") {
          return null;
        }
        
        // Get prices from scryfall_json if available
        const scryfallPrices = card.scryfall_json?.prices;
        if (!scryfallPrices) {
          return null;
        }
        
        // Create prices object for update
        const pricesUpdate = {};
        
        // Copy each price field that exists in scryfall_json
        if (scryfallPrices.usd !== undefined && scryfallPrices.usd !== null) {
          pricesUpdate['prices.usd'] = scryfallPrices.usd;
        }
        if (scryfallPrices.usd_foil !== undefined && scryfallPrices.usd_foil !== null) {
          pricesUpdate['prices.usd_foil'] = scryfallPrices.usd_foil;
        }
        if (scryfallPrices.eur !== undefined && scryfallPrices.eur !== null) {
          pricesUpdate['prices.eur'] = scryfallPrices.eur;
        }
        if (scryfallPrices.eur_foil !== undefined && scryfallPrices.eur_foil !== null) {
          pricesUpdate['prices.eur_foil'] = scryfallPrices.eur_foil;
        }
        if (scryfallPrices.tix !== undefined && scryfallPrices.tix !== null) {
          pricesUpdate['prices.tix'] = scryfallPrices.tix;
        }
        
        // Only create an update if we have prices to copy
        if (Object.keys(pricesUpdate).length === 0) {
          return null;
        }
        
        batchUpdates++;
        
        // Return the update operation
        return {
          updateOne: {
            filter: { _id: card._id },
            update: { $set: pricesUpdate }
          }
        };
      }).filter(op => op !== null); // Filter out null operations
      
      // Execute batch update if we have operations
      if (updateOperations.length > 0) {
        const result = await Card.bulkWrite(updateOperations);
        updatedCount += result.modifiedCount;
        console.log(`Updated ${batchUpdates} cards in this batch`);
      }
    }
    
    console.log(`\nTotal cards processed: ${processedCount}`);
    console.log(`Total cards updated: ${updatedCount}`);
    
    // Verify results
    const remainingCardsWithoutRealPrices = await Card.countDocuments({
      'prices.usd': { $in: [null, "", "0.01"] },
      'scryfall_json.prices.usd': { $exists: true, $ne: null, $ne: "" }
    });
    
    console.log(`\nVerification: ${remainingCardsWithoutRealPrices} cards still need price updates`);
    
    if (remainingCardsWithoutRealPrices === 0) {
      console.log('✅ SUCCESS: All cards with Scryfall prices now have proper top-level price data!');
    } else {
      console.log('⚠️ Some cards still need price updates. Try running the script again or check for errors.');
    }
    
    // Clean up
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (err) {
    console.error('Error in copyCardPrices:', err);
  }
}

// Run the script
copyCardPrices()
  .then(() => {
    console.log('Price copying process completed');
    exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    exit(1);
  });
