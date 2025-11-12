const mongoose = require('mongoose');

const permissionsSchema = new mongoose.Schema({
    driver_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true,
        unique: true,
        index: true
    },
    
    location: {
        granted: { type: Boolean, default: false },
        granted_at: Date
    },
    notification: {
        granted: { type: Boolean, default: false },
        granted_at: Date
    },
    overlay: {
        granted: { type: Boolean, default: false },
        granted_at: Date
    },
    camera: {
        granted: { type: Boolean, default: false },
        granted_at: Date
    },
    storage: {
        granted: { type: Boolean, default: false },
        granted_at: Date
    },
    
    all_granted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Permissions = mongoose.model('Permissions', permissionsSchema);
module.exports =  Permissions;
