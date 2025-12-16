const mongoose = require('mongoose');

const companyDetailsSchema = new mongoose.Schema({
    driver:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Driver"
    },
    company_name: {
        type: String,
        required: true
    },
    gst_no:{
    type: String,
    },
    driverPub:{
            type: String,

    },
    address: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    logo: {
       url:{
         type: String,
        default: null
       },
       publicId:{
         type: String,
        default: null
       }
    },
    signature: {
       url:{
         type: String,
        default: null
       },
       publicId:{
         type: String,
        default: null
       }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CompanyDetails', companyDetailsSchema);