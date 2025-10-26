// Script to analyze card co-occurrence in all decks
// Run with: node scripts/analyzeCardCooccurrence.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';
console.log('MONGODB_URI:', MONGODB_URI);

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);

    // Avoid model overwrite errors if script is re-run
    const Deck = mongoose.models.Deck || mongoose.model('Deck', new mongoose.Schema({
      name: { type: String, required: true },
      cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
      owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      format: { type: String, default: 'None' },
      createdAt: { type: Date, default: Date.now }
    }));

    const CardCooccurrence = mongoose.models.CardCooccurrence || mongoose.model('CardCooccurrence', new mongoose.Schema({
      card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', unique: true },
      cooccurs: [{ card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' }, count: Number }]
    }));

    // Fetch all decks
    const decks = await Deck.find({}).lean();
    const cooccurrence = {};

    // Build co-occurrence map
    for (const deck of decks) {
      const uniqueCards = Array.from(new Set(deck.cards.map(id => id.toString())));
      for (let i = 0; i < uniqueCards.length; i++) {
        for (let j = 0; j < uniqueCards.length; j++) {
          if (i === j) continue;
          const a = uniqueCards[i], b = uniqueCards[j];
          cooccurrence[a] = cooccurrence[a] || {};
          cooccurrence[a][b] = (cooccurrence[a][b] || 0) + 1;
        }
      }
    }

    // Clear previous results
    await CardCooccurrence.deleteMany({});
    // Use bulkWrite for efficiency
    const ops = Object.entries(cooccurrence).map(([cardId, others]) => {
      const cooccurs = Object.entries(others)
        .map(([otherId, count]) => ({ card: otherId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
      return {
        insertOne: {
          document: { card: cardId, cooccurs }
        }
      };
    });
    if (ops.length > 0) await CardCooccurrence.bulkWrite(ops);

    console.log('Card co-occurrence analysis complete.');
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error in co-occurrence analysis:', e);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
