// React Component Level Fix for Search Dropdown State Corruption
// This fix should be integrated into DeckViewEdit.jsx to prevent the root cause

/*
ROOT CAUSE ANALYSIS:
1. React state updates are asynchronous and not atomic
2. setSearchResults([]) and setShowDropdown(false) can execute out of order
3. DOM elements persist when showDropdown is false but searchResults is not empty
4. Event handlers become detached from current React state
5. Race conditions occur with rapid user interactions

SOLUTION:
1. Synchronize state updates using useCallback and useEffect
2. Add defensive rendering guards
3. Implement state validation
4. Force cleanup on state inconsistencies
*/

// Add this to DeckViewEdit.jsx imports
import { useCallback, useEffect, useRef } from 'react';

// Add these state variables to the DeckViewEdit component
const [stateValidation, setStateValidation] = useState({ isValid: true, lastCheck: 0 });
const searchStateRef = useRef({ searchResults: [], showDropdown: false, search: "" });

// Enhanced state synchronization function
const synchronizeSearchState = useCallback((newSearch = "", newResults = [], newDropdownState = false) => {
  console.log('🔄 Synchronizing search state:', { newSearch, newResults: newResults.length, newDropdownState });
  
  // Update ref immediately for synchronous access
  searchStateRef.current = {
    searchResults: newResults,
    showDropdown: newDropdownState,
    search: newSearch
  };
  
  // Batch state updates to prevent race conditions
  React.unstable_batchedUpdates(() => {
    setSearch(newSearch);
    setSearchResults(newResults);
    setShowDropdown(newDropdownState);
    setSelectedSearchIndex(-1);
    
    // Update validation state
    setStateValidation({
      isValid: true,
      lastCheck: Date.now()
    });
  });
  
  // Force a validation check after state updates
  setTimeout(() => {
    validateSearchState();
  }, 100);
}, []);

// State validation function
const validateSearchState = useCallback(() => {
  const currentTime = Date.now();
  
  // Don't validate too frequently
  if (currentTime - stateValidation.lastCheck < 1000) {
    return;
  }
  
  const hasSearch = search.trim().length > 0;
  const hasResults = searchResults.length > 0;
  const dropdownShown = showDropdown;
  
  // Check for state corruption patterns
  const isCorrupted = (hasResults && !hasSearch && !dropdownShown) || 
                     (hasResults && !dropdownShown && !hasSearch);
  
  if (isCorrupted) {
    console.error('🚨 Search state corruption detected:', {
      search: search,
      searchResults: searchResults.length,
      showDropdown: showDropdown,
      hasSearch,
      hasResults,
      dropdownShown
    });
    
    // Force state cleanup
    synchronizeSearchState("", [], false);
    
    setStateValidation({
      isValid: false,
      lastCheck: currentTime
    });
  } else {
    setStateValidation(prev => ({
      ...prev,
      isValid: true,
      lastCheck: currentTime
    }));
  }
}, [search, searchResults, showDropdown, stateValidation.lastCheck, synchronizeSearchState]);

// Enhanced clear search function
const clearSearchState = useCallback(() => {
  console.log('🧹 Clearing search state...');
  synchronizeSearchState("", [], false);
}, [synchronizeSearchState]);

// Enhanced search input handler
const handleSearchChange = useCallback(async (e) => {
  const query = e.target.value;
  console.log('🔍 Search query changed:', query);
  
  // Clear immediately if empty
  if (!query.trim()) {
    clearSearchState();
    return;
  }
  
  // Update search state
  setSearch(query);
  searchStateRef.current.search = query;
  
  // Show dropdown and set loading
  setShowDropdown(true);
  setSearchLoading(true);
  
  try {
    // Your existing search logic here...
    const results = await fetchSearchResults(query);
    
    // Only update if query hasn't changed
    if (searchStateRef.current.search === query) {
      synchronizeSearchState(query, results, true);
    }
  } catch (error) {
    console.error('Search error:', error);
    if (searchStateRef.current.search === query) {
      synchronizeSearchState(query, [], false);
    }
  } finally {
    setSearchLoading(false);
  }
}, [clearSearchState, synchronizeSearchState]);

// Enhanced card click handler
const handleSearchCardClick = useCallback((card) => {
  console.log('🖱️ Search card clicked:', card.name);
  
  try {
    // Add card logic here...
    handleAddCard(card);
    
    // Clear state synchronously
    clearSearchState();
    
    // Force validation
    setTimeout(validateSearchState, 200);
  } catch (error) {
    console.error('Card click error:', error);
    // Still clear state on error
    clearSearchState();
  }
}, [handleAddCard, clearSearchState, validateSearchState]);

// Periodic state validation
useEffect(() => {
  const interval = setInterval(validateSearchState, 5000);
  return () => clearInterval(interval);
}, [validateSearchState]);

// Handle escape key
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && (showDropdown || searchResults.length > 0)) {
      e.preventDefault();
      clearSearchState();
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [showDropdown, searchResults.length, clearSearchState]);

// Handle click outside
useEffect(() => {
  const handleClickOutside = (e) => {
    const searchContainer = document.querySelector('[data-search-container]');
    if (searchContainer && !searchContainer.contains(e.target)) {
      if (showDropdown || searchResults.length > 0) {
        clearSearchState();
      }
    }
  };
  
  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
}, [showDropdown, searchResults.length, clearSearchState]);

// Defensive rendering guard for search results
const renderSearchResults = () => {
  // Don't render if state is invalid
  if (!stateValidation.isValid) {
    return null;
  }
  
  // Don't render results if dropdown is not shown
  if (!showDropdown) {
    return null;
  }
  
  // Don't render if no search query and no results
  if (!search.trim() && searchResults.length === 0) {
    return null;
  }
  
  // Your existing search results rendering logic here...
  return (
    <div data-search-dropdown>
      {searchResults.map((card, index) => (
        <div
          key={`${card.id}-${index}`}
          onClick={() => handleSearchCardClick(card)}
          style={{ cursor: 'pointer' }}
        >
          {card.name}
        </div>
      ))}
    </div>
  );
};

/*
INTEGRATION INSTRUCTIONS:

1. Add the imports to DeckViewEdit.jsx
2. Add the state variables and functions above to the component
3. Replace the existing search input onChange with handleSearchChange
4. Replace the existing search result click handlers with handleSearchCardClick
5. Replace the search results rendering section with renderSearchResults()
6. Add data-search-container attribute to the search container div
7. Update any other places that call setSearch, setSearchResults, or setShowDropdown to use synchronizeSearchState instead

Example integration:

// In the search input:
<input
  type="text"
  value={search}
  onChange={handleSearchChange}
  // ... other props
/>

// In the search container:
<div data-search-container>
  <input ... />
  {renderSearchResults()}
</div>

This fix addresses the root cause by:
1. Synchronizing all search state updates
2. Adding validation to detect corruption
3. Implementing defensive rendering
4. Handling edge cases and race conditions
5. Providing automatic cleanup on corruption detection
*/
