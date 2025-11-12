import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import useDriverStore from '../../store/driver.store';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function RideDetails({ navigation, route }) {
  const { rideData } = route.params;
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { driver, fetchDriverDetails } = useDriverStore();
  const scaleAnim = new Animated.Value(0);

  useEffect(() => {
    fetchDriverDetails();
  }, []);

  useEffect(() => {
    if (showSuccess) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [showSuccess]);

  const calculateOfferPrice = () => {
    if (!selectedOffer) return rideData.fare;
    const { type, value } = selectedOffer;
    if (type === 'discount') {
      return rideData.fare - (rideData.fare * value / 100);
    } else {
      return rideData.fare + (rideData.fare * value / 100);
    }
  };

  const handleAcceptRide = async () => {
    if (!selectedOffer) return;
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call - Replace with your actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success modal
      setIsSubmitting(false);
      setShowSuccess(true);
      
      // Navigate or perform action after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
        // navigation.navigate('ActiveRide', { rideData });
      }, 2500);
    } catch (error) {
      setIsSubmitting(false);
      console.error('Error accepting ride:', error);
    }
  };

  const offers = [
    { id: 1, label: '10%', sublabel: 'Discount', type: 'discount', value: 10 },
    { id: 2, label: '20%', sublabel: 'Discount', type: 'discount', value: 20 },
    { id: 3, label: '10%', sublabel: 'Extra', type: 'extra', value: 10 },
    { id: 4, label: '20%', sublabel: 'Extra', type: 'extra', value: 20 },
  ];

  const pickupCoords = { latitude: 28.7041, longitude: 77.1025 };
  const dropCoords = { latitude: 28.5355, longitude: 77.3910 };
  
  const midLat = (pickupCoords.latitude + dropCoords.latitude) / 2;
  const midLng = (pickupCoords.longitude + dropCoords.longitude) / 2;
  const offset = 0.05;
  
  const routeCoordinates = [
    pickupCoords,
    { latitude: midLat + offset, longitude: midLng },
    { latitude: midLat, longitude: midLng + offset },
    dropCoords,
  ];

  const vehicle = driver?.current_vehicle_id;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Compact Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="black" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Trip Details</Text>
            <Text style={styles.headerSubtitle}>
              {rideData.startDate} • {rideData.startTime}
            </Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Compact Map */}
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: (pickupCoords.latitude + dropCoords.latitude) / 2,
                longitude: (pickupCoords.longitude + dropCoords.longitude) / 2,
                latitudeDelta: 0.6,
                longitudeDelta: 0.6,
              }}
              customMapStyle={mapStyle}
            >
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#DC2626"
                strokeWidth={4}
              />
              <Marker coordinate={pickupCoords}>
                <View style={[styles.markerPin, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="location" size={16} color="white" />
                </View>
              </Marker>
              <Marker coordinate={dropCoords}>
                <View style={[styles.markerPin, { backgroundColor: '#DC2626' }]}>
                  <Ionicons name="location" size={16} color="white" />
                </View>
              </Marker>
            </MapView>
            
            <View style={styles.mapOverlay}>
              <View style={styles.distanceChip}>
                <MaterialCommunityIcons name="navigation" size={14} color="#DC2626" />
                <Text style={styles.distanceText}>{rideData.tripDistance} km</Text>
                <Text style={styles.durationText}>{rideData.time}</Text>
              </View>
            </View>
          </View>

          {/* Compact Customer Card */}
          <View style={styles.customerCard}>
            <View style={styles.customerLeft}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={28} color="#9CA3AF" />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{rideData.name}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#FBBF24" />
                  <Text style={styles.rating}>{rideData.rating}</Text>
                  <Text style={styles.reviewCount}>({rideData.reviews})</Text>
                </View>
              </View>
            </View>
            <View style={styles.fareContainer}>
              <Text style={styles.fareAmount}>₹{rideData.fare}</Text>
              <Text style={styles.fareDistance}>{rideData.tripDistance} km (3 min)</Text>
            </View>
          </View>

          {/* Compact Timeline */}
          <View style={styles.timelineCard}>
            <View style={styles.timelineRow}>
              <View style={styles.timelineItem}>
                <Text style={styles.timelineDate}>{rideData.startDate}</Text>
                <Text style={styles.timelineTime}>{rideData.startTime}</Text>
              </View>
              <View style={styles.timelineDots}>
                <View style={styles.dot} />
                <View style={styles.dashedLine} />
                <View style={styles.dot} />
              </View>
              <View style={[styles.timelineItem, styles.timelineItemRight]}>
                <Text style={styles.timelineDate}>{rideData.endDate}</Text>
                <Text style={styles.timelineTime}>{rideData.endTime}</Text>
              </View>
            </View>
          </View>

          {/* Compact Vehicle Card */}
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleLeft}>
              <Text style={styles.vehicleModel}>
                {vehicle?.vehicle_brand || "N/A"} - {vehicle?.vehicle_type || "N/A"}
              </Text>
              <View style={styles.plateContainer}>
                <Text style={styles.vehiclePlate}>
                  {vehicle?.vehicle_number || "DL 1A B2345"}
                </Text>
              </View>
              <View style={styles.tripTypeBadge}>
                <Text style={styles.tripTypeText}>{rideData.tripType}</Text>
              </View>
            </View>
            <View style={styles.vehicleImageContainer}>
              <MaterialCommunityIcons name="car-side" size={80} color="#9CA3AF" />
            </View>
          </View>

          {/* Compact Locations */}
          <View style={styles.locationCard}>
            <LocationRow 
              color="#10B981" 
              label="Pickup" 
              address={rideData.pickup}
              icon="location"
            />
            {rideData.stops !== "No Stop" && (
              <LocationRow 
                color="#6B7280" 
                label="Stop" 
                address={rideData.stops}
                icon="ellipsis-horizontal"
                isStop
              />
            )}
            <LocationRow 
              color="#DC2626" 
              label="Drop" 
              address={rideData.drop}
              icon="location"
              isLast
            />
          </View>

          {/* Compact Details */}
          <View style={styles.detailsCard}>
            <DetailRow label="Trip Distance" value={`${rideData.tripDistance} kms`} />
            <DetailRow label="Trip Duration" value={rideData.time} />
            <DetailRow label="Extra km Charges" value="₹12 / km" />
            <DetailRow label="Extra Time Charges" value="₹2 / minutes" />
            <DetailRow label="Tolls & Inter State Charges" value="Included" />
            <DetailRow label="Parking Charges" value="Included" noBorder />
          </View>

          <View style={{ height: 200 }} />
        </ScrollView>

        {/* Compact Bottom Sheet */}
        <View style={styles.bottomSheet}>
          <Text style={styles.offerTitle}>Offer Your Fare</Text>
          
          <View style={styles.offerButtons}>
            {offers.map((offer) => (
              <TouchableOpacity
                key={offer.id}
                style={[
                  styles.offerButton,
                  selectedOffer?.id === offer.id && styles.offerButtonSelected,
                ]}
                onPress={() => setSelectedOffer(offer)}
                disabled={isSubmitting}
              >
                <Text style={[
                  styles.offerLabel,
                  selectedOffer?.id === offer.id && styles.offerLabelSelected,
                ]}>
                  {offer.label}
                </Text>
                <Text style={[
                  styles.offerSublabel,
                  selectedOffer?.id === offer.id && styles.offerSublabelSelected,
                ]}>
                  {offer.sublabel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.acceptButton, !selectedOffer && styles.acceptButtonDisabled]}
            disabled={!selectedOffer || isSubmitting}
            onPress={handleAcceptRide}
          >
            <Text style={styles.acceptButtonText}>
              {selectedOffer 
                ? `Accept Fare on ₹${calculateOfferPrice().toFixed(2)}`
                : 'Select an offer to continue'
              }
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading Modal */}
        <Modal
          visible={isSubmitting}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#DC2626" />
              </View>
              <Text style={styles.modalTitle}>Accepting...</Text>
              <Text style={styles.modalSubtitle}>
                Your request has been sent to the customer.{'\n'}
                Please wait for their acceptance.
              </Text>
              <View style={styles.requestSentButton}>
                <Text style={styles.requestSentText}>Request Sent</Text>
              </View>
            </View>
          </View>
        </Modal>

        {/* Success Modal */}
        <Modal
          visible={showSuccess}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Animated.View 
                style={[
                  styles.successIconContainer,
                  { transform: [{ scale: scaleAnim }] }
                ]}
              >
                <Ionicons name="checkmark" size={60} color="white" />
              </Animated.View>
              <Text style={styles.modalTitle}>Your Trip Confirmed</Text>
              <Text style={styles.modalSubtitle}>
                Your request has been accept by the customer.{'\n'}
                Now you can pickup customer.
              </Text>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const LocationRow = ({ color, label, address, icon, isStop, isLast }) => (
  <View style={[styles.locationRow, isLast && styles.locationRowLast]}>
    <View style={styles.locationIconCol}>
      {isStop ? (
        <MaterialCommunityIcons name="dots-vertical" size={16} color="#9CA3AF" />
      ) : (
        <View style={[styles.locationDot, { backgroundColor: color }]} />
      )}
      {!isLast && <View style={styles.locationLine} />}
    </View>
    <View style={styles.locationContent}>
      <Text style={styles.locationAddress}>{address}</Text>
    </View>
  </View>
);

const DetailRow = ({ label, value, noBorder }) => (
  <View style={[styles.detailRow, noBorder && styles.detailRowNoBorder]}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const mapStyle = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginLeft: -32,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  placeholder: {
    width: 32,
  },

  scrollView: {
    flex: 1,
  },

  // Map
  mapContainer: {
    height: 180,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  distanceChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 4,
  },
  durationText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 6,
  },
  markerPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  // Customer Card
  customerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 2,
  },
  fareContainer: {
    alignItems: 'flex-end',
  },
  fareAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#DC2626',
  },
  fareDistance: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },

  // Timeline
  timelineCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  timelineRow: {
    // flexDirection: 'row',
    // justifyContent: 'space-between',
    // alignItems: 'center',
  },
  timelineItem: {
    flex: 1,
  },
  timelineItemRight: {
    alignItems: 'flex-end',
  },
  timelineDate: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  timelineDots: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
  dashedLine: {
    flex: 1,
    height: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginHorizontal: 8,
  },

  // Vehicle Card
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vehicleLeft: {
    flex: 1,
  },
  vehicleModel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  plateContainer: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  vehiclePlate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 1,
  },
  tripTypeBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tripTypeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  vehicleImageContainer: {
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Location Card
  locationCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  locationRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  locationRowLast: {
    marginBottom: 0,
  },
  locationIconCol: {
    width: 20,
    alignItems: 'center',
  },
  locationDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  locationLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
    marginBottom: 4,
  },
  locationContent: {
    flex: 1,
    marginLeft: 12,
  },
  locationAddress: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },

  // Details Card
  detailsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailRowNoBorder: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  offerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  offerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  offerButton: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  offerButtonSelected: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  offerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  offerLabelSelected: {
    color: '#DC2626',
  },
  offerSublabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '600',
  },
  offerSublabelSelected: {
    color: '#DC2626',
  },

  // Accept Button
  acceptButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: width - 64,
    alignItems: 'center',
  },
  loaderContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  requestSentButton: {
    backgroundColor: '#D1D5DB',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  requestSentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});