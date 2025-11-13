const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /v1/auth/login - Login and get JWT token (for web UI)
router.post('/login', authController.login);

// POST /v1/auth/register - Register new user (optional)
router.post('/register', authController.register);

// POST /v1/auth/card - Card authentication using keypair signature
router.post('/card', authController.cardAuth);

module.exports = router;
