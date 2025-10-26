// Script: populateCardPrintingsFromScryfall.js
// Description: Populates the 'printings' field for all cards in the database using Scryfall API.
// Usage: node scripts/populateCardPrintingsFromScryfall.js

const mongoose = require('mongoose');
const fetch = require('node-fetch');
const Card = require('../server/models/Card');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';

async function fetchPrintingsForCard(name) {
  // Scryfall API: search for card by exact name, get all printings
  const url = `https://api.scryfall.com/cards/search?q=+!\"${encodeURIComponent(name)}\"`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Scryfall error for ${name}: ${res.status}`);
  const data = await res.json();
  // Return all unique Scryfall IDs for printings
  return data.data ? data.data.map(card => card.id) : [];
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const cards = await Card.find();
  for (const card of cards) {
    try {
      const printings = await fetchPrintingsForCard(card.name);
      if (printings.length > 0) {
        card.printings = printings;
        await card.save();
        console.log(`Updated ${card.name} with ${printings.length} printings.`);
      } else {
        console.log(`No printings found for ${card.name}`);
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
