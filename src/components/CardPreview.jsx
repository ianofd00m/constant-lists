import React, { useState, useEffect, useCallback } from 'react';
import './CardPreview.css';
import PrintingPreferences from '../utils/PrintingPreferences';

// Helper function to get fastest image URL (prioritize direct CDN for performance)
function getFastImageUrl(cardId, imageUris = null) {
  if (!cardId) return null;
  
  // PERFORMANCE PRIORITY: Use direct CDN URLs for fastest loading
  // Direct CDN format: https://cards.scryfall.io/normal/front/x/y/cardid.jpg
  if (cardId && cardId.length >= 36) {
    return `https://cards.scryfall.io/normal/front/${cardId.substring(0, 1)}/${cardId.substring(1, 2)}/${cardId}.jpg`;
  }
  
  // Fallback to API if needed (slower but more reliable)
  return `https://api.scryfall.com/cards/${cardId}?format=image&version=normal`;
}

export default function CardPreview({ preview, isFixed, showPreview, externalFlipState }) {
  // Comprehensive error handling wrapper to prevent crashes
  try {
    const [showBackFace, setShowBackFace] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [hasEverLoaded, setHasEverLoaded] = useState(false);
    
    // Use external flip state if provided, otherwise use internal state
    const currentFlipState = externalFlipState !== undefined ? externalFlipState : showBackFace;
    
    // Debug logging for flip state
    const card = preview?.card || preview;
    const cardName = card?.name || card?.scryfall_json?.name || card?.card?.name || card?.card?.scryfall_json?.name || "Unknown Card";
    
    if (!showPreview || !preview || !card) {
      return null;
    }
    
    // Enhanced safety check for dual-faced cards and malformed card objects
    if (typeof card !== 'object') {
      console.warn('[CardPreview] Invalid card object type:', typeof card, card);
      return null;
    }
    
    // Quick check for basic card data before proceeding
    const hasBasicCardData = card?.id || card?.scryfall_id || card?.scryfall_json?.id || card?.card?.id ||
                            card?.card_faces || card?.scryfall_json?.card_faces || card?.card?.scryfall_json?.card_faces;
    
    if (!hasBasicCardData) {
      console.warn('[CardPreview] Card missing all basic data fields:', card);
      return null;
    }

  // Reset error state when card changes, but be smarter about loading state
  useEffect(() => {
    setImageError(false);
    // Only show loading state if this is the first time we're loading ANY card
    // This prevents flicker when hovering between different search results
    if (!hasEverLoaded) {
      setImageLoading(true);
    } else {
      // For card switches after the first load, don't show loading overlay
      setImageLoading(false);
    }
  }, [cardName, hasEverLoaded]);

  const isFoil = preview.foil === true || 
                 preview.isFoil === true || 
                 preview.cardObj?.foil === true || 
                 preview.cardObj?.isFoil === true ||
                 card.foil === true || 
                 card.isFoil === true || 
                 card.card?.foil === true || 
                 card.card?.isFoil === true;

  // Check if this is a double-faced card - check multiple locations
  const cardFaces = card.card_faces || 
                   card.scryfall_json?.card_faces || 
                   card.card?.scryfall_json?.card_faces ||
                   card.card?.card_faces ||
                   preview.scryfall_json?.card_faces ||
                   preview.cardObj?.scryfall_json?.card_faces;
                   
  // Check layout for transform cards
  const layout = card.layout || 
                 card.scryfall_json?.layout || 
                 card.card?.scryfall_json?.layout ||
                 card.card?.layout ||
                 preview.scryfall_json?.layout ||
                 preview.cardObj?.scryfall_json?.layout;
  
  const isTransformCard = layout === 'transform' || 
                         layout === 'modal_dfc' || 
                         layout === 'reversible_card';
                         
  const isDoubleFaced = (cardFaces && Array.isArray(cardFaces) && cardFaces.length >= 2) || isTransformCard;
  
  // Debug log for double-faced detection
  if (cardName.includes('Accursed') || cardName.includes('Infectious')) {
    console.log('Transform card detected:', {
      cardName,
      isDoubleFaced,
      isTransformCard,
      layout,
      cardFaces: cardFaces?.length || 0,
      cardFacesData: cardFaces,
      cardStructure: {
        hasCardFaces: !!card.card_faces,
        hasScryfallCardFaces: !!card.scryfall_json?.card_faces,
        hasNestedCardFaces: !!card.card?.scryfall_json?.card_faces,
        hasPreviewCardFaces: !!preview.scryfall_json?.card_faces,
        layout: layout
      }
    });
  }
  
  let imageUrl;
  
  // PRIORITY 0: User's learned preference (highest priority when not actively flipping)
  const userPreference = PrintingPreferences.get(cardName);
  
  // Get specific printing ID (from modal selection)
  const specificPrintingId = card.printing || card.scryfall_json?.id || card.card?.scryfall_json?.id;
  
  // DEBUG: Log the card data structure to understand what we're working with
  if (cardName === "Arcane Signet") {
    console.log(`[CardPreview DEBUG] ${cardName} data structure:`, {
      card,
      preview,
      userPreference,
      specificPrintingId,
      printingPath1: card.printing,
      printingPath2: card.scryfall_json?.id,
      printingPath3: card.card?.scryfall_json?.id,
      fullCardStructure: JSON.stringify(card, null, 2)
    });
    console.log(`[CardPreview DEBUG] Priority check for ${cardName}:`, {
      hasUserPreference: !!userPreference,
      userPreferenceId: userPreference?.id,
      hasSpecificPrintingId: !!specificPrintingId,
      specificPrintingIdLength: specificPrintingId?.length,
      willUseUserPreference: !!userPreference,
      willUseSpecificPrinting: !userPreference && specificPrintingId && specificPrintingId.length >= 36
    });
  }
  
  // PRIORITY 1: For double-faced cards with active flip state, ALWAYS prioritize flip logic
  // This ensures transform buttons work even when user preferences exist
  if (isDoubleFaced && externalFlipState !== undefined) {
    const faceIndex = currentFlipState ? 1 : 0;
    const selectedFace = cardFaces[faceIndex];
    const cardId = card.id || card.scryfall_json?.id || card.card?.id || card.card?.scryfall_json?.id;
    
    // Debug logging for double-faced cards when actively flipping
    if (cardName.includes('Miles') || cardName.includes('Spider-Man')) {
      console.log('🔄 FLIP DEBUG - Double-faced card image logic (PRIORITY):', {
        cardName,
        currentFlipState,
        faceIndex,
        cardFaces: cardFaces?.length || 0,
        selectedFace: selectedFace ? {
          name: selectedFace.name,
          hasImageUris: !!selectedFace.image_uris,
          imageUris: selectedFace.image_uris
        } : null,
        cardId,
        fullCardFacesArray: cardFaces
      });
    }
    
    if (selectedFace?.image_uris) {
      // Use the direct URL from the selected face - this is the correct URL for the specific face
      const directUrl = selectedFace.image_uris.normal || selectedFace.image_uris.large || selectedFace.image_uris.png;
      
      // Debug logging for double-faced cards when actively flipping  
      if (cardName.includes('Miles') || cardName.includes('Spider-Man')) {
        console.log('🔄 FLIP DEBUG - Processing selectedFace image_uris:', {
          selectedFaceName: selectedFace.name,
          directUrl,
          allImageUris: selectedFace.image_uris
        });
      }
      
      // CRITICAL FIX: Use directUrl directly for double-faced cards
      // Don't reconstruct the URL through getFastImageUrl as it always points to front face
      if (directUrl) {
        imageUrl = directUrl;
        if (cardName.includes('Miles') || cardName.includes('Spider-Man')) {
          console.log('🔄 FLIP DEBUG - Using direct selectedFace image URL:', imageUrl);
        }
      } else if (cardId) {
        imageUrl = getFastImageUrl(cardId);
        if (cardName.includes('Miles') || cardName.includes('Spider-Man')) {
          console.log('🔄 FLIP DEBUG - Fallback to cardId for double-faced card:', imageUrl);
        }
      }
    } else if (cardId) {
      imageUrl = getFastImageUrl(cardId);
      if (cardName.includes('Miles') || cardName.includes('Spider-Man')) {
        console.log('🔄 FLIP DEBUG - Fallback to cardId for double-faced card:', imageUrl);
      }
    }
  }
  // PRIORITY 2: User's learned preference (but only when NOT actively flipping and NOT dual-faced)
  else if (userPreference && userPreference.id && !isDoubleFaced) {
    // Use the user's learned preference for single-faced cards
    imageUrl = getFastImageUrl(userPreference.id);
    if (cardName === "Arcane Signet") {
      console.log(`[CardPreview] 🧠 Using learned preference for ${cardName}: ${userPreference.set.toUpperCase()} #${userPreference.collector_number} (${userPreference.id})`);
    }
  }
  // PRIORITY 3: For double-faced cards, choose the appropriate face (MUST come before specific printing ID)
  else if (isDoubleFaced) {
    // Ensure we have valid cardFaces array
    if (!cardFaces || !Array.isArray(cardFaces) || cardFaces.length === 0) {
      console.warn('[CardPreview] Dual-faced card detected but no valid cardFaces array:', { cardName, cardFaces });
      // Fall back to regular card logic below
    } else {
      const faceIndex = currentFlipState ? 1 : 0;
      const selectedFace = cardFaces[faceIndex] || cardFaces[0]; // Fallback to front face if back face missing
      const cardId = card.id || card.scryfall_json?.id || card.card?.id || card.card?.scryfall_json?.id;
      
      // Debug logging for dual-faced cards
      if (cardName.includes('Miles') || cardName.includes('Spider-Man') || cardName.includes('Accursed') || cardName.includes('Infectious')) {
        console.log('🔄 FLIP DEBUG - Double-faced card image logic:', {
          cardName,
          currentFlipState,
          faceIndex,
          cardFaces: cardFaces?.length || 0,
          selectedFace: selectedFace ? {
            name: selectedFace.name,
            hasImageUris: !!selectedFace.image_uris,
            imageUris: selectedFace.image_uris
          } : null,
          cardId,
          fullCardFacesArray: cardFaces
        });
      }
    
    if (selectedFace?.image_uris) {
      // Use the direct URL from the selected face - this is the correct URL for the specific face
      const directUrl = selectedFace.image_uris.normal || selectedFace.image_uris.large || selectedFace.image_uris.png;
      
      // Debug logging for Accursed Witch
      if (cardName.includes('Miles') || cardName.includes('Spider-Man') || cardName.includes('Accursed') || cardName.includes('Infectious')) {
        console.log('Processing selectedFace image_uris:', {
          selectedFaceName: selectedFace.name,
          directUrl,
          allImageUris: selectedFace.image_uris
        });
      }
      
      // CRITICAL FIX: Use directUrl directly for double-faced cards
      // Don't reconstruct the URL through getFastImageUrl as it always points to front face
      if (directUrl) {
        imageUrl = directUrl;
        if (cardName.includes('Miles') || cardName.includes('Spider-Man') || cardName.includes('Accursed') || cardName.includes('Infectious')) {
          console.log('Using direct selectedFace image URL:', imageUrl);
        }
      } else if (cardId) {
        imageUrl = getFastImageUrl(cardId);
        if (cardName.includes('Miles') || cardName.includes('Spider-Man') || cardName.includes('Accursed') || cardName.includes('Infectious')) {
          console.log('Fallback to cardId for double-faced card:', imageUrl);
        }
      }
    } else if (cardId) {
      imageUrl = getFastImageUrl(cardId);
      if (cardName.includes('Accursed') || cardName.includes('Infectious')) {
        console.log('Fallback to cardId for double-faced card:', imageUrl);
      }
    }
    } // end of else block for valid cardFaces
  }
  // PRIORITY 4: Specific printing ID (from modal selection)
  else if (specificPrintingId && specificPrintingId.length >= 36) {
    // Use the specific printing that was selected in the modal
    imageUrl = getFastImageUrl(specificPrintingId);
    if (cardName === "Arcane Signet") {
      console.log(`[CardPreview] ✅ Using specific printing for ${cardName}: ${specificPrintingId}`);
    }
  }
  
  // PRIORITY 5: Fallback to regular image URL logic
  if (!imageUrl) {
    const cardId = card.id || card.scryfall_json?.id || card.card?.id || card.card?.scryfall_json?.id || card.printing;
    
    // Check all possible locations for image_uris
    let directUrl = null;
    if (card.image_uris) {
      directUrl = card.image_uris.normal || card.image_uris.large || card.image_uris.png;
    } else if (card.scryfall_json && card.scryfall_json.image_uris) {
      directUrl = card.scryfall_json.image_uris.normal || card.scryfall_json.image_uris.large || card.scryfall_json.image_uris.png;
    } else if (card.card && card.card.image_uris) {
      directUrl = card.card.image_uris.normal || card.card.image_uris.large || card.card.image_uris.png;
    } else if (card.card && card.card.scryfall_json && card.card.scryfall_json.image_uris) {
      directUrl = card.card.scryfall_json.image_uris.normal || card.card.scryfall_json.image_uris.large || card.card.scryfall_json.image_uris.png;
    } else if (card.card_faces && card.card_faces[0]?.image_uris) {
      directUrl = card.card_faces[0].image_uris.normal || card.card_faces[0].image_uris.large;
    } else if (preview.scryfall_json?.image_uris) {
      directUrl = preview.scryfall_json.image_uris.normal || preview.scryfall_json.image_uris.large;
    } else if (preview.cardObj?.card?.scryfall_json?.image_uris) {
      directUrl = preview.cardObj.card.scryfall_json.image_uris.normal || preview.cardObj.card.scryfall_json.image_uris.large;
    }

    // Convert direct URL to fast CDN URL if found
    if (directUrl) {
      // Extract card ID from direct URL or use existing card ID
      const match = directUrl.match(/\/([a-f0-9-]{36})\.(jpg|png)/);
      if (match && match[1]) {
        imageUrl = getFastImageUrl(match[1]);
      } else if (cardId) {
        imageUrl = getFastImageUrl(cardId);
      }
    } else if (cardId) {
      imageUrl = getFastImageUrl(cardId);
    }

    // If no direct image_uris found, try fallback URLs
    if (!imageUrl) {
      const set = card.set || card.scryfall_json?.set || card.card?.set || card.card?.scryfall_json?.set;
      const collector_number = card.collector_number || card.scryfall_json?.collector_number || card.card?.collector_number || card.card?.scryfall_json?.collector_number;
      
      if (cardId) {
        // Use fast CDN URL for card ID
        imageUrl = getFastImageUrl(cardId);
      } else if (set && collector_number) {
        // Use set/collector number API call as fallback
        imageUrl = `https://api.scryfall.com/cards/${set.toLowerCase()}/${collector_number}?format=image&version=normal`;
      } else {
        // Use named search as last resort
        imageUrl = `https://api.scryfall.com/cards/named?format=image&version=normal&exact=${encodeURIComponent(cardName)}`;
      }
    }
  }

  const { top, left } = preview.position || { top: 100, left: 100 };

  const containerStyle = isFixed
    ? { width: "100%", height: "auto" }
    : {
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 1000,
        width: "250px", // Keep fixed width for floating preview
      };

  const imageStyle = {
    width: isFixed ? "100%" : "250px",
    height: "auto",
    borderRadius: "10px",
    display: "block",
  };

  const containerClassName = `card-preview-container ${isFixed ? "fixed-preview" : ""}`;
  
  return (
    <div
      className={containerClassName}
      style={{
        ...containerStyle,
        overflow: "hidden",
        borderRadius: "10px"
      }}
    >
      {imageLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "10px",
            fontSize: "14px",
            color: "#666"
          }}
        >
          Loading...
        </div>
      )}
      
      <img
        src={imageUrl}
        alt={cardName}
        style={imageStyle}
        onError={() => {
          setImageLoading(false);
          if (!imageError) {
            setImageError(true);
            // Try fallback to named search if direct URL fails
            const fallbackUrl = `https://api.scryfall.com/cards/named?format=image&version=normal&exact=${encodeURIComponent(cardName)}`;
            if (imageUrl !== fallbackUrl) {
              // Set fallback URL
              const imgElement = document.querySelector(`img[alt="${cardName}"]`);
              if (imgElement) {
                imgElement.src = fallbackUrl;
              }
            }
          }
        }}
        onLoad={() => {
          setImageError(false);
          setImageLoading(false);
          setHasEverLoaded(true);
        }}
      />
      
      {/* Flip button removed - flip functionality now handled by deck card row flip icon */}
      
      {isFoil && (
        <div 
          className="fresh-foil-overlay"
          data-foil={isFoil}
          data-testid="foil-overlay"
        />
      )}
    </div>
  );
  } catch (error) {
    console.error('[CardPreview] Caught error to prevent crash:', error);
    console.error('[CardPreview] Error details:', { preview, card: preview?.card || preview, error: error.message });
    // Return fallback UI instead of crashing
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#666',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9'
      }}>
        <div>Preview Error</div>
        <div style={{ fontSize: '12px', marginTop: '5px' }}>
          Card data unavailable
        </div>
      </div>
    );
  }
}
