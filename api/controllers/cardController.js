const Card = require('../models/Card');

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
    const card = await Card.findOne({ card_id: req.params.card_id }).populate('user_id', 'name');
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
      comment: req.body.comment || ''
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

    const card = await Card.findOneAndUpdate(
      { card_id: req.params.card_id },
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
    const card = await Card.findOneAndUpdate(
      { card_id: req.params.card_id },
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
    const card = await Card.findOneAndUpdate(
      { card_id: req.params.card_id },
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
    const card = await Card.findOneAndDelete({ card_id: req.params.card_id });
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
