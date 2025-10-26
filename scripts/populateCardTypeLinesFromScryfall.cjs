// Script: populateCardTypeLinesFromScryfall.js
// Description: Populates the 'type_line' field for all cards in the database using Scryfall API.
// Usage: node scripts/populateCardTypeLinesFromScryfall.js

require('dotenv').config();
const mongoose = require('mongoose');
// Use a fetch import compatible with CommonJS and node-fetch v3+
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
// Use a generic Card model to ensure it's registered on the correct connection
const cardSchema = new mongoose.Schema({}, { strict: false, collection: 'cards' });
const Card = mongoose.model('Card', cardSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';

async function fetchTypeLineForCard(name, retries = 3) {
  const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Scryfall error for ${name}: ${res.status}`);
      const data = await res.json();
      return data.type_line || null;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`Retrying ${name} (attempt ${attempt}): ${err.message}`);
      await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
    }
  }
}

async function main() {
  console.log('Connecting to MongoDB with URI:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    maxPoolSize: 10,
    autoIndex: true,
  });
  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
  });
  mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  const cards = await Card.find();
  for (const card of cards) {
    if (card.type_line) {
      console.log(`Skipping ${card.name} (already has type_line)`);
      continue;
    }
    try {
      const type_line = await fetchTypeLineForCard(card.name);
      if (type_line) {
        card.type_line = type_line;
        await card.save();
        console.log(`Updated ${card.name} with type_line: ${type_line}`);
      } else {
        console.log(`No type_line found for ${card.name}`);
      }
    } catch (err) {
      console.error(`Error updating ${card.name}:`, err.message);
    }
    // Scryfall rate limit: 10 requests/sec, use 300ms delay for safety
    await new Promise(r => setTimeout(r, 300));
  }
  await mongoose.disconnect();
  console.log('Done.');
}

main();
