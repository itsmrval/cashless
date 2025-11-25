const Transaction = require('../models/Transaction');
const Card = require('../models/Card');
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

    // Parse pagination parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const defaultLimit = isAdmin ? 30 : 20;
    const limit = Math.min(parseInt(req.query.limit) || defaultLimit, 100);
    const skip = (page - 1) * limit;

    let query = {};
    let totalItems;
    let transactions;

    if (isAdmin && !requestedUserId) {
      // Admin viewing all transactions
      [totalItems, transactions] = await Promise.all([
        Transaction.countDocuments(),
        Transaction.find()
          .populate('source_user_id', 'name username')
          .populate('destination_user_id', 'name username')
          .sort({ date: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
      ]);
    } else {
      // User viewing their transactions or admin viewing specific user
      const targetUserId = (isAdmin && requestedUserId) ? requestedUserId : req.user.userId;

      query = {
        $or: [
          { source_user_id: targetUserId },
          { destination_user_id: targetUserId }
        ]
      };

      [totalItems, transactions] = await Promise.all([
        Transaction.countDocuments(query),
        Transaction.find(query)
          .populate('source_user_id', 'name username')
          .populate('destination_user_id', 'name username')
          .sort({ date: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
      ]);
    }

    // Build pagination metadata
    const totalPages = Math.ceil(totalItems / limit);
    const pagination = {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };

    res.json({
      transactions: transactions.map(formatTransaction),
      pagination
    });
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

    if (source_card_id) {
      const card = await Card.findById(source_card_id);
      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }
      if (card.status !== 'active') {
        return res.status(403).json({ error: 'Card must be active to perform transactions' });
      }
    }

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
