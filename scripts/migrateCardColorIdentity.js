// Script to backfill color_identity for all cards in the database
import mongoose from 'mongoose';
import fetch from 'node-fetch';
import Card from '../server/models/Card.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';

async function main() {
  console.log('Connecting to MongoDB at', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  const cards = await Card.find({ $or: [ { color_identity: { $exists: false } }, { color_identity: { $size: 0 } } ] });
  console.log(`Found ${cards.length} cards to update.`);
  for (const card of cards) {
    let scryfallUrl = '';
    if (card.set && card.collector_number) {
      scryfallUrl = `https://api.scryfall.com/cards/${card.set.toLowerCase()}/${card.collector_number}`;
    } else if (card.name) {
      scryfallUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}`;
    }
    if (scryfallUrl) {
      try {
        const res = await fetch(scryfallUrl);
        if (res.ok) {
          const data = await res.json();
          card.color_identity = data.color_identity || [];
          card.scryfall_json = data;
          await card.save();
          console.log(`Updated ${card.name} (${card.set} ${card.collector_number}): ${card.color_identity}`);
        }
      } catch (e) {
        console.warn(`Failed to update ${card.name}:`, e.message);
      }
    }
  }
  await mongoose.disconnect();
  console.log('Done.');
}

main();
