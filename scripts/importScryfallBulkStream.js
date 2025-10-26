// Script to import the full Scryfall bulk card database into MongoDB using streaming
import mongoose from 'mongoose';
import { createReadStream } from 'fs';
import streamJsonPkg from 'stream-json';
import streamArrayPkg from 'stream-json/streamers/StreamArray.js';
const { parser } = streamJsonPkg;
const { streamArray } = streamArrayPkg;

// Inline Card schema and model
const cardSchema = new mongoose.Schema({
  scryfall_id: { type: String, index: true, unique: true },
  name: { type: String, required: true },
  set: { type: String, required: true },
  collector_number: { type: String, required: true },
  printings: [{ type: String }],
  type_line: { type: String },
  color_identity: [{ type: String }],
  scryfall_json: { type: Object },
}, { collection: 'cards' });
const Card = mongoose.models.Card || mongoose.model('Card', cardSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';
const SCRYFALL_BULK_PATH = process.env.SCRYFALL_BULK_PATH || './scryfall-default-cards.json';

async function main() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected to MongoDB');

  let count = 0;
  const BATCH_SIZE = 1000;
  let batch = [];

  const pipeline = createReadStream(SCRYFALL_BULK_PATH)
    .pipe(parser())
    .pipe(streamArray());

  for await (const { value: card } of pipeline) {
    // Prepare card document
    const doc = {
      scryfall_id: card.id,
      name: card.name,
      set: card.set,
      collector_number: card.collector_number,
      printings: card.prints_search_uri ? [card.prints_search_uri] : [],
      type_line: card.type_line,
      color_identity: card.color_identity,
      scryfall_json: card,
    };
    batch.push(doc);

    if (batch.length >= BATCH_SIZE) {
      // De-duplicate by { name, set, collector_number } within the batch
      const deduped = Array.from(
        new Map(batch.map(d => [`${d.name}|${d.set}|${d.collector_number}`, d])).values()
      );
      await Card.bulkWrite(
        deduped.map(doc => ({
          updateOne: {
            filter: { scryfall_id: doc.scryfall_id },
            update: { $set: doc },
            upsert: true,
          }
        }))
      );
      count += deduped.length;
      console.log(`Imported ${count} cards...`);
      batch = [];
    }
  }

  // Insert any remaining cards
  if (batch.length > 0) {
    const deduped = Array.from(
      new Map(batch.map(d => [`${d.name}|${d.set}|${d.collector_number}`, d])).values()
    );
    await Card.bulkWrite(
      deduped.map(doc => ({
        updateOne: {
          filter: { scryfall_id: doc.scryfall_id },
          update: { $set: doc },
          upsert: true,
        }
      }))
    );
    count += deduped.length;
    console.log(`Imported ${count} cards (final batch).`);
  }

  await mongoose.disconnect();
  console.log('Import complete!');
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
