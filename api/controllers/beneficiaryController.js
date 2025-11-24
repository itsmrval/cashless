const User = require('../models/User');

const getBeneficiaries = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
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
    const { user_id, comment } = req.body;
    const currentUserId = req.user.userId;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    if (user_id === currentUserId) {
      return res.status(400).json({ error: 'Cannot add yourself as beneficiary' });
    }

    const targetUser = await User.findById(user_id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ error: 'Current user not found' });
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

    const populatedUser = await User.findById(currentUserId)
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
    const { userId } = req.params;
    const { comment } = req.body;
    const currentUserId = req.user.userId;

    const user = await User.findById(currentUserId);
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

    const populatedUser = await User.findById(currentUserId)
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
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    const user = await User.findById(currentUserId);
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
