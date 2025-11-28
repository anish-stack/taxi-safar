const Bull = require('bull');
const Driver = require("../models/driver/driver.model");
const sendNotification = require('../utils/sendNotification');
const { QUEUE_SETTINGS, JOB_OPTIONS, calculateDistance } = require('../utils/Queues');
const Redis = require('ioredis');

const redis = new Redis({ host: '127.0.0.1', port: 6379 });

const ridePostNotifications = new Bull('ride-post-notification', {
    redis: { host: '127.0.0.1', port: 6379 },
    settings: QUEUE_SETTINGS
});

const NOTIFICATION_TRACKING_PREFIX = 'ride_post_notified:';
const TRACKING_EXPIRY = 24 * 60 * 60; // 24 hours in seconds


const hasDriverBeenNotified = async (ridePostId, driverId) => {
    try {
        const key = `${NOTIFICATION_TRACKING_PREFIX}${ridePostId}`;
        const isNotified = await redis.sismember(key, driverId.toString());
        return isNotified === 1;
    } catch (error) {
        console.error('❌ Error checking notification status:', error);
        return false;
    }
};

const markDriverAsNotified = async (ridePostId, driverId) => {
    try {
        const key = `${NOTIFICATION_TRACKING_PREFIX}${ridePostId}`;
        await redis.sadd(key, driverId.toString());
        await redis.expire(key, TRACKING_EXPIRY);
    } catch (error) {
        console.error('❌ Error marking driver as notified:', error);
    }
};


const getNotifiedDrivers = async (ridePostId) => {
    try {
        const key = `${NOTIFICATION_TRACKING_PREFIX}${ridePostId}`;
        const driverIds = await redis.smembers(key);
        return driverIds;
    } catch (error) {
        console.error('❌ Error getting notified drivers:', error);
        return [];
    }
};


const sendNotificationToDriversInRadius = async (rideData) => {
    try {
        console.log('🚗 Starting driver notification process for ride post...');
        
        const {
            ridePostId,
            pickupAddress,
            dropAddress,
            pickupLocation,
            vehicleType,
            driverName,
            driverEarning,
            tripType
        } = rideData;

        // Validate pickup location
        if (!pickupLocation || !pickupLocation.coordinates[1] || !pickupLocation.coordinates[0]) {
            console.error('❌ Invalid pickup location data');
            return;
        }

        // Find all available drivers who are online and not on a ride
        const availableDrivers = await Driver.find({
            is_online: true,
            is_on_ride: false,
            account_status: 'active',
            fcm_token: { $exists: true, $ne: null },
            current_location: { $exists: true },
            'current_location.coordinates': { $exists: true, $ne: null }
        }).select('driver_name fcm_token current_location currentRadius current_vehicle_id');

        console.log(`📍 Found ${availableDrivers.length} online available drivers`);

        if (availableDrivers.length === 0) {
            console.log('⚠️ No available drivers found');
            return;
        }

        // Get list of drivers who have already been notified for this ride post
        const notifiedDriverIds = await getNotifiedDrivers(ridePostId);
        console.log(`📋 ${notifiedDriverIds.length} drivers already notified for this ride post`);

        // Populate vehicle details to check vehicle type
        await Driver.populate(availableDrivers, {
            path: 'current_vehicle_id',
            select: 'vehicle_type'
        });

        // Filter drivers based on their individual radius and vehicle type
        const driversInRadius = availableDrivers.filter(driver => {
            // Skip if driver has already been notified for this ride post
            if (notifiedDriverIds.includes(driver._id.toString())) {
                console.log(`⏭️ Skipping driver ${driver.driver_name} - already notified`);
                return false;
            }

            // Check if driver has valid location coordinates
            if (!driver.current_location || 
                !driver.current_location.coordinates ||
                driver.current_location.coordinates.length < 2) {
                return false;
            }

            const [driverLon, driverLat] = driver.current_location.coordinates;

            // Calculate distance from driver to pickup location
            const distanceToPickup = calculateDistance(
                driverLat,
                driverLon,
                pickupLocation.coordinates[1],
               pickupLocation.coordinates[0]
            );

            // Get driver's current radius (default to 5 if not set)
            const driverRadius = driver.currentRadius || 5;

            // Check if pickup is within driver's radius
            const isInRadius = distanceToPickup <= driverRadius;

            // Check if driver's vehicle type matches the required vehicle type
            let vehicleMatches = true;
            if (vehicleType && driver.current_vehicle_id && driver.current_vehicle_id.vehicle_type) {
                vehicleMatches = driver.current_vehicle_id.vehicle_type === vehicleType;
            }

            if (isInRadius && vehicleMatches) {
                console.log(`✅ Driver ${driver.driver_name}: ${distanceToPickup.toFixed(2)}km away (radius: ${driverRadius}km)`);
            }

            return isInRadius && vehicleMatches;
        });

        console.log(`✅ ${driversInRadius.length} drivers match criteria (radius + vehicle type)`);

        if (driversInRadius.length === 0) {
            console.log('⚠️ No drivers found within their radius with matching vehicle type');
            return;
        }

        // Prepare notification content
        const notificationTitle = '🚗 New Ride Posted by Driver';
        
        const notificationBody = `${pickupAddress || 'Pickup'} → ${dropAddress || 'Drop'}\nPosted by: ${driverName || 'Driver'}${driverEarning ? ` | Earning: ₹${driverEarning}` : ''}`;

        const eventData = {
            event: 'NEW_RIDE_POST',
            rideDetails: {
                ridePostId: ridePostId || '',
                pickupAddress: pickupAddress || '',
                dropAddress: dropAddress || '',
                pickupLocation: {
                    latitude: pickupLocation.coordinates[1],
                    longitude:pickupLocation.coordinates[0]
                },
                vehicleType: vehicleType || '',
                driverName: driverName || '',
                driverEarning: driverEarning || null,
                tripType: tripType || ''
            }
        };

        // Send notifications to all matching drivers
        const notificationPromises = driversInRadius.map(async (driver) => {
            try {
                await sendNotification.sendNotification(
                    driver.fcm_token,
                    notificationTitle,
                    notificationBody,
                    eventData,
                    'ride_post_channel'
                );
                console.log(`✅ Notification sent to driver: ${driver.driver_name} (${driver._id})`);
                return { success: true, driverId: driver._id };
            } catch (error) {
                console.error(`❌ Failed to send notification to driver ${driver._id}:`, error.message);
                return { success: false, driverId: driver._id, error: error.message };
            }
        });

        // Wait for all notifications to complete
        const results = await Promise.allSettled(notificationPromises);
        
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failureCount = results.length - successCount;

        console.log(`🎉 Notification Summary: ${successCount} sent, ${failureCount} failed`);

    } catch (error) {
        console.error('❌ Error in sendNotificationToDriversInRadius:', error);
        throw error;
    }
};

/**
 * Process jobs from the queue
 */
ridePostNotifications.process(async (job, done) => {
    try {
        console.log(`📥 Processing job ${job.id}...`);
        const rideData = job.data;

        await sendNotificationToDriversInRadius(rideData);

        console.log(`✅ Job ${job.id} completed successfully`);
        done();
    } catch (error) {
        console.error(`❌ Error processing ride post notification job ${job.id}:`, error);
        done(error);
    }
});

/**
 * Event listeners for queue monitoring
 */
ridePostNotifications.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed at ${new Date().toISOString()}`);
});

ridePostNotifications.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed:`, err.message);
});

ridePostNotifications.on('stalled', (job) => {
    console.warn(`⚠️ Job ${job.id} stalled - may need retry`);
});

ridePostNotifications.on('error', (error) => {
    console.error('❌ Queue error:', error);
});

/**
 * Add a new ride notification job to the queue
 * @param {Object} rideData - Ride post data
 * @returns {Promise<Job>}
 */
const addRideNotificationJob = async (rideData) => {
    try {
        const job = await ridePostNotifications.add(rideData, JOB_OPTIONS);
        console.log(`📤 Added ride notification job: ${job.id} for ride post: ${rideData.ridePostId}`);
        return job;
    } catch (error) {
        console.error('❌ Error adding job to queue:', error);
        throw error;
    }
};

/**
 * Get queue statistics
 */
const getQueueStats = async () => {
    try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            ridePostNotifications.getWaitingCount(),
            ridePostNotifications.getActiveCount(),
            ridePostNotifications.getCompletedCount(),
            ridePostNotifications.getFailedCount(),
            ridePostNotifications.getDelayedCount()
        ]);

        return {
            waiting,
            active,
            completed,
            failed,
            delayed,
            total: waiting + active + completed + failed + delayed
        };
    } catch (error) {
        console.error('❌ Error getting queue stats:', error);
        throw error;
    }
};

module.exports = {
    ridePostNotifications,
    sendNotificationToDriversInRadius,
    addRideNotificationJob,
    getQueueStats,
    hasDriverBeenNotified,
    markDriverAsNotified,
    getNotifiedDrivers
};