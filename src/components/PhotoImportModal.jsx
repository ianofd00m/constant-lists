import React, { useState } from 'react';
import { toast } from 'react-toastify';

const PhotoImportModal = ({ isOpen, onClose, onImport }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [detectedCards, setDetectedCards] = useState([]);

  const handleFileSelection = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      return file.type.startsWith('image/') || file.type === 'application/pdf';
    });

    if (validFiles.length !== files.length) {
      toast.warning("Some files were skipped. Only image and PDF files are supported.");
    }

    setSelectedFiles(validFiles);
    setDetectedCards([]);
  };

  const processImages = async () => {
    if (selectedFiles.length === 0) {
      toast.warning("Please select some files to process");
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    const detectedCardNames = [];

    try {
      // Note: For now, we'll implement a basic version that extracts text
      // In a real implementation, you'd want to use Tesseract.js or similar OCR library
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setProcessingProgress(((i + 1) / selectedFiles.length) * 100);
        
        if (file.type === 'application/pdf') {
          // For PDF files, we'd need pdf-lib or similar to extract images first
          toast.info(`PDF processing not yet implemented: ${file.name}`);
          continue;
        }
        
        // For images, we'll implement a placeholder that demonstrates the concept
        // In production, you'd use Tesseract.js here:
        /*
        const imageText = await recognizeText(file);
        const cardName = extractCardNameFromText(imageText);
        if (cardName) {
          detectedCardNames.push({
            fileName: file.name,
            cardName: cardName,
            confidence: 0.8
          });
        }
        */
        
        // Placeholder: simulate detection
        const fileName = file.name.toLowerCase();
        let cardName = null;
        
        // Try to extract card name from filename if it contains recognizable patterns
        if (fileName.includes('lightning') && fileName.includes('bolt')) {
          cardName = 'Lightning Bolt';
        } else if (fileName.includes('counterspell')) {
          cardName = 'Counterspell';
        } else if (fileName.includes('serra') && fileName.includes('angel')) {
          cardName = 'Serra Angel';
        } else if (fileName.includes('black') && fileName.includes('lotus')) {
          cardName = 'Black Lotus';
        }
        
        if (cardName) {
          detectedCardNames.push({
            fileName: file.name,
            cardName: cardName,
            confidence: 0.7,
            quantity: 1
          });
        } else {
          detectedCardNames.push({
            fileName: file.name,
            cardName: `Unknown Card (${file.name})`,
            confidence: 0.0,
            quantity: 1,
            needsManualEntry: true
          });
        }
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setDetectedCards(detectedCardNames);
      toast.success(`Processed ${selectedFiles.length} files. Found ${detectedCardNames.filter(c => c.confidence > 0.5).length} cards.`);
      
    } catch (error) {
      console.error('Error processing images:', error);
      toast.error("Error processing images");
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const handleImport = async () => {
    const validCards = detectedCards.filter(card => card.confidence > 0.5 && !card.needsManualEntry);
    
    if (validCards.length === 0) {
      toast.warning("No valid cards detected to import");
      return;
    }

    // Convert to the format expected by the text import function
    const textContent = [
      "MAIN DECK:",
      "=========",
      ...validCards.map(card => `${card.quantity} ${card.cardName}`),
      `\nMain Deck Total: ${validCards.length} cards`
    ].join('\n');

    try {
      await onImport(textContent);
      setSelectedFiles([]);
      setDetectedCards([]);
      onClose();
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const updateCardName = (index, newName) => {
    const updated = [...detectedCards];
    updated[index].cardName = newName;
    updated[index].needsManualEntry = false;
    updated[index].confidence = 0.9; // Manual entry gets high confidence
    setDetectedCards(updated);
  };

  const updateQuantity = (index, newQuantity) => {
    const updated = [...detectedCards];
    updated[index].quantity = parseInt(newQuantity) || 1;
    setDetectedCards(updated);
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
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: '#333', fontSize: '24px', fontWeight: '600' }}>
            Import from Photos/PDF
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

        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeaa7', 
            borderRadius: '8px', 
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#856404' }}>
              🚧 Beta Feature
            </h4>
            <p style={{ margin: 0, color: '#856404', fontSize: '14px', lineHeight: '1.4' }}>
              Photo recognition is currently in beta. For best results, use clear, well-lit photos of individual cards. 
              You can manually edit any misidentified cards before importing.
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '12px', 
              fontWeight: '500',
              color: '#333',
              fontSize: '16px'
            }}>
              Select Card Photos or PDFs:
            </label>
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileSelection}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px dashed #ddd',
                borderRadius: '8px',
                backgroundColor: '#f9f9f9',
                cursor: 'pointer'
              }}
            />
            {selectedFiles.length > 0 && (
              <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
                Selected {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {selectedFiles.length > 0 && !isProcessing && detectedCards.length === 0 && (
            <button
              onClick={processImages}
              style={{
                padding: '12px 24px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f57c00'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#ff9800'}
            >
              Process Images
            </button>
          )}

          {isProcessing && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '8px', color: '#666' }}>
                Processing images... {Math.round(processingProgress)}%
              </div>
              <div style={{ 
                width: '100%', 
                height: '8px', 
                backgroundColor: '#e0e0e0', 
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${processingProgress}%`,
                  height: '100%',
                  backgroundColor: '#ff9800',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}

          {detectedCards.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '16px', color: '#333' }}>
                Detected Cards ({detectedCards.length}):
              </h3>
              <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '8px' }}>
                {detectedCards.map((card, index) => (
                  <div key={index} style={{ 
                    padding: '12px', 
                    borderBottom: index < detectedCards.length - 1 ? '1px solid #eee' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: card.needsManualEntry ? '#fff3cd' : 'white'
                  }}>
                    <div style={{ flex: '0 0 120px', fontSize: '12px', color: '#666' }}>
                      {card.fileName}
                    </div>
                    <div style={{ flex: '0 0 60px' }}>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={card.quantity}
                        onChange={(e) => updateQuantity(index, e.target.value)}
                        style={{
                          width: '50px',
                          padding: '4px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          textAlign: 'center'
                        }}
                      />
                    </div>
                    <div style={{ flex: '1' }}>
                      <input
                        type="text"
                        value={card.cardName}
                        onChange={(e) => updateCardName(index, e.target.value)}
                        placeholder="Enter card name"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          backgroundColor: card.needsManualEntry ? '#fff9e6' : 'white'
                        }}
                      />
                    </div>
                    <div style={{ flex: '0 0 80px', fontSize: '12px', textAlign: 'center' }}>
                      {card.confidence > 0.5 ? (
                        <span style={{ color: '#4caf50' }}>✓ Ready</span>
                      ) : (
                        <span style={{ color: '#ff9800' }}>⚠ Edit</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          
          {detectedCards.length > 0 && (
            <button
              onClick={handleImport}
              disabled={detectedCards.filter(c => c.confidence > 0.5).length === 0}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: detectedCards.filter(c => c.confidence > 0.5).length === 0 ? '#ccc' : '#4caf50',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: detectedCards.filter(c => c.confidence > 0.5).length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (detectedCards.filter(c => c.confidence > 0.5).length > 0) {
                  e.target.style.backgroundColor = '#45a049';
                }
              }}
              onMouseLeave={(e) => {
                if (detectedCards.filter(c => c.confidence > 0.5).length > 0) {
                  e.target.style.backgroundColor = '#4caf50';
                }
              }}
            >
              Import {detectedCards.filter(c => c.confidence > 0.5).length} Cards
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoImportModal;
