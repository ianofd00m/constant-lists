import React, { useState, useEffect, useCallback } from 'react';
import './OracleTagsIntegration.css';

/**
 * Oracle Tags Integration Component
 * Loads oracle tags from CSV and displays them in CardActionsModal
 * Provides clickable tags that trigger searches
 */
const OracleTagsIntegration = ({ card, onOracleTagSearch }) => {
  const [oracleTags, setOracleTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [oracleTagsData, setOracleTagsData] = useState(new Map());

  // Load oracle tags data once when component mounts
  useEffect(() => {
    loadOracleTagsData();
  }, []);

  // Update tags when card changes
  useEffect(() => {
    if (card && oracleTagsData.size > 0) {
      const cardName = getCardName(card);
      if (cardName) {
        const tags = oracleTagsData.get(cardName.toLowerCase());
        setOracleTags(tags || []);
      }
    }
  }, [card, oracleTagsData]);

  const getCardName = (cardObj) => {
    // Extract card name from various possible structures
    if (cardObj.name) return cardObj.name;
    if (cardObj.cardObj?.name) return cardObj.cardObj.name;
    if (cardObj.cardObj?.card?.name) return cardObj.cardObj.card.name;
    if (cardObj.scryfall_json?.name) return cardObj.scryfall_json.name;
    if (cardObj.cardObj?.scryfall_json?.name) return cardObj.cardObj.scryfall_json.name;
    if (cardObj.cardObj?.card?.scryfall_json?.name) return cardObj.cardObj.card.scryfall_json.name;
    return null;
  };

  const loadOracleTagsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[OracleTagsIntegration] Loading oracle tags data from CSV...');
      
      // Load the CSV file from public folder
      const response = await fetch('/scryfall-COMPLETE-oracle-tags-2025-08-08.csv');
      
      if (!response.ok) {
        throw new Error(`Failed to load oracle tags CSV: ${response.status} ${response.statusText}`);
      }
      
      const csvText = await response.text();
      const lines = csvText.split('\n');
      
      console.log(`[OracleTagsIntegration] Loaded CSV with ${lines.length} lines`);
      
      const dataMap = new Map();
      let processedCount = 0;
      
      // Skip header row and process data
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
          // Parse CSV line (handle quoted fields)
          const match = line.match(/^"([^"]+)","(.+)"$/);
          if (match) {
            const cardName = match[1];
            const tagsString = match[2];
            const tags = tagsString.split('|').map(tag => tag.trim()).filter(tag => tag.length > 0);
            
            // Store with lowercase key for case-insensitive lookup
            dataMap.set(cardName.toLowerCase(), tags);
            processedCount++;
          }
        } catch (parseError) {
          console.warn(`[OracleTagsIntegration] Error parsing line ${i}:`, parseError);
        }
      }
      
      setOracleTagsData(dataMap);
      setLoading(false);
      
      console.log(`[OracleTagsIntegration] ✅ Successfully loaded oracle tags for ${processedCount} cards`);
      
    } catch (err) {
      console.error('[OracleTagsIntegration] Error loading oracle tags:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleTagClick = useCallback((tag) => {
    console.log(`[OracleTagsIntegration] 🔍 Oracle tag clicked: ${tag}`);
    
    if (onOracleTagSearch) {
      // Use the parent's search function
      onOracleTagSearch(tag);
    } else {
      // Fallback: show alert with search info
      alert(`Searching for cards with oracle tag: "${tag}"\n\nThis would normally trigger a search in your app.`);
    }
  }, [onOracleTagSearch]);

  const groupTags = (tags) => {
    const groups = {
      'Mechanics & Effects': [],
      'Card Types & Attributes': [],
      'Colors & Identity': [],
      'Competitive & Formats': [],
      'Tribal & Themes': [],
      'Other Functions': []
    };

    for (const tag of tags) {
      const lowerTag = tag.toLowerCase();
      
      // Mechanics & Effects
      if (lowerTag.includes('removal') || lowerTag.includes('counter') || 
          lowerTag.includes('draw') || lowerTag.includes('ramp') || 
          lowerTag.includes('acceleration') || lowerTag.includes('burn') ||
          lowerTag.includes('control') || lowerTag.includes('damage') ||
          lowerTag.includes('protection') || lowerTag.includes('tutor') ||
          lowerTag.includes('graveyard') || lowerTag.includes('exile') ||
          lowerTag.includes('bounce') || lowerTag.includes('flicker') ||
          lowerTag.includes('sacrifice') || lowerTag.includes('token') ||
          lowerTag.includes('buff') || lowerTag.includes('debuff') ||
          lowerTag.includes('tap') || lowerTag.includes('untap')) {
        groups['Mechanics & Effects'].push(tag);
      }
      // Card Types & Attributes
      else if (lowerTag.includes('creature') || lowerTag.includes('instant') ||
               lowerTag.includes('sorcery') || lowerTag.includes('artifact') ||
               lowerTag.includes('enchantment') || lowerTag.includes('planeswalker') ||
               lowerTag.includes('legendary') || lowerTag.includes('historic') ||
               lowerTag.includes('permanent') || lowerTag.includes('spell') ||
               lowerTag.includes('nonland') || lowerTag.includes('mana-cost') ||
               lowerTag.includes('cmc') || lowerTag.includes('power') ||
               lowerTag.includes('toughness') || lowerTag.includes('evasion') ||
               lowerTag.includes('flying') || lowerTag.includes('trample') ||
               lowerTag.includes('lifelink') || lowerTag.includes('deathtouch') ||
               lowerTag.includes('vigilance') || lowerTag.includes('haste') ||
               lowerTag.includes('reach') || lowerTag.includes('first-strike') ||
               lowerTag.includes('double-strike') || lowerTag.includes('menace') ||
               lowerTag.includes('hexproof') || lowerTag.includes('indestructible')) {
        groups['Card Types & Attributes'].push(tag);
      }
      // Colors & Identity
      else if (lowerTag.includes('white') || lowerTag.includes('blue') ||
               lowerTag.includes('black') || lowerTag.includes('red') ||
               lowerTag.includes('green') || lowerTag.includes('colorless') ||
               lowerTag.includes('multicolor') || lowerTag.includes('mono') ||
               lowerTag.includes('color') || lowerTag.includes('identity') ||
               lowerTag.includes('hybrid') || lowerTag.includes('gold') ||
               lowerTag.includes('artifact-creature') || lowerTag.includes('devoid')) {
        groups['Colors & Identity'].push(tag);
      }
      // Competitive & Formats
      else if (lowerTag.includes('legal') || lowerTag.includes('banned') ||
               lowerTag.includes('restricted') || lowerTag.includes('standard') ||
               lowerTag.includes('modern') || lowerTag.includes('legacy') ||
               lowerTag.includes('vintage') || lowerTag.includes('commander') ||
               lowerTag.includes('edh') || lowerTag.includes('pauper') ||
               lowerTag.includes('pioneer') || lowerTag.includes('historic') ||
               lowerTag.includes('competitive') || lowerTag.includes('casual') ||
               lowerTag.includes('tournament') || lowerTag.includes('meta') ||
               lowerTag.includes('staple') || lowerTag.includes('sideboard') ||
               lowerTag.includes('mainboard')) {
        groups['Competitive & Formats'].push(tag);
      }
      // Tribal & Themes
      else if (lowerTag.includes('tribal') || lowerTag.includes('typal') ||
               lowerTag.includes('kindred') || lowerTag.includes('synergy') ||
               lowerTag.includes('archetype') || lowerTag.includes('deck') ||
               lowerTag.includes('strategy') || lowerTag.includes('combo') ||
               lowerTag.includes('engine') || lowerTag.includes('package') ||
               lowerTag.includes('theme') || lowerTag.includes('build-around') ||
               lowerTag.includes('win-condition') || lowerTag.includes('finisher') ||
               lowerTag.includes('enabler') || lowerTag.includes('payoff')) {
        groups['Tribal & Themes'].push(tag);
      }
      // Everything else
      else {
        groups['Other Functions'].push(tag);
      }
    }

    // Filter out empty groups
    return Object.fromEntries(
      Object.entries(groups).filter(([_, tags]) => tags.length > 0)
    );
  };

  const formatTagName = (tag) => {
    return tag
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Mechanics & Effects': { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
      'Card Types & Attributes': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
      'Colors & Identity': { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
      'Competitive & Formats': { bg: '#f3e8ff', border: '#8b5cf6', text: '#5b21b6' },
      'Tribal & Themes': { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
      'Other Functions': { bg: '#f1f5f9', border: '#64748b', text: '#334155' }
    };
    return colors[category] || colors['Other Functions'];
  };

  if (loading) {
    return (
      <div className="oracle-tags-integration loading">
        <div className="oracle-tags-header">
          <span className="oracle-tags-icon">🏷️</span>
          <span className="oracle-tags-title">Loading Oracle Tags...</span>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="oracle-tags-integration error">
        <div className="oracle-tags-header">
          <span className="oracle-tags-icon">⚠️</span>
          <span className="oracle-tags-title">Oracle Tags Error</span>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!oracleTags || oracleTags.length === 0) {
    return (
      <div className="oracle-tags-integration no-tags">
        <div className="oracle-tags-header">
          <span className="oracle-tags-icon">🏷️</span>
          <span className="oracle-tags-title">Oracle Tags</span>
        </div>
        <div className="no-tags-message">No functional tags found for this card</div>
      </div>
    );
  }

  const groupedTags = groupTags(oracleTags);

  return (
    <div className="oracle-tags-integration">
      <div className="oracle-tags-header">
        <span className="oracle-tags-icon">🏷️</span>
        <span className="oracle-tags-title">Functional Oracle Tags ({oracleTags.length})</span>
      </div>
      
      <div className="oracle-tags-content">
        {(() => {
          const categoriesArray = Object.entries(groupedTags);
          const leftColumn = [];
          const rightColumn = [];
          let leftTagCount = 0;
          let rightTagCount = 0;
          
          // Distribute categories to balance total tag count across columns
          categoriesArray.forEach(([category, tags]) => {
            if (leftTagCount <= rightTagCount) {
              leftColumn.push([category, tags]);
              leftTagCount += tags.length;
            } else {
              rightColumn.push([category, tags]);
              rightTagCount += tags.length;
            }
          });
          
          return (
            <>
              <div className="oracle-tags-column">
                {leftColumn.map(([category, tags]) => (
                  <div key={category} className="oracle-tags-category">
                    <div className="category-header">
                      <span className="category-name">{category}</span>
                      <span className="category-count">({tags.length})</span>
                    </div>
                    
                    <div className="oracle-tags-list">
                      {tags.map((tag) => {
                        const colors = getCategoryColor(category);
                        return (
                          <button
                            key={tag}
                            className="oracle-tag"
                            style={{
                              '--tag-bg': colors.bg,
                              '--tag-border': colors.border,
                              '--tag-text': colors.text
                            }}
                            onClick={() => handleTagClick(tag)}
                            title={`Search for cards with "${tag}" functionality`}
                          >
                            {formatTagName(tag)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="oracle-tags-column">
                {rightColumn.map(([category, tags]) => (
                  <div key={category} className="oracle-tags-category">
                    <div className="category-header">
                      <span className="category-name">{category}</span>
                      <span className="category-count">({tags.length})</span>
                    </div>
                    
                    <div className="oracle-tags-list">
                      {tags.map((tag) => {
                        const colors = getCategoryColor(category);
                        return (
                          <button
                            key={tag}
                            className="oracle-tag"
                            style={{
                              '--tag-bg': colors.bg,
                              '--tag-border': colors.border,
                              '--tag-text': colors.text
                            }}
                            onClick={() => handleTagClick(tag)}
                            title={`Search for cards with "${tag}" functionality`}
                          >
                            {formatTagName(tag)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>
      
      <div className="oracle-tags-footer">
        <span className="search-hint">💡 Click any tag to search for similar cards</span>
      </div>
    </div>
  );
};

export default OracleTagsIntegration;
