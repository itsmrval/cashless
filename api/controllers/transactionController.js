/**
 * Get transactions for authenticated card
 * Returns only the card_id for now
 */
const getTransactions = async (req, res) => {
  try {
    // req.card is set by verifyCardToken middleware
    const card = req.card;

    res.json({
      card_id: card._id
    });
  } catch (error) {
    console.error('Transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getTransactions
};
