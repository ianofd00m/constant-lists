import React from 'react';

function CardGroupSortOptions({ groupBy, setGroupBy, sortBy, setSortBy, viewMode, setViewMode, hidePrices, setHidePrices, showMana, setShowMana }) {
  return (
    <div style={{ 
      background: '#fff', 
      borderRadius: '8px', 
      padding: '0 12px',
      marginBottom: '0',
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
            backgroundColor: '#f9f9f9',
            marginBottom: '12px'
          }}
        >
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="price-asc">Price ($-$$$)</option>
          <option value="price-desc">Price ($$$-$)</option>
        </select>
      </div>
      
      {/* View Mode Toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '12px', color: '#666' }}>View:</label>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={() => setViewMode('list')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: viewMode === 'list' ? '#1976d2' : '#f9f9f9',
              color: viewMode === 'list' ? 'white' : '#333',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            📋 List
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: viewMode === 'grid' ? '#1976d2' : '#f9f9f9',
              color: viewMode === 'grid' ? 'white' : '#333',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            🖼️ Grid
          </button>
        </div>
      </div>
      
      {/* Display toggle buttons */}
      {hidePrices !== undefined && setHidePrices && showMana !== undefined && setShowMana && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Price display toggle */}
          <button 
            onClick={() => setHidePrices(!hidePrices)}
            className={`toggle-button ${!hidePrices ? 'active' : 'inactive'}`}
          >
            {hidePrices ? 'Show Prices' : 'Hide Prices'}
          </button>
          
          {/* Mana display toggle */}
          <button 
            onClick={() => setShowMana(!showMana)}
            className={`toggle-button ${showMana ? 'active' : 'inactive'}`}
          >
            {showMana ? 'Hide Mana' : 'Show Mana'}
          </button>
        </div>
      )}
    </div>
  );
}

export default CardGroupSortOptions;
