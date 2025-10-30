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
   * Smart retrieval with decompression
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

      // Handle new format with compression
      return this.decompressData(storeData);
    } catch (error) {
      console.error(`❌ Failed to retrieve ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Handle quota exceeded errors
   */
  handleQuotaExceeded(key, data, options = {}) {
    console.log('🚨 Storage quota exceeded, implementing emergency measures...');
    
    try {
      // Strategy 1: Clear old cache data
      this.clearOldData(['production-otag-data', 'cache-', 'temp-']);
      
      // Strategy 2: Try storing with maximum compression
      const maxCompressed = this.compressData(data);
      if (this.canStore(maxCompressed.data, key)) {
        console.log('💡 Attempting storage after cleanup...');
        return this.setItem(key, data, { ...options, forceStore: true, clearOldData: false });
      }

      // Strategy 3: Store only essential data for collections
      if (key === 'cardCollection' && Array.isArray(data)) {
        console.log('💡 Attempting to store essential collection data only...');
        const essentialData = this.extractEssentialCollectionData(data);
        return this.setItem(key, essentialData, { ...options, forceStore: true, clearOldData: false });
      }

      // Strategy 4: Use chunked storage for very large collections
      if (key === 'cardCollection' && Array.isArray(data) && data.length > 1000) {
        console.log('💡 Using chunked storage for large collection...');
        return this.storeInChunks(key, data);
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