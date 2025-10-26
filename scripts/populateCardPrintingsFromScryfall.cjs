// Script: populateCardPrintingsFromScryfall.cjs
// Description: Populates the 'printings' field for all cards in the database using Scryfall API.
// Usage: node scripts/populateCardPrintingsFromScryfall.cjs

const mongoose = require('mongoose');
const Redis = require('ioredis');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';
const redis = new Redis();

const cardSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  printings: [{ type: String }]
});
const Card = mongoose.model('Card', cardSchema);

async function fetchPrintingsForCard(name) {
  const cacheKey = `scryfall:printings:${name}`;
  // Try Redis cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  // Scryfall API: search for card by exact name, get all printings
  const url = `https://api.scryfall.com/cards/search?q=+!\"${encodeURIComponent(name)}\"`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Scryfall error for ${name}: ${res.status}`);
  const data = await res.json();
  // Return all unique Scryfall IDs for printings
  const printings = data.data ? data.data.map(card => card.id) : [];
  // Cache in Redis for 30 minutes
  await redis.set(cacheKey, JSON.stringify(printings), 'EX', 1800);
  return printings;
}

async function main() {
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
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

main().then(() => redis.disconnect());
