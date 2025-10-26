// Script to list available decks and their IDs
const mongoose = require('mongoose');

async function listDecks() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/constant-lists');
    console.log('Connected to MongoDB');
    
    const decks = await mongoose.connection.db.collection('decks').find({})
      .project({ _id: 1, name: 1, owner: 1, commanderNames: 1 })
      .limit(10)
      .toArray();
    
    console.log('\nAvailable decks:');
    decks.forEach((deck, i) => {
      console.log(`${i+1}. ID: ${deck._id}`);
      console.log(`   Name: ${deck.name}`);
      console.log(`   Owner: ${deck.owner || 'N/A'}`);
      console.log(`   Commander: ${deck.commanderNames?.join(', ') || 'None'}`);
      console.log('');
    });
    
    console.log(`Total decks found: ${decks.length}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

listDecks().catch(err => console.error(err));
