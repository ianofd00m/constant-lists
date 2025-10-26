// 🏷️ LOCAL OTAG HELPER SYSTEM
// Integrates scraped OTAG data with deck builder modals and card displays

console.log('🏷️ Local OTAG Helper System Loading...');

class LocalOtagHelper {
    constructor() {
        this.otagDatabase = new Map(); // Card name -> OTAG data
        this.otagCategories = new Map(); // OTAG -> frequency
        this.isLoaded = false;
        this.csvData = null;
        this.searchIndex = new Map(); // For quick OTAG searches
        
        // Auto-load from local storage if available
        this.loadFromLocalStorage();
    }

    // Load OTAG data from CSV content
    loadFromCSV(csvContent) {
        console.log('📊 Loading OTAG data from CSV...');
        
        try {
            const lines = csvContent.split('\n');
            const headers = lines[0].split(',');
            
            // Expected headers: Card ID, Card Name, Colors, CMC, Type Line, Set, OTAG Count, OTAGs (Pipe Separated)
            const nameIndex = 1;
            const colorsIndex = 2;
            const cmcIndex = 3;
            const typeIndex = 4;
            const setIndex = 5;
            const otagCountIndex = 6;
            const otagsIndex = 7;
            
            let processedCards = 0;
            let totalOtags = 0;
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // Parse CSV line (handle quoted fields)
                const fields = this.parseCSVLine(line);
                if (fields.length < 8) continue;
                
                const cardName = fields[nameIndex].replace(/"/g, '').trim();
                const colors = fields[colorsIndex].replace(/"/g, '').trim();
                const cmc = parseInt(fields[cmcIndex]) || 0;
                const typeLine = fields[typeIndex].replace(/"/g, '').trim();
                const set = fields[setIndex].replace(/"/g, '').trim();
                const otagCount = parseInt(fields[otagCountIndex]) || 0;
                const otagsString = fields[otagsIndex].replace(/"/g, '').trim();
                
                if (!cardName || otagCount === 0) continue;
                
                // Parse OTAGs (pipe-separated)
                const otags = otagsString.split('|').filter(tag => tag.trim());
                
                // Store card data
                const cardData = {
                    name: cardName,
                    colors: colors.split(' ').filter(c => c),
                    cmc: cmc,
                    typeLine: typeLine,
                    set: set,
                    otags: otags,
                    otagCount: otags.length
                };
                
                // Use card name as key (case-insensitive)
                const cardKey = cardName.toLowerCase();
                this.otagDatabase.set(cardKey, cardData);
                
                // Update OTAG frequency tracking
                otags.forEach(otag => {
                    const count = this.otagCategories.get(otag) || 0;
                    this.otagCategories.set(otag, count + 1);
                    
                    // Build search index
                    if (!this.searchIndex.has(otag)) {
                        this.searchIndex.set(otag, new Set());
                    }
                    this.searchIndex.get(otag).add(cardKey);
                });
                
                processedCards++;
                totalOtags += otags.length;
            }
            
            this.isLoaded = true;
            this.csvData = csvContent;
            
            console.log(`✅ OTAG database loaded successfully!`);
            console.log(`📊 ${processedCards.toLocaleString()} cards with OTAG data`);
            console.log(`🏷️ ${this.otagCategories.size.toLocaleString()} unique OTAG categories`);
            console.log(`📈 ${totalOtags.toLocaleString()} total OTAG assignments`);
            
            // Save to local storage for persistence
            this.saveToLocalStorage();
            
            return true;
            
        } catch (error) {
            console.error('❌ Error loading OTAG data:', error);
            return false;
        }
    }

    // Parse CSV line handling quoted fields with commas
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Field separator
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add final field
        result.push(current);
        return result;
    }

    // Get OTAG data for a specific card
    getCardOtags(cardName) {
        if (!this.isLoaded) {
            console.log('⚠️ OTAG database not loaded');
            return null;
        }
        
        const cardKey = cardName.toLowerCase().trim();
        return this.otagDatabase.get(cardKey) || null;
    }

    // Search cards by OTAG
    searchByOtag(otagQuery) {
        if (!this.isLoaded) {
            console.log('⚠️ OTAG database not loaded');
            return [];
        }
        
        const query = otagQuery.toLowerCase();
        const results = [];
        
        // Find OTAGs that match the query
        for (const [otag, cardSet] of this.searchIndex.entries()) {
            if (otag.includes(query)) {
                for (const cardKey of cardSet) {
                    const cardData = this.otagDatabase.get(cardKey);
                    if (cardData && !results.find(r => r.name === cardData.name)) {
                        results.push(cardData);
                    }
                }
            }
        }
        
        return results;
    }

    // Get OTAG frequency statistics
    getOtagStats() {
        if (!this.isLoaded) return null;
        
        const sortedOtags = Array.from(this.otagCategories.entries())
            .sort((a, b) => b[1] - a[1]);
        
        return {
            totalCards: this.otagDatabase.size,
            totalOtags: this.otagCategories.size,
            topOtags: sortedOtags.slice(0, 20),
            allOtags: sortedOtags
        };
    }

    // Save to local storage
    saveToLocalStorage() {
        try {
            if (this.csvData) {
                localStorage.setItem('localOtagData', this.csvData);
                localStorage.setItem('localOtagTimestamp', Date.now().toString());
                console.log('💾 OTAG data saved to local storage');
            }
        } catch (error) {
            console.log('⚠️ Could not save to local storage:', error.message);
        }
    }

    // Load from local storage
    loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('localOtagData');
            const timestamp = localStorage.getItem('localOtagTimestamp');
            
            if (savedData && timestamp) {
                const ageHours = (Date.now() - parseInt(timestamp)) / (1000 * 60 * 60);
                console.log(`💾 Found cached OTAG data (${ageHours.toFixed(1)} hours old)`);
                
                if (ageHours < 24) {
                    // Use cached data if less than 24 hours old
                    this.loadFromCSV(savedData);
                    console.log('✅ Using cached OTAG data');
                } else {
                    console.log('⏰ Cached data is too old, will need fresh data');
                }
            }
        } catch (error) {
            console.log('⚠️ Could not load from local storage:', error.message);
        }
    }

    // Clear cached data
    clearCache() {
        localStorage.removeItem('localOtagData');
        localStorage.removeItem('localOtagTimestamp');
        this.otagDatabase.clear();
        this.otagCategories.clear();
        this.searchIndex.clear();
        this.isLoaded = false;
        console.log('🗑️ OTAG cache cleared');
    }
}

// Modal Enhancement System
class OtagModalEnhancer {
    constructor(otagHelper) {
        this.otagHelper = otagHelper;
        this.isActive = false;
        this.observer = null;
        
        this.setupModalMonitoring();
    }

    // Start monitoring for modals to enhance
    setupModalMonitoring() {
        console.log('👁️ Setting up modal monitoring for OTAG enhancement...');
        
        // Monitor for new modals being added to the DOM
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        // Check if this is a card modal
                        if (this.isCardModal(node)) {
                            this.enhanceModal(node);
                        }
                        
                        // Check if modal was added inside this node
                        const modals = node.querySelectorAll && node.querySelectorAll('[id*="modal"], [class*="modal"], .card-modal, .preview-modal');
                        if (modals) {
                            modals.forEach(modal => {
                                if (this.isCardModal(modal)) {
                                    this.enhanceModal(modal);
                                }
                            });
                        }
                    }
                });
            });
        });
        
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Also check existing modals
        this.scanExistingModals();
        
        this.isActive = true;
        console.log('✅ Modal monitoring active');
    }

    // Check if a DOM node is a card modal
    isCardModal(node) {
        if (!node || !node.tagName) return false;
        
        // Common patterns for card modals in deck builders
        const modalPatterns = [
            'modal',
            'card-modal',
            'preview-modal',
            'card-preview',
            'show-all-modal',
            'deck-modal',
            'card-detail',
            'popup',
            'overlay'
        ];
        
        const nodeId = (node.id || '').toLowerCase();
        const nodeClass = (node.className || '').toLowerCase();
        
        // Check if ID or class contains modal patterns
        for (const pattern of modalPatterns) {
            if (nodeId.includes(pattern) || nodeClass.includes(pattern)) {
                return true;
            }
        }
        
        // Check for specific deck builder modal indicators
        if (node.querySelector && (
            node.querySelector('[data-card-name]') ||
            node.querySelector('.card-name') ||
            node.querySelector('.card-title') ||
            node.querySelector('.card-preview') ||
            node.querySelector('.deck-card') ||
            node.querySelector('h1, h2, h3') // Card name in headers
        )) {
            return true;
        }
        
        // Check for modal-like styling (fixed positioning, high z-index)
        const styles = window.getComputedStyle(node);
        if (styles.position === 'fixed' && parseInt(styles.zIndex) > 1000) {
            return true;
        }
        
        return false;
    }

    // Scan for existing modals on page load
    scanExistingModals() {
        const potentialModals = document.querySelectorAll(
            '[id*="modal"], [class*="modal"], .card-modal, .preview-modal, .card-preview'
        );
        
        potentialModals.forEach(modal => {
            if (this.isCardModal(modal)) {
                this.enhanceModal(modal);
            }
        });
    }

    // Extract card name from modal
    extractCardName(modal) {
        // Try various methods to find the card name
        const selectors = [
            '[data-card-name]',
            '.card-name',
            '.card-title',
            '.deck-card-name',
            '.preview-title',
            'h1',
            'h2', 
            'h3',
            '.modal-title',
            '.modal-header h1',
            '.modal-header h2',
            '.modal-header h3',
            '.card-preview h1',
            '.card-preview h2',
            '.card-detail-name',
            'img[alt]', // Card image alt text
            'img[title]' // Card image title
        ];
        
        for (const selector of selectors) {
            const element = modal.querySelector(selector);
            if (element) {
                let cardName = element.getAttribute('data-card-name') || 
                              element.getAttribute('alt') ||
                              element.getAttribute('title') ||
                              element.textContent || 
                              element.innerText;
                
                if (cardName) {
                    // Clean up the card name
                    cardName = cardName.trim();
                    
                    // Remove common prefixes/suffixes
                    cardName = cardName.replace(/^(Card:\s*|Name:\s*|Preview:\s*)/i, '');
                    cardName = cardName.replace(/\s*\([^)]*\)$/, ''); // Remove parenthetical info
                    cardName = cardName.replace(/\s*-\s*\d+x?$/i, ''); // Remove quantity suffix
                    cardName = cardName.replace(/^\d+x?\s+/i, ''); // Remove quantity prefix
                    cardName = cardName.replace(/\s*\|\s*.*$/, ''); // Remove pipe-separated additional info
                    
                    // Skip very long or very short names
                    if (cardName.length > 2 && cardName.length < 100) {
                        console.log(`🔍 Extracted card name: "${cardName}" from ${selector}`);
                        return cardName;
                    }
                }
            }
        }
        
        // Fallback: try to extract from URL or other attributes
        const urlMatch = window.location.href.match(/card[=\/]([^&\/]+)/i);
        if (urlMatch) {
            const urlCardName = decodeURIComponent(urlMatch[1]).replace(/[_+]/g, ' ');
            console.log(`🔍 Extracted card name from URL: "${urlCardName}"`);
            return urlCardName;
        }
        
        console.log('⚠️ Could not extract card name from modal');
        return null;
    }

    // Enhance modal with OTAG information
    enhanceModal(modal) {
        if (!this.otagHelper.isLoaded) {
            console.log('⚠️ OTAG data not loaded, cannot enhance modal');
            return;
        }
        
        // Check if already enhanced
        if (modal.querySelector('.otag-enhancement')) {
            return;
        }
        
        const cardName = this.extractCardName(modal);
        if (!cardName) {
            console.log('⚠️ Could not extract card name from modal');
            return;
        }
        
        const otagData = this.otagHelper.getCardOtags(cardName);
        if (!otagData) {
            console.log(`ℹ️ No OTAG data found for card: ${cardName}`);
            return;
        }
        
        console.log(`🏷️ Enhancing modal for: ${cardName} (${otagData.otags.length} OTAGs)`);
        
        // Create OTAG display element
        const otagElement = this.createOtagDisplay(otagData);
        
        // Find the best place to insert the OTAG display
        const insertionPoint = this.findInsertionPoint(modal);
        if (insertionPoint) {
            insertionPoint.appendChild(otagElement);
        } else {
            // Fallback: append to modal
            modal.appendChild(otagElement);
        }
    }

    // Find the best place to insert OTAG display
    findInsertionPoint(modal) {
        // Try to find common modal content areas
        const candidates = [
            modal.querySelector('.modal-body'),
            modal.querySelector('.modal-content'),
            modal.querySelector('.card-details'),
            modal.querySelector('.card-info'),
            modal.querySelector('.card-content')
        ];
        
        for (const candidate of candidates) {
            if (candidate) {
                return candidate;
            }
        }
        
        // Fallback: use modal itself
        return modal;
    }

    // Create OTAG display element
    createOtagDisplay(cardData) {
        const container = document.createElement('div');
        container.className = 'otag-enhancement';
        container.style.cssText = `
            margin: 15px 0;
            padding: 15px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 12px;
            border: 2px solid #cbd5e1;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        `;
        
        // Group OTAGs by category for better display
        const groupedOtags = this.groupOtags(cardData.otags);
        
        container.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                margin-bottom: 12px;
                color: #1e293b;
                font-weight: 600;
                font-size: 16px;
            ">
                <span style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 6px;
                    margin-right: 8px;
                    font-size: 12px;
                ">🏷️</span>
                Functional Tags (${cardData.otags.length})
            </div>
            
            ${this.renderOtagGroups(groupedOtags)}
            
            <div style="
                margin-top: 12px;
                padding-top: 8px;
                border-top: 1px solid #cbd5e1;
                font-size: 11px;
                color: #64748b;
                text-align: center;
            ">
                💡 Click tags to search for similar cards
            </div>
        `;
        
        // Add click handlers for tags
        this.addTagClickHandlers(container, cardData.otags);
        
        return container;
    }

    // Group OTAGs by category for organized display
    groupOtags(otags) {
        const groups = {
            'Keywords': [],
            'Tribes': [],
            'Colors': [],
            'Types': [],
            'Functions': [],
            'Format': [],
            'Other': []
        };
        
        otags.forEach(otag => {
            if (otag.startsWith('keyword-')) {
                groups.Keywords.push(otag);
            } else if (otag.startsWith('tribe-')) {
                groups.Tribes.push(otag);
            } else if (otag.startsWith('mono-') || otag === 'multicolor' || otag === 'colorless') {
                groups.Colors.push(otag);
            } else if (otag.startsWith('legal-in-')) {
                groups.Format.push(otag);
            } else if (['artifacts', 'enchantments', 'planeswalkers', 'lands', 'equipment'].includes(otag)) {
                groups.Types.push(otag);
            } else if (['card-draw', 'removal', 'mana-acceleration', 'counterspells', 'tutors', 'recursion'].includes(otag)) {
                groups.Functions.push(otag);
            } else {
                groups.Other.push(otag);
            }
        });
        
        // Remove empty groups
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) {
                delete groups[key];
            }
        });
        
        return groups;
    }

    // Render OTAG groups with nice styling
    renderOtagGroups(groupedOtags) {
        const groupColors = {
            'Keywords': '#10b981',
            'Tribes': '#f59e0b',
            'Colors': '#8b5cf6',
            'Types': '#3b82f6',
            'Functions': '#ef4444',
            'Format': '#6b7280',
            'Other': '#64748b'
        };
        
        return Object.entries(groupedOtags).map(([groupName, otags]) => {
            const color = groupColors[groupName] || '#64748b';
            
            return `
                <div style="margin-bottom: 12px;">
                    <div style="
                        font-size: 12px;
                        font-weight: 600;
                        color: ${color};
                        margin-bottom: 6px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">${groupName} (${otags.length})</div>
                    
                    <div style="
                        display: flex;
                        flex-wrap: wrap;
                        gap: 4px;
                    ">
                        ${otags.map(otag => `
                            <span class="otag-tag" data-otag="${otag}" style="
                                background: ${color}15;
                                color: ${color};
                                border: 1px solid ${color}30;
                                padding: 2px 6px;
                                border-radius: 4px;
                                font-size: 10px;
                                font-weight: 500;
                                cursor: pointer;
                                transition: all 0.2s ease;
                            " onmouseover="
                                this.style.background='${color}25';
                                this.style.transform='translateY(-1px)';
                            " onmouseout="
                                this.style.background='${color}15';
                                this.style.transform='translateY(0)';
                            ">${this.formatOtagDisplay(otag)}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Format OTAG for display (remove prefixes, capitalize, etc.)
    formatOtagDisplay(otag) {
        return otag
            .replace(/^(keyword-|tribe-|mono-|legal-in-|rarity-|set-)/, '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    // Add click handlers for OTAG tags
    addTagClickHandlers(container, otags) {
        const tagElements = container.querySelectorAll('.otag-tag');
        tagElements.forEach(tagElement => {
            tagElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const otag = tagElement.getAttribute('data-otag');
                this.handleTagClick(otag);
            });
        });
    }

    // Handle OTAG tag click - integrate with existing search system
    handleTagClick(otag) {
        console.log(`🔍 Searching for cards with OTAG: ${otag}`);
        
        const results = this.otagHelper.searchByOtag(otag);
        
        if (results.length > 0) {
            console.log(`✅ Found ${results.length} cards with OTAG: ${otag}`);
            
            // Convert OTAG results to Scryfall-compatible format
            const scryfallResults = this.convertOtagResultsToScryfall(results);
            
            // Use existing search modal system if available
            if (window.createModalWithData) {
                // Store results for the existing modal system
                window.lastAllResults = scryfallResults;
                window.allSearchResults = scryfallResults;
                window.searchResults = scryfallResults;
                
                // Create modal with the OTAG search query
                const searchQuery = this.formatOtagForSearch(otag);
                window.createModalWithData(scryfallResults, searchQuery);
                
                console.log(`🎯 Opened search modal with ${results.length} cards for OTAG: ${otag}`);
            } else {
                // Fallback to custom modal
                this.showOtagSearchResults(otag, results);
            }
        } else {
            console.log(`❌ No cards found with OTAG: ${otag}`);
        }
    }

    // Convert OTAG results to Scryfall-compatible format
    convertOtagResultsToScryfall(otagResults) {
        return otagResults.map(card => ({
            name: card.name,
            mana_cost: this.reconstructManaCost(card.cmc, card.colors),
            type_line: card.typeLine || 'Unknown',
            oracle_text: `Functional tags: ${card.otags.slice(0, 5).join(', ')}${card.otags.length > 5 ? '...' : ''}`,
            colors: card.colors || [],
            cmc: card.cmc || 0,
            set: card.set || 'unknown',
            image_uris: {
                normal: `https://api.scryfall.com/cards/named?format=image&version=normal&fuzzy=${encodeURIComponent(card.name)}`
            },
            // Add OTAG-specific data
            otag_data: card,
            search_source: 'otag'
        }));
    }

    // Reconstruct basic mana cost from CMC and colors
    reconstructManaCost(cmc, colors) {
        if (cmc === 0) return '{0}';
        if (!colors || colors.length === 0) return `{${cmc}}`;
        
        // Simple reconstruction - can be enhanced
        const colorSymbols = colors.map(c => `{${c}}`).join('');
        const generic = Math.max(0, cmc - colors.length);
        return generic > 0 ? `{${generic}}${colorSymbols}` : colorSymbols;
    }

    // Format OTAG for search display
    formatOtagForSearch(otag) {
        const formatted = this.formatOtagDisplay(otag);
        return `otag:${formatted}`;
    }

    // Show search results for OTAG (customize this for your site)
    showOtagSearchResults(otag, results) {
        // Create a simple results display
        const resultsModal = document.createElement('div');
        resultsModal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            padding: 20px;
            max-width: 600px;
            max-height: 70vh;
            overflow-y: auto;
            box-shadow: 0 25px 80px rgba(0,0,0,0.3);
            z-index: 10000;
            border: 2px solid #e2e8f0;
        `;
        
        resultsModal.innerHTML = `
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #f1f5f9;
            ">
                <h3 style="margin: 0; color: #1e293b;">
                    🏷️ Cards with "${this.formatOtagDisplay(otag)}"
                </h3>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 6px 12px;
                    cursor: pointer;
                ">✕ Close</button>
            </div>
            
            <div style="color: #64748b; margin-bottom: 15px;">
                Found ${results.length} cards
            </div>
            
            <div style="display: grid; gap: 8px;">
                ${results.slice(0, 50).map(card => `
                    <div style="
                        padding: 8px 12px;
                        background: #f8fafc;
                        border-radius: 6px;
                        border: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <div>
                            <strong>${card.name}</strong>
                            <div style="font-size: 12px; color: #64748b;">
                                ${card.typeLine} • ${card.set.toUpperCase()} • ${card.otags.length} tags
                            </div>
                        </div>
                        <div style="font-size: 12px; font-weight: bold; color: #6b7280;">
                            ${card.cmc}
                        </div>
                    </div>
                `).join('')}
                ${results.length > 50 ? `
                    <div style="text-align: center; color: #64748b; font-style: italic;">
                        ... and ${results.length - 50} more cards
                    </div>
                ` : ''}
            </div>
        `;
        
        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
        `;
        backdrop.addEventListener('click', () => {
            backdrop.remove();
            resultsModal.remove();
        });
        
        document.body.appendChild(backdrop);
        document.body.appendChild(resultsModal);
    }

    // Stop monitoring
    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.isActive = false;
        console.log('⏹️ Modal monitoring stopped');
    }
}

// Global instances
window.localOtagHelper = new LocalOtagHelper();
window.otagModalEnhancer = new OtagModalEnhancer(window.localOtagHelper);

// Helper functions for easy use
window.loadOtagDataFromFile = function(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const csvContent = e.target.result;
        window.localOtagHelper.loadFromCSV(csvContent);
    };
    reader.readAsText(file);
};

window.loadOtagDataFromText = function(csvText) {
    return window.localOtagHelper.loadFromCSV(csvText);
};

window.searchCardsByOtag = function(otagQuery) {
    return window.localOtagHelper.searchByOtag(otagQuery);
};

window.getCardOtags = function(cardName) {
    return window.localOtagHelper.getCardOtags(cardName);
};

window.getOtagStats = function() {
    return window.localOtagHelper.getOtagStats();
};

// Expose manual modal enhancement
window.enhanceModalWithOtags = function(modalElement) {
    window.otagModalEnhancer.enhanceModal(modalElement);
};

console.log('✅ Local OTAG Helper System loaded!');
console.log('💡 Usage:');
console.log('  loadOtagDataFromText(csvContent) - Load OTAG data from CSV text');
console.log('  getCardOtags("Card Name") - Get OTAG data for a card');
console.log('  searchCardsByOtag("removal") - Search cards by OTAG');
console.log('  getOtagStats() - Get OTAG statistics');
console.log('🏷️ Modal enhancement is automatically active!');
