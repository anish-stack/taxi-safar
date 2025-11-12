package com.taxisafr.driver

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LocationUpdateModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val TAG = "LocationUpdateModule"

    override fun getName(): String = "LocationUpdateModule"

    @ReactMethod
    fun startLocationUpdates(apiUrl: String, token: String, promise: Promise) {
        try {
            // Check battery optimization
            checkBatteryOptimization()

            val serviceIntent = Intent(reactContext, LocationUpdateService::class.java).apply {
                putExtra("apiUrl", apiUrl)
                putExtra("token", token)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent)
            } else {
                reactContext.startService(serviceIntent)
            }

            Log.d(TAG, "Location service started successfully")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start service: ${e.message}")
            promise.reject("START_ERROR", "Failed to start location service: ${e.message}")
        }
    }

    @ReactMethod
    fun stopLocationUpdates(promise: Promise) {
        try {
            val serviceIntent = Intent(reactContext, LocationUpdateService::class.java)

            // Mark service as disabled
            val prefs = reactContext.getSharedPreferences("LocationServicePrefs", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("service_enabled", false).apply()

            reactContext.stopService(serviceIntent)
            Log.d(TAG, "Location service stopped")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop service: ${e.message}")
            promise.reject("STOP_ERROR", "Failed to stop location service: ${e.message}")
        }
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        try {
            promise.resolve(LocationUpdateService.isServiceRunning)
        } catch (e: Exception) {
            promise.reject("STATUS_ERROR", "Failed to get service status: ${e.message}")
        }
    }

    @ReactMethod
    fun requestBatteryOptimization(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val activity = reactContext.currentActivity
                if (activity == null) {
                    promise.reject("NO_ACTIVITY", "No activity available")
                    return
                }

                val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
                if (!powerManager.isIgnoringBatteryOptimizations(reactContext.packageName)) {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:${reactContext.packageName}")
                    }
                    activity.startActivity(intent)
                    promise.resolve(false) // Not yet optimized
                } else {
                    promise.resolve(true) // Already optimized
                }
            } else {
                promise.resolve(true) // Not needed for older Android versions
            }
        } catch (e: Exception) {
            Log.e(TAG, "Battery optimization error: ${e.message}")
            promise.reject("BATTERY_ERROR", "Failed to request battery optimization: ${e.message}")
        }
    }

    @ReactMethod
    fun isBatteryOptimizationDisabled(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
                promise.resolve(powerManager.isIgnoringBatteryOptimizations(reactContext.packageName))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("BATTERY_CHECK_ERROR", "Failed to check battery optimization: ${e.message}")
        }
    }

    private fun checkBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!powerManager.isIgnoringBatteryOptimizations(reactContext.packageName)) {
                Log.w(TAG, "Battery optimization is enabled - service may be killed by system")
            }
        }
    }
}