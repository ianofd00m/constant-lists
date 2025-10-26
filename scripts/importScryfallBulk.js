// Script to import the full Scryfall bulk card database into MongoDB
import mongoose from 'mongoose';
import fs from 'fs/promises';
import Card from '../server/models/Card.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';
const BULK_FILE = './default-cards.json'; // Path to downloaded Scryfall bulk file

async function main() {
  console.log('Connecting to MongoDB at', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Reading Scryfall bulk file:', BULK_FILE);
  const data = await fs.readFile(BULK_FILE, 'utf8');
  const cards = JSON.parse(data);
  console.log(`Importing ${cards.length} cards...`);
  let count = 0;
  for (const card of cards) {
    await Card.updateOne(
      { scryfall_id: card.id },
      {
        $set: {
          name: card.name,
          set: card.set,
          collector_number: card.collector_number,
          color_identity: card.color_identity,
          scryfall_json: card,
          // Add more fields as needed
        }
      },
      { upsert: true }
    );
    count++;
    if (count % 1000 === 0) console.log(`Imported ${count} cards...`);
  }
  await mongoose.disconnect();
  console.log('All cards imported!');
}

main();
