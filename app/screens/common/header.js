import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import logo from "../../assets/taxisafar-logo.png";
import useDriverStore from "../../store/driver.store";
import loginStore from "../../store/auth.store";
import LocationService from "../../services/LocationsService";
import { API_URL_APP_CHAT } from "../../constant/api";
import { useNavigation } from "@react-navigation/native";

import { FloatingWidgetService } from "../../services/NativeModules";

const KM = [5, 10, 15, 20, 25, 30];
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Responsive breakpoints
const isSmallScreen = SCREEN_WIDTH < 360;
const isMediumScreen = SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 400;
const isLargeScreen = SCREEN_WIDTH >= 400;

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

  // Refs to track service calls
  const isTogglingRef = useRef(false);

  // Sync UI with store
  useEffect(() => {
    setLocalStatus(!!is_online);
    if (currentRadius) setRadius(currentRadius);
  }, [is_online, currentRadius]);


  // Handle Online/Offline toggle
  const handleToggle = async () => {
    // Prevent multiple simultaneous toggles
    if (isToggling || isTogglingRef.current) {
      console.log("⏸️ Toggle already in progress, ignoring");
      return;
    }

    isTogglingRef.current = true;
    setIsToggling(true);
    
    const newStatus = !localStatus;
    const previousStatus = localStatus;


    // Optimistically update UI
    setLocalStatus(newStatus);

    try {
      if (newStatus) {
        // Going ONLINE
        console.log("🟢 Going ONLINE");
        
        // Update store first
        toggle(newStatus);
        
        // Start services with error handling
        try {
          if (startFloatingWidget) {
            console.log("🎯 Starting floating widget...");
            await startFloatingWidget();
            console.log("✅ Floating widget started");
          }
        } catch (widgetError) {
          console.error("❌ Floating widget error:", widgetError);
          // Continue even if widget fails
        }

        try {
          if (startPoolingService) {
            console.log("🚀 Starting pooling service...");
            await startPoolingService();
            console.log("✅ Pooling service started");
          }
        } catch (poolingError) {
          console.error("❌ Pooling service error:", poolingError);
          // Continue even if pooling fails
        }

      } else {
        // Going OFFLINE
        console.log("🔴 Going OFFLINE");
        
        // Stop services first with error handling
        try {
          if (stopPoolingService) {
            console.log("🛑 Stopping pooling service...");
            await stopPoolingService();
            console.log("✅ Pooling service stopped");
          }
        } catch (poolingError) {
          console.error("❌ Error stopping pooling:", poolingError);
          // Continue even if pooling stop fails
        }

        try {
          if (stopFloatingWidget) {
            console.log("🛑 Stopping floating widget...");
            await stopFloatingWidget();
            console.log("✅ Floating widget stopped");
          }
        } catch (widgetError) {
          console.error("❌ Error stopping widget:", widgetError);
          // Continue even if widget stop fails
        }

        // Update store after stopping services
        toggle(newStatus);
      }

      // Fetch updated driver details
      await fetchDriverDetails();
      
      console.log(`✅ Toggle complete: ${newStatus ? "ONLINE" : "OFFLINE"}`);

    } catch (error) {
      console.error("❌ Toggle failed:", error);

      // Revert UI and store
      setLocalStatus(previousStatus);
      toggle(previousStatus);

      Alert.alert(
        "Error",
        `Failed to go ${newStatus ? "ONLINE" : "OFFLINE"}. Please try again.`,
        [{ text: "OK" }]
      );
    } finally {
      setIsToggling(false);
      isTogglingRef.current = false;
    }
  };

  // Select search radius
  const selectRadius = async (km) => {
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
      } catch (error) {
        console.log("Battery optimization check failed:", error);
      }
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
      {/* LOGO */}
      <View style={styles.logoContainer}>
        <Image 
          source={logo} 
          style={[
            styles.logo,
            isSmallScreen && styles.logoSmall,
            isMediumScreen && styles.logoMedium,
          ]} 
          resizeMode="contain" 
        />
      </View>

      {/* ONLINE / OFFLINE BUTTON */}
<TouchableOpacity
  style={[
    styles.toggleButton,
    { backgroundColor: localStatus ? "#4CAF50" : "#E5260F" },
    isToggling && { opacity: 0.7 },
  ]}
  onPress={handleToggle}
  disabled={isToggling}
  activeOpacity={0.8}
>
  {/* ONLINE: dot left, OFFLINE: dot right */}
  {localStatus && <View style={[styles.toggleDot, { marginRight: 10 }]} />}
  
  <Text style={styles.toggleText}>
    {isToggling ? "Wait..." : localStatus ? "ONLINE" : "OFFLINE"}
  </Text>
  
  {!localStatus && <View style={[styles.toggleDot, { marginLeft: 10 }]} />}
</TouchableOpacity>


      {/* RIGHT SIDE ICONS */}
      <View style={styles.rightContainer}>
        {/* Radius Selector */}
        <TouchableOpacity
          style={[
            styles.radiusButton,
            isSmallScreen && styles.radiusButtonSmall,
          ]}
          onPress={() => setModalVisible(true)}
        >
          <Text 
            style={[
              styles.radiusText,
              isSmallScreen && styles.radiusTextSmall,
            ]}
          >
            {radius}km
          </Text>
          <Icon 
            name="chevron-down" 
            size={isSmallScreen ? 14 : 16} 
            color="#000" 
          />
        </TouchableOpacity>

      </View>

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
            <Text style={styles.modalTitle}>Select Search Radius</Text>
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
                  {item === radius && (
                    <Icon name="checkmark" size={20} color="#4CAF50" />
                  )}
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
    backgroundColor: "#F2F5F6",
    // borderRadius: 12,
    paddingVertical: isSmallScreen ? 8 : 10,
    paddingHorizontal: isSmallScreen ? 10 : 16,

  },

  // Logo styles
  logoContainer: { 
    flex: 0,
    marginRight: isSmallScreen ? 6 : 8,
  },
  logo: { 
    width: 140, 
    height: 40,
  },
  logoSmall: {
    width: 90,
    height: 30,
  },
  logoMedium: {
    width: 135,
    height: 35,
  },

  // Status button styles
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 50,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginHorizontal: 0,
    minWidth: isSmallScreen ? 75 : 85,
    justifyContent: "center",
  },
  statusButtonSmall: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    minWidth: 70,
  },
  statusButtonMedium: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  statusText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 10,
    marginRight: 4,
  },
  statusTextSmall: {
    fontSize: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    backgroundColor: "#fff",
    borderRadius: 5,
  },
  statusDotSmall: {
    width: 8,
    height: 8,
  },

  // Right container
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 0,
  },

  // Radius button
  radiusButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: isSmallScreen ? 4 : 6,
  },
  radiusButtonSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  radiusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
    marginRight: 3,
  },
  radiusTextSmall: {
    fontSize: 11,
  },

  // Icon buttons
  iconButton: {
    backgroundColor: "#f5f5f5",
    padding: 8,
    borderRadius: 50,
    marginLeft: isSmallScreen ? 4 : 6,
  },
  iconButtonSmall: {
    padding: 6,
    marginLeft: 4,
  },

  // Badge
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#FF3B30",
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    width: SCREEN_WIDTH * 0.7,
    maxWidth: 280,
    maxHeight: 400,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalItemSelected: { 
    backgroundColor: "#f0f9ff",
  },
  modalItemText: { 
    fontSize: 15, 
    color: "#333",
  },
 
  toggleButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 50,
  paddingVertical: 6,
  paddingHorizontal: 8,
  minWidth: 90,
},

toggleDot: {
  width: 14,
  height: 14,
  borderRadius: 7,
  backgroundColor: "#fff",
},

toggleText: {
  color: "#fff",
  fontWeight: "bold",
  fontSize: 12,
},

  modalItemTextSelected: { 
    fontWeight: "bold",
    color: "#4CAF50",
  },
});