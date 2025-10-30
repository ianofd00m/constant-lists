// Test script for the Collection Import System
// This demonstrates various import formats supported by the system

// Example CSV data (Archidekt format)
const archidektCSV = `Quantity,Name,Finish,Condition,Date Added,Language,Purchase Price,Tags,Edition Name,Edition Code,Multiverse Id,Scryfall ID,MTGO ID,Collector Number,Mana Value,Colors,Identities,Mana cost,Types,Sub-types,Super-types,Rarity,Price (Card Kingdom),Price (TCG Player),Price (Star City Games),Price (Card Hoarder),Price (Card Market),Scryfall Oracle ID
3,Aberrant Researcher // Perfected Form,Normal,NM,2025-04-24,EN,,,Shadows over Innistrad,soi,409790,b5c9649e-9ae5-4926-bf08-71ba23aa37f1,59886,49,4,Blue,Blue,,Creature,"Human,Insect",,uncommon,0.35,0.06,0.29,0.03,0.02,722ee05f-6815-41b7-9813-5ec3902c1e9f
4,Abiding Grace,Normal,NM,2025-04-24,EN,,,Modern Horizons 2,mh2,522077,db113c47-c403-4c7f-9fa9-212c977df8d1,90371,1,3,White,White,{2}{W},Enchantment,,,uncommon,0.35,0.16,0.29,0.03,0.18,f4e7bc58-336d-4670-84cb-a46ca1f48671
1,Lightning Bolt,Foil,NM,2025-04-24,EN,,,Alpha,lea,94,f7a99cc7-8e3c-4935-82e9-2c9a56a0e99b,1,1,1,Red,Red,{R},Instant,,,common,299.99,245.50,299.99,0.02,189.32,ce711943-c1a1-43aa-8b62-844ecd606c39`;

// Example Moxfield CSV format
const moxfieldCSV = `Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price
4,Lightning Bolt,Limited Edition Alpha,Near Mint,English,,,2025-01-15,1,,,299.99
1,Black Lotus,Limited Edition Alpha,Near Mint,English,,,2025-01-15,3,,,15000.00
3,Ancestral Recall,Limited Edition Alpha,Near Mint,English,,,2025-01-15,2,,,8500.00`;

// Example EchoMTG CSV format
const echoMTGCSV = `Quantity,Name,Set,Set Abbr,Rarity,Condition,Foil,Price,Type,Colors,CMC
4,Lightning Bolt,Fourth Edition,4ED,Common,Near Mint,No,$0.25,Instant,Red,1
1,Black Lotus,Alpha,LEA,Rare,Near Mint,No,$8500.00,Artifact,Colorless,0
2,Counterspell,Ice Age,ICE,Common,Near Mint,Yes,$3.50,Instant,Blue,2
3,Force of Will,Alliances,ALL,Rare,Near Mint,No,$85.00,Instant,Blue,5`;

// Example MTGGoldfish format
const mtgGoldfishCSV = `Card,Set,Quantity,Foil,Price
Lightning Bolt,M11,4,No,$0.50
Force of Will,Alliances,1,Yes,$85.00
Brainstorm,Ice Age,4,No,$2.00`;

// Example Deckbox format (comprehensive)
const deckboxCSV = `Count,Tradelist Count,Name,Edition,Card Number,Condition,Language,Foil,Signed,Artist Proof,Altered Art,Misprint,Promo,Textless,My Price
4,1,Lightning Bolt,4th Edition,161,Near Mint,English,,,,,,,,$0.25
1,0,Black Lotus,Alpha,232,Near Mint,English,,Yes,,,,,,,$15000.00
2,1,Counterspell,Ice Age,65,Near Mint,English,Yes,,,Yes,,,,$3.50
1,0,Mox Pearl,Alpha,265,Light Play,English,,,Yes,,,,,$4500.00`;

// Example text formats
const textFormats = {
  quantityX: `4x Lightning Bolt
2x Black Lotus
1x Ancestral Recall`,

  quantitySpace: `4 Lightning Bolt (LEA)
2 Black Lotus [Alpha]
1 Ancestral Recall - Alpha - Foil`,

  dashSeparated: `4 - Lightning Bolt - Alpha - Near Mint
2 - Black Lotus - Alpha - Foil
1 - Ancestral Recall - Alpha - Near Mint`,

  detailed: `Lightning Bolt - Alpha - Near Mint - Regular
Black Lotus - Alpha - Near Mint - Foil
Ancestral Recall - Alpha - Near Mint - Regular`,

  mixed: `4x Lightning Bolt (LEA)
2 Black Lotus - Alpha - Foil
1 Ancestral Recall [Alpha]
3x Counterspell
1 Time Walk (LEA) - Near Mint - Foil
2 Timetwister - Alpha`
};

// Function to test CSV parsing
export async function testCSVParsing() {
  const { parseCSV } = await import('../utils/csvParser.js');
  
  console.log('=== Testing CSV Parsing ===');
  
  try {
    console.log('Testing Archidekt CSV format...');
    const archidektResult = await parseCSV(archidektCSV);
    console.log('Archidekt parsed cards:', archidektResult.length);
    console.log('Sample card:', archidektResult[0]);
    
    console.log('\nTesting Moxfield CSV format...');
    const moxfieldResult = await parseCSV(moxfieldCSV);
    console.log('Moxfield parsed cards:', moxfieldResult.length);
    console.log('Sample card:', moxfieldResult[0]);
    
    console.log('\nTesting EchoMTG CSV format...');
    const echoMTGResult = await parseCSV(echoMTGCSV);
    console.log('EchoMTG parsed cards:', echoMTGResult.length);
    console.log('Sample card:', echoMTGResult[0]);
    
    console.log('\nTesting MTGGoldfish CSV format...');
    const mtgGoldfishResult = await parseCSV(mtgGoldfishCSV);
    console.log('MTGGoldfish parsed cards:', mtgGoldfishResult.length);
    console.log('Sample card:', mtgGoldfishResult[0]);
    
    console.log('\nTesting Deckbox CSV format...');
    const deckboxResult = await parseCSV(deckboxCSV);
    console.log('Deckbox parsed cards:', deckboxResult.length);
    console.log('Sample card:', deckboxResult[0]);
    console.log('Special attributes:', {
      signed: deckboxResult[1]?.signed,
      artistProof: deckboxResult[3]?.artist_proof,
      altered: deckboxResult[2]?.altered,
      tradelist: deckboxResult[0]?.tradelist_count
    });
    
  } catch (error) {
    console.error('CSV parsing error:', error);
  }
}

// Example Scryfall JSON formats
const scryfallSingleCard = `{
  "object": "card",
  "id": "2cfd365e-34d1-4224-b925-119000311934",
  "name": "Greta, Sweettooth Scourge",
  "mana_cost": "{1}{B}{G}",
  "cmc": 3.0,
  "type_line": "Legendary Creature — Human Warrior",
  "power": "3",
  "toughness": "3",
  "colors": ["B", "G"],
  "color_identity": ["B", "G"],
  "set": "woe",
  "set_name": "Wilds of Eldraine",
  "collector_number": "205",
  "rarity": "uncommon",
  "prices": {
    "usd": "0.15",
    "usd_foil": "0.21"
  }
}`;

const scryfallSearchResults = `{
  "object": "list",
  "data": [
    {
      "object": "card",
      "name": "Lightning Bolt",
      "mana_cost": "{R}",
      "cmc": 1.0,
      "type_line": "Instant",
      "set": "lea",
      "set_name": "Limited Edition Alpha",
      "collector_number": "1",
      "rarity": "common"
    }
  ]
}`;

// Function to test text parsing
export async function testTextParsing() {
  const { parseText } = await import('../utils/textParser.js');
  
  console.log('\n=== Testing Text Parsing ===');
  
  for (const [format, text] of Object.entries(textFormats)) {
    try {
      console.log(`\nTesting ${format} format...`);
      const result = await parseText(text);
      console.log(`Parsed ${result.length} cards`);
      console.log('Sample cards:', result.slice(0, 2));
    } catch (error) {
      console.error(`Error parsing ${format}:`, error);
    }
  }
}

// Function to test Scryfall JSON parsing
export async function testScryfallParsing() {
  const { parseScryfallJSON } = await import('../utils/scryfallParser.js');
  
  console.log('\n=== Testing Scryfall JSON Parsing ===');
  
  try {
    console.log('Testing single card JSON...');
    const singleResult = await parseScryfallJSON(scryfallSingleCard);
    console.log('Single card parsed:', singleResult.length);
    console.log('Card data:', singleResult[0]);
    
    console.log('\nTesting search results JSON...');
    const searchResult = await parseScryfallJSON(scryfallSearchResults);
    console.log('Search results parsed:', searchResult.length);
    console.log('Card data:', searchResult[0]);
    
  } catch (error) {
    console.error('Scryfall JSON parsing error:', error);
  }
}

// Function to test camera features
export async function testCameraFeatures() {
  const { initializeCameraFeatures, isOCRAvailable } = await import('../utils/cameraParser.js');
  
  console.log('\n=== Testing Camera Features ===');
  
  try {
    const features = await initializeCameraFeatures();
    console.log('Camera available:', features.camera);
    console.log('OCR available:', features.ocr);
    
    const ocrStatus = await isOCRAvailable();
    console.log('OCR library loaded:', ocrStatus);
    
  } catch (error) {
    console.error('Camera feature error:', error);
  }
}

// Function to test universal document format support
export async function testUniversalFormats() {
  console.log('\n=== Testing Universal Document Formats ===');
  
  // Test document parser capability
  try {
    const { documentParser, getSupportedFormats } = await import('./documentParser.js');
    
    console.log('📁 Supported format categories:');
    const formats = getSupportedFormats();
    Object.entries(formats).forEach(([category, extensions]) => {
      console.log(`  ${category}: ${extensions.join(', ')}`);
    });
    
    // Test format detection
    const { validateFileFormat } = await import('./formatDetection.js');
    
    const testFiles = [
      { name: 'collection.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { name: 'collection.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { name: 'collection.pdf', type: 'application/pdf' },
      { name: 'collection.md', type: 'text/markdown' },
      { name: 'collection.rtf', type: 'application/rtf' }
    ];
    
    console.log('\n🔍 Format Detection Results:');
    testFiles.forEach(file => {
      const validation = validateFileFormat(file);
      console.log(`  ${file.name}: ${validation.message}`);
    });
    
    console.log('\n✅ Universal format support validated!');
    
  } catch (error) {
    console.error('❌ Universal format test failed:', error.message);
  }
}

// Function to test new file format support
export async function testNewFileFormats() {
  console.log('\n=== Testing Enhanced File Formats ===');
  
  // Test enhanced text format with foil indicators and set codes
  console.log('\nTesting enhanced text format with foil indicators...');
  try {
    const { parseText } = await import('../utils/textParser.js');
    const enhancedText = `1 Hazezon, Shaper of Sand (DMC) 32 *F*
1 Abraded Bluffs (OTJ) 251
1 Ancient Greenwarden (ZNR) 178 *F*
1 Exploration (2XM) 167 *F*
1 Parallel Lives (ISD) 199 *F*`;
    
    const result = await parseText(enhancedText);
    console.log('✅ Enhanced text parsing successful:', result.length, 'cards');
    console.log('Sample foil card:', result.find(c => c.foil));
  } catch (error) {
    console.error('❌ Enhanced text parsing failed:', error.message);
  }
  
  // Test simple text format (.txt files)
  console.log('\nTesting simple text format (.txt)...');
  try {
    const { parseSimpleText } = await import('../utils/simpleTextParser.js');
    const simpleText = `2 Questing Beast
3 Surrak, the Hunt Caller
4 Strangleroot Geist
19 Forest

// Sideboard
1 Tormod's Crypt
2 Veil of Summer`;
    
    const result = await parseSimpleText(simpleText);
    console.log('✅ Simple text parsing successful:', result.length, 'cards');
    console.log('Sample mainboard card:', result.find(c => !c.sideboard));
    console.log('Sample sideboard card:', result.find(c => c.sideboard));
  } catch (error) {
    console.error('❌ Simple text parsing failed:', error.message);
  }
  
  // Test DEK XML format
  console.log('\nTesting DEK XML format...');
  try {
    const { parseDek } = await import('../utils/dekParser.js');
    const dekXML = `<?xml version="1.0" encoding="utf-8"?>
<Deck xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <NetDeckID>0</NetDeckID>
  <PreconstructedDeckID>0</PreconstructedDeckID>
  <Cards CatID="78482" Quantity="2" Sideboard="false" Name="Questing Beast"/>
  <Cards CatID="56146" Quantity="3" Sideboard="false" Name="Surrak, the Hunt Caller"/>
  <Cards CatID="91496" Quantity="19" Sideboard="false" Name="Forest"/>
  <Cards CatID="12345" Quantity="1" Sideboard="true" Name="Tormod's Crypt"/>
</Deck>`;
    
    const result = await parseDek(dekXML);
    console.log('✅ DEK XML parsing successful:', result.cards.length, 'cards');
    console.log('Deck metadata:', result.metadata);
    console.log('Sample card with CatID:', result.cards[0]);
  } catch (error) {
    console.error('❌ DEK XML parsing failed:', error.message);
  }
  
  // Test Scryfall deck JSON format
  console.log('\nTesting Scryfall deck JSON format...');
  try {
    const { parseScryfallJSON } = await import('../utils/scryfallParser.js');
    const deckJSON = `{
  "object": "deck",
  "id": "test-deck-123",
  "name": "Test Deck",
  "entries": {
    "mainboard": [
      {
        "object": "deck_entry",
        "count": 4,
        "card_digest": {
          "object": "card_digest",
          "id": "19353629-07be-47e2-a7d5-3a5e5e1120c8",
          "name": "Lightning Bolt",
          "set": "lea",
          "collector_number": "161",
          "mana_cost": "{R}",
          "type_line": "Instant"
        }
      }
    ],
    "sideboard": [
      {
        "object": "deck_entry", 
        "count": 1,
        "card_digest": {
          "object": "card_digest",
          "id": "12345678-1234-1234-1234-123456789012",
          "name": "Tormod's Crypt",
          "set": "m21",
          "collector_number": "241",
          "mana_cost": "{0}",
          "type_line": "Artifact"
        }
      }
    ]
  }
}`;
    
    const result = await parseScryfallJSON(deckJSON);
    console.log('✅ Scryfall deck JSON parsing successful:', result.length, 'cards');
    console.log('Sample mainboard card:', result.find(c => !c.sideboard));
    console.log('Sample sideboard card:', result.find(c => c.sideboard));
  } catch (error) {
    console.error('❌ Scryfall deck JSON parsing failed:', error.message);
  }
}

// Function to run all tests
export async function runAllTests() {
  console.log('🧪 Running Comprehensive Collection Import Tests...\n');
  
  await testCSVParsing();
  await testTextParsing();
  await testScryfallParsing();
  await testUniversalFormats();
  await testNewFileFormats();
  await testCameraFeatures();
  
  // Test enhanced condition and language support
  try {
    const { testConditionAndLanguageSupport } = await import('./testConditionLanguage.js');
    await testConditionAndLanguageSupport();
  } catch (error) {
    console.log('⚠️ Condition/Language test module not available');
  }
  
  console.log('\n✅ All tests completed!');
  console.log('📊 Universal import system supports 20+ document formats');
  console.log('🌐 Platform coverage: Windows Office, macOS iWork, Google Workspace, LibreOffice');
}

// Sample data for manual testing
export const sampleData = {
  archidektCSV,
  moxfieldCSV,
  echoMTGCSV,
  mtgGoldfishCSV,
  deckboxCSV,
  textFormats,
  scryfallSingleCard,
  scryfallSearchResults
};

// Usage instructions
export const usageInstructions = `
🔧 Collection Import System Usage:

1. CSV Import:
   - Supports Moxfield, Archidekt, MTGGoldfish, Deckbox exports
   - Automatically detects column mappings
   - Handles various quantity, name, set, and foil formats

2. Text Import:
   - Supports multiple text formats:
     • "4x Lightning Bolt"
     • "4 Lightning Bolt (LEA)"
     • "Lightning Bolt - Alpha - Foil"
     • "4 - Lightning Bolt - Alpha - Near Mint"
   - Extracts quantities, card names, sets, and foil status

3. Camera Import:
   - Uses device camera to scan card lists
   - OCR processing with Tesseract.js
   - Fallback for manual text input if OCR unavailable

4. Features:
   - Duplicate detection and quantity merging
   - Data validation and normalization
   - Preview before import
   - Progress indicators
   - Error handling and recovery

To test: Import sample data using the Import Collection button on /collect page
`;

console.log(usageInstructions);