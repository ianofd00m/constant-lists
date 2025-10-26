import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'src', 'components', 'DeckViewEdit.jsx');

function fixJsxSyntaxError() {
  // Read the original file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Extract the CardGroupSortOptions function into a separate component
  const cardGroupSortOptionsPattern = /function CardGroupSortOptions.*?\}\n}/s;
  const cardGroupSortOptionsMatch = content.match(cardGroupSortOptionsPattern);
  
  if (!cardGroupSortOptionsMatch) {
    console.error('Could not find CardGroupSortOptions function');
    return;
  }
  
  // Extract the component code
  const cardGroupSortOptionsCode = cardGroupSortOptionsMatch[0];
  
  // 2. Create a separate file for the CardGroupSortOptions component
  const cardGroupSortOptionsPath = path.join(__dirname, 'src', 'components', 'CardGroupSortOptions.jsx');
  
  // Wrap the component in proper React imports and exports
  const componentFileContent = `import React from 'react';

${cardGroupSortOptionsCode}

export default CardGroupSortOptions;
`;

  // Write the new component file
  fs.writeFileSync(cardGroupSortOptionsPath, componentFileContent, 'utf8');
  
  console.log('✅ Created separate CardGroupSortOptions.jsx component');
  
  // 3. Remove the CardGroupSortOptions function from the DeckViewEdit file
  const mainComponentCode = content.replace(cardGroupSortOptionsPattern, '');
  
  // 4. Import the new component in DeckViewEdit
  const importStatement = `import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CARD_TYPE_HINTS, getMainCardType } from './cardTypeHints';
import { fetchOtagRecommendations } from '../utils/fetchOtagRecommendations';
import debounce from 'lodash.debounce';
import CardModal from './CardModal';
import CardPreview from './CardPreview';
import CardTypeHeader from './CardTypeHeader';
import CardGroupSortOptions from './CardGroupSortOptions';`;
  
  const updatedCode = mainComponentCode.replace(/import React.*?;(\s*import.*?;)*/, importStatement);
  
  // Write the updated DeckViewEdit file
  fs.writeFileSync(filePath, updatedCode, 'utf8');
  
  console.log('✅ Updated DeckViewEdit.jsx with import for CardGroupSortOptions');
}

fixJsxSyntaxError();
