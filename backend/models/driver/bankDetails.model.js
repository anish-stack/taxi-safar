const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema({
  driver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
    unique: true,
    index: true,
  },
  bank_name: {
    type: String,
    trim: true,
    required: [true, 'Bank name is required'],
  },
  account_number: {
    type: String,
    trim: true,
    required: [true, 'Account number is required'],
  },
  ifsc_code: {
    type: String,
    required: [true, 'IFSC code is required'],
    uppercase: true,
    trim: true,
  },
  branch_name: {
    type: String,
    trim: true,
  },
  account_holder_name: {
    type: String,
    trim: true,
    required: [true, 'Account holder name is required'],
  },
  upi_id: {
    type: String,
    trim: true,
    lowercase: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  verified_at: {
    type: Date,
  },
}, {
  timestamps: true,
});

const BankDetails = mongoose.model('BankDetails', bankDetailsSchema);
module.exports = BankDetails;
