import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  ChevronLeft,
  Trash2,
  Bell,
  X,
  CheckCircle2,
  AlertCircle,
  InfoIcon,
  MessageSquare,
  MapPin,
} from "lucide-react-native";
import axios from "axios";
import loginStore from "../store/auth.store";
import { API_URL_APP } from "../constant/api";

export default function Notifications() {
  const { token } = loginStore();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Fetch Notifications
  const fetchNotifications = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const response = await axios.get(`${API_URL_APP}/api/v1/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.success) {
        // Sample notifications if API doesn't return data
        const notificationsData =
          response.data.data || generateSampleNotifications();
        setNotifications(notificationsData);
      }
    } catch (error) {
      console.log("❌ Fetch Notifications Error:", error.response?.data);
      // Show sample notifications on error
      setNotifications(generateSampleNotifications());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Generate Sample Notifications
  const generateSampleNotifications = () => {
    const now = new Date();
    return [
      {
        _id: "1",
        title: "Ride Assigned",
        message: "You have been assigned a new ride from Delhi to Bangalore",
        type: "ride",
        status: "unread",
        timestamp: new Date(now.getTime() - 5 * 60000),
        icon: "MapPin",
      },
      {
        _id: "2",
        title: "Payment Received",
        message: "₹2,500 has been credited to your wallet for completed ride",
        type: "payment",
        status: "read",
        timestamp: new Date(now.getTime() - 30 * 60000),
        icon: "CheckCircle2",
      },
      {
        _id: "3",
        title: "New Message",
        message: "You have a new message from a customer",
        type: "message",
        status: "unread",
        timestamp: new Date(now.getTime() - 2 * 3600000),
        icon: "MessageSquare",
      },
      {
        _id: "4",
        title: "Ride Completed",
        message: "Your ride to Mumbai has been completed successfully",
        type: "ride",
        status: "read",
        timestamp: new Date(now.getTime() - 5 * 3600000),
        icon: "CheckCircle2",
      },
      {
        _id: "5",
        title: "Alert: Low Balance",
        message: "Your account balance is low. Please add funds",
        type: "alert",
        status: "unread",
        timestamp: new Date(now.getTime() - 1 * 86400000),
        icon: "AlertCircle",
      },
      {
        _id: "6",
        title: "System Update",
        message: "App has been updated with new features",
        type: "system",
        status: "read",
        timestamp: new Date(now.getTime() - 2 * 86400000),
        icon: "InfoIcon",
      },
    ];
  };

  // Mark as Read
  const markAsRead = async (notificationId) => {
    try {
      await axios.put(
        `${API_URL_APP}/api/v1/notifications/${notificationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, status: "read" } : notif
        )
      );
    } catch (error) {
      console.log("❌ Mark as Read Error:", error);
    }
  };

  // Delete Notification
  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(
        `${API_URL_APP}/api/v1/notifications/${notificationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setNotifications((prev) =>
        prev.filter((notif) => notif._id !== notificationId)
      );
    } catch (error) {
      console.log("❌ Delete Notification Error:", error);
      Alert.alert("Error", "Failed to delete notification");
    }
  };

  // Clear All Notifications
  const clearAllNotifications = () => {
    Alert.alert(
      "Clear All",
      "Are you sure you want to clear all notifications?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(
                `${API_URL_APP}/api/v1/notifications/clear-all`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              setNotifications([]);
            } catch (error) {
              console.log("❌ Clear All Error:", error);
              setNotifications([]);
            }
          },
        },
      ]
    );
  };

  // Get Icon Component
  const getIconComponent = (iconName) => {
    const iconProps = { size: 24, color: "#FFF" };
    switch (iconName) {
      case "MapPin":
        return <MapPin {...iconProps} />;
      case "CheckCircle2":
        return <CheckCircle2 {...iconProps} />;
      case "MessageSquare":
        return <MessageSquare {...iconProps} />;
      case "AlertCircle":
        return <AlertCircle {...iconProps} />;
      case "InfoIcon":
        return <InfoIcon {...iconProps} />;
      default:
        return <Bell {...iconProps} />;
    }
  };

  // Get Background Color by Type
  const getBackgroundColor = (type) => {
    switch (type) {
      case "ride":
        return "#3B82F6";
      case "payment":
        return "#10B981";
      case "message":
        return "#8B5CF6";
      case "alert":
        return "#F59E0B";
      case "system":
        return "#6B7280";
      default:
        return "#6366F1";
    }
  };

  // Format Time
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(false);
  }, []);

  // Render Notification Item
  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        item.status === "unread" && styles.unreadCard,
      ]}
      onPress={() => {
        setSelectedNotification(item);
        setDetailModalVisible(true);
        if (item.status === "unread") {
          markAsRead(item._id);
        }
      }}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: getBackgroundColor(item.type) },
        ]}
      >
        {getIconComponent(item.icon)}
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.titleRow}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.status === "unread" && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notificationTime}>
          {formatTime(item.timestamp)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => deleteNotification(item._id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Trash2 size={18} color="#FF3B30" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
       
      </View>

      {/* Unread Count */}
      {notifications.filter((n) => n.status === "unread").length > 0 && (
        <View style={styles.unreadBanner}>
          <Bell size={16} color="#FFF" />
          <Text style={styles.unreadBannerText}>
            {notifications.filter((n) => n.status === "unread").length} unread
            notification
            {notifications.filter((n) => n.status === "unread").length > 1
              ? "s"
              : ""}
          </Text>
        </View>
      )}

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#6366F1"]}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Bell size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>No Notifications</Text>
          <Text style={styles.emptySubtext}>
            You're all caught up! New notifications will appear here
          </Text>
        </View>
      )}

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setDetailModalVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Notification Details</Text>
            <TouchableOpacity
              onPress={() => {
                deleteNotification(selectedNotification._id);
                setDetailModalVisible(false);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>

          {selectedNotification && (
            <View style={styles.modalContent}>
              <View
                style={[
                  styles.modalIconContainer,
                  {
                    backgroundColor: getBackgroundColor(
                      selectedNotification.type
                    ),
                  },
                ]}
              >
                {getIconComponent(selectedNotification.icon)}
              </View>

              <Text style={styles.modalNotificationTitle}>
                {selectedNotification.title}
              </Text>
              <Text style={styles.modalNotificationMessage}>
                {selectedNotification.message}
              </Text>

              <View style={styles.modalMetaInfo}>
                <Text style={styles.metaLabel}>Received</Text>
                <Text style={styles.metaValue}>
                  {new Date(selectedNotification.createdAt).toLocaleString(
                    "en-IN",
                    {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </Text>
              </View>

              <View style={styles.modalMetaInfo}>
                <Text style={styles.metaLabel}>Status</Text>
                <Text style={styles.metaValue}>
                  {selectedNotification.status === "read" ? "Read" : "Unread"}
                </Text>
              </View>

              <View style={styles.modalMetaInfo}>
                <Text style={styles.metaLabel}>Type</Text>
                <Text style={styles.metaValue}>
                  {selectedNotification.type.charAt(0).toUpperCase() +
                    selectedNotification.type.slice(1)}
                </Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFE5E5",
    gap: 6,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF3B30",
  },

  // Unread Banner
  unreadBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#6366F1",
    borderRadius: 8,
    gap: 8,
  },
  unreadBannerText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },

  // List
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: 20,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 8,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: "#F0F4FF",
    borderColor: "#6366F1",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6366F1",
    flexShrink: 0,
  },
  notificationMessage: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    lineHeight: 16,
  },
  notificationTime: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  modalContent: {
    padding: 20,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  modalNotificationTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 12,
  },
  modalNotificationMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  modalMetaInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#6366F1",
  },
  metaLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    color: "#000",
    fontWeight: "600",
  },
});
