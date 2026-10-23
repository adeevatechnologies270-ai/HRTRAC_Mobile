import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCATION_TASK_NAME = 'hrtrac-duty-location';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }) => {
    if (error || !data) {
      console.warn('Location task error:', error?.message);
      return;
    }

    const { locations } = data;

    // Apne existing AuthContext ke actual storage keys
    // ke according token key update karein.
    const token = await AsyncStorage.getItem('access_token');

    if (!token || !API_BASE_URL) return;

    for (const location of locations ?? []) {
      const { latitude, longitude } = location.coords;

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/tracking/location/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              latitude,
              longitude,
              accuracy: location.coords.accuracy,
              speed: location.coords.speed,
              recorded_at: new Date(
                location.timestamp
              ).toISOString(),
            }),
          }
        );

        if (!response.ok) {
          console.warn(
            'Location upload failed:',
            response.status
          );
        }
      } catch (err) {
        // Production mein failed locations ko local queue
        // mein store karke connectivity aane par retry karein.
        console.warn('Location upload error:', err.message);
      }
    }
  }
);