import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWarriorStore } from '@/lib/store';
import { useWarriorProfile } from '@/lib/useWarriorProfile';
import { WORKOUT_META, WORKOUT_XP, type WorkoutType } from '@/constants/ranks';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width } = Dimensions.get('window');

// ── Hávamál Quotes ───────────────────────────────────────
const HAVAMÁL_QUOTES = [
  { verse: 77, text: 'Cattle die, kinsmen die, the self must also die. I know one thing which never dies: the reputation of each dead man.' },
  { verse: 1,  text: 'All doorways, before going forward, should be looked at; for it is uncertain where enemies are sitting in the dwelling.' },
  { verse: 6,  text: 'He has need of fire who has come from outside, cold to the knee; food and dry clothes the man needs who has crossed the fells.' },
  { verse: 10, text: 'No better burden can a man carry on the road than a store of common sense.' },
  { verse: 15, text: 'The son of a king shall be silent and thoughtful in battle; every man should be brave and happy until he meets his death.' },
  { verse: 16, text: 'The cowardly man thinks he will live forever if he keeps away from fighting; but old age will not spare him even if the spears do.' },
  { verse: 18, text: 'Only that man knows who wanders wide and has traveled much: what kind of mind each man has.' },
  { verse: 20, text: 'The knowing man is moderate in all things; the wisest men are those who know most.' },
  { verse: 23, text: 'The man of little sense lies awake all night thinking over everything; he is tired out when morning comes and everything is just as bad as it was.' },
  { verse: 24, text: 'A foolish man thinks all who laugh with him are his friends; he does not feel it when they speak ill of him.' },
  { verse: 27, text: 'A foolish man who comes among people had better be silent; no one knows that he knows nothing unless he talks too much.' },
  { verse: 34, text: 'A long detour it is to a bad friend, even if he lives on the road; but the road to a good friend is short even if he lives far away.' },
  { verse: 36, text: 'Fields and stores are needed — a man needs these; but a man needs his friends most of all.' },
  { verse: 47, text: 'Young I was once, I walked alone and lost my way; rich I thought myself when I met another man — man is the joy of man.' },
  { verse: 50, text: 'The pine tree withers away that stands in the farmyard; neither bark nor needles shelter it. So is the man whom none loves.' },
  { verse: 55, text: 'Moderately wise a man should be, not too crafty or clever; a learned man whose learning is deep seldom recites good verses.' },
  { verse: 56, text: 'Moderately wise a man should be, not too crafty or clever; he who knows his own mind best is the most content.' },
  { verse: 57, text: 'Fire is best among the sons of men and the sight of the sun; his health, if he can keep it, and a life without shame.' },
  { verse: 63, text: 'Wash and be well-fed when you go to the Thing; though your clothes be not the best, be not ashamed of your shoes or your horse.' },
  { verse: 71, text: 'It is better to be alive than lifeless; the living man can keep a cow. Fire I saw burning for a wealthy man, dead outside his door.' },
  { verse: 72, text: 'A son is better, though he be born late, after the departure of the gods; seldom standing stones stand beside the road unless the kinsman raises them.' },
  { verse: 76, text: 'Wealth dies, friends die, death claims the man himself; but a fair fame never dies for him who achieves it.' },
  { verse: 77, text: 'Cattle die, kinsmen die, the self must also die. I know one thing which never dies: the reputation of each dead man.' },
  { verse: 79, text: 'The lame can ride a horse, the handless drive cattle, the deaf can fight and succeed; it is better to be blind than to be burned: a corpse is of no use to anyone.' },
];

function getDailyQuote() {
  const today = new Date().toISOString().split('T')[0];
  const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
  return HAVAMÁL_QUOTES[seed % HAVAMÁL_QUOTES.length];
}

const QUEST_POOL = [
  { id: 'q1', type: 'strength', title: 'Iron Will', desc: 'Complete a heavy lifting session', xp: 200, rune: 'ᚦ' },
  { id: 'q2', type: 'endurance', title: 'The Great Run', desc: 'Run or walk at least 2 miles', xp: 150, rune: 'ᚢ' },
  { id: 'q3', type: 'combat', title: 'Blood Sport', desc: 'Complete a HIIT or combat drill', xp: 175, rune: 'ᚱ' },
  { id: 'q4', type: 'recovery', title: 'Sacred Rest', desc: 'Stretch, yoga, or mobility work', xp: 100, rune: 'ᛁ' },
  { id: 'q5', type: 'strength', title: 'Berserker Set', desc: 'Complete 100 total reps of any lift', xp: 200, rune: 'ᚦ' },
  { id: 'q6', type: 'endurance', title: 'Longship Row', desc: 'Row, cycle, or swim for 20 min', xp: 150, rune: 'ᚢ' },
  { id: 'q7', type: 'combat', title: 'Warrior Drill', desc: 'Complete 5 rounds of any circuit', xp: 175, rune: 'ᚱ' },
  { id: 'q8', type: 'recovery', title: 'The Mead Hall', desc: 'Hit your protein goal today', xp: 100, rune: 'ᛁ' },
];

const WORKOUT_TYPES: { type: WorkoutType; label: string; desc: string; rune: string; color: string }[] = [
  { type: 'strength', label: 'IRON FORGING', desc: 'Weights, resistance, lifting', rune: 'ᚦ', color: Colors.gold },
  { type: 'endurance', label: 'THE LONG RAID', desc: 'Run, row, cycle, swim', rune: 'ᚢ', color: Colors.ice },
  { type: 'combat', label: 'BATTLE DRILLS', desc: 'HIIT, circuits, conditioning', rune: 'ᚱ', color: Colors.blood },
  { type: 'recovery', label: 'SACRED REST', desc: 'Stretch, yoga, mobility', rune: 'ᛁ', color: '#8B6FD4' },
];

function getDailyQuests() {
  const today = new Date().toISOString().split('T')[0];
  const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
  const shuffled = [...QUEST_POOL].sort((a, b) => {
    const ha = (seed * a.id.charCodeAt(1)) % 97;
    const hb = (seed * b.id.charCodeAt(1)) % 97;
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

export default function TrialsScreen() {
  const { todayWorkouts, recordWorkout, loadWarrior, isPro } = useWarriorStore();
  const { isShieldmaiden } = useWarriorProfile();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [loggedTypes, setLoggedTypes] = useState<WorkoutType[]>([]);
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [quoteExpanded, setQuoteExpanded] = useState(false);
  const dailyQuests = getDailyQuests();
  const dailyQuote = getDailyQuote();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const quoteAnim = useRef(new Animated.Value(0)).current;

  const accentColor = isShieldmaiden ? '#D4A8C4' : Colors.gold;

  useFocusEffect(useCallback(() => {
    loadWarrior();
    loadCompletedQuests();
    loadLoggedTypes();
  }, []));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.timing(quoteAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }, 400);
  }, []);

  function completeQuest(quest: typeof QUEST_POOL[0]) {
    if (completedIds.includes(quest.id)) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated = [...completedIds, quest.id];
    setCompletedIds(updated);
    AsyncStorage.setItem(`trials_completed_${getTodayKey()}`, JSON.stringify(updated));
    recordWorkout(quest.type as WorkoutType);
    maybeShowValkyrieMoment();
  }

  async function loadCompletedQuests() {
    try {
      const raw = await AsyncStorage.getItem(`trials_completed_${getTodayKey()}`);
      setCompletedIds(raw ? JSON.parse(raw) : []);
    } catch (e) {}
  }

  async function loadLoggedTypes() {
    try {
      const raw = await AsyncStorage.getItem(`manual_logged_types_${getTodayKey()}`);
      setLoggedTypes(raw ? JSON.parse(raw) : []);
    } catch (e) {}
  }

  async function maybeShowValkyrieMoment() {
    if (!isShieldmaiden) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastShown = await AsyncStorage.getItem('valkyrie_moment_shown');
      if (lastShown !== today) {
        await AsyncStorage.setItem('valkyrie_moment_shown', today);
        setTimeout(() => router.push('/(modals)/valkyrie-moment'), 800);
      }
    } catch (e) {}
  }

  async function handleLogWorkout() {
    if (!selectedType) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Check if this type already logged today — if so, still record but award 0 XP
    const alreadyLogged = loggedTypes.includes(selectedType);

    // Update logged types for today
    if (!alreadyLogged) {
      const updated = [...loggedTypes, selectedType];
      setLoggedTypes(updated);
      await AsyncStorage.setItem(`manual_logged_types_${getTodayKey()}`, JSON.stringify(updated));
    }

    if (selectedType === 'strength') {
      router.push({
        pathname: '/(modals)/exercise-picker',
        params: { noXp: alreadyLogged ? '1' : '0' },
      });
      setSelectedType(null);
      return;
    }
    if (selectedType === 'endurance' || selectedType === 'combat') {
      router.push({
        pathname: '/(modals)/cardio-log',
        params: { type: selectedType, noXp: alreadyLogged ? '1' : '0' },
      });
      setSelectedType(null);
      return;
    }
    if (selectedType === 'recovery') {
      router.push({
        pathname: '/(modals)/recovery-log',
        params: { type: selectedType, noXp: alreadyLogged ? '1' : '0' },
      });
      setSelectedType(null);
      return;
    }

    // Fallback direct log (shouldn't hit for current types but kept for safety)
    if (!alreadyLogged) {
      recordWorkout(selectedType);
      await maybeShowValkyrieMoment();
    }
    setSelectedType(null);
  }

  const completedCount = completedIds.length;
  const totalQuests = dailyQuests.length;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0C0A10', '#050508']} style={StyleSheet.absoluteFill} />
      <Text style={styles.watermark}>ᚦ</Text>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>

            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>DAILY</Text>
                <Text style={styles.title}>TRIALS</Text>
              </View>
              {isPro && (
                <View style={styles.questCounter}>
                  <Text style={styles.questCounterNum}>{completedCount}</Text>
                  <View style={styles.questCounterDivider} />
                  <Text style={styles.questCounterTotal}>{totalQuests}</Text>
                  <Text style={styles.questCounterLabel}>COMPLETE</Text>
                </View>
              )}
            </View>

            {/* Hávamál Quote Card */}
            <Animated.View style={{ opacity: quoteAnim }}>
              <TouchableOpacity
                style={styles.quoteCard}
                onPress={() => {
                  setQuoteExpanded(!quoteExpanded);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['rgba(201,168,76,0.07)', 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={['transparent', Colors.gold, 'transparent']}
                  style={styles.quoteTopLine}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <View style={styles.quoteLeft}>
                  <Text style={styles.quoteRune}>ᚹ</Text>
                </View>
                <View style={styles.quoteBody}>
                  <Text style={styles.quoteEyebrow}>HÁVAMÁL · VERSE {dailyQuote.verse}</Text>
                  <Text
                    style={styles.quoteText}
                    numberOfLines={quoteExpanded ? undefined : 2}
                  >
                    "{dailyQuote.text}"
                  </Text>
                  {!quoteExpanded && dailyQuote.text.length > 100 && (
                    <Text style={styles.quoteMore}>tap to read more</Text>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Pro quests or lock card */}
            {isPro ? (
              <>
                {/* Progress bar */}
                <View style={styles.progressWrap}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${(completedCount / totalQuests) * 100}%` }]}>
                      <LinearGradient
                        colors={[Colors.goldDark, Colors.gold]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    </View>
                  </View>
                  <Text style={styles.progressText}>
                    {completedCount === totalQuests
                      ? 'All trials complete — Odin is pleased'
                      : `${totalQuests - completedCount} trial${totalQuests - completedCount !== 1 ? 's' : ''} remaining`}
                  </Text>
                </View>

                <Text style={styles.sectionLabel}>ORDAINED TRIALS</Text>
                <Text style={styles.sectionSub}>
                  Complete these to earn Valor. Resets at midnight.
                </Text>

                {dailyQuests.map((quest) => {
                  const isDone = completedIds.includes(quest.id);
                  return (
                    <TouchableOpacity
                      key={quest.id}
                      style={[styles.questCard, isDone && styles.questCardDone]}
                      onPress={() => completeQuest(quest)}
                      activeOpacity={0.75}
                    >
                      {isDone && (
                        <LinearGradient
                          colors={['rgba(201,168,76,0.04)', 'transparent']}
                          style={StyleSheet.absoluteFill}
                        />
                      )}
                      <LinearGradient
                        colors={['transparent', Colors.gold, 'transparent']}
                        style={[styles.questCardLine, isDone && { opacity: 0.3 }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                      <View style={[styles.questRune, isDone && styles.questRuneDone]}>
                        <Text style={[styles.questRuneText, isDone && { color: Colors.gold, opacity: 0.4 }]}>
                          {isDone ? '✓' : quest.rune}
                        </Text>
                      </View>
                      <View style={styles.questInfo}>
                        <Text style={[styles.questTitle, isDone && styles.questTitleDone]}>
                          {quest.title}
                        </Text>
                        <Text style={styles.questDesc}>{quest.desc}</Text>
                      </View>
                      <View style={styles.questXPWrap}>
                        <Text style={[styles.questXP, isDone && { opacity: 0.3 }]}>
                          {isDone ? '✦' : `+${quest.xp}`}
                        </Text>
                        <Text style={styles.questXPLabel}>
                          {isDone ? 'CLAIMED' : 'VALOR'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : (
              /* Pro lock card for quests */
              <TouchableOpacity
                style={styles.proLockCard}
                onPress={() => router.push('/(modals)/paywall')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['rgba(201,168,76,0.08)', 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={['transparent', Colors.gold, 'transparent']}
                  style={styles.proLockCardLine}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <View style={styles.proLockLeft}>
                  <Text style={styles.proLockRune}>ᚲ</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.proLockTitle}>Ordained Trials</Text>
                  <Text style={styles.proLockSub}>
                    Daily guided quests with Valor rewards. Unlock with Einherjar Pro.
                  </Text>
                </View>
                <View style={styles.proLockBadge}>
                  <Text style={styles.proLockBadgeText}>PRO</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerRune}>ᛋ</Text>
              <View style={styles.dividerLine} />
            </View>
            <TouchableOpacity
  style={styles.challengesEntryCard}
  onPress={() => router.push('/(modals)/viking-challenges' as any)}
  activeOpacity={0.85}
>
  <LinearGradient
    colors={['rgba(201,168,76,0.08)', 'transparent']}
    style={StyleSheet.absoluteFill}
  />
  <LinearGradient
    colors={['transparent', Colors.gold, 'transparent']}
    style={styles.challengesEntryLine}
    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
  />
  <View style={styles.challengesEntryLeft}>
    <Text style={styles.challengesEntryRune}>ᛏ</Text>
  </View>
  <View style={{ flex: 1 }}>
    <Text style={styles.challengesEntryTitle}>Viking Challenges</Text>
    <Text style={styles.challengesEntrySub}>
      Character trials beyond the gym — earn Valor your own way.
    </Text>
  </View>
  <Text style={styles.challengesEntryArrow}>→</Text>
</TouchableOpacity>

            {/* Manual log — always available */}
            <Text style={styles.sectionLabel}>LOG A BATTLE</Text>
            <Text style={styles.sectionSub}>
              Choose your discipline and record your effort.
            </Text>

            {WORKOUT_TYPES.map((item) => {
              const isSelected = selectedType === item.type;
              const alreadyLogged = loggedTypes.includes(item.type);
              return (
                <TouchableOpacity
                  key={item.type}
                  style={[styles.typeCard, isSelected && { borderColor: `${item.color}40` }]}
                  onPress={() => {
                    setSelectedType(isSelected ? null : item.type);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.75}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={[`${item.color}08`, 'transparent']}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <View style={[styles.typeRune, isSelected && {
                    borderColor: `${item.color}40`,
                    backgroundColor: `${item.color}10`,
                  }]}>
                    <Text style={[styles.typeRuneText, { color: isSelected ? item.color : Colors.textMuted }]}>
                      {item.rune}
                    </Text>
                  </View>
                  <View style={styles.typeInfo}>
                    <Text style={[styles.typeLabel, isSelected && { color: item.color }]}>
                      {item.label}
                    </Text>
                    <Text style={styles.typeDesc}>{item.desc}</Text>
                  </View>
                  <View style={styles.typeXPWrap}>
                    {alreadyLogged ? (
                      <>
                        <Text style={[styles.typeXP, { color: Colors.textMuted, fontSize: 13 }]}>✦</Text>
                        <Text style={styles.typeXPLabel}>LOGGED</Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.typeXP, isSelected && { color: item.color }]}>
                          +{WORKOUT_XP[item.type]}
                        </Text>
                        <Text style={styles.typeXPLabel}>VALOR</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Log button */}
     <TouchableOpacity
  style={[styles.logBtn, !selectedType && styles.logBtnDisabled]}
  onPress={handleLogWorkout}
  disabled={!selectedType}
  activeOpacity={0.85}
>
  {selectedType && !loggedTypes.includes(selectedType) && (
    <LinearGradient
      colors={[Colors.goldDark, Colors.gold]}
      style={StyleSheet.absoluteFill}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    />
  )}
  <Text style={[
    styles.logBtnText,
    !selectedType && styles.logBtnTextDisabled,
    selectedType && loggedTypes.includes(selectedType) && styles.logBtnTextAlreadyLogged,
  ]}>
    {selectedType
      ? loggedTypes.includes(selectedType)
        ? 'LOG AGAIN (NO XP) →'
        : selectedType === 'strength'
        ? 'CHOOSE YOUR WEAPON →'
        : selectedType === 'endurance' || selectedType === 'combat'
        ? 'LOG THE RAID →'
        : 'LOG RECOVERY →'
      : 'SELECT A DISCIPLINE'}
  </Text>
</TouchableOpacity>
            {/* Today's battles */}
            {todayWorkouts.length > 0 && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerRune}>ᚾ</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Text style={styles.sectionLabel}>TODAY'S SAGA</Text>

                <View style={styles.logCard}>
                  {todayWorkouts.map((w, i) => {
                    const meta = WORKOUT_META[w.type as WorkoutType];
                    return (
                      <View key={w.id} style={[
                        styles.logRow,
                        i < todayWorkouts.length - 1 && styles.logRowBorder,
                      ]}>
                        <View style={styles.logRune}>
                          <Text style={styles.logRuneText}>
                            {w.type === 'strength' ? 'ᚦ'
                              : w.type === 'endurance' ? 'ᚢ'
                              : w.type === 'combat' ? 'ᚱ'
                              : 'ᛁ'}
                          </Text>
                        </View>
                        <View style={styles.logInfo}>
                          <Text style={styles.logName}>{meta?.label ?? w.type}</Text>
                          <Text style={styles.logTime}>
                            {new Date(w.created_at).toLocaleTimeString([], {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </Text>
                        </View>
                        <View style={styles.logXPWrap}>
                          <Text style={styles.logXP}>+{w.xp_earned}</Text>
                          <Text style={styles.logXPLabel}>XP</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            <View style={styles.bottomRunes}>
              <Text style={styles.bottomRuneText}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ</Text>
            </View>

          </Animated.View>
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
    bottom: 120, right: -20,
    fontSize: 220,
    color: 'rgba(201,168,76,0.025)',
    fontFamily: 'System',
    transform: [{ rotate: '-15deg' }],
    pointerEvents: 'none',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
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
  questCounter: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 14,
    backgroundColor: Colors.goldMuted,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
    gap: 2,
  },
  questCounterNum: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Colors.gold,
    lineHeight: 20,
  },
  questCounterDivider: {
    width: 20, height: 1,
    backgroundColor: Colors.goldBorder,
  },
  questCounterTotal: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  questCounterLabel: {
    fontFamily: Fonts.body,
    fontSize: 6,
    letterSpacing: 1.5,
    color: Colors.textMuted,
    marginTop: 2,
  },

  quoteCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.95)',
  },
  quoteTopLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  quoteLeft: { paddingTop: 2 },
  quoteRune: {
    fontSize: 22,
    color: Colors.gold,
    fontFamily: 'System',
    opacity: 0.6,
  },
  quoteBody: { flex: 1, gap: 5 },
  quoteEyebrow: {
    fontFamily: Fonts.body,
    fontSize: 7,
    letterSpacing: 2.5,
    color: Colors.gold,
    opacity: 0.6,
  },
  quoteText: {
    fontFamily: Fonts.proseItalic,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
    fontStyle: 'italic',
    opacity: 0.9,
  },
  quoteMore: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 1,
    marginTop: 2,
  },

  proLockCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
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
  proLockCardLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  proLockLeft: {
    width: 44, height: 44,
    borderRadius: 12,
    backgroundColor: Colors.goldMuted,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proLockRune: {
    fontSize: 22,
    color: Colors.gold,
    fontFamily: 'System',
  },
  proLockTitle: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.gold,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  proLockSub: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  proLockBadge: {
    backgroundColor: Colors.goldMuted,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proLockBadgeText: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.gold,
    letterSpacing: 1.5,
  },

  progressWrap: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: 8,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressText: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textDim,
    fontStyle: 'italic',
  },

  sectionLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    marginBottom: 4,
  },
  sectionSub: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textDim,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },

  questCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
  },
  questCardDone: {
    borderColor: 'rgba(201,168,76,0.12)',
    opacity: 0.55,
  },
  questCardLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  questRune: {
    width: 40, height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questRuneDone: {
    backgroundColor: 'rgba(201,168,76,0.06)',
    borderColor: 'rgba(201,168,76,0.15)',
  },
  questRuneText: {
    fontSize: 18,
    color: Colors.textMuted,
    fontFamily: 'System',
  },
  questInfo: { flex: 1 },
  questTitle: {
    fontFamily: Fonts.subheading,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 3,
  },
  questTitleDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  questDesc: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  questXPWrap: { alignItems: 'flex-end' },
  questXP: {
    fontFamily: Fonts.heading,
    fontSize: 17,
    color: Colors.gold,
  },
  questXPLabel: {
    fontFamily: Fonts.body,
    fontSize: 7,
    letterSpacing: 2,
    color: Colors.textMuted,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
    gap: 12,
  },
  dividerLine: {
    flex: 1, height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dividerRune: {
    fontSize: 16,
    color: 'rgba(201,168,76,0.2)',
    fontFamily: 'System',
  },

  typeCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(20,16,28,0.95)',
  },
  typeRune: {
    width: 44, height: 44,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeRuneText: {
    fontSize: 20,
    fontFamily: 'System',
  },
  typeInfo: { flex: 1 },
  typeLabel: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 3,
  },
  typeDesc: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textMuted,
  },
  typeXPWrap: { alignItems: 'flex-end' },
  typeXP: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.gold,
  },
  typeXPLabel: {
    fontFamily: Fonts.body,
    fontSize: 7,
    letterSpacing: 2,
    color: Colors.textDim,
  },

  logBtn: {
    marginHorizontal: Spacing.lg,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: 4,
  },
  logBtnDisabled: { borderColor: 'rgba(255,255,255,0.06)' },
  logBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.void,
    letterSpacing: 2,
  },
  logBtnTextDisabled: { color: Colors.textMuted },

  logCard: {
    marginHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.7)',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  logRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logRune: {
    width: 34, height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(201,168,76,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logRuneText: {
    fontSize: 16,
    color: Colors.gold,
    fontFamily: 'System',
  },
  logInfo: { flex: 1 },
  logName: {
    fontFamily: Fonts.subheading,
    fontSize: 13,
    color: Colors.text,
    marginBottom: 2,
  },
  logTime: {
    fontFamily: Fonts.prose,
    fontSize: 11,
    color: Colors.textMuted,
  },
  logXPWrap: { alignItems: 'flex-end' },
  logXP: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.gold,
  },
  logXPLabel: {
    fontFamily: Fonts.body,
    fontSize: 7,
    letterSpacing: 2,
    color: Colors.textMuted,
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

logBtnTextAlreadyLogged: { color: Colors.gold },
challengesEntryCard: {
  marginHorizontal: Spacing.lg,
  marginBottom: Spacing.md,
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
challengesEntryLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
challengesEntryLeft: {
  width: 44, height: 44,
  borderRadius: 12,
  backgroundColor: Colors.goldMuted,
  borderWidth: 1,
  borderColor: Colors.goldBorder,
  alignItems: 'center',
  justifyContent: 'center',
},
challengesEntryRune: { fontSize: 22, color: Colors.gold, fontFamily: 'System' },
challengesEntryTitle: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.gold, letterSpacing: 0.5, marginBottom: 4 },
challengesEntrySub: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
challengesEntryArrow: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.gold, opacity: 0.5 },
});