const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyJWT, verifyAdmin } = require('../middleware/auth');

router.post('/login', userController.login);

router.get('/', verifyJWT, userController.getAllUsers);
router.post('/', verifyJWT, verifyAdmin, userController.createUser);
router.delete('/:id', verifyJWT, verifyAdmin, userController.deleteUser);

router.get('/:id/balance', verifyJWT, userController.getUserBalance);
router.post('/:id/password', verifyJWT, userController.updatePassword);
router.post('/:id/reset-password', verifyJWT, verifyAdmin, userController.adminResetPassword);
router.get('/:id', verifyJWT, userController.getUser);
router.patch('/:id', verifyJWT, userController.updateUser);

module.exports = router;
