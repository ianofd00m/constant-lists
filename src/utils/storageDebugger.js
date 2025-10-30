/**
 * Storage Debug Utility
 * Provides debugging and monitoring tools for the smart storage system
 */

import { storageManager } from './storageManager';

export class StorageDebugger {
  constructor() {
    this.enabled = localStorage.getItem('storage-debug') === 'true';
  }

  enable() {
    this.enabled = true;
    localStorage.setItem('storage-debug', 'true');
    console.log('📊 Storage debugging enabled');
  }

  disable() {
    this.enabled = false;
    localStorage.removeItem('storage-debug');
    console.log('📊 Storage debugging disabled');
  }

  log(message, data = null) {
    if (this.enabled) {
      console.log(`[StorageDebug] ${message}`, data || '');
    }
  }

  /**
   * Display comprehensive storage analysis
   */
  analyzeStorage() {
    console.log('\n📊 === STORAGE ANALYSIS ===');
    
    const stats = storageManager.getStats();
    console.log('💾 Overall Storage:', {
      used: `${(stats.used / 1024 / 1024).toFixed(2)}MB`,
      available: `${(stats.available / 1024 / 1024).toFixed(2)}MB`,
      percentage: `${stats.percentage.toFixed(1)}%`,
      items: stats.itemCounts
    });

    // Analyze individual items
    const items = [];
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage[key];
        const size = (value.length + key.length) * 2; // UTF-16
        
        items.push({
          key,
          size,
          sizeKB: (size / 1024).toFixed(1),
          sizeMB: (size / 1024 / 1024).toFixed(3),
          preview: value.substring(0, 100)
        });
      }
    }

    // Sort by size
    items.sort((a, b) => b.size - a.size);

    console.log('\n📋 Largest Storage Items:');
    items.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. ${item.key}: ${item.sizeMB}MB`);
    });

    // Check for collections
    const collectionItems = items.filter(item => 
      item.key.includes('collection') || 
      item.key.includes('Collection') ||
      item.key.includes('cardCollection')
    );

    if (collectionItems.length > 0) {
      console.log('\n📚 Collection Items:');
      collectionItems.forEach(item => {
        console.log(`- ${item.key}: ${item.sizeMB}MB`);
        
        try {
          const data = JSON.parse(item.preview);
          if (Array.isArray(data)) {
            console.log(`  └─ Array with ${data.length} items`);
          } else if (data.chunked) {
            console.log(`  └─ Chunked data: ${data.totalItems} items in ${data.totalChunks} chunks`);
          }
        } catch (e) {
          console.log(`  └─ Could not parse preview`);
        }
      });
    }

    // Check for OTAG data
    const otagItems = items.filter(item => 
      item.key.includes('otag') || 
      item.key.includes('oracle') ||
      item.key.includes('production-otag')
    );

    if (otagItems.length > 0) {
      console.log('\n🏷️ Oracle Tag Items:');
      otagItems.forEach(item => {
        console.log(`- ${item.key}: ${item.sizeMB}MB`);
      });
    }

    return {
      stats,
      items,
      collectionItems,
      otagItems
    };
  }

  /**
   * Test storage limits
   */
  testStorageLimits() {
    console.log('\n🧪 === STORAGE LIMIT TEST ===');
    
    const testKey = 'storage-test-' + Date.now();
    let testSize = 1024; // Start with 1KB
    let maxSize = 0;

    try {
      while (testSize < 50 * 1024 * 1024) { // Test up to 50MB
        const testData = 'x'.repeat(testSize);
        
        try {
          localStorage.setItem(testKey, testData);
          localStorage.removeItem(testKey);
          maxSize = testSize;
          testSize *= 2; // Double the size
        } catch (error) {
          console.log(`❌ Failed at ${(testSize / 1024 / 1024).toFixed(2)}MB: ${error.message}`);
          break;
        }
      }

      console.log(`✅ Maximum test size: ${(maxSize / 1024 / 1024).toFixed(2)}MB`);
      
    } catch (error) {
      console.error('❌ Storage test failed:', error.message);
    }

    return maxSize;
  }

  /**
   * Simulate collection import to test storage
   */
  simulateCollectionImport(size = 1000) {
    console.log(`\n📤 === SIMULATING IMPORT OF ${size} CARDS ===`);
    
    const mockCollection = [];
    for (let i = 0; i < size; i++) {
      mockCollection.push({
        id: `test-card-${i}`,
        name: `Test Card ${i}`,
        set: 'TST',
        quantity: Math.floor(Math.random() * 4) + 1,
        foil: Math.random() > 0.8,
        condition: 'NM',
        printing_id: `print-${i}`,
        collector_number: String(i),
        dateAdded: new Date().toISOString()
      });
    }

    const testKey = 'test-collection-' + Date.now();
    
    try {
      const startTime = performance.now();
      const success = storageManager.setItem(testKey, mockCollection, {
        clearOldData: true
      });
      const endTime = performance.now();

      if (success) {
        const stats = storageManager.getStats();
        console.log(`✅ Successfully stored ${size} cards in ${(endTime - startTime).toFixed(2)}ms`);
        console.log(`📊 Storage now at ${stats.percentage.toFixed(1)}%`);
        
        // Clean up
        localStorage.removeItem(testKey);
      } else {
        console.log(`❌ Failed to store ${size} cards`);
      }

      return success;
      
    } catch (error) {
      console.error('❌ Simulation failed:', error.message);
      return false;
    }
  }

  /**
   * Monitor storage changes in real-time
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    console.log('🔍 Starting storage monitoring...');
    
    let lastStats = storageManager.getStats();
    
    this.monitoringInterval = setInterval(() => {
      const currentStats = storageManager.getStats();
      
      if (Math.abs(currentStats.percentage - lastStats.percentage) > 1) {
        console.log(`📊 Storage change detected: ${currentStats.percentage.toFixed(1)}% (${currentStats.percentage > lastStats.percentage ? '↑' : '↓'}${Math.abs(currentStats.percentage - lastStats.percentage).toFixed(1)}%)`);
        lastStats = currentStats;
      }
    }, 1000);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🔍 Storage monitoring stopped');
    }
  }

  /**
   * Export storage analysis to downloadable file
   */
  exportAnalysis() {
    const analysis = this.analyzeStorage();
    const report = {
      timestamp: new Date().toISOString(),
      stats: analysis.stats,
      largestItems: analysis.items.slice(0, 20),
      collectionItems: analysis.collectionItems,
      otagItems: analysis.otagItems,
      recommendations: this.generateRecommendations(analysis)
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `storage-analysis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('📁 Storage analysis exported');
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.stats.percentage > 80) {
      recommendations.push('Storage is over 80% full - consider clearing old data');
    }
    
    if (analysis.otagItems.some(item => item.size > 5 * 1024 * 1024)) {
      recommendations.push('Large OTAG cache detected - this may be compressed or cleared');
    }
    
    if (analysis.collectionItems.length > 1) {
      recommendations.push('Multiple collection items found - consolidation may be needed');
    }

    return recommendations;
  }
}

// Create singleton instance
export const storageDebugger = new StorageDebugger();

// Global debugging functions
if (typeof window !== 'undefined') {
  window.analyzeStorage = () => storageDebugger.analyzeStorage();
  window.testStorageLimits = () => storageDebugger.testStorageLimits();
  window.simulateImport = (size) => storageDebugger.simulateCollectionImport(size);
  window.enableStorageDebug = () => storageDebugger.enable();
  window.disableStorageDebug = () => storageDebugger.disable();
  window.exportStorageAnalysis = () => storageDebugger.exportAnalysis();
  
  console.log('🔧 Storage debugging functions available:');
  console.log('  - analyzeStorage() - Show detailed storage analysis');
  console.log('  - testStorageLimits() - Test maximum storage capacity');
  console.log('  - simulateImport(size) - Test importing N cards');
  console.log('  - enableStorageDebug() - Enable detailed logging');
  console.log('  - exportStorageAnalysis() - Export analysis to file');
}