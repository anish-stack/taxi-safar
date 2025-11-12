const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    driver_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true,
        index: true
    },

    vehicle_type: {
        type: String,
        enum: ['bike', 'auto', 'mini', 'sedan', 'suv', 'premium'],
        required: true,
        index: true
    },

    vehicle_number: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },

    vehicle_brand: {
        type: String,
        trim: true
    },



    // Registration details (RC)
    registration_certificate: {
        register_date: { type: Date },
        certificate_number: { type: String, trim: true },
        expiry_date: { type: Date },
        verified: { type: Boolean, default: false },
        verified_at: Date,
        documentFront: {
            public_id: { type: String, trim: true },
            url: { type: String, trim: true }
        },
        documentBack: {
            public_id: { type: String, trim: true },
            url: { type: String, trim: true }
        }
    },

    // Insurance details
    insurance: {
        expiry_date: { type: Date, index: true },
        verified: { type: Boolean, default: false },
        document: {
            public_id: { type: String, trim: true },
            url: { type: String, trim: true }
        }
    },


    // Fitness certificate
    permit: {
        expiry_date: { type: Date, index: true },
        document: {
            public_id: { type: String, trim: true },
            url: { type: String, trim: true }
        }
    },



    is_active: {
        type: Boolean,
        default: false,
        index: true
    },

}, {
    timestamps: true
});

// Indexes for better query performance
vehicleSchema.index({ driver_id: 1, is_active: 1 });
vehicleSchema.index({ 'insurance.expiry_date': 1 });
vehicleSchema.index({ 'fitness_certificate.expiry_date': 1 });
vehicleSchema.index({ 'registration_certificate.expiry_date': 1 });

const Vehicle = mongoose.model('Driver_Vehicle', vehicleSchema);
module.exports = Vehicle;
