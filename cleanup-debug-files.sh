#!/bin/bash

# 🧹 DEBUG & TEST FILES CLEANUP SCRIPT
# This script moves debug/test files to a cleanup folder for safe removal

echo "🧹 Starting debug and test files cleanup..."

# Create cleanup directory
CLEANUP_DIR="./cleanup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$CLEANUP_DIR"

echo "📁 Created cleanup directory: $CLEANUP_DIR"

# Function to move files safely
move_files() {
    local pattern="$1"
    local description="$2"
    
    echo "🔍 Moving $description files..."
    
    find . -maxdepth 1 -name "$pattern" -type f | while read -r file; do
        if [ -f "$file" ]; then
            echo "   📦 Moving: $file"
            mv "$file" "$CLEANUP_DIR/"
        fi
    done
}

# 1. Debug files
move_files "debug-*.js" "debug"
move_files "debug-*.html" "debug HTML"
move_files "debug-*.cjs" "debug CommonJS"

# 2. Test files
move_files "test-*.js" "test JavaScript"
move_files "test-*.html" "test HTML"
move_files "test-*.cjs" "test CommonJS"
move_files "*-test.js" "test files (suffix)"
move_files "*-test.html" "test HTML files (suffix)"

# 3. Quick fixes and emergency scripts
move_files "quick-*.js" "quick fix"
move_files "emergency-*.js" "emergency"
move_files "force-*.js" "force"
move_files "manual-*.js" "manual"
move_files "simple-*.js" "simple"

# 4. Comprehensive and diagnostic files
move_files "comprehensive-*.js" "comprehensive"
move_files "*-diagnostic*.js" "diagnostic"
move_files "*-debug*.js" "debug (suffix)"

# 5. Check and verification scripts (keeping essential ones)
move_files "check-*.js" "check scripts"
move_files "check-*.cjs" "check CommonJS scripts"
# Keep check-*.html as they might be documentation

# 6. Animation and foil test files
move_files "*-animation-*.js" "animation test"
move_files "*-foil-*.js" "foil test"
move_files "foil-*.js" "foil scripts"
move_files "*-foil-*.html" "foil HTML test"

# 7. Angle and hover test files
move_files "angle-*.html" "angle test"
move_files "hover-*.js" "hover test"
move_files "hover-*.html" "hover test HTML"

# 8. Clear and cache scripts
move_files "clear-*.js" "clear scripts"
move_files "*-cache-*.js" "cache scripts"
move_files "browser-*.js" "browser scripts"

# 9. Auto and click scripts
move_files "auto-*.js" "auto scripts"
move_files "*-click-*.js" "click scripts"
move_files "click-*.js" "click scripts"

# 10. Animation diagnostic and stabilizer
move_files "animation-*.js" "animation scripts"
move_files "*-stabilizer*.js" "stabilizer scripts"

# 11. Current state debug files
move_files "current-*.js" "current state scripts"

# Count moved files
MOVED_COUNT=$(find "$CLEANUP_DIR" -type f | wc -l | tr -d ' ')

echo ""
echo "✅ Cleanup complete!"
echo "📊 Moved $MOVED_COUNT files to $CLEANUP_DIR"
echo ""
echo "🔍 Files moved:"
ls -la "$CLEANUP_DIR" | head -20
if [ $MOVED_COUNT -gt 20 ]; then
    echo "   ... and $(($MOVED_COUNT - 20)) more files"
fi

echo ""
echo "💡 To restore files if needed:"
echo "   mv $CLEANUP_DIR/* ./"
echo ""
echo "🗑️  To permanently delete after verification:"
echo "   rm -rf $CLEANUP_DIR"
