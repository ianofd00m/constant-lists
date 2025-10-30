/**
 * Enhanced Collection Table Component
 * Supports draggable columns, column visibility toggles, and advanced data display
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getUnifiedCardPrice } from '../utils/UnifiedPricing';

// Sortable header cell component
function SortableHeaderCell({ column, index, onSort, sortBy, sortDirection }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: column.id,
    disabled: column.fixed
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <th
      ref={setNodeRef}
      style={{
        ...style,
        padding: '10px 12px',
        textAlign: column.id === 'name' ? 'left' : 
                   ['quantity', 'setIcon', 'foil', 'rarity', 'condition', 'language', 'cardNumber'].includes(column.id) ? 'center' : 
                   ['currentPrice', 'purchasePrice', 'netGain', 'actions'].includes(column.id) ? 'right' : 'left',
        fontWeight: '600',
        fontSize: '11px',
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        width: column.width,
        cursor: column.sortable ? 'pointer' : column.fixed ? 'default' : 'grab',
        backgroundColor: isDragging ? '#e3f2fd' : '#f8f9fa',
        position: 'relative',
        userSelect: 'none',
        border: isDragging ? '2px dashed #1976d2' : '1px solid #dee2e6'
      }}
      onClick={() => column.sortable && onSort(column.id)}
      {...attributes}
      {...(column.fixed ? {} : listeners)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 
        column.id === 'name' ? 'flex-start' : 
        ['quantity', 'setIcon', 'foil', 'rarity', 'condition', 'language', 'cardNumber'].includes(column.id) ? 'center' : 
        ['currentPrice', 'purchasePrice', 'netGain', 'actions'].includes(column.id) ? 'flex-end' : 'flex-start'
      }}>
        {column.title}
        {!column.fixed && (
          <span style={{ opacity: 0.5, fontSize: '10px' }}>⋮⋮</span>
        )}
        {column.sortable && sortBy === column.id && (
          <span style={{ marginLeft: 4 }}>
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );
}

// Price cell components (using hooks)
function CurrentPriceCell({ item }) {
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (item.scryfall_json || item.printing_id || item.name) {
      setLoading(true);
      
      // Create proper card data object for unified pricing
      const cardData = {
        name: item.name,
        foil: item.foil,
        scryfall_json: item.scryfall_json || {},
        // Fallback data if scryfall_json is missing
        set: item.set,
        collector_number: item.collector_number,
        printing_id: item.printing_id
      };
      
      const result = getUnifiedCardPrice(cardData, {
        preferStoredPrice: false, // Use live Scryfall data
        fallbackPrice: null,
        debugLogging: false
      });
      
      setPrice(result.price);
      setLoading(false);
    }
  }, [item.scryfall_json, item.printing_id, item.foil, item.name]);
  
  return (
    <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: '500' }}>
      {loading ? '...' : price !== null ? `$${parseFloat(price).toFixed(2)}` : 'N/A'}
    </div>
  );
}

// Editable purchase price cell
function EditablePurchasePriceCell({ item, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(item.purchase_price || '');
  const [originalValue, setOriginalValue] = useState(item.purchase_price || '');
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // Auto-highlight text
    }
  }, [isEditing]);
  
  const handleSave = () => {
    const numericValue = parseFloat(editValue);
    if (isNaN(numericValue) || numericValue < 0) {
      toast.error('Please enter a valid price (0 or greater)');
      return;
    }
    
    // Use purchase_price field to match the database structure
    onUpdate(item.id, 'purchase_price', numericValue);
    setIsEditing(false);
    setEditValue(formatPrice(numericValue));
  };  const handleCancel = () => {
    setValue(originalValue);
    setIsEditing(false);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };
  
  if (isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <input
          ref={inputRef}
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={handleCancel}
          style={{
            width: '60px',
            padding: '2px 4px',
            fontSize: '12px',
            border: '1px solid #007bff',
            borderRadius: 2,
            textAlign: 'right'
          }}
        />
        <button
          onClick={handleSave}
          style={{
            width: 16,
            height: 16,
            padding: 0,
            border: 'none',
            borderRadius: 2,
            backgroundColor: '#28a745',
            color: 'white',
            fontSize: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✓
        </button>
      </div>
    );
  }
  
  return (
    <div 
      style={{ 
        textAlign: 'right', 
        fontSize: '12px', 
        color: '#666',
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: 2,
        minHeight: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end'
      }}
      onClick={() => setIsEditing(true)}
      title="Click to edit purchase price"
    >
      {originalValue ? `$${parseFloat(originalValue).toFixed(2)}` : 'Click to add'}
    </div>
  );
}

// Clickable foil toggle cell
function FoilToggleCell({ item, onUpdate }) {
  const handleToggle = () => {
    onUpdate(item.id, 'foil', !item.foil);
  };
  
  return (
    <div 
      style={{ 
        textAlign: 'center',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: 4,
        backgroundColor: item.foil ? '#fff3cd' : 'transparent',
        border: '1px solid ' + (item.foil ? '#ffc107' : 'transparent'),
        minHeight: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={handleToggle}
      title={`Click to toggle foil status (currently ${item.foil ? 'foil' : 'non-foil'})`}
    >
      {item.foil ? (
        <span style={{ 
          color: '#ffa500', 
          fontSize: '11px',
          fontWeight: 'bold'
        }}>
          ✨ FOIL
        </span>
      ) : (
        <span style={{ 
          color: '#999', 
          fontSize: '10px'
        }}>
          Normal
        </span>
      )}
    </div>
  );
}

function NetGainCell({ item }) {
  const [currentPrice, setCurrentPrice] = useState(null);
  const purchasePrice = parseFloat(item.purchase_price || 0);
  
  useEffect(() => {
    if ((item.scryfall_json || item.name) && purchasePrice > 0) {
      // Create proper card data object for unified pricing
      const cardData = {
        name: item.name,
        foil: item.foil,
        scryfall_json: item.scryfall_json || {},
        set: item.set,
        collector_number: item.collector_number,
        printing_id: item.printing_id
      };
      
      const result = getUnifiedCardPrice(cardData, {
        preferStoredPrice: false,
        fallbackPrice: null,
        debugLogging: false
      });
      
      setCurrentPrice(parseFloat(result.price) || 0);
    }
  }, [item.scryfall_json, item.foil, item.name, purchasePrice]);
  
  if (!purchasePrice || !currentPrice) {
    return <div style={{ textAlign: 'right', fontSize: '12px', color: '#999' }}>-</div>;
  }
  
  const gainPercent = ((currentPrice - purchasePrice) / purchasePrice) * 100;
  const isPositive = gainPercent >= 0;
  
  return (
    <div style={{ 
      textAlign: 'right', 
      fontSize: '12px', 
      fontWeight: 'bold',
      color: isPositive ? '#28a745' : '#dc3545'
    }}>
      {isPositive ? '+' : ''}{gainPercent.toFixed(1)}%
    </div>
  );
}

// Default column configuration
const DEFAULT_COLUMNS = {
  quantity: { id: 'quantity', title: 'Qty', visible: true, width: '70px', sortable: true },
  name: { id: 'name', title: 'Card Name', visible: true, width: 'auto', sortable: true, fixed: true }, // Card name can't be toggled off
  setIcon: { id: 'setIcon', title: 'Set', visible: true, width: '60px', sortable: false },
  setCode: { id: 'setCode', title: 'Code', visible: false, width: '80px', sortable: true },
  setName: { id: 'setName', title: 'Set Name', visible: false, width: '120px', sortable: true },
  cardNumber: { id: 'cardNumber', title: '#', visible: false, width: '60px', sortable: true },
  rarity: { id: 'rarity', title: 'Rarity', visible: false, width: '80px', sortable: true },
  condition: { id: 'condition', title: 'Condition', visible: false, width: '80px', sortable: true },
  language: { id: 'language', title: 'Lang', visible: false, width: '60px', sortable: true },
  foil: { id: 'foil', title: 'Foil', visible: true, width: '70px', sortable: true },
  currentPrice: { id: 'currentPrice', title: 'Price', visible: false, width: '80px', sortable: true },
  purchasePrice: { id: 'purchasePrice', title: 'Paid', visible: false, width: '80px', sortable: true },
  netGain: { id: 'netGain', title: 'Gain %', visible: false, width: '80px', sortable: true },
  dateAdded: { id: 'dateAdded', title: 'Added', visible: false, width: '100px', sortable: true },
  actions: { id: 'actions', title: 'Actions', visible: true, width: '120px', sortable: false, fixed: true }
};

// Column value renderers
const COLUMN_RENDERERS = {
  quantity: (item) => (
    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
      {item.quantity}
    </div>
  ),
  
  name: (item) => (
    <div style={{ fontWeight: '500', fontSize: '14px', color: '#333' }}>
      {item.name}
    </div>
  ),
  
  setIcon: (item) => {
    const getSetIconUrl = (setCode) => {
      if (!setCode) return null;
      return `/svgs/${setCode.toLowerCase()}.svg`;
    };

    return item.set ? (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            e.target.parentNode.replaceChild(fallback, e.target);
          }}
        />
      </div>
    ) : null;
  },
  
  setCode: (item) => (
    <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>
      {item.set?.toUpperCase() || '-'}
    </div>
  ),
  
  setName: (item) => (
    <div style={{ fontSize: '13px', color: '#555' }}>
      {item.set_name || item.scryfall_json?.set_name || item.edition || (item.set ? item.set.toUpperCase() : '-')}
    </div>
  ),
  
  cardNumber: (item) => (
    <div style={{ textAlign: 'center', fontSize: '12px', color: '#666' }}>
      {item.collector_number || item.card_number || '-'}
    </div>
  ),
  
  rarity: (item) => {
    const rarityColors = {
      common: '#1e1e1e',
      uncommon: '#c0c0c0',
      rare: '#daa520',
      mythic: '#ff8c00',
      special: '#8b008b'
    };
    
    const rarity = item.rarity?.toLowerCase() || 'common';
    return (
      <div style={{ 
        textAlign: 'center', 
        fontSize: '11px', 
        fontWeight: 'bold',
        color: rarityColors[rarity] || '#666',
        textTransform: 'uppercase'
      }}>
        {rarity.charAt(0)}
      </div>
    );
  },
  
  condition: (item) => (
    <div style={{ textAlign: 'center', fontSize: '11px', color: '#666' }}>
      {item.condition || 'NM'}
    </div>
  ),
  
  language: (item) => (
    <div style={{ textAlign: 'center', fontSize: '11px', color: '#666' }}>
      {item.language ? item.language.substring(0, 2).toUpperCase() : 'EN'}
    </div>
  ),
  
  foil: (item, onUpdate) => (
    <FoilToggleCell 
      item={item} 
      onUpdate={onUpdate}
    />
  ),
  
  currentPrice: (item) => <CurrentPriceCell item={item} />,
  
  purchasePrice: (item, onUpdate) => (
    <EditablePurchasePriceCell 
      item={item} 
      onUpdate={onUpdate}
    />
  ),
  
  netGain: (item) => <NetGainCell item={item} />,
  
  dateAdded: (item) => {
    const date = new Date(item.dateAdded || item.date_added);
    if (isNaN(date.getTime())) return <div style={{ fontSize: '11px', color: '#999' }}>-</div>;
    
    return (
      <div style={{ fontSize: '11px', color: '#666' }}>
        {date.toLocaleDateString()}
      </div>
    );
  }
};

export default function EnhancedCollectionTable({ 
  collection, 
  onQuantityChange, 
  onRemove,
  onUpdateItem 
}) {
  const [columns, setColumns] = useState(() => {
    // Try to load saved column config from localStorage
    const saved = localStorage.getItem('collection-table-columns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterText, setFilterText] = useState('');
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const columnMenuRef = useRef(null);
  
  // Drag and drop sensors
  // Handle item updates (for editable cells)
  const handleItemUpdate = (itemId, field, value) => {
    if (onUpdateItem) {
      onUpdateItem(itemId, field, value);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Save column configuration whenever it changes
  useEffect(() => {
    localStorage.setItem('collection-table-columns', JSON.stringify(columns));
  }, [columns]);
  
  // Close column menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
        setShowColumnMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Get ordered visible columns
  const visibleColumns = useMemo(() => {
    return Object.values(columns)
      .filter(col => col.visible)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [columns]);
  
  // Filter and sort collection
  const filteredAndSorted = useMemo(() => {
    let filtered = collection;
    
    // Apply filter
    if (filterText) {
      const filterLower = filterText.toLowerCase();
      filtered = collection.filter(item => 
        item.name?.toLowerCase().includes(filterLower) ||
        item.set_name?.toLowerCase().includes(filterLower) ||
        item.set?.toLowerCase().includes(filterLower) ||
        item.collector_number?.toLowerCase().includes(filterLower)
      );
    }
    
    // Apply sort
    return filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Handle special sorting cases
      if (sortBy === 'currentPrice' || sortBy === 'purchasePrice') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (sortBy === 'dateAdded') {
        aVal = new Date(aVal).getTime() || 0;
        bVal = new Date(bVal).getTime() || 0;
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [collection, filterText, sortBy, sortDirection]);
  
  // Handle column reordering
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const oldIndex = visibleColumns.findIndex(col => col.id === active.id);
      const newIndex = visibleColumns.findIndex(col => col.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedColumns = arrayMove(visibleColumns, oldIndex, newIndex);
        
        // Update column order in the full columns object
        const newColumns = { ...columns };
        reorderedColumns.forEach((col, index) => {
          newColumns[col.id] = { ...newColumns[col.id], order: index };
        });
        
        setColumns(newColumns);
      }
    }
  };
  
  // Handle column visibility toggle
  const toggleColumn = (columnId) => {
    if (columns[columnId]?.fixed) return; // Can't toggle fixed columns
    
    setColumns(prev => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        visible: !prev[columnId].visible
      }
    }));
  };
  
  // Handle sorting
  const handleSort = (columnId) => {
    if (!columns[columnId]?.sortable) return;
    
    if (sortBy === columnId) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnId);
      setSortDirection('asc');
    }
  };
  
  // Render action buttons for a row
  const renderActions = (item) => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'flex-end', 
      gap: 4 
    }}>
      <button 
        onClick={() => onQuantityChange(item.id, item.quantity - 1)}
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
          fontWeight: 'bold'
        }}
      >
        -
      </button>
      <button 
        onClick={() => onQuantityChange(item.id, item.quantity + 1)}
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
          fontWeight: 'bold'
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
          lineHeight: 1
        }}
      >
        Remove
      </button>
    </div>
  );
  
  return (
    <div>
      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16,
        gap: 12
      }}>
        <h3 style={{ margin: 0 }}>Your Cards ({collection.length})</h3>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Filter Input - Dark background with white text */}
          <input
            type="text"
            placeholder="Filter cards..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #555',
              borderRadius: 4,
              fontSize: 14,
              backgroundColor: '#2c2c2c',
              color: 'white',
              minWidth: '200px'
            }}
          />
          
          {/* Sort Dropdown - Dark background with white text */}
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #555',
              borderRadius: 4,
              fontSize: 14,
              backgroundColor: '#2c2c2c',
              color: 'white',
              minWidth: '150px'
            }}
          >
            {Object.values(columns)
              .filter(col => col.sortable)
              .map(col => (
                <option key={col.id} value={col.id}>
                  Sort by {col.title}
                </option>
              ))
            }
          </select>
          
          {/* Sort Direction Button */}
          <button
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            style={{
              padding: '8px 12px',
              border: '1px solid #555',
              borderRadius: 4,
              backgroundColor: '#2c2c2c',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
          </button>
          
          {/* Column Visibility Menu */}
          <div style={{ position: 'relative' }} ref={columnMenuRef}>
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              style={{
                padding: '8px 12px',
                border: '1px solid #555',
                borderRadius: 4,
                backgroundColor: '#2c2c2c',
                color: 'white',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              Columns ⚙️
            </button>
            
            {showColumnMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                minWidth: '200px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                <div style={{ 
                  padding: '8px 12px', 
                  borderBottom: '1px solid #eee',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  color: '#666',
                  textTransform: 'uppercase'
                }}>
                  Show/Hide Columns
                </div>
                
                {Object.values(columns).map(col => (
                  <label 
                    key={col.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      cursor: col.fixed ? 'default' : 'pointer',
                      fontSize: '14px',
                      color: col.fixed ? '#999' : '#333',
                      backgroundColor: col.visible ? '#f8f9fa' : 'transparent'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => toggleColumn(col.id)}
                      disabled={col.fixed}
                      style={{ marginRight: 8 }}
                    />
                    {col.title}
                    {col.fixed && (
                      <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#999' }}>
                        (Fixed)
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
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
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
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
                <SortableContext 
                  items={visibleColumns.map(col => col.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {visibleColumns.map((col, index) => (
                    <SortableHeaderCell
                      key={col.id}
                      column={col}
                      index={index}
                      onSort={handleSort}
                      sortBy={sortBy}
                      sortDirection={sortDirection}
                    />
                  ))}
                </SortableContext>
              </tr>
            </thead>
            
            <tbody>
              {filteredAndSorted.map(item => (
                <tr key={item.id} style={{
                  borderBottom: '1px solid #eee',
                  backgroundColor: '#fff'
                }}>
                  {visibleColumns.map(col => (
                    <td 
                      key={col.id}
                      style={{
                        padding: '8px 12px',
                        verticalAlign: 'middle',
                        width: col.width
                      }}
                    >
                      {col.id === 'actions' 
                        ? renderActions(item)
                        : COLUMN_RENDERERS[col.id]?.(item, handleItemUpdate) || <div>-</div>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </DndContext>
      )}
    </div>
  );
}