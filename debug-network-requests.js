// Network Debug Script
// This script will help monitor network requests when testing quantity updates

function monitorNetworkRequests() {
  console.log('=== MONITORING NETWORK REQUESTS ===');
  
  // Store original fetch to intercept requests
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    // Log all API requests
    if (url && url.includes('/api/decks/')) {
      console.log('🌐 API Request:', {
        url: url,
        method: options?.method || 'GET',
        headers: options?.headers,
        bodyPreview: options?.body ? JSON.stringify(JSON.parse(options.body), null, 2).substring(0, 500) : 'No body'
      });
    }
    
    try {
      const response = await originalFetch(...args);
      
      // Log API responses
      if (url && url.includes('/api/decks/')) {
        console.log('✅ API Response:', {
          url: url,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
        
        // If it's a deck update, try to parse and log the response
        if (options?.method === 'PUT' && response.ok) {
          const clonedResponse = response.clone();
          try {
            const data = await clonedResponse.json();
            console.log('📦 Response data preview:', {
              cardsCount: data.cards?.length || 'unknown',
              name: data.name,
              lastUpdated: data.lastUpdated
            });
          } catch (e) {
            console.log('📦 Could not parse response JSON');
          }
        }
      }
      
      return response;
    } catch (error) {
      if (url && url.includes('/api/decks/')) {
        console.error('❌ API Request failed:', {
          url: url,
          error: error.message
        });
      }
      throw error;
    }
  };
  
  console.log('Network monitoring enabled. All deck API requests will be logged.');
  
  // Return function to restore original fetch
  return function stopMonitoring() {
    window.fetch = originalFetch;
    console.log('Network monitoring disabled.');
  };
}

// Function to check server response after quantity update
function checkServerPersistence(deckId) {
  console.log('=== CHECKING SERVER PERSISTENCE ===');
  
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No auth token found');
    return;
  }
  
  const apiUrl = import.meta.env?.VITE_API_URL || 'http://localhost:3000';
  
  fetch(`${apiUrl}/api/decks/${deckId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('🗂️ Server deck data:', {
      cardsCount: data.cards?.length || 0,
      name: data.name,
      lastUpdated: data.lastUpdated
    });
    
    // Look for Islands specifically
    const islands = data.cards?.filter(card => {
      const name = card.name || card.card?.name;
      return name === 'Island';
    }) || [];
    
    console.log('🏝️ Islands on server:', islands.map(island => ({
      name: island.name || island.card?.name,
      count: island.count,
      quantity: island.quantity
    })));
    
    return data;
  })
  .catch(error => {
    console.error('❌ Failed to fetch server data:', error);
  });
}

// Make functions available globally
window.monitorNetworkRequests = monitorNetworkRequests;
window.checkServerPersistence = checkServerPersistence;

console.log('Network debug functions loaded:');
console.log('- Run monitorNetworkRequests() to start monitoring API calls');
console.log('- Run checkServerPersistence(deckId) to check what the server has stored');