const { deleteFile } = require("../../middlewares/multer");
const Driver = require("../../models/driver/driver.model");
const Document = require("../../models/driver/documents.model");
const { deleteImage, uploadSingleImage } = require("../../utils/cloudinary");
const jwt = require("jsonwebtoken");
const Vehicle = require("../../models/driver/vehicle.model");
const BankDetails = require("../../models/driver/bankDetails.model");
const sendDltMessage = require("../../utils/DltMessage");
const AadharDetails = require("../../models/driver/AadharDetails");
const axios = require("axios");
const settings = require("../../models/settings/AppSettings");
const AppSettings = require("../../models/settings/AppSettings");
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
    name: "Driver name",
    dob: "Date of birth",
    mobile: "Mobile number",
    aadhaarNumber: "Aadhaar number",
    dlNumber: "Driving license number",
  };

  const missing = [];
  for (const [field, label] of Object.entries(requiredFields)) {
    if (!body[field] || body[field].trim() === "") {
      missing.push(label);
    }
  }

  return {
    isValid: missing.length === 0,
    missingFields: missing,
  };
}

/**
 * Validate required documents
 */
function validateRequiredDocuments(files) {
  const requiredDocs = [
    { fieldname: "aadhaarFrontDocument", label: "Aadhaar Front" },
    { fieldname: "aadhaarBackDocument", label: "Aadhaar Back" },
    { fieldname: "panDocument", label: "PAN Card" },
    { fieldname: "licenseFrontDocument", label: "License Front" },
    { fieldname: "licenseBackDocument", label: "License Back" },
  ];

  const missing = [];
  const documentsMap = {};

  for (const doc of requiredDocs) {
    const file = files.find((f) => f.fieldname === doc.fieldname);
    if (!file) {
      missing.push(doc.label);
    } else {
      documentsMap[doc.fieldname] = file;
    }
  }

  return {
    isValid: missing.length === 0,
    missingDocuments: missing,
    documentsMap,
  };
}

async function uploadDocumentsParallel(documentsMap, profileFile) {
  const uploadPromises = {
    profilePhoto: profileFile
      ? uploadSingleImage(profileFile.path, "driver_documents/profile")
      : null,
    aadhaarFront: documentsMap.aadhaarFrontDocument
      ? uploadSingleImage(
          documentsMap.aadhaarFrontDocument.path,
          "driver_documents/aadhar/front"
        )
      : null,
    aadhaarBack: documentsMap.aadhaarBackDocument
      ? uploadSingleImage(
          documentsMap.aadhaarBackDocument.path,
          "driver_documents/aadhar/back"
        )
      : null,
    pan: documentsMap.panDocument
      ? uploadSingleImage(documentsMap.panDocument.path, "driver_documents/pan")
      : null,
    licenseFront: documentsMap.licenseFrontDocument
      ? uploadSingleImage(
          documentsMap.licenseFrontDocument.path,
          "driver_documents/license/front"
        )
      : null,
    licenseBack: documentsMap.licenseBackDocument
      ? uploadSingleImage(
          documentsMap.licenseBackDocument.path,
          "driver_documents/license/back"
        )
      : null,
  };

  // Upload all in parallel
  const results = await Promise.all([
    uploadPromises.profilePhoto,
    uploadPromises.aadhaarFront,
    uploadPromises.aadhaarBack,
    uploadPromises.pan,
    uploadPromises.licenseFront,
    uploadPromises.licenseBack,
  ]);

  return {
    profilePhoto: results[0],
    aadhaarFront: results[1],
    aadhaarBack: results[2],
    pan: results[3],
    licenseFront: results[4],
    licenseBack: results[5],
  };
}

function cleanupLocalFiles(files) {
  if (!files || files.length === 0) return;

  files.forEach((file) => {
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
    .filter((img) => img && img.public_id)
    .map((img) => deleteImage(img.public_id).catch(() => {}));

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

  console.log("files", files);
  console.log("body", req.body);
  try {
    const body = req.body || {};

    // return res.status(400).json({
    //     success:false
    // })
    console.log("\n========== DRIVER REGISTRATION STARTED ==========");
    console.log("📥 Request Body:", {
      name: body.name,
      mobile: body.mobile,
      email: body.email,
      aadhaarNumber: body.aadhaarNumber?.slice(-4) + "****", // Masked
      dlNumber: body.dlNumber,
    });
    console.log("📂 Files received:", files.length);

    // ========================================
    // STEP 1: VALIDATE INPUT FIELDS
    // ========================================
    const fieldValidation = validateRequiredFields(body);
    if (!fieldValidation.isValid) {
      cleanupLocalFiles(files);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${fieldValidation.missingFields.join(
          ", "
        )}`,
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
      referralIdApplied,
    } = body;

    // Validate mobile number format
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      cleanupLocalFiles(files);
      return res.status(400).json({
        success: false,
        message:
          "Invalid mobile number format. Must be a valid 10-digit Indian number.",
      });
    }

    // Validate Aadhaar format (12 digits)
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      cleanupLocalFiles(files);
      return res.status(400).json({
        success: false,
        message: "Invalid Aadhaar number. Must be 12 digits.",
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
        message: `Missing required documents: ${docValidation.missingDocuments.join(
          ", "
        )}`,
      });
    }

    console.log("✅ Validation passed");

    // ========================================
    // STEP 3: CHECK FOR EXISTING DRIVER
    // ========================================
    const existingDriver = await Driver.findOne({
      $or: [
        { aadhar_number: aadhaarNumber },
        { driver_contact_number: mobile },
      ],
    }).select(
      "_id driver_name driver_contact_number aadhar_number account_status steps_complete"
    );

    if (existingDriver) {
      cleanupLocalFiles(files);

      // If driver exists and already completed registration
      if (existingDriver.steps_complete >= 1) {
        return res.status(409).json({
          success: false,
          message:
            "Driver already registered with this Aadhaar or mobile number.",
          data: {
            driver_id: existingDriver._id,
            name: existingDriver.driver_name,
            status: existingDriver.account_status,
            steps_complete: existingDriver.steps_complete,
          },
        });
      }

      console.log(
        "⚠️ Driver exists but incomplete registration. Proceeding with update..."
      );
    }

    // ========================================
    // STEP 4: UPLOAD DOCUMENTS (PARALLEL)
    // ========================================
    console.log("📤 Uploading documents to Cloudinary...");

    const profileFile = files.find((f) => f.fieldname === "profilePicture");
    uploadedImages = await uploadDocumentsParallel(
      docValidation.documentsMap,
      profileFile
    );
    console.log("✅ All documents uploaded successfully");

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
      driver.account_status = "pending";
      driver.profile_photo = "";
      console.log("🔄 Updating existing driver:", driver._id);
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
        account_status: "pending",
        is_online: false,
        is_on_ride: false,
        profile_photo: "",
        average_rating: 1.0,
        total_rides: 0,
        completed_rides: 0,
        currentRadius: 5,
      });
      if (uploadedImages.profilePhoto) {
        driver.profile_photo.url = uploadedImages.profilePhoto.image;
        driver.profile_photo.public_id = uploadedImages.profilePhoto.public_id;
      }

      console.log("🆕 Creating new driver with referral ID:", referralId);
    }

    await driver.save();
    console.log("✅ Driver saved:", driver._id);

    // ========================================
    // STEP 6: CREATE OR UPDATE DOCUMENTS
    // ========================================
    let documents = await Document.findOne({ driver_id: driver._id });

    if (!documents) {
      documents = new Document({ driver_id: driver._id });
      console.log("📄 Creating new documents record");
    } else {
      console.log("📝 Updating existing documents:", documents._id);
    }

    // Update document fields
    documents.aadhar_card = {
      document_number: aadhaarNumber,
      front: {
        url: uploadedImages.aadhaarFront.image,
        public_id: uploadedImages.aadhaarFront.public_id,
      },
      back: {
        url: uploadedImages.aadhaarBack.image,
        public_id: uploadedImages.aadhaarBack.public_id,
      },
      verified: false,
      uploaded_at: new Date(),
    };

    documents.pan_card = {
      document: {
        url: uploadedImages.pan.image,
        public_id: uploadedImages.pan.public_id,
      },
      verified: false,
      uploaded_at: new Date(),
    };

    documents.driving_license = {
      license_number: dlNumber,
      front: {
        url: uploadedImages.licenseFront.image,
        public_id: uploadedImages.licenseFront.public_id,
      },
      back: {
        url: uploadedImages.licenseBack.image,
        public_id: uploadedImages.licenseBack.public_id,
      },
      verified: false,
      uploaded_at: new Date(),
    };

    await documents.save();
    console.log("✅ Documents saved:", documents._id);

    // ========================================
    // STEP 7: LINK DOCUMENTS TO DRIVER
    // ========================================
    if (
      !driver.document_id ||
      driver.document_id.toString() !== documents._id.toString()
    ) {
      driver.document_id = documents._id;
      await driver.save();
      console.log("🔗 Linked documents to driver");
    }

    // ========================================
    // STEP 8: SEND RESPONSE
    // ========================================
    const executionTime = `${((performance.now() - startTime) / 1000).toFixed(
      3
    )}s`;

    console.log("\n========== REGISTRATION COMPLETED ==========");
    console.log(`Driver ID: ${driver._id}`);
    console.log(`Referral ID: ${driver.referral_id}`);
    console.log(`Documents ID: ${documents._id}`);
    console.log(`Execution Time: ${executionTime}`);
    console.log("============================================\n");

    return res.status(201).json({
      success: true,
      message: "Driver registered successfully.",
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
          all_verified: false,
        },
        next_step: "verify_aadhaar_otp",
      },
      executionTime,
    });
  } catch (error) {
    const executionTime = `${((performance.now() - startTime) / 1000).toFixed(
      3
    )}s`;

    console.error("\n❌ ========== REGISTRATION FAILED ==========");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    console.error("============================================\n");

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
        executionTime,
      });
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
        executionTime,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while processing driver registration.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      executionTime,
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
        message:
          "Your documents are under verification. Please wait for approval.",
      });
    }

    // ------------------------------------------------------
    // ⭐ SPECIAL CONDITION → Default OTP for specific number
    // ------------------------------------------------------
    let otp;
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    if (number === "7217619794" || number === "7042129128") {
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
    console.log("req.bod", req.body);
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

    console.log("Vehicle add request body:", body);
    console.log(
      "Uploaded files:",
      files.map((f) => ({ fieldname: f.fieldname, size: f.size }))
    );

    if (!driverId) {
      cleanupFiles(files);
      return res
        .status(400)
        .json({ success: false, message: "Driver ID is required." });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      cleanupFiles(files);
      return res
        .status(404)
        .json({ success: false, message: "Driver not found." });
    }

    // Parse RC Data
    let rcData = null;
    if (body.rcData) {
      try {
        rcData =
          typeof body.rcData === "string"
            ? JSON.parse(body.rcData)
            : body.rcData;
        console.log("RC Data parsed:", rcData.rc_number);
      } catch (err) {
        cleanupFiles(files);
        return res
          .status(400)
          .json({ success: false, message: "Invalid RC data format." });
      }
    }

    if (!rcData) {
      cleanupFiles(files);
      return res
        .status(400)
        .json({ success: false, message: "RC verification data is required." });
    }

    const {
      vehicleType,
      vehicleNumber,
      registrationDate,
      insuranceExpiry,
      permitExpiry,
    } = body;

    // Required fields
    if (!vehicleType || !vehicleNumber) {
      cleanupFiles(files);
      return res.status(400).json({
        success: false,
        message: "vehicleType and vehicleNumber are required.",
      });
    }

    // Check duplicate vehicle
    const existingVehicle = await Vehicle.findOne({
      vehicle_number: vehicleNumber.toUpperCase(),
      is_deleted: false,
    });
    if (existingVehicle) {
      cleanupFiles(files);
      return res
        .status(409)
        .json({ success: false, message: "Vehicle already exists." });
    }

    // Find ALL 6 files
    const rcBookFile = files.find((f) => f.fieldname === "rcBook");
    const insuranceFile = files.find((f) => f.fieldname === "insurance");
    const permitFile = files.find((f) => f.fieldname === "permit");
    const vehicleFront = files.find((f) => f.fieldname === "vehicleFront");
    const vehicleBack = files.find((f) => f.fieldname === "vehicleBack");
    const vehicleInterior = files.find(
      (f) => f.fieldname === "vehicleInterior"
    );

    // Validate ALL 6 files are present
    const requiredFiles = {
      rcBookFile,
      insuranceFile,
      permitFile,
      vehicleFront,
      vehicleBack,
      vehicleInterior,
    };
    const missing = Object.keys(requiredFiles).filter(
      (key) => !requiredFiles[key]
    );

    if (missing.length > 0) {
      cleanupFiles(files);
      return res.status(400).json({
        success: false,
        message: `Missing required files: ${missing.join(", ")}`,
      });
    }

    // Upload ALL 6 files to Cloudinary
    uploadedFiles.rcBook = await uploadSingleImage(
      rcBookFile.path,
      "vehicle_documents/rc"
    );
    uploadedFiles.insurance = await uploadSingleImage(
      insuranceFile.path,
      "vehicle_documents/insurance"
    );
    uploadedFiles.permit = await uploadSingleImage(
      permitFile.path,
      "vehicle_documents/permit"
    );
    uploadedFiles.vehicleFront = await uploadSingleImage(
      vehicleFront.path,
      "vehicle_photos/front"
    );
    uploadedFiles.vehicleBack = await uploadSingleImage(
      vehicleBack.path,
      "vehicle_photos/back"
    );
    uploadedFiles.vehicleInterior = await uploadSingleImage(
      vehicleInterior.path,
      "vehicle_photos/interior"
    );

    // Cleanup local files
    cleanupFiles(files);

    // Extract from RC
    const vehicleDetails = {
      chassisNumber: rcData.vehicle_chasi_number,
      engineNumber: rcData.vehicle_engine_number,
      fuelType: rcData.fuel_type,
      color: rcData.color,
      seatingCapacity: rcData.seat_capacity
        ? parseInt(rcData.seat_capacity)
        : null,
      manufacturingDate: rcData.manufacturing_date_formatted,
      registeredAt: rcData.registered_at,
    };

    const ownerDetails = {
      ownerName: rcData.owner_name,
      fatherName: rcData.father_name,
      presentAddress: rcData.present_address,
      permanentAddress: rcData.permanent_address,
    };

    // Create Vehicle
    const vehicle = new Vehicle({
      driver_id: driver._id,
      vehicle_type: vehicleType.toLowerCase(),
      vehicle_brand: rcData.maker_description || "Maruti Suzuki",
      vehicle_name: rcData.maker_model || "Unknown",
      vehicle_number: vehicleNumber.toUpperCase(),

      // Technical specs
      chassis_number: vehicleDetails.chassisNumber,
      engine_number: vehicleDetails.engineNumber,
      fuel_type: vehicleDetails.fuelType,
      color: vehicleDetails.color,
      seating_capacity: vehicleDetails.seatingCapacity,
      manufacturing_date: vehicleDetails.manufacturingDate,

      // Owner from RC
      owner_details: {
        owner_name: ownerDetails.ownerName,
        father_name: ownerDetails.fatherName,
        present_address: ownerDetails.presentAddress,
        permanent_address: ownerDetails.permanentAddress,
      },

      // RC Document (uploaded by user)
      registration_certificate: {
        rc_number: rcData.rc_number,
        register_date: registrationDate || rcData.registration_date,
        fit_upto: rcData.fit_up_to,
        rc_status: rcData.rc_status || "ACTIVE",
        verified: true,
        verified_at: new Date(),
        verified_via: "quickekyc_api",
        document: {
          url: uploadedFiles.rcBook.image,
          public_id: uploadedFiles.rcBook.public_id,
        },
      },

      // Insurance Document (uploaded by user)
      insurance: {
        company_name: rcData.insurance_company,
        policy_number: rcData.insurance_policy_number,
        expiry_date: insuranceExpiry || rcData.insurance_upto,
        verified: true,
        verified_at: new Date(),
        verified_via: "rc_api",
        document: {
          url: uploadedFiles.insurance.image,
          public_id: uploadedFiles.insurance.public_id,
        },
      },

      // Permit (uploaded)
      permit: {
        expiry_date: permitExpiry,
        verified: false,
        document: {
          url: uploadedFiles.permit.image,
          public_id: uploadedFiles.permit.public_id,
        },
      },

      // Photos
      vehicle_photos: {
        front: {
          url: uploadedFiles.vehicleFront.image,
          public_id: uploadedFiles.vehicleFront.public_id,
        },
        back: {
          url: uploadedFiles.vehicleBack.image,
          public_id: uploadedFiles.vehicleBack.public_id,
        },
        interior: {
          url: uploadedFiles.vehicleInterior.image,
          public_id: uploadedFiles.vehicleInterior.public_id,
        },
      },

      rc_verification_data: rcData,
      approval_status: "pending",
      is_active: false,
    });

    await vehicle.save();

    // Link to driver
    driver.current_vehicle_id = vehicle._id;
    await driver.save();

    return res.status(201).json({
      success: true,
      message: "Vehicle added successfully! Awaiting admin approval.",
      driverId: driver._id,
      vehicleId: vehicle._id,
      data: {
        vehicle_number: vehicle.vehicle_number,
        vehicle_type: vehicle.vehicle_type,
        approval_status: vehicle.approval_status,
      },
    });
  } catch (error) {
    console.error("Error adding vehicle:", error);

    // Cleanup Cloudinary
    for (const file of Object.values(uploadedFiles)) {
      if (file?.public_id) {
        try {
          await deleteImage(file.public_id);
        } catch {}
      }
    }

    // Cleanup local
    cleanupFiles(req.files || []);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Helper to delete local files
function cleanupFiles(files) {
  files.forEach((file) => {
    try {
      deleteFile(file.filename);
    } catch (err) {}
  });
}
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
      message:
        "Radius updated! You’ll now receive rides within the new distance.",
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
      driver.BankDetails = bankDetails._id;
      driver.account_status = "active";
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
      "J.P. Morgan Chase Bank",
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
      message:
        "Unable to fetch bank names at the moment. Please try again later.",
    });
  }
};

// Kyc related apis

exports.sendOtpOnAadharNumber = async (req, res) => {
  try {
    const { aadhaarNumber, device_id, mobileNumber, isByPass } = req.body;
    console.log("===============================================");
    console.log("🔹 Incoming Aadhaar OTP Request");
    console.log("Request Body:", req.body);
    console.log("===============================================");

    if (!aadhaarNumber) {
      console.log("❌ Aadhaar number missing");
      return res.status(400).json({
        success: false,
        message: "Please enter your Aadhaar number to continue.",
      });
    }

    // ============================== FETCH DRIVER ==============================
    console.log("🔍 Checking if driver exists for Aadhaar:", aadhaarNumber);

    const driver = await Driver.findOne({ aadhar_number: aadhaarNumber })
      .populate("BankDetails", "account_number")
      .populate("document_id")
      .populate("current_vehicle_id")
      .lean();

    console.log("Driver Found:", driver ? "YES" : "NO");

    // ============================== FETCH CACHE ==============================
    console.log("🔍 Checking cache for device:", device_id);
    const cachedData = await AadharDetails.findOne({ device_id }).lean();

    let isCacheValid = false;

    if (cachedData) {
      console.log("🗂️ Cached Data Found:", cachedData);

      const data = cachedData.aadhar_verification_data;

      isCacheValid =
        data?.aadhaar_number === aadhaarNumber &&
        data?.status === "success_aadhaar" &&
        Date.now() < new Date(cachedData.expiredDataHour).getTime();

      console.log("📌 Is Cache Valid:", isCacheValid);
    } else {
      console.log("🗃️ No Cached Data Found");
    }

    // ========================================================================
    // SCENARIO 1: New User (Driver doesn't exist)
    // ========================================================================
    if (!driver) {
      console.log("🆕 Scenario: New user registration");

      if (isCacheValid) {
        console.log("✔ Using Cached Aadhaar Data → Redirect Step-1");

        return res.status(200).json({
          success: true,
          redirect: "step-1",
          cached: true,
          message:
            "We found your verified Aadhaar details. Let's complete your registration!",
          aadhaarData: cachedData.aadhar_verification_data,
        });
      }

      console.log("❌ No Cache → Sending OTP for new registration");
      return await sendAadhaarOtp(aadhaarNumber, res, {
        redirect: "register",
        message:
          "We've sent an OTP to your Aadhaar-linked mobile number. Please verify to continue.",
      });
    }

    // ========================================================================
    // SCENARIO 2: Driver Exists But Aadhaar Not Verified
    // ========================================================================
    console.log(
      "👤 Existing Driver Found → Aadhaar Verified:",
      driver.aadhar_verified
    );

    if (!driver.aadhar_verified) {
      console.log("⚠ Aadhaar Not Verified Yet");

      if (isCacheValid) {
        console.log("✔ Cache Valid → Redirect verify-aadhaar");

        return res.status(200).json({
          success: true,
          redirect: "verify-aadhaar",
          cached: true,
          message:
            "Your Aadhaar is already verified on this device. Let's continue!",
          aadhaarData: cachedData.aadhar_verification_data,
        });
      }

      console.log("❌ No Cache → Sending OTP (Driver Exists)");
      return await sendAadhaarOtp(aadhaarNumber, res, {
        redirect: "verify-aadhaar",
        message:
          "Please verify your Aadhaar to activate your account. OTP sent!",
      });
    }

    // ========================================================================
    // SCENARIO 3: Aadhaar Verified — Check Next Steps
    // ========================================================================
    console.log("✔ Scenario: Aadhaar already verified");

    const documents = driver.document_id || null;

    const hasRequiredDocuments =
      documents?.pan_card?.document?.url &&
      documents?.driving_license?.front?.url;

    console.log("📝 Has Required Docs:", hasRequiredDocuments);

    if (!hasRequiredDocuments) {
      console.log("❌ Missing PAN or DL → Step-2 Redirect");
      return res.status(400).json({
        success: false,
        driver,
        redirect: "step-2",
        message: "Please upload your PAN Card and Driving License.",
      });
    }

    console.log("🚗 Vehicle Check");
    if (!driver.current_vehicle_id) {
      console.log("❌ No Vehicle Added → Step-3 Redirect");
      return res.status(400).json({
        success: false,
        driver,
        redirect: "step-3",
        message: "Please add your vehicle details to continue.",
      });
    }

    console.log("🏦 Bank Details Check");
    if (!driver.BankDetails || !driver.BankDetails.account_number) {
      console.log("❌ No Bank Details → Step-4 Redirect");
      return res.status(400).json({
        success: false,
        driver,
        redirect: "step-4",
        message: "Please add your bank details to continue.",
      });
    }

    console.log("🔎 Account Status:", driver.account_status);
    if (
      driver.account_status !== "active" &&
      driver.account_status !== "suspended" &&
      driver.account_status !== "blocked"
    ) {
      console.log("⏳ Account Under Review → Step-5");
      return res.status(403).json({
        success: false,
        driver,
        redirect: "step-5",
        message:
          "Your account is under review. We will notify you once it's approved (usually 24–48 hours).",
      });
    }

    console.log("🎉 Everything Complete → Bypass OTP");

    return res.status(200).json({
      success: true,
      driver,
      bypassOtp: true,
      message: "Welcome back! Your Aadhaar is already verified.",
    });
  } catch (error) {
    console.error("🔥 Error in Aadhaar OTP process:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong on our end. Please try again shortly.",
    });
  }
};

// ========================================
// Helper Function: Send Aadhaar OTP
// ========================================
async function sendAadhaarOtp(aadhaarNumber, res, extra = {}) {
  console.log("===============================================");
  console.log("📨 Starting Aadhaar OTP Process");
  console.log("Aadhaar:", aadhaarNumber);
  console.log("===============================================");

  try {
    console.log("➡ Sending OTP request to QuickeKYC");

    const response = await axios.post(
      "https://api.quickekyc.com/api/v1/aadhaar-v2/generate-otp",
      {
        key: process.env.QUICKEKYC_API_KEY,
        id_number: aadhaarNumber,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 20000,
      }
    );

    console.log("📩 QuickeKYC Response:", response.data);

    if (response.data.status === "success" && response.data.data?.otp_sent) {
      console.log("✔ OTP Sent Successfully");
      console.log("Request ID:", response.data.request_id);

      return res.status(200).json({
        success: true,
        request_id: response.data.request_id,
        ...extra,
      });
    }

    console.log("❌ OTP Sending Failed:", response.data);
    return res.status(400).json({
      success: false,
      message:
        "We couldn't send the OTP right now. Please check your Aadhaar number and try again.",
      response: response.data,
    });
  } catch (error) {
    console.error("🔥 OTP API Error:", {
      message: error.message,
      apiResponse: error.response?.data,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to send OTP at the moment. Please try again shortly.",
      error: error.message,
    });
  }
}

exports.verifyAadhaarOtp = async (req, res) => {
  try {
    const {
      request_id,
      otp,
      deviceId,
      aadhaarNumber,
      mobile,
      isByPass = false,
    } = req.body;

    console.log("🔹 verifyAadhaarOtp Request:", req.body);

    // ---------------- VALIDATION ----------------
    if (!request_id || !deviceId) {
      return res.status(400).json({
        success: false,
        message: "request_id and deviceId are required",
      });
    }

    // ---------------------------------------------------
    // 🔥 BYPASS MODE
    // ---------------------------------------------------
    if (isByPass === true) {
      console.log("⚠️ BYPASS MODE ENABLED");

      const dummyData = {
        aadhaar_number: aadhaarNumber,
        name: "Dummy User",
        dob: "1995-06-01",
        gender: "Male",
        mobile,
        address: "Dummy Address, India",
        status: "success_aadhaar",
      };

      // ---------------- MATCH BY deviceId OR mobile ----------------
      const matchQuery = mobile
        ? {
            $or: [
              { device_id: deviceId },
              {
                contact_number: mobile,
              },
            ],
          }
        : { device_id: deviceId };

      await AadharDetails.findOneAndUpdate(
        matchQuery,
        {
          aadhar_verification_data: dummyData,
          device_id: deviceId,
          mobile: mobile,
          expiredDataHour: new Date(Date.now() + 6 * 60 * 60 * 1000),
        },
        { upsert: true, new: true }
      );

      return res.status(200).json({
        success: true,
        redirect: "register",
        isNewDriver: true,
        aadhaarData: dummyData,
        fromCache: false,
        message: "Bypass Aadhaar verification successful.",
      });
    }

    // ---------------- OTP REQUIRED FOR NON-BYPASS ----------------
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
      });
    }

    // ---------------------------------------------------
    // 🔥 VERIFY OTP USING QUICK-EKYC
    // ---------------------------------------------------
    const response = await axios.post(
      "https://api.quickekyc.com/api/v1/aadhaar-v2/submit-otp",
      {
        key: process.env.QUICKEKYC_API_KEY,
        request_id: request_id.toString(),
        otp,
      },
      { headers: { "Content-Type": "application/json" }, timeout: 20000 }
    );

    console.log("📥 QuickEKYC OTP Response:", response.data);

    if (response.data.status !== "success") {
      return res.status(400).json({
        success: false,
        message: response.data.message || "OTP verification failed",
      });
    }

    const data = response.data.data;
    if (!data) {
      return res.status(400).json({
        success: false,
        message: "Aadhaar data missing from API",
      });
    }

    // ---------------------------------------------------
    // 🔥 UPDATE EXISTING DOCUMENT ONLY
    // (MATCH BY deviceId OR mobile)
    // ---------------------------------------------------

    const matchQuery = mobile
      ? { $or: [{ device_id: deviceId }, { contact_number: mobile }] }
      : { device_id: deviceId };

    const updatedRecord = await AadharDetails.findOneAndUpdate(
      matchQuery,
      {
        aadhar_verification_data: data,
        device_id: deviceId,
        mobile: mobile,
        expiredDataHour: new Date(Date.now() + 6 * 60 * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    // ---------------------------------------------------
    // 🔥 RESPONSE
    // ---------------------------------------------------
    return res.status(200).json({
      success: true,
      redirect: "register",
      aadhaarData: data,
      message: "Aadhaar verified successfully.",
      fromCache: false,
    });
  } catch (error) {
    console.error("❌ Aadhaar OTP Verification Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while verifying OTP.",
      error: error?.response?.data || error.message,
    });
  }
};

exports.verifyDrivingLicense = async (req, res) => {
  try {
    console.log("\n=================== DL VERIFY START ===================");
    console.log("📥 Incoming Req Body:", req.body);

    const { licenseNumber, dob, aadhaarName, deviceId, aadhaarNumber } =
      req.body;

    const settings = await AppSettings.findOne();
    const ByPass = settings?.ByPassApi;

    console.log("⚙️ BYPASS MODE:", ByPass);

    // ------------------ VALIDATION ------------------
    if (!licenseNumber || !dob || !aadhaarName || !deviceId) {
      console.log("❌ Missing required fields");
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields (DL number, DOB, Aadhaar name, deviceId, Aadhaar number).",
      });
    }

    // ------------------ AADHAAR CACHE CHECK ------------------
    console.log("🔍 Checking Aadhaar cache for device:", deviceId);

    const cached = await AadharDetails.findOne({ device_id: deviceId });

    const isCacheValid =
      cached && cached.aadhar_verification_data?.aadhaar_number;

    console.log("📌 Aadhaar Cache Found:", !!cached);
    console.log("📌 Aadhaar Cache Valid:", isCacheValid);

    if (!isCacheValid) {
      console.log("❌ Aadhaar not verified for this device");
      return res.status(400).json({
        success: false,
        message: "Aadhaar not verified. Please verify Aadhaar first.",
      });
    }

    const aadhaarData = cached.aadhar_verification_data;
    console.log("✔️ Aadhaar Verified. Name:", aadhaarData?.full_name);

    // ------------------ BYPASS MODE ------------------
    if (ByPass) {
      console.log("🟢 BYPASS MODE ENABLED — Skipping DL API Call");

      const BYPASS_DATA = {
        license_number: "DLXXXXXXXXXX0000",
        state: "Uttar Pradesh",
        name: "TEST USER",
        permanent_address: "Fake Address, Lucknow",
        permanent_zip: "226001",
        profile_image: "",
      };

      cached.dl_data = BYPASS_DATA;
      cached.dl_data_expires = new Date(Date.now() + 6 * 60 * 60 * 1000);
      cached.isDlisExpired = false;
      await cached.save();

      return res.status(200).json({
        success: true,
        message: "Driving License verified successfully! (BYPASS MODE)",
        dlData: BYPASS_DATA,
        address: {
          address: BYPASS_DATA.permanent_address,
          pincode: BYPASS_DATA.permanent_zip,
        },
        fromCache: false,
        bypassUsed: true,
      });
    }

    // ------------------ REAL API CALL (ONLY IF NOT BYPASS) ------------------
    console.log("🔵 Calling QuickEKYC DL API...");

    const apiPayload = {
      key: process.env.QUICKEKYC_API_KEY,
      id_number: licenseNumber,
      dob: new Date(dob).toISOString().split("T")[0],
    };

    console.log("📤 API Payload:", apiPayload);

    const apiResponse = await axios.post(
      "https://api.quickekyc.com/api/v1/driving-license/driving-license",
      apiPayload,
      { headers: { "Content-Type": "application/json" }, timeout: 20000 }
    );

    console.log("📥 API Response:", apiResponse.data);

    if (apiResponse.data.status !== "success") {
      console.log("❌ DL API Failed:", apiResponse.data.message);
      return res.status(400).json({
        success: false,
        message:
          apiResponse.data.message ||
          "Failed to verify Driving License. Please try again.",
      });
    }

    const dlInfo = apiResponse.data.data;

    // ------------------ NAME MATCH ------------------
    const aadhaarNameLower = aadhaarData?.full_name?.toLowerCase()?.trim();
    const dlNameLower = dlInfo?.name?.toLowerCase()?.trim();

    console.log("🔍 Checking Name Match:", aadhaarNameLower, dlNameLower);

    if (aadhaarNameLower !== dlNameLower) {
      console.log("❌ Name mismatch");
      return res.status(400).json({
        success: false,
        nameMismatch: true,
        message: `Aadhaar name "${aadhaarName}" does not match DL name "${dlInfo.name}"`,
      });
    }

    // ------------------ SAVE CACHE ------------------
    cached.dl_data = dlInfo;
    cached.dl_data_expires = new Date(Date.now() + 6 * 60 * 60 * 1000);
    cached.isDlisExpired = false;
    await cached.save();

    console.log("🎉 DL Verification Completed Successfully");

    return res.status(200).json({
      success: true,
      message: "Driving License verified successfully!",
      dlData: dlInfo,
      address: {
        address: dlInfo.permanent_address,
        pincode: dlInfo.permanent_zip,
      },
      fromCache: false,
      bypassUsed: false,
    });
  } catch (error) {
    console.error("🔥 DL Verification Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while verifying Driving License.",
      error: error.message,
    });
  }
};

exports.verifyRcDetails = async (req, res) => {
  try {
    const { rcNumber, deviceId, isByPass } = req.body;
    console.log("🔹 RC Verification Request Body:", req.body);

    if (!rcNumber) {
      return res.status(400).json({
        success: false,
        message: "RC number is required.",
      });
    }

        const aadhaarRecord = await AadharDetails.findOne({ device_id: deviceId })
      .sort({ createdAt: -1 })
      .lean();

    const response = await axios.post(
      "https://api.quickekyc.com/api/v1/rc/rc_sp",
      {
        id_number: rcNumber.toUpperCase(),
        key: process.env.QUICKEKYC_API_KEY,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 20000,
      }
    );

    if (response.data.status !== "success" || !response.data.data) {
      return res.status(400).json({
        success: false,
        message: response.data.message || "RC verification failed.",
      });
    }

    let rcInfo = response.data.data; // ← IMPORTANT (let so we can edit)

    // --------- Detect bike ----------
    const vehicleCategory = rcInfo.vehicle_category?.toUpperCase() || "";
    const isBike =
      vehicleCategory.includes("2W") ||
      vehicleCategory.includes("TWO WHEELER") ||
      vehicleCategory.includes("MOTORCYCLE");

    // =====================================================================
    // 🔥 BYPASS MODE → Modify vehicle category if bike detected
    // =====================================================================
    if (isByPass === true) {
      console.log("⚡ Bypass Mode → Vehicle type override if bike");

      if (isBike) {
        // ⭐ MODIFY vehicle_category directly here
        rcInfo.owner_name = aadhaarRecord?.aadhar_verification_data?.full_name;
        rcInfo.vehicle_category = "CAR (FORCED BYPASS)";
      }

      return res.status(200).json({
        success: true,
        message: "RC verified successfully (bypass).",
        rcData: rcInfo,     // ← updated category sent here
        aadhaarData: null,
        bikeDetected: isBike,
        bypassUsed: true,
      });
    }

    // =====================================================================
    // Normal mode (bike not allowed)
    // =====================================================================
    if (isBike) {
      return res.status(400).json({
        success: false,
        message: "Bikes/Two-wheelers are not allowed. Please register a car.",
      });
    }

    // ---------------- Aadhaar match ---------------

    if (!aadhaarRecord?.aadhar_verification_data) {
      return res.status(400).json({
        success: false,
        message: "Aadhaar verification required before RC verification.",
      });
    }

    const aadhaarName = aadhaarRecord.aadhar_verification_data.full_name
      .toLowerCase()
      .trim();
    const rcOwnerName = rcInfo.owner_name.toLowerCase().trim();

    if (aadhaarName !== rcOwnerName) {
      return res.status(400).json({
        success: false,
        rcData: rcInfo,
        message: `RC owner name "${rcInfo.owner_name}" does not match Aadhaar name "${aadhaarRecord.aadhar_verification_data.full_name}".`,
      });
    }

    // ---------------- SUCCESS ----------------
    return res.status(200).json({
      success: true,
      message: "RC verified successfully.",
      rcData: rcInfo,
      aadhaarData: aadhaarRecord.aadhar_verification_data,
      bikeDetected: false,
      bypassUsed: false,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong during RC verification.",
      error: error.message,
    });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { number, device_id } = req.body;

    if (!number || !/^\d{10}$/.test(number)) {
      return res.status(400).json({
        success: false,
        message: "Valid 10-digit mobile number is required",
      });
    }

    // Step 1: Check if number exists in AadharDetails
    let aadharUser = await AadharDetails.findOne({ contact_number: number });
    // Step 2: If mobile already verified → check driver status & redirect accordingly
    if (aadharUser?.mobile_verify === true) {
      const driver = await Driver.findOne({ driver_contact_number: number })
        .populate("BankDetails", "account_number")
        .populate("document_id")
        .lean();

      // If driver not found → force registration
      if (!driver) {
        return res.status(400).json({
          success: false,
          redirect: "step-1",
          driver: aadharUser?.aadhar_verification_data || driver,
          message: "Please complete registration first.",
        });
      }

      const documents = driver.document_id;

      // Redirect Logic (Only if already verified)
      if (!driver.aadhar_verified) {
        return res.status(400).json({
          success: false,
          driver,
          redirect: "step-2",
          message: "Please verify your Aadhaar first.",
        });
      }

      const hasPanAndDL =
        documents?.pan_card?.document?.url &&
        documents?.driving_license?.front?.url &&
        documents?.driving_license?.back?.url;

      if (!hasPanAndDL) {
        return res.status(400).json({
          success: false,
          driver,
          redirect: "step-2",
          message: "Please upload PAN & Driving License.",
        });
      }

      if (!driver.current_vehicle_id) {
        return res.status(400).json({
          success: false,
          driver,
          redirect: "step-3",
          message: "Please add your vehicle.",
        });
      }

      if (!driver.BankDetails?.account_number) {
        return res.status(400).json({
          success: false,
          driver,
          redirect: "step-4",
          message: "Please add bank details.",
        });
      }

      if (!["active", "suspended", "blocked"].includes(driver.account_status)) {
        return res.status(403).json({
          success: false,
          driver,
          redirect: "step-5",
          message: "Your account is under review. Please wait for approval.",
        });
      }

      // If all good → allow login (no OTP needed again)
      return res.status(200).json({
        success: true,
        alreadyVerified: true,
        driver,
        message: "Login successful",
        redirect: "home", // ← directly to home
      });
    }

    // Step 3: First time → Generate & Send OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await AadharDetails.findOneAndUpdate(
      { contact_number: number },
      {
        device_id,
        contact_number: number,
        otp_mobile: otp,
        otp_expire_time_mobile: new Date(Date.now() + 5 * 60 * 1000), // 5 min
        mobile_verify: false,
      },
      { upsert: true, new: true }
    );

    // Send OTP via SMS
    await sendDltMessage(number, otp);

    return res.status(200).json({
      success: true,
      otp_sent: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("sendOtp error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
    });
  }
};
// 📌 2️⃣ VERIFY OTP
exports.verifyOtpMobile = async (req, res) => {
  try {
    const { mobileNumber: contact_number, otp } = req.body;

    if (!contact_number || !otp)
      return res
        .status(400)
        .json({ success: false, message: "Contact number and OTP required" });

    const user = await AadharDetails.findOne({ contact_number });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Check expiry
    if (new Date() > user.otp_expire_time_mobile) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new one.",
      });
    }

    // Check otp match
    if (user.otp_mobile !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Mark verified
    user.mobile_verify = true;
    user.otp_mobile = null; // optional: clear OTP
    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.log("OTP verify error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 📌 3️⃣ GET DETAILS AFTER VERIFICATION
exports.getDriverDetailsOfDriverMobile = async (req, res) => {
  try {
    const { contact_number } = req.query;

    if (!contact_number)
      return res
        .status(400)
        .json({ success: false, message: "Contact number required" });

    const user = await AadharDetails.findOne({ contact_number });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (!user.mobile_verify)
      return res
        .status(400)
        .json({ success: false, message: "Mobile number not verified" });

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.log("Get details error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
