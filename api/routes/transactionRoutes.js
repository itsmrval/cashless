const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyAny } = require('../middleware/auth');

router.get('/', verifyAny, transactionController.getTransactions);
router.post('/', verifyAny, transactionController.createTransaction);

module.exports = router;
