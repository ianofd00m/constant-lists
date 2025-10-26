// Search-Based Functional OTAG Scraper
// Since oracle tags aren't in API responses, we'll search for each tag and collect results

const API_BASE = 'https://api.scryfall.com';
const DELAY_MS = 100; // Scryfall rate limit: 10 requests per second

class SearchBasedOtagScraper {
    constructor() {
        this.functionalTags = new Map(); // cardName -> Set of oracle tags
        this.processedTags = 0;
        this.totalTags = 0;
        this.errors = [];
        this.tagStats = new Map(); // tag -> count of cards
        
        // All functional oracle tags from the documentation
        this.oracleTags = [
            // A (functional)
            'ability-counter', 'ablative-armor', 'abrade', 'absorb', 'abu-dual-land', 'abyss', 
            'acceleration', 'activated-ability', 'activate-from-command-zone',
            
            // B (functional) 
            'bablovian-faction-leader', 'backbone', 'balance', 'ball-lightning', 'banish', 
            'banish-graveyard', 'banish-hand', 'banish-spell', 'banned',
            
            // C (functional)
            'cantrip', 'card-advantage', 'card-game-reference', 'card-names', 
            'cards-in-graveyard-matter', 'card-style-matters', 'card-types-in-graveyard-matter',
            
            // Common functional tags
            'ramp', 'removal', 'counterspell', 'mana-dork', 'burn', 'draw', 'discard',
            'tutor', 'bounce', 'exile', 'destroy', 'sacrifice-outlet', 'token-producer',
            'graveyard-hate', 'artifact-hate', 'enchantment-hate', 'creature-hate',
            'planeswalker-hate', 'land-hate', 'permission', 'tap-down', 'untap',
            'protection', 'indestructible', 'hexproof', 'shroud', 'ward',
            'vigilance', 'trample', 'flying', 'first-strike', 'double-strike',
            'deathtouch', 'lifelink', 'haste', 'reach', 'flash',
            
            // More specific functional tags
            'wheel', 'wheel-symmetrical', 'wheel-one-sided', 'rack-effect',
            'stax', 'prison', 'pillow-fort', 'fog', 'wrath', 'board-wipe',
            'mass-removal', 'targeted-removal', 'spot-removal', 'edict',
            'sacrifice', 'mill', 'self-mill', 'library-manipulation',
            'top-deck-manipulation', 'scry', 'surveil', 'impulse',
            'reanimator', 'recursion', 'flashback', 'buyback', 'retrace',
            'madness', 'suspend', 'cascade', 'storm', 'dredge',
            
            // Mana and resources
            'mana-doubler', 'mana-reflection', 'mana-filter', 'mana-fixing',
            'color-fixing', 'land-ramp', 'artifact-ramp', 'creature-ramp',
            'spell-ramp', 'ritual', 'fast-mana', 'mana-rock', 'mana-creature',
            
            // Card advantage and selection
            'card-selection', 'card-filtering', 'library-search', 'deck-thinning',
            'hand-size-matters', 'hand-size-increase', 'hand-size-decrease',
            'no-maximum-hand-size', 'library-matters', 'graveyard-matters',
            
            // Combat and creatures
            'combat-trick', 'pump', 'anthem', 'lords', 'tribal', 'go-wide',
            'go-tall', 'token-swarm', 'creature-tutor', 'creature-recursion',
            'creature-sacrifice', 'creature-steal', 'creature-copy',
            
            // Artifacts and enchantments
            'artifact-synergy', 'enchantment-synergy', 'artifact-recursion',
            'enchantment-recursion', 'equipment', 'aura', 'constellation',
            'metalcraft', 'affinity', 'improvise',
            
            // Planeswalkers and loyalty
            'planeswalker-protection', 'loyalty-matters', 'superfriends',
            
            // Life and damage
            'lifegain', 'lifegain-matters', 'life-loss', 'damage-prevention',
            'damage-reduction', 'damage-redirection', 'damage-doubler',
            'damage-tripler', 'poison', 'infect', 'wither',
            
            // Counters and +1/+1
            'counter-matters', 'counter-manipulation', 'proliferate',
            'counter-doubler', 'modular', 'undying', 'persist', 'evolve',
            
            // Spells and instants/sorceries
            'spell-matters', 'instant-speed', 'split-second', 'uncounterable',
            'spell-copy', 'fork', 'twincast', 'redirect', 'deflection',
            
            // Resource denial and control
            'resource-denial', 'land-destruction', 'mana-denial', 'lock',
            'soft-lock', 'hard-lock', 'winter-orb-effect', 'static-orb-effect',
            
            // Win conditions
            'win-condition', 'alternate-win-condition', 'combo-piece',
            'infinite-combo', 'game-ending', 'finisher'
        ];
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

    async searchForTag(oracleTag) {
        try {
            let allCards = [];
            let page = 1;
            let hasMore = true;
            
            console.log(`🔍 Searching for oracle tag: ${oracleTag}`);
            
            while (hasMore) {
                const url = `${API_BASE}/cards/search?q=oracletag:${encodeURIComponent(oracleTag)}&page=${page}`;
                const data = await this.fetchWithRetry(url);
                
                if (data.data && data.data.length > 0) {
                    allCards.push(...data.data);
                    hasMore = data.has_more;
                    page++;
                    
                    // Add delay between pages
                    await this.sleep(DELAY_MS);
                } else {
                    hasMore = false;
                }
            }
            
            console.log(`✅ Found ${allCards.length} cards with oracle tag: ${oracleTag}`);
            this.tagStats.set(oracleTag, allCards.length);
            
            // Add this tag to all found cards
            for (const card of allCards) {
                if (card.lang === 'en' && card.layout !== 'token') {
                    const cardKey = card.name.toLowerCase().trim();
                    
                    if (!this.functionalTags.has(cardKey)) {
                        this.functionalTags.set(cardKey, {
                            cardName: card.name,
                            oracleTags: new Set()
                        });
                    }
                    
                    this.functionalTags.get(cardKey).oracleTags.add(oracleTag);
                }
            }
            
            return allCards.length;
            
        } catch (error) {
            console.log(`❌ Error searching for ${oracleTag}: ${error.message}`);
            this.errors.push({
                tag: oracleTag,
                error: error.message
            });
            return 0;
        }
    }

    async processAllTags() {
        console.log('🚀 Starting search-based OTAG scraper...');
        console.log(`📊 Will search for ${this.oracleTags.length} oracle tags`);
        
        this.totalTags = this.oracleTags.length;
        
        for (const tag of this.oracleTags) {
            try {
                await this.searchForTag(tag);
                this.processedTags++;
                
                if (this.processedTags % 10 === 0) {
                    console.log(`📊 Processed ${this.processedTags}/${this.totalTags} tags, found ${this.functionalTags.size} unique cards`);
                }
                
                // Delay between tag searches to respect rate limits
                await this.sleep(DELAY_MS);
                
            } catch (error) {
                console.log(`❌ Error processing tag ${tag}: ${error.message}`);
                this.errors.push({
                    tag: tag,
                    error: error.message
                });
            }
        }
        
        console.log(`✅ Processing complete!`);
        console.log(`📊 Total tags processed: ${this.processedTags}`);
        console.log(`🏷️ Unique cards found: ${this.functionalTags.size}`);
        console.log(`❌ Errors: ${this.errors.length}`);
        
        return this.functionalTags;
    }

    generateCSV() {
        console.log('📄 Generating CSV...');
        
        const header = 'cardName,oracleTags,tagCount\n';
        const rows = [];
        
        for (const [key, data] of this.functionalTags) {
            const oracleTagsArray = Array.from(data.oracleTags);
            const oracleTagsStr = oracleTagsArray.join('|');
            
            // Escape quotes in card names
            const cardName = data.cardName.replace(/"/g, '""');
            
            rows.push(`"${cardName}","${oracleTagsStr}",${oracleTagsArray.length}`);
        }
        
        const csv = header + rows.join('\n');
        
        console.log(`📊 CSV generated with ${rows.length} cards`);
        console.log(`📏 Total size: ${(csv.length / 1024 / 1024).toFixed(2)} MB`);
        
        // Log some statistics
        const topTags = Array.from(this.tagStats.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        console.log('📊 Top 10 most common oracle tags:');
        topTags.forEach(([tag, count]) => {
            console.log(`  ${tag}: ${count} cards`);
        });
        
        return csv;
    }

    downloadCSV(csv, filename = 'scryfall-search-based-otags.csv') {
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
            const functionalTags = await this.processAllTags();
            
            // Test Sol Ring
            const solRingKey = 'sol ring';
            if (functionalTags.has(solRingKey)) {
                const solRingData = functionalTags.get(solRingKey);
                const tagsArray = Array.from(solRingData.oracleTags);
                console.log(`🔍 Sol Ring functional tags: ${tagsArray.join(', ')}`);
            } else {
                console.log('❌ Sol Ring not found in functional tags');
            }
            
            const csv = this.generateCSV();
            const timestamp = new Date().toISOString().split('T')[0];
            this.downloadCSV(csv, `scryfall-search-otags-${timestamp}.csv`);
            
            return {
                totalTags: this.processedTags,
                uniqueCards: functionalTags.size,
                errors: this.errors.length,
                csv: csv,
                tagStats: this.tagStats
            };
            
        } catch (error) {
            console.error('💥 Scraper failed:', error);
            throw error;
        }
    }
}

// Global function to run the search-based scraper
window.runSearchBasedOtagScraper = async function() {
    const scraper = new SearchBasedOtagScraper();
    return await scraper.run();
};

console.log('🚀 Search-Based OTAG Scraper loaded');
console.log('💡 Run with: runSearchBasedOtagScraper()');
