const express = require('express');
const router = express.Router();
const beneficiaryController = require('../controllers/beneficiaryController');
const { verifyJWT, validateObjectId } = require('../middleware/auth');

router.get('/:id/beneficiaries', verifyJWT, validateObjectId('id'), beneficiaryController.getBeneficiaries);
router.post('/:id/beneficiaries', verifyJWT, validateObjectId('id'), beneficiaryController.addBeneficiary);
router.patch('/:id/beneficiaries/:userId', verifyJWT, validateObjectId('id'), validateObjectId('userId'), beneficiaryController.updateBeneficiaryComment);
router.delete('/:id/beneficiaries/:userId', verifyJWT, validateObjectId('id'), validateObjectId('userId'), beneficiaryController.removeBeneficiary);

module.exports = router;
