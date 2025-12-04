const mongoose = require("mongoose");

const aadharDetailsSchema = new mongoose.Schema(
  {
    contact_number: {
      type: String,
    },

    otp_mobile: {
      type: String,
    },

    // Auto set expiry time = now + 5 minutes
    otp_expire_time_mobile: {
      type: Date,
      default: () => new Date(Date.now() + 5 * 60 * 1000),
    },

    mobile_verify: {
      type: Boolean,
      default: false,
    },

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
