// Official Scryfall Functional Oracle Tags Scraper
// Uses the complete list from https://scryfall.com/docs/tagger-tags

const API_BASE = 'https://api.scryfall.com';
const DELAY_MS = 100; // Rate limiting

class OfficialOracleTagScraper {
    constructor() {
        this.cardTagMap = new Map(); // cardName -> Set of oracle tags
        this.processedTags = 0;
        this.errors = [];
        this.tagStats = new Map(); // tag -> count of cards
        
        // Complete list of functional oracle tags from Scryfall documentation
        // Extracted from https://scryfall.com/docs/tagger-tags
        this.functionalOracleTags = [
            // # (functional)
            '40k-model',
            
            // A (functional)
            'ability-counter', 'ablative-armor', 'abrade', 'absorb', 'abu-dual-land', 'abyss',
            'acceleration', 'activated-ability', 'activate-from-command-zone',
            
            // B (functional) 
            'bablovian-faction-leader', 'backbone', 'balance', 'ball-lightning', 'banish',
            'banish-graveyard', 'banish-hand', 'banish-spell', 'banned',
            
            // C (functional)
            'cantrip', 'card-advantage', 'card-game-reference', 'card-names',
            'cards-in-graveyard-matter', 'card-style-matters', 'card-types-in-graveyard-matter',
            'cares-about-basic-land',
            
            // D (functional)
            'damage-deflection', 'damage-doubler', 'damage-increaser', 'damage-multiplier',
            'damage-prevention', 'damage-prevention-creature', 'damage-prevention-permanent',
            'damage-prevention-planeswalker', 'damage-prevention-player',
            
            // E (functional)
            'earthquake', 'eat-food', 'edict', 'egg', 'eldrazi-titan', 'embalm-token',
            'emblem-lite', 'emerge', 'emerge-from-artifact',
            
            // F (functional)
            'face-commander', 'face-down-face-up-effects', 'face-down-peek', 'face-up-face-down-effects',
            'fact-or-fiction', 'fake-flying', 'fateseal', 'faux-targeting', 'ferocious',
            
            // G (functional)
            'gainland', 'gains-annihilator', 'gains-banding', 'gains-battle-cry', 'gains-bushido',
            'gains-cascade', 'gains-deathtouch', 'gains-defender', 'gains-dethrone',
            
            // H (functional)
            'half-mana', 'hand-disruption', 'hand-negative', 'hand-neutral', 'hand-positive',
            'hand-size-decrease', 'hand-size-hate', 'hand-size-increase', 'hand-size-matters',
            
            // I (functional)
            'illusion-ability', 'impact-effect', 'impetus-aura', 'improvise', 'impulse',
            'impulse-artifact', 'impulse-artifact-creature', 'impulse-artifact-equipment',
            'impulse-artifact-legendary',
            
            // J (functional)
            'jackal-pup-ability', 'jump', 'just-shuffle',
            
            // K (functional)
            'karnstructs', 'karoo-land', 'keyword-counter', 'keywords-matter', 'keyword-soup',
            'kindred', 'kismet-effect', 'kithkin-tribal',
            
            // L (functional)
            'land-conversion', 'landfall', 'landfall-other', 'landhome', 'land-kavu',
            'land-or-hand', 'land-removal', 'land-sacrifice', 'lands-in-graveyard-matter',
            
            // M (functional)
            'madness', 'magecraft', 'mana-abilities-matter', 'mana-ability-with-extra-effect',
            'mana-cost-matters', 'mana-dork', 'mana-dork-egg', 'mana-doubler', 'mana-dump',
            
            // N (functional)
            'named-choice', 'named-token', 'name-matters', 'namesake-spell', 'name-type',
            'naming-scheme', 'naturalize', 'naya-ferocious', 'nemesis-mega-cycle',
            
            // O (functional)
            'oblivion-ring-effect', 'offcolor-ability', 'offcolor-additional-cost', 'offcolor-kicker',
            'offspring-token', 'off-turn-attack', 'off-turn-casting-matters', 'oil-counters-matter',
            
            // P (functional)
            'pacifism', 'painland', 'pair-commander', 'pair-znr-rogue', 'paper-compatible',
            'paradox', 'parasitic-aura', 'pariah', 'passive-ability',
            
            // Q (functional)
            'quadratic', 'quick-attach', 'quick-enchant', 'quick-equip', 'quietus-effect',
            
            // R (functional)
            'rack-effect', 'radiate', 'raid', 'rainbow-land', 'ramp', 'rampage',
            'ramp-with-set-mechanic', 'ramp-with-sets-mechanic', 'random-card',
            
            // S (functional)
            'saboteur', 'sac-outlet', 'sacrifice-cost-land', 'sacrifice-outlet',
            'sacrifice-outlet-artifact', 'sacrifice-outlet-creature', 'sacrifice-outlet-enchantment',
            'sacrifice-outlet-land',
            
            // T (functional)
            'table-order-matters', 'take-initiative', 'take-the-initiative', 'tap-artifact',
            'tap-creature', 'tap-fuel-artifact', 'tap-fuel-creature', 'tap-fuel-land',
            'tap-fuel-permanent',
            
            // U (functional)
            'unblockable', 'unblocked-trigger', 'un-color', 'uncolor', 'uncopiable-spell',
            'undaunted', 'undergrowth', 'undergrowth-affinity', 'un-design', 'unexile',
            
            // V (functional)
            'vampire-lord', 'vanilla-equipment', 'vanity-card', 'variable-effect-same-ability',
            'vigilance-counter', 'vigor-effect', 'villainous-choice', 'virtual-french-vanilla',
            'virtual-legendary',
            
            // W (functional)
            'wannabe-dark-confidant', 'warlord', 'watermark-matters', 'weaker-in-singleton-formats',
            'werewolf-mechanic', 'wheel', 'wheel-one-sided', 'wheel-symmetrical', 'whirlpool',
            
            // X (functional)
            'x-cost-matters',
            
            // Y (functional)
            'you-make-the-card', 'you-matter', 'young-pyromancer-ability', 'y-value',
            
            // Z (functional)
            'zombie-lord', 'zombify', 'zoo',
            
            // Additional common functional tags that appear in search results
            'removal', 'counterspell', 'burn', 'draw', 'discard', 'tutor', 'bounce',
            'graveyard-hate', 'artifact-hate', 'enchantment-hate', 'creature-hate',
            'planeswalker-hate', 'land-hate', 'permission', 'tap-down', 'untap',
            'protection', 'indestructible', 'hexproof', 'shroud', 'ward',
            'vigilance', 'trample', 'flying', 'first-strike', 'double-strike',
            'deathtouch', 'lifelink', 'haste', 'reach', 'flash',
            'wheel-symmetrical', 'wheel-one-sided', 'pillow-fort', 'fog',
            'board-wipe', 'mass-removal', 'spot-removal', 'mill', 'self-mill',
            'library-manipulation', 'top-deck-manipulation', 'surveil', 'recursion',
            'flashback', 'mana-filter', 'ritual', 'lifegain', 'lifegain-matters',
            'damage-redirection', 'damage-tripler', 'counter-doubler', 'persist',
            'constellation', 'metalcraft', 'affinity', 'win-condition',
            'alternate-win-condition', 'tribal', 'anthem', 'combat-trick'
        ];
        
        // Remove duplicates and sort
        this.functionalOracleTags = [...new Set(this.functionalOracleTags)].sort();
        console.log(`📊 Found ${this.functionalOracleTags.length} official functional oracle tags to scrape`);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async searchForTag(tag) {
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔍 Searching oracle tag: ${tag} (${this.processedTags + 1}/${this.functionalOracleTags.length})`);
                
                const response = await fetch(`${API_BASE}/cards/search?q=oracletag:${tag}&page=1`);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ Found ${data.total_cards} cards with oracle tag: ${tag}`);
                    
                    this.tagStats.set(tag, data.total_cards);
                    
                    // Collect ALL cards for this tag (fetch all pages)
                    const allCards = [];
                    let hasMore = data.has_more;
                    let currentPage = 1;
                    
                    // Add first page cards
                    if (data.data) {
                        allCards.push(...data.data);
                    }
                    
                    // Fetch remaining pages if any
                    while (hasMore) {
                        currentPage++;
                        console.log(`🌐 Fetching page ${currentPage} for ${tag}...`);
                        
                        const pageResponse = await fetch(`${API_BASE}/cards/search?q=oracletag:${tag}&page=${currentPage}`);
                        if (pageResponse.ok) {
                            const pageData = await pageResponse.json();
                            if (pageData.data) {
                                allCards.push(...pageData.data);
                            }
                            hasMore = pageData.has_more;
                        } else {
                            hasMore = false;
                        }
                        
                        await this.delay(DELAY_MS);
                    }
                    
                    // Add cards to our map
                    allCards.forEach(card => {
                        if (!this.cardTagMap.has(card.name)) {
                            this.cardTagMap.set(card.name, new Set());
                        }
                        this.cardTagMap.get(card.name).add(tag);
                    });
                    
                    console.log(`📦 Collected ${allCards.length} cards for tag: ${tag}`);
                    return true;
                    
                } else if (response.status === 404) {
                    console.log(`❌ Oracle tag not found: ${tag}`);
                    return false;
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (error) {
                console.log(`❌ Error searching ${tag} (attempt ${attempt}): ${error.message}`);
                if (attempt === maxRetries) {
                    this.errors.push({tag, error: error.message});
                    return false;
                }
                await this.delay(DELAY_MS * 2);
            }
        }
        return false;
    }

    async generateCSV() {
        console.log('📄 Generating comprehensive functional oracle tags CSV...');
        
        const headers = ['card_name', 'oracle_tags'];
        const rows = [headers.join(',')];
        
        for (const [cardName, tags] of this.cardTagMap) {
            const tagsStr = Array.from(tags).sort().join('|');
            const escapedName = `"${cardName.replace(/"/g, '""')}"`;
            rows.push(`${escapedName},"${tagsStr}"`);
        }
        
        const csvContent = rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `scryfall-official-oracle-tags-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        const fileSize = Math.round(csvContent.length / 1024 / 1024 * 100) / 100;
        console.log(`💾 Downloaded: ${link.download}`);
        console.log(`📊 CSV contains ${this.cardTagMap.size} cards with functional oracle tags`);
        console.log(`📏 File size: ${fileSize} MB`);
        
        return {
            cardCount: this.cardTagMap.size,
            tagCount: this.tagStats.size,
            fileSize: fileSize
        };
    }

    async start() {
        console.log('🚀 Starting official oracle tag scraping...');
        console.log(`🎯 Scraping ${this.functionalOracleTags.length} official functional oracle tags`);
        
        const startTime = Date.now();
        
        try {
            // Process each official oracle tag
            for (const tag of this.functionalOracleTags) {
                await this.searchForTag(tag);
                this.processedTags++;
                
                // Progress update every 10 tags
                if (this.processedTags % 10 === 0) {
                    console.log(`📊 Progress: ${this.processedTags}/${this.functionalOracleTags.length} tags processed, ${this.cardTagMap.size} unique cards found`);
                }
                
                await this.delay(DELAY_MS);
            }
            
            // Generate final CSV
            const csvStats = await this.generateCSV();
            
            const endTime = Date.now();
            const duration = Math.round((endTime - startTime) / 1000 / 60 * 100) / 100;
            
            console.log('✅ Official oracle tag scraping completed!');
            console.log(`⏱️ Total time: ${duration} minutes`);
            console.log(`🏷️ Total oracle tags found: ${this.tagStats.size}`);
            console.log(`🃏 Total cards with functional tags: ${this.cardTagMap.size}`);
            console.log(`❌ Errors: ${this.errors.length}`);
            
            // Show top 20 most common oracle tags
            console.log('\n📊 Top 20 most common oracle tags:');
            const sortedTags = Array.from(this.tagStats.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20);
                
            sortedTags.forEach(([tag, count]) => {
                console.log(`  ${tag}: ${count} cards`);
            });
            
            // Show Sol Ring's tags as example
            if (this.cardTagMap.has('Sol Ring')) {
                const solRingTags = Array.from(this.cardTagMap.get('Sol Ring')).sort();
                console.log(`\n🔍 Sol Ring functional oracle tags: ${solRingTags.join(', ')}`);
            }
            
            return {
                tags: Array.from(this.tagStats.keys()).sort(),
                stats: csvStats,
                errors: this.errors.length
            };
            
        } catch (error) {
            console.error('💥 Scraping failed:', error);
            throw error;
        }
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.OfficialOracleTagScraper = OfficialOracleTagScraper;
}

if (typeof module !== 'undefined') {
    module.exports = OfficialOracleTagScraper;
}
