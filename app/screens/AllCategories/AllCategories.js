import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Layout from "../common/layout";
import { useNavigation } from "@react-navigation/native";
import { fetchWithRetry } from "../../utils/fetchWithRetry";
import { API_URL_APP } from "../../constant/api";

const AllCategories = () => {
  const navigation = useNavigation();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCategories = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);

      const response = await fetchWithRetry(() =>
        fetch(`${API_URL_APP}/api/v1/get-categories`).then((res) => res.json())
      );

      if (response?.success) {
        const activeAndSorted = response.data
          .filter((cat) => cat.is_active)
          .sort((a, b) => a.position - b.position);

        setCategories(activeAndSorted);
      }
    } catch (error) {
      console.log("❌ Error fetching categories:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const renderCategory = (item) => (
    <TouchableOpacity
      key={item._id}
      activeOpacity={0.85}
      style={styles.card}
      onPress={() => navigation.navigate(item.screen)}
    >
      <View style={styles.iconWrapper}>
        <Image
          source={{ uri: item.image?.url }}
          style={styles.icon}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Layout showBack title="All Categories">
      <View style={styles.container}>
        {/* Heading */}
        <Text style={styles.heading}>Browse All Categories</Text>

        {loading ? (
          <ActivityIndicator size="small" color="#DC2626" />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchCategories(true)}
                colors={["#DC2626"]}
              />
            }
          >
            <View style={styles.grid}>
              {categories.map(renderCategory)}
            </View>
          </ScrollView>
        )}
      </View>
    </Layout>
  );
};

export default AllCategories;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
  },

  heading: {
    fontSize: 18,
    fontFamily: "SFProDisplay-Bold",
    color: "#111",
    marginVertical: 12,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingBottom: 30,
  },

  card: {
    width: "31%",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  icon: {
    width: 36,
    height: 36,
  },

  title: {
    fontSize: 12,
    textAlign: "center",
    color: "#374151",
    fontFamily: "SFProDisplay-Medium",
    lineHeight: 14,
    paddingHorizontal: 4,
  },
});
