import React, { useEffect, useState } from 'react';
import CardGroupSortOptions from './CardGroupSortOptions';

// This component will be a simple wrapper for the CardGroupSortOptions component
// It can be placed anywhere in the DeckViewEdit.jsx file after the imports
function DeckSortOptionsPanel({ groupBy, setGroupBy, sortBy, setSortBy }) {
  return (
    <div className="deck-sort-options-panel">
      <CardGroupSortOptions 
        groupBy={groupBy} 
        setGroupBy={setGroupBy} 
        sortBy={sortBy} 
        setSortBy={setSortBy}
      />
    </div>
  );
}

export default DeckSortOptionsPanel;
