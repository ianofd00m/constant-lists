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

  // Wait for Production OTAG System to be ready AND database to be loaded
  useEffect(() => {
    const checkOtagReady = () => {
      if (window.productionOtagSystem && window.productionOtagSystem.isReady) {
        console.log('[OracleTagsIntegration] Production OTAG System is ready');
        setLoading(false);
        return true;
      }
      return false;
    };

    // CRITICAL: Listen for database loaded event (real data available)
    const handleDatabaseLoaded = (event) => {
      console.log('[OracleTagsIntegration] OTAG database loaded with stats:', event.detail?.stats);
      setLoading(false);
      // Force a re-render by updating oracle tags for current card
      if (card) {
        updateOracleTagsForCard(card);
      }
    };

    // Listen for the database loaded event
    window.addEventListener('otagDatabaseLoaded', handleDatabaseLoaded);

    if (checkOtagReady()) {
      // Check if database is already loaded
      const stats = window.productionOtagSystem?.getStats?.();
      if (stats && stats.totalCards > 1000) {
        console.log('[OracleTagsIntegration] Database already loaded with', stats.totalCards, 'cards');
        setLoading(false);
      }
      return () => {
        window.removeEventListener('otagDatabaseLoaded', handleDatabaseLoaded);
      };
    }

    // Check periodically for OTAG system readiness
    const interval = setInterval(() => {
      if (checkOtagReady()) {
        clearInterval(interval);
      }
    }, 500);

    // Fallback timeout - don't wait forever
    const timeout = setTimeout(() => {
      console.log('[OracleTagsIntegration] Timeout waiting for Production OTAG System');
      clearInterval(interval);
      setLoading(false);
    }, 30000); // 30 second timeout

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      window.removeEventListener('otagDatabaseLoaded', handleDatabaseLoaded);
    };
  }, [card]);

  // Helper function to extract card name from various possible structures
  const getCardName = useCallback((cardObj) => {
    if (cardObj?.name) return cardObj.name;
    if (cardObj?.cardObj?.name) return cardObj.cardObj.name;
    if (cardObj?.cardObj?.card?.name) return cardObj.cardObj.card.name;
    if (cardObj?.scryfall_json?.name) return cardObj.scryfall_json.name;
    if (cardObj?.card?.name) return cardObj.card.name;
    if (typeof cardObj === 'string') return cardObj;
    return null;
  }, []);

  // Helper function to update oracle tags for a card
  const updateOracleTagsForCard = useCallback((cardToUpdate) => {
    const cardName = getCardName(cardToUpdate);
    if (cardName && window.productionOtagSystem && window.productionOtagSystem.isReady) {
      console.log(`[OracleTagsIntegration] Getting tags for: ${cardName}`);
      
      // Debug: Check OTAG system stats
      console.log(`[OracleTagsIntegration] OTAG System Stats:`, {
        totalCards: window.productionOtagSystem.stats?.totalCards,
        totalOtags: window.productionOtagSystem.stats?.totalOtags,
        isReady: window.productionOtagSystem.isReady,
        hasDatabase: !!window.productionOtagSystem.otagDatabase,
        databaseSize: window.productionOtagSystem.otagDatabase?.size
      });
      
      const tags = window.productionOtagSystem.getTagsForCard(cardName);
      setOracleTags(tags || []);
      console.log(`[OracleTagsIntegration] Found ${(tags || []).length} tags for ${cardName}`);
      
      // Debug: If no tags found, check if card exists in database
      if (!tags || tags.length === 0) {
        const cardKey = cardName.toLowerCase().trim();
        const hasCard = window.productionOtagSystem.otagDatabase?.has(cardKey);
        console.log(`[OracleTagsIntegration] Card "${cardName}" (key: "${cardKey}") exists in database: ${hasCard}`);
        
        // Show a few sample cards from the database
        if (window.productionOtagSystem.otagDatabase?.size > 0) {
          const sampleCards = Array.from(window.productionOtagSystem.otagDatabase.keys()).slice(0, 5);
          console.log(`[OracleTagsIntegration] Sample cards in database:`, sampleCards);
        }
      }
    } else {
      console.log(`[OracleTagsIntegration] OTAG system not ready for: ${cardName}`);
      setOracleTags([]);
    }
  }, [getCardName]);

  // Update tags when card changes OR when loading state changes - use Production OTAG System
  useEffect(() => {
    if (card && !loading) {
      updateOracleTagsForCard(card);
    } else if (card) {
      const cardName = getCardName(card);
      console.log(`[OracleTagsIntegration] OTAG system not ready for: ${cardName}`, {
        hasSystem: !!window.productionOtagSystem,
        isReady: window.productionOtagSystem?.isReady,
        loading: loading
      });
      setOracleTags([]);
    }
  }, [card, loading, updateOracleTagsForCard, getCardName]);

  const getFallbackTags = (cardName, cardObj) => {
    if (!cardName) return [];
    
    const tags = [];
    const lowerName = cardName.toLowerCase();
    
    // Get card text/oracle text for analysis
    const oracleText = cardObj?.scryfall_json?.oracle_text || 
                      cardObj?.cardObj?.scryfall_json?.oracle_text || 
                      cardObj?.cardObj?.card?.scryfall_json?.oracle_text || '';
    const typeLine = cardObj?.scryfall_json?.type_line || 
                    cardObj?.cardObj?.scryfall_json?.type_line || 
                    cardObj?.cardObj?.card?.scryfall_json?.type_line || '';
    const manaCost = cardObj?.scryfall_json?.mana_cost || 
                    cardObj?.cardObj?.scryfall_json?.mana_cost || 
                    cardObj?.cardObj?.card?.scryfall_json?.mana_cost || '';
    
    const lowerText = oracleText.toLowerCase();
    const lowerType = typeLine.toLowerCase();
    
    console.log(`[Fallback Tags] Analyzing ${cardName}:`, {
      oracleText: oracleText,
      typeLine: typeLine,
      manaCost: manaCost
    });
    
    // Basic card type tags
    if (lowerType.includes('creature')) tags.push('creature');
    if (lowerType.includes('instant')) tags.push('instant');
    if (lowerType.includes('sorcery')) tags.push('sorcery');
    if (lowerType.includes('artifact')) tags.push('artifact');
    if (lowerType.includes('enchantment')) tags.push('enchantment');
    if (lowerType.includes('planeswalker')) tags.push('planeswalker');
    if (lowerType.includes('legendary')) tags.push('legendary');
    
    // Advanced mechanics detection
    if (lowerText.includes('flying')) tags.push('flying');
    if (lowerText.includes('gains flying')) tags.push('flying-granter');
    if (lowerText.includes('trample')) tags.push('trample');
    if (lowerText.includes('lifelink')) tags.push('lifelink');
    if (lowerText.includes('deathtouch')) tags.push('deathtouch');
    if (lowerText.includes('vigilance')) tags.push('vigilance');
    if (lowerText.includes('haste')) tags.push('haste');
    if (lowerText.includes('first strike')) tags.push('first-strike');
    if (lowerText.includes('double strike')) tags.push('double-strike');
    if (lowerText.includes('hexproof')) tags.push('hexproof');
    if (lowerText.includes('indestructible')) tags.push('indestructible');
    if (lowerText.includes('menace')) tags.push('menace');
    if (lowerText.includes('reach')) tags.push('reach');
    
    // Counter mechanics
    if (lowerText.includes('+1/+1 counter')) tags.push('plus-one-counter');
    if (lowerText.includes('put a +1/+1 counter')) tags.push('counter-generation');
    if (lowerText.includes('-1/-1 counter')) tags.push('minus-one-counter');
    if (lowerText.includes('counter') && !lowerText.includes('spell')) tags.push('counters-matter');
    
    // Power/Toughness manipulation
    if (lowerText.includes('power') && lowerText.includes('different')) tags.push('power-matters');
    if (lowerText.includes('base power')) tags.push('base-power-matters');
    if (lowerText.includes('toughness')) tags.push('toughness-matters');
    if (lowerText.includes('gets +') || lowerText.includes('get +')) tags.push('stat-boost');
    
    // Triggered abilities
    if (lowerText.includes('whenever')) tags.push('triggered-ability');
    if (lowerText.includes('when') && lowerText.includes('dies')) tags.push('death-trigger');
    if (lowerText.includes('when') && lowerText.includes('enters')) tags.push('etb-trigger');
    if (lowerText.includes('at the beginning')) tags.push('upkeep-trigger');
    
    // Conditional effects
    if (lowerText.includes('if') && lowerText.includes('power')) tags.push('conditional-effect');
    if (lowerText.includes('until end of turn')) tags.push('temporary-effect');
    
    // Card advantage and utility
    if (lowerText.includes('draw') && lowerText.includes('card')) tags.push('card-draw');
    if (lowerText.includes('destroy')) tags.push('removal');
    if (lowerText.includes('exile')) tags.push('exile');
    if (lowerText.includes('counter') && lowerText.includes('spell')) tags.push('counterspell');
    if (lowerText.includes('sacrifice')) tags.push('sacrifice');
    if (lowerText.includes('token')) tags.push('token-generation');
    if (lowerText.includes('graveyard')) tags.push('graveyard-interaction');
    if (lowerText.includes('search') && lowerText.includes('library')) tags.push('tutor');
    
    // Target effects
    if (lowerText.includes('target creature')) tags.push('targets-creatures');
    if (lowerText.includes('target') && !lowerText.includes('creature')) tags.push('targeted-effect');
    
    // Mana and ramp
    if (lowerText.includes('add') && lowerText.includes('mana')) tags.push('mana-acceleration');
    if (lowerText.includes('untap') && lowerText.includes('land')) tags.push('ramp');
    
    // Color identity from mana cost
    if (manaCost.includes('W')) tags.push('white');
    if (manaCost.includes('U')) tags.push('blue');
    if (manaCost.includes('B')) tags.push('black');
    if (manaCost.includes('R')) tags.push('red');
    if (manaCost.includes('G')) tags.push('green');
    
    // Color combinations
    const colorCount = [manaCost.includes('W'), manaCost.includes('U'), manaCost.includes('B'), manaCost.includes('R'), manaCost.includes('G')].filter(Boolean).length;
    if (colorCount === 0) tags.push('colorless');
    if (colorCount === 1) tags.push('mono-color');
    if (colorCount === 2) tags.push('two-color');
    if (colorCount >= 3) tags.push('multicolor');
    
    // Common creature subtypes
    if (lowerType.includes('zombie')) tags.push('zombie');
    if (lowerType.includes('mutant')) tags.push('mutant');
    if (lowerType.includes('human')) tags.push('human');
    if (lowerType.includes('elf')) tags.push('elf');
    if (lowerType.includes('dragon')) tags.push('dragon');
    if (lowerType.includes('angel')) tags.push('angel');
    if (lowerType.includes('demon')) tags.push('demon');
    if (lowerType.includes('beast')) tags.push('beast');
    if (lowerType.includes('warrior')) tags.push('warrior');
    if (lowerType.includes('wizard')) tags.push('wizard');
    if (lowerType.includes('soldier')) tags.push('soldier');
    if (lowerType.includes('knight')) tags.push('knight');
    if (lowerType.includes('cleric')) tags.push('cleric');
    if (lowerType.includes('rogue')) tags.push('rogue');
    if (lowerType.includes('shaman')) tags.push('shaman');
    
    // Format relevance
    if (lowerType.includes('legendary') && lowerType.includes('creature')) {
      tags.push('commander-legal');
      tags.push('edh-relevant');
    }
    
    // Specific card analysis for Jason Bright
    if (lowerName.includes('jason bright') || lowerName.includes('glowing prophet')) {
      tags.push('legendary-creature');
      tags.push('fallout-themed');
      tags.push('radiation-themed');
      tags.push('utility-creature');
      tags.push('commander-option');
      if (lowerText.includes('zombie') && lowerText.includes('mutant')) {
        tags.push('tribal-synergy');
        tags.push('zombie-matters');
        tags.push('mutant-matters');
      }
    }
    
    // Theme detection
    if (lowerText.includes('dies') || lowerText.includes('graveyard')) tags.push('death-matters');
    if (lowerText.includes('artifact') && lowerType.includes('creature')) tags.push('artifact-matters');
    if (lowerText.includes('enchantment')) tags.push('enchantment-matters');
    
    // Combat relevance
    if (lowerText.includes('combat') || lowerText.includes('attack') || lowerText.includes('block')) {
      tags.push('combat-relevant');
    }
    
    // Synergy indicators
    if (lowerType.includes('zombie') || lowerType.includes('mutant')) {
      tags.push('tribal-creature');
    }
    
    console.log(`[Fallback Tags] Generated ${tags.length} tags for ${cardName}:`, tags);
    
    return [...new Set(tags)]; // Remove duplicates
  };

  // DISABLED: Using Production OTAG System instead
  /*
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
  */

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

  // AGGRESSIVE FIX: Handle tag click on mousedown to prevent layout issues
  const handleTagMouseDown = useCallback((e, tag) => {
    e.preventDefault();
    e.stopPropagation();
    // Use setTimeout to ensure any layout changes complete before handling click
    setTimeout(() => {
      handleTagClick(tag);
    }, 0);
  }, [handleTagClick]);

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
          lowerTag.includes('tap') || lowerTag.includes('untap') ||
          lowerTag.includes('trigger') || lowerTag.includes('conditional') ||
          lowerTag.includes('temporary') || lowerTag.includes('boost') ||
          lowerTag.includes('generation') || lowerTag.includes('granter') ||
          lowerTag.includes('targeted') || lowerTag.includes('utility')) {
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
               lowerTag.includes('hexproof') || lowerTag.includes('indestructible') ||
               lowerTag.includes('matters') || lowerTag.includes('effect') ||
               lowerTag.includes('ability') || lowerTag.includes('combat')) {
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
               lowerTag.includes('mainboard') || lowerTag.includes('relevant') ||
               lowerTag.includes('option')) {
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
               lowerTag.includes('enabler') || lowerTag.includes('payoff') ||
               lowerTag.includes('zombie') || lowerTag.includes('mutant') ||
               lowerTag.includes('human') || lowerTag.includes('elf') ||
               lowerTag.includes('dragon') || lowerTag.includes('angel') ||
               lowerTag.includes('demon') || lowerTag.includes('beast') ||
               lowerTag.includes('warrior') || lowerTag.includes('wizard') ||
               lowerTag.includes('soldier') || lowerTag.includes('knight') ||
               lowerTag.includes('cleric') || lowerTag.includes('rogue') ||
               lowerTag.includes('shaman') || lowerTag.includes('fallout') ||
               lowerTag.includes('radiation') || lowerTag.includes('death')) {
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
          <span className="oracle-tags-title">Waiting for Oracle Tags System...</span>
        </div>
        <div className="loading-spinner"></div>
        <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', marginTop: '8px' }}>
          Loading 34,425 cards and 4,288 categories...
        </div>
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
        <div className="no-tags-message">
          {window.productionOtagSystem?.stats?.totalCards > 100 
            ? "No functional tags found for this card"
            : "Loading Oracle Tags database..."
          }
        </div>
        <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', marginTop: '4px' }}>
          Database: {window.productionOtagSystem?.stats?.totalCards || 0} cards loaded
          {window.productionOtagSystem?.stats?.totalCards <= 100 && (
            <div>⚠️ Database incomplete - expected 34,000+ cards</div>
          )}
        </div>
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
                            onClick={(e) => {
                              // Backup click handler - disabled to prevent double triggers
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onMouseDown={(e) => handleTagMouseDown(e, tag)}
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
                            onClick={(e) => {
                              // Backup click handler - disabled to prevent double triggers
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onMouseDown={(e) => handleTagMouseDown(e, tag)}
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
