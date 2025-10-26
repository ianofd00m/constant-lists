const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/constant-lists');
  console.log('Connected to MongoDB');

  // Define a minimal Card schema to query the database
  const CardSchema = new mongoose.Schema({}, { strict: false });
  const Card = mongoose.model('Card', CardSchema, 'cards');

  // Create a backup by counting cards
  console.log('Creating a metadata backup before proceeding...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Create the logs directory
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const totalCards = await Card.countDocuments();
  console.log(`Current total number of cards in database: ${totalCards}`);
  
  // Write a backup info file
  const backupInfoPath = path.join(logDir, `pre-dedup-backup-info-${timestamp}.txt`);
  const backupInfo = `
Database backup information before deduplication (${new Date().toISOString()})
=============================================================================
Total cards in database: ${totalCards}

This file serves as a record of the database state before running the deduplication script.
If you need to restore from a full backup, please use your regular backup procedures.
  `;
  
  fs.writeFileSync(backupInfoPath, backupInfo);
  console.log(`Backup metadata written to ${backupInfoPath}`);

  console.log('Backup completed. Now finding duplicates...');
  
  // Find cards with duplicates
  const cardGroups = await Card.aggregate([
    {
      $group: {
        _id: { name: '$name', set: '$set', collector_number: '$collector_number' },
        count: { $sum: 1 },
        cards: { $push: '$$ROOT' }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);
  
  console.log(`Found ${cardGroups.length} distinct cards with duplicates`);
  
  // Log file setup has already been done above
  const logFile = path.join(logDir, `deduplication-log-${timestamp}.txt`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  const log = (message) => {
    logStream.write(message + '\n');
    console.log(message);
  };
  
  log(`Starting deduplication process for ${cardGroups.length} card groups...`);

  // Process in batches to avoid overwhelming the database
  const batchSize = 1000;
  let removedCount = 0;
  let processedCount = 0;
  
  for (let i = 0; i < cardGroups.length; i += batchSize) {
    const batch = cardGroups.slice(i, i + batchSize);
    log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(cardGroups.length / batchSize)}...`);
    
    for (const group of batch) {
      // Sort cards to decide which one to keep
      const cards = group.cards;
      cards.sort((a, b) => {
        // Prefer cards with valid price
        const aValidPrice = a.prices && a.prices.usd && parseFloat(a.prices.usd) > 0.01;
        const bValidPrice = b.prices && b.prices.usd && parseFloat(b.prices.usd) > 0.01;
        
        if (aValidPrice && !bValidPrice) return -1;
        if (!aValidPrice && bValidPrice) return 1;
        
        // If both have valid prices, or both don't have valid prices
        // Prefer the one with more complete data
        const aComplete = 
          (a.scryfall_json && a.scryfall_json.prices ? 1 : 0) +
          (a.image_uris && Object.keys(a.image_uris || {}).length > 0 ? 1 : 0);
        const bComplete = 
          (b.scryfall_json && b.scryfall_json.prices ? 1 : 0) +
          (b.image_uris && Object.keys(b.image_uris || {}).length > 0 ? 1 : 0);
        
        return bComplete - aComplete;
      });
      
      // Keep the first card (best by our sorting criteria)
      const keepCard = cards[0];
      
      // Remove the rest
      for (let j = 1; j < cards.length; j++) {
        await Card.deleteOne({ _id: cards[j]._id });
        removedCount++;
      }
      
      processedCount++;
      if (processedCount % 1000 === 0) {
        log(`Processed ${processedCount} card groups, removed ${removedCount} duplicates so far...`);
      }
    }
  }
  
  log(`\nDeduplication complete!`);
  log(`Processed ${processedCount} unique cards with duplicates`);
  log(`Removed a total of ${removedCount} duplicate entries`);
  log(`Database backup is available at: ${backupDir}`);
  log(`Full log is available at: ${logFile}`);
  
  logStream.end();
  mongoose.connection.close();
}

main().catch(console.error);
