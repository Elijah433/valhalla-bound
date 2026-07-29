import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWarriorStore } from '@/lib/store';
import { getRank, WORKOUT_META, type WorkoutType } from '@/constants/ranks';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';
import {
  getRecentSagaEntries,
  getAllSagaEntries,
  getSagaEntryCount,
  getLatestEpic,
  cleanSagaText,
  type SagaEntry,
  type SagaEpic,
} from '@/lib/db';

const { width } = Dimensions.get('window');

const RANKS_LIST = ['Thrall', 'Karl', 'Huscarl', 'Berserker', 'Jarl', 'Drengr', 'Einherjar'];
const RANK_ICONS = ['⛓️', '🪓', '🛡️', '🔥', '⚔️', '🏆', '✨'];

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

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

function getTodayDayIndex(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

// Formats a "YYYY-MM-DD" saga entry date into Viking-style prose, e.g.
// "4th of July, 2026". Parses the string manually (not via `new Date(str)`)
// to avoid the UTC-midnight parsing pitfall documented elsewhere in this
// app's date helpers.
function formatSagaDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const suffix = (d: number) => {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  return `${day}${suffix(day)} of ${months[month - 1]}, ${year}`;
}

interface WeeklyStats {
  dailyCounts?: number[];
  weekKey?: string;
}

export default function SagasScreen() {
  const { warrior, todayWorkouts, workoutCount, totalMiles, isPro } = useWarriorStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const chronicleGlow = useRef(new Animated.Value(0)).current;
  const [dailyCounts, setDailyCounts] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [sagaEntries, setSagaEntries] = useState<SagaEntry[]>([]);
  const [epic, setEpic] = useState<SagaEpic | null>(null);
  const [epicExpanded, setEpicExpanded] = useState(false);
  const [entryCount, setEntryCount] = useState(0);
  const xp = warrior?.total_xp ?? 0;
  const rank = getRank(xp);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // Slow, ambient pulse behind the Chronicle header — gives the section
    // a sense of quiet presence rather than sitting flat like the other
    // stat cards. Purely decorative, never affects layout or interaction.
    Animated.loop(
      Animated.sequence([
        Animated.timing(chronicleGlow, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(chronicleGlow, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useFocusEffect(useCallback(() => {
    loadWeeklyActivity();
    loadSagaEntries();
  }, [isPro]));

  async function loadWeeklyActivity() {
    try {
      const raw = await AsyncStorage.getItem('weekly_stats');
      const stats: WeeklyStats | null = raw ? JSON.parse(raw) : null;
      const currentWeekKey = getWeekKey();

      if (stats?.weekKey === currentWeekKey && stats.dailyCounts) {
        setDailyCounts(stats.dailyCounts);
      } else {
        setDailyCounts([0, 0, 0, 0, 0, 0, 0]);
      }
    } catch (e) {
      setDailyCounts([0, 0, 0, 0, 0, 0, 0]);
    }
  }

  // Free users currently see zero entries, since generation itself is now
  // gated to Pro warriors in store.ts — this call stays as-is in case a
  // free user has legacy entries from before that change, or downgrades
  // after having been Pro.
  function loadSagaEntries() {
    try {
      setSagaEntries(isPro ? getAllSagaEntries() : getRecentSagaEntries(7));
      setEpic(isPro ? getLatestEpic() : null);
      setEntryCount(getSagaEntryCount());
    } catch (e) {
      setSagaEntries([]);
    }
  }

  const todayIndex = getTodayDayIndex();

  const weekActivity = WEEK_DAYS.map((day, i) => {
    const count = i === todayIndex
      ? Math.max(dailyCounts[i] ?? 0, todayWorkouts.length)
      : (dailyCounts[i] ?? 0);
    return {
      day,
      active: count > 0,
      isFuture: i > todayIndex,
    };
  });

  // Progress toward the next epic saga milestone (every 100 entries).
  const entriesUntilEpic = 100 - (entryCount % 100);
  const epicProgressPct = ((entryCount % 100) / 100) * 100;

  const glowOpacity = chronicleGlow.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.16] });

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0C0A10', '#050508']} style={StyleSheet.absoluteFill} />
      <Text style={styles.watermark}>ᛋ</Text>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>YOUR LEGEND</Text>
              <Text style={styles.title}>THE SAGA</Text>
            </View>
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeNum}>{xp.toLocaleString()}</Text>
              <Text style={styles.xpBadgeLabel}>TOTAL VALOR</Text>
            </View>
          </View>

          {/* ── Skald's Chronicle ─────────────────────────────────────
              Redesigned as a distinct, premium-feeling section: a lit
              hero header (glowing quill rune + title + tagline) instead
              of a plain section label, entries with numbered stone tags
              and a left accent bar, and an epic-progress bar so the
              100-entry milestone feels like a visible countdown rather
              than a surprise. */}
          <View style={styles.chronicleHero}>
            <Animated.View style={[styles.chronicleHeroGlow, { opacity: glowOpacity }]} />
            <LinearGradient
              colors={['rgba(201,168,76,0.1)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.chronicleHeroTop}>
              <View style={styles.chronicleHeroIconWrap}>
                <Text style={styles.chronicleHeroIcon}>ᛉ</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.chronicleHeroEyebrow}>WRITTEN BY THE SKALD</Text>
                <Text style={styles.chronicleHeroTitle}>Skald's Chronicle</Text>
              </View>
            </View>
            <Text style={styles.chronicleHeroSub}>
              Every battle becomes a verse. Every verse builds toward the epic of your journey to Valhalla.
            </Text>

            {isPro && entryCount > 0 && (
              <View style={styles.epicProgressWrap}>
                <View style={styles.epicProgressTrack}>
                  <View style={[styles.epicProgressFill, { width: `${epicProgressPct}%` }]}>
                    <LinearGradient
                      colors={[Colors.goldDark, Colors.gold]}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  </View>
                </View>
                <Text style={styles.epicProgressLabel}>
                  {entriesUntilEpic === 100
                    ? 'Your epic saga awaits — 100 chronicles'
                    : `${entriesUntilEpic} more chronicles until your epic saga`}
                </Text>
              </View>
            )}
          </View>

          {epic && (
            <TouchableOpacity
              style={styles.epicBanner}
              onPress={() => setEpicExpanded(!epicExpanded)}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['rgba(201,168,76,0.18)', 'rgba(201,168,76,0.04)']} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', Colors.gold, 'transparent']} style={styles.epicBannerTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              <Text style={styles.epicBannerRune}>ᛉ</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.epicBannerTitle}>The Epic Saga</Text>
                <Text style={styles.epicBannerSub}>{epic.entry_count} chronicles woven into legend</Text>
              </View>
              <Text style={styles.epicBannerArrow}>{epicExpanded ? '↑' : '→'}</Text>
            </TouchableOpacity>
          )}

          {epic && epicExpanded && (
            <View style={styles.epicCard}>
              <LinearGradient colors={['rgba(201,168,76,0.05)', 'transparent']} style={StyleSheet.absoluteFill} />
              <Text style={styles.epicText}>{cleanSagaText(epic.epic_text)}</Text>
            </View>
          )}

          {sagaEntries.length === 0 ? (
            <View style={styles.chronicleEmptyCard}>
              <LinearGradient colors={['rgba(201,168,76,0.05)', 'transparent']} style={StyleSheet.absoluteFill} />
              <Text style={styles.emptyRune}>ᛋ</Text>
              {isPro ? (
                <>
                  <Text style={styles.emptyTitle}>The chronicle awaits</Text>
                  <Text style={styles.emptySub}>
                    Train today, and the skald will carve your first line.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>The chronicle is sealed</Text>
                  <Text style={styles.emptySub}>
                    Unlock Pro and the skald will begin carving your saga, one day at a time.
                  </Text>
                </>
              )}
            </View>
          ) : (
            <View style={styles.chronicleCard}>
              {sagaEntries.map((entry, i) => {
                // Number entries chronologically (oldest = #1), even though
                // the list itself renders newest-first — this way "Chronicle
                // #12" always refers to the same entry regardless of how
                // many more get added later.
                const chronicleNumber = entryCount - i;
                return (
                  <View key={entry.id} style={styles.chronicleEntryRow}>
                    <View style={styles.chronicleAccentBar} />
                    <View style={styles.chronicleEntryContent}>
                      <View style={styles.chronicleEntryHeader}>
                        <Text style={styles.chronicleNumberTag}>CHRONICLE #{chronicleNumber}</Text>
                        <Text style={styles.chronicleDate}>{formatSagaDate(entry.date)}</Text>
                      </View>
                      <Text style={styles.chronicleEntry}>{cleanSagaText(entry.entry)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {!isPro && (
            <TouchableOpacity
              style={styles.chronicleProGate}
              onPress={() => router.push('/(modals)/paywall' as any)}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['rgba(201,168,76,0.1)', 'transparent']} style={StyleSheet.absoluteFill} />
              <Text style={styles.chronicleProGateText}>🔒 Unlock Skald's Chronicle with Pro</Text>
            </TouchableOpacity>
          )}

          {/* Fixed spacer — Chronicle's last card (whichever branch renders:
              chronicleCard, chronicleEmptyCard, or chronicleProGate) has no
              marginBottom of its own, since it used to be the last section
              on the screen before bottomRunes. Now that Share Your Saga
              follows it directly, this guarantees real separation instead
              of the two cards touching. */}
          <View style={{ height: Spacing.lg }} />

          {/* Share Saga entry */}
          <TouchableOpacity
            style={styles.shareSagaCard}
            onPress={() => router.push('/(modals)/saga-card' as any)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['rgba(201,168,76,0.1)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['transparent', Colors.gold, 'transparent']}
              style={styles.shareSagaCardLine}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
            <Text style={styles.shareSagaRune}>ᛋ</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.shareSagaTitle}>Share Your Saga</Text>
              <Text style={styles.shareSagaSub}>Turn your legend into a card worth showing.</Text>
            </View>
            <Text style={styles.shareSagaArrow}>→</Text>
          </TouchableOpacity>

          {/* Rank card */}
          <View style={styles.rankCard}>
            <LinearGradient
              colors={['rgba(201,168,76,0.07)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['transparent', Colors.gold, 'transparent']}
              style={styles.rankCardLine}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <View style={styles.rankCardTop}>
              <Text style={styles.rankCardIcon}>{rank.icon}</Text>
              <View style={styles.rankCardInfo}>
                <Text style={styles.rankCardTitle}>{rank.title}</Text>
                <Text style={styles.rankCardDesc}>{rank.description}</Text>
              </View>
            </View>

            {/* Rank ladder */}
            <View style={styles.rankLadder}>
              {RANKS_LIST.map((r, i) => {
                const reached = i <= rank.index;
                const isCurrent = i === rank.index;
                return (
                  <View key={r} style={styles.rankLadderItem}>
                    <View style={[
                      styles.rankLadderDot,
                      reached && styles.rankLadderDotReached,
                      isCurrent && styles.rankLadderDotCurrent,
                    ]} />
                    {i < RANKS_LIST.length - 1 && (
                      <View style={[
                        styles.rankLadderLine,
                        reached && i < rank.index && styles.rankLadderLineReached,
                      ]} />
                    )}
                    <Text style={[
                      styles.rankLadderLabel,
                      isCurrent && styles.rankLadderLabelCurrent,
                      reached && !isCurrent && styles.rankLadderLabelReached,
                    ]}>
                      {RANK_ICONS[i]}
                    </Text>
                    <Text style={[
                      styles.rankLadderName,
                      isCurrent && styles.rankLadderNameCurrent,
                    ]}>
                      {r.slice(0, 5).toUpperCase()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Weekly heatmap */}
          <Text style={styles.sectionLabel}>THIS WEEK</Text>

          <View style={styles.heatmapCard}>
            <View style={styles.heatmapRow}>
              {weekActivity.map((d, i) => (
                <View key={i} style={styles.heatmapCol}>
                  <View style={[
                    styles.heatmapCell,
                    d.active && styles.heatmapCellActive,
                    d.isFuture && styles.heatmapCellFuture,
                  ]}>
                    {d.active && (
                      <LinearGradient
                        colors={[Colors.goldDark, Colors.gold]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                    )}
                  </View>
                  <Text style={[
                    styles.heatmapDay,
                    d.active && styles.heatmapDayActive,
                  ]}>{d.day}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.heatmapSub}>
              {weekActivity.filter(d => d.active).length} of 7 days active this week
            </Text>
          </View>

          {/* Lifetime stats */}
          <Text style={styles.sectionLabel}>LIFETIME RECORD</Text>

          <View style={styles.statsGrid}>
            {[
              { val: workoutCount, label: 'BATTLES FOUGHT', rune: 'ᚠ', color: Colors.gold },
              { val: warrior?.streak_days ?? 0, label: 'DAY STREAK', rune: 'ᚢ', color: Colors.blood },
              { val: totalMiles, label: 'MILES RAIDED', rune: 'ᚦ', color: Colors.ice },
              { val: xp.toLocaleString(), label: 'TOTAL VALOR', rune: 'ᚨ', color: Colors.gold },
            ].map((s, i) => (
              <View key={i} style={styles.statCard}>
                <LinearGradient
                  colors={[`${s.color}08`, 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={[styles.statRune, { color: `${s.color}30` }]}>{s.rune}</Text>
                <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Recent battles */}
          <Text style={styles.sectionLabel}>RECENT BATTLES</Text>

          {todayWorkouts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyRune}>ᚷ</Text>
              <Text style={styles.emptyTitle}>Your saga is unwritten</Text>
              <Text style={styles.emptySub}>
                Log your first battle and let history remember your name.
              </Text>
            </View>
          ) : (
            <View style={styles.battlesCard}>
              {todayWorkouts.map((w, i) => {
                const meta = WORKOUT_META[w.type as WorkoutType];
                return (
                  <View key={w.id} style={[
                    styles.battleRow,
                    i < todayWorkouts.length - 1 && styles.battleRowBorder,
                  ]}>
                    <View style={styles.battleIconWrap}>
                      <Text style={styles.battleIcon}>{meta?.icon ?? '⚔️'}</Text>
                    </View>
                    <View style={styles.battleInfo}>
                      <Text style={styles.battleName}>{meta?.label ?? w.type}</Text>
                      <Text style={styles.battleDate}>
                        {new Date(w.created_at).toLocaleDateString([], {
                          month: 'short', day: 'numeric',
                        })} · {new Date(w.created_at).toLocaleTimeString([], {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={styles.battleXPWrap}>
                      <Text style={styles.battleXP}>+{w.xp_earned}</Text>
                      <Text style={styles.battleXPLabel}>XP</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.bottomRunes}>
            <Text style={styles.bottomRuneText}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ  ᚲ  ᚷ  ᚹ</Text>
          </View>

        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 110 },

  watermark: {
    position: 'absolute',
    bottom: 100,
    right: -30,
    fontSize: 240,
    color: 'rgba(201,168,76,0.02)',
    fontFamily: 'System',
    transform: [{ rotate: '-12deg' }],
    pointerEvents: 'none',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 4,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 34,
    color: Colors.text,
    letterSpacing: 1,
  },
  xpBadge: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  xpBadgeNum: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Colors.gold,
  },
  xpBadgeLabel: {
    fontFamily: Fonts.body,
    fontSize: 7,
    letterSpacing: 2,
    color: Colors.textMuted,
  },

  shareSagaCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 16,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.9)',
  },
  shareSagaCardLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  shareSagaRune: {
    fontSize: 26,
    color: Colors.gold,
    fontFamily: 'System',
  },
  shareSagaTitle: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    color: Colors.gold,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  shareSagaSub: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  shareSagaArrow: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Colors.gold,
    opacity: 0.6,
  },

  rankCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 16,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.9)',
    gap: Spacing.lg,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  rankCardLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  rankCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rankCardIcon: { fontSize: 36 },
  rankCardInfo: { flex: 1 },
  rankCardTitle: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Colors.gold,
    letterSpacing: 1,
    marginBottom: 3,
  },
  rankCardDesc: {
    fontFamily: Fonts.proseItalic,
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  rankLadder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rankLadderItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  rankLadderDot: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 2,
  },
  rankLadderDotReached: {
    backgroundColor: Colors.goldDark,
    borderColor: Colors.gold,
  },
  rankLadderDotCurrent: {
    backgroundColor: Colors.gold,
    borderColor: Colors.goldLight,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  rankLadderLine: {
    position: 'absolute',
    top: 4,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rankLadderLineReached: {
    backgroundColor: Colors.goldDark,
  },
  rankLadderLabel: {
    fontSize: 14,
    opacity: 0.3,
  },
  rankLadderLabelCurrent: { opacity: 1 },
  rankLadderLabelReached: { opacity: 0.6 },
  rankLadderName: {
    fontFamily: Fonts.body,
    fontSize: 6,
    letterSpacing: 0.5,
    color: Colors.textDim,
    textAlign: 'center',
  },
  rankLadderNameCurrent: { color: Colors.gold },

  sectionLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    marginBottom: 10,
  },

  heatmapCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: Spacing.lg,
    backgroundColor: 'rgba(12,10,16,0.8)',
    gap: 12,
  },
  heatmapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heatmapCol: { alignItems: 'center', gap: 6, flex: 1 },
  heatmapCell: {
    width: 36, height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  heatmapCellActive: {
    borderColor: Colors.goldBorder,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  heatmapCellFuture: {
    opacity: 0.4,
  },
  heatmapDay: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 1,
    color: Colors.textDim,
  },
  heatmapDayActive: { color: Colors.gold },
  heatmapSub: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textDim,
    fontStyle: 'italic',
    textAlign: 'center',
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
    backgroundColor: 'rgba(12,10,16,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: Spacing.md,
    overflow: 'hidden',
    gap: 3,
  },
  statRune: {
    fontSize: 22,
    fontFamily: 'System',
    marginBottom: 4,
  },
  statVal: {
    fontFamily: Fonts.heading,
    fontSize: 26,
    lineHeight: 28,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 2,
    color: Colors.textMuted,
  },

  emptyCard: {
    marginHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 8,
  },
  emptyRune: {
    fontSize: 32,
    color: 'rgba(201,168,76,0.15)',
    fontFamily: 'System',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: Fonts.subheading,
    fontSize: 14,
    color: Colors.textMuted,
  },
  emptySub: {
    fontFamily: Fonts.proseItalic,
    fontSize: 13,
    color: Colors.textDim,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },

  battlesCard: {
    marginHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
  },
  battleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  battleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  battleIconWrap: {
    width: 36, height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(201,168,76,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  battleIcon: { fontSize: 17 },
  battleInfo: { flex: 1 },
  battleName: {
    fontFamily: Fonts.subheading,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
  battleDate: {
    fontFamily: Fonts.prose,
    fontSize: 11,
    color: Colors.textMuted,
  },
  battleXPWrap: { alignItems: 'flex-end' },
  battleXP: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.gold,
  },
  battleXPLabel: {
    fontFamily: Fonts.body,
    fontSize: 7,
    letterSpacing: 2,
    color: Colors.textMuted,
  },

  // ── Chronicle hero header ────────────────────────────────────────
  chronicleHero: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 20,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(14,11,8,0.92)',
    gap: 12,
  },
  chronicleHeroGlow: {
    position: 'absolute',
    top: -60, left: -20,
    width: 220, height: 220,
    borderRadius: 110,
    backgroundColor: Colors.gold,
  },
  chronicleHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  chronicleHeroIconWrap: {
    width: 46, height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    backgroundColor: 'rgba(201,168,76,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chronicleHeroIcon: {
    fontSize: 24,
    color: Colors.gold,
    fontFamily: 'System',
  },
  chronicleHeroEyebrow: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 3,
    color: `${Colors.gold}90`,
    marginBottom: 2,
  },
  chronicleHeroTitle: {
    fontFamily: Fonts.heading,
    fontSize: 19,
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  chronicleHeroSub: {
    fontFamily: Fonts.proseItalic,
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 19,
  },

  epicProgressWrap: { gap: 6, marginTop: 2 },
  epicProgressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  epicProgressFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  epicProgressLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    letterSpacing: 0.5,
    color: Colors.textDim,
  },

  epicBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 14,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.9)',
  },
  epicBannerTopLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  epicBannerRune: { fontSize: 24, color: Colors.gold, fontFamily: 'System' },
  epicBannerTitle: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.gold,
    marginBottom: 2,
  },
  epicBannerSub: {
    fontFamily: Fonts.prose,
    fontSize: 11,
    color: Colors.textMuted,
  },
  epicBannerArrow: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.gold,
    opacity: 0.7,
  },
  epicCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.85)',
  },
  epicText: {
    fontFamily: Fonts.proseItalic,
    fontSize: 13,
    color: Colors.text,
    fontStyle: 'italic',
    lineHeight: 21,
  },

  chronicleEmptyCard: {
    marginHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.12)',
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },

  chronicleCard: {
    marginHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    backgroundColor: 'rgba(12,10,16,0.8)',
    overflow: 'hidden',
  },
  chronicleEntryRow: {
    flexDirection: 'row',
  },
  chronicleAccentBar: {
    width: 3,
    backgroundColor: 'rgba(201,168,76,0.35)',
  },
  chronicleEntryContent: {
    flex: 1,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  chronicleEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chronicleNumberTag: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.gold,
  },
  chronicleDate: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.textMuted,
  },
  chronicleEntry: {
    fontFamily: Fonts.proseItalic,
    fontSize: 14,
    color: Colors.text,
    fontStyle: 'italic',
    lineHeight: 21,
  },
  chronicleProGate: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(201,168,76,0.06)',
  },
  chronicleProGateText: {
    fontFamily: Fonts.subheading,
    fontSize: 12,
    color: Colors.gold,
  },

  bottomRunes: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  bottomRuneText: {
    fontFamily: 'System',
    fontSize: 13,
    color: 'rgba(201,168,76,0.08)',
    letterSpacing: 10,
  },
});