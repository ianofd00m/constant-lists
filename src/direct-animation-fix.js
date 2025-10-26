/**
 * Direct Animation Fix
 * 
 * This script directly injects animations into the DOM elements
 * by bypassing CSS and using direct style manipulation.
 * 
 * To use: Add this script as the last import in your App.jsx file.
 */

// Define our animation in a style element to ensure it exists
const injectKeyframes = () => {
  // Create a style element if it doesn't already exist
  let styleEl = document.getElementById('foil-keyframes-direct');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'foil-keyframes-direct';
    styleEl.textContent = `
      @keyframes foilShimmerDirect {
        0%, 100% { background-position: 0% 50%; }
        25% { background-position: 100% 0%; }
        50% { background-position: 100% 100%; }
        75% { background-position: 0% 100%; }
      }
    `;
    document.head.appendChild(styleEl);
    console.log('[Foil Fix] Injected keyframes definition');
  }
};

// Function to apply the animation to a specific element
const applyAnimationToElement = (element) => {
  // Get or create the before pseudo-element
  let beforeEl = element.querySelector('.foil-animation-element');
  
  if (!beforeEl) {
    beforeEl = document.createElement('div');
    beforeEl.classList.add('foil-animation-element');
    
    // Style the element to match the ::before pseudo-element
    beforeEl.style.position = 'absolute';
    beforeEl.style.top = '0';
    beforeEl.style.left = '0';
    beforeEl.style.right = '0';
    beforeEl.style.bottom = '0';
    beforeEl.style.borderRadius = '10px';
    beforeEl.style.zIndex = '1';
    beforeEl.style.pointerEvents = 'none';
    
    // Add the gradient
    beforeEl.style.background = `
      linear-gradient(110deg,
        rgba(255, 190, 220, 0.6),
        rgba(200, 190, 255, 0.6),
        rgba(190, 220, 255, 0.6),
        rgba(190, 255, 220, 0.6),
        rgba(220, 255, 190, 0.6),
        rgba(255, 220, 190, 0.6),
        rgba(255, 190, 220, 0.6)
      )
    `;
    beforeEl.style.backgroundSize = '700% 700%';
    
    // Apply filter and blend mode
    beforeEl.style.filter = 'blur(1.5px)';
    beforeEl.style.mixBlendMode = 'overlay';
    
    // Add to the element
    element.style.position = element.style.position || 'relative';
    element.prepend(beforeEl);
  }
  
  // Always ensure animation properties are set
  beforeEl.style.animationName = 'foilShimmerDirect';
  beforeEl.style.animationDuration = '15s';
  beforeEl.style.animationTimingFunction = 'ease-in-out';
  beforeEl.style.animationIterationCount = 'infinite';
  beforeEl.style.animationDirection = 'alternate';
  beforeEl.style.willChange = 'background-position';
  beforeEl.style.transform = 'translateZ(0)';
  
  // Only change these properties based on foil status
  if (element.classList.contains('foil-active-border')) {
    beforeEl.style.opacity = '0.4';
    beforeEl.style.animationPlayState = 'running';
  } else {
    beforeEl.style.opacity = '0';
    beforeEl.style.animationPlayState = 'paused';
  }
  
  return beforeEl;
};

// Initialize animations for all current foil elements
const initializeAnimations = () => {
  // Inject the keyframes first
  injectKeyframes();
  
  // Get all existing elements that might need animations
  const previewContainers = document.querySelectorAll('.card-preview-container');
  previewContainers.forEach(element => {
    applyAnimationToElement(element);
  });
  
  const printingContainers = document.querySelectorAll('.current-printing-container');
  printingContainers.forEach(element => {
    applyAnimationToElement(element);
  });
  
  console.log('[Foil Fix] Applied direct animations to existing elements');
};

// Watch for new elements or class changes
const setupMutationObserver = () => {
  const observer = new MutationObserver((mutations) => {
    let needsUpdate = false;
    
    mutations.forEach(mutation => {
      // If classes changed, check if we need to update the animation state
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.classList.contains('card-preview-container') || 
            target.classList.contains('current-printing-container')) {
          applyAnimationToElement(target);
          needsUpdate = true;
        }
      }
      
      // If DOM structure changed, check for new elements
      if (mutation.type === 'childList') {
        const addedContainers = [...mutation.addedNodes].filter(node => 
          node.nodeType === Node.ELEMENT_NODE && 
          (node.classList?.contains('card-preview-container') || 
           node.classList?.contains('current-printing-container'))
        );
        
        if (addedContainers.length > 0) {
          addedContainers.forEach(element => {
            applyAnimationToElement(element);
          });
          needsUpdate = true;
        }
      }
    });
    
    if (needsUpdate) {
      console.log('[Foil Fix] Updated animations due to DOM changes');
    }
  });
  
  // Observe the entire document for changes
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
    childList: true,
    subtree: true
  });
  
  return observer;
};

// Run immediately for initial setup
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Foil Fix] DOM loaded, initializing direct animation fix');
  initializeAnimations();
  setupMutationObserver();
});

// Also run now in case the DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAnimations);
} else {
  initializeAnimations();
  setupMutationObserver();
}
