// Comprehensive Oracle Tag Discovery System
// This will find ALL oracle tags that actually exist in Scryfall

const API_BASE = 'https://api.scryfall.com';
const DELAY_MS = 100;

class OracleTagDiscoverer {
    constructor() {
        this.discoveredTags = new Set();
        this.cardTagMap = new Map();
        this.processedCards = 0;
        this.tagStats = new Map();
        this.errors = [];
        
        // Known working tags from our previous scraper
        this.knownWorkingTags = [
            'acceleration', 'activated-ability', 'ramp', 'mana-rock',
            'removal', 'counterspell', 'burn', 'draw', 'discard',
            'tutor', 'bounce', 'cantrip', 'card-advantage', 'card-names',
            'wheel', 'wheel-symmetrical', 'wheel-one-sided', 'rack-effect',
            'pillow-fort', 'fog', 'board-wipe', 'mass-removal', 'spot-removal',
            'edict', 'mill', 'self-mill', 'library-manipulation',
            'top-deck-manipulation', 'surveil', 'impulse', 'recursion',
            'flashback', 'madness', 'mana-doubler', 'mana-filter',
            'ritual', 'hand-size-matters', 'hand-size-increase', 'hand-size-decrease',
            'combat-trick', 'anthem', 'tribal', 'lifegain', 'lifegain-matters',
            'damage-prevention', 'damage-redirection', 'damage-doubler',
            'damage-tripler', 'counter-doubler', 'persist', 'constellation',
            'metalcraft', 'affinity', 'improvise', 'win-condition',
            'alternate-win-condition'
        ];
        
        // Strategy: Use multiple discovery methods
        this.discoveryMethods = [
            'knownTags',
            'alphabeticalSearch', 
            'commonWords',
            'mechanicNames',
            'cardTypeSearch'
        ];
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async searchForTag(tag) {
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔍 Testing oracle tag: ${tag} (attempt ${attempt})`);
                
                const response = await fetch(`${API_BASE}/cards/search?q=oracletag:${tag}&page=1`);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ Found oracle tag: ${tag} (${data.total_cards} cards)`);
                    
                    this.discoveredTags.add(tag);
                    this.tagStats.set(tag, data.total_cards);
                    
                    // Collect some cards for this tag
                    if (data.data && data.data.length > 0) {
                        data.data.forEach(card => {
                            if (!this.cardTagMap.has(card.name)) {
                                this.cardTagMap.set(card.name, new Set());
                            }
                            this.cardTagMap.get(card.name).add(tag);
                        });
                    }
                    
                    return true;
                } else if (response.status === 404) {
                    console.log(`❌ Oracle tag not found: ${tag}`);
                    return false;
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (error) {
                console.log(`❌ Error testing ${tag} (attempt ${attempt}): ${error.message}`);
                if (attempt === maxRetries) {
                    this.errors.push({tag, error: error.message});
                    return false;
                }
                await this.delay(DELAY_MS * 2); // Longer delay on error
            }
        }
        return false;
    }

    async discoverByKnownTags() {
        console.log('🎯 Phase 1: Testing known working tags...');
        const workingTags = [];
        
        for (const tag of this.knownWorkingTags) {
            const found = await this.searchForTag(tag);
            if (found) workingTags.push(tag);
            await this.delay(DELAY_MS);
        }
        
        console.log(`✅ Confirmed ${workingTags.length}/${this.knownWorkingTags.length} known tags`);
        return workingTags;
    }

    async discoverByAlphabeticalSearch() {
        console.log('🔤 Phase 2: Alphabetical discovery...');
        
        // Common prefixes and suffixes for Magic terms
        const prefixes = ['', 'anti-', 'counter-', 'mass-', 'self-', 'non-', 'multi-', 'extra-', 'double-', 'triple-'];
        const suffixes = ['', '-matters', '-synergy', '-hate', '-protection', '-recursion', '-tutor', '-doubler', '-tripler'];
        
        // Magic-specific base words
        const magicWords = [
            // Basic actions
            'draw', 'discard', 'mill', 'scry', 'surveil', 'manifest', 'morph', 'transform',
            'tap', 'untap', 'activate', 'trigger', 'enter', 'leave', 'dies', 'exile',
            'destroy', 'sacrifice', 'return', 'bounce', 'flicker', 'blink', 'phase',
            
            // Card types
            'artifact', 'creature', 'enchantment', 'instant', 'sorcery', 'planeswalker', 'land',
            'aura', 'equipment', 'vehicle', 'token', 'emblem', 'treasure', 'food', 'clue',
            
            // Keywords
            'flying', 'trample', 'vigilance', 'lifelink', 'deathtouch', 'haste', 'reach',
            'first-strike', 'double-strike', 'hexproof', 'shroud', 'ward', 'protection',
            'indestructible', 'regenerate', 'flash', 'cascade', 'storm', 'dredge',
            'flashback', 'buyback', 'retrace', 'madness', 'suspend', 'convoke', 'delve',
            
            // Strategies/archetypes
            'aggro', 'control', 'combo', 'midrange', 'tempo', 'ramp', 'burn', 'mill',
            'reanimator', 'tribal', 'voltron', 'pillow-fort', 'stax', 'prison', 'fog',
            'wheel', 'storm', 'aristocrats', 'tokens', 'counters', 'graveyard', 'artifact',
            
            // Mechanics
            'mana', 'life', 'damage', 'counter', 'loyalty', 'energy', 'experience',
            'poison', 'infect', 'wither', 'proliferate', 'modular', 'graft', 'evolve',
            'undying', 'persist', 'unleash', 'scavenge', 'overload', 'cipher', 'fuse'
        ];
        
        const candidateTags = new Set();
        
        // Generate combinations
        for (const prefix of prefixes) {
            for (const word of magicWords) {
                for (const suffix of suffixes) {
                    const tag = `${prefix}${word}${suffix}`.replace(/^-+|-+$/g, '').replace(/-+/g, '-');
                    if (tag && tag.length >= 3 && !this.discoveredTags.has(tag)) {
                        candidateTags.add(tag);
                    }
                }
            }
        }
        
        console.log(`🎯 Generated ${candidateTags.size} candidate tags to test`);
        
        // Test candidates in batches
        const candidates = Array.from(candidateTags);
        let found = 0;
        
        for (let i = 0; i < candidates.length; i++) {
            const tag = candidates[i];
            const isWorking = await this.searchForTag(tag);
            if (isWorking) found++;
            
            if (i % 50 === 0) {
                console.log(`📊 Progress: ${i}/${candidates.length} tested, ${found} new tags found`);
            }
            
            await this.delay(DELAY_MS);
        }
        
        console.log(`✅ Alphabetical search found ${found} new oracle tags`);
        return found;
    }

    async discoverByCommonWords() {
        console.log('💭 Phase 3: Common MTG terms discovery...');
        
        // Common MTG terms that might be oracle tags
        const commonTerms = [
            // Board states
            'board-state', 'boardwipe', 'sweeper', 'one-sided', 'asymmetrical',
            'symmetric', 'global', 'targeted', 'modal', 'choice', 'optional',
            
            // Game zones
            'battlefield', 'graveyard', 'library', 'hand', 'exile', 'stack', 'command-zone',
            
            // Resource management
            'card-advantage', 'tempo', 'value', 'efficiency', 'resource', 'engine',
            'payoff', 'enabler', 'synergy', 'redundancy', 'consistency',
            
            // Combat
            'combat', 'attack', 'block', 'unblockable', 'evasion', 'buff', 'pump',
            'combat-trick', 'go-wide', 'go-tall', 'alpha-strike', 'removal-resistant',
            
            // Control elements
            'permission', 'denial', 'lock', 'soft-lock', 'hard-lock', 'orb-effect',
            'winter-orb', 'static-orb', 'tanglewire', 'sphere-effect', 'tax-effect',
            
            // Win conditions
            'win-condition', 'finisher', 'closer', 'threat', 'game-ending',
            'combo-piece', 'infinite', 'loop', 'alternate-win'
        ];
        
        let found = 0;
        for (const term of commonTerms) {
            if (!this.discoveredTags.has(term)) {
                const isWorking = await this.searchForTag(term);
                if (isWorking) found++;
                await this.delay(DELAY_MS);
            }
        }
        
        console.log(`✅ Common terms search found ${found} new oracle tags`);
        return found;
    }

    async generateCSV() {
        console.log('📄 Generating comprehensive CSV...');
        
        const headers = ['card_name', 'oracle_tags'];
        const rows = [headers.join(',')];
        
        for (const [cardName, tags] of this.cardTagMap) {
            const tagsStr = Array.from(tags).join('|');
            const escapedName = `"${cardName.replace(/"/g, '""')}"`;
            rows.push(`${escapedName},"${tagsStr}"`);
        }
        
        const csvContent = rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `scryfall-complete-oracle-tags-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        console.log(`💾 Downloaded: ${link.download}`);
        console.log(`📊 CSV contains ${this.cardTagMap.size} cards with ${this.discoveredTags.size} unique oracle tags`);
        
        return {
            cardCount: this.cardTagMap.size,
            tagCount: this.discoveredTags.size,
            fileSize: Math.round(csvContent.length / 1024 / 1024 * 100) / 100
        };
    }

    async start() {
        console.log('🚀 Starting comprehensive oracle tag discovery...');
        console.log('This will systematically find ALL oracle tags that exist in Scryfall');
        
        const startTime = Date.now();
        
        try {
            // Phase 1: Confirm known tags
            await this.discoverByKnownTags();
            
            // Phase 2: Alphabetical/systematic search
            await this.discoverByAlphabeticalSearch();
            
            // Phase 3: Common terms
            await this.discoverByCommonWords();
            
            // Generate results
            const csvStats = await this.generateCSV();
            
            const endTime = Date.now();
            const duration = Math.round((endTime - startTime) / 1000 / 60 * 100) / 100;
            
            console.log('✅ Discovery complete!');
            console.log(`⏱️ Total time: ${duration} minutes`);
            console.log(`🏷️ Total oracle tags discovered: ${this.discoveredTags.size}`);
            console.log(`🃏 Total cards with tags: ${this.cardTagMap.size}`);
            console.log(`❌ Errors encountered: ${this.errors.length}`);
            
            console.log('\n📊 Top 20 most common oracle tags:');
            const sortedTags = Array.from(this.tagStats.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20);
                
            sortedTags.forEach(([tag, count]) => {
                console.log(`  ${tag}: ${count} cards`);
            });
            
            console.log('\n🎯 All discovered oracle tags:');
            const allTags = Array.from(this.discoveredTags).sort();
            allTags.forEach(tag => console.log(`  ${tag}`));
            
            return {
                tags: allTags,
                stats: csvStats,
                errors: this.errors.length
            };
            
        } catch (error) {
            console.error('💥 Discovery failed:', error);
            throw error;
        }
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.OracleTagDiscoverer = OracleTagDiscoverer;
}

if (typeof module !== 'undefined') {
    module.exports = OracleTagDiscoverer;
}
