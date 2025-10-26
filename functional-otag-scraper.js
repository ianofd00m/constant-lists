// Scryfall Functional OTAG Scraper - Gets proper oracle tags from Scryfall API
// This scraper gets the actual functional oracle tags that are useful for deck building

const API_BASE = 'https://api.scryfall.com';
const DELAY_MS = 100; // Scryfall rate limit: 10 requests per second

class FunctionalOtagScraper {
    constructor() {
        this.allCards = [];
        this.processedCount = 0;
        this.totalCards = 0;
        this.errors = [];
        this.functionalTags = new Map(); // cardName -> {otags: [...], artTags: [...]}
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetchWithRetry(url, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                console.log(`🌐 Fetching: ${url}`);
                const response = await fetch(url);
                
                if (response.status === 429) {
                    console.log('⏳ Rate limited, waiting 2 seconds...');
                    await this.sleep(2000);
                    continue;
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.json();
            } catch (error) {
                console.log(`❌ Attempt ${i + 1} failed: ${error.message}`);
                if (i === maxRetries - 1) throw error;
                await this.sleep(1000 * (i + 1));
            }
        }
    }

    async getBulkData() {
        console.log('📊 Getting bulk data catalog...');
        const catalog = await this.fetchWithRetry(`${API_BASE}/bulk-data`);
        
        // Find the default cards bulk data (has oracle tags)
        const defaultCards = catalog.data.find(item => item.type === 'default_cards');
        if (!defaultCards) {
            throw new Error('Default cards bulk data not found');
        }

        console.log(`📥 Downloading bulk data: ${defaultCards.download_uri}`);
        console.log(`📄 Size: ${(defaultCards.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📅 Updated: ${defaultCards.updated_at}`);

        const bulkResponse = await fetch(defaultCards.download_uri);
        if (!bulkResponse.ok) {
            throw new Error(`Failed to download bulk data: ${bulkResponse.statusText}`);
        }

        const bulkData = await bulkResponse.json();
        console.log(`✅ Downloaded ${bulkData.length} cards`);
        
        return bulkData;
    }

    extractFunctionalTags(card) {
        const result = {
            cardName: card.name,
            oracleTags: [],
            artTags: []
        };

        // Extract oracle tags (functional tags)
        if (card.oracle_tags && Array.isArray(card.oracle_tags)) {
            result.oracleTags = [...card.oracle_tags];
        }

        // Extract art tags if available
        if (card.art_tags && Array.isArray(card.art_tags)) {
            result.artTags = [...card.art_tags];
        }

        return result;
    }

    async processAllCards() {
        console.log('🚀 Starting functional OTAG scraper...');
        console.log('🔍 Testing bulk data structure first...');
        
        const bulkData = await this.getBulkData();
        this.totalCards = bulkData.length;
        
        // Test first few cards to see structure
        console.log(`🧪 Testing first 10 cards for oracle tag structure...`);
        for (let i = 0; i < Math.min(10, bulkData.length); i++) {
            const card = bulkData[i];
            console.log(`� ${card.name}:`);
            console.log(`  - oracle_tags: ${JSON.stringify(card.oracle_tags)}`);
            console.log(`  - art_tags: ${JSON.stringify(card.art_tags)}`);
            console.log(`  - all keys: ${Object.keys(card).join(', ')}`);
        }
        
        console.log(`�🔄 Processing ${this.totalCards} cards for functional tags...`);
        
        for (const card of bulkData) {
            try {
                // Skip non-English cards and tokens
                if (card.lang !== 'en' || card.layout === 'token') {
                    continue;
                }

                const tagData = this.extractFunctionalTags(card);
                
                // Debug Sol Ring specifically
                if (card.name.toLowerCase().includes('sol ring')) {
                    console.log(`🔍 Found Sol Ring: ${JSON.stringify(tagData)}`);
                }
                
                // Only store cards that have functional oracle tags
                if (tagData.oracleTags.length > 0) {
                    const key = card.name.toLowerCase().trim();
                    
                    // If we already have this card, merge the tags
                    if (this.functionalTags.has(key)) {
                        const existing = this.functionalTags.get(key);
                        const mergedOracleTags = [...new Set([...existing.oracleTags, ...tagData.oracleTags])];
                        const mergedArtTags = [...new Set([...existing.artTags, ...tagData.artTags])];
                        
                        this.functionalTags.set(key, {
                            cardName: card.name,
                            oracleTags: mergedOracleTags,
                            artTags: mergedArtTags
                        });
                    } else {
                        this.functionalTags.set(key, tagData);
                    }
                }
                
                this.processedCount++;
                
                if (this.processedCount % 10000 === 0) {
                    console.log(`📊 Processed ${this.processedCount}/${this.totalCards} cards, found ${this.functionalTags.size} with functional tags`);
                }
                
            } catch (error) {
                this.errors.push({
                    card: card.name,
                    error: error.message
                });
                console.log(`❌ Error processing ${card.name}: ${error.message}`);
            }
        }
        
        console.log(`✅ Processing complete!`);
        console.log(`📊 Total cards processed: ${this.processedCount}`);
        console.log(`🏷️ Cards with functional tags: ${this.functionalTags.size}`);
        console.log(`❌ Errors: ${this.errors.length}`);
        
        return this.functionalTags;
    }

    generateCSV() {
        console.log('📄 Generating CSV...');
        
        const header = 'cardName,oracleTags,artTags,oracleTagCount,artTagCount\n';
        const rows = [];
        
        for (const [key, data] of this.functionalTags) {
            const oracleTagsStr = data.oracleTags.join('|');
            const artTagsStr = data.artTags.join('|');
            
            // Escape quotes in card names
            const cardName = data.cardName.replace(/"/g, '""');
            
            rows.push(`"${cardName}","${oracleTagsStr}","${artTagsStr}",${data.oracleTags.length},${data.artTags.length}`);
        }
        
        const csv = header + rows.join('\n');
        
        console.log(`📊 CSV generated with ${rows.length} cards`);
        console.log(`📏 Total size: ${(csv.length / 1024 / 1024).toFixed(2)} MB`);
        
        return csv;
    }

    downloadCSV(csv, filename = 'scryfall-functional-otags.csv') {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`💾 Downloaded: ${filename}`);
    }

    async run() {
        try {
            const functionalTags = await this.processAllCards();
            
            // Test Sol Ring
            const solRingKey = 'sol ring';
            if (functionalTags.has(solRingKey)) {
                const solRingData = functionalTags.get(solRingKey);
                console.log('🔍 Sol Ring functional tags:', solRingData);
            } else {
                console.log('❌ Sol Ring not found in functional tags');
            }
            
            const csv = this.generateCSV();
            const timestamp = new Date().toISOString().split('T')[0];
            this.downloadCSV(csv, `scryfall-functional-otags-${timestamp}.csv`);
            
            return {
                totalCards: this.processedCount,
                cardsWithTags: functionalTags.size,
                errors: this.errors.length,
                csv: csv
            };
            
        } catch (error) {
            console.error('💥 Scraper failed:', error);
            throw error;
        }
    }
}

// Global function to run the scraper
window.runFunctionalOtagScraper = async function() {
    const scraper = new FunctionalOtagScraper();
    return await scraper.run();
};

console.log('🚀 Functional OTAG Scraper loaded');
console.log('💡 Run with: runFunctionalOtagScraper()');
