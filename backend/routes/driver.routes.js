const express = require("express");
const router = express.Router();

// Middlewares
const protect = require("../middlewares/auth");
const { upload, companyUpload } = require("../middlewares/multer");

// Controllers - Auth & Registration
const {
  registerDriver,
  login,
  verifyOtp,
  resendOtp,
  refreshAccessToken,
  getDriverDetails,
  getDriverDetailsViaId,
  updateCurrentRadius,
  addVehicleDetails,
  addBankDetails,
  getBankNames,
  sendOtpOnAadharNumber,
  verifyAadhaarOtp,
  verifyDrivingLicense,
  verifyRcDetails,
  sendOtp,
  verifyOtpMobile,
  getDriverDetailsOfDriverMobile,
  VerifyGstNo,
  changeDpOfProfile,
  getAllVehcilesOfDriver,
  changeActiveVehcile,
  updatePrefrences,
  getPreferencesViaVehicleCategory,
  ValidateToken,
  tempData,
  VerifyOtpOnAadharNumberForRc,
  sendOtpOnAadharNumberForRc,
} = require("../controllers/registration/driver.reg");

const {
  refreshAccessToken: refreshToken,
} = require("../controllers/registration/refreshAccessToken");

// Controllers - Driver Helpers
const {
  toggleStatus,
  updateDriverLocation,
  getDriverLocation,
  get_all_Drivers,
  updateFcmToken,
  addCompanyDetails,
  updateCompanyDetails,
  deleteCompanyDetails,
  getMyCompanyDetails,
  adminGetAllCompanyDetails,
  FetchMyAssignedRides,
  getCompanyDetails,
} = require("../controllers/driver/driver.helper.controller");

// Controllers - Driver Post Rides
const {
  postRide,
  getAllRides,
  getRideById,
  searchNearbyRides,
  getMyRide,
  getMyRideAllPost,
  deleteRide,
  updateRide,
  StartTripPost,
  CompleteTripPost,
  addBussinessRating,
  createIssue,
  getEarningsByDriver,
} = require("../controllers/rides/driver_post_rides");

// Controllers - Taxi Safar Rides
const {
  createNewRide,
  FetchNearByTaxiSafarRides,
  getRideTaxiById,
  acceptRide,
  markReachedAtPickupLocation,
  verifyRideOtp,
  completeRide,
  rideStatus,
} = require("../controllers/rides/taxiSafar.controller");

// Controllers - Chat
const { foundChatInitialized } = require("../controllers/driver/driver_chat");

// Controllers - Quotations
const {
  createQuotation,
  updateQuotation,
  deleteQuotation,
  getAllQuotations,
  getQuotationById,
  convertToInvoice,
} = require("../controllers/extra/Quotation.controller");

// Controllers - Jobs
const {
  createJob,
  getJobById,
  updateJob,
  getJobs,
} = require("../controllers/extra/driverJobs.controller");

// Controllers - Border Tax
const {
  createBorderTax,
  getAllBorderTax,
  getBorderTaxById,
  updateBorderTax,
  deleteBorderTax,
} = require("../controllers/extra/BorderTaxPay.controller");

// Controllers - Insurance
const {
  createInsurance,
  getMyInsurance,
  getAllInsurance,
  updateInsuranceStatus,
  deleteInsurance,
  getInsuranceById,
} = require("../controllers/extra/buyInsurance.controller");

// Controllers - Categories
const {
  createCategories,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controllers/admins/Categories/Categories");
const {
  getAllNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  bulkDeleteNotifications,
  createNotification,
} = require("../controllers/Notification/notificationController");

// ---------------------------------------------
// 🔥 AUTH + REGISTRATION
// ---------------------------------------------
router.post("/register-driver", upload.any(), registerDriver);
router.post("/login", login);
router.post("/verify-login-otp", verifyOtp);
router.post("/validate-token", ValidateToken);
router.post("/resend-otp", resendOtp);
router.post("/refresh-token", refreshToken);
router.post(
  "/change-dp-profile",
  protect,
  upload.single("dp"),
  changeDpOfProfile
);
router.get("/get-all-Vehciles", protect, getAllVehcilesOfDriver);
router.patch("/change-active-vehicle/:id", protect, changeActiveVehcile);
router.put("/update-prefrences", protect, updatePrefrences);
router.get("/get-prefrences", protect, getPreferencesViaVehicleCategory);
router.post("/temp-data", tempData);

//->Earning

router.get("/driver-earnings/:id", getEarningsByDriver);

router.post("/send-mobile-otp", sendOtp);
router.post("/verify-mobile-otp", verifyOtpMobile);
router.get("/get-mobile-driver", getDriverDetailsOfDriverMobile);

// ---------------------------------------------
// 🔥 EKYC
// ---------------------------------------------

router.post("/send-otp-on-aadhar", sendOtpOnAadharNumber);
router.post("/verify-otp-on-aadhar", verifyAadhaarOtp);
router.post("/send-otp-on-aadhar-for-rc", sendOtpOnAadharNumberForRc);
router.post("/verify-otp-on-aadhar-for-rc", VerifyOtpOnAadharNumberForRc);
router.post("/verify-dl", verifyDrivingLicense);
router.post("/rc-verify", verifyRcDetails);
router.post("/gst-verify", VerifyGstNo);

// ---------------------------------------------
// 🔥 DRIVER DETAILS & PROFILE
// ---------------------------------------------
router.get("/driver-details/:driverId", getDriverDetailsViaId);
router.get("/driver-details", protect, getDriverDetails);
router.put("/update-radius", protect, updateCurrentRadius);

//KYC

// ---------------------------------------------
// 🔥 VEHICLE & BANK DETAILS
// ---------------------------------------------
router.post("/add-vehicle-details/:driverId", upload.any(), addVehicleDetails);
router.post("/add-bank-details/:driverId", addBankDetails);
router.get("/bank-names", getBankNames);

// ---------------------------------------------
// 🔥 DRIVER HELPER ROUTES
// ---------------------------------------------
router.get("/get-drivers", get_all_Drivers);
router.post("/toggle-status", protect, toggleStatus);
router.post("/update-driver-location", protect, updateDriverLocation);
router.get("/get-driver-location", protect, getDriverLocation);
router.get("/get-driver-location/:driverId", getDriverLocation);
router.post("/update-fcm", protect, updateFcmToken);

// ---------------------------------------------
// 🔥 COMPANY DETAILS
// ---------------------------------------------
router.post("/add-company", protect, companyUpload, addCompanyDetails);
router.put("/update-company", protect, companyUpload, updateCompanyDetails);
router.delete("/delete-company", protect, deleteCompanyDetails);
router.get("/my-company", protect, getMyCompanyDetails);
router.get("/admin/all-company-details", adminGetAllCompanyDetails);
router.get("/company-details/:id", getCompanyDetails);

// ---------------------------------------------
// 🔥 DRIVER POST RIDES
// ---------------------------------------------
router.post("/post-ride", protect, postRide);
router.get("/post-rides", getAllRides);
router.get("/post-rides/:rideId", getRideById);
router.get(
  "/fetch-nearby-rides",
  (req, res, next) => {
    console.log("📍 fetch-nearby-rides API HIT");
    next();
  },
  protect,
  searchNearbyRides
);
router.get("/get-my-ride", protect, getMyRide);
router.delete("/delete-post-ride/:rideId", protect, deleteRide);

router.put("/update-post-ride/:rideId", protect, updateRide);
router.post("/start-trip-post/:rideId", protect, StartTripPost);
router.post("/complete-ride-post/:rideId", protect, CompleteTripPost);
router.post("/report-ride-issue/:rideId", protect, createIssue);

router.post("/add-rating-for-company/:rideId", protect, addBussinessRating);

router.get("/get-my-ride-all", protect, getMyRideAllPost);

// ---------------------------------------------
// 🔥 TAXI SAFAR RIDES
// ---------------------------------------------
router.post("/post-taxi-safar-ride", createNewRide);
router.get(
  "/Fetch-Near-By-Taxi-Safar-Rides",
  protect,
  FetchNearByTaxiSafarRides
);

router.get("/taxi-safar-ride/:id", getRideTaxiById);
router.post("/accept-ride/:rideId", protect, acceptRide);
router.post("/mark-reached/:rideId", protect, markReachedAtPickupLocation);
router.post("/verify-otp/:rideId", protect, verifyRideOtp);
router.post("/complete-otp", protect, completeRide);
router.post("/ride-status/:rideId", rideStatus);

// ---------------------------------------------
// 🔥 CHAT
// ---------------------------------------------
router.get("/chats-initialized", protect, foundChatInitialized);

// ---------------------------------------------
// NOTIFICATIONS
// ---------------------------------------------
router.get("/notifications", protect, getAllNotifications);
router.get("/notifications/:notificationId", protect, getNotificationById);
router.put("/notifications/:notificationId/read", protect, markAsRead);
router.put("/notifications/mark-all/read", protect, markAllAsRead);

router.delete("/notifications/:notificationId", protect, deleteNotification);
router.delete("/notifications/clear-all", protect, clearAllNotifications);
router.post("/notifications/bulk-delete", protect, bulkDeleteNotifications);

router.post("/notifications/create", protect, createNotification);

// ---------------------------------------------
// 🔥 MY ASSIGNED RIDES
// ---------------------------------------------
router.get("/get-my-assigned-rides-two/:id", FetchMyAssignedRides);

// ---------------------------------------------
// 🔥 QUOTATION
// ---------------------------------------------
router.post("/create-quotation", protect, createQuotation);
router.put("/update-quotation/:id", protect, updateQuotation);
router.delete("/delete-quotation/:id", protect, deleteQuotation);
router.get("/get-quotation", protect, getAllQuotations);
router.post("/convert-to-invoice/:id", protect, convertToInvoice);

router.get("/get-quotation/:id", getQuotationById);

// ---------------------------------------------
// 🔥 JOBS
// ---------------------------------------------
router.post("/driver-jobs", protect, createJob);
router.get("/driver-jobs/:id", protect, getJobById);
router.put("/driver-jobs", protect, updateJob);
router.get("/driver-jobs", protect, getJobs);

// ---------------------------------------------
// 🔥 BORDER TAX
// ---------------------------------------------
router.post(
  "/border-tax",
  protect,
  upload.single("slip_image"),
  createBorderTax
);
router.get("/border-tax/my", protect, getAllBorderTax);
router.get("/border-tax/:id", protect, getBorderTaxById);
router.put(
  "/border-tax/:id",
  protect,
  upload.single("slip_image"),
  updateBorderTax
);
router.delete("/border-tax/:id", protect, deleteBorderTax);

// ---------------------------------------------
// 🔥 INSURANCE
// ---------------------------------------------
router.post("/insurance", protect, createInsurance);
router.get("/insurance/my", protect, getMyInsurance);
router.get("/insurance/my/:id", protect, getInsuranceById);

router.get("/insurance-admin", getAllInsurance);
router.put("/insurance/status/:id", updateInsuranceStatus);
router.delete("/insurance/:id", deleteInsurance);

// ---------------------------------------------
// 🔥 ADMIN CATEGORIES
// ---------------------------------------------
router.post("/new-categories", upload.single("image"), createCategories);
router.get("/get-categories", getAllCategories);
router.get("/get-categories/:id", getCategoryById);
router.put("/update-categories/:id", upload.single("image"), updateCategory);
router.delete("/delete-categories/:id", deleteCategory);

module.exports = router;
