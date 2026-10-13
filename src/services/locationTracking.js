import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import client, { endpoints } from '../api/client';

// Last saved entry ke time + 2 ghante hote hi current location save hoti hai.
// "Due hai ya nahi" ka faisla server karta hai (GET /punch-in/tracking-status/).
export const TRACK_TASK = 'ATTENDANCE_TRACK_TASK';

let syncing = false; // ek saath 2 sync na chalein

export const syncLocationIfDue = async () => {
  if (syncing) return;
  syncing = true;
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return;

    const { data: status } = await client.get(endpoints.punchTrackingStatus);

    if (!status?.active) {
      await stopAttendanceLocationTracking();
      return;
    }
    if (!status.due_now) return;

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    await client.put(endpoints.punchLocation, {
      location: `${pos.coords.latitude},${pos.coords.longitude}`,
    });
  } catch (error) {
    console.log('Location sync failed:', error?.message || error);
    throw error;
  } finally {
    syncing = false;
  }
};

// Top-level pe define hona zaroori hai (App.js me import karne se ye chal jata hai)
TaskManager.defineTask(TRACK_TASK, async () => {
  try {
    await syncLocationIfDue();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (e) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const startAttendanceLocationTracking = async () => {
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') return false;

    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== 'granted') return false;

    const registered = await TaskManager.isTaskRegisteredAsync(TRACK_TASK);
    if (!registered) {
      await BackgroundFetch.registerTaskAsync(TRACK_TASK, {
        minimumInterval: 15 * 60, // seconds, Android minimum 15 min
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
    return true;
  } catch (error) {
    console.log('Start tracking failed:', error?.message || error);
    return false;
  }
};

export const stopAttendanceLocationTracking = async () => {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(TRACK_TASK);
    if (registered) await BackgroundFetch.unregisterTaskAsync(TRACK_TASK);
  } catch (error) {
    console.log('Stop tracking failed:', error?.message || error);
  }
  return true;
};

export default {
  startAttendanceLocationTracking,
  stopAttendanceLocationTracking,
  syncLocationIfDue,
};