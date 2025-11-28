require("dotenv").config();
const express = require("express");
const cors = require("cors");
const router = require("./routes/driver.routes");
const CarRouter = require("./routes/car.routes");
const connectDB = require("./config/db");
const { subscribeToLocations } = require("./services/location.listener");
const cookieParser = require("cookie-parser");
const setupBullBoard = require("./bullboard");
const { initializeFirebase } = require("./utils/sendNotification");
const admin = require("./routes/admin.routes");
const wallet = require("./routes/wallet.routes");

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

connectDB();
subscribeToLocations();
setupBullBoard(app);


// Routes
app.use("/api/v1", router);
app.use("/api/v1/vehicles", CarRouter);
app.use('/api/v1/admin',admin)
app.use('/api/v1/wallet',wallet)

// Start Server
const PORT = process.env.PORT || 7485;
app.listen(PORT, () => {
  initializeFirebase()
  console.log(`Bull Board available at http://localhost:${PORT}/admin/queues`);
  console.log(`🚀 Server running on port ${PORT}`);
});
