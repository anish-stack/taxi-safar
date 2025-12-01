const mongoose = require("mongoose");

const aadharDetailsSchema = new mongoose.Schema(
  {
    aadhar_verification_data: {
      type: mongoose.Schema.Types.Mixed,
    },

    dl_data: {
      type: mongoose.Schema.Types.Mixed,
    },
    device_id: {
      type: String,
    },

    dl_data_expires: {
      type: Date,
    },

    isDlisExpired: {
      type: Boolean,
      default: false,
    },
    expiredDataHour: {
      type: Date,
      required: true,
    },

    isExpired: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AadharDetails", aadharDetailsSchema);
