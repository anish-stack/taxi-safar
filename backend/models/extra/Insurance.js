const mongoose = require("mongoose");

const buyInsuranceSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },

    // Basic Details
    full_name: {
      type: String,
      required: true,
      trim: true,
    },

    contact_number: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, "Invalid phone number"],
    },

    vehicle_number: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    budget: {
      type: Number,
      required: true,
      min: 500, // Optional validation
    },

    insurance_type: {
      type: String,
      enum: ["third_party", "comprehensive", "zero_dep", "unknown"],
      default: "unknown",
    },

    extra_notes: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "processing", "completed", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BuyInsurance", buyInsuranceSchema);
