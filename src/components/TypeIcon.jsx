import React from 'react';

// Helper function to get main card type from type_line
const getMainCardType = (typeLine) => {
  if (!typeLine || typeof typeLine !== 'string') return null;
  
  // Check for main types in order of priority
  const lowerTypeLine = typeLine.toLowerCase();
  
  if (lowerTypeLine.includes('creature')) return 'creature';
  if (lowerTypeLine.includes('planeswalker')) return 'planeswalker';
  if (lowerTypeLine.includes('instant')) return 'instant';
  if (lowerTypeLine.includes('sorcery')) return 'sorcery';
  if (lowerTypeLine.includes('artifact')) return 'artifact';
  if (lowerTypeLine.includes('enchantment')) return 'enchantment';
  if (lowerTypeLine.includes('land')) return 'land';
  
  return null;
};

const TypeIcon = React.memo(({ typeLine, size = 16, className = '', style = {} }) => {
  const mainType = getMainCardType(typeLine);
  
  if (!mainType) {
    return null;
  }
  
  return (
    <img
      src={`/svgs/${mainType}.svg`}
      alt={mainType}
      title={typeLine}
      className={`type-icon ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style
      }}
      onError={(e) => {
        // Hide the icon if the SVG fails to load
        e.target.style.display = 'none';
      }}
    />
  );
});

TypeIcon.displayName = 'TypeIcon';

export default TypeIcon;