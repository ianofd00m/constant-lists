// Usage: node scripts/fixDeckCardReferences.js
// Ensures every card ObjectId in every deck points to a real Card document.

const mongoose = require('mongoose');
const Deck = require('../server/models/Deck');
const Card = require('../server/models/Card');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/constant-lists';

async function main() {
  await mongoose.connect(MONGO_URI);
  const decks = await Deck.find({});
  let fixedCount = 0;
  for (const deck of decks) {
    for (const cardEntry of deck.cards) {
      const cardId = cardEntry.card;
      if (!cardId) continue;
      const exists = await Card.exists({ _id: cardId });
      if (!exists) {
        // Create a placeholder card with this _id
        await Card.create({ _id: cardId, name: `Unknown Card (${cardId})` });
        fixedCount++;
        console.log(`Created placeholder Card for _id: ${cardId}`);
      }
    }
  }
  console.log(`Done. Fixed ${fixedCount} missing card references.`);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
