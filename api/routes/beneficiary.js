const express = require('express');
const router = express.Router();
const beneficiaryController = require('../controllers/beneficiaryController');
const { verifyJWT } = require('../middleware/auth');

router.get('/me/beneficiaries', verifyJWT, beneficiaryController.getBeneficiaries);
router.post('/me/beneficiaries', verifyJWT, beneficiaryController.addBeneficiary);
router.patch('/me/beneficiaries/:userId', verifyJWT, beneficiaryController.updateBeneficiaryComment);
router.delete('/me/beneficiaries/:userId', verifyJWT, beneficiaryController.removeBeneficiary);

module.exports = router;
