const Transaction = require('../models/Transaction');
const Card = require('../models/Card');

const getTransactions = async (req, res) => {
  try {
    let targetUserId;
    let isAdmin = false;

    if (req.card) {
      const cardData = await Card.findById(req.card._id).populate('user_id');
      if (!cardData || !cardData.user_id) {
        return res.status(400).json({ error: 'Card not assigned to user' });
      }
      targetUserId = cardData.user_id._id;
    } else if (req.user) {
      isAdmin = req.user.role === 'admin';
      const requestedUserId = req.query.userId;

      if (isAdmin && !requestedUserId) {
        const transactions = await Transaction.find()
          .sort({ date: -1 })
          .limit(100);

        return res.json(transactions);
      }

      if (isAdmin && requestedUserId) {
        targetUserId = requestedUserId;
      } else {
        targetUserId = req.user.userId;
      }
    } else {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const transactions = await Transaction.find({
      $or: [
        { source_user_id: targetUserId },
        { destination_user_id: targetUserId }
      ]
    })
      .sort({ date: -1 })
      .limit(50);

    res.json(transactions);
  } catch (error) {
    console.error('Transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createTransaction = async (req, res) => {
  try {
    const { source_user_id: bodySourceUserId, destination_user_id, operation } = req.body;

    if (!destination_user_id || !operation) {
      return res.status(400).json({ error: 'destination_user_id and operation are required' });
    }

    let source_user_id;
    let source_card_id = null;

    if (req.card) {
      const cardData = await Card.findById(req.card._id).populate('user_id');
      if (!cardData || !cardData.user_id) {
        return res.status(400).json({ error: 'Card not assigned to user' });
      }
      source_user_id = cardData.user_id._id;
      source_card_id = req.card._id;
    } else if (req.user) {
      if (req.user.role === 'admin' && bodySourceUserId) {
        source_user_id = bodySourceUserId;
      } else {
        source_user_id = req.user.userId;
      }
    } else {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const transaction = new Transaction({
      source_user_id,
      destination_user_id,
      operation,
      source_card_id
    });

    await transaction.save();

    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getTransactions,
  createTransaction
};
