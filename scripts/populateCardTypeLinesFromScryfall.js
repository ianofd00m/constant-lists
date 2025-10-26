// Script: populateCardTypeLinesFromScryfall.js
// Description: Populates the 'type_line' field for all cards in the database using Scryfall API.
// Usage: node scripts/populateCardTypeLinesFromScryfall.js

const mongoose = require('mongoose');
const fetch = require('node-fetch');
const Card = require('../server/models/Card');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';

async function fetchTypeLineForCard(name) {
  const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Scryfall error for ${name}: ${res.status}`);
  const data = await res.json();
  return data.type_line || null;
}

async function main() {
  await mongoose.connect(MONGODB_URI);
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
    // Scryfall rate limit: 10 requests/sec
    await new Promise(r => setTimeout(r, 120));
  }
  await mongoose.disconnect();
  console.log('Done.');
}

main();
