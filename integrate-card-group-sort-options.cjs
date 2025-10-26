// integrate-card-group-sort-options.cjs
// This script adds the CardGroupSortOptions component to the DeckViewEdit.jsx file

const fs = require('fs');
const path = require('path');

const deckViewEditPath = path.join(__dirname, 'src', 'components', 'DeckViewEdit.jsx');
let content = fs.readFileSync(deckViewEditPath, 'utf8');

// Check if CardGroupSortOptions is already imported
if (!content.includes('import CardGroupSortOptions from')) {
  // Add import statement for CardGroupSortOptions
  content = content.replace(
    "import CardTypeHeader from './CardTypeHeader';",
    "import CardTypeHeader from './CardTypeHeader';\nimport CardGroupSortOptions from './CardGroupSortOptions';"
  );
  
  console.log('✅ Added import for CardGroupSortOptions');
}

// Check if CardGroupSortOptions is already used in the component
if (!content.includes('<CardGroupSortOptions')) {
  // Find where the fixedPreview is updated (and a card preview might be rendered)
  const fixedPreviewIndex = content.indexOf('setFixedPreview({');
  if (fixedPreviewIndex !== -1) {
    // Let's find where we might render this fixed preview
    const mainReturnIndex = content.indexOf('return (', content.lastIndexOf('debouncedSearch.cancel'));
    
    if (mainReturnIndex !== -1) {
      // Insert the component right after the loading and not found checks
      const deckNotFoundIndex = content.indexOf('return <div className="container">Deck not found.</div>', mainReturnIndex);
      
      if (deckNotFoundIndex !== -1) {
        const insertIndex = content.indexOf('}\n\n', deckNotFoundIndex);
        
        if (insertIndex !== -1) {
          // Insert component after the if(!deck) check
          const newContent = content.slice(0, insertIndex + 3) + `
  // Render the main component with deck layout and sidebar
  return (
    <div className="deck-container">
      <div className="deck-layout">
        {/* Sidebar with card preview and display options */}
        <div className="deck-sidebar">
          {/* Card preview image */}
          <div style={{ marginBottom: '12px' }}>
            <img 
              src={fixedPreview.image} 
              alt={fixedPreview.name || 'Card preview'} 
              style={{ width: '100%', height: 'auto', borderRadius: '4.75%' }}
            />
          </div>
          
          {/* Card grouping and sorting options */}
          <CardGroupSortOptions 
            groupBy={groupBy}
            setGroupBy={setGroupBy}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        </div>
        
        {/* Main content area with card type sections */}
        <div className="deck-main-content">
          {/* Deck name */}
          <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>
            {deck.name || 'Untitled Deck'}
          </h2>
          
          {/* Card grid with grouped card sections */}
          <div className="card-type-grid">
            {groupedCards.map(group => (
              <div key={group.type} className="card-type-container">
                <CardTypeHeader type={group.type} count={group.cards.length} />
                {group.cards.map((card, index) => {
                  const name = card.card?.name || card.name || '';
                  const printing = card.printing || '';
                  
                  // Count occurrences of this card (for quantity display)
                  const count = group.cards.filter(c => 
                    (c.card?.name || c.name) === name && 
                    (c.printing || '') === printing
                  ).length;
                  
                  // Only render each unique card name+printing once with a count
                  const isFirstOccurrence = group.cards.findIndex(c => 
                    (c.card?.name || c.name) === name && 
                    (c.printing || '') === printing
                  ) === index;
                  
                  if (!isFirstOccurrence) return null;
                  
                  return (
                    <div key={name+printing+index} className="card-list-item">
                      <span className="card-quantity">{count}x</span>
                      <span 
                        className="card-name"
                        onClick={() => {
                          // Code to handle clicking on a card name
                          // (e.g., show card details, update preview)
                        }}
                      >
                        {name}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );` + content.slice(insertIndex + 3);
          
          // Write the updated content back to the file
          fs.writeFileSync(deckViewEditPath, newContent, 'utf8');
          console.log('✅ Added CardGroupSortOptions component to DeckViewEdit.jsx');
        } else {
          console.error('❌ Could not find insertion point after deck not found check');
        }
      } else {
        console.error('❌ Could not find "return <div className="container">Deck not found.</div>"');
      }
    } else {
      console.error('❌ Could not find main return statement');
    }
  } else {
    console.error('❌ Could not find fixedPreview update');
  }
} else {
  console.log('✅ CardGroupSortOptions component is already used in DeckViewEdit.jsx');
}
