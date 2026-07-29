import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROGRAMS, TYPE_COLORS, TYPE_ICONS } from '@/constants/programs';
import { useWarriorStore } from '@/lib/store';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';
import { ProgramSVG } from '../../components/ProgramSVG';

const { width } = Dimensions.get('window');
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// Same Sunday-start week-boundary key used elsewhere in the app (store.ts's
// getWeekKey) — used here purely to detect when a NEW week has begun, so
// completedDays can reset. Without this, a multi-week active program would
// carry last week's checkmarks forward forever, making every subsequent
// week appear already finished the moment it starts.
function getWeekKey(): string {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const year = weekStart.getFullYear();
  const month = String(weekStart.getMonth() + 1).padStart(2, '0');
  const day = String(weekStart.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function BerserkerScreen() {
  const { isPro, workoutCount } = useWarriorStore();
  const [activeProgram, setActiveProgram] = useState<string | null>(null);
  const [completedDays, setCompletedDays] = useState<string[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;

  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todayKey = DAYS[todayIndex];

  useFocusEffect(useCallback(() => { loadState(); }, []));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(heroAnim, { toValue: 1, duration: 800, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  async function loadState() {
    try {
      const prog = await AsyncStorage.getItem('active_program');
      const days = await AsyncStorage.getItem('completed_days');
      const storedWeekKey = await AsyncStorage.getItem('completed_days_week_key');
      const currentWeekKey = getWeekKey();

      if (prog) setActiveProgram(prog);

      // If a new week has started since completedDays was last touched,
      // reset it — otherwise a multi-week active program would show last
      // week's completed checkmarks still applied to the new week.
      if (storedWeekKey !== currentWeekKey) {
        await AsyncStorage.setItem('completed_days', JSON.stringify([]));
        await AsyncStorage.setItem('completed_days_week_key', currentWeekKey);
        setCompletedDays([]);
      } else if (days) {
        setCompletedDays(JSON.parse(days));
      }
    } catch (e) {}
  }

  async function startProgram(programId: string) {
    const program = PROGRAMS.find(p => p.id === programId);
    if (!program) return;
    if (program.proOnly && !isPro) {
      router.push('/(modals)/paywall');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem('active_program', programId);
    await AsyncStorage.setItem('completed_days', JSON.stringify([]));
    await AsyncStorage.setItem('completed_days_week_key', getWeekKey());
    setActiveProgram(programId);
    setCompletedDays([]);
  }

  async function completeDay(dayKey: string) {
    const newDays = completedDays.includes(dayKey)
      ? completedDays.filter(d => d !== dayKey)
      : [...completedDays, dayKey];
    await AsyncStorage.setItem('completed_days', JSON.stringify(newDays));
    await AsyncStorage.setItem('completed_days_week_key', getWeekKey());
    setCompletedDays(newDays);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // Confirmed first — same pattern as every other destructive/irreversible
  // action elsewhere in the app (deleting a set, a photo, etc.). Previously
  // this fired instantly on a single tap with no way to back out.
  function endProgram() {
    Alert.alert(
      'End this program?',
      'Your active protocol and this week\'s progress will be cleared. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Program',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('active_program');
            await AsyncStorage.removeItem('completed_days');
            await AsyncStorage.removeItem('completed_days_week_key');
            setActiveProgram(null);
            setCompletedDays([]);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  }

  const currentProgram = PROGRAMS.find(p => p.id === activeProgram);
  const weekProgress = completedDays.length / 7;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0E0A14', '#080510', '#050508']} style={StyleSheet.absoluteFill} />
      <Text style={styles.watermark}>ᛒ</Text>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero header */}
          <Animated.View style={[styles.heroSection, {
            opacity: heroAnim,
            transform: [{
              translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] })
            }]
          }]}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroEyebrow}>THE BERSERKER</Text>
                <Text style={styles.heroTitle}>PROTOCOLS</Text>
              </View>
              {currentProgram && (
                <TouchableOpacity style={styles.endBtn} onPress={endProgram}>
                  <Text style={styles.endBtnText}>End Program</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.heroDesc}>
              {currentProgram
                ? `You are forging yourself through ${currentProgram.name}. The gods are watching.`
                : 'Choose your path. Commit to the forge. Emerge legendary.'}
            </Text>

            <View style={styles.heroStats}>
              {[
                { val: workoutCount, label: 'BATTLES' },
                { val: completedDays.length, label: 'DAYS THIS WEEK' },
                { val: currentProgram ? '1' : '0', label: 'ACTIVE PROGRAM' },
              ].map((s, i) => (
                <View key={i} style={styles.heroStatItem}>
                  {i > 0 && <View style={styles.heroStatDivider} />}
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatVal}>{s.val}</Text>
                    <Text style={styles.heroStatLabel}>{s.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Swift Forge — quick adaptive workout entry point, sitting
              above the fixed programs since it's meant for spontaneous,
              time-boxed sessions rather than committing to a multi-week
              protocol. */}
          <TouchableOpacity
            style={styles.swiftForgeCard}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(modals)/adaptive-workout'); }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['rgba(201,168,76,0.1)', 'rgba(201,168,76,0.03)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <LinearGradient colors={['transparent', Colors.gold, 'transparent']} style={styles.swiftForgeLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <View style={styles.swiftForgeIconWrap}>
              <Text style={styles.swiftForgeIcon}>ᛞ</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.swiftForgeTitle}>Swift Forge</Text>
              <Text style={styles.swiftForgeSub}>Tell us your time. We'll build the battle plan.</Text>
            </View>
            <Text style={styles.swiftForgeArrow}>→</Text>
          </TouchableOpacity>

          {/* Active program */}
          {currentProgram && (
            <>
              <View style={[styles.activeHeroCard, { borderColor: `${currentProgram.color}35` }]}>
                <LinearGradient
                  colors={[`${currentProgram.color}12`, `${currentProgram.color}04`, 'transparent']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <LinearGradient
                  colors={['transparent', currentProgram.color, 'transparent']}
                  style={styles.activeHeroCardLine}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                <View style={styles.activeHeroTop}>
                  <View style={styles.activeHeroLeft}>
                    <Text style={styles.activeHeroEyebrow}>ACTIVE PROTOCOL</Text>
                    <Text style={[styles.activeHeroName, { color: currentProgram.color }]}>
                      {currentProgram.name}
                    </Text>
                    <Text style={styles.activeHeroSub}>{currentProgram.subtitle}</Text>
                  </View>
                  <View style={[styles.activeHeroIconWrap, {
                    borderColor: `${currentProgram.color}30`,
                    backgroundColor: `${currentProgram.color}10`,
                  }]}>
                    <ProgramSVG program={currentProgram.id} color={currentProgram.color} size={56} />
                  </View>
                </View>

                <View style={styles.weekProgressWrap}>
                  <View style={styles.weekProgressLabelRow}>
                    <Text style={styles.weekProgressLabel}>WEEK PROGRESS</Text>
                    <Text style={[styles.weekProgressVal, { color: currentProgram.color }]}>
                      {completedDays.length}/7 days
                    </Text>
                  </View>
                  <View style={styles.weekProgressTrack}>
                    <View style={[styles.weekProgressFill, { width: `${weekProgress * 100}%` }]}>
                      <LinearGradient
                        colors={[`${currentProgram.color}70`, currentProgram.color]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                      <View style={styles.weekProgressShine} />
                    </View>
                  </View>
                </View>

                <View style={styles.dayPills}>
                  {DAYS.map((day, i) => {
                    const isToday = i === todayIndex;
                    const isDone = completedDays.includes(day);
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayPill,
                          isToday && styles.dayPillToday,
                          isDone && { borderColor: currentProgram.color },
                        ]}
                        onPress={() => completeDay(day)}
                        activeOpacity={0.7}
                      >
                        {isDone && (
                          <LinearGradient
                            colors={[`${currentProgram.color}25`, 'transparent']}
                            style={StyleSheet.absoluteFill}
                          />
                        )}
                        <Text style={[
                          styles.dayPillText,
                          isToday && { color: currentProgram.color },
                          isDone && { opacity: 0 },
                        ]}>
                          {day.slice(0, 2)}
                        </Text>
                        {isDone && (
                          <Text style={[styles.dayPillCheck, { color: currentProgram.color }]}>✓</Text>
                        )}
                        {isToday && !isDone && (
                          <View style={[styles.dayPillDot, { backgroundColor: currentProgram.color }]} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <Text style={styles.sectionLabel}>TODAY'S TRIAL — {todayKey}</Text>

              <View style={styles.todayCard}>
                <LinearGradient
                  colors={[`${currentProgram.color}07`, 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.todayCardTop}>
                  <View style={[styles.todayTypeTag, {
                    backgroundColor: `${TYPE_COLORS[currentProgram.days[todayIndex].type]}15`,
                    borderColor: `${TYPE_COLORS[currentProgram.days[todayIndex].type]}30`,
                  }]}>
                    <Text style={[styles.todayTypeRune, {
                      color: TYPE_COLORS[currentProgram.days[todayIndex].type],
                    }]}>
                      {TYPE_ICONS[currentProgram.days[todayIndex].type]}
                    </Text>
                    <Text style={[styles.todayTypeText, {
                      color: TYPE_COLORS[currentProgram.days[todayIndex].type],
                    }]}>
                      {currentProgram.days[todayIndex].type.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.todayXP, { color: currentProgram.color }]}>
                    +{currentProgram.days[todayIndex].xp} VALOR
                  </Text>
                </View>

                <Text style={styles.todayName}>{currentProgram.days[todayIndex].name}</Text>
                <Text style={styles.todayDuration}>{currentProgram.days[todayIndex].duration}</Text>

                <View style={styles.exerciseList}>
                  {currentProgram.days[todayIndex].exercises.map((ex, i) => (
                    <View key={i} style={styles.exerciseRow}>
                      <View style={[styles.exerciseDot, { backgroundColor: currentProgram.color }]} />
                      <Text style={styles.exerciseText}>{ex}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.beginTodayBtn, { borderColor: `${currentProgram.color}40` }]}
                  onPress={() => {
                    completeDay(todayKey);
                    if (currentProgram.days[todayIndex].type === 'strength') {
                      router.push('/(modals)/exercise-picker');
                    } else if (currentProgram.days[todayIndex].type === 'recovery') {
                      router.push({ pathname: '/(modals)/recovery-log', params: { type: 'recovery' } });
                    } else {
                      router.push({ pathname: '/(modals)/cardio-log', params: { type: currentProgram.days[todayIndex].type } });
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[`${currentProgram.color}20`, `${currentProgram.color}08`]}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={[styles.beginTodayBtnText, { color: currentProgram.color }]}>
                    {completedDays.includes(todayKey) ? '✓  COMPLETED TODAY' : "BEGIN TODAY'S TRIAL  →"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerRune}>ᚦ</Text>
                <View style={styles.dividerLine} />
              </View>
            </>
          )}

          <Text style={styles.sectionLabel}>
            {currentProgram ? 'ALL PROTOCOLS' : 'CHOOSE YOUR PROTOCOL'}
          </Text>
          {!currentProgram && (
            <Text style={styles.sectionSub}>
              Choose your path. The forge demands consistency.
            </Text>
          )}

          {PROGRAMS.map((program) => {
            const isActive = activeProgram === program.id;
            const isLocked = program.proOnly && !isPro;

            return (
              <View key={program.id} style={[
                styles.programCard,
                { borderColor: isActive ? `${program.color}40` : isLocked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)' },
                isLocked && { opacity: 0.7 },
              ]}>
                <LinearGradient
                  colors={isActive
                    ? [`${program.color}10`, `${program.color}03`, 'transparent']
                    : ['rgba(255,255,255,0.025)', 'transparent']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <LinearGradient
                  colors={['transparent', isActive ? program.color : 'rgba(255,255,255,0.06)', 'transparent']}
                  style={styles.programCardLine}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />

                <View style={styles.programHeader}>
                  <View style={[styles.programIconWrap, {
                    backgroundColor: `${program.color}10`,
                    borderColor: `${program.color}25`,
                  }]}>
                    <ProgramSVG program={program.id} color={isLocked ? `${program.color}60` : program.color} size={56} />
                  </View>
                  <View style={styles.programHeaderInfo}>
                    <View style={styles.programNameRow}>
                      <Text style={[styles.programName, {
                        color: isActive ? program.color : isLocked ? Colors.textMuted : Colors.text,
                      }]}>
                        {program.name}
                      </Text>
                      {isLocked && (
                        <View style={styles.proTag}>
                          <Text style={styles.proTagText}>PRO</Text>
                        </View>
                      )}
                      {isActive && (
                        <View style={[styles.activeTag, {
                          backgroundColor: `${program.color}15`,
                          borderColor: `${program.color}30`,
                        }]}>
                          <Text style={[styles.activeTagText, { color: program.color }]}>ACTIVE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.programSub}>{program.subtitle}</Text>
                  </View>
                </View>

                <Text style={[styles.programDesc, isLocked && { color: Colors.textDim }]}>
                  {program.desc}
                </Text>

                <View style={styles.programMeta}>
                  {[
                    { label: 'GOAL', val: program.goal },
                    { label: 'LEVEL', val: program.difficulty },
                    { label: 'SCHEDULE', val: '7 days/week' },
                  ].map((m) => (
                    <View key={m.label} style={styles.programMetaItem}>
                      <Text style={styles.programMetaLabel}>{m.label}</Text>
                      <Text style={[styles.programMetaVal, isActive && { color: program.color }]}>
                        {m.val}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.weekPreview}>
                  {program.days.map((day, i) => (
                    <View key={i} style={[styles.weekPreviewDay, {
                      backgroundColor: `${TYPE_COLORS[day.type]}12`,
                      borderColor: `${TYPE_COLORS[day.type]}22`,
                    }]}>
                      <Text style={[styles.weekPreviewDayLabel, {
                        color: TYPE_COLORS[day.type],
                        opacity: 0.7,
                      }]}>
                        {day.day.slice(0, 2)}
                      </Text>
                      <Text style={[styles.weekPreviewDayRune, { color: TYPE_COLORS[day.type] }]}>
                        {TYPE_ICONS[day.type]}
                      </Text>
                    </View>
                  ))}
                </View>

                {!isActive && (
                  <TouchableOpacity
                    style={[styles.beginBtn, {
                      borderColor: isLocked ? 'rgba(201,168,76,0.25)' : `${program.color}35`,
                    }]}
                    onPress={() => startProgram(program.id)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={isLocked
                        ? ['rgba(201,168,76,0.1)', 'rgba(201,168,76,0.04)']
                        : [`${program.color}18`, `${program.color}06`]}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                    <Text style={[styles.beginBtnText, {
                      color: isLocked ? Colors.gold : program.color,
                    }]}>
                      {isLocked ? 'ᚲ  UNLOCK WITH PRO  →' : `BEGIN ${program.name.toUpperCase()}  →`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

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
    bottom: 100, right: -30,
    fontSize: 240,
    color: 'rgba(201,168,76,0.02)',
    fontFamily: 'System',
    transform: [{ rotate: '-12deg' }],
    pointerEvents: 'none',
  },

  heroSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: 10,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroEyebrow: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 4,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  heroTitle: {
    fontFamily: Fonts.heading,
    fontSize: 36,
    color: Colors.text,
    letterSpacing: 1,
  },
  endBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(139,26,26,0.4)',
    backgroundColor: 'rgba(139,26,26,0.1)',
    marginTop: 8,
  },
  endBtnText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.blood,
    letterSpacing: 0.5,
  },
  heroDesc: {
    fontFamily: Fonts.proseItalic,
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(14,11,20,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  heroStatItem: {
    flex: 1,
    flexDirection: 'row',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 3,
  },
  heroStatVal: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    color: Colors.gold,
    lineHeight: 24,
  },
  heroStatLabel: {
    fontFamily: Fonts.body,
    fontSize: 7,
    letterSpacing: 1.5,
    color: Colors.textMuted,
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignSelf: 'stretch',
  },

  swiftForgeCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(14,11,20,0.9)',
  },
  swiftForgeLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  swiftForgeIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.goldBorder,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  swiftForgeIcon: { fontSize: 20, fontFamily: 'System', color: Colors.gold },
  swiftForgeTitle: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.gold, letterSpacing: 0.5, marginBottom: 2 },
  swiftForgeSub: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted },
  swiftForgeArrow: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.gold, opacity: 0.6 },

  activeHeroCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(14,11,20,0.95)',
    gap: 14,
  },
  activeHeroCardLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  activeHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  activeHeroLeft: { flex: 1 },
  activeHeroEyebrow: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 3,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  activeHeroName: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  activeHeroSub: {
    fontFamily: Fonts.prose,
    fontSize: 13,
    color: Colors.textMuted,
  },
  activeHeroIconWrap: {
    width: 72, height: 72,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  weekProgressWrap: { gap: 8 },
  weekProgressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekProgressLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 2,
    color: Colors.textMuted,
  },
  weekProgressVal: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 1,
  },
  weekProgressTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  weekProgressFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  weekProgressShine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },

  dayPills: { flexDirection: 'row', gap: 6 },
  dayPill: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    position: 'relative',
  },
  dayPillToday: { backgroundColor: 'rgba(255,255,255,0.06)' },
  dayPillText: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 0,
  },
  dayPillCheck: {
    position: 'absolute',
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  dayPillDot: {
    position: 'absolute',
    bottom: 3,
    width: 4, height: 4,
    borderRadius: 2,
  },

  todayCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(14,11,20,0.8)',
    gap: 10,
  },
  todayCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  todayTypeRune: {
    fontSize: 14,
    fontFamily: 'System',
  },
  todayTypeText: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  todayXP: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    letterSpacing: 1,
  },
  todayName: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  todayDuration: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: -4,
  },
  exerciseList: { gap: 8 },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exerciseDot: {
    width: 5, height: 5,
    borderRadius: 3,
    opacity: 0.7,
  },
  exerciseText: {
    fontFamily: Fonts.prose,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  beginTodayBtn: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 4,
  },
  beginTodayBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    letterSpacing: 1.5,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dividerRune: {
    fontSize: 16,
    color: 'rgba(201,168,76,0.2)',
    fontFamily: 'System',
  },

  sectionLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    marginBottom: 6,
  },
  sectionSub: {
    fontFamily: Fonts.proseItalic,
    fontSize: 13,
    color: Colors.textDim,
    fontStyle: 'italic',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },

  programCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(14,11,20,0.9)',
    gap: 14,
  },
  programCardLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  programIconWrap: {
    width: 72, height: 72,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programHeaderInfo: { flex: 1 },
  programNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 3,
  },
  programName: {
    fontFamily: Fonts.heading,
    fontSize: 17,
    letterSpacing: 0.5,
  },
  proTag: {
    backgroundColor: Colors.goldMuted,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proTagText: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.gold,
    letterSpacing: 1,
  },
  activeTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeTagText: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 1,
  },
  programSub: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textMuted,
  },
  programDesc: {
    fontFamily: Fonts.prose,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  programMeta: { flexDirection: 'row' },
  programMetaItem: { flex: 1, gap: 3 },
  programMetaLabel: {
    fontFamily: Fonts.body,
    fontSize: 7,
    letterSpacing: 2,
    color: Colors.textDim,
  },
  programMetaVal: {
    fontFamily: Fonts.subheading,
    fontSize: 12,
    color: Colors.text,
  },

  weekPreview: { flexDirection: 'row', gap: 6 },
  weekPreviewDay: {
    flex: 1,
    borderRadius: 9,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 5,
  },
  weekPreviewDayLabel: {
    fontFamily: Fonts.body,
    fontSize: 7,
    letterSpacing: 1,
  },
  weekPreviewDayRune: {
    fontSize: 9,
    fontFamily: 'System',
    opacity: 0.85,
  },

  beginBtn: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  beginBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    letterSpacing: 1.5,
  },

  bottomRunes: { alignItems: 'center', paddingVertical: Spacing.lg },
  bottomRuneText: {
    fontFamily: 'System',
    fontSize: 13,
    color: 'rgba(201,168,76,0.08)',
    letterSpacing: 10,
  },
});