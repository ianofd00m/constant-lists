import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Original file path
const deckViewEditPath = path.join(__dirname, 'src', 'components', 'DeckViewEdit.jsx');

// Read the full content of the file
const content = fs.readFileSync(deckViewEditPath, 'utf8');

// Get the lines of the file to analyze
const lines = content.split('\n');

// Find the line with the CardGroupSortOptions function definition
const cardGroupStartIndex = lines.findIndex(line => line.includes('function CardGroupSortOptions'));

// The component is already extracted
if (cardGroupStartIndex === -1) {
  console.log('CardGroupSortOptions function definition not found in DeckViewEdit.jsx');
  
  // Check if there's still a syntax error (brace mismatch)
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  
  console.log(`Open braces: ${openBraces}, Close braces: ${closeBraces}`);
  
  if (openBraces !== closeBraces) {
    if (openBraces > closeBraces) {
      console.log(`Missing ${openBraces - closeBraces} closing brace(s)`);
      // Attempt to fix by adding closing braces at the end
      const fixedContent = content + '\n'.repeat(openBraces - closeBraces) + '}'.repeat(openBraces - closeBraces);
      fs.writeFileSync(deckViewEditPath, fixedContent, 'utf8');
      console.log('Added missing closing braces at the end');
    } else {
      console.log(`Extra ${closeBraces - openBraces} closing brace(s)`);
      // Find and remove extra closing braces from the end
      let fixedLines = [...lines];
      for (let i = fixedLines.length - 1, removed = 0; i >= 0 && removed < (closeBraces - openBraces); i--) {
        if (fixedLines[i].trim() === '}') {
          fixedLines.splice(i, 1);
          removed++;
          console.log(`Removed brace at line ${i + 1}`);
        }
      }
      fs.writeFileSync(deckViewEditPath, fixedLines.join('\n'), 'utf8');
      console.log('Removed extra closing braces');
    }
  } else {
    console.log('Braces are balanced, but there might be a nesting issue');
  }
  
  process.exit(0);
}

console.log(`Found CardGroupSortOptions starting at line ${cardGroupStartIndex + 1}`);

// Find the end of the CardGroupSortOptions function
// We'll scan for matching braces
let openBraces = 0;
let closeBraces = 0;
let cardGroupEndIndex = cardGroupStartIndex;

for (let i = cardGroupStartIndex; i < lines.length; i++) {
  const openCount = (lines[i].match(/{/g) || []).length;
  const closeCount = (lines[i].match(/}/g) || []).length;
  
  openBraces += openCount;
  closeBraces += closeCount;
  
  if (openBraces > 0 && openBraces === closeBraces) {
    cardGroupEndIndex = i;
    break;
  }
}

console.log(`Found CardGroupSortOptions ending at line ${cardGroupEndIndex + 1}`);

// Extract the CardGroupSortOptions component
const cardGroupSortOptionsCode = lines.slice(cardGroupStartIndex, cardGroupEndIndex + 1).join('\n');

// Create the new component file
const cardGroupSortOptionsPath = path.join(__dirname, 'src', 'components', 'CardGroupSortOptions.jsx');
const componentContent = `import React from 'react';

${cardGroupSortOptionsCode}

export default CardGroupSortOptions;
`;

// Write the component file
fs.writeFileSync(cardGroupSortOptionsPath, componentContent, 'utf8');
console.log('Created CardGroupSortOptions.jsx component file');

// Remove the component from the original file and add the import
const beforeComponent = lines.slice(0, cardGroupStartIndex).join('\n');
const afterComponent = lines.slice(cardGroupEndIndex + 1).join('\n');

// Add the import statement for the new component
const importStatement = 'import CardGroupSortOptions from \'./CardGroupSortOptions\';';
const importPos = beforeComponent.lastIndexOf('import');
const lastImportEnd = beforeComponent.indexOf(';', importPos) + 1;
const withImport = beforeComponent.slice(0, lastImportEnd) + '\n' + importStatement + beforeComponent.slice(lastImportEnd);

// Combine the content without the extracted component
const updatedContent = withImport + afterComponent;

// Write the updated file
fs.writeFileSync(deckViewEditPath, updatedContent, 'utf8');
console.log('Updated DeckViewEdit.jsx with import and removed component definition');

// Count braces in the updated file to verify
const finalContent = fs.readFileSync(deckViewEditPath, 'utf8');
const finalOpenBraces = (finalContent.match(/{/g) || []).length;
const finalCloseBraces = (finalContent.match(/}/g) || []).length;

console.log(`After updates - Open braces: ${finalOpenBraces}, Close braces: ${finalCloseBraces}`);

if (finalOpenBraces !== finalCloseBraces) {
  console.log(`Warning: There's still a brace mismatch. Open: ${finalOpenBraces}, Close: ${finalCloseBraces}`);
} else {
  console.log('Braces are now balanced!');
}
