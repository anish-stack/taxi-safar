package com.taxisafr.driver

import android.animation.ValueAnimator
import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.view.*
import android.widget.ImageView
import com.taxisafr.driver.R

class FloatingWidgetService : Service() {

    companion object {
        private const val TAG = "TaxiSafarWidget"
        @Volatile
        private var isRunning = false
        fun isWidgetRunning() = isRunning
    }

    private var windowManager: WindowManager? = null
    private var floatingIcon: View? = null
    private var params: WindowManager.LayoutParams? = null

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        Log.d(TAG, "Floating widget service created")
        createFloatingIcon()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand - flags: $flags, startId: $startId")
        // START_STICKY ensures service restarts if killed
        return START_STICKY
    }

    private fun createFloatingIcon() {
        try {
            floatingIcon = LayoutInflater.from(this).inflate(R.layout.floating_widget_icon, null)

            val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE

            params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.END
                x = 30
                y = 200
            }

            windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
            windowManager?.addView(floatingIcon, params)

            floatingIcon?.findViewById<ImageView>(R.id.floating_icon)?.setOnTouchListener(DragTouchListener())
            
            Log.d(TAG, "Floating icon created successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error creating floating icon", e)
        }
    }

    private inner class DragTouchListener : View.OnTouchListener {
        private var initialX = 0
        private var initialY = 0
        private var initialTouchX = 0f
        private var initialTouchY = 0f
        private var isDragging = false

        override fun onTouch(v: View, event: MotionEvent): Boolean {
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    params?.let {
                        initialX = it.x
                        initialY = it.y
                    }
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isDragging = false
                    return true
                }

                MotionEvent.ACTION_MOVE -> {
                    val deltaX = event.rawX - initialTouchX
                    val deltaY = event.rawY - initialTouchY

                    if (!isDragging && kotlin.math.hypot(deltaX.toDouble(), deltaY.toDouble()) > 20) {
                        isDragging = true
                    }

                    if (isDragging) {
                        params?.let {
                            it.x = (initialX - deltaX).toInt()
                            it.y = (initialY + deltaY).toInt()
                            windowManager?.updateViewLayout(floatingIcon, it)
                        }
                    }
                    return true
                }

                MotionEvent.ACTION_UP -> {
                    if (!isDragging) {
                        openTaxiSafarApp()
                    } else {
                        snapToEdge()
                    }
                    return true
                }
            }
            return false
        }
    }

    private fun snapToEdge() {
        val displayMetrics = resources.displayMetrics
        val screenWidth = displayMetrics.widthPixels
        val currentX = params?.x ?: 0
        val targetX = if (currentX > screenWidth / 2) 30 else screenWidth - 180

        ValueAnimator.ofInt(currentX, targetX).apply {
            duration = 300
            addUpdateListener {
                params?.let {
                    it.x = animatedValue as Int
                    windowManager?.updateViewLayout(floatingIcon, it)
                }
            }
            start()
        }
    }

    private fun openTaxiSafarApp() {
        try {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            launchIntent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            startActivity(launchIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening app", e)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        Log.d(TAG, "Service destroyed")
        
        // Remove the floating view
        floatingIcon?.let {
            try {
                windowManager?.removeView(it)
                Log.d(TAG, "Floating icon removed")
            } catch (e: Exception) {
                Log.e(TAG, "Error removing icon", e)
            }
        }
        
        floatingIcon = null
        windowManager = null
        
        // Send broadcast to restart service if driver is still online
        val prefs = getSharedPreferences("DriverPrefs", MODE_PRIVATE)
        if (prefs.getBoolean("driver_online", false)) {
            Log.d(TAG, "Sending restart broadcast")
            val restartIntent = Intent(this, ServiceRestartReceiver::class.java)
            restartIntent.action = ServiceRestartReceiver.ACTION_RESTART_SERVICES
            sendBroadcast(restartIntent)
        }
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.d(TAG, "Task removed - checking if should restart")
        
        // Restart service when app is removed from recent tasks
        val prefs = getSharedPreferences("DriverPrefs", MODE_PRIVATE)
        if (prefs.getBoolean("driver_online", false)) {
            Log.d(TAG, "Restarting service after task removal")
            val restartIntent = Intent(applicationContext, FloatingWidgetService::class.java)
            applicationContext.startService(restartIntent)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
}