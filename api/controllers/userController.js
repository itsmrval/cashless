const User = require('../models/User');
const Card = require('../models/Card');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Trouver la carte de l'utilisateur
    const card = await Card.findOne({ user_id: user._id });
    if (card && card.status === 'blocked') {
      return res.status(403).json({ error: 'Carte bloquée, connexion impossible.' });
    }
    res.json({ user, card });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    // Check if card_id query parameter is provided
    if (req.query.card_id) {
      return exports.getUserByCardId(req, res);
    }

    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getUserByCardId = async (req, res) => {
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

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.createUser = async (req, res) => {
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

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
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
