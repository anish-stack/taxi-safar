import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from './header';
import CustomBottomTabs from './CustomBottomNav';

const Layout = ({ 
  children, 
  showHeader = true,
  showBottomTabs = true,
  scrollable = true,
  headerProps = {},
  contentContainerStyle = {},
  backgroundColor = '#ffffff',
  state, 
}) => {

  const content = (
    <View style={[styles.content, { backgroundColor }]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#ffffff" 
        translucent={false}
      />
      
      {/* Header */}
      {showHeader && <Header {...headerProps} />}

      {/* Main Content */}
      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          bounces={true}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.staticContent}>
          {content}
        </View>
      )}

      {/* Bottom Tabs */}
      {showBottomTabs && <CustomBottomTabs state={state} />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Space for bottom tabs
  },
  staticContent: {
    flex: 1,
    marginBottom: Platform.OS === 'ios' ? 85 : 65, // Space for bottom tabs when not scrolling
  },
  
});

export default Layout;