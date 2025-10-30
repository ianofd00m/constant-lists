// Test Enhanced Condition and Language Support
// This tests the comprehensive condition grading and language detection

export async function testConditionAndLanguageSupport() {
  console.log('🔍 Testing Enhanced Condition & Language Support...\n');
  
  // Test condition variations
  const conditionTestData = `4 Lightning Bolt - Alpha - Near Mint
2 Black Lotus - Beta - Lightly Played  
1 Ancestral Recall - Alpha - Moderately Played
1 Time Walk - Alpha - Heavily Played
1 Timetwister - Alpha - Damaged
1 Mox Pearl - Beta - Excellent
1 Mox Sapphire - Beta - Very Fine
1 Mox Ruby - Beta - Fine
1 Mox Emerald - Beta - Good
1 Mox Jet - Beta - Fair
1 Chaos Orb - Alpha - Poor
1 Sol Ring - Alpha - Slightly Played
1 Library of Alexandria - Arabian Nights - Worn`;

  // Test language variations
  const languageTestData = `4 Lightning Bolt - French
2 Black Lotus - Japanese
1 Ancestral Recall - German
1 Time Walk - Spanish
1 Timetwister - Italian
1 Mox Pearl - Portuguese
1 Mox Sapphire - Korean
1 Mox Ruby - Chinese
1 Mox Emerald - Russian
1 Chaos Orb - Phyrexian`;

  try {
    const { parseText } = await import('./textParser.js');
    
    console.log('Testing condition detection...');
    const conditionResults = await parseText(conditionTestData);
    
    console.log('📊 Condition Results:');
    conditionResults.forEach(card => {
      console.log(`  ${card.name}: ${card.condition}`);
    });
    
    console.log('\nTesting language detection...');
    const languageResults = await parseText(languageTestData);
    
    console.log('🌍 Language Results:');
    languageResults.forEach(card => {
      console.log(`  ${card.name}: ${card.language}`);
    });
    
    // Test CSV condition and language normalization
    console.log('\nTesting CSV condition/language normalization...');
    const csvTestData = `Count,Name,Edition,Condition,Language
4,Lightning Bolt,Alpha,M,English
2,Black Lotus,Beta,SP,French  
1,Ancestral Recall,Alpha,MP,Deutsch
1,Time Walk,Alpha,HP,Español
1,Timetwister,Alpha,P,Italiano
1,Mox Pearl,Beta,Excellent,日本語
1,Mox Sapphire,Beta,VF,한국어
1,Mox Ruby,Beta,Good,中文`;

    const { parseCSV } = await import('./csvParser.js');
    const csvResults = await parseCSV(csvTestData);
    
    console.log('📋 CSV Condition/Language Results:');
    csvResults.forEach(card => {
      console.log(`  ${card.name}: ${card.condition} / ${card.language}`);
    });
    
    console.log('\n✅ Condition and Language support test completed!');
    
  } catch (error) {
    console.error('❌ Condition/Language test failed:', error);
  }
}

// TCGPlayer Condition Standards Reference
export const conditionStandards = {
  'NM': {
    name: 'Near Mint',
    description: 'Appears Mint to Slightly Played but on closer inspection may have slight wear',
    criteria: [
      'No creases, bends, or nicks',
      'Minimal edge wear',
      'Minimal corner wear',
      'Minimal scratches on surface'
    ]
  },
  'LP': {
    name: 'Lightly Played',
    description: 'Light wear visible upon close inspection',
    criteria: [
      'Minor edge wear',
      'Minor corner wear', 
      'Minor surface scratches',
      'No creases or bends'
    ]
  },
  'MP': {
    name: 'Moderately Played',
    description: 'Moderate wear that is still tournament legal when sleeved',
    criteria: [
      'Moderate edge wear',
      'Moderate corner wear',
      'Moderate surface wear',
      'Minor creases acceptable'
    ]
  },
  'HP': {
    name: 'Heavily Played',
    description: 'Heavy wear but still recognizable and playable when sleeved',
    criteria: [
      'Heavy edge wear',
      'Heavy corner wear',
      'Heavy surface wear',
      'Creases and bends acceptable'
    ]
  },
  'DMG': {
    name: 'Damaged',
    description: 'Card is damaged but still tournament legal when sleeved',
    criteria: [
      'Major damage acceptable',
      'Tears, holes, or ink marks',
      'Still recognizable as the card',
      'Tournament legal when sleeved'
    ]
  }
};

// MTG Language Codes Reference
export const languageCodes = {
  'EN': 'English',
  'ES': 'Spanish (Español)',
  'FR': 'French (Français)',
  'DE': 'German (Deutsch)',
  'IT': 'Italian (Italiano)',
  'PT': 'Portuguese (Português)',
  'JA': 'Japanese (日本語)',
  'KO': 'Korean (한국어)',
  'ZH': 'Chinese (中文)',
  'ZHS': 'Chinese Simplified',
  'ZHT': 'Chinese Traditional',
  'RU': 'Russian (Русский)',
  'NL': 'Dutch (Nederlands)',
  'SV': 'Swedish (Svenska)',
  'NO': 'Norwegian (Norsk)',
  'DA': 'Danish (Dansk)',
  'FI': 'Finnish (Suomi)',
  'PH': 'Phyrexian'
};

console.log('📚 Enhanced Condition & Language Support Reference:');
console.log('\n🏆 TCGPlayer Condition Standards:');
Object.entries(conditionStandards).forEach(([code, info]) => {
  console.log(`${code}: ${info.name} - ${info.description}`);
});

console.log('\n🌍 Supported Languages:');
Object.entries(languageCodes).forEach(([code, name]) => {
  console.log(`${code}: ${name}`);
});