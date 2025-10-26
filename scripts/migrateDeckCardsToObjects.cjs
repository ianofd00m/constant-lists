// Script to migrate deck.cards from [ObjectId, ...] to [{ card: ObjectId }, ...]
// Usage: node scripts/migrateDeckCardsToObjects.js

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

// Define Deck schema/model inline to avoid import issues
const deckSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cards: [{
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: false },
    printing: { type: String },
  }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  format: { type: String, default: 'None' },
  createdAt: { type: Date, default: Date.now }
});
const Deck = mongoose.model('Deck', deckSchema, 'decks');

function toObjectId(val) {
  if (!val) return null;
  if (typeof val === 'object' && 'card' in val) return val.card; // already correct
  if (typeof val === 'object' && val._id) return new mongoose.Types.ObjectId(val._id);
  if (Buffer.isBuffer(val)) return new mongoose.Types.ObjectId(val);
  if (mongoose.isValidObjectId(val)) return new mongoose.Types.ObjectId(val);
  return null;
}

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists');
  const decks = await Deck.find({});
  let updated = 0;
  for (const deck of decks) {
    let changed = false;
    if (Array.isArray(deck.cards)) {
      // Always coerce every entry to { card: ObjectId }
      const newCards = deck.cards.map(c => {
        if (c && typeof c === 'object' && 'card' in c) return c;
        const objId = toObjectId(c);
        return objId ? { card: objId } : null;
      }).filter(Boolean);
      if (JSON.stringify(deck.cards) !== JSON.stringify(newCards)) {
        deck.cards = newCards;
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
