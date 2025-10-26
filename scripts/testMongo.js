import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';
console.log('MONGODB_URI:', MONGODB_URI);

// Minimal MongoDB connection and card count test
const uri = 'mongodb://localhost:27017/constant-lists';
const cardSchema = new mongoose.Schema({}, { collection: 'cards' });
const Card = mongoose.model('Card', cardSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));
  await mongoose.disconnect();
}

async function test() {
  try {
    await mongoose.connect(uri);
    const count = await Card.countDocuments();
    console.log('Card count:', count);
    await mongoose.disconnect();
  } catch (e) {
    console.error('MongoDB test error:', e);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
test();
