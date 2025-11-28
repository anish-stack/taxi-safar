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

const Chat = () => {
  const { token, driver } = loginStore();
  const navigation = useNavigation();
  const socketRef = useRef(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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

    // Determine role badge
    const getRoleBadge = () => {
      if (item.isInitializedByMe) {
        return { text: "You Initiated", icon: "send" };
      } else if (item.isRideOwner) {
        return { text: "Ride Owner", icon: "car-sport" };
      } else {
        return { text: "Participant", icon: "person" };
      }
    };

    const roleBadge = getRoleBadge();

    return (
      <TouchableOpacity
        style={styles.chatBox}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          {item.unreadCount > 0 && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.nameText} numberOfLines={1}>
              {driverName}
            </Text>
            <Text style={styles.timeText}>{formatTime(item.lastMessageAt)}</Text>
          </View>

          <View style={styles.messageRow}>
            <Text
              style={[
                styles.messageText,
                item.unreadCount > 0 && styles.unreadMessage,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage || "No messages yet"}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>

          <View style={styles.chatFooter}>
            <View style={styles.badge}>
              <Ionicons name={roleBadge.icon} size={12} color="#FF3B30" />
              <Text style={styles.badgeText}>{roleBadge.text}</Text>
            </View>

            {ridePost && (
              <View style={styles.rideRoute}>
                <Text style={styles.routeText} numberOfLines={1}>
                  {ridePost.pickupAddress?.substring(0, 15)}... →{" "}
                  {ridePost.dropAddress?.substring(0, 15)}...
                </Text>
              </View>
            )}
          </View>
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

  if (chats.length === 0) {
    return (
      <Layout>
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#1a1a1a" />
          </View>
          <Text style={styles.emptyTitle}>No Conversations Yet</Text>
          <Text style={styles.emptySubText}>
            Start chatting with other drivers to coordinate rides
          </Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.headerStats}>
            <Text style={styles.chatCount}>{chats.length}</Text>
            <Text style={styles.chatCountLabel}>Active</Text>
          </View>
        </View>

        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF3B30"
              colors={["#FF3B30"]}
            />
          }
          renderItem={renderChatItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
  headerStats: {
    alignItems: "center",
  },
  chatCount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FF3B30",
  },
  chatCountLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#ffffff",
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    
  },
  avatarContainer: {
    position: "relative",
    marginRight: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f5f5f5",
    borderWidth: 2,
    borderColor: "#1a1a1a",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FF3B30",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  chatInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  nameText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.3,
  },
  timeText: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  messageText: {
    color: "#666",
    fontSize: 14,
    flex: 1,
    marginRight: 8,
    lineHeight: 20,
  },
  unreadMessage: {
    color: "#1a1a1a",
    fontWeight: "600",
  },
  chatFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff5f5",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffe5e5",
  },
  badgeText: {
    color: "#FF3B30",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  unreadBadge: {
    backgroundColor: "#FF3B30",
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 7,
  },
  unreadText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  rideRoute: {
    flex: 1,
    marginLeft: 8,
  },
  routeText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },

  // Empty States
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#f0f0f0",
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
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubText: {
    color: "#666",
    fontSize: 15,
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
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
    letterSpacing: 0.3,
  },
});

export default Chat;