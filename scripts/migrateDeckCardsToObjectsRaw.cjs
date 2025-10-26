require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient, ObjectId } = require('mongodb');

async function migrate() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const decks = db.collection('decks');
  const allDecks = await decks.find({}).toArray();
  let updated = 0;
  for (const deck of allDecks) {
    if (Array.isArray(deck.cards)) {
      const newCards = deck.cards.map(c => {
        if (c && typeof c === 'object' && c.card) return c;
        // If it's a BSON ObjectId or {_id, buffer}
        if (c && typeof c === 'object' && c._id) return { card: new ObjectId(c._id) };
        if (typeof c === 'string' || typeof c === 'object') {
          try { return { card: new ObjectId(c) }; } catch { return null; }
        }
        return null;
      }).filter(Boolean);
      if (JSON.stringify(deck.cards) !== JSON.stringify(newCards)) {
        await decks.updateOne({ _id: deck._id }, { $set: { cards: newCards } });
        updated++;
        console.log(`Migrated deck ${deck._id}`);
      }
    }
  }
  console.log(`Migration complete. Updated ${updated} decks.`);
  await client.close();
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
