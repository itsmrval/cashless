const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyCardToken, verifyAny } = require('../middleware/auth');

router.get('/', verifyCardToken, transactionController.getTransactions);
router.post('/', verifyAny, transactionController.createTransaction);

module.exports = router;
