import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import RideCard from "./RideCard";
import { formatDate, formatTimeByDate } from "../../utils/utils";
import { useNavigation } from "@react-navigation/native";

export default function TaxiSafarTripCard({ trip }) {
  const [loading, setLoading] = useState(true);
  const [tripData, setTripData] = useState(null);
  const navigation = useNavigation()
  useEffect(() => {
    try {
      if (!trip) {
        console.error("❌ Error: Trip data is missing.");
        setLoading(false);
        return;
      }

      // Mocking a small delay for skeleton effect
      setTimeout(() => {
        setTripData(trip);
        setLoading(false);
      }, 400);
    } catch (error) {
      console.error("❌ Failed to load trip card:", error);
      setLoading(false);
    }
  }, [trip]);

  // -----------------------------
  // Trip Type Label
  // -----------------------------
  const getTripTypeLabel = () => {
    if (tripData?.trip_type === "oneWay") return "One Way";
    if (tripData?.trip_type === "roundTrip") return "Round Trip";
    return tripData?.trip_type || "Trip";
  };



  // -----------------------------
  // Loading Skeleton Component
  // -----------------------------
  const SkeletonLoader = () => (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader} />
      <View style={styles.skeletonLine} />
      <View style={styles.skeletonLineShort} />
      <View style={styles.skeletonBox} />
    </View>
  );

  // -----------------------------
  // Render Main Card
  // -----------------------------
  if (loading) return <SkeletonLoader />;

  if (!tripData) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>⚠️ Unable to load trip details.</Text>
      </View>
    );
  }

  return (
    <RideCard
      name={tripData?.name || "Unknown"}
      price={tripData?.original_amount || "—"}
      startDate={formatDate(tripData?.scheduled_time) || "—"}
      startTime={formatTimeByDate(tripData?.scheduled_time) || "—"}
      pickup={tripData?.pickup_address || "No pickup address"}
      drop={tripData?.destination_address || "No drop address"}
      distance={tripData?.distance || 0}
      onPress={()=> navigation.navigate('TaxiSafarView',{rideId:tripData?._id})}
      endDate={
        tripData?.trip_type === "roundTrip"
          ? formatDate(tripData?.scheduled_time)
          : ""
      }
      endTime={
        tripData?.trip_type === "roundTrip"
          ? formatTimeByDate(tripData?.scheduled_time)
          : ""
      }
      original_tryipType={tripData?.trip_type}
      tripType={`${getTripTypeLabel()}`}
    />
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------
const styles = StyleSheet.create({
  errorBox: {
    padding: 16,
    marginVertical: 10,
    backgroundColor: "#fee",
    borderRadius: 12,
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 14,
    fontWeight: "600",
  },

  // Skeleton Loader Styles
  skeletonCard: {
    backgroundColor: "#f2f2f2",
    padding: 18,
    borderRadius: 16,
    marginVertical: 12,
    marginHorizontal: 16,
  },
  skeletonHeader: {
    height: 40,
    backgroundColor: "#e0e0e0",
    borderRadius: 10,
    marginBottom: 14,
  },
  skeletonLine: {
    height: 15,
    backgroundColor: "#e0e0e0",
    borderRadius: 10,
    marginBottom: 10,
  },
  skeletonLineShort: {
    height: 15,
    width: "60%",
    backgroundColor: "#e0e0e0",
    borderRadius: 10,
    marginBottom: 20,
  },
  skeletonBox: {
    height: 80,
    backgroundColor: "#e0e0e0",
    borderRadius: 12,
  },
});
