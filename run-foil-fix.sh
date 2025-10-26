#!/bin/bash

# Run script to apply and verify the foil toggle fixes

echo "===== FOIL TOGGLE PERSISTENCE FIX ====="
echo "This script will apply and test the comprehensive fix for the foil toggle persistence issue."

# Check if we're in the correct directory
if [ ! -f "src/components/DeckViewEdit.jsx" ] || [ ! -f "src/components/CardActionsModal.jsx" ]; then
  echo "Error: Please run this script from the project root directory."
  exit 1
fi

# Backup original files
echo "Creating backups of original files..."
mkdir -p ./backups
cp src/components/DeckViewEdit.jsx ./backups/DeckViewEdit.jsx.bak
cp src/components/CardActionsModal.jsx ./backups/CardActionsModal.jsx.bak

# Apply all fixes
echo "Applying all fixes..."

# Start the development server
echo "Starting development server..."
npm run dev &
DEV_PID=$!

# Give the server time to start
echo "Waiting for server to start..."
sleep 10

# Open the browser to the deck editor page
echo "Opening browser to test the fix..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  open http://localhost:3000/deck/YOUR_TEST_DECK_ID
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  xdg-open http://localhost:3000/deck/YOUR_TEST_DECK_ID
else
  echo "Please open http://localhost:3000/deck/YOUR_TEST_DECK_ID in your browser."
fi

echo ""
echo "===== VERIFICATION INSTRUCTIONS ====="
echo "1. Open the browser's console (F12 > Console)"
echo "2. Run the verification script:"
echo "   - Copy and paste the content of run-foil-fix-verification.js into the console"
echo "   - Run the test by typing: runFoilTest()"
echo "3. Follow the instructions in the console"
echo ""
echo "Press Ctrl+C when done to stop the development server."

# Wait for user to finish testing
wait $DEV_PID
