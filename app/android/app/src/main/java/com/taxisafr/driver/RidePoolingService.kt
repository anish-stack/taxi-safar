package com.taxisafr.driver

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicBoolean

class RidePoolingService : Service() {

    companion object {
        private const val TAG = "RidePoolingService"
        private const val CHANNEL_ID = "taxi_safar_pooling_channel"
        private const val ALERT_CHANNEL_ID = "taxi_ride_alert"
        private const val FOREGROUND_ID = 1

        // Thread-safe service running state
        @Volatile
        var isServiceRunning = false
            private set

        private val runningLock = Any()
        fun setServiceRunning(running: Boolean) {
            synchronized(runningLock) {
                isServiceRunning = running
            }
        }
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var driverId: String? = null
    private var token: String? = null
    private var baseUrl: String = "https://api.taxisafar.com"
    private val client = OkHttpClient()
    private var mediaPlayer: MediaPlayer? = null
    private val notifiedRideIds = mutableSetOf<String>()

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        driverId = intent?.getStringExtra("driverId")
        token = intent?.getStringExtra("token")
        baseUrl = intent?.getStringExtra("baseUrl") ?: "https://api.taxisafar.com"

        if (driverId.isNullOrBlank() || token.isNullOrBlank()) {
            Log.e(TAG, "Driver ID or Token missing → Stopping service")
            stopSelf()
            return START_NOT_STICKY
        }

        Log.d(TAG, "Service started for driver: $driverId")
        setServiceRunning(true)
        startForegroundService()
        startPolling()

        return START_STICKY
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            NotificationChannel(CHANNEL_ID, "Driver Online", NotificationManager.IMPORTANCE_LOW).also {
                manager.createNotificationChannel(it)
            }

            NotificationChannel(ALERT_CHANNEL_ID, "New Ride Alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                enableVibration(true)
                setSound(null, null)
                manager.createNotificationChannel(this)
            }
        }
    }

    private fun startForegroundService() {
        val messages = arrayOf(
            "You're online — ready for rides",
            "Searching for nearby passengers...",
            "Earning mode active"
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Taxi Safar Driver • Online")
            .setContentText(messages.random())
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        startForeground(FOREGROUND_ID, notification)
    }

    private fun startPolling() {
        scope.launch {
            while (isServiceRunning) {
                try {
                    fetchNearbyRides()
                } catch (e: Exception) {
                    Log.e(TAG, "Polling error: ${e.message}")
                }
                delay(10000) // Every 10 seconds
            }
        }
    }

    private suspend fun fetchNearbyRides() {
        val headers = Headers.Builder()
            .add("Authorization", "Bearer $token")
            .build()

        val endpoints = listOf(
            "/api/v1/Fetch-Near-By-Taxi-Safar-Rides?page=1&limit=5",
            "/api/v1/fetch-nearby-rides?page=1&limit=5"
        )

        val rides = mutableListOf<JSONObject>()

        endpoints.forEach { path ->
            val url = "$baseUrl$path"
            val request = Request.Builder().url(url).headers(headers).build()
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string() ?: return@use
                    val json = JSONObject(body)
                    if (json.optBoolean("success", false)) {
                        val data = json.optJSONArray("data") ?: return@use
                        for (i in 0 until data.length()) {
                            rides.add(data.getJSONObject(i))
                        }
                    }
                }
            }
        }

        processRides(rides)
    }

private suspend fun processRides(rides: List<JSONObject>) {
    if (rides.isEmpty()) {
        withContext(Dispatchers.Main) {
            stopAlertSound()
            clearAllRideNotifications()
        }
        notifiedRideIds.clear()
        return
    }

    var hasNewRide = false
    var latestRide: JSONObject? = null

    for (ride in rides) {
        val rideId = ride.optString("_id", "")
        val pickup = ride.optString("pickup_address", ride.optString("pickupAddress", "Unknown"))
        val drop = ride.optString("drop_address", ride.optString("dropAddress", "Unknown"))
        val status = ride.optString("ride_status", ride.optString("status", "")).lowercase()

        if (rideId.isBlank() || pickup == "Unknown") continue

        if (status in listOf("searching", "pending", "confirmed")) {
            if (rideId !in notifiedRideIds) {
                hasNewRide = true
                latestRide = ride
                notifiedRideIds.add(rideId)
                Log.d(TAG, "NEW RIDE: $rideId ($status)")
            }
        }
    }

    if (hasNewRide && latestRide != null) {
        val rideId = latestRide.optString("_id")
        val pickup = latestRide.optString("pickup_address", latestRide.optString("pickupAddress"))
        val drop = latestRide.optString("drop_address", latestRide.optString("dropAddress"))

        withContext(Dispatchers.Main) {
            showRideAlert(pickup, drop, rideId)
            playAlertSound()
            openApp()
        }
    }
}

    private fun showRideAlert(pickup: String, drop: String, rideId: String) {
        val notification = NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("New Ride Available!")
            .setContentText("Pickup: $pickup")
            .setStyle(NotificationCompat.BigTextStyle()
                .bigText("Pickup: $pickup\nDrop: $drop\nTap to accept"))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(rideId.hashCode(), notification)
    }

    private fun playAlertSound() {
        if (mediaPlayer?.isPlaying == true) return
        try {
            stopAlertSound()
            val resId = resources.getIdentifier("sound", "raw", packageName)
            if (resId != 0) {
                mediaPlayer = MediaPlayer.create(this, resId).apply {
                    isLooping = true
                    start()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sound failed", e)
        }
    }

    private fun stopAlertSound() {
        mediaPlayer?.let {
            if (it.isPlaying) it.stop()
            it.release()
            mediaPlayer = null
        }
    }

    private fun clearAllRideNotifications() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancelAll()
        startForegroundService() // Keep foreground alive
    }

    private fun openApp() {
        try {
            val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Cannot open app", e)
        }
    }

    override fun onDestroy() {
        setServiceRunning(false)
        stopAlertSound()
        notifiedRideIds.clear()
        scope.cancel()
        Log.d(TAG, "RidePoolingService destroyed")
        super.onDestroy()
    }
}