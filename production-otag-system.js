/**
 * Production OTAG System - Fully Automated
 * No user interaction required - loads data automatically and enhances all modals
 */

class ProductionOtagSystem {
    constructor() {
        this.isReady = false;
        this.isLoaded = false;
        this.otagDatabase = new Map();
        this.cardNameMap = new Map();
        this.searchCache = new Map();
        this.stats = {
            totalCards: 0,
            totalOtags: 0,
            topOtags: []
        };
        
        console.log('🏷️ Production OTAG System initializing...');
        this.initialize();
    }

    async initialize() {
        try {
            // Auto-load OTAG data from your server
            await this.loadOtagDataFromServer();
            
            // Start monitoring for modals
            this.startModalMonitoring();
            
            // Hook into existing search system
            this.setupSearchIntegration();
            
            this.isReady = true;
            console.log('✅ Production OTAG System ready');
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('otagSystemReady', {
                detail: { stats: this.stats }
            }));
            
        } catch (error) {
            console.error('❌ Failed to initialize OTAG system:', error);
        }
    }

    async loadOtagDataFromServer() {
        const cacheKey = 'production-otag-data-v2';
        const cacheTimestamp = 'production-otag-timestamp-v2';
        const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
        
        try {
            // Check cache first
            const cachedData = localStorage.getItem(cacheKey);
            const cachedTime = localStorage.getItem(cacheTimestamp);
            
            console.log('🔍 Cache check:', { 
                hasCachedData: !!cachedData, 
                hasCachedTime: !!cachedTime,
                cachedDataLength: cachedData ? cachedData.length : 0,
                cachedDataType: typeof cachedData,
                cachedData: cachedData
            });
            
            // More robust cache check - must have both data and time, and data must not be empty
            let shouldUseCache = false;
            let parsedData = null;
            
            if (cachedData && cachedTime && cachedData.trim() !== '') {
                try {
                    parsedData = JSON.parse(cachedData);
                    const age = Date.now() - parseInt(cachedTime);
                    console.log(`🕐 Cache age: ${Math.round(age / 1000 / 60)} minutes`);
                    
                    if (age < CACHE_DURATION && parsedData && parsedData.length > 0) {
                        shouldUseCache = true;
                        console.log('📋 Loading OTAG data from cache...');
                        console.log(`📊 Cached data contains: ${parsedData.length} entries`);
                    } else {
                        console.log('🔄 Cache expired or empty, will fetch fresh data');
                    }
                } catch (e) {
                    console.log('⚠️ Cache parse error:', e.message);
                    // Clear corrupted cache
                    localStorage.removeItem(cacheKey);
                    localStorage.removeItem(cacheTimestamp);
                }
            } else {
                console.log('🚫 No valid cache found, will fetch fresh data');
            }
            
            if (shouldUseCache && parsedData) {
                this.processOtagData(parsedData);
                return;
            }
            
            // If we reach here, we need to load fresh data
            console.log('🌐 Loading OTAG data from server...');
            
            // Try multiple data sources
            const dataSources = [
                './scryfall-card-otags-2025-08-06.csv',
                './data/scryfall-card-otags-2025-08-06.csv',
                './assets/scryfall-card-otags-2025-08-06.csv',
                './otag-data.csv'
            ];
            
            for (const source of dataSources) {
                try {
                    console.log(`🔍 Trying to load from: ${source}`);
                    const response = await fetch(source);
                    console.log(`📡 Response status for ${source}:`, response.status, response.statusText);
                    
                    if (response.ok) {
                        const csvText = await response.text();
                        console.log(`✅ Loaded OTAG data from: ${source} (${csvText.length} characters)`);
                        
                        const data = this.parseCSV(csvText);
                        this.processOtagData(data);
                        
                        // Cache the processed data
                        localStorage.setItem(cacheKey, JSON.stringify(data));
                        localStorage.setItem(cacheTimestamp, Date.now().toString());
                        
                        return;
                    }
                } catch (err) {
                    console.log(`⚠️ Could not load from ${source}:`, err.message);
                }
            }
            
            // If no CSV found, create minimal fallback data
            console.log('📝 Creating fallback OTAG data...');
            this.createFallbackData();
            
        } catch (error) {
            console.error('❌ Error loading OTAG data:', error);
            this.createFallbackData();
        }
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const data = [];
        
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            try {
                // Parse CSV with quoted fields
                const columns = this.parseCSVLine(line);
                if (columns.length >= 8) {
                    data.push({
                        cardId: columns[0],
                        cardName: columns[1],
                        colors: columns[2],
                        cmc: parseInt(columns[3]) || 0,
                        typeLine: columns[4],
                        set: columns[5],
                        otagCount: parseInt(columns[6]) || 0,
                        otags: columns[7] ? columns[7].split('|').filter(Boolean) : []
                    });
                }
            } catch (err) {
                // Skip malformed lines
            }
        }
        
        return data;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    processOtagData(data) {
        console.log(`🔄 Processing ${data.length} cards...`);
        
        this.otagDatabase.clear();
        this.cardNameMap.clear();
        
        let totalOtags = 0;
        const otagCounts = new Map();
        
        for (const card of data) {
            if (!card.cardName || !card.otags) continue;
            
            const cardKey = card.cardName.toLowerCase().trim();
            this.otagDatabase.set(cardKey, card);
            this.cardNameMap.set(cardKey, card.cardName);
            
            // Count OTAGs
            for (const otag of card.otags) {
                totalOtags++;
                otagCounts.set(otag, (otagCounts.get(otag) || 0) + 1);
            }
        }
        
        // Calculate stats
        this.stats = {
            totalCards: this.otagDatabase.size,
            totalOtags: otagCounts.size,
            topOtags: Array.from(otagCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20)
        };
        
        this.isLoaded = true;
        console.log(`✅ OTAG database ready: ${this.stats.totalCards} cards, ${this.stats.totalOtags} categories`);
    }

    createFallbackData() {
        // Create minimal OTAG data for common cards
        const fallbackCards = [
            { name: 'Sol Ring', otags: ['mana-acceleration', 'artifact', 'colorless', 'ramp'] },
            { name: 'Lightning Bolt', otags: ['removal', 'direct-damage', 'instant', 'mono-red'] },
            { name: 'Counterspell', otags: ['counterspell', 'instant', 'mono-blue', 'control'] },
            { name: 'Birds of Paradise', otags: ['mana-acceleration', 'creature', 'flying', 'mono-green'] },
            { name: 'Path to Exile', otags: ['removal', 'instant', 'mono-white', 'exile'] },
            { name: 'Llanowar Elves', otags: ['mana-acceleration', 'creature', 'elf', 'mono-green'] }
        ];
        
        for (const card of fallbackCards) {
            const cardKey = card.name.toLowerCase();
            this.otagDatabase.set(cardKey, {
                cardName: card.name,
                otags: card.otags,
                typeLine: 'Unknown',
                colors: '',
                cmc: 0
            });
            this.cardNameMap.set(cardKey, card.name);
        }
        
        this.isLoaded = true;
        console.log('📝 Fallback OTAG data loaded');
    }

    startModalMonitoring() {
        // Monitor DOM for modal changes
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const addedNode of mutation.addedNodes) {
                        if (addedNode.nodeType === Node.ELEMENT_NODE) {
                            this.checkForCardModal(addedNode);
                        }
                    }
                }
                
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                    this.checkForCardModal(mutation.target);
                }
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        
        // Also check existing modals
        setTimeout(() => this.scanExistingModals(), 1000);
        
        console.log('👀 Modal monitoring active');
    }

    scanExistingModals() {
        const modalSelectors = [
            '[id*="modal"]',
            '[class*="modal"]',
            '[id*="popup"]',
            '[class*="popup"]',
            '[class*="dialog"]'
        ];
        
        for (const selector of modalSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                if (this.isVisible(element)) {
                    this.checkForCardModal(element);
                }
            }
        }
    }

    checkForCardModal(element) {
        if (!element || !this.isLoaded) return;
        
        // Check if this looks like a card modal
        if (this.isCardModal(element)) {
            // Small delay to ensure modal is fully rendered
            setTimeout(() => this.enhanceModal(element), 100);
        }
    }

    isCardModal(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
        
        // Skip if already enhanced
        if (element.querySelector('.otag-enhancement')) return false;
        
        // Must be visible
        if (!this.isVisible(element)) return false;
        
        // Check for modal indicators
        const classList = element.className.toLowerCase();
        const id = (element.id || '').toLowerCase();
        
        const modalIndicators = [
            'modal', 'popup', 'dialog', 'overlay',
            'card-detail', 'card-info', 'card-preview'
        ];
        
        const hasModalClass = modalIndicators.some(indicator => 
            classList.includes(indicator) || id.includes(indicator)
        );
        
        if (!hasModalClass) return false;
        
        // Must contain card-like content
        const cardName = this.extractCardName(element);
        return cardName && cardName.length > 2;
    }

    isVisible(element) {
        if (!element) return false;
        
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               element.offsetParent !== null;
    }

    extractCardName(element) {
        // Try various selectors for card names
        const selectors = [
            '[data-card-name]',
            '.card-name',
            '.card-title',
            'h1, h2, h3',
            '.modal-title',
            '.popup-title',
            '.dialog-title'
        ];
        
        for (const selector of selectors) {
            const nameElement = element.querySelector(selector);
            if (nameElement) {
                let name = nameElement.textContent?.trim();
                if (name && name.length > 2) {
                    // Clean up the name
                    name = name.replace(/^\d+x?\s*/, ''); // Remove quantity prefix
                    name = name.replace(/\s*\([^)]*\)$/, ''); // Remove parenthetical suffix
                    return name;
                }
            }
        }
        
        // Try data attributes
        const dataName = element.getAttribute('data-card-name') || 
                         element.getAttribute('data-name') ||
                         element.getAttribute('title');
        if (dataName && dataName.length > 2) {
            return dataName.trim();
        }
        
        return null;
    }

    enhanceModal(modal) {
        if (!modal || !this.isLoaded) return;
        
        const cardName = this.extractCardName(modal);
        if (!cardName) return;
        
        const cardData = this.getCardOtags(cardName);
        if (!cardData || !cardData.otags || cardData.otags.length === 0) {
            console.log(`🔍 No OTAG data found for: ${cardName}`);
            return;
        }
        
        console.log(`🏷️ Enhancing modal for: ${cardName}`);
        
        // Create OTAG display
        const otagDisplay = this.createOtagDisplay(cardData);
        
        // Find a good place to insert it
        const insertionPoint = this.findInsertionPoint(modal);
        if (insertionPoint) {
            insertionPoint.appendChild(otagDisplay);
            console.log(`✅ OTAG enhancement added to ${cardName} modal`);
        }
    }

    getCardOtags(cardName) {
        if (!cardName) return null;
        
        const cleanName = cardName.toLowerCase().trim();
        return this.otagDatabase.get(cleanName) || null;
    }

    createOtagDisplay(cardData) {
        const container = document.createElement('div');
        container.className = 'otag-enhancement';
        container.style.cssText = `
            margin: 15px 0;
            padding: 15px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 12px;
            border: 2px solid #cbd5e1;
            font-family: 'Segoe UI', system-ui, sans-serif;
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
        const groupedOtags = this.groupOtags(cardData.otags);
        
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
                const tagElement = this.createOtagTag(tag, category);
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
    }

    groupOtags(otags) {
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
                lowerOtag.includes('ramp') || lowerOtag.includes('acceleration')) {
                groups.FUNCTIONS.push(otag);
            } else if (lowerOtag.includes('color') || lowerOtag.includes('red') || 
                      lowerOtag.includes('blue') || lowerOtag.includes('green') ||
                      lowerOtag.includes('white') || lowerOtag.includes('black') ||
                      lowerOtag.includes('mono')) {
                groups.COLORS.push(otag);
            } else if (lowerOtag.includes('legal') || lowerOtag.includes('format') ||
                      lowerOtag.includes('standard') || lowerOtag.includes('modern') ||
                      lowerOtag.includes('legacy') || lowerOtag.includes('commander')) {
                groups.FORMATS.push(otag);
            } else if (lowerOtag.includes('flying') || lowerOtag.includes('haste') ||
                      lowerOtag.includes('trample') || lowerOtag.includes('lifelink')) {
                groups.MECHANICS.push(otag);
            } else if (lowerOtag.includes('creature') || lowerOtag.includes('instant') ||
                      lowerOtag.includes('sorcery') || lowerOtag.includes('artifact') ||
                      lowerOtag.includes('enchantment')) {
                groups.TYPES.push(otag);
            } else {
                groups.OTHER.push(otag);
            }
        }
        
        return groups;
    }

    createOtagTag(otag, category) {
        const tag = document.createElement('button');
        tag.textContent = this.formatOtagName(otag);
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
            this.handleOtagSearch(otag);
        });
        
        return tag;
    }

    formatOtagName(otag) {
        return otag
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    handleOtagSearch(otag) {
        console.log(`🔍 Searching for OTAG: ${otag}`);
        
        const results = this.searchCardsByOtag(otag);
        console.log(`Found ${results.length} cards with OTAG: ${otag}`);
        
        if (results.length === 0) {
            alert(`No cards found with the tag "${this.formatOtagName(otag)}"`);
            return;
        }
        
        // Format results for existing search modal
        const formattedResults = {
            data: results.map(card => ({
                name: card.cardName,
                type_line: card.typeLine || 'Unknown',
                mana_cost: card.manaCost || '',
                colors: card.colors ? card.colors.split('') : [],
                cmc: card.cmc || 0,
                set_name: card.set || 'Unknown',
                otags: card.otags || []
            })),
            total_cards: results.length,
            has_more: false,
            object: 'list'
        };
        
        // Use existing search modal if available
        if (typeof window.createModalWithData === 'function') {
            const searchQuery = this.formatOtagName(otag);
            window.createModalWithData(formattedResults, searchQuery);
            console.log(`✅ Opened search modal for: ${searchQuery}`);
        } else {
            // Fallback: show simple alert with results
            const cardNames = results.slice(0, 10).map(card => card.cardName).join(', ');
            const message = `Cards with "${this.formatOtagName(otag)}" (${results.length} total):\n\n${cardNames}${results.length > 10 ? '\n\n...and more' : ''}`;
            alert(message);
        }
    }

    searchCardsByOtag(searchOtag) {
        const lowerOtag = searchOtag.toLowerCase();
        const results = [];
        
        for (const [cardKey, cardData] of this.otagDatabase) {
            if (cardData.otags && cardData.otags.some(otag => 
                otag.toLowerCase().includes(lowerOtag) || 
                lowerOtag.includes(otag.toLowerCase())
            )) {
                results.push(cardData);
            }
        }
        
        return results.sort((a, b) => a.cardName.localeCompare(b.cardName));
    }

    findInsertionPoint(modal) {
        // Try to find a good place to insert OTAG data
        const candidates = [
            modal.querySelector('.card-text'),
            modal.querySelector('.card-description'),
            modal.querySelector('.modal-body'),
            modal.querySelector('.popup-content'),
            modal.querySelector('.content'),
            modal
        ];
        
        for (const candidate of candidates) {
            if (candidate) return candidate;
        }
        
        return modal;
    }

    setupSearchIntegration() {
        // Enhance the existing createModalWithData function if it exists
        if (typeof window.createModalWithData === 'function') {
            const originalFunction = window.createModalWithData;
            
            window.createModalWithData = (data, query) => {
                // Call original function
                const result = originalFunction(data, query);
                
                // Enhance the modal after a short delay
                setTimeout(() => {
                    const modal = document.getElementById('show-all-modal') ||
                                document.querySelector('[id*="modal"]') ||
                                document.querySelector('.modal:last-child');
                    
                    if (modal && this.isVisible(modal)) {
                        // Add OTAG information to search results if available
                        this.enhanceSearchResults(modal, data);
                    }
                }, 200);
                
                return result;
            };
            
            console.log('🔗 Search integration active');
        }
    }

    enhanceSearchResults(modal, searchData) {
        if (!searchData || !searchData.data) return;
        
        // Find card elements in search results
        const cardElements = modal.querySelectorAll('[data-card-name], .search-result, .card-result');
        
        for (const cardElement of cardElements) {
            const cardName = cardElement.getAttribute('data-card-name') ||
                            cardElement.textContent?.trim().split('\n')[0];
            
            if (cardName) {
                const cardData = this.getCardOtags(cardName);
                if (cardData && cardData.otags && cardData.otags.length > 0) {
                    // Add a small OTAG indicator
                    const indicator = document.createElement('div');
                    indicator.style.cssText = `
                        font-size: 10px;
                        color: #64748b;
                        margin-top: 4px;
                    `;
                    indicator.textContent = `🏷️ ${cardData.otags.length} tags`;
                    cardElement.appendChild(indicator);
                }
            }
        }
    }

    // Public API methods
    getStats() {
        return { ...this.stats };
    }

    searchCards(query) {
        const lowerQuery = query.toLowerCase();
        const results = [];
        
        for (const [cardKey, cardData] of this.otagDatabase) {
            if (cardData.cardName.toLowerCase().includes(lowerQuery) ||
                cardData.otags.some(otag => otag.toLowerCase().includes(lowerQuery))) {
                results.push(cardData);
            }
        }
        
        return results;
    }

    isSystemReady() {
        return this.isReady;
    }

    isDataLoaded() {
        return this.isLoaded;
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.productionOtagSystem = new ProductionOtagSystem();
    });
} else {
    window.productionOtagSystem = new ProductionOtagSystem();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductionOtagSystem;
}

console.log('🚀 Production OTAG System script loaded');
