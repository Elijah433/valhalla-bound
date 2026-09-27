import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, AppState, Animated } from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useWarriorStore } from '@/lib/store';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';
import { getActiveRunPoints } from '@/lib/db';
import {
  requestLocationPermissions,
  startRunTracking,
  stopRunTracking,
  isRunTrackingActive,
  getInProgressRunSnapshot,
  calculateRouteDistanceMeters,
  type RunSummary,
} from '@/lib/runTracking';

const METERS_PER_MILE = 1609.344;
const POLL_INTERVAL_MS = 2000;

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatPace(distanceMiles: number, durationSeconds: number): string {
  // Guard against GPS jitter while stationary — a few feet of drift while
  // standing still (or just before the first real step) registers as a
  // tiny non-zero distance, which used to blow up into something like
  // "293:23 / mi". Below ~0.02mi there's no meaningful pace yet, so show a
  // placeholder instead of doing the division.
  if (distanceMiles < 0.02 || durationSeconds <= 0) return '--:--';
  const paceSecondsPerMile = durationSeconds / distanceMiles;
  const m = Math.floor(paceSecondsPerMile / 60);
  const s = Math.round(paceSecondsPerMile % 60);
  return `${m}:${String(s).padStart(2, '0')} /mi`;
}

// No pause/resume in this first version — start, run, finish. Pausing GPS
// tracking mid-run reliably (without losing the background task or
// confusing the duration math) is its own can of worms; keeping v1 simple
// on purpose rather than half-building pause support.
type Phase = 'idle' | 'tracking' | 'finished';

// Speaks a per-mile split the moment each mile is crossed — splitSeconds
// is the time taken since the PREVIOUS mile mark (or since start, for mile
// 1), not the average pace since the beginning of the run. That matches
// what real running apps announce and is more useful mid-run: it tells you
// how THIS mile went, not a slowly-drifting average.
function speakMileSplit(mileMark: number, splitSeconds: number) {
  const m = Math.floor(splitSeconds / 60);
  const s = Math.round(splitSeconds % 60);
  const paceText = s > 0
    ? `${m} minute${m === 1 ? '' : 's'} ${s} second${s === 1 ? '' : 's'} per mile`
    : `${m} minute${m === 1 ? '' : 's'} per mile`;
  Speech.speak(`Mile ${mileMark} complete. Pace: ${paceText}.`, { rate: 0.98 });
}

export default function TrackRunModal() {
  const { recordWorkout } = useWarriorStore();
  const mapRef = useRef<MapView>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const finishedFadeAnim = useRef(new Animated.Value(0)).current;
  // Which whole mile has already been announced, and the elapsed-seconds
  // mark it was announced at — refs, not state, so refreshFromDb() (called
  // from a setInterval that isn't recreated on every render) always reads
  // the latest values instead of a stale closure.
  const lastAnnouncedMileRef = useRef(0);
  const lastMileMarkElapsedRef = useRef(0);
  const audioMutedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>('idle');
  const [points, setPoints] = useState<{ lat: number; lng: number; t: number }[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finishedSummary, setFinishedSummary] = useState<RunSummary | null>(null);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);

  // Recover an already-in-progress run if this screen mounts after the app
  // was killed and relaunched mid-run — background tracking keeps running
  // at the OS level independent of this screen's own lifecycle, so on
  // mount we ask the OS directly rather than assuming a fresh start.
  useEffect(() => {
    (async () => {
      const active = await isRunTrackingActive();
      if (active) {
        const snapshot = await getInProgressRunSnapshot();
        setPoints(snapshot.points);
        setDistanceMeters(snapshot.distanceMeters);
        startTimeRef.current = snapshot.startTime;
        let recoveredElapsed = 0;
        if (snapshot.startTime) {
          recoveredElapsed = Math.max(0, Math.round((Date.now() - snapshot.startTime) / 1000));
          setElapsedSeconds(recoveredElapsed);
        }
        // Don't re-announce miles already crossed before this screen
        // remounted (e.g. app was relaunched mid-run) — start counting
        // splits from wherever the run actually is right now.
        lastAnnouncedMileRef.current = Math.floor(snapshot.distanceMeters / METERS_PER_MILE);
        lastMileMarkElapsedRef.current = recoveredElapsed;
        setPhase('tracking');
        beginPolling();
        return;
      }
      // Not tracking yet — try a one-time silent location check (no
      // permission prompt) just to center the map sensibly before the
      // user taps Start, rather than defaulting to some arbitrary spot.
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setInitialRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        } catch (e) {}
      }
    })();
    return () => {
      stopPolling();
      Speech.stop();
    };
  }, []);

  // If the app was backgrounded mid-run (tracking keeps going regardless)
  // and the user comes back to this screen, refresh immediately instead of
  // waiting up to POLL_INTERVAL_MS for the next scheduled tick.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && phase === 'tracking') {
        refreshFromDb();
      }
    });
    return () => sub.remove();
  }, [phase]);

  // Pulses the "LIVE TRACKING" indicator dot while a run is active, so the
  // header reads as alive rather than a static label — stops cleanly (and
  // resets to fully visible) the moment tracking isn't happening.
  useEffect(() => {
    if (phase === 'tracking') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.25, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.setValue(1);
  }, [phase]);

  // Small fade-in for the Save/Discard row so the finished state doesn't
  // just snap into place.
  useEffect(() => {
    if (phase === 'finished') {
      finishedFadeAnim.setValue(0);
      Animated.timing(finishedFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [phase]);

  function refreshFromDb() {
    const rows = getActiveRunPoints();
    const pts = rows.map(r => ({ lat: r.lat, lng: r.lng, t: r.timestamp }));
    const newDistanceMeters = calculateRouteDistanceMeters(pts);
    setPoints(pts);
    setDistanceMeters(newDistanceMeters);

    let elapsedNow = 0;
    if (startTimeRef.current) {
      elapsedNow = Math.max(0, Math.round((Date.now() - startTimeRef.current) / 1000));
      setElapsedSeconds(elapsedNow);
    }

    // Audio mile-split announcements — fires the moment cumulative
    // distance crosses a new whole mile. mileMark only ever increases, so
    // this can't double-announce the same mile even if refreshFromDb runs
    // more often than once per mile crossing.
    const mileMark = Math.floor(newDistanceMeters / METERS_PER_MILE);
    if (mileMark > lastAnnouncedMileRef.current && mileMark >= 1) {
      const splitSeconds = Math.max(1, elapsedNow - lastMileMarkElapsedRef.current);
      lastAnnouncedMileRef.current = mileMark;
      lastMileMarkElapsedRef.current = elapsedNow;
      if (!audioMutedRef.current) {
        speakMileSplit(mileMark, splitSeconds);
      }
    }

    if (pts.length > 0 && mapRef.current) {
      const last = pts[pts.length - 1];
      // animateToRegion (not animateCamera) so the zoom level gets
      // enforced on every tick too, not just the center point — otherwise
      // a run that starts before the map ever had an initialRegion (e.g.
      // a first-time user who hasn't granted location yet when this
      // screen mounts) stays at MapKit's default whole-continent zoom for
      // the entire run, with just a tiny dot crawling across it.
      mapRef.current.animateToRegion(
        {
          latitude: last.lat,
          longitude: last.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  }

  function beginPolling() {
    stopPolling();
    pollRef.current = setInterval(refreshFromDb, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handleStart() {
    const perms = await requestLocationPermissions();
    if (!perms.foregroundGranted) {
      Alert.alert('Location Needed', 'Valhalla Bound needs location access to track your run.');
      return;
    }
    if (!perms.backgroundGranted) {
      Alert.alert(
        'Background Location Off',
        'Tracking will pause if you lock your phone or leave the app. For uninterrupted tracking, enable "Always" location access in Settings.'
      );
    }
    await startRunTracking();
    startTimeRef.current = Date.now();
    setPoints([]);
    setDistanceMeters(0);
    setElapsedSeconds(0);
    lastAnnouncedMileRef.current = 0;
    lastMileMarkElapsedRef.current = 0;
    setPhase('tracking');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    beginPolling();
  }

  async function handleFinish() {
    stopPolling();
    Speech.stop();
    const summary = await stopRunTracking();
    setFinishedSummary(summary);
    setPhase('finished');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function toggleAudioMute() {
    const next = !audioMuted;
    setAudioMuted(next);
    audioMutedRef.current = next;
    if (next) Speech.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleSave() {
    if (!finishedSummary) return;
    const durationMinutes = Math.max(1, Math.round(finishedSummary.durationSeconds / 60));
    recordWorkout(
      'endurance',
      undefined,
      durationMinutes,
      finishedSummary.distanceMeters,
      finishedSummary.points,
      true
    );
    router.back();
  }

  function handleDiscardFinished() {
    Alert.alert('Discard Run?', 'This run will not be saved.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  function handleClose() {
    if (phase === 'tracking') {
      Alert.alert('End Run?', 'Stop tracking and discard this run?', [
        { text: 'Keep Running', style: 'cancel' },
        {
          text: 'Discard Run',
          style: 'destructive',
          onPress: async () => {
            stopPolling();
            Speech.stop();
            await stopRunTracking();
            router.back();
          },
        },
      ]);
      return;
    }
    router.back();
  }

  const liveDistanceMiles = distanceMeters / METERS_PER_MILE;
  const isFinished = phase === 'finished' && finishedSummary;
  const displaySeconds = isFinished ? finishedSummary!.durationSeconds : elapsedSeconds;
  const displayDistanceMiles = isFinished
    ? finishedSummary!.distanceMeters / METERS_PER_MILE
    : liveDistanceMiles;
  const displayPoints = isFinished ? finishedSummary!.points : points;

  const eyebrowText = phase === 'tracking' ? 'LIVE TRACKING' : phase === 'finished' ? 'RAID COMPLETE' : 'READY TO RAID';

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View>
              <View style={styles.eyebrowRow}>
                {phase === 'tracking' && (
                  <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
                )}
                <Text style={styles.eyebrow}>{eyebrowText}</Text>
              </View>
              <Text style={styles.title}>THE LONG RAID</Text>
            </View>
            <View style={styles.headerBtnRow}>
              {phase !== 'finished' && (
                <TouchableOpacity style={styles.closeBtn} onPress={toggleAudioMute} activeOpacity={0.8}>
                  <Text style={styles.closeBtnText}>{audioMuted ? '🔇' : '🔊'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.8}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.mapWrap, phase === 'tracking' && styles.mapWrapActive]}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion ?? undefined}
            showsUserLocation
          >
            {displayPoints.length > 1 && (
              <Polyline
                coordinates={displayPoints.map(p => ({ latitude: p.lat, longitude: p.lng }))}
                strokeColor={Colors.gold}
                strokeWidth={4}
              />
            )}
          </MapView>
          <LinearGradient
            colors={['rgba(5,5,8,0.5)', 'transparent']}
            style={styles.mapFadeTop}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', 'rgba(5,5,8,0.5)']}
            style={styles.mapFadeBottom}
            pointerEvents="none"
          />
        </View>

        <View style={styles.statsCard}>
          <View style={styles.heroStat}>
            <Text style={styles.heroValue}>{displayDistanceMiles.toFixed(2)}</Text>
            <Text style={styles.heroUnit}>MILES</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.subStatsRow}>
            <View style={styles.subStat}>
              <Text style={styles.subStatLabel}>TIME</Text>
              <Text style={styles.subStatValue}>{formatDuration(displaySeconds)}</Text>
            </View>
            <View style={styles.subStatDivider} />
            <View style={styles.subStat}>
              <Text style={styles.subStatLabel}>PACE</Text>
              <Text style={styles.subStatValue}>{formatPace(displayDistanceMiles, displaySeconds)}</Text>
            </View>
          </View>
        </View>

        {phase === 'idle' && (
          <TouchableOpacity style={[styles.primaryBtn, styles.glowShadow]} onPress={handleStart} activeOpacity={0.85}>
            <LinearGradient
              colors={[Colors.goldDark, Colors.gold]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Text style={styles.primaryBtnText}>START RUN →</Text>
          </TouchableOpacity>
        )}

        {phase === 'tracking' && (
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} activeOpacity={0.85}>
            <Text style={styles.finishBtnText}>FINISH RUN</Text>
          </TouchableOpacity>
        )}

        {isFinished && (
          <Animated.View style={[styles.finishedRow, { opacity: finishedFadeAnim }]}>
            <TouchableOpacity style={styles.discardBtn} onPress={handleDiscardFinished} activeOpacity={0.85}>
              <Text style={styles.discardBtnText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, styles.glowShadow]} onPress={handleSave} activeOpacity={0.85}>
              <LinearGradient
                colors={[Colors.goldDark, Colors.gold]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={styles.saveBtnText}>SAVE RAID →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  handle: {
    width: 40, height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  liveDot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gold,
    marginRight: 6,
  },
  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 4,
    color: Colors.ice,
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    color: Colors.text,
    letterSpacing: 1,
  },
  closeBtn: {
    width: 34, height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },

  mapWrap: {
    flex: 1,
    marginHorizontal: Spacing.lg,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mapWrapActive: {
    borderColor: Colors.goldBorder,
  },
  mapFadeTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 48,
  },
  mapFadeBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 48,
  },

  statsCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroStat: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroValue: {
    fontFamily: Fonts.heading,
    fontSize: 56,
    color: Colors.text,
    letterSpacing: 1,
  },
  heroUnit: {
    fontFamily: Fonts.body,
    fontSize: 10,
    letterSpacing: 3,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statsDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: Spacing.md,
  },
  subStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  subStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  subStatLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.textMuted,
  },
  subStatValue: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Colors.text,
  },

  glowShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },

  primaryBtn: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.void,
    letterSpacing: 2,
  },

  finishBtn: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(224,80,32,0.5)',
    backgroundColor: 'rgba(224,80,32,0.1)',
    padding: Spacing.lg,
    alignItems: 'center',
  },
  finishBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: '#E05020',
    letterSpacing: 2,
  },

  finishedRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  discardBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  discardBtnText: {
    fontFamily: Fonts.subheading,
    fontSize: 13,
    color: Colors.textMuted,
  },
  saveBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.void,
    letterSpacing: 2,
  },
});