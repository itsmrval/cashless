const Transaction = require('../models/Transaction');
const { calculateUserBalance } = require('./userController');

const formatTransaction = (t) => ({
  _id: t._id,
  source_user: t.source_user_id ? {
    id: t.source_user_id._id,
    name: t.source_user_id.name,
    username: t.source_user_id.username
  } : null,
  destination_user: t.destination_user_id ? {
    id: t.destination_user_id._id,
    name: t.destination_user_id.name,
    username: t.destination_user_id.username
  } : null,
  operation: t.operation,
  date: t.date,
  source_card_id: t.source_card_id,
  comment: t.comment || ''
});

const getTransactions = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const isAdmin = req.user.role === 'admin';
    const requestedUserId = req.query.userId;

    if (isAdmin && !requestedUserId) {
      const transactions = await Transaction.find()
        .populate('source_user_id', 'name username')
        .populate('destination_user_id', 'name username')
        .sort({ date: -1 })
        .limit(100)
        .lean();

      return res.json(transactions.map(formatTransaction));
    }

    const targetUserId = (isAdmin && requestedUserId) ? requestedUserId : req.user.userId;

    const transactions = await Transaction.find({
      $or: [
        { source_user_id: targetUserId },
        { destination_user_id: targetUserId }
      ]
    })
      .populate('source_user_id', 'name username')
      .populate('destination_user_id', 'name username')
      .sort({ date: -1 })
      .limit(50)
      .lean();

    res.json(transactions.map(formatTransaction));
  } catch (error) {
    console.error('Transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createTransaction = async (req, res) => {
  try {
    const { source_user_id: bodySourceUserId, destination_user_id, operation, infinite_funds } = req.body;

    if (!destination_user_id || !operation) {
      return res.status(400).json({ error: 'destination_user_id and operation are required' });
    }

    if (operation < 0) {
      return res.status(400).json({ error: 'Operation amount must be positive' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const isAdmin = req.user.role === 'admin';
    const isCardToken = req.user.type === 'card';

    const source_user_id = (isAdmin && bodySourceUserId) ? bodySourceUserId : req.user.userId;
    const source_card_id = isCardToken ? req.user.cardId : null;

    if (infinite_funds && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can bypass balance checks' });
    }

    if (!infinite_funds) {
      const currentBalance = await calculateUserBalance(source_user_id);
      const newBalance = currentBalance - operation;

      if (newBalance < 0) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }
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

const updateTransactionComment = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { comment } = req.body;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const isAdmin = req.user && req.user.role === 'admin';
    const isSourceUser = req.user && transaction.source_user_id.toString() === req.user.userId;
    const isDestinationUser = req.user && transaction.destination_user_id.toString() === req.user.userId;

    if (!isAdmin && !isSourceUser && !isDestinationUser) {
      return res.status(403).json({ error: 'Access denied' });
    }

    transaction.comment = comment || '';
    await transaction.save();

    const populatedTransaction = await Transaction.findById(transactionId)
      .populate('source_user_id', 'name username')
      .populate('destination_user_id', 'name username')
      .lean();

    res.json(formatTransaction(populatedTransaction));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  updateTransactionComment
};
