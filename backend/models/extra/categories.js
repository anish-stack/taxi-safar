const mongoose = require("mongoose");

const categoriesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      url: {
        type: String,
        default: "",
      },
      public_id: {
        type: String,
        default: "",
      },
    },

    screen: {
      type: String,
      default: "",
    },

    badge: {
      type: String,
      default: "",
    },

    position: {
      type: Number,
      unique: true,    
      required: true, 
      index: true,    
    },

    is_active: {
      type: Boolean,
      default: true,
      index: true,    
    },
  },
  { timestamps: true }
);

categoriesSchema.index({ position: 1, is_active: 1 });

module.exports = mongoose.model("Categories", categoriesSchema);
