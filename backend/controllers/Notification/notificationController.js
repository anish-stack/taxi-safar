const Notification = require("../../models/Notification/Notification");

// Get All Notifications for a Driver
exports.getAllNotifications = async (req, res) => {
  try {
    const driverId = req.user._id; // From auth middleware
    const { page = 1, limit = 20, status = 'all' } = req.query;

    const skip = (page - 1) * limit;

    // Build filter
    const filter = { driverId };
    if (status !== 'all') {
      filter.status = status;
    }

    // Fetch notifications
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const totalNotifications = await Notification.countDocuments(filter);

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      driverId,
      status: 'unread',
    });

    return res.status(200).json({
      success: true,
      message: 'Notifications fetched successfully',
      data: notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalNotifications / limit),
        totalNotifications,
        unreadCount,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.log('❌ Get Notifications Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
};

// Get Single Notification
exports.getNotificationById = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const driverId = req.user._id;

    const notification = await Notification.findOne({
      _id: notificationId,
      driverId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification fetched successfully',
      data: notification,
    });
  } catch (error) {
    console.log('❌ Get Notification Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notification',
      error: error.message,
    });
  }
};

// Mark as Read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const driverId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, driverId },
      { status: 'read' },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    console.log('❌ Mark as Read Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark as read',
      error: error.message,
    });
  }
};

// Mark All as Read
exports.markAllAsRead = async (req, res) => {
  try {
    const driverId = req.user._id;

    const result = await Notification.updateMany(
      { driverId, status: 'unread' },
      { status: 'read' }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.log('❌ Mark All as Read Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all as read',
      error: error.message,
    });
  }
};

// Delete Notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const driverId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      driverId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
      data: notification,
    });
  } catch (error) {
    console.log('❌ Delete Notification Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message,
    });
  }
};

// Clear All Notifications
exports.clearAllNotifications = async (req, res) => {
  try {
    const driverId = req.user._id;

    const result = await Notification.deleteMany({ driverId });

    return res.status(200).json({
      success: true,
      message: 'All notifications cleared successfully',
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    console.log('❌ Clear All Notifications Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear notifications',
      error: error.message,
    });
  }
};

// Create Notification (For internal use - when ride/payment events occur)
exports.createNotification = async (req, res) => {
  try {
    const { driverId, title, message, type, icon, relatedData } = req.body;

    if (!driverId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const notification = new Notification({
      driverId,
      title,
      message,
      type,
      icon,
      relatedData,
    });

    await notification.save();

    return res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification,
    });
  } catch (error) {
    console.log('❌ Create Notification Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message,
    });
  }
};

// Bulk Delete Notifications
exports.bulkDeleteNotifications = async (req, res) => {
  try {
    const driverId = req.user._id;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification IDs',
      });
    }

    const result = await Notification.deleteMany({
      _id: { $in: notificationIds },
      driverId,
    });

    return res.status(200).json({
      success: true,
      message: 'Notifications deleted successfully',
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    console.log('❌ Bulk Delete Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notifications',
      error: error.message,
    });
  }
};
