package com.taxisafr.driver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "TaxiSafarBootReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "Boot event received: $action")
        
        when (action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON",
            Intent.ACTION_REBOOT -> {
                startServicesIfDriverWasOnline(context)
            }
        }
    }
    
    private fun startServicesIfDriverWasOnline(context: Context) {
        try {
            val prefs = context.getSharedPreferences("DriverPrefs", Context.MODE_PRIVATE)
            val wasOnline = prefs.getBoolean("driver_online", false)
            val driverId = prefs.getString("driver_id", "")
            
            Log.d(TAG, "Driver was online: $wasOnline")
            
            if (wasOnline && !driverId.isNullOrEmpty()) {
                Log.d(TAG, "Starting services for driver: $driverId")
                
                // Start RidePoolingService
                val poolingIntent = Intent(context, RidePoolingService::class.java).apply {
                    putExtra("driver_id", driverId)
                    putExtra("auto_start", true)
                }
                
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(poolingIntent)
                    } else {
                        context.startService(poolingIntent)
                    }
                    Log.d(TAG, "RidePoolingService started")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to start RidePoolingService", e)
                }
                
                // Start FloatingWidgetService
                val widgetIntent = Intent(context, FloatingWidgetService::class.java)
                try {
                    context.startService(widgetIntent)
                    Log.d(TAG, "FloatingWidgetService started")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to start FloatingWidgetService", e)
                }
                
            } else {
                Log.d(TAG, "Driver was not online, skipping service start")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in boot receiver", e)
        }
    }
}
