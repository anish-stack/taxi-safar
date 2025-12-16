// components/common/Layout.js
import React,{useContext} from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";

import Header from "./header";
import CustomBottomTabs from "./CustomBottomNav";

const Layout = ({
  children,
  showHeader = true,
  showBottomTabs = true,
  scrollable = true,
  headerProps = {},
  stopPoolingService,
  stopFloatingWidget,
  startFloatingWidget,
  startPoolingService,
  contentContainerStyle = {}, // ← यहाँ कोई default flexGrow नहीं डालेंगे
  backgroundColor = "#ffffff",
  state,
}) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext) || 0;
  const defaultContentStyle = {
    flexGrow: 1,
    paddingBottom: tabBarHeight + insets.bottom + 20, // real dynamic height
  };

  const finalContentStyle = [
    defaultContentStyle,
    contentContainerStyle, // ← user का style last में आएगा → override करेगा
  ];

  const content = (
    <View style={[styles.content, { backgroundColor }]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F2F5F6"
        translucent={false}
      />

      {/* Header */}
      {showHeader && (
        <Header
          stopPoolingService={stopPoolingService}
          stopFloatingWidget={stopFloatingWidget}
          startFloatingWidget={startFloatingWidget}
          startPoolingService={startPoolingService}
          {...headerProps}
        />
      )}

      {/* Main Content */}
      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={finalContentStyle} // ← यहाँ सही style
          showsVerticalScrollIndicator={false}
          bounces={true}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.staticContent, contentContainerStyle]}>
          {content}
        </View>
      )}

      {/* Bottom Tabs */}
      {showBottomTabs && (
        <CustomBottomTabs state={state} bottomInset={insets.bottom} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,

  },
  scrollView: {
    backgroundColor: "#FFFBF1",

    flex: 1,
  },
  staticContent: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default Layout;
