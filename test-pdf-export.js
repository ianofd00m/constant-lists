// Quick PDF Export Test
// This is a simplified version to test basic PDF generation without complex image loading

export const testSimplePDFExport = async (deck, cards) => {
  console.log('[TEST EXPORT] Starting simple PDF test...');
  
  if (!deck || !cards || cards.length === 0) {
    console.log('[TEST EXPORT] No data to export');
    return;
  }
  
  // Import libraries dynamically
  const jsPDF = (await import('jspdf')).default;
  const html2canvas = (await import('html2canvas')).default;
  
  // Create simple HTML content
  let htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; width: 800px;">
      <h1>${deck.name || "Test Deck"}</h1>
      <h2>Main Deck (${cards.length} cards)</h2>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
  `;
  
  // Add first 20 cards for testing
  cards.slice(0, 20).forEach(card => {
    const cardName = card.name || card.card?.name || 'Unknown Card';
    htmlContent += `
      <div style="border: 1px solid #ccc; padding: 10px; text-align: center;">
        <div style="width: 150px; height: 200px; background: #f0f0f0; margin: 0 auto 10px auto; display: flex; align-items: center; justify-content: center; font-size: 12px;">
          Card Image<br/>${cardName}
        </div>
        <div style="font-weight: bold; font-size: 12px;">
          ${cardName}
        </div>
      </div>
    `;
  });
  
  htmlContent += `
      </div>
    </div>
  `;
  
  // Create temporary container
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.innerHTML = htmlContent;
  document.body.appendChild(tempContainer);
  
  try {
    // Generate canvas
    const canvas = await html2canvas(tempContainer, {
      width: 800,
      height: tempContainer.scrollHeight,
      backgroundColor: '#ffffff'
    });
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    
    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    pdf.save('test-export.pdf');
    
    console.log('[TEST EXPORT] Simple test completed successfully');
    
  } catch (error) {
    console.error('[TEST EXPORT] Error:', error);
  } finally {
    document.body.removeChild(tempContainer);
  }
};
