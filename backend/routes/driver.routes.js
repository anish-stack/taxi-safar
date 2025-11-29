const express = require("express");
const {
  registerDriver,
  login,
  resendOtp,
  getDriverDetailsViaId,
  addVehicleDetails,
  addBankDetails,
  getBankNames,
  verifyOtp,
  getDriverDetails,
  updateCurrentRadius,
} = require("../controllers/registration/driver.reg");
const { upload, companyUpload } = require("../middlewares/multer");
const {
  refreshAccessToken,
} = require("../controllers/registration/refreshAccessToken");
const protect = require("../middlewares/auth");
const {
  toggleStatus,
  updateDriverLocation,
  getDriverLocation,
  get_all_Drivers,
  updateFcmToken,
  addCompanyDetails,
  getMyCompanyDetails,
  updateCompanyDetails,
  deleteCompanyDetails,
  adminGetAllCompanyDetails,
  FetchMyAssignedRides,
} = require("../controllers/driver/driver.helper.controller");
const {
  postRide,
  getAllRides,
  getRideById,
  searchNearbyRides,
  getMyRide,
} = require("../controllers/rides/driver_post_rides");
const { foundChatInitialized } = require("../controllers/driver/driver_chat");
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

const {
  createCategories,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controllers/admins/Categories/Categories");
const { createQuotation, updateQuotation, deleteQuotation, getAllQuotations } = require("../controllers/extra/Quotation.controller");
const { createJob, getJobById, updateJob, getJobs } = require("../controllers/extra/driverJobs.controller");
const { createBorderTax, getAllBorderTax, getBorderTaxById, deleteBorderTax, updateBorderTax,   } = require("../controllers/extra/BorderTaxPay.controller");
const { createInsurance, getMyInsurance, getAllInsurance, updateInsuranceStatus, deleteInsurance, getInsuranceById } = require("../controllers/extra/buyInsurance.controller");

const router = express.Router();

router.post("/register-driver", upload.any(), registerDriver);

router.post("/login", login);
router.post("/verify-login-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.get("/driver-details/:driverId", getDriverDetailsViaId);
router.get("/driver-details", protect, getDriverDetails);
router.put("/update-radius", protect, updateCurrentRadius);

router.post("/add-vehicle-details/:driverId", upload.any(), addVehicleDetails);
router.post("/add-bank-details/:driverId", addBankDetails);
router.get("/bank-names", getBankNames);
router.post("/refresh-token", refreshAccessToken);

router.get("/get-drivers", get_all_Drivers);

// Helper things
router.post("/toggle-status", protect, toggleStatus);
router.post("/update-driver-location", protect, updateDriverLocation);
router.get("/get-driver-location",protect, getDriverLocation);
router.post("/update-fcm", protect, updateFcmToken);

// driver-post
router.post("/post-ride", protect, postRide);
router.get("/post-rides", getAllRides);
router.get("/post-rides/:rideId", getRideById);

router.get("/fetch-nearby-rides", protect, searchNearbyRides);
router.get("/get-my-ride", protect, getMyRide);

//location
router.get("/get-driver-location/:driverId",getDriverLocation)

//taxi-safar-ride
router.post("/post-taxi-safar-ride", createNewRide);
router.get(
  "/Fetch-Near-By-Taxi-Safar-Rides",
  protect,
  FetchNearByTaxiSafarRides
);
router.post("/add-company", protect, companyUpload, addCompanyDetails);
router.put("/update-company", protect, companyUpload, updateCompanyDetails);
router.post(
  "/add-company",
  protect,
  companyUpload,
  addCompanyDetails
);

router.get("/my-company", protect, getMyCompanyDetails);

router.delete("/delete-company", protect, deleteCompanyDetails);
router.get("/admin/all-company-details", adminGetAllCompanyDetails);

router.get("/taxi-safar-ride/:id", getRideTaxiById);
router.post("/accept-ride/:rideId", protect, acceptRide);
//chat
router.get("/chats-initialized", protect, foundChatInitialized);


//my assigned ride
router.get("/get-my-assigend-rides",protect,FetchMyAssignedRides)
router.post("/mark-reached/:rideId",protect,markReachedAtPickupLocation)
router.post("/verify-otp/:rideId",protect,verifyRideOtp)
router.post("/complete-otp",protect,completeRide)
router.post("/ride-status/:rideId",rideStatus)

//quations
router.post("/create-quotation",protect,createQuotation)
router.post("/update-quotation",protect,updateQuotation)
router.delete("/delete-quotation/:id",protect,deleteQuotation)
router.get("/get-quotation",protect,getAllQuotations)


//jobs
router.post("/driver-jobs",protect,createJob)
router.get("/driver-jobs/:id",protect,getJobById)
router.put("/driver-jobs",protect,updateJob)
router.get("/driver-jobs",protect,getJobs)

// Routes with prefix: /border-tax
router.post("/border-tax", protect, upload.single("slip_image"), createBorderTax);
router.get("/border-tax/my", protect, getAllBorderTax);
router.get("/border-tax/:id", protect, getBorderTaxById);
router.put("/border-tax/:id", protect, upload.single("slip_image"),updateBorderTax);
router.delete("/border-tax/:id", protect, deleteBorderTax);

// Routes with prefix: /insurance

router.post("/insurance", protect, createInsurance);
router.get("/insurance/my", protect, getMyInsurance);
router.get("/insurance/my/:id", protect, getInsuranceById);

router.get("/insurance", protect, getAllInsurance);
router.put("/insurance/status/:id", protect, updateInsuranceStatus);
router.delete("/insurance/:id", protect, deleteInsurance);



//admin categories
router.post("/new-categories", upload.single("image"), createCategories);
router.get("/get-categories", getAllCategories);
router.get("/get-categories/:id", getCategoryById);
router.put("/update-categories/:id", upload.single("image"), updateCategory);
router.delete("/delete-categories/:id", deleteCategory);

module.exports = router;
