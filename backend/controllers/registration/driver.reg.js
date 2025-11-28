const { deleteFile } = require('../../middlewares/multer');
const Driver = require('../../models/driver/driver.model');
const Document = require('../../models/driver/documents.model');
const { deleteImage, uploadSingleImage } = require('../../utils/cloudinary');
const jwt = require('jsonwebtoken');
const Vehicle = require('../../models/driver/vehicle.model');
const BankDetails = require('../../models/driver/bankDetails.model');
const sendDltMessage = require('../../utils/DltMessage');
// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate unique referral ID for driver
 */
function generateReferralId(driverName, mobile) {
    const namePrefix = driverName.substring(0, 3).toUpperCase();
    const mobileDigits = mobile.slice(-4);
    const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${namePrefix}${mobileDigits}${randomChars}`;
}

/**
 * Validate required fields
 */
function validateRequiredFields(body) {
    const requiredFields = {
        name: 'Driver name',
        dob: 'Date of birth',
        mobile: 'Mobile number',
        aadhaarNumber: 'Aadhaar number',
        dlNumber: 'Driving license number'
    };

    const missing = [];
    for (const [field, label] of Object.entries(requiredFields)) {
        if (!body[field] || body[field].trim() === '') {
            missing.push(label);
        }
    }

    return {
        isValid: missing.length === 0,
        missingFields: missing
    };
}

/**
 * Validate required documents
 */
function validateRequiredDocuments(files) {
    const requiredDocs = [
        { fieldname: 'aadhaarFrontDocument', label: 'Aadhaar Front' },
        { fieldname: 'aadhaarBackDocument', label: 'Aadhaar Back' },
        { fieldname: 'panDocument', label: 'PAN Card' },
        { fieldname: 'licenseFrontDocument', label: 'License Front' },
        { fieldname: 'licenseBackDocument', label: 'License Back' }
    ];

    const missing = [];
    const documentsMap = {};

    for (const doc of requiredDocs) {
        const file = files.find(f => f.fieldname === doc.fieldname);
        if (!file) {
            missing.push(doc.label);
        } else {
            documentsMap[doc.fieldname] = file;
        }
    }

    return {
        isValid: missing.length === 0,
        missingDocuments: missing,
        documentsMap
    };
}

/**
 * Upload documents in parallel for better performance
 */
async function uploadDocumentsParallel(documentsMap) {
    const uploadPromises = {
        aadhaarFront: documentsMap.aadhaarFrontDocument
            ? uploadSingleImage(documentsMap.aadhaarFrontDocument.path, 'driver_documents/aadhar/front')
            : null,
        aadhaarBack: documentsMap.aadhaarBackDocument
            ? uploadSingleImage(documentsMap.aadhaarBackDocument.path, 'driver_documents/aadhar/back')
            : null,
        pan: documentsMap.panDocument
            ? uploadSingleImage(documentsMap.panDocument.path, 'driver_documents/pan')
            : null,
        licenseFront: documentsMap.licenseFrontDocument
            ? uploadSingleImage(documentsMap.licenseFrontDocument.path, 'driver_documents/license/front')
            : null,
        licenseBack: documentsMap.licenseBackDocument
            ? uploadSingleImage(documentsMap.licenseBackDocument.path, 'driver_documents/license/back')
            : null
    };

    // Upload all documents in parallel
    const results = await Promise.all([
        uploadPromises.aadhaarFront,
        uploadPromises.aadhaarBack,
        uploadPromises.pan,
        uploadPromises.licenseFront,
        uploadPromises.licenseBack
    ]);

    return {
        aadhaarFront: results[0],
        aadhaarBack: results[1],
        pan: results[2],
        licenseFront: results[3],
        licenseBack: results[4]
    };
}

/**
 * Cleanup local files after upload
 */
function cleanupLocalFiles(files) {
    if (!files || files.length === 0) return;

    files.forEach(file => {
        try {
            deleteFile(file.filename);
        } catch (error) {
            console.warn(`⚠️ Failed to delete local file: ${file.filename}`);
        }
    });
}

/**
 * Cleanup Cloudinary uploads on error
 */
async function cleanupCloudinaryUploads(uploadedImages) {
    const cleanupPromises = Object.values(uploadedImages)
        .filter(img => img && img.public_id)
        .map(img => deleteImage(img.public_id).catch(() => { }));

    await Promise.all(cleanupPromises);
}

/**
 * Generate 6-digit OTP
 */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================
// MAIN REGISTRATION CONTROLLER
// ============================================

exports.registerDriver = async (req, res) => {
    const startTime = performance.now();
    let uploadedImages = {};
    const files = req.files || [];

    try {
        const body = req.body || {};

        console.log('\n========== DRIVER REGISTRATION STARTED ==========');
        console.log('📥 Request Body:', {
            name: body.name,
            mobile: body.mobile,
            email: body.email,
            aadhaarNumber: body.aadhaarNumber?.slice(-4) + '****', // Masked
            dlNumber: body.dlNumber
        });
        console.log('📂 Files received:', files.length);

        // ========================================
        // STEP 1: VALIDATE INPUT FIELDS
        // ========================================
        const fieldValidation = validateRequiredFields(body);
        if (!fieldValidation.isValid) {
            cleanupLocalFiles(files);
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${fieldValidation.missingFields.join(', ')}`
            });
        }

        const {
            name,
            dob,
            mobile,
            email,
            gender,
            aadhaarNumber,
            dlNumber,
            address,
            fcmToken,
            deviceId,
            referralIdApplied
        } = body;

        // Validate mobile number format
        if (!/^[6-9]\d{9}$/.test(mobile)) {
            cleanupLocalFiles(files);
            return res.status(400).json({
                success: false,
                message: 'Invalid mobile number format. Must be a valid 10-digit Indian number.'
            });
        }

        // Validate Aadhaar format (12 digits)
        if (!/^\d{12}$/.test(aadhaarNumber)) {
            cleanupLocalFiles(files);
            return res.status(400).json({
                success: false,
                message: 'Invalid Aadhaar number. Must be 12 digits.'
            });
        }

        // ========================================
        // STEP 2: VALIDATE DOCUMENTS
        // ========================================
        const docValidation = validateRequiredDocuments(files);
        if (!docValidation.isValid) {
            cleanupLocalFiles(files);
            return res.status(400).json({
                success: false,
                message: `Missing required documents: ${docValidation.missingDocuments.join(', ')}`
            });
        }

        console.log('✅ Validation passed');

        // ========================================
        // STEP 3: CHECK FOR EXISTING DRIVER
        // ========================================
        const existingDriver = await Driver.findOne({
            $or: [
                { aadhar_number: aadhaarNumber },
                { driver_contact_number: mobile }
            ]
        }).select('_id driver_name driver_contact_number aadhar_number account_status steps_complete');

        if (existingDriver) {
            cleanupLocalFiles(files);

            // If driver exists and already completed registration
            if (existingDriver.steps_complete >= 1) {
                return res.status(409).json({
                    success: false,
                    message: 'Driver already registered with this Aadhaar or mobile number.',
                    data: {
                        driver_id: existingDriver._id,
                        name: existingDriver.driver_name,
                        status: existingDriver.account_status,
                        steps_complete: existingDriver.steps_complete
                    }
                });
            }

            console.log('⚠️ Driver exists but incomplete registration. Proceeding with update...');
        }

        // ========================================
        // STEP 4: UPLOAD DOCUMENTS (PARALLEL)
        // ========================================
        console.log('📤 Uploading documents to Cloudinary...');

        uploadedImages = await uploadDocumentsParallel(docValidation.documentsMap);

        console.log('✅ All documents uploaded successfully');

        // Cleanup local files immediately after upload
        cleanupLocalFiles(files);

        // ========================================
        // STEP 5: CREATE OR UPDATE DRIVER
        // ========================================
        let driver;

        if (existingDriver) {
            // Update existing driver
            driver = existingDriver;
            driver.driver_name = name;
            driver.driver_dob = new Date(dob);
            driver.driver_contact_number = mobile;
            driver.driver_email = email || undefined;
            driver.driver_gender = gender || undefined;
            driver.aadhar_number = aadhaarNumber;
            driver.fcm_token = fcmToken || undefined;
            driver.device_id = deviceId || undefined;
            driver.referral_id_applied = referralIdApplied || undefined;
            driver.steps_complete = 1;
            driver.account_status = 'pending';
            driver.profile_photo=''
            console.log('🔄 Updating existing driver:', driver._id);
        } else {
            // Create new driver
            const referralId = generateReferralId(name, mobile);
            const aadharOtp = generateOTP();
            const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            driver = new Driver({
                driver_name: name,
                driver_dob: new Date(dob),
                driver_contact_number: mobile,
                driver_email: email || undefined,
                driver_gender: gender || undefined,
                aadhar_number: aadhaarNumber,
                referral_id: referralId,
                referral_id_applied: referralIdApplied || undefined,
                fcm_token: fcmToken || undefined,
                device_id: deviceId || undefined,
                aadhar_verified: true,
                steps_complete: 1,
                account_status: 'pending',
                is_online: false,
                is_on_ride: false,
                profile_photo:'',
                average_rating: 1.0,
                total_rides: 0,
                completed_rides: 0,
                currentRadius: 5
            });

            console.log('🆕 Creating new driver with referral ID:', referralId);
        }

        await driver.save();
        console.log('✅ Driver saved:', driver._id);

        // ========================================
        // STEP 6: CREATE OR UPDATE DOCUMENTS
        // ========================================
        let documents = await Document.findOne({ driver_id: driver._id });

        if (!documents) {
            documents = new Document({ driver_id: driver._id });
            console.log('📄 Creating new documents record');
        } else {
            console.log('📝 Updating existing documents:', documents._id);
        }

        // Update document fields
        documents.aadhar_card = {
            document_number: aadhaarNumber,
            front: {
                url: uploadedImages.aadhaarFront.image,
                public_id: uploadedImages.aadhaarFront.public_id
            },
            back: {
                url: uploadedImages.aadhaarBack.image,
                public_id: uploadedImages.aadhaarBack.public_id
            },
            verified: false,
            uploaded_at: new Date()
        };

        documents.pan_card = {
            document: {
                url: uploadedImages.pan.image,
                public_id: uploadedImages.pan.public_id
            },
            verified: false,
            uploaded_at: new Date()
        };

        documents.driving_license = {
            license_number: dlNumber,
            front: {
                url: uploadedImages.licenseFront.image,
                public_id: uploadedImages.licenseFront.public_id
            },
            back: {
                url: uploadedImages.licenseBack.image,
                public_id: uploadedImages.licenseBack.public_id
            },
            verified: false,
            uploaded_at: new Date()
        };

        await documents.save();
        console.log('✅ Documents saved:', documents._id);

        // ========================================
        // STEP 7: LINK DOCUMENTS TO DRIVER
        // ========================================
        if (!driver.document_id || driver.document_id.toString() !== documents._id.toString()) {
            driver.document_id = documents._id;
            await driver.save();
            console.log('🔗 Linked documents to driver');
        }

        // ========================================
        // STEP 8: SEND RESPONSE
        // ========================================
        const executionTime = `${((performance.now() - startTime) / 1000).toFixed(3)}s`;

        console.log('\n========== REGISTRATION COMPLETED ==========');
        console.log(`Driver ID: ${driver._id}`);
        console.log(`Referral ID: ${driver.referral_id}`);
        console.log(`Documents ID: ${documents._id}`);
        console.log(`Execution Time: ${executionTime}`);
        console.log('============================================\n');

        return res.status(201).json({
            success: true,
            message: 'Driver registered successfully. Please verify your Aadhaar OTP.',
            data: {
                driver_id: driver._id,
                name: driver.driver_name,
                mobile: driver.driver_contact_number,
                email: driver.driver_email,
                referral_id: driver.referral_id,
                aadhar_verified: driver.aadhar_verified,
                steps_complete: driver.steps_complete,
                account_status: driver.account_status,
                documents: {
                    id: documents._id,
                    aadhar_uploaded: true,
                    pan_uploaded: true,
                    license_uploaded: true,
                    all_verified: false
                },
                next_step: 'verify_aadhaar_otp'
            },
            executionTime
        });

    } catch (error) {
        const executionTime = `${((performance.now() - startTime) / 1000).toFixed(3)}s`;

        console.error('\n❌ ========== REGISTRATION FAILED ==========');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('============================================\n');

        // Cleanup uploaded images from Cloudinary
        await cleanupCloudinaryUploads(uploadedImages);

        // Cleanup local files
        cleanupLocalFiles(files);

        // Handle specific errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(409).json({
                success: false,
                message: `A driver with this ${field} already exists.`,
                executionTime
            });
        }

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors,
                executionTime
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Server error while processing driver registration.',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            executionTime
        });
    }
};


exports.login = async (req, res) => {
    try {
        const { number } = req.body;
        console.log("📩 Login request received for number:", number);

        // Validate number  
        if (!number) {
            return res.status(400).json({
                success: false,
                message: "Mobile number is required.",
            });
        }

        // Check driver existence  
        const driver = await Driver.findOne({ driver_contact_number: number })
            .populate("BankDetails", "account_number")
            .populate("document_id")
            .lean();

        if (!driver) {
            return res.status(400).json({
                success: false,
                redirect: "step-1",
                message: "Driver not found. Please register first.",
            });
        }

        const documents = driver.document_id || null;

        // Step 1 → Aadhaar verification
        if (!driver.aadhar_verified) {
            return res.status(400).json({
                success: false,
                driver,
                redirect: "step-2",
                message: "Please verify your Aadhaar and complete registration.",
            });
        }

        // Step 2 → PAN + DL check
        const hasDocsUploaded =
            documents?.pan_card?.document?.url &&
            documents?.driving_license?.front?.url;

        if (!hasDocsUploaded) {
            return res.status(400).json({
                success: false,
                driver,
                redirect: "step-2",
                message: "Please upload your PAN and Driving License to continue.",
            });
        }

        // Step 3 → Vehicle added or not
        if (!driver.current_vehicle_id) {
            return res.status(400).json({
                success: false,
                driver,
                redirect: "step-3",
                message: "Please add your vehicle details to continue.",
            });
        }

        // Step 4 → Bank details check
        if (!driver.BankDetails || !driver.BankDetails.account_number) {
            return res.status(400).json({
                success: false,
                driver,
                redirect: "step-4",
                message: "Please complete your bank details to proceed.",
            });
        }

        // Step 5 → Account status check
        if (
            driver.account_status !== "active" &&
            driver.account_status !== "suspended" &&
            driver.account_status !== "blocked"
        ) {
            return res.status(403).json({
                success: false,
                driver,
                redirect: "step-5",
                message: "Your documents are under verification. Please wait for approval.",
            });
        }

        // ------------------------------------------------------
        // ⭐ SPECIAL CONDITION → Default OTP for specific number
        // ------------------------------------------------------
        let otp;
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        if (number === "7217619794") {
            otp = 123456;
            console.log("🎯 Test number detected. Using default OTP:", otp);
        } else {
            otp = Math.floor(100000 + Math.random() * 900000);
            console.log(`📱 Generated OTP ${otp} for driver: ${driver._id}`);
        }

        // Save OTP to DB
        await Driver.updateOne(
            { _id: driver._id },
            {
                $set: {
                    loginOtp: otp,
                    loginOtpExpiry: otpExpiry,
                },
            }
        );

        // ------------------------------------------------------
        // ⭐ FOR TEST NUMBER → Do NOT send SMS
        // ------------------------------------------------------
        if (number !== "7217619794") {
            await sendDltMessage(number, otp);
            console.log("📤 OTP sent via SMS to:", number);
        } else {
            console.log("🚫 Skipped sending SMS for test number.");
        }

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully.",
            otpExpiry,
            testNumber: number === "7217619794" ? true : false,
        });

    } catch (error) {
        console.error("❌ Error in login controller:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during login.",
            error: error.message,
        });
    }
};



exports.verifyOtp = async (req, res) => {
    try {
        const { number, otp } = req.body;
        console.log("req.bod", req.body)
        // ✅ Validate input
        if (!number || !otp) {
            return res.status(400).json({
                success: false,
                message: "Mobile number and OTP are required.",
            });
        }

        // ✅ Find driver by mobile number
        const driver = await Driver.findOne({ driver_contact_number: number });
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found. Please register first.",
            });
        }

        // ✅ Check if OTP exists and is valid
        if (!driver.loginOtp || !driver.loginOtpExpiry) {
            return res.status(400).json({
                success: false,
                message: "OTP not found or expired. Please request a new OTP.",
            });
        }

        // ✅ Check OTP expiry
        if (new Date(driver.loginOtpExpiry).getTime() < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one.",
            });
        }

        // ✅ Match OTP
        if (driver.loginOtp !== otp.toString()) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again.",
            });
        }

        // ✅ OTP verified → clear OTP fields
        driver.loginOtp = null;
        driver.loginOtpExpiry = null;

        // ✅ Generate tokens
        const accessToken = driver.generateAuthToken();
        const refreshToken = driver.generateRefreshToken();

        // ✅ Save refresh token in DB
        driver.refresh_token = refreshToken;
        await driver.save();

        // ✅ Set refresh token in cookie (HTTP-only)
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        // ✅ Return response with access token
        return res.status(200).json({
            success: true,
            message: "OTP verified successfully. Logged in successfully!",
            accessToken,
            data: {
                driver_id: driver._id,
                name: driver.driver_name,
                contact: driver.driver_contact_number,
                account_status: driver.account_status,
                steps_complete: driver.steps_complete,
            },
        });
    } catch (error) {
        console.error("❌ Error verifying OTP:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while verifying OTP. Please try again.",
            error: error.message,
        });
    }
};

exports.resendOtp = async (req, res) => {
    try {
        const { number } = req.body;

        // ✅ Validate input
        if (!number) {
            return res.status(400).json({
                success: false,
                message: "Mobile number is required.",
            });
        }

        // ✅ Find driver
        const driver = await Driver.findOne({ driver_contact_number: number });
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found. Please register first.",
            });
        }

        // ✅ Prevent rapid OTP resends (e.g., within 60 seconds)
        if (
            driver.loginOtpExpiry &&
            new Date(driver.loginOtpExpiry).getTime() - Date.now() > 4 * 60 * 1000
        ) {
            return res.status(429).json({
                success: false,
                message: "Please wait 1 minute before requesting a new OTP.",
            });
        }

        // ✅ Generate new OTP and expiry
        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

        // ✅ Save new OTP
        driver.loginOtp = otp;
        driver.loginOtpExpiry = otpExpiry;
        await driver.save();

        // ✅ Send OTP message
        await sendDltMessage(number, otp);

        return res.status(200).json({
            success: true,
            message: "New OTP sent successfully.",
        });
    } catch (error) {
        console.error("❌ Error in resendOtp:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while resending OTP.",
            error: error.message,
        });
    }
};

exports.getDriverDetailsViaId = async (req, res) => {
    try {
        const { driverId } = req.params;

        // ✅ Validate driverId
        if (!driverId) {
            return res.status(400).json({
                success: false,
                message: "Driver ID is required.",
            });
        }

        // ✅ Find driver by ID and populate related fields if needed
        const driver = await Driver.findById(driverId)
            .populate("document_id current_vehicle_id BankDetails wallet")
            .lean();

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found.",
            });
        }

        // ✅ Send success response
        return res.status(200).json({
            success: true,
            message: "Driver details fetched successfully.",
            data: driver,
        });
    } catch (error) {
        console.error("❌ Error fetching driver details:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching driver details.",
            error: error.message,
        });
    }
};

exports.getDriverDetails = async (req, res) => {
    try {
        const driverId = req.user?._id;

        const driver = await Driver.findById(driverId)
            .populate("document_id current_vehicle_id BankDetails wallet")
            .lean();

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Driver details fetched successfully.",
            is_online: driver.is_online,
            is_OnRide: driver.is_on_ride,
            currentRadius: driver.currentRadius || 5,

            // 🛡️ Safe location handling — will not crash
            location: driver.current_location?.coordinates || null,

            data: driver,
        });
    } catch (error) {
        console.error("❌ Error fetching driver details:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching driver details.",
            error: error.message,
        });
    }
};


exports.addVehicleDetails = async (req, res) => {
    let uploadedFiles = {};

    try {
        const { driverId } = req.params;
        const files = req.files || [];
        const body = req.body || {};

        console.log("📥 Vehicle add request body:", body);
        console.log("📂 Uploaded files:", files);

        // Validate Driver ID
        if (!driverId) {
            files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({ success: false, message: "Driver ID is required." });
        }

        // Check driver
        const driver = await Driver.findById(driverId);
        if (!driver) {
            files.forEach(f => deleteFile(f.filename));
            return res.status(404).json({ success: false, message: "Driver not found." });
        }

        // Parse RC data if present
        let rcData = null;
        if (body.rcData) {
            try {
                rcData = typeof body.rcData === 'string' ? JSON.parse(body.rcData) : body.rcData;
                console.log("✅ RC Data parsed successfully:", rcData.rc_number);
            } catch (err) {
                console.error("❌ Error parsing RC data:", err);
                files.forEach(f => deleteFile(f.filename));
                return res.status(400).json({
                    success: false,
                    message: "Invalid RC data format."
                });
            }
        }

        // Extract body fields
        const {
            brandId,
            vehicle_brand,
            vehicleName,
            vehicleType,
            vehicleNumber,
            registrationDate,
            insuranceExpiry,
            permitExpiry,
            vehicleOwnership,
            maker_model,
            maker_description,
            fuel_type,
            color,
            norms_type
        } = body;

        // Required validation
        if (!vehicleType || !vehicleNumber || !vehicleOwnership) {
            files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({
                success: false,
                message: "Missing required fields: vehicleType, vehicleNumber, or vehicleOwnership",
            });
        }

        // Validate RC data is present
        if (!rcData) {
            files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({
                success: false,
                message: "RC verification data is required. Please verify RC first.",
            });
        }

        // Check if vehicle number already exists
        const existingVehicle = await Vehicle.findOne({
            vehicle_number: vehicleNumber.toUpperCase(),
            is_deleted: false
        });

        if (existingVehicle) {
            files.forEach(f => deleteFile(f.filename));
            return res.status(409).json({
                success: false,
                message: "Vehicle with this number already exists.",
            });
        }

        // FILES - Only permit and vehicle photos are uploaded
        const permitFile = files.find(f => f.fieldname === "permit");
        const vehicleFront = files.find(f => f.fieldname === "vehicleFront");
        const vehicleBack = files.find(f => f.fieldname === "vehicleBack");
        const vehicleInterior = files.find(f => f.fieldname === "vehicleInterior");

        // Validate required files
        if (!permitFile || !vehicleFront || !vehicleBack || !vehicleInterior) {
            files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({
                success: false,
                message: "Missing required files: permit, front photo, back photo, or interior photo",
            });
        }

        // UPLOAD TO CLOUDINARY
        if (permitFile)
            uploadedFiles.permit = await uploadSingleImage(permitFile.path, "vehicle_documents/permit");

        if (vehicleFront)
            uploadedFiles.vehicleFront = await uploadSingleImage(vehicleFront.path, "vehicle_photos/front");

        if (vehicleBack)
            uploadedFiles.vehicleBack = await uploadSingleImage(vehicleBack.path, "vehicle_photos/back");

        if (vehicleInterior)
            uploadedFiles.vehicleInterior = await uploadSingleImage(vehicleInterior.path, "vehicle_photos/interior");

        // Delete temp files
        files.forEach(f => deleteFile(f.filename));

        // Extract additional vehicle details from RC data
        const vehicleDetails = {
            chassisNumber: rcData.vehicle_chasi_number || null,
            engineNumber: rcData.vehicle_engine_number || null,
            fuelType: rcData.fuel_type || fuel_type || null,
            color: rcData.color || color || null,
            normsType: rcData.norms_type || norms_type || null,
            bodyType: rcData.body_type || null,
            cubicCapacity: rcData.cubic_capacity || null,
            seatingCapacity: rcData.seat_capacity || null,
            manufacturingDate: rcData.manufacturing_date_formatted || null,
            rtoCode: rcData.rto_code || null,
            registeredAt: rcData.registered_at || null,
            vehicleCategory: rcData.vehicle_category || null,
            vehicleCategoryDescription: rcData.vehicle_category_description || null,
            unladen_weight: rcData.unladen_weight || null,
            gross_weight: rcData.vehicle_gross_weight || null,
        };

        // Owner details from RC
        const ownerDetails = {
            ownerName: rcData.owner_name || null,
            fatherName: rcData.father_name || null,
            presentAddress: rcData.present_address || null,
            permanentAddress: rcData.permanent_address || null,
            mobileNumber: rcData.mobile_number || null,
            ownerNumber: rcData.owner_number || null,
        };

        // Financer details if vehicle is financed
        const financerDetails = rcData.financed ? {
            financed: rcData.financed || null,
            financerName: rcData.financer || null,
        } : null;

        // Permit details from RC
        const permitDetails = {
            permitNumber: rcData.permit_number || null,
            permitType: rcData.permit_type || null,
            permitIssueDate: rcData.permit_issue_date || null,
            permitValidFrom: rcData.permit_valid_from || null,
            permitValidUpto: rcData.permit_valid_upto || permitExpiry || null,
        };

        // Insurance details from RC
        const insuranceDetails = {
            insuranceCompany: rcData.insurance_company || null,
            insurancePolicyNumber: rcData.insurance_policy_number || null,
            insuranceUpto: rcData.insurance_upto || insuranceExpiry || null,
        };

        // Tax & PUCC details
        const taxPuccDetails = {
            taxUpto: rcData.tax_upto || null,
            taxPaidUpto: rcData.tax_paid_upto || null,
            puccNumber: rcData.pucc_number || null,
            puccUpto: rcData.pucc_upto || null,
        };

        // CREATE VEHICLE OBJECT
        const vehicle = new Vehicle({
            driver_id: driver._id,
            brand_id: brandId || null,

            vehicle_type: vehicleType?.toLowerCase(),
            vehicle_brand: maker_description || vehicle_brand || null,
            vehicle_name: maker_model || vehicleName || null,
            vehicle_number: vehicleNumber?.toUpperCase(),
            vehicle_ownership: vehicleOwnership, // "owner" or "driver"

            // Vehicle technical details
            chassis_number: vehicleDetails.chassisNumber,
            engine_number: vehicleDetails.engineNumber,
            fuel_type: vehicleDetails.fuelType,
            color: vehicleDetails.color,
            norms_type: vehicleDetails.normsType,
            body_type: vehicleDetails.bodyType,
            cubic_capacity: vehicleDetails.cubicCapacity,
            seating_capacity: vehicleDetails.seatingCapacity ? parseInt(vehicleDetails.seatingCapacity) : null,
            manufacturing_date: vehicleDetails.manufacturingDate,
            vehicle_category: vehicleDetails.vehicleCategory,
            vehicle_category_description: vehicleDetails.vehicleCategoryDescription,
            unladen_weight: vehicleDetails.unladen_weight,
            gross_weight: vehicleDetails.gross_weight,
            rto_code: vehicleDetails.rtoCode,
            registered_at: vehicleDetails.registeredAt,

            // Owner details
            owner_details: {
                owner_name: ownerDetails.ownerName,
                father_name: ownerDetails.fatherName,
                present_address: ownerDetails.presentAddress,
                permanent_address: ownerDetails.permanentAddress,
                mobile_number: ownerDetails.mobileNumber,
                owner_number: ownerDetails.ownerNumber,
            },

            // Financer details (if applicable)
            financer_details: financerDetails,

            // RC details (stored from API, no document upload needed)
            registration_certificate: {
                rc_number: rcData.rc_number,
                register_date: registrationDate || rcData.registration_date || null,
                fit_upto: rcData.fit_up_to || null,
                rc_status: rcData.rc_status || "ACTIVE",
                verified: true, // Already verified via API
                verified_at: new Date(),
                verified_via: "quickekyc_api",
                // No document stored since it's verified via API
                document: {
                    url: null,
                    public_id: null,
                },
            },

            // Insurance details (from RC API)
            insurance: {
                company_name: insuranceDetails.insuranceCompany,
                policy_number: insuranceDetails.insurancePolicyNumber,
                expiry_date: insuranceDetails.insuranceUpto || null,
                verified: true, // From RC API
                verified_at: new Date(),
                verified_via: "rc_api",
                document: {
                    url: null,
                    public_id: null,
                },
            },

            // Permit details (uploaded + API data)
            permit: {
                permit_number: permitDetails.permitNumber,
                permit_type: permitDetails.permitType,
                issue_date: permitDetails.permitIssueDate,
                valid_from: permitDetails.permitValidFrom,
                valid_upto: permitDetails.permitValidUpto,
                expiry_date: permitExpiry || permitDetails.permitValidUpto || null,
                verified: false, // Will be verified by admin
                document: uploadedFiles.permit
                    ? {
                        url: uploadedFiles.permit.image,
                        public_id: uploadedFiles.permit.public_id
                    }
                    : {},
            },

            // Tax and PUCC
            tax_details: {
                tax_upto: taxPuccDetails.taxUpto,
                tax_paid_upto: taxPuccDetails.taxPaidUpto,
            },

            pucc_details: {
                pucc_number: taxPuccDetails.puccNumber,
                pucc_upto: taxPuccDetails.puccUpto,
            },

            // Vehicle Photos
            vehicle_photos: {
                front: uploadedFiles.vehicleFront
                    ? {
                        url: uploadedFiles.vehicleFront.image,
                        public_id: uploadedFiles.vehicleFront.public_id
                    }
                    : {},

                back: uploadedFiles.vehicleBack
                    ? {
                        url: uploadedFiles.vehicleBack.image,
                        public_id: uploadedFiles.vehicleBack.public_id
                    }
                    : {},

                interior: uploadedFiles.vehicleInterior
                    ? {
                        url: uploadedFiles.vehicleInterior.image,
                        public_id: uploadedFiles.vehicleInterior.public_id
                    }
                    : {},
            },

            // Store complete RC data for reference
            rc_verification_data: rcData,

            // Status
            approval_status: "pending",
            is_active: false, // Will be activated after admin approval
        });

        await vehicle.save();

        // Update driver
        driver.current_vehicle_id = vehicle._id;
        await driver.save();

        console.log("✅ Vehicle added successfully:", vehicle.vehicle_number);

        return res.status(201).json({
            success: true,
            message: "✅ Vehicle details added successfully. Pending admin approval.",
            driverId: driver._id,
            vehicleId: vehicle._id,
            data: {
                vehicle_number: vehicle.vehicle_number,
                vehicle_type: vehicle.vehicle_type,
                vehicle_brand: vehicle.vehicle_brand,
                vehicle_name: vehicle.vehicle_name,
                ownership: vehicle.vehicle_ownership,
                approval_status: vehicle.approval_status,
            }
        });

    } catch (error) {
        console.error("❌ Error adding vehicle details:", error);

        // Cloudinary cleanup
        for (const key in uploadedFiles) {
            if (uploadedFiles[key]?.public_id) {
                try {
                    await deleteImage(uploadedFiles[key].public_id);
                } catch (cleanupError) {
                    console.error("Cloudinary cleanup error:", cleanupError);
                }
            }
        }

        // Local cleanup
        (req.files || []).forEach(f => {
            try {
                deleteFile(f.filename);
            } catch (cleanupError) {
                console.error("Local file cleanup error:", cleanupError);
            }
        });

        res.status(500).json({
            success: false,
            message: "Server error while adding vehicle details.",
            error: error.message,
        });
    }
};


exports.updateCurrentRadius = async (req, res) => {
    try {
        const driverId = req.user?._id;
        const { radius } = req.body;

        // 1️⃣ Validate input
        if (!radius || isNaN(radius)) {
            return res.status(400).json({
                success: false,
                message: "Radius value is required and must be a number.",
            });
        }

        // 2️⃣ Update driver's currentRadius
        const updatedDriver = await Driver.findByIdAndUpdate(
            driverId,
            { currentRadius: radius },
            { new: true, select: "currentRadius" }
        );

        // 3️⃣ Handle not found case
        if (!updatedDriver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found.",
            });
        }

        // 4️⃣ Respond success
        return res.status(200).json({
            success: true,
            message: "Radius updated! You’ll now receive rides within the new distance.",
            currentRadius: updatedDriver.currentRadius,
        });
    } catch (error) {
        console.error("❌ updateCurrentRadius error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};


exports.addBankDetails = async (req, res) => {
    try {
        console.log("📥 Incoming Request Body:", req.body);

        // Driver ID — from token or params
        const driverId = req.params.driverId || req.user?.userId;
        console.log("🆔 Driver ID Received:", driverId);

        if (!driverId) {
            console.log("❌ DriverId missing!");
            return res.status(400).json({
                success: false,
                message: "Driver ID is missing. Please log in again.",
            });
        }

        const {
            bank_name,
            account_number,
            ifsc_code,
            branch_name,
            account_holder_name,
            upi_id,
        } = req.body;

        // Validation
        if (!bank_name || !account_number || !ifsc_code || !account_holder_name) {
            console.log("⚠️ Required fields missing!");
            return res.status(400).json({
                success: false,
                message:
                    "Please fill in all required fields: Bank Name, Account Number, IFSC Code, Account Holder Name.",
            });
        }

        // Find Driver
        console.log("🔍 Checking driver in DB...");
        const driver = await Driver.findById(driverId);

        console.log("👀 Driver Found:", driver);

        if (!driver) {
            console.log("❌ No driver found");
            return res.status(404).json({
                success: false,
                message: "Driver not found.",
            });
        }

        // Check existing bank details
        console.log("🔍 Checking existing bank details...");
        let bankDetails = await BankDetails.findOne({ driver_id: driverId });

        if (bankDetails) {
            console.log("✏️ Updating existing bank details:", bankDetails);

            bankDetails.bank_name = bank_name;
            bankDetails.account_number = account_number;
            bankDetails.ifsc_code = ifsc_code.toUpperCase();
            bankDetails.branch_name = branch_name;
            bankDetails.account_holder_name = account_holder_name;
            bankDetails.upi_id = upi_id;
            bankDetails.verified = false;
            bankDetails.verified_at = null;

            await bankDetails.save();
            driver.BankDetails = bankDetails._id
            driver.account_status = "active"
            await driver.save();

            console.log("💾 Bank details updated successfully");

            return res.status(200).json({
                success: true,
                message:
                    "Your bank details have been updated successfully. Verification pending.",
                data: bankDetails,
            });
        }

        // Create new bank details entry
        console.log("🆕 Creating new BankDetails document...");
        const newBankDetails = await BankDetails.create({
            driver_id: driverId,
            bank_name,
            account_number,
            ifsc_code: ifsc_code.toUpperCase(),
            branch_name,
            account_holder_name,
            upi_id,
            verified: false,
        });

        console.log("📄 New BankDetails Created:", newBankDetails);

        // Link to Driver
        driver.BankDetails = newBankDetails._id;
        console.log("🔗 Linking BankDetails to Driver:", driver);

        await driver.save();
        console.log("💾 Driver saved successfully with BankDetails.");

        return res.status(201).json({
            success: true,
            message:
                "Your bank details have been added successfully. Verification pending.",
            data: newBankDetails,
        });
    } catch (error) {
        console.log("❌ ERROR while saving bank details:", error);
        return res.status(500).json({
            success: false,
            message:
                "Something went wrong while saving your bank details. Please try again later.",
            error: error.message,
        });
    }
};


exports.getBankNames = async (req, res) => {
    try {
        const bankNames = [
            // 🏦 Public Sector Banks
            "State Bank of India (SBI)",
            "Punjab National Bank (PNB)",
            "Bank of Baroda",
            "Canara Bank",
            "Union Bank of India",
            "Bank of India",
            "Indian Bank",
            "Central Bank of India",
            "Indian Overseas Bank",
            "UCO Bank",
            "Bank of Maharashtra",
            "Punjab & Sind Bank",

            // 💼 Private Sector Banks
            "HDFC Bank",
            "ICICI Bank",
            "Axis Bank",
            "Kotak Mahindra Bank",
            "IndusInd Bank",
            "Yes Bank",
            "IDFC First Bank",
            "Federal Bank",
            "RBL Bank",
            "South Indian Bank",
            "Karnataka Bank",
            "Dhanlaxmi Bank",
            "Tamilnad Mercantile Bank",
            "City Union Bank",
            "Nainital Bank",

            // 💰 Small Finance Banks
            "AU Small Finance Bank",
            "Equitas Small Finance Bank",
            "Ujjivan Small Finance Bank",
            "Jana Small Finance Bank",
            "Suryoday Small Finance Bank",
            "ESAF Small Finance Bank",
            "Fincare Small Finance Bank",
            "North East Small Finance Bank",
            "Capital Small Finance Bank",
            "Shivalik Small Finance Bank",

            // 🪙 Payments Banks
            "Airtel Payments Bank",
            "India Post Payments Bank",
            "Paytm Payments Bank",
            "Fino Payments Bank",
            "Jio Payments Bank",

            // 🏘️ Cooperative & Regional Banks
            "Saraswat Cooperative Bank",
            "TJSB Sahakari Bank",
            "Cosmos Cooperative Bank",
            "NKGSB Cooperative Bank",
            "Abhyudaya Cooperative Bank",
            "Janata Sahakari Bank",
            "Punjab & Maharashtra Co-operative Bank",
            "Rajkot Nagarik Sahakari Bank",
            "Apex Cooperative Bank",

            // 🌍 Foreign Banks Operating in India
            "Standard Chartered Bank",
            "HSBC Bank",
            "Citibank",
            "Deutsche Bank",
            "Barclays Bank",
            "DBS Bank India",
            "Bank of America",
            "BNP Paribas",
            "J.P. Morgan Chase Bank"
        ];


        res.status(200).json({
            success: true,
            message: "List of available banks fetched successfully.",
            data: bankNames,
        });
    } catch (error) {
        console.error("❌ Error fetching bank names:", error);
        res.status(500).json({
            success: false,
            message: "Unable to fetch bank names at the moment. Please try again later.",
        });
    }
};
