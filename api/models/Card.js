const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  comment: {
    type: String,
    default: ''
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['waiting_activation', 'active', 'inactive'],
    default: 'waiting_activation'
  },
  pin_hash: {
    type: String,
    default: null
  },
  pin_set_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Card', cardSchema);
