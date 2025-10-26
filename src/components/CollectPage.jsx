import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

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

  // Load collection from localStorage
  useEffect(() => {
    try {
      const savedCollection = localStorage.getItem('cardCollection');
      if (savedCollection) {
        setCollection(JSON.parse(savedCollection));
      }
    } catch (error) {
      console.error('Error loading collection:', error);
      toast.error('Error loading collection');
    }
  }, []);

  // Save collection to localStorage whenever it changes
  const saveCollection = (newCollection) => {
    try {
      localStorage.setItem('cardCollection', JSON.stringify(newCollection));
      setCollection(newCollection);
    } catch (error) {
      console.error('Error saving collection:', error);
      toast.error('Error saving collection');
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
    if (window.confirm('Are you sure you want to clear your entire collection? This cannot be undone.')) {
      saveCollection([]);
      toast.success('Collection cleared');
    }
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
      </div>
      
      <CollectionSummary collection={collection} />
      <CollectionList 
        collection={collection}
        onQuantityChange={handleQuantityChange}
        onRemove={handleRemoveItem}
      />
    </div>
  );
}
