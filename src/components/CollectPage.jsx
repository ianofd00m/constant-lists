import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ImportModal from './ImportModal';
import { storageManager } from '../utils/storageManager';
import EnhancedCollectionTable from './EnhancedCollectionTable';

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

  // Load collection from smart storage
  useEffect(() => {
    try {
      console.log('📖 Loading collection with smart storage...');
      
      // Try chunked storage first
      const chunkedCollection = storageManager.getChunkedItem('cardCollection');
      if (chunkedCollection && chunkedCollection.length > 0) {
        console.log(`✅ Loaded ${chunkedCollection.length} cards from chunked storage`);
        setCollection(chunkedCollection);
        return;
      }

      // Fall back to regular storage
      const savedCollection = storageManager.getItem('cardCollection');
      if (savedCollection && savedCollection.length > 0) {
        console.log(`✅ Loaded ${savedCollection.length} cards from regular storage`);
        setCollection(savedCollection);
      } else {
        console.log('📝 No existing collection found, starting fresh');
      }

      // Show storage stats
      const stats = storageManager.getStats();
      console.log('📊 Storage stats:', {
        usage: `${stats.percentage.toFixed(1)}%`,
        used: `${(stats.used / 1024 / 1024).toFixed(1)}MB`,
        available: `${(stats.available / 1024 / 1024).toFixed(1)}MB`,
        items: stats.itemCounts
      });
      
    } catch (error) {
      console.error('❌ Error loading collection:', error);
      toast.error('Error loading collection - using empty collection');
    }
  }, []);

  // Save collection using smart storage with quota management
  const saveCollection = (newCollection) => {
    try {
      console.log(`💾 Saving collection with ${newCollection.length} cards...`);
      
      // Use smart storage with compression and quota management
      const success = storageManager.setItem('cardCollection', newCollection, {
        clearOldData: true // Clear old data if needed to make space
      });

      if (success) {
        setCollection(newCollection);
        console.log('✅ Collection saved successfully');
        
        // Show success toast with storage info
        const stats = storageManager.getStats();
        toast.success(`Collection saved! Storage: ${stats.percentage.toFixed(1)}% used`);
      } else {
        throw new Error('Smart storage failed to save collection');
      }
      
    } catch (error) {
      console.error('❌ Error saving collection:', error);
      
      if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
        toast.error('Collection too large for browser storage. Try exporting to file instead.');
      } else {
        toast.error('Error saving collection: ' + error.message);
      }
    }
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    const updatedCollection = collection.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    );
    saveCollection(updatedCollection);
    toast.success('Quantity updated');
  };

  const handleRemoveItem = (itemId) => {
    const updatedCollection = collection.filter(item => item.id !== itemId);
    saveCollection(updatedCollection);
    toast.success('Card removed from collection');
  };

  const handleClearCollection = () => {
    const totalCards = collection.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueCards = collection.length;
    
    const confirmMessage = `Are you sure you want to delete your entire collection?\n\nThis will permanently remove:\n• ${totalCards} total cards\n• ${uniqueCards} unique cards\n\nThis action cannot be undone!`;
    
    if (window.confirm(confirmMessage)) {
      // Double confirmation for safety
      if (window.confirm('Final confirmation: Delete everything? This is your last chance to cancel.')) {
        try {
          saveCollection([]);
          toast.success(`Collection cleared! Removed ${totalCards} cards.`);
        } catch (error) {
          console.error('Error clearing collection:', error);
          toast.error('Failed to clear collection. Please try again.');
        }
      }
    }
  };

  const handleImport = (importedCards) => {
    if (!importedCards || importedCards.length === 0) {
      toast.error('No cards to import');
      return;
    }

    try {
      // Merge with existing collection, handling duplicates
      const updatedCollection = [...collection];
      let addedCount = 0;
      let updatedCount = 0;

      for (const importedCard of importedCards) {
        // Validate imported card
        if (!importedCard.name || !importedCard.quantity || importedCard.quantity < 1) {
          console.warn('Skipping invalid card:', importedCard);
          continue;
        }

        // Check for existing card (match by name, set, and foil status)
        const existingCardIndex = updatedCollection.findIndex(existingCard => 
          existingCard.name === importedCard.name &&
          existingCard.set === importedCard.set &&
          existingCard.foil === importedCard.foil
        );

        if (existingCardIndex !== -1) {
          // Update quantity of existing card
          updatedCollection[existingCardIndex].quantity += importedCard.quantity;
          updatedCount++;
        } else {
          // Add new card to collection
          updatedCollection.push({
            ...importedCard,
            id: importedCard.id || generateUniqueId(importedCard.name, importedCard.set, importedCard.foil),
            dateAdded: new Date().toISOString()
          });
          addedCount++;
        }
      }

      saveCollection(updatedCollection);
      
      const message = `Import complete! Added ${addedCount} new cards, updated ${updatedCount} existing cards.`;
      toast.success(message);

    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Import failed: ${error.message}`);
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
      />
      
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />
    </div>
  );
}
