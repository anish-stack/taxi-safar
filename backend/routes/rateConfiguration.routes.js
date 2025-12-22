
const express = require('express');
const router = express.Router();
const {
  getRateConfiguration,
  updateRateConfiguration,
  validateBookingRates,
  getVehicleRates,
  updateVehicleRate
} = require('../controllers/extra/rateConfigurationController');
const protect = require('../middlewares/auth');

// Public routes
router.get('/', getRateConfiguration);
router.get('/vehicle-rates', getVehicleRates);
router.post('/validate', validateBookingRates);

// Admin routes
router.put('/', protect, updateRateConfiguration);
router.put('/vehicle-rate/:vehicleKey', protect, updateVehicleRate);

module.exports = router;