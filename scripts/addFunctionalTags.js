// Script to add basic functional tags to cards based on names and types
// This will provide basic otag-like functionality until better data is available
// Usage: node scripts/addFunctionalTags.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';

const cardSchema = new mongoose.Schema({}, { collection: 'cards' });
const Card = mongoose.model('Card', cardSchema);

// Basic functional categorization based on card names and types
const functionalTags = {
  // Removal
  removal: [
    'path to exile', 'swords to plowshares', 'lightning bolt', 'doom blade', 'murder',
    'wrath of god', 'damnation', 'pyroclasm', 'terminate', 'hero\'s downfall',
    'dismember', 'pongify', 'rapid hybridization', 'beast within', 'chaos warp',
    'generous gift', 'anguished unmaking', 'vindicate', 'abrupt decay', 'assassin\'s trophy',
    'despark', 'detention sphere', 'oblivion ring', 'banishing light', 'cast out'
  ],
  
  // Draw/Card advantage
  draw: [
    'ancestral recall', 'brainstorm', 'ponder', 'preordain', 'divination',
    'concentrate', 'blue sun\'s zenith', 'sphinx\'s revelation', 'fact or fiction',
    'mystical tutor', 'demonic tutor', 'vampiric tutor', 'enlightened tutor',
    'worldly tutor', 'sylvan library', 'phyrexian arena', 'rhystic study',
    'mystic remora', 'necropotence', 'sign in blood', 'night\'s whisper'
  ],
  
  // Ramp/Acceleration
  ramp: [
    'sol ring', 'mana crypt', 'mana vault', 'chrome mox', 'mox pearl', 'mox sapphire',
    'mox jet', 'mox ruby', 'mox emerald', 'llanowar elves', 'birds of paradise',
    'noble hierarch', 'elvish mystic', 'fyndhorn elves', 'rampant growth',
    'three visits', 'nature\'s lore', 'skyshroud claim', 'kodama\'s reach',
    'cultivate', 'explosive vegetation', 'farseek', 'search for tomorrow'
  ],
  
  // Counterspells
  counterspell: [
    'counterspell', 'mana drain', 'force of will', 'force of negation', 'negate',
    'swan song', 'mental misstep', 'spell pierce', 'dispel', 'flusterstorm',
    'daze', 'force spike', 'mana leak', 'remand', 'cryptic command',
    'arcane denial', 'dovin\'s veto', 'absorb', 'dissipate', 'cancel'
  ],
  
  // Creatures by function
  'threat': [
    'tarmogoyf', 'delver of secrets', 'monastery swiftspear', 'goblin guide',
    'wild nacatl', 'serra angel', 'shivan dragon', 'lightning angel',
    'baneslayer angel', 'primeval titan', 'inferno titan', 'grave titan'
  ],
  
  'utility-creature': [
    'snapcaster mage', 'eternal witness', 'acidic slime', 'reclamation sage',
    'solemn simulacrum', 'sun titan', 'reveillark', 'karmic guide',
    'duplicant', 'shriekmaw', 'mulldrifter', 'wood elves'
  ]
};

// Type-based tags
const typeBasedTags = {
  'planeswalker': (typeLine) => typeLine.toLowerCase().includes('planeswalker'),
  'artifact': (typeLine) => typeLine.toLowerCase().includes('artifact') && !typeLine.toLowerCase().includes('creature'),
  'enchantment': (typeLine) => typeLine.toLowerCase().includes('enchantment') && !typeLine.toLowerCase().includes('creature'),
  'instant': (typeLine) => typeLine.toLowerCase().includes('instant'),
  'sorcery': (typeLine) => typeLine.toLowerCase().includes('sorcery'),
  'creature': (typeLine) => typeLine.toLowerCase().includes('creature'),
  'land': (typeLine) => typeLine.toLowerCase().includes('land')
};

function generateFunctionalTags(card) {
  const tags = [];
  const cardName = (card.name || '').toLowerCase();
  const typeLine = card.type_line || '';
  
  // Skip cards without names
  if (!cardName) return [];
  
  // Add name-based functional tags
  for (const [tag, cardNames] of Object.entries(functionalTags)) {
    if (cardNames.some(name => cardName.includes(name))) {
      tags.push(tag);
    }
  }
  
  // Add type-based tags
  for (const [tag, checkFn] of Object.entries(typeBasedTags)) {
    if (checkFn(typeLine)) {
      tags.push(tag);
    }
  }
  
  // Add more specific functional tags based on type combinations
  if (typeLine.toLowerCase().includes('creature')) {
    if (typeLine.toLowerCase().includes('legendary')) {
      tags.push('legendary-creature');
    }
    if (typeLine.toLowerCase().includes('artifact')) {
      tags.push('artifact-creature');
    }
  }
  
  return [...new Set(tags)]; // Remove duplicates
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Process cards in batches
  const batchSize = 1000;
  let processed = 0;
  let updated = 0;
  
  const totalCards = await Card.countDocuments({});
  console.log(`Processing ${totalCards} cards...`);

  const cursor = Card.find({}).lean().cursor();
  
  for await (const card of cursor) {
    const functionalTags = generateFunctionalTags(card);
    
    if (functionalTags.length > 0) {
      await Card.updateOne(
        { _id: card._id },
        { $set: { otags: functionalTags } }
      );
      updated++;
      
      if (updated <= 10) {
        console.log(`✓ ${card.name}: ${functionalTags.join(', ')}`);
      }
    }
    
    processed++;
    if (processed % batchSize === 0) {
      console.log(`Processed ${processed}/${totalCards} cards, updated ${updated} with tags`);
    }
  }

  console.log(`\nCompleted! Processed ${processed} cards, updated ${updated} with functional tags`);
  
  // Show statistics
  const cardsWithTags = await Card.countDocuments({ otags: { $exists: true, $ne: [] } });
  console.log(`Cards with functional tags: ${cardsWithTags}/${totalCards}`);
  
  // Show some examples
  const examples = await Card.find({ otags: { $exists: true, $ne: [] } }).limit(5).lean();
  console.log('\nExample cards with tags:');
  examples.forEach(card => {
    console.log(`- ${card.name}: ${card.otags.join(', ')}`);
  });

  await mongoose.disconnect();
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
