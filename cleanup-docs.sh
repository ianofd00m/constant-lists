#!/bin/bash

# 🧹 PHASE 2: DOCUMENTATION CLEANUP SCRIPT
# This script moves excessive documentation files to a cleanup folder for safe removal

echo "🧹 Starting Phase 2: Documentation cleanup..."

# Create cleanup directory
CLEANUP_DIR="./cleanup-docs-$(date +%Y%m%d-%H%M%S)"
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

# Essential documentation to KEEP (don't move these):
# - README.md (main project readme)
# - price-display-resolution.md (if it's current/important)

echo "🔍 Moving excessive documentation files..."

# 1. Fix documentation (too many specific fix docs)
move_files "*-FIX.md" "fix documentation"
move_files "FIX-*.md" "fix documentation (prefix)"

# 2. Guide documentation (too many guides)
move_files "*-GUIDE.md" "guide documentation"
move_files "GUIDE-*.md" "guide documentation (prefix)"

# 3. Summary documentation (redundant summaries)
move_files "*-SUMMARY.md" "summary documentation"
move_files "SUMMARY-*.md" "summary documentation (prefix)"

# 4. Integration and completion docs (project-specific, temporary)
move_files "*-INTEGRATION*.md" "integration documentation"
move_files "*-COMPLETE*.md" "completion documentation"
move_files "INTEGRATION-*.md" "integration documentation (prefix)"

# 5. Troubleshooting docs (can be consolidated)
move_files "*-TROUBLESHOOTING*.md" "troubleshooting documentation"
move_files "TROUBLESHOOTING-*.md" "troubleshooting documentation (prefix)"

# 6. Verification and testing docs (temporary/redundant)
move_files "*-VERIFICATION*.md" "verification documentation"
move_files "VERIFICATION-*.md" "verification documentation (prefix)"

# 7. Task and success reports (temporary)
move_files "*-REPORT*.md" "report documentation"
move_files "REPORT-*.md" "report documentation (prefix)"
move_files "TASK-*.md" "task documentation"
move_files "SUCCESS-*.md" "success documentation"

# 8. Component and modal specific docs (too granular)
move_files "MODAL-*.md" "modal documentation"
move_files "COMPONENT-*.md" "component documentation"
move_files "CARD-*.md" "card documentation"
move_files "SEARCH-*.md" "search documentation"
move_files "PREVIEW-*.md" "preview documentation"
move_files "PRICE-*.md" "price documentation"

# 9. Authentication and endpoint docs (specific/temporary)
move_files "AUTH-*.md" "authentication documentation"
move_files "ENDPOINT*.md" "endpoint documentation"

# 10. Production and deployment specific docs (can be consolidated)
move_files "OTAG-PRODUCTION*.md" "production documentation"
move_files "*-PRODUCTION*.md" "production documentation"
move_files "PERMANENT-*.md" "permanent documentation"

# Also move HTML documentation files that are likely temporary
echo "🔍 Moving HTML documentation files..."
move_files "FINAL-VERIFICATION*.html" "HTML verification documentation"
move_files "PRICE-SYNC-VERIFICATION*.html" "HTML price sync documentation"

# Count moved files
MOVED_COUNT=$(find "$CLEANUP_DIR" -type f | wc -l | tr -d ' ')

echo ""
echo "✅ Phase 2 cleanup complete!"
echo "📊 Moved $MOVED_COUNT documentation files to $CLEANUP_DIR"
echo ""

# Show what documentation remains
echo "📄 REMAINING DOCUMENTATION:"
find . -maxdepth 1 -name "*.md" -type f | sort
echo ""

echo "🔍 Files moved:"
ls -la "$CLEANUP_DIR" | head -15
if [ $MOVED_COUNT -gt 15 ]; then
    echo "   ... and $(($MOVED_COUNT - 15)) more files"
fi

echo ""
echo "💡 To restore files if needed:"
echo "   mv $CLEANUP_DIR/* ./"
echo ""
echo "🗑️  To permanently delete after verification:"
echo "   rm -rf $CLEANUP_DIR"
