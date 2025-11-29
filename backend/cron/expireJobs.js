const cron = require("node-cron");
const DriverJob = require("../models/extra/DriverJobs");

cron.schedule("0 * * * *", async () => {
  try {
    await DriverJob.updateMany(
      { valid_till: { $lt: new Date() }, status: "active" },
      { status: "expired" }
    );

    console.log("Expired jobs updated");
  } catch (error) {
    console.error("Error expiring jobs:", error);
  }
});
