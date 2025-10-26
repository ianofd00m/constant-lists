import React, { useState, useEffect, useRef } from 'react';
import ColorIdentity from './ColorIdentity';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

// expects onSelect(commanderObj) and value (commanderObj or string)
export default function CommanderSuggest({ value, onChange, onSelect, exclude = [], filter = '' }) {
  const [query, setQuery] = useState(value?.name || value || '');
  const debouncedQuery = useDebounce(query, 400);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(value || null);
  const [partner, setPartner] = useState(null);
  const [background, setBackground] = useState(null);
  const [friend, setFriend] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef();

  useEffect(() => { setQuery(value?.name || value || ''); setSelected(value || null); }, [value]);

  // Compose the search query for Scryfall
  function buildQuery(base, opts = {}) {
    let q = base.trim();
    // Use exact match if input is quoted or looks like a full name
    if (q.startsWith('!')) {
      // Already exact
    } else if (/^[a-zA-Z0-9'\-,. ]+$/.test(q) && q.length > 2 && !q.endsWith(' ')) {
      // If input is a single word or likely a full name, use name: prefix
      q = `name:${q}`;
    }
    if (opts.type === 'background') {
      if (!/t:background/.test(q)) q += ' t:background';
    } else if (opts.type === 'partner' || opts.type === 'friends forever') {
      if (!/is:commander/.test(q)) q += ' is:commander';
    } else {
      if (!/is:commander/.test(q)) q += ' is:commander';
    }
    return q;
  }

  // Only trigger fetch when debouncedQuery, filter, or exclude contents actually change
  const lastFetchRef = useRef({ q: '', filter: '', exclude: '' });
  useEffect(() => {
    const excludeKey = JSON.stringify(exclude || []);
    if (
      lastFetchRef.current.q === debouncedQuery &&
      lastFetchRef.current.filter === filter &&
      lastFetchRef.current.exclude === excludeKey
    ) {
      return;
    }
    lastFetchRef.current = { q: debouncedQuery, filter, exclude: excludeKey };
    if (!debouncedQuery) { setSuggestions([]); setError(''); return; }
    setLoading(true);
    setError('');
    const q = buildQuery(debouncedQuery, { type: filter });
    const apiUrl = import.meta.env.VITE_API_URL;
    
    // Try local API first, fall back to Scryfall direct if it fails
    fetch(`${apiUrl}/api/cards/search?q=${encodeURIComponent(q)}`)
      .then(async r => {
        if (r.status === 429) throw new Error('Too many searches, please wait a moment.');
        const data = await r.json();
        if (data.error && data.error.includes('not found')) {
          // Local API failed, try Scryfall directly
          throw new Error('Local API failed');
        }
        return data;
      })
      .catch(async localError => {
        // Fallback to Scryfall direct
        console.log('Local API failed, trying Scryfall direct:', localError.message);
        const scryfallQuery = q.includes('game:') ? q : `${q} game:paper`;
        const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(scryfallQuery)}`);
        if (response.status === 429) throw new Error('Too many searches, please wait a moment.');
        return response.json();
      })
      .then(data => {
        let results = data.data || [];
        // Exclude any cards in the exclude list (by name)
        if (exclude && exclude.length > 0) {
          results = results.filter(card => !exclude.includes(card.name));
        }
        // For partner/friends forever, filter to only those with the same mechanic
        if (filter === 'partner') {
          results = results.filter(card => /partner(?! with)/i.test(card.oracle_text || ''));
        } else if (filter === 'friends forever') {
          results = results.filter(card => /friends forever/i.test(card.oracle_text || ''));
        } else if (filter === 'background') {
          results = results.filter(card => /background/i.test(card.type_line || ''));
        }
        // --- Tighter search logic: prioritize prefix matches, then substring matches ---
        const qLower = debouncedQuery.trim().toLowerCase();
        const prefixMatches = results.filter(card => typeof card.name === 'string' && card.name.toLowerCase().startsWith(qLower));
        const substringMatches = results.filter(card =>
          typeof card.name === 'string' && !card.name.toLowerCase().startsWith(qLower) && card.name.toLowerCase().includes(qLower)
        );
        results = [...prefixMatches, ...substringMatches];
        setSuggestions(results);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [debouncedQuery, filter, JSON.stringify(exclude)]);

  // Helper: detect partner mechanic
  function getPartnerType(card) {
    if (!card) return null;
    const oracle = card.oracle_text || '';
    if (/partner with ([^\n]+)/i.test(oracle)) return { type: 'partner with', partner: oracle.match(/partner with ([^\n]+)/i)[1].trim() };
    if (/choose a background/i.test(oracle)) return { type: 'background' };
    if (/friends forever/i.test(oracle)) return { type: 'friends forever' };
    if (/partner(?! with)/i.test(oracle)) return { type: 'partner' };
    return null;
  }

  // When a commander is selected
  function handleSelect(card) {
    setQuery(card.name);
    setSelected(card);
    setShow(false);
    setLoading(false); // Clear any loading state when selecting
    onSelect && onSelect(card);
    // Reset all partner/background/friend fields
    setPartner(null);
    setBackground(null);
    setFriend(null);
    // Handle partner types
    const partnerType = getPartnerType(card);
    if (partnerType?.type === 'partner with') {
      setPartner({ name: partnerType.partner });
    }
  }

  // For partner with, fetch the partner card if needed
  useEffect(() => {
    if (selected && partner && partner.name && !partner.id) {
      setLoading(true);
      const q = buildQuery(partner.name, { type: 'partner' });
      const apiUrl = import.meta.env.VITE_API_URL;
      fetch(`${apiUrl}/api/cards/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(data => {
          if (data.data && data.data.length > 0) setPartner(data.data[0]);
          setLoading(false);
        })
        .catch(e => {
          console.error('Partner fetch error:', e);
          setLoading(false);
        });
    }
  }, [selected, partner]);

  return (
    <div style={{ position: 'relative', marginBottom: 12 }}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => { setQuery(e.target.value); onChange && onChange(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 120)}
        placeholder={filter === 'background' ? 'Choose a background' : filter === 'partner' ? 'Who is their partner?' : filter === 'friends forever' ? 'Who is their friend forever?' : 'Who is your Commander?'}
        style={{ 
          width: '100%', 
          padding: 10, 
          borderRadius: 4, 
          border: '1px solid #ddd',
          backgroundColor: 'white',
          fontSize: '14px',
          color: '#333'
        }}
      />
      {show && suggestions.length > 0 && (
        <div style={{ 
          position: 'absolute', 
          top: 42, 
          left: 0, 
          right: 0, 
          background: '#fff', 
          border: '1px solid #ddd', 
          borderRadius: 4, 
          zIndex: 10, 
          maxHeight: 220, 
          overflowY: 'auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {suggestions.map(card => (
            <div
              key={card.id}
              onMouseDown={() => handleSelect(card)}
              style={{ 
                padding: 12, 
                cursor: 'pointer', 
                borderBottom: '1px solid #eee',
                fontSize: '14px',
                color: '#333',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
            >
              <span style={{ flex: 1 }}>{card.name}</span>
              <ColorIdentity colorIdentity={card.color_identity} size={16} />
            </div>
          ))}
        </div>
      )}
      {loading && <div style={{ 
        position: 'absolute', 
        top: 42, 
        left: 0, 
        background: '#fff', 
        padding: 12, 
        border: '1px solid #ddd', 
        borderRadius: 4, 
        zIndex: 10,
        fontSize: '14px',
        color: '#666',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>Loading...</div>}
      {/* Partner, Partner With, Background, Friends Forever fields */}
      {selected && getPartnerType(selected)?.type === 'partner' && (
        <div style={{ marginTop: 10 }}>
          <CommanderSuggest value={partner} onChange={setPartner} onSelect={setPartner} exclude={[selected.name]} filter="partner" />
        </div>
      )}
      {selected && getPartnerType(selected)?.type === 'partner with' && partner && (
        <div style={{ marginTop: 10 }}>
          {partner.id && (
            <span style={{ marginLeft: 8, color: '#1976d2', cursor: 'pointer' }} onClick={() => setPartner(null)}>[remove]</span>
          )}
        </div>
      )}
      {selected && getPartnerType(selected)?.type === 'background' && (
        <div style={{ marginTop: 10 }}>
          <CommanderSuggest value={background} onChange={setBackground} onSelect={setBackground} filter="background" />
        </div>
      )}
      {selected && getPartnerType(selected)?.type === 'friends forever' && (
        <div style={{ marginTop: 10 }}>
          <CommanderSuggest value={friend} onChange={setFriend} onSelect={setFriend} exclude={[selected.name]} filter="friends forever" />
        </div>
      )}
    </div>
  );
}
