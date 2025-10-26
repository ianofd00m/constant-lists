const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';

async function checkDecks() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const decks = await db.collection('decks').find({}).toArray();
    
    console.log(`Found ${decks.length} decks:`);
    decks.forEach((deck, index) => {
      console.log(`${index + 1}. Name: "${deck.name}", ID: ${deck._id.toString()}`);
      console.log(`   Cards: ${deck.cards?.length || 0} cards`);
      
      // Check for foil cards
      const foilCards = deck.cards?.filter(card => 
        card.foil === true || 
        card.isFoil === true || 
        card.card?.foil === true ||
        card.card?.isFoil === true
      ) || [];
      
      console.log(`   Foil cards: ${foilCards.length}`);
      
      // Check for necrobloom cards
      const necrobloomCards = deck.cards?.filter(card => 
        card.name?.toLowerCase().includes('necrobloom') ||
        card.card?.name?.toLowerCase().includes('necrobloom')
      ) || [];
      
      console.log(`   Necrobloom cards: ${necrobloomCards.length}`);
      
      if (necrobloomCards.length > 0) {
        console.log('   Necrobloom card details:');
        necrobloomCards.forEach((card, cardIndex) => {
          console.log(`     ${cardIndex + 1}. Name: ${card.name || card.card?.name}`);
          console.log(`        Foil: ${card.foil || card.card?.foil || false}`);
          console.log(`        isFoil: ${card.isFoil || card.card?.isFoil || false}`);
        });
      }
    });
    
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  } finally {
    await client.close();
  }
}

checkDecks();
