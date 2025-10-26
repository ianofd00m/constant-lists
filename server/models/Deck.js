const mongoose = require('mongoose');

const DeckSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  cards: [{
    name: String,
    quantity: Number,
    category: {
      type: String,
      enum: ['mainboard', 'sideboard', 'maybeboard'],
      default: 'mainboard'
    }
  }],
  format: {
    type: String,
    default: 'casual'
  },
  colors: [String],
  userId: {
    type: String,
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Deck', DeckSchema);
