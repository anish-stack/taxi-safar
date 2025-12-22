// models/RateConfiguration.js
const mongoose = require('mongoose');

const vehicleRateSchema = new mongoose.Schema({
  vehicleKey: {
    type: String,
    required: true,
    enum: ['mini', 'sedan', 'suv', 'prime_suv'],
    unique: true
  },
  vehicleName: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  seating: {
    type: String,
    required: true
  },
  example: {
    type: String,
    required: true
  },
  maxRatePerKm: {
    type: Number,
    required: true,
    min: 0
  },
  minRatePerKm: {
    type: Number,
    required: true,
    min: 0
  },
  stopChargePerStop: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  allowedInAllInclusive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const rateConfigurationSchema = new mongoose.Schema({
  maxCommissionPercentage: {
    type: Number,
    required: true,
    default: 35,
    min: 0,
    max: 100
  },
  minCommissionPercentage: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100
  },
  maxStopsAllowed: {
    type: Number,
    required: true,
    default: 3,
    min: 0,
    max: 10
  },
  vehicleRates: [vehicleRateSchema],
  extraCharges: {
    baseTollCharge: {
      type: Number,
      default: 0
    },
    baseParkingCharge: {
      type: Number,
      default: 0
    },
    nightChargePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    nightChargeStartTime: {
      type: String,
      default: "22:00"
    },
    nightChargeEndTime: {
      type: String,
      default: "06:00"
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
rateConfigurationSchema.index({ isActive: 1 });
vehicleRateSchema.index({ vehicleKey: 1, isActive: 1 });

// Virtual for checking if commission is within limits
rateConfigurationSchema.methods.isCommissionValid = function(commissionAmount, totalAmount) {
  if (!totalAmount || totalAmount <= 0) return false;
  
  const percentage = (commissionAmount / totalAmount) * 100;
  return percentage >= this.minCommissionPercentage && percentage <= this.maxCommissionPercentage + 1;
};

// Virtual for calculating max commission amount
rateConfigurationSchema.methods.getMaxCommissionAmount = function(totalAmount) {
  return (totalAmount * this.maxCommissionPercentage) / 100;
};

// Virtual for validating rate per km
rateConfigurationSchema.methods.isRatePerKmValid = function(vehicleKey, ratePerKm) {
  const vehicleRate = this.vehicleRates.find(v => v.vehicleKey === vehicleKey && v.isActive);
  if (!vehicleRate) return false;
  
  return ratePerKm >= vehicleRate.minRatePerKm && ratePerKm <= vehicleRate.maxRatePerKm;
};

// Get vehicle rate details
rateConfigurationSchema.methods.getVehicleRate = function(vehicleKey) {
  return this.vehicleRates.find(v => v.vehicleKey === vehicleKey && v.isActive);
};

module.exports = mongoose.model('RateConfiguration', rateConfigurationSchema);
