package com.taxisafr.driver

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SharedPreferencesModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SharedPreferences"

    private fun getPrefs() =
        reactApplicationContext.getSharedPreferences("DriverPrefs", Context.MODE_PRIVATE)

    @ReactMethod
    fun setBoolean(key: String, value: Boolean) {
        getPrefs().edit().putBoolean(key, value).apply()
    }

    @ReactMethod
    fun setString(key: String, value: String) {
        getPrefs().edit().putString(key, value).apply()
    }

    // MARK THESE AS SYNCHRONOUS
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getBoolean(key: String, defaultValue: Boolean): Boolean {
        return getPrefs().getBoolean(key, defaultValue)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getString(key: String, defaultValue: String): String? {
        return getPrefs().getString(key, defaultValue)
    }

    @ReactMethod
    fun remove(key: String) {
        getPrefs().edit().remove(key).apply()
    }

    @ReactMethod
    fun clear() {
        getPrefs().edit().clear().apply()
    }
}
