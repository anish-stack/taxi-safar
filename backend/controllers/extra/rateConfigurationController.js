const RateConfiguration = require('../../models/extra/RateConfiguration');


exports.getRateConfiguration = async (req, res) => {
  try {
    let config = await RateConfiguration.findOne({ isActive: true })
      .select('-__v')
      .lean();

    // If no config exists, create default one
    if (!config) {
      config = await RateConfiguration.create({
        maxCommissionPercentage: 35,
        minCommissionPercentage: 0,
        maxStopsAllowed: 3,
        vehicleRates: [
          {
            vehicleKey: 'mini',
            vehicleName: 'Mini',
            displayName: 'Mini',
            seating: '4+1',
            example: 'WagonR',
            maxRatePerKm: 22,
            minRatePerKm: 10,
            stopChargePerStop: 50,
            allowedInAllInclusive: true,
            sortOrder: 1,
            isActive: true
          },
          {
            vehicleKey: 'sedan',
            vehicleName: 'Sedan',
            displayName: 'Sedan',
            seating: '4+1',
            example: 'Swift Dzire',
            maxRatePerKm: 25,
            minRatePerKm: 12,
            stopChargePerStop: 75,
            allowedInAllInclusive: true,
            sortOrder: 2,
            isActive: true
          },
          {
            vehicleKey: 'suv',
            vehicleName: 'SUV',
            displayName: 'SUV',
            seating: '6+1',
            example: 'Ertiga',
            maxRatePerKm: 30,
            minRatePerKm: 15,
            stopChargePerStop: 100,
            allowedInAllInclusive: true,
            sortOrder: 3,
            isActive: true
          },
          {
            vehicleKey: 'prime_suv',
            vehicleName: 'Prime SUV',
            displayName: 'Prime SUV',
            seating: '6+1',
            example: 'Innova Crysta',
            maxRatePerKm: 40,
            minRatePerKm: 20,
            stopChargePerStop: 150,
            allowedInAllInclusive: false,
            sortOrder: 4,
            isActive: true
          }
        ],
        extraCharges: {
          baseTollCharge: 0,
          baseParkingCharge: 0,
          nightChargePercentage: 20,
          nightChargeStartTime: "22:00",
          nightChargeEndTime: "06:00"
        },
        isActive: true
      });
    }

    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Get rate configuration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rate configuration',
      error: error.message
    });
  }
};


exports.updateRateConfiguration = async (req, res) => {
  try {
    const {
      maxCommissionPercentage,
      minCommissionPercentage,
      maxStopsAllowed,
      vehicleRates,
      extraCharges
    } = req.body;

    // Validation
    if (maxCommissionPercentage < minCommissionPercentage) {
      return res.status(400).json({
        success: false,
        message: 'Max commission cannot be less than min commission'
      });
    }

    // Find and update existing config or create new
    let config = await RateConfiguration.findOne({ isActive: true });

    if (config) {
      // Update existing
      if (maxCommissionPercentage !== undefined) {
        config.maxCommissionPercentage = maxCommissionPercentage;
      }
      if (minCommissionPercentage !== undefined) {
        config.minCommissionPercentage = minCommissionPercentage;
      }
      if (maxStopsAllowed !== undefined) {
        config.maxStopsAllowed = maxStopsAllowed;
      }
      if (vehicleRates) {
        config.vehicleRates = vehicleRates;
      }
      if (extraCharges) {
        config.extraCharges = { ...config.extraCharges, ...extraCharges };
      }
      
      config.lastUpdatedBy = req.user._id;
      await config.save();
    } else {
      // Create new
      config = await RateConfiguration.create({
        ...req.body,
        lastUpdatedBy: req.user._id,
        isActive: true
      });
    }

    res.status(200).json({
      success: true,
      message: 'Rate configuration updated successfully',
      data: config
    });
  } catch (error) {
    console.error('Update rate configuration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update rate configuration',
      error: error.message
    });
  }
};


exports.validateBookingRates = async (req, res) => {
  try {
    const {
      vehicleKey,
      totalAmount,
      commissionAmount,
      distance,
      stopsCount
    } = req.body;

    const config = await RateConfiguration.findOne({ isActive: true });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Rate configuration not found'
      });
    }

    const validationErrors = [];

    // Validate commission
    if (!config.isCommissionValid(commissionAmount, totalAmount)) {
      validationErrors.push({
        field: 'commission',
        message: `Commission must be between ${config.minCommissionPercentage}% and ${config.maxCommissionPercentage}%`,
        maxAllowed: config.getMaxCommissionAmount(totalAmount)
      });
    }

    // Validate rate per km
    if (distance && distance > 0) {
      const ratePerKm = totalAmount / distance;
      const vehicleRate = config.getVehicleRate(vehicleKey);

      if (vehicleRate && !config.isRatePerKmValid(vehicleKey, ratePerKm)) {
        validationErrors.push({
          field: 'ratePerKm',
          message: `Rate per km for ${vehicleRate.displayName} must be between ₹${vehicleRate.minRatePerKm} and ₹${vehicleRate.maxRatePerKm}`,
          currentRate: ratePerKm,
          minRate: vehicleRate.minRatePerKm,
          maxRate: vehicleRate.maxRatePerKm,
          suggestedAmount: vehicleRate.maxRatePerKm * distance
        });
      }
    }

    // Validate stops count
    if (stopsCount > config.maxStopsAllowed) {
      validationErrors.push({
        field: 'stops',
        message: `Maximum ${config.maxStopsAllowed} stops allowed`,
        maxAllowed: config.maxStopsAllowed
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(200).json({
      success: true,
      message: 'Validation passed',
      data: {
        isValid: true
      }
    });
  } catch (error) {
    console.error('Validate booking rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Validation failed',
      error: error.message
    });
  }
};


exports.getVehicleRates = async (req, res) => {
  try {
    const config = await RateConfiguration.findOne({ isActive: true })
      .select('vehicleRates maxStopsAllowed')
      .lean();

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Rate configuration not found'
      });
    }

    // Filter only active vehicles and sort
    const activeVehicles = config.vehicleRates
      .filter(v => v.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    res.status(200).json({
      success: true,
      data: {
        vehicles: activeVehicles,
        maxStopsAllowed: config.maxStopsAllowed
      }
    });
  } catch (error) {
    console.error('Get vehicle rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicle rates',
      error: error.message
    });
  }
};


exports.updateVehicleRate = async (req, res) => {
  try {
    const { vehicleKey } = req.params;
    const updateData = req.body;

    const config = await RateConfiguration.findOne({ isActive: true });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Rate configuration not found'
      });
    }

    const vehicleIndex = config.vehicleRates.findIndex(
      v => v.vehicleKey === vehicleKey
    );

    if (vehicleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle rate not found'
      });
    }

    // Update vehicle rate
    config.vehicleRates[vehicleIndex] = {
      ...config.vehicleRates[vehicleIndex].toObject(),
      ...updateData
    };

    config.lastUpdatedBy = req.user._id;
    await config.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle rate updated successfully',
      data: config.vehicleRates[vehicleIndex]
    });
  } catch (error) {
    console.error('Update vehicle rate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle rate',
      error: error.message
    });
  }
};
