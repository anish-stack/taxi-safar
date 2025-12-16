package com.taxisafr.driver

import android.annotation.SuppressLint
import android.content.Context
import android.location.*
import android.os.Bundle
import android.os.Looper
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class LocationModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    private var locationManager: LocationManager = reactContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    private var isWatching = false
    private var locationListener: LocationListener? = null

    init {
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String {
        return "LocationModule"
    }

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun getCurrentLocation(successCallback: Callback, errorCallback: Callback) {
        if (!locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            errorCallback.invoke("GPS provider not enabled")
            return
        }

        locationManager.requestSingleUpdate(LocationManager.GPS_PROVIDER, object : LocationListener {
            override fun onLocationChanged(location: Location) {
                successCallback.invoke(location.latitude, location.longitude)
            }

            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }, Looper.getMainLooper())
    }

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun startWatchingLocation() {
        if (isWatching) return

        locationListener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                sendEvent("locationUpdated", Arguments.createMap().apply {
                    putDouble("latitude", location.latitude)
                    putDouble("longitude", location.longitude)
                })
            }

            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }

        locationManager.requestLocationUpdates(
            LocationManager.GPS_PROVIDER,
            60000L, // every 5 seconds
            10f,   // 10 meters
            locationListener as LocationListener
        )
        isWatching = true
    }

    @ReactMethod
    fun stopWatchingLocation() {
        if (!isWatching || locationListener == null) return
        locationManager.removeUpdates(locationListener!!)
        locationListener = null
        isWatching = false
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    override fun onHostResume() {}

    override fun onHostPause() {}

    override fun onHostDestroy() {
        stopWatchingLocation()
    }
}