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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { fetchWithRetry } from "../../utils/fetchWithRetry";
import { API_URL_APP } from "../../constant/api";
import { LinearGradient } from "expo-linear-gradient";

export default function Categories({ isRefresh }) {
  const navigation = useNavigation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

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
  }, [isRefresh]);

  const handlePress = (item) => {
    setActiveId(item._id);
    navigation.navigate(item.screen);
    setTimeout(() => setActiveId(null), 300);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#DC2626" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((item) => {
          const isActive = activeId === item._id;

          return (
            <TouchableOpacity
              key={item._id}
              onPress={() => handlePress(item)}
              activeOpacity={0.85}
              style={[styles.card, isActive && styles.activeCard]}
            >
              {/* Badge */}
              {item.badge && (
                <View style={styles.badgeContainer}>
                  <LinearGradient
                    colors={item.badge === "New" ? ["#FF3B30", "#FF9500"] : ["#34C759", "#28A745"]} style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </LinearGradient>
                </View>
              )}

              {/* Icon */}
              <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
                <Image source={{ uri: item.image.url }} style={styles.icon} resizeMode="contain" />
              </View>

              {/* Title – Font Family बिल्कुल वैसी ही */}
              <Text style={[styles.title, isActive && styles.activeTitle]} numberOfLines={2}>
                {item.title}
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
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingRight: 20,
    gap: 10,
  },
  loadingContainer: {
    paddingVertical: 16,
    alignItems: "center",
  },

  card: {
    width: 72,
    height: 96,
    backgroundColor: "#fff",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1.2,
    borderColor: "#f0f0f0",
   
  },
  activeCard: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FCA5A5",
    transform: [{ scale: 0.94 }],
  },

  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  activeIconWrapper: {
    backgroundColor: "#FEE2E2",
  },

  icon: {
    width: 32,
    height: 32,
  },

  title: {
    fontSize: 10.8,
    fontFamily: "SFProDisplay-Medium",     // रखा हुआ है
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    lineHeight: 13,
    paddingHorizontal: 2,
  },
  activeTitle: {
    color: "#DC2626",
    fontFamily: "SFProDisplay-Bold",       // रखा हुआ है
    fontWeight: "700",
  },

  badgeContainer: {
    position: "absolute",
    top: 4,
    right: -4,
    zIndex: 10,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    color: "#fff",
    fontSize: 8.5,
    fontFamily: "SFProDisplay-Bold",       // रखा हुआ है
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});