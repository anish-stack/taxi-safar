import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store'; 

const createHybridStorage = () => {
  return {
    getItem: async (name) => {
      try {
        const asyncData = await AsyncStorage.getItem(name);
        const parsedAsyncData = asyncData ? JSON.parse(asyncData) : {};

        const token = await SecureStore.getItemAsync('auth_token');

        return JSON.stringify({
          ...parsedAsyncData,
          token: token || null,
        });
      } catch (error) {
        console.error('Error reading from storage:', error);
        return null;
      }
    },
    setItem: async (name, value) => {
      try {
        const data = JSON.parse(value);

        // Save token securely
        if (data.token) {
          await SecureStore.setItemAsync('auth_token', data.token);
        } else {
          await SecureStore.deleteItemAsync('auth_token');
        }

        // Save non-sensitive data
        const { token, ...rest } = data;
        await AsyncStorage.setItem(name, JSON.stringify(rest));
      } catch (error) {
        console.error('Error writing to storage:', error);
      }
    },
    
    removeItem: async (name) => {
      try {
        await SecureStore.deleteItemAsync('auth_token');
        await AsyncStorage.removeItem(name);
      } catch (error) {
        console.error('Error removing from storage:', error);
      }
    },
  };
};

const loginStore = create(
  persist(
    (set, get) => ({
      // States
      time: null,
      token: null,
      driver:null,
      authenticated: false,
      loading: false,
      error: null,

      // Logout
      logout: () => {
        set({ loading: true });

        return Promise.all([
          SecureStore.deleteItemAsync('auth_token'),
          AsyncStorage.removeItem('login-storage'),
        ])
          .then(() => {
            set({
              token: null,
              authenticated: false,
              loading: false,
              error: null,
              otp_sent: false,
              role: null,
            
            });
            console.log('Logged out successfully');
          })
          .catch((err) => {
            console.error('Logout error:', err);
            set({ error: 'Logout failed', loading: false });
          });
      },

      getToken: async () => {
        try {
          const secureToken = await SecureStore.getItemAsync('auth_token');
          return secureToken || get().token;
        } catch (error) {
          console.error('Error fetching token:', error);
          return get().token;
        }
      },

      setToken: (token) => set({ token, authenticated: !!token }),

      setAuthenticated: (value) => set({ authenticated: value }),

      clearError: () => set({ error: null }),

    }),
    {
      name: 'login-storage',
      storage: createJSONStorage(() => createHybridStorage()),
      partialize: (state) => ({
        token: state.token,
        authenticated: state.authenticated,
        role: state.role,
      
      }),
      onRehydrateStorage: () => (state) => {
        console.log('Rehydrated:', state ? 'Success' : 'Failed');
        if (state) {
          set({ loading: false });
        }
      },
    }
  )
);

export default loginStore;