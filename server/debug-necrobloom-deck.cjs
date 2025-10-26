const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';

async function checkNecrobloomDeck() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const deck = await db.collection('decks').findOne({ name: "necrobloom test 3" });
    
    if (!deck) {
      console.log('Deck not found');
      return;
    }
    
    console.log(`Deck: "${deck.name}"`);
    console.log(`ID: ${deck._id.toString()}`);
    console.log(`Total cards: ${deck.cards?.length || 0}`);
    
    // Check for foil cards
    const foilCards = deck.cards?.filter(card => 
      card.foil === true || 
      card.isFoil === true || 
      card.card?.foil === true ||
      card.card?.isFoil === true
    ) || [];
    
    console.log(`\nFoil cards: ${foilCards.length}`);
    
    // Show the first 5 foil cards with their structure
    foilCards.slice(0, 5).forEach((card, index) => {
      console.log(`\nFoil card ${index + 1}:`);
      console.log(`  Name: ${card.name || card.card?.name}`);
      console.log(`  card.foil: ${card.foil}`);
      console.log(`  card.isFoil: ${card.isFoil}`);
      console.log(`  card.card.foil: ${card.card?.foil}`);
      console.log(`  card.card.isFoil: ${card.card?.isFoil}`);
      console.log(`  Structure:`, JSON.stringify(card, null, 2).substring(0, 200) + '...');
    });
    
    // Check for necrobloom cards
    const necrobloomCards = deck.cards?.filter(card => 
      card.name?.toLowerCase().includes('necrobloom') ||
      card.card?.name?.toLowerCase().includes('necrobloom')
    ) || [];
    
    console.log(`\nNecrobloom cards: ${necrobloomCards.length}`);
    
    if (necrobloomCards.length > 0) {
      necrobloomCards.forEach((card, index) => {
        console.log(`\nNecrobloom card ${index + 1}:`);
        console.log(`  Name: ${card.name || card.card?.name}`);
        console.log(`  Foil: ${card.foil || card.card?.foil || false}`);
        console.log(`  isFoil: ${card.isFoil || card.card?.isFoil || false}`);
      });
    }
    
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  } finally {
    await client.close();
  }
}

checkNecrobloomDeck();
