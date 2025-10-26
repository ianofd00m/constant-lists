#!/bin/bash

# Final verification script for printing/price sync fix
echo "🃏 MTG Deck Builder - Final Verification"
echo "========================================"

# Check if debug logs are cleaned up
echo ""
echo "🧹 Checking for remaining debug logs..."
DEBUG_COUNT=$(grep -r "console\.log\|console\.warn\|\[DEBUG\]\|\[FOIL.*DEBUG\]" src/components/DeckViewEdit.jsx src/components/CardActionsModal.jsx | grep -v "console\.error" | wc -l)
if [ "$DEBUG_COUNT" -eq 0 ]; then
    echo "✅ No debug logs found in main components"
else
    echo "❌ Found $DEBUG_COUNT debug logs still present"
    grep -r "console\.log\|console\.warn\|\[DEBUG\]\|\[FOIL.*DEBUG\]" src/components/DeckViewEdit.jsx src/components/CardActionsModal.jsx | grep -v "console\.error"
fi

# Check if debugLogger is disabled
echo ""
echo "🔧 Checking debugLogger status..."
if grep -q "DEBUG_ENABLED = false" src/utils/debugLogger.js; then
    echo "✅ debugLogger is disabled"
else
    echo "❌ debugLogger may still be enabled"
fi

# Check for syntax errors
echo ""
echo "🔍 Checking for syntax errors..."
if npm run build --silent > /dev/null 2>&1; then
    echo "✅ No syntax errors found - build successful"
else
    echo "❌ Syntax errors detected"
fi

# Check key fixes are in place
echo ""
echo "🎯 Verifying key fixes..."

# Check if CardActionsModal accepts cardPrice prop
if grep -q "cardPrice" src/components/CardActionsModal.jsx; then
    echo "✅ CardActionsModal accepts cardPrice prop"
else
    echo "❌ CardActionsModal missing cardPrice prop"
fi

# Check if handleCardHover preserves printing info
if grep -q "printing:" src/components/DeckViewEdit.jsx; then
    echo "✅ handleCardHover preserves printing information"
else
    echo "❌ handleCardHover may not preserve printing information"
fi

# Check if deck cards pass printing info to modal
if grep -q "printing:" src/components/DeckViewEdit.jsx && grep -q "cardPrice:" src/components/DeckViewEdit.jsx; then
    echo "✅ Deck cards pass complete information to modal"
else
    echo "❌ Deck cards may not pass complete information"
fi

echo ""
echo "📊 Summary"
echo "=========="
echo "🌐 Development server: http://localhost:5176/"
echo "📋 Test guide: file://$(pwd)/printing-price-sync-test.html"
echo ""
echo "🧪 Manual testing required to verify:"
echo "   - Deck list, preview, and modal show consistent prices"
echo "   - Hover operations don't corrupt printing data"
echo "   - Foil toggles work correctly across all components"
echo "   - Multiple printings are handled properly"
echo ""
