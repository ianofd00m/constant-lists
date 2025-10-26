import React from 'react';

// Helper function to get type icon
const getTypeIconSrc = (type) => {
  const lowerType = type.toLowerCase();
  
  // Map card types to SVG filenames
  if (lowerType.includes('commander')) return '/svgs/cmd.svg';
  if (lowerType.includes('creature')) return '/svgs/creature.svg';
  if (lowerType.includes('planeswalker')) return '/svgs/planeswalker.svg';
  if (lowerType.includes('instant')) return '/svgs/instant.svg';
  if (lowerType.includes('sorcery')) return '/svgs/sorcery.svg';
  if (lowerType.includes('artifact')) return '/svgs/artifact.svg';
  if (lowerType.includes('enchantment')) return '/svgs/enchantment.svg';
  if (lowerType.includes('land')) return '/svgs/land.svg';
  
  return null;
};

/**
 * Card type header component similar to Moxfield style
 * Supports clicking to select all cards in bulk edit mode
 */
function CardTypeHeader({ type, count, onClick, isClickable = false }) {
  const typeIconSrc = getTypeIconSrc(type);
  
  return (
    <div 
      className={`card-type-header ${isClickable ? 'clickable-header' : ''}`} 
      data-type={type}
      onClick={onClick}
      style={{ 
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'background-color 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
      onMouseEnter={(e) => {
        if (isClickable) {
          e.target.style.backgroundColor = '#f0f8ff';
        }
      }}
      onMouseLeave={(e) => {
        if (isClickable) {
          e.target.style.backgroundColor = 'transparent';
        }
      }}
      title={isClickable ? `Click to select/deselect all ${type} cards` : undefined}
    >
      {typeIconSrc && (
        <img
          src={typeIconSrc}
          alt={type}
          style={{
            width: '16px',
            height: '16px',
            opacity: 0.8
          }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      )}
      <span className="card-type-name">{type}</span>
      <span className="card-type-count">({count})</span>
      {isClickable && (
        <span style={{ 
          marginLeft: 'auto', 
          marginRight: '4px',
          marginTop: '2px',
          fontSize: '11px', 
          color: '#666',
          fontWeight: 'normal' 
        }}>
          click to select all
        </span>
      )}
    </div>
  );
}

export default CardTypeHeader;
