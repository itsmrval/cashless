const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyJWT, verifyAdmin, validateObjectId } = require('../middleware/auth');

router.post('/login', userController.login);

router.get('/', verifyJWT, verifyAdmin, userController.getAllUsers);
router.post('/', verifyJWT, verifyAdmin, userController.createUser);
router.delete('/:id', verifyJWT, verifyAdmin, validateObjectId('id'), userController.deleteUser);

router.get('/:id/balance', verifyJWT, validateObjectId('id'), userController.getUserBalance);
router.get('/:id', verifyJWT, validateObjectId('id'), userController.getUser);
router.patch('/:id', verifyJWT, validateObjectId('id'), userController.updateUser);

module.exports = router;
