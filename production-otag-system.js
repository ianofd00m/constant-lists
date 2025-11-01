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
        this.memoryCache = null; // Emergency memory cache
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
            // Clear any old cache keys from previous versions
            this.clearOldCaches();
            
            // PERFORMANCE: Only load OTAG data when actually needed (lazy loading)
            this.isReady = true; // Mark as ready without loading data
            console.log('✅ Production OTAG System ready (lazy loading enabled)');
            
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

    clearOldCaches() {
        // List of all old cache keys that should be cleared
        const oldCacheKeys = [
            'production-otag-data-v1',
            'production-otag-timestamp-v1',
            'production-otag-data-v2',
            'production-otag-timestamp-v2',
            'production-otag-data-v3-full',
            'production-otag-timestamp-v3-full'
        ];
        
        let clearedCount = 0;
        for (const key of oldCacheKeys) {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                clearedCount++;
            }
        }
        
        if (clearedCount > 0) {
            console.log(`🧹 Cleared ${clearedCount} old cache entries`);
        }
        
        // Also clear current cache if it contains insufficient data
        const currentCacheKey = 'production-otag-data-v4-api';
        const currentData = localStorage.getItem(currentCacheKey);
        if (currentData) {
            try {
                const parsedData = JSON.parse(currentData);
                if (parsedData && parsedData.length < 1000) {
                    localStorage.removeItem(currentCacheKey);
                    localStorage.removeItem('production-otag-timestamp-v4-api');
                    console.log(`🚫 Cleared current cache (only ${parsedData.length} entries - insufficient data)`);
                }
            } catch (e) {
                // If we can't parse the cache, clear it
                localStorage.removeItem(currentCacheKey);
                localStorage.removeItem('production-otag-timestamp-v4-api');
                console.log('🚫 Cleared corrupted cache data');
            }
        }
    }

    async loadOtagDataFromServer() {
        const cacheKey = 'production-otag-data-v4-api'; // Updated to force reload with API endpoint
        const cacheTimestamp = 'production-otag-timestamp-v4-api';
        const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
        
        try {
            // EMERGENCY: Check memory cache first
            if (this.memoryCache && this.memoryCache.data && (Date.now() - this.memoryCache.timestamp) < CACHE_DURATION) {
                console.log('🧠 Using memory cache from previous load...');
                this.processOtagData(this.memoryCache.data);
                return;
            }

            // Check all possible cache formats
            const cacheChecks = [
                // Standard format
                { key: cacheKey, time: cacheTimestamp, format: 'standard' },
                // Ultra-compressed format (highest priority - most space efficient)
                { key: cacheKey + '-ultra', time: cacheTimestamp, format: 'ultra' },
                // Compact format
                { key: cacheKey + '-compact', time: cacheTimestamp, format: 'compact' },
                // Session storage
                { key: cacheKey + '-session', time: cacheTimestamp + '-session', format: 'session' }
            ];

            console.log('🔍 Checking multiple cache formats...');
            
            // More robust cache check - must have both data and time, and data must not be empty
            let shouldUseCache = false;
            let parsedData = null;
            let usedCacheFormat = null;
            
            for (const cacheCheck of cacheChecks) {
                const storage = cacheCheck.format === 'session' ? sessionStorage : localStorage;
                const cachedData = storage.getItem(cacheCheck.key);
                const cachedTime = storage.getItem(cacheCheck.time);
                
                if (cachedData && cachedTime && cachedData.trim() !== '') {
                    try {
                        let rawData = JSON.parse(cachedData);
                        const age = Date.now() - parseInt(cachedTime);
                        console.log(`🕐 ${cacheCheck.format} cache age: ${Math.round(age / 1000 / 60)} minutes`);
                        
                        // Convert compressed formats back to full format
                        if (cacheCheck.format === 'ultra') {
                            // Decompress ultra-compact format using tag dictionary
                            const tagDict = rawData.d;
                            rawData = rawData.c.map(card => ({
                                cardName: card.n,
                                otags: card.t ? card.t.map(index => tagDict[index]) : []
                            }));
                            console.log(`🗜️ Decompressed ultra-compact format with ${tagDict.length} unique tags`);
                        } else if (cacheCheck.format === 'compact' || cacheCheck.format === 'session') {
                            rawData = rawData.map(card => ({
                                cardName: card.n,
                                otags: card.t || []
                            }));
                        }
                        
                        // Invalidate cache if it's test data (less than 1000 cards - full dataset has 34k+)
                        if (rawData.length < 1000) {
                            console.log(`🚫 ${cacheCheck.format} cache contains only ${rawData.length} entries (insufficient data)`);
                            continue;
                        } else if (age < CACHE_DURATION && rawData && rawData.length > 0) {
                            shouldUseCache = true;
                            parsedData = rawData;
                            usedCacheFormat = cacheCheck.format;
                            console.log(`📋 Loading OTAG data from ${cacheCheck.format} cache...`);
                            console.log(`📊 Cached data contains: ${parsedData.length} entries`);
                            break;
                        } else {
                            console.log(`🔄 ${cacheCheck.format} cache expired or empty`);
                        }
                    } catch (e) {
                        console.log(`⚠️ ${cacheCheck.format} cache parse error:`, e.message);
                        // Clear corrupted cache
                        storage.removeItem(cacheCheck.key);
                        storage.removeItem(cacheCheck.time);
                    }
                }
            }
            
            if (!shouldUseCache) {
                console.log('🚫 No valid cache found in any format, will fetch fresh data');
            }
            
            if (shouldUseCache && parsedData) {
                this.processOtagData(parsedData);
                return;
            }
            
            // If we reach here, we need to load fresh data
            console.log('🌐 Loading OTAG data from server...');
            
            console.log('🌐 Loading OTAG data from server...');
            
            // Try multiple data sources - prioritize API endpoints for reliable data delivery
            const dataSources = [
                // API endpoints first - these can serve complete data reliably without SPA routing issues
                'https://constant-lists-api.onrender.com/api/oracle-tags',
                `${window.location.origin}/api/oracle-tags`,
                'https://constant-lists-api.onrender.com/api/otag-data',
                `${window.location.origin}/api/otag-data`,
                // Static files - may be blocked by SPA routing on Netlify
                './oracle-tags.csv',
                './oracle-tags.csv.gz',
                './scryfall-COMPLETE-oracle-tags-2025-08-08.csv',
                './FULL OTAGS.csv',
                './otag-medium-dataset.csv',
                './test-otag-data.csv'
            ];
            
            for (const source of dataSources) {
                try {
                    console.log(`🔍 Trying to load from: ${source}`);
                    
                    // Show progress for external sources (likely large files)
                    const isExternal = source.startsWith('http');
                    if (isExternal) {
                        console.log(`🌐 Loading full dataset from external source (this may take 10-30 seconds)...`);
                    }
                    
                    // For large local files, try different approaches
                    let response, csvText;
                    
                    if (source.startsWith('./')) {
                        // Try multiple methods for local files
                        console.log(`🔍 Attempting to load large local file: ${source}`);
                        
                        try {
                            // Method 1: Standard fetch
                            response = await fetch(source, {
                                method: 'GET',
                                headers: {
                                    'Cache-Control': 'no-cache',
                                },
                            });
                            console.log(`📡 Response status for ${source}:`, response.status, response.statusText);
                            
                            if (response.ok) {
                                const contentLength = response.headers.get('content-length');
                                console.log(`📏 Content-Length header: ${contentLength}`);
                                
                                // Try to read as stream for large files
                                if (contentLength && parseInt(contentLength) > 1000000) {
                                    console.log(`📊 Large file detected (${(parseInt(contentLength) / (1024 * 1024)).toFixed(1)}MB), attempting stream read...`);
                                }
                                
                                // Handle compressed files
                                if (source.endsWith('.gz')) {
                                    console.log(`📦 Decompressing gzipped file...`);
                                    const arrayBuffer = await response.arrayBuffer();
                                    csvText = await this.decompressGzip(arrayBuffer);
                                } else {
                                    csvText = await response.text();
                                }
                            }
                        } catch (fetchError) {
                            console.warn(`⚠️ Standard fetch failed for ${source}:`, fetchError.message);
                            throw fetchError;
                        }
                    } else {
                        // External sources with timeout
                        console.log(`⏱️ Attempting fetch with 30 second timeout...`);
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                        
                        try {
                            response = await fetch(source, {
                                method: 'GET',
                                signal: controller.signal,
                                headers: {
                                    'Accept': 'text/csv,application/csv,text/plain,*/*',
                                    'Cache-Control': 'no-cache'
                                }
                            });
                            clearTimeout(timeoutId);
                            console.log(`📡 Response status for ${source}:`, response.status, response.statusText);
                        } catch (fetchError) {
                            clearTimeout(timeoutId);
                            if (fetchError.name === 'AbortError') {
                                console.log(`⏰ Fetch timeout after 30 seconds for ${source}`);
                                throw new Error('Fetch timeout - API response too slow');
                            }
                            throw fetchError;
                        }
                        
                        if (response.ok) {
                            const contentLength = response.headers.get('content-length');
                            if (contentLength && source.startsWith('http')) {
                                const sizeMB = (parseInt(contentLength) / (1024 * 1024)).toFixed(1);
                                console.log(`📊 Downloading ${sizeMB}MB of Oracle Tag data...`);
                            }
                            
                            // Handle compressed files for external sources too
                            if (source.endsWith('.gz')) {
                                console.log(`📦 Decompressing external gzipped file...`);
                                const arrayBuffer = await response.arrayBuffer();
                                csvText = await this.decompressGzip(arrayBuffer);
                            } else {
                                csvText = await response.text();
                            }
                        }
                    }
                    
                    if (response.ok) {
                        console.log(`✅ Loaded OTAG data from: ${source} (${csvText.length} characters)`);
                        
                        // Debug: Show first and last 200 characters to see what we got
                        console.log(`🔍 First 200 chars:`, csvText.substring(0, 200));
                        console.log(`🔍 Last 200 chars:`, csvText.substring(csvText.length - 200));
                        
                        // Check if file was truncated (expected size is ~7MB = ~7,000,000 chars)
                        if (csvText.length < 100000) {
                            console.warn(`⚠️ File seems truncated! Got ${csvText.length} chars, expected ~7,000,000`);
                        }
                        
                        // Validate we got actual CSV data, not an error page
                        if (csvText.length < 1000 && !csvText.includes('card_name')) {
                            throw new Error(`Invalid CSV data received (too short: ${csvText.length} chars)`);
                        }
                        
                        console.log(`🔄 Processing Oracle Tag database...`);
                        const data = this.parseCSV(csvText);
                        this.processOtagData(data);
                        
                        // EMERGENCY: Intelligent caching with compression and chunking
                        await this.emergencySmartCache(data, cacheKey, cacheTimestamp);
                        
                        // IMPORTANT: Stop here after successful load and processing
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

    async decompressGzip(arrayBuffer) {
        try {
            // Use the browser's built-in DecompressionStream if available
            if ('DecompressionStream' in window) {
                console.log(`🔧 Using browser DecompressionStream...`);
                const ds = new DecompressionStream('gzip');
                const stream = new ReadableStream({
                    start(controller) {
                        controller.enqueue(new Uint8Array(arrayBuffer));
                        controller.close();
                    }
                }).pipeThrough(ds);
                
                const reader = stream.getReader();
                const chunks = [];
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }
                
                // Combine chunks and decode as text
                const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                const combined = new Uint8Array(totalLength);
                let offset = 0;
                for (const chunk of chunks) {
                    combined.set(chunk, offset);
                    offset += chunk.length;
                }
                
                return new TextDecoder('utf-8').decode(combined);
            } else {
                console.warn(`⚠️ DecompressionStream not available, cannot decompress gzip file`);
                throw new Error('Gzip decompression not supported in this browser');
            }
        } catch (error) {
            console.error('❌ Error decompressing gzip file:', error);
            throw error;
        }
    }

    async emergencySmartCache(data, cacheKey, cacheTimestamp) {
        console.log('🚨 EMERGENCY: Implementing intelligent caching system...');
        
        try {
            // Method 1: Try standard caching first
            const dataString = JSON.stringify(data);
            localStorage.setItem(cacheKey, dataString);
            localStorage.setItem(cacheTimestamp, Date.now().toString());
            console.log('✅ Standard cache successful');
            return;
        } catch (standardCacheError) {
            console.log('⚠️ Standard cache failed:', standardCacheError.message);
        }

        try {
            // Method 2: Clear all old storage and try again
            console.log('🧹 Clearing old storage data...');
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('otag') || key.includes('production-'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Try again after cleanup
            const dataString = JSON.stringify(data);
            localStorage.setItem(cacheKey, dataString);
            localStorage.setItem(cacheTimestamp, Date.now().toString());
            console.log('✅ Cache successful after cleanup');
            return;
        } catch (cleanupCacheError) {
            console.log('⚠️ Cache failed even after cleanup:', cleanupCacheError.message);
        }

        try {
            // Method 3: Ultra-compressed dictionary-based storage
            console.log('🗜️ Attempting ultra-compressed dictionary storage...');
            
            // Build tag dictionary to save space (most tags are repeated across many cards)
            const tagSet = new Set();
            data.forEach(card => {
                if (card.otags) {
                    card.otags.forEach(tag => tagSet.add(tag));
                }
            });
            
            const tagDict = Array.from(tagSet);
            const tagToIndex = new Map();
            tagDict.forEach((tag, index) => tagToIndex.set(tag, index));
            
            // Create ultra-compact representation using tag indices
            const ultraCompactData = {
                d: tagDict, // tag dictionary
                c: data.map(card => ({
                    n: card.cardName, // name
                    t: card.otags ? card.otags.map(tag => tagToIndex.get(tag)) : [] // tag indices
                }))
            };
            
            const ultraCompactString = JSON.stringify(ultraCompactData);
            const originalSize = JSON.stringify(data).length;
            console.log(`� Ultra-compact data size: ${(ultraCompactString.length / 1024 / 1024).toFixed(1)}MB (was ${(originalSize / 1024 / 1024).toFixed(1)}MB, ${Math.round((1 - ultraCompactString.length / originalSize) * 100)}% reduction)`);
            
            // Try storing ultra-compact version
            localStorage.setItem(cacheKey + '-ultra', ultraCompactString);
            localStorage.setItem(cacheTimestamp, Date.now().toString());
            localStorage.setItem(cacheKey + '-format', 'ultra');
            console.log('✅ Ultra-compact cache successful');
            return;
        } catch (ultraCompactError) {
            console.log('⚠️ Ultra-compact cache failed:', ultraCompactError.message);
        }

        try {
            // Method 4: Regular compact fallback
            console.log('🗜️ Attempting regular compact storage...');
            
            // Create a more compact representation
            const compactData = data.map(card => ({
                n: card.cardName, // name
                t: card.otags || [] // tags only
            }));
            
            const compactString = JSON.stringify(compactData);
            console.log(`📊 Compact data size: ${(compactString.length / 1024 / 1024).toFixed(1)}MB (was ${(JSON.stringify(data).length / 1024 / 1024).toFixed(1)}MB)`);
            
            // Try storing compact version
            localStorage.setItem(cacheKey + '-compact', compactString);
            localStorage.setItem(cacheTimestamp, Date.now().toString());
            localStorage.setItem(cacheKey + '-format', 'compact');
            console.log('✅ Compact cache successful');
            return;
        } catch (compactCacheError) {
            console.log('⚠️ Compact cache also failed:', compactCacheError.message);
        }

        try {
            // Method 4: Session storage fallback
            console.log('💾 Trying sessionStorage fallback...');
            const compactData = data.map(card => ({
                n: card.cardName,
                t: card.otags || []
            }));
            
            sessionStorage.setItem(cacheKey + '-session', JSON.stringify(compactData));
            sessionStorage.setItem(cacheTimestamp + '-session', Date.now().toString());
            console.log('✅ Session storage cache successful');
            return;
        } catch (sessionCacheError) {
            console.log('⚠️ Session storage also failed:', sessionCacheError.message);
        }

        // Method 5: In-memory only with persistence indicator
        console.log('🧠 Falling back to memory-only storage (no persistence)');
        this.memoryCache = {
            data: data,
            timestamp: Date.now(),
            persistent: false
        };
        console.log('⚠️ WARNING: OTAG data will not persist between page loads due to storage limitations');
        console.log('💡 Consider clearing browser data or using a different browser for better caching');
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
                
                // Handle both 8-column and 2-column formats
                if (columns.length >= 8) {
                    // Full format: cardId, cardName, colors, cmc, typeLine, set, otagCount, otags
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
                } else if (columns.length >= 2) {
                    // Simple format: card_name, oracle_tags
                    const cardName = columns[0].replace(/^"|"$/g, ''); // Remove quotes
                    const otagString = columns[1].replace(/^"|"$/g, ''); // Remove quotes
                    const otags = otagString ? otagString.split('|').filter(Boolean) : [];
                    
                    data.push({
                        cardId: cardName.toLowerCase().replace(/[^a-z0-9]/g, ''),
                        cardName: cardName,
                        colors: '',
                        cmc: 0,
                        typeLine: '',
                        set: '',
                        otagCount: otags.length,
                        otags: otags
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
        
        // CRITICAL: Notify UI that database is now loaded with real stats
        window.dispatchEvent(new CustomEvent('otagDatabaseLoaded', {
            detail: { 
                stats: this.stats,
                isReady: true,
                isLoaded: true
            }
        }));
    }

    createFallbackData() {
        console.log('🚨 EMERGENCY: Creating comprehensive fallback OTAG data...');
        
        // COMPREHENSIVE fallback data covering common Magic cards and current deck cards
        const fallbackCards = [
            // DECK-SPECIFIC CARDS (from console logs)
            { name: 'Jason Bright, Glowing Prophet', otags: ['commander', 'legendary', 'creature', 'fallout', 'glow', 'prophet', 'multicolor'] },
            { name: 'Benthic Biomancer', otags: ['creature', 'merfolk', 'wizard', 'blue', 'mono-blue', 'card-draw', 'evolve', 'simic'] },
            { name: 'Cloudfin Raptor', otags: ['creature', 'bird', 'mutant', 'blue', 'mono-blue', 'flying', 'evolve', 'simic'] },
            { name: 'Cytoplast Manipulator', otags: ['creature', 'human', 'wizard', 'blue', 'mono-blue', 'graft', 'steal-creature', 'simic'] },
            { name: 'Novijen Sages', otags: ['creature', 'human', 'advisor', 'blue', 'mono-blue', 'graft', 'card-draw', 'simic'] },
            { name: 'Simic Manipulator', otags: ['creature', 'mutant', 'wizard', 'blue', 'mono-blue', 'evolve', 'steal-creature', 'simic'] },
            { name: 'Skatewing Spy', otags: ['creature', 'human', 'rogue', 'blue', 'mono-blue', 'flying', 'evolve', 'simic'] },
            { name: 'Vexing Radgull', otags: ['creature', 'bird', 'mutant', 'blue', 'mono-blue', 'flying', 'fallout'] },
            { name: 'Mirelurk Queen', otags: ['creature', 'crab', 'mutant', 'blue', 'mono-blue', 'fallout', 'tokens'] },
            { name: 'Geralf, the Fleshwright', otags: ['legendary', 'creature', 'human', 'wizard', 'blue', 'mono-blue', 'zombie', 'graveyard'] },
            { name: 'Geralf, Visionary Stitcher', otags: ['legendary', 'creature', 'human', 'wizard', 'blue', 'mono-blue', 'zombie', 'graveyard'] },
            { name: 'Cleaver Skaab', otags: ['creature', 'zombie', 'blue', 'mono-blue', 'graveyard', 'exploit'] },
            { name: 'Hordewing Skaab', otags: ['creature', 'zombie', 'blue', 'mono-blue', 'flying', 'graveyard'] },
            { name: 'Prophet of the Scarab', otags: ['creature', 'human', 'wizard', 'blue', 'mono-blue', 'cycling', 'graveyard'] },
            { name: 'Rooftop Storm', otags: ['enchantment', 'blue', 'mono-blue', 'zombie', 'cost-reduction', 'tribal'] },
            { name: 'Necroduality', otags: ['enchantment', 'blue', 'mono-blue', 'zombie', 'token-copy', 'graveyard'] },
            { name: 'Poppet Stitcher', otags: ['creature', 'human', 'wizard', 'blue', 'mono-blue', 'transform', 'tokens'] },
            { name: 'Danny Pink', otags: ['legendary', 'creature', 'human', 'soldier', 'blue', 'mono-blue', 'doctor-who'] },
            { name: 'Cyclonic Rift', otags: ['instant', 'blue', 'mono-blue', 'bounce', 'overload', 'board-wipe'] },
            { name: 'Training Grounds', otags: ['enchantment', 'blue', 'mono-blue', 'cost-reduction', 'activated-abilities'] },
            { name: 'Heartstone', otags: ['artifact', 'colorless', 'cost-reduction', 'activated-abilities'] },
            { name: 'Ashnods Altar', otags: ['artifact', 'colorless', 'sacrifice', 'mana-acceleration', 'combo'] },
            { name: 'Phyrexian Altar', otags: ['artifact', 'colorless', 'sacrifice', 'mana-acceleration', 'combo'] },
            { name: 'Metallic Mimic', otags: ['artifact', 'creature', 'shapeshifter', 'colorless', 'tribal', 'counters'] },
            { name: 'Adaptive Automaton', otags: ['artifact', 'creature', 'construct', 'colorless', 'tribal', 'lords'] },
            { name: 'Kindred Discovery', otags: ['enchantment', 'blue', 'mono-blue', 'tribal', 'card-draw'] },
            { name: 'Island', otags: ['land', 'basic', 'blue', 'mana-acceleration'] },
            
            // STAPLES & COMMON CARDS
            { name: 'Sol Ring', otags: ['artifact', 'colorless', 'mana-acceleration', 'ramp', 'staple'] },
            { name: 'Lightning Bolt', otags: ['instant', 'red', 'mono-red', 'removal', 'direct-damage', 'burn'] },
            { name: 'Counterspell', otags: ['instant', 'blue', 'mono-blue', 'counterspell', 'control'] },
            { name: 'Birds of Paradise', otags: ['creature', 'bird', 'green', 'mono-green', 'mana-acceleration', 'flying'] },
            { name: 'Path to Exile', otags: ['instant', 'white', 'mono-white', 'removal', 'exile'] },
            { name: 'Llanowar Elves', otags: ['creature', 'elf', 'druid', 'green', 'mono-green', 'mana-acceleration'] },
            { name: 'Command Tower', otags: ['land', 'commander', 'multicolor', 'mana-fixing'] },
            { name: 'Arcane Signet', otags: ['artifact', 'colorless', 'mana-acceleration', 'commander', 'mana-fixing'] }
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
        
        // Update stats
        this.stats = {
            totalCards: fallbackCards.length,
            totalOtags: fallbackCards.reduce((sum, card) => sum + card.otags.length, 0),
            topOtags: this.calculateTopTags(fallbackCards)
        };
        
        this.isLoaded = true;
        this.isReady = true;
        console.log(`� EMERGENCY FALLBACK: Loaded ${fallbackCards.length} cards with ${this.stats.totalOtags} total tags`);
        console.log('⚡ OTAG system now operational with emergency data');
    }

    calculateTopTags(cards) {
        const tagCounts = new Map();
        for (const card of cards) {
            for (const tag of card.otags) {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            }
        }
        
        return Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([tag, count]) => ({ tag, count }));
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
        
        // PERFORMANCE: Reduced initial scan frequency
        setTimeout(() => this.scanExistingModals(), 3000);
        
        console.log('👀 Modal monitoring active (optimized)');
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

    async handleOtagSearch(otag) {
        console.log(`🔍 Searching for OTAG: ${otag}`);
        
        const results = await this.searchCardsByOtag(otag);
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

    async searchCardsByOtag(searchOtag) {
        // PERFORMANCE: Lazy load data only when search is actually used
        if (!this.isLoaded) {
            console.log('🔄 Lazy loading OTAG data for OTAG search...');
            await this.loadOtagDataFromServer();
        }
        
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

    async searchCards(query) {
        // PERFORMANCE: Lazy load data only when search is actually used
        if (!this.isLoaded) {
            console.log('🔄 Lazy loading OTAG data for search...');
            await this.loadOtagDataFromServer();
        }
        
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

    // Sync method for immediate checking (returns empty if not loaded)
    getTagsForCard(cardName) {
        if (!this.isReady || !cardName) {
            return [];
        }
        
        // If data not loaded, trigger async load and return empty for now
        if (!this.isLoaded) {
            console.log('🔄 Triggering lazy load for OTAG data...');
            this.loadOtagDataFromServer().catch(console.error);
            return [];
        }
        
        const cardKey = cardName.toLowerCase();
        const cardData = this.otagDatabase.get(cardKey);
        
        if (cardData && cardData.otags) {
            console.log(`[ProductionOtagSystem] Found ${cardData.otags.length} tags for "${cardName}":`, cardData.otags);
            return cardData.otags;
        }
        
        console.log(`[ProductionOtagSystem] No tags found for "${cardName}"`);
        return [];
    }

    // Async method for when you can wait for loading
    async getTagsForCardAsync(cardName) {
        if (!this.isReady || !cardName) {
            return [];
        }
        
        // PERFORMANCE: Lazy load data only when actually requested
        if (!this.isLoaded) {
            console.log('🔄 Lazy loading OTAG data for card tags...');
            await this.loadOtagDataFromServer();
        }
        
        const cardKey = cardName.toLowerCase();
        const cardData = this.otagDatabase.get(cardKey);
        
        if (cardData && cardData.otags) {
            console.log(`[ProductionOtagSystem] Found ${cardData.otags.length} tags for "${cardName}":`, cardData.otags);
            return cardData.otags;
        }
        
        console.log(`[ProductionOtagSystem] No tags found for "${cardName}"`);
        return [];
    }

    // PERFORMANCE: Preload Oracle Tags data in background after deck loads
    // This eliminates the 10-30 second wait when users first click an Oracle Tag
    async preloadOtagData() {
        if (this.isLoaded) {
            console.log('🏷️ [PRELOAD] Oracle Tags already loaded');
            return;
        }

        try {
            console.log('🏷️ [PRELOAD] Starting Oracle Tags background preload...');
            await this.loadOtagDataFromServer();
            console.log('🏷️ [PRELOAD] Background preload completed successfully');
        } catch (error) {
            console.log('🏷️ [PRELOAD] Background preload failed (not critical):', error.message);
            throw error;
        }
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
