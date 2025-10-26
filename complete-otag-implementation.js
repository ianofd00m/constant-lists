// 🏷️ COMPLETE OTAG IMPLEMENTATION
// This script implements the full OTAG system for your deck builder

console.log('🚀 Implementing complete OTAG system...');

// Step 1: Initialize all OTAG components
function initializeOtagSystem() {
    console.log('🔧 Initializing OTAG components...');
    
    // Ensure all required scripts are loaded
    const requiredComponents = [
        'localOtagHelper',
        'otagModalEnhancer', 
        'createModalWithData'
    ];
    
    const missingComponents = requiredComponents.filter(comp => !window[comp]);
    if (missingComponents.length > 0) {
        console.log(`⚠️ Missing components: ${missingComponents.join(', ')}`);
        console.log('📥 Loading missing components...');
        return false;
    }
    
    console.log('✅ All OTAG components ready');
    return true;
}

// Step 2: Enhanced modal detection for your specific site
class SiteSpecificModalEnhancer {
    constructor() {
        this.setupSiteSpecificDetection();
        this.setupDeckListIntegration();
    }
    
    setupSiteSpecificDetection() {
        console.log('🎯 Setting up site-specific modal detection...');
        
        // Override the modal detection to be more specific to your site
        if (window.otagModalEnhancer) {
            const originalIsCardModal = window.otagModalEnhancer.isCardModal;
            
            window.otagModalEnhancer.isCardModal = (node) => {
                if (!node || !node.tagName) return false;
                
                // Your specific modal patterns
                const siteSpecificPatterns = [
                    'show-all-modal',
                    'card-preview',
                    'card-modal',
                    'deck-modal'
                ];
                
                const nodeId = (node.id || '').toLowerCase();
                const nodeClass = (node.className || '').toLowerCase();
                
                // Check for your specific modal IDs/classes
                for (const pattern of siteSpecificPatterns) {
                    if (nodeId.includes(pattern) || nodeClass.includes(pattern)) {
                        return true;
                    }
                }
                
                // Fallback to original detection
                return originalIsCardModal.call(window.otagModalEnhancer, node);
            };
            
            // Enhanced card name extraction for your site
            const originalExtractCardName = window.otagModalEnhancer.extractCardName;
            
            window.otagModalEnhancer.extractCardName = (modal) => {
                // Try site-specific selectors first
                const siteSelectors = [
                    '.card-name h1',
                    '.card-name h2', 
                    '.card-title',
                    '[data-card-name]',
                    '.modal-header h1',
                    '.modal-header h2'
                ];
                
                for (const selector of siteSelectors) {
                    const element = modal.querySelector(selector);
                    if (element) {
                        let cardName = element.textContent || element.innerText;
                        if (cardName) {
                            cardName = cardName.trim();
                            // Remove quantity and other suffixes
                            cardName = cardName.replace(/^\d+x?\s+/i, '');
                            cardName = cardName.replace(/\s*\([^)]*\)$/, '');
                            
                            if (cardName.length > 2 && cardName.length < 100) {
                                console.log(`🎯 Site-specific extraction: "${cardName}"`);
                                return cardName;
                            }
                        }
                    }
                }
                
                // Fallback to original extraction
                return originalExtractCardName.call(window.otagModalEnhancer, modal);
            };
        }
    }
    
    setupDeckListIntegration() {
        console.log('📝 Setting up deck list integration...');
        
        // Monitor for deck list card clicks
        document.addEventListener('click', (e) => {
            // Look for deck list items
            const deckItem = e.target.closest(
                '.deck-card, .card-item, .deck-list-item, [data-card], .card-row'
            );
            
            if (deckItem) {
                console.log('📋 Deck list item clicked, preparing for modal enhancement...');
                
                // Extract card name from deck item if possible
                let cardName = null;
                
                // Try various ways to get card name from deck item
                const nameElement = deckItem.querySelector('.card-name, .name, [data-card-name]');
                if (nameElement) {
                    cardName = nameElement.textContent || nameElement.getAttribute('data-card-name');
                    cardName = cardName ? cardName.trim().replace(/^\d+x?\s+/i, '') : null;
                }
                
                if (cardName) {
                    console.log(`🃏 Deck card clicked: ${cardName}`);
                    
                    // Store for modal enhancement
                    window.pendingCardName = cardName;
                    
                    // Set up delayed modal enhancement
                    setTimeout(() => this.enhanceAnyNewModals(), 100);
                    setTimeout(() => this.enhanceAnyNewModals(), 500);
                    setTimeout(() => this.enhanceAnyNewModals(), 1000);
                }
            }
        });
    }
    
    enhanceAnyNewModals() {
        // Look for any visible modals that might have appeared
        const modals = document.querySelectorAll(
            '#show-all-modal, [id*="modal"], [class*="modal"], .card-modal, .preview-modal'
        );
        
        modals.forEach(modal => {
            const styles = window.getComputedStyle(modal);
            const isVisible = styles.display !== 'none' && 
                            styles.visibility !== 'hidden' && 
                            styles.opacity !== '0';
            
            if (isVisible && !modal.querySelector('.otag-enhancement')) {
                console.log('🏷️ Found new visible modal, enhancing with OTAGs...');
                
                if (window.otagModalEnhancer) {
                    window.otagModalEnhancer.enhanceModal(modal);
                }
            }
        });
    }
}

// Step 3: Enhanced OTAG search integration
class EnhancedOtagSearch {
    constructor() {
        this.setupSearchIntegration();
    }
    
    setupSearchIntegration() {
        console.log('🔍 Setting up enhanced OTAG search...');
        
        // Override OTAG tag click handler
        if (window.otagModalEnhancer) {
            window.otagModalEnhancer.handleTagClick = (otag) => {
                console.log(`🏷️ OTAG search: ${otag}`);
                
                if (!window.localOtagHelper || !window.localOtagHelper.isLoaded) {
                    console.log('⚠️ OTAG data not loaded');
                    this.showOtagNotLoaded();
                    return;
                }
                
                // Get cards with this OTAG
                const otagResults = window.localOtagHelper.searchByOtag(otag);
                
                if (otagResults.length === 0) {
                    console.log(`❌ No cards found with OTAG: ${otag}`);
                    this.showNoResults(otag);
                    return;
                }
                
                // Convert to format expected by your modal system
                const scryfallResults = this.convertToScryfallFormat(otagResults);
                
                // Store in all the global variables your system uses
                window.lastAllResults = scryfallResults;
                window.allSearchResults = scryfallResults;
                window.searchResults = scryfallResults;
                window.modalResults = scryfallResults;
                window.currentSearchResults = scryfallResults;
                
                // Store in localStorage/sessionStorage
                try {
                    localStorage.setItem('lastSearchResults', JSON.stringify(scryfallResults));
                    sessionStorage.setItem('scryfallResults', JSON.stringify(scryfallResults));
                } catch (e) {
                    console.log('⚠️ Could not store results:', e);
                }
                
                // Format search query
                const searchQuery = this.formatOtagQuery(otag);
                
                // Use your existing modal system
                if (window.createModalWithData) {
                    console.log(`🎯 Opening search modal with ${scryfallResults.length} cards`);
                    window.createModalWithData(scryfallResults, searchQuery);
                } else {
                    console.log('⚠️ createModalWithData not available, using fallback');
                    this.showFallbackModal(otag, scryfallResults);
                }
            };
        }
    }
    
    convertToScryfallFormat(otagResults) {
        return otagResults.map(card => ({
            id: this.generateCardId(card.name),
            name: card.name,
            mana_cost: this.reconstructManaCost(card.cmc, card.colors),
            cmc: card.cmc || 0,
            type_line: card.typeLine || 'Unknown Type',
            oracle_text: this.generateOracleText(card),
            colors: card.colors || [],
            color_identity: card.colors || [],
            set: card.set || 'unknown',
            rarity: this.extractRarity(card.otags) || 'common',
            image_uris: {
                normal: `https://api.scryfall.com/cards/named?format=image&version=normal&fuzzy=${encodeURIComponent(card.name)}`,
                small: `https://api.scryfall.com/cards/named?format=image&version=small&fuzzy=${encodeURIComponent(card.name)}`
            },
            // Preserve original OTAG data
            otag_data: card,
            search_source: 'otag_local'
        }));
    }
    
    generateCardId(cardName) {
        return 'otag-' + cardName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
    
    reconstructManaCost(cmc, colors) {
        if (cmc === 0) return '{0}';
        if (!colors || colors.length === 0) {
            return cmc > 0 ? `{${cmc}}` : '';
        }
        
        const colorSymbols = colors.map(c => `{${c.toUpperCase()}}`);
        const generic = Math.max(0, cmc - colors.length);
        
        if (generic > 0) {
            return `{${generic}}${colorSymbols.join('')}`;
        } else {
            return colorSymbols.join('');
        }
    }
    
    generateOracleText(card) {
        const functionalTags = card.otags.filter(tag => 
            !tag.startsWith('legal-in-') && 
            !tag.startsWith('rarity-') && 
            !tag.startsWith('set-') &&
            !tag.startsWith('mono-')
        );
        
        if (functionalTags.length > 0) {
            const formatted = functionalTags.slice(0, 3).map(tag => 
                tag.replace(/^(keyword-|tribe-|)/, '').replace(/-/g, ' ')
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
        const displayName = otag.replace(/^(keyword-|tribe-|legal-in-|rarity-|set-|mono-)/, '')
                                .replace(/-/g, ' ')
                                .replace(/\b\w/g, l => l.toUpperCase());
        
        return `otag:"${displayName}"`;
    }
    
    showOtagNotLoaded() {
        this.showNotification('⚠️ OTAG data not loaded. Please load your CSV file first.', 'warning');
    }
    
    showNoResults(otag) {
        const formatted = otag.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        this.showNotification(`❌ No cards found with OTAG: ${formatted}`, 'info');
    }
    
    showNotification(message, type = 'info') {
        const colors = {
            info: '#3b82f6',
            warning: '#f59e0b', 
            error: '#ef4444',
            success: '#10b981'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 600;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
    
    showFallbackModal(otag, results) {
        console.log('📋 Showing fallback OTAG results modal...');
        // Implement a basic fallback modal if needed
    }
}

// Step 4: Smart CSV data loader with UI
class SmartOtagLoader {
    constructor() {
        this.createLoadUI();
        this.autoLoadIfAvailable();
    }
    
    autoLoadIfAvailable() {
        // Check if data is already loaded
        if (window.localOtagHelper && window.localOtagHelper.isLoaded) {
            console.log('✅ OTAG data already loaded');
            this.hideLoadUI();
            this.showNotification('✅ OTAG system ready! Click any card to see functional tags.', 'success');
            return;
        }
        
        // Check for data in localStorage
        const savedData = localStorage.getItem('localOtagData');
        if (savedData) {
            console.log('💾 Found cached OTAG data, loading...');
            if (window.localOtagHelper && window.localOtagHelper.loadFromCSV(savedData)) {
                this.hideLoadUI();
                this.showNotification('✅ OTAG data loaded from cache!', 'success');
                return;
            }
        }
        
        console.log('📥 No OTAG data found, showing load UI...');
    }
    
    createLoadUI() {
        // Create floating load button
        const loadButton = document.createElement('div');
        loadButton.id = 'otag-load-ui';
        loadButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 15px;
            padding: 15px 20px;
            box-shadow: 0 8px 25px rgba(102,126,234,0.3);
            z-index: 9999;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 600;
            min-width: 200px;
            text-align: center;
        `;
        
        loadButton.innerHTML = `
            <div style="margin-bottom: 8px; font-size: 16px;">🏷️ OTAG System</div>
            <div style="font-size: 12px; opacity: 0.9;">Click to load CSV data</div>
        `;
        
        loadButton.addEventListener('click', () => this.showLoadDialog());
        
        loadButton.addEventListener('mouseover', () => {
            loadButton.style.transform = 'translateY(-2px)';
            loadButton.style.boxShadow = '0 12px 30px rgba(102,126,234,0.4)';
        });
        
        loadButton.addEventListener('mouseout', () => {
            loadButton.style.transform = 'translateY(0)';
            loadButton.style.boxShadow = '0 8px 25px rgba(102,126,234,0.3)';
        });
        
        document.body.appendChild(loadButton);
        
        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', (e) => this.handleFileLoad(e));
        document.body.appendChild(fileInput);
        
        this.loadButton = loadButton;
        this.fileInput = fileInput;
    }
    
    showLoadDialog() {
        this.fileInput.click();
    }
    
    handleFileLoad(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        console.log(`📂 Loading OTAG data from: ${file.name}`);
        this.showNotification('📂 Loading OTAG data...', 'info');
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const csvContent = event.target.result;
            
            if (window.localOtagHelper) {
                const success = window.localOtagHelper.loadFromCSV(csvContent);
                if (success) {
                    this.hideLoadUI();
                    this.showNotification('✅ OTAG data loaded! Card modals now show functional tags.', 'success');
                    
                    // Trigger enhancement of any existing modals
                    setTimeout(() => {
                        if (window.siteModalEnhancer) {
                            window.siteModalEnhancer.enhanceAnyNewModals();
                        }
                    }, 1000);
                } else {
                    this.showNotification('❌ Failed to load OTAG data. Please check the CSV format.', 'error');
                }
            } else {
                this.showNotification('❌ OTAG system not ready. Please refresh the page.', 'error');
            }
        };
        
        reader.onerror = () => {
            this.showNotification('❌ Error reading file', 'error');
        };
        
        reader.readAsText(file);
    }
    
    hideLoadUI() {
        if (this.loadButton) {
            this.loadButton.style.display = 'none';
        }
    }
    
    showNotification(message, type = 'info') {
        const colors = {
            info: '#3b82f6',
            warning: '#f59e0b',
            error: '#ef4444', 
            success: '#10b981'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 600;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        
        notification.textContent = message;
        
        // Add animation CSS if not already added
        if (!document.querySelector('#otag-animations')) {
            const style = document.createElement('style');
            style.id = 'otag-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Step 5: Initialize everything
function initializeCompleteOtagSystem() {
    console.log('🚀 Initializing complete OTAG system...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startInitialization);
    } else {
        startInitialization();
    }
    
    function startInitialization() {
        // Small delay to ensure all scripts are loaded
        setTimeout(() => {
            console.log('🔧 Starting OTAG system initialization...');
            
            // Initialize components
            if (initializeOtagSystem()) {
                window.siteModalEnhancer = new SiteSpecificModalEnhancer();
                window.enhancedOtagSearch = new EnhancedOtagSearch();
                window.smartOtagLoader = new SmartOtagLoader();
                
                console.log('✅ Complete OTAG system initialized!');
                console.log('💡 Users can now:');
                console.log('  - Load CSV data via the floating button');
                console.log('  - See OTAG tags in card modals'); 
                console.log('  - Click OTAG tags to search for similar cards');
                console.log('  - Use existing search modal with OTAG results');
            } else {
                console.log('⚠️ OTAG system not fully ready, will retry...');
                // Retry after a delay
                setTimeout(startInitialization, 2000);
            }
        }, 1000);
    }
}

// Step 6: Expose utility functions
window.otagImplementation = {
    // Manual functions
    loadCsvData: (csvText) => {
        if (window.localOtagHelper) {
            return window.localOtagHelper.loadFromCSV(csvText);
        }
        return false;
    },
    
    searchCards: (otagQuery) => {
        if (window.localOtagHelper) {
            return window.localOtagHelper.searchByOtag(otagQuery);
        }
        return [];
    },
    
    getCardData: (cardName) => {
        if (window.localOtagHelper) {
            return window.localOtagHelper.getCardOtags(cardName);
        }
        return null;
    },
    
    getStats: () => {
        if (window.localOtagHelper) {
            return window.localOtagHelper.getOtagStats();
        }
        return null;
    },
    
    // Control functions
    enhanceModal: (modalElement) => {
        if (window.otagModalEnhancer) {
            window.otagModalEnhancer.enhanceModal(modalElement);
        }
    },
    
    triggerSearch: (otag) => {
        if (window.enhancedOtagSearch && window.otagModalEnhancer) {
            window.otagModalEnhancer.handleTagClick(otag);
        }
    },
    
    // Status functions
    isReady: () => {
        return !!(window.localOtagHelper && 
                window.otagModalEnhancer && 
                window.createModalWithData);
    },
    
    isLoaded: () => {
        return !!(window.localOtagHelper && window.localOtagHelper.isLoaded);
    }
};

// Auto-initialize
initializeCompleteOtagSystem();

console.log('🎯 OTAG implementation script loaded!');
console.log('💡 The system will auto-initialize when ready');
console.log('💡 Use window.otagImplementation for manual control');
