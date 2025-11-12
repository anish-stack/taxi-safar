import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import logo from '../../assets/taxisafar-logo.png';
import { Colors } from '../../constant/ui';
import { useNavigation } from '@react-navigation/native';

export default function BackWithLogo({isBackGround=true}) {
    const navigation = useNavigation()
  return (
    <View style={[styles.headerContainer,{backgroundColor:isBackGround ? Colors.white:'transparent'}]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Icon name="arrow-back" size={24} color={Colors.black} />
      </TouchableOpacity>

      <Image source={logo} style={styles.logo} resizeMode="contain" />
      <View style={{ width: 24 }} /> 
      {/* Placeholder for balance alignment */}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 6,
    borderRadius: 50,
  },
  logo: {
    width: 120,
    height: 40,
  },
});
