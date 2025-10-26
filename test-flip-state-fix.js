#!/usr/bin/env node

// Quick test to verify the ResearchPage flipStates fix
console.log('🧪 Testing ResearchPage flipStates fix...');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const filePath = path.join(__dirname, 'src/components/ResearchPage.jsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if all required props are being passed to ResultsList
  const requiredProps = [
    'flipStates={flipStates}',
    'isDoubleFacedCard={isDoubleFacedCard}',
    'getCardName={getCardName}',
    'handleFlipCard={handleFlipCard}',
    'getCardImageUrl={getCardImageUrl}'
  ];
  
  const resultsListCallMatch = content.match(/<ResultsList[^>]*>/s);
  if (!resultsListCallMatch) {
    console.error('❌ Could not find ResultsList component call');
    process.exit(1);
  }
  
  const resultsListCall = resultsListCallMatch[0];
  console.log('🔍 ResultsList call found');
  
  let allPropsPresent = true;
  for (const prop of requiredProps) {
    if (!resultsListCall.includes(prop)) {
      console.error(`❌ Missing prop: ${prop}`);
      allPropsPresent = false;
    } else {
      console.log(`✅ Found prop: ${prop}`);
    }
  }
  
  // Check if ResultsList function signature includes all required props
  const functionSignatureMatch = content.match(/function ResultsList\(\{([^}]+)\}\)/);
  if (!functionSignatureMatch) {
    console.error('❌ Could not find ResultsList function signature');
    process.exit(1);
  }
  
  const functionSignature = functionSignatureMatch[1];
  console.log('🔍 ResultsList function signature found');
  
  const requiredParams = [
    'flipStates',
    'isDoubleFacedCard', 
    'getCardName',
    'handleFlipCard',
    'getCardImageUrl'
  ];
  
  for (const param of requiredParams) {
    if (!functionSignature.includes(param)) {
      console.error(`❌ Missing parameter: ${param}`);
      allPropsPresent = false;
    } else {
      console.log(`✅ Found parameter: ${param}`);
    }
  }
  
  if (allPropsPresent) {
    console.log('✅ All tests passed! flipStates fix is complete.');
    console.log('🎉 The hybrid and grid views should now work without errors.');
  } else {
    console.error('❌ Some tests failed. Please check the implementation.');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Error testing fix:', error.message);
  process.exit(1);
}
