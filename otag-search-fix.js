// 🎯 OTAG SEARCH FIX - Make otag: syntax work by translating to function:
console.log('🔧 OTAG Search Fix loaded - Adding support for otag: syntax!');

// Function to translate otag: queries to function: queries
function translateOtagQuery(query) {
    if (!query || typeof query !== 'string') return query;
    
    // Replace otag: with function: (case insensitive)
    const translated = query.replace(/\botag:/gi, 'function:');
    
    if (translated !== query) {
        console.log(`🔄 Query translated: "${query}" → "${translated}"`);
    }
    
    return translated;
}

// Function to patch fetch requests to automatically translate otag: queries
function patchFetchForOtag() {
    console.log('🔧 Installing otag: search patch...');
    
    // Store original fetch function
    const originalFetch = window.fetch;
    
    // Create patched fetch function
    window.fetch = function(url, options) {
        // Check if this is a Scryfall search request
        if (typeof url === 'string' && url.includes('api.scryfall.com/cards/search')) {
            try {
                const urlObj = new URL(url);
                const query = urlObj.searchParams.get('q');
                
                if (query && query.includes('otag:')) {
                    const translatedQuery = translateOtagQuery(query);
                    urlObj.searchParams.set('q', translatedQuery);
                    const newUrl = urlObj.toString();
                    
                    console.log(`✅ Scryfall otag: query automatically translated`);
                    return originalFetch.call(this, newUrl, options);
                }
            } catch (e) {
                console.log('⚠️ Error parsing URL for otag translation:', e);
            }
        }
        
        // For all other requests, use original fetch
        return originalFetch.call(this, url, options);
    };
    
    console.log('✅ otag: search patch installed successfully!');
    console.log('💡 Now you can use otag: syntax and it will work automatically');
    
    return true;
}

// Function to patch your backend search if it's client-side
function patchBackendSearch() {
    console.log('🔧 Checking for backend search functions to patch...');
    
    // Look for common search function names
    const searchFunctionNames = [
        'searchCards',
        'performSearch', 
        'doSearch',
        'search',
        'searchScryfall',
        'fetchCards',
        'queryCards'
    ];
    
    searchFunctionNames.forEach(funcName => {
        if (window[funcName] && typeof window[funcName] === 'function') {
            console.log(`🔍 Found search function: ${funcName}`);
            
            // Store original function
            const originalFunc = window[funcName];
            
            // Create patched version
            window[funcName] = function(query, ...args) {
                const translatedQuery = translateOtagQuery(query);
                console.log(`🔄 Patched ${funcName} with translated query`);
                return originalFunc.call(this, translatedQuery, ...args);
            };
            
            console.log(`✅ Patched ${funcName} to support otag: syntax`);
        }
    });
}

// Function to test otag: syntax
async function testOtagSyntax() {
    console.log('🧪 Testing otag: syntax support...');
    
    const testQueries = [
        'otag:removal',
        'otag:flying',
        'otag:land'
    ];
    
    for (const query of testQueries) {
        try {
            console.log(`Testing: ${query}`);
            const translatedQuery = translateOtagQuery(query);
            
            const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(translatedQuery)}`);
            const data = await response.json();
            
            if (data.object === 'error') {
                console.log(`❌ ${query} (→ ${translatedQuery}): ${data.code}`);
            } else {
                console.log(`✅ ${query} (→ ${translatedQuery}): ${data.total_cards} cards found`);
            }
        } catch (error) {
            console.log(`🔥 ${query}: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
    }
}

// Function to show usage examples
function showOtagExamples() {
    console.log('\n📚 OTAG Syntax Examples:');
    console.log('• otag:removal - Cards that remove things');
    console.log('• otag:flying - Cards related to flying');
    console.log('• otag:ramp - Cards that provide mana acceleration');
    console.log('• otag:draw - Cards that draw cards');
    console.log('• otag:protection - Cards that protect other cards');
    console.log('• t:creature otag:removal - Creatures that can remove things');
    console.log('• c:r otag:damage - Red cards that deal damage');
    console.log('\n💡 All these will now work thanks to automatic translation to function: syntax!');
}

// Auto-install the patch
patchFetchForOtag();
patchBackendSearch();

// Expose functions globally
window.translateOtagQuery = translateOtagQuery;
window.patchFetchForOtag = patchFetchForOtag;
window.testOtagSyntax = testOtagSyntax;
window.showOtagExamples = showOtagExamples;

console.log('\n🎯 OTAG Search Fix Summary:');
console.log('✅ Automatic otag: → function: translation installed');
console.log('✅ All Scryfall API calls will translate otag: syntax');
console.log('✅ Your search should now support otag: just like Moxfield!');
console.log('\n💡 Try: testOtagSyntax() to test it');
console.log('💡 Try: showOtagExamples() to see usage examples');

// Show examples
showOtagExamples();
