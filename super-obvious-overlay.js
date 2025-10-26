// Make the overlay IMPOSSIBLE to miss and help locate it
console.log("Making overlay SUPER OBVIOUS...");

const preview = document.querySelector('.card-preview-container');
const overlay = preview.querySelector('.foil-rainbow-overlay');

if (overlay) {
  // Make it flash and move
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 10px;
    z-index: 9999;
    pointer-events: none;
    background: red !important;
    opacity: 0.9 !important;
    animation: flash 0.5s infinite !important;
    border: 5px solid lime !important;
    box-shadow: 0 0 20px yellow !important;
  `;
  
  // Add flashing animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes flash {
      0% { background: red !important; }
      25% { background: orange !important; }
      50% { background: yellow !important; }
      75% { background: lime !important; }
      100% { background: blue !important; }
    }
  `;
  document.head.appendChild(style);
  
  console.log("✅ Overlay is now FLASHING with bright colors and lime border!");
  console.log("Look at the card preview on the LEFT side of your screen");
  console.log("It should be flashing RED/ORANGE/YELLOW/LIME/BLUE with a lime border");
  
  // Also scroll to the preview
  preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
  console.log("📍 Scrolled to the preview location");
  
  // Make the preview container also obvious
  preview.style.border = "10px solid magenta";
  preview.style.boxShadow = "0 0 50px cyan";
  
  console.log("🎯 The preview container now has a MAGENTA border and CYAN glow");
  
} else {
  console.log("❌ Could not find the overlay!");
}

// Also highlight where the preview is
setTimeout(() => {
  console.log("🔍 LOOK FOR:");
  console.log("1. A magenta-bordered box on the LEFT side of the screen");
  console.log("2. Inside it should be The Necrobloom card image");
  console.log("3. Over the card should be a FLASHING overlay with lime border");
  console.log("4. If you see the magenta box but no flashing, there's a z-index issue");
}, 1000);
