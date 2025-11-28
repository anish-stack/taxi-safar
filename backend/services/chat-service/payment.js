const Razorpay = require("razorpay");
const crypto = require("crypto");
const PaymentModel = require("./payment.model");
const sendNotification = require("./sendNotification");
const Driver = require("./driver.model");
const RidesPost = require("./Rides_Post");
const ChatRidesPost = require("./ChatRideSchema");

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});

/* ------------------------------------------------------
    HELPER: Send Notification to Driver
------------------------------------------------------ */
async function notifyDriver(
  driverId,
  title,
  body,
  data,
  channel = "ride_channel"
) {
  try {
    const driver = await Driver.findById(driverId).select(
      "fcm_token driver_name"
    );

    if (!driver) {
      console.log(`⚠️ Driver not found: ${driverId}`);
      return;
    }

    if (!driver.fcm_token) {
      console.log(`⚠️ Driver ${driverId} has no FCM token`);
      return;
    }

    await sendNotification.sendNotification(
      driver.fcm_token,
      title,
      body,
      data,
      channel
    );

    console.log(`📲 Notification sent to driver: ${driverId}`);
  } catch (error) {
    console.error("❌ Error sending notification to driver:", error);
  }
}

/* ------------------------------------------------------
    HELPER: Process Refund
------------------------------------------------------ */
async function processRefund(paymentId, amount, reason) {
  try {
    console.log(
      `💰 Processing refund for payment: ${paymentId}, amount: ${amount}`
    );

    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount * 100, // Convert to paise
      notes: {
        reason: reason || "Ride cancelled",
      },
    });

    console.log(`✅ Refund successful: ${refund.id}`);
    return refund;
  } catch (error) {
    console.error("❌ Refund failed:", error);
    throw error;
  }
}

/* ------------------------------------------------------
    1️⃣ CREATE PAYMENT LINK
------------------------------------------------------ */
exports.createPaymentLink = async (req, res) => {
  try {
    console.log("📥 Incoming Payment Link Request:", req.body);

    const { amount, customerName, customerContact, customerId, rideId } =
      req.body;

    // ------------------------------
    // 🔍 VALIDATION
    // ------------------------------
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount. Amount must be greater than 0.",
      });
    }

    if (!customerName || !customerContact) {
      return res.status(400).json({
        success: false,
        error: "Customer name and contact are required.",
      });
    }

    if (!customerId || !rideId) {
      return res.status(400).json({
        success: false,
        error: "Customer ID and Ride ID are required.",
      });
    }

    // ------------------------------
    // 🔍 RIDE CHECK (ride poster)
    // ------------------------------
    const ride = await RidesPost.findById(rideId).populate("driverPostId");

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: "Ride not found.",
      });
    }

    // Ride already paid?
    if (ride.paymentStatus === "completed") {
      return res.status(400).json({
        success: false,
        error: "Payment already completed for this ride.",
      });
    }

    // ------------------------------
    // 🔍 CHECK PAYER DRIVER (customerId)
    // This is the driver who is paying commission
    // ------------------------------
    const payingDriver = await Driver.findById(customerId);

    if (!payingDriver) {
      return res.status(404).json({
        success: false,
        error: "Paying driver (customerId) not found.",
      });
    }

    // ------------------------------
    // 🔍 ride.driverPostId = the driver who posted the ride
    // ------------------------------
    const rideOwnerDriver = ride.driverPostId; // may be null if not populated

    if (rideOwnerDriver?._id?.toString() === customerId.toString()) {
      console.log("Ride owner cannot pay their own commission.");
      return res.status(400).json({
        success: false,
        error: "Ride owner cannot pay their own commission.",
      });
    }

    // ------------------------------
    // 🔗 CALLBACK URL
    // ------------------------------
    const callbackUrl = `${process.env.SERVER_URL}/api/payment/verify?customerId=${customerId}&rideId=${rideId}&amount=${amount}`;

    // Unique reference ID
    const reference_id = `${rideId}-${Date.now()}`;

    // ------------------------------
    // 💳 PAYLOAD FOR RAZORPAY
    // ------------------------------
    const payload = {
      amount: Math.round(amount * 100),
      currency: "INR",
      customer: {
        name: customerName,
        contact: customerContact,
      },
      reference_id,
      notes: {
        rideId,
        customerId, // this is the paying driver
        postedBy: rideOwnerDriver?._id?.toString() || null, // driver who posted ride
        tripType: ride.tripType,
        vehicleType: ride.vehicleType,
      },
      notify: { sms: true, email: false },
      callback_url: callbackUrl,
      callback_method: "get",
      description: `Payment for ${ride.tripType} ride - ${ride.vehicleType}`,
    };

    console.log("📤 Razorpay Payload:", payload);

    // ------------------------------
    // 🔗 CREATE PAYMENT LINK
    // ------------------------------
    const result = await razorpay.paymentLink.create(payload);
    console.log("✅ Razorpay Payment Link Created Successfully:", result.id);

    // ------------------------------
    // 📢 Notify Paying Driver (customerId)
    // ------------------------------
    await notifyDriver(
      customerId, // who is paying commission
      "Payment Link Generated",
      `₹${amount} ka payment link generate ho gaya hai. Kripya payment complete karein.`,
      {
        event: "PAYMENT_LINK_CREATED",
        rideId,
        amount,
        paymentLink: result.short_url,
        type: "payment",
        payerDriver: customerId, // paying driver
      },
      "payment_channel"
    );

    // ------------------------------
    // 📢 Notify Ride Owner (ride.driverPostId)
    // ------------------------------
    if (rideOwnerDriver?._id) {
      await notifyDriver(
        rideOwnerDriver._id.toString(), // ride poster
        "Payment Initiated",
        `Ek driver ne ₹${amount} ka payment initiate kiya hai aapke ride post ke liye.`,
        {
          event: "PAYMENT_INITIATED",
          rideId,
          amount,
          payingDriver: customerId, // this driver is paying
          rideOwner: rideOwnerDriver._id,
        },
        "payment_channel"
      );
    }

    // ------------------------------
    // 📤 RESPONSE
    // ------------------------------
    res.json({
      success: true,
      paymentLink: result.short_url,
      paymentLinkId: result.id,
      referenceId: reference_id,
      expiresAt: result.expire_by,
      payingDriver: customerId,
      rideOwner: rideOwnerDriver?._id || null,
    });
  } catch (error) {
    console.error("❌ Error Creating Payment Link:", error);

    res.status(500).json({
      success: false,
      error: error.message || "Failed to create payment link",
    });
  }
};

/* ------------------------------------------------------
    2️⃣ CALLBACK VERIFY (User Payment Success Page)
------------------------------------------------------ */
exports.verifyPayment = async (req, res) => {
  try {
    console.log("📥 Payment verification callback received!");
    console.log("Query Params:", req.query);

    const {
      razorpay_payment_id,
      razorpay_payment_link_id,
      razorpay_payment_link_reference_id,
      razorpay_payment_link_status,
      customerId,
      rideId,
      amount,
    } = req.query;

    // Validation
    if (!razorpay_payment_id || !rideId || !customerId) {
      console.error("❌ Missing required parameters");
      return res.status(400).send("Missing required payment parameters");
    }

    // Verify payment with Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (payment.status !== "captured" && payment.status !== "authorized") {
      console.error("❌ Payment not successful:", payment.status);
      return res.status(400).send("Payment verification failed");
    }

    console.log("✅ Payment verified with Razorpay:", payment.id);

    // Check if payment already exists
    const existingPayment = await PaymentModel.findOne({
      paymentId: razorpay_payment_id,
    });

    if (existingPayment) {
      console.log("⚠️ Payment already processed");
      return res.send("Payment already verified ✔");
    }

    // Save payment in DB
    const savedPayment = await PaymentModel.create({
      paymentId: razorpay_payment_id,
      linkId: razorpay_payment_link_id,
      amount: payment.amount / 100, // Convert from paise to rupees
      status: payment.status,
      rideId: rideId,
      reference_id: razorpay_payment_link_reference_id,
      customerId: customerId,
    });

    console.log("💾 Payment saved in DB:", savedPayment._id);

    // Update ride status
    const findRide = await RidesPost.findById(rideId).populate("driverPostId");

    if (!findRide) {
      console.error("❌ Ride not found:", rideId);
      return res.status(404).send("Ride not found");
    }

    findRide.paymentMethod = "online";
    findRide.paymentStatus = "completed";
    findRide.assignedDriverId = customerId;
    findRide.assignedAt = new Date();
    findRide.rideStatus = "driver-assigned";
    findRide.partialPaymentAmount = amount
      ? parseFloat(amount)
      : payment.amount / 100;
    findRide.payment_id = savedPayment._id;

    await findRide.save();
    console.log("✅ Ride updated successfully", customerId);

    const findChat = await ChatRidesPost.findOne({
      init_driver_id: customerId,
      ride_post_id: findRide?._id,
    });

    if (!findChat) {
      console.error("❌ Chat not found. Cannot push payment message.");
      return;
    }

    const messageForInitiator = {
      sender: customerId,
      messageType: "Payment_Complete",
      text: `💳 Payment Received!
TaxiSafar ne aapka commission ₹${amount} successfully receive kar liya hai.
Ab ride complete karein aur remaining balance amount directly customer se collect karein. Thank you for your quick action!`,
      amount: amount,
      isRead: false,
      deletedFor: [],
      sentAt: new Date(),
    };

    // 👉 Push message
    findChat.lastMessage="Payment Completed"
    findChat.messages.push(messageForInitiator);

    // 👉 Save chat
    await findChat.save();

    // 👉 Console full updated messages array (after push)
    console.log("✅ Message added to chat:");
    console.log(findChat.messages);

    // 👉 Console only the newly added message (last item)
    console.log("🆕 Newly added message:");
    console.log(findChat.messages[findChat.messages.length - 1]);

    // Send notification   to assigned driver (customer who paid)
    await notifyDriver(
      customerId,
      "Payment Successful! 🎉",
      `Your payment of ₹${findRide.partialPaymentAmount} has been received. Ride confirmed!`,
      {
        event: "PAYMENT_SUCCESS",
        rideId: rideId,
        paymentId: razorpay_payment_id,
        amount: findRide.partialPaymentAmount,
        rideStatus: "driver-assigned",
        type: "payment",
      },
      "payment_channel"
    );

    // Send notification to ride poster (driverPostId) - They will receive the payment
    if (findRide.driverPostId && findRide.driverPostId._id) {
      await notifyDriver(
        findRide.driverPostId._id.toString(),
        "Payment Received! 💰",
        `You received ₹${findRide.partialPaymentAmount} for your ride. Driver has been assigned.`,
        {
          event: "PAYMENT_RECEIVED",
          rideId: rideId,
          paymentId: razorpay_payment_id,
          amount: findRide.partialPaymentAmount,
          assignedDriverId: customerId,
          type: "payment",
        },
        "payment_channel"
      );
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Successful</title>
        <style>
          body { font-family: Arial; text-align: center; padding: 50px; }
          .success { color: #4CAF50; font-size: 24px; }
          .details { margin-top: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="success">✅ Payment Verified Successfully!</div>
        <div class="details">
          <p>Payment ID: ${razorpay_payment_id}</p>
          <p>Amount: ₹${findRide.partialPaymentAmount}</p>
          <p>Ride Status: Driver Assigned</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("❌ Verification Error:", err);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Failed</title>
        <style>
          body { font-family: Arial; text-align: center; padding: 50px; }
          .error { color: #f44336; font-size: 24px; }
        </style>
      </head>
      <body>
        <div class="error">❌ Payment Verification Failed</div>
        <p>Please contact support if payment was deducted.</p>
      </body>
      </html>
    `);
  }
};

/* ------------------------------------------------------
    3️⃣ WEBHOOK HANDLER (Razorpay Events)
------------------------------------------------------ */
exports.paymentWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature
    const hash = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== signature) {
      console.error("❌ Invalid webhook signature");
      return res.status(400).send("Invalid signature");
    }

    const event = req.body.event;
    console.log("📨 Webhook event received:", event);

    // PAYMENT SUCCESS EVENT
    if (event === "payment_link.paid") {
      const payment = req.body.payload.payment.entity;
      const link = req.body.payload.payment_link.entity;

      const rideId = link.notes?.rideId;
      const customerId = link.notes?.customerId;

      if (!rideId) {
        console.error("❌ Missing rideId in webhook payload");
        return res.json({ status: "ok" });
      }

      // Check if already processed
      const existingPayment = await PaymentModel.findOne({
        paymentId: payment.id,
      });

      if (!existingPayment) {
        await PaymentModel.create({
          paymentId: payment.id,
          linkId: link.id,
          amount: payment.amount / 100,
          status: payment.status,
          rideId,
          customerId,
          reference_id: link.reference_id,
        });

        console.log("💾 Payment saved via webhook:", payment.id);
      }

      // Update ride
      const ride = await RidesPost.findById(rideId).populate("driverPostId");
      if (ride && ride.paymentStatus !== "completed") {
        ride.paymentStatus = "completed";
        ride.paymentMethod = "online";
        ride.rideStatus = "driver-assigned";
        ride.partialPaymentAmount = payment.amount / 100;
        await ride.save();

        console.log("✅ Ride updated via webhook:", rideId);
      }
    }

    // PAYMENT FAILED EVENT
    if (event === "payment_link.expired" || event === "payment.failed") {
      const link = req.body.payload.payment_link?.entity;
      const rideId = link?.notes?.rideId;

      if (rideId) {
        await RidesPost.findByIdAndUpdate(rideId, {
          paymentStatus: "failed",
        });

        console.log("⚠️ Payment failed/expired for ride:", rideId);
      }
    }

    res.json({ status: "ok" });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    res.status(500).send("Webhook Error");
  }
};

/* ------------------------------------------------------
    4️⃣ PROCESS REFUND (Auto refund on cancellation)
------------------------------------------------------ */
exports.processRideRefund = async (req, res) => {
  try {
    const { rideId, reason, cancellationFee = 0 } = req.body;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        error: "Ride ID is required",
      });
    }

    const ride = await RidesPost.findById(rideId).populate(
      "payment_id driverPostId"
    );

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: "Ride not found",
      });
    }

    if (ride.paymentStatus !== "completed") {
      return res.status(400).json({
        success: false,
        error: "No completed payment found for this ride",
      });
    }

    const payment = ride.payment_id;

    if (!payment || !payment.paymentId) {
      return res.status(400).json({
        success: false,
        error: "Payment details not found",
      });
    }

    // Calculate refund amount (Total - Cancellation Fee)
    const refundAmount = Math.max(
      0,
      ride.partialPaymentAmount - cancellationFee
    );

    if (refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Refund amount must be greater than 0",
      });
    }

    // Process refund via Razorpay
    const refund = await processRefund(payment.paymentId, refundAmount, reason);

    // Update ride with refund details
    ride.paymentStatus = "refunded";
    ride.refundAmount = refundAmount;
    ride.refundReason = reason || "Ride cancelled";
    ride.cancellationFee = cancellationFee;

    await ride.save();

    // Update payment status
    payment.status = "refunded";
    await payment.save();

    console.log("✅ Refund processed successfully:", refund.id);

    // Notify customer (assigned driver)
    if (ride.assignedDriverId) {
      await notifyDriver(
        ride.assignedDriverId.toString(),
        "Refund Processed 💰",
        `₹${refundAmount} has been refunded to your account. Cancellation fee: ₹${cancellationFee}`,
        {
          event: "REFUND_PROCESSED",
          rideId: rideId,
          refundAmount: refundAmount,
          cancellationFee: cancellationFee,
          type: "refund",
        },
        "payment_channel"
      );
    }

    // Notify ride poster
    if (ride.driverPostId && ride.driverPostId._id) {
      await notifyDriver(
        ride.driverPostId._id.toString(),
        "Ride Cancelled - Refund Issued",
        `The ride has been cancelled and ₹${refundAmount} has been refunded to the driver.`,
        {
          event: "RIDE_CANCELLED_REFUND",
          rideId: rideId,
          refundAmount: refundAmount,
          type: "refund",
        },
        "payment_channel"
      );
    }

    res.json({
      success: true,
      message: "Refund processed successfully",
      refundId: refund.id,
      refundAmount: refundAmount,
      cancellationFee: cancellationFee,
    });
  } catch (error) {
    console.error("❌ Refund Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to process refund",
    });
  }
};

/* ------------------------------------------------------
    5️⃣ COMPLETE RIDE & RELEASE PAYMENT TO POSTER
------------------------------------------------------ */
exports.completeRideAndTransfer = async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        error: "Ride ID is required",
      });
    }

    const ride = await RidesPost.findById(rideId).populate(
      "driverPostId assignedDriverId"
    );

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: "Ride not found",
      });
    }

    if (ride.rideStatus === "completed") {
      return res.status(400).json({
        success: false,
        error: "Ride already completed",
      });
    }

    if (ride.paymentStatus !== "completed") {
      return res.status(400).json({
        success: false,
        error: "Payment not completed for this ride",
      });
    }

    // Update ride status
    ride.rideStatus = "completed";
    await ride.save();

    console.log("✅ Ride completed:", rideId);

    // Notify assigned driver (who paid)
    if (ride.assignedDriverId) {
      await notifyDriver(
        ride.assignedDriverId._id.toString(),
        "Ride Completed! 🎉",
        `Your ride has been completed successfully. Thank you for choosing our service!`,
        {
          event: "RIDE_COMPLETED",
          rideId: rideId,
          type: "ride",
        },
        "ride_channel"
      );
    }

    // Notify ride poster (who will receive the payment)
    if (ride.driverPostId && ride.driverPostId._id) {
      await notifyDriver(
        ride.driverPostId._id.toString(),
        "Ride Completed - Payment Released! 💰",
        `The ride has been completed successfully. Your earning of ₹${ride.driverEarning} has been released.`,
        {
          event: "PAYMENT_RELEASED",
          rideId: rideId,
          amount: ride.driverEarning,
          totalAmount: ride.totalAmount,
          commission: ride.commissionAmount,
          type: "payment",
        },
        "payment_channel"
      );
    }

    res.json({
      success: true,
      message: "Ride completed and payment released",
      driverEarning: ride.driverEarning,
      commissionAmount: ride.commissionAmount,
    });
  } catch (error) {
    console.error("❌ Complete Ride Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to complete ride",
    });
  }
};
