// Script to migrate deck.cards from [ObjectId, ...] to [{ card: ObjectId }, ...]
// Usage: node scripts/migrateDeckCardsToObjects.js

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Deck = require('../server/models/Deck');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const decks = await Deck.find({});
  let updated = 0;
  for (const deck of decks) {
    let changed = false;
    if (Array.isArray(deck.cards)) {
      // If any card is not an object with a 'card' field, migrate
      const needsMigration = deck.cards.some(c => !c || typeof c !== 'object' || !('card' in c));
      if (needsMigration) {
        deck.cards = deck.cards.map(c => {
          if (c && typeof c === 'object' && 'card' in c) return c;
          // If it's an ObjectId or something else, wrap it
          return { card: c };
        });
        changed = true;
      }
    }
    if (changed) {
      await deck.save();
      updated++;
      console.log(`Migrated deck ${deck._id}`);
    }
  }
  console.log(`Migration complete. Updated ${updated} decks.`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
