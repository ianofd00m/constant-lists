const mongoose = require('mongoose');

async function fixCorruptedPrintings() {
  await mongoose.connect('mongodb://localhost:27017/constant-lists');
  
  const db = mongoose.connection.db;
  const corruptedDeckId = '685587812e87465d90a3524e';
  
  console.log('Fixing corrupted printing IDs...');
  
  // Find all decks with the corrupted printing ID
  const result = await db.collection('decks').updateMany(
    { 'cards.printing': corruptedDeckId },
    { $set: { 'cards.$[elem].printing': null } },
    { arrayFilters: [{ 'elem.printing': corruptedDeckId }] }
  );
  
  console.log(`Fixed ${result.modifiedCount} decks with corrupted printing IDs`);
  
  // Verify the fix
  const remaining = await db.collection('decks').find({
    'cards.printing': corruptedDeckId
  }).toArray();
  
  console.log(`Remaining corrupted entries: ${remaining.length}`);
  
  await mongoose.connection.close();
  console.log('Database fix complete!');
}

fixCorruptedPrintings().catch(console.error);
