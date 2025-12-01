package com.taxisafr.driver

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class FloatingWidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "FloatingWidget"

    @ReactMethod
    fun showFloatingIcon(promise: Promise) {
        try {
            val context = reactApplicationContext
            val serviceIntent = Intent(context, FloatingWidgetService::class.java)
            
            // FIXED: Use startService() instead of startForegroundService()
            // This is NOT a foreground service, just a regular service managing an overlay
            context.startService(serviceIntent)
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SHOW_WIDGET_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun hideFloatingIcon(promise: Promise) {
        try {
            val context = reactApplicationContext
            val serviceIntent = Intent(context, FloatingWidgetService::class.java)
            context.stopService(serviceIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("HIDE_WIDGET_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val hasPermission = Settings.canDrawOverlays(reactApplicationContext)
                promise.resolve(hasPermission)
            } else {
                // Overlay permission not required for Android < 6.0
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("CHECK_PERMISSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(reactApplicationContext)) {
                    val intent = Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:${reactApplicationContext.packageName}")
                    ).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    reactApplicationContext.startActivity(intent)
                    promise.resolve(true)
                } else {
                    promise.resolve(true)
                }
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("REQUEST_PERMISSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isFloatingIconVisible(promise: Promise) {
        try {
            // Use the static method from FloatingWidgetService
            val isRunning = FloatingWidgetService.isWidgetRunning()
            promise.resolve(isRunning)
        } catch (e: Exception) {
            promise.reject("CHECK_WIDGET_ERROR", e.message, e)
        }
    }
}