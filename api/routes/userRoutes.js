const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyJWT } = require('../middleware/auth');

router.get('/', verifyJWT, userController.getAllUsers);
router.post('/', verifyJWT, userController.createUser);
router.get('/:id', verifyJWT, userController.getUser);
router.post('/:id', verifyJWT, userController.updateUser);
router.delete('/:id', verifyJWT, userController.deleteUser);

module.exports = router;
