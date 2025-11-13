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

    if (req.body.comment !== undefined) {
      if (typeof req.body.comment !== 'string') {
        return res.status(400).json({ error: 'comment must be a string' });
      }
      updates.comment = req.body.comment;
    }

    if (req.body.status !== undefined) {
      const validStatuses = ['waiting_activation', 'active', 'inactive'];
      if (!validStatuses.includes(req.body.status)) {
        return res.status(400).json({
          error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
      updates.status = req.body.status;
    }

    if (req.body.puk !== undefined) {
      if (typeof req.body.puk !== 'string') {
        return res.status(400).json({ error: 'puk must be a string' });
      }
      updates.puk = req.body.puk;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

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
    if (!req.body.user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    if (typeof req.body.user_id !== 'string') {
      return res.status(400).json({ error: 'user_id must be a string' });
    }

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
