package com.taxisafr.driver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class ServiceRestartReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "ServiceRestartReceiver"
        const val ACTION_RESTART_SERVICES = "com.taxisafr.driver.RESTART_SERVICES"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "Service restart requested")
        
        val prefs = context.getSharedPreferences("DriverPrefs", Context.MODE_PRIVATE)
        val isOnline = prefs.getBoolean("driver_online", false)
        val driverId = prefs.getString("driver_id", "")
        
        if (isOnline && !driverId.isNullOrEmpty()) {
            Log.d(TAG, "Restarting services for driver: $driverId")
            
            // Restart RidePoolingService
            val poolingIntent = Intent(context, RidePoolingService::class.java).apply {
                putExtra("driver_id", driverId)
                putExtra("auto_restart", true)
            }
            
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(poolingIntent)
                } else {
                    context.startService(poolingIntent)
                }
                Log.d(TAG, "RidePoolingService restarted")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to restart RidePoolingService", e)
            }
            
            // Restart FloatingWidgetService
            val widgetIntent = Intent(context, FloatingWidgetService::class.java)
            try {
                context.startService(widgetIntent)
                Log.d(TAG, "FloatingWidgetService restarted")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to restart FloatingWidgetService", e)
            }
        } else {
            Log.d(TAG, "Driver not online, skipping restart")
        }
    }
}
