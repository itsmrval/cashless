const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');

router.get('/', cardController.getAllCards);
router.post('/', cardController.createCard);
router.get('/:card_id', cardController.getCardByCardId);
router.patch('/:card_id', cardController.updateCard);
router.put('/:card_id/assign', cardController.assignCard);
router.put('/:card_id/unassign', cardController.unassignCard);
router.delete('/:card_id', cardController.deleteCard);

module.exports = router;
