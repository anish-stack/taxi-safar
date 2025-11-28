// screens/HomeScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigationState } from '@react-navigation/native';

import useDriverStore from '../../store/driver.store';
import loginStore from '../../store/auth.store';
import { fetchWithRetry } from '../../utils/fetchWithRetry';
import { API_URL_APP } from '../../constant/api';

import Layout from '../common/layout';
import DriverMap from '../common/driver.map';
import Categories from '../common/Categories';
import Heading from '../common/Heading';
import DriverPostCard from '../Reserve/DriverPostCard';
import TaxiSafarTripCard from '../Reserve/TaxiSafarTripCard';

export default function HomeScreen() {
  const { fetchDriverDetails } = useDriverStore();
  const { token } = loginStore();
  const state = useNavigationState((state) => state);

  // TaxiSafar Rides State
  const [taxiSafarTrips, setTaxiSafarTrips] = useState([]);
  const [taxiPage, setTaxiPage] = useState(1);
  const [hasMoreTaxi, setHasMoreTaxi] = useState(true);

  // Driver Posts State
  const [driverPosts, setDriverPosts] = useState([]);
  const [driverPage, setDriverPage] = useState(1);
  const [hasMoreDriver, setHasMoreDriver] = useState(true);

  // Shared loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRides = async (taxiPageNum = 1, driverPageNum = 1, isRefresh = false) => {
    if (!token) return;

    try {
      if (!isRefresh) setLoading(true);
      if (isRefresh) setRefreshing(true);

      const [taxiRes, driverRes] = await Promise.all([
        fetchWithRetry(() =>
          fetch(`${API_URL_APP}/api/v1/Fetch-Near-By-Taxi-Safar-Rides?page=${taxiPageNum}&limit=10`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(res => res.json())
        ),
        fetchWithRetry(() =>
          fetch(`${API_URL_APP}/api/v1/fetch-nearby-rides?page=${driverPageNum}&limit=10`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(res => res.json())
        ),
      ]);

      const newTaxiTrips = taxiRes.success ? taxiRes.data || [] : [];
      const newDriverPosts = driverRes.success ? driverRes.data || [] : [];

      if (isRefresh || taxiPageNum === 1) {
        setTaxiSafarTrips(newTaxiTrips);
      } else {
        setTaxiSafarTrips(prev => [...prev, ...newTaxiTrips.filter(
          t => !prev.some(existing => existing._id === t._id)
        )]);
      }

      if (isRefresh || driverPageNum === 1) {
        setDriverPosts(newDriverPosts);
      } else {
        setDriverPosts(prev => [...prev, ...newDriverPosts.filter(
          t => !prev.some(existing => existing._id === t._id)
        )]);
      }

      setHasMoreTaxi(newTaxiTrips.length === 10);
      setHasMoreDriver(newDriverPosts.length === 10);

      if (!isRefresh) {
        setTaxiPage(taxiPageNum + (newTaxiTrips.length === 10 ? 1 : 0));
        setDriverPage(driverPageNum + (newDriverPosts.length === 10 ? 1 : 0));
      }

    } catch (error) {
      console.log("Error fetching rides:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDriverDetails();
    fetchRides(1, 1);
  }, []);

  const onRefresh = useCallback(() => {
    setTaxiPage(1);
    setDriverPage(1);
    setHasMoreTaxi(true);
    setHasMoreDriver(true);
    fetchRides(1, 1, true);
  }, [token]);

  const loadMoreTaxi = () => {
    if (hasMoreTaxi && taxiSafarTrips.length > 0) {
      fetchRides(taxiPage, driverPage);
    }
  };

  const loadMoreDriver = () => {
    if (hasMoreDriver && driverPosts.length > 0) {
      fetchRides(taxiPage, driverPage);
    }
  };

  const renderSectionHeader = (title, subtitle) => (
    <View style={styles.sectionHeader}>
      <Heading title={title} />
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderEmpty = (title) => (
    <View style={styles.emptySection}>
      <Text style={styles.emptyText}>No {title} available right now</Text>
      <Text style={styles.emptySubtext}>Pull down to refresh</Text>
    </View>
  );

  if (loading && taxiSafarTrips.length === 0 && driverPosts.length === 0) {
    return (
      <Layout state={state}>
        <SafeAreaView style={styles.container}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#DC2626" />
            <Text style={styles.loadingText}>Finding nearby trips...</Text>
          </View>
        </SafeAreaView>
      </Layout>
    );
  }

  return (
    <Layout state={state}>
      <DriverMap />
      <Categories />

      <View style={styles.bgArea}>
        <FlatList
          data={[{ key: 'content' }]}
          renderItem={() => (
            <View>
              {/* TaxiSafar Rides Section */}
              {taxiSafarTrips.length > 0 && renderSectionHeader("Taxi Safar Reserved Rides")}
              <FlatList
                data={taxiSafarTrips}
                renderItem={({ item }) => <TaxiSafarTripCard trip={item} />}
                keyExtractor={(item) => item._id}
                ListEmptyComponent={renderEmpty("TaxiSafar rides")}
                onEndReached={loadMoreTaxi}
                onEndReachedThreshold={0.5}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />

              {/* Driver Posts Section */}
              {driverPosts.length > 0 && renderSectionHeader("Driver Posts")}
              <FlatList
                data={driverPosts}
                renderItem={({ item }) => <DriverPostCard trip={item} />}
                keyExtractor={(item) => item._id}
                ListEmptyComponent={renderEmpty("driver posts")}
                onEndReached={loadMoreDriver}
                onEndReachedThreshold={0.5}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                style={driverPosts.length > 0 ? styles.driverSectionMargin : null}
              />
            </View>
          )}
          keyExtractor={() => 'main'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#DC2626"]}
              tintColor="#DC2626"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.mainContent}
        />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },

  bgArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',

    // marginTop: -20,
    overflow: 'hidden',
  },

  mainContent: {
    paddingBottom: 100,
  },

  sectionHeader: {
    // paddingHorizontal: 16,
    // paddingTop: 24,
    // paddingBottom: 8,
  },

  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },

  driverSectionMargin: {
    marginTop: 16,
  },

  emptySection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
});