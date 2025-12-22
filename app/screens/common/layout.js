// components/common/Layout.js
import React, { useContext } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
  RefreshControl,
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
  contentContainerStyle = {},
  backgroundColor = "#ffffff",
  state,
  refreshing = false,
  onRefresh,
}) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext) || 0;
  
  const defaultContentStyle = {
    flexGrow: 1,
    paddingBottom: tabBarHeight + insets.bottom + 20,
  };

  const finalContentStyle = [
    defaultContentStyle,
    contentContainerStyle,
  ];

  // Clone children and pass refresh prop to all
  const childrenWithRefreshProp = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { isRefresh: refreshing });
    }
    return child;
  });

  const content = (
    <View style={[styles.content, { backgroundColor }]}>
      {childrenWithRefreshProp}
    </View>
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
          contentContainerStyle={finalContentStyle}
          showsVerticalScrollIndicator={false}
          bounces={true}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#DC2626"]}
                tintColor="#DC2626"
              />
            ) : null
          }
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