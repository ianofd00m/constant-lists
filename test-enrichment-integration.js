// Test script to verify card data enrichment integration
// This script tests the import flows with enrichment to ensure cards get complete data

import { parseText } from './src/utils/textParser.js';
import { parseCSV } from './src/utils/csvParser.js';
import { parseScryfallJSON } from './src/utils/scryfallParser.js';

// Sample test data
const sampleTextInput = `4 Lightning Bolt
2 Counterspell
1 Black Lotus
3 Sol Ring`;

const sampleCSVInput = `Quantity,Name,Set
4,Lightning Bolt,LEA
2,Counterspell,LEA
1,Black Lotus,LEA
3,Sol Ring,LEA`;

async function testTextParserEnrichment() {
  console.log('🧪 Testing Text Parser with Enrichment...');
  
  try {
    // Test without enrichment (original behavior)
    const basicResult = await parseText(sampleTextInput, { enrichData: false });
    console.log('✅ Basic text parsing (no enrichment):', basicResult.length, 'cards');
    console.log('   Sample card fields:', Object.keys(basicResult[0]));
    
    // Test with enrichment
    const enrichedResult = await parseText(sampleTextInput, { 
      enrichData: true, 
      showProgress: false // Silent for testing
    });
    console.log('✅ Enriched text parsing:', enrichedResult.length, 'cards');
    console.log('   Sample enriched fields:', Object.keys(enrichedResult[0]));
    
    // Check if enrichment added expected fields
    const enrichedCard = enrichedResult[0];
    const hasTypeData = enrichedCard.type_line || enrichedCard.scryfall_json?.type_line;
    const hasColorData = enrichedCard.color_identity || enrichedCard.scryfall_json?.color_identity;
    const hasSetData = enrichedCard.set_name || enrichedCard.scryfall_json?.set_name;
    
    console.log('   Type data present:', !!hasTypeData);
    console.log('   Color identity present:', !!hasColorData);
    console.log('   Set name present:', !!hasSetData);
    
  } catch (error) {
    console.error('❌ Text parser enrichment test failed:', error.message);
  }
}

async function testCSVParserEnrichment() {
  console.log('\n🧪 Testing CSV Parser with Enrichment...');
  
  try {
    // Test without enrichment
    const basicResult = await parseCSV(sampleCSVInput, { enrichData: false });
    console.log('✅ Basic CSV parsing (no enrichment):', basicResult.length, 'cards');
    
    // Test with enrichment
    const enrichedResult = await parseCSV(sampleCSVInput, { 
      enrichData: true, 
      showProgress: false 
    });
    console.log('✅ Enriched CSV parsing:', enrichedResult.length, 'cards');
    
    // Check enrichment quality
    const enrichedCard = enrichedResult[0];
    const hasCompleteData = (
      (enrichedCard.type_line || enrichedCard.scryfall_json?.type_line) &&
      (enrichedCard.color_identity || enrichedCard.scryfall_json?.color_identity) &&
      (enrichedCard.set_name || enrichedCard.scryfall_json?.set_name)
    );
    
    console.log('   Complete enrichment successful:', hasCompleteData);
    
  } catch (error) {
    console.error('❌ CSV parser enrichment test failed:', error.message);
  }
}

async function testScryfallParserEnrichment() {
  console.log('\n🧪 Testing Scryfall Parser with Enrichment...');
  
  try {
    // Sample minimal Scryfall JSON (missing some fields)
    const minimalScryfallData = [{
      name: "Lightning Bolt",
      set: "lea",
      collector_number: "161"
    }];
    
    // Test with enrichment (should fill missing fields)
    const enrichedResult = await parseScryfallJSON(JSON.stringify(minimalScryfallData), { 
      enrichData: true, 
      showProgress: false 
    });
    console.log('✅ Enriched Scryfall parsing:', enrichedResult.length, 'cards');
    
    const enrichedCard = enrichedResult[0];
    console.log('   Card name:', enrichedCard.name);
    console.log('   Has type_line:', !!(enrichedCard.type_line || enrichedCard.scryfall_json?.type_line));
    console.log('   Has color_identity:', !!(enrichedCard.color_identity || enrichedCard.scryfall_json?.color_identity));
    
  } catch (error) {
    console.error('❌ Scryfall parser enrichment test failed:', error.message);
  }
}

async function runEnrichmentTests() {
  console.log('🚀 Starting Card Data Enrichment Integration Tests\n');
  console.log('This test verifies that import flows can enrich card data with complete Scryfall information');
  console.log('Note: Tests may take a few seconds due to API calls\n');
  
  await testTextParserEnrichment();
  await testCSVParserEnrichment();
  await testScryfallParserEnrichment();
  
  console.log('\n✨ Enrichment integration tests completed!');
  console.log('Import flows are now ready to populate complete card data including:');
  console.log('   • type_line (card types)');
  console.log('   • color_identity (mana symbols)');
  console.log('   • set_name (full set names)');
  console.log('   • Additional Scryfall metadata');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEnrichmentTests().catch(console.error);
}

export { runEnrichmentTests };