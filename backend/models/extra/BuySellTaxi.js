// models/BuySellTaxi.js
const mongoose = require("mongoose");

const buySellTaxiSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },

 

    transmission: {
      type: String,
      enum: ["Manual", "Automatic"],
      required: true,
    },

    kms_driven: {
      type: Number,
      required: true,
      min: 0,
      max: 999999,
    },

    // RC Details
    rc_details: {
      type: mongoose.Schema.Types.Mixed,
    },

    // =============================
    // CHALLAN (Traffic Fines)
    // =============================
    challan: {
      has_pending_challan: { type: Boolean, default: false },
      pending_challan_count: { type: Number, default: 0, min: 0 },
      total_pending_challan_amount: { type: Number, default: 0, min: 0 },
    },

    // =============================
    // FINANCE / LOAN / EMI
    // =============================
    finance: {
      is_financed: { type: Boolean, default: false },
      emi_amount: { type: Number, min: 0 },
      total_emis_pending: { type: Number, min: 1 },
    },

    // =============================
    // PHOTOS
    // =============================
    photos: {
      front: { url: String, public_id: String },
      back: { url: String, public_id: String },
      left_side: { url: String, public_id: String },
      right_side: { url: String, public_id: String },
      dashboard: { url: String, public_id: String },
      odometer: { url: String, public_id: String },
      interior_front: { url: String, public_id: String },
      interior_back: { url: String, public_id: String },
    },

    expected_price: {
      type: Number,
      required: true,
      min: 10000,
    },

    negotiable: { type: Boolean, default: true },

    car_condition: {
      type: String,
      enum: ["Excellent", "Good", "Average", "Needs Repair"],
      default: "Good",
    },

    description: { type: String, trim: true, maxlength: 1000 },
    features: { type: [String], default: [] },

    // =============================
    // GEOSPATIAL LOCATION - GeoJSON + 2dsphere
    // =============================
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number], 
        required: true,
      },
      state: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      address: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },

    listing_status: {
      type: String,
      enum: ["pending", "approved", "rejected", "sold", "expired"],
      default: "pending",
    },

    sold_to: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
    sold_at: Date,
    views: { type: Number, default: 0 },
    is_featured: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// =============================
// 2dsphere Index for Geo Queries
// =============================
buySellTaxiSchema.index({ location: "2dsphere" });

// Other useful indexes
buySellTaxiSchema.index({ "rc_details.registration_number": 1 }, { unique: true });
buySellTaxiSchema.index({ expected_price: 1 });
buySellTaxiSchema.index({ listing_status: 1 });
buySellTaxiSchema.index({ createdAt: -1 });
buySellTaxiSchema.index({ is_featured: -1, createdAt: -1 });
buySellTaxiSchema.index({ kms_driven: 1 });
buySellTaxiSchema.index({ year_of_manufacture: -1 });
buySellTaxiSchema.index({ "challan.has_pending_challan": 1 });
buySellTaxiSchema.index({ "finance.is_financed": 1 });

buySellTaxiSchema.index({
  "location.city": "text",
  "location.state": "text",
});



module.exports = mongoose.model("BuySellTaxi", buySellTaxiSchema);