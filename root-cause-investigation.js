// Root Cause Investigation - Search Dropdown State Corruption
console.log('🔍 Starting root cause investigation...');

// Track React state corruption patterns
let stateCorruptionTracker = {
  searchEvents: [],
  dropdownRenders: [],
  clickEvents: [],
  stateChanges: [],
  memoryLeaks: [],
  startTime: Date.now()
};

// Monitor React DevTools if available
function checkReactDevTools() {
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('⚛️ React DevTools detected');
    const reactVersion = window.React?.version || 'Unknown';
    console.log(`   React version: ${reactVersion}`);
    
    // Check for React state issues
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    console.log(`   Registered renderers: ${hook.renderers?.size || 0}`);
    console.log(`   React fiber roots: ${hook.getFiberRoots ? hook.getFiberRoots(1)?.size || 0 : 'Unknown'}`);
  } else {
    console.log('⚠️ React DevTools not available');
  }
}

// Monitor memory usage patterns
function checkMemoryUsage() {
  if (performance.memory) {
    const memory = performance.memory;
    console.log('💾 Memory usage:');
    console.log(`   Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Limit: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
    
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit
    };
  }
  return null;
}

// Monitor DOM mutation patterns
function setupDOMMutationMonitoring() {
  console.log('👁️ Setting up DOM mutation monitoring...');
  
  let mutationCount = 0;
  let suspiciousPatterns = [];
  
  const observer = new MutationObserver(function(mutations) {
    mutationCount++;
    
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        const addedNodes = Array.from(mutation.addedNodes);
        const removedNodes = Array.from(mutation.removedNodes);
        
        // Look for search result nodes
        const addedSearchResults = addedNodes.filter(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return false;
          const text = node.textContent?.trim() || '';
          return node.tagName === 'DIV' && 
                 node.className === '' && 
                 text.length > 0 && 
                 text.length < 100 && 
                 node.style?.cursor === 'pointer';
        });
        
        const removedSearchResults = removedNodes.filter(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return false;
          const text = node.textContent?.trim() || '';
          return node.tagName === 'DIV' && 
                 node.className === '' && 
                 text.length > 0 && 
                 text.length < 100;
        });
        
        if (addedSearchResults.length > 0 || removedSearchResults.length > 0) {
          const pattern = {
            timestamp: Date.now(),
            added: addedSearchResults.length,
            removed: removedSearchResults.length,
            addedTexts: addedSearchResults.map(n => n.textContent?.trim()),
            removedTexts: removedSearchResults.map(n => n.textContent?.trim()),
            totalMutations: mutationCount
          };
          
          suspiciousPatterns.push(pattern);
          
          // Detect potential memory leak pattern
          if (addedSearchResults.length > removedSearchResults.length) {
            console.warn(`⚠️ Potential DOM leak: Added ${addedSearchResults.length}, removed ${removedSearchResults.length}`);
            console.log(`   Added: ${pattern.addedTexts.join(', ')}`);
            console.log(`   Removed: ${pattern.removedTexts.join(', ')}`);
          }
        }
      }
    });
    
    // Check for excessive mutations
    if (mutationCount % 100 === 0) {
      console.log(`📊 DOM mutations: ${mutationCount} total, ${suspiciousPatterns.length} search-related`);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });
  
  return { observer, getSuspiciousPatterns: () => suspiciousPatterns };
}

// Monitor React component re-renders
function setupReactRenderMonitoring() {
  console.log('⚛️ Setting up React render monitoring...');
  
  // Intercept console.log to catch React debug messages
  const originalLog = console.log;
  let reactRenderCount = 0;
  let searchRenderCount = 0;
  
  console.log = function(...args) {
    const message = args.join(' ');
    
    // Count dropdown renders
    if (message.includes('🔍 Dropdown rendering with:')) {
      searchRenderCount++;
      
      if (searchRenderCount % 10 === 0) {
        console.warn(`⚠️ High search render count: ${searchRenderCount}`);
      }
    }
    
    // Look for React error patterns
    if (message.includes('Warning:') || message.includes('Error:')) {
      console.error('🔴 React warning/error detected:', message);
    }
    
    return originalLog.apply(console, args);
  };
  
  return { getStats: () => ({ reactRenderCount, searchRenderCount }) };
}

// Monitor click event patterns
function setupClickMonitoring() {
  console.log('🖱️ Setting up click monitoring...');
  
  let clickPatterns = [];
  let failedClicks = 0;
  
  document.addEventListener('click', function(event) {
    const target = event.target;
    const isSearchResult = target.tagName === 'DIV' && 
                          target.className === '' && 
                          target.style?.cursor === 'pointer';
    
    if (isSearchResult) {
      const clickData = {
        timestamp: Date.now(),
        text: target.textContent?.trim(),
        hasEventListeners: !!target.onclick || target.getEventListeners?.('click')?.length > 0,
        isAttachedToDOM: document.contains(target),
        boundingRect: target.getBoundingClientRect(),
        computedStyle: {
          display: window.getComputedStyle(target).display,
          visibility: window.getComputedStyle(target).visibility,
          pointerEvents: window.getComputedStyle(target).pointerEvents
        }
      };
      
      clickPatterns.push(clickData);
      
      // Test if click will likely fail
      setTimeout(() => {
        const searchInput = document.querySelector('input[type="text"]');
        const searchCleared = !searchInput || searchInput.value === '';
        
        if (!searchCleared) {
          failedClicks++;
          console.error(`🔴 Click likely failed on: "${clickData.text}"`);
          console.log('   Element state:', clickData);
        }
      }, 200);
    }
  }, true);
  
  return { getClickPatterns: () => clickPatterns, getFailedClicks: () => failedClicks };
}

// Analyze React component tree
function analyzeReactComponentTree() {
  console.log('🌳 Analyzing React component tree...');
  
  // Look for React root elements
  const reactRoots = document.querySelectorAll('[data-reactroot], #root, [id*="react"]');
  console.log(`   Found ${reactRoots.length} potential React roots`);
  
  // Check for duplicate components
  const searchInputs = document.querySelectorAll('input[type="text"]');
  const dropdowns = document.querySelectorAll('[style*="cursor: pointer"]');
  
  console.log(`   Search inputs: ${searchInputs.length}`);
  console.log(`   Clickable elements: ${dropdowns.length}`);
  
  if (searchInputs.length > 1) {
    console.warn('⚠️ Multiple search inputs detected - possible duplicate components');
  }
  
  // Check for orphaned elements
  const orphanedElements = Array.from(dropdowns).filter(el => {
    const text = el.textContent?.trim();
    return text && text.length > 0 && text.length < 100 && !document.querySelector('input[type="text"]')?.value;
  });
  
  if (orphanedElements.length > 0) {
    console.warn(`⚠️ Found ${orphanedElements.length} potentially orphaned search results`);
    orphanedElements.forEach((el, i) => {
      console.log(`   Orphaned ${i + 1}: "${el.textContent?.trim()}"`);
    });
  }
}

// Main investigation function
function runRootCauseInvestigation() {
  console.log('🔍 Starting comprehensive root cause investigation...');
  
  // Initial state
  checkReactDevTools();
  const initialMemory = checkMemoryUsage();
  analyzeReactComponentTree();
  
  // Set up monitoring
  const domMonitor = setupDOMMutationMonitoring();
  const reactMonitor = setupReactRenderMonitoring();
  const clickMonitor = setupClickMonitoring();
  
  // Periodic health checks
  let checkCount = 0;
  const healthCheckInterval = setInterval(() => {
    checkCount++;
    
    const currentMemory = checkMemoryUsage();
    const clickableElements = document.querySelectorAll('[style*="cursor: pointer"]');
    const searchResults = Array.from(clickableElements).filter(el => {
      const text = el.textContent?.trim();
      return el.tagName === 'DIV' && 
             el.className === '' && 
             text?.length > 0 && 
             text?.length < 100;
    });
    
    console.log(`📊 Health check #${checkCount}:`);
    console.log(`   Total clickable: ${clickableElements.length}`);
    console.log(`   Search results: ${searchResults.length}`);
    console.log(`   Failed clicks: ${clickMonitor.getFailedClicks()}`);
    
    if (currentMemory && initialMemory) {
      const memoryIncrease = currentMemory.used - initialMemory.used;
      console.log(`   Memory change: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // Alert on suspicious conditions
    if (searchResults.length > 10) {
      console.error('🔴 SUSPICIOUS: Too many search results accumulated');
      console.log('   This indicates a state corruption issue');
    }
    
    if (clickMonitor.getFailedClicks() > 3) {
      console.error('🔴 SUSPICIOUS: Multiple click failures detected');
      console.log('   This indicates click handler corruption');
    }
    
  }, 10000); // Every 10 seconds
  
  // Return investigation interface
  return {
    stop: () => {
      clearInterval(healthCheckInterval);
      domMonitor.observer.disconnect();
      console.log('🔍 Investigation stopped');
    },
    getReport: () => ({
      domPatterns: domMonitor.getSuspiciousPatterns(),
      reactStats: reactMonitor.getStats(),
      clickPatterns: clickMonitor.getClickPatterns(),
      failedClicks: clickMonitor.getFailedClicks(),
      totalTime: Date.now() - stateCorruptionTracker.startTime
    }),
    forceCorruptionTest: () => {
      console.log('🧪 Attempting to trigger state corruption...');
      // Rapid search changes to trigger the issue
      const searchInput = document.querySelector('input[type="text"]');
      if (searchInput) {
        const testQueries = ['a', 'ab', 'abc', 'abcd', 'abcde'];
        testQueries.forEach((query, i) => {
          setTimeout(() => {
            searchInput.value = query;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          }, i * 100);
        });
      }
    }
  };
}

// Auto-start investigation
const investigation = runRootCauseInvestigation();

// Expose investigation interface globally
window.investigation = investigation;

console.log('✅ Root cause investigation active');
console.log('💡 Use investigation.getReport() to see current findings');
console.log('💡 Use investigation.forceCorruptionTest() to try to trigger the issue');
console.log('💡 Use investigation.stop() to end monitoring');
