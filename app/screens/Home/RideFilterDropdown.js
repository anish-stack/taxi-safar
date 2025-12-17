import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { API_URL_APP_CHAT } from "../../constant/api";
import axios from "axios";
import useDriverStore from "../../store/driver.store";
import messaging from "@react-native-firebase/messaging";
import { useNavigation } from "@react-navigation/native";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";

const OPTIONS = ["All Rides", "B2B Bookings", "B2C Bookings"];

export default function RideFilterDropdown({
  selectedOption = "All Rides",
  onSelect,
}) {
  const navigation = useNavigation();

  const { driver, fetchDriverDetails } = useDriverStore();

  const [isOpen, setIsOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const handleSelect = (option) => {
    onSelect(option);
    setIsOpen(false);
  };

  useEffect(() => {
    fetchDriverDetails();
  }, []);
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
    const unsubscribe = messaging().onMessage(() => fetchUnreadMessages());
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (driver?._id) fetchUnreadMessages();
  }, []);

  return (
    <View style={styles.container}>
      {/* LEFT : Dropdown Pill */}
      <View style={styles.wrapper}>
        <TouchableOpacity
          style={[styles.pill,{width:selectedOption === "All Rides" ?  110:verticalScale(120)
}]}
          activeOpacity={0.85}

          onPress={() => setIsOpen(!isOpen)}
        >
          <Text style={styles.pillText} numberOfLines={1}>
            {selectedOption}
          </Text>
          <Icon
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={verticalScale(12)}
            style={{ marginRight: moderateScale(12) }}
            color="#000"
          />
        </TouchableOpacity>

        {/* Dropdown */}
        {isOpen && (
          <View style={styles.dropdown}>
            <FlatList
              data={OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = item === selectedOption;
                return (
                  <TouchableOpacity
                    style={[styles.item, isSelected && styles.itemActive]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text
                      style={[
                        styles.itemText,
                        isSelected && styles.itemTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && (
                      <Icon name="checkmark" size={18} color="#DC2626" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}
      </View>

      {/* RIGHT : Icons */}
      <View style={styles.iconGroup}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate("Reserve",{filter:true})}
        >
          <Icon name="search-outline" size={20} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate("chat")}
        >
          <Icon name="chatbubble-ellipses-outline" size={20} color="#000" />
          {unreadChatCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadChatCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate("notification")}
        >
          <Icon name="notifications-outline" size={20} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
     overflow: "visible",
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },

  wrapper: {
    position: "relative",
  },

  /* Black pill dropdown */
  pill: {
    flexDirection: "row",
    overflow: "hidden",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 22,
    borderColor: "#000",
    borderWidth: 2,
    paddingHorizontal: 12,
    height: 30,
  },

  pillText: {
    color: "#000",
    fontSize: 14,
    fontFamily: "SFProDisplay-Medium",
    marginRight: 10,
  },

  /* Dropdown */
  dropdown: {
    position: "absolute",
    top: 50,
    left: 0,
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
    overflow: "hidden",
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },

  itemActive: {
    backgroundColor: "#D3D3D3",
  },

  itemText: {
    fontSize: 14,
    color: "#111",
    fontFamily: "SFProDisplay-Medium",
  },

  itemTextActive: {
    color: "#DC2626",
    fontFamily: "SFProDisplay-Bold",
  },

  /* Right icons */
  iconGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 0,
  },

  iconBtn: {
    width: 27,
    height: 27,
    borderRadius: 19,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#FF3B30",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "bold",
  },
});
