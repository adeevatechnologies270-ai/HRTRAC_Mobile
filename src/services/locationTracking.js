import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client, { endpoints } from '../api/client';

// Records a location point on the active punch roughly every 2 hours while
// the app is running. Uses the existing backend route:
//   PUT /punch-in-update/<punch_id>/  { location: "lat,lng", time: ISO }
const INTERVAL_MS = 2 * 60 * 60 * 1000;
let timer = null;

const getActivePunchId = async () => {
  const userId = await AsyncStorage.getItem('userId');
  if (!userId) return null;
  const { data } = await client.get(endpoints.punchesByUser(userId));
  const list = Array.isArray(data) ? data : data?.results || [];
  const active = list
    .filter(p => !p.punch_out_time)
    .sort((a, b) => new Date(b.punch_time) - new Date(a.punch_time))[0];
  return active?.id || null;
};

const sendPing = async () => {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return;
    const punchId = await getActivePunchId();
    if (!punchId) {
      await stopAttendanceLocationTracking();
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await client.put(`/punch-in-update/${punchId}/`, {
      location: `${pos.coords.latitude},${pos.coords.longitude}`,
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.log('Location ping failed:', error?.message || error);
  }
};

export const startAttendanceLocationTracking = async () => {
  await stopAttendanceLocationTracking();
  timer = setInterval(sendPing, INTERVAL_MS);
  return true;
};

export const stopAttendanceLocationTracking = async () => {
  if (timer) clearInterval(timer);
  timer = null;
  return true;
};

export default { startAttendanceLocationTracking, stopAttendanceLocationTracking };