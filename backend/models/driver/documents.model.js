const mongoose = require('mongoose');

const documentsSchema = new mongoose.Schema({
  driver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
    unique: true,
    index: true
  },

  // 🪪 Aadhar Card (Front & Back)
  aadhar_card: {
    document_number: { type: String, trim: true },
    front: {
      public_id: { type: String, trim: true },
      url: { type: String, trim: true }
    },
    back: {
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

  // 🚗 Driving License (Front & Back)
  driving_license: {
    license_number: { type: String, trim: true },
    front: {
      public_id: { type: String, trim: true },
      url: { type: String, trim: true }
    },
    back: {
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

// Index for driver lookup

const Documents = mongoose.model('Documents', documentsSchema);
module.exports = Documents;