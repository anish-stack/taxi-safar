const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema(
    {
        slug: {
            type: String,
           
           
            lowercase: true,
            trim: true,
        },
        title: {
            type: String,
         
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        content: {
            type: String,
            required: true,
        },
        seoTitle: {
            type: String,
            trim: true,
        },
        seoDescription: {
            type: String,
            trim: true,
        },
        seoKeywords: {
            type: [String],
            default: [],
        },
        isPublished: {
            type: Boolean,
            default: false,
        },
        isEditable: {
            type: Boolean,
            default: true,
        },
        pageType: {
            type: String,
            // enum: ['aboutUs', 'privacyPolicy', 'termsConditions', 'contactUs', 'custom'],
            required: true,
        },
        metadata: {
            headerEnabled: Boolean,
            footerEnabled: Boolean,
            customCSS: String,
        },
       
    },
    { timestamps: true }
);

module.exports = mongoose.model('Page', pageSchema);