import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to search for components
const componentsDir = path.join(__dirname, 'src', 'components');

// Read all JSX files in the components directory
fs.readdir(componentsDir, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }
  
  const jsxFiles = files.filter(file => file.endsWith('.jsx'));
  
  jsxFiles.forEach(file => {
    const filePath = path.join(componentsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for deck layout related elements
    const hasLayout = content.includes('deck-layout');
    const hasSidebar = content.includes('deck-sidebar');
    const hasMainContent = content.includes('deck-main-content');
    const hasCardTypeGrid = content.includes('card-type-grid');
    
    if (hasLayout || hasSidebar || hasMainContent || hasCardTypeGrid) {
      console.log(`\n=== ${file} ===`);
      if (hasLayout) {
        console.log('✅ Contains deck-layout');
        showContext(content, 'deck-layout');
      }
      if (hasSidebar) {
        console.log('✅ Contains deck-sidebar');
        showContext(content, 'deck-sidebar');
      }
      if (hasMainContent) {
        console.log('✅ Contains deck-main-content');
        showContext(content, 'deck-main-content');
      }
      if (hasCardTypeGrid) {
        console.log('✅ Contains card-type-grid');
        showContext(content, 'card-type-grid');
      }
    }
  });
});

function showContext(content, searchTerm) {
  const index = content.indexOf(searchTerm);
  if (index !== -1) {
    const start = Math.max(0, index - 100);
    const end = Math.min(content.length, index + 100);
    console.log('Context:');
    console.log(content.substring(start, end));
    console.log('---');
  }
}
