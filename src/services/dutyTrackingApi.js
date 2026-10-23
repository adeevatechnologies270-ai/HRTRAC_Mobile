
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
const TRACKING_URL = `${BASE_URL}/api/tracking`;

async function request(path, method = 'POST', body = undefined) {
  if (!BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured.');
  }

  const token = await AsyncStorage.getItem('access_token');

  if (!token) {
    throw new Error('Authentication token not found.');
  }

  const response = await fetch(`${TRACKING_URL}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || 'Invalid server response.' };
  }

  if (!response.ok) {
    throw new Error(data.error || data.detail || 'Tracking request failed.');
  }

  return data;
}

export const startTrackingSession = () => request('start/');

export const stopTrackingSession = () => request('stop/');

export const uploadTrackingLocation = ({
  latitude,
  longitude,
  accuracy,
  speed,
  recorded_at,
}) =>
  request('location/', 'POST', {
    latitude,
    longitude,
    accuracy,
    speed,
    recorded_at,
  });

export const getLiveLocations = () => request('live/', 'GET');
