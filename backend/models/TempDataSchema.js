const mongoose = require("mongoose");

const TempDataSchema = new mongoose.Schema(
  {
    data: {
      type: mongoose.Schema.Types.Mixed, // 👈 accepts ANY structure
      required: true,
    },
    rc:{
           type: mongoose.Schema.Types.Mixed, // 👈 accepts ANY structure
    }
  },
  {
    timestamps: true,
    strict: false, // 👈 allows extra keys at root level too
  }
);

module.exports = mongoose.model("TempData", TempDataSchema);
