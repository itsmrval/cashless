const jwt = require('jsonwebtoken');
const Card = require('../models/Card');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to verify JWT tokens for web UI authentication
 */
const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // Add user info to request
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Middleware to verify card tokens (JWT-based after /v1/auth/card authentication)
 */
const verifyCardToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No card token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Check if this is a card token (not a user token)
      if (decoded.type !== 'card') {
        return res.status(403).json({ error: 'Invalid token type' });
      }

      // Get card from database
      const card = await Card.findById(decoded.cardId);

      if (!card) {
        return res.status(401).json({ error: 'Invalid card token' });
      }

      if (card.status !== 'active') {
        return res.status(403).json({ error: 'Card is not active' });
      }

      req.card = card; // Add card info to request
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

module.exports = {
  verifyJWT,
  verifyCardToken,
  verifyAny,
  JWT_SECRET
};
