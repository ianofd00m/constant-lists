#!/bin/bash
# Run verification tests for the MTG Deck Editor improvements

echo "========================================================"
echo "MTG Deck Editor Improvement Verification"
echo "========================================================"

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Check if the dev server is running
if ! curl -s http://localhost:5176/ > /dev/null; then
  echo "🚀 Starting development server..."
  npm run dev &
  DEV_SERVER_PID=$!
  echo "Waiting for server to start..."
  sleep 5
else
  echo "✅ Development server already running."
fi

# Run verification scripts
echo -e "\n📋 Running verification scripts...\n"

echo "1. Final Verification Script"
node final-verification.js

echo -e "\n2. Foil Effects Test"
node test-foil-effects.js

echo -e "\n3. Modal UI Test"
node test-modal-ui-updates.js

echo -e "\n4. Card Actions Test"
if [ -f "test-card-actions-fix.js" ]; then
  node test-card-actions-fix.js
else
  echo "   ⚠️ Card actions test not found, skipping."
fi

echo -e "\n========================================================"
echo "✅ All verification tests completed."
echo -e "Please open http://localhost:5176/ in your browser to perform manual verification.\n"
echo "Check the UI-IMPROVEMENTS-SUMMARY.md for documentation."
echo "Use deck-editor-debug.js in your browser console for real-time debugging."
echo "========================================================"

# If we started the dev server, provide option to stop it
if [ -n "$DEV_SERVER_PID" ]; then
  read -p "Press any key to stop the development server or Ctrl+C to leave it running... " -n1 -s
  echo ""
  kill $DEV_SERVER_PID
  echo "Development server stopped."
fi
