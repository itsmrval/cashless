const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const { verifyJWT } = require('../middleware/auth');

router.get('/', verifyJWT, cardController.getAllCards);
router.post('/', verifyJWT, cardController.createCard);
router.get('/:card_id', verifyJWT, cardController.getCardByCardId);
router.patch('/:card_id', verifyJWT, cardController.updateCard);
router.post('/:card_id/assign', verifyJWT, cardController.assignCard);
router.delete('/:card_id/assign', verifyJWT, cardController.unassignCard);
router.delete('/:card_id', verifyJWT, cardController.deleteCard);

module.exports = router;
