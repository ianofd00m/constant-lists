import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function TradePage() {
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);

  // Load saved trades from localStorage on component mount
  useEffect(() => {
    const savedTrades = JSON.parse(localStorage.getItem('savedTrades') || '[]');
    setTrades(savedTrades);
  }, []);

  const handleCreateNewTrade = () => {
    navigate('/trade/new');
  };

  const pendingTrades = trades.filter(t => t.status === 'pending');
  const confirmedTrades = trades.filter(t => t.status === 'confirmed');

  return (
    <div className="container">
      <h1>Trades</h1>
      <button onClick={handleCreateNewTrade} className="btn btn-primary">Create New Trade</button>
      
      <div className="trade-list">
        <h2>Pending Trades</h2>
        {pendingTrades.length > 0 ? (
          pendingTrades.map(trade => (
            <div key={trade.id} className="trade-item" style={{ 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              padding: '15px', 
              marginBottom: '10px',
              backgroundColor: '#f9f9f9'
            }}>
              <p><strong>{trade.name || `${trade.user1_name} & ${trade.user2_name}`}</strong></p>
              <p><strong>Date:</strong> {trade.date}</p>
              <p><strong>Cards:</strong> {trade.user1_name}({(trade.user1_cards || []).length}) & {trade.user2_name}({(trade.user2_cards || []).length})</p>
              <Link to={`/trades/${trade.id}`} style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary" style={{ marginRight: '10px' }}>View/Edit Trade</button>
              </Link>
              <button 
                className="btn btn-danger" 
                onClick={() => {
                  if (confirm('Are you sure you want to delete this trade?')) {
                    const updatedTrades = trades.filter(t => t.id !== trade.id);
                    setTrades(updatedTrades);
                    localStorage.setItem('savedTrades', JSON.stringify(updatedTrades));
                  }
                }}
              >
                Delete
              </button>
            </div>
          ))
        ) : (
          <p>No pending trades.</p>
        )}
      </div>

      <div className="trade-list">
        <h2>Confirmed Trades</h2>
        {confirmedTrades.length > 0 ? (
          confirmedTrades.map(trade => (
            <div key={trade.id} className="trade-item" style={{ 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              padding: '15px', 
              marginBottom: '10px',
              backgroundColor: '#f0f8f0'
            }}>
              <p><strong>{trade.name || `${trade.user1_name} & ${trade.user2_name}`}</strong></p>
              <p><strong>Date:</strong> {trade.date}</p>
              <p><strong>Cards:</strong> {trade.user1_name}({(trade.user1_cards || []).length}) & {trade.user2_name}({(trade.user2_cards || []).length})</p>
              <Link to={`/trades/${trade.id}`} style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary">View Trade</button>
              </Link>
            </div>
          ))
        ) : (
          <p>No confirmed trades.</p>
        )}
      </div>
    </div>
  );
}

export default TradePage;
