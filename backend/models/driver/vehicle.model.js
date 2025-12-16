const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    driver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },

    brand_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleBrand",
    },

    // Vehicle Ownership Type
    vehicle_ownership: {
      type: String,
      enum: ["owner", "driver"],
      required: true,
      default: "owner",
    },

    // Basic Vehicle Info
    vehicle_type: {
      type: String,
      enum: ["mini", "sedan", "suv", "premium", "auto"],
      required: true,
      lowercase: true,
      index: true,
    },

    vehicle_brand: {
      type: String,
      required: true,
      trim: true,
    },

    vehicle_name: {
      type: String,
      required: true,
      trim: true,
    },

    vehicle_number: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    // Technical Details
    chassis_number: {
      type: String,
      trim: true,
      uppercase: true,
    },

    engine_number: {
      type: String,
      trim: true,
      uppercase: true,
    },

    fuel_type: {
      type: String,
      // enum: ['PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID'],
      uppercase: true,
    },

    color: {
      type: String,
      trim: true,
    },

    norms_type: {
      type: String,
      trim: true,
    },

    body_type: {
      type: String,
      trim: true,
    },

    cubic_capacity: {
      type: String,
      trim: true,
    },

    seating_capacity: {
      type: Number,
      min: 1,
      max: 50,
    },

    manufacturing_date: {
      type: String,
      trim: true,
    },

    vehicle_category: {
      type: String,
      trim: true,
    },

    vehicle_category_description: {
      type: String,
      trim: true,
    },

    unladen_weight: {
      type: String,
      trim: true,
    },

    gross_weight: {
      type: String,
      trim: true,
    },

    rto_code: {
      type: String,
      trim: true,
    },

    registered_at: {
      type: String,
      trim: true,
    },

    // Owner Details (from RC)
    owner_details: {
      owner_name: {
        type: String,
        trim: true,
      },
      father_name: {
        type: String,
        trim: true,
      },
      present_address: {
        type: String,
        trim: true,
      },
      permanent_address: {
        type: String,
        trim: true,
      },
      mobile_number: {
        type: String,
        trim: true,
      },
      owner_number: {
        type: String,
        trim: true,
      },
    },

    // Financer Details (if vehicle is financed)
    financer_details: {
      financed: {
        type: String,
        trim: true,
      },
      financerName: {
        type: String,
        trim: true,
      },
    },

    // Registration Certificate (RC Book)
    registration_certificate: {
      rc_number: {
        type: String,
        trim: true,
        uppercase: true,
      },
      register_date: {
        type: Date,
        required: true,
      },
      fit_upto: {
        type: Date,
      },
      rc_status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
        default: "ACTIVE",
      },
      verified: {
        type: Boolean,
        default: false,
      },
      verified_at: {
        type: Date,
      },
      verified_via: {
        type: String,
        enum: ["manual", "quickekyc_api", "other"],
        default: "quickekyc_api",
      },
     front: {
    public_id: String,
    url: String
  },
  back: {
    public_id: String,
    url: String
  },
      document: {
        public_id: { type: String, trim: true },
        url: { type: String, trim: true },
      },
    },

    // Insurance details
    insurance: {
      company_name: {
        type: String,
        trim: true,
      },
      policy_number: {
        type: String,
        trim: true,
      },
      expiry_date: {
        type: Date,
        required: true,
        index: true,
      },
      verified: {
        type: Boolean,
        default: false,
      },
      verified_at: {
        type: Date,
      },
      verified_via: {
        type: String,
        enum: ["manual", "rc_api", "other"],
        default: "rc_api",
      },
      document: {
        public_id: { type: String, trim: true },
        url: { type: String, trim: true },
      },
    },

    // Permit details
    permit: {
      permit_number: {
        type: String,
        trim: true,
      },
      permit_type: {
        type: String,
        trim: true,
      },
      issue_date: {
        type: Date,
      },
      valid_from: {
        type: Date,
      },
      valid_upto: {
        type: Date,
      },
      expiry_date: {
        type: Date,
        required: true,
        index: true,
      },
      verified: {
        type: Boolean,
        default: false,
      },
      verified_at: {
        type: Date,
      },
      document: {
        public_id: { type: String, trim: true },
        url: { type: String, trim: true },
      },
    },

    // Tax Details
    tax_details: {
      tax_upto: {
        type: Date,
      },
      tax_paid_upto: {
        type: Date,
      },
    },

    // PUCC (Pollution Under Control Certificate)
    pucc_details: {
      pucc_number: {
        type: String,
        trim: true,
      },
      pucc_upto: {
        type: Date,
        index: true,
      },
    },

    // Vehicle Photos
    vehicle_photos: {
      front: {
        public_id: { type: String, trim: true },
        url: { type: String, trim: true },
      },
      back: {
        public_id: { type: String, trim: true },
        url: { type: String, trim: true },
      },
      interior: {
        public_id: { type: String, trim: true },
        url: { type: String, trim: true },
      },
    },

    // Store complete RC verification data for reference
    rc_verification_data: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Admin approval status
    approval_status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },

    approved_at: {
      type: Date,
    },

    rejection_reason: {
      type: String,
      trim: true,
    },

    rejected_at: {
      type: Date,
    },

    is_active: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Soft delete
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deleted_at: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for better query performance
vehicleSchema.index({ vehicle_number: 1, is_deleted: 1 });

vehicleSchema.index({ approval_status: 1, is_deleted: 1 });
vehicleSchema.index({ vehicle_ownership: 1, driver_id: 1 });
vehicleSchema.index({ chassis_number: 1 });
vehicleSchema.index({ engine_number: 1 });

// Virtual for checking if documents are expiring soon (within 30 days)
vehicleSchema.virtual("expiring_soon").get(function () {
  const today = new Date();
  const thirtyDaysFromNow = new Date(
    today.getTime() + 30 * 24 * 60 * 60 * 1000
  );

  return {
    insurance:
      this.insurance.expiry_date &&
      this.insurance.expiry_date <= thirtyDaysFromNow,
    permit:
      this.permit.expiry_date && this.permit.expiry_date <= thirtyDaysFromNow,
    pucc:
      this.pucc_details.pucc_upto &&
      this.pucc_details.pucc_upto <= thirtyDaysFromNow,
    tax:
      this.tax_details.tax_upto &&
      this.tax_details.tax_upto <= thirtyDaysFromNow,
  };
});

// Virtual for getting complete vehicle display name
vehicleSchema.virtual("display_name").get(function () {
  return `${this.vehicle_brand} ${this.vehicle_name} (${this.vehicle_number})`;
});

// Method to check if any document is expired
vehicleSchema.methods.hasExpiredDocuments = function () {
  const today = new Date();
  return (
    (this.insurance.expiry_date && this.insurance.expiry_date < today) ||
    (this.permit.expiry_date && this.permit.expiry_date < today) ||
    (this.pucc_details.pucc_upto && this.pucc_details.pucc_upto < today) ||
    (this.tax_details.tax_upto && this.tax_details.tax_upto < today)
  );
};

// Method to get expiry status
vehicleSchema.methods.getExpiryStatus = function () {
  const today = new Date();
  const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    insurance: {
      expired: this.insurance.expiry_date < today,
      expiring_soon: this.insurance.expiry_date <= thirtyDays,
      date: this.insurance.expiry_date,
    },
    permit: {
      expired: this.permit.expiry_date < today,
      expiring_soon: this.permit.expiry_date <= thirtyDays,
      date: this.permit.expiry_date,
    },
    pucc: {
      expired:
        this.pucc_details.pucc_upto && this.pucc_details.pucc_upto < today,
      expiring_soon:
        this.pucc_details.pucc_upto &&
        this.pucc_details.pucc_upto <= thirtyDays,
      date: this.pucc_details.pucc_upto,
    },
    tax: {
      expired: this.tax_details.tax_upto && this.tax_details.tax_upto < today,
      expiring_soon:
        this.tax_details.tax_upto && this.tax_details.tax_upto <= thirtyDays,
      date: this.tax_details.tax_upto,
    },
  };
};

// Pre-save middleware to check document expiry and set active status
// vehicleSchema.pre("save", function (next) {
//   // If documents are expired, deactivate vehicle
//   if (this.hasExpiredDocuments()) {
//     this.is_active = false;
//   }

//   // If approval status is approved and no expired docs, can be active
//   if (this.approval_status === "approved" && !this.hasExpiredDocuments()) {
//     this.is_active = true;
//   }

//   next();
// });

// Method to approve vehicle
vehicleSchema.methods.approve = async function (adminId) {
  this.approval_status = "approved";
  this.approved_by = adminId;
  this.approved_at = new Date();

//   if (!this.hasExpiredDocuments()) {
//     this.is_active = true;
//   }

  return await this.save();
};

// Method to reject vehicle
vehicleSchema.methods.reject = async function (adminId, reason) {
  this.approval_status = "rejected";
  this.approved_by = adminId;
  this.rejected_at = new Date();
  this.rejection_reason = reason;
//   this.is_active = false;

  return await this.save();
};

// Method to soft delete
vehicleSchema.methods.softDelete = async function () {
  this.is_deleted = true;
  this.deleted_at = new Date();
//   this.is_active = false;

  return await this.save();
};

const Vehicle = mongoose.model("Driver_Vehicle", vehicleSchema);
module.exports = Vehicle;
