const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid');

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 24);

const cardSchema = new mongoose.Schema({
  card_id: {
    type: String,
    required: true,
    unique: true,
    default: () => nanoid()
  },
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
    enum: ['active', 'inactive', 'lost'],
    default: 'active'
  }
}, {
  timestamps: true
});

cardSchema.index({ card_id: 1 });

module.exports = mongoose.model('Card', cardSchema);
