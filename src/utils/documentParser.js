// Universal Document Parser - Handles multiple document formats
// Supports Word, PDF, RTF, Markdown, HTML, XML and other text-based formats

import { processImportedCards } from './cardDataEnrichment.js';

export class DocumentParser {
  constructor() {
    this.supportedFormats = [
      // Word processor formats
      'docx', 'doc', 'odt', 'pages', 
      // Text formats
      'txt', 'rtf', 'md',
      // Layout formats
      'pdf', 'html', 'htm', 'xml', 'tex',
      // Spreadsheet formats  
      'xlsx', 'xlsm', 'xlsb', 'xls', 'csv', 'ods', 'numbers'
    ];
  }

  async parseDocument(file, options = {}) {
    if (!file) {
      throw new Error('No file provided');
    }

    const extension = this.getFileExtension(file.name);
    const mimeType = file.type;

    console.log(`Parsing document: ${file.name} (${extension}) - ${mimeType}`);

    try {
      // Route to appropriate parser based on file extension and MIME type
      switch (extension.toLowerCase()) {
        case 'docx':
          return await this.parseWordDocx(file, options);
        case 'doc':
          return await this.parseWordDoc(file, options);
        case 'odt':
          return await this.parseOpenDocument(file, options);
        case 'pages':
          return await this.parseApplePages(file, options);
        case 'rtf':
          return await this.parseRTF(file, options);
        case 'md':
          return await this.parseMarkdown(file, options);
        case 'pdf':
          return await this.parsePDF(file, options);
        case 'html':
        case 'htm':
          return await this.parseHTML(file, options);
        case 'xml':
          return await this.parseXML(file, options);
        case 'tex':
          return await this.parseLaTeX(file, options);
        case 'xlsx':
        case 'xlsm':
        case 'xlsb':
          return await this.parseExcel(file, options);
        case 'xls':
          return await this.parseExcelLegacy(file, options);
        case 'ods':
          return await this.parseOpenSpreadsheet(file, options);
        case 'numbers':
          return await this.parseAppleNumbers(file, options);
        case 'csv':
          return await this.parseCSVFile(file, options);
        case 'txt':
          return await this.parsePlainText(file, options);
        default:
          return await this.parseFallback(file, options);
      }
    } catch (error) {
      console.error(`Error parsing ${extension} file:`, error);
      throw new Error(`Failed to parse ${extension.toUpperCase()} file: ${error.message}`);
    }
  }

  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  // Microsoft Word .docx parser
  async parseWordDocx(file, options = {}) {
    try {
      // For now, extract as text and parse with text parser
      // In production, would use mammoth.js or docx library
      const text = await this.extractTextFromBinary(file);
      return await this.parseExtractedText(text, 'docx', options);
    } catch (error) {
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
  }

  // Microsoft Word .doc parser
  async parseWordDoc(file) {
    try {
      // Legacy format requires specialized parser
      // For now, attempt text extraction
      const text = await this.extractTextFromBinary(file);
      return await this.parseExtractedText(text, 'doc');
    } catch (error) {
      throw new Error(`DOC parsing failed: ${error.message}`);
    }
  }

  // OpenDocument Text (.odt) parser
  async parseOpenDocument(file) {
    try {
      // ODT is ZIP-based XML format
      const text = await this.extractTextFromZip(file);
      return await this.parseExtractedText(text, 'odt');
    } catch (error) {
      throw new Error(`ODT parsing failed: ${error.message}`);
    }
  }

  // Apple Pages parser
  async parseApplePages(file) {
    try {
      // Pages files are complex packages
      const text = await this.extractTextFromBinary(file);
      return await this.parseExtractedText(text, 'pages');
    } catch (error) {
      throw new Error(`Pages parsing failed: ${error.message}`);
    }
  }

  // Rich Text Format parser
  async parseRTF(file) {
    try {
      const content = await this.readAsText(file);
      // Strip RTF formatting codes and extract plain text
      const text = this.stripRTFFormatting(content);
      return await this.parseExtractedText(text, 'rtf');
    } catch (error) {
      throw new Error(`RTF parsing failed: ${error.message}`);
    }
  }

  // Markdown parser
  async parseMarkdown(file) {
    try {
      const content = await this.readAsText(file);
      // Strip Markdown syntax and extract text
      const text = this.stripMarkdownFormatting(content);
      return await this.parseExtractedText(text, 'md');
    } catch (error) {
      throw new Error(`Markdown parsing failed: ${error.message}`);
    }
  }

  // PDF parser
  async parsePDF(file) {
    try {
      // Would use PDF.js or pdf-lib in production
      // For now, inform user of PDF limitation
      throw new Error('PDF parsing requires additional libraries. Please copy text from PDF and use Text Import instead.');
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  // HTML parser
  async parseHTML(file) {
    try {
      const content = await this.readAsText(file);
      const text = this.stripHTMLTags(content);
      return await this.parseExtractedText(text, 'html');
    } catch (error) {
      throw new Error(`HTML parsing failed: ${error.message}`);
    }
  }

  // XML parser
  async parseXML(file) {
    try {
      const content = await this.readAsText(file);
      
      // Check if it's a DEK file
      if (content.includes('<Deck') && content.includes('<Cards')) {
        const { parseDek } = await import('./dekParser.js');
        const dekResult = await parseDek(content);
        return await this.convertDekToCards(dekResult);
      }
      
      // Otherwise extract text content
      const text = this.stripXMLTags(content);
      return await this.parseExtractedText(text, 'xml');
    } catch (error) {
      throw new Error(`XML parsing failed: ${error.message}`);
    }
  }

  // LaTeX parser
  async parseLaTeX(file) {
    try {
      const content = await this.readAsText(file);
      const text = this.stripLaTeXCommands(content);
      return await this.parseExtractedText(text, 'tex');
    } catch (error) {
      throw new Error(`LaTeX parsing failed: ${error.message}`);
    }
  }

  // Excel parser (.xlsx, .xlsm, .xlsb)
  async parseExcel(file) {
    try {
      // Would use SheetJS (xlsx library) in production
      // For now, convert to CSV-like format and parse
      const text = await this.extractTextFromBinary(file);
      return await this.parseExtractedText(text, 'xlsx');
    } catch (error) {
      throw new Error(`Excel parsing failed: ${error.message}. Please export as CSV instead.`);
    }
  }

  // Legacy Excel parser (.xls)
  async parseExcelLegacy(file) {
    try {
      // Legacy binary format
      const text = await this.extractTextFromBinary(file);
      return await this.parseExtractedText(text, 'xls');
    } catch (error) {
      throw new Error(`Legacy Excel parsing failed: ${error.message}. Please export as CSV instead.`);
    }
  }

  // OpenDocument Spreadsheet parser
  async parseOpenSpreadsheet(file) {
    try {
      const text = await this.extractTextFromZip(file);
      return await this.parseExtractedText(text, 'ods');
    } catch (error) {
      throw new Error(`ODS parsing failed: ${error.message}. Please export as CSV instead.`);
    }
  }

  // Apple Numbers parser
  async parseAppleNumbers(file) {
    try {
      const text = await this.extractTextFromBinary(file);
      return await this.parseExtractedText(text, 'numbers');
    } catch (error) {
      throw new Error(`Numbers parsing failed: ${error.message}. Please export as CSV instead.`);
    }
  }

  // CSV file parser (wrapper)
  async parseCSVFile(file, options = {}) {
    try {
      const content = await this.readAsText(file);
      const { parseCSV } = await import('./csvParser.js');
      return await parseCSV(content, options);
    } catch (error) {
      throw new Error(`CSV parsing failed: ${error.message}`);
    }
  }

  // Plain text parser (wrapper)
  // Plain text parser
  async parsePlainText(file, options = {}) {
    try {
      const text = await file.text();
      
      // Try enhanced text parser first
      const { parseText } = await import('./textParser.js');
      const result = await parseText(text, options);
      
      // If enhanced parser fails, try simple parser
      if (!result || result.length === 0) {
        const { parseSimpleText } = await import('./simpleTextParser.js');
        const simpleResult = await parseSimpleText(text);
        const cardsWithSource = this.convertSimpleTextToCards(simpleResult);
        
        // Enrich card data if requested
        const { enrichData = false, showProgress = true } = options;
        if (enrichData) {
          return await processImportedCards(cardsWithSource, showProgress);
        }

        return cardsWithSource;
      }
      
      return result;
    } catch (error) {
      throw new Error(`TXT parsing failed: ${error.message}`);
    }
  }

  // Fallback parser for unknown formats
  async parseFallback(file) {
    try {
      // Try to read as text first
      const content = await this.readAsText(file);
      return await this.parseExtractedText(content, 'unknown');
    } catch (error) {
      throw new Error(`Unsupported file format. Please convert to CSV, TXT, or JSON format.`);
    }
  }

  // Helper methods for text extraction and formatting

  async readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file as text'));
      reader.readAsText(file);
    });
  }

  async extractTextFromBinary(file) {
    // Placeholder for binary text extraction
    // In production, would use appropriate libraries for each format
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        // Try to extract readable text from binary data
        const text = this.extractReadableText(arrayBuffer);
        resolve(text);
      };
      reader.onerror = () => reject(new Error('Failed to read binary file'));
      reader.readAsArrayBuffer(file);
    });
  }

  async extractTextFromZip(file) {
    // Placeholder for ZIP-based document extraction (ODT, etc.)
    // In production, would use JSZip or similar
    return await this.extractTextFromBinary(file);
  }

  extractReadableText(arrayBuffer) {
    // Basic text extraction from binary data
    const uint8Array = new Uint8Array(arrayBuffer);
    let text = '';
    
    for (let i = 0; i < uint8Array.length; i++) {
      const char = uint8Array[i];
      // Only include printable ASCII characters and common Unicode
      if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
        text += String.fromCharCode(char);
      }
    }
    
    return text;
  }

  stripRTFFormatting(rtfContent) {
    // Remove RTF control codes
    return rtfContent
      .replace(/\\[a-zA-Z]+\d*\s?/g, '') // Remove RTF commands
      .replace(/[{}]/g, '') // Remove braces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  stripMarkdownFormatting(mdContent) {
    // Remove Markdown syntax
    return mdContent
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/^[-*+]\s+/gm, '') // Remove list markers
      .trim();
  }

  stripHTMLTags(htmlContent) {
    // Remove HTML tags and decode entities
    return htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
      .replace(/<[^>]*>/g, '') // Remove all tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  stripXMLTags(xmlContent) {
    // Remove XML tags but preserve text content
    return xmlContent
      .replace(/<[^>]*>/g, '') // Remove all tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  stripLaTeXCommands(texContent) {
    // Remove LaTeX commands
    return texContent
      .replace(/\\[a-zA-Z]+(\[[^\]]*\])?(\{[^}]*\})?/g, '') // Remove commands
      .replace(/\$.*?\$/g, '') // Remove math mode
      .replace(/\{|\}/g, '') // Remove braces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  async parseExtractedText(text, sourceFormat, options = {}) {
    if (!text || !text.trim()) {
      throw new Error(`No text content extracted from ${sourceFormat.toUpperCase()} file`);
    }

    try {
      // Try enhanced text parser first
      const { parseText } = await import('./textParser.js');
      const result = await parseText(text, options);
      
      // Add source format information
      const cardsWithSource = result.map(card => ({
        ...card,
        source: `${sourceFormat}_import`,
        originalFormat: sourceFormat
      }));

      // Enrich card data if requested
      const { enrichData = false, showProgress = true } = options;
      if (enrichData) {
        return await processImportedCards(cardsWithSource, showProgress);
      }

      return cardsWithSource;
    } catch (error) {
      // Fallback to simple text parser
      try {
        const { parseSimpleText } = await import('./simpleTextParser.js');
        const simpleResult = await parseSimpleText(text);
        const cardsWithSource = this.convertSimpleTextToCards(simpleResult, sourceFormat);
        
        // Enrich card data if requested
        const { enrichData = false, showProgress = true } = options;
        if (enrichData) {
          return await processImportedCards(cardsWithSource, showProgress);
        }

        return cardsWithSource;
      } catch (fallbackError) {
        throw new Error(`Failed to parse extracted text: ${error.message}`);
      }
    }
  }

  convertSimpleTextToCards(simpleCards, sourceFormat = 'txt') {
    return simpleCards.map(card => ({
      ...card,
      source: `${sourceFormat}_import`,
      originalFormat: sourceFormat
    }));
  }

  async convertDekToCards(dekResult) {
    const { convertDekToCollection } = await import('./dekParser.js');
    return convertDekToCollection(dekResult);
  }

  // Format detection helper
  static getSupportedFormats() {
    return {
      wordProcessor: ['.docx', '.doc', '.odt', '.pages'],
      text: ['.txt', '.rtf', '.md'],
      layout: ['.pdf', '.html', '.htm', '.xml', '.tex'],
      spreadsheet: ['.xlsx', '.xlsm', '.xlsb', '.xls', '.csv', '.ods', '.numbers'],
      other: ['.json', '.dek']
    };
  }

  static isFormatSupported(filename) {
    const formats = DocumentParser.getSupportedFormats();
    const ext = '.' + filename.split('.').pop().toLowerCase();
    
    return Object.values(formats).some(category => 
      category.includes(ext)
    );
  }
}

// Export default instance
export const documentParser = new DocumentParser();

// Export individual functions for compatibility
export async function parseDocument(file) {
  return await documentParser.parseDocument(file);
}

export function getSupportedFormats() {
  return DocumentParser.getSupportedFormats();
}

export function isFormatSupported(filename) {
  return DocumentParser.isFormatSupported(filename);
}