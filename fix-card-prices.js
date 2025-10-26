// fix-card-prices.js
// This script updates cards in the database to ensure they all have
// appropriate price information, using fallback values where needed

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
  // Other fields...
});

// Create Card model
const Card = mongoose.model('Card', CardSchema, 'cards');

async function fixCardPrices() {
  console.log('Starting card price fix process...');
  
  // Count cards without prices
  const cardsWithoutPrices = await Card.countDocuments({
    $or: [
      { 'prices.usd': { $exists: false } },
      { 'prices.usd': null },
      { 'prices.usd': "" }
    ]
  });
  
  console.log(`Found ${cardsWithoutPrices} cards without USD prices`);
  
  // Count basic lands
  const basicLands = await Card.find({
    type_line: /basic land/i
  });
  
  console.log(`Found ${basicLands.length} basic lands`);
  
  // Update basic lands without prices to have a standard price of $0.10
  const updatedBasicLands = await Card.updateMany(
    { 
      type_line: /basic land/i,
      $or: [
        { 'prices.usd': { $exists: false } },
        { 'prices.usd': null },
        { 'prices.usd': "" }
      ]
    },
    { 
      $set: { 'prices.usd': '0.10' } 
    }
  );
  
  console.log(`Updated ${updatedBasicLands.modifiedCount} basic lands with fallback price of $0.10`);
  
  // Update other cards without prices to have a fallback price of $0.01
  const updatedOtherCards = await Card.updateMany(
    { 
      type_line: { $not: /basic land/i },
      $or: [
        { 'prices.usd': { $exists: false } },
        { 'prices.usd': null },
        { 'prices.usd': "" }
      ]
    },
    { 
      $set: { 'prices.usd': '0.01' } 
    }
  );
  
  console.log(`Updated ${updatedOtherCards.modifiedCount} non-basic cards with fallback price of $0.01`);
  
  // Count cards still without prices after updates
  const remainingCardsWithoutPrices = await Card.countDocuments({
    $or: [
      { 'prices.usd': { $exists: false } },
      { 'prices.usd': null },
      { 'prices.usd': "" }
    ]
  });
  
  console.log(`Cards still without USD prices: ${remainingCardsWithoutPrices}`);
  
  // Verify that all cards now have prices
  if (remainingCardsWithoutPrices === 0) {
    console.log('✅ SUCCESS: All cards now have price data!');
  } else {
    console.log('⚠️ Some cards still don\'t have price data. This may require further investigation.');
  }
  
  // Clean up
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
}

// Run the script
fixCardPrices()
  .then(() => {
    console.log('Price fix process completed');
    exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    exit(1);
  });
