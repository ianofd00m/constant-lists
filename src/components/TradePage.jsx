import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function TradePage() {
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);

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
            <div key={trade.id} className="trade-item">
              <p><strong>Trade with:</strong> {trade.type === 'collaborative' ? trade.recipient : 'Self'}</p>
              <p><strong>Date:</strong> {trade.date}</p>
              <Link to={`/trades/${trade.id}`}>View Trade</Link>
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
            <div key={trade.id} className="trade-item">
              <p><strong>Trade with:</strong> {trade.type === 'collaborative' ? trade.recipient : 'Self'}</p>
              <p><strong>Date:</strong> {trade.date}</p>
              <Link to={`/trades/${trade.id}`}>View Trade</Link>
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
