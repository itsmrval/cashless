const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');

router.get('/', cardController.getAllCards);
router.post('/', cardController.createCard);
router.get('/:card_id', cardController.getCardByCardId);
router.patch('/:card_id', cardController.updateCard);
router.post('/:card_id/assign', cardController.assignCard);
router.delete('/:card_id/assign', cardController.unassignCard);
router.post('/:card_id/setup-pin', cardController.setupPin);
router.post('/:card_id/verify-pin', cardController.verifyPin);
router.delete('/:card_id', cardController.deleteCard);

module.exports = router;
