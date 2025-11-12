import { create } from 'zustand';
import axios from 'axios';
import { getData } from '../utils/storage';
import { API_URL_APP } from '../constant/api';
import loginStore from './auth.store';

const useDriverStore = create((set, get) => ({
    driver: null,
    loading: false,
    error: null,
    is_online: false,
    on_ride: null,
    toggleStatus: false,
    location: null,
    currentRadius: null,

    // ✅ Fetch driver details
    fetchDriverDetails: async (navigation) => {
        try {
            set({ loading: true, error: null });
            const token = loginStore.getState().token;

            if (!token) {
                set({ loading: false, error: 'No token found' });
                return;
            }

            const res = await axios.get(`${API_URL_APP}/api/v1/driver-details`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            set({
                driver: res.data.data || res.data,
                is_online: res.data?.is_online ?? false,
                on_ride: res.data?.is_OnRide ?? null,
                location: res.data.location,
                currentRadius: res.data.currentRadius,
                loading: false,
            });
        } catch (error) {
            console.error('❌ Fetch driver error:', error.message.status);

            // ✅ If token invalid → logout & redirect
            if (error.response?.status === 401) {
                console.log('⚠️ Token expired — logging out...');
                const { logout } = loginStore.getState();
                logout();
                navigation.navigate('splash');
            }

            set({
                error:
                    error.response?.data?.message ||
                    'Failed to fetch driver details',
                loading: false,
            });
        }
    },


    toggle: async (status, navigation) => {
        try {
            set({ loading: true, error: null });
            const token = loginStore.getState().token;

            if (!token) {
                set({ loading: false, error: 'No token found' });
                return;
            }

            const res = await axios.post(
                `${API_URL_APP}/api/v1/toggle-status`,
                { status }, // ✅ POST instead of GET for updates
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            console.log("res", res.data)

            set({
                is_online: res.data?.data?.is_online ?? status,
                loading: false,
            });
        } catch (error) {
            console.error('❌ Toggle driver error:', error.message);

            // ✅ Handle 401 → logout + navigate
            if (error.response?.status === 401) {
                console.log('⚠️ Token expired — logging out...');
                const { logout } = loginStore.getState();
                logout();
                navigation.navigate('splash');
            }

            set({
                error:
                    error.response?.data?.message ||
                    'Failed to toggle driver status',
                loading: false,
            });
        }
    },

    IncreaseRadiusArea: async (radius, Alert) => {
        set({ loading: true, error: null });
        const token = loginStore.getState().token;

        if (!token) {
            set({ loading: false, error: "No token found" });
            return;
        }

        try {
            const response = await axios.put(
                `${API_URL_APP}/api/v1/update-radius`,
                { radius }, // ✅ match backend field
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (response.data.success) {
                Alert.alert("Radius Updated",response.data.message)
                set({
                    currentRadius: response.data.currentRadius,
                    loading: false,
                });
            }else{
                set({
                    currentRadius: 5,
                    loading: false,
                });
            }

        } catch (error) {
            console.error("Error updating radius:", error);
            set({
                loading: false,
                error: error.response?.data?.message || "Failed to update radius.",
            });
        }
    },

}));

// ✅ Auto-run fetchDriverDetails if token exists
(async () => {
    const token = await getData('auth_token');
    if (token) {
        setTimeout(() => {
            useDriverStore.getState().fetchDriverDetails();
        }, 100);
    }
})();

export default useDriverStore;
