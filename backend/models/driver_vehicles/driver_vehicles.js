const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    brandName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    brandLogo: {
      url: {
        type: String,
        trim: true,
      },
      public_id: {
        type: String,
        trim: true,
      },
    },
    vehicleNames: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ✅ Indexing for faster search by brand or name

const Vehicles = mongoose.model('Vehicles', vehicleSchema);
module.exports = Vehicles;
