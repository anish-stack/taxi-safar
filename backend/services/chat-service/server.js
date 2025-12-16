// server.js
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const mongoose = require("mongoose");
const redis = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");
const sendNotification = require("./sendNotification");
const Driver = require("./driver.model");
const RidesPost = require("./Rides_Post");
const { createPaymentLink, verifyPayment, paymentWebhook, processRideRefund, completeRideAndTransfer } = require("./payment");
const  ChatRidesPost= require('./ChatRideSchema')
const app = express();
const cors = require('cors')
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors('*'))
// MongoDB Connection
const MONGODB_URI =
  "mongodb+srv://happycoding41_db_user:7d6fCrF25M8tWol7@cluster.ggzsknt.mongodb.net?retryWrites=true&w=majority";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
  });

// Redis Setup (Optional - comment out if not using Redis)
let pubClient, subClient, cacheClient;
const USE_REDIS = true; // Set to true if Redis is available

if (USE_REDIS) {
  pubClient = redis.createClient({ url: "redis://localhost:6379" });
  subClient = pubClient.duplicate();
  cacheClient = redis.createClient({ url: "redis://localhost:6379" });

  Promise.all([pubClient.connect(), subClient.connect(), cacheClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log("✅ Redis Connected");
    })
    .catch((err) => console.error("⚠️ Redis not available:", err));
}


// Store active socket connections
const activeDrivers = new Map(); // driverId -> socketId

// ==================== HELPER FUNCTION ====================
// 📲 Send FCM notification if driver is offline
async function sendMessageNotificationIfOffline(receiverId, senderName, messageText, chatId) {
  try {
    // Check if receiver is online
    const isOnline = activeDrivers.has(receiverId);

    if (!isOnline) {
      // Fetch receiver's FCM token
      const receiver = await Driver.findById(receiverId).select('fcm_token driver_name');

      if (receiver && receiver.fcm_token) {
        const notificationTitle = `New message from ${senderName}`;
        const notificationBody = messageText.length > 100
          ? messageText.substring(0, 100) + "..."
          : messageText;

        await sendNotification.sendNotification(
          receiver.fcm_token,
          notificationTitle,
          notificationBody,
          {
            event: "NEW_MESSAGE",
            chatId: chatId,
            senderId: receiverId,
            type: "chat_message"
          },
          "chat_channel"
        );

        console.log(`📲 FCM notification sent to offline driver: ${receiverId}`);
      } else {
        console.log(`⚠️ Driver ${receiverId} has no FCM token`);
      }
    }
  } catch (error) {
    console.error("Error sending offline notification:", error);
  }
}


app.post('/api/v1/create-payment-link',createPaymentLink)
app.get('/api/payment/verify',verifyPayment)
app.post("/webhook", paymentWebhook);
app.post("/refund", processRideRefund);
app.post("/complete", completeRideAndTransfer);

// ==================== REST API ENDPOINTS ====================
// http://192.168.1.10:3200/api/payment/verify?razorpay_payment_id=pay_RkMcDkfRSZZI5W&razorpay_payment_link_id=plink_RkMXxbPZePcpsX&razorpay_payment_link_reference_id=6926b2566146843f8fbeeac5&razorpay_payment_link_status=paid&razorpay_signature=277c434e12bedefdee79dcdf4eeb935d42cb5e5a18a24bed54a6fd1e6da9a5c3
app.post("/api/chat/init", async (req, res) => {
  try {
    const { init_driver_id, ride_post_id, other_driver_id } = req.body;
    console.log("Init Chat Request:", req.body);

    if (!init_driver_id || !ride_post_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    let existingChat = await ChatRidesPost.findOne({
      init_driver_id,
      ride_post_id,
    });

    if (existingChat) {
      return res.status(200).json({
        success: true,
        message: "Chat already created by this driver for this ride",
        chatId: existingChat._id,
        chat: existingChat,
      });
    }

    // Create new chat
    let chat = new ChatRidesPost({
      init_driver_id,
      ride_post_id,
      other_driver_id,
      messages: [],
      lastMessage: "Chat initiated",
      lastMessageAt: new Date(),
    });

    await chat.save();

    const ridePost = await RidesPost.findById(ride_post_id).populate(
      "driverPostId",
      "fcm_token driver_name"
    );

    if (!ridePost) {
      return res.status(404).json({
        success: false,
        message: "Ride post not found",
      });
    }

    const rideOwner = ridePost.driverPostId;
    const rideOwnerFcm = rideOwner?.fcm_token;

    // Send Push Notification to Ride Owner
    if (rideOwnerFcm) {
      await sendNotification.sendNotification(
        rideOwnerFcm,
        "New Ride Interest",
        "A driver is interested in your ride post.",
        {
          event: "NEW_RIDE_INTEREST",
          ridePostId: ride_post_id,
          fromDriverId: init_driver_id,
          chatId: chat._id,
        },
        "chat_channel"
      );
    }

    // Emit Real-time Socket Event to Ride Owner
    const ownerSocketId = activeDrivers.get(other_driver_id);
    if (ownerSocketId) {
      io.to(ownerSocketId).emit("new_chat_request", {
        chatId: chat._id,
        from_driver_id: init_driver_id,
        ride_post_id,
        message: "Someone is interested in your ride post!",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Chat initiated successfully",
      chatId: chat._id,
      chat,
    });
  } catch (error) {
    console.error("Init Chat Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

app.get("/api/chat/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;
    const { driver_id } = req.query;

    const chat = await ChatRidesPost.findById(chatId)
      .populate("init_driver_id", "driver_name driver_contact_number")
      .populate("other_driver_id", "driver_name driver_contact_number")
      .populate("ride_post_id", "pickupAddress dropAddress pickupDate");

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    // Filter deleted messages for this driver
    if (driver_id) {
      chat.messages = chat.messages.filter(
        (msg) => !msg.deletedFor.includes(driver_id)
      );
    }

    res.json({
      success: true,
      owner:chat.other_driver_id,
      init:chat.init_driver_id,
      chat,
    });
  } catch (error) {
    console.error("Get Chat Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

app.get("/api/chat-ride/:rideId", async (req, res) => {
  try {
    const { rideId } = req.params;

    console.log("📩 Incoming Chat Fetch Request for Ride:", rideId);

    const chats = await ChatRidesPost.find({ ride_post_id: rideId })
      .populate("init_driver_id", "driver_name driver_contact_number")
      .populate("other_driver_id", "driver_name driver_contact_number")
      .populate("ride_post_id", "pickupAddress dropAddress pickupDate")
      .lean();

    console.log("🗂️ Chats Found:", chats.length);
    // console.log("📜 Full Chat Data:", chats); // uncomment if needed

    if (!chats || chats.length === 0) {
      console.log("⚠️ No chat found for ride:", rideId);
      return res.status(404).json({
        success: false,
        message: "No chat found for this ride",
      });
    }

    console.log("✅ Chat response sent successfully for ride:", rideId);

    return res.json({
      success: true,
      chats,
    });

  } catch (error) {
    console.error("❌ Get Chat Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching chat",
      error: error.message,
    });
  }
});

app.get('/',(req,res)=>{
  return res.status(200).json({
    success:true,
    message:"Taxi safar chat process"
  })
})

app.get("/api/chat/driver/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;

    const chats = await ChatRidesPost.find({
      $or: [{ init_driver_id: driverId }, { other_driver_id: driverId }],
    })
      .populate("init_driver_id", "name phone")
      .populate("other_driver_id", "name phone")
      .populate(
        "ride_post_id",
        "pickupAddress dropAddress pickupDate vehicleType"
      )
      .sort({ lastMessageAt: -1 });

    // Count unread messages for each chat
    const chatsWithUnread = chats.map((chat) => {
      const unreadCount = chat.messages.filter(
        (msg) => !msg.isRead && msg.sender.toString() !== driverId
      ).length;

      return {
        ...chat.toObject(),
        unreadCount,
      };
    });

    res.json({
      success: true,
      count: chatsWithUnread.length,
      chats: chatsWithUnread,
    });
  } catch (error) {
    console.error("Get Driver Chats Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

app.post("/api/chat/:chatId/message", async (req, res) => {
  try {
    const { chatId } = req.params;
    const { sender, text, messageType, imageUrl } = req.body;

    const chat = await ChatRidesPost.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    const newMessage = {
      sender,
      messageType: messageType || "text",
      text: text || "",
      imageUrl: imageUrl || "",
      isRead: false,
      sentAt: new Date(),
    };

    chat.messages.push(newMessage);
    chat.lastMessage = messageType === "text" ? text : "Image";
    chat.lastMessageAt = new Date();

    await chat.save();

    // Get the saved message with ID
    const savedMessage = chat.messages[chat.messages.length - 1];

    // Determine receiver
    const receiverId =
      chat.init_driver_id.toString() === sender
        ? chat.other_driver_id.toString()
        : chat.init_driver_id.toString();

    const receiverSocketId = activeDrivers.get(receiverId);

    if (receiverSocketId) {
      // ✅ Receiver is ONLINE - send via socket
      io.to(receiverSocketId).emit("new_message", {
        chatId,
        message: savedMessage,
      });
    } else {
      // 📲 Receiver is OFFLINE - send FCM notification
      const senderDriver = await Driver.findById(sender).select('driver_name');
      const senderName = senderDriver?.driver_name || "A driver";
      const messageText = messageType === "text" ? text : "Sent an image";

      await sendMessageNotificationIfOffline(receiverId, senderName, messageText, chatId);
    }

    res.json({
      success: true,
      message: "Message sent",
      data: savedMessage,
    });
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

app.put("/api/chat/:chatId/read", async (req, res) => {
  try {
    const { chatId } = req.params;
    const { driver_id } = req.body;

    const chat = await ChatRidesPost.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    // Mark all messages from other driver as read
    chat.messages.forEach((msg) => {
      if (msg.sender.toString() !== driver_id && !msg.isRead) {
        msg.isRead = true;
      }
    });

    await chat.save();

    res.json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("Mark Read Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

app.delete("/api/chat/:chatId/message/:messageId", async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const { driver_id } = req.body;

    const chat = await ChatRidesPost.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (!message.deletedFor.includes(driver_id)) {
      message.deletedFor.push(driver_id);
    }

    await chat.save();

    res.json({
      success: true,
      message: "Message deleted",
    });
  } catch (error) {
    console.error("Delete Message Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// ==================== SOCKET.IO EVENTS ====================
app.set('io', io);
app.set('activeDriver', activeDrivers);

io.on("connection", (socket) => {
  console.log("🔌 Driver connected:", socket.id);

  // Driver connects with their ID
  socket.on("driver_online", (data) => {
    const { driver_id } = data;
    activeDrivers.set(driver_id, socket.id);
    socket.driver_id = driver_id;
    console.log(`✅ Driver ${driver_id} is online`);
  });

  // Join specific chat room
  socket.on("join_chat", (data) => {
    const { chatId } = data;
    socket.join(`chat_${chatId}`);
    console.log(`Driver ${socket.driver_id} joined chat ${chatId}`);
  });

  // Send message via Socket
  socket.on("send_message", async (data) => {
    try {
      const { chatId, sender, text, messageType, imageUrl, paymentUrl,
        amount } = data;
        console.log(data)

      const chat = await ChatRidesPost.findById(chatId);
      if (!chat) {
        socket.emit("error", { message: "Chat not found" });
        return;
      }

      const newMessage = {
        sender,
        messageType: messageType || "text",
        text: text || "",
        paymentUrl: paymentUrl || "",
        amount: amount || "",
        imageUrl: imageUrl || "",
        isRead: false,
        sentAt: new Date(),
      };

      chat.messages.push(newMessage);
      chat.lastMessage = messageType === "text" ? text : "Image";
      chat.lastMessageAt = new Date();

      await chat.save();

      const savedMessage = chat.messages[chat.messages.length - 1];

      // Broadcast to chat room
      io.to(`chat_${chatId}`).emit("new_message", {
        chatId,
        message: savedMessage,
      });

      // 📲 Check if receiver is offline and send FCM notification
      const receiverId =
        chat.init_driver_id.toString() === sender
          ? chat.other_driver_id.toString()
          : chat.init_driver_id.toString();

      const receiverSocketId = activeDrivers.get(receiverId);

      if (!receiverSocketId) {
        // Receiver is offline, send notification
        const senderDriver = await Driver.findById(sender).select('driver_name');
        const senderName = senderDriver?.driver_name || "A driver";
        const messageText = messageType === "text" ? text : "Sent an image";

        await sendMessageNotificationIfOffline(receiverId, senderName, messageText, chatId);
      }
    } catch (error) {
      console.error("Socket Send Message Error:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Typing indicator
  socket.on("typing", (data) => {
    const { chatId, isTyping } = data;
    socket.to(`chat_${chatId}`).emit("user_typing", {
      driver_id: socket.driver_id,
      isTyping,
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (socket.driver_id) {
      activeDrivers.delete(socket.driver_id);
      console.log(`❌ Driver ${socket.driver_id} disconnected`);
    }
  });
});

// Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    activeDrivers: activeDrivers.size,
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Ride Chat Server running on port ${PORT}`);
});

// Graceful Shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing connections...");
  if (USE_REDIS && pubClient) {
    await pubClient.quit();
    await subClient.quit();
    await cacheClient.quit();
  }
  await mongoose.connection.close();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});