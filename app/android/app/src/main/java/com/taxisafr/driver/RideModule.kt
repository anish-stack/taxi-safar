package com.taxisafr.driver

import android.content.Intent
import com.facebook.react.bridge.*

class RideModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "RideModule"

    @ReactMethod
    fun controlPoolingService(
        start: Boolean,
        driverId: String?,
        token: String?,
        baseUrl: String? = null,
        promise: Promise
    ) {
        if (driverId.isNullOrBlank() || token.isNullOrBlank()) {
            promise.reject("INVALID_PARAMS", "driverId and token are required")
            return
        }

        val intent = Intent(reactApplicationContext, RidePoolingService::class.java).apply {
            putExtra("driverId", driverId)
            putExtra("token", token)
            baseUrl?.let { putExtra("baseUrl", it) }
        }

        try {
            if (start) {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    reactApplicationContext.startForegroundService(intent)
                } else {
                    reactApplicationContext.startService(intent)
                }
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("message", "Pooling service started")
                })
            } else {
                reactApplicationContext.stopService(intent)
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("message", "Pooling service stopped")
                })
            }
        } catch (e: Exception) {
            promise.reject("SERVICE_ERROR", e.message ?: "Unknown error", e)
        }
    }

    @ReactMethod
    fun isPoolingServiceRunning(promise: Promise) {
        promise.resolve(RidePoolingService.isServiceRunning)
    }
}