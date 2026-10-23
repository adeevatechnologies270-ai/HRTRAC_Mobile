import * as Location from 'expo-location';
import { LOCATION_TASK_NAME } from './locationTask';

export async function startDutyTracking() {
  const foreground =
    await Location.requestForegroundPermissionsAsync();

  if (foreground.status !== 'granted') {
    throw new Error('Location permission is required.');
  }

  const background =
    await Location.requestBackgroundPermissionsAsync();

  if (background.status !== 'granted') {
    throw new Error(
      'Please allow background location in app settings.'
    );
  }

  const alreadyStarted =
    await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );

  if (alreadyStarted) return;

  await Location.startLocationUpdatesAsync(
    LOCATION_TASK_NAME,
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000,
      distanceInterval: 10,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: 'HRTRAC duty tracking active',
        notificationBody:
          'Your location is being shared during your active duty.',
        killServiceOnDestroy: false,
      },
    }
  );
}

export async function stopDutyTracking() {
  const started =
    await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );

  if (started) {
    await Location.stopLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );
  }
}