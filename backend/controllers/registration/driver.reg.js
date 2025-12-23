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
const DrivingLicense = require("../../models/driver/DriverLicense");
const {
  addVehicleUploadJob,
} = require("../../queues/DriverVehcilePhotoUpload");
const TempDataSchema = require("../../models/TempDataSchema");
const gstCache = new Map(); // GST cache
const rateLimitMap = new Map(); // Rate limit tracker

const CACHE_TTL = 20 * 60 * 1000; // 20 minutes
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = Number(process.env.GST_VERIFY_RATE_LIMIT || 10);

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
    // { fieldname: "aadhaarFrontDocument", label: "Aadhaar Front" },
    // { fieldname: "aadhaarBackDocument", label: "Aadhaar Back" },
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
    // if (!/^\d{12}$/.test(aadhaarNumber)) {
    //   cleanupLocalFiles(files);
    //   return res.status(400).json({
    //     success: false,
    //     message: "Invalid Aadhaar number. Must be 12 digits.",
    //   });
    // }

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
      driver.address = address;
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
        address,
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
      document_number: aadhaarNumber || null,

      front: {
        url: uploadedImages?.aadhaarFront?.image || "",
        public_id: uploadedImages?.aadhaarFront?.public_id || "",
      },

      back: {
        url: uploadedImages?.aadhaarBack?.image || "",
        public_id: uploadedImages?.aadhaarBack?.public_id || "",
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

exports.tempData = async (req, res) => {
  try {
    const data = req.body;

    const saved = await TempDataSchema.create({
      data: data,
    });

    return res.status(201).json({
      success: true,
      message: "Data saved successfully",
      data: saved,
      id: saved._id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

exports.ValidateToken = async (req, res) => {
  try {
    const { token } = req.body;

    // ❌ No token → Not logged in
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not logged in",
        code: "NO_TOKEN",
      });
    }

    try {
      // ✅ Access token valid
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      return res.status(200).json({
        success: true,
        message: "Token is valid",
        data: decoded,
      });
    } catch (err) {
      // ❌ Invalid token (not expired)
      if (err.name !== "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
          code: "INVALID_TOKEN",
        });
      }

      // ⏳ Access token expired → decode
      const decodedExpired = jwt.decode(token);

      if (!decodedExpired?.id) {
        return res.status(401).json({
          success: false,
          message: "Not logged in",
          code: "INVALID_PAYLOAD",
        });
      }

      // 🔍 Find driver
      const driver = await Driver.findById(decodedExpired.id);

      if (!driver || !driver.refresh_token) {
        return res.status(401).json({
          success: false,
          message: "Session expired, please login again",
          code: "NO_REFRESH_TOKEN",
        });
      }

      // 🔐 Verify refresh token
      try {
        jwt.verify(driver.refresh_token, process.env.JWT_REFRESH_SECRET);
      } catch (refreshErr) {
        return res.status(401).json({
          success: false,
          message: "Session expired, please login again",
          code: "REFRESH_EXPIRED",
        });
      }

      // 🔄 Generate NEW tokens using model methods
      const accessToken = driver.generateAuthToken(); // 30 days
      const refreshToken = driver.generateRefreshToken(); // 60 days

      // 💾 Save refresh token in DB
      driver.refresh_token = refreshToken;
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
      await driver.save();

      return res.status(200).json({
        success: true,
        message: "Token refreshed",
        token: accessToken,
        refreshToken,
      });
    }
  } catch (error) {
    console.error("ValidateToken Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { number, otp } = req.body;
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

const log = (step, message, data = null) => {
  console.log(
    `\n🔹 [ADD_VEHICLE | ${step}] ${message}`,
    data ? `\n📦 Data: ${JSON.stringify(data, null, 2)}` : ""
  );
};

exports.addVehicleDetails = async (req, res) => {
  let currentStep = "INIT";
  const files = req.files || [];
  const body = req.body || {};

  try {
    /* ----------------------------
       API START
    -----------------------------*/
    currentStep = "API_START";
    log(currentStep, "Request received", {
      params: req.params,
      bodyKeys: Object.keys(body),
      files: files.map((f) => f.fieldname),
    });

    /* ----------------------------
       1️⃣ SANITIZE DRIVER ID
    -----------------------------*/
    currentStep = "DRIVER_ID_SANITIZE";

    let driverId = req.params.driverId;

    if (
      !driverId ||
      driverId === "null" ||
      driverId === "undefined" ||
      !mongoose.Types.ObjectId.isValid(driverId)
    ) {
      driverId = null;
    }

    /* ----------------------------
       2️⃣ PARSE RC DATA (SAFE)
    -----------------------------*/
    currentStep = "RC_PARSE";
    let rcData = null;
    let rcOwnerName = null;

    if (body.rcData) {
      try {
        rcData =
          typeof body.rcData === "string"
            ? JSON.parse(body.rcData)
            : body.rcData;

        rcOwnerName = rcData?.owner_name?.replace(/\s+/g, " ").trim();
      } catch (err) {
        log(currentStep, "RC JSON parse failed", err.message);
        cleanupFiles(files);
        return res.status(400).json({
          success: false,
          message: "Invalid RC data format",
        });
      }
    }

    if (!rcData) {
      cleanupFiles(files);
      return res.status(400).json({
        success: false,
        message: "RC verification data is required",
      });
    }

    /* ----------------------------
       3️⃣ FIND DRIVER (ID → RC NAME)
    -----------------------------*/
    currentStep = "DRIVER_VALIDATION";
    let driver = null;

    if (driverId) {
      driver = await Driver.findById(driverId);
    }

    // 🔁 Fallback: RC owner name
    if (!driver && rcOwnerName) {
      driver = await Driver.findOne({
        driver_name: { $regex: new RegExp(`^${rcOwnerName}$`, "i") },
      });

      log("DRIVER_FALLBACK_MATCH", { rcOwnerName });
    }

    if (!driver) {
      cleanupFiles(files);
      return res.status(404).json({
        success: false,
        message: "Driver not found by ID or RC owner name",
      });
    }

    /* ----------------------------
       4️⃣ BODY VALIDATION
    -----------------------------*/
    currentStep = "BODY_VALIDATION";
    const { vehicleType, vehicleNumber, rcStatus, permitExpiry, relation } =
      body;

    if (!vehicleType || !vehicleNumber) {
      cleanupFiles(files);
      return res.status(400).json({
        success: false,
        message: "vehicleType and vehicleNumber are required",
      });
    }

    /* ----------------------------
       5️⃣ DUPLICATE VEHICLE CHECK
    -----------------------------*/
    currentStep = "DUPLICATE_CHECK";

    const existingVehicle = await Vehicle.findOne({
      vehicle_number: vehicleNumber.toUpperCase(),
      is_deleted: false,
    });

    if (existingVehicle) {
      cleanupFiles(files);
      return res.status(409).json({
        success: false,
        message: "Vehicle already exists",
      });
    }

    /* ----------------------------
       6️⃣ REQUIRED FILE VALIDATION
    -----------------------------*/
    currentStep = "FILE_VALIDATION";

    const getFile = (name) => files.find((f) => f.fieldname === name);

    const requiredFiles = [
      "rcFront",
      "rcBack",
      "insurance",
      "permit",
      "vehicleFront",
      "vehicleBack",
      "vehicleInterior",
    ];

    for (const field of requiredFiles) {
      if (!getFile(field)) {
        cleanupFiles(files);
        return res.status(400).json({
          success: false,
          message: `Please upload ${field} document`,
        });
      }
    }

    /* ----------------------------
       7️⃣ FILE PATHS
    -----------------------------*/
    currentStep = "FILE_PATHS";

    const filePaths = {};
    files.forEach((f) => {
      filePaths[f.fieldname] = f.path;
    });

    /* ----------------------------
       8️⃣ QUEUE BACKGROUND JOB
    -----------------------------*/
    currentStep = "QUEUE_JOB_ADD";

    const job = await addVehicleUploadJob({
      driverId: driver._id.toString(),
      vehicleData: {
        vehicleType,
        vehicleNumber,
        rcStatus,
        permitExpiry,
        relation,
      },
      filePaths,
      rcData,
    });

    /* ----------------------------
       9️⃣ SUCCESS RESPONSE
    -----------------------------*/
    return res.status(200).json({
      success: true,
      message: "Vehicle upload started successfully",
      jobId: job.id,
      driverId: driver._id,
      status: "processing",
    });
  } catch (error) {
    console.error(`🔥 ERROR at step: ${currentStep}`, error);
    cleanupFiles(files);

    return res.status(500).json({
      success: false,
      message: "Server error",
      step: currentStep,
      error: error.message,
    });
  }
};
/* ----------------------------
   Get Job Status Endpoint
-----------------------------*/
exports.getVehicleUploadStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    const {
      vehiclePhotoUploadQueue,
    } = require("../queues/DriverVehiclePhotoUpload");
    const job = await vehiclePhotoUploadQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const state = await job.getState();
    const progress = job.progress();
    const reason = job.failedReason;

    let result = null;
    if (state === "completed") {
      result = job.returnvalue;
    }

    return res.status(200).json({
      success: true,
      jobId: job.id,
      state, // active, completed, failed, delayed, waiting
      progress,
      attemptsMade: job.attemptsMade,
      failedReason: reason,
      result,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    });
  } catch (error) {
    console.error("Error fetching job status:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching job status",
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

    // Driver ID — from params OR token
    const driverId = req.params.driverId || req.user?.userId;
    console.log("🆔 Driver ID:", driverId);

    if (!driverId) {
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

    // ------------------------------- VALIDATION -------------------------------
    if (!bank_name || !account_number || !ifsc_code || !account_holder_name) {
      return res.status(400).json({
        success: false,
        message:
          "Please fill all required fields: Bank Name, Account Number, IFSC Code, Account Holder Name.",
      });
    }

    // ------------------------------- FIND DRIVER -------------------------------
    console.log("🔍 Finding driver...");
    const driver = await Driver.findById(driverId)
      .populate("current_vehicle_id")
      .populate("document_id");

    console.log("👀 Driver Found:", driver);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found.",
      });
    }

    // ------------------------------- CHECK EXISTING BANK DETAILS -------------------------------
    console.log("🔎 Checking existing bank details...");
    let bankDetails = await BankDetails.findOne({ driver_id: driverId });

    // ======================== UPDATE EXISTING BANK DETAILS ========================
    if (bankDetails) {
      console.log("✏ Updating existing bank details:", bankDetails);

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

      if (driver?.current_vehicle_id.approval_status === "pending") {
        driver.account_status = "pending";
      } else {
        driver.account_status = "active";
      }

      await driver.save();

      console.log("💾 Bank details updated successfully!");

      return res.status(200).json({
        success: true,
        message:
          "Your bank details have been updated successfully. Verification pending.",
        data: bankDetails,
      });
    }

    // ======================== CREATE NEW BANK DETAILS ========================
    console.log("🆕 Creating new BankDetails...");
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

    // Link with driver
    driver.BankDetails = newBankDetails._id;

    if (driver?.current_vehicle_id.approval_status === "pending") {
      driver.account_status = "pending";
    } else {
      driver.account_status = "active";
    }
    await driver.save();

    console.log("💾 Driver updated with new BankDetails!");

    return res.status(201).json({
      success: true,
      message:
        "Your bank details have been added successfully. Verification pending.",
      data: newBankDetails,
    });
  } catch (error) {
    console.log("❌ ERROR in addBankDetails:", error);
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

    // ============================== FETCH CACHE ==============================
    console.log("🔍 Checking cache for device:", device_id);
    const cachedData = await AadharDetails.findOne({ device_id }).lean();

    let isCacheValid = false;

    // if (cachedData) {
    //   console.log("🗂️ Cached Data Found:", cachedData);

    //   const data = cachedData.aadhar_verification_data;

    //   isCacheValid =
    //     data?.aadhaar_number === aadhaarNumber &&
    //     data?.status === "success_aadhaar" &&
    //     Date.now() < new Date(cachedData.expiredDataHour).getTime();

    //   console.log("📌 Is Cache Valid:", isCacheValid);
    // } else {
    //   console.log("🗃️ No Cached Data Found");
    // }

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
      message: `Welcome back! We've already verified your Aadhaar, and it’s registered with the mobile number ******${driver?.driver_contact_number.substring(
        6,
        10
      )}.`,
    });
  } catch (error) {
    console.error("🔥 Error in Aadhaar OTP process:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong on our end. Please try again shortly.",
    });
  }
};

exports.sendOtpOnAadharNumberForRc = async (req, res) => {
  try {
    const { aadhaarNumber } = req.body;

    // Validation
    if (!aadhaarNumber) {
      return res.status(400).json({
        success: false,
        message: "Please enter your Aadhaar number to continue.",
      });
    }

    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid Aadhaar number. Please enter a valid 12-digit number.",
      });
    }

    // Send OTP
    const otpResponse = await sendAadhaarOtp(aadhaarNumber, res, {
      redirect: "verify-aadhaar",
      message: "Please verify your Aadhaar to activate your account. OTP sent!",
    });

    if (!otpResponse.success) {
      return res.status(400).json(otpResponse);
    }

    return res.status(200).json({
      success: true,
      request_id: otpResponse.request_id,
    });
  } catch (error) {
    console.error("🔥 Aadhaar OTP Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again shortly.",
    });
  }
};

exports.VerifyOtpOnAadharNumberForRc = async (req, res) => {
  try {
    const {
      request_id,
      otp,
      aadhaarNumber,
      rcOwnerName,
      driverId,
      rcNumber,
      relation: ownerRelation,
      deviceId,
    } = req.body;

    console.log("🔹 Verify Aadhaar OTP (RC):", req.body);

    // ---------- Validation ----------
    if (!request_id || !otp) {
      return res.status(400).json({
        success: false,
        message: "OTP and request ID are required.",
      });
    }

    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Aadhaar number.",
      });
    }
    const tempData = await TempDataSchema.findOne({
      "rc.rcNumber": rcNumber,
    }).lean();
    console.log("tempData?.rc:", tempData);

    const ownerName =
      rcOwnerName ||
      tempData?.data?.rc?.apiResponse?.owner_name ||
      tempData?.data?.rc?.rcOwnerName;
    console.log("Owner Name from TempData:", ownerName);

    // ---------- Verify OTP ----------
    const response = await axios.post(
      "https://api.quickekyc.com/api/v1/aadhaar-v2/submit-otp",
      {
        key: process.env.QUICKEKYC_API_KEY,
        request_id: request_id.toString(),
        otp,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 20000,
      }
    );

    const apiData = response.data;
    console.log("📩 Aadhaar OTP Verify Response:", apiData);

    if (apiData.status !== "success") {
      return res.status(400).json({
        success: false,
        message: apiData.message || "OTP verification failed.",
      });
    }

    const aadhaarData = apiData.data;
    const aadhaarName = aadhaarData?.full_name || "";

    // ---------- Name Match ----------
    let nameMatched = false;
    let matchScore = 0;

    if (aadhaarName && ownerName) {
      matchScore = nameMatchScore(aadhaarName, ownerName);
      nameMatched = matchScore >= 0.5;
    }

    console.log("🧾 Aadhaar Name:", aadhaarName);
    console.log("🚗 RC Owner Name:", ownerName);
    console.log("📊 Name Match Score:", matchScore);

    // ---------- Final Response (SUCCESS ALWAYS after OTP) ----------
    return res.status(200).json({
      success: true,
      message: nameMatched
        ? "Aadhaar verified successfully and name matched."
        : "Aadhaar verified successfully, but name did not fully match.",

      aadhaar_verified: true,
      name_matched: nameMatched,
      name_match_score: matchScore,

      aadhaar_name: aadhaarName,
      rc_owner_name: ownerName,

      request_id,
      driverId,
      ownerRelation,
      deviceId,
    });
  } catch (error) {
    console.error("🔥 Aadhaar OTP Verify Error:", {
      message: error.message,
      apiResponse: error.response?.data,
    });

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again shortly.",
    });
  }
};

async function sendAadhaarOtp(aadhaarNumber, res, extra = {}) {
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

/* ----------------------------------------
   🔤 NAME NORMALIZATION & MATCHING
---------------------------------------- */

const normalizeName = (name = "") =>
  name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "") // remove symbols/numbers
    .trim()
    .replace(/\s+/g, " ");

const splitName = (name) => {
  if (!name) return [];
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((p) => p.length > 0);
};

const expandInitials = (parts, reference) => {
  return parts.map((part, i) => {
    if (part.length === 1 && reference[i] && reference[i].startsWith(part)) {
      return reference[i];
    }
    return part;
  });
};

const nameMatchScore = (aadhaar, dl) => {
  let aParts = splitName(aadhaar);
  let dParts = splitName(dl);

  if (!aParts.length || !dParts.length) return 0;

  // Expand initials both sides
  dParts = expandInitials(dParts, aParts);
  aParts = expandInitials(aParts, dParts);

  // Check if any part from one name exists in the other (flexible matching)
  const hasCommonPart = aParts.some((p1) =>
    dParts.some((p2) => p1 === p2 || p2.includes(p1) || p1.includes(p2))
  );

  if (!hasCommonPart) return 0;

  const common = aParts.filter((p) => dParts.includes(p));
  const maxLen = Math.max(aParts.length, dParts.length);

  return common.length / maxLen; // 0 → 1
};

const isNameMatch = (tempDataName, dlName) => {
  const tParts = splitName(tempDataName);
  const dParts = splitName(dlName);

  console.log("🧩 TempData Name Parts:", tParts);
  console.log("🧩 DL Name Parts:", dParts);

  // Fraud protection
  if (!dParts.length || dParts[0].length < 2) return false;
  if (tParts.length < 1) return false;

  const score = nameMatchScore(tempDataName, dlName);
  console.log("📊 Name Match Score:", score);

  // 50% threshold as per requirement
  return score >= 0.5;
};

exports.verifyDrivingLicense = async (req, res) => {
  try {
    const { licenseNumber, dob, deviceId } = req.body;

    /* ---------------- BASIC VALIDATION ---------------- */
    if (!licenseNumber || !dob || !deviceId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (DL number, DOB, deviceId).",
      });
    }

    /* ---------------- GET TEMPDATA ---------------- */
    const tempData = await TempDataSchema.findOne({
      "data.deviceId": deviceId,
    });

    if (!tempData || !tempData.data) {
      return res.status(400).json({
        success: false,
        message: "User data not found. Please complete registration first.",
      });
    }

    const userName = tempData.data.name;

    // Initialize DL retry tracking if not exists
    if (!tempData.data.dlRetryCount) {
      tempData.data.dlRetryCount = 0;
    }

    /* ---------------- CHECK RETRY LIMIT ---------------- */
    if (tempData.data.dlRetryCount >= 3) {
      return res.status(400).json({
        success: false,
        message:
          "Maximum retry limit reached (3 attempts). Please contact support.",
        retryExhausted: true,
      });
    }

    /* ---------------- SETTINGS ---------------- */
    const settings = await AppSettings.findOne();
    const BYPASS = settings?.ByPassApi === true;

    /* ---------------- BYPASS MODE ---------------- */
    if (BYPASS) {
      return res.status(200).json({
        success: true,
        message: "DL verified successfully (BYPASS MODE)",
        dlData: {
          license_number: licenseNumber,
          name: userName,
        },
        bypassUsed: true,
      });
    }

    /* ---------------- CASE 1: TRY EXTERNAL API ---------------- */
    try {
      const apiPayload = {
        key: process.env.QUICKEKYC_API_KEY,
        id_number: licenseNumber,
        dob: new Date(dob).toISOString().split("T")[0], //""YYYY-MM-DD"",
      };

      const apiResponse = await axios.post(
        "https://api.quickekyc.com/api/v1/driving-license/driving-license",
        apiPayload,
        { timeout: 20000 }
      );
      console.log("📥 DL API Response:", apiResponse.data);
      if (apiResponse.data.status !== "success") {
        throw new Error("DL verification failed");
      }

      const dlInfo = apiResponse.data.data;
      const dlName = dlInfo.name || dlInfo.full_name || "";

      console.log("✅ DL API Success");
      console.log("👤 TempData Name:", userName);
      console.log("🪪 DL Name:", dlName);

      /* -------- NAME MATCHING CHECK -------- */
      const nameMatches = isNameMatch(userName, dlName);

      if (!nameMatches) {
        // Increment retry count
        tempData.data.dlRetryCount += 1;
        await tempData.save();

        const remainingRetries = 3 - tempData.data.dlRetryCount;

        console.log(`❌ Name Mismatch. Retries left: ${remainingRetries}`);

        return res.status(400).json({
          success: false,
          message: `Name mismatch detected. You have entered wrong DL details. Please retry with correct information.`,
          remainingRetries: remainingRetries,
          nameMismatch: true,
        });
      }

      /* -------- NAME MATCHED - SAVE VERIFIED DL -------- */
      console.log("✅ Name Match Success!");

      await DrivingLicense.create({
        licenseNumber,
        dob,
        name: dlName,
        deviceId,
        status: "VERIFIED",
        verifiedAt: new Date(),
        rawResponse: dlInfo,
      });

      // Reset retry count on success
      tempData.data.dlRetryCount = 0;
      tempData.data.dlVerified = true;
      tempData.data.dlDetails = {
        licenseNumber,
        name: dlName,
        verifiedAt: new Date(),
      };
      await tempData.save();

      return res.status(200).json({
        success: true,
        message: "Driving License verified successfully!",
        dlData: dlInfo,
        manualVerification: false,
      });
    } catch (apiError) {
      /* ---------------- CASE 2: API FAILED - MANUAL VERIFICATION ---------------- */
      console.error("⚠️ DL API FAILED:", apiError);

      // Save pending DL
      await DrivingLicense.create({
        licenseNumber,
        dob,
        name: userName,
        deviceId,
        status: "PENDING_VERIFICATION",
        retryCount: 0,
        nextRetryAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      // Update tempData with pending status
      tempData.data.dlVerificationPending = true;
      tempData.data.dlDetails = {
        licenseNumber,
        submittedAt: new Date(),
      };
      await tempData.save();

      return res.status(200).json({
        success: true,
        manualVerification: true,
        message:
          "We are unable to verify your Driving License at the moment. Please continue and upload your DL document. We will verify it within the next 24 hours.",
        dlData: {
          license_number: licenseNumber,
          name: userName,
        },
      });
    }
  } catch (error) {
    console.error("🔥 DL VERIFY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while verifying Driving License.",
    });
  }
};

/* -------------------------------------------------
   🚗 VERIFY RC DETAILS (FINAL – PROD READY)
-------------------------------------------------- */

exports.verifyRcDetails = async (req, res) => {
  try {
    const { rcNumber, deviceId, driverId } = req.body;

    /* ---------------- BASIC VALIDATION ---------------- */
    if (!rcNumber || !deviceId) {
      return res.status(400).json({
        success: false,
        message: "RC number and deviceId are required.",
        errorCode: "MISSING_FIELDS",
      });
    }

    /* ---------------- DRIVER CHECK ---------------- */
    let driverDetails = await Driver.findById(driverId).lean();

    if (!driverDetails) {
      driverDetails = await Driver.findOne({
        device_id: deviceId,
      }).lean();
    }

    if (!driverDetails) {
      return res.status(400).json({
        success: false,
        message: "Driver details not found.",
        errorCode: "DRIVER_NOT_FOUND",
      });
    }

    /* ---------------- RC API CALL ---------------- */
    try {
      console.log("🔍 Hitting RC API...");

      const response = await axios.post(
        "https://api.quickekyc.com/api/v1/rc/rc_sp",
        {
          key: process.env.QUICKEKYC_API_KEY,
          id_number: rcNumber,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 20000,
        }
      );

      /* ---------- API RESPONSE VALIDATION ---------- */
      if (response.data?.status !== "success" || !response.data?.data) {
        throw new Error("RC verification failed");
      }

      let rcInfo = response.data.data;

      console.log("✅ RC API Success");

      /* ---------------- BIKE DETECTION ---------------- */
      const vehicleCategory = rcInfo.vehicle_category?.toUpperCase() || "";

      const isBike =
        vehicleCategory.includes("2W") ||
        vehicleCategory.includes("TWO") ||
        vehicleCategory.includes("MOTORCYCLE") ||
        vehicleCategory.includes("SCOOTER");

      const isByPass = await AppSettings.findOne().then(
        (setting) => setting?.ByPassApi || false
      );
      console.log("BYPASS SETTING:", isByPass);
      /* ---------------- BYPASS MODE ---------------- */
      if (isByPass === true) {
        if (isBike) {
          rcInfo.vehicle_category = "CAR (BYPASS OVERRIDE)";
        }

        return res.status(200).json({
          success: true,
          message: "RC verified successfully (BYPASS MODE).",
          rcData: rcInfo,
          bikeDetected: isBike,
          bypassUsed: true,
        });
      }

      /* ---------------- BIKE BLOCK ---------------- */
      if (isBike) {
        return res.status(400).json({
          success: false,
          message: "Two-wheelers are not allowed. Please register a car.",
          errorCode: "BIKE_NOT_ALLOWED",
          bikeDetected: true,
        });
      }

      /* ---------------- CASE 1 & 2: NAME MATCHING ---------------- */
      const nameOfDriver = driverDetails?.driver_name || "";
      const nameOnRc = rcInfo.owner_name || "";

      console.log("👤 Driver Name:", nameOfDriver);
      console.log("🪪 RC Owner Name:", nameOnRc);

      const nameMatches = isNameMatch(nameOfDriver, nameOnRc);

      /* -------- CASE 2: NAME MISMATCH -------- */
      if (!nameMatches) {
        console.log("❌ Name Mismatch Detected");

        try {
          // Find the existing TempData for this device
          const tempData = await TempDataSchema.findOne({
            "data.deviceId": deviceId,
          });
          console.log("💾 RC Mismatch data saved in TempData:", tempData);

          if (tempData) {
            // Save RC mismatch data inside the `data` object
            tempData.rc = {
              rcNumber: rcNumber,
              apiResponse: rcInfo,
              driverName: nameOfDriver,
              rcOwnerName: nameOnRc,
              mismatchDetectedAt: new Date(),
              status: "NAME_MISMATCH",
            };

            await tempData.save();
            console.log("💾 RC Mismatch data saved in TempData:", tempData._id);
          } else {
            console.warn("⚠️ TempData not found for deviceId:", deviceId);
          }
        } catch (saveError) {
          console.error("⚠️ Failed to save RC mismatch data:", saveError);
        }

        // Respond with structured error for frontend
        return res.status(400).json({
          success: false,
          message:
            "Name mismatch detected. The name on the RC does not match the driver's name.",
          errorCode: "RC_NAME_MISMATCH",
          nameMismatch: true,
          rcData: rcInfo,
          driverName: nameOfDriver,
          rcOwnerName: nameOnRc,
        });
      }

      /* ---------------- CASE 1: SUCCESS - NAME MATCHED ---------------- */
      console.log("✅ Name Match Success!");

      // Save successful RC verification in TempData
      try {
        const tempData = await TempDataSchema.findOne({
          "data.deviceId": deviceId,
        });

        if (tempData) {
          tempData.data.rcVerified = true;
          tempData.data.rcDetails = {
            rcNumber: rcNumber,
            ownerName: nameOnRc,
            vehicleCategory: rcInfo.vehicle_category,
            verifiedAt: new Date(),
            apiResponse: rcInfo,
          };

          await tempData.save();
          console.log("💾 RC verification data saved in TempData");
        }
      } catch (saveError) {
        console.error("⚠️ Failed to save RC data:", saveError);
      }

      return res.status(200).json({
        success: true,
        message: "RC verified successfully.",
        rcData: rcInfo,
        bikeDetected: false,
        bypassUsed: false,
        nameMatched: true,
      });
    } catch (apiError) {
      /* ---------------- CASE 3: API FAILURE - MANUAL VERIFICATION ---------------- */
      console.error("⚠️ RC API FAILED:", apiError.message);

      return res.status(200).json({
        success: true,
        manualVerification: true,
        message:
          "We are unable to verify your RC at the moment. Please continue and upload your RC document. We will verify it within the next 24 hours.",
        errorCode: "RC_API_FAILURE",
        rcData: {
          rc_number: rcNumber,
          owner_name: driverDetails.driver_name,
        },
      });
    }
  } catch (error) {
    console.error("🔥 RC VERIFY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong during RC verification.",
      errorCode: "INTERNAL_ERROR",
    });
  }
};

exports.VerifyGstNo = async (req, res) => {
  try {
    const { gst } = req.body;
    const settings = await AppSettings.findOne();
    const isBypass = settings?.ByPassApi || false;
    if (!gst) {
      return res.status(400).json({
        success: false,
        message: "GST number is required",
      });
    }

    const gstNo = gst.toUpperCase().trim();
    const identifier = req.user?.id || req.ip;
    const now = Date.now();

    /* -------------------------------------------------
       1️⃣ RATE LIMIT (Map)
    -------------------------------------------------- */
    const rateData = rateLimitMap.get(identifier) || {
      count: 0,
      startTime: now,
    };

    if (now - rateData.startTime > RATE_LIMIT_WINDOW) {
      rateData.count = 0;
      rateData.startTime = now;
    }

    rateData.count += 1;
    rateLimitMap.set(identifier, rateData);

    if (rateData.count > MAX_REQUESTS) {
      return res.status(429).json({
        success: false,
        message: "Too many GST verification requests. Try again later.",
      });
    }

    /* -------------------------------------------------
       2️⃣ CACHE CHECK (20 MIN)
    -------------------------------------------------- */
    const cached = gstCache.get(gstNo);

    if (cached && now - cached.timestamp < CACHE_TTL) {
      return res.json({
        success: true,
        source: "cache",
        data: cached.data,
      });
    }

    /* -------------------------------------------------
       3️⃣ BYPASS API WITH DEFAULT DATA
    -------------------------------------------------- */
    if (isBypass) {
      const defaultData = {
        gstin: gstNo,
        pan_number: "ABCDE1234F",
        business_name: "Default Business",
        legal_name: "Default Legal Name",
        gstin_status: "Active",
        taxpayer_type: "Regular",
        constitution_of_business: "Private Limited",
        date_of_registration: "2020-01-01",
        address: "ABC, B1, Tech Park, Bangalore Pin-560001",
        state_jurisdiction: "Default State Jurisdiction",
        center_jurisdiction: "Default Center Jurisdiction",
      };

      // Store in cache
      gstCache.set(gstNo, { data: defaultData, timestamp: now });

      return res.json({
        success: true,
        source: "bypass",
        data: defaultData,
      });
    }

    /* -------------------------------------------------
       4️⃣ CALL QUICK eKYC API
    -------------------------------------------------- */
    const response = await axios.post(
      `https://api.quickekyc.com/api/v1/corporate/gstin`,
      {
        id_number: gstNo,
        key: process.env.QUICKEKYC_API_KEY,
        filing_status_get: false,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    if (response.data?.status !== "success") {
      return res.status(400).json({
        success: false,
        message: "Invalid GST number or verification failed",
      });
    }

    /* -------------------------------------------------
       5️⃣ NORMALIZE RESPONSE
    -------------------------------------------------- */
    const gstData = response.data.data;

    const normalizedData = {
      gstin: gstData.gstin,
      pan_number: gstData.pan_number,
      business_name: gstData.business_name,
      legal_name: gstData.legal_name,
      gstin_status: gstData.gstin_status,
      taxpayer_type: gstData.taxpayer_type,
      constitution_of_business: gstData.constitution_of_business,
      date_of_registration: gstData.date_of_registration,
      nature_of_business: gstData.nature_bus_activities || [],
      address: gstData.address,
      state_jurisdiction: gstData.state_jurisdiction,
      center_jurisdiction: gstData.center_jurisdiction,
    };

    /* -------------------------------------------------
       6️⃣ STORE IN MAP CACHE
    -------------------------------------------------- */
    gstCache.set(gstNo, { data: normalizedData, timestamp: now });

    return res.json({
      success: true,
      source: "api",
      data: normalizedData,
    });
  } catch (error) {
    console.error(
      "❌ GST Verify Error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "GST verification service unavailable",
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

exports.changeDpOfProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Profile image is required",
      });
    }

    const driver = await Driver.findById(userId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // 🗑 Delete old profile image if exists
    if (driver.profile_photo?.public_id) {
      await deleteImage(driver.profile_photo.public_id);
    }

    // ⬆ Upload new DP
    const uploadDp = await uploadSingleImage(file.path, "dp");

    // 💾 Update driver profile photo
    driver.profile_photo = {
      url: uploadDp.url || uploadDp.image,
      public_id: uploadDp.public_id,
    };

    await driver.save();

    return res.status(200).json({
      success: true,
      message: "Profile photo updated successfully",
      profile_photo: driver.profile_photo,
    });
  } catch (error) {
    console.error("Change DP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating profile photo",
    });
  }
};

exports.getAllVehcilesOfDriver = async (req, res) => {
  try {
    const userId = req.user.id;

    // 🔍 Find driver
    const driver = await Driver.findById(userId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // 🚗 Find all vehicles of the driver
    const vehicles = await Vehicle.find({
      driver_id: driver._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    console.error("Get Vehicles Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching vehicles",
    });
  }
};

exports.changeActiveVehcile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { is_active } = req.body;

    console.log("🔄 Change vehicle request:", { is_active }, id);

    /* ----------------------------
       1️⃣ Find Driver
    -----------------------------*/
    const driver = await Driver.findById(userId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // 🕒 Log last current vehicle
    const lastCurrentVehicleId = driver.current_vehicle_id?.toString() || null;
    console.log("🕒 Last current vehicle:", lastCurrentVehicleId);

    /* ----------------------------
       2️⃣ Find Vehicle
    -----------------------------*/
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    /* ----------------------------
       3️⃣ Ownership Check
    -----------------------------*/
    if (vehicle.driver_id.toString() !== driver._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this vehicle",
      });
    }

    /* ----------------------------
       4️⃣ If deactivating, ensure at least one active vehicle remains
    -----------------------------*/
    if (is_active === false) {
      const activeCount = await Vehicle.countDocuments({
        driver_id: driver._id,
        is_active: true,
        is_deleted: false,
      });

      console.log("🚗 Active vehicle count:", activeCount);

      if (activeCount <= 1) {
        return res.status(400).json({
          success: false,
          message:
            "You must have at least one active vehicle. Deactivation not allowed.",
        });
      }

      vehicle.is_active = false;
      await vehicle.save();

      return res.status(200).json({
        success: true,
        message: "Vehicle deactivated successfully",
        vehicle_id: vehicle._id,
        is_active: false,
      });
    }

    /* ----------------------------
       5️⃣ ACTIVATING VEHICLE
       👉 Deactivate ALL other vehicles
    -----------------------------*/
    console.log("⚙️ Deactivating other vehicles...");

    await Vehicle.updateMany(
      {
        driver_id: driver._id,
        _id: { $ne: vehicle._id },
        is_deleted: false,
      },
      { $set: { is_active: false } }
    );

    // Activate selected vehicle
    vehicle.is_active = true;
    await vehicle.save();

    // Update driver's current vehicle
    driver.current_vehicle_id = vehicle._id;
    await driver.save();

    console.log("✅ New current vehicle:", vehicle._id.toString());

    return res.status(200).json({
      success: true,
      message: "Vehicle activated successfully",
      last_current_vehicle: lastCurrentVehicleId,
      new_current_vehicle: vehicle._id.toString(),
      vehicle_id: vehicle._id,
      is_active: true,
    });
  } catch (error) {
    console.error("❌ Change Active Vehicle Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating vehicle status",
    });
  }
};

exports.updatePrefrences = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      accept_mini_rides,
      accept_sedan_rides,
      accept_suv_rides,
      char_dham, // ✅ independent preference
    } = req.body;

    const driver = await Driver.findById(userId).populate(
      "current_vehicle_id",
      "vehicle_type"
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found.",
      });
    }

    /* ------------------------------------------------
       1️⃣ Build FINAL preference state (merged)
    ------------------------------------------------ */
    const finalPreferences = {
      accept_mini_rides:
        typeof accept_mini_rides === "boolean"
          ? accept_mini_rides
          : driver.preferences.accept_mini_rides,

      accept_sedan_rides:
        typeof accept_sedan_rides === "boolean"
          ? accept_sedan_rides
          : driver.preferences.accept_sedan_rides,

      accept_suv_rides:
        typeof accept_suv_rides === "boolean"
          ? accept_suv_rides
          : driver.preferences.accept_suv_rides,

      // ✅ Char Dham (NO restriction)
      char_dham:
        typeof char_dham === "boolean"
          ? char_dham
          : driver.preferences.char_dham,
    };

    /* ------------------------------------------------
       2️⃣ Allowed ride-type preferences by vehicle
       (❌ char_dham intentionally excluded)
    ------------------------------------------------ */
    let allowedKeys = [];
    let errorMessage = "";

    const vehicleType = driver.current_vehicle_id?.vehicle_type;

    if (vehicleType === "mini") {
      allowedKeys = ["accept_mini_rides"];
      errorMessage =
        "Mini drivers must keep Mini rides enabled to receive bookings.";
    }

    if (vehicleType === "sedan") {
      allowedKeys = ["accept_mini_rides", "accept_sedan_rides"];
      errorMessage =
        "Sedan drivers must enable at least one option: Mini or Sedan.";
    }

    if (vehicleType === "suv") {
      allowedKeys = [
        "accept_mini_rides",
        "accept_sedan_rides",
        "accept_suv_rides",
      ];
      errorMessage =
        "Please enable at least one ride type to receive bookings.";
    }

    /* ------------------------------------------------
       3️⃣ Validate ONLY ride-type preferences
       (❌ char_dham not involved)
    ------------------------------------------------ */
    const hasAtLeastOneEnabled = allowedKeys.some(
      (key) => finalPreferences[key] === true
    );

    if (!hasAtLeastOneEnabled) {
      return res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }

    /* ------------------------------------------------
       4️⃣ Save preferences
    ------------------------------------------------ */
    // save allowed ride types
    allowedKeys.forEach((key) => {
      driver.preferences[key] = finalPreferences[key];
    });

    // ✅ always save char_dham separately
    driver.preferences.char_dham = finalPreferences.char_dham;

    await driver.save();

    return res.status(200).json({
      success: true,
      message: "Your ride preferences have been updated successfully.",
      preferences: driver.preferences,
    });
  } catch (error) {
    console.error("❌ Update Preferences Error:", error);
    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while updating preferences. Please try again.",
    });
  }
};

exports.getPreferencesViaVehicleCategory = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ Fetch driver & active vehicle
    const driver = await Driver.findById(userId).populate("current_vehicle_id");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found. Please login again.",
      });
    }

    if (!driver.current_vehicle_id) {
      return res.status(400).json({
        success: false,
        message: "No active vehicle found. Please activate a vehicle.",
      });
    }

    const vehicle = driver.current_vehicle_id;
    const category = (vehicle.vehicle_type || "").toUpperCase();

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Vehicle category missing. Please update vehicle details.",
      });
    }

    console.log("🚗 Active vehicle category:", category);

    // 2️⃣ Driver saved preferences
    let preferences = {
      accept_mini_rides: driver.preferences?.accept_mini_rides ?? false,
      accept_sedan_rides: driver.preferences?.accept_sedan_rides ?? false,
      accept_suv_rides: driver.preferences?.accept_suv_rides ?? false,

      // ✅ NEW: Char Dham (always allowed)
      char_dham: driver.preferences?.char_dham ?? false,
    };

    const updatedFields = {};

    // 3️⃣ Vehicle category rules
    if (category === "MINI") {
      if (!preferences.accept_mini_rides) {
        preferences.accept_mini_rides = true;
        updatedFields["preferences.accept_mini_rides"] = true;
      }
      preferences.accept_sedan_rides = false;
      preferences.accept_suv_rides = false;
    } else if (category === "SEDAN") {
      if (!preferences.accept_sedan_rides) {
        preferences.accept_sedan_rides = true;
        preferences.accept_mini_rides = true;
        updatedFields["preferences.accept_sedan_rides"] = true;
      }
      preferences.accept_suv_rides = false;
    } else if (category === "SUV") {
      if (!preferences.accept_suv_rides) {
        preferences.accept_suv_rides = true;
        updatedFields["preferences.accept_suv_rides"] = true;
      }
    }

    // 4️⃣ ✅ FORCE ENABLE CHAR DHAM FOR ALL DRIVERS
    if (!preferences.char_dham) {
      preferences.char_dham = true;
      updatedFields["preferences.char_dham"] = true;
    }

    // 5️⃣ Save auto-corrected preferences
    if (Object.keys(updatedFields).length > 0) {
      console.log("🔁 Auto-correcting preferences:", updatedFields);
      await Driver.updateOne({ _id: driver._id }, { $set: updatedFields });
    }

    // 6️⃣ Response
    return res.status(200).json({
      success: true,
      message: "Preferences loaded successfully",
      data: {
        vehicle_category: category,
        preferences,
        auto_corrected: Object.keys(updatedFields).length > 0,
      },
    });
  } catch (error) {
    console.error("❌ getPreferencesViaVehicleCategory error:", error);
    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while loading preferences. Please try again.",
    });
  }
};

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of gstCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      gstCache.delete(key);
    }
  }
}, 5 * 60 * 1000);
