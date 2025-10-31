/**
 * Smart Storage Management System
 * Handles localStorage quota limits and provides fallback mechanisms for large data
 */

// Storage utilities
export class StorageManager {
  constructor() {
    this.maxStorageSize = 10 * 1024 * 1024; // 10MB typical localStorage limit
    this.compressionThreshold = 100 * 1024; // 100KB - compress larger data
  }

  /**
   * Get available storage space
   */
  getAvailableSpace() {
    try {
      const testKey = 'storage-test-' + Date.now();
      const testData = 'x'.repeat(1024); // 1KB test
      let used = 0;
      
      // Calculate current usage
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += (localStorage[key].length + key.length) * 2; // UTF-16 encoding
        }
      }
      
      return {
        used,
        available: this.maxStorageSize - used,
        total: this.maxStorageSize,
        percentage: (used / this.maxStorageSize) * 100
      };
    } catch (error) {
      return {
        used: 0,
        available: 0,
        total: this.maxStorageSize,
        percentage: 100,
        error: error.message
      };
    }
  }

  /**
   * Check if data can fit in available space
   */
  canStore(data, key = '') {
    const dataSize = (JSON.stringify(data).length + key.length) * 2;
    const { available } = this.getAvailableSpace();
    return dataSize < available;
  }

  /**
   * Compress large data using simple JSON compression
   */
  compressData(data) {
    try {
      const jsonString = JSON.stringify(data);
      
      if (jsonString.length < this.compressionThreshold) {
        return { data: jsonString, compressed: false };
      }

      // Simple compression: remove unnecessary whitespace and compress repeated patterns
      const compressed = jsonString
        .replace(/\s+/g, ' ')
        .replace(/,\s*"/g, ',"')
        .replace(/:\s*"/g, ':"')
        .replace(/\[\s*"/g, '["')
        .replace(/"\s*\]/g, '"]');

      return {
        data: compressed,
        compressed: true,
        originalSize: jsonString.length,
        compressedSize: compressed.length,
        savings: jsonString.length - compressed.length
      };
    } catch (error) {
      console.error('Compression failed:', error);
      return { data: JSON.stringify(data), compressed: false };
    }
  }

  /**
   * Decompress data if it was compressed
   */
  decompressData(compressedResult) {
    try {
      if (!compressedResult.compressed) {
        return JSON.parse(compressedResult.data);
      }
      
      return JSON.parse(compressedResult.data);
    } catch (error) {
      console.error('Decompression failed:', error);
      return null;
    }
  }

  /**
   * Smart storage with quota management
   */
  setItem(key, data, options = {}) {
    try {
      const { forceStore = false, clearOldData = true } = options;
      
      // Check current storage usage
      const storageInfo = this.getAvailableSpace();
      console.log(`📊 Storage usage: ${storageInfo.percentage.toFixed(1)}% (${(storageInfo.used / 1024 / 1024).toFixed(1)}MB used)`);

      // Compress data if it's large
      const compressed = this.compressData(data);
      const dataSize = (compressed.data.length + key.length) * 2;

      console.log(`💾 Storing ${key}: ${(dataSize / 1024).toFixed(1)}KB ${compressed.compressed ? '(compressed)' : ''}`);

      // Check if we have space
      if (!this.canStore(compressed.data, key)) {
        if (clearOldData) {
          console.log('⚠️ Storage full, attempting to clear old data...');
          this.clearOldData();
          
          // Check again after cleanup
          if (!this.canStore(compressed.data, key)) {
            throw new Error('Storage quota exceeded even after cleanup');
          }
        } else if (!forceStore) {
          throw new Error('Storage quota would be exceeded');
        }
      }

      // Store the data with metadata
      const storeData = {
        ...compressed,
        timestamp: Date.now(),
        key,
        version: '1.0'
      };

      localStorage.setItem(key, JSON.stringify(storeData));
      
      if (compressed.compressed) {
        console.log(`✅ Stored ${key} with ${((compressed.savings / 1024).toFixed(1))}KB savings from compression`);
      } else {
        console.log(`✅ Stored ${key} successfully`);
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to store ${key}:`, error.message);
      
      if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
        this.handleQuotaExceeded(key, data, options);
      }
      
      return false;
    }
  }

  /**
   * Smart retrieval with decompression and collection optimization
   */
  getItem(key) {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const storeData = JSON.parse(stored);
      
      // Handle old format data (direct JSON)
      if (!storeData.hasOwnProperty('compressed')) {
        return storeData;
      }

      // Handle collection-optimized data (v2.0+)
      if (storeData.collectionOptimized && storeData.version === '2.0') {
        return this.decompressCollectionData(storeData);
      }

      // Handle regular compression
      return this.decompressData(storeData);
    } catch (error) {
      console.error(`❌ Failed to retrieve ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Special compression for collection data with field abbreviation
   */
  compressCollectionData(collections) {
    const fieldMap = {
      'name': 'n',
      'quantity': 'q', 
      'tags': 't',
      'set': 's',
      'collector_number': 'cn',
      'rarity': 'r',
      'prices': 'p',
      'image_uris': 'i',
      'color_identity': 'ci',
      'mana_cost': 'mc',
      'type_line': 'tl',
      'oracle_text': 'ot',
      'power': 'pw',
      'toughness': 'to',
      'cmc': 'c',
      'legalities': 'l',
      'card_faces': 'cf',
      'layout': 'ly'
    };

    const compressed = JSON.parse(JSON.stringify(collections));
    let cardCount = 0;
    
    // Compress collection fields and count cards
    Object.keys(compressed).forEach(collectionId => {
      const collection = compressed[collectionId];
      if (collection.cards && Array.isArray(collection.cards)) {
        cardCount += collection.cards.length;
        collection.cards = collection.cards.map(card => {
          const compressedCard = {};
          Object.keys(card).forEach(key => {
            const shortKey = fieldMap[key] || key;
            // Only store essential data for very large collections
            if (cardCount > 5000 && ['oracle_text', 'legalities', 'card_faces'].includes(key)) {
              return; // Skip large optional fields for massive collections
            }
            compressedCard[shortKey] = card[key];
          });
          return compressedCard;
        });
      }
    });

    const originalSize = JSON.stringify(collections).length;
    const compressedSize = JSON.stringify(compressed).length;

    return {
      data: compressed,
      compressed: true,
      collectionOptimized: true,
      version: '2.0',
      fieldMap,
      cardCount,
      originalSize,
      compressedSize,
      compressionRatio: Math.round((1 - compressedSize / originalSize) * 100)
    };
  }

  /**
   * Decompress collection-optimized data
   */
  decompressCollectionData(storeData) {
    const { data, fieldMap } = storeData;
    const reverseMap = {};
    
    // Create reverse field mapping
    Object.keys(fieldMap).forEach(originalKey => {
      reverseMap[fieldMap[originalKey]] = originalKey;
    });

    const decompressed = JSON.parse(JSON.stringify(data));
    
    // Decompress collection fields
    Object.keys(decompressed).forEach(collectionId => {
      const collection = decompressed[collectionId];
      if (collection.cards && Array.isArray(collection.cards)) {
        collection.cards = collection.cards.map(card => {
          const decompressedCard = {};
          Object.keys(card).forEach(shortKey => {
            const originalKey = reverseMap[shortKey] || shortKey;
            decompressedCard[originalKey] = card[shortKey];
          });
          return decompressedCard;
        });
      }
    });

    return decompressed;
  }

  /**
   * Handle quota exceeded errors with progressive fallback strategies
   */
  handleQuotaExceeded(key, data, options = {}) {
    console.log('🚨 Storage quota exceeded, implementing emergency measures...');
    
    try {
      // Strategy 1: Clear old cache and temporary data
      const clearedBytes = this.clearOldData(['production-otag-data', 'cache-', 'temp-', 'old-']);
      console.log(`🗑️ Cleared ${clearedBytes} old items, freed ${(clearedBytes / 1024).toFixed(1)}KB`);
      
      // Strategy 2: Try advanced compression for collections
      if (key === 'cardCollection' && Array.isArray(data)) {
        console.log('💡 Attempting advanced collection compression...');
        const compressed = this.compressCollectionData(data);
        
        if (this.canStore(compressed.data, key)) {
          const storeData = {
            ...compressed,
            timestamp: Date.now(),
            key,
            version: '2.0' // Mark as using advanced compression
          };
          
          localStorage.setItem(key, JSON.stringify(storeData));
          console.log(`✅ Stored collection with ${(compressed.savings / 1024).toFixed(1)}KB savings (${compressed.count} cards)`);
          return true;
        }
      }
      
      // Strategy 3: Try regular maximum compression
      const maxCompressed = this.compressData(data);
      if (this.canStore(maxCompressed.data, key)) {
        console.log('💡 Attempting storage with maximum compression...');
        return this.setItem(key, data, { ...options, forceStore: true, clearOldData: false });
      }

      // Strategy 3: Store only essential data for collections
      if (key === 'cardCollection' && Array.isArray(data)) {
        console.log('💡 Attempting to store essential collection data only...');
        const essentialData = this.extractEssentialCollectionData(data);
        return this.setItem(key, essentialData, { ...options, forceStore: true, clearOldData: false });
      }

      // Strategy 4: Use chunked storage for very large collections
      if (key === 'cardCollections' && typeof data === 'object' && data !== null) {
        console.log('💡 Using chunked storage for large collection...');
        return this.setItemChunked(key, data);
      }

      throw new Error('All storage strategies failed');
      
    } catch (fallbackError) {
      console.error('❌ All storage fallback strategies failed:', fallbackError.message);
      
      // Final fallback: show user error with guidance
      this.showStorageFullError(key, data);
      return false;
    }
  }

  /**
   * Advanced chunked storage for extremely large collections
   */
  async setItemChunked(key, data, chunkSize = 1000000) { // 1MB chunks
    try {
      const jsonString = JSON.stringify(data);
      const totalSize = jsonString.length;
      
      if (totalSize <= chunkSize) {
        // Small enough to store normally
        return this.setItem(key, data);
      }

      console.log(`📦 Chunking large data: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      
      // Store chunk metadata
      const chunkCount = Math.ceil(totalSize / chunkSize);
      const metadata = {
        isChunked: true,
        chunkCount,
        totalSize,
        timestamp: Date.now()
      };
      
      localStorage.setItem(`${key}_metadata`, JSON.stringify(metadata));
      
      // Store chunks
      for (let i = 0; i < chunkCount; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, totalSize);
        const chunk = jsonString.slice(start, end);
        
        try {
          localStorage.setItem(`${key}_chunk_${i}`, chunk);
        } catch (error) {
          // Clean up partial chunks on failure
          for (let j = 0; j < i; j++) {
            localStorage.removeItem(`${key}_chunk_${j}`);
          }
          localStorage.removeItem(`${key}_metadata`);
          throw new Error(`Failed to store chunk ${i}: ${error.message}`);
        }
      }
      
      console.log(`✅ Stored ${chunkCount} chunks successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Chunked storage failed for ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Retrieve chunked data
   */
  async getItemChunked(key) {
    try {
      const metadataStr = localStorage.getItem(`${key}_metadata`);
      if (!metadataStr) {
        // Try regular retrieval
        return this.getItem(key);
      }

      const metadata = JSON.parse(metadataStr);
      if (!metadata.isChunked) {
        return this.getItem(key);
      }

      console.log(`📦 Retrieving ${metadata.chunkCount} chunks...`);
      
      let reconstructed = '';
      for (let i = 0; i < metadata.chunkCount; i++) {
        const chunk = localStorage.getItem(`${key}_chunk_${i}`);
        if (chunk === null) {
          throw new Error(`Missing chunk ${i} of ${metadata.chunkCount}`);
        }
        reconstructed += chunk;
      }
      
      const data = JSON.parse(reconstructed);
      console.log(`✅ Retrieved ${(reconstructed.length / 1024 / 1024).toFixed(2)}MB from chunks`);
      
      return data;
    } catch (error) {
      console.error(`❌ Failed to retrieve chunked data for ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Extract only essential data from collections to reduce size
   */
  extractEssentialCollectionData(collection) {
    return collection.map(card => ({
      name: card.name,
      quantity: card.quantity || 1,
      set: card.set,
      foil: card.foil || false,
      condition: card.condition || 'NM',
      // Keep only essential fields, remove large metadata
    }));
  }

  /**
   * Store large collections in chunks
   */
  storeInChunks(key, data) {
    try {
      const chunkSize = 500; // Cards per chunk
      const chunks = [];
      
      for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize));
      }

      // Store chunk metadata
      const metadata = {
        totalChunks: chunks.length,
        totalItems: data.length,
        timestamp: Date.now(),
        chunked: true
      };

      localStorage.setItem(`${key}_meta`, JSON.stringify(metadata));

      // Store each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunkKey = `${key}_chunk_${i}`;
        if (!this.setItem(chunkKey, chunks[i], { clearOldData: false })) {
          throw new Error(`Failed to store chunk ${i}`);
        }
      }

      console.log(`✅ Stored ${data.length} items in ${chunks.length} chunks`);
      return true;
    } catch (error) {
      console.error('❌ Chunked storage failed:', error.message);
      return false;
    }
  }

  /**
   * Retrieve chunked data
   */
  getChunkedItem(key) {
    try {
      const metadata = JSON.parse(localStorage.getItem(`${key}_meta`) || '{}');
      
      if (!metadata.chunked) {
        return this.getItem(key);
      }

      const data = [];
      for (let i = 0; i < metadata.totalChunks; i++) {
        const chunkKey = `${key}_chunk_${i}`;
        const chunk = this.getItem(chunkKey);
        if (chunk) {
          data.push(...chunk);
        }
      }

      console.log(`📦 Reconstructed ${data.length} items from ${metadata.totalChunks} chunks`);
      return data;
    } catch (error) {
      console.error('❌ Failed to retrieve chunked data:', error.message);
      return null;
    }
  }

  /**
   * Clear old cached data to free up space
   */
  clearOldData(prefixes = ['cache-', 'temp-', 'old-']) {
    let cleared = 0;
    const keysToRemove = [];

    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        // Remove items with specified prefixes
        if (prefixes.some(prefix => key.startsWith(prefix))) {
          keysToRemove.push(key);
        }
        
        // Remove items older than 7 days
        try {
          const item = JSON.parse(localStorage[key]);
          if (item.timestamp && Date.now() - item.timestamp > 7 * 24 * 60 * 60 * 1000) {
            keysToRemove.push(key);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }

    keysToRemove.forEach(key => {
      const size = localStorage[key].length * 2;
      localStorage.removeItem(key);
      cleared += size;
    });

    console.log(`🗑️ Cleared ${keysToRemove.length} old items, freed ${(cleared / 1024).toFixed(1)}KB`);
    return cleared;
  }

  /**
   * Show user-friendly error when storage is full
   */
  showStorageFullError(key, data) {
    const message = `Storage is full! Unable to save ${key}.\n\nOptions:\n1. Clear browser data\n2. Export collection to file\n3. Use smaller collection`;
    
    if (typeof window !== 'undefined' && window.alert) {
      alert(message);
    } else {
      console.error('💾 Storage Full:', message);
    }
  }

  /**
   * Get storage statistics
   */
  getStats() {
    const stats = this.getAvailableSpace();
    
    let collections = 0;
    let cacheItems = 0;
    let otherItems = 0;

    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        if (key.includes('Collection') || key.includes('collection')) {
          collections++;
        } else if (key.includes('cache') || key.includes('otag')) {
          cacheItems++;
        } else {
          otherItems++;
        }
      }
    }

    return {
      ...stats,
      itemCounts: {
        collections,
        cacheItems,
        otherItems,
        total: collections + cacheItems + otherItems
      }
    };
  }
}

// Create singleton instance
export const storageManager = new StorageManager();

// Convenience functions for backward compatibility
export const smartSetItem = (key, data, options) => storageManager.setItem(key, data, options);
export const smartGetItem = (key) => storageManager.getItem(key);
export const getStorageStats = () => storageManager.getStats();