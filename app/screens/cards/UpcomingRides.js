import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function RideCard({ data }) {
  return (
    <View style={styles.card}>
      {/* Top Section */}
      <View style={styles.topRow}>
        <View style={styles.profileSection}>
          <Image
            source={data?.profileImage || "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Black_colour.jpg/960px-Black_colour.jpg"}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.name}>{data?.name}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#fbbf24" />
              <Text style={styles.ratingText}>
                {data?.rating}{" "}
                <Text style={styles.reviewCount}>({data?.reviews})</Text>
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.fareSection}>
          <Text style={styles.fare}>₹{data?.fare}</Text>
          <Text style={styles.distance}>
            {data?.distance} km ({data?.time})
          </Text>
        </View>
      </View>

      {/* Date & Time */}
      <View style={styles.timeRow}>
        <View>
          <Text style={styles.dateText}>{data?.startDate}</Text>
          <Text style={styles.timeText}>{data?.startTime}</Text>
        </View>

        <View style={styles.dash}>
          <Text> {`.............................`} </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.dateText}>{data?.endDate}</Text>
          <Text style={styles.timeText}>{data?.endTime}</Text>
        </View>
      </View>

      {/* Pickup & Drop */}
      <View style={styles.locationContainer}>
        <View style={styles.locationRow}>
          <Ionicons name="send-outline" size={18} color="#555" />
          <Text style={styles.locationText}>{data?.pickup}</Text>
        </View>

        <View style={styles.tripBadge}>
          <Text style={styles.tripBadgeText}>
            {data?.tripType} • {data?.tripDistance} km • {data?.stops}
          </Text>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={18} color="#555" />
          <Text style={styles.locationText}>{data?.drop}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.01,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 13,
    color: "#444",
    marginLeft: 4,
  },
  reviewCount: {
    color: "#888",
  },
  fareSection: {
    alignItems: "flex-end",
  },
  fare: {
    color: "#d32f2f",
    fontSize: 18,
    fontWeight: "700",
  },
  distance: {
    color: "#666",
    fontSize: 12,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
  },
  dateText: {
    color: "#444",
    fontSize: 13,
  },
  timeText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 15,
  },
  dash: {
    flex: 1,
    alignItems: "center",
  },
  locationContainer: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 10,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
  },
  locationText: {
    fontSize: 13,
    color: "#333",
    marginLeft: 6,
    flex: 1,
    flexWrap: "wrap",
  },
  tripBadge: {
    backgroundColor: "#000",
    alignSelf: "center",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginVertical: 5,
  },
  tripBadgeText: {
    color: "#fff",
    fontSize: 12,
  },
});
