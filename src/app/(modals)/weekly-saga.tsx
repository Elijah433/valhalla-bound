import { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWarriorStore } from '@/lib/store';
import { useWarriorProfile } from '@/lib/useWarriorProfile';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

const ZERO_SAGA = (name: string) =>
  `The forge was cold this week, ${name}. No battles were recorded. The gods do not punish rest — but they reward action. Rise next week.`;

const NO_COMPARISON_TEMPLATES = [
  (name: string, battles: number, xp: number) =>
    `This week, ${name} answered the call ${battles} time${battles !== 1 ? 's' : ''}. The gods recorded ${xp.toLocaleString()} Valor. The ravens spoke of a warrior who does not yield.`,
  (name: string, battles: number, xp: number) =>
    `${name} forged ${battles} battle${battles !== 1 ? 's' : ''} into legend this week, earning ${xp.toLocaleString()} Valor. Odin's ravens have added your deeds to the eternal record.`,
];

// ── Local date helpers ──────────────────────────────────────
// Matches the same local-date construction used in store.ts. The previous
// version of this file built its own week key with Date.toISOString(),
// which resolves to UTC rather than local time and could disagree with
// store.ts's (already-fixed) week key around timezone boundaries — risking
// a mismatch between when this screen thinks "this week" started and when
// weekly_stats/last_week_stats actually got written.
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekKey() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  return getLocalDateString(weekStart);
}

const BEST_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface WeeklyStatsShape {
  battles: number;
  xp: number;
  miles: number;
  bestDay: number;
  dailyCounts: number[];
  streak: number;
  frostShields: number;
  weekKey?: string;
}

const EMPTY_WEEK: WeeklyStatsShape = {
  battles: 0, xp: 0, miles: 0, bestDay: -1,
  dailyCounts: [0, 0, 0, 0, 0, 0, 0],
  streak: 0, frostShields: 1,
};

// Builds the saga's narrative line. If we have a real previous week to
// compare against (not the very first week ever, and not a week with zero
// battles that would make "more/fewer" meaningless), the text reacts to the
// actual comparison instead of picking a random generic line. Falls back to
// the old-style generic templates only when there's nothing real to compare.
function buildSagaText(
  name: string,
  thisWeek: WeeklyStatsShape,
  lastWeek: WeeklyStatsShape | null,
): string {
  if (thisWeek.battles === 0) {
    return ZERO_SAGA(name);
  }

  const hasRealComparison = lastWeek !== null && lastWeek.battles > 0;

  if (!hasRealComparison) {
    const template = NO_COMPARISON_TEMPLATES[
      Math.floor(Math.random() * NO_COMPARISON_TEMPLATES.length)
    ];
    return template(name, thisWeek.battles, thisWeek.xp);
  }

  const battleDiff = thisWeek.battles - lastWeek!.battles;
  const xpDiff = thisWeek.xp - lastWeek!.xp;

  if (battleDiff > 0) {
    return `${name} trained ${battleDiff} more time${battleDiff !== 1 ? 's' : ''} than last week — ${thisWeek.battles} battle${thisWeek.battles !== 1 ? 's' : ''} in all, earning ${thisWeek.xp.toLocaleString()} Valor. The ravens noticed the rising tide.`;
  }

  if (battleDiff < 0) {
    const fewer = Math.abs(battleDiff);
    return `A quieter week for ${name} — ${fewer} fewer battle${fewer !== 1 ? 's' : ''} than last week, ${thisWeek.battles} in all. ${thisWeek.xp.toLocaleString()} Valor still earned. The forge cools, but it does not go out.`;
  }

  // Same battle count as last week
  if (xpDiff > 0) {
    return `${name} matched last week's pace — ${thisWeek.battles} battle${thisWeek.battles !== 1 ? 's' : ''} again — but fought harder, earning ${xpDiff.toLocaleString()} more Valor than before.`;
  }

  return `${name} held steady this week: ${thisWeek.battles} battle${thisWeek.battles !== 1 ? 's' : ''}, just as before. ${thisWeek.xp.toLocaleString()} Valor earned. Consistency is its own kind of strength.`;
}

function FlameIcon({ size = 40, intensity = 1 }: { size?: number; intensity?: number }) {
  const color = intensity >= 3 ? '#FF6B00' : intensity >= 2 ? '#FF8C00' : intensity >= 1 ? '#FFA500' : '#666';
  return (
    <Text style={{ fontSize: size, color, fontFamily: 'System' }}>
      {intensity >= 3 ? '🔥' : intensity >= 2 ? '🔥' : intensity >= 1 ? '🔥' : '·'}
    </Text>
  );
}

export default function WeeklySagaModal() {
  const { warrior, workoutCount } = useWarriorStore();
  const { isShieldmaiden } = useWarriorProfile();
  const [weekStats, setWeekStats] = useState<WeeklyStatsShape>(EMPTY_WEEK);
  const [lastWeekStats, setLastWeekStats] = useState<WeeklyStatsShape | null>(null);
  const [sagaText, setSagaText] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const barAnims = useRef([0, 1, 2, 3, 4, 5, 6].map(() => new Animated.Value(0))).current;

  const accentColor = isShieldmaiden ? '#D4A8C4' : Colors.gold;
  const name = warrior?.name ?? 'Warrior';
  const xp = warrior?.total_xp ?? 0;

  useEffect(() => {
    loadWeekStats();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  async function loadWeekStats() {
    try {
      const raw = await AsyncStorage.getItem('weekly_stats');
      const lastRaw = await AsyncStorage.getItem('last_week_stats');
      const lastStats: WeeklyStatsShape | null = lastRaw ? JSON.parse(lastRaw) : null;
      setLastWeekStats(lastStats);

      let stats: WeeklyStatsShape = EMPTY_WEEK;
      if (raw) {
        stats = JSON.parse(raw);
        setWeekStats(stats);

        // Animate bars after load
        const maxCount = Math.max(...stats.dailyCounts, 1);
        stats.dailyCounts.forEach((count: number, i: number) => {
          Animated.timing(barAnims[i], {
            toValue: count / maxCount,
            duration: 600,
            delay: 400 + i * 80,
            useNativeDriver: false,
          }).start();
        });
      }

      setSagaText(buildSagaText(name, stats, lastStats));

      // Mark as shown for this week
      const weekKey = getWeekKey();
      await AsyncStorage.setItem('weekly_saga_shown', weekKey);
    } catch (e) {}
  }

  const flameIntensity = weekStats.streak >= 30 ? 3 : weekStats.streak >= 14 ? 2 : weekStats.streak >= 3 ? 1 : 0;

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.12] });

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0E0A14', '#050508']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.topGlow, { opacity: glowOpacity, backgroundColor: accentColor }]} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: accentColor }]}>END OF WEEK</Text>
            <Text style={styles.title}>YOUR SAGA</Text>
            <Text style={styles.subtitle}>Week of {getWeekLabel()}</Text>
          </View>

          {/* Saga text */}
          <View style={[styles.sagaCard, { borderColor: `${accentColor}25` }]}>
            <LinearGradient
              colors={[`${accentColor}08`, 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['transparent', accentColor, 'transparent']}
              style={styles.sagaCardLine}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Text style={[styles.sagaRune, { color: accentColor }]}>ᛋ</Text>
            <Text style={styles.sagaText}>{sagaText}</Text>
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {[
              { val: weekStats.battles, label: 'BATTLES', color: Colors.gold, rune: 'ᚦ' },
              { val: weekStats.xp.toLocaleString(), label: 'VALOR EARNED', color: accentColor, rune: 'ᚠ' },
              { val: weekStats.miles, label: 'MILES RAIDED', color: Colors.ice, rune: 'ᚢ' },
              { val: weekStats.streak, label: 'DAY STREAK', color: '#FF8C00', rune: '🔥' },
            ].map((s, i) => (
              <View key={i} style={[styles.statCard, { borderColor: `${s.color}20` }]}>
                <LinearGradient
                  colors={[`${s.color}08`, 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={[styles.statRune, { color: s.color }]}>{s.rune}</Text>
                <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Week-over-week comparison, only if we have a real previous week */}
          {lastWeekStats && lastWeekStats.battles > 0 && (
            <View style={[styles.compareCard, { borderColor: `${accentColor}15` }]}>
              <LinearGradient
                colors={[`${accentColor}06`, 'transparent']}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.sectionLabelInline}>VS LAST WEEK</Text>
              <View style={styles.compareRow}>
                <View style={styles.compareItem}>
                  <Text style={styles.compareLabel}>BATTLES</Text>
                  <Text style={[
                    styles.compareVal,
                    { color: weekStats.battles >= lastWeekStats.battles ? '#4CAF50' : '#E05050' },
                  ]}>
                    {weekStats.battles - lastWeekStats.battles >= 0 ? '+' : ''}
                    {weekStats.battles - lastWeekStats.battles}
                  </Text>
                </View>
                <View style={styles.compareDivider} />
                <View style={styles.compareItem}>
                  <Text style={styles.compareLabel}>VALOR</Text>
                  <Text style={[
                    styles.compareVal,
                    { color: weekStats.xp >= lastWeekStats.xp ? '#4CAF50' : '#E05050' },
                  ]}>
                    {weekStats.xp - lastWeekStats.xp >= 0 ? '+' : ''}
                    {(weekStats.xp - lastWeekStats.xp).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Daily activity bars */}
          <Text style={styles.sectionLabel}>DAILY ACTIVITY</Text>
          <View style={[styles.barsCard, { borderColor: `${accentColor}15` }]}>
            <LinearGradient
              colors={[`${accentColor}06`, 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.bars}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                const isToday = i === new Date().getDay() - 1;
                const isBest = i === weekStats.bestDay;
                return (
                  <View key={i} style={styles.barWrap}>
                    <View style={styles.barTrack}>
                      <Animated.View style={[
                        styles.barFill,
                        {
                          height: barAnims[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                          backgroundColor: isBest ? accentColor : `${accentColor}60`,
                        },
                      ]} />
                    </View>
                    <Text style={[
                      styles.barLabel,
                      isToday && { color: accentColor },
                      isBest && { color: accentColor },
                    ]}>
                      {day}
                    </Text>
                    {isBest && (
                      <Text style={[styles.bestDayLabel, { color: accentColor }]}>BEST</Text>
                    )}
                  </View>
                );
              })}
            </View>
            {weekStats.bestDay >= 0 && (
              <Text style={[styles.bestDayText, { color: accentColor }]}>
                Best day: {BEST_DAY_NAMES[weekStats.bestDay === 6 ? 0 : weekStats.bestDay + 1]}
              </Text>
            )}
          </View>

          {/* Streak status */}
          <View style={[styles.streakCard, { borderColor: weekStats.streak > 0 ? 'rgba(255,140,0,0.3)' : 'rgba(255,255,255,0.06)' }]}>
            <LinearGradient
              colors={weekStats.streak > 0 ? ['rgba(255,140,0,0.08)', 'transparent'] : ['rgba(255,255,255,0.02)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.streakLeft}>
              <Text style={styles.streakFlame}>
                {weekStats.streak >= 3 ? '🔥' : 'ᚾ'}
              </Text>
              <View>
                <Text style={[styles.streakVal, { color: weekStats.streak > 0 ? '#FF8C00' : Colors.textMuted }]}>
                  {weekStats.streak} day streak
                </Text>
                <Text style={styles.streakSub}>
                  {weekStats.streak >= 30 ? 'Legendary — Valhalla awaits'
                    : weekStats.streak >= 14 ? 'Unstoppable — the gods watch'
                    : weekStats.streak >= 7 ? 'A week of iron will'
                    : weekStats.streak >= 3 ? 'The forge is heating up'
                    : weekStats.streak > 0 ? 'Every saga starts with one step'
                    : 'No active streak — begin anew'}
                </Text>
              </View>
            </View>
            <View style={styles.shieldWrap}>
              <Text style={styles.shieldIcon}>{weekStats.frostShields > 0 ? 'ᚲ' : 'ᚾ'}</Text>
              <Text style={styles.shieldLabel}>
                {weekStats.frostShields} frost{'\n'}shield{weekStats.frostShields !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* What's next */}
          <View style={[styles.nextCard, { borderColor: `${accentColor}20` }]}>
            <LinearGradient
              colors={[`${accentColor}06`, 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.nextEyebrow, { color: accentColor }]}>NEXT WEEK</Text>
            <Text style={styles.nextTitle}>The forge awaits.</Text>
            <Text style={styles.nextBody}>
              {weekStats.battles === 0
                ? 'This week was quiet. The gods are patient — but not forever. Return to the forge.'
                : weekStats.battles >= 5
                ? 'You trained like a true Einherjar. Carry this momentum into the new week.'
                : 'Good work this week. Push harder. The Valkyries reward consistency.'}
            </Text>
          </View>

          {/* Dismiss */}
          <TouchableOpacity
            style={[styles.dismissBtn, { borderColor: `${accentColor}35` }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.back();
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[`${accentColor}15`, `${accentColor}05`]}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['transparent', accentColor, 'transparent']}
              style={styles.dismissLine}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Text style={[styles.dismissText, { color: accentColor }]}>
              BEGIN THE NEW WEEK  ᚦ
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomRunes}>
            <Text style={[styles.bottomRuneText, { color: `${accentColor}10` }]}>
              ᚠ  ᚢ  ᚦ  ᚨ  ᚱ  ᚲ  ᚷ  ᚹ
            </Text>
          </View>

        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

function getWeekLabel() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 60 },

  topGlow: {
    position: 'absolute',
    top: -80,
    left: width * 0.1,
    width: width * 0.8,
    height: 280,
    borderRadius: 999,
    transform: [{ scaleX: 1.3 }, { scaleY: 0.4 }],
    pointerEvents: 'none',
  },

  header: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: 4,
  },
  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 4,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 44,
    color: Colors.text,
    letterSpacing: 3,
    textShadowColor: 'rgba(201,168,76,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontFamily: Fonts.proseItalic,
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  sagaCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.9)',
    gap: 10,
    alignItems: 'center',
  },
  sagaCardLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  sagaRune: {
    fontSize: 28,
    fontFamily: 'System',
    opacity: 0.6,
  },
  sagaText: {
    fontFamily: Fonts.proseItalic,
    fontSize: 15,
    color: Colors.text,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: 10,
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: (width - 58) / 2,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
  },
  statRune: {
    fontSize: 20,
    fontFamily: 'System',
    opacity: 0.7,
  },
  statVal: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    lineHeight: 30,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 1.5,
    color: Colors.textMuted,
  },

  compareCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
    gap: 10,
  },
  sectionLabelInline: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.textMuted,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compareItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  compareDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  compareLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 1.5,
    color: Colors.textMuted,
  },
  compareVal: {
    fontFamily: Fonts.heading,
    fontSize: 22,
  },

  sectionLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    marginBottom: 10,
  },

  barsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
    gap: 10,
  },
  bars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
    gap: 6,
  },
  barWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 1,
    color: Colors.textDim,
  },
  bestDayLabel: {
    fontFamily: Fonts.body,
    fontSize: 6,
    letterSpacing: 1,
  },
  bestDayText: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  streakCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakFlame: {
    fontSize: 32,
    fontFamily: 'System',
  },
  streakVal: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  streakSub: {
    fontFamily: Fonts.prose,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
  },
  shieldWrap: {
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(168,196,212,0.2)',
    borderRadius: 10,
    padding: 8,
    backgroundColor: 'rgba(168,196,212,0.05)',
  },
  shieldIcon: {
    fontSize: 20,
    color: Colors.ice,
    fontFamily: 'System',
  },
  shieldLabel: {
    fontFamily: Fonts.body,
    fontSize: 7,
    letterSpacing: 1,
    color: Colors.ice,
    textAlign: 'center',
    lineHeight: 10,
  },

  nextCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
    gap: 6,
  },
  nextEyebrow: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 3,
  },
  nextTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  nextBody: {
    fontFamily: Fonts.prose,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 20,
  },

  dismissBtn: {
    marginHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dismissLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  dismissText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    letterSpacing: 2,
  },

  bottomRunes: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  bottomRuneText: {
    fontFamily: 'System',
    fontSize: 13,
    letterSpacing: 10,
  },
});