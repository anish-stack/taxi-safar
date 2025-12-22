const mongoose = require("mongoose");

const DrivingLicenseSchema = new mongoose.Schema(
  {
    licenseNumber: { type: String, required: true, index: true },
    dob: { type: String },
    name: { type: String },
    deviceId: { type: String },

    status: {
      type: String,
      enum: ["VERIFIED", "PENDING_VERIFICATION", "FAILED"],
      default: "PENDING_VERIFICATION",
    },

    retryCount: { type: Number, default: 0 },
    nextRetryAt: { type: Date },

    verifiedAt: { type: Date },
    rawResponse: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DrivingLicense", DrivingLicenseSchema);
