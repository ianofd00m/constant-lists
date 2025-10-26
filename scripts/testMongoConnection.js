// Simple script to test MongoDB connection
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Card from '../server/models/Card.js';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';

async function main() {
  try {
    console.log('Connecting to MongoDB at', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connection successful!');

    await Card.updateOne(
      { scryfall_id: 'test-id' },
      { $set: { name: 'Test', set: 'TST', collector_number: '1', color_identity: [], scryfall_json: {} } },
      { upsert: true }
    );
    console.log('Write test successful!');

    await mongoose.disconnect();
    console.log('Disconnected.');
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  }
}

main();
