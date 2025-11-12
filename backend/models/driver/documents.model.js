const mongoose = require('mongoose');

const documentsSchema = new mongoose.Schema({
  driver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
    unique: true,
    index: true
  },

  // 🪪 Aadhar Card
  aadhar_card: {
    document_number: { type: String, trim: true },
    document: {
      public_id: { type: String, trim: true },
      url: { type: String, trim: true }
    },
    verified: { type: Boolean, default: false },
    rejected: { type: Boolean, default: false },
    rejection_reason: { type: String, trim: true },
    verified_at: Date,
    verified_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    uploaded_at: { type: Date, default: Date.now }
  },

  // 🧾 PAN Card
  pan_card: {
    document: {
      public_id: { type: String, trim: true },
      url: { type: String, trim: true }
    },
    verified: { type: Boolean, default: false },
    rejected: { type: Boolean, default: false },
    rejection_reason: { type: String, trim: true },
    verified_at: Date,
    verified_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    uploaded_at: { type: Date, default: Date.now }
  },

  // 🚗 Driving License
  driving_license: {
    license_number: { type: String, trim: true },
    expiry_date: { type: Date, index: true },
    document: {
      public_id: { type: String, trim: true },
      url: { type: String, trim: true }
    },
    verified: { type: Boolean, default: false },
    rejected: { type: Boolean, default: false },
    rejection_reason: { type: String, trim: true },
    verified_at: Date,
    verified_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    uploaded_at: { type: Date, default: Date.now }
  },

  // ✅ Overall Status
  all_verified: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

// Indexes
documentsSchema.index({ 'driving_license.expiry_date': 1 });

const Documents = mongoose.model('Documents', documentsSchema);
module.exports = Documents;
