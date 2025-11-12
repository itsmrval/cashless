const Card = require('../models/Card');
const bcrypt = require('bcrypt');

exports.getAllCards = async (req, res) => {
  try {
    const cards = await Card.find().populate('user_id', 'name');
    res.json(cards);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getCardByCardId = async (req, res) => {
  try {
    const card = await Card.findById(req.params.card_id).populate('user_id', 'name');
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(card);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.createCard = async (req, res) => {
  try {
    const card = new Card({
      comment: req.body?.comment || ''
    });
    await card.save();
    res.status(201).json(card);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateCard = async (req, res) => {
  try {
    const updates = {};
    if (req.body.comment !== undefined) updates.comment = req.body.comment;
    if (req.body.status !== undefined) updates.status = req.body.status;

    const card = await Card.findByIdAndUpdate(
      req.params.card_id,
      updates,
      { new: true, runValidators: true }
    ).populate('user_id', 'name');

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(card);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.assignCard = async (req, res) => {
  try {
    const card = await Card.findByIdAndUpdate(
      req.params.card_id,
      { user_id: req.body.user_id },
      { new: true, runValidators: true }
    ).populate('user_id', 'name');

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(card);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.unassignCard = async (req, res) => {
  try {
    const card = await Card.findByIdAndUpdate(
      req.params.card_id,
      { user_id: null },
      { new: true }
    );

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(card);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteCard = async (req, res) => {
  try {
    const card = await Card.findByIdAndDelete(req.params.card_id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.setupPin = async (req, res) => {
  try {
    const { pin } = req.body;

    // Validate PIN format (4 digits)
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }

    // Find the card
    const card = await Card.findById(req.params.card_id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Check if card is in waiting_activation state
    if (card.status !== 'waiting_activation') {
      return res.status(400).json({ error: 'Card is not in waiting_activation state' });
    }

    // Hash the PIN
    const saltRounds = 10;
    const pin_hash = await bcrypt.hash(pin, saltRounds);

    // Update card with PIN and activate
    card.pin_hash = pin_hash;
    card.pin_set_at = new Date();
    card.status = 'active';
    await card.save();

    res.json({
      success: true,
      message: 'PIN setup successful',
      status: card.status
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.verifyPin = async (req, res) => {
  try {
    const { pin } = req.body;

    // Validate PIN format (4 digits)
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }

    // Find the card
    const card = await Card.findById(req.params.card_id).populate('user_id', 'name');
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Check if card is active
    if (card.status !== 'active') {
      return res.status(400).json({
        error: 'Card is not active',
        status: card.status
      });
    }

    // Check if PIN is set
    if (!card.pin_hash) {
      return res.status(400).json({ error: 'PIN not set for this card' });
    }

    // Verify PIN
    const isValid = await bcrypt.compare(pin, card.pin_hash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid PIN'
      });
    }

    // PIN is valid
    res.json({
      success: true,
      message: 'PIN verified successfully',
      user: card.user_id ? {
        _id: card.user_id._id,
        name: card.user_id.name
      } : null
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
