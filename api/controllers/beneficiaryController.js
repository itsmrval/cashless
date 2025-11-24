const User = require('../models/User');
const mongoose = require('mongoose');

const getBeneficiaries = async (req, res) => {
  try {
    const userId = req.params.id;
    const isAdmin = req.user.role === 'admin';
    const isOwnProfile = userId === req.user.userId;

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findById(userId)
      .populate('beneficiaries.user_id', 'name username');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const beneficiaries = user.beneficiaries.map(b => ({
      user_id: b.user_id._id,
      name: b.user_id.name,
      username: b.user_id.username,
      comment: b.comment,
      addedAt: b.addedAt
    }));

    res.json(beneficiaries);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const addBeneficiary = async (req, res) => {
  try {
    const userId = req.params.id;
    const { user_id, comment } = req.body;
    const isAdmin = req.user.role === 'admin';
    const isOwnProfile = userId === req.user.userId;

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    if (user_id === userId) {
      return res.status(400).json({ error: 'Cannot add yourself as beneficiary' });
    }

    const targetUser = await User.findById(user_id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const alreadyExists = user.beneficiaries.some(
      b => b.user_id.toString() === user_id
    );

    if (alreadyExists) {
      return res.status(400).json({ error: 'User already in beneficiaries' });
    }

    user.beneficiaries.push({
      user_id: user_id,
      comment: comment || '',
      addedAt: new Date()
    });

    await user.save();

    const populatedUser = await User.findById(userId)
      .populate('beneficiaries.user_id', 'name username');

    const beneficiaries = populatedUser.beneficiaries.map(b => ({
      user_id: b.user_id._id,
      name: b.user_id.name,
      username: b.user_id.username,
      comment: b.comment,
      addedAt: b.addedAt
    }));

    res.status(201).json(beneficiaries);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateBeneficiaryComment = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { comment } = req.body;
    const isAdmin = req.user.role === 'admin';
    const isOwnProfile = id === req.user.userId;

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const beneficiary = user.beneficiaries.find(
      b => b.user_id.toString() === userId
    );

    if (!beneficiary) {
      return res.status(404).json({ error: 'Beneficiary not found' });
    }

    beneficiary.comment = comment || '';
    await user.save();

    const populatedUser = await User.findById(id)
      .populate('beneficiaries.user_id', 'name username');

    const beneficiaries = populatedUser.beneficiaries.map(b => ({
      user_id: b.user_id._id,
      name: b.user_id.name,
      username: b.user_id.username,
      comment: b.comment,
      addedAt: b.addedAt
    }));

    res.json(beneficiaries);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const removeBeneficiary = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const isAdmin = req.user.role === 'admin';
    const isOwnProfile = id === req.user.userId;

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.beneficiaries = user.beneficiaries.filter(
      b => b.user_id.toString() !== userId
    );

    await user.save();
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getBeneficiaries,
  addBeneficiary,
  updateBeneficiaryComment,
  removeBeneficiary
};
