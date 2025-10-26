// Final validation test
console.clear();
console.log('🎯 FINAL FOIL VALIDATION');
console.log('='.repeat(40));

// This should show visible foil overlays now
const containers = document.querySelectorAll('.card-preview-container');
console.log(`Found ${containers.length} card containers`);

let successCount = 0;
let failCount = 0;

containers.forEach((container, i) => {
  const overlay = container.querySelector('.foil-overlay');
  if (overlay) {
    const isActive = overlay.classList.contains('foil-active');
    const opacity = window.getComputedStyle(overlay).opacity;
    const isVisible = parseFloat(opacity) > 0.5;
    
    if (isActive && isVisible) {
      console.log(`✅ Container ${i}: WORKING (opacity: ${opacity})`);
      successCount++;
    } else {
      console.log(`❌ Container ${i}: FAILED (active: ${isActive}, opacity: ${opacity})`);
      failCount++;
    }
  } else {
    console.log(`❌ Container ${i}: NO OVERLAY`);
    failCount++;
  }
});

console.log(`
📊 RESULTS: ${successCount} working, ${failCount} failed`);

if (successCount > 0) {
  console.log('🎉 SUCCESS: Foil overlays are working!');
} else {
  console.log('💥 FAILURE: No working foil overlays found');
}
