const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['ride', 'payment', 'message', 'alert', 'system'],
      default: 'system',
    },
    status: {
      type: String,
      enum: ['read', 'unread'],
      default: 'unread',
    },
    icon: {
      type: String,
      default: 'Bell',
    },
    relatedData: {
      rideId: mongoose.Schema.Types.ObjectId,
      userId: mongoose.Schema.Types.ObjectId,
      amount: Number,
      otherDetails: mongoose.Schema.Types.Mixed,
    },
    actionUrl: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster queries
notificationSchema.index({ driverId: 1, createdAt: -1 });
notificationSchema.index({ driverId: 1, status: 1 });

module.exports = mongoose.model('Notification', notificationSchema);