// Run this in the browser console
console.log("Running detailed style check...");

// Find all card preview containers
const containers = document.querySelectorAll('.card-preview-container');
console.log("Card preview containers found:", containers.length);

if (containers.length > 0) {
  const container = containers[0];
  console.log("Container styles:", {
    position: window.getComputedStyle(container).position,
    display: window.getComputedStyle(container).display,
    border: window.getComputedStyle(container).border
  });
  
  // Check if our CSS file is loaded
  const styleSheets = Array.from(document.styleSheets);
  const ourSheet = styleSheets.find(sheet => 
    sheet.href?.includes('CardPreview.css')
  );
  console.log("CardPreview.css found:", !!ourSheet);
  
  // Find all overlays
  const overlays = container.querySelectorAll('.fresh-foil-overlay');
  console.log("Foil overlays found:", overlays.length);
  
  if (overlays.length > 0) {
    const overlay = overlays[0];
    console.log("Overlay styles:", {
      position: window.getComputedStyle(overlay).position,
      zIndex: window.getComputedStyle(overlay).zIndex,
      background: window.getComputedStyle(overlay).background,
      opacity: window.getComputedStyle(overlay).opacity,
      mixBlendMode: window.getComputedStyle(overlay).mixBlendMode,
      animation: window.getComputedStyle(overlay).animation
    });
  } else {
    console.log("No overlays found - checking HTML structure:");
    console.log(container.innerHTML);
  }
} else {
  console.log("No card preview containers found - searching whole document:");
  const allElements = document.querySelectorAll('*');
  const relevantElements = Array.from(allElements).filter(el => 
    el.className?.includes('preview') || 
    el.className?.includes('foil') || 
    el.className?.includes('card')
  );
  console.log("Found elements with relevant classes:", 
    relevantElements.map(el => ({
      className: el.className,
      id: el.id,
      tagName: el.tagName
    }))
  );
}
