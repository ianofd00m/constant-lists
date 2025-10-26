import React, { useEffect, useRef } from 'react';

/**
 * OTAG Integration Component for React Deck Builder
 * This component integrates the production OTAG system with your existing React app
 */
const OtagIntegration = ({ isModalOpen, cardName, modalRef }) => {
  const integrationRef = useRef(null);
  const lastCardName = useRef(null);
  const enhancementTimeout = useRef(null);

  useEffect(() => {
    console.log('🔧 OtagIntegration useEffect triggered:', { isModalOpen, cardName, hasModalRef: !!modalRef?.current });
    
    if (enhancementTimeout.current) {
      clearTimeout(enhancementTimeout.current);
    }

    // Wait for OTAG system to be ready
    const checkOtagSystem = () => {
      console.log('🔍 Checking OTAG system availability...');
      
      if (window.productionOtagSystem) {
        console.log('✅ OTAG system found, checking if loaded...');
        
        if (window.productionOtagSystem.isDataLoaded && window.productionOtagSystem.isDataLoaded()) {
          console.log('✅ OTAG data loaded, proceeding with enhancement');
          enhanceModalWithOtag();
        } else {
          console.log('⏳ OTAG data not loaded yet, using fallback data...');
          // Still try to enhance with fallback data
          enhanceModalWithOtag();
        }
      } else {
        console.log('⚠️ OTAG system not found, retrying in 200ms...');
        // Retry in 200ms if system not ready
        enhancementTimeout.current = setTimeout(checkOtagSystem, 200);
      }
    };

    const enhanceModalWithOtag = () => {
      if (!isModalOpen || !cardName || !modalRef?.current) {
        console.log('❌ Enhancement conditions not met:', { isModalOpen, cardName, hasModalRef: !!modalRef?.current });
        return;
      }

      // Skip if same card to avoid duplicate enhancement
      if (lastCardName.current === cardName) {
        console.log('⏭️ Same card as last time, skipping enhancement');
        return;
      }

      lastCardName.current = cardName;

      console.log(`🏷️ Starting OTAG enhancement for: ${cardName}`);
      
      // Remove any existing OTAG enhancement
      const existingOtag = modalRef.current.querySelector('.otag-enhancement');
      if (existingOtag) {
        console.log('🗑️ Removing existing OTAG enhancement');
        existingOtag.remove();
      }
      
      // Get OTAG data for this card
      let cardData = null;
      if (window.productionOtagSystem && window.productionOtagSystem.getCardOtags) {
        cardData = window.productionOtagSystem.getCardOtags(cardName);
      }
      
      if (!cardData || !cardData.otags || cardData.otags.length === 0) {
        console.log(`🔍 No OTAG data found for: ${cardName}, creating fallback data`);
        // Create fallback data for testing
        cardData = createFallbackData(cardName);
        if (!cardData) {
          console.log(`❌ No fallback data available for: ${cardName}`);
          return;
        }
      }

      console.log(`📊 OTAG data for ${cardName}:`, cardData);

      // Create OTAG display
      const otagDisplay = createOtagDisplay(cardData);
      
      // Find the best place to insert OTAG data in your modal
      const insertionPoint = findModalInsertionPoint(modalRef.current);
      if (insertionPoint) {
        insertionPoint.appendChild(otagDisplay);
        console.log(`✅ OTAG enhancement added to ${cardName} modal`);
      } else {
        console.log(`❌ Could not find insertion point in modal for ${cardName}`);
      }
    };

    if (isModalOpen && cardName) {
      // Small delay to ensure modal is fully rendered
      enhancementTimeout.current = setTimeout(checkOtagSystem, 100);
    }

    // Cleanup when modal closes or card changes
    return () => {
      if (enhancementTimeout.current) {
        clearTimeout(enhancementTimeout.current);
      }
      
      if (!isModalOpen) {
        lastCardName.current = null;
      }
    };
  }, [isModalOpen, cardName, modalRef]);

  const createFallbackData = (cardName) => {
    const fallbackCards = {
      'Lightning Bolt': { 
        cardName: 'Lightning Bolt',
        otags: ['removal', 'direct-damage', 'instant', 'mono-red', 'legal-in-legacy', 'legal-in-modern', 'legal-in-commander', 'burn'],
        typeLine: 'Instant',
        colors: 'R',
        cmc: 1
      },
      'Sol Ring': { 
        cardName: 'Sol Ring',
        otags: ['mana-acceleration', 'artifact', 'colorless', 'ramp', 'legal-in-legacy', 'legal-in-commander', 'fast-mana'],
        typeLine: 'Artifact',
        colors: '',
        cmc: 1
      },
      'Counterspell': { 
        cardName: 'Counterspell',
        otags: ['counterspell', 'instant', 'mono-blue', 'control', 'legal-in-legacy', 'legal-in-modern'],
        typeLine: 'Instant',
        colors: 'U',
        cmc: 2
      },
      'Birds of Paradise': { 
        cardName: 'Birds of Paradise',
        otags: ['mana-acceleration', 'creature', 'flying', 'mono-green', 'ramp', 'mana-fixing'],
        typeLine: 'Creature — Bird',
        colors: 'G',
        cmc: 1
      },
      'Wolverine, Best There Is': {
        cardName: 'Wolverine, Best There Is',
        otags: ['creature', 'legendary', 'human', 'mutant', 'warrior', 'aggressive', 'regeneration', 'combat-focused'],
        typeLine: 'Legendary Creature — Human Mutant Warrior',
        colors: 'RG',
        cmc: 3
      }
    };
    
    return fallbackCards[cardName] || null;
  };

  const createOtagDisplay = (cardData) => {
    const container = document.createElement('div');
    container.className = 'otag-enhancement';
    container.style.cssText = `
      margin: 15px 0;
      padding: 15px;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border-radius: 12px;
      border: 2px solid #cbd5e1;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    // Title
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    title.innerHTML = `🏷️ Functional Tags (${cardData.otags.length})`;
    container.appendChild(title);
    
    // Group OTAGs by category
    const groupedOtags = groupOtags(cardData.otags);
    
    // Create sections for each category
    for (const [category, tags] of Object.entries(groupedOtags)) {
      if (tags.length === 0) continue;
      
      const section = document.createElement('div');
      section.style.marginBottom = '10px';
      
      const categoryLabel = document.createElement('div');
      categoryLabel.style.cssText = `
        font-size: 12px;
        font-weight: 600;
        color: #64748b;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;
      categoryLabel.textContent = `${category} (${tags.length})`;
      section.appendChild(categoryLabel);
      
      const tagContainer = document.createElement('div');
      tagContainer.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 8px;
      `;
      
      for (const tag of tags) {
        const tagElement = createOtagTag(tag, category);
        tagContainer.appendChild(tagElement);
      }
      
      section.appendChild(tagContainer);
      container.appendChild(section);
    }
    
    // Add search hint
    const hint = document.createElement('div');
    hint.style.cssText = `
      font-size: 11px;
      color: #64748b;
      font-style: italic;
      margin-top: 8px;
      text-align: center;
    `;
    hint.textContent = '💡 Click any tag to search for similar cards';
    container.appendChild(hint);
    
    return container;
  };

  const groupOtags = (otags) => {
    const groups = {
      'FUNCTIONS': [],
      'COLORS': [],
      'FORMATS': [],
      'MECHANICS': [],
      'TYPES': [],
      'OTHER': []
    };
    
    for (const otag of otags) {
      const lowerOtag = otag.toLowerCase();
      
      if (lowerOtag.includes('removal') || lowerOtag.includes('damage') || 
          lowerOtag.includes('counter') || lowerOtag.includes('draw') ||
          lowerOtag.includes('ramp') || lowerOtag.includes('acceleration') ||
          lowerOtag.includes('burn') || lowerOtag.includes('control')) {
        groups.FUNCTIONS.push(otag);
      } else if (lowerOtag.includes('color') || lowerOtag.includes('red') || 
                lowerOtag.includes('blue') || lowerOtag.includes('green') ||
                lowerOtag.includes('white') || lowerOtag.includes('black') ||
                lowerOtag.includes('mono') || lowerOtag.includes('colorless')) {
        groups.COLORS.push(otag);
      } else if (lowerOtag.includes('legal') || lowerOtag.includes('format') ||
                lowerOtag.includes('standard') || lowerOtag.includes('modern') ||
                lowerOtag.includes('legacy') || lowerOtag.includes('commander')) {
        groups.FORMATS.push(otag);
      } else if (lowerOtag.includes('flying') || lowerOtag.includes('haste') ||
                lowerOtag.includes('trample') || lowerOtag.includes('lifelink') ||
                lowerOtag.includes('regeneration') || lowerOtag.includes('aggressive')) {
        groups.MECHANICS.push(otag);
      } else if (lowerOtag.includes('creature') || lowerOtag.includes('instant') ||
                lowerOtag.includes('sorcery') || lowerOtag.includes('artifact') ||
                lowerOtag.includes('enchantment') || lowerOtag.includes('legendary')) {
        groups.TYPES.push(otag);
      } else {
        groups.OTHER.push(otag);
      }
    }
    
    return groups;
  };

  const createOtagTag = (otag, category) => {
    const tag = document.createElement('button');
    tag.textContent = formatOtagName(otag);
    tag.setAttribute('data-otag', otag);
    tag.setAttribute('data-category', category);
    
    // Category-based styling
    const categoryColors = {
      'FUNCTIONS': { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
      'COLORS': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
      'FORMATS': { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
      'MECHANICS': { bg: '#f3e8ff', border: '#8b5cf6', text: '#5b21b6' },
      'TYPES': { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
      'OTHER': { bg: '#f1f5f9', border: '#64748b', text: '#334155' }
    };
    
    const colors = categoryColors[category] || categoryColors.OTHER;
    
    tag.style.cssText = `
      background: ${colors.bg};
      border: 1px solid ${colors.border};
      color: ${colors.text};
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    `;
    
    // Hover effect
    tag.addEventListener('mouseenter', () => {
      tag.style.transform = 'translateY(-1px)';
      tag.style.boxShadow = `0 2px 8px ${colors.border}40`;
    });
    
    tag.addEventListener('mouseleave', () => {
      tag.style.transform = 'translateY(0)';
      tag.style.boxShadow = 'none';
    });
    
    // Click handler for search
    tag.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleOtagSearch(otag);
    });
    
    return tag;
  };

  const formatOtagName = (otag) => {
    return otag
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleOtagSearch = (otag) => {
    console.log(`🔍 Searching for OTAG: ${otag}`);
    
    // Use your existing search modal function
    if (typeof window.showAllResultsModal === 'function') {
      // Create mock results for testing
      const mockResults = {
        data: [
          { name: 'Example Card 1', type_line: 'Instant', mana_cost: '{R}' },
          { name: 'Example Card 2', type_line: 'Creature', mana_cost: '{1}{R}' },
        ],
        total_cards: 2,
        has_more: false,
        object: 'list'
      };
      
      const searchQuery = `OTAG: ${formatOtagName(otag)}`;
      window.showAllResultsModal(mockResults, searchQuery);
      console.log(`✅ Opened search modal for: ${searchQuery}`);
    } else {
      console.error('showAllResultsModal function not found');
      alert(`Searching for cards with "${formatOtagName(otag)}" functionality...`);
    }
  };

  const findModalInsertionPoint = (modal) => {
    console.log('🔍 Looking for insertion point in modal...');
    
    // Try to find a good place to insert OTAG data in your modal structure
    const candidates = [
      modal.querySelector('.modal-body'),
      modal.querySelector('.card-details'),
      modal.querySelector('.card-info'),
      modal.querySelector('.card-content'),
      modal.querySelector('[class*="card"]'),
      modal
    ];
    
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      if (candidate) {
        console.log(`✅ Found insertion point: ${candidate.className || candidate.tagName}`);
        return candidate;
      }
    }
    
    console.log('⚠️ Using modal as insertion point');
    return modal;
  };

  // This component doesn't render anything - it just handles OTAG integration
  return null;
};

// Both default and named exports for maximum compatibility
export { OtagIntegration };
export default OtagIntegration;
