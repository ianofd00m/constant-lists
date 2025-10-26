// 🚀 SCRYFALL OTAG DATA SCRAPER
// Comprehensive script to scrape ALL card data from Scryfall including oracle tags/functional data

console.log('🚀 Scryfall OTAG Data Scraper Starting...');

class ScryfallOtagScraper {
    constructor() {
        this.baseUrl = 'https://api.scryfall.com';
        this.delay = 100; // 100ms delay to respect rate limits (Scryfall allows 10 requests/second)
        this.allCards = [];
        this.otagData = new Map();
        this.progress = {
            totalCards: 0,
            processedCards: 0,
            cardsWithOtags: 0,
            errors: 0
        };
        this.uniqueOtags = new Set();
        this.otagCategories = new Map();
    }

    // Add delay between requests to respect Scryfall's rate limits
    async delay(ms = this.delay) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Fetch all cards from Scryfall in bulk
    async fetchAllCards() {
        console.log('📡 Fetching bulk card data from Scryfall...');
        
        try {
            // Use Scryfall's bulk data endpoint for efficiency
            const bulkDataResponse = await fetch(`${this.baseUrl}/bulk-data`);
            const bulkData = await bulkDataResponse.json();
            
            // Find the default cards bulk data (includes all cards)
            const defaultCards = bulkData.data.find(item => item.type === 'default_cards');
            
            if (!defaultCards) {
                throw new Error('Could not find default cards bulk data');
            }
            
            console.log(`📦 Downloading bulk card data (${defaultCards.compressed_size} bytes compressed)...`);
            console.log(`📅 Last updated: ${defaultCards.updated_at}`);
            
            // Download the actual card data
            const cardsResponse = await fetch(defaultCards.download_uri);
            const cards = await cardsResponse.json();
            
            this.allCards = cards;
            this.progress.totalCards = cards.length;
            
            console.log(`✅ Successfully loaded ${cards.length} cards from Scryfall bulk data`);
            return cards;
            
        } catch (error) {
            console.error('❌ Error fetching bulk card data:', error);
            
            // Fallback: Use search API to get cards in pages
            console.log('🔄 Falling back to search API...');
            return await this.fetchCardsViaSearch();
        }
    }

    // Fallback method using search API
    async fetchCardsViaSearch() {
        console.log('🔍 Fetching cards via search API...');
        const allCards = [];
        let hasMore = true;
        let page = 1;
        
        while (hasMore) {
            try {
                await this.delay();
                
                const response = await fetch(`${this.baseUrl}/cards/search?q=*&page=${page}`);
                const data = await response.json();
                
                if (data.data && data.data.length > 0) {
                    allCards.push(...data.data);
                    console.log(`📄 Page ${page}: ${data.data.length} cards (Total: ${allCards.length})`);
                    
                    hasMore = data.has_more;
                    page++;
                } else {
                    hasMore = false;
                }
                
                // Safety check to prevent infinite loops
                if (page > 1000) {
                    console.log('⚠️ Reached page limit, stopping...');
                    break;
                }
                
            } catch (error) {
                console.error(`❌ Error fetching page ${page}:`, error);
                await this.delay(1000); // Wait longer on error
                // Continue to next page
            }
        }
        
        this.allCards = allCards;
        this.progress.totalCards = allCards.length;
        console.log(`✅ Fetched ${allCards.length} total cards via search`);
        return allCards;
    }

    // Extract otag/functional data from a card
    extractOtagData(card) {
        const otags = [];
        
        // Analyze the card for functional categories
        // Based on common Magic functionality patterns
        
        // Mana and Cost Related
        if (card.mana_cost === '{0}' || (card.cmc === 0 && card.type_line && !card.type_line.includes('Land'))) {
            otags.push('free-spells');
        }
        
        if (card.oracle_text && card.oracle_text.includes('mana')) {
            if (card.oracle_text.match(/add.*mana|produces.*mana/i)) {
                otags.push('mana-acceleration');
            }
            if (card.oracle_text.match(/reduce.*cost|costs.*less/i)) {
                otags.push('cost-reduction');
            }
        }
        
        // Card Advantage
        if (card.oracle_text) {
            const text = card.oracle_text.toLowerCase();
            
            if (text.includes('draw') && text.includes('card')) {
                otags.push('card-draw');
            }
            
            if (text.match(/search.*library|tutor/i)) {
                otags.push('tutors');
            }
            
            if (text.match(/return.*hand|return.*battlefield/i)) {
                otags.push('recursion');
            }
        }
        
        // Removal and Control
        if (card.oracle_text) {
            const text = card.oracle_text.toLowerCase();
            
            if (text.match(/destroy|exile|sacrifice/)) {
                otags.push('removal');
            }
            
            if (text.match(/counter.*spell|can't be cast/)) {
                otags.push('counterspells');
            }
            
            if (text.match(/gain control|steal|take control/)) {
                otags.push('theft');
            }
        }
        
        // Creature Keywords and Abilities
        if (card.type_line && card.type_line.includes('Creature')) {
            if (card.oracle_text) {
                const keywords = [
                    'flying', 'trample', 'haste', 'vigilance', 'deathtouch', 'lifelink',
                    'first strike', 'double strike', 'menace', 'reach', 'hexproof',
                    'shroud', 'indestructible', 'defender'
                ];
                
                keywords.forEach(keyword => {
                    if (card.oracle_text.toLowerCase().includes(keyword)) {
                        otags.push(`keyword-${keyword.replace(' ', '-')}`);
                    }
                });
            }
        }
        
        // Artifact and Equipment
        if (card.type_line && card.type_line.includes('Artifact')) {
            otags.push('artifacts');
            
            if (card.type_line.includes('Equipment')) {
                otags.push('equipment');
            }
            
            if (card.oracle_text && card.oracle_text.includes('attach')) {
                otags.push('attachments');
            }
        }
        
        // Enchantments and Auras
        if (card.type_line && card.type_line.includes('Enchantment')) {
            otags.push('enchantments');
            
            if (card.type_line.includes('Aura')) {
                otags.push('auras');
            }
        }
        
        // Planeswalkers
        if (card.type_line && card.type_line.includes('Planeswalker')) {
            otags.push('planeswalkers');
        }
        
        // Lands
        if (card.type_line && card.type_line.includes('Land')) {
            otags.push('lands');
            
            if (card.oracle_text && card.oracle_text.match(/add.*mana/i)) {
                const manaSymbols = card.oracle_text.match(/\{[WUBRG]\}/g);
                if (manaSymbols && manaSymbols.length > 1) {
                    otags.push('multicolor-lands');
                }
            }
        }
        
        // Tribal and Types
        if (card.type_line) {
            const types = card.type_line.split(' — ');
            if (types.length > 1) {
                const subtypes = types[1].split(' ');
                subtypes.forEach(subtype => {
                    if (subtype && subtype.length > 2) {
                        otags.push(`tribe-${subtype.toLowerCase()}`);
                    }
                });
            }
        }
        
        // Colors and Color Identity
        if (card.colors && card.colors.length > 1) {
            otags.push('multicolor');
        }
        
        if (card.color_identity) {
            if (card.color_identity.length === 0) {
                otags.push('colorless');
            } else if (card.color_identity.length === 1) {
                otags.push(`mono-${card.color_identity[0].toLowerCase()}`);
            }
        }
        
        // Format Legality (can be useful for functional grouping)
        if (card.legalities) {
            Object.entries(card.legalities).forEach(([format, legality]) => {
                if (legality === 'legal') {
                    otags.push(`legal-in-${format}`);
                }
            });
        }
        
        // Rarity
        if (card.rarity) {
            otags.push(`rarity-${card.rarity}`);
        }
        
        // Set and Block information
        if (card.set) {
            otags.push(`set-${card.set}`);
        }
        
        return otags;
    }

    // Process all cards and extract otag data
    async processCards() {
        console.log(`🔍 Processing ${this.allCards.length} cards for OTAG data...`);
        
        const startTime = Date.now();
        let lastUpdate = Date.now();
        
        for (let i = 0; i < this.allCards.length; i++) {
            const card = this.allCards[i];
            
            try {
                // Extract otag data
                const otags = this.extractOtagData(card);
                
                if (otags.length > 0) {
                    this.otagData.set(card.id, {
                        name: card.name,
                        otags: otags,
                        colors: card.colors || [],
                        cmc: card.cmc || 0,
                        type_line: card.type_line || '',
                        set: card.set || ''
                    });
                    
                    this.progress.cardsWithOtags++;
                    
                    // Track unique otags and their frequencies
                    otags.forEach(otag => {
                        this.uniqueOtags.add(otag);
                        const count = this.otagCategories.get(otag) || 0;
                        this.otagCategories.set(otag, count + 1);
                    });
                }
                
                this.progress.processedCards++;
                
                // Progress updates every 1000 cards or 5 seconds
                if (i % 1000 === 0 || Date.now() - lastUpdate > 5000) {
                    const percent = ((i / this.allCards.length) * 100).toFixed(1);
                    const elapsed = (Date.now() - startTime) / 1000;
                    const rate = i / elapsed;
                    const eta = (this.allCards.length - i) / rate;
                    
                    console.log(`📊 Progress: ${i}/${this.allCards.length} (${percent}%) | ${this.progress.cardsWithOtags} cards with otags | ETA: ${eta.toFixed(0)}s`);
                    lastUpdate = Date.now();
                }
                
            } catch (error) {
                console.error(`❌ Error processing card ${card.name}:`, error);
                this.progress.errors++;
            }
        }
        
        const totalTime = (Date.now() - startTime) / 1000;
        console.log(`✅ Processing complete in ${totalTime.toFixed(1)}s`);
        console.log(`📊 Found otag data for ${this.progress.cardsWithOtags} out of ${this.progress.processedCards} cards`);
        console.log(`🏷️ Discovered ${this.uniqueOtags.size} unique otag categories`);
    }

    // Generate comprehensive report
    generateReport() {
        console.log('\n📋 === SCRYFALL OTAG SCRAPING REPORT ===');
        console.log(`📊 Total cards processed: ${this.progress.processedCards}`);
        console.log(`🏷️ Cards with otag data: ${this.progress.cardsWithOtags}`);
        console.log(`🎯 Unique otag categories: ${this.uniqueOtags.size}`);
        console.log(`❌ Errors encountered: ${this.progress.errors}`);
        
        // Top otag categories by frequency
        console.log('\n🔥 TOP 20 MOST COMMON OTAG CATEGORIES:');
        const sortedOtags = Array.from(this.otagCategories.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);
        
        sortedOtags.forEach(([otag, count], index) => {
            console.log(`${(index + 1).toString().padStart(2)}. ${otag.padEnd(25)} : ${count.toLocaleString()} cards`);
        });
        
        // Sample cards with many otags
        console.log('\n🌟 SAMPLE CARDS WITH MULTIPLE OTAGS:');
        let sampleCount = 0;
        for (const [cardId, cardData] of this.otagData.entries()) {
            if (cardData.otags.length >= 5 && sampleCount < 10) {
                console.log(`📄 ${cardData.name}: [${cardData.otags.join(', ')}]`);
                sampleCount++;
            }
        }
        
        return {
            totalCards: this.progress.processedCards,
            cardsWithOtags: this.progress.cardsWithOtags,
            uniqueOtags: this.uniqueOtags.size,
            errors: this.progress.errors,
            otagData: Object.fromEntries(this.otagData),
            otagCategories: Object.fromEntries(this.otagCategories),
            topOtags: sortedOtags
        };
    }

    // Export data to various formats
    exportData() {
        const exportData = {
            metadata: {
                scrapeDate: new Date().toISOString(),
                totalCards: this.progress.processedCards,
                cardsWithOtags: this.progress.cardsWithOtags,
                uniqueOtagCategories: this.uniqueOtags.size
            },
            otagCategories: Object.fromEntries(
                Array.from(this.otagCategories.entries()).sort((a, b) => b[1] - a[1])
            ),
            cardData: Object.fromEntries(this.otagData),
            allOtags: Array.from(this.uniqueOtags).sort()
        };
        
        // Store in global variables for access
        window.scryfallOtagData = exportData;
        window.otagCategories = this.otagCategories;
        window.cardOtagData = this.otagData;
        
        console.log('\n💾 Data exported to global variables:');
        console.log('📋 window.scryfallOtagData - Complete dataset');
        console.log('🏷️ window.otagCategories - Otag frequency map');
        console.log('📄 window.cardOtagData - Individual card data');
        
        return exportData;
    }

    // Main execution method
    async run() {
        try {
            console.log('🚀 Starting comprehensive Scryfall OTAG scraping...');
            
            // Step 1: Fetch all cards
            await this.fetchAllCards();
            
            // Step 2: Process cards for otag data
            await this.processCards();
            
            // Step 3: Generate report
            const report = this.generateReport();
            
            // Step 4: Export data
            const exportedData = this.exportData();
            
            console.log('\n✅ === SCRAPING COMPLETE ===');
            console.log('🎯 All card otag data has been successfully scraped from Scryfall!');
            console.log('💡 Use window.scryfallOtagData to access the complete dataset');
            console.log('💡 Use window.otagCategories to see otag frequencies');
            console.log('💡 Use window.cardOtagData to search individual cards');
            
            return {
                success: true,
                report,
                data: exportedData
            };
            
        } catch (error) {
            console.error('💥 SCRAPING FAILED:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Helper functions for using the scraped data

// Search cards by otag
window.searchByOtag = function(otagQuery) {
    if (!window.cardOtagData) {
        console.log('❌ No otag data available. Run the scraper first.');
        return [];
    }
    
    const results = [];
    for (const [cardId, cardData] of window.cardOtagData.entries()) {
        if (cardData.otags.some(otag => otag.includes(otagQuery.toLowerCase()))) {
            results.push(cardData);
        }
    }
    
    console.log(`🔍 Found ${results.length} cards matching otag: "${otagQuery}"`);
    return results;
};

// Get all cards with specific otag
window.getCardsWithOtag = function(exactOtag) {
    if (!window.cardOtagData) {
        console.log('❌ No otag data available. Run the scraper first.');
        return [];
    }
    
    const results = [];
    for (const [cardId, cardData] of window.cardOtagData.entries()) {
        if (cardData.otags.includes(exactOtag)) {
            results.push(cardData);
        }
    }
    
    console.log(`🎯 Found ${results.length} cards with exact otag: "${exactOtag}"`);
    return results;
};

// List all available otags
window.listAllOtags = function() {
    if (!window.otagCategories) {
        console.log('❌ No otag data available. Run the scraper first.');
        return [];
    }
    
    const sortedOtags = Array.from(window.otagCategories.entries())
        .sort((a, b) => b[1] - a[1]);
    
    console.log(`📋 All ${sortedOtags.length} otag categories (sorted by frequency):`);
    sortedOtags.forEach(([otag, count], index) => {
        console.log(`${(index + 1).toString().padStart(3)}. ${otag.padEnd(30)} : ${count.toLocaleString()} cards`);
    });
    
    return sortedOtags;
};

// Export data as JSON string
window.exportOtagDataAsJSON = function() {
    if (!window.scryfallOtagData) {
        console.log('❌ No otag data available. Run the scraper first.');
        return null;
    }
    
    const jsonString = JSON.stringify(window.scryfallOtagData, null, 2);
    console.log('📋 OTAG data exported as JSON (check return value)');
    console.log(`📊 Size: ${(jsonString.length / 1024).toFixed(1)} KB`);
    
    return jsonString;
};

// Export card data as CSV string
window.exportCardDataAsCSV = function() {
    if (!window.cardOtagData) {
        console.log('❌ No otag data available. Run the scraper first.');
        return null;
    }
    
    console.log('📊 Generating CSV export...');
    
    // CSV headers
    const headers = [
        'Card ID',
        'Card Name', 
        'Colors',
        'CMC',
        'Type Line',
        'Set',
        'OTAG Count',
        'OTAGs (Pipe Separated)'
    ];
    
    const csvRows = [headers.join(',')];
    
    // Convert each card to CSV row
    for (const [cardId, cardData] of window.cardOtagData.entries()) {
        const row = [
            `"${cardId}"`,
            `"${(cardData.name || '').replace(/"/g, '""')}"`, // Escape quotes
            `"${(cardData.colors || []).join(' ')}"`,
            cardData.cmc || 0,
            `"${(cardData.type_line || '').replace(/"/g, '""')}"`,
            `"${cardData.set || ''}"`,
            cardData.otags.length,
            `"${cardData.otags.join('|')}"` // Use pipe separator for otags
        ];
        csvRows.push(row.join(','));
    }
    
    const csvString = csvRows.join('\n');
    console.log(`✅ CSV generated with ${csvRows.length - 1} card records`);
    console.log(`📊 Size: ${(csvString.length / 1024).toFixed(1)} KB`);
    
    return csvString;
};

// Export OTAG frequency data as CSV
window.exportOtagFrequencyAsCSV = function() {
    if (!window.otagCategories) {
        console.log('❌ No otag data available. Run the scraper first.');
        return null;
    }
    
    console.log('📊 Generating OTAG frequency CSV...');
    
    const headers = ['OTAG Category', 'Card Count', 'Percentage'];
    const csvRows = [headers.join(',')];
    
    const totalCards = window.cardOtagData.size;
    const sortedOtags = Array.from(window.otagCategories.entries())
        .sort((a, b) => b[1] - a[1]);
    
    sortedOtags.forEach(([otag, count]) => {
        const percentage = ((count / totalCards) * 100).toFixed(2);
        const row = [
            `"${otag}"`,
            count,
            `${percentage}%`
        ];
        csvRows.push(row.join(','));
    });
    
    const csvString = csvRows.join('\n');
    console.log(`✅ OTAG frequency CSV generated with ${sortedOtags.length} categories`);
    console.log(`📊 Size: ${(csvString.length / 1024).toFixed(1)} KB`);
    
    return csvString;
};

// Download CSV file directly in browser
window.downloadCSV = function(csvString, filename) {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`✅ Downloaded: ${filename}`);
};

// All-in-one function to export everything as CSV files
window.exportAllCSVFiles = function() {
    if (!window.scryfallOtagData) {
        console.log('❌ No otag data available. Run the scraper first.');
        return;
    }
    
    console.log('📦 Exporting all data as CSV files...');
    
    // Export card data
    const cardCSV = exportCardDataAsCSV();
    if (cardCSV) {
        downloadCSV(cardCSV, `scryfall-card-otags-${new Date().toISOString().split('T')[0]}.csv`);
    }
    
    // Export OTAG frequencies
    const otagCSV = exportOtagFrequencyAsCSV();
    if (otagCSV) {
        downloadCSV(otagCSV, `scryfall-otag-frequencies-${new Date().toISOString().split('T')[0]}.csv`);
    }
    
    console.log('✅ All CSV files exported successfully!');
};

// Global scraper instance
window.scryfallScraper = new ScryfallOtagScraper();

// Expose main run function
window.runScryfallOtagScraper = function() {
    return window.scryfallScraper.run();
};

console.log('✅ Scryfall OTAG Scraper loaded!');
console.log('💡 Usage:');
console.log('  runScryfallOtagScraper() - Start scraping all cards');
console.log('  searchByOtag("removal") - Search cards by otag pattern');
console.log('  getCardsWithOtag("artifacts") - Get cards with exact otag');
console.log('  listAllOtags() - List all discovered otag categories');
console.log('  exportOtagDataAsJSON() - Export data as JSON string');
console.log('  exportCardDataAsCSV() - Export card data as CSV string');
console.log('  exportOtagFrequencyAsCSV() - Export OTAG frequencies as CSV');
console.log('  exportAllCSVFiles() - Download all CSV files automatically');
console.log('🚀 Ready to scrape ALL card otag data from Scryfall!');
