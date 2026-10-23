
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import {
  startTrackingSession,
  stopTrackingSession,
  uploadTrackingLocation,
} from './dutyTrackingApi';

export const TRACK_TASK = 'ATTENDANCE_TRACK_TASK';

let starting = false;
let stopping = false;
let uploading = false;

async function uploadPosition(position) {
  const coords = position.coords;

  await uploadTrackingLocation({
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy ?? null,
    speed: coords.speed ?? null,
    recorded_at: new Date(
      position.timestamp || Date.now()
    ).toISOString(),
  });
}

// Task definition module ke top level par honi chahiye.
TaskManager.defineTask(TRACK_TASK, async ({ data, error }) => {
  if (error) {
    console.log('Background GPS error:', error.message);
    return;
  }

  const locations = data?.locations || [];

  for (const location of locations) {
    try {
      await uploadPosition(location);
    } catch (e) {
      console.log('GPS upload failed:', e?.message || e);
    }
  }
});

export const startAttendanceLocationTracking = async () => {
  if (starting) return false;
  starting = true;

  try {
    const foreground =
      await Location.requestForegroundPermissionsAsync();

    if (foreground.status !== 'granted') {
      console.log('Foreground location permission denied.');
      return false;
    }

    const background =
      await Location.requestBackgroundPermissionsAsync();

    if (background.status !== 'granted') {
      console.log('Background location permission denied.');
      return false;
    }

    // Server session start karein.
    await startTrackingSession();

    const alreadyRunning =
      await Location.hasStartedLocationUpdatesAsync(TRACK_TASK);

    if (!alreadyRunning) {
      try {
        await Location.startLocationUpdatesAsync(TRACK_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 20,
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,

          // Android par background location ke liye
          // foreground notification dikhayi jayegi.
          foregroundService: {
            notificationTitle: 'HRTRAC duty tracking active',
            notificationBody:
              'Your location is being recorded during duty.',
            notificationColor: '#173B7A',
          },
        });
      } catch (error) {
        // Native GPS start fail ho to server session band karne
        // ki koshish karein.
        try {
          await stopTrackingSession();
        } catch {}

        throw error;
      }
    }

    return true;
  } catch (error) {
    console.log('Start tracking failed:', error?.message || error);
    return false;
  } finally {
    starting = false;
  }
};

export const stopAttendanceLocationTracking = async () => {
  if (stopping) return true;
  stopping = true;

  try {
    const running =
      await Location.hasStartedLocationUpdatesAsync(TRACK_TASK);

    if (running) {
      await Location.stopLocationUpdatesAsync(TRACK_TASK);
    }
  } catch (error) {
    console.log('Stopping local GPS failed:', error?.message || error);
  }

  try {
    await stopTrackingSession();
  } catch (error) {
    console.log('Stopping server tracking failed:', error?.message || error);
  } finally {
    stopping = false;
  }

  return true;
};

// Purane screen imports ke saath compatibility.
// Manual refresh ya existing periodic call par ek location upload hoti hai.
export const syncLocationIfDue = async () => {
  if (uploading) return;

  uploading = true;

  try {
    const running =
      await Location.hasStartedLocationUpdatesAsync(TRACK_TASK);

    if (!running) return;

    const permission =
      await Location.getForegroundPermissionsAsync();

    if (permission.status !== 'granted') return;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    await uploadPosition(position);
  } catch (error) {
    console.log('Location sync failed:', error?.message || error);
  } finally {
    uploading = false;
  }
};

export default {
  startAttendanceLocationTracking,
  stopAttendanceLocationTracking,
  syncLocationIfDue,
};
