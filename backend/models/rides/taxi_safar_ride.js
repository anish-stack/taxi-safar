const mongoose = require("mongoose");

const TaxiSafariRideSchema = new mongoose.Schema(
  {
    invoice_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    trip_id: {
      type: Number,
      required: true,
      unique: true,
    },

    // User Information
    user_id: {
      type: Number,

      index: true,
    },
    name: {
      type: String,
      required: false,
    },
    contact: {
      type: String,
      required: false,
    },

    // Vehicle Information
    vehicle_type: {
      type: String,
      required: true,
    },
    vehicle_name: {
      type: String,
      required: true,
    },

    // Driver Information
    driver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
    distance: {
      type: Number,
      default: 0,
    },
    durationText: String,
    routePolyline: String,

    driver_assigned_at: Date,
    driver_rating: {
      type: Number,
      min: 0,
      max: 5,
    },

    // Location Information
    pickup_address: {
      type: String,
      default: "",
    },
    pickup_location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    destination_address: String,
    destination_location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },

    // Trip Details
    trip_type: {
      type: String,
      enum: ["oneWay", "roundTrip", "local", "airport", "dham"],
      required: true,
    },
    category: {
      type: String,
      enum: ["outstation", "local", "airport", "rental", "dham"],
      required: true,
    },
    departure_date: {
      type: Date,
      required: true,
    },
    return_date: Date,
    distance: String,
    duration: String,
    extra_km: {
      type: String,
      default: "0",
    },
    extra_km_fare:{
       type: String,
      default: "0",
    },

    // Trip Status
    trip_status: {
      type: String,
      enum: [
        "searching",
        "reserved",
        "driver_assigned",
        "driver_arrived",
        "trip_started",
        "trip_completed",
        "cancelled_by_user",
        "cancelled_by_driver",
        "cancelled_by_system",
        "no_driver_found",
      ],
      default: "reserved",
      required: true,
      index: true,
    },

    // OTP and Verification
    ride_otp: {
      type: String,
      default: null,
    },
    otp_verified: {
      type: Boolean,
      default: false,
    },
    otp_verified_at: Date,

    // Pricing Information
    original_amount: {
      type: Number,
      required: true,
    },
    revised_amount:{
 type: Number
    },
    paid_amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    additional_kilometers: {
      type: Number,
      default: 0,
    },
    additional_time: {
      type: Number,
      default: 0,
    },
    additional_time_charge: {
      type: Number,
      default: 0,
    },

    // Extra Charges
    toll_tax: {
      amount: {
        type: Number,
        default: 0,
      },
      included: {
        type: Boolean,
        default: false,
      },
    },
    parking_charges: {
      amount: {
        type: Number,
        default: 0,
      },
      included: {
        type: Boolean,
        default: false,
      },
    },
    driver_charges: {
      amount: {
        type: Number,
        default: 0,
      },
      included: {
        type: Boolean,
        default: true,
      },
    },
    night_charges: {
      amount: {
        type: Number,
        default: 0,
      },
      included: {
        type: Boolean,
        default: true,
      },
    },

    // Payment Information
    payment_id: String,
    order_id: String,
    payment_status: {
      type: String,
      enum: ["pending", "captured", "failed", "refunded", "partial_refund"],
      default: "pending",
    },
    payment_method: {
      type: String,
      enum: ["upi", "card", "netbanking", "wallet", "cash", "emi"],
    },
    card: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    upi: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    bank: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    wallet: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    acquirer_data: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    all_details: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Refund Information
    refund_amount: {
      type: Number,
      default: 0,
    },
    refund_reason: String,
    refund_status: {
      type: String,
      enum: ["none", "pending", "processed", "failed"],
      default: "none",
    },
    refund_id: String,

    // Cancellation Information
    cancelled_at: Date,
    cancelled_by: {
      type: String,
      enum: ["user", "driver", "admin", "system"],
    },
    cancellation_reason: String,
    cancellation_charge: {
      type: Number,
      default: 0,
    },

    // Error Handling
    error_description: String,
    error_reason: String,

    // Ratings and Feedback
    user_rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    
    user_feedback: String,
    driver_feedback: String,

    // Special Categories
    city_id: Number,
    local_rental_plan_id: Number,
    airport_id: Number,
    airport_city_id: Number,
    airport_from_to: String,
    car_tab: String,
    dham_package_name: String,
    dham_pickup_city_name: String,
    dham_package_id: Number,
    dham_pickup_city_id: Number,
    dham_package_days: Number,
    dham_category_name: String,
    dham_category_id: Number,

    // Timestamps for tracking
    trip_started_at: Date,
    trip_completed_at: Date,
    estimated_arrival_time: Date,
    actual_arrival_time: Date,

    // Live Tracking
    current_location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    last_location_update: Date,

    // Admin Fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
    },
    index_no: Number,

    // Additional Metadata
    notes: String,
    special_instructions: String,
    is_scheduled: {
      type: Boolean,
      default: false,
    },
    scheduled_time: Date,

    // Promotional
    promo_code: String,
    discount_amount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
TaxiSafariRideSchema.index({ user_id: 1, trip_status: 1 });
TaxiSafariRideSchema.index({ driver_id: 1, trip_status: 1 });
TaxiSafariRideSchema.index({ departure_date: 1 });
TaxiSafariRideSchema.index({ payment_status: 1 });
TaxiSafariRideSchema.index({ pickup_location: "2dsphere" });
TaxiSafariRideSchema.index({ destination_location: "2dsphere" });
TaxiSafariRideSchema.index({ current_location: "2dsphere" });

// Virtual for total amount
TaxiSafariRideSchema.virtual("total_amount").get(function () {
  return (
    this.original_amount +
    this.additional_time_charge +
    (this.toll_tax.amount || 0) +
    (this.parking_charges.amount || 0) +
    (this.waiting_charges.amount || 0) -
    this.discount_amount
  );
});

// Method to generate OTP
TaxiSafariRideSchema.methods.generateOTP = function () {
  this.ride_otp = Math.floor(1000 + Math.random() * 9000).toString();
  return this.ride_otp;
};

// Method to verify OTP
TaxiSafariRideSchema.methods.verifyOTP = function (otp) {
  if (this.ride_otp === otp) {
    this.otp_verified = true;
    this.otp_verified_at = new Date();
    return true;
  }
  return false;
};

// Method to calculate cancellation charge
TaxiSafariRideSchema.methods.calculateCancellationCharge = function () {
  const now = new Date();
  const departure = new Date(this.departure_date);
  const hoursUntilDeparture = (departure - now) / (1000 * 60 * 60);

  if (hoursUntilDeparture > 24) {
    return 0; // Free cancellation
  } else if (hoursUntilDeparture > 12) {
    return this.paid_amount * 0.25; // 25% charge
  } else if (hoursUntilDeparture > 6) {
    return this.paid_amount * 0.5; // 50% charge
  } else {
    return this.paid_amount * 0.75; // 75% charge
  }
};

// Pre-save middleware
TaxiSafariRideSchema.pre("save", function (next) {
  // Generate invoice_id if not present
  if (!this.invoice_id) {
    this.invoice_id = "INV" + Date.now() + Math.floor(Math.random() * 1000);
  }
  next();
});

// Static method to find active rides for a user
TaxiSafariRideSchema.statics.findActiveRides = function (userId) {
  return this.find({
    user_id: userId,
    trip_status: {
      $in: [
        "searching",
        "reserved",
        "driver_assigned",
        "driver_arrived",
        "trip_started",
      ],
    },
  }).sort({ departure_date: -1 });
};

// Static method to find rides for a driver
TaxiSafariRideSchema.statics.findDriverRides = function (
  driverId,
  status = null
) {
  const query = { driver_id: driverId };
  if (status) {
    query.trip_status = status;
  }
  return this.find(query).sort({ departure_date: -1 });
};

const TaxiSafariRide = mongoose.model("TaxiSafariRide", TaxiSafariRideSchema);

module.exports = TaxiSafariRide;
