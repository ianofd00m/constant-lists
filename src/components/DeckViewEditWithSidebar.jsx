import React from 'react';
import DeckViewEdit from './DeckViewEdit';

// This is a wrapper component for DeckViewEdit that adds the deck layout structure
// based on the CSS classes found in App.css
function DeckViewEditWithSidebar() {
  return (
    <div className="deck-container">
      <div className="deck-layout">
        {/* Sidebar */}
        <div className="deck-sidebar">
          <img
            src="https://backs.scryfall.io/large/2/2/222b7a3b-2321-4d4c-af19-19338b134971.jpg?1677416389"
            alt="Card preview"
            style={{
              width: '100%',
              height: 'auto',
              marginBottom: '12px'
            }}
          />
          
          {/* Add CardGroupSortOptions here */}
          <CardGroupSortOptions 
            groupBy={groupBy}
            setGroupBy={setGroupBy}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        </div>
        
        {/* Main content area */}
        <div className="deck-main-content">
          <DeckViewEdit />
        </div>
      </div>
    </div>
  );
}

// This is the CardGroupSortOptions component
function CardGroupSortOptions({ groupBy, setGroupBy, sortBy, setSortBy }) {
  return (
    <div style={{ 
      background: '#fff', 
      borderRadius: '8px', 
      padding: '12px',
      marginBottom: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <h3 style={{ 
        fontSize: '14px', 
        margin: '0 0 4px 0',
        padding: '0 0 4px 0',
        borderBottom: '1px solid #eee',
        fontWeight: '600',
        color: '#333'
      }}>
        Display Options
      </h3>
      
      {/* Group By Dropdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label htmlFor="groupBy" style={{ fontSize: '12px', color: '#666' }}>Group by:</label>
        <select 
          id="groupBy" 
          value={groupBy} 
          onChange={(e) => setGroupBy(e.target.value)}
          style={{
            padding: '6px 8px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: '#f9f9f9'
          }}
        >
          <option value="type">Card Type</option>
          <option value="manaValue">Mana Value</option>
          <option value="colorIdentity">Color Identity</option>
          <option value="collectionStatus">Collection Status</option>
        </select>
      </div>
      
      {/* Sort By Dropdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label htmlFor="sortBy" style={{ fontSize: '12px', color: '#666' }}>Sort by:</label>
        <select 
          id="sortBy" 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: '6px 8px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: '#f9f9f9'
          }}
        >
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="price-asc">Price ($-$$$)</option>
          <option value="price-desc">Price ($$$-$)</option>
        </select>
      </div>
    </div>
  );
}

export default DeckViewEditWithSidebar;
