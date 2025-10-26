import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function CreateTradeModal({ isOpen, onClose, onTradeCreated }) {
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0]);
  const [tradeType, setTradeType] = useState('self-managed');
  const [recipientUsername, setRecipientUsername] = useState('');
  const [deliveryType, setDeliveryType] = useState('hand-delivery');
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleCreateTrade = () => {
    const newTrade = {
      id: `trade_${Date.now()}`,
      date: tradeDate,
      type: tradeType,
      recipient: tradeType === 'collaborative' ? recipientUsername : 'Self',
      delivery: deliveryType,
      status: 'pending',
      user1_cards: [],
      user2_cards: [],
    };

    if (onTradeCreated) {
      onTradeCreated(newTrade);
    }
    
    navigate(`/trades/${newTrade.id}`);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Create New Trade</h2>
        
        <label htmlFor="trade-date">Trade Start Date:</label>
        <input 
          type="date" 
          id="trade-date" 
          value={tradeDate}
          onChange={(e) => setTradeDate(e.target.value)}
          required 
        />

        <label>Trade Type:</label>
        <div className="button-group">
          <button 
            onClick={() => setTradeType('self-managed')} 
            className={tradeType === 'self-managed' ? 'active' : ''}
          >
            Self-Managed
          </button>
          <button 
            onClick={() => setTradeType('collaborative')} 
            className={tradeType === 'collaborative' ? 'active' : ''}
          >
            Collaborative
          </button>
        </div>

        <label htmlFor="recipient-username">Recipient's Username:</label>
        <input 
          type="text" 
          id="recipient-username" 
          value={recipientUsername}
          onChange={(e) => setRecipientUsername(e.target.value)}
          disabled={tradeType === 'self-managed'}
          placeholder={tradeType === 'self-managed' ? 'N/A for Self-Managed Trades' : 'Enter username'}
        />

        <label>Card Delivery:</label>
        <div className="button-group">
          <button 
            onClick={() => setDeliveryType('hand-delivery')} 
            className={deliveryType === 'hand-delivery' ? 'active' : ''}
          >
            Hand-Delivery
          </button>
          <button 
            onClick={() => setDeliveryType('shipping')} 
            className={deliveryType === 'shipping' ? 'active' : ''}
          >
            Shipping
          </button>
        </div>

        <button onClick={handleCreateTrade} className="btn btn-primary">Create Trade</button>
        <button onClick={onClose} className="btn">Cancel</button>
      </div>
    </div>
  );
}

export default CreateTradeModal;
