import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import logo from "../../assets/taxisafar-logo.png";
import useDriverStore from "../../store/driver.store";
import loginStore from "../../store/auth.store";
import LocationService from "../../services/LocationsService";
import { API_URL_APP_CHAT } from "../../constant/api";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import messaging from "@react-native-firebase/messaging";

const KM = [5, 10, 15, 20, 25, 30];

export default function Header({
  startPoolingService,
  stopPoolingService,
  startFloatingWidget,
  stopFloatingWidget,
}) {
  const navigation = useNavigation();
  const { token } = loginStore();

  const {
    is_online,
    toggle,
    driver,
    IncreaseRadiusArea,
    currentRadius,
    fetchDriverDetails,
  } = useDriverStore();

  const [isToggling, setIsToggling] = useState(false);
  const [localStatus, setLocalStatus] = useState(false);
  const [radius, setRadius] = useState(5);
  const [modalVisible, setModalVisible] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Sync UI with store
  useEffect(() => {
    setLocalStatus(!!is_online);
    if (currentRadius) setRadius(currentRadius);
  }, [is_online, currentRadius]);

  // Fetch unread chat count
  const fetchUnreadMessages = async () => {
    if (!driver?._id) return;

    try {
      const res = await axios.get(
        `${API_URL_APP_CHAT}/api/chat/driver/${driver._id}`
      );

      const count = res?.data?.chats?.[0]?.unreadCount || 0;
      setUnreadChatCount(count);
    } catch (e) {
      console.log("Unread chat fetch error:", e);
    }
  };

  useEffect(() => {
    if (driver?._id) fetchUnreadMessages();
  }, [driver]);

  // Listen for FCM chat updates
  useEffect(() => {
    const unsubscribe = messaging().onMessage(() => fetchUnreadMessages());
    return unsubscribe;
  }, []);

  // Handle Online/Offline toggle
  const handleToggle = async () => {
    if (isToggling) return;

    setIsToggling(true);
    const newStatus = !localStatus;

    setLocalStatus(newStatus);
    toggle(newStatus);

    try {
      if (newStatus) {
        console.log("Going ONLINE");
        await startFloatingWidget?.();
        await startPoolingService?.();
      } else {
        console.log("Going OFFLINE");
        await stopPoolingService?.();
        await stopFloatingWidget?.();
      }

      await fetchDriverDetails();
    } catch (error) {
      console.error("Toggle failed:", error);

      // revert
      setLocalStatus(!newStatus);
      toggle(!newStatus);

      Alert.alert("Error", "Status change failed. Please try again.");
    } finally {
      setIsToggling(false);
    }
  };

  // Select search radius
  const selectRadius = async km => {
    setRadius(km);
    await IncreaseRadiusArea(km, Alert);
    setModalVisible(false);
    fetchDriverDetails();
  };

  // Battery optimization request
  useEffect(() => {
    const init = async () => {
      try {
        const disabled = await LocationService.isBatteryOptimizationDisabled();
        if (!disabled) await LocationService.requestBatteryOptimization();
      } catch {}
    };

    init();
  }, []);

  // Cleanup on unmount
  useEffect(
    () => () => {
      LocationService.stopTracking().catch(() => {});
    },
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </View>

      {/* ONLINE / OFFLINE BUTTON */}
      <TouchableOpacity
        style={[
          styles.statusButton,
          { backgroundColor: localStatus ? "#4CAF50" : "#F44336" },
          isToggling && { opacity: 0.7 },
        ]}
        onPress={handleToggle}
        disabled={isToggling}
        activeOpacity={0.8}
      >
        <Text style={styles.statusText}>
          {isToggling ? "Please wait..." : localStatus ? "ONLINE" : "OFFLINE"}
        </Text>

        <View style={styles.statusDot} />
      </TouchableOpacity>

      {/* RIGHT SIDE ICONS */}
      <View style={styles.rightContainer}>
        {/* Radius Selector */}
        <TouchableOpacity
          style={styles.radiusButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.radiusText}>{radius} km</Text>
          <Icon name="chevron-down" size={16} color="#000" />
        </TouchableOpacity>

        {/* Notifications */}
        <TouchableOpacity style={styles.notificationButton}>
          <Icon name="notifications-outline" size={24} color="#000" />
        </TouchableOpacity>

        {/* Chat */}
        <TouchableOpacity
          onPress={() => navigation.navigate("chat")}
          style={styles.notificationButton}
        >
          <Icon name="chatbubble-outline" size={24} color="#000" />

          {unreadChatCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadChatCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* RADIUS SELECTION POPUP */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <FlatList
              data={KM}
              keyExtractor={i => i.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    item === radius && styles.modalItemSelected,
                  ]}
                  onPress={() => selectRadius(item)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      item === radius && styles.modalItemTextSelected,
                    ]}
                  >
                    {item} km
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  logoContainer: { flex: 1 },
  logo: { width: 100, height: 40 },

  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 50,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statusText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    backgroundColor: "#fff",
    borderRadius: 5,
    marginLeft: 6,
  },

  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  radiusButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
  },
  radiusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
    marginRight: 4,
  },

  notificationButton: {
    backgroundColor: "#f5f5f5",
    padding: 8,
    borderRadius: 50,
    marginLeft: 6,
  },

  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "red",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    width: 160,
    maxHeight: 300,
  },
  modalItem: {
    paddingVertical: 10,
    alignItems: "center",
  },
  modalItemSelected: { backgroundColor: "#e0e0e0" },
  modalItemText: { fontSize: 14, color: "#000" },
  modalItemTextSelected: { fontWeight: "bold" },
});