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
    enum: ['waiting_activation', 'active', 'inactive', 'blocked'],
    default: 'inactive'
  },
  puk: {
    type: String,
    default: null
  },
  public_key: {
    type: String,
    unique: true,
    sparse: true,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Card', cardSchema);
