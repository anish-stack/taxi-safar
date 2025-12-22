import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import DriverPost from "./DriverPost";
import {
  calculateDistance,
  formatDate,
  formatTime,
  formatTime12Hour,
} from "../../utils/utils";
import { useEffect, useState } from "react";

export default function DriverPostCard({ trip }) {
  const [distance, setDistance] = useState(0);
  const isRoundTrip = trip.tripType === "round-trip";

  useEffect(() => {
    const [pickupLng, pickupLat] = trip?.pickupLocation?.coordinates;
    const [dropLng, dropLat] = trip?.dropLocation?.coordinates;

    if (!pickupLng || !pickupLat || !dropLng || !dropLat) {
      setDistance(0);
    } else {
      const dist = calculateDistance(pickupLat, pickupLng, dropLat, dropLng);
      setDistance(dist);
    }
  }, [trip]);
  return (
    <DriverPost
      _id={trip?._id}
      vehicleName={trip?.vehicleType || ""}
      assignedStatus={trip?.rideStatus || ""}
      totalAmount={`₹${trip?.totalAmount || ""}`}
      vehicleType={trip?.vehicleType || ""}
      isRoundTrip={isRoundTrip}
      requirement={trip?.extraRequirements}
      commission={`₹${trip?.commissionAmount || ""}`}
      driverEarning={`₹${trip?.driverEarning || ""}`}
      pickup={trip?.pickupAddress || ""}
      drop={trip?.dropAddress || ""}
      tripType={`${
        trip.tripType === "one-way" ? "One Way Trip" : "Round Trip"
      } - ${distance || "60"}Km`}
      date={formatDate(trip?.pickupDate) || ""}
      time={formatTime12Hour(trip?.pickupTime) || ""}
      onChatPress={() => console.log("Chat clicked")}
    />
  );
}
