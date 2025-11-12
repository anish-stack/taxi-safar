import AsyncStorage from '@react-native-async-storage/async-storage';

// Save data to AsyncStorage
export const saveData = async (key, value) => {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await AsyncStorage.setItem(key, stringValue);
  } catch (error) {
    console.error(`❌ Error saving data to AsyncStorage for key "${key}":`, error);
  }
};

// Get data from AsyncStorage
export const getData = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null) return null;

    try {
      return JSON.parse(value); // Parse JSON if possible
    } catch {
      return value; // Return as string if not JSON
    }
  } catch (error) {
    console.error(`❌ Error retrieving data from AsyncStorage for key "${key}":`, error);
    return null;
  }
};

// Remove data from AsyncStorage
export const removeItem = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`🗑️ Data removed: ${key}`);
  } catch (error) {
    console.error(`❌ Error removing data from AsyncStorage for key "${key}":`, error);
  }
};
