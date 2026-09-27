import { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Animated, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  startFast, getActiveFast, endFast, getRecentFasts,
  type FastingLog,
} from '@/lib/db';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const PROTOCOLS = [
  { hours: 16, label: '16:8', sub: 'Most popular' },
  { hours: 18, label: '18:6', sub: 'Intermediate' },
  { hours: 20, label: '20:4', sub: 'Warrior diet' },
  { hours: 24, label: 'OMAD', sub: 'One meal a day' },
];

function formatDuration(ms: number): { h: string; m: string; s: string } {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { h: String(h).padStart(2, '0'), m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0') };
}

export default function FastingScreen() {
  const [activeFast, setActiveFast] = useState<FastingLog | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState(16);
  const [now, setNow] = useState(Date.now());
  const [history, setHistory] = useState<FastingLog[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    loadState();

    // Ticks once a second only while a fast is actually running — no
    // point re-rendering every second when nothing's counting.
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  function loadState() {
    setActiveFast(getActiveFast());
    setHistory(getRecentFasts(10));
  }

  function handleStart() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startFast(selectedProtocol);
    loadState();
  }

  function handleEnd() {
    if (!activeFast) return;
    Alert.alert('End your fast?', 'This will close your current fasting window.', [
      { text: 'Keep Fasting', style: 'cancel' },
      {
        text: 'End Fast',
        style: 'destructive',
        onPress: () => {
          endFast(activeFast.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadState();
        },
      },
    ]);
  }

  // parseUtcTimestamp — SQLite's datetime('now') has no timezone marker,
  // so JS would otherwise parse it as local time instead of UTC.
  function parseUtcTimestamp(ts: string): Date {
    return new Date(ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z');
  }

  const elapsedMs = activeFast ? now - parseUtcTimestamp(activeFast.start_time).getTime() : 0;
  const plannedMs = activeFast ? activeFast.planned_hours * 3600 * 1000 : 0;
  const progress = activeFast ? Math.min(elapsedMs / plannedMs, 1) : 0;
  const isComplete = activeFast ? elapsedMs >= plannedMs : false;
  const { h, m, s } = formatDuration(elapsedMs);
  const remainingMs = Math.max(0, plannedMs - elapsedMs);
  const remaining = formatDuration(remainingMs);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0A0812', '#050508']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>INTERMITTENT FASTING</Text>
          <View style={{ width: 36 }} />
        </View>

        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

            {activeFast ? (
              <View style={styles.timerCard}>
                <LinearGradient colors={[isComplete ? 'rgba(76,175,80,0.1)' : 'rgba(201,168,76,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
                <Text style={[styles.timerStatus, { color: isComplete ? '#4CAF50' : Colors.gold }]}>
                  {isComplete ? 'GOAL REACHED' : 'FASTING'}
                </Text>
                <Text style={styles.timerClock}>{h}:{m}:{s}</Text>
                <Text style={styles.timerSub}>
                  {isComplete
                    ? `${activeFast.planned_hours}h goal complete — keep going or end now`
                    : `${remaining.h}:${remaining.m}:${remaining.s} until your ${activeFast.planned_hours}h goal`}
                </Text>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]}>
                    <LinearGradient
                      colors={isComplete ? ['#4CAF50', '#8BC34A'] : [Colors.goldDark, Colors.gold]}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.endBtn} onPress={handleEnd} activeOpacity={0.85}>
                  <Text style={styles.endBtnText}>END FAST</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.startCard}>
                <LinearGradient colors={['rgba(201,168,76,0.06)', 'transparent']} style={StyleSheet.absoluteFill} />
                <Text style={styles.startCardTitle}>CHOOSE YOUR WINDOW</Text>

                <View style={styles.protocolGrid}>
                  {PROTOCOLS.map((p) => {
                    const isSelected = selectedProtocol === p.hours;
                    return (
                      <TouchableOpacity
                        key={p.hours}
                        style={[styles.protocolCard, isSelected && styles.protocolCardSelected]}
                        onPress={() => { setSelectedProtocol(p.hours); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.protocolLabel, isSelected && { color: Colors.gold }]}>{p.label}</Text>
                        <Text style={styles.protocolSub}>{p.sub}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.88}>
                  <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                  <Text style={styles.startBtnText}>START FAST →</Text>
                </TouchableOpacity>
              </View>
            )}

            {history.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.historyTitle}>RECENT FASTS</Text>
                {history.map((f) => {
                  const durationMs = parseUtcTimestamp(f.end_time!).getTime() - parseUtcTimestamp(f.start_time).getTime();
                  const durationH = (durationMs / 3600000).toFixed(1);
                  const metGoal = durationMs >= f.planned_hours * 3600 * 1000;
                  return (
                    <View key={f.id} style={styles.historyRow}>
                      <View>
                        <Text style={styles.historyDate}>
                          {parseUtcTimestamp(f.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </Text>
                        <Text style={styles.historyGoal}>{f.planned_hours}h goal</Text>
                      </View>
                      <Text style={[styles.historyDuration, { color: metGoal ? '#4CAF50' : Colors.textMuted }]}>
                        {durationH}h {metGoal ? '✓' : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.text, letterSpacing: 1 },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: 60, gap: 16 },

  timerCard: {
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)', borderRadius: 20,
    padding: Spacing.xl, alignItems: 'center', overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.9)', gap: 8,
  },
  timerStatus: { fontFamily: Fonts.body, fontSize: 11, letterSpacing: 3 },
  timerClock: { fontFamily: Fonts.display, fontSize: 44, color: Colors.text, letterSpacing: 2 },
  timerSub: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginBottom: 8 },
  progressTrack: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', borderRadius: 3, overflow: 'hidden' },
  endBtn: { borderWidth: 1, borderColor: 'rgba(139,26,26,0.4)', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: 'rgba(139,26,26,0.1)' },
  endBtnText: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.blood, letterSpacing: 1.5 },

  startCard: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
    padding: Spacing.lg, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.85)', gap: 14,
  },
  startCardTitle: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 2, color: Colors.textMuted, textAlign: 'center' },
  protocolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  protocolCard: {
    width: '47%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14,
    padding: Spacing.md, alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  protocolCardSelected: { borderColor: Colors.goldBorder, backgroundColor: 'rgba(201,168,76,0.08)' },
  protocolLabel: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.text },
  protocolSub: { fontFamily: Fonts.prose, fontSize: 10, color: Colors.textMuted },
  startBtn: { borderRadius: 14, overflow: 'hidden', height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  startBtnText: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.void, letterSpacing: 2 },

  historySection: { gap: 8 },
  historyTitle: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 2, color: Colors.textMuted },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    padding: Spacing.md, backgroundColor: 'rgba(12,10,16,0.6)',
  },
  historyDate: { fontFamily: Fonts.subheading, fontSize: 13, color: Colors.text },
  historyGoal: { fontFamily: Fonts.body, fontSize: 10, color: Colors.textMuted },
  historyDuration: { fontFamily: Fonts.heading, fontSize: 14 },
});