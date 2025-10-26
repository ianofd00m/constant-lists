#!/usr/bin/env node

/**
 * Populate MongoDB with Oracle Tags data
 * This bypasses all file serving issues by storing Oracle Tags directly in the database
 */

import fs from 'fs/promises';
import path from 'path';
import { MongoClient } from 'mongodb';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB connection string (use environment variable or Atlas)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ianofdoom:Gn8Z4Nx2Efbi@cluster0.2u0h6.mongodb.net/constant-lists?retryWrites=true&w=majority&appName=Cluster0';

// Path to Oracle Tags CSV file
const CSV_FILE_PATH = path.join(__dirname, '..', 'public', 'scryfall-COMPLETE-oracle-tags-2025-08-08.csv');
const FALLBACK_CSV_PATH = path.join(__dirname, '..', 'public', 'otag-medium-dataset.csv');
const TEST_CSV_PATH = path.join(__dirname, '..', 'public', 'test-otag-data.csv');

async function parseCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    const data = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
            // Parse CSV line (handle quoted fields)
            const match = line.match(/^"([^"]+)","(.+)"$/);
            if (match) {
                const cardName = match[1];
                const oracleTags = match[2].split('|').map(tag => tag.trim()).filter(tag => tag);
                
                data.push({
                    cardName: cardName,
                    oracleTags: oracleTags,
                    cardNameLower: cardName.toLowerCase(),
                    tagCount: oracleTags.length,
                    lastUpdated: new Date()
                });
            }
        } catch (err) {
            console.warn(`Warning: Could not parse line ${i}: ${line}`);
        }
    }
    
    return data;
}

async function populateOracleTags() {
    let client;
    
    try {
        console.log('🏷️ Starting Oracle Tags database population...');
        
        // Try to read CSV file
        let csvContent;
        let csvSource;
        
        for (const filePath of [CSV_FILE_PATH, FALLBACK_CSV_PATH, TEST_CSV_PATH]) {
            try {
                csvContent = await fs.readFile(filePath, 'utf8');
                csvSource = path.basename(filePath);
                console.log(`✅ Loaded CSV from: ${csvSource} (${csvContent.length} characters)`);
                break;
            } catch (err) {
                console.log(`⚠️ Could not read ${filePath}: ${err.message}`);
            }
        }
        
        if (!csvContent) {
            throw new Error('No CSV file found');
        }
        
        // Parse CSV data
        console.log('🔄 Parsing CSV data...');
        const oracleTagsData = await parseCSV(csvContent);
        console.log(`📊 Parsed ${oracleTagsData.length} cards with Oracle Tags`);
        
        // Connect to MongoDB
        console.log('🌐 Connecting to MongoDB...');
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        
        const db = client.db();
        const collection = db.collection('oracleTags');
        
        // Clear existing data
        console.log('🗑️ Clearing existing Oracle Tags data...');
        await collection.deleteMany({});
        
        // Insert new data in batches
        const BATCH_SIZE = 1000;
        let insertedCount = 0;
        
        for (let i = 0; i < oracleTagsData.length; i += BATCH_SIZE) {
            const batch = oracleTagsData.slice(i, i + BATCH_SIZE);
            await collection.insertMany(batch);
            insertedCount += batch.length;
            console.log(`📥 Inserted ${insertedCount}/${oracleTagsData.length} cards...`);
        }
        
        // Create index for fast lookups
        console.log('🔍 Creating database indexes...');
        await collection.createIndex({ cardNameLower: 1 });
        await collection.createIndex({ cardName: 1 });
        await collection.createIndex({ oracleTags: 1 });
        
        console.log(`✅ Successfully populated Oracle Tags database!`);
        console.log(`📊 Total cards: ${insertedCount}`);
        console.log(`📁 Source: ${csvSource}`);
        
        // Test the data with Jason Bright
        const jasonBright = await collection.findOne({ cardNameLower: 'jason bright, glowing prophet' });
        if (jasonBright) {
            console.log(`🧪 Test - Jason Bright has ${jasonBright.oracleTags.length} Oracle Tags:`, jasonBright.oracleTags.slice(0, 5).join(', ') + '...');
        } else {
            console.log('⚠️ Jason Bright not found in database');
        }
        
    } catch (error) {
        console.error('❌ Error populating Oracle Tags:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

// Run the population script
if (import.meta.url === `file://${process.argv[1]}`) {
    populateOracleTags();
}

export { populateOracleTags, parseCSV };