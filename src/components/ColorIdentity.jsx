import React from 'react';

const ColorIdentity = React.memo(({ colorIdentity, size = 12 }) => {
  if (!colorIdentity || !Array.isArray(colorIdentity) || colorIdentity.length === 0) {
    // Return colorless mana symbol if no color identity
    return (
      <img
        src="/svgs/c.svg"
        alt="Colorless"
        style={{ 
          width: size, 
          height: size, 
          marginRight: 2, 
          verticalAlign: 'middle' 
        }}
        onError={(e) => {
          e.target.outerHTML = 'C';
        }}
        data-no-qr-scan="true"
        loading="lazy"
      />
    );
  }

  return (
    <span className="color-identity">
      {colorIdentity.map((color, index) => {
        return (
          <img
            key={index}
            src={`/svgs/${color.toLowerCase()}.svg`}
            alt={color}
            style={{ 
              width: size, 
              height: size, 
              marginRight: 2, 
              verticalAlign: 'middle' 
            }}
            onError={(e) => {
              e.target.outerHTML = color;
            }}
            data-no-qr-scan="true"
            loading="lazy"
          />
        );
      })}
    </span>
  );
});

ColorIdentity.displayName = 'ColorIdentity';

export default ColorIdentity;
