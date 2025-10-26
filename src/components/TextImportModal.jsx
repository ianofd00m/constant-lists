import React, { useState } from 'react';
import { toast } from 'react-toastify';

const TextImportModal = ({ isOpen, onClose, onImport }) => {
  const [textContent, setTextContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!textContent.trim()) {
      toast.warning("Please paste some text to import");
      return;
    }

    setIsImporting(true);
    try {
      await onImport(textContent);
      setTextContent('');
      onClose();
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTextContent(e.target.result);
      };
      reader.readAsText(file);
    } else {
      toast.error("Please select a valid text file (.txt)");
    }
  };

  const getSampleFormat = () => {
    return `Sample Deck
Generated on ${new Date().toLocaleDateString()}
Format: TCGPlayer Mass Entry Compatible

MAIN DECK:
=========
4 Lightning Bolt [M11] 123
3 Counterspell [7ED] 54
2 Serra Angel
1 Black Lotus [LEA] 232

SIDEBOARD:
==========
2 Red Elemental Blast [4ED] 215
3 Disenchant [ICE] 110

TECH IDEAS:
===========
1 Ancestral Recall [LEA] 48
1 Time Walk [LEA] 371`;
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: '#333', fontSize: '24px', fontWeight: '600' }}>
            Import Deck from Text
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: '#666', margin: '0 0 16px 0', lineHeight: '1.5' }}>
            Paste your deck list or upload a text file. Supports the export format from this application 
            and other standard formats. Cards will be automatically searched and added to your deck.
          </p>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'inline-block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#333'
            }}>
              Upload Text File:
            </label>
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              style={{
                marginLeft: '12px',
                padding: '6px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: '#f9f9f9'
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#333'
          }}>
            Deck List Text:
          </label>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder={getSampleFormat()}
            style={{
              width: '100%',
              height: '300px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '14px',
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
              resize: 'vertical',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#4caf50'}
            onBlur={(e) => e.target.style.borderColor = '#ddd'}
          />
        </div>

        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '24px',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#495057', fontSize: '16px' }}>
            Supported Formats:
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#6c757d', lineHeight: '1.6' }}>
            <li><strong>Full Format:</strong> <code>4 Lightning Bolt [M11] 123</code></li>
            <li><strong>With Set:</strong> <code>4 Lightning Bolt [M11]</code></li>
            <li><strong>Simple:</strong> <code>4 Lightning Bolt</code></li>
            <li><strong>Sections:</strong> MAIN DECK, SIDEBOARD, TECH IDEAS</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              backgroundColor: 'white',
              color: '#666',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#999';
              e.target.style.color = '#333';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#ddd';
              e.target.style.color = '#666';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || !textContent.trim()}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: isImporting || !textContent.trim() ? '#ccc' : '#4caf50',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isImporting || !textContent.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isImporting && textContent.trim()) {
                e.target.style.backgroundColor = '#45a049';
              }
            }}
            onMouseLeave={(e) => {
              if (!isImporting && textContent.trim()) {
                e.target.style.backgroundColor = '#4caf50';
              }
            }}
          >
            {isImporting ? 'Importing...' : 'Import Cards'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextImportModal;
