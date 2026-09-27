import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addActiveRunPoint,
  getActiveRunPoints,
  clearActiveRunPoints,
} from '@/lib/db';

// Name shared between defineTask() below and every start/stop call — this
// is how iOS knows which JS handler to invoke when a location update
// arrives, including when it's relaunching the app fresh in the
// background to deliver one.
export const RUN_LOCATION_TASK = 'valhalla-run-tracking';

const RUN_START_TIME_KEY = 'active_run_start_time';

// IMPORTANT: this must run at module scope, not inside a component or
// function — and this file must be imported somewhere that always runs at
// app startup (e.g. the root layout), even if the app is being launched
// fresh by iOS specifically to deliver a background location update with
// no UI ever shown. If this task isn't registered by the time that
// happens, the update is silently dropped.
TaskManager.defineTask(RUN_LOCATION_TASK, async  ({ data, error }) => {
  if (error) {
    console.warn('[runTracking] location task error:', error.message);
    return;
  }
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  if (!locations || locations.length === 0) return;

  // Written straight to SQLite, not component/store state — this handler
  // can run in a JS context with no React tree mounted at all, so state
  // that only lives in memory would simply vanish.
  for (const loc of locations) {
    addActiveRunPoint(loc.coords.latitude, loc.coords.longitude, loc.timestamp);
  }
});

export interface LocationPermissionResult {
  foregroundGranted: boolean;
  backgroundGranted: boolean;
}

// Foreground permission must be requested (and granted) before background
// permission can even be asked for — iOS requires that ordering. A denied
// background permission isn't necessarily fatal to the caller: it just
// means tracking will pause if the screen locks or the app backgrounds,
// which the UI should tell the user about rather than fail silently.
export async function requestLocationPermissions(): Promise<LocationPermissionResult> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    return { foregroundGranted: false, backgroundGranted: false };
  }
  const bg = await Location.requestBackgroundPermissionsAsync();
  return { foregroundGranted: true, backgroundGranted: bg.status === 'granted' };
}

// Resumes correctly even if the app process was killed and relaunched
// mid-run (e.g. iOS reclaiming memory in the background) — the OS-level
// location task keeps running independent of the app's JS lifecycle, so
// this just asks iOS directly rather than trusting any in-memory flag.
export async function isRunTrackingActive(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(RUN_LOCATION_TASK).then(registered => {
    if (!registered) return false;
    return Location.hasStartedLocationUpdatesAsync(RUN_LOCATION_TASK);
  });
}

// Clears any leftover points from a previous run (in case a prior run
// wasn't cleanly finished/discarded), stamps the start time, and starts
// the OS-level background location updates.
export async function startRunTracking(): Promise<void> {
  await clearActiveRunPoints();
  await AsyncStorage.setItem(RUN_START_TIME_KEY, String(Date.now()));

  await Location.startLocationUpdatesAsync(RUN_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 3000, // ms — a floor, not a guarantee; iOS may throttle further
    distanceInterval: 5, // meters — skip updates smaller than real GPS noise
    showsBackgroundLocationIndicator: true, // the iOS blue bar — required for background use to be transparent, not optional to hide
    pausesUpdatesAutomatically: false, // a runner standing still (red light, water stop) shouldn't silently end tracking
  });
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Standard great-circle distance between two lat/lng points, in meters.
// Good enough for run-tracking purposes at the point density GPS produces
// here (a few meters apart) — no need for anything more sophisticated.
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000; // Earth radius, meters
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Sums point-to-point distance across the whole route. Called both live
// (so the tracking screen can show a running total) and once at the end
// to get the final saved distance — same function, so the two numbers
// can never disagree with each other.
export function calculateRouteDistanceMeters(points: { lat: number; lng: number }[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1], points[i]);
  }
  return total;
}

export interface RunSummary {
  points: { lat: number; lng: number; t: number }[];
  distanceMeters: number;
  durationSeconds: number;
}

// Stops the OS-level tracking, reads back everything the background task
// wrote during the run, computes final distance/duration, and clears the
// buffer for next time. The caller is responsible for actually saving
// this (via recordWorkout) — this function's only job is stopping
// tracking and handing back what happened.
export async function stopRunTracking(): Promise<RunSummary> {
  const registered = await TaskManager.isTaskRegisteredAsync(RUN_LOCATION_TASK);
  if (registered) {
    await Location.stopLocationUpdatesAsync(RUN_LOCATION_TASK);
  }

  const rows = getActiveRunPoints();
  const points = rows.map(r => ({ lat: r.lat, lng: r.lng, t: r.timestamp }));

  const startTimeRaw = await AsyncStorage.getItem(RUN_START_TIME_KEY);
  const startTime = startTimeRaw ? parseInt(startTimeRaw, 10) : (points[0]?.t ?? Date.now());
  const endTime = points.length > 0 ? points[points.length - 1].t : Date.now();
  const durationSeconds = Math.max(0, Math.round((endTime - startTime) / 1000));

  const distanceMeters = calculateRouteDistanceMeters(points);

  clearActiveRunPoints();
  await AsyncStorage.removeItem(RUN_START_TIME_KEY);

  return { points, distanceMeters, durationSeconds };
}

// For the "app relaunched mid-run" recovery case — lets a screen that
// mounts and discovers tracking is already active reconstruct where
// things stand without stopping anything.
export async function getInProgressRunSnapshot(): Promise<{ points: { lat: number; lng: number; t: number }[]; distanceMeters: number; startTime: number | null }> {
  const rows = getActiveRunPoints();
  const points = rows.map(r => ({ lat: r.lat, lng: r.lng, t: r.timestamp }));
  const startTimeRaw = await AsyncStorage.getItem(RUN_START_TIME_KEY);
  return {
    points,
    distanceMeters: calculateRouteDistanceMeters(points),
    startTime: startTimeRaw ? parseInt(startTimeRaw, 10) : null,
  };
}