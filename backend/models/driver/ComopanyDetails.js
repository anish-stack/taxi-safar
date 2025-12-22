const mongoose = require("mongoose");

const companyDetailsSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
    company_name: {
      type: String,
      required: true,
    },
    gst_no: {
      type: String,
    },
    driverPub: {
      type: String,
      unique: true,
      index: true,
    },
    rating: {
      type: String,
      default: "4.5",
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    successfulRides: {
      type: Number,
      default: 0,
    },
    CancelRides: {
      type: Number,
      default: 0,
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    logo: {
      url: {
        type: String,
        default: null,
      },
      publicId: {
        type: String,
        default: null,
      },
    },
    signature: {
      url: {
        type: String,
        default: null,
      },
      publicId: {
        type: String,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

companyDetailsSchema.pre("save", async function (next) {
  if (this.driverPub) return next(); // already exists

  let isUnique = false;
  let driverPub;

  while (!isUnique) {
    driverPub = `DRV-${Math.floor(100000 + Math.random() * 900000)}`;

    const exists = await mongoose.models.CompanyDetails.findOne({
      driverPub,
    });

    if (!exists) isUnique = true;
  }

  this.driverPub = driverPub;
  next();
});

module.exports = mongoose.model("CompanyDetails", companyDetailsSchema);
