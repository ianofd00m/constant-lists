// Enhanced Oracle Tags Discovery
// This script attempts to find ALL oracle tags by various methods

class OracleTagDiscovery {
    constructor() {
        this.discoveredTags = new Set();
        this.validTags = new Set();
        this.invalidTags = new Set();
        this.tagStats = new Map();
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Method 1: Test a wide range of potential tags
    generatePotentialTags() {
        const baseWords = [
            // Mechanics and abilities
            'flying', 'trample', 'vigilance', 'haste', 'reach', 'deathtouch', 'lifelink',
            'first-strike', 'double-strike', 'hexproof', 'shroud', 'indestructible', 'ward',
            'flash', 'defender', 'menace', 'prowess', 'crew', 'convoke', 'delve',
            'emerge', 'escape', 'mutate', 'companion', 'cycling', 'madness', 'flashback',
            'cascade', 'storm', 'affinity', 'landfall', 'constellation', 'metalcraft',
            'threshold', 'hellbent', 'devotion', 'ferocious', 'formidable', 'delirium',
            'revolt', 'raid', 'battalion', 'morbid', 'bloodthirst', 'sunburst',
            
            // Effects and archetypes
            'removal', 'counterspell', 'burn', 'draw', 'discard', 'mill', 'ramp',
            'acceleration', 'mana-dork', 'ritual', 'tutor', 'bounce', 'fog',
            'board-wipe', 'mass-removal', 'spot-removal', 'edict', 'sacrifice',
            'recursion', 'reanimation', 'graveyard-hate', 'artifact-hate',
            'enchantment-hate', 'creature-hate', 'planeswalker-hate', 'land-hate',
            'permission', 'control', 'aggro', 'midrange', 'combo', 'prison',
            'stax', 'hatebears', 'tribal', 'anthem', 'pump', 'combat-trick',
            'protection', 'hexproof', 'shroud', 'ward', 'indestructible',
            'lifegain', 'lifegain-matters', 'damage-prevention', 'damage-doubler',
            'damage-tripler', 'damage-redirection', 'counter-doubler', 'token',
            'token-doubler', 'wheel', 'pillow-fort', 'group-hug', 'chaos',
            'alternate-win-condition', 'win-condition', 'combo-piece',
            
            // Card types and subtypes
            'artifact', 'creature', 'enchantment', 'instant', 'sorcery', 'planeswalker',
            'land', 'equipment', 'aura', 'vehicle', 'treasure', 'food', 'clue',
            'angel', 'demon', 'dragon', 'elemental', 'goblin', 'human', 'elf',
            'zombie', 'vampire', 'spirit', 'beast', 'soldier', 'wizard', 'knight',
            
            // Mana and costs
            'free', 'zero-cost', 'x-cost', 'hybrid', 'phyrexian', 'snow',
            'colorless', 'generic', 'tap', 'untap', 'sacrifice-cost',
            'discard-cost', 'exile-cost', 'life-cost', 'mana-ability',
            
            // Zones and timing
            'graveyard', 'exile', 'hand', 'library', 'battlefield', 'stack',
            'command-zone', 'sideboard', 'upkeep', 'draw-step', 'main-phase',
            'combat', 'end-step', 'instant-speed', 'sorcery-speed',
            
            // Power/toughness and counters
            'counter', 'plus-one-counter', 'minus-one-counter', 'charge-counter',
            'loyalty-counter', 'energy-counter', 'experience-counter', 'poison',
            'infect', 'toxic', 'proliferate', 'doubling-season', 'hardened-scales'
        ];

        const suffixes = ['', '-matters', '-hate', '-tribal', '-lord', '-effect', '-ability'];
        const prefixes = ['', 'anti-', 'pseudo-', 'fake-', 'virtual-'];
        
        const potentialTags = new Set();
        
        // Add base words
        baseWords.forEach(word => potentialTags.add(word));
        
        // Add combinations
        baseWords.forEach(word => {
            suffixes.forEach(suffix => {
                if (suffix) potentialTags.add(word + suffix);
            });
            prefixes.forEach(prefix => {
                if (prefix) potentialTags.add(prefix + word);
            });
        });
        
        return Array.from(potentialTags);
    }

    // Method 2: Test alphabetical patterns
    generateAlphabeticalTags() {
        const tags = [];
        const commonPrefixes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
        const commonSuffixes = ['ing', 'er', 'ed', 'tion', 'ness', 'ment', 'ity', 'ous', 'ful', 'less'];
        
        // Generate single letter combinations
        for (let i = 0; i < 26; i++) {
            tags.push(String.fromCharCode(97 + i)); // a-z
        }
        
        // Generate two letter combinations for common prefixes
        commonPrefixes.forEach(prefix => {
            for (let i = 0; i < 26; i++) {
                tags.push(prefix + String.fromCharCode(97 + i));
            }
        });
        
        return tags;
    }

    async testTag(tag) {
        try {
            const response = await fetch(`https://api.scryfall.com/cards/search?q=oracletag:${tag}&page=1`);
            
            if (response.ok) {
                const data = await response.json();
                this.validTags.add(tag);
                this.tagStats.set(tag, data.total_cards);
                console.log(`✅ Valid tag: ${tag} (${data.total_cards} cards)`);
                return true;
            } else if (response.status === 404) {
                this.invalidTags.add(tag);
                return false;
            } else {
                console.log(`⚠️ HTTP ${response.status} for tag: ${tag}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ Error testing ${tag}: ${error.message}`);
            return false;
        }
    }

    async discoverAllTags() {
        console.log('🔍 Starting comprehensive oracle tag discovery...');
        
        // Get potential tags from multiple methods
        const potentialTags = new Set([
            ...this.generatePotentialTags(),
            ...this.generateAlphabeticalTags()
        ]);

        console.log(`🎯 Testing ${potentialTags.size} potential oracle tags...`);
        
        let tested = 0;
        const batchSize = 10;
        const tagArray = Array.from(potentialTags);
        
        // Test in batches to avoid overwhelming the API
        for (let i = 0; i < tagArray.length; i += batchSize) {
            const batch = tagArray.slice(i, i + batchSize);
            
            // Test batch in parallel
            await Promise.all(batch.map(async (tag) => {
                await this.testTag(tag);
                tested++;
                
                if (tested % 50 === 0) {
                    console.log(`📊 Progress: ${tested}/${tagArray.length} tested, ${this.validTags.size} valid tags found`);
                }
                
                await this.delay(50); // Small delay between tests
            }));
            
            await this.delay(100); // Delay between batches
        }
        
        console.log(`✅ Discovery complete! Found ${this.validTags.size} valid oracle tags`);
        return Array.from(this.validTags).sort();
    }

    generateReport() {
        console.log('\n📊 Oracle Tag Discovery Report:');
        console.log(`Valid tags found: ${this.validTags.size}`);
        console.log(`Invalid tags tested: ${this.invalidTags.size}`);
        
        // Sort tags by card count
        const sortedTags = Array.from(this.tagStats.entries())
            .sort((a, b) => b[1] - a[1]);
        
        console.log('\n🏆 Top 50 oracle tags by card count:');
        sortedTags.slice(0, 50).forEach(([tag, count]) => {
            console.log(`  ${tag}: ${count} cards`);
        });
        
        // Generate downloadable list
        const tagsList = Array.from(this.validTags).sort().join('\n');
        const blob = new Blob([tagsList], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `all-oracle-tags-${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        
        console.log(`💾 Downloaded complete tags list: ${link.download}`);
        
        return {
            validTags: Array.from(this.validTags).sort(),
            tagStats: Object.fromEntries(this.tagStats)
        };
    }
}

// Usage
async function discoverAllOracleTags() {
    const discovery = new OracleTagDiscovery();
    const tags = await discovery.discoverAllTags();
    const report = discovery.generateReport();
    return report;
}

// Export for browser use
if (typeof window !== 'undefined') {
    window.OracleTagDiscovery = OracleTagDiscovery;
    window.discoverAllOracleTags = discoverAllOracleTags;
}
