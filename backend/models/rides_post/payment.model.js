const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  paymentId: String,
  linkId: String,
  amount: Number,
   reference_id:String,
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
  status: String,
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: "RidesPost" },
});

module.exports = mongoose.model("Payment", PaymentSchema);
