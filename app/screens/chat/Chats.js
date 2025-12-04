import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Image,
  TouchableOpacity,
} from "react-native";
import Layout from "../common/layout";
import loginStore from "../../store/auth.store";
import axios from "axios";
import { API_URL_APP, API_URL_APP_CHAT } from "../../constant/api";
import { useNavigation } from "@react-navigation/native";
import io from "socket.io-client";
import { Ionicons } from "@expo/vector-icons";
import useDriverStore from "../../store/driver.store";

const Chat = () => {
  const { token } = loginStore();
  const navigation = useNavigation();
  const socketRef = useRef(null);
  const { driver, fetchDriverDetails } = useDriverStore();
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("posted"); // "posted" or "received"

  // Initialize Socket.IO for real-time updates
  useEffect(() => {
    if (!token || !driver) return;

    socketRef.current = io(API_URL_APP_CHAT, {
      transports: ["websocket", "polling"],
    });

    // Authenticate driver
    socketRef.current.emit("driver_online", {
      driver_id: driver._id,
    });

    // Listen for new chat requests
    socketRef.current.on("new_chat_request", (data) => {
      console.log("New chat request:", data);
      fetchChats();
    });

    // Listen for new messages to update chat list
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

      console.log("Chats fetched:", response.data);

      setChats(response.data.chats || []);
      setError("");
    } catch (err) {
      console.error("Chat Fetch Error:", err);
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
      console.log("error fetching unread messages", error);
    }
  };

  // Filter chats based on active tab
  const getFilteredChats = () => {
    console.log("🔍 Filtering Chats...");
    console.log("Active Tab:", activeTab);
    console.log("Driver ID:", driver);
    console.log("Total Chats:", chats.length);

    if (!driver?._id) {
      console.log("❌ No driver ID found. Returning empty list.");
      return [];
    }

    if (activeTab === "posted") {
      console.log("📤 Showing POSTED chats (init by driver)");

      const postedChats = chats.filter((chat) => {
        const match =
          chat.init_driver_id?._id === driver._id ||
          chat.init_driver_id === driver._id;

        console.log(
          `Chat ID: ${chat?._id} | init_driver_id: ${
            chat?.init_driver_id?._id || chat?.init_driver_id
          } | Match Posted:`,
          match
        );

        return match;
      });

      console.log("📥 Posted Chats Count:", postedChats.length);
      return postedChats;
    } else {
      console.log("📥 Showing RECEIVED chats (others initiated)");

      const receivedChats = chats.filter((chat) => {
        const match =
          chat.init_driver_id?._id !== driver._id &&
          chat.init_driver_id !== driver._id;

        console.log(
          `Chat ID: ${chat?._id} | init_driver_id: ${
            chat?.init_driver_id?._id || chat?.init_driver_id
          } | Match Received:`,
          match
        );

        return match;
      });

      console.log("📥 Received Chats Count:", receivedChats.length);
      return receivedChats;
    }
  };

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

  // Render chat item
  const renderChatItem = ({ item }) => {
    const otherDriver = item.other_driver_id;
    const ridePost = item.ride_post_id;

    const driverName =
      otherDriver?.driver_name || otherDriver?.name || "Unknown Driver";
    const avatarUri =
      otherDriver?.profile_image ||
      otherDriver?.avatar ||
      "https://cdn-icons-png.flaticon.com/512/149/149071.png";

    const bookingId = ridePost?.booking_id || ridePost?._id || "N/A";

    const formatBookingId = (id) => {
      if (!id || id === "N/A") return "N/A";

      const str = String(id);

      if (str.length <= 7) return str; // Not enough length to trim

      return str.slice(0, 3) + "..." + str.slice(-4);
    };

    const shortBookingId = formatBookingId(bookingId);
    console.log("shortBookingId", shortBookingId);
    return (
      <TouchableOpacity
        style={styles.chatBox}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: avatarUri }} style={styles.avatar} />

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.nameText} numberOfLines={1}>
              {driverName}
            </Text>
            <Text style={styles.bookingId}>Booking Id: {shortBookingId}</Text>
          </View>

          <Text
            style={[
              styles.messageText,
              item.unreadCount > 0 && styles.unreadMessage,
            ]}
            numberOfLines={1}
          >
            {item.lastMessage || "No messages yet"}
          </Text>

          <Text style={styles.timeText}>{formatTime(item.lastMessageAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Loading state
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
      <Layout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF3B30" />
          <Text style={styles.loadingText}>Loading your chats...</Text>
        </View>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
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
      </Layout>
    );
  }

  return (
    <Layout showHeader={false}>
      <View style={styles.container}>
        {/* Header with Tabs */}
        <View style={styles.header}>
          <View
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              backgroundColor: "#fff",
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                textAlign: "center",
                    fontFamily: "SFProDisplay-Bold",

                color: "#000",
              }}
            >
              Chats
            </Text>
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
            renderItem={renderChatItem}
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 25,
    padding: 4,
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
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
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
