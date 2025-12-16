import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import DriverPost from "./DriverPost";
import { formatDate, formatTime } from "../../utils/utils";

export default function DriverPostCard({ trip }) {
  const isRoundTrip = trip.tripType === "round-trip";

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
      } - ${"60"}Km`}
      date={formatDate(trip?.pickupDate) || ""}
      time={formatTime(trip?.pickupTime) || ""}
      onChatPress={() => console.log("Chat clicked")}
    />
  );
}
