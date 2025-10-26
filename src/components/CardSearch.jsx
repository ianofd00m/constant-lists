import React, { useState } from 'react';

// Helper function to proxy Scryfall images through our backend to avoid CORS issues
const getProxiedImageUrl = (originalUrl) => {
  if (!originalUrl) return null;
  
  // Only proxy Scryfall image URLs
  if (originalUrl.startsWith('https://cards.scryfall.io/') || originalUrl.startsWith('https://c1.scryfall.com/')) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${apiUrl}/api/cards/image-proxy?url=${encodeURIComponent(originalUrl)}`;
  }
  
  return originalUrl;
};

export default function CardSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [noResultsMsg, setNoResultsMsg] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNoResultsMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/cards/typesense-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setResults(data);
        if (data.length === 0) setNoResultsMsg('No cards found matching your search criteria.');
        else setNoResultsMsg('');
      } else if (data && data.message) {
        setResults([]);
        setNoResultsMsg(data.message);
      } else {
        setResults([]);
        setNoResultsMsg('No results found.');
      }
    } catch (err) {
      setError('Error fetching cards.');
      setResults([]);
      setNoResultsMsg('');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Card Search</h2>
      <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for a card..."
          style={{ padding: 8, width: 250 }}
        />
        <button type="submit" style={{ marginLeft: 8, padding: 8 }}>Search</button>
      </form>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {noResultsMsg && !loading && <div style={{ color: 'gray' }}>{noResultsMsg}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {results.map(card => (
          <div key={card.id || card._id} style={{ border: '1px solid #ccc', padding: 8, width: 200 }}>
            <div><strong>{card.name}</strong></div>
            {card.image_uris && (
              <img src={getProxiedImageUrl(card.image_uris.small)} alt={card.name} style={{ width: '100%' }} />
            )}
            <div style={{ fontSize: 12, color: '#555' }}>{card.set_name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
