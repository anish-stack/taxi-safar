const mongoose = require("mongoose");

const StopSchema = new mongoose.Schema(
  {
    location: {
      type: String,
      required: true,
      trim: true,
    },

    geoLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
        validate: {
          validator: (v) => Array.isArray(v) && v.length === 2,
          message: "Stop coordinates must be [lng, lat]",
        },
      },
    },
  },
  { _id: false }
);

const ridesPostSchema = new mongoose.Schema(
  {
    driverPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDetails",
    },
    contactType: {
      type: String,
    },
    distanceKm: {
      type: String,
    },
    tripType: {
      type: String,
      required: true,
      index: true,
      enum: ["one-way", "round-trip", "hourly"],
    },
    vehicleType: {
      type: String,
      required: true,
      index: true,
    },

    // Pickup Information
    pickupDate: {
      type: Date,
      required: true,
      index: true,
    },
    pickupTime: {
      type: String,
      required: true,
      index: true,
    },
    pickupAddress: {
      type: String,
      required: true,
    },
    pickupLocation: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },

    // Drop Information
    dropAddress: {
      type: String,
    },
    dropLocation: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },

    // Pricing Details
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    driverEarning: {
      type: Number,
      required: true,
      min: 0,
    },
    extraKmCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    extraMinCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Booking Settings
    acceptBookingType: {
      type: String,
      required: true,
      default: "manual",
      // enum: ['manual', 'automatic']
    },

    // Extra Requirements
    extraRequirements: {
      onlyDiesel: {
        type: Boolean,
        default: false,
      },
      musicSystem: {
        type: Boolean,
        default: false,
      },
      ac: {
        type: Boolean,
        default: false,
      },
      carrier: {
        type: Boolean,
        default: false,
      },
      allInclusive: {
        type: Boolean,
        default: false,
      },
      allExclusive: {
        type: Boolean,
        default: false,
      },
      foodAllowed: {
        type: Boolean,
        default: false,
      },
    },

    trip: {
      type: String,
      default: "",
    },
    // Additional Notes
    notes: {
      type: String,
      maxlength: 500,
    },

    // Payment Details
    paymentMethod: {
      type: String,
      required: true,
      enum: ["cash", "online", "wallet"],
    },

    paymentStatus: {
      type: String,
      required: true,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    partialPaymentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    issueSolved: {
      type: Boolean,
      default: false,
    },
    issue: {
      type: String,
      default: null,
    },
    issueCreatedAt: {
      type: Date,
      default: null,
    },
    payment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
      index: true,
    },
    // Driver Assignment
    assignedDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
      index: true,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    vehicleName: {
      type: String,
      required: false,
    },
    rideStatus: {
      type: String,
      required: true,
      enum: [
        "pending", // Ride created, waiting for driver assignment
        "started",
        "driver-assigned", // Driver has been assigned
        "driver-accepted", // Driver accepted the ride
        "driver-rejected", // Driver rejected the ride
        "completed", // Ride completed successfully
        "cancelled-by-customer", // Cancelled by customer
        "cancelled-by-driver", // Cancelled by driver
        "cancelled-by-admin", // Cancelled by admin
        "no-show", // Customer didn't show up
        "failed", // Ride failed for some reason
      ],
      default: "pending",
      index: true,
    },
    returnDate: {
      type: Date,
    },
    returnTime: {
      type: String,
    },

    rideStartAt: {
      type: Date,
      default: null,
    },
    rideEndAt: {
      type: Date,
      default: null,
    },
    // Rating
    customerRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    feedback: {
      type: String,
      default: null,
    },
    distance: {
      type: Number,
      default: 0,
    },
    durationText: String,
    routePolyline: String,
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundReason: {
      type: String,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    cancellationFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "cancelledByModel",
    },
    cancelledByModel: {
      type: String,

      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    stops: {
      type: [StopSchema],
      default: [],
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ridesPostSchema.index({ pickupLocation: "2dsphere" });
ridesPostSchema.index({ dropLocation: "2dsphere" });
ridesPostSchema.index({ "stops.geoLocation": "2dsphere" });
ridesPostSchema.index({ pickupDate: 1, pickupTime: 1 });
ridesPostSchema.index({ driverPostId: 1, paymentStatus: 1 });

// Virtual for total commission percentage
ridesPostSchema.virtual("commissionPercentage").get(function () {
  if (this.totalAmount > 0) {
    return ((this.commissionAmount / this.totalAmount) * 100).toFixed(2);
  }
  return 0;
});

// Pre-save hook to validate driver earning calculation
ridesPostSchema.pre("save", function (next) {
  const calculatedEarning = this.totalAmount - this.commissionAmount;
  if (Math.abs(this.driverEarning - calculatedEarning) > 0.01) {
    this.driverEarning = calculatedEarning;
  }
  next();
});

// Model export
const RidesPost = mongoose.model("RidesPost", ridesPostSchema);

module.exports = RidesPost;
