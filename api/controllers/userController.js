const User = require('../models/User');
const Card = require('../models/Card');
const Transaction = require('../models/Transaction');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const card = await Card.findOne({ user_id: user._id });
    if (card && card.status === 'blocked') {
      return res.status(403).json({ error: 'Carte bloquée, connexion impossible.' });
    }
    res.json({ user, card });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    // Check if card_id query parameter is provided
    if (req.query.card_id) {
      return getUserByCardId(req, res);
    }

    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getUserByCardId = async (req, res) => {
  try {
    const card = await Card.findById(req.query.card_id).populate('user_id');
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    if (!card.user_id) {
      return res.status(404).json({ error: 'Card not assigned to any user' });
    }
    res.json(card.user_id);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getUser = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const isOwnProfile = req.params.id === req.user.userId;

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, username, password } = req.body;
    
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Name, username and password are required' });
    }

    const user = new User({ name, username, password });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(400).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const isOwnProfile = req.params.id === req.user.userId;

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!isAdmin && req.body.role) {
      return res.status(403).json({ error: 'Cannot change role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.body.name) user.name = req.body.name;
    if (req.body.role && isAdmin) user.role = req.body.role;
    if (req.body.username) user.username = req.body.username;
    if (req.body.password) user.password = req.body.password;

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getUserBalance = async (req, res) => {
  try {
    const userId = req.params.id;
    const isAdmin = req.user.role === 'admin';
    const isOwnProfile = userId === req.user.userId;

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const transactions = await Transaction.find({
      $or: [
        { source_user_id: userId },
        { destination_user_id: userId }
      ]
    });

    const balance = transactions.reduce((sum, t) => {
      const sourceId = t.source_user_id.toString();
      const destId = t.destination_user_id.toString();
      const userIdStr = userId.toString();

      if (sourceId === destId) {
        return sum;
      }

      if (sourceId === userIdStr) {
        return sum - t.operation;
      }

      if (destId === userIdStr) {
        return sum + t.operation;
      }

      return sum;
    }, 0);

    res.json({ balance });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  login,
  getAllUsers,
  getUserByCardId,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserBalance
};
