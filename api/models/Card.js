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
    enum: ['active', 'inactive'],
    default: 'inactive'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Card', cardSchema);
