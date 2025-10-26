// Script to test the /api/otag-recommendations endpoint
import fetch from 'node-fetch';

async function testOtagRecommendations() {
  const response = await fetch('http://localhost:3001/api/otag-recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cards: [
        { set: 'ltr', collectorNumber: '75' },
        { set: 'sth', collectorNumber: '104' },
        { set: 'neo', collectorNumber: '1' },
        { set: 'mh2', collectorNumber: '1' },
        { set: 'woe', collectorNumber: '1' }
      ]
    })
  });
  const data = await response.json();
  console.log('Top otags:', data.topOtags);
}

testOtagRecommendations();
