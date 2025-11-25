const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  source_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  destination_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  source_card_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card',
    default: null
  },
  operation: {
    type: Number,
    required: true,
    min: [0, 'Operation amount must be positive']
  },
  date: {
    type: Date,
    default: Date.now
  },
  comment: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Add indices for pagination performance
transactionSchema.index({ date: -1 });
transactionSchema.index({ source_user_id: 1, date: -1 });
transactionSchema.index({ destination_user_id: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
