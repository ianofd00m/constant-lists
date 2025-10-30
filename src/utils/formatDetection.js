// Format Detection and Validation Utilities
// Helps users understand supported formats and provides guidance

export const FORMAT_CATEGORIES = {
  WORD_PROCESSOR: {
    name: 'Word Processor Documents',
    extensions: ['.docx', '.doc', '.odt', '.pages'],
    description: 'Microsoft Word, OpenDocument Text, Apple Pages',
    reliability: 'High - Text extraction with format stripping',
    tip: 'For best results, ensure card lists are in simple text format within the document'
  },
  
  TEXT: {
    name: 'Text Documents', 
    extensions: ['.txt', '.rtf', '.md'],
    description: 'Plain text, Rich Text Format, Markdown',
    reliability: 'Excellent - Direct text parsing',
    tip: 'Preferred format for manual card lists'
  },
  
  LAYOUT: {
    name: 'Layout & Markup Documents',
    extensions: ['.pdf', '.html', '.htm', '.xml', '.tex'],
    description: 'PDF, HTML, XML, LaTeX documents',
    reliability: 'Variable - Depends on document structure',
    tip: 'PDF support is experimental. Copy/paste text for better results'
  },
  
  SPREADSHEET: {
    name: 'Spreadsheet Documents',
    extensions: ['.xlsx', '.xlsm', '.xlsb', '.xls', '.csv', '.ods', '.numbers'],
    description: 'Excel, OpenDocument Spreadsheet, Apple Numbers, CSV',
    reliability: 'High - CSV recommended for best compatibility',
    tip: 'Export as CSV for guaranteed compatibility and faster processing'
  },
  
  DATA: {
    name: 'Structured Data Files',
    extensions: ['.json', '.dek'],
    description: 'Scryfall JSON exports, DEK deck files',
    reliability: 'Excellent - Native format support',
    tip: 'Direct API exports provide the most complete data'
  }
};

export const MIME_TYPE_MAP = {
  // Word processor formats
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'application/vnd.oasis.opendocument.text': '.odt',
  'application/vnd.apple.pages': '.pages',
  
  // Text formats
  'text/plain': '.txt',
  'application/rtf': '.rtf',
  'text/rtf': '.rtf',
  'text/markdown': '.md',
  'text/x-markdown': '.md',
  
  // Layout formats
  'application/pdf': '.pdf',
  'text/html': '.html',
  'application/xhtml+xml': '.html',
  'application/xml': '.xml',
  'text/xml': '.xml',
  'application/x-tex': '.tex',
  'application/x-latex': '.tex',
  
  // Spreadsheet formats
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel.sheet.macroEnabled.12': '.xlsm',
  'application/vnd.ms-excel.sheet.binary.macroEnabled.12': '.xlsb',
  'application/vnd.ms-excel': '.xls',
  'text/csv': '.csv',
  'application/csv': '.csv',
  'application/vnd.oasis.opendocument.spreadsheet': '.ods',
  'application/vnd.apple.numbers': '.numbers',
  
  // Data formats
  'application/json': '.json',
  'text/json': '.json'
};

export function detectFileFormat(file) {
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  const mimeType = file.type;
  
  // Find category for this extension
  const category = Object.entries(FORMAT_CATEGORIES).find(([key, cat]) =>
    cat.extensions.includes(extension)
  );
  
  // Validate MIME type matches extension (if available)
  const expectedExtension = MIME_TYPE_MAP[mimeType];
  const mimeMatches = !expectedExtension || expectedExtension === extension;
  
  return {
    extension,
    mimeType,
    category: category ? category[1] : null,
    categoryName: category ? category[0] : 'UNKNOWN',
    mimeMatches,
    isSupported: !!category,
    confidence: getMIMEConfidence(extension, mimeType)
  };
}

function getMIMEConfidence(extension, mimeType) {
  if (!mimeType) return 'medium'; // No MIME type provided
  
  const expectedExtension = MIME_TYPE_MAP[mimeType];
  if (expectedExtension === extension) return 'high';
  if (expectedExtension) return 'low'; // MIME type doesn't match extension
  
  return 'medium'; // Unknown MIME type but extension is recognized
}

export function getFormatRecommendations(file) {
  const format = detectFileFormat(file);
  const recommendations = [];
  
  if (!format.isSupported) {
    recommendations.push({
      type: 'error',
      message: `Unsupported format: ${format.extension.toUpperCase()}`
    });
    return recommendations;
  }
  
  if (!format.mimeMatches) {
    recommendations.push({
      type: 'warning',
      message: 'File extension and content type don\'t match. File may be corrupted.'
    });
  }
  
  // Category-specific recommendations
  switch (format.categoryName) {
    case 'WORD_PROCESSOR':
      recommendations.push({
        type: 'info',
        message: 'Word documents: Text will be extracted automatically. Ensure card lists are in simple text format.'
      });
      if (format.extension === '.pages') {
        recommendations.push({
          type: 'warning', 
          message: 'Apple Pages support is experimental. Consider exporting as RTF or TXT first.'
        });
      }
      break;
      
    case 'LAYOUT':
      if (format.extension === '.pdf') {
        recommendations.push({
          type: 'warning',
          message: 'PDF support is experimental. For best results, copy text from PDF and use Text Import instead.'
        });
      }
      break;
      
    case 'SPREADSHEET':
      if (!['.csv'].includes(format.extension)) {
        recommendations.push({
          type: 'info',
          message: 'Spreadsheet detected. For guaranteed compatibility, export as CSV first.'
        });
      }
      break;
      
    case 'DATA':
      recommendations.push({
        type: 'success',
        message: 'Structured data format detected. Expect excellent parsing results.'
      });
      break;
  }
  
  return recommendations;
}

export function getAllSupportedExtensions() {
  return Object.values(FORMAT_CATEGORIES)
    .flatMap(category => category.extensions)
    .sort();
}

export function getFormatHelp() {
  return {
    overview: 'The Universal Import System supports documents, spreadsheets, and data files from virtually any source.',
    
    bestPractices: [
      'CSV files provide the most reliable results for spreadsheet data',
      'Plain text files offer the fastest and most accurate parsing',
      'Scryfall JSON exports preserve complete card metadata',
      'When in doubt, copy/paste content into Text Import'
    ],
    
    troubleshooting: [
      'If import fails, try exporting to a simpler format (CSV or TXT)',
      'For PDFs, copy the text content and use Text Import instead',
      'Large files (>50MB) may time out - consider splitting into smaller files',
      'Corrupted files will be detected and rejected with helpful error messages'
    ],
    
    categories: FORMAT_CATEGORIES
  };
}

// Export format validation for ImportModal
export function validateFileFormat(file) {
  const format = detectFileFormat(file);
  const recommendations = getFormatRecommendations(file);
  
  return {
    ...format,
    recommendations,
    canProceed: format.isSupported,
    message: format.isSupported 
      ? `${format.category.name} detected - ${format.category.reliability}`
      : `Unsupported format: ${format.extension}`
  };
}

console.log('📁 Universal Format Support Reference:');
console.log('Supported categories:', Object.keys(FORMAT_CATEGORIES));
console.log('Total formats supported:', getAllSupportedExtensions().length);
console.log('Extensions:', getAllSupportedExtensions().join(', '));