const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Card = require('../models/Card');
const Challenge = require('../models/Challenge');
const { JWT_SECRET } = require('../middleware/auth');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const register = async (req, res) => {
  try {
    const { username, password, name } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password, and name are required' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      password: hashedPassword,
      name,
      role: 'admin'
    });

    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getChallenge = async (req, res) => {
  try {
    const { card_id } = req.query;

    if (!card_id) {
      return res.status(400).json({ error: 'card_id is required' });
    }

    const card = await Card.findById(card_id);

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (!card.secret_key) {
      return res.status(403).json({ error: 'Card has no secret key registered' });
    }

    const challenge = crypto.randomBytes(32).toString('hex');

    await Challenge.create({ challenge, card_id });

    res.json({ challenge });
  } catch (error) {
    console.error('Challenge generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const cardAuth = async (req, res) => {
  try {
    const { card_id, signature, challenge } = req.body;

    if (!card_id || !signature || !challenge) {
      return res.status(400).json({
        error: 'card_id, signature, and challenge are required'
      });
    }

    const card = await Card.findById(card_id).populate('user_id');

    if (!card) {
      return res.status(401).json({ error: 'Invalid card' });
    }

    if (card.status !== 'active') {
      return res.status(403).json({ error: 'Card is not active' });
    }

    if (!card.secret_key) {
      return res.status(403).json({ error: 'Card has no secret key registered' });
    }

    if (!card.user_id) {
      return res.status(403).json({
        error: 'Card not assigned to user',
        code: 'CARD_UNASSIGNED'
      });
    }

    const challengeDoc = await Challenge.findOne({ challenge, card_id });

    if (!challengeDoc) {
      return res.status(401).json({ error: 'Invalid or expired challenge' });
    }

    await Challenge.deleteOne({ _id: challengeDoc._id });

    const secretKeyBuffer = Buffer.from(card.secret_key, 'hex');
    const challengeBuffer = Buffer.from(challenge, 'hex');
    const signatureBuffer = Buffer.from(signature, 'base64');

    console.log('=== HMAC Debug ===');
    console.log('Card ID:', card_id);
    console.log('Secret Key (hex):', card.secret_key);
    console.log('Challenge (hex):', challenge);
    console.log('Signature (base64):', signature);
    console.log('Secret Key Buffer:', secretKeyBuffer.toString('hex'), '(' + secretKeyBuffer.length + ' bytes)');
    console.log('Challenge Buffer:', challengeBuffer.toString('hex'), '(' + challengeBuffer.length + ' bytes)');
    console.log('Signature Buffer:', signatureBuffer.toString('hex'), '(' + signatureBuffer.length + ' bytes)');

    if (secretKeyBuffer.length !== 32 || challengeBuffer.length !== 32 || signatureBuffer.length !== 32) {
      console.log('ERROR: Invalid buffer lengths');
      return res.status(401).json({ error: 'Invalid signature format' });
    }

    const hmac = crypto.createHmac('sha256', secretKeyBuffer);
    hmac.update(challengeBuffer);
    const expectedSignature = hmac.digest();

    console.log('Expected Signature:', expectedSignature.toString('hex'));
    console.log('Received Signature:', signatureBuffer.toString('hex'));
    console.log('Match:', crypto.timingSafeEqual(signatureBuffer, expectedSignature));

    if (!crypto.timingSafeEqual(signatureBuffer, expectedSignature)) {
      console.log('ERROR: Signature mismatch!');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('SUCCESS: Signature verified');

    const token = jwt.sign(
      {
        cardId: card._id,
        userId: card.user_id._id,
        username: card.user_id.username,
        role: 'user',
        type: 'card'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      card_id: card._id,
      user_id: card.user_id._id,
      username: card.user_id.username,
      expires_in: 3600
    });
  } catch (error) {
    console.error('Card auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  login,
  register,
  getChallenge,
  cardAuth
};
