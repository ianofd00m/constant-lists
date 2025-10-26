const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/constant-lists');
  console.log('Connected to MongoDB');

  // Define a minimal Card schema to query the database
  const CardSchema = new mongoose.Schema({}, { strict: false });
  const Card = mongoose.model('Card', CardSchema, 'cards');

  // Create a metadata backup
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
  
  // Log file setup
  const logFile = path.join(logDir, `deduplication-log-${timestamp}.txt`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  const log = (message) => {
    logStream.write(message + '\n');
    console.log(message);
  };
  
  log('Analyzing database for duplicate cards...');
  
  // Count how many unique cards have duplicates
  const totalDuplicatesCount = await Card.aggregate([
    {
      $group: {
        _id: { name: '$name', set: '$set', collector_number: '$collector_number' },
        count: { $sum: 1 }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: { $subtract: ['$count', 1] } },
        distinctCards: { $sum: 1 }
      }
    }
  ]);
  
  const distinctCardsWithDupes = totalDuplicatesCount[0].distinctCards;
  const totalDupes = totalDuplicatesCount[0].total;
  
  log(`Found ${distinctCardsWithDupes} distinct cards with duplicates (${totalDupes} duplicate entries)`);
  log(`Starting deduplication process...`);
  
  // Process in smaller batches to avoid memory issues
  const batchSize = 1000;
  const totalBatches = Math.ceil(distinctCardsWithDupes / batchSize);
  let processedTotal = 0;
  let removedTotal = 0;
  
  // Use pagination approach with skip and limit
  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    log(`Processing batch ${batchNum + 1} of ${totalBatches}...`);
    
    // Get a batch of distinct card keys
    const distinctCardKeys = await Card.aggregate([
      {
        $group: {
          _id: { name: '$name', set: '$set', collector_number: '$collector_number' },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $sort: { '_id.name': 1, '_id.set': 1, '_id.collector_number': 1 }
      },
      {
        $skip: batchNum * batchSize
      },
      {
        $limit: batchSize
      }
    ]);
    
    log(`Found ${distinctCardKeys.length} cards to process in this batch`);
    
    let batchProcessed = 0;
    let batchRemoved = 0;
    
    // Process each distinct card in this batch
    for (const cardKey of distinctCardKeys) {
      const { name, set, collector_number } = cardKey._id;
      
      // Get all duplicates for this card
      const duplicates = await Card.find({
        name: name,
        set: set,
        collector_number: collector_number
      }).sort({ 
        // Sort to prefer cards with valid prices
        'prices.usd': -1
      });
      
      // Keep the first card (with highest price)
      const keepCard = duplicates[0];
      
      // Remove the rest
      for (let i = 1; i < duplicates.length; i++) {
        await Card.deleteOne({ _id: duplicates[i]._id });
        batchRemoved++;
      }
      
      batchProcessed++;
      
      // Log progress every 100 cards
      if (batchProcessed % 100 === 0) {
        log(`Batch progress: ${batchProcessed}/${distinctCardKeys.length} cards processed`);
      }
    }
    
    processedTotal += batchProcessed;
    removedTotal += batchRemoved;
    
    log(`Batch complete: Processed ${batchProcessed} cards, removed ${batchRemoved} duplicates`);
    log(`Overall progress: ${processedTotal}/${distinctCardsWithDupes} cards processed, ${removedTotal} duplicates removed`);
  }
  
  const finalCardCount = await Card.countDocuments();
  
  log(`\nDeduplication complete!`);
  log(`Processed ${processedTotal} unique cards with duplicates`);
  log(`Removed ${removedTotal} duplicate entries`);
  log(`Original card count: ${totalCards}`);
  log(`Final card count: ${finalCardCount}`);
  log(`Difference: ${totalCards - finalCardCount}`);
  log(`Full log is available at: ${logFile}`);
  
  logStream.end();
  mongoose.connection.close();
}

main().catch(console.error);
