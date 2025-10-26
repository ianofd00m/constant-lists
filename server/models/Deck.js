const mongoose = require('mongoose');

const DeckSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  format: {
    type: String,
    required: true,
    enum: ['Standard', 'Pioneer', 'Modern', 'Legacy', 'Vintage', 'Commander / EDH', 'Pauper', 'Historic', 'Alchemy', 'Explorer']
  },
  colors: [{
    type: String,
    enum: ['W', 'U', 'B', 'R', 'G', 'C']
  }],
  cardCount: {
    type: Number,
    default: 0,
    min: 0
  },
  cards: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    isCommander: { type: Boolean, default: false },
    printing: { type: String }, // Scryfall ID for specific printing
    scryfallCard: {
      id: String,
      name: String,
      mana_cost: String,
      cmc: Number,
      type_line: String,
      color_identity: [String],
      colors: [String],
      set: String,
      set_name: String,
      collector_number: String,
      rarity: String,
      image_uris: {
        small: String,
        normal: String,
        large: String
      },
      prices: {
        usd: String,
        usd_foil: String,
        eur: String,
        eur_foil: String
      }
    }
  }],
  commander: [{
    name: String,
    card: {
      id: String,
      name: String,
      color_identity: [String]
    }
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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

// Update the updatedAt field on save
DeckSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Deck', DeckSchema);
