require("dotenv").config();
const express = require("express");
const cors = require("cors");
const router = require("./routes/driver.routes");
const CarRouter = require("./routes/car.routes");
const connectDB = require("./config/db");
const { subscribeToLocations } = require("./services/location.listener");

const app = express();
app.use(cors());
app.use(express.json());

// Connect MongoDB
connectDB();

// Subscribe to Redis location channel
subscribeToLocations();

// Routes
app.use("/api/v1", router);
app.use("/api/v1/vehicles", CarRouter);

// Start Server
const PORT = process.env.PORT || 7485;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
