const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  challenge: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  card_id: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300
  }
});

module.exports = mongoose.model('Challenge', challengeSchema);
