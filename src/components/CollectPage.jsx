import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ImportModal from './ImportModal';
import CollectionImportProgress from './CollectionImportProgress';
import { storageManager } from '../utils/storageManager';
import { enrichCardsBatch } from '../utils/cardDataEnrichment';
import EnhancedCollectionTable from './EnhancedCollectionTable';
import { 
  convertToIndividualItems, 
  needsMigration, 
  migrateCollection,
  getCollectionStats 
} from '../utils/collectionUtils';

// Force cache refresh - no yellow backgrounds

function CollectionSummary({ collection }) {
  const totalCards = collection.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueCards = collection.length;
  const foilCards = collection.filter(item => item.foil).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div style={{ 
      marginBottom: 24, 
      padding: 16, 
      border: '1px solid #ddd', 
      borderRadius: 8,
      backgroundColor: '#ffffff'
    }}>
      <h3 style={{ marginTop: 0 }}>Collection Summary</h3>
      <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
        <div><strong>Total Cards:</strong> {totalCards}</div>
        <div><strong>Unique Cards:</strong> {uniqueCards}</div>
        <div><strong>Foil Cards:</strong> {foilCards}</div>
      </div>
    </div>
  );
}

function CollectionCard({ item, onQuantityChange, onRemove }) {
  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) {
      onRemove(item.id);
    } else {
      onQuantityChange(item.id, newQuantity);
    }
  };

  const getSetIconUrl = (setCode) => {
    if (!setCode) return null;
    return `/svgs/${setCode.toLowerCase()}.svg`;
  };

  return (
    <tr style={{
      borderBottom: '1px solid #eee',
      backgroundColor: '#fff'
    }}>
      {/* Quantity */}
      <td style={{
        padding: '2px 8px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '14px',
        width: '70px',
        verticalAlign: 'middle'
      }}>
        {item.quantity}
      </td>

      {/* Card Name */}
      <td style={{
        padding: '2px 8px',
        fontWeight: '500',
        fontSize: '14px',
        color: '#333',
        verticalAlign: 'middle'
      }}>
        {item.name}
      </td>

      {/* Set Icon */}
      <td style={{
        padding: '2px 8px',
        textAlign: 'center',
        width: '50px',
        verticalAlign: 'middle'
      }}>
        {item.set && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}>
            <img 
              src={getSetIconUrl(item.set)}
              alt={item.set_name || item.set}
              title={`${item.set_name || item.set} (${item.set?.toUpperCase()})`}
              style={{
                width: '18px',
                height: '18px',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
              }}
              onError={(e) => {
                // Fallback: Show set code as text if local SVG doesn't exist
                const fallback = document.createElement('div');
                fallback.textContent = item.set.toUpperCase();
                fallback.style.cssText = `
                  font-size: 9px;
                  font-weight: bold;
                  color: #666;
                  background: #f0f0f0;
                  padding: 2px 3px;
                  border-radius: 2px;
                  border: 1px solid #ddd;
                  text-transform: uppercase;
                  line-height: 1;
                `;
                fallback.title = `${item.set_name || item.set} (${item.set?.toUpperCase()})`;
                
                // Replace the failed image with the text fallback
                e.target.parentNode.replaceChild(fallback, e.target);
              }}
            />
          </div>
        )}
      </td>

      {/* Foil Indicator */}
      <td style={{
        padding: '2px 8px',
        textAlign: 'center',
        width: '70px',
        verticalAlign: 'middle'
      }}>
        {item.foil && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}>
            <span style={{ 
              color: '#ffa500', 
              fontSize: '11px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px'
            }}>
              ✨ FOIL
            </span>
          </div>
        )}
      </td>

      {/* Actions */}
      <td style={{
        padding: '2px 8px',
        textAlign: 'right',
        width: '100px',
        verticalAlign: 'middle'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'flex-end', 
          gap: 4,
          height: '100%'
        }}>
          <button 
            onClick={() => handleQuantityChange(item.quantity - 1)}
            style={{
              width: 18,
              height: 18,
              border: '1px solid #ddd',
              borderRadius: 2,
              backgroundColor: '#fff',
              cursor: 'pointer',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              color: '#000',
              fontWeight: 'bold',
              margin: '8px 0'
            }}
          >
            -
          </button>
          <button 
            onClick={() => handleQuantityChange(item.quantity + 1)}
            style={{
              width: 18,
              height: 18,
              border: '1px solid #ddd',
              borderRadius: 2,
              backgroundColor: '#fff',
              cursor: 'pointer',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              color: '#000',
              fontWeight: 'bold',
              margin: '8px 0'
            }}
          >
            +
          </button>
          <button 
            onClick={() => onRemove(item.id)}
            style={{
              marginLeft: 6,
              padding: '1px 4px',
              border: '1px solid #d32f2f',
              borderRadius: 2,
              backgroundColor: '#fff',
              color: '#d32f2f',
              cursor: 'pointer',
              fontSize: '10px',
              lineHeight: 1,
              margin: '8px 0'
            }}
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
}

function CollectionList({ collection, onQuantityChange, onRemove }) {
  const [sortBy, setSortBy] = useState('name'); // 'name', 'set', 'dateAdded'
  const [filterText, setFilterText] = useState('');

  const filteredAndSorted = collection
    .filter(item => 
      !filterText || 
      item.name.toLowerCase().includes(filterText.toLowerCase()) ||
      item.set_name.toLowerCase().includes(filterText.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'set':
          return a.set_name.localeCompare(b.set_name);
        case 'dateAdded':
          return new Date(b.dateAdded) - new Date(a.dateAdded);
        default:
          return 0;
      }
    });

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16 
      }}>
        <h3 style={{ margin: 0 }}>Your Cards ({collection.length})</h3>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Filter cards..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 14
            }}
          />
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 14
            }}
          >
            <option value="name">Sort by Name</option>
            <option value="set">Sort by Set</option>
            <option value="dateAdded">Sort by Date Added</option>
          </select>
        </div>
      </div>

      {filteredAndSorted.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 48, 
          color: '#666',
          border: '2px dashed #ddd',
          borderRadius: 8
        }}>
          {filterText ? 'No cards match your filter.' : 'Your collection is empty. Add cards from deck editing to get started!'}
        </div>
      ) : (
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: '#fff',
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #ddd'
        }}>
          <thead>
            <tr style={{
              backgroundColor: '#f8f9fa',
              borderBottom: '2px solid #dee2e6'
            }}>
              <th style={{
                padding: '10px 12px',
                textAlign: 'center',
                fontWeight: '600',
                fontSize: '11px',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                width: '70px'
              }}>
                Qty
              </th>
              <th style={{
                padding: '10px 12px',
                textAlign: 'left',
                fontWeight: '600',
                fontSize: '11px',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Card Name
              </th>
              <th style={{
                padding: '10px 12px',
                textAlign: 'center',
                fontWeight: '600',
                fontSize: '11px',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                width: '50px'
              }}>
                Set
              </th>
              <th style={{
                padding: '10px 12px',
                textAlign: 'center',
                fontWeight: '600',
                fontSize: '11px',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                width: '70px'
              }}>
                Foil
              </th>
              <th style={{
                padding: '10px 12px',
                textAlign: 'right',
                fontWeight: '600',
                fontSize: '11px',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                width: '100px'
              }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map(item => (
              <CollectionCard
                key={item.id}
                item={item}
                onQuantityChange={onQuantityChange}
                onRemove={onRemove}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function CollectPage() {
  const [collection, setCollection] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Enhanced import progress tracking
  const [importProgress, setImportProgress] = useState({
    isVisible: false,
    phase: 'preparing',
    current: 0,
    total: 0,
    message: '',
    errors: [],
    isPaused: false,
    canPause: true,
    estimatedTimeRemaining: null,
    storageUsed: null,
    compressionRatio: null
  });

  // Load collection from smart storage with migration support
  useEffect(() => {
    const loadCollection = async () => {
      try {
        console.log('📖 Loading collection with smart storage...');
        
        let loadedCollection = null;
        
        // Try chunked storage first
        const chunkedCollection = await storageManager.getItemChunked('cardCollections');
        if (chunkedCollection?.collections && chunkedCollection.collections.length > 0) {
          console.log(`✅ Loaded ${chunkedCollection.collections.length} cards from chunked storage`);
          loadedCollection = chunkedCollection.collections;
        } else {
          // Fall back to regular storage
          const savedCollection = storageManager.getItem('cardCollection');
          if (savedCollection && savedCollection.length > 0) {
            console.log(`✅ Loaded ${savedCollection.length} cards from regular storage`);
            loadedCollection = savedCollection;
          }
        }

        if (loadedCollection) {
        // Check if collection needs migration from bundled to individual format
        if (needsMigration(loadedCollection)) {
          console.log('🔄 Collection needs migration from bundled to individual items...');
          const migratedCollection = migrateCollection(loadedCollection);
          
          // Save migrated collection
          const success = storageManager.setItem('cardCollection', migratedCollection, {
            clearOldData: true
          });
          
          if (success) {
            setCollection(migratedCollection);
            toast.success('Collection migrated to individual card format! Each card is now a separate item.');
          } else {
            console.error('❌ Failed to save migrated collection');
            setCollection(loadedCollection); // Use original if migration save fails
          }
        } else {
          setCollection(loadedCollection);
        }
        
        // Show collection stats
        const collectionStats = getCollectionStats(loadedCollection);
        console.log('📊 Collection stats:', collectionStats);
      } else {
        console.log('📝 No existing collection found, starting fresh');
      }

      // Show storage stats
      const storageStats = storageManager.getStats();
      console.log('� Storage stats:', {
        usage: `${storageStats.percentage.toFixed(1)}%`,
        used: `${(storageStats.used / 1024 / 1024).toFixed(1)}MB`,
        available: `${(storageStats.available / 1024 / 1024).toFixed(1)}MB`,
        items: storageStats.itemCounts
      });
        
      } catch (error) {
        console.error('❌ Error loading collection:', error);
        toast.error('Error loading collection - using empty collection');
      }
    };

    loadCollection();
  }, []);

  // Save collection using smart storage with quota management
  const saveCollection = async (newCollection) => {
    try {
      console.log(`💾 Saving collection with ${newCollection.length} cards...`);
      
      // Use enhanced storage for large collections, regular for small
      if (newCollection.length > 2000) {
        await storageManager.setItemChunked('cardCollections', { collections: newCollection });
      } else {
        const success = storageManager.setItem('cardCollection', newCollection, {
          clearOldData: true // Clear old data if needed to make space
        });

        if (!success) {
          throw new Error('Smart storage failed to save collection');
        }
      }

      setCollection(newCollection);
      console.log('✅ Collection saved successfully');
      
      // Show success toast with storage info
      const stats = storageManager.getStats();
      toast.success(`Collection saved! Storage: ${stats.percentage.toFixed(1)}% used`);
      
    } catch (error) {
      console.error('❌ Error saving collection:', error);
      
      if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
        toast.error('Collection too large for browser storage. Try exporting to file instead.');
      } else {
        toast.error('Error saving collection: ' + error.message);
      }
    }
  };

  const handleQuantityChange = async (itemId, newQuantity) => {
    // For individual items system, quantity changes work differently
    if (newQuantity < 1) {
      handleRemoveItem(itemId);
      return;
    }
    
    if (newQuantity > 1) {
      // Add more copies of this card
      const sourceItem = collection.find(item => item.id === itemId);
      if (sourceItem) {
        const additionalCopies = [];
        for (let i = 1; i < newQuantity; i++) {
          additionalCopies.push({
            ...sourceItem,
            id: `${sourceItem.originalId || sourceItem.id}_copy_${Date.now()}_${i}`,
            copyNumber: (sourceItem.copyNumber || 1) + i,
            dateAdded: new Date().toISOString()
          });
        }
        
        const updatedCollection = [...collection, ...additionalCopies];
        await saveCollection(updatedCollection);
        toast.success(`Added ${newQuantity - 1} more copies of ${sourceItem.name}`);
      }
    }
    // If newQuantity === 1, no change needed (item already represents 1 card)
  };

  const handleRemoveItem = async (itemId) => {
    const updatedCollection = collection.filter(item => item.id !== itemId);
    await saveCollection(updatedCollection);
    toast.success('Card removed from collection');
  };

  const handleUpdateItem = async (itemId, field, value) => {
    const updatedCollection = collection.map(item => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    });
    await saveCollection(updatedCollection);
  };

  const handleClearCollection = async () => {
    const totalCards = collection.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueCards = collection.length;
    
    const confirmMessage = `Are you sure you want to delete your entire collection?\n\nThis will permanently remove:\n• ${totalCards} total cards\n• ${uniqueCards} unique cards\n\nThis action cannot be undone!`;
    
    if (window.confirm(confirmMessage)) {
      // Double confirmation for safety
      if (window.confirm('Final confirmation: Delete everything? This is your last chance to cancel.')) {
        try {
          await saveCollection([]);
          toast.success(`Collection cleared! Removed ${totalCards} cards.`);
        } catch (error) {
          console.error('Error clearing collection:', error);
          toast.error('Failed to clear collection. Please try again.');
        }
      }
    }
  };

  const handleImport = async (importedCards) => {
    if (!importedCards || importedCards.length === 0) {
      toast.error('No cards to import');
      return;
    }

    const isLargeImport = importedCards.length > 1000;
    const totalCards = importedCards.reduce((sum, card) => sum + (card.quantity || 1), 0);

    if (isLargeImport) {
      console.log(`� Starting large collection import: ${importedCards.length} unique cards, ${totalCards} total items`);
      
      // Initialize progress tracking
      setImportProgress({
        isVisible: true,
        phase: 'preparing',
        current: 0,
        total: totalCards,
        message: 'Preparing import...',
        errors: [],
        isPaused: false,
        canPause: true,
        estimatedTimeRemaining: null,
        storageUsed: null,
        compressionRatio: null
      });
    }

    try {
      let processedCards = importedCards;
      const errors = [];

      // Phase 1: Card enrichment for large imports
      if (isLargeImport) {
        setImportProgress(prev => ({
          ...prev,
          phase: 'api',
          message: 'Enriching card data from Scryfall...'
        }));

        try {
          processedCards = await enrichCardsBatch(importedCards, (current, total) => {
            setImportProgress(prev => ({
              ...prev,
              current: current,
              total: total,
              message: `Enriching cards... ${current}/${total}`
            }));
          }, {
            isLargeImport: true,
            batchSize: 15,
            maxRetries: 3
          });
        } catch (enrichmentError) {
          console.warn('⚠️ Card enrichment failed, proceeding with basic data:', enrichmentError.message);
          errors.push(`Card enrichment partially failed: ${enrichmentError.message}`);
          processedCards = importedCards; // Fall back to original data
        }
      }

      // Phase 2: Processing
      if (isLargeImport) {
        setImportProgress(prev => ({
          ...prev,
          phase: 'processing',
          current: 0,
          total: processedCards.length,
          message: 'Converting to individual items...'
        }));
      }

      console.log('📥 Converting cards to individual items...');
      const individualImportedCards = convertToIndividualItems(processedCards);

      // Phase 3: Storage
      if (isLargeImport) {
        setImportProgress(prev => ({
          ...prev,
          phase: 'storing',
          current: 0,
          total: individualImportedCards.length,
          message: 'Saving to collection...'
        }));
      }

      // Add all individual cards to collection
      const updatedCollection = [...collection, ...individualImportedCards];
      
      // Use enhanced storage for large collections
      await saveCollectionWithProgress(updatedCollection, isLargeImport);
      
      // Complete
      if (isLargeImport) {
        const compressionStats = storageManager.getItem('cardCollections_metadata');
        setImportProgress(prev => ({
          ...prev,
          phase: 'complete',
          current: totalCards,
          total: totalCards,
          message: 'Import complete!',
          compressionRatio: compressionStats?.compressionRatio,
          errors
        }));

        // Show completion for 3 seconds
        setTimeout(() => {
          setImportProgress(prev => ({ ...prev, isVisible: false }));
        }, 3000);
      }
      
      const uniqueCards = new Set(importedCards.map(card => `${card.name}|${card.set}|${card.foil}`)).size;
      
      const successMessage = errors.length > 0 
        ? `Import completed with ${errors.length} warnings! Added ${totalCards} cards (${uniqueCards} unique).`
        : `Import complete! Added ${totalCards} individual cards (${uniqueCards} unique card types).`;
      
      toast.success(successMessage);
      
      if (errors.length > 0) {
        console.warn('⚠️ Import completed with errors:', errors);
      } else {
        console.log(`✅ Import successful: ${totalCards} individual items added`);
      }

    } catch (error) {
      console.error('❌ Import failed:', error);
      
      if (isLargeImport) {
        setImportProgress(prev => ({
          ...prev,
          phase: 'complete',
          message: `Import failed: ${error.message}`,
          errors: [...prev.errors, error.message]
        }));
      }
      
      toast.error(`Import failed: ${error.message}`);
    }
  };

  // Enhanced collection saving with progress tracking
  const saveCollectionWithProgress = async (collectionData, showProgress = false) => {
    try {
      if (showProgress) {
        setImportProgress(prev => ({
          ...prev,
          message: 'Optimizing storage...'
        }));
      }

      // Use enhanced storage manager for large collections
      await storageManager.setItemChunked('cardCollections', { collections: collectionData });
      
      setCollection(collectionData);
      
      if (showProgress) {
        const storageUsed = JSON.stringify(collectionData).length;
        setImportProgress(prev => ({
          ...prev,
          storageUsed,
          message: 'Collection saved successfully!'
        }));
      }
      
      console.log(`💾 Collection saved: ${collectionData.length} items`);
      
    } catch (error) {
      console.error('❌ Failed to save collection:', error);
      throw new Error(`Failed to save collection: ${error.message}`);
    }
  };

  const generateUniqueId = (name, set, foil) => {
    const parts = [
      name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
      set || 'unknown',
      foil ? 'foil' : 'normal'
    ];
    return parts.join('-') + '-' + Date.now() + '-' + Math.random().toString(36).substring(7);
  };

  return (
    <div className="deck-container" style={{ 
      backgroundColor: '#ffffff',
      background: '#ffffff',
      minHeight: '100vh',
      width: '100%'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24,
        backgroundColor: '#ffffff',
        background: '#ffffff'
      }}>
        <h1 style={{ margin: 0 }}>Your Collection</h1>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => setShowImportModal(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            📥 Import Collection
          </button>
          
          {collection.length > 0 && (
            <button
              onClick={handleClearCollection}
              style={{
                padding: '10px 20px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              🗑️ Delete Collection
            </button>
          )}
        </div>
      </div>
      
      <CollectionSummary collection={collection} />
      <EnhancedCollectionTable 
        collection={collection}
        onQuantityChange={handleQuantityChange}
        onRemove={handleRemoveItem}
        onUpdateItem={handleUpdateItem}
      />
      
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />

      <CollectionImportProgress
        {...importProgress}
        onPause={() => setImportProgress(prev => ({ ...prev, isPaused: true }))}
        onResume={() => setImportProgress(prev => ({ ...prev, isPaused: false }))}
        onCancel={() => {
          setImportProgress(prev => ({ ...prev, isVisible: false }));
          toast.info('Import cancelled');
        }}
      />
    </div>
  );
}
