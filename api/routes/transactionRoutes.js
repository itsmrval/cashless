const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyCardToken, verifyAny, verifyJWT } = require('../middleware/auth');

router.get('/', verifyCardToken, transactionController.getTransactions);
router.get('/all', verifyJWT, transactionController.getAllTransactions);
router.post('/', verifyAny, transactionController.createTransaction);

module.exports = router;
