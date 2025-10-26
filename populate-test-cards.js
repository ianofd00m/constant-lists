import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define Card schema (match the server model)
const CardSchema = new mongoose.Schema({
  scryfall_id: { type: String, index: true, unique: true },
  name: { type: String, required: true },
  set: { type: String, required: true },
  collector_number: { type: String, required: true },
  printings: [{ type: String }],
  type_line: { type: String },
  color_identity: [{ type: String }],
  scryfall_json: { type: Object },
}, { collection: 'cards' });

const Card = mongoose.models.Card || mongoose.model('Card', CardSchema, 'cards');

// Test cards to add
const testCards = [
  {
    scryfall_id: 'c9f8b8fb-1cd8-450e-a1fe-892e7a323479',
    name: 'Thalia, Guardian of Thraben',
    set: 'vow',
    collector_number: '38'
  },
  {
    scryfall_id: '2ba6e003-e97a-418d-9a2c-dcdced6c71e2',
    name: 'Lightning Bolt',
    set: 'lea',
    collector_number: '161'
  },
  {
    scryfall_id: '4f94e5e2-c381-438f-bf96-e1286f93ba54',
    name: 'Black Lotus',
    set: 'lea', 
    collector_number: '232'
  }
];

async function populateTestCards() {
  try {
    console.log('Fetching and populating test cards...');
    
    for (const testCard of testCards) {
      // Fetch full card data from Scryfall
      const response = await fetch(`https://api.scryfall.com/cards/${testCard.scryfall_id}`);
      if (!response.ok) {
        console.error(`Failed to fetch ${testCard.name}: ${response.status}`);
        continue;
      }
      
      const scryfallData = await response.json();
      
      // Create card document
      const cardDoc = {
        scryfall_id: scryfallData.id,
        name: scryfallData.name,
        set: scryfallData.set,
        collector_number: scryfallData.collector_number,
        printings: [scryfallData.id], // Add the current printing
        type_line: scryfallData.type_line,
        color_identity: scryfallData.color_identity || [],
        scryfall_json: scryfallData
      };
      
      // Insert or update the card
      await Card.findOneAndUpdate(
        { scryfall_id: cardDoc.scryfall_id },
        { $set: cardDoc },
        { upsert: true, new: true }
      );
      
      console.log(`✓ Added ${cardDoc.name} (${cardDoc.scryfall_id})`);
      
      // Small delay to respect Scryfall rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n✅ Test cards populated successfully!');
    console.log('\nYou can now test adding cards to decks using these scryfall_ids:');
    testCards.forEach(card => {
      console.log(`- ${card.name}: ${card.scryfall_id}`);
    });
    
  } catch (error) {
    console.error('Error populating test cards:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

populateTestCards();
