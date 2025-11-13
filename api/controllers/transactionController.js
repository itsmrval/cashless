const Transaction = require('../models/Transaction');
const Card = require('../models/Card');

const getTransactions = async (req, res) => {
  try {
    const card = req.card;

    const cardData = await Card.findById(card._id).populate('user_id');
    if (!cardData || !cardData.user_id) {
      return res.status(400).json({ error: 'Card not assigned to user' });
    }

    const userId = cardData.user_id._id;

    const transactions = await Transaction.find({
      $or: [
        { source_user_id: userId },
        { destination_user_id: userId }
      ]
    })
      .populate('source_user_id', 'name')
      .populate('destination_user_id', 'name')
      .sort({ date: -1 })
      .limit(50);

    const balance = transactions.reduce((sum, t) => {
      if (t.source_user_id._id.toString() === userId.toString()) {
        return sum - t.operation;
      } else {
        return sum + t.operation;
      }
    }, 0);

    res.json({
      card_id: card._id,
      balance,
      transactions: transactions.map(t => ({
        operation: t.operation,
        source_user_name: t.source_user_id ? t.source_user_id.name : null,
        destination_user_name: t.destination_user_id ? t.destination_user_id.name : null,
        date: t.date
      }))
    });
  } catch (error) {
    console.error('Transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createTransaction = async (req, res) => {
  try {
    const { destination_user_id, operation } = req.body;

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
      source_user_id = req.user.userId;
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

const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('source_user_id', 'name')
      .populate('destination_user_id', 'name')
      .sort({ date: -1 })
      .limit(100);

    res.json(transactions.map(t => ({
      _id: t._id,
      operation: t.operation,
      source_user_name: t.source_user_id ? t.source_user_id.name : null,
      destination_user_name: t.destination_user_id ? t.destination_user_id.name : null,
      source_card_id: t.source_card_id,
      date: t.date
    })));
  } catch (error) {
    console.error('Transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  getAllTransactions
};
