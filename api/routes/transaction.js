const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyJWT } = require('../middleware/auth');

router.get('/', verifyJWT, transactionController.getTransactions);
router.post('/', verifyJWT, transactionController.createTransaction);
router.patch('/:transactionId/comment', verifyJWT, transactionController.updateTransactionComment);

module.exports = router;
