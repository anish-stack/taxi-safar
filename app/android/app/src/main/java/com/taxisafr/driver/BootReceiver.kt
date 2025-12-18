package com.taxisafr.driver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "TaxiSafarBootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "Boot event received: $action")

        if (action in listOf(Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_LOCKED_BOOT_COMPLETED)) {
            scheduleRidePoolingService(context)
        }
    }

    private fun scheduleRidePoolingService(context: Context) {
        try {
            val prefs = context.getSharedPreferences("DriverPrefs", Context.MODE_PRIVATE)
            val wasOnline = prefs.getBoolean("driver_online", false)
            val driverId = prefs.getString("driver_id", null)
            val token = prefs.getString("driver_token", null)
            val baseUrl = prefs.getString("base_url", "https://test.taxi.olyox.in")

            if (wasOnline && !driverId.isNullOrEmpty() && !token.isNullOrEmpty()) {
                Log.d(TAG, "Scheduling RidePoolingService via WorkManager for driver: $driverId")

                // IMPORTANT: Use "driverId" not "driver_id" to match Worker
                val data = Data.Builder()
                    .putString("driverId", driverId)  // Changed from "driver_id"
                    .putString("token", token)         // Added token
                    .putString("baseUrl", baseUrl)     // Added baseUrl
                    .build()

                val workRequest = OneTimeWorkRequestBuilder<StartRidePoolingServiceWorker>()
                    .setInputData(data)
                    .build()

                WorkManager.getInstance(context).enqueue(workRequest)
            } else {
                Log.d(TAG, "Driver was not online or missing credentials, skipping service start")
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling RidePoolingService", e)
        }
    }
}