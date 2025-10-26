// CSS Update Verification Script
// Run this in the browser console to check CSS status

console.log('🔍 CSS Update Verification Starting...');

// Check if App.css is loaded
const cssFiles = Array.from(document.styleSheets).filter(sheet => {
    try {
        return sheet.href && (sheet.href.includes('App.css') || sheet.href.includes('app.css'));
    } catch (e) {
        return false;
    }
});

console.log(`📋 Found ${cssFiles.length} App.css files`);

// Check for foil elements
const foilElements = document.querySelectorAll('.card-preview-container.foil-active-border');
console.log(`🎨 Found ${foilElements.length} foil card preview elements`);

if (foilElements.length === 0) {
    console.log('⚠️ No foil cards found! You need to:');
    console.log('1. Navigate to a deck');
    console.log('2. Find cards marked as foil');
    console.log('3. Hover over them to see the preview');
}

// Check CSS properties of foil elements
foilElements.forEach((element, index) => {
    const beforeStyles = window.getComputedStyle(element, '::before');
    console.log(`🔍 Foil Element ${index + 1}:`);
    console.log(`  - Background: ${beforeStyles.background}`);
    console.log(`  - Animation: ${beforeStyles.animationName}`);
    console.log(`  - Duration: ${beforeStyles.animationDuration}`);
    console.log(`  - Opacity: ${beforeStyles.opacity}`);
    console.log(`  - Mix-blend-mode: ${beforeStyles.mixBlendMode}`);
});

// Check for rainbow animation keyframes
let foundRainbowAnimation = false;
Array.from(document.styleSheets).forEach(sheet => {
    try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
            Array.from(rules).forEach(rule => {
                if (rule.type === CSSRule.KEYFRAMES_RULE && 
                    rule.name === 'rainbow-wave-shimmer') {
                    foundRainbowAnimation = true;
                    console.log('✅ Found rainbow-wave-shimmer animation');
                }
            });
        }
    } catch (e) {
        // Skip stylesheets we can't access
    }
});

if (!foundRainbowAnimation) {
    console.log('❌ rainbow-wave-shimmer animation not found');
}

// Force CSS reload test
console.log('🔄 To force CSS reload, you can:');
console.log('1. Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)');
console.log('2. Open Developer Tools > Sources > find App.css > right-click > Override content');
console.log('3. Or check the Network tab to see if App.css is loading');

// Create test foil card if none exist
function createTestFoilCard() {
    const testCard = document.createElement('div');
    testCard.className = 'card-preview-container foil-active-border';
    testCard.style.position = 'fixed';
    testCard.style.top = '20px';
    testCard.style.right = '20px';
    testCard.style.zIndex = '9999';
    testCard.style.border = '3px solid #ffeb3b';
    testCard.style.padding = '10px';
    testCard.style.background = 'white';
    testCard.style.borderRadius = '15px';
    testCard.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    
    const img = document.createElement('img');
    img.src = 'https://cards.scryfall.io/normal/front/0/3/03ab2a41-315b-439c-b02c-f12335fc903a.jpg';
    img.style.width = '150px';
    img.style.borderRadius = '10px';
    img.alt = 'Test Foil Card';
    
    const label = document.createElement('div');
    label.textContent = 'TEST FOIL CARD';
    label.style.textAlign = 'center';
    label.style.fontSize = '14px';
    label.style.fontWeight = 'bold';
    label.style.marginTop = '10px';
    label.style.color = '#ffeb3b';
    label.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
    
    testCard.appendChild(img);
    testCard.appendChild(label);
    
    document.body.appendChild(testCard);
    
    console.log('🧪 Created test foil card in top-right corner');
    console.log('👀 Check if it has the rainbow gradient effect');
    
    // Remove after 15 seconds
    setTimeout(() => {
        testCard.remove();
        console.log('🧹 Removed test foil card');
    }, 15000);
    
    return testCard;
}

window.createTestFoilCard = createTestFoilCard;
console.log('💡 Run createTestFoilCard() to add a test foil card');
console.log('✅ CSS Verification Complete!');
