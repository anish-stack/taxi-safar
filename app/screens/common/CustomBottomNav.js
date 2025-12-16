// components/common/CustomBottomNav.js
import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
const TABS = [
  {
    name: "Home",
    icon: "home",
    iconOutline: "home-outline",
    label: "Home",
    screen: "Home",
  },
  {
    name: "MyTrip",
    icon: "car-sport",
    iconOutline: "car-sport-outline",
    label: "My Trips",
    screen: "MyTrip",
    isImage: true,
    imagePath: require("./car.png"),
  },
  { name: "Add", icon: "add-circle", label: "", isCenter: true, screen: "Add" },
  {
    name: "Reserve",
    icon: "time",
    iconOutline: "time-outline",
    isImage: true,
    imagePath: require("./reserver.png"),

    label: "Reserve",
    screen: "Reserve",
  },
  {
    name: "Settings",
    icon: "settings-outline",
    iconOutline: "settings-outline",
    label: "Settings",
    screen: "Account",
  },
];

const CustomBottomTabs = ({ state, bottomInset = 0 }) => {
  const navigation = useNavigation();
  const activeIndex = state?.index || 0;

  const handleTabPress = (index, screen) => {
    if (screen) navigation.navigate(screen);
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      {/* Floating Center Button */}
      <View
        style={[
          styles.centerButtonWrapper,
          { bottom: bottomInset + (Platform.OS === "ios" ? 25 : 10) },
        ]}
      >
        <TouchableOpacity
          style={styles.centerButton}
          onPress={() => handleTabPress(2, TABS[2].screen)}
          activeOpacity={0.85}
        >
          <View style={styles.centerButtonInner}>
            <Icon name="add" size={36} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom Tab Bar */}
      <View style={[styles.tabBar, { paddingBottom: bottomInset - 32 }]}>
        {TABS.map((tab, index) => {
          if (tab.isCenter)
            return <View key={index} style={styles.centerSpace} />;

          const isActive = activeIndex === index;

          return (
            <TouchableOpacity
              key={index}
              style={styles.tabItem}
              onPress={() => handleTabPress(index, tab.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <View style={[styles.iconContainer]}>
                  {tab.isImage ? (
                    <Image
                      source={tab.imagePath}
                      style={{
                        width: 44,
                        tintColor: "#000",
                        height: 23,
                        resizeMode: "contain", 
                        borderRadius: 6, 
                      }}
                    />
                  ) : (
                    <Icon
                      name={isActive ? tab.icon : tab.iconOutline}
                      size={24}
                      color={isActive ? "#010005" : "#7A7A7A"}
                    />
                  )}
                </View>
                <Text
                  style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                >
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",

    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    height: Platform.OS === "ios" ? 85 : 65,
    paddingTop: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "space-around",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    elevation: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  tabItem: {
    flex: 1,
    position: "relative",
    top: -10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: { alignItems: "center" },
  iconContainer: {
    width: 44,
    height: 23,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  // iconContainerActive: { backgroundColor: "#F3F4F6" },
  tabLabel: { fontSize: 11, fontWeight: "600", color: "#000", marginTop: 2 },
  tabLabelActive: { color: "#E5260F" },

  centerSpace: { width: 70 },
  centerButtonWrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 50 : 25,
    left: "50%",
    marginLeft: -35,
    zIndex: 100,
  },
  centerButton: {
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  centerButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});

export default CustomBottomTabs;
