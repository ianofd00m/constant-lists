const mongoose = require('mongoose');

async function migrateDeck() {
  // Connect to both databases
  const sourceConn = await mongoose.createConnection('mongodb://localhost:27017/mtg-database');
  const targetConn = await mongoose.createConnection('mongodb://localhost:27017/constant-lists');
  
  const deckId = '6858e8d0f5b061c6bbaff878';
  
  // Get deck from source database
  const sourceDeck = await sourceConn.db.collection('decks').findOne({ 
    _id: new mongoose.Types.ObjectId(deckId) 
  });
  
  if (!sourceDeck) {
    console.log('Deck not found in source database');
    process.exit(1);
  }
  
  console.log('Found deck:', sourceDeck.name);
  
  // Add owner to the deck
  sourceDeck.owner = 'test-user-id-123';
  
  // Insert into target database
  const result = await targetConn.db.collection('decks').insertOne(sourceDeck);
  
  console.log('Migrated deck to constant-lists database with ID:', result.insertedId);
  console.log('Test URL: http://localhost:5174/deck/' + result.insertedId);
  
  // Close connections
  await sourceConn.close();
  await targetConn.close();
  
  process.exit(0);
}

migrateDeck().catch(console.error);
