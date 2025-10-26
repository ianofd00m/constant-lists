import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';

const cardSchema = new mongoose.Schema({
  scryfall_id: { type: String, unique: true, sparse: true },
  test: String,
  date: Date,
  updated: Boolean,
}, { collection: 'cards' });

const Card = mongoose.model('Card', cardSchema);

async function run() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB');

    // Try to update the test document
    const result = await Card.updateOne(
      { test: 'write' },
      { $set: { updated: true, date: new Date() } }
    );
    console.log('Update result:', result);

    // Clean up and exit
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();