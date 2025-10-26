// Parse the FULL OTAGS.csv and generate a complete oracle tags array
import fs from 'fs';

try {
    const csvContent = fs.readFileSync('public/FULL OTAGS.csv', 'utf8');
    
    // Parse the CSV content
    const tags = new Set();
    
    // Split content into lines and process each line
    const lines = csvContent.split('\n');
    
    lines.forEach(line => {
        if (line.trim()) {
            // Handle quoted lines with commas
            if (line.includes('"')) {
                // Extract content from quotes
                const match = line.match(/"([^"]*)"/);
                if (match) {
                    const quotedContent = match[1];
                    quotedContent.split(',').forEach(tag => {
                        const cleaned = tag.trim();
                        if (cleaned && cleaned.length > 0) {
                            tags.add(cleaned);
                        }
                    });
                }
            } else {
                // Handle unquoted lines
                line.split(',').forEach(tag => {
                    const cleaned = tag.trim().replace(/['"]/g, '');
                    if (cleaned && cleaned.length > 0) {
                        tags.add(cleaned);
                    }
                });
            }
        }
    });
    
    // Convert to sorted array
    const sortedTags = Array.from(tags).sort();
    
    console.log(`Found ${sortedTags.length} unique oracle tags`);
    
    // Generate the new oracle tags array as JavaScript code
    const jsCode = `// Complete list of functional oracle tags from FULL OTAGS.csv
// Generated automatically from your comprehensive oracle tags CSV
// Total: ${sortedTags.length} oracle tags

const COMPLETE_ORACLE_TAGS = [
${sortedTags.map(tag => `    '${tag}'`).join(',\n')}
];

export default COMPLETE_ORACLE_TAGS;
`;
    
    // Write to file
    fs.writeFileSync('complete-oracle-tags.js', jsCode);
    console.log('✅ Generated complete-oracle-tags.js');
    
    // Show first 50 and last 50 tags
    console.log('\n📊 First 50 oracle tags:');
    sortedTags.slice(0, 50).forEach((tag, i) => {
        console.log(`  ${i + 1}. ${tag}`);
    });
    
    console.log('\n📊 Last 50 oracle tags:');
    sortedTags.slice(-50).forEach((tag, i) => {
        console.log(`  ${sortedTags.length - 49 + i}. ${tag}`);
    });
    
    // Generate updated scraper
    const scraperTemplate = `// Enhanced Official Scryfall Functional Oracle Tags Scraper
// Uses the COMPLETE list from FULL OTAGS.csv
// Total: ${sortedTags.length} oracle tags

const API_BASE = 'https://api.scryfall.com';
const DELAY_MS = 100; // Rate limiting

class CompleteOracleTagScraper {
    constructor() {
        this.cardTagMap = new Map(); // cardName -> Set of oracle tags
        this.processedTags = 0;
        this.errors = [];
        this.tagStats = new Map(); // tag -> count of cards
        
        // Complete list of ALL functional oracle tags
        this.functionalOracleTags = [
${sortedTags.map(tag => `            '${tag}'`).join(',\n')}
        ];
        
        console.log(\`📊 Found \${this.functionalOracleTags.length} complete functional oracle tags to scrape\`);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async searchForTag(tag) {
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(\`🔍 Searching oracle tag: \${tag} (\${this.processedTags + 1}/\${this.functionalOracleTags.length})\`);
                
                const response = await fetch(\`\${API_BASE}/cards/search?q=oracletag:\${tag}&page=1\`);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(\`✅ Found \${data.total_cards} cards with oracle tag: \${tag}\`);
                    
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
                        console.log(\`🌐 Fetching page \${currentPage} for \${tag}...\`);
                        
                        const pageResponse = await fetch(\`\${API_BASE}/cards/search?q=oracletag:\${tag}&page=\${currentPage}\`);
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
                    
                    console.log(\`📦 Collected \${allCards.length} cards for tag: \${tag}\`);
                    return true;
                    
                } else if (response.status === 404) {
                    console.log(\`❌ Oracle tag not found: \${tag}\`);
                    return false;
                } else {
                    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                }
            } catch (error) {
                console.log(\`❌ Error searching \${tag} (attempt \${attempt}): \${error.message}\`);
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
        console.log('📄 Generating COMPLETE functional oracle tags CSV...');
        
        const headers = ['card_name', 'oracle_tags'];
        const rows = [headers.join(',')];
        
        for (const [cardName, tags] of this.cardTagMap) {
            const tagsStr = Array.from(tags).sort().join('|');
            const escapedName = \`"\${cardName.replace(/"/g, '""')}"\`;
            rows.push(\`\${escapedName},"\${tagsStr}"\`);
        }
        
        const csvContent = rows.join('\\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = \`scryfall-COMPLETE-oracle-tags-\${new Date().toISOString().split('T')[0]}.csv\`;
        link.click();
        
        const fileSize = Math.round(csvContent.length / 1024 / 1024 * 100) / 100;
        console.log(\`💾 Downloaded: \${link.download}\`);
        console.log(\`📊 CSV contains \${this.cardTagMap.size} cards with functional oracle tags\`);
        console.log(\`📏 File size: \${fileSize} MB\`);
        
        return {
            cardCount: this.cardTagMap.size,
            tagCount: this.tagStats.size,
            fileSize: fileSize
        };
    }

    async start() {
        console.log('🚀 Starting COMPLETE oracle tag scraping...');
        console.log(\`🎯 Scraping \${this.functionalOracleTags.length} COMPLETE functional oracle tags\`);
        
        const startTime = Date.now();
        
        try {
            // Process each complete oracle tag
            for (const tag of this.functionalOracleTags) {
                await this.searchForTag(tag);
                this.processedTags++;
                
                // Progress update every 25 tags
                if (this.processedTags % 25 === 0) {
                    console.log(\`📊 Progress: \${this.processedTags}/\${this.functionalOracleTags.length} tags processed, \${this.cardTagMap.size} unique cards found\`);
                }
                
                await this.delay(DELAY_MS);
            }
            
            // Generate final CSV
            const csvStats = await this.generateCSV();
            
            const endTime = Date.now();
            const duration = Math.round((endTime - startTime) / 1000 / 60 * 100) / 100;
            
            console.log('✅ COMPLETE oracle tag scraping completed!');
            console.log(\`⏱️ Total time: \${duration} minutes\`);
            console.log(\`🏷️ Total oracle tags found: \${this.tagStats.size}\`);
            console.log(\`🃏 Total cards with functional tags: \${this.cardTagMap.size}\`);
            console.log(\`❌ Errors: \${this.errors.length}\`);
            
            // Show top 30 most common oracle tags
            console.log('\\n📊 Top 30 most common oracle tags:');
            const sortedTags = Array.from(this.tagStats.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 30);
                
            sortedTags.forEach(([tag, count]) => {
                console.log(\`  \${tag}: \${count} cards\`);
            });
            
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
    window.CompleteOracleTagScraper = CompleteOracleTagScraper;
}

if (typeof module !== 'undefined') {
    module.exports = CompleteOracleTagScraper;
}
`;
    
    fs.writeFileSync('complete-oracle-tags-scraper.js', scraperTemplate);
    console.log('✅ Generated complete-oracle-tags-scraper.js');
    
} catch (error) {
    console.error('❌ Error processing CSV:', error.message);
}
