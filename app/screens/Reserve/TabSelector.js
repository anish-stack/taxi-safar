import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function TabSelector({ activeTab, tabs, onTabChange }) {
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => onTabChange(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 25,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#000',
  },
  activeTab: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
});