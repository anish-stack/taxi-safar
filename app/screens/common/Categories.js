// components/Categories.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchWithRetry } from '../../utils/fetchWithRetry';
import { API_URL_APP } from '../../constant/api';
import { LinearGradient } from 'expo-linear-gradient'; 

const { width } = Dimensions.get('window');

export default function Categories({isRefresh}) {
  const navigation = useNavigation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetchWithRetry(() =>
        fetch(`${API_URL_APP}/api/v1/get-categories`).then(res => res.json())
      );

      if (response.success) {
       const activeAndSorted = response.data
          .filter(cat => cat.is_active)
          .sort((a, b) => a.position - b.position); // Ensures position 1 comes first

        setCategories(activeAndSorted);
       
      }
    } catch (error) {
      console.log('Error fetching categories:', error);
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
    setTimeout(() => setActiveId(null), 400);
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
              activeOpacity={0.8}
              style={[styles.card, isActive && styles.activeCard]}
            >
              {/* Premium Badge */}
              {item.badge && (
                <View style={styles.badgeContainer}>
                  <LinearGradient
                    colors={
                      item.badge === 'New'
                        ? ['#FF3B30', '#FF9500']
                        : ['#34C759', '#28A745']
                    }
                    style={styles.badge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </LinearGradient>
                </View>
              )}

              {/* Icon with subtle background */}
              <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
                <Image
                  source={{ uri: item.image.url }}
                  style={styles.icon}
                  resizeMode="contain"
                />
              </View>

              {/* Title */}
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
    paddingVertical: 26,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingRight: 24,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  card: {
    width: 82,
    height: 110,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 0.5,
  },
  activeCard: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FCA5A5',
 
    transform: [{ scale: 0.96 }],
  },

  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    // backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeIconWrapper: {
    backgroundColor: '#FEE2E2',
    shadowColor: '#DC2626',

  },

  icon: {
    width: 36,
    height: 36,
  },

  title: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 4,
  },
  activeTitle: {
    color: '#DC2626',
    fontWeight: '800',
  },

  badgeContainer: {
    position: 'absolute',
    top: 6,
    right: -6,
    zIndex: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});