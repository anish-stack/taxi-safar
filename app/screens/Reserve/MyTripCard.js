import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Car, Navigation, MapPin, User, Star } from "lucide-react-native"

export default function MyTripCard({ trip, navigation }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
  }

  const formatTime = (timeString) => {
    if (!timeString) return "N/A"
    return timeString
  }

  const getStatusColor = (status) => {
    const statusMap = {
      "driver-assigned": { color: "#4CAF50", bgColor: "#E8F5E9" },
      completed: { color: "#2196F3", bgColor: "#E3F2FD" },
      cancelled: { color: "#F44336", bgColor: "#FFEBEE" },
      pending: { color: "#FF9800", bgColor: "#FFF3E0" },
      "in-progress": { color: "#9C27B0", bgColor: "#F3E5F5" },
    }
    return statusMap[status] || { color: "#757575", bgColor: "#F5F5F5" }
  }

  const statusInfo = getStatusColor(trip.rideStatus)

  return (
    <View style={styles.card}>
      {/* Status Badge */}
      <View style={styles.badgeContainer}>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {trip.rideStatus === "driver-assigned" ? "Driver Assigned" : trip.rideStatus}
          </Text>
        </View>
      </View>

      {/* Vehicle Info */}
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleIcon}>
          <Car size={24} color="#000" />
        </View>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>
            {trip.vehicleType?.charAt(0).toUpperCase() + trip.vehicleType?.slice(1)}
          </Text>
          <Text style={styles.tripType}>{trip.tripType}</Text>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.priceSymbol}>₹</Text>
          <Text style={styles.price}>{trip.totalAmount?.toLocaleString()}</Text>
        </View>
      </View>

      {/* Driver Info */}
      {trip.driverPostId && (
        <View style={styles.driverSection}>
          <View style={styles.driverLeft}>
            <View style={styles.driverIcon}>
              <User size={16} color="#666" />
            </View>
            <View>
              <Text style={styles.driverName}>{trip.driverPostId.driver_name}</Text>
              <Text style={styles.driverContact}>{trip.driverPostId.driver_contact_number}</Text>
            </View>
          </View>
          {trip.driverPostId.average_rating > 0 && (
            <View style={styles.ratingContainer}>
              <Star size={14} color="#FFB300" fill="#FFB300" />
              <Text style={styles.ratingText}>{trip.driverPostId.average_rating}</Text>
            </View>
          )}
        </View>
      )}

      {/* Date Section */}
      <View style={styles.dateSection}>
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Pickup Date</Text>
          <Text style={styles.dateValue}>{formatDate(trip.pickupDate)}</Text>
          <Text style={styles.timeValue}>{formatTime(trip.pickupTime)}</Text>
        </View>

        <View style={styles.dateDivider}>
          <View style={styles.dottedLine} />
          <View style={styles.tripTypeBox}>
            <Text style={styles.tripTypeBoxText}>{trip.tripType === "one-way" ? "One Way" : "Round Trip"}</Text>
          </View>
        </View>
      </View>

      {/* Location Section */}
      <View style={styles.locationSection}>
        <View style={styles.locationItem}>
          <View style={[styles.locationIcon, { backgroundColor: "#ECFEF4" }]}>
            <Navigation size={16} color="#4CAF50" />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>Pickup</Text>
            <Text style={styles.locationText} numberOfLines={2}>
              {trip.pickupAddress}
            </Text>
          </View>
        </View>

        <View style={styles.dividerLine} />

        <View style={styles.locationItem}>
          <View style={[styles.locationIcon, { backgroundColor: "#FFF5F5" }]}>
            <MapPin size={16} color="#E53E3E" />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>Drop</Text>
            <Text style={styles.locationText} numberOfLines={2}>
              {trip.dropAddress}
            </Text>
          </View>
        </View>
      </View>

      {/* Payment Section */}
      <View style={styles.paymentSection}>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Total Amount</Text>
          <Text style={styles.paymentValue}>₹{trip.totalAmount || 0}</Text>
        </View>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Commission</Text>
          <Text style={styles.paymentValue}>₹{trip.commissionAmount || 0}</Text>
        </View>
        <View style={[styles.paymentRow, styles.earningRow]}>
          <Text style={styles.earningLabel}>Your Earning</Text>
          <Text style={styles.earningValue}>₹{trip.driverEarning || 0}</Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={styles.viewButton}
        onPress={() => navigation.navigate("TripDetails", { tripId: trip._id })}
      >
        <Text style={styles.viewButtonText}>View Details</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F2F5",
  },
  badgeContainer: {
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  vehicleIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A202C",
  },
  tripType: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  priceBox: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceSymbol: {
    fontSize: 12,
    color: "#E53E3E",
    fontWeight: "600",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E53E3E",
  },
  driverSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "#E0E0E0",
    borderBottomColor: "#E0E0E0",
    marginBottom: 16,
  },
  driverLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  driverIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  driverName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A202C",
  },
  driverContact: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: "#666",
  },
  dateSection: {
    marginBottom: 16,
  },
  dateItem: {
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A202C",
  },
  dateValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A202C",
    marginTop: 2,
  },
  timeValue: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  dateDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  dottedLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D1D5DB",
  },
  tripTypeBox: {
    backgroundColor: "#000",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 12,
  },
  tripTypeBoxText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  locationSection: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 2,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 10,
    color: "#999",
    fontWeight: "600",
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
    color: "#1A202C",
    lineHeight: 16,
  },
  dividerLine: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 8,
  },
  paymentSection: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 12,
    color: "#666",
  },
  paymentValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A202C",
  },
  earningRow: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  earningLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  earningValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#48BB78",
  },
  viewButton: {
    backgroundColor: "#48BB78",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
})
