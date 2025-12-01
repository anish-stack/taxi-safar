const Driver = require("../../models/driver/driver.model");
const Wallet = require("../../models/driver/Wallet");
const Transaction = require("../../models/driver/Transaction");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});

// Add amount to wallet - Create Razorpay order
exports.addAmountOnWallet = async (req, res) => {
  try {

    const { amount } = req.body;
    const driverId = req.user.id;

    if (!amount || amount < 1) {
      console.log("❌ Invalid Amount:", amount);
      return res.status(400).json({
        success: false,
        message: "Invalid amount. Minimum amount is ₹1",
      });
    }

    const driver = await Driver.findById(driverId);
    console.log("Driver Fetched:", !!driver);

    if (!driver) {
      console.log("❌ Driver not found!");
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Create Razorpay order options
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `wallet_${driverId}}`,
      notes: {
        driverId: driverId.toString(),
        type: "wallet_recharge",
      },
    };

    console.log("📝 Creating Razorpay Order:", options);

    const order = await razorpay.orders.create(options);

    console.log("✅ Razorpay Order Created:", order);

    // Create pending transaction
    const transaction = new Transaction({
      driver: driverId,
      type: "credit",
      amount: amount,
      status: "pending",
      paymentMethod: "razorpay",
      razorpayOrderId: order.id,
      description: "Wallet recharge",
    });

    await transaction.save();

    console.log("💾 Transaction Saved:", transaction._id);

    console.log("================= WALLET RECHARGE END =================\n");

    res.status(200).json({
      success: true,
      message: "Order created successfully",
      data: {
        orderId: order.id,
        amount: amount,
        currency: "INR",
        key: process.env.RAZORPAY_KEY,
      },
    });

  } catch (error) {
    console.error("\n❌ Add amount error occurred");

    console.log("Error Message:", error.message);
    console.log("Error Description:", error.description);
    console.log("Error Details:", error.details);

    if (error.error) {
      console.log("Razorpay Error Object:", error.error);
    }

    if (error.response) {
      console.log("Razorpay Error Response:", error.response);
    }

    console.log("\nFull Error Object:", JSON.stringify(error, null, 2));
    console.log("=====================================================\n");

    return res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message || error.description || "Unknown Razorpay error",
    });
  }
};


exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const driverId = req.user.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment details",
      });
    }

    // Step 1: Verify Razorpay Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Step 2: Find the transaction
    const transaction = await Transaction.findOne({
      razorpayOrderId: razorpay_order_id,
      driver: driverId,
      status: { $ne: "completed" }, // Prevent double completion
    }).populate("driver");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found or already completed",
      });
    }

    // Step 3: Ensure driver exists and populate properly
    if (!transaction.driver) {
      return res.status(404).json({
        success: false,
        message: "Associated driver not found",
      });
    }

    // Step 4: Find or Create Wallet
    let wallet = await Wallet.findOne({ driver: driverId });

    if (!wallet) {
      wallet = new Wallet({
        driver: driverId,
        balance: 0,
        totalEarnings: 0,
        transactions: [],
      });
    }

    // Step 5: Update Wallet Balance & History
    wallet.balance += transaction.amount;
    wallet.totalEarnings += transaction.amount;

    // Avoid duplicate transaction entries
    if (!wallet.transactions.includes(transaction._id)) {
      wallet.transactions.push(transaction._id);
    }

    await wallet.save();

    // Step 6: Update Transaction Status
    transaction.status = "completed";
    transaction.razorpayPaymentId = razorpay_payment_id;
    transaction.razorpaySignature = razorpay_signature;
    transaction.completedAt = new Date();
    await transaction.save();

    // Step 7: Update Driver's wallet reference if missing or incorrect
    if (!transaction.driver.wallet || transaction.driver.wallet.toString() !== wallet._id.toString()) {
      await Driver.findByIdAndUpdate(
        driverId,
        { wallet: wallet._id },
        { new: true }
      );
    }

    // Success Response
    return res.status(200).json({
      success: true,
      message: "Payment verified and wallet updated successfully",
      data: {
        newBalance: wallet.balance,
        creditedAmount: transaction.amount,
        transactionId: transaction._id,
        walletId: wallet._id,
      },
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during payment verification",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
// Razorpay webhook
exports.razorpayWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (webhookSignature !== expectedSignature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const event = req.body.event;
    const payload = req.body.payload.payment.entity;

    if (event === "payment.captured") {
      const orderId = payload.order_id;
      const paymentId = payload.id;

      const transaction = await Transaction.findOne({ razorpayOrderId: orderId });

      if (transaction && transaction.status === "pending") {
        transaction.status = "completed";
        transaction.razorpayPaymentId = paymentId;
        transaction.completedAt = new Date();
        await transaction.save();

        let wallet = await Wallet.findOne({ driver: transaction.driver });
        if (!wallet) {
          wallet = new Wallet({ driver: transaction.driver });
        }

        wallet.balance += transaction.amount;
        wallet.totalEarnings += transaction.amount;
        wallet.transactions.push(transaction._id);
        await wallet.save();
      }
    } else if (event === "payment.failed") {
      const orderId = payload.order_id;

      const transaction = await Transaction.findOne({ razorpayOrderId: orderId });
      if (transaction) {
        transaction.status = "failed";
        transaction.failureReason = payload.error_description;
        await transaction.save();
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Lock amount for ride
exports.lockAmountForRide = async (req, res) => {
  try {
    const { amount, rideId } = req.body;
    const driverId = req.user.id;

    const wallet = await Wallet.findOne({ driver: driverId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    const availableBalance = wallet.balance - wallet.getTotalLockedAmount();

    if (availableBalance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
        availableBalance,
      });
    }

    wallet.lockAmounts.push({
      amount_lock: amount,
      forRide: rideId,
    });

    await wallet.save();

    res.status(200).json({
      success: true,
      message: "Amount locked successfully",
      data: {
        lockedAmount: amount,
        availableBalance: availableBalance - amount,
      },
    });
  } catch (error) {
    console.error("Lock amount error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to lock amount",
      error: error.message,
    });
  }
};

// Release locked amount (auto refund)
exports.releaseLockAmount = async (req, res) => {
  try {
    const { rideId } = req.body;
    const driverId = req.user.id;

    const wallet = await Wallet.findOne({ driver: driverId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    const lockIndex = wallet.lockAmounts.findIndex(
      (lock) => lock.forRide.toString() === rideId && !lock.isReleased
    );

    if (lockIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Lock not found or already released",
      });
    }

    const lockedAmount = wallet.lockAmounts[lockIndex].amount_lock;
    wallet.lockAmounts[lockIndex].isReleased = true;
    wallet.lockAmounts[lockIndex].releasedAt = new Date();

    // Create refund transaction
    const transaction = new Transaction({
      driver: driverId,
      type: "credit",
      amount: lockedAmount,
      status: "completed",
      paymentMethod: "lock_release",
      description: `Lock amount released for ride ${rideId}`,
      completedAt: new Date(),
    });

    await transaction.save();
    wallet.transactions.push(transaction._id);
    await wallet.save();

    res.status(200).json({
      success: true,
      message: "Lock released and amount refunded",
      data: {
        refundedAmount: lockedAmount,
        balance: wallet.balance,
      },
    });
  } catch (error) {
    console.error("Release lock error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to release lock",
      error: error.message,
    });
  }
};

// Get wallet details
exports.getWalletDetails = async (req, res) => {
  try {
    const driverId = req.user.id;

    const wallet = await Wallet.findOne({ driver: driverId })
      .populate("transactions")
      .populate("lockAmounts.forRide");

    if (!wallet) {
      return res.status(200).json({
        success: false,
        message: "Do your First wallet recharge",
      });
    }

    const totalLocked = wallet.getTotalLockedAmount();
    const availableBalance = wallet.balance - totalLocked;

    res.status(200).json({
      success: true,
      data: {
        balance: wallet.balance,
        availableBalance,
        totalLocked,
        totalEarnings: wallet.totalEarnings,
        totalWithdrawals: wallet.totalWithdrawals,
        pendingSettlement: wallet.pendingSettlement,
        lockAmounts: wallet.lockAmounts.filter((lock) => !lock.isReleased),
        recentTransactions: wallet.transactions.slice(-10),
      },
    });
  } catch (error) {
    console.error("Get wallet error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wallet details",
      error: error.message,
    });
  }
};

// Get all transactions
exports.getAllTransactions = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { page = 1, limit = 20, type, status } = req.query;

    const query = { driver: driverId };
    if (type) query.type = type;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      },
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch transactions",
      error: error.message,
    });
  }
};




exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount } = req.body;
    const driverId = req.user.id;

    if (!amount || amount < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum withdrawal amount is ₹100",
      });
    }

    const driver = await Driver.findById(driverId).select("name email phone bankDetails");
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    // Check if bank details exist
    if (!driver.bankDetails?.account_number || !driver.bankDetails?.ifsc_code) {
      return res.status(400).json({
        success: false,
        message: "Please add bank account first",
        requireBankUpdate: true,
      });
    }

    const wallet = await Wallet.findOne({ driver: driverId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    const availableBalance = wallet.balance - wallet.getTotalLockedAmount();
    if (availableBalance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
        availableBalance,
      });
    }

    // Create transaction (pending)
    const transaction = new Transaction({
      driver: driverId,
      type: "debit",
      amount: amount,
      status: "pending",
      paymentMethod: "withdrawal",
      description: `Withdrawal to bank - ${driver.bankDetails.account_number.slice(-4)}`,
      withdrawalDetails: {
        accountNumber: driver.bankDetails.account_number,
        ifscCode: driver.bankDetails.ifsc_code,
        accountHolderName: driver.bankDetails.account_holder_name || driver.name,
        bankName: driver.bankDetails.bank_name,
      },
    });

    await transaction.save();

    // Deduct from wallet immediately (hold)
    wallet.balance -= amount;
    wallet.totalWithdrawals += amount;
    wallet.transactions.push(transaction._id);
    await wallet.save();

    // Trigger payout via Razorpay
    try {
      const payout = await razorpay.payouts.create({
        account_number: process.env.RAZORPAY_X_ACCOUNT_NUMBER, // Your RazorpayX account
        amount: amount * 100, // in paise
        currency: "INR",
        mode: "IMPS", // or NEFT, change as needed
        purpose: "payout",
        fund_account: {
          account_type: "bank_account",
          bank_account: {
            name: driver.bankDetails.account_holder_name || driver.name,
            account_number: driver.bankDetails.account_number,
            ifsc: driver.bankDetails.ifsc_code,
          },
          contact: {
            name: driver.name,
            email: driver.email,
            contact: driver.phone,
            type: "employee", // or "customer"
            reference_id: driverId.toString(),
          },
        },
        queue_if_low_balance: true,
        reference_id: transaction._id.toString(),
        description: "Driver wallet withdrawal",
        notes: {
          driverId: driverId.toString(),
          transactionId: transaction._id.toString(),
        },
      });

      // Update transaction with payout ID
      transaction.razorpayPayoutId = payout.id;
      transaction.status = "processing";
      await transaction.save();

      res.status(200).json({
        success: true,
        message: "Withdrawal request submitted",
        data: {
          withdrawalId: transaction._id,
          amount,
          status: "processing",
          payoutId: payout.id,
          estimatedArrival: "Within 2 hours (IMPS)",
        },
      });
    } catch (payoutError) {
      console.error("Payout failed:", payoutError);

      // Revert wallet balance if payout fails
      wallet.balance += amount;
      wallet.totalWithdrawals -= amount;
      await wallet.save();

      transaction.status = "failed";
      transaction.failureReason = payoutError.error?.description || "Payout failed";
      await transaction.save();

      return res.status(500).json({
        success: false,
        message: "Withdrawal failed. Money refunded to wallet.",
        error: payoutError.error?.description,
      });
    }
  } catch (error) {
    console.error("Withdrawal error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


// routes/webhook/razorpay.js
exports.payoutWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const event = req.body.event;
    const payout = req.body.payload.payout.entity;

    if (event === "payout.processed" || event === "payout.reversed") {
      const transaction = await Transaction.findOne({
        razorpayPayoutId: payout.id,
      });

      if (transaction) {
        if (event === "payout.processed" && payout.status === "processed") {
          transaction.status = "completed";
          transaction.utrNumber = payout.utr;
          transaction.completedAt = new Date();
        } else if (payout.status === "reversed" || payout.status === "failed") {
          transaction.status = "failed";
          transaction.failureReason = payout.failure_reason || "Payout reversed";

          // Refund to wallet
          const wallet = await Wallet.findOne({ driver: transaction.driver });
          if (wallet) {
            wallet.balance += transaction.amount;
            wallet.totalWithdrawals -= transaction.amount;
            await wallet.save();
          }
        }
        await transaction.save();
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Payout webhook error:", error);
    res.status(500).json({ success: false });
  }
};