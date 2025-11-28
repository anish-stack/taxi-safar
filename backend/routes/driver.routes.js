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
const { upload } = require("../middlewares/multer");
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
} = require("../controllers/rides/taxiSafar.controller");

const {
  createCategories,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controllers/admins/Categories/Categories");

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
router.get("/get-driver-location/:id", getDriverLocation);
router.post("/update-fcm", protect, updateFcmToken);

// driver-post
router.post("/post-ride", protect, postRide);
router.get("/post-rides", getAllRides);
router.get("/post-rides/:rideId", getRideById);

router.get("/fetch-nearby-rides", protect, searchNearbyRides);
router.get("/get-my-ride", protect, getMyRide);

//taxi-safar-ride
router.post("/post-taxi-safar-ride", createNewRide);
router.get(
  "/Fetch-Near-By-Taxi-Safar-Rides",
  protect,
  FetchNearByTaxiSafarRides
);
router.get("/taxi-safar-ride/:id", getRideTaxiById);
router.post("/accept-ride/:rideId", protect, acceptRide);
//chat
router.get("/chats-initialized", protect, foundChatInitialized);

//admin categories
router.post("/new-categories", upload.single("image"), createCategories);
router.get("/get-categories", getAllCategories);
router.get("/get-categories/:id", getCategoryById);
router.put("/update-categories/:id", upload.single("image"), updateCategory);
router.delete("/delete-categories/:id", deleteCategory);

module.exports = router;
