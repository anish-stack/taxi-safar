const mongoose = require("mongoose");

const TempDataSchema = new mongoose.Schema(
  {
    data: {
      type: mongoose.Schema.Types.Mixed, // 👈 accepts ANY structure
      required: true,
    },
    rc:{
           type: mongoose.Schema.Types.Mixed, // 👈 accepts ANY structure
    },
    dlRetryCount:{
      type:Number,
      max:5,
      default:1
    }
  },
  {
    timestamps: true,
    strict: false, // 👈 allows extra keys at root level too
  }
);

module.exports = mongoose.model("TempData", TempDataSchema);
