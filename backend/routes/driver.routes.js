
const express = require('express');
const { registerDriver, sendAadharOtp, verifyAadharOtp, resendOnlyAadharOtp, login, resendOtp, getDriverDetailsViaId, addVehicleDetails, addBankDetails, getBankNames, verifyOtp, getDriverDetails, updateCurrentRadius } = require('../controllers/registration/driver.reg');
const { upload } = require('../middlewares/multer');
const { refreshAccessToken } = require('../controllers/registration/refreshAccessToken');
const protect = require('../middlewares/auth');
const { toggleStatus, updateDriverLocation, getDriverLocation } = require('../controllers/driver/driver.helper.controller');
const router = express.Router();

router.post('/register-driver',upload.any(),registerDriver)
router.post('/send-aadhar-verify-otp',upload.any(),sendAadharOtp)
router.post('/aadhar-verify',verifyAadharOtp)
router.post('/re-send-aadhar-verify-otp',resendOnlyAadharOtp)
router.post('/login',login)
router.post('/verify-login-otp',verifyOtp)
router.post('/resend-otp',resendOtp)
router.get('/driver-details/:driverId',getDriverDetailsViaId)
router.get('/driver-details',protect,getDriverDetails)
router.put('/update-radius',protect,updateCurrentRadius)

router.post('/add-vehicle-details/:driverId',upload.any(),addVehicleDetails)
router.post('/add-bank-details/:driverId',addBankDetails)
router.get('/bank-names',getBankNames)
router.post('/refresh-token',refreshAccessToken)



// Helper things
router.post('/toggle-status',protect,toggleStatus)
router.post('/update-driver-location',protect,updateDriverLocation)
router.get('/get-driver-location/:id',getDriverLocation)



module.exports = router;
