const mongoose = require('mongoose');

const rechargeSchema = new mongoose.Schema({
    driver_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true,
        index: true
    },
    
    plan_type: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
        required: true,
        index: true
    },
    
    amount: {
        type: Number,
        required: true
    },
    
    recharge_date: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    expire_date: {
        type: Date,
        required: true,
        index: true
    },
    
    payment_id: String,
    payment_method: {
        type: String,
        enum: ['upi', 'card', 'netbanking', 'wallet']
    },
    
    transaction_id: {
        type: String,
        unique: true,
        sparse: true
    },
    
    status: {
        type: String,
        enum: ['pending', 'active', 'expired', 'cancelled', 'failed'],
        default: 'pending',
        index: true
    },
    
    auto_renewal: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

rechargeSchema.index({ driver_id: 1, status: 1 });
rechargeSchema.index({ driver_id: 1, expire_date: -1 });

const Recharge = mongoose.model('Recharge', rechargeSchema);
module.exports =  Recharge;
