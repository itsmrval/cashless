const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyJWT } = require('../middleware/auth');

router.post('/login', userController.login);
router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.get('/:id', userController.getUser);
router.post('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
