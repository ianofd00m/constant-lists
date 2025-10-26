// Script to sync cards from MongoDB to Typesense
// Usage: node scripts/typesenseCardImport.js

import mongoose from 'mongoose';
import Typesense from 'typesense';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';

const cardSchema = new mongoose.Schema({}, { collection: 'cards' });
const Card = mongoose.model('Card', cardSchema);

const typesense = new Typesense.Client({
  nodes: [
    { host: 'localhost', port: 8108, protocol: 'http' }
  ],
  apiKey: 'xyz',
  connectionTimeoutSeconds: 5,
});

async function setupTypesenseCollection() {
  try { await typesense.collections('cards').delete(); } catch {}
  await typesense.collections().create({
    name: 'cards',
    enable_nested_fields: true,
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string', facet: true, infix: true, locale: 'en' },
      { name: 'name_tokens', type: 'string[]' },
      { name: 'color_identity', type: 'string[]', facet: true },
      { name: 'legalities', type: 'string[]', facet: true },
      { name: 'set', type: 'string' },
      { name: 'set_name', type: 'string', optional: true },
      { name: 'collector_number', type: 'string' },
      { name: 'type_line', type: 'string' },
      { name: 'layout', type: 'string', facet: true },
      { name: 'games', type: 'string[]', facet: true },
      { name: 'scryfall_id', type: 'string' },
      { name: 'image_uris', type: 'object', optional: true },
      { name: 'is_colorless', type: 'bool', facet: true },
      { name: 'otags', type: 'string[]', facet: true, optional: true }
    ]
  });
  console.log('Typesense collection created!');
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  await setupTypesenseCollection();

  const cursor = Card.find({}).lean().cursor();
  const batchSize = 1000;
  let batch = [];
  let count = 0;
  for await (const card of cursor) {
    // Skip cards without a name
    if (!card.name || card.name.trim() === '') {
      continue;
    }
    
    // Generate name tokens for better substring matching
    function generateNameTokens(name) {
      const tokens = new Set();
      const cleanName = name.toLowerCase();
      
      // Add the full name
      tokens.add(cleanName);
      
      // Add individual words
      const words = cleanName.split(/\s+/);
      words.forEach(word => tokens.add(word));
      
      // Add substrings of length 3 or more for each word
      words.forEach(word => {
        if (word.length >= 3) {
          for (let i = 0; i <= word.length - 3; i++) {
            for (let j = i + 3; j <= word.length; j++) {
              tokens.add(word.substring(i, j));
            }
          }
        }
      });
      
      return Array.from(tokens);
    }
    
    // Generate basic functional tags for demo purposes
    function generateBasicTags(card) {
      const tags = [];
      const cardName = (card.name || '').toLowerCase();
      const typeLine = (card.type_line || '').toLowerCase();
      
      // Basic functional categorization
      if (cardName.includes('lightning bolt') || cardName.includes('path to exile') || 
          cardName.includes('swords to plowshares') || cardName.includes('doom blade') ||
          cardName.includes('murder') || cardName.includes('terminate')) {
        tags.push('removal');
      }
      
      if (cardName.includes('counterspell') || cardName.includes('negate') ||
          cardName.includes('force of will') || cardName.includes('swan song')) {
        tags.push('counterspell');
      }
      
      if (cardName.includes('sol ring') || cardName.includes('llanowar elves') ||
          cardName.includes('birds of paradise') || cardName.includes('rampant growth')) {
        tags.push('ramp');
      }
      
      if (cardName.includes('ancestral recall') || cardName.includes('brainstorm') ||
          cardName.includes('divination') || cardName.includes('rhystic study')) {
        tags.push('draw');
      }
      
      // Type-based tags
      if (typeLine.includes('instant')) tags.push('instant');
      if (typeLine.includes('sorcery')) tags.push('sorcery');
      if (typeLine.includes('creature')) tags.push('creature');
      if (typeLine.includes('planeswalker')) tags.push('planeswalker');
      if (typeLine.includes('artifact') && !typeLine.includes('creature')) tags.push('artifact');
      if (typeLine.includes('enchantment') && !typeLine.includes('creature')) tags.push('enchantment');
      if (typeLine.includes('land')) tags.push('land');
      
      return tags;
    }
    
    batch.push({
      id: card._id.toString(),
      name: card.name,
      name_tokens: generateNameTokens(card.name),
      color_identity: card.color_identity || [],
      legalities: Object.entries(card.scryfall_json?.legalities || {})
        .filter(([k, v]) => v === 'legal').map(([k]) => k),
      set: card.set,
      set_name: card.scryfall_json?.set_name || card.set_name || card.set,
      collector_number: card.collector_number,
      type_line: card.type_line || '',
      layout: card.scryfall_json?.layout || 'normal',
      games: card.scryfall_json?.games || ['paper'],
      scryfall_id: card.scryfall_id,
      image_uris: card.scryfall_json?.image_uris || {},
      is_colorless: !card.color_identity || card.color_identity.length === 0,
      otags: generateBasicTags(card)
    });
    if (batch.length === batchSize) {
      await typesense.collections('cards').documents().import(batch, { action: 'upsert' });
      count += batch.length;
      console.log(`Imported ${count} cards`);
      batch = [];
    }
  }
  // Import any remaining cards
  if (batch.length > 0) {
    await typesense.collections('cards').documents().import(batch, { action: 'upsert' });
    count += batch.length;
    console.log(`Imported ${count} cards`);
  }
  console.log('All cards imported to Typesense!');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
