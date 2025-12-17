import React from "react";
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Text,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

import logo from "../../assets/taxisafar-logo.png";
import { Colors } from "../../constant/ui";

export default function BackWithLogo({
  isBackGround = true,
  isLogo = true,
  title = "",
  isPlusHow = false,
  plusOnPress,
}) {
  const navigation = useNavigation();

  return (
    <View
      style={[
        styles.container,
        isBackGround && styles.background,
      ]}
    >
      {/* Back Button */}
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={22} color={Colors.black} />
      </TouchableOpacity>

      {/* Center Logo / Title */}
      <View style={styles.centerContent}>
        {isLogo ? (
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        ) : (
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        )}
      </View>

      {/* Right Action */}
      {isPlusHow ? (
        <TouchableOpacity
          style={[styles.iconBtn, styles.addBtn]}
          onPress={plusOnPress}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  background: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
   
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  addBtn: {
    backgroundColor: Colors.black,
  },

  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.black,
  },

  logo: {
    width: 110,
    height: 36,
  },

  placeholder: {
    width: 40,
  },
});
