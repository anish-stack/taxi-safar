const mongoose = require('mongoose');

const { Schema } = mongoose;

const urlRegex = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;

const BannerSchema = new Schema(
    {
        url: {
            type: String,
            required: true,
            trim: true,
            match: [urlRegex, 'Please fill a valid URL for url']
        },
        publicId: {
            type: String,
            required: true,
            trim: true
        },
        link: {
            type: String,
            trim: true,
            match: [urlRegex, 'Please fill a valid URL for link'],
            default: ''
        },
        active: {
            type: Boolean,
            default: true
        },
        position: {
            type: Number,
            required: true,
            unique: true,
            min: 0
        }
    },
    { timestamps: true }
);

// optional: ensure position has an index for fast ordering
BannerSchema.index({ position: 1 });

module.exports = mongoose.model("Banner", BannerSchema);
