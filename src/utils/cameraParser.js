// Camera Parser - Uses OCR to extract text from camera images
// Utilizes Tesseract.js for client-side OCR processing

// Note: This requires installing tesseract.js
// npm install tesseract.js

let Tesseract;

// Lazy load Tesseract.js to avoid bundling issues
async function loadTesseract() {
  if (!Tesseract) {
    try {
      // Try to import Tesseract.js
      const tesseractModule = await import('tesseract.js');
      Tesseract = tesseractModule.default || tesseractModule;
    } catch (error) {
      console.warn('Tesseract.js not available, falling back to simple text extraction');
      return null;
    }
  }
  return Tesseract;
}

export async function parseCameraText(imageBlob) {
  if (!imageBlob) {
    throw new Error('No image provided');
  }

  try {
    // Load Tesseract.js if available
    const tesseract = await loadTesseract();
    
    if (tesseract) {
      // Use Tesseract.js for OCR
      const result = await performOCR(imageBlob, tesseract);
      return result;
    } else {
      // Fallback: Return empty text if OCR not available
      throw new Error('OCR library not available. Please install tesseract.js or use manual text input.');
    }
  } catch (error) {
    console.error('OCR processing failed:', error);
    throw new Error(`Camera text extraction failed: ${error.message}`);
  }
}

async function performOCR(imageBlob, tesseract) {
  try {
    // Configure Tesseract for better text recognition
    const { data: { text } } = await tesseract.recognize(imageBlob, 'eng', {
      logger: m => {
        // Optional: Add progress logging
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    if (!text || text.trim().length === 0) {
      throw new Error('No text detected in image');
    }

    return preprocessOCRText(text);
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    throw new Error(`OCR processing failed: ${error.message}`);
  }
}

function preprocessOCRText(rawText) {
  if (!rawText) return '';

  // Clean up common OCR artifacts and errors
  let cleanedText = rawText
    // Fix common OCR character misreads
    .replace(/[|1Il]/g, '1') // Fix pipe/l/I/1 confusion for quantities
    .replace(/[0oO]/g, 'o') // Normalize o/O/0 in card names
    .replace(/rn/g, 'm') // Fix rn->m confusion
    .replace(/[`']/g, "'") // Normalize apostrophes
    .replace(/["]/g, '"') // Normalize quotes
    
    // Remove extra whitespace and normalize line breaks
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  // Split into lines and clean each line
  const lines = cleanedText.split('\n').map(line => {
    return line
      .trim()
      // Remove artifacts that commonly appear in OCR
      .replace(/^[^\w\d]*/, '') // Remove leading non-alphanumeric chars
      .replace(/[^\w\d\s\(\)\[\]\-\.,'"]*$/, '') // Remove trailing artifacts
      .trim();
  }).filter(line => {
    // Filter out likely garbage lines
    return line.length > 0 && 
           line.length < 200 && // Remove overly long lines
           /[a-zA-Z]/.test(line) && // Must contain at least one letter
           !/^[^\w\s]+$/.test(line); // Not just symbols
  });

  return lines.join('\n');
}

// Enhanced preprocessing for Magic card-specific OCR cleanup
export function enhanceMTGCardOCR(ocrText) {
  if (!ocrText) return '';

  let enhanced = ocrText;

  // Common Magic card name corrections
  const cardNameFixes = {
    'Lightning Eolt': 'Lightning Bolt',
    'Eird of Paradise': 'Bird of Paradise',
    'Elack Lotus': 'Black Lotus',
    'Erainstorm': 'Brainstorm',
    'Eounterspell': 'Counterspell',
    'Eurn': 'Burn',
    'Sord of': 'Sword of',
    'Jace, the Mind Sculptor': 'Jace, the Mind Sculptor',
    'Tarmogoyf': 'Tarmogoyf'
  };

  // Apply card name fixes
  for (const [incorrect, correct] of Object.entries(cardNameFixes)) {
    enhanced = enhanced.replace(new RegExp(incorrect, 'gi'), correct);
  }

  // Fix common set code misreads
  const setCodeFixes = {
    'LEA': 'LEA', 'LEB': 'LEB', 'UNL': 'UNL', '2ED': '2ED', '3ED': '3ED',
    'ICE': 'ICE', 'TMP': 'TMP', 'USG': 'USG', 'MMQ': 'MMQ', 'INV': 'INV'
  };

  // Look for potential set codes and fix them
  enhanced = enhanced.replace(/\b([A-Z0-9]{2,4})\b/g, (match) => {
    const upper = match.toUpperCase();
    return setCodeFixes[upper] || match;
  });

  // Fix quantity patterns
  enhanced = enhanced.replace(/(\d+)\s*[x×X]\s*/g, '$1x ');

  // Clean up foil indicators
  enhanced = enhanced.replace(/\b(foil|FOIL|Foil)\b/g, 'foil');

  return enhanced;
}

// Alternative: Simple image-to-canvas text extraction (no OCR)
export async function extractImageMetadata(imageBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // This is a placeholder - actual OCR would need a library
      // For now, return empty text and let user input manually
      resolve('');
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(imageBlob);
  });
}

// Utility function to check if OCR is available
export function isOCRAvailable() {
  return new Promise(async (resolve) => {
    try {
      const tesseract = await loadTesseract();
      resolve(!!tesseract);
    } catch {
      resolve(false);
    }
  });
}

// Progressive enhancement: Start with basic camera, add OCR if available
export async function initializeCameraFeatures() {
  const features = {
    camera: false,
    ocr: false
  };

  // Check camera availability
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      features.camera = true;
    }
  } catch (error) {
    console.warn('Camera not available:', error);
  }

  // Check OCR availability
  try {
    features.ocr = await isOCRAvailable();
  } catch (error) {
    console.warn('OCR not available:', error);
  }

  return features;
}