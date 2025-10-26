# Deck Export Features

## Overview
The deck editor now includes two export options accessible from the deck title bar:

## Export to Text File (📄 Export Text)
- **Format**: Plain text file (.txt)
- **Content**: Card names and quantities organized by section
- **Sections**: Main Deck, Sideboard (if exists), Tech Ideas (if exists)
- **Features**:
  - Cards grouped by name with combined quantities
  - Alphabetically sorted within each section
  - Section totals included
  - Clean, readable format

## Export to PDF (📑 Export PDF) - ENHANCED
- **Format**: Professional PDF file with high-quality card images
- **Content**: Visual deck list with reliable card previews organized by type
- **Features**:
  - **NEW**: Cards sorted by type (Planeswalker → Creature → Instant → Sorcery → Enchantment → Artifact → Land → Other)
  - **NEW**: Alphabetical sorting within each card type
  - **IMPROVED**: 3-column responsive grid layout that fits A4 pages perfectly
  - **FIXED**: Proper page breaks that don't cut through cards
  - **FIXED**: Full-width layout with no content cutoff
  - Base64 data URL conversion eliminates CORS issues
  - Parallel image processing for faster generation
  - Robust fallback system for missing/failed images
  - Cards grouped by name with quantities
  - All sections included (Main Deck, Sideboard, Tech Ideas)
  - Professional formatting with section and type headers
  - Higher resolution (2x scale) for crisp images
  - PNG export for better quality

## Technical Details

### Dependencies Added
- `jspdf`: PDF generation library
- `html2canvas`: HTML-to-image conversion for PDF creation

### Image Handling (UPDATED)
- **NEW**: Images converted to base64 data URLs to eliminate CORS issues completely
- **IMPROVED**: Dual-fallback strategy: Direct fetch → CORS proxy → Placeholder
- **ENHANCED**: Parallel processing of all card images before PDF generation
- Uses Scryfall API card data from scryfall_json with automatic URL construction
- 10-second timeout per image conversion (increased from 8 seconds)
- 30-second overall timeout protection to prevent hanging
- Graceful degradation with "No Image Available" placeholder

### Error Handling
- Network failure tolerance
- Missing card data handling
- File download error recovery
- Progress indicators for PDF generation

## Usage
1. Navigate to any deck in the deck editor
2. Look for the export buttons next to the deck title
3. Click "📄 Export Text" for a plain text deck list
4. Click "📑 Export PDF" for a visual deck list with card images

## File Naming
- Text files: `{deck-name}.txt`
- PDF files: `{deck-name}.pdf`
- Defaults to "deck" if no name is set

Both export functions handle all card sections (main deck, sideboard, tech ideas) and preserve card quantities and foil status information.
