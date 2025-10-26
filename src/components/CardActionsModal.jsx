import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import './CardActionsModal.css';
import './CardActionsModalOverlay.css'; // Import direct overlay CSS
import PrintingPreferences from '../utils/PrintingPreferences';
import PrintingCache from '../utils/PrintingCache';
import OracleTagsIntegration from './OracleTagsIntegration';
import { getUnifiedCardPrice, formatPrice } from '../utils/UnifiedPricing';
// import OtagIntegration from './OtagIntegration'; // Temporarily commented out to debug

// Basic land preferred printings (consistent with DeckViewEdit)
const BASIC_LAND_PRINTINGS = {
  // Regular basic lands (using specific FDN collector numbers as requested)
  "Forest": "d232fcc2-12f6-401a-b1aa-ddff11cb9378",      // FDN Forest #280
  "Island": "23635e40-d040-40b7-8b98-90ed362aa028",      // FDN Island #275
  "Mountain": "1edc5050-69bd-416d-b04c-7f82de2a1901",    // FDN Mountain #279
  "Plains": "4ef17ed4-a9b5-4b8e-b4cb-2ecb7e5898c3",     // FDN Plains #272
  "Swamp": "13505c15-14e0-4200-82bd-fb9bce949e68",      // FDN Swamp #277
  "Wastes": "60682c00-c661-4a9d-8326-f3f014a04e3e",     // OGW Wastes #184a
  
  // Snow-covered basic lands - using CSP printings (except Wastes which is MH3)
  "Snow-Covered Forest": "838c915d-8153-43c2-b513-dfbe4e9388a5",   // CSP Snow-Covered Forest #155
  "Snow-Covered Island": "6abf0692-07d1-4b72-af06-93d0e338589d",   // CSP Snow-Covered Island #152
  "Snow-Covered Mountain": "0dc9a6d1-a1ca-4b8f-894d-71c2a9933f79", // CSP Snow-Covered Mountain #154
  "Snow-Covered Plains": "b1e3a010-dae3-41b6-8dd8-e31d14c3ac4a",   // CSP Snow-Covered Plains #151
  "Snow-Covered Swamp": "c4dacaf1-09b8-42bb-8064-990190fdaf81",    // CSP Snow-Covered Swamp #153
  "Snow-Covered Wastes": "ad21a874-525e-4d11-bd8e-bc44918bec40",   // MH3 Snow-Covered Wastes #309
  
  // Alternative basic land names (for older printings or special sets)
  "Basic Forest": "d232fcc2-12f6-401a-b1aa-ddff11cb9378",
  "Basic Island": "ff0ba1cf-1b05-403e-8b5e-4bbe3cfa8a89",
  "Basic Mountain": "b34bb2dc-c1af-4d77-b0b3-a0fb342a5fc6", 
  "Basic Plains": "8e592a1e-b5e1-497a-863d-9772d25d3b3f",
  "Basic Swamp": "6b28e7a6-e0ed-4c45-85dd-7c1bbfe6b3e5"
};

const CardActionsModal = ({ isOpen, onClose, card, onUpdateCard, onRemoveCard, onMoveToSideboard, onMoveToTechIdeas, onAddToCollection, updatingPrinting, cardPrice, onPreviewUpdate, onOracleTagSearch, onNavigateToPrevious, onNavigateToNext }) => {
  const modalRef = useRef(null); // Add ref for OTAG integration
  const cardActionsRef = useRef(null); // Add ref for left-hand side scrolling
  const [printings, setPrintings] = useState([]);
  const [allPrintings, setAllPrintings] = useState([]); // Store all printings
  const [visiblePrintings, setVisiblePrintings] = useState(20); // Number of printings to show
  const [loading, setLoading] = useState(false);
  const [selectedPrinting, setSelectedPrinting] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isFoil, setIsFoil] = useState(false);
  const [isFoilOnly, setIsFoilOnly] = useState(false);
  const [isNonFoilOnly, setIsNonFoilOnly] = useState(false);
  const [userIsToggling, setUserIsToggling] = useState(false); // Flag to prevent useEffect conflicts
  const [collectionVersion, setCollectionVersion] = useState(0);
  const [priceUpdateTrigger, setPriceUpdateTrigger] = useState(0); // Force price display updates
  const PLACEHOLDER_IMG = 'https://via.placeholder.com/120x170?text=No+Image';
  
  // INSTANT LOADING: Replace component-level cache with global cache usage
  // Remove local cache state and directly use global PrintingCache
  const [lastCardName, setLastCardName] = useState(null);

  // Calculate current price using unified pricing utility - ALWAYS synced with deck list
  const getCurrentPrice = useCallback(() => {
    if (!selectedPrinting) {
      return null;
    }
    
    // Create a mock card object with foil status for the unified pricing function
    const mockCardData = {
      ...selectedPrinting,
      scryfall_json: selectedPrinting,
      foil: isFoil // Use current foil toggle state
    };
    
    const result = getUnifiedCardPrice(mockCardData, {
      preferStoredPrice: false, // Don't prefer stored prices in modal - use live Scryfall data
      fallbackPrice: null,
      debugLogging: false
    });
    
    return result.price;
  }, [selectedPrinting, isFoil]);

  // Get the current price that should be displayed everywhere (header, deck list, etc.)
  const getCurrentModalPrice = useCallback(() => {
    const price = getCurrentPrice();
    
    // CRITICAL: Also check if the current card's stored modal price should override
    // This ensures consistency when the modal is opened with pre-existing pricing
    if (card && price !== null) {
      // Always prefer the freshly calculated price from current printing/foil selection
      return price;
    }
    
    // Fallback to card's existing modal price only if no fresh calculation available
    if (card && card.modalPrice) {
      return card.modalPrice;
    }
    
    return price;
  }, [getCurrentPrice, card]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store the current scroll position
      const scrollY = window.scrollY;
      
      // Prevent scrolling on the body
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore scrolling
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        // Restore the scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Only handle arrow keys if we have navigation functions
      if (!onNavigateToPrevious || !onNavigateToNext) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          e.stopPropagation();
          onNavigateToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          e.stopPropagation();
          onNavigateToNext();
          break;
        default:
          // Let other keys pass through (Escape, etc.)
          break;
      }
    };

    // Add event listener when modal is open
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      // Remove event listener when modal closes
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onNavigateToPrevious, onNavigateToNext]);

  // Helper function to calculate price from printing data using unified pricing utility
  const calculatePriceFromPrinting = useCallback((printing, isCardFoil, cardName) => {
    if (!printing) {
      return null;
    }
    
    // Create a mock card object for the unified pricing function
    const mockCardData = {
      scryfall_json: printing,
      foil: isCardFoil,
      name: cardName
    };
    
    const result = getUnifiedCardPrice(mockCardData, {
      preferStoredPrice: false, // Use live Scryfall data
      fallbackPrice: null,
      debugLogging: false
    });
    
    return result.price;
  }, []);

  // INSTANT LOADING: Optimized fetchPrintings with global cache and immediate display
  const fetchPrintings = useCallback(async (cardObj) => {
    if (!cardObj) return;
    
    // Extract card name first for caching
    const scryfallData = cardObj.cardObj?.card?.scryfall_json || cardObj.cardObj?.scryfall_json || cardObj.scryfall_json || {};
    let cardName = null;
    
    // Try all possible paths for card name
    if (cardObj.cardObj?.card?.name) {
      cardName = cardObj.cardObj.card.name;
    } else if (cardObj.cardObj?.name) {
      cardName = cardObj.cardObj.name;
    } else if (cardObj.name) {
      cardName = cardObj.name;
    } else if (scryfallData.name) {
      cardName = scryfallData.name;
    }
    
    if (!cardName) {
      console.error('[CardActionsModal] Failed to extract card name for printing search');
      alert('Could not find card name information. Please try a different card or refresh the page.');
      return;
    }
    
    // INSTANT LOADING: Check global cache first for immediate display
    const cachedData = PrintingCache.get(cardName);
    if (cachedData) {
      // console.log(`[CardActionsModal] ⚡ INSTANT LOAD from cache for ${cardName} - ${cachedData.printings?.length || 0} printings cached`);
      
      // ENHANCED CACHE VALIDATION: Check if cached data is complete and reliable
      let shouldRefreshCache = false;
      let refreshReason = '';
      
      // Check 1: Basic data integrity
      if (!cachedData.printings || cachedData.printings.length <= 1) {
        shouldRefreshCache = true;
        refreshReason = `incomplete printing count (${cachedData.printings?.length || 0} printings)`;
      }
      
      // Check 2: Data freshness - cache older than 1 hour should be refreshed for reliability
      const cacheAge = cachedData.timestamp ? Date.now() - cachedData.timestamp : Infinity;
      const maxCacheAge = 60 * 60 * 1000; // 1 hour in milliseconds
      if (cacheAge > maxCacheAge) {
        shouldRefreshCache = true;
        refreshReason = `cache too old (${Math.round(cacheAge / (60 * 1000))} minutes)`;
      }
      
      // Check 3: Corrupted data structure
      if (cachedData.printings && (!Array.isArray(cachedData.printings) || cachedData.printings.some(p => !p || !p.id))) {
        shouldRefreshCache = true;
        refreshReason = 'corrupted data structure';
      }
      
      // Check 4: Missing essential printing data
      if (cachedData.printings && cachedData.printings.length > 0) {
        const hasValidPrintings = cachedData.printings.every(p => 
          p && p.id && p.set && p.collector_number && (p.image_uris || p.card_faces)
        );
        if (!hasValidPrintings) {
          shouldRefreshCache = true;
          refreshReason = 'incomplete printing data';
        }
      }
      
      if (shouldRefreshCache) {
        // console.log(`[CardActionsModal] 🔄 Refreshing cache for ${cardName} - ${refreshReason}`);
        PrintingCache.remove(cardName);
        // Fall through to fresh fetch
      } else {
        // console.log(`[CardActionsModal] ✅ Using cached data with ${cachedData.printings.length} printings`);
      
        // 🎯 CHECK USER PREFERENCE EVEN WITH CACHED DATA
        const userPreference = PrintingPreferences.get(cardName);
        let selectedPrintingToUse = cachedData.selectedPrinting;
        let shouldUseCachedData = true;
        
        if (userPreference && userPreference.id) {
          // Check if cached selectedPrinting matches user preference
          if (cachedData.selectedPrinting.id === userPreference.id) {
            // console.log(`[CardActionsModal] ✅ Cached data matches user preference: ${userPreference.set?.toUpperCase()} #${userPreference.collector_number}`);
          } else {
            // Try to find user's preferred printing in cached printings
            const preferredPrinting = cachedData.printings.find(p => p.id === userPreference.id);
            if (preferredPrinting) {
              selectedPrintingToUse = preferredPrinting;
              // console.log(`[CardActionsModal] 🎯 Found user preference in cache, switching to: ${userPreference.set?.toUpperCase()} #${userPreference.collector_number}`);
            } else {
              console.log(`[CardActionsModal] ❌ User preference ${userPreference.id} not found in cached printings, forcing fresh fetch`);
              // User's preferred printing not in cache - need fresh data
              PrintingCache.remove(cardName);
              shouldUseCachedData = false;
            }
          }
        } else {
          // console.log(`[CardActionsModal] 📋 No user preference for ${cardName}, using cached data as-is`);
        }
        
        // Only use cache if we have the right printing or found user preference in cache
        if (shouldUseCachedData) {
        
        // Set data immediately - show first 20 printings initially for performance
        const initialVisible = Math.min(cachedData.printings.length, 20);
        setPrintings(cachedData.printings.slice(0, initialVisible));
        setAllPrintings(cachedData.printings);
        setVisiblePrintings(initialVisible);
        setSelectedPrinting(selectedPrintingToUse);
        setLastCardName(cardName);
        
        // IMMEDIATE PREVIEW SYNC: Update preview when using cached data
        if (onPreviewUpdate && card && selectedPrintingToUse) {
          const previewUpdateData = {
            ...card,
            printing: selectedPrintingToUse.id,
            scryfall_json: selectedPrintingToUse,
            image_uris: selectedPrintingToUse.image_uris,
            foil: isFoil
          };
          // console.log('[CardActionsModal] Cached data - syncing preview to:', selectedPrintingToUse.id, selectedPrintingToUse.name);
          onPreviewUpdate(previewUpdateData);
        }
        
        // Update card with cached printing data immediately for price sync
        if (onUpdateCard && selectedPrintingToUse) {
          const currentPrice = calculatePriceFromPrinting(selectedPrintingToUse, isFoil, cardName);
          onUpdateCard(cardObj, {
            scryfall_json: selectedPrintingToUse,
            printing: selectedPrintingToUse.id,
            modalPrice: currentPrice,
            freshPriceDataOnly: true
          });
        }
        
        // PERFORMANCE BOOST: If cached data has fewer than expected printings, fetch more in background
        // TEMPORARILY DISABLED: This logic was interfering with normal single-printing cases
        // Some cards legitimately have only one printing, and this was causing issues
        const shouldRefetch = false; // cachedData.printings.length === 1;
        
        if (shouldRefetch) {
          console.log(`[CardActionsModal] 🔄 Single printing detected for ${cardName} - likely corrupted cache, forcing fresh fetch`);
          PrintingCache.remove(cardName);
          // Don't use cached data, continue to fresh fetch
          shouldUseCachedData = false;
        } else if (cachedData.printings && cachedData.printings.length <= 20) {
          console.log(`[CardActionsModal] 🔄 Background fetching full printing list for ${cardName} (cached: ${cachedData.printings.length})`);
          // Fetch full list in background (non-blocking)
          setTimeout(() => {
            fetchFullPrintingListBackground(cardName, cardObj);
          }, 100);
        }
        
        return; // Exit early - data is already loaded!
        }
      }
    }
    
    // If not cached, just proceed directly to full fetch
    // Don't seed with existing data - always fetch full list for best user experience
    setLoading(true);
    
    try {
      // PERFORMANCE OPTIMIZATION: For basic lands, use direct lookup for preferred printing
      // but still fetch all printings for complete selection
      if (BASIC_LAND_PRINTINGS[cardName]) {
        console.log(`[CardActionsModal] ⚡ Basic land detected: ${cardName}, but will fetch all printings for selection`);
        // Skip the optimization - let it fall through to the full fetch
        // This ensures users can see all basic land printings, not just the preferred one
      }
      
      // Standard API fetch for other cards
      const encodedName = encodeURIComponent(cardName);
      const uri = `https://api.scryfall.com/cards/search?q=!"${encodedName}"+game:paper&unique=prints&order=released`;
      // console.log(`[CardActionsModal] Fetching printings for ${cardName} from API`);
      
      const response = await fetch(uri);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Card "${cardName}" not found on Scryfall`);
        }
        throw new Error(`Scryfall API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!Array.isArray(data.data) || data.data.length === 0) {
        throw new Error('No printings found for this card.');
      }
      
      // Store all printings and show first 20 initially for performance
      const allFetchedPrintings = data.data;
      const initialPrintings = data.data.slice(0, 20);
      setAllPrintings(allFetchedPrintings);
      setPrintings(initialPrintings);
      setVisiblePrintings(initialPrintings.length);
      
      // console.log(`[CardActionsModal] Found ${allFetchedPrintings.length} printings, showing first ${initialPrintings.length}`);
      
      // 🎯 SMART PRINTING SELECTION PRIORITY SYSTEM
      const userPreference = PrintingPreferences.get(cardName);
      let printingId = null;
      let selectionReason = '';
      
      if (userPreference && userPreference.id) {
        // Priority 1: User has explicitly chosen a printing before
        printingId = userPreference.id;
        selectionReason = `user preference: ${userPreference.set?.toUpperCase()} #${userPreference.collector_number}`;
        console.log(`[CardActionsModal] 🎯 Using user preference: ${userPreference.set?.toUpperCase()} #${userPreference.collector_number} (${userPreference.id})`);
      } else {
        // Priority 2: This is the FIRST TIME opening modal - inherit from deck list to maintain consistency
        // This prevents the preview/modal mismatch you experienced with Scapeshift
        // console.log(`[CardActionsModal] 📋 First time opening modal for ${cardName} - checking deck list printing`);
        
        // Extract the printing currently being displayed in deck list/preview
        if (cardObj.cardObj?.card?.scryfall_json?.id) {
          printingId = cardObj.cardObj.card.scryfall_json.id;
          selectionReason = 'inherited from deck list (cardObj.cardObj.card.scryfall_json)';
        } else if (cardObj.printing) {
          printingId = cardObj.printing;
          selectionReason = 'inherited from deck list (cardObj.printing)';
        } else if (cardObj.cardObj?.printing) {
          printingId = cardObj.cardObj.printing;
          selectionReason = 'inherited from deck list (cardObj.cardObj.printing)';
        } else if (cardObj.cardObj?.card?.printing) {
          printingId = cardObj.cardObj.card.printing;
          selectionReason = 'inherited from deck list (cardObj.cardObj.card.printing)';
        } else if (cardObj.card?.scryfall_json?.id) {
          printingId = cardObj.card.scryfall_json.id;
          selectionReason = 'inherited from deck list (cardObj.card.scryfall_json)';
        } else if (cardObj.cardObj?.scryfall_json?.id) {
          printingId = cardObj.cardObj.scryfall_json.id;
          selectionReason = 'inherited from deck list (cardObj.cardObj.scryfall_json)';
        } else if (cardObj.scryfall_json?.id) {
          printingId = cardObj.scryfall_json.id;
          selectionReason = 'inherited from deck list (cardObj.scryfall_json)';
        } else if (cardObj.scryfall_id) {
          printingId = cardObj.scryfall_id;
          selectionReason = 'inherited from deck list (cardObj.scryfall_id)';
        } else if (cardObj.id) {
          printingId = cardObj.id;
          selectionReason = 'inherited from deck list (cardObj.id)';
        }
        
        if (printingId) {
          // console.log(`[CardActionsModal] 🔄 Inheriting printing from deck list: ${printingId} (${selectionReason})`);
        } else {
          selectionReason = 'fallback to first available printing (no deck list printing found)';
          console.log(`[CardActionsModal] ⚠️ No deck list printing found - will use first available printing`);
        }
      }
      
      const currentPrinting = printingId ? initialPrintings.find(p => p.id === printingId) || allFetchedPrintings.find(p => p.id === printingId) : null;
      const selectedPrintingResult = currentPrinting || initialPrintings[0];
      
      // Log final selection with reason
      // console.log(`[CardActionsModal] ✅ Selected printing: ${selectedPrintingResult.set?.toUpperCase()} #${selectedPrintingResult.collector_number} (${selectedPrintingResult.id})`);
      // console.log(`[CardActionsModal] 📋 Selection reason: ${currentPrinting ? selectionReason : 'fallback to first printing'}`);
      
      setSelectedPrinting(selectedPrintingResult);
      setLastCardName(cardName);
      
      // IMPORTANT: If we inherited from deck list (no user preference), establish modal control
      // This ensures future modal opens will use the modal's selection, not deck list
      if (!userPreference && currentPrinting) {
        // console.log(`[CardActionsModal] 🎯 Establishing modal control - saving inherited printing as preference`);
        PrintingPreferences.set(cardName, selectedPrintingResult);
      }
      
      // Cache immediately for future instant loading with ALL printings and timestamp
      PrintingCache.set(cardName, allFetchedPrintings, selectedPrintingResult);
      
      // IMMEDIATE PREVIEW SYNC
      if (onPreviewUpdate && card && selectedPrintingResult) {
        const previewUpdateData = {
          ...card,
          printing: selectedPrintingResult.id,
          scryfall_json: selectedPrintingResult,
          image_uris: selectedPrintingResult.image_uris,
          foil: isFoil
        };
        // console.log('[CardActionsModal] Initial modal open - syncing preview to:', selectedPrintingResult.id, selectedPrintingResult.name);
        onPreviewUpdate(previewUpdateData);
      }
      
      // Update the deck list's card data with fresh printing and price information
      const freshPrinting = currentPrinting || initialPrintings[0];
      if (freshPrinting && onUpdateCard) {
        const currentPrice = calculatePriceFromPrinting(freshPrinting, card.foil === true, cardName);
        onUpdateCard(cardObj, {
          scryfall_json: freshPrinting,
          printing: freshPrinting.id,
          modalPrice: currentPrice,
          freshPriceDataOnly: true
        });
      }
      
    } catch (error) {
      setPrintings([]);
      setAllPrintings([]);
      setSelectedPrinting(null);
      console.error("Failed to fetch card printings:", error);
      
      // Provide specific error messages
      if (error.name === 'AbortError') {
        alert('Request timed out. The Scryfall API may be slow. Please try again.');
      } else if (error.message.includes('not found on Scryfall')) {
        alert(`Card not found on Scryfall. The card name might be incorrect or it might be a custom card.`);
      } else if (error.message.includes('Scryfall API error')) {
        alert(`Scryfall API error: ${error.message}. Please try again later.`);
      } else {
        alert('Failed to fetch printings for this card. Please check your connection or try a different card.');
      }
    } finally {
      setLoading(false);
    }
  }, [onUpdateCard, onPreviewUpdate, card, isFoil]);

  // PERFORMANCE BOOST: Background method to fetch full printing list (non-blocking)
  const fetchFullPrintingListBackground = useCallback(async (cardName, cardObj) => {
    try {
      console.log(`[CardActionsModal] 🔄 Background fetch starting for ${cardName}`);
      
      // Use same API pattern but don't show loading to user
      const encodedName = encodeURIComponent(cardName);
      const uri = `https://api.scryfall.com/cards/search?q=!"${encodedName}"+game:paper&unique=prints&order=released`;
      
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (!Array.isArray(data.data) || data.data.length === 0) {
        throw new Error('No printings found');
      }
      
      // Update cache with FULL printing list (not limited)
      const allFetchedPrintings = data.data;
      const currentSelected = selectedPrinting; // Keep current selection
      
      PrintingCache.set(cardName, allFetchedPrintings, currentSelected);
      
      // Update UI if this card is still being viewed
      if (lastCardName === cardName) {
        setAllPrintings(allFetchedPrintings);
        // Keep current visible printings but update allPrintings for Load More functionality
        const currentVisible = Math.min(printings.length, 20);
        setPrintings(allFetchedPrintings.slice(0, currentVisible));
        console.log(`[CardActionsModal] ✅ Background update: ${cardName} now has ${allFetchedPrintings.length} total printings available (showing ${currentVisible})`);
      }
      
    } catch (error) {
      console.warn(`[CardActionsModal] Background fetch failed for ${cardName}:`, error.message);
      // Don't show user errors for background operations
    }
  }, [selectedPrinting, lastCardName]);

  // INSTANT LOADING: Initialize with immediate data from global cache
  useEffect(() => {
    if (isOpen && card) {
      // Extract current card name for comparison
      const cardName = card.name || card.cardObj?.name || card.cardObj?.card?.name;
      
      // INSTANT LOADING: Check cache first before any async operations
      const cachedData = PrintingCache.get(cardName);
      if (cachedData && (cardName !== lastCardName || printings.length === 0 || !selectedPrinting)) {
        // console.log(`[CardActionsModal] ⚡ Using cached data on modal open for ${cardName}`);
        
        // 🎯 CRITICAL FIX: Always verify deck list → modal synchronization
        // Extract the printing currently displayed in deck list to ensure modal matches
        let deckListPrinting = null;
        let selectedPrintingForModal = cachedData.selectedPrinting;
        
        // Check what printing is actually displayed in deck list
        if (card.cardObj?.card?.scryfall_json?.id) {
          deckListPrinting = card.cardObj.card.scryfall_json.id;
        } else if (card.printing) {
          deckListPrinting = card.printing;
        } else if (card.cardObj?.printing) {
          deckListPrinting = card.cardObj.printing;
        } else if (card.scryfall_json?.id) {
          deckListPrinting = card.scryfall_json.id;
        } else if (card.scryfall_id) {
          deckListPrinting = card.scryfall_id;
        } else if (card.id) {
          deckListPrinting = card.id;
        }
        
        if (deckListPrinting) {
          // Find the printing that matches what's displayed in deck list
          const deckListMatching = cachedData.printings.find(p => p.id === deckListPrinting);
          if (deckListMatching) {
            selectedPrintingForModal = deckListMatching;
            // console.log(`[CardActionsModal] 🔄 Syncing modal to deck list printing: ${deckListMatching.set?.toUpperCase()} #${deckListMatching.collector_number}`);
            
            // If deck list printing differs from cached selection, update the cache
            if (cachedData.selectedPrinting.id !== deckListPrinting) {
              console.log(`[CardActionsModal] 📋 Deck list shows different printing than cache - updating cache for consistency`);
              PrintingCache.set(cardName, cachedData.printings, deckListMatching);
            }
          } else {
            console.log(`[CardActionsModal] ⚠️ Deck list printing ${deckListPrinting} not found in cache - using cached selection`);
          }
        } else {
          console.log(`[CardActionsModal] ℹ️ No deck list printing found - using cached selection`);
        }
        
        // Set data immediately but also make all printings available
        const initialVisible = Math.min(cachedData.printings.length, 20);
        setPrintings(cachedData.printings.slice(0, initialVisible));
        setAllPrintings(cachedData.printings);
        setVisiblePrintings(initialVisible);
        setSelectedPrinting(selectedPrintingForModal);
        setLastCardName(cardName);
        
        // Update preview immediately with synchronized printing
        if (onPreviewUpdate && selectedPrintingForModal) {
          const previewUpdateData = {
            ...card,
            printing: selectedPrintingForModal.id,
            scryfall_json: selectedPrintingForModal,
            image_uris: selectedPrintingForModal.image_uris,
            foil: isFoil
          };
          onPreviewUpdate(previewUpdateData);
        }
        
        // Update card data immediately
        if (onUpdateCard && cachedData.selectedPrinting) {
          const currentPrice = calculatePriceFromPrinting(cachedData.selectedPrinting, isFoil, cardName);
          onUpdateCard(card, {
            scryfall_json: cachedData.selectedPrinting,
            printing: cachedData.selectedPrinting.id,
            modalPrice: currentPrice,
            freshPriceDataOnly: true
          });
        }
        
        // IMPORTANT: Set quantity even when using cached data
        const cardQuantity = card.count || card.quantity || card.cardObj?.count || card.cardObj?.quantity || card.cardObj?.card?.count || card.cardObj?.card?.quantity || 1;
        setQuantity(typeof cardQuantity === 'number' && !isNaN(cardQuantity) ? cardQuantity : 1);
        
        // No need to fetch - we have the data!
        return;
      }
      
      // Only fetch if it's a different card or we don't have data and no cache
      if (cardName !== lastCardName || printings.length === 0 || !selectedPrinting) {
        // Reset visible printings counter for new card
        setVisiblePrintings(20);
        fetchPrintings(card);
      }
      
      // Set quantity based on card count/quantity (check both properties like deck list does)
      const cardQuantity = card.count || card.quantity || card.cardObj?.count || card.cardObj?.quantity || card.cardObj?.card?.count || card.cardObj?.card?.quantity || 1;
      setQuantity(typeof cardQuantity === 'number' && !isNaN(cardQuantity) ? cardQuantity : 1);
    }
  }, [isOpen, card?.name, card?._id]); // Removed isFoil to prevent quantity reset on foil changes

  // Separate effect for foil status that only runs when the card's foil property actually changes
  useEffect(() => {
    // Skip if user is actively toggling to prevent conflicts
    if (userIsToggling) {
      return;
    }
    
    if (card) {
      // Get Scryfall data for printing info - ONLY use card data, not selectedPrinting
      const scryfallData = card.cardObj?.card?.scryfall_json || card.cardObj?.scryfall_json || card.scryfall_json || {};
      
      // Skip if we don't have enough data yet
      if (!scryfallData.name && !scryfallData.finishes) {
        return;
      }
      
      // Determine foil availability from Scryfall data
      const finishes = Array.isArray(scryfallData.finishes) ? scryfallData.finishes : [];
      let hasNonFoilFinish = finishes.includes('nonfoil');
      let hasFoilFinish = finishes.includes('foil') || finishes.includes('etched');
      
      // Fallback: If finishes array is empty, infer from set code
      if (finishes.length === 0 && scryfallData.set) {
        const setCode = scryfallData.set.toLowerCase();
        // Very old sets (Alpha through Exodus) - non-foil only
        const isVeryOldSet = ['lea', 'leb', '2ed', 'arn', 'atq', 'leg', 'drk', 'fem', 'ice', 'hml', 'all', 'mir', 'vis', 'wth', 'tmp', 'sth', 'exo'].includes(setCode);
        // Special non-foil-only sets (playtest cards, etc.)
        const isNonFoilOnlySet = ['msc', 'cmb1', 'cmb2', 'plist'].includes(setCode);
        // Special foil-only sets (collectors editions, etc.)
        const isSpecialFoilSet = ['ocm1', 'pcm1', 'p30h', 'p30a', 'p30m'].includes(setCode);
        
        if (isVeryOldSet || isNonFoilOnlySet) {
          hasNonFoilFinish = true;
          hasFoilFinish = false;
        } else if (isSpecialFoilSet) {
          hasNonFoilFinish = false;
          hasFoilFinish = true;
        } else {
          // For modern sets, assume both finishes available unless specified
          hasNonFoilFinish = true;
          hasFoilFinish = true;
        }
      }
      
      // Determine if card is foil-only or non-foil-only
      const cardIsFoilOnly = hasFoilFinish && !hasNonFoilFinish;
      const cardIsNonFoilOnly = hasNonFoilFinish && !hasFoilFinish;
      
      // Determine foil status with expanded detection
      let cardFoilStatus = false;

      // Check all possible locations for foil status - be more comprehensive
      const foilSources = [
        card.foil,
        card.isFoil,
        card.cardObj?.foil,
        card.cardObj?.isFoil,
        card.cardObj?.card?.foil,
        card.cardObj?.card?.isFoil
      ];
      
      // If ANY source indicates foil=true, consider it foil
      // Use strict equality to ensure only boolean true counts as foil
      cardFoilStatus = foilSources.some(value => value === true);
      
      // If no explicit foil status found, check Scryfall finishes as fallback
      if (!cardFoilStatus) {
        // If card is foil-only, default to foil
        if (cardIsFoilOnly) {
          cardFoilStatus = true;
        }
        // If card is non-foil-only, default to non-foil
        else if (cardIsNonFoilOnly) {
          cardFoilStatus = false;
        }
        // For cards with both finishes, only consider it foil if it ONLY has foil finish (not both)
        else if (hasFoilFinish && !hasNonFoilFinish) {
          cardFoilStatus = true;
        }
      }
      
      // Update all states in a batch to prevent multiple re-renders
      setIsFoilOnly(cardIsFoilOnly);
      setIsNonFoilOnly(cardIsNonFoilOnly);
      setIsFoil(cardFoilStatus);
      
      // Debug logging for foil status
      if (scryfallData.set) {
        // console.log(`[CardActionsModal] Initial foil detection for ${scryfallData.name} (${scryfallData.set}): foilOnly=${cardIsFoilOnly}, nonFoilOnly=${cardIsNonFoilOnly}, finishes=${finishes.length ? finishes.join(',') : 'none'}`);
      }
      
      // For foil-only cards, automatically update the deck if the card isn't already marked as foil
      // DISABLED: This was causing infinite loops by calling onUpdateCard which updates card object
      // which then retriggers this same useEffect
      // if (cardIsFoilOnly && cardFoilStatus && !card.foil) {
      //   try {
      //     const cardPrinting = card.printing || card.cardObj?.printing || card.cardObj?.card?.printing || selectedPrinting?.id;
      //     onUpdateCard(card, { 
      //       foil: true,
      //       isFoil: true,
      //       printing: cardPrinting,
      //       lastUpdated: Date.now()
      //     });
      //   } catch (error) {
      //     console.error('[CardActionsModal] Error auto-updating foil-only card:', error);
      //   }
      // }
    }
  }, [card?.foil, card?.isFoil, card?.cardObj?.foil, card?.cardObj?.card?.foil, card?.cardObj?.isFoil, card?.cardObj?.card?.isFoil, card?._id, isOpen]); // Removed selectedPrinting completely

  // Separate effect ONLY for when the actual printing changes (not user foil toggles)
  useEffect(() => {
    // Skip if user is actively toggling to prevent conflicts
    if (userIsToggling) {
      return;
    }
    
    // Only run when we have a selectedPrinting with finishes data
    if (selectedPrinting && selectedPrinting.finishes && Array.isArray(selectedPrinting.finishes)) {
      const finishes = selectedPrinting.finishes;
      const hasNonFoilFinish = finishes.includes('nonfoil');
      const hasFoilFinish = finishes.includes('foil') || finishes.includes('etched');
      
      const printingIsFoilOnly = hasFoilFinish && !hasNonFoilFinish;
      const printingIsNonFoilOnly = hasNonFoilFinish && !hasFoilFinish;
      
      // Only update if the foil-only states actually need to change
      if (printingIsFoilOnly !== isFoilOnly || printingIsNonFoilOnly !== isNonFoilOnly) {
        setIsFoilOnly(printingIsFoilOnly);
        setIsNonFoilOnly(printingIsNonFoilOnly);
        
        // Auto-adjust foil status if printing constrains it
        if (printingIsFoilOnly && !isFoil) {
          setIsFoil(true);
        } else if (printingIsNonFoilOnly && isFoil) {
          setIsFoil(false);
        }
      }
    }
  }, [selectedPrinting?.id, userIsToggling, isFoilOnly, isNonFoilOnly]); // Include states to prevent unnecessary updates

  // CRITICAL: Effect to sync modalPrice when printing or foil status changes
  // This ensures deck list ALWAYS matches what the modal displays
  useEffect(() => {
    if (selectedPrinting && onUpdateCard && card) {
      const currentPrice = getCurrentModalPrice();
      
      // console.log(`[MODAL SYNC] Syncing price for ${card.name}: $${currentPrice} (printing: ${selectedPrinting.set}/${selectedPrinting.collector_number}, foil: ${isFoil})`);
      
      if (currentPrice !== null && currentPrice !== undefined) {
        // IMMEDIATE: Update deck list with modal's current price
        onUpdateCard(card, {
          modalPrice: currentPrice,
          printing: selectedPrinting.id, // Also sync the printing
          foil: isFoil, // Also sync the foil status
          freshPriceDataOnly: true, // Non-intrusive background update
          scryfall_json: selectedPrinting
        });
        
        // console.log(`[MODAL SYNC] ✅ Synced ${card.name}: price=$${currentPrice}, foil=${isFoil}, printing=${selectedPrinting.set}/${selectedPrinting.collector_number}`);
      } else {
        // console.warn(`[MODAL SYNC] ⚠️  Could not calculate price for ${card.name}`);
      }
    }
  }, [selectedPrinting, isFoil, card?.name]); // Removed function dependencies that cause infinite loops

  // Function to get collection status for a specific printing
  const getCollectionStatus = useCallback((printing) => {
    try {
      const collection = JSON.parse(localStorage.getItem('cardCollection') || '[]');
      
      // Check for exact printing matches
      const foilCount = collection
        .filter(item => item.printing_id === printing.id && item.foil === true)
        .reduce((sum, item) => sum + item.quantity, 0);
      
      const nonFoilCount = collection
        .filter(item => item.printing_id === printing.id && item.foil === false)
        .reduce((sum, item) => sum + item.quantity, 0);
      
      const exactTotal = foilCount + nonFoilCount;
      
      // If we have exact matches, return exact-match status
      if (exactTotal > 0) {
        const parts = [];
        if (nonFoilCount > 0) {
          parts.push(`${nonFoilCount} Regular`);
        }
        if (foilCount > 0) {
          parts.push(`${foilCount} Foil`);
        }
        
        return {
          status: 'exact-match',
          text: parts.join(', ')
        };
      }
      
      // Check for different versions of the same card (same oracle_id but different printing)
      const cardName = printing.name;
      const oracleId = printing.oracle_id;
      
      if (cardName && oracleId) {
        const differentVersions = collection.filter(item => {
          // Match by oracle_id or card name if oracle_id not available
          return (item.oracle_id === oracleId || item.card_name === cardName) && 
                 item.printing_id !== printing.id;
        });
        
        if (differentVersions.length > 0) {
          const diffFoilCount = differentVersions
            .filter(item => item.foil === true)
            .reduce((sum, item) => sum + item.quantity, 0);
          
          const diffNonFoilCount = differentVersions
            .filter(item => item.foil === false)
            .reduce((sum, item) => sum + item.quantity, 0);
          
          const parts = [];
          if (diffNonFoilCount > 0) {
            parts.push(`${diffNonFoilCount} Regular`);
          }
          if (diffFoilCount > 0) {
            parts.push(`${diffFoilCount} Foil`);
          }
          
          return {
            status: 'different-version',
            text: `${parts.join(', ')} (Other Printing)`
          };
        }
      }
      
      // Not owned at all
      return { status: 'not-owned', text: 'Not Owned' };
      
    } catch (error) {
      console.error('Error checking collection status:', error);
      return { status: 'unknown', text: 'Unknown' };
    }
  }, [collectionVersion]); // Add collectionVersion to dependencies

  // Handle adding to collection with real-time status update
  // Function to load more printings for better performance
  const loadMorePrintings = () => {
    const newVisibleCount = Math.min(visiblePrintings + 20, allPrintings.length);
    setVisiblePrintings(newVisibleCount);
    setPrintings(allPrintings.slice(0, newVisibleCount));
  };

  const handleAddToCollection = (card, printingData) => {
    try {
      // Call the original function
      onAddToCollection(card, printingData);
      
      // Force immediate update with a small delay to ensure localStorage is updated
      setTimeout(() => {
        setCollectionVersion(prev => prev + 1);
        console.log(`[CardActionsModal] Collection status refreshed after adding: ${printingData.name}`);
      }, 100);
      
      // Show success feedback
      toast.success('Added to collection!', {
        position: "top-center",
        autoClose: 2000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: false,
      });
      
      console.log(`[CardActionsModal] Added to collection: ${printingData.name} (${printingData.set?.toUpperCase()} #${printingData.collector_number})`);
      
    } catch (error) {
      console.error('[CardActionsModal] Error adding to collection:', error);
      toast.error('Failed to add to collection. Please try again.');
    }
  };

  if (!isOpen || !card) return null;

  const handleSelectPrinting = (printing) => {
    // Check if this is already the selected printing
    if (selectedPrinting && selectedPrinting.id === printing.id) {
      return; // No need to update if it's the same printing
    }
    
    // Update local state first for immediate UI feedback
    setSelectedPrinting(printing);
    
    // Scroll left-hand side back to top when selecting a different printing
    if (cardActionsRef.current) {
      cardActionsRef.current.scrollTop = 0;
    }
    
    // IMMEDIATE DECK SYNC: Update deck list immediately with new printing
    if (onUpdateCard && card) {
      const newPrice = getCurrentModalPrice(printing, isFoil);
      console.log(`[PRINTING SELECTION] Immediate sync: ${card.name} -> $${newPrice} (${printing.set}/${printing.collector_number}, foil: ${isFoil})`);
      
      onUpdateCard(card, {
        modalPrice: newPrice,
        printing: printing.id,
        foil: isFoil,
        freshPriceDataOnly: true, // Non-intrusive background update
        scryfall_json: printing
      });
    }
    
    // IMMEDIATE PREVIEW UPDATE: Update the preview with the new printing
    if (onPreviewUpdate && card) {
      const previewUpdateData = {
        ...card,
        printing: printing.id,
        scryfall_json: printing,
        image_uris: printing.image_uris,
        foil: isFoil // Keep current foil state
      };
      console.log('[CardActionsModal] Calling onPreviewUpdate with:', {
        printingId: printing.id,
        cardName: card.name || printing.name,
        previewUpdateData
      });
      onPreviewUpdate(previewUpdateData);
    } else {
      console.log('[CardActionsModal] NOT calling onPreviewUpdate:', {
        hasCallback: !!onPreviewUpdate,
        hasCard: !!card,
        printingId: printing.id
      });
    }
    
    // Prepare a simplified printing object with only the essential data
    // This helps prevent issues with circular references or too much data
    const essentialPrinting = {
      id: printing.id,
      name: printing.name,
      set: printing.set,
      set_name: printing.set_name,
      collector_number: printing.collector_number,
      rarity: printing.rarity,
      released_at: printing.released_at,
      image_uris: printing.image_uris,
      mana_cost: printing.mana_cost,
      type_line: printing.type_line,
      oracle_text: printing.oracle_text,
      power: printing.power,
      toughness: printing.toughness,
      colors: printing.colors,
      color_identity: printing.color_identity,
      prices: printing.prices,
      games: printing.games,
      legalities: printing.legalities,
      // CRITICAL: Include finishes for proper foil status validation
      finishes: printing.finishes || [],
      // Include foil/nonfoil flags for additional validation
      foil: printing.foil,
      nonfoil: printing.nonfoil,
      // Include frame effects for etched detection
      frame_effects: printing.frame_effects || [],
      // Include promo types for special foil handling
      promo_types: printing.promo_types || [],
      // Include oracle_id for proper card identification
      oracle_id: printing.oracle_id,
      // Add card faces if available for double-faced cards
      card_faces: printing.card_faces
    };
    
    try {
      // Calculate the price for the new printing with current foil status
      const prices = printing.prices || {};
      const finishes = printing.finishes || [];
      const promoTypes = printing.promo_types || [];
      
      let priceToUse;
      if (isFoil) {
        // Handle etched cards
        if (finishes.includes('etched') || printing.frame_effects?.includes('etched')) {
          priceToUse = prices.usd_etched || prices.usd_foil || prices.usd || null;
        }
        // Handle special foil types
        else if (promoTypes.includes('surgefoil') || promoTypes.includes('rainbow') || 
                 promoTypes.includes('textured') || promoTypes.includes('boosterfun')) {
          priceToUse = prices.usd_foil || prices.usd || null;
        }
        // Regular foil cards
        else {
          priceToUse = prices.usd_foil || prices.usd || null;
        }
        
        // For foil-only cards, always try to show a price even if usd is missing
        if (!priceToUse && isFoilOnly) {
          priceToUse = prices.usd_foil || prices.usd_etched || null;
        }
      } else {
        priceToUse = prices.usd || null;
      }
      
      // CRITICAL FIX: Validate foil status against new printing capabilities
      // Determine what finishes the new printing actually supports
      const printingFinishes = printing.finishes || [];
      const hasNonFoilFinish = printingFinishes.includes('nonfoil');
      const hasFoilFinish = printingFinishes.includes('foil') || printingFinishes.includes('etched');
      
      // Fallback: If finishes array is empty, infer from set and card data
      let inferredHasNonFoil = hasNonFoilFinish;
      let inferredHasFoil = hasFoilFinish;
      
      if (printingFinishes.length === 0) {
        const setCode = printing.set?.toLowerCase();
        // Very old sets (Alpha through Exodus) - non-foil only
        const isVeryOldSet = ['lea', 'leb', '2ed', 'arn', 'atq', 'leg', 'drk', 'fem', 'ice', 'hml', 'all', 'mir', 'vis', 'wth', 'tmp', 'sth', 'exo'].includes(setCode);
        // Special non-foil-only sets (playtest cards, etc.)
        const isNonFoilOnlySet = ['msc', 'cmb1', 'cmb2', 'plist'].includes(setCode);
        // Special foil-only sets (collectors editions, etc.)
        const isSpecialFoilSet = ['ocm1', 'pcm1', 'p30h', 'p30a', 'p30m'].includes(setCode);
        
        if (isVeryOldSet || isNonFoilOnlySet) {
          inferredHasNonFoil = true;
          inferredHasFoil = false;
        } else if (isSpecialFoilSet) {
          inferredHasNonFoil = false;
          inferredHasFoil = true;
        } else {
          // For modern sets (Urza's Legacy forward), assume both finishes available unless specified
          inferredHasNonFoil = true;
          inferredHasFoil = true;
        }
      }
      
      // CRITICAL FIX: Always reset to non-foil when changing printings (if available)
      // This addresses the user's issue where foil status wasn't resetting
      let validatedFoilStatus;
      
      // If switching to a foil-only printing, force foil to true
      if (!inferredHasNonFoil && inferredHasFoil) {
        validatedFoilStatus = true;
        console.log(`[CardActionsModal] New printing "${printing.set_name}" is foil-only, forcing foil to true`);
      }
      // If switching to a non-foil-only printing, force foil to false  
      else if (inferredHasNonFoil && !inferredHasFoil) {
        validatedFoilStatus = false;
        console.log(`[CardActionsModal] New printing "${printing.set_name}" is non-foil-only, forcing foil to false`);
      }
      // RESET BEHAVIOR: If both finishes are available, default to non-foil
      // This is the key fix - reset to non-foil instead of preserving current status
      else if (inferredHasNonFoil && inferredHasFoil) {
        validatedFoilStatus = false; // Reset to non-foil when both are available
        console.log(`[CardActionsModal] New printing "${printing.set_name}" supports both finishes, resetting to non-foil`);
      }
      
      // Recalculate price based on validated foil status using real Scryfall data
      let finalPrice;
      
      if (validatedFoilStatus) {
        // Handle etched cards
        if (printingFinishes.includes('etched') || printing.frame_effects?.includes('etched')) {
          finalPrice = prices.usd_etched || prices.usd_foil || prices.usd || null;
        }
        // Handle special foil types
        else if (promoTypes.includes('surgefoil') || promoTypes.includes('rainbow') || 
                 promoTypes.includes('textured') || promoTypes.includes('boosterfun')) {
          finalPrice = prices.usd_foil || prices.usd || null;
        }
        // Regular foil cards
        else {
          finalPrice = prices.usd_foil || prices.usd || null;
        }
      } else {
        finalPrice = prices.usd || null;
      }

      // Update the card with the new printing information and validated foil status
      onUpdateCard(card, { 
        printing: printing.id,
        scryfall_json: essentialPrinting,
        price: finalPrice,
        modalPrice: finalPrice, // CRITICAL: Store the exact modal price for deck list synchronization
        foil: validatedFoilStatus, // CRITICAL: Use validated foil status based on printing capabilities
        modalFoilStatus: validatedFoilStatus, // CRITICAL: Pass the validated foil status to the update handler
        // Include direct image_uris for faster preview updates
        image_uris: printing.image_uris || null,
        // Include card faces for double-sided cards
        card_faces: printing.card_faces || null
      });
      
      // CRITICAL: Update the modal's foil state and availability indicators
      if (validatedFoilStatus !== isFoil) {
        console.log(`[CardActionsModal] Updating modal foil state from ${isFoil} to ${validatedFoilStatus} due to printing change`);
        setIsFoil(validatedFoilStatus);
      }
      
      // Update foil availability indicators based on new printing
      const newIsFoilOnly = !inferredHasNonFoil && inferredHasFoil;
      const newIsNonFoilOnly = inferredHasNonFoil && !inferredHasFoil;
      
      if (newIsFoilOnly !== isFoilOnly) {
        setIsFoilOnly(newIsFoilOnly);
        console.log(`[CardActionsModal] Updated foil-only status to: ${newIsFoilOnly} for set: ${printing.set}`);
      }
      
      if (newIsNonFoilOnly !== isNonFoilOnly) {
        setIsNonFoilOnly(newIsNonFoilOnly);
        console.log(`[CardActionsModal] Updated non-foil-only status to: ${newIsNonFoilOnly} for set: ${printing.set}`);
      }
      
      // 🧠 ADAPTIVE LEARNING: Save user's printing selection for future reference
      const cardName = card.name || printing.name;
      if (cardName) {
        const preferenceData = {
          id: printing.id,
          set: printing.set,
          collector_number: printing.collector_number,
          set_name: printing.set_name,
          rarity: printing.rarity
        };
        PrintingPreferences.set(cardName, preferenceData);
        console.log(`[CardActionsModal] 🧠 Learned preference for "${cardName}": ${printing.set?.toUpperCase()} #${printing.collector_number} (${printing.set_name})`);
      }
    } catch (error) {
      console.error('[CardActionsModal] Error updating printing:', error);
      // Alert since toast might not be available in this component
      alert('Error updating card printing. Please try again.');
      // Reset UI to previous state if there was an error
      setSelectedPrinting(selectedPrinting);
    }
  };

  const handleFoilChange = (e) => {
    // Prevent changes if card is foil-only or non-foil-only
    if (isFoilOnly || isNonFoilOnly) {
      return;
    }
    
    const newFoilStatus = !!e.target.checked;
    
    // ⚡ INSTANT UI RESPONSE: Update toggle immediately for smooth UX
    setIsFoil(newFoilStatus);
    
    // 🛡️ PREVENT CONFLICTS: Set flag to prevent useEffect from interfering
    setUserIsToggling(true);
    
    // 🔄 FORCE PRICE UPDATE: Trigger price display updates
    setPriceUpdateTrigger(prev => prev + 1);
    
    // ⚡ OPTIMISTIC UI: Show toast immediately for instant feedback
    const toastMessage = newFoilStatus ? 'Updated to foil' : 'Updated to non-foil';
    toast.success(toastMessage, {
      position: "top-center",
      autoClose: 1500,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: false,
    });
    
    // 🚀 DEBOUNCED BACKEND UPDATE: Delay heavy operations to not block UI
    setTimeout(() => {
      try {
        // Calculate price efficiently using existing helper
        const priceToUse = selectedPrinting ? 
          calculatePriceFromPrinting(selectedPrinting, newFoilStatus, card.name) : null;
        
        // Get printing info once
        const cardPrinting = card.printing || 
                            card.cardObj?.printing || 
                            card.cardObj?.card?.printing || 
                            selectedPrinting?.id;
        
        // ⚡ OPTIMIZED: Single update call with minimal data
        const updateData = { 
          foil: newFoilStatus,
          isFoil: newFoilStatus,
          modalPrice: priceToUse, // Store exact modal price for sync
          printing: cardPrinting,
          lastUpdated: Date.now()
        };
        
        onUpdateCard(card, updateData);
        
      } catch (error) {
        console.error('[CardActionsModal] Error updating foil status:', error);
        // Revert UI state on error
        setIsFoil(!newFoilStatus);
        toast.error('Failed to update foil status. Please try again.');
      } finally {
        // 🛡️ CLEAR FLAG: Allow useEffect to run again after safe delay
        setTimeout(() => setUserIsToggling(false), 100);
      }
    }, 50); // Small delay to ensure UI updates first
  };

  const handleQuantityChange = (e) => {
    let newQuantity = parseInt(e.target.value, 10);
    if (isNaN(newQuantity)) newQuantity = 1;
    
    // If quantity is less than 1, remove the card
    if (newQuantity < 1) {
      onRemoveCard(card); // Remove the card from the deck
      return;
    }
    
    setQuantity(newQuantity);
    onUpdateCard(card, { quantity: newQuantity });
  };

  const incrementQuantity = () => {
    const newQuantity = quantity + 1;
    setQuantity(newQuantity);
    onUpdateCard(card, { quantity: newQuantity });
  };

  const decrementQuantity = () => {
    const newQuantity = quantity - 1;
    
    // If quantity would go below 1, remove the card instead of updating
    if (newQuantity < 1) {
      onRemoveCard(card); // Remove the card from the deck
      return;
    }
    
    setQuantity(newQuantity);
    onUpdateCard(card, { quantity: newQuantity });
  };

  // Monitor collection changes to update status indicators
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'cardCollection') {
        setCollectionVersion(prev => prev + 1);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Also update when modal opens to get fresh collection status
  useEffect(() => {
    if (isOpen) {
      setCollectionVersion(prev => prev + 1);
    }
  }, [isOpen]);

  // Force toggle visibility on every render
  useEffect(() => {
    const ensureToggleVisibility = () => {
      const toggleSwitch = document.querySelector('.toggle-switch');
      const toggleSlider = document.querySelector('.toggle-slider');
      
      if (toggleSwitch) {
        toggleSwitch.style.display = 'inline-block';
        toggleSwitch.style.visibility = 'visible';
        toggleSwitch.style.opacity = (isFoilOnly || isNonFoilOnly) ? '0.6' : '1';
        toggleSwitch.style.position = 'relative';
        toggleSwitch.style.width = '50px';
        toggleSwitch.style.height = '24px';
        toggleSwitch.style.zIndex = '9999';
      }
      
      if (toggleSlider) {
        toggleSlider.style.display = 'block';
        toggleSlider.style.visibility = 'visible';
        toggleSlider.style.opacity = '1';
        toggleSlider.style.position = 'absolute';
        toggleSlider.style.top = '0';
        toggleSlider.style.left = '0';
        toggleSlider.style.right = '0';
        toggleSlider.style.bottom = '0';
      }
    };

    // Run immediately
    ensureToggleVisibility();
    
    // Run after a small delay to catch any async updates
    const timer = setTimeout(ensureToggleVisibility, 100);
    
    // Set up MutationObserver to catch dynamic style changes
    const observer = new MutationObserver(() => {
      ensureToggleVisibility();
    });
    
    const toggleSwitch = document.querySelector('.toggle-switch');
    if (toggleSwitch) {
      observer.observe(toggleSwitch, { 
        attributes: true, 
        attributeFilter: ['style', 'class']
      });
    }
    
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [isFoilOnly, isNonFoilOnly, isFoil, selectedPrinting, isOpen]);

  // Handle oracle tag search
  const handleOracleTagSearch = useCallback((oracleTag) => {
    console.log(`[CardActionsModal] 🔍 Oracle tag search requested: ${oracleTag}`);
    
    if (onOracleTagSearch) {
      // Close the modal first, then trigger the search
      onClose();
      // Use a small delay to ensure modal closes before search opens
      setTimeout(() => {
        onOracleTagSearch(oracleTag);
      }, 100);
    } else {
      // Fallback: show alert if no search function provided
      console.warn('[CardActionsModal] No onOracleTagSearch function provided');
      alert(`Would search for oracle tag: "${oracleTag}"\n\nPlease implement the onOracleTagSearch prop in your parent component.`);
    }
  }, [onOracleTagSearch, onClose]);

  return (
    <div className="modal-backdrop card-actions-modal" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        ref={modalRef}
      >
        {/* OTAG Integration - temporarily commented out to debug import issues */}
        {/* <OtagIntegration 
          isModalOpen={isOpen}
          cardName={card?.name}
          modalRef={modalRef}
        /> */}
        
        {/* Modal header with navigation arrows and close button */}
        <div className="modal-header">
          {onNavigateToPrevious && (
            <button 
              onClick={onNavigateToPrevious} 
              className="nav-arrow nav-arrow-left"
              title="Previous card (Left arrow key)"
            >
              &#8249;
            </button>
          )}
          
          <button onClick={onClose} className="close-button">&times;</button>
          
          {onNavigateToNext && (
            <button 
              onClick={onNavigateToNext} 
              className="nav-arrow nav-arrow-right"
              title="Next card (Right arrow key)"
            >
              &#8250;
            </button>
          )}
        </div>
        <div className="modal-body">
          {/* Left side controls */}
          <div className="card-actions" ref={cardActionsRef}>
            {/* Foil toggle switch */}
            <div className="action-row foil-selector">
              <label className="control-label">
                Foil:
                {isFoilOnly && <span className="foil-only-indicator"> (Foil Only)</span>}
                {isNonFoilOnly && <span className="non-foil-only-indicator"> (Non-Foil Only)</span>}
              </label>
              <label className={`toggle-switch ${(isFoilOnly || isNonFoilOnly) ? 'disabled' : ''}`} style={{display: 'flex', alignItems: 'center'}}>
                <input 
                  type="checkbox" 
                  checked={isFoil} 
                  onChange={handleFoilChange}
                  disabled={isFoilOnly || isNonFoilOnly}
                  style={{opacity: 1, visibility: 'visible'}}
                />
                <span className={`toggle-slider ${isFoil ? 'foil-active' : ''} ${(isFoilOnly || isNonFoilOnly) ? 'disabled' : ''}`} style={{opacity: 1, visibility: 'visible'}}></span>
              </label>
            </div>
            
            {/* Price display moved below release date in the current printing info section */}
            
            {/* Horizontal quantity controls */}
            <div className="action-row quantity-row">
              <label className="control-label" style={{ display: 'flex', alignItems: 'center' }}>Quantity:</label>
              <div className="quantity-controls">
                <button 
                  className="quantity-btn" 
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                >−</button>
                <select 
                  value={quantity} 
                  onChange={handleQuantityChange}
                  className="quantity-select"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
                <button 
                  className="quantity-btn" 
                  onClick={incrementQuantity}
                >+</button>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="action-buttons">
              <button className="action-button" onClick={() => onRemoveCard(card)}>Remove from Deck</button>
              <button className="action-button" onClick={() => onMoveToSideboard(card)}>Move to Sideboard</button>
              <button className="action-button" onClick={() => {
                if (onMoveToTechIdeas) {
                  onMoveToTechIdeas(card);
                  onClose();
                } else {
                  console.error('onMoveToTechIdeas function not provided');
                }
              }}>Move to Tech Ideas</button>
              <button className="action-button" onClick={() => handleAddToCollection(card, { ...selectedPrinting, foil: isFoil })}>Add to My Collection</button>
            </div>
            
            {/* Printings section moved below action buttons */}
            <div className="printings-section">
              <h3>Select Printing</h3>
              <div className="printings-list">
                {loading ? (
                  <div className="loading-printings">
                    <p>Loading printings...</p>
                    <div className="spinner"></div>
                  </div>
                ) : printings.length === 0 ? (
                  <p>No printings found for this card.</p>
                ) : (
                  (() => {
                    // Create a reordered array with selected printing first, but preserve chronological order for the rest
                    const orderedPrintings = [];
                    
                    // Add selected printing first if it exists
                    if (selectedPrinting) {
                      orderedPrintings.push(selectedPrinting);
                    }
                    
                    // Add all other printings in their original order (chronological) excluding the selected one
                    printings.forEach(p => {
                      if (!selectedPrinting || p.id !== selectedPrinting.id) {
                        orderedPrintings.push(p);
                      }
                    });
                    
                    return orderedPrintings.map((p, index) => {
                    // HIGHER QUALITY: Use normal sized images for better resolution in printing list
                    let imgSrc = '';
                    if (p.id) {
                      // Use normal version for higher quality images
                      imgSrc = `https://api.scryfall.com/cards/${p.id}?format=image&version=normal`;
                    }
                    if (!imgSrc) imgSrc = PLACEHOLDER_IMG;
                    
                    const isSelected = selectedPrinting?.id === p.id;
                    return (
                      <div 
                        key={p.id} 
                        className={`printing-item ${isSelected ? 'selected' : ''}`}
                        title={`${p.name} - ${p.set.toUpperCase()} ${p.collector_number ? `(#${p.collector_number})` : ''}`}
                      >
                        <img
                          src={imgSrc}
                          alt={`${p.name} - ${p.set.toUpperCase()}`}
                          onClick={() => handleSelectPrinting(p)}
                          loading="lazy"
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '280px', // Increased from 210px to 280px for better visibility
                            objectFit: 'contain', 
                            background: '#f8f8f8',
                            transition: 'opacity 0.2s'
                          }}
                          onLoad={(e) => {
                            e.target.style.opacity = '1';
                          }}
                          onError={(e) => {
                            // Fallback to placeholder on error
                            e.target.src = PLACEHOLDER_IMG;
                          }}
                        />
                        {isSelected && <div className="current-label">CURRENT</div>}
                        
                        {/* DEBUG: Test element to confirm changes are working */}

                        
                        {/* Set info - two rows as requested */}
                        <div className="set-info">
                          {/* First row: Set icon, set code, collector number */}
                          <div className="set-details-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px', width: 'auto' }}>
                            <img 
                              src={`/svgs/${p.set.toLowerCase()}.svg`} 
                              alt={p.set.toUpperCase()}
                              className="set-symbol"
                              style={{ width: '16px', height: '16px', flexShrink: 0 }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            <span style={{ fontSize: '12px', fontWeight: '500' }}>
                              {p.set.toUpperCase()} {p.collector_number && `#${p.collector_number}`}
                            </span>
                          </div>
                          
                          {/* Second row: Price and collection status */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            marginTop: '4px', 
                            fontSize: '12px',
                            minHeight: '16px',
                            width: 'auto',
                            gap: '14px'
                          }}>
                            <span style={{ 
                              color: '#666', 
                              fontWeight: '500',
                              fontSize: '12px',
                              whiteSpace: 'nowrap',
                              overflow: 'visible',
                              textOverflow: 'none'
                            }}>
                              {(() => {
                                // Force re-render when foil changes: trigger=${priceUpdateTrigger}
                                // For the selected printing, show price based on current foil toggle state
                                if (selectedPrinting && p.id === selectedPrinting.id) {
                                  const currentPrice = getCurrentPrice();
                                  return formatPrice(currentPrice);
                                }
                                
                                // For non-selected printings, show default non-foil price
                                const priceToShow = p.prices?.usd || p.usd || p.prices?.usd_foil || p.usd_foil;
                                return formatPrice(priceToShow);
                              })()}
                            </span>
                            <span style={{ 
                              fontSize: '18px',
                              whiteSpace: 'nowrap'
                            }}>
                              {(() => {
                                const collectionStatus = getCollectionStatus(p);
                                // Use filled circles with colors: Green (exact match), Yellow (different version), Red (not owned)
                                if (collectionStatus?.status === 'exact-match') {
                                  return <span style={{ color: '#22c55e', fontSize: '18px' }} title={`Owned: ${collectionStatus.text}`}>●</span>;
                                } else if (collectionStatus?.status === 'different-version') {
                                  return <span style={{ color: '#eab308', fontSize: '18px' }} title={collectionStatus.text}>●</span>;
                                } else if (collectionStatus?.status === 'not-owned') {
                                  return <span style={{ color: '#ef4444', fontSize: '18px' }} title="Not owned">●</span>;
                                } else {
                                  return <span style={{ color: '#6b7280', fontSize: '18px' }} title="Unknown status">●</span>;
                                }
                              })()}
                            </span>
                          </div>
                        </div>
                        
                        {updatingPrinting && selectedPrinting?.id === p.id && (
                          <span className="updating-indicator">
                            <span className="spinner-small"></span> Updating...
                          </span>
                        )}
                      </div>
                    );
                  });
                })()
                )}
                
                {/* Load More Printings Button */}
                {allPrintings.length > printings.length && (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <button
                      onClick={loadMorePrintings}
                      style={{
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#0056b3';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#007bff';
                      }}
                    >
                      Load More Printings ({allPrintings.length - printings.length} remaining)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Main content area for current printing display */}
          <div className="printings-container">
            {/* Current printing display */}
            {selectedPrinting && (
              <div className="current-printing-container">
                <div className="current-printing-info">
                  <div className="current-printing-name">
                    <strong>{selectedPrinting.name}</strong>
                  </div>
                  <div className="printing-price">
                    Price: {(() => {
                      // CRITICAL: Use the same price that gets synced to deck list
                      const currentPrice = getCurrentModalPrice();
                      return formatPrice(currentPrice);
                    })()}
                  </div>
                  {selectedPrinting.oracle_text && (
                    <div className="oracle-text">
                      {selectedPrinting.oracle_text.split('\n').map((text, i) => (
                        <p key={i}>{text}</p>
                      ))}
                    </div>
                  )}
                  
                  {/* Oracle Tags Integration - Place under oracle text */}
                  <OracleTagsIntegration 
                    card={card}
                    onOracleTagSearch={handleOracleTagSearch}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardActionsModal;
