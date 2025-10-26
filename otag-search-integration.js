// 🔗 OTAG INTEGRATION WITH EXISTING SEARCH SYSTEM
// Connects OTAG helper with your existing "show all results" modal

console.log('🔗 OTAG Search Integration loading...');

class OtagSearchIntegration {
    constructor() {
        this.isActive = false;
        this.setupIntegration();
    }

    setupIntegration() {
        // Wait for both OTAG helper and search modal system to be ready
        const checkReady = () => {
            if (window.localOtagHelper && window.createModalWithData) {
                this.initializeIntegration();
                return true;
            }
            return false;
        };

        if (!checkReady()) {
            // Poll until both systems are ready
            const pollInterval = setInterval(() => {
                if (checkReady()) {
                    clearInterval(pollInterval);
                }
            }, 500);
            
            // Timeout after 10 seconds
            setTimeout(() => clearInterval(pollInterval), 10000);
        }
    }

    initializeIntegration() {
        console.log('🔗 Initializing OTAG search integration...');
        
        // Override the OTAG click handler to use existing search modal
        if (window.otagModalEnhancer) {
            window.otagModalEnhancer.handleTagClick = this.createIntegratedTagHandler();
            console.log('✅ OTAG tag clicks now use existing search modal');
        }

        // Add OTAG search support to existing search functions
        this.enhanceExistingSearch();
        
        // Monitor for deck list interactions
        this.setupDeckListMonitoring();
        
        this.isActive = true;
        console.log('✅ OTAG search integration active');
    }

    createIntegratedTagHandler() {
        return (otag) => {
            console.log(`🔍 OTAG search triggered: ${otag}`);
            
            if (!window.localOtagHelper || !window.localOtagHelper.isLoaded) {
                console.log('⚠️ OTAG data not loaded');
                return;
            }

            // Get cards with this OTAG
            const otagResults = window.localOtagHelper.searchByOtag(otag);
            
            if (otagResults.length === 0) {
                console.log(`❌ No cards found with OTAG: ${otag}`);
                return;
            }

            // Convert to Scryfall-compatible format
            const scryfallResults = this.convertToScryfallFormat(otagResults);
            
            // Store results in global variables for existing modal system
            window.lastAllResults = scryfallResults;
            window.allSearchResults = scryfallResults;
            window.searchResults = scryfallResults;
            window.modalResults = scryfallResults;
            window.currentSearchResults = scryfallResults;
            
            // Also store in localStorage for persistence
            try {
                localStorage.setItem('lastSearchResults', JSON.stringify(scryfallResults));
                sessionStorage.setItem('scryfallResults', JSON.stringify(scryfallResults));
            } catch (e) {
                console.log('⚠️ Could not store results in storage:', e);
            }

            // Create search query string
            const searchQuery = this.formatOtagQuery(otag);
            
            // Use existing modal system
            if (window.createModalWithData) {
                console.log(`🎯 Opening search modal with ${scryfallResults.length} cards`);
                window.createModalWithData(scryfallResults, searchQuery);
            }
        };
    }

    convertToScryfallFormat(otagResults) {
        return otagResults.map(card => {
            // Create a Scryfall-compatible card object
            const scryfallCard = {
                id: this.generateCardId(card.name),
                name: card.name,
                mana_cost: this.reconstructManaCost(card.cmc, card.colors),
                cmc: card.cmc || 0,
                type_line: card.typeLine || 'Unknown Type',
                oracle_text: this.generateOracleText(card),
                colors: card.colors || [],
                color_identity: card.colors || [],
                set: card.set || 'unknown',
                rarity: this.extractRarity(card.otags),
                image_uris: {
                    normal: `https://api.scryfall.com/cards/named?format=image&version=normal&fuzzy=${encodeURIComponent(card.name)}`,
                    small: `https://api.scryfall.com/cards/named?format=image&version=small&fuzzy=${encodeURIComponent(card.name)}`
                },
                // Include original OTAG data
                otag_data: card,
                search_source: 'otag_local'
            };

            return scryfallCard;
        });
    }

    generateCardId(cardName) {
        // Generate a consistent ID for the card
        return 'otag-' + cardName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }

    reconstructManaCost(cmc, colors) {
        if (cmc === 0) return '{0}';
        if (!colors || colors.length === 0) {
            return cmc > 0 ? `{${cmc}}` : '';
        }
        
        // Simple reconstruction - prioritize colored mana
        const colorSymbols = colors.map(c => `{${c.toUpperCase()}}`);
        const generic = Math.max(0, cmc - colors.length);
        
        if (generic > 0) {
            return `{${generic}}${colorSymbols.join('')}`;
        } else {
            return colorSymbols.join('');
        }
    }

    generateOracleText(card) {
        // Create descriptive oracle text based on OTAGs
        const functionalTags = card.otags.filter(tag => 
            !tag.startsWith('legal-in-') && 
            !tag.startsWith('rarity-') && 
            !tag.startsWith('set-') &&
            !tag.startsWith('mono-') &&
            !tag.startsWith('tribe-')
        );

        if (functionalTags.length > 0) {
            const formatted = functionalTags.slice(0, 3).map(tag => 
                tag.replace(/^keyword-/, '').replace(/-/g, ' ')
            ).join(', ');
            return `Functional categories: ${formatted}${functionalTags.length > 3 ? '...' : ''}`;
        }

        return 'Card details available in OTAG database.';
    }

    extractRarity(otags) {
        const rarityTag = otags.find(tag => tag.startsWith('rarity-'));
        return rarityTag ? rarityTag.replace('rarity-', '') : 'common';
    }

    formatOtagQuery(otag) {
        // Format OTAG for display in search modal
        const displayName = otag.replace(/^(keyword-|tribe-|legal-in-|rarity-|set-|mono-)/, '')
                                .replace(/-/g, ' ')
                                .replace(/\b\w/g, l => l.toUpperCase());
        
        return `otag:"${displayName}"`;
    }

    enhanceExistingSearch() {
        // Add OTAG search capability to existing search functions
        
        // Store original search function if it exists
        if (window.performSearch) {
            window.originalPerformSearch = window.performSearch;
        }

        // Create enhanced search function
        window.performOtagSearch = (query) => {
            console.log(`🔍 Enhanced search: ${query}`);
            
            // Check if this is an OTAG search
            if (query.toLowerCase().startsWith('otag:')) {
                const otagQuery = query.substring(5).trim().replace(/"/g, '').toLowerCase();
                
                if (window.localOtagHelper && window.localOtagHelper.isLoaded) {
                    const results = window.localOtagHelper.searchByOtag(otagQuery);
                    if (results.length > 0) {
                        const scryfallResults = this.convertToScryfallFormat(results);
                        
                        // Store results globally
                        window.lastAllResults = scryfallResults;
                        window.allSearchResults = scryfallResults;
                        
                        if (window.createModalWithData) {
                            window.createModalWithData(scryfallResults, query);
                        }
                        
                        console.log(`✅ OTAG search found ${results.length} cards`);
                        return scryfallResults;
                    }
                }
            }
            
            // Fall back to original search if available
            if (window.originalPerformSearch) {
                return window.originalPerformSearch(query);
            }
            
            return [];
        };

        console.log('✅ Enhanced search with OTAG support');
    }

    setupDeckListMonitoring() {
        // Monitor for deck list card clicks to ensure modals get enhanced
        console.log('👁️ Setting up deck list monitoring...');
        
        // Monitor clicks on deck list items
        document.addEventListener('click', (e) => {
            // Check if clicked element is a deck card
            const deckCard = e.target.closest('.deck-card, .card-item, .deck-list-item, [data-card-name]');
            
            if (deckCard) {
                console.log('🃏 Deck card clicked, watching for modal...');
                
                // Watch for modal to appear after click
                setTimeout(() => {
                    this.checkForNewModal();
                }, 100);
                
                setTimeout(() => {
                    this.checkForNewModal();
                }, 500);
            }
        });
    }

    checkForNewModal() {
        // Look for recently opened modals
        const modals = document.querySelectorAll('[id*="modal"], [class*="modal"], .card-modal, .preview-modal');
        
        modals.forEach(modal => {
            // Check if modal is visible and not already enhanced
            const styles = window.getComputedStyle(modal);
            const isVisible = styles.display !== 'none' && styles.visibility !== 'hidden';
            const isEnhanced = modal.querySelector('.otag-enhancement');
            
            if (isVisible && !isEnhanced && window.otagModalEnhancer) {
                console.log('🏷️ Enhancing newly opened modal...');
                window.otagModalEnhancer.enhanceModal(modal);
            }
        });
    }
}

// Initialize integration when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.otagSearchIntegration = new OtagSearchIntegration();
    });
} else {
    window.otagSearchIntegration = new OtagSearchIntegration();
}

// Utility functions for manual integration
window.triggerOtagSearch = function(otag) {
    if (window.otagSearchIntegration && window.otagSearchIntegration.isActive) {
        window.otagModalEnhancer.handleTagClick(otag);
    } else {
        console.log('⚠️ OTAG search integration not active');
    }
};

window.searchDeckByOtag = function(otag) {
    return window.triggerOtagSearch(otag);
};

console.log('✅ OTAG Search Integration loaded!');
console.log('💡 OTAG tags will now open your existing search modal');
console.log('💡 Use triggerOtagSearch("otag-name") to manually trigger searches');
