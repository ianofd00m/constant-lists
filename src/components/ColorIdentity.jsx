import React from 'react';

const ColorIdentity = React.memo(({ colorIdentity, size = 16 }) => {
  if (!colorIdentity || !Array.isArray(colorIdentity) || colorIdentity.length === 0) {
    // Return colorless mana symbol if no color identity
    return (
      <img
        src="https://svgs.scryfall.io/card-symbols/C.svg"
        alt="Colorless"
        style={{ 
          width: size, 
          height: size, 
          marginRight: 2, 
          verticalAlign: 'middle' 
        }}
      />
    );
  }

  return (
    <span className="color-identity">
      {colorIdentity.map((color, index) => {
        const imageUrl = `https://svgs.scryfall.io/card-symbols/${color}.svg`;
        return (
          <img
            key={index}
            src={imageUrl}
            alt={color}
            style={{ 
              width: size, 
              height: size, 
              marginRight: 2, 
              verticalAlign: 'middle' 
            }}
          />
        );
      })}
    </span>
  );
});

ColorIdentity.displayName = 'ColorIdentity';

export default ColorIdentity;
