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
        return (
          <img
            key={index}
            src={`/svgs/${symbolCode.toLowerCase()}.svg`}
            alt={symbol}
            className="mana-symbol"
            onError={(e) => {
              e.target.outerHTML = symbol;
            }}
            data-no-qr-scan="true"
            loading="lazy"
          />
        );
      })}
    </span>
  );
});

ManaCost.displayName = 'ManaCost';

export default ManaCost;
