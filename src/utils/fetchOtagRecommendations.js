// Utility to fetch otag recommendations from the backend
export async function fetchOtagRecommendations(cardList) {
  // cardList: [{ set: 'ltr', collectorNumber: '75' }, ...]
  const apiUrl = import.meta.env.VITE_API_URL;
  const res = await fetch(`${apiUrl}/api/otag-recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cards: cardList })
  });
  if (!res.ok) throw new Error('Failed to fetch otag recommendations');
  const data = await res.json();
  return data.topOtags;
}
