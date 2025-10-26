const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - CORS Configuration
const allowedOrigins = [
  'http://localhost:5173', // Local development
  'https://admirable-fairy-0fd24b.netlify.app', // Your Netlify deployment (old)
  'https://68fc6f15d22b69b96c1602f5--admirable-fairy-0fd24b.netlify.app', // Current Netlify deployment
  'https://constant-lists.netlify.app', // If you get a custom domain
  'https://constant-lists.vercel.app', // Current Vercel deployment
  /^https:\/\/constant-lists.*\.vercel\.app$/, // Vercel deployments (regex pattern)
  process.env.CORS_ORIGIN // Production frontend URL from environment
].filter(Boolean); // Remove undefined values

console.log('🔒 CORS allowed origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control', 
    'Pragma', 
    'Expires', 
    'If-None-Match', 
    'If-Modified-Since',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Referer',
    'User-Agent'
  ]
}));
app.use(express.json());

// MongoDB connection function
async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/constant-lists?authSource=admin';
    console.log('🔗 Attempting to connect to MongoDB...', mongoURI.includes('localhost') ? 'localhost:27017' : 'MongoDB Atlas');
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });
    console.log('🍃 Connected to MongoDB successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // For local development, allow running without MongoDB
    if (!process.env.MONGODB_URI || process.env.NODE_ENV !== 'production') {
      console.log('⚠️ Running in development mode without MongoDB - data will not persist');
      return false;
    } else {
      // For production, MongoDB is required
      throw error;
    }
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

// Deck Schema
const deckSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  format: {
    type: String,
    required: true,
    enum: ['Standard', 'Pioneer', 'Modern', 'Legacy', 'Vintage', 'Commander / EDH', 'Pauper', 'Historic', 'Alchemy', 'Explorer']
  },
  colors: [{
    type: String,
    enum: ['W', 'U', 'B', 'R', 'G', 'C']
  }],
  cardCount: {
    type: Number,
    default: 0,
    min: 0
  },
  cards: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    isCommander: { type: Boolean, default: false },
    printing: { type: String }, // Scryfall ID for specific printing
    scryfallCard: {
      id: String,
      name: String,
      mana_cost: String,
      cmc: Number,
      type_line: String,
      color_identity: [String],
      colors: [String],
      set: String,
      set_name: String,
      collector_number: String,
      rarity: String,
      image_uris: {
        small: String,
        normal: String,
        large: String
      },
      prices: {
        usd: String,
        usd_foil: String,
        eur: String,
        eur_foil: String
      }
    }
  }],
  commander: [{
    name: String,
    card: {
      id: String,
      name: String,
      color_identity: [String]
    }
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
deckSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Deck = mongoose.model('Deck', deckSchema);

// Test route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Constant Lists server is running',
    timestamp: new Date().toISOString()
  });
});

// Cards routes - get all cards (popular/recent)
app.get('/api/cards', async (req, res) => {
  console.log('📚 General cards request - fetching popular cards from Scryfall');
  
  try {
    // Get some popular/recent cards
    const scryfallUrl = 'https://api.scryfall.com/cards/search?q=*&order=popularity&dir=desc';
    const response = await fetch(scryfallUrl);
    
    if (!response.ok) {
      throw new Error(`Scryfall API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    res.json({
      data: data.data || [],
      total_cards: data.total_cards || 0,
      has_more: data.has_more || false
    });
    
  } catch (error) {
    console.error('❌ Cards fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch cards',
      message: error.message 
    });
  }
});

// Card search endpoint - proxies to Scryfall API with commander color identity filtering
app.get('/api/cards/search', async (req, res) => {
  const { q: query = '', colorIdentity = '', deckFormat = '', limit = 175 } = req.query;
  console.log(`🔍 Card search request: "${query}" (colorId: ${colorIdentity}, format: ${deckFormat}, limit: ${limit})`);
  
  try {
    // Build the search query
    let searchQuery = query.trim() || '*';
    
    // Add commander color identity filtering if provided
    if (colorIdentity && colorIdentity.trim() && deckFormat === 'Commander / EDH') {
      const commanderColors = colorIdentity.toUpperCase().split('').filter(c => ['W','U','B','R','G'].includes(c));
      
      if (commanderColors.length === 0) {
        // Colorless commander - only colorless cards
        searchQuery += ' ci:c';
        console.log(`🎯 Commander color identity filter applied: colorless`);
      } else {
        // For Commander format, restrict to cards within commander's color identity
        const colorString = commanderColors.join('');
        searchQuery += ` ci<=${colorString}`;
        console.log(`🎯 Commander color identity filter applied: ${colorString}`);
      }
    }
    
    // Add format legality if specified
    if (deckFormat && deckFormat !== 'None') {
      const formatMap = {
        'Standard': 'standard',
        'Modern': 'modern', 
        'Legacy': 'legacy',
        'Vintage': 'vintage',
        'Commander / EDH': 'commander',
        'Pioneer': 'pioneer',
        'Historic': 'historic',
        'Pauper': 'pauper'
      };
      
      const scryfallFormat = formatMap[deckFormat];
      if (scryfallFormat) {
        searchQuery += ` legal:${scryfallFormat}`;
        console.log(`⚖️ Format filter applied: ${scryfallFormat}`);
      }
    }
    
    // Always add paper-only filter to exclude digital-only cards
    if (!searchQuery.includes('game:')) {
      searchQuery += ' game:paper';
    }
    
    const scryfallUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchQuery)}&format=json&order=name&dir=asc&unique=cards`;
    console.log(`📡 Scryfall query: ${searchQuery}`);
    
    const response = await fetch(scryfallUrl);
    
    if (!response.ok) {
      if (response.status === 404) {
        // No cards found
        return res.json({
          data: [],
          total_cards: 0,
          has_more: false
        });
      }
      throw new Error(`Scryfall API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform Scryfall data to match expected format
    const transformedData = {
      data: data.data || [],
      total_cards: data.total_cards || 0,
      has_more: data.has_more || false
    };
    
    console.log(`✅ Found ${transformedData.total_cards} cards`);
    res.json(transformedData);
    
  } catch (error) {
    console.error('❌ Card search error:', error);
    res.status(500).json({ 
      error: 'Failed to search cards',
      message: error.message 
    });
  }
});

// Typesense search endpoint with commander color identity filtering
app.get('/api/cards/typesense-search', async (req, res) => {
  const { q: query = '', colorIdentity = '', deckFormat = '', limit = 50 } = req.query;
  console.log(`🔍 Typesense search request: "${query}" (colorId: "${colorIdentity}", format: "${deckFormat}", hasColorId: ${!!colorIdentity})`);
  
  try {
    // Build the search query
    let searchQuery = query.trim() || '*';
    
    // Add commander color identity filtering if provided
    if (colorIdentity && colorIdentity.trim() && deckFormat === 'Commander / EDH') {
      const commanderColors = colorIdentity.toUpperCase().split('').filter(c => ['W','U','B','R','G'].includes(c));
      
      if (commanderColors.length === 0) {
        // Colorless commander - only colorless cards
        searchQuery += ' ci:c';
        console.log(`🎯 Commander color identity filter applied: colorless`);
      } else {
        // For Commander format, restrict to cards within commander's color identity
        const colorString = commanderColors.join('');
        searchQuery += ` ci<=${colorString}`;
        console.log(`🎯 Commander color identity filter applied: ${colorString}`);
      }
    }
    
    // Add format legality if specified
    if (deckFormat && deckFormat !== 'None') {
      const formatMap = {
        'Standard': 'standard',
        'Modern': 'modern', 
        'Legacy': 'legacy',
        'Vintage': 'vintage',
        'Commander / EDH': 'commander',
        'Pioneer': 'pioneer',
        'Historic': 'historic',
        'Pauper': 'pauper'
      };
      
      const scryfallFormat = formatMap[deckFormat];
      if (scryfallFormat) {
        searchQuery += ` legal:${scryfallFormat}`;
        console.log(`⚖️ Format filter applied: ${scryfallFormat}`);
      }
    }
    
    // Always add paper-only filter to exclude digital-only cards
    if (!searchQuery.includes('game:')) {
      searchQuery += ' game:paper';
    }
    
    const scryfallUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchQuery)}&format=json&order=name&dir=asc&unique=cards`;
    console.log(`📡 Scryfall query: ${searchQuery}`);
    
    const response = await fetch(scryfallUrl);
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.json({
          data: [],
          total_cards: 0,
          has_more: false
        });
      }
      throw new Error(`Scryfall API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    res.json({
      data: data.data || [],
      total_cards: data.total_cards || 0,
      has_more: data.has_more || false
    });
    
  } catch (error) {
    console.error('❌ Typesense search error:', error);
    res.status(500).json({ 
      error: 'Failed to search cards',
      message: error.message 
    });
  }
});

// Image proxy endpoint
app.get('/api/cards/image-proxy', (req, res) => {
  const imageUrl = req.query.url;
  console.log(`🖼️ Image proxy request for: ${imageUrl}`);
  
  if (!imageUrl) {
    return res.status(400).json({ error: 'No image URL provided' });
  }
  
  // For now, just redirect to the original image
  // In production, you'd want to actually proxy the image
  res.redirect(imageUrl);
});

// OTAG (Oracle Tags) data endpoint - serves full CSV from filesystem
app.get('/api/otag-data', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Log current working directory and __dirname for debugging
    console.log(`🔍 Server __dirname: ${__dirname}`);
    console.log(`🔍 Process cwd: ${process.cwd()}`);
    
    // Try multiple file paths with better path resolution
    const possiblePaths = [
      // Full dataset (6.9MB - might not deploy to some services)
      path.join(__dirname, '..', 'public', 'scryfall-COMPLETE-oracle-tags-2025-08-08.csv'),
      path.join(process.cwd(), 'public', 'scryfall-COMPLETE-oracle-tags-2025-08-08.csv'),
      path.join(__dirname, 'public', 'scryfall-COMPLETE-oracle-tags-2025-08-08.csv'),
      // Medium dataset (1.3MB, 5000 cards - reliable deployment)
      path.join(__dirname, '..', 'public', 'otag-medium-dataset.csv'),
      path.join(process.cwd(), 'public', 'otag-medium-dataset.csv'),
      path.join(__dirname, 'public', 'otag-medium-dataset.csv'),
      // Alternative file names
      path.join(__dirname, '..', 'public', 'FULL OTAGS.csv'),
      path.join(process.cwd(), 'public', 'FULL OTAGS.csv'),
      // Test data as last resort
      path.join(__dirname, '..', 'public', 'test-otag-data.csv'),
      path.join(process.cwd(), 'public', 'test-otag-data.csv')
    ];
    
    // Also list what files actually exist in the public directory
    try {
      const publicDir = path.join(__dirname, '..', 'public');
      const files = await fs.readdir(publicDir);
      console.log(`📁 Files in public directory (${publicDir}):`, files.filter(f => f.endsWith('.csv')));
    } catch (dirErr) {
      console.log('⚠️ Could not list public directory:', dirErr.message);
    }
    
    for (const filePath of possiblePaths) {
      try {
        console.log(`🔍 Trying OTAG file: ${filePath}`);
        const csvData = await fs.readFile(filePath, 'utf8');
        console.log(`✅ Loaded OTAG file: ${filePath} (${csvData.length} characters, ${Math.round(csvData.length/1024/1024*100)/100}MB)`);
        
        // Only accept files with substantial data (> 100KB for full dataset)
        if (csvData.length < 100000) {
          console.log(`⚠️ File too small (${csvData.length} chars), continuing to next source...`);
          continue;
        }
        
        // Set appropriate headers
        res.set({
          'Content-Type': 'text/csv',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
        });
        
        return res.send(csvData);
      } catch (err) {
        console.log(`⚠️ Could not read ${filePath}:`, err.message);
      }
    }
    
    // If no files found, return error
    res.status(404).json({ 
      error: 'OTAG data file not found', 
      message: 'No Oracle Tags CSV files are available on the server' 
    });
    
  } catch (error) {
    console.error('❌ Error serving OTAG data:', error);
    res.status(500).json({ error: 'Failed to load OTAG data', details: error.message });
  }
});

// MongoDB-based Oracle Tags endpoint - bypasses all file serving issues
app.get('/api/oracle-tags', async (req, res) => {
  try {
    console.log('🏷️ Fetching Oracle Tags from MongoDB...');
    
    // Get all Oracle Tags from database
    const oracleTagsCollection = mongoose.connection.db.collection('oracleTags');
    const allCards = await oracleTagsCollection.find({}).toArray();
    
    console.log(`📊 Retrieved ${allCards.length} cards from MongoDB`);
    
    // Convert to CSV format for compatibility with existing frontend
    let csvContent = 'card_name,oracle_tags\n';
    for (const card of allCards) {
      const cardName = card.cardName.replace(/"/g, '""'); // Escape quotes
      const oracleTags = card.oracleTags.join('|');
      csvContent += `"${cardName}","${oracleTags}"\n`;
    }
    
    // Set appropriate headers
    res.set({
      'Content-Type': 'text/csv',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });
    
    console.log(`✅ Serving Oracle Tags CSV: ${csvContent.length} characters for ${allCards.length} cards`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('❌ Error serving Oracle Tags from MongoDB:', error);
    res.status(500).json({ 
      error: 'Failed to load Oracle Tags from database', 
      details: error.message 
    });
  }
});

// Individual card Oracle Tags lookup
app.get('/api/oracle-tags/:cardName', async (req, res) => {
  try {
    const cardName = decodeURIComponent(req.params.cardName);
    console.log(`🔍 Looking up Oracle Tags for: ${cardName}`);
    
    const oracleTagsCollection = mongoose.connection.db.collection('oracleTags');
    const card = await oracleTagsCollection.findOne({ 
      cardNameLower: cardName.toLowerCase() 
    });
    
    if (card) {
      console.log(`✅ Found ${card.oracleTags.length} Oracle Tags for ${cardName}`);
      res.json({
        cardName: card.cardName,
        oracleTags: card.oracleTags,
        tagCount: card.oracleTags.length
      });
    } else {
      console.log(`❌ No Oracle Tags found for: ${cardName}`);
      res.status(404).json({
        error: 'Card not found',
        cardName: cardName
      });
    }
    
  } catch (error) {
    console.error('❌ Error looking up Oracle Tags:', error);
    res.status(500).json({ 
      error: 'Failed to lookup Oracle Tags', 
      details: error.message 
    });
  }
});

// One-time setup endpoint to populate Oracle Tags from CSV file
app.post('/api/setup/populate-oracle-tags', async (req, res) => {
  try {
    console.log('🏷️ Starting Oracle Tags database population from server...');
    
    const fs = require('fs').promises;
    const path = require('path');
    
    // Try to read CSV file from various paths
    const possiblePaths = [
      path.join(__dirname, '..', 'public', 'scryfall-COMPLETE-oracle-tags-2025-08-08.csv'),
      path.join(__dirname, '..', 'public', 'otag-medium-dataset.csv'),
      path.join(__dirname, '..', 'public', 'test-otag-data.csv'),
    ];
    
    let csvContent;
    let csvSource;
    
    for (const filePath of possiblePaths) {
      try {
        csvContent = await fs.readFile(filePath, 'utf8');
        csvSource = path.basename(filePath);
        console.log(`✅ Loaded CSV from: ${csvSource} (${csvContent.length} characters)`);
        
        // Only use substantial datasets
        if (csvContent.length > 100000) {
          break;
        } else {
          console.log(`⚠️ File too small (${csvContent.length} chars), trying next source...`);
          csvContent = null;
        }
      } catch (err) {
        console.log(`⚠️ Could not read ${filePath}: ${err.message}`);
      }
    }
    
    if (!csvContent) {
      return res.status(404).json({ 
        error: 'No suitable CSV file found',
        message: 'Could not find Oracle Tags CSV file on server'
      });
    }
    
    // Parse CSV data
    console.log('🔄 Parsing CSV data...');
    const lines = csvContent.trim().split('\n');
    const oracleTagsData = [];
    
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
          
          oracleTagsData.push({
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
    
    console.log(`📊 Parsed ${oracleTagsData.length} cards with Oracle Tags`);
    
    // Clear existing data and insert new data
    const oracleTagsCollection = mongoose.connection.db.collection('oracleTags');
    await oracleTagsCollection.deleteMany({});

    // Insert new data in batches
    const BATCH_SIZE = 1000;
    let insertedCount = 0;

    for (let i = 0; i < oracleTagsData.length; i += BATCH_SIZE) {
      const batch = oracleTagsData.slice(i, i + BATCH_SIZE);
      await oracleTagsCollection.insertMany(batch);
      insertedCount += batch.length;
      console.log(`📥 Inserted ${insertedCount}/${oracleTagsData.length} cards...`);
    }

    // Create indexes
    console.log('🔍 Creating database indexes...');
    await oracleTagsCollection.createIndex({ cardNameLower: 1 });
    await oracleTagsCollection.createIndex({ cardName: 1 });
    await oracleTagsCollection.createIndex({ oracleTags: 1 });

    // Test with Jason Bright
    const jasonBright = await oracleTagsCollection.findOne({ cardNameLower: 'jason bright, glowing prophet' });    console.log(`✅ Successfully populated Oracle Tags database!`);
    
    res.json({
      success: true,
      totalCards: insertedCount,
      source: csvSource,
      jasonBrightTags: jasonBright ? jasonBright.oracleTags.length : 0,
      sampleTags: jasonBright ? jasonBright.oracleTags.slice(0, 5) : []
    });
    
  } catch (error) {
    console.error('❌ Error populating Oracle Tags:', error);
    res.status(500).json({ 
      error: 'Failed to populate Oracle Tags', 
      details: error.message 
    });
  }
});

// Decks routes
app.get('/api/decks', (req, res) => {
  res.json({ message: 'Decks endpoint - ready for implementation' });
});

// Helper function to generate MongoDB-compatible ObjectId
const generateObjectId = () => {
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const randomBytes = Array.from({length: 16}, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return (timestamp + randomBytes).substring(0, 24);
};

// In-memory deck storage (replace with database in production)
// File-based persistent storage for decks
// File-based storage removed - now using MongoDB

// Initialize default decks
const defaultDecks = [
  {
    _id: '507f1f77bcf86cd799439011', // Valid ObjectId format
    name: 'Sample Deck 1',
    format: 'Standard',
    colors: ['W', 'U'],
    cardCount: 60,
    cards: [],
    createdAt: new Date().toISOString()
  },
  {
    _id: '507f1f77bcf86cd799439012', // Valid ObjectId format
    name: 'Sample Deck 2',
    format: 'Modern',
    colors: ['B', 'R'],
    cardCount: 75,
    cards: [],
    createdAt: new Date().toISOString()
  },
  {
    _id: '68f6e613e4a2846ff5b31412', // Restored jason deck
    name: 'jason',
    format: 'Commander / EDH',
    colors: ['U'],
    cardCount: 1,
    cards: [
      {
        name: 'Jason Bright, Glowing Prophet',
        quantity: 1,
        isCommander: true,
        printing: '48313997-fd94-486a-bf30-e9143a155814',
        scryfallCard: {
          id: '48313997-fd94-486a-bf30-e9143a155814',
          name: 'Jason Bright, Glowing Prophet',
          color_identity: ['U'],
          type_line: 'Legendary Creature — Zombie Mutant Advisor'
        }
      }
    ],
    commander: [
      {
        name: 'Jason Bright, Glowing Prophet',
        card: {
          id: '48313997-fd94-486a-bf30-e9143a155814',
          name: 'Jason Bright, Glowing Prophet',
          color_identity: ['U'],
          type_line: 'Legendary Creature — Zombie Mutant Advisor'
        }
      }
    ],
    createdAt: new Date().toISOString()
  }
];

// File storage functions removed - now using MongoDB persistence

// Function to enrich card with Scryfall data for preview images
async function enrichCardWithScryfallData(card) {
  if (!card || typeof card !== 'object') return card;
  
  // If card already has scryfallCard data, return as is
  if (card.scryfallCard && typeof card.scryfallCard === 'object' && card.scryfallCard.image_uris) {
    return card;
  }
  
  try {
    let scryfallUrl = null;
    
    // Try to fetch by printing ID first (most specific)
    if (card.printing) {
      scryfallUrl = `https://api.scryfall.com/cards/${card.printing}`;
    } 
    // Fallback to name search
    else if (card.name) {
      scryfallUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}`;
    }
    
    if (scryfallUrl) {
      const response = await fetch(scryfallUrl);
      if (response.ok) {
        const scryfallData = await response.json();
        
        return {
          ...card,
          prices: scryfallData.prices,
          mana_cost: scryfallData.mana_cost,
          color_identity: scryfallData.color_identity,
          cmc: scryfallData.cmc,
          type_line: scryfallData.type_line,
          // Preserve isCommander flag if it exists
          isCommander: card.isCommander,
          scryfallCard: {
            id: scryfallData.id,
            name: scryfallData.name,
            type_line: scryfallData.type_line,
            color_identity: scryfallData.color_identity,
            image_uris: scryfallData.image_uris,
            mana_cost: scryfallData.mana_cost,
            cmc: scryfallData.cmc,
            prices: scryfallData.prices
          }
        };
      }
    }
  } catch (error) {
    console.error(`⚠️  Failed to enrich card "${card.name}":`, error.message);
  }
  
  // Return original card if enrichment fails
  return card;
}

// Function to enrich entire deck with Scryfall data
async function enrichDeckWithScryfallData(deck) {
  if (!deck || !deck.cards || !Array.isArray(deck.cards)) return deck;
  
  const enrichedCards = [];
  
  // Enrich cards in batches to avoid overwhelming Scryfall API
  const batchSize = 5;
  for (let i = 0; i < deck.cards.length; i += batchSize) {
    const batch = deck.cards.slice(i, i + batchSize);
    const enrichedBatch = await Promise.all(
      batch.map(card => enrichCardWithScryfallData(card))
    );
    enrichedCards.push(...enrichedBatch);
    
    // Small delay between batches to respect API limits
    if (i + batchSize < deck.cards.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return {
    ...deck,
    cards: enrichedCards
  };
}

// User's decks endpoint - requires authentication
app.get('/api/decks/mine', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user.id;
    const userDecks = await Deck.find({ owner: new mongoose.Types.ObjectId(userId) }).sort({ updatedAt: -1 });
    
    console.log(`📚 Fetching user decks for ${userId} - returning ${userDecks.length} decks`);
    
    // Enrich decks with Scryfall data for preview images
    const enrichedDecks = await Promise.all(
      userDecks.map(deck => enrichDeckWithScryfallData(deck.toObject()))
    );
    
    res.json(enrichedDecks);
  } catch (error) {
    console.error('❌ Error fetching user decks:', error);
    res.status(500).json({ error: 'Failed to fetch decks' });
  }
});

// Get a specific deck by ID - requires authentication
app.get('/api/decks/:deckId', authenticateToken, async (req, res) => {
  try {
    const deckId = req.params.deckId;
    const userId = req.user.user.id;
    
    console.log(`🔍 Fetching deck: ${deckId} for user: ${userId}`);
    
    const deck = await Deck.findOne({ _id: deckId, owner: new mongoose.Types.ObjectId(userId) });
    
    if (!deck) {
      console.log(`❌ Deck ${deckId} not found or not owned by user ${userId}`);
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    // Enrich with Scryfall data
    const enrichedDeck = await enrichDeckWithScryfallData(deck.toObject());
    
    console.log(`✅ Found deck: ${deck.name}`);
    res.json(enrichedDeck);
  } catch (error) {
    console.error('❌ Error fetching deck:', error);
    res.status(500).json({ error: 'Failed to fetch deck' });
  }
});

// Get cards in a specific deck
app.get('/api/decks/:deckId/cards', (req, res) => {
  const deckId = req.params.deckId;
  console.log(`🃏 Fetching cards for deck: ${deckId}`);
  
  // Mock deck cards
  const mockDeckCards = [
    {
      id: '1',
      name: 'Lightning Bolt',
      mana_cost: '{R}',
      quantity: 4,
      type_line: 'Instant'
    },
    {
      id: '3', 
      name: 'Serra Angel',
      mana_cost: '{3}{W}{W}',
      quantity: 2,
      type_line: 'Creature — Angel'
    }
  ];
  
  res.json(mockDeckCards);
});

// Create a new deck - requires authentication
app.post('/api/decks', authenticateToken, async (req, res) => {
  try {
    const { name, format, colors, cards, commander } = req.body;
    const userId = req.user.user.id;
    
    console.log(`📝 Creating new deck: ${name} for user: ${userId}`, { 
      format, 
      colors, 
      hasCommander: !!commander, 
      cardsCount: cards?.length || 0
    });
    
    const initialCards = [];
    let hasCommanderInCards = false;
  
  // Add any initial cards first, checking for commander
  if (cards && Array.isArray(cards)) {
    for (const card of cards) {
      if (card && typeof card === 'object') {
        // Create safe card object
        const safeCard = {
          name: card.name || (card.scryfallCard && card.scryfallCard.name) || 'Unknown Card',
          quantity: parseInt(card.quantity) || 1,
          printing: card.printing || null,
          scryfallCard: card.scryfallCard || false
        };
        
        // Check if this card is marked as commander OR looks like a commander
        if (card.isCommander || 
            (format === 'Commander / EDH' && 
             card.scryfallCard && 
             typeof card.scryfallCard === 'object' &&
             card.scryfallCard.type_line && 
             card.scryfallCard.type_line.includes('Legendary'))) {
          safeCard.isCommander = true;
          hasCommanderInCards = true;
          console.log(`🎯 Found commander in cards array: ${safeCard.name} (${card.isCommander ? 'marked as commander' : 'detected as legendary'})`);
        }
        
        initialCards.push(safeCard);
      }
    }
  }
  
  console.log(`📊 Deck creation status: hasCommanderInCards=${hasCommanderInCards}, commander=${!!commander}, format=${format}`);
  
  // Only add commander-related cards if none exist yet
  if (!hasCommanderInCards) {
    if (commander) {
      const commanderName = commander.name || commander.commanderName || 'Unknown Commander';
      console.log(`🎯 Adding commander from commander field: ${commanderName}`);
      
      // Create a clean commander object
      const commanderCard = {
        name: commanderName,
        quantity: 1,
        isCommander: true,
        printing: commander.printing || null,
        scryfallCard: commander.scryfallCard || false
      };
      
      // Add other commander properties safely (avoid spreading strings)
      if (typeof commander === 'object' && commander !== null && !Array.isArray(commander)) {
        Object.keys(commander).forEach(key => {
          if (key !== 'name' && key !== 'commanderName' && typeof commander[key] !== 'string') {
            commanderCard[key] = commander[key];
          } else if (key !== 'name' && key !== 'commanderName' && typeof commander[key] === 'string') {
            commanderCard[key] = commander[key];
          }
        });
      }
      
      initialCards.push(commanderCard);
      hasCommanderInCards = true;
    } else if (format === 'Commander / EDH') {
      // Add placeholder commander only for Commander decks with no commander at all
      console.log('📝 Adding Unknown Commander placeholder for Commander deck without commander');
      initialCards.push({
        name: 'Unknown Commander',
        quantity: 1,
        isCommander: true,
        printing: null,
        scryfallCard: false
      });
    }
  } else {
    console.log('✅ Commander already exists in cards array, skipping commander addition');
  }
  
    // Format commander data to match schema
    let commanderArray = [];
    if (commander) {
      if (typeof commander === 'string') {
        // Simple string commander name
        commanderArray = [{
          name: commander,
          card: {
            name: commander
          }
        }];
      } else if (typeof commander === 'object' && commander.name) {
        // Full commander object from Scryfall
        commanderArray = [{
          name: commander.name,
          card: {
            id: commander.id || null,
            name: commander.name,
            color_identity: commander.color_identity || []
          }
        }];
      }
    }
  
    console.log(`📊 Final commander array:`, commanderArray);
  
    // Create new deck in MongoDB
    const newDeck = new Deck({
      name: name || 'Untitled Deck',
      format: format || 'Standard',
      colors: colors || [],
      cardCount: initialCards.reduce((count, card) => count + (card.quantity || 1), 0),
      cards: initialCards,
      commander: commanderArray,
      owner: new mongoose.Types.ObjectId(userId)
    });
    
    await newDeck.save();
    
    console.log(`✅ Deck created with ${newDeck.cards.length} cards for user: ${userId}`);
    
    res.json(newDeck);
  } catch (error) {
    console.error('❌ Error creating deck:', error);
    res.status(500).json({ error: 'Failed to create deck' });
  }
});

// Update deck - requires authentication
app.put('/api/decks/:deckId', authenticateToken, async (req, res) => {
  try {
    const deckId = req.params.deckId;
    const userId = req.user.user.id;
    const updates = req.body;
    
    console.log(`📝 Updating deck: ${deckId} for user: ${userId}`, Object.keys(updates));
    
    // Find the deck and verify ownership
    const deck = await Deck.findOne({ _id: deckId, owner: new mongoose.Types.ObjectId(userId) });
    
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found or not owned by user' });
    }
    
    // Handle cards update separately if provided
    const { cards, ...otherUpdates } = updates;
    
    // Update basic deck properties
    Object.assign(deck, otherUpdates);
    
    // Handle cards update if provided
    if (cards !== undefined) {
      const cardsArray = Array.isArray(cards) ? cards : [];
      
      // Enrich each card with Scryfall data if it's not already enriched
      const enrichedCards = [];
      for (const card of cardsArray) {
        // Only enrich if the card doesn't already have enriched data
        if (card && !card.scryfallCard && !card.prices) {
          try {
            const enrichedCard = await enrichCardWithScryfallData(card);
            enrichedCards.push(enrichedCard);
          } catch (error) {
            console.warn(`⚠️  Failed to enrich card during deck update: ${card.name || 'unknown'}`);
            enrichedCards.push(card); // Keep original card if enrichment fails
          }
        } else {
          enrichedCards.push(card); // Keep already enriched card
        }
      }
      
      deck.cards = enrichedCards;
      deck.cardCount = enrichedCards.reduce((count, card) => count + (card.quantity || 1), 0);
      console.log(`📝 Updated deck cards: ${enrichedCards.length} cards (${enrichedCards.filter(c => c.scryfallCard || c.prices).length} enriched)`);
    }
    
    // Save to MongoDB
    await deck.save();
    
    console.log(`✅ Deck ${deckId} updated successfully`);
    
    res.json(deck);
  } catch (error) {
    console.error('❌ Error updating deck:', error);
    res.status(500).json({ error: 'Failed to update deck' });
  }
});

// Delete deck - requires authentication
app.delete('/api/decks/:deckId', authenticateToken, async (req, res) => {
  try {
    const deckId = req.params.deckId;
    const userId = req.user.user.id;
    
    console.log(`🗑️ Deleting deck: ${deckId} for user: ${userId}`);
    
    // Find and delete the deck, verifying ownership
    const deletedDeck = await Deck.findOneAndDelete({ _id: deckId, owner: new mongoose.Types.ObjectId(userId) });
    
    if (!deletedDeck) {
      console.log(`❌ Deck ${deckId} not found or not owned by user ${userId}`);
      return res.status(404).json({ 
        error: 'Deck not found or not owned by user',
        deckId: deckId
      });
    }
    
    // Get remaining deck count for user
    const remainingCount = await Deck.countDocuments({ owner: new mongoose.Types.ObjectId(userId) });
    
    console.log(`✅ Deck ${deckId} deleted. User has ${remainingCount} remaining decks`);
    
    res.json({ 
      success: true, 
      message: `Deck ${deckId} deleted successfully`,
      deletedId: deckId,
      remainingDecks: remainingCount
    });
  } catch (error) {
    console.error('❌ Error deleting deck:', error);
    res.status(500).json({ error: 'Failed to delete deck' });
  }
});

// Duplicate deck
// Deck duplication endpoint removed - needs MongoDB implementation

// Card management endpoints removed - need MongoDB implementation

// Card management endpoints removed - need MongoDB implementation

// Authentication routes
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// JWT Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Seed initial users for testing (only in production if they don't exist)
async function seedInitialUsers() {
  try {
    const existingUsers = await User.countDocuments();
    if (existingUsers === 0) {
      console.log('🌱 Seeding initial test users...');
      
      const testUsers = [
        {
          username: 'testuser',
          email: 'test@example.com',
          password: '$2a$10$Anhx35dOUmyW0O8kBNQdXuPw90xbNJFwO4bsqXqC9cNYmC/.8VRFq' // 'password123'
        },
        {
          username: 'ianofdoom',
          email: 'ianofdoom@example.com',
          password: '$2a$10$Anhx35dOUmyW0O8kBNQdXuPw90xbNJFwO4bsqXqC9cNYmC/.8VRFq' // 'password123'
        },
        {
          username: 'admin',
          email: 'admin@example.com', 
          password: '$2a$10$Anhx35dOUmyW0O8kBNQdXuPw90xbNJFwO4bsqXqC9cNYmC/.8VRFq' // 'password123'
        }
      ];
      
      await User.insertMany(testUsers);
      console.log('✅ Initial test users seeded successfully');
    }
  } catch (error) {
    console.error('❌ Error seeding users:', error);
  }
}

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    console.log('📝 Registration attempt:', { username, email });
    
    // Check if user already exists in MongoDB
    const existingUser = await User.findOne({
      $or: [{ email: email }, { username: username }]
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user in MongoDB
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });
    
    await newUser.save();
    
    // Create JWT token
    const token = jwt.sign(
      { user: { id: newUser._id } },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
    
    console.log('✅ User registered successfully:', username);
    
    res.json({
      success: true,
      token,
      user: { id: newUser._id, username: newUser.username, email: newUser.email }
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    if (error.code === 11000) {
      // Duplicate key error
      res.status(400).json({ error: 'User already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    console.log('🔐 Login attempt:', { username, email });
    
    // Find user by username or email in MongoDB
    const user = await User.findOne({
      $or: [
        { username: username || email },
        { email: email || username }
      ]
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login time
    user.lastLoginAt = new Date();
    await user.save();
    
    // Create JWT token
    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
    
    console.log('✅ Login successful for:', user.username);
    
    res.json({
      success: true,
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token endpoint
app.get('/api/auth/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await User.findById(decoded.user.id);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({
      valid: true,
      user: { id: user._id, username: user.username, email: user.email }
    });
    
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Debug endpoint to see available users (remove in production)
app.get('/api/auth/debug-users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    const userInfo = users.map(u => ({
      id: u._id,
      username: u.username,
      email: u.email,
      // Don't expose actual passwords, just indicate they exist
      hasPassword: !!u.password
    }));
    
    res.json({
      message: 'Available users in database',
      users: userInfo,
      note: 'This is a debug endpoint - remove in production'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize server with MongoDB persistence
async function startServer() {
  try {
    console.log('🚀 Starting server...');
    const mongoConnected = await connectDB();
    
    if (mongoConnected) {
      await seedInitialUsers();
    } else {
      console.log('⚠️ Skipping user seeding - MongoDB not connected');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🔗 Health check: ${process.env.NODE_ENV === 'production' ? 'https://constant-lists-api.onrender.com' : `http://localhost:${PORT}`}/api/health`);
      if (mongoConnected) {
        console.log(`🍃 MongoDB persistence enabled`);
      } else {
        console.log(`⚠️ Running without persistence - data will not be saved`);
      }
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
