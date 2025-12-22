const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// ==================== DRIVER SCHEMA (Main) ====================
const driverSchema = new mongoose.Schema(
  {
    driver_name: {
      type: String,
      required: [true, "Driver name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
      index: true,
    },
    address:{
        type: String
    },
    driver_contact_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    driver_email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      index: true,
    },
    driver_dob: {
      type: Date,
      required: true,
    },
    driver_gender: {
      type: String,
    },

    referral_id: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
    },
    referral_id_applied: {
      type: String,
      uppercase: true,
      trim: true,
    },
    aadhar_number: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      select: false,
    },
    profile_photo: {
      url: {
        type: String,
      },
      public_id: {
        type: String,
      },
    },

    // Current location for nearby driver search
    current_location: {
      type: {
        type: String,
        enum: ["Point"],
        default: undefined,
      },
      coordinates: {
        type: [Number],
        default: undefined,
        index: "2dsphere",
      },
    },
    lastLocationUpdate: {
      type: Date,
    },

    // Online/Offline status
    is_online: {
      type: Boolean,
      default: false,
      index: true,
    },
    is_on_ride: {
      type: Boolean,
      default: false,
      index: true,
    },
    last_online_at: Date,

    // Account status
    account_status: {
      type: String,
      enum: ["pending", "active", "inactive", "suspended", "blocked"],
      default: "pending",
      index: true,
    },

    // Quick stats (denormalized for performance)
    average_rating: {
      type: String,
      default: "4.5",
    },
    total_rides: {
      type: Number,
      default: 0,
    },
    completed_rides: {
      type: Number,
      default: 0,
    },

    // References
    current_vehicle_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver_Vehicle",
      index: true,
    },

    current_ride_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
    },

    // FCM for notifications
    fcm_token: String,
    device_id: String,
    fcm_updated_at: Date,
    platform: String,
    // Tokens
    refresh_token: {
      type: String,
      select: false,
    },

    // OTP verification
    aadhar_otp: {
      type: String,
      // select: false
    },
    aadhar_verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    currentRadius: {
      type: Number,
      default: 5,
    },
    loginOtp: {
      type: String,
    },
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      index: true,
    },
    loginOtpExpiry: {
      type: Date,
    },
    BankDetails: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankDetails",
      index: true,
    },
    document_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Documents",
      index: true,
    },
    aadhar_otp_expired: {
      type: Date,
      select: false,
    },

    preferences: {
      accept_mini_rides: {
        type: Boolean,
        default: false,
      },
      accept_sedan_rides: {
        type: Boolean,
        default: false,
      },
      accept_suv_rides: {
        type: Boolean,
        default: false,
      },
      char_dham:{
        type: Boolean,
        default: false,
      }
    },

    steps_complete: {
      type: Number, // [1-> register with document done  2-> verify addhar with otp 3-> otp stage 4-> vehcile_registartion 5-> Bank details -> done ]
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for complex queries
driverSchema.index({ is_online: 1, account_status: 1, is_on_ride: 1 });
driverSchema.index({
  current_location: "2dsphere",
  is_online: 1,
  is_on_ride: 1,
});
driverSchema.index({ createdAt: -1 });
driverSchema.index({ total_rides: -1 });

// Methods
driverSchema.methods.generateAuthToken = function () {
  return jwt.sign({ _id: this._id, role: "driver" }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

driverSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id, type: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "60d" }
  );
};

const Driver = mongoose.model("Driver", driverSchema);
module.exports = Driver;
