import React from 'react';

/**
 * Card type header component similar to Moxfield style
 * Supports clicking to select all cards in bulk edit mode
 */
function CardTypeHeader({ type, count, onClick, isClickable = false }) {
  return (
    <div 
      className={`card-type-header ${isClickable ? 'clickable-header' : ''}`} 
      data-type={type}
      onClick={onClick}
      style={{ 
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'background-color 0.2s',
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
      <span className="card-type-name">{type}</span>
      <span className="card-type-count">({count})</span>
      {isClickable && (
        <span style={{ 
          marginLeft: 'auto', 
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
