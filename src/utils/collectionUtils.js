/**
 * Collection Item Utilities
 * Handles conversion between bundled and individual collection items
 */

// Convert bundled collection items (quantity > 1) to individual items
export function convertToIndividualItems(collection) {
  const individualItems = [];
  
  collection.forEach(item => {
    const quantity = item.quantity || 1;
    
    // Create individual items for each copy
    for (let i = 0; i < quantity; i++) {
      individualItems.push({
        ...item,
        id: `${item.id || generateId(item)}_copy_${i + 1}`,
        quantity: 1, // Each item represents exactly 1 card
        copyNumber: i + 1,
        originalId: item.id,
        purchase_price: item.purchase_price || null,
        dateAdded: item.dateAdded || new Date().toISOString(),
        // Individual properties that can vary per copy
        condition: item.condition || 'NM',
        language: item.language || 'EN',
        foil: item.foil || false
      });
    }
  });
  
  return individualItems;
}

// Convert individual items back to bundled format (for exports/compatibility)
export function convertToBundledItems(individualItems) {
  const bundledMap = new Map();
  
  individualItems.forEach(item => {
    // Create a key that groups identical cards (name, set, printing_id, foil, condition, language)
    const groupKey = [
      item.name,
      item.set,
      item.printing_id || '',
      item.foil ? 'foil' : 'nonfoil',
      item.condition || 'NM',
      item.language || 'EN'
    ].join('|');
    
    if (!bundledMap.has(groupKey)) {
      bundledMap.set(groupKey, {
        ...item,
        quantity: 0,
        individual_items: []
      });
    }
    
    const bundled = bundledMap.get(groupKey);
    bundled.quantity += 1;
    bundled.individual_items.push(item);
    
    // Use the most recent date added
    if (item.dateAdded && (!bundled.dateAdded || new Date(item.dateAdded) > new Date(bundled.dateAdded))) {
      bundled.dateAdded = item.dateAdded;
    }
  });
  
  return Array.from(bundledMap.values());
}

// Generate a unique ID for a card item
export function generateId(item) {
  const parts = [
    item.name?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'unknown',
    item.set || 'unknown',
    item.printing_id || 'unknown',
    item.foil ? 'foil' : 'nonfoil'
  ];
  return parts.join('-') + '-' + Date.now() + '-' + Math.random().toString(36).substring(7);
}

// Check if collection needs migration from bundled to individual format
export function needsMigration(collection) {
  if (!Array.isArray(collection) || collection.length === 0) {
    return false;
  }
  
  // Check if any items have quantity > 1 (indicates bundled format)
  return collection.some(item => (item.quantity || 1) > 1);
}

// Migrate collection from bundled to individual format
export function migrateCollection(collection) {
  console.log('📦 Migrating collection from bundled to individual format...');
  console.log(`Before: ${collection.length} bundled items, ${collection.reduce((sum, item) => sum + (item.quantity || 1), 0)} total cards`);
  
  const migrated = convertToIndividualItems(collection);
  
  console.log(`After: ${migrated.length} individual items`);
  console.log('✅ Migration complete');
  
  return migrated;
}

// Get statistics about a collection
export function getCollectionStats(collection) {
  const stats = {
    totalItems: collection.length,
    totalCards: collection.reduce((sum, item) => sum + (item.quantity || 1), 0),
    uniqueCards: new Set(collection.map(item => `${item.name}|${item.set}`)).size,
    foilCards: collection.filter(item => item.foil).length,
    sets: new Set(collection.map(item => item.set).filter(Boolean)).size,
    conditions: new Set(collection.map(item => item.condition || 'NM')).size,
    languages: new Set(collection.map(item => item.language || 'EN')).size,
    withPurchasePrice: collection.filter(item => item.purchase_price && parseFloat(item.purchase_price) > 0).length,
    averageCondition: getMostCommonCondition(collection),
    oldestCard: getOldestCard(collection),
    newestCard: getNewestCard(collection)
  };
  
  return stats;
}

function getMostCommonCondition(collection) {
  const conditionCounts = {};
  collection.forEach(item => {
    const condition = item.condition || 'NM';
    conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
  });
  
  return Object.entries(conditionCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'NM';
}

function getOldestCard(collection) {
  return collection
    .filter(item => item.dateAdded)
    .sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded))[0];
}

function getNewestCard(collection) {
  return collection
    .filter(item => item.dateAdded)
    .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))[0];
}