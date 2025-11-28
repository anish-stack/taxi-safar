const mongoose = require("mongoose");

const borderTaxPaySchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },

    vehicle_number: {
      type: String,
      required: true,
      trim: true,
    },

    border_state: {
      type: String,
      required: true,
      trim: true,
    },

    trip_type: {
      type: String,
      enum: ["one_way", "round_trip"],
      required: true,
    },

    tax_amount: {
      type: Number,
    },

    paid_on: {
      type: Date,
      default: Date.now,
    },

    slip_image: {
      url: { type: String },
      public_id: { type: String },
    },

    remarks: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },


    reviewed_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexing for fast queries
borderTaxPaySchema.index({ driver: 1, status: 1 });
borderTaxPaySchema.index({ createdAt: -1 });

module.exports = mongoose.model("BorderTaxPay", borderTaxPaySchema);
