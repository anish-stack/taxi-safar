const mongoose = require("mongoose");

const driverJobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title too long"],
    },

    description: {
      type: String,
      required: [true, "Job description is required"],
      minlength: [10, "Description must be at least 10 characters"],
      trim: true,
    },

    company: {
      name: {
        type: String,
        required: [true, "Company name is required"],
        trim: true,
      },
      logo: {
        url: String,
        public_id: String,
      },
    },

    job_type: {
      type: String,
      enum: {
        values: ["full_time", "part_time", "contract", "temporary"],
        message: "Invalid job type",
      },
      default: "full_time",
    },

    salary: {
      min: {
        type: Number,
        required: [true, "Minimum salary is required"],
        min: [0, "Salary cannot be negative"],
      },
      max: {
        type: Number,
        validate: {
          validator: function (v) {
            return !v || v >= this.salary.min;
          },
          message: "Max salary must be greater than or equal to min salary",
        },
      },
      currency: {
        type: String,
        default: "INR",
        uppercase: true,
      },
    },

    location: {
      address: {
        type: String,
        required: [true, "Job location/address is required"],
        trim: true,
      },
      lat: { type: Number },
      lng: { type: Number },
    },

    skills: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    driver_category: {
      type: String,
      enum: {
        values: ["car_driver", "truck_driver", "bus_driver", "delivery_driver", "bike_driver"],
        message: "Invalid driver category",
      },
      default: "car_driver",
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: [true, "Driver ID is required (who posted the job)"],
      index: true,
    },

    valid_till: {
      type: Date,
      required: [true, "Please specify until when this job is valid"],
      validate: {
        validator: function (v) {
          return v > new Date();
        },
        message: "Valid till date must be in the future",
      },
    },

    status: {
      type: String,
      enum: ["active", "expired", "closed"],
      default: "active",
      index: true,
    },

    is_featured: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Auto-update status before saving
driverJobSchema.pre("save", function (next) {
  if (this.valid_till < new Date()) {
    this.status = "expired";
  }
  next();
});

// Text search index
driverJobSchema.index({ title: "text", description: "text", skills: "text", "company.name": "text" });
driverJobSchema.index({ driverId: 1, status: 1 });
driverJobSchema.index({ valid_till: 1 });
driverJobSchema.index({ createdAt: -1 });

module.exports = mongoose.model("DriverJob", driverJobSchema);