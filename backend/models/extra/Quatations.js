const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema(
  {
    // Who created the quotation (Driver)
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },

    // Company Details (Entered by Driver)
    company_details: {
      company_name: { type: String, required: true },
      address: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
    },

    // Invoice / Quotation Info
    invoice_number: {
      type: String,
      required: true,
      unique: true,
    },

    invoice_date: {
      type: Date,
      required: true,
    },

    // Bill To - Customer Details
    bill_to: {
      customer_name: { type: String, required: true },
      address: { type: String, required: true },
      contact_number: { type: String, required: true },
    },

    // Trip Details (Multiple Items Allowed)
    trip_details: [
      {
        sn: Number,

        pickup_drop_place: { type: String, required: true },
        vehicle_type: { type: String, required: true },

        pickup_date: { type: Date, required: true },
        drop_date: { type: Date, required: true },
        drop_time: { type: String, required: true },

        total_days: { type: Number, required: true },

        per_day_cab_charges: { type: Number, required: true },

        toll_tax_amount: { type: Number, required: true },

        total_amount: { type: Number, required: true },
      },
    ],

    // Summary Section
    summary: {
      sub_total: { type: Number, required: true },
      toll_tax_total: { type: Number, required: true },
      state_tax: { type: Number, required: true },
      driver_charge: { type: Number, required: true },
      parking_charge: { type: Number, required: true },

      grand_total: { type: Number, required: true },

      amount_in_words: { type: String, required: true },
    },

    // Payment Mode
    payment_mode: {
      type: String,
      enum: ["cash", "upi", "bank_transfer", "card"],
      default: "cash",
    },

    // Bank Details (Entered by Driver)
    bank_details: {
      bank_name: { type: String, required: true },
      account_number: { type: String, required: true },
      ifsc_code: { type: String, required: true },
      account_holder_name: { type: String, required: true },
    },

    // Terms and Conditions (Driver Customizable)
    terms_and_conditions: {
      type: String,
      default: "Thank you for doing business with us.",
    },

    // PDF Details
    pdf: {
      url: { type: String },          
      is_locked: { type: Boolean, default: false }, 
      password: { type: String, default: null }, 
    },

    // Admin or system info
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quotation", quotationSchema);
