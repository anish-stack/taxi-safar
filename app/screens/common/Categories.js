// components/Categories.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { fetchWithRetry } from "../../utils/fetchWithRetry";
import { API_URL_APP } from "../../constant/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function Categories({ refreshing,isRefresh }) {
  const navigation = useNavigation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const MAX_VISIBLE = 4;

  // Dynamic calculations for responsiveness
  const horizontalPadding = 12;
  const totalPadding = horizontalPadding * 2;
  const availableWidth = SCREEN_WIDTH - totalPadding;
  const gap = 10;
  const totalGaps = (MAX_VISIBLE) * gap; 
  
  const cardWidth = (availableWidth - totalGaps) / (MAX_VISIBLE + 1); // +1 for potential View More

  // Clamp width to reasonable min/max to avoid too tiny or too large on extreme devices
  const finalCardWidth = Math.min(Math.max(cardWidth, 60), 80);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetchWithRetry(() =>
        fetch(`${API_URL_APP}/api/v1/get-categories`).then((res) => res.json())
      );

      if (response.success) {
        const activeAndSorted = response.data
          .filter((cat) => cat.is_active)
          .sort((a, b) => a.position - b.position);

        setCategories(activeAndSorted);
      }
    } catch (error) {
      console.log("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [isRefresh,refreshing]);

  const handlePress = (item) => {
    if (item._id === "view_more") {
      navigation.navigate("AllCategories");
      return;
    }

    setActiveId(item._id);
    navigation.navigate(item.screen);
    setTimeout(() => setActiveId(null), 300);
  };

  const visibleCategories =
    categories.length > MAX_VISIBLE
      ? [
          ...categories.slice(0, MAX_VISIBLE),
          { _id: "view_more", title: "View More" },
        ]
      : categories;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding },
        ]}
      >
        {visibleCategories.map((item, index) => {
          const isViewMore = item._id === "view_more";

          return (
            <TouchableOpacity
              key={item._id}
              onPress={() => handlePress(item)}
              activeOpacity={0.8}
              style={[
                styles.card,
                { width: finalCardWidth },
                isViewMore && styles.viewMoreCard,
                activeId === item._id && styles.activeCard,
                index > 0 && { marginLeft: gap }, // Add gap after first item
              ]}
            >
              <View style={styles.iconWrapper}>
                {isViewMore ? (
                  <View style={styles.dotsIcon}>
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                  </View>
                ) : (
                  <Image
                    source={{ uri: item.image.url }}
                    style={styles.icon}
                    resizeMode="contain"
                  />
                )}
              </View>

              <Text style={styles.title} numberOfLines={1}>
                {isViewMore ? "View More" : item.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  scrollContent: {
    alignItems: "center",
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  card: {
    height: 70,
    backgroundColor: "#F2F5F6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },
  activeCard: {
    backgroundColor: "#FFF5F5",
    transform: [{ scale: 0.95 }],
  },
  viewMoreCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
  },
  iconWrapper: {
    marginBottom: 6,
  },
  icon: {
    width: 22,
    height: 22,
  },
  dotsIcon: {
    width: 20,
    height: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#000",
  },
  title: {
    fontSize: 7.5,
    fontWeight: "500",
    color: "#010005",
    textAlign: "center",
    lineHeight: 10,
  },
});