const mongoose = require("mongoose");
// MongoDB Schemas
const ChatRidesSchema = new mongoose.Schema(
  {
    init_driver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },
    ride_post_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RidesPost",
      required: true,
      index: true,
    },
    other_driver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
    messages: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Driver",
          required: true,
        },
        messageType: {
          type: String,
          default: "text",
        },
        text: {
          type: String,
          default: "",
        },
        imageUrl: {
          type: String,
        },
        // ADD THESE TWO FIELDS:
        paymentUrl: {
          type: String,
          default: "",
        },
        amount: {
          type: Number,
          default: 0,
        },
        // Also add vehiclePhotos if using driver_details messageType
        vehiclePhotos: {
          front: String,
          back: String,
          interior: String,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
        deletedFor: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
          },
        ],
        sentAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    lastMessage: {
      type: String,
    },
    lastMessageAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

ChatRidesSchema.index(
  { init_driver_id: 1, other_driver_id: 1, ride_post_id: 1 },
  { unique: true }
);


module.exports = mongoose.model("Chat_Rides_Post", ChatRidesSchema);
