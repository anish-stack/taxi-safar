const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },

    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },

    paymentMethod: {
      type: String,
      enum: ["razorpay", "bank_transfer", "cash", "lock_release", "ride_earning", "withdrawal"],
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    // Razorpay specific fields
    razorpayOrderId: {
      type: String,
      sparse: true,
    },

    razorpayPaymentId: {
      type: String,
      sparse: true,
    },

    razorpaySignature: {
      type: String,
    },

    // For ride-related transactions
    relatedRide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RidesPost",
    },

    // For withdrawal transactions
    withdrawalDetails: {
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
      bankName: String,
      utrNumber: String,
    },

    // Failure details
    failureReason: {
      type: String,
    },

    completedAt: {
      type: Date,
    },

    // Balance snapshot at time of transaction
    balanceAfter: {
      type: Number,
    },

    metadata: {
      type: Map,
      of: String,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
transactionSchema.index({ driver: 1, createdAt: -1 });
transactionSchema.index({ razorpayOrderId: 1 });
transactionSchema.index({ razorpayPaymentId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);