import React from 'react';

const ManaCost = React.memo(({ manaCost }) => {
  if (!manaCost) {
    return null;
  }

  const manaSymbols = manaCost.match(/\{([^}]+)\}/g) || [];

  return (
    <span className="mana-cost">
      {manaSymbols.map((symbol, index) => {
        const symbolCode = symbol.substring(1, symbol.length - 1).replace('/', '');
        const imageUrl = `https://svgs.scryfall.io/card-symbols/${symbolCode}.svg`;
        return (
          <img
            key={index}
            src={imageUrl}
            alt={symbol}
            className="mana-symbol"
          />
        );
      })}
    </span>
  );
});

ManaCost.displayName = 'ManaCost';

export default ManaCost;
