// Quick diagnostic script to check color identity filtering
// Run this in the browser console when on the Jason Bright deck page

function diagnoseColorIdentityIssue() {
  console.log('🔬 DIAGNOSING COLOR IDENTITY ISSUE');
  
  // Check if we can access the React component
  const deckComponent = window.deckViewEditComponent || window.React;
  
  // Check what's in the URL
  const currentUrl = window.location.href;
  console.log('Current URL:', currentUrl);
  
  // Try to get deck data from various sources
  console.log('Checking for deck data...');
  
  // Check localStorage for recent deck data
  const recentDecksData = localStorage.getItem('recent-decks');
  if (recentDecksData) {
    try {
      const recentDecks = JSON.parse(recentDecksData);
      console.log('Recent decks from localStorage:', recentDecks);
    } catch (e) {
      console.log('Error parsing recent decks:', e);
    }
  }
  
  // Check for any global variables that might contain deck info
  console.log('Window variables:', Object.keys(window).filter(key => key.toLowerCase().includes('deck')));
  
  // Try to make a test API call to see what's happening
  const deckId = currentUrl.split('/').pop();
  console.log('Extracted deck ID:', deckId);
  
  if (deckId) {
    fetch(`/api/decks/${deckId}`)
      .then(response => response.json())
      .then(deck => {
        console.log('🎯 DECK DATA FROM API:', deck);
        console.log('Commander:', deck.commander);
        console.log('Format:', deck.format);
        
        // Check if this matches Jason Bright deck
        const commanderNames = [];
        if (deck.commander && Array.isArray(deck.commander)) {
          deck.commander.forEach(cmd => {
            const name = cmd.card?.name || cmd.name || cmd;
            if (name) commanderNames.push(name);
          });
        }
        
        console.log('Commander names extracted:', commanderNames);
        
        // Check if Jason Bright is detected
        const hasJasonBright = commanderNames.some(name => 
          name.toLowerCase().includes('jason bright')
        );
        console.log('Has Jason Bright:', hasJasonBright);
        
        // Test color identity calculation manually
        console.log('Manual color identity test for Jason Bright: Should be ["U"]');
      })
      .catch(error => {
        console.error('Error fetching deck:', error);
      });
  }
}

// Auto-run diagnostic
diagnoseColorIdentityIssue();