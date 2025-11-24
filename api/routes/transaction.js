const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyAny, verifyJWT } = require('../middleware/auth');

router.get('/', verifyAny, transactionController.getTransactions);
router.post('/', verifyAny, transactionController.createTransaction);
router.patch('/:transactionId/comment', verifyJWT, transactionController.updateTransactionComment);

module.exports = router;
