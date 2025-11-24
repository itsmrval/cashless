const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Card = require('../models/Card');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Authentication error' });
  }
};

const verifyCardToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No card token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.type !== 'card') {
        return res.status(403).json({ error: 'Invalid token type' });
      }

      const card = await Card.findById(decoded.cardId);

      if (!card) {
        return res.status(401).json({ error: 'Invalid card token' });
      }

      if (card.status !== 'active') {
        return res.status(403).json({ error: 'Card is not active' });
      }

      req.card = card;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Authentication error' });
  }
};

const verifyAny = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.type === 'card') {
        const card = await Card.findById(decoded.cardId);
        if (!card) {
          return res.status(401).json({ error: 'Invalid card token' });
        }
        if (card.status !== 'active') {
          return res.status(403).json({ error: 'Card is not active' });
        }
        req.card = card;
      } else {
        req.user = decoded;
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Authentication error' });
  }
};

const verifyAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id) {
      return res.status(400).json({ error: `${paramName} parameter is required` });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    next();
  };
};

module.exports = {
  verifyJWT,
  verifyCardToken,
  verifyAny,
  verifyAdmin,
  validateObjectId,
  JWT_SECRET
};
