const { deleteFile } = require('../../middlewares/multer')
const Driver = require('../../models/driver/driver.model')
const { deleteImage, uploadSingleImage } = require('../../utils/cloudinary')
const sendDltMessage = require('../../utils/DltMessage')
const Document = require('../../models/driver/documents.model')
const Vehicle = require('../../models/driver/vehicle.model')
const BankDetails = require('../../models/driver/bankDetails.model')
const jwt = require("jsonwebtoken");


exports.registerDriver = async (req, res) => {
    let uploadedPanCard = null;
    let uploadedDl = null;

    try {
        const files = req.files || [];
        const body = req.body || {};

        console.log("📥 Incoming driver registration request body:", body);
        console.log("📂 Incoming files:", files);

        const { aadhaarNumber, dlNumber, dlExpireDate } = body;

        // ✅ Validate required fields
        const emptyFields = [];
        if (!aadhaarNumber) emptyFields.push("aadhaarNumber");
        if (!dlNumber) emptyFields.push("dlNumber");
        if (!dlExpireDate) emptyFields.push("dlExpireDate");

        if (emptyFields.length > 0) {
            files.forEach(f => deleteFile(f.filename));
            console.log("⚠️ Missing required fields:", emptyFields);
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${emptyFields.join(", ")}`,
            });
        }

        // ✅ Check for existing driver
        const driver = await Driver.findOne({ aadhar_number: aadhaarNumber });
        if (!driver) {
            files.forEach(f => deleteFile(f.filename));
            console.log("❌ Driver not found for Aadhaar:", aadhaarNumber);
            return res.status(404).json({ success: false, message: "Driver not found." });
        }

        console.log("👤 Driver found:", driver._id);

        // ✅ Identify uploaded files
        const panCardFile = files.find(f => f.fieldname === "panDocument");
        const dlFile = files.find(f => f.fieldname === "licenseDocument");


        if (panCardFile) console.log("🪪 PAN file found:", panCardFile.originalname);
        if (dlFile) console.log("🚗 DL file found:", dlFile.originalname);

        // ✅ Upload to Cloudinary
        if (panCardFile) {
            uploadedPanCard = await uploadSingleImage(panCardFile.path, "driver_documents/pan");
            console.log("✅ PAN uploaded:", uploadedPanCard);
            deleteFile(panCardFile.filename);
        }

        if (dlFile) {
            uploadedDl = await uploadSingleImage(dlFile.path, "driver_documents/license");
            console.log("✅ DL uploaded:", uploadedDl);
            deleteFile(dlFile.filename);
        }

        // ✅ Create or update Document record
        let documents = await Document.findOne({ driver_id: driver._id });
        if (!documents) {
            documents = new Document({ driver_id: driver._id });
            console.log("📄 New document record created for driver");
        } else {
            console.log("📝 Updating existing document record for driver");
        }

        // ✅ Update PAN
        if (uploadedPanCard) {
            documents.pan_card = {
                document: {
                    url: uploadedPanCard.image,
                    public_id: uploadedPanCard.public_id,
                },
                uploaded_at: new Date(),
                verified: false,
            };
        }

        // ✅ Update Driving License
        if (uploadedDl) {
            documents.driving_license = {
                license_number: dlNumber,
                expiry_date: new Date(dlExpireDate),
                document: {
                    url: uploadedDl.image,
                    public_id: uploadedDl.public_id,
                },
                uploaded_at: new Date(),
                verified: false,
            };
        }

        await documents.save();

        console.log("✅ Driver documents saved successfully:", documents._id);

        return res.status(200).json({
            success: true,
            message: "Driver registration documents uploaded successfully.",
            data: {
                driver_id: driver._id,
                documents,
            },
        });
    } catch (error) {
        console.error("❌ Error in registerDriver:", error);

        // 🧹 Cleanup on failure
        if (uploadedPanCard) await deleteImage(uploadedPanCard.public_id);
        if (uploadedDl) await deleteImage(uploadedDl.public_id);

        (req.files || []).forEach((f) => {
            try {
                deleteFile(f.filename);
            } catch (err) {
                console.error("⚠️ File cleanup failed:", err.message);
            }
        });

        return res.status(500).json({
            success: false,
            message: "Server error while registering driver.",
            error: error.message,
        });
    }
};


exports.sendAadharOtp = async (req, res) => {
    let uploadedProfile = null;
    let uploadedAadhar = null;

    try {
        const files = req.files || [];
        const body = req.body || {};
        console.log("📥 Incoming Aadhaar OTP request body:", body);
        console.log("📂 Incoming files:", files.map(f => f.fieldname));

        const {
            aadhaarNumber,
            name,
            dob,
            mobile,
            email,
            fcmToken,
            deviceId,
            referral
        } = body;

        // ✅ Required fields validation
        const emptyFields = [];
        if (!aadhaarNumber) emptyFields.push("aadhaarNumber");
        if (!name) emptyFields.push("name");
        if (!dob) emptyFields.push("dob");
        if (!mobile) emptyFields.push("mobile");
        if (!email) emptyFields.push("email");

        if (emptyFields.length > 0) {
            console.warn("⚠️ Missing fields:", emptyFields);
            files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${emptyFields.join(", ")}`,
            });
        }

        // ✅ Format validation
        const aadhaarRegex = /^\d{12}$/;
        const mobileRegex = /^[6-9]\d{9}$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!aadhaarRegex.test(aadhaarNumber)) {
            console.warn("❌ Invalid Aadhaar:", aadhaarNumber);
            files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({ success: false, message: "Invalid Aadhaar number." });
        }
        if (!mobileRegex.test(mobile)) {
            console.warn("❌ Invalid Mobile:", mobile);
            files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({ success: false, message: "Invalid mobile number." });
        }
        if (!emailRegex.test(email)) {
            console.warn("❌ Invalid Email:", email);
            files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({ success: false, message: "Invalid email format." });
        }

        // ✅ Separate files
        const profileFile = files.find(f => f.fieldname === 'profilePicture');
        const aadhaarFile = files.find(f => f.fieldname === 'aadhaarDocument');

        console.log("🖼️ Profile file:", profileFile ? profileFile.originalname : "No file");
        console.log("📄 Aadhaar file:", aadhaarFile ? aadhaarFile.originalname : "No file");

        // ✅ Upload profile picture
        if (profileFile) {
            uploadedProfile = await uploadSingleImage(profileFile.path, 'driver_profiles');
            deleteFile(profileFile.filename);
            console.log("✅ Profile uploaded:", uploadedProfile);
        }

        // ✅ Upload Aadhaar document
        if (aadhaarFile) {
            uploadedAadhar = await uploadSingleImage(aadhaarFile.path, 'driver_documents');
            deleteFile(aadhaarFile.filename);
            console.log("✅ Aadhaar document uploaded:", uploadedAadhar);
        }

        // ✅ Check existing driver
        const existingDriver = await Driver.findOne({
            $or: [
                { aadhar_number: aadhaarNumber },
                { driver_contact_number: mobile },
                { driver_email: email }
            ]
        }).select('+aadhar_otp +aadhar_otp_expired');

        console.log("👤 Existing driver found:", existingDriver ? existingDriver._id : "No");

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        console.log(`📨 Generated OTP: ${otp} (expires at ${otpExpiry.toISOString()})`);

        if (existingDriver) {
            if (existingDriver.aadhar_verified) {
                console.warn("⚠️ Aadhaar already verified for driver:", existingDriver._id);
                if (uploadedProfile) await deleteImage(uploadedProfile.public_id);
                if (uploadedAadhar) await deleteImage(uploadedAadhar.public_id);
                return res.status(400).json({ success: false, message: "Aadhaar already verified." });
            }

            existingDriver.aadhar_otp = otp;
            existingDriver.aadhar_otp_expired = otpExpiry;
            existingDriver.driver_name = name;
            existingDriver.driver_contact_number = mobile;
            existingDriver.driver_email = email;
            existingDriver.driver_dob = dob;
            existingDriver.fcm_token = fcmToken;
            existingDriver.device_id = deviceId;
            existingDriver.fcm_updated_at = new Date();
            existingDriver.referral_id_applied = referral || null;
            existingDriver.steps_complete = 1;

            if (uploadedProfile) {
                existingDriver.profile_photo = {
                    url: uploadedProfile.image,
                    public_id: uploadedProfile.public_id
                };
            }

            await existingDriver.save();

            let docRecord = await Document.findOne({ driver_id: existingDriver._id });
            if (!docRecord) {
                docRecord = new Document({ driver_id: existingDriver._id });
            }

            if (uploadedAadhar) {
                docRecord.aadhar_card = {
                    document_number: aadhaarNumber,
                    document: {
                        public_id: uploadedAadhar.public_id,
                        url: uploadedAadhar.image
                    },
                    verified: false,
                    uploaded_at: new Date()
                };
            }

            await docRecord.save();

            existingDriver.document_id = docRecord._id;
            await existingDriver.save();

            console.log("✅ Existing driver updated and OTP saved:", existingDriver._id);

            await sendDltMessage(mobile, otp);
            console.log("📤 OTP sent to mobile:", mobile);

            return res.status(200).json({
                success: true,
                message: "New OTP sent successfully.",
                data: {
                    driver_id: existingDriver._id,
                    document_id: docRecord._id,
                    name,
                    aadhaarNumber,
                    mobile,
                    email,
                    referral,
                    profile_photo: existingDriver.profile_photo || null,
                    aadhar_document: docRecord.aadhar_card?.document || null
                },
            });
        }

        // ✅ Create new driver
        console.log("🆕 Creating new driver...");
        const newDriver = new Driver({
            driver_name: name,
            driver_contact_number: mobile,
            driver_email: email,
            driver_dob: dob,
            driver_gender: "other",
            aadhar_number: aadhaarNumber,
            referral_id_applied: referral || null,
            aadhar_otp: otp,
            fcm_token: fcmToken,
            device_id: deviceId,
            fcm_updated_at: new Date(),
            aadhar_otp_expired: otpExpiry,
            steps_complete: 2,
            aadhar_verified: false,
            profile_photo: uploadedProfile
                ? {
                    url: uploadedProfile.image,
                    public_id: uploadedProfile.public_id
                }
                : null
        });

        await newDriver.save();
        console.log("✅ New driver created:", newDriver._id);

        const newDoc = new Document({
            driver_id: newDriver._id,
            aadhar_card: uploadedAadhar
                ? {
                    document_number: aadhaarNumber,
                    document: {
                        public_id: uploadedAadhar.public_id,
                        url: uploadedAadhar.image
                    },
                    verified: false,
                    uploaded_at: new Date()
                }
                : undefined
        });

        await newDoc.save();
        newDriver.document_id = newDoc._id;
        await newDriver.save();

        console.log("📘 Document created for new driver:", newDoc._id);

        await sendDltMessage(mobile, otp);
        console.log("📤 OTP sent to new driver:", mobile);

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully to your registered mobile number.",
            data: {
                driver_id: newDriver._id,
                document_id: newDoc._id,
                name,
                aadhaarNumber,
                mobile,
                email,
                dob,
                referral,
                profile_photo: newDriver.profile_photo || null,
                aadhar_document: newDoc.aadhar_card?.document || null
            },
        });

    } catch (error) {
        console.error("❌ ERROR in sendAadharOtp:", error.message);
        console.error("🔍 Full Error Stack:", error);
        if (req.files) req.files.forEach(f => deleteFile(f.filename));
        if (uploadedProfile) await deleteImage(uploadedProfile.public_id);
        if (uploadedAadhar) await deleteImage(uploadedAadhar.public_id);

        return res.status(500).json({
            success: false,
            message: "Server error while sending Aadhaar OTP.",
            error: error.message
        });
    }
};



exports.verifyAadharOtp = async (req, res) => {
    try {
        const { aadhaarNumber, otp } = req.body || {};

        if (!aadhaarNumber || !otp) {
            return res.status(400).json({ success: false, message: 'Aadhaar number and OTP are required.' });
        }

        const driver = await Driver.findOne({ aadhar_number: aadhaarNumber });
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver not found.' });
        }
        console.log("driver", driver)

        // Check if OTP is expired
        if (driver.aadhar_otp_expired && new Date() > driver.aadhar_otp_expired) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        // Compare OTP
        console.log("🔍 Verifying Aadhaar OTP...");
        console.log("Driver record OTP:", driver.aadhar_otp);
        console.log("User submitted OTP:", otp);

        if (String(driver.aadhar_otp) !== String(otp)) {
            console.warn("⚠️ OTP mismatch! Verification failed.");
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please try again.',
            });
        }

        console.log("✅ OTP verified successfully for Aadhaar:", driver.aadhar_number);


        // ✅ Mark Aadhaar as verified
        driver.aadhar_verified = true;
        driver.aadhar_otp = null;
        driver.aadhar_otp_expired = null;
        await driver.save();

        return res.status(200).json({
            success: true,
            message: 'Aadhaar verified successfully.',
            data: { driverId: driver._id },
        });
    } catch (error) {
        console.error('Error verifying Aadhaar OTP:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while verifying OTP.',
            error: error.message,
        });
    }
};

exports.resendOnlyAadharOtp = async (req, res) => {
    try {
        const { aadhaarNumber } = req.body || {};

        if (!aadhaarNumber) {
            return res.status(400).json({ success: false, message: 'Aadhaar number is required.' });
        }

        const driver = await Driver.findOne({ aadhar_number: aadhaarNumber });
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver not found.' });
        }

        // Generate new 6-digit OTP
        const newOtp = Math.floor(100000 + Math.random() * 900000);
        const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

        // Save OTP details
        driver.aadhar_otp = newOtp;
        driver.aadhar_otp_expired = expiry;
        await driver.save();

        // Send the OTP (optional)
        await sendDltMessage(driver.driver_contact_number, newOtp);

        console.log(`✅ Resent Aadhaar OTP: ${newOtp} for ${aadhaarNumber}`);

        return res.status(200).json({
            success: true,
            message: 'New OTP sent successfully.',
            data: { otp: newOtp, expiresAt: expiry },
        });
    } catch (error) {
        console.error('Error resending Aadhaar OTP:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while resending OTP.',
            error: error.message,
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { number } = req.body;
        console.log("📩 Login request received for number:", number);

        // ✅ Validate number
        if (!number) {
            console.log("⚠️ Missing mobile number in request.");
            return res.status(400).json({
                success: false,
                message: "Mobile number is required.",
            });
        }

        // ✅ Check driver existence
        const driver = await Driver.findOne({ driver_contact_number: number })
            .populate("BankDetails", "account_number")
            .populate("document_id")
            .lean();

        if (!driver) {
            console.log("❌ No driver found for mobile:", number);
            return res.status(404).json({
                success: false,
                message: "Driver not found. Please register first.",
            });
        }

        console.log("✅ Driver found:", {
            driver_id: driver._id,
            name: driver.driver_name,
            account_status: driver.account_status,
            steps_complete: driver.steps_complete,
        });

        // ✅ Fetch driver documents
        const documents = await Document.findOne({ driver_id: driver._id }).lean();
        console.log("📄 Documents fetched:", !!documents);

        // 🔹 Step 1 → Aadhaar Verification
        if (!driver.aadhar_verified) {
            console.log("⚠️ Aadhaar not verified for driver:", driver._id);
            return res.status(400).json({
                success: false,
                driver,
                redirect: "step-2",
                message: "Please verify your Aadhaar and complete registration.",
            });
        }

        // 🔹 Step 2 → PAN Card or Driving License not uploaded
        const hasDocsUploaded =
            documents?.pan_card?.document?.url &&
            documents?.driving_license?.document?.url;

        console.log("🧾 PAN & DL Uploaded:", hasDocsUploaded);

        if (!hasDocsUploaded) {
            console.log("⚠️ Missing PAN or DL document for driver:", driver._id);
            return res.status(400).json({
                success: false,
                driver,
                redirect: "step-2",
                message: "Please upload your PAN and Driving License to continue.",
            });
        }

        // 🔹 Step 3 → Current Vehicle not assigned
        if (!driver.current_vehicle_id) {
            console.log("⚠️ Vehicle not added for driver:", driver._id);
            return res.status(400).json({
                success: false,
                driver,
                redirect: "step-3",
                message: "Please add your vehicle details to continue.",
            });
        }

        // 🔹 Step 4 → Bank details missing
        if (!driver.BankDetails || !driver.BankDetails.account_number) {
            console.log("⚠️ Bank details missing for driver:", driver._id);
            return res.status(400).json({
                success: false,
                driver,
                redirect: "step-4",
                message: "Please complete your bank details to proceed.",
            });
        }

        // 🔹 Step 5 → Account status check
        if (
            driver.account_status !== "active" &&
            driver.account_status !== "suspended" &&
            driver.account_status !== "blocked"
        ) {
            console.log("🕓 Account under verification for driver:", driver._id);
            return res.status(403).json({
                success: false,
                driver,
                redirect: "step-5",
                message: "Your documents are under verification. Please wait for approval.",
            });
        }

        // ✅ Step 6 → Generate OTP and expiry
        const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

        console.log(`📱 Generated OTP ${otp} for driver: ${driver._id} (expires at ${otpExpiry})`);

        // ✅ Save OTP and expiry in driver document
        await Driver.updateOne(
            { _id: driver._id },
            {
                $set: {
                    loginOtp: otp,
                    loginOtpExpiry: otpExpiry,
                },
            }
        );

        console.log("✅ OTP and expiry saved in DB.");

        // ✅ Send OTP via SMS
        await sendDltMessage(number, otp);
        console.log("📤 OTP sent successfully via SMS to:", number);

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully.",
            otpExpiry, // optional, remove in production
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
            .populate("document_id current_vehicle_id BankDetails")
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
        const driverId = req.user?._id
        // ✅ Find driver by ID and populate related fields if needed
        const driver = await Driver.findById(driverId)
            .populate("document_id current_vehicle_id BankDetails")
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
            is_online: driver.is_online,
            is_OnRide: driver.is_on_ride,
            currentRadius: driver?.currentRadius || 5,
            location: driver.current_location.coordinates,
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

        // ✅ Validate driverId
        if (!driverId) {
            files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({ success: false, message: "Driver ID is required." });
        }

        // ✅ Check if driver exists
        const driver = await Driver.findById(driverId);
        if (!driver) {
            files.forEach(f => deleteFile(f.filename));
            return res.status(404).json({ success: false, message: "Driver not found." });
        }

        // ✅ Extract fields from body
        const {
            vehicleType,           // Mini, Sedan, SUV etc
            vehicle_brand,         // Hyundai, Tata, etc
            vehicleName,           // Venue, Nexon etc
            vehicleNumber,         // DL01AB1234
            registrationDate,
            registrationValidity,
            insuranceExpiry,
            permitExpiry,
        } = body;

        // ✅ Basic validation
        const requiredFields = ["vehicleType", "vehicle_brand", "vehicleNumber"];
        const missingFields = requiredFields.filter(f => !body[f]);
        if (missingFields.length > 0) {
            files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(", ")}`,
            });
        }

        // ✅ Identify file fields
        const rcFrontFile = files.find(f => f.fieldname === "rcFront");
        const rcBackFile = files.find(f => f.fieldname === "rcBack");
        const insuranceFile = files.find(f => f.fieldname === "insurance");
        const permitFile = files.find(f => f.fieldname === "permit");

        // ✅ Upload files to Cloudinary
        if (rcFrontFile)
            uploadedFiles.rcFront = await uploadSingleImage(rcFrontFile.path, "vehicle_documents/rc");
        if (rcBackFile)
            uploadedFiles.rcBack = await uploadSingleImage(rcBackFile.path, "vehicle_documents/rc");
        if (insuranceFile)
            uploadedFiles.insurance = await uploadSingleImage(insuranceFile.path, "vehicle_documents/insurance");
        if (permitFile)
            uploadedFiles.permit = await uploadSingleImage(permitFile.path, "vehicle_documents/permit");

        // ✅ Cleanup temp files
        files.forEach(f => deleteFile(f.filename));

        // ✅ Create Vehicle Record
        const vehicle = new Vehicle({
            driver_id: driver._id,
            vehicle_type: vehicleType?.toLowerCase(), // lowercase for consistency
            vehicle_brand,
            vehicle_name: vehicleName,
            vehicle_number: vehicleNumber?.toUpperCase(),

            registration_certificate: {
                register_date: registrationDate || null,
                expiry_date: registrationValidity || null,
                documentFront: uploadedFiles.rcFront
                    ? { url: uploadedFiles.rcFront.image, public_id: uploadedFiles.rcFront.public_id }
                    : {},
                documentBack: uploadedFiles.rcBack
                    ? { url: uploadedFiles.rcBack.image, public_id: uploadedFiles.rcBack.public_id }
                    : {},
            },

            insurance: {
                expiry_date: insuranceExpiry || null,
                document: uploadedFiles.insurance
                    ? { url: uploadedFiles.insurance.image, public_id: uploadedFiles.insurance.public_id }
                    : {},
            },

            permit: {
                expiry_date: permitExpiry || null,
                document: uploadedFiles.permit
                    ? { url: uploadedFiles.permit.image, public_id: uploadedFiles.permit.public_id }
                    : {},
            }
        });

        await vehicle.save();

        // ✅ Optionally update driver with latest vehicle
        driver.current_vehicle_id = vehicle._id;
        await driver.save();

        res.status(201).json({
            success: true,
            driverId: driver?._id,
            message: "✅ Vehicle details added successfully.",
            data: vehicle,
        });
    } catch (error) {
        console.error("❌ Error adding vehicle details:", error);

        // Cleanup uploaded files in Cloudinary if failed
        for (const key in uploadedFiles) {
            if (uploadedFiles[key]?.public_id) {
                await deleteImage(uploadedFiles[key].public_id);
            }
        }

        // Cleanup local files
        (req.files || []).forEach(f => {
            try {
                deleteFile(f.filename);
            } catch (err) {
                console.error("⚠️ File cleanup error:", err.message);
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
        console.log("req.body", req.body)
        const { driverId } = req.params;
        const {
            bank_name,
            account_number,
            ifsc_code,
            branch_name,
            account_holder_name,
            upi_id,
        } = req.body;

        // ✅ Validate required inputs
        if (!driverId) {
            return res.status(400).json({
                success: false,
                message: 'Driver ID is missing. Please log in again or contact support.',
            });
        }

        if (!bank_name || !account_number || !ifsc_code || !account_holder_name) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields: Bank Name, Account Number, IFSC Code, and Account Holder Name.',
            });
        }

        // ✅ Check if driver exists
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'No driver found with the provided ID. Please try again.',
            });
        }

        // ✅ Check for existing bank details
        let bankDetails = await BankDetails.findOne({ driver_id: driverId });

        if (bankDetails) {
            // ✅ Update existing details
            bankDetails.bank_name = bank_name;
            bankDetails.account_number = account_number;
            bankDetails.ifsc_code = ifsc_code?.toUpperCase();
            bankDetails.branch_name = branch_name;
            bankDetails.account_holder_name = account_holder_name;
            bankDetails.upi_id = upi_id;
            bankDetails.verified = false; // reset verification status
            bankDetails.verified_at = null;

            await bankDetails.save();

            return res.status(200).json({
                success: true,
                message: 'Your bank details have been updated successfully. They will be verified shortly.',
                data: bankDetails,
            });
        }

        // ✅ Create new record
        const newBankDetails = new BankDetails({
            driver_id: driverId,
            bank_name,
            account_number,
            ifsc_code: ifsc_code?.toUpperCase(),
            branch_name,
            account_holder_name,
            upi_id,
            verified: false,
        });

        await newBankDetails.save();

        if (newBankDetails) {
            driver.BankDetails = newBankDetails?._id
            await driver.save()
        }
        res.status(201).json({
            success: true,
            message: 'Your bank details have been added successfully. We’ll verify them soon.',
            data: newBankDetails,
        });
    } catch (error) {
        console.error('❌ Error adding bank details:', error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong while saving your bank details. Please try again later or contact support.',
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
