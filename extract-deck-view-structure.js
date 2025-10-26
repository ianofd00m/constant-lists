// Script to extract and analyze the structure of the DeckViewEdit component
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'src', 'components', 'DeckViewEdit.jsx');
const content = fs.readFileSync(filePath, 'utf8');

// Extract the main component function
const componentMatch = content.match(/export default function DeckViewEdit\(\) \{[\s\S]+\}/);
if (!componentMatch) {
  console.log('Could not find DeckViewEdit component');
  process.exit(1);
}

// Find the main return statement
const returnMatch = content.match(/return \(\s*<div/);
if (!returnMatch) {
  console.log('Could not find main return statement');
} else {
  const mainReturnIndex = content.indexOf('return (', content.indexOf('debouncedSearch.cancel'));
  if (mainReturnIndex === -1) {
    console.log('Could not find main return statement after cleanup functions');
    process.exit(1);
  }
  
  // Extract starting part of the return statement
  const returnStart = content.substring(mainReturnIndex, mainReturnIndex + 1000);
  console.log('Main return structure starts with:');
  console.log(returnStart);

  // Look for deck container structure
  const deckLayoutMatch = returnStart.match(/(container|layout|sidebar|main|content|grid)/g);
  if (deckLayoutMatch) {
    console.log('\nIdentified layout keywords:', deckLayoutMatch);
  }
}

// Look for all div elements with className that might be part of the layout
const classNameMatches = content.match(/<div\s+className=['"]([^'"]+)['"]/g);
if (classNameMatches) {
  console.log('\nFound div elements with className:');
  const uniqueClasses = [...new Set(classNameMatches.map(match => {
    const classMatch = match.match(/className=['"]([^'"]+)['"]/);
    return classMatch ? classMatch[1] : null;
  }).filter(Boolean))];
  console.log(uniqueClasses.join('\n'));
}

// Look for where CardGroupSortOptions would need to be added
const cardTypeGridIndex = content.indexOf('card-type-grid');
if (cardTypeGridIndex !== -1) {
  console.log('\nFound card-type-grid at position', cardTypeGridIndex);
  const surroundingCode = content.substring(cardTypeGridIndex - 100, cardTypeGridIndex + 100);
  console.log('Surrounding code:', surroundingCode);
}
