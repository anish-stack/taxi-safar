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
import { API_URL_APP, API_URL_APP_CHAT } from "../../constant/api";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import messaging from '@react-native-firebase/messaging';

const KM = [5, 10, 15, 20, 25, 30];

export default function Header() {
  const navigation = useNavigation();
  const { token } = loginStore();

  const {
    is_online,
    toggle,
    driver,
    IncreaseRadiusArea,
    currentRadius,
  } = useDriverStore();

  const [status, setStatus] = useState(is_online ?? false);
  const [radius, setRadius] = useState(currentRadius ?? 5);
  const [modalVisible, setModalVisible] = useState(false);

  const [unreadChatCount, setUnreadChatCount] = useState(0);

  /* ----------------------------------------
     Sync store radius -> local state
  ---------------------------------------- */
  useEffect(() => {
    if (currentRadius != null) {
      setRadius(currentRadius);
    }
  }, [currentRadius]);

  /* ----------------------------------------
     Fetch Unread Chats
  ---------------------------------------- */
  const fetchUnreadMessages = async () => {
    try {
      const response = await axios.get(
        `${API_URL_APP_CHAT}/api/chat/driver/${driver._id}`
      );

      if (response.data?.chats?.length > 0) {
        const count = response.data.chats[0].unreadCount || 0;
        setUnreadChatCount(count);
      }
    } catch (error) {
      console.log("error fetching unread messages", error);
    }
  };

  useEffect(() => {
    if (driver?._id) fetchUnreadMessages();
  }, [driver]);

  useEffect(() => {
  // Foreground notification listener
  const unsubscribe = messaging().onMessage(async remoteMessage => {
    fetchUnreadMessages(); // Refresh unread count
  });

  return unsubscribe;
}, []);


useEffect(()=>{
  if(driver?.is_online){
    setStatus(driver?.is_online)
  }
},[driver,handleToggle])

  /* ----------------------------------------
     Online / Offline Toggle
  ---------------------------------------- */
  const handleToggle = async () => {
    const newStatus = !status;
    setStatus(newStatus);
    toggle(newStatus);

    // if (newStatus) {
    //   try {
    //     const apiUrl = `${API_URL_APP}/api/v1/update-driver-location`;
    //     const tokens =
    //       (await SecureStore.getItemAsync("auth_token")) || token;

    //     await LocationService.startTracking(apiUrl, tokens);
    //   } catch (e) {
    //     console.error("Location start error:", e);
    //   }
    // } else {
    //   await LocationService.stopTracking().catch(() => {});
    // }
  };

  /* ----------------------------------------
     Radius Selection
  ---------------------------------------- */
  const selectRadius = (km) => {
    setRadius(km);
    IncreaseRadiusArea(km, Alert);
    setModalVisible(false);
  };

  /* ----------------------------------------
     Battery Optimization Check
  ---------------------------------------- */
  useEffect(() => {
    const init = async () => {
      try {
        const disabled =
          await LocationService.isBatteryOptimizationDisabled();
        if (!disabled) {
          await LocationService.requestBatteryOptimization();
        }
      } catch (e) {
        console.error("Battery optimization check failed:", e);
      }
    };
    init();
  }, []);

  /* Stop tracking on unmount */
  useEffect(() => {
    return () => LocationService.stopTracking().catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </View>

      {/* Online / Offline */}
      <TouchableOpacity
        style={[
          styles.statusButton,
          { backgroundColor: status ? "#4CAF50" : "#F44336" },
        ]}
        onPress={handleToggle}
        activeOpacity={0.8}
      >
        <Text style={styles.statusText}>
          {status ? "ONLINE" : "OFFLINE"}
        </Text>
        <View style={styles.statusDot} />
      </TouchableOpacity>

      {/* Right Side */}
      <View style={styles.rightContainer}>
        {/* Radius Selector */}
        <TouchableOpacity
          style={styles.radiusButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.radiusText}>{radius} km</Text>
          <Icon name="chevron-down" size={16} color="#000" />
        </TouchableOpacity>

        {/* Notification Button */}
        <TouchableOpacity style={styles.notificationButton}>
          <Icon name="notifications-outline" size={24} color="#000" />
        </TouchableOpacity>

        {/* Chat Button + Badge */}
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

      {/* Radius Modal */}
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
              keyExtractor={(i) => i.toString()}
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

/* ------------------ Styles ------------------ */
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
