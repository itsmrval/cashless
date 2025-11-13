const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyCardToken } = require('../middleware/auth');

// GET /v1/transactions - Get transactions for authenticated card
router.get('/', verifyCardToken, transactionController.getTransactions);

module.exports = router;
