import React from 'react';
import CardActionsModal from './CardActionsModal';

/**
 * Wrapper component for CardActionsModal that ensures consistent props
 * to prevent React hooks order violations when used in different contexts
 */
const CardActionsModalWrapper = ({ 
  card, 
  isOpen, 
  onClose, 
  userDecks,
  // Optional props with defaults
  onUpdateCard = null,
  onRemoveCard = null,
  onMoveToSideboard = null,
  onMoveToTechIdeas = null,
  onAddToCollection = null,
  updatingPrinting = false,
  cardPrice = null,
  onPreviewUpdate = null,
  onOracleTagSearch = null,
  onNavigateToPrevious = null,
  onNavigateToNext = null
}) => {
  // Default functions that are used by useCallback dependencies should be stable
  const noOpFunction = () => {};
  
  // Ensure all props are defined with safe defaults
  // IMPORTANT: For props that are useCallback dependencies, provide stable functions
  // For props only used in conditional checks, use null to prevent unnecessary renders
  const safeProps = {
    card,
    isOpen,
    onClose,
    userDecks,
    onUpdateCard: onUpdateCard || null,
    onRemoveCard: onRemoveCard || null,
    onMoveToSideboard: onMoveToSideboard || null,
    onMoveToTechIdeas: onMoveToTechIdeas || null,
    onAddToCollection: onAddToCollection || null,
    updatingPrinting: Boolean(updatingPrinting),
    cardPrice: cardPrice || null,
    onPreviewUpdate: onPreviewUpdate || null,
    // onOracleTagSearch is used in useCallback dependencies, provide stable function
    onOracleTagSearch: onOracleTagSearch || noOpFunction,
    onNavigateToPrevious: onNavigateToPrevious || null,
    onNavigateToNext: onNavigateToNext || null
  };

  return <CardActionsModal {...safeProps} />;
};

export default CardActionsModalWrapper;
