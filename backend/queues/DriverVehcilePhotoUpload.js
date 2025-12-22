const Bull = require("bull");
const Driver = require("../models/driver/driver.model");
const Redis = require("ioredis");
const Vehicle = require("../models/driver/vehicle.model");
const { deleteImage, uploadSingleImage } = require("../utils/cloudinary");
const fs = require("fs").promises;

const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Create the queue
const vehiclePhotoUploadQueue = new Bull("vehicle-photo-upload", {
  redis: {
    host: "127.0.0.1",
    port: 6379,
  },
  defaultJobOptions: {
    attempts: 4,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Utility function to log
const log = (step, message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🔹 [VEHICLE_UPLOAD_QUEUE | ${step}] ${message}`);
  if (data) {
    console.log("📦 Data:", JSON.stringify(data, null, 2));
  }
};

// Utility to cleanup local files - ONLY on final completion or failure
const cleanupLocalFile = async (filePath) => {
  try {
    if (filePath) {
      await fs.unlink(filePath);
      log("FILE_CLEANUP", `Deleted local file: ${filePath}`);
    }
  } catch (error) {
    log("FILE_CLEANUP_ERROR", `Failed to delete ${filePath}:`, error.message);
  }
};

// NEW: Cleanup all local files at once
const cleanupAllLocalFiles = async (filePaths) => {
  log("CLEANUP_ALL", "Starting cleanup of all local files");
  for (const [key, filePath] of Object.entries(filePaths)) {
    await cleanupLocalFile(filePath);
  }
  log("CLEANUP_ALL", "Local file cleanup complete");
};

// Process the queue
vehiclePhotoUploadQueue.process(async (job) => {
  const { driverId, vehicleData, filePaths, rcData } = job.data;

  log("JOB_START", `Processing vehicle upload for driver: ${driverId}`, {
    jobId: job.id,
    attempt: job.attemptsMade + 1,
    maxAttempts: job.opts.attempts,
  });

  let uploadedFiles = {};
  let currentStep = "INIT";
  const isLastAttempt = job.attemptsMade + 1 >= job.opts.attempts;

  try {
    // Step 1: Validate Driver
    currentStep = "DRIVER_VALIDATION";
    const driver = await Driver.findById(driverId);
    if (!driver) throw new Error(`Driver not found: ${driverId}`);
    log(currentStep, "Driver validated", { driverId: driver._id });
    await job.progress(10);

    // Helper functions
    const normalizeUploadResult = (result) => ({
      url: result.url || result.image,
      public_id: result.public_id,
    });
    const parseDate = (dateValue) => {
      if (!dateValue) return undefined;
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        log("DATE_PARSE_WARNING", `Invalid date value: ${dateValue}`);
        return undefined;
      }
      return date;
    };

    // Step 2–8: Upload all mandatory files
    const mandatoryFiles = [
      { key: "rcFront", path: filePaths.rcFront },
      { key: "rcBack", path: filePaths.rcBack },
      { key: "insurance", path: filePaths.insurance },
      { key: "permit", path: filePaths.permit },
      { key: "vehicleFront", path: filePaths.vehicleFront },
      { key: "vehicleBack", path: filePaths.vehicleBack },
      { key: "vehicleInterior", path: filePaths.vehicleInterior },
    ];

    for (const [index, file] of mandatoryFiles.entries()) {
      currentStep = `UPLOAD_${file.key.toUpperCase()}`;
      log(currentStep, `Uploading ${file.key}`, { filePath: file.path });
      const result = await uploadSingleImage(file.path, file.key.includes("vehicle") ? `vehicle_photos/${file.key.replace("vehicle","").toLowerCase()}` : `vehicle_documents/${file.key}`);
      uploadedFiles[file.key] = normalizeUploadResult(result);
      await job.progress(10 + (index + 1) * 10);
    }

    // Optional legalDoc
    if (filePaths.legalDoc) {
      currentStep = "UPLOAD_LEGAL_DOC";
      log(currentStep, "Uploading legal document", { filePath: filePaths.legalDoc });
      const legalDocResult = await uploadSingleImage(filePaths.legalDoc, "vehicle_documents/legal");
      uploadedFiles.legalDoc = normalizeUploadResult(legalDocResult);
      await job.progress(85);
    }

    log("UPLOAD_COMPLETE", "All files uploaded successfully");

    // Step 9: Create Vehicle Record
    currentStep = "VEHICLE_CREATE";
    const vehicle = await Vehicle.create({
      driver_id: driver._id,
      vehicle_type: vehicleData.vehicleType.toLowerCase(),
      vehicle_brand: rcData.maker_description,
      vehicle_name: rcData.maker_model,
      vehicle_number: vehicleData.vehicleNumber.toUpperCase(),

      registration_certificate: {
        rc_number: rcData.rc_number,
        register_date: parseDate(rcData.registration_date),
        fit_upto: parseDate(rcData.fit_up_to),
        rc_status: rcData.rc_status || "ACTIVE",
        verified: vehicleData?.rcStatus !== "PENDING_VERIFICATION",
        verified_at: vehicleData?.rcStatus !== "PENDING_VERIFICATION" ? new Date() : null,
        verified_via: vehicleData?.rcStatus !== "PENDING_VERIFICATION" ? "quickekyc_api" : "manual",
        front: uploadedFiles.rcFront,
        back: uploadedFiles.rcBack,
      },

      insurance: {
        company_name: rcData.insurance_company,
        policy_number: rcData.insurance_policy_number,
        expiry_date: parseDate(rcData.insurance_upto) || new Date(),
        verified: true,
        verified_at: new Date(),
        verified_via: "rc_api",
        document: uploadedFiles.insurance,
      },

      permit: {
        permit_number: rcData.permit_number,
        permit_type: rcData.permit_type,
        valid_from: parseDate(rcData.permit_valid_from),
        valid_upto: parseDate(rcData.permit_valid_upto),
        expiry_date: vehicleData?.rcStatus === "PENDING_VERIFICATION"
          ? parseDate(vehicleData?.permitExpiry)
          : parseDate(rcData.permit_valid_upto) || new Date(),
        verified: true,
        verified_at: new Date(),
        document: uploadedFiles.permit,
      },

      vehicle_photos: {
        front: uploadedFiles.vehicleFront,
        back: uploadedFiles.vehicleBack,
        interior: uploadedFiles.vehicleInterior,
      },

      // Optional Legal Doc
      ...(uploadedFiles.legalDoc ? { legal_doc: uploadedFiles.legalDoc } : {}),

      chassis_number: rcData.vehicle_chasi_number,
      engine_number: rcData.vehicle_engine_number,
      fuel_type: rcData.fuel_type,
      color: rcData.color,
      norms_type: rcData.norms_type,
      body_type: rcData.body_type,
      cubic_capacity: rcData.cubic_capacity,
      seating_capacity: rcData.seat_capacity ? parseInt(rcData.seat_capacity) : undefined,
      manufacturing_date: rcData.manufacturing_date_formatted || rcData.manufacturing_date,
      vehicle_category: rcData.vehicle_category,
      vehicle_category_description: rcData.vehicle_category_description,
      unladen_weight: rcData.unladen_weight,
      gross_weight: rcData.vehicle_gross_weight,
      registered_at: rcData.registered_at,

      owner_details: {
        owner_name: rcData.owner_name,
        father_name: rcData.father_name,
        present_address: rcData.present_address,
        permanent_address: rcData.permanent_address,
        mobile_number: rcData.mobile_number,
        owner_number: rcData.owner_number,
        // Save relation if present
        ...(vehicleData.relation ? { relation: vehicleData.relation } : {}),
      },

      financer_details: {
        financed: rcData.financed ? "YES" : "NO",
        financerName: rcData.financer,
      },

      tax_details: {
        tax_upto: parseDate(rcData.tax_upto),
        tax_paid_upto: parseDate(rcData.tax_paid_upto),
      },

      pucc_details: {
        pucc_number: rcData.pucc_number,
        pucc_upto: parseDate(rcData.pucc_upto),
      },

      rc_verification_data: rcData,
      approval_status: vehicleData?.rcStatus === "PENDING_VERIFICATION" ? "pending" : "approved",
      is_active: vehicleData?.rcStatus !== "PENDING_VERIFICATION",
    });

    log(currentStep, "Vehicle created successfully", { vehicleId: vehicle._id });
    await job.progress(90);

    // Step 10: Update Driver
    currentStep = "DRIVER_UPDATE";
    driver.current_vehicle_id = vehicle._id;
    await driver.save();
    log(currentStep, "Driver updated with vehicle reference");
    await job.progress(100);

    // Cleanup local files
    await cleanupAllLocalFiles(filePaths);

    return {
      success: true,
      driverId: driver._id,
      vehicleId: vehicle._id,
      message: "Vehicle added successfully. Awaiting admin approval.",
    };
  } catch (error) {
    log("ERROR", `Failed at step: ${currentStep}`, {
      error: error.message,
      stack: error.stack,
      attempt: job.attemptsMade + 1,
      isLastAttempt,
    });

    // Cleanup uploaded Cloudinary files on error
    for (const [key, file] of Object.entries(uploadedFiles)) {
      if (file?.public_id) {
        try {
          await deleteImage(file.public_id);
          log("CLEANUP", `Deleted Cloudinary image: ${key}`, { public_id: file.public_id });
        } catch {}
      }
    }

    // Cleanup local files only on last attempt
    if (isLastAttempt) await cleanupAllLocalFiles(filePaths);

    throw error; // trigger retry
  }
});

// Event handlers for monitoring
vehiclePhotoUploadQueue.on("completed", (job, result) => {
  log("JOB_COMPLETED", `Job ${job.id} completed successfully`, result);
});

vehiclePhotoUploadQueue.on("failed", async (job, err) => {
  log(
    "JOB_FAILED",
    `Job ${job.id} failed permanently after ${job.attemptsMade} attempts`,
    {
      error: err.message,
      driverId: job.data.driverId,
    }
  );

  // Final cleanup on permanent failure
  if (job.data.filePaths) {
    log("FINAL_CLEANUP", "Performing final cleanup of local files");
    await cleanupAllLocalFiles(job.data.filePaths);
  }
});

vehiclePhotoUploadQueue.on("stalled", (job) => {
  log("JOB_STALLED", `Job ${job.id} has stalled`, {
    driverId: job.data.driverId,
  });
});

vehiclePhotoUploadQueue.on("progress", (job, progress) => {
  log("JOB_PROGRESS", `Job ${job.id} progress: ${progress}%`);
});

// Helper function to add job to queue
const addVehicleUploadJob = async (jobData) => {
  try {
    const job = await vehiclePhotoUploadQueue.add(jobData, {
      priority: 1,
      timeout: 300000, // 5 minutes timeout
    });

   
    return job;
  } catch (error) {
    log("JOB_ADD_ERROR", "Failed to add job to queue", error.message);
    throw error;
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  log("SHUTDOWN", "Gracefully shutting down vehicle upload queue...");
  await vehiclePhotoUploadQueue.close();
  await redis.quit();
  log("SHUTDOWN", "Queue closed successfully");
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

module.exports = {
  vehiclePhotoUploadQueue,
  addVehicleUploadJob,
};
