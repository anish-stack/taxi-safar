const mongoose = require('mongoose');

const { Schema } = mongoose;

const AppSettingSchema = new Schema({
  // App Version Control
  app_version_android: {
    type: String,
    required: true,
    trim: true,
  },
  app_version_ios: {
    type: String,
    required: true,
    trim: true,
  },

  force_update_android: {
    type: Boolean,
    default: false,
  },
  force_update_ios: {
    type: Boolean,
    default: false,
  },
  app_link_android: {
    type: String,
    required: true,
    trim: true,
  },
  app_link_ios: {
    type: String,
    required: true,
    trim: true,
  },

  // App Branding
  app_name: {
    type: String,
    required: true,
    trim: true,
  },
  app_logo: {
   url:{ type: String},
   public_id:{ type: String}
  },

  // Maintenance & App Status
  under_maintenance: {
    type: Boolean,
    default: false,
  },
  maintenance_message: {
    type: String,
    default: "We are under maintenance. We'll be back soon!",
  },


  // Payment Gateways (Support multiple)
  payment_gateways: {
    razorpay: {
      enabled: { type: Boolean, default: false },
      key_id: { type: String },
      key_secret: { type: String },
    },
    cash: {
      enabled: { type: Boolean, default: false },
    },
    wallet: {
      enabled: { type: Boolean, default: false },
    },
  },

  // Support & Contact
  support: {
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
    },
    whatsapp: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    working_hours: {
      type: String,
      default: "24/7",
    },
  },

  // Social Media Links
  social_media: {
    facebook: { type: String, trim: true },
    instagram: { type: String, trim: true },
    twitter: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    youtube: { type: String, trim: true },
  },

  // Maps & Location
  google_maps_api_key: {
    type: String,
    required: true,
  },
 
  // Customer Care & Policies
  privacy_policy_url: {
    type: String,
    required: true,
  },
  terms_conditions_url: {
    type: String,
    required: true,
  },
  refund_policy_url: {
    type: String,
  },

  app_rating_link_android: String,
  app_rating_link_ios: String,

}, { timestamps: true });

// Ensure only one document exists (Singleton pattern for App Settings)
AppSettingSchema.statics.getSingleton = function () {
  return this.findOne().exec();
};

// Create indexes
AppSettingSchema.index({ createdAt: -1 });

module.exports =  mongoose.model('AppSetting', AppSettingSchema);