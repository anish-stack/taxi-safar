const Notification = require("../models/Notification/Notification");

class NotificationService {
  // Universal notification method - use this for any custom notification
  static async sendUniversalNotification({
    driverId,
    title,
    message,
    type = 'system', // default type
    icon = 'InfoIcon',
    relatedData = {},
  }) {
    try {
      return await Notification.create({
        driverId,
        title,
        message,
        type,
        icon,
        relatedData,
      });
    } catch (error) {
      console.log('❌ Error sending universal notification:', error);
      return null;
    }
  }

  // Send ride assigned notification
  static async sendRideAssignedNotification(driverId, rideId, pickupFrom, dropTo) {
    try {
      return await Notification.create({
        driverId,
        title: 'Ride Assigned',
        message: `You have been assigned a new ride from ${pickupFrom} to ${dropTo}`,
        type: 'ride',
        icon: 'MapPin',
        relatedData: { rideId },
      });
    } catch (error) {
      console.log('❌ Error sending ride notification:', error);
      return null;
    }
  }

  // Send payment notification
  static async sendPaymentNotification(driverId, amount, rideId) {
    try {
      return await Notification.create({
        driverId,
        title: 'Payment Received',
        message: `₹${amount} has been credited to your wallet`,
        type: 'payment',
        icon: 'CheckCircle2',
        relatedData: { rideId, amount },
      });
    } catch (error) {
      console.log('❌ Error sending payment notification:', error);
      return null;
    }
  }

  // Send message notification
  static async sendMessageNotification(driverId, customerId) {
    try {
      return await Notification.create({
        driverId,
        title: 'New Message',
        message: 'You have a new message from a customer',
        type: 'message',
        icon: 'MessageSquare',
        relatedData: { customerId },
      });
    } catch (error) {
      console.log('❌ Error sending message notification:', error);
      return null;
    }
  }

  // Send alert notification
  static async sendAlertNotification(driverId, alertMessage) {
    try {
      return await Notification.create({
        driverId,
        title: 'Alert: Important Notice',
        message: alertMessage,
        type: 'alert',
        icon: 'AlertCircle',
      });
    } catch (error) {
      console.log('❌ Error sending alert notification:', error);
      return null;
    }
  }

  // Send system notification (general purpose within system category)
  static async sendSystemNotification(driverId, title, message) {
    try {
      return await Notification.create({
        driverId,
        title,
        message,
        type: 'system',
        icon: 'InfoIcon',
      });
    } catch (error) {
      console.log('❌ Error sending system notification:', error);
      return null;
    }
  }

  // Company created
  static async sendCompanyCreatedNotification(driverId, companyName, companyId) {
    try {
      return await Notification.create({
        driverId,
        title: '🎉 Company Added',
        message: `Congratulations! Your company "${companyName}" has been added successfully`,
        type: 'system',
        icon: 'CheckCircle2',
        relatedData: {
          companyId,
          companyName,
          action: 'company_created',
        },
      });
    } catch (error) {
      console.log('❌ Error sending company created notification:', error);
      return null;
    }
  }

  // Company updated
  static async sendCompanyUpdatedNotification(driverId, companyName) {
    try {
      return await Notification.create({
        driverId,
        title: '✏️ Company Updated',
        message: `Your company "${companyName}" details have been updated successfully`,
        type: 'system',
        icon: 'InfoIcon',
        relatedData: {
          companyName,
          action: 'company_updated',
        },
      });
    } catch (error) {
      console.log('❌ Error sending company updated notification:', error);
      return null;
    }
  }

  // Company deleted
  static async sendCompanyDeletedNotification(driverId, companyName) {
    try {
      return await Notification.create({
        driverId,
        title: '🗑️ Company Deleted',
        message: `Your company "${companyName}" has been deleted`,
        type: 'alert',
        icon: 'AlertCircle',
        relatedData: {
          companyName,
          action: 'company_deleted',
        },
      });
    } catch (error) {
      console.log('❌ Error sending company deleted notification:', error);
      return null;
    }
  }

  // GST verification status
  static async sendGSTVerificationNotification(driverId, companyName, status) {
    try {
      const isVerified = status === 'verified';
      return await Notification.create({
        driverId,
        title: isVerified ? '✅ GST Verified' : '⚠️ GST Verification Failed',
        message: isVerified
          ? `GST for "${companyName}" has been verified successfully`
          : `GST verification for "${companyName}" failed. Please check your details`,
        type: isVerified ? 'system' : 'alert',
        icon: isVerified ? 'CheckCircle2' : 'AlertCircle',
        relatedData: {
          companyName,
          action: 'gst_verification',
          verificationStatus: status,
        },
      });
    } catch (error) {
      console.log('❌ Error sending GST verification notification:', error);
      return null;
    }
  }

  // Profile completion
  static async sendProfileCompletionNotification(driverId, completionPercentage) {
    try {
      const isComplete = completionPercentage === 100;
      return await Notification.create({
        driverId,
        title: isComplete ? '🎯 Profile Complete' : '📝 Complete Your Profile',
        message: isComplete
          ? 'Congratulations! Your profile is now 100% complete'
          : `Your profile is ${completionPercentage}% complete. Add more details to unlock features`,
        type: isComplete ? 'system' : 'alert',
        icon: isComplete ? 'CheckCircle2' : 'InfoIcon',
        relatedData: {
          action: 'profile_completion',
          completionPercentage,
        },
      });
    } catch (error) {
      console.log('❌ Error sending profile completion notification:', error);
      return null;
    }
  }
}

module.exports = NotificationService;