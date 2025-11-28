const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      unique: true,
    },

    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalEarnings: {
      type: Number,
      default: 0,
    },

    totalWithdrawals: {
      type: Number,
      default: 0,
    },

    pendingSettlement: {
      type: Number,
      default: 0,
    },

    lockAmounts: [
      {
        amount_lock: {
          type: Number,
          required: true,
        },
        forRide: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "RidesPost",
          required: true,
        },
        lockedAt: {
          type: Date,
          default: Date.now,
        },
        isReleased: {
          type: Boolean,
          default: false,
        },
        releasedAt: {
          type: Date,
        },
        expiresAt: {
          type: Date,
        },
      },
    ],

    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    currency: {
      type: String,
      default: "INR",
    },
  },
  { timestamps: true }
);

// Method to calculate total locked amount
walletSchema.methods.getTotalLockedAmount = function () {
  return this.lockAmounts
    .filter((lock) => !lock.isReleased)
    .reduce((total, lock) => total + lock.amount_lock, 0);
};

// Method to get available balance
walletSchema.methods.getAvailableBalance = function () {
  return this.balance - this.getTotalLockedAmount();
};

// Index for better query performance
walletSchema.index({ driver: 1 });
walletSchema.index({ "lockAmounts.forRide": 1 });
walletSchema.index({ "lockAmounts.isReleased": 1 });

module.exports = mongoose.model("Wallet", walletSchema);