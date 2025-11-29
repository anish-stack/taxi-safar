const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
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

    bill_to: {
      customer_name: { type: String, required: true },
      contact_number: { type: String, required: true },
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
        pickup_time: { type: String, required: true }, // e.g., "10:30 AM"

       
        // Return Trip (Only for round_trip)
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
        TotalAmountOftrip:{
          type: Number, required: true
        },
        total_days: { type: Number,  },
        per_day_cab_charges: { type: Number,  },
        toll_tax_amount: { type: Number, default: 0 },

        // Any extra charges (night halt, permit, hill charge, etc.)
        extra_charges: [
          {
            description: { type: String },
            amount: { type: Number },
          },
        ],

        total_amount: { type: Number }, // Line total
      },
    ],

    // Summary Section
    summary: {
      sub_total: { type: Number, required: true },
      toll_tax_total: { type: Number, required: true },
      state_tax: { type: Number, default: 0 },
      driver_charge: { type: Number, default: 0 },
      parking_charge: { type: Number, default: 0 },
      extra_charges_total: { type: Number, default: 0 }, // Sum of all extra charges

      grand_total: { type: Number, required: true },
      amount_in_words: { type: String, required: true },
    },

    // Payment Mode
    payment_mode: {
      type: String,
      enum: ["cash", "upi", "bank_transfer", "card"],
      default: "bank_transfer",
    },

    // Bank Details
    bank_details: {
      bank_name: { type: String, required: true },
      account_number: { type: String, required: true },
      ifsc_code: { type: String, required: true },
      account_holder_name: { type: String, required: true },
    },

    // Terms and Conditions
    terms_and_conditions: {
      type: String,
      default: "Thank you for doing business with us.",
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
  },
  { timestamps: true }
);

// Index for better query performance
quotationSchema.index({ driver: 1, invoice_number: 1 });
quotationSchema.index({ company_id: 1 });

module.exports = mongoose.model("Quotation", quotationSchema);