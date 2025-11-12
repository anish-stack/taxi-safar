package com.taxisafr.driver

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.location.Location
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import org.json.JSONObject
import java.io.IOException

class LocationUpdateService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var handler: Handler? = null
    private var runnable: Runnable? = null
    private var apiUrl: String? = null
    private var token: String? = null
    private val client = OkHttpClient()
    private val TAG = "LocationUpdateService"
    private var wakeLock: PowerManager.WakeLock? = null
    private var screenOffReceiver: BroadcastReceiver? = null

    companion object {
        private const val NOTIFICATION_ID = 101
        private const val CHANNEL_ID = "taxisafar_location_channel"
        private const val LOCATION_UPDATE_INTERVAL = 5000L
        
        var isServiceRunning = false
            private set
            
        private const val PREFS_NAME = "LocationServicePrefs"
        private const val KEY_SERVICE_ENABLED = "service_enabled"
        private const val KEY_API_URL = "api_url"
        private const val KEY_TOKEN = "token"
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "LocationUpdateService onCreate called")
        
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        handler = Handler(Looper.getMainLooper())
        
        isServiceRunning = true
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "LocationUpdateService onStartCommand called")
        
        // Start foreground IMMEDIATELY
        try {
            startForegroundNotification()
            Log.d(TAG, "Foreground notification started successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start foreground notification: ${e.message}", e)
            stopSelf()
            return START_NOT_STICKY
        }
        
        // Handle initialization
        try {
            // Get API URL and token from intent
            val intentApiUrl = intent?.getStringExtra("apiUrl")
            val intentToken = intent?.getStringExtra("token")

            if (!intentApiUrl.isNullOrEmpty() && !intentToken.isNullOrEmpty()) {
                // Use values from intent and save them
                apiUrl = intentApiUrl
                token = intentToken
                
                val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                prefs.edit().apply {
                    putBoolean(KEY_SERVICE_ENABLED, true)
                    putString(KEY_API_URL, apiUrl)
                    putString(KEY_TOKEN, token)
                    apply()
                }
                Log.d(TAG, "API URL and token saved: $apiUrl")
            } else {
                // Try to restore from SharedPreferences
                val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                apiUrl = prefs.getString(KEY_API_URL, null)
                token = prefs.getString(KEY_TOKEN, null)
                
                if (apiUrl.isNullOrEmpty() || token.isNullOrEmpty()) {
                    Log.e(TAG, "API URL or token is missing and cannot be restored")
                    stopSelf()
                    return START_NOT_STICKY
                }
                Log.d(TAG, "API URL and token restored from preferences: $apiUrl")
            }

            // Initialize wake lock and screen receiver
            initializeWakeLock()
            registerScreenReceiver()
            startLocationUpdates()
            
        } catch (e: Exception) {
            Log.e(TAG, "Error in onStartCommand: ${e.message}", e)
        }

        return START_STICKY
    }

    private fun initializeWakeLock() {
        try {
            if (wakeLock == null) {
                val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
                wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "TaxiSafarDriver::LocationService"
                )
                wakeLock?.acquire()
                Log.d(TAG, "Wake lock acquired")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error acquiring wake lock: ${e.message}")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "LocationUpdateService onDestroy called")
        
        stopLocationUpdates()
        unregisterScreenReceiver()
        
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val shouldRestart = prefs.getBoolean(KEY_SERVICE_ENABLED, false)
        
        try {
            wakeLock?.release()
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing wake lock: ${e.message}")
        }
        
        isServiceRunning = false
        
        if (shouldRestart && apiUrl != null && token != null) {
            Log.d(TAG, "Scheduling service restart after destroy")
            scheduleServiceRestart()
        }
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.d(TAG, "App removed from recent apps, ensuring service continues...")
        scheduleServiceRestart()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun scheduleServiceRestart() {
        try {
            val restartServiceIntent = Intent(applicationContext, LocationUpdateService::class.java).apply {
                putExtra("apiUrl", apiUrl)
                putExtra("token", token)
            }
            
            val restartServicePendingIntent = PendingIntent.getService(
                applicationContext, 
                1, 
                restartServiceIntent,
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
            )
            
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
            
            alarmManager.set(
                android.app.AlarmManager.ELAPSED_REALTIME_WAKEUP,
                android.os.SystemClock.elapsedRealtime() + 1000,
                restartServicePendingIntent
            )
            
            Log.d(TAG, "Service restart scheduled successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule service restart: ${e.message}", e)
        }
    }

    private fun registerScreenReceiver() {
        try {
            if (screenOffReceiver == null) {
                screenOffReceiver = object : BroadcastReceiver() {
                    override fun onReceive(context: Context?, intent: Intent?) {
                        when (intent?.action) {
                            Intent.ACTION_SCREEN_OFF -> {
                                Log.d(TAG, "Screen turned off - service continues running")
                                updateNotification("Running in background • ${getCurrentTime()}")
                            }
                            Intent.ACTION_SCREEN_ON -> {
                                Log.d(TAG, "Screen turned on")
                                updateNotification("Active • ${getCurrentTime()}")
                            }
                            Intent.ACTION_USER_PRESENT -> {
                                Log.d(TAG, "Device unlocked")
                            }
                        }
                    }
                }
                
                val filter = IntentFilter().apply {
                    addAction(Intent.ACTION_SCREEN_OFF)
                    addAction(Intent.ACTION_SCREEN_ON)
                    addAction(Intent.ACTION_USER_PRESENT)
                }
                
                registerReceiver(screenOffReceiver, filter)
                Log.d(TAG, "Screen receiver registered")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error registering screen receiver: ${e.message}")
        }
    }

    private fun unregisterScreenReceiver() {
        try {
            screenOffReceiver?.let { 
                unregisterReceiver(it)
                screenOffReceiver = null
                Log.d(TAG, "Screen receiver unregistered")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering screen receiver: ${e.message}")
        }
    }

    private fun startForegroundNotification() {
        val channelName = "Taxi Safar Driver Location"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val chan = NotificationChannel(
                CHANNEL_ID, 
                channelName, 
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Driver location tracking service"
                setShowBadge(false)
                enableLights(false)
                enableVibration(false)
                setSound(null, null)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(chan)
        }

        val notificationIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🚗 Taxi Safar - Ready for ride")
            .setContentText("Location tracking active")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSound(null)
            .setVibrate(null)
            .setAutoCancel(false)
            .setColorized(false)
            .setColor(0xFF4CAF50.toInt())
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    private fun startLocationUpdates() {
        try {
            runnable = object : Runnable {
                override fun run() {
                    try {
                        if (isNetworkAvailable()) {
                            sendLocation()
                        } else {
                            Log.w(TAG, "No network available, skipping location update")
                            updateNotification("No network • ${getCurrentTime()}")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error in location update loop: ${e.message}")
                    }
                    handler?.postDelayed(this, LOCATION_UPDATE_INTERVAL)
                }
            }
            handler?.post(runnable!!)
            Log.d(TAG, "Location updates started")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting location updates: ${e.message}")
        }
    }

    private fun stopLocationUpdates() {
        try {
            runnable?.let { handler?.removeCallbacks(it) }
            handler = null
            Log.d(TAG, "Location updates stopped")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping location updates: ${e.message}")
        }
    }

    private fun sendLocation() {
        if (ActivityCompat.checkSelfPermission(
                this, 
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(
                this, 
                Manifest.permission.ACCESS_COARSE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            Log.e(TAG, "Location permissions not granted")
            return
        }

        fusedLocationClient.lastLocation
            .addOnSuccessListener { location: Location? ->
                if (location != null) {
                    postToServer(location)
                    updateNotification("Active • ${getCurrentTime()}")
                } else {
                    Log.w(TAG, "Location is null")
                    updateNotification("Searching for location...")
                }
            }
            .addOnFailureListener { exception ->
                Log.e(TAG, "Failed to get location: ${exception.message}")
                updateNotification("Location error • ${getCurrentTime()}")
            }
    }

    private fun updateNotification(statusText: String) {
        try {
            val notificationIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            val pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("🚗 Taxi Safar - Ready for ride")
                .setContentText(statusText)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setSound(null)
                .setVibrate(null)
                .setColor(0xFF4CAF50.toInt())
                .setAutoCancel(false)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .build()

            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.e(TAG, "Error updating notification: ${e.message}")
        }
    }

    private fun getCurrentTime(): String {
        return java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
            .format(java.util.Date())
    }

    private fun postToServer(location: Location) {
        // Validate that we have the required configuration
        if (apiUrl.isNullOrEmpty()) {
            Log.e(TAG, "API URL is null or empty")
            updateNotification("Configuration error • ${getCurrentTime()}")
            return
        }

        if (token.isNullOrEmpty()) {
            Log.e(TAG, "Token is null or empty")
            updateNotification("Configuration error • ${getCurrentTime()}")
            return
        }

        try {
            val json = JSONObject().apply {
                put("latitude", location.latitude)
                put("longitude", location.longitude)
                put("accuracy", location.accuracy)
                put("speed", if (location.hasSpeed()) location.speed else 0.0)
                put("timestamp", System.currentTimeMillis())
                put("platform", "android")
            }

            val mediaType = "application/json; charset=utf-8".toMediaType()
            val body = RequestBody.create(mediaType, json.toString())

            val request = Request.Builder()
                .url(apiUrl!!)
                .addHeader("Authorization", "Bearer $token")
                .addHeader("Content-Type", "application/json")
                .post(body)
                .build()

            Log.d(TAG, "Sending location to: $apiUrl")

            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    Log.e(TAG, "Failed to send location: ${e.message}")
                    updateNotification("Connection error • ${getCurrentTime()}")
                }

                override fun onResponse(call: Call, response: Response) {
                    response.use { res ->
                        val responseBody = res.body?.string() ?: "No response body"
                        if (res.isSuccessful) {
                            Log.d(TAG, "Location sent successfully to $apiUrl: $responseBody")
                        } else {
                            Log.e(TAG, "Server error from $apiUrl: ${res.code} - $responseBody")
                            updateNotification("Server error • ${getCurrentTime()}")
                        }
                    }
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "Error creating location request: ${e.message}")
            updateNotification("Error • ${getCurrentTime()}")
        }
    }

    private fun isNetworkAvailable(): Boolean {
        return try {
            val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val network = connectivityManager.activeNetwork ?: return false
                val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
                capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            } else {
                @Suppress("DEPRECATION")
                val networkInfo = connectivityManager.activeNetworkInfo
                networkInfo?.isConnected == true
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking network availability: ${e.message}")
            false
        }
    }
}