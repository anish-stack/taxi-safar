const express = require("express");
const protect = require("../middlewares/auth");
const {
  addAmountOnWallet,
  verifyPayment,
  lockAmountForRide,
  releaseLockAmount,
  getWalletDetails,
  getAllTransactions,
  razorpayWebhook,
  requestWithdrawal,
  payoutWebhook,
} = require("../controllers/driver/Wallet");
const wallet = express.Router();

// Protected routes (require authentication)
wallet.post("/add-amount", protect, addAmountOnWallet);
wallet.post("/verify-payment", protect, verifyPayment);
wallet.post("/lock-amount", protect, lockAmountForRide);
wallet.post("/release-lock", protect, releaseLockAmount);
wallet.get("/details", protect, getWalletDetails);
wallet.get("/transactions", protect, getAllTransactions);
wallet.post("/withdraw", protect, requestWithdrawal);
// Webhook route (no authentication - verified by signature)
wallet.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);
wallet.post(
  "/payout-webhook",
  express.raw({ type: "application/json" }),
  payoutWebhook
);

module.exports = wallet;
