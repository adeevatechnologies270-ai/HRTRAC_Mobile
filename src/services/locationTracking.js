import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startTrackingSession, stopTrackingSession, uploadTrackingLocation } from './dutyTrackingApi';

export const TRACK_TASK = 'ATTENDANCE_TRACK_TASK';
let starting = false;
let stopping = false;
let uploading = false;

const apiBase = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');

async function uploadPosition(position) {
  const coords = position?.coords;
  if (!coords || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return;
  await uploadTrackingLocation({
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy ?? null,
    speed: coords.speed ?? null,
    recorded_at: new Date(position.timestamp || Date.now()).toISOString(),
  });
}

// Define exactly one background task. Keep this at module top-level.
if (!TaskManager.isTaskDefined(TRACK_TASK)) {
  TaskManager.defineTask(TRACK_TASK, async ({ data, error }) => {
    if (error) {
      console.warn('Background GPS error:', error.message || error);
      return;
    }
    const token = await AsyncStorage.getItem('access_token');
    if (!token || !apiBase) return;
    for (const location of data?.locations || []) {
      try {
        const coords = location.coords || {};
        const response = await fetch(`${apiBase}/api/tracking/location/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy ?? null,
            speed: coords.speed ?? null,
            recorded_at: new Date(location.timestamp || Date.now()).toISOString(),
          }),
        });
        if (!response.ok) console.warn('Background location upload failed:', response.status, await response.text());
      } catch (e) {
        console.warn('Background location upload error:', e?.message || e);
      }
    }
  });
}

export async function startAttendanceLocationTracking() {
  if (starting) return false;
  starting = true;
  let serverStarted = false;
  try {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== 'granted') throw new Error('Foreground location permission is required.');
    const background = await Location.requestBackgroundPermissionsAsync();
    if (background.status !== 'granted') throw new Error('Allow background location in app settings to track during duty.');

    // Start the server session first; Django returns the existing active session if one exists.
    await startTrackingSession();
    serverStarted = true;

    const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(TRACK_TASK);
    if (!alreadyRunning) {
      await Location.startLocationUpdatesAsync(TRACK_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 15000,
        distanceInterval: 10,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'HRTRAC duty tracking active',
          notificationBody: 'Your location is shared with authorized HRTRAC administrators during active duty.',
          notificationColor: '#173B7A',
          killServiceOnDestroy: false,
        },
      });
    }
    // Upload a fresh point immediately instead of waiting for the first background callback.
    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await uploadPosition(current);
    } catch (e) { console.warn('Initial location upload failed:', e?.message || e); }
    return true;
  } catch (error) {
    console.warn('Start tracking failed:', error?.message || error);
    if (serverStarted) {
      try { await stopTrackingSession(); } catch (e) { console.warn('Session rollback failed:', e?.message || e); }
    }
    return false;
  } finally {
    starting = false;
  }
}

export async function stopAttendanceLocationTracking() {
  if (stopping) return true;
  stopping = true;
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(TRACK_TASK);
    if (running) await Location.stopLocationUpdatesAsync(TRACK_TASK);
  } catch (e) {
    console.warn('Stopping local GPS failed:', e?.message || e);
  }
  try {
    await stopTrackingSession();
  } catch (e) {
    console.warn('Stopping server tracking failed:', e?.message || e);
  } finally {
    stopping = false;
  }
  return true;
}

export async function syncLocationIfDue() {
  if (uploading) return;
  uploading = true;
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(TRACK_TASK);
    if (!running) return;
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted') return;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    await uploadPosition(position);
  } catch (e) {
    console.warn('Location sync failed:', e?.message || e);
  } finally { uploading = false; }
}

export default { startAttendanceLocationTracking, stopAttendanceLocationTracking, syncLocationIfDue };