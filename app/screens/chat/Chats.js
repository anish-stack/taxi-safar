import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Image,
  TouchableOpacity,
} from "react-native";
import Layout from "../common/layout";
import loginStore from "../../store/auth.store";
import axios from "axios";
import { API_URL_APP, API_URL_APP_CHAT } from "../../constant/api";
import { useNavigation, useRoute } from "@react-navigation/native";
import io from "socket.io-client";
import { Ionicons } from "@expo/vector-icons";
import useDriverStore from "../../store/driver.store";
import {
  formatDate,
  formatTime12Hour,
  formatTimeWithLeadingZero,
} from "../../utils/utils";

// Skeleton Loading Component
const SkeletonChatItem = () => (
  <View style={styles.chatBox}>
    <View style={[styles.avatar, styles.skeletonAvatar]} />
    <View style={styles.chatInfo}>
      <View style={styles.chatHeader}>
        <View style={[styles.skeletonText, { width: 120, height: 16 }]} />
        <View style={[styles.skeletonText, { width: 80, height: 12 }]} />
      </View>
      <View
        style={[
          styles.skeletonText,
          { width: "80%", height: 14, marginBottom: 6 },
        ]}
      />
      <View style={[styles.skeletonText, { width: 60, height: 12 }]} />
    </View>
  </View>
);

const SkeletonLoader = () => (
  <View style={styles.listContent}>
    {[1, 2, 3, 4, 5, 6].map((item) => (
      <SkeletonChatItem key={item} />
    ))}
  </View>
);

const Chat = () => {
  const { token } = loginStore();
  const route = useRoute();
  const { rideId, role } = route.params || {};
  const navigation = useNavigation();
  const socketRef = useRef(null);
  const { driver, fetchDriverDetails } = useDriverStore();
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("posted");
  const [company, setCompany] = useState(null);
  const [companyDrivers, setCompanyDrivers] = useState({});
  // Initialize Socket.IO for real-time updates
  useEffect(() => {
    if (!token || !driver) return;

    socketRef.current = io(API_URL_APP_CHAT, {
      transports: ["websocket", "polling"],
    });

    socketRef.current.emit("driver_online", {
      driver_id: driver._id,
    });

    socketRef.current.on("new_chat_request", () => {
      fetchChats();
    });

    socketRef.current.on("new_message", (data) => {
      updateChatWithNewMessage(data);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, driver]);

  // Update chat list when new message arrives
  const updateChatWithNewMessage = (data) => {
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat._id === data.chatId
          ? {
            ...chat,
            lastMessage: data.message.text,
            lastMessageAt: data.message.sentAt,
            unreadCount: chat.unreadCount ? chat.unreadCount + 1 : 1,
          }
          : chat
      )
    );
  };

  // Fetch all chats
  const fetchChats = async () => {
    try {
      await fetchDriverDetails();

      if (!token) {
        setError("❌ Token missing. Please login again.");
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${API_URL_APP}/api/v1/chats-initialized`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      let chats = response.data.chats || [];

      // ✅ FILTER BY RIDE ID (only if rideId exists)
      if (rideId) {
        chats = chats.filter(
          (chat) =>
            chat?.rideData_id === rideId ||
            chat?.rideData_id?._id === rideId
        );
      }

      setChats(chats);
      setError("");
    } catch (err) {
      setError("Something went wrong fetching chats.");
    } finally {
      setLoading(false);
    }
  };

  // Pull to Refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChats().finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    fetchUnreadMessages();
    fetchChats();
  }, []);

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
      // Silently fail
    }
  };

  // Filter chats based on active tab
  const getFilteredChats = () => {
    if (!driver?._id) return [];

    if (activeTab === "posted") {
      return chats.filter((chat) => {
        return (
          chat.other_driver_id?._id === driver._id ||
          chat.other_driver_id === driver._id
        );
      });
    } else {
      return chats.filter((chat) => {
        return (
          chat.other_driver_id?._id !== driver._id &&
          chat.other_driver_id !== driver._id
        );
      });
    }
  };
  // console.log("console.log",chats[0].rideData?.pickupDate)
  const filteredChats = getFilteredChats();

  // Handle chat press
  const handleChatPress = (chat) => {
    navigation.navigate("ChatBox", {
      chat,
      role: chat.isInitializedByMe
        ? "initiator"
        : chat.isRideOwner
          ? "ride_owner"
          : "none",
    });
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 86400000) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    if (diff < 604800000) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const fetchedDriverIds = useRef(new Set());

  const fetchCompanyDriver = useCallback(async (companyDriverId) => {
    if (!companyDriverId || fetchedDriverIds.current.has(companyDriverId))
      return;

    fetchedDriverIds.current.add(companyDriverId);

    try {
      const response = await axios.get(
        `${API_URL_APP}/api/v1/company-details/${companyDriverId}`
      );
      setCompanyDrivers((prev) => ({
        ...prev,
        [companyDriverId]: response.data.data,
      }));
    } catch (error) {
      setCompanyDrivers((prev) => ({
        ...prev,
        [companyDriverId]: null,
      }));
      console.log(
        "❌ Company Driver fetch error:",
        error?.response?.data || error.message
      );
    }
  }, []);

  // Add this useEffect at component level (not in renderChatItem):
  useEffect(() => {
    filteredChats.forEach((chat) => {
      if (activeTab === "received" && chat.other_driver_id?._id) {
        fetchCompanyDriver(chat.other_driver_id._id);
      } else {
        // fetchCompanyDriver(chat.init_driver_id_id);
      }
    });
  }, [filteredChats, activeTab, fetchCompanyDriver]);

  const shortenAddress = (address) => {
    if (!address) return "";

    const parts = address.split(",").map((x) => x.trim());

    // take last 4 meaningful parts
    const shortParts = parts.slice(-4);

    return shortParts.join(", ");
  };
  // Simplify renderChatItem - remove useEffect from here:

  const renderChatItem = ({ item }) => {
    const otherDriver =
      activeTab === "received" ? item.other_driver_id : item?.init_driver_id;

    const ridePost = item.ride_post_id;

    const companyData = companyDrivers[item.other_driver_id?._id];

    const driverName =
      activeTab === "received"
        ? companyData?.company_name ||
        otherDriver?.driver_name ||
        otherDriver?.name
        : otherDriver?.driver_name;

    const avatarUri =
      activeTab === "received"
        ? companyData?.logo?.url ||
        otherDriver?.profile_photo?.url ||
        otherDriver?.avatar
        : otherDriver?.profile_photo?.url;

    const pickupFrom = shortenAddress(ridePost?.pickupAddress || "");
    const dropAt = shortenAddress(ridePost?.dropAddress || "");

    const bookingId = ridePost?.RideId ? `${ridePost.RideId}` : "";

    const pickupDate = formatDate(item.rideData?.pickupDate);
    const pickupTime = formatTimeWithLeadingZero(item.rideData?.pickupTime);

    return (
      <TouchableOpacity
        style={styles.chatBox}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: avatarUri }} style={styles.avatar} />

        <View style={styles.chatInfo}>
          {/* DRIVER NAME + BOOKING ID (SAME ROW) */}
          <View style={styles.headerRow}>
            <Text style={styles.nameText} numberOfLines={1}>
              {driverName}
            </Text>

            <Text style={styles.bookingIdText} numberOfLines={1}>
              Booking ID: {bookingId}
            </Text>
          </View>

          {/* PICKUP - DROP */}
          <Text numberOfLines={2} style={styles.routeText}>
            {pickupFrom} - {dropAt}
          </Text>

          {/* DATE & TIME */}
          <Text style={styles.dateTimeText}>
            Date: {pickupDate} Time: {pickupTime}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Loading state with skeleton
  if (!token) {
    return (
      <Layout>
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="lock-closed-outline" size={64} color="#1a1a1a" />
          </View>
          <Text style={styles.emptyTitle}>Authentication Required</Text>
          <Text style={styles.emptySubText}>
            Please login to access your chats
          </Text>
        </View>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout showHeader={false}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Chats</Text>
              <View style={styles.backButton} />
            </View>

            <View style={styles.tabContainer}>
              <View style={[styles.tab, styles.activeTab]}>
                <Text style={[styles.tabText, styles.activeTabText]}>
                  Posted
                </Text>
              </View>
              <View style={styles.tab}>
                <Text style={styles.tabText}>Received</Text>
              </View>
            </View>
          </View>

          {/* Skeleton Loading */}
          <SkeletonLoader />
        </View>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout showHeader={false}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Chats</Text>
              <View style={styles.backButton} />
            </View>
          </View>

          <View style={styles.centerContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="warning-outline" size={64} color="#FF3B30" />
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchChats}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Layout>
    );
  }

  return (
    <Layout showHeader={false}>
      <View style={styles.container}>
        {/* Header with Back Button and Tabs */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Chats</Text>
            <View style={styles.backButton} />
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "posted" && styles.activeTab]}
              onPress={() => setActiveTab("posted")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "posted" && styles.activeTabText,
                ]}
              >
                Posted
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "received" && styles.activeTab]}
              onPress={() => setActiveTab("received")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "received" && styles.activeTabText,
                ]}
              >
                Received
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat List */}
        {filteredChats.length === 0 ? (
          <View style={styles.centerContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#999" />
            </View>
            <Text style={styles.emptyTitle}>No Conversations Yet</Text>
            <Text style={styles.emptySubText}>
              {activeTab === "posted"
                ? "You haven't initiated any chats yet"
                : "No one has started a chat with you yet"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredChats}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFA800"
                colors={["#FFA800"]}
              />
            }
            renderItem={({ item }) =>
              renderChatItem({ item, fetchCompanyDriver })
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#ffffff",
    paddingTop: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "SFProDisplay-Bold",
    color: "#000",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 25,
    padding: 4,
    marginTop: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: "#000",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  activeTabText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F5F5F5",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // Chat Item
  chatBox: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f5f5f5",
    marginRight: 14,
  },
  chatInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  nameText: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },

  bookingIdText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#555",
  },

  routeText: {
    fontSize: 13,
    marginTop: 2,
  },

  dateTimeText: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2,
  },

  nameText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
    marginRight: 8,
  },
  bookingId: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },
  messageText: {
    color: "#666",
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  unreadMessage: {
    color: "#1a1a1a",
    fontWeight: "600",
  },
  timeText: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },

  // Skeleton Loading Styles
  skeletonAvatar: {
    backgroundColor: "#E0E0E0",
  },
  skeletonText: {
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
  },

  // Empty States
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  emptyTitle: {
    color: "#1a1a1a",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF3B30",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  retryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },
});

export default Chat;
