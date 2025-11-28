const mongoose = require("mongoose");

const driverJobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      minlength: 10,
    },

    company: {
      name: { type: String, required: true },
      logo: {
        url: String,
        public_id: String,
      },
    },

    job_type: {
      type: String,
      enum: ["full_time", "part_time", "contract", "temporary"],
      default: "full_time",
    },

    experience_required: {
      type: String,
      default: "No experience required",
    },

    salary: {
      min: { type: Number, required: true },
      max: { type: Number },
      currency: { type: String, default: "INR" },
    },

    location: {
      address: { type: String, required: true },
      lat: Number,
      lng: Number,
    },

    skills: [
      {
        type: String,
        trim: true,
      },
    ],

    driver_category: {
      type: String,
      enum: ["car_driver", "bus_driver", "truck_driver", "delivery_driver"],
      default: "car_driver",
    },



    valid_till: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "expired", "closed"],
      default: "active",
      index: true,
    },

    position: {
      type: Number,
      unique: true,
      sparse: true, // allow null
    },

    is_featured: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// 🔍 Helpful indexing
driverJobSchema.index({ title: "text", description: "text", skills: "text" });
driverJobSchema.index({ job_type: 1 });
driverJobSchema.index({ valid_till: 1 });
driverJobSchema.index({ createdAt: -1 });

module.exports = mongoose.model("DriverJob", driverJobSchema);
