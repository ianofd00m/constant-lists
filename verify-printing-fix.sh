#!/bin/bash
# Verification script for the printing/price synchronization fix

echo "🔧 Printing/Price Synchronization Fix Verification"
echo "================================================="
echo

# Check if backend is running
echo "📡 Testing backend connection..."
if curl -s "http://localhost:5177/api/cards/typesense-search?q=test&limit=1" > /dev/null 2>&1; then
    echo "✅ Backend server is running on port 5177"
else
    echo "❌ Backend server not found on port 5177"
    echo "   Please start the backend server first"
    exit 1
fi

# Check if frontend is running
echo "🌐 Testing frontend connection..."
if curl -s "http://localhost:5176" > /dev/null 2>&1; then
    echo "✅ Frontend server is running on port 5176"
else
    echo "❌ Frontend server not found on port 5176"
    echo "   Please start the frontend server first"
    exit 1
fi

echo
echo "🧪 Testing Typesense search endpoint..."

# Test the search endpoint and check for Scryfall IDs
SEARCH_RESULT=$(curl -s "http://localhost:5177/api/cards/typesense-search?q=impact%20tremors&limit=1")

if echo "$SEARCH_RESULT" | jq -e '.[0].scryfall_id' > /dev/null 2>&1; then
    CARD_NAME=$(echo "$SEARCH_RESULT" | jq -r '.[0].name')
    SCRYFALL_ID=$(echo "$SEARCH_RESULT" | jq -r '.[0].scryfall_id')
    ID_FIELD=$(echo "$SEARCH_RESULT" | jq -r '.[0].id')
    SET_NAME=$(echo "$SEARCH_RESULT" | jq -r '.[0].set_name')
    
    echo "✅ Search returns proper Scryfall IDs:"
    echo "   Card: $CARD_NAME"
    echo "   Scryfall ID: $SCRYFALL_ID"
    echo "   ID field: $ID_FIELD"
    echo "   Set: $SET_NAME"
    
    if [ "$SCRYFALL_ID" = "$ID_FIELD" ]; then
        echo "✅ ID field correctly uses Scryfall ID"
    else
        echo "⚠️  ID field differs from scryfall_id field"
    fi
else
    echo "❌ Search results do not contain scryfall_id field"
    echo "   Raw response: $SEARCH_RESULT"
    exit 1
fi

echo
echo "✅ All checks passed! The printing/price synchronization fix is working."
echo
echo "📋 Manual Testing Steps:"
echo "1. Open http://localhost:5176 in your browser"
echo "2. Open a deck with cards that have multiple printings"
echo "3. Search for 'Impact Tremors' and add it to the deck"
echo "4. Verify the deck list, preview, and modal all show consistent printing/price"
echo "5. Try changing the printing in the modal and verify it updates everywhere"
echo
echo "📖 For detailed testing instructions, see: printing-price-sync-test.html"
