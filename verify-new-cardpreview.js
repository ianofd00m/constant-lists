// Run this in the browser console to verify the new CardPreview component is active
console.log("Running CardPreview verification...");

// Check for our debug logs
const recentLogs = console.log.toString().includes("🚨🚨🚨 CARDPREVIEW FUNCTION CALLED 🚨🚨🚨");
console.log("Debug logs present:", recentLogs);

// Check for our test classes
const overlays = document.querySelectorAll('.fresh-foil-overlay');
console.log("Found foil overlays:", overlays.length);

// Log styles of any found overlays
overlays.forEach((overlay, i) => {
  console.log(`Overlay ${i + 1} computed styles:`, {
    border: window.getComputedStyle(overlay).border,
    backgroundColor: window.getComputedStyle(overlay).backgroundColor,
    opacity: window.getComputedStyle(overlay).opacity,
    animation: window.getComputedStyle(overlay).animation
  });
});

// Force show an overlay if none found
if (overlays.length === 0) {
  console.log("No overlays found, attempting to force one...");
  const cardPreviews = document.querySelectorAll('[class*="card-preview"]');
  console.log("Found card previews:", cardPreviews.length);
  
  if (cardPreviews.length > 0) {
    const testOverlay = document.createElement('div');
    testOverlay.className = 'fresh-foil-overlay force-added';
    cardPreviews[0].appendChild(testOverlay);
    console.log("Force-added test overlay. If you see this but no overlay appears, check z-index and CSS loading");
  }
}
