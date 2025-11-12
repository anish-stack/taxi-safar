import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import useDriverStore from '../../store/driver.store';
import DriverMap from '../common/driver.map';
import RideCard from '../cards/UpcomingRides';
import Heading from '../common/Heading';
import StatsCard from '../common/StatsCard';
import { Colors } from '../../constant/ui';
import { useNavigationState } from '@react-navigation/native';
import Layout from '../common/layout';

export default function HomeScreen({ navigation }) {
  const { fetchDriverDetails } = useDriverStore();
  const state = useNavigationState(state => state);

  useEffect(() => {
    fetchDriverDetails();
  }, []);

  // Upcoming Rides Data
  const upcomingRides = [
    {
      id: 1,
      name: "Dharmendra T.",
      profileImage: "",
      rating: 4.8,
      reviews: 127,
      fare: 180,
      distance: 6.2,
      time: "12 min",
      startDate: "12 November, 2025",
      startTime: "07:45 PM",
      endDate: "12 November, 2025",
      endTime: "07:57 PM",
      pickup: "M2K Rohini, Sector 3, New Delhi",
      drop: "Peeragarhi Metro Station, New Delhi",
      tripType: "One Way Trip",
      tripDistance: 6.2,
      stops: "No Stop",
    },
    {
      id: 2,
      name: "Rajesh K.",
      profileImage: "",
      rating: 4.9,
      reviews: 212,
      fare: 420,
      distance: 15.8,
      time: "35 min",
      startDate: "12 November, 2025",
      startTime: "10:15 AM",
      endDate: "12 November, 2025",
      endTime: "10:50 AM",
      pickup: "Connaught Place, New Delhi",
      drop: "Indira Gandhi International Airport, Terminal 3, New Delhi",
      tripType: "One Way Trip",
      tripDistance: 15.8,
      stops: "No Stop",
    },
    {
      id: 3,
      name: "Priya S.",
      profileImage: "",
      rating: 4.7,
      reviews: 189,
      fare: 950,
      distance: 38.4,
      time: "1 hr 10 min",
      startDate: "13 November, 2025",
      startTime: "08:30 AM",
      endDate: "13 November, 2025",
      endTime: "09:40 AM",
      pickup: "Noida Sector 18, Uttar Pradesh",
      drop: "DLF Cyber City, Gurugram, Haryana",
      tripType: "One Way Trip",
      tripDistance: 38.4,
      stops: "Multi Stop",
    },
  ];

  // Reserved Rides Data
  const reservedRides = [
    {
      id: 4,
      name: "Arun K.",
      profileImage: "",
      rating: 4.9,
      reviews: 256,
      fare: 4200,
      distance: 280,
      time: "5 hr 30 min",
      startDate: "14 November, 2025",
      startTime: "06:00 AM",
      endDate: "14 November, 2025",
      endTime: "11:30 AM",
      pickup: "Kashmere Gate ISBT, Delhi",
      drop: "MI Road, Jaipur, Rajasthan",
      tripType: "Intercity Reserved Ride",
      tripDistance: 280,
      stops: "Scheduled Stops at Neemrana & Behror",
    },
    {
      id: 5,
      name: "Ravi S.",
      profileImage: "",
      rating: 4.9,
      reviews: 312,
      fare: 3200,
      distance: 230,
      time: "4 hr 15 min",
      startDate: "16 November, 2025",
      startTime: "06:30 AM",
      endDate: "16 November, 2025",
      endTime: "10:45 AM",
      pickup: "Karol Bagh, New Delhi",
      drop: "Taj Mahal, Agra, Uttar Pradesh",
      tripType: "Intercity Reserved Ride",
      tripDistance: 230,
      stops: "Midway stop at Mathura for breakfast",
    },
  ];

  return (
    <Layout state={state}>
      <DriverMap />
      
      <View style={styles.cardWrapper}>
        <StatsCard count="16" title="Taxi Safar Reserve Trip" />
        <StatsCard count="02" title="Driver Post Trip" />
        <StatsCard count="08" title="My Pending Trip" />
      </View>

      <View style={styles.bgArea}>
        {/* Upcoming Rides Section */}
        <Heading title="Upcoming Rides" size={22} colour="#222" />
        {upcomingRides.map((ride) => (
          <TouchableOpacity
            key={ride.id}
            onPress={() => navigation.navigate('RideDetails', { rideData: ride })}
          >
            <RideCard data={ride} />
          </TouchableOpacity>
        ))}

        {/* Reserved Rides Section */}
        <Heading title="Reserved Rides" size={22} colour="#222" />
        {reservedRides.map((ride) => (
          <TouchableOpacity
            key={ride.id}
            onPress={() => navigation.navigate('RideDetails', { rideData: ride })}
          >
            <RideCard data={ride} />
          </TouchableOpacity>
        ))}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  cardWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bgArea: {
    backgroundColor: Colors.greyLighter,
  },
  container: {
    alignItems: 'center',
  },
});