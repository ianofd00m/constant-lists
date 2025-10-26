// add-group-sort-options-to-ui.cjs
// This script adds the CardGroupSortOptions component to the UI in the sidebar

const fs = require('fs');
const path = require('path');

// Path to the DeckViewEdit.jsx file
const deckViewEditPath = path.join(__dirname, 'src', 'components', 'DeckViewEdit.jsx');

// Read the file content
let content = fs.readFileSync(deckViewEditPath, 'utf8');

// Check if the CardGroupSortOptions component is already used in the UI
if (content.includes('<CardGroupSortOptions')) {
  console.log('✅ CardGroupSortOptions component is already used in the UI');
  process.exit(0);
}

// Find the main return statement (after the last return () => {...} for cleanup functions)
const mainReturnIndex = content.indexOf('return (', content.lastIndexOf('debouncedSearch.cancel'));
if (mainReturnIndex === -1) {
  console.error('❌ Could not find the main return statement in the component');
  process.exit(1);
}

// Find where the sidebar might be rendered
let sidebarIndicators = [
  { string: '<div className="deck-sidebar">', indent: 6 },
  { string: '<div className="sidebar">', indent: 6 },
  { string: '<aside className="sidebar">', indent: 6 },
  { string: '<aside className="deck-sidebar">', indent: 6 }
];

let sidebarMatch = null;
for (const indicator of sidebarIndicators) {
  const index = content.indexOf(indicator.string, mainReturnIndex);
  if (index !== -1) {
    sidebarMatch = { index, indicator };
    break;
  }
}

if (!sidebarMatch) {
  console.error('❌ Could not find the sidebar in the component');
  console.log('Creating a new sidebar section to add the CardGroupSortOptions component...');
  
  // Let's find a good place to insert a sidebar with the CardGroupSortOptions component
  // This could be after the deck name heading, or before the card type sections
  // For now, let's look for where the grouped cards are rendered
  const cardTypeContainerIndex = content.indexOf('card-type-container', mainReturnIndex);
  if (cardTypeContainerIndex !== -1) {
    // Find the opening <div> of the main content
    const mainContentStart = content.lastIndexOf('<div', cardTypeContainerIndex);
    if (mainContentStart !== -1) {
      // Add the sidebar with CardGroupSortOptions just before the main content
      const beforeMainContent = content.slice(0, mainContentStart);
      const afterMainContent = content.slice(mainContentStart);
      
      // Create the new sidebar with the CardGroupSortOptions component
      const newSidebar = `
        {/* Sidebar with CardGroupSortOptions */}
        <div className="deck-sidebar">
          <CardGroupSortOptions 
            groupBy={groupBy} 
            setGroupBy={setGroupBy} 
            sortBy={sortBy} 
            setSortBy={setSortBy}
          />
        </div>
        
      `;
      
      content = beforeMainContent + newSidebar + afterMainContent;
      
      // Write the updated content back to the file
      fs.writeFileSync(deckViewEditPath, content, 'utf8');
      console.log('✅ Added a new sidebar with CardGroupSortOptions component to the UI');
      process.exit(0);
    }
  }
  
  console.error('❌ Could not find a good place to insert the sidebar with CardGroupSortOptions');
  process.exit(1);
}

// Find where to insert the CardGroupSortOptions component in the sidebar
// Ideally, we want to add it after the card preview image
const sidebarStart = sidebarMatch.index;
const sidebarEnd = content.indexOf('</div>', sidebarStart);
if (sidebarEnd === -1) {
  console.error('❌ Could not find the end of the sidebar');
  process.exit(1);
}

// Look for potential places in the sidebar to add the component
const sidebarContent = content.slice(sidebarStart, sidebarEnd);
const afterImageIndex = sidebarContent.indexOf('</img>') !== -1 
  ? sidebarContent.indexOf('</img>') + 6 
  : (sidebarContent.indexOf('/>') !== -1 
    ? sidebarContent.indexOf('/>') + 2 
    : -1);

let insertIndex;
if (afterImageIndex !== -1) {
  // Insert after the image tag
  insertIndex = sidebarStart + afterImageIndex;
} else {
  // Insert at the end of the sidebar content, before the closing div
  insertIndex = sidebarEnd;
}

// Create the component JSX to insert
const indent = ' '.repeat(sidebarMatch.indicator.indent + 2);
const componentToInsert = `
${indent}<CardGroupSortOptions 
${indent}  groupBy={groupBy} 
${indent}  setGroupBy={setGroupBy} 
${indent}  sortBy={sortBy} 
${indent}  setSortBy={setSortBy}
${indent}/>
`;

// Insert the component at the calculated position
content = content.slice(0, insertIndex) + componentToInsert + content.slice(insertIndex);

// Write the updated content back to the file
fs.writeFileSync(deckViewEditPath, content, 'utf8');
console.log('✅ Added CardGroupSortOptions component to the UI sidebar');
