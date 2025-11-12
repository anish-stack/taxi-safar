import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Updates from 'expo-updates';

export default function OlyoxAppUpdate({ children }) {
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        autoUpdate();
    }, []);

    const autoUpdate = async () => {
        try {
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                setIsUpdating(true);
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
            }
        } catch (err) {
            console.log("Auto update failed:", err);
        }
    };

    if (isUpdating) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
});
