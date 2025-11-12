import { Platform, Alert, BackHandler, Linking } from "react-native"
import * as Application from "expo-application"
import axios from "axios"
import { API_URL_APP } from "../constant/api"

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000 

class VersionService {
  static instance = null

  static getInstance() {
    if (!VersionService.instance) {
      VersionService.instance = new VersionService()
    }
    return VersionService.instance
  }

  constructor() {
    this.lastVersionCheck = 0
    this.versionCheckInterval = null
  }

  compareVersions(current, latest) {
    if (!current || !latest) return { needsUpdate: false, isForced: false }

    const currentParts = current.trim().split(".").map(Number)
    const latestParts = latest.trim().split(".").map(Number)

    const maxLength = Math.max(currentParts.length, latestParts.length)
    while (currentParts.length < maxLength) currentParts.push(0)
    while (latestParts.length < maxLength) latestParts.push(0)

    let needsUpdate = false
    let isForced = false

    for (let i = 0; i < maxLength; i++) {
      if (latestParts[i] > currentParts[i]) {
        needsUpdate = true
        if (i === 0) {
          isForced = true
        }
        break
      } else if (latestParts[i] < currentParts[i]) {
        break
      }
    }

    return { needsUpdate, isForced }
  }

  async checkVersion(forceCheck = false) {
    const now = Date.now()

    if (!forceCheck && now - this.lastVersionCheck < VERSION_CHECK_INTERVAL) {
      return null
    }

    try {
      const response = await axios.get(`${API_URL_APP}/api/v1/admin/get_Setting`)

      const currentVersion = Application.nativeApplicationVersion
      const latestVersion =
        Platform.OS === "android" ? response?.data?.appVersionOnAndroidDriver : response?.data?.appVersionOnIOSDriver

      if (!latestVersion) return null

      const { needsUpdate, isForced } = this.compareVersions(currentVersion, latestVersion)
      this.lastVersionCheck = now

      if (needsUpdate) {
        return {
          currentVersion,
          latestVersion,
          isForced,
          releaseNotes: response?.data?.releaseNotes || [],
        }
      }

      return null
    } catch (error) {
      console.error("❌ Version check error:", error)
      return null
    }
  }

  async handleUpdate(isForced = false) {
    try {
      const storeUrl =
        Platform.OS === "android"
          ? "https://taxisafar.com"
          : "https://taxisafar.com"

      const canOpen = await Linking.canOpenURL(storeUrl)
      if (canOpen) {
        await Linking.openURL(storeUrl)

        if (isForced) {
          setTimeout(() => {
            BackHandler.exitApp()
          }, 1000)
        }
      } else {
        Alert.alert("Error", "Unable to open app store. Please update the app manually.", [{ text: "OK" }])
      }
    } catch (error) {
      console.error("❌ Error opening store:", error)
      Alert.alert("Error", "Unable to open app store. Please update the app manually.", [{ text: "OK" }])
    }
  }

  startPeriodicCheck(callback) {
    // Initial check
    this.checkVersion(true).then(callback)

    // Periodic checks
    this.versionCheckInterval = setInterval(() => {
      this.checkVersion(false).then(callback)
    }, VERSION_CHECK_INTERVAL)
  }

  stopPeriodicCheck() {
    if (this.versionCheckInterval) {
      clearInterval(this.versionCheckInterval)
      this.versionCheckInterval = null
    }
  }
}

export default VersionService
