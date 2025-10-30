import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';

// Import parsers
import { parseCSV } from '../utils/csvParser';
import { parseText } from '../utils/textParser';
import { parseCameraText } from '../utils/cameraParser';
import { parseScryfallJSON, parseScryfallCollection } from '../utils/scryfallParser';
import { parseDek, convertDekToCollection } from '../utils/dekParser';
import { parseSimpleText, convertSimpleTextToCollection } from '../utils/simpleTextParser';
import { documentParser, getSupportedFormats, isFormatSupported } from '../utils/documentParser';

function getRarityColor(rarity) {
  const colors = {
    'common': '#1a1a1a',
    'uncommon': '#c0c0c0', 
    'rare': '#ffd700',
    'mythic': '#ff4500',
    'special': '#d946ef',
    'bonus': '#8b5cf6'
  };
  return colors[rarity?.toLowerCase()] || '#666';
}

function getSpecialAttributes(card) {
  const attributes = [];
  
  if (card.foil) attributes.push('✨Foil');
  if (card.signed) attributes.push('✍️Signed');
  if (card.artist_proof) attributes.push('🎨AP');
  if (card.altered) attributes.push('🖌️Alt');
  if (card.misprint) attributes.push('❗MP');
  if (card.promo) attributes.push('🎁Promo');
  if (card.textless) attributes.push('📝TL');
  
  if (card.tradelist_count > 0) attributes.push(`📈${card.tradelist_count}T`);
  if (card.wishlist_count > 0) attributes.push(`💝${card.wishlist_count}W`);
  
  return attributes.length > 0 ? attributes.join(' ') : '—';
}

export default function ImportModal({ isOpen, onClose, onImport }) {
  const [activeTab, setActiveTab] = useState('csv');
  const [csvData, setCsvData] = useState('');
  const [textData, setTextData] = useState('');
  const [jsonData, setJsonData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

  if (!isOpen) return null;

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split('.').pop();

    // Validate file type and size using comprehensive format checker
    if (!isFormatSupported(fileName)) {
      const supportedFormats = getSupportedFormats();
      const allExtensions = Object.values(supportedFormats).flat();
      toast.error(`Unsupported file type. Supported formats: ${allExtensions.join(', ')}`);
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast.error('File too large. Please select a file smaller than 50MB');
      return;
    }

    // Use comprehensive document parser for all file types
    processDocumentFile(file, fileExtension);
  };

  const handleJSONFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type and size
    if (!file.name.toLowerCase().endsWith('.json')) {
      toast.error('Please select a JSON file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit for JSON (can be larger)
      toast.error('File too large. Please select a JSON file smaller than 50MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setJsonData(content);
      processJSONData(content);
    };
    reader.onerror = () => {
      toast.error('Error reading JSON file. Please try again.');
    };
    reader.readAsText(file);
  };

  const processCSVData = async (data) => {
    if (!data.trim()) return;

    setIsProcessing(true);
    try {
      const parsed = await parseCSV(data);
      setPreviewData(parsed);
      setShowPreview(true);
      toast.success(`Parsed ${parsed.length} cards from CSV`);
    } catch (error) {
      console.error('CSV parsing error:', error);
      toast.error(`CSV parsing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processTextData = async (data) => {
    if (!data.trim()) return;

    setIsProcessing(true);
    try {
      // Try enhanced text parser first, then fallback to simple text parser
      let parsed;
      try {
        parsed = await parseText(data);
      } catch {
        // If enhanced parser fails, try simple text parser
        const simpleCards = await parseSimpleText(data);
        parsed = convertSimpleTextToCollection(simpleCards);
      }
      
      setPreviewData(parsed);
      setShowPreview(true);
      toast.success(`Parsed ${parsed.length} cards from text`);
    } catch (error) {
      console.error('Text parsing error:', error);
      toast.error(`Text parsing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processJSONData = async (data) => {
    if (!data.trim()) return;

    setIsProcessing(true);
    try {
      // Try collection format first, then standard format
      let parsed;
      try {
        parsed = await parseScryfallCollection(data);
      } catch {
        parsed = await parseScryfallJSON(data);
      }
      
      setPreviewData(parsed);
      setShowPreview(true);
      toast.success(`Parsed ${parsed.length} cards from Scryfall JSON`);
    } catch (error) {
      console.error('JSON parsing error:', error);
      toast.error(`JSON parsing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processDeKData = async (data) => {
    if (!data.trim()) return;

    setIsProcessing(true);
    try {
      const dekResult = await parseDek(data);
      const parsed = convertDekToCollection(dekResult);
      setPreviewData(parsed);
      setShowPreview(true);
      toast.success(`Parsed ${parsed.length} cards from DEK file (${dekResult.metadata.deckName})`);
    } catch (error) {
      console.error('DEK parsing error:', error);
      toast.error(`DEK parsing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processDocumentFile = async (file, fileExtension) => {
    setIsProcessing(true);
    try {
      // Use comprehensive document parser
      const parsed = await documentParser.parseDocument(file);
      setPreviewData(parsed);
      setShowPreview(true);
      
      const formatName = fileExtension.toUpperCase();
      toast.success(`Parsed ${parsed.length} cards from ${formatName} file`);
      
      // Update appropriate data field for display
      if (['csv'].includes(fileExtension)) {
        setCsvData(`Imported from ${file.name}`);
      } else if (['txt', 'rtf', 'md', 'html', 'xml'].includes(fileExtension)) {
        setTextData(`Imported from ${file.name}`);
      } else if (['json'].includes(fileExtension)) {
        setJsonData(`Imported from ${file.name}`);
      }
      
    } catch (error) {
      console.error(`${fileExtension.toUpperCase()} parsing error:`, error);
      toast.error(`${fileExtension.toUpperCase()} parsing failed: ${error.message}`);
      
      // Provide helpful suggestions based on file type
      if (['xlsx', 'xls', 'ods', 'numbers'].includes(fileExtension)) {
        toast.info('💡 Tip: For best results with spreadsheets, export as CSV first');
      } else if (['docx', 'doc', 'odt', 'pages'].includes(fileExtension)) {
        toast.info('💡 Tip: For better accuracy, copy text content and use Text Import');
      } else if (fileExtension === 'pdf') {
        toast.info('💡 Tip: Copy text from PDF and use Text Import for best results');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Use back camera if available
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStream(stream);
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setIsCameraActive(false);
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    // Convert to blob and process with OCR
    canvas.toBlob(async (blob) => {
      setIsProcessing(true);
      try {
        const text = await parseCameraText(blob);
        const parsed = await parseText(text);
        setPreviewData(parsed);
        setShowPreview(true);
        toast.success(`Captured and parsed ${parsed.length} cards`);
      } catch (error) {
        console.error('Camera capture error:', error);
        toast.error(`Camera capture failed: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    }, 'image/jpeg', 0.8);
  };

  const handleImport = () => {
    if (previewData.length === 0) {
      toast.error('No data to import');
      return;
    }

    onImport(previewData);
    handleClose();
  };

  const handleClose = () => {
    stopCamera();
    setCsvData('');
    setTextData('');
    setJsonData('');
    setPreviewData([]);
    setShowPreview(false);
    setActiveTab('csv');
    onClose();
  };

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const contentStyle = {
    backgroundColor: 'white',
    borderRadius: 8,
    width: '90%',
    maxWidth: 800,
    maxHeight: '90vh',
    overflow: 'auto',
    padding: 24
  };

  const tabStyle = (isActive) => ({
    padding: '8px 16px',
    border: 'none',
    backgroundColor: isActive ? '#007bff' : '#f8f9fa',
    color: isActive ? 'white' : '#333',
    cursor: 'pointer',
    borderRadius: '4px 4px 0 0',
    marginRight: 4
  });

  return (
    <div style={modalStyle} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div style={contentStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>Import Collection</h2>
          <button 
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: 20 }}>
          <button 
            style={tabStyle(activeTab === 'csv')} 
            onClick={() => setActiveTab('csv')}
          >
            � Universal Upload
          </button>
          <button 
            style={tabStyle(activeTab === 'text')} 
            onClick={() => setActiveTab('text')}
          >
            📝 Text Input
          </button>
          <button 
            style={tabStyle(activeTab === 'json')} 
            onClick={() => setActiveTab('json')}
          >
            🔗 Scryfall JSON
          </button>
          <button 
            style={tabStyle(activeTab === 'camera')} 
            onClick={() => setActiveTab('camera')}
          >
            📷 Camera Scan
          </button>
        </div>

        {/* File Upload Tab */}
        {activeTab === 'csv' && (
          <div>
            <h3>Upload Files - Universal Format Support</h3>
            <p style={{ color: '#666', marginBottom: 16 }}>
              <strong>📄 Document Formats:</strong> Word (.docx, .doc), OpenDocument (.odt), Apple Pages (.pages), RTF, Markdown (.md), HTML, XML, LaTeX (.tex)<br />
              <strong>📊 Spreadsheet Formats:</strong> Excel (.xlsx, .xlsm, .xlsb, .xls), OpenDocument (.ods), Apple Numbers (.numbers), CSV<br />
              <strong>📋 Text Formats:</strong> Plain Text (.txt), Rich Text (.rtf), Markdown (.md)<br />
              <strong>🔗 Data Formats:</strong> JSON (Scryfall), DEK (XML deck format), PDF (experimental)<br />
              <strong>🏆 Platform Support:</strong> <strong>Moxfield</strong>, <strong>Archidekt</strong>, <strong>EchoMTG</strong>, <strong>MTGGoldfish</strong>, <strong>Deckbox</strong>, and virtually any platform<br />
              <strong>💎 All data preserved:</strong> Quantities, Names, Sets, Foil, Condition, Language, Signed, Artist Proof, Altered Art, Misprints, Promos, Prices, Tradelist/Wishlist counts, Notes, Tags, and more!
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.dek,.json,.docx,.doc,.odt,.pages,.rtf,.md,.pdf,.html,.htm,.xml,.tex,.xlsx,.xlsm,.xlsb,.xls,.ods,.numbers"
              onChange={handleFileUpload}
              style={{
                marginBottom: 16,
                padding: 8,
                border: '1px solid #ddd',
                borderRadius: 4,
                width: '100%'
              }}
            />

            {csvData && (
              <div>
                <h4>CSV Preview:</h4>
                <textarea
                  value={csvData.substring(0, 500) + (csvData.length > 500 ? '...' : '')}
                  readOnly
                  style={{
                    width: '100%',
                    height: 100,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    padding: 8,
                    fontFamily: 'monospace',
                    fontSize: 12
                  }}
                />
                <button 
                  onClick={() => processCSVData(csvData)}
                  disabled={isProcessing}
                  style={{
                    marginTop: 8,
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: isProcessing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isProcessing ? 'Processing...' : 'Parse CSV'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Text Tab */}
        {activeTab === 'text' && (
          <div>
            <h3>Paste Text</h3>
            <p style={{ color: '#666', marginBottom: 16 }}>
              Paste any text containing card lists. Supports various formats like:
              <br />• "4x Lightning Bolt"
              <br />• "1 Black Lotus (LEA)"
              <br />• "Mox Pearl - Alpha - Near Mint"
              <br />• "3 Counterspell [ICE]"
            </p>
            
            <textarea
              value={textData}
              onChange={(e) => setTextData(e.target.value)}
              placeholder="Paste your card list here..."
              style={{
                width: '100%',
                height: 200,
                border: '1px solid #ddd',
                borderRadius: 4,
                padding: 12,
                fontSize: 14,
                fontFamily: 'monospace'
              }}
            />
            
            <button 
              onClick={() => processTextData(textData)}
              disabled={isProcessing || !textData.trim()}
              style={{
                marginTop: 12,
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: isProcessing || !textData.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {isProcessing ? 'Processing...' : 'Parse Text'}
            </button>
          </div>
        )}

        {/* JSON Tab */}
        {activeTab === 'json' && (
          <div>
            <h3>Scryfall JSON Data</h3>
            <p style={{ color: '#666', marginBottom: 16 }}>
              Upload JSON file or paste Scryfall API JSON data.
              <br />• Single card: <code>https://api.scryfall.com/cards/[id]</code>
              <br />• Search results: <code>https://api.scryfall.com/cards/search?q=...</code>
              <br />• Collection data with quantities
            </p>
            
            <input
              type="file"
              accept=".json"
              onChange={handleJSONFileUpload}
              style={{
                marginBottom: 16,
                padding: 8,
                border: '1px solid #ddd',
                borderRadius: 4,
                width: '100%'
              }}
            />
            
            <textarea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder='Paste Scryfall JSON here... (e.g., {"object": "card", "name": "Lightning Bolt", ...})'
              style={{
                width: '100%',
                height: 200,
                border: '1px solid #ddd',
                borderRadius: 4,
                padding: 12,
                fontSize: 12,
                fontFamily: 'monospace'
              }}
            />
            
            <button 
              onClick={() => processJSONData(jsonData)}
              disabled={isProcessing || !jsonData.trim()}
              style={{
                marginTop: 12,
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: isProcessing || !jsonData.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {isProcessing ? 'Processing...' : 'Parse JSON'}
            </button>
          </div>
        )}

        {/* Camera Tab */}
        {activeTab === 'camera' && (
          <div>
            <h3>Camera Scan</h3>
            <p style={{ color: '#666', marginBottom: 16 }}>
              Use your device's camera to scan card lists from paper, screens, or binders.
            </p>

            {!isCameraActive ? (
              <button 
                onClick={startCamera}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 16
                }}
              >
                📷 Start Camera
              </button>
            ) : (
              <div>
                <div style={{ 
                  position: 'relative',
                  width: '100%',
                  maxWidth: 500,
                  margin: '0 auto 16px'
                }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{
                      width: '100%',
                      height: 'auto',
                      border: '2px solid #007bff',
                      borderRadius: 8
                    }}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
                
                <div style={{ textAlign: 'center', gap: 12, display: 'flex', justifyContent: 'center' }}>
                  <button 
                    onClick={captureImage}
                    disabled={isProcessing}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: isProcessing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isProcessing ? 'Processing...' : '📸 Capture'}
                  </button>
                  
                  <button 
                    onClick={stopCamera}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                  >
                    Stop Camera
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preview Section */}
        {showPreview && previewData.length > 0 && (
          <div style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 24 }}>
            <h3>Import Preview ({previewData.length} cards)</h3>
            <div style={{ 
              maxHeight: 200, 
              overflow: 'auto', 
              border: '1px solid #ddd', 
              borderRadius: 4,
              backgroundColor: '#f8f9fa'
            }}>
              <table style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: '#e9ecef', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '8px 4px', textAlign: 'left' }}>Qty</th>
                    <th style={{ padding: '8px 4px', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '8px 4px', textAlign: 'left' }}>Set</th>
                    <th style={{ padding: '8px 4px', textAlign: 'left' }}>Rarity</th>
                    <th style={{ padding: '8px 4px', textAlign: 'left' }}>Condition</th>
                    <th style={{ padding: '8px 4px', textAlign: 'left' }}>Special</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 50).map((card, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '4px' }}>{card.quantity}</td>
                      <td style={{ padding: '4px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {card.name}
                        {card.collector_number && (
                          <span style={{ color: '#666', fontSize: '11px' }}> #{card.collector_number}</span>
                        )}
                      </td>
                      <td style={{ padding: '4px', fontSize: '12px' }}>
                        {card.set_name || card.set || 'Unknown'}
                        {card.set && card.set_name && (
                          <div style={{ color: '#666', fontSize: '10px' }}>({card.set.toUpperCase()})</div>
                        )}
                      </td>
                      <td style={{ padding: '4px' }}>
                        {card.rarity ? (
                          <span style={{ 
                            color: getRarityColor(card.rarity),
                            fontWeight: 'bold',
                            textTransform: 'capitalize',
                            fontSize: '11px'
                          }}>
                            {card.rarity}
                          </span>
                        ) : 'Unknown'}
                      </td>
                      <td style={{ padding: '4px', fontSize: '11px' }}>
                        {card.condition || 'NM'}
                        {card.language && card.language !== 'EN' && (
                          <div style={{ color: '#666' }}>{card.language}</div>
                        )}
                      </td>
                      <td style={{ padding: '4px', fontSize: '10px' }}>
                        {getSpecialAttributes(card)}
                      </td>
                    </tr>
                  ))}
                  {previewData.length > 50 && (
                    <tr>
                      <td colSpan="4" style={{ padding: 8, textAlign: 'center', fontStyle: 'italic' }}>
                        ... and {previewData.length - 50} more cards
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button 
                onClick={() => setShowPreview(false)}
                style={{
                  marginRight: 8,
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleImport}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Import {previewData.length} Cards
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}