// One location stream for the meter and the driver heartbeat. On Android builds with
// background location it runs as a foreground service, so it keeps going with the screen
// off; elsewhere (Expo Go, web) it falls back to a foreground watch.
import type { GpsFix } from '@thozhan/meter';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

const TASK = 'thozhan-location';
const listeners = new Set<(fix: GpsFix) => void>();

const toFix = (l: Location.LocationObject): GpsFix => ({
  lat: l.coords.latitude,
  lon: l.coords.longitude,
  accuracyMeters: l.coords.accuracy ?? 50,
  timestamp: l.timestamp,
  ...(l.mocked ? { isMock: true } : {}),
});

if (Platform.OS !== 'web') {
  // Must run at import time, before React renders, so Android can wake the task.
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
    if (error || !data) return;
    for (const l of data.locations) for (const cb of listeners) cb(toFix(l));
  });
}

export async function hasPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function currentFix(): Promise<GpsFix | null> {
  try {
    if (!(await hasPermission())) return null;
    const l = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
    return l ? toFix(l) : null;
  } catch {
    return null;
  }
}

export interface Tracking {
  stop(): void;
  /** True when updates continue with the screen off. */
  background: boolean;
}

/** Streams fixes to `cb` about once a second until stopped. */
export async function track(cb: (fix: GpsFix) => void, notice: { title: string; body: string }): Promise<Tracking | null> {
  if (!(await hasPermission())) return null;
  listeners.add(cb);
  if (Platform.OS !== 'web') {
    try {
      const bg = await Location.requestBackgroundPermissionsAsync();
      if (bg.status === 'granted') {
        if (!(await Location.hasStartedLocationUpdatesAsync(TASK))) {
          await Location.startLocationUpdatesAsync(TASK, {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 0,
            pausesUpdatesAutomatically: false,
            foregroundService: { notificationTitle: notice.title, notificationBody: notice.body, notificationColor: '#174a3b' },
          });
        }
        return {
          background: true,
          stop() {
            listeners.delete(cb);
            if (!listeners.size) Location.stopLocationUpdatesAsync(TASK).catch(() => {});
          },
        };
      }
    } catch {
      // Expo Go and some devices cannot run the background service: fall through.
    }
  }
  const sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 }, (l) =>
    cb(toFix(l)),
  );
  return {
    background: false,
    stop() {
      listeners.delete(cb);
      sub.remove();
    },
  };
}
