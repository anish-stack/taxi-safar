const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    vehicle_number: {
      type: String,
    },
    driver_name: {
      type: String,
    },
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDetails",
      required: true,
    },

    invoice_number: {
      type: String,
      required: true,
      unique: true,
    },

    invoice_date: {
      type: Date,
      required: true,
    },

    // NEW: Document type (quotation or invoice)
    document_type: {
      type: String,
      enum: ["quotation", "invoice"],
      default: "invoice",
    },

    bill_to: {
      customer_name: { type: String, required: true },
      contact_number: { type: String, required: true },
      email: { type: String },
      address: { type: String },
    },

    // Trip Type: one_way or round_trip
    trip_type: {
      type: String,
      enum: ["one_way", "round_trip"],
      required: true,
    },

    // Trip Details (Multiple Items Allowed)
    trip_details: [
      {
        sn: { type: Number, default: 1 },

        pickup_drop_place: { type: String, required: true },
        vehicle_type: { type: String, required: true },

        // Pickup
        pickup_date: { type: Date, required: true },
        pickup_time: { type: String, required: true },

        // Return Trip
        return_date: {
          type: Date,
          required: function () {
            return this.parent().trip_type === "round_trip";
          },
        },
        return_time: {
          type: String,
          required: function () {
            return this.parent().trip_type === "round_trip";
          },
        },

        // ================= PRICING (NEW) =================

        pricing_mode: {
          type: String,
          enum: ["km_wise", "day_wise"],
          required: true,
        },

        // KM WISE
        total_km: { type: Number, default: 0 },
        per_km_rate: { type: Number, default: 0 },
        km_fare: { type: Number, default: 0 },

        // DAY WISE
        total_days: { type: Number, default: 1 },
        per_day_cab_charges: { type: Number, default: 0 },
        day_fare: { type: Number, default: 0 },

        // Common Charges
        toll_tax_amount: { type: Number, default: 0 },

        // Driver info
        driver_name: { type: String },
        vehicle_number: { type: String },

         stops: [
      {
        place: String,
        charge: Number,
      },
    ],

    multi_stops: {
      type: Boolean,
      default: false,
    },

        extra_charges: [
          {
            description: { type: String },
            amount: { type: Number, default: 0 },
          },
        ],

        // Final total for this trip
        total_amount: { type: Number, default: 0 },
      },
    ],
    stops: [
      {
        place: String,
        charge: Number,
      },
    ],

    multi_stops: {
      type: Boolean,
      default: false,
    },

    // Summary Section with ALL charges
    summary: {
      sub_total: { type: Number, default: 0 },

      // Trip-related charges
      toll_tax_total: { type: Number, default: 0 },
      state_tax: { type: Number, default: 0 },
      driver_charge: { type: Number, default: 0 },
      parking_charge: { type: Number, default: 0 },

      // Extra charges from trips
      extra_charges_total: { type: Number, default: 0 },

      // Additional charges (separate array for custom charges)
      additional_charges: [
        {
          title: { type: String },
          amount: { type: Number, default: 0 },
        },
      ],

      // Discount
      discount: { type: Number, default: 0 },

      // Tax information
      gst_applied: { type: Boolean, default: false },
      gst_amount: { type: Number, default: 0 },
      cgst_amount: { type: Number, default: 0 },
      sgst_amount: { type: Number, default: 0 },
      igst_amount: { type: Number, default: 0 },

      // Total amounts
      subtotal: { type: Number, default: 0 },
      grand_total: { type: Number, default: 0 },
      total: { type: Number, default: 0 },

      // Amount in words
      amount_in_words: { type: String },
    },

    // Payment Mode
    payment_mode: {
      type: String,
      enum: ["cash", "upi", "bank_transfer", "card"],
      default: "bank_transfer",
    },

    // Bank Details
    bank_details: {
      bank_name: { type: String },
      account_number: { type: String },
      ifsc_code: { type: String },
      account_holder_name: { type: String },
      branch_name: { type: String },
      upi_id: { type: String },
    },

    // Terms and Conditions
    terms_and_conditions: {
      type: String,
      default: "Thank you for doing business with us.",
    },
    description: {
      type: String,
      default: "Thank you for doing business with us.",
    },

    place_of_supply: {
      type: String,
      default: "Delhi",
    },

    hsn_code: {
      type: String,
      default: "996412",
    },

    order_id: {
      type: String,
    },

    // PDF Details
    pdf: {
      url: { type: String },
      public_id: { type: String },
      is_locked: { type: Boolean, default: false },
      password: { type: String },
    },

    // Admin or system info
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },

    // Status
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected", "invoiced"],
      default: "draft",
    },
  },
  { timestamps: true }
);

// Index for better query performance
quotationSchema.index({ driver: 1, invoice_number: 1 });
quotationSchema.index({ company_id: 1 });
quotationSchema.index({ document_type: 1 });
quotationSchema.index({ status: 1 });

module.exports = mongoose.model("Quotation", quotationSchema);
