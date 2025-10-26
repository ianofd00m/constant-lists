// DeckViewEdit.jsx - React Component State Synchronization Fix
// Add this to the imports section of DeckViewEdit.jsx

import { useCallback, useEffect, useRef } from 'react';

/*
INTEGRATION INSTRUCTIONS FOR DECKEDIT.JSX:

1. Add these state management functions to your DeckViewEdit component
2. Replace existing search state management with these synchronized versions
3. Update the search input onChange handler
4. Update the search result click handlers
5. Add the defensive rendering function

STEP 1: Add these state variables to your component (after existing useState declarations)
*/

// Add this state for validation tracking
const [searchStateValidation, setSearchStateValidation] = useState({ 
  isValid: true, 
  lastCheck: 0,
  corruptionCount: 0 
});

// Add ref for synchronous state access
const searchStateRef = useRef({ 
  searchResults: [], 
  showDropdown: false, 
  search: "",
  isUpdating: false 
});

/*
STEP 2: Replace existing search state management functions with these enhanced versions
*/

// Enhanced state synchronization function
const synchronizeSearchState = useCallback((newSearch = "", newResults = [], newDropdownState = false, source = "manual") => {
  console.log('🔄 Synchronizing search state:', { 
    newSearch, 
    newResults: newResults.length, 
    newDropdownState,
    source 
  });
  
  // Prevent concurrent updates
  if (searchStateRef.current.isUpdating) {
    console.log('⚠️ State update already in progress, queuing...');
    setTimeout(() => synchronizeSearchState(newSearch, newResults, newDropdownState, source), 50);
    return;
  }
  
  searchStateRef.current.isUpdating = true;
  
  // Update ref immediately for synchronous access
  searchStateRef.current = {
    ...searchStateRef.current,
    searchResults: newResults,
    showDropdown: newDropdownState,
    search: newSearch
  };
  
  // Batch all state updates to prevent race conditions
  React.unstable_batchedUpdates(() => {
    setSearch(newSearch);
    setSearchResults(newResults);
    setShowDropdown(newDropdownState);
    setSelectedSearchIndex(-1);
    setNoResultsMsg("");
    
    // Update validation state
    setSearchStateValidation(prev => ({
      ...prev,
      isValid: true,
      lastCheck: Date.now()
    }));
  });
  
  // Release update lock
  setTimeout(() => {
    searchStateRef.current.isUpdating = false;
  }, 100);
  
  // Force a validation check after state updates
  setTimeout(() => {
    validateComponentSearchState();
  }, 150);
}, []);

// Component-level state validation function
const validateComponentSearchState = useCallback(() => {
  const currentTime = Date.now();
  
  // Don't validate too frequently
  if (currentTime - searchStateValidation.lastCheck < 2000) {
    return searchStateValidation;
  }
  
  const hasSearch = search.trim().length > 0;
  const hasResults = searchResults.length > 0;
  const dropdownShown = showDropdown;
  
  // Check for state corruption patterns
  const isCorrupted = (hasResults && !hasSearch && !dropdownShown) || 
                     (hasResults && !dropdownShown && !hasSearch) ||
                     (searchStateRef.current.search !== search) ||
                     (searchStateRef.current.searchResults.length !== searchResults.length);
  
  if (isCorrupted) {
    console.error('🚨 Component search state corruption detected:', {
      componentSearch: search,
      componentResults: searchResults.length,
      componentDropdown: showDropdown,
      refSearch: searchStateRef.current.search,
      refResults: searchStateRef.current.searchResults.length,
      refDropdown: searchStateRef.current.showDropdown,
      hasSearch,
      hasResults,
      dropdownShown
    });
    
    // Force state cleanup
    const cleanState = searchStateRef.current.search || search || "";
    synchronizeSearchState(cleanState, [], false, "corruption-fix");
    
    setSearchStateValidation(prev => ({
      isValid: false,
      lastCheck: currentTime,
      corruptionCount: prev.corruptionCount + 1
    }));
    
    return { isValid: false, isCorrupted: true };
  } else {
    setSearchStateValidation(prev => ({
      ...prev,
      isValid: true,
      lastCheck: currentTime
    }));
    
    return { isValid: true, isCorrupted: false };
  }
}, [search, searchResults, showDropdown, searchStateValidation.lastCheck, synchronizeSearchState]);

// Enhanced clear search function
const clearSearchState = useCallback((source = "manual") => {
  console.log('🧹 Clearing search state...', { source });
  synchronizeSearchState("", [], false, `clear-${source}`);
}, [synchronizeSearchState]);

/*
STEP 3: Replace your existing search input onChange handler with this enhanced version
*/

// Enhanced search input handler with state synchronization
const handleEnhancedSearchChange = useCallback(async (e) => {
  const query = e.target.value;
  console.log('🔍 Enhanced search query changed:', query);
  
  // Clear immediately if empty
  if (!query.trim()) {
    clearSearchState("empty-input");
    return;
  }
  
  // Update search state synchronously
  searchStateRef.current.search = query;
  setSearch(query);
  setShowDropdown(true);
  setSearchLoading(true);
  
  // Debounced search to prevent excessive API calls
  if (window.searchTimeout) {
    clearTimeout(window.searchTimeout);
  }
  
  window.searchTimeout = setTimeout(async () => {
    try {
      // Your existing search logic here - replace with your actual fetchSearchResults call
      console.log('🔍 Fetching search results for:', query);
      
      // Example - replace this with your actual search function
      const results = await fetchSearchResults(query);
      
      // Only update if query hasn't changed (prevent race conditions)
      if (searchStateRef.current.search === query) {
        synchronizeSearchState(query, results, true, "search-results");
      } else {
        console.log('🚫 Search query changed during fetch, discarding results');
      }
    } catch (error) {
      console.error('Search error:', error);
      if (searchStateRef.current.search === query) {
        setNoResultsMsg("Search failed. Please try again.");
        synchronizeSearchState(query, [], false, "search-error");
      }
    } finally {
      setSearchLoading(false);
    }
  }, 300); // 300ms debounce
}, [clearSearchState, synchronizeSearchState]);

/*
STEP 4: Replace your existing search result click handlers with this enhanced version
*/

// Enhanced card click handler with state validation
const handleEnhancedSearchCardClick = useCallback((card) => {
  console.log('🖱️ Enhanced search card clicked:', card.name);
  
  // Pre-click validation
  const preClickState = validateComponentSearchState();
  if (preClickState.isCorrupted) {
    console.warn('⚠️ Click on corrupted component state detected, fixing...');
    clearSearchState("pre-click-fix");
    return;
  }
  
  try {
    // Your existing handleAddCard logic here
    handleAddCard(card);
    
    // Clear state synchronously after successful add
    clearSearchState("successful-add");
    
    // Force validation after click
    setTimeout(() => {
      const postClickState = validateComponentSearchState();
      console.log('📊 Post-click component state:', {
        cardClicked: card.name,
        stateValid: postClickState.isValid,
        searchCleared: search === "",
        resultsCleared: searchResults.length === 0
      });
    }, 200);
  } catch (error) {
    console.error('Enhanced card click error:', error);
    // Still clear state on error
    clearSearchState("click-error");
  }
}, [handleAddCard, clearSearchState, validateComponentSearchState, search, searchResults.length]);

/*
STEP 5: Add these useEffect hooks for automatic state management
*/

// Periodic component state validation
useEffect(() => {
  const interval = setInterval(() => {
    validateComponentSearchState();
  }, 10000); // Every 10 seconds
  
  return () => clearInterval(interval);
}, [validateComponentSearchState]);

// Enhanced escape key handling
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && (showDropdown || searchResults.length > 0)) {
      e.preventDefault();
      e.stopPropagation();
      clearSearchState("escape-key");
    }
  };
  
  document.addEventListener('keydown', handleKeyDown, true);
  return () => document.removeEventListener('keydown', handleKeyDown, true);
}, [showDropdown, searchResults.length, clearSearchState]);

// Enhanced click outside handling
useEffect(() => {
  const handleClickOutside = (e) => {
    const searchContainer = e.target.closest('[data-search-container]');
    if (!searchContainer && (showDropdown || searchResults.length > 0)) {
      clearSearchState("click-outside");
    }
  };
  
  document.addEventListener('click', handleClickOutside, true);
  return () => document.removeEventListener('click', handleClickOutside, true);
}, [showDropdown, searchResults.length, clearSearchState]);

// Sync ref with state changes
useEffect(() => {
  searchStateRef.current = {
    ...searchStateRef.current,
    search,
    searchResults,
    showDropdown
  };
}, [search, searchResults, showDropdown]);

/*
STEP 6: Replace your search results rendering with this defensive version
*/

// Defensive rendering guard for search results
const renderEnhancedSearchResults = () => {
  // Don't render if state validation failed
  if (!searchStateValidation.isValid) {
    console.log('🚫 Skipping search results render - invalid state');
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
  
  // Additional safety check for ref sync
  if (searchStateRef.current.search !== search || 
      searchStateRef.current.searchResults.length !== searchResults.length) {
    console.warn('🚫 State desync detected, skipping render');
    return null;
  }
  
  console.log('🔍 Rendering search results:', {
    search: search,
    resultsCount: searchResults.length,
    showDropdown: showDropdown
  });
  
  return (
    <div 
      data-search-dropdown 
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        backgroundColor: "white",
        border: "1px solid #ddd",
        borderTop: "none",
        borderRadius: "0 0 4px 4px",
        maxHeight: "200px",
        overflowY: "auto",
        zIndex: 1000,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}
    >
      {searchLoading ? (
        <div style={{ padding: "8px", textAlign: "center", color: "#666" }}>
          Loading...
        </div>
      ) : searchResults.length > 0 ? (
        searchResults.map((card, index) => (
          <div
            key={`${card.id || card.scryfall_id}-${index}`}
            onClick={() => handleEnhancedSearchCardClick(card)}
            style={{
              padding: "6px 8px",
              cursor: "pointer",
              borderBottom: index < searchResults.length - 1 ? "1px solid #eee" : "none",
              backgroundColor: selectedSearchIndex === index ? "#f0f7ff" : "transparent",
              transition: "background-color 0.1s ease"
            }}
            onMouseEnter={() => setSelectedSearchIndex(index)}
            onMouseLeave={() => setSelectedSearchIndex(-1)}
          >
            <div style={{ 
              fontWeight: selectedSearchIndex === index ? "600" : "500", 
              fontSize: "12px",
              color: selectedSearchIndex === index ? "#1976d2" : "#333"
            }}>
              {card.name}
            </div>
          </div>
        ))
      ) : noResultsMsg ? (
        <div style={{
          padding: "6px 8px",
          textAlign: "center",
          color: "#666",
          fontSize: "12px",
        }}>
          {noResultsMsg}
        </div>
      ) : null}
    </div>
  );
};

/*
STEP 7: Update your JSX to use the enhanced components

Replace your search input with:
<input
  type="text"
  value={search}
  onChange={handleEnhancedSearchChange}
  // ... other props
/>

Replace your search container with:
<div data-search-container style={{ position: "relative" }}>
  <input ... />
  {renderEnhancedSearchResults()}
</div>

STEP 8: Expose debugging functions for this component

Add this to your component (after the other functions):
*/

// Component debugging interface
useEffect(() => {
  window.debugComponentState = () => {
    const state = validateComponentSearchState();
    console.log('🔍 Component state debug:', {
      search,
      searchResults: searchResults.length,
      showDropdown,
      searchStateRef: searchStateRef.current,
      validation: searchStateValidation,
      currentState: state
    });
    return { search, searchResults, showDropdown, searchStateRef: searchStateRef.current, validation: searchStateValidation };
  };
  
  window.forceComponentSync = () => {
    console.log('🔧 Forcing component state sync...');
    return clearSearchState("manual-force");
  };
  
  return () => {
    delete window.debugComponentState;
    delete window.forceComponentSync;
  };
}, [search, searchResults, showDropdown, searchStateValidation, clearSearchState, validateComponentSearchState]);

export { 
  synchronizeSearchState, 
  clearSearchState, 
  handleEnhancedSearchChange, 
  handleEnhancedSearchCardClick, 
  renderEnhancedSearchResults 
};
