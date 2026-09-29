import { useEffect, useRef, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, TextInput, Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWarriorStore } from '@/lib/store';
import { getRank, WORKOUT_META, getRankTitle } from '@/constants/ranks';
import { PROGRAMS, TYPE_COLORS } from '@/constants/programs';
import { StreakFlame } from '../../components/StreakFlame';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';
import { useWarriorProfile } from '@/lib/useWarriorProfile';
import { getRecentSagaEntries, cleanSagaText, type SagaEntry, logRavenCheckin, getTodayRavenCheckin, getRecentRavenCheckins, type RavenCheckin, addXP } from '@/lib/db';
import { getTrialProgress, isTrialClaimedThisWeek, claimTrialReward, getSeasonalTheme, WEEKLY_TRIAL_REWARD_XP, recordLegend, getLegends, formatTrialResult, type TrialProgress, type LegendEntry } from '@/lib/weeklyTrial';
import {
  TRIP_PROFILES, getTripProfile, startVacation, endVacation, getActiveVacation,
  getVacationMission, getReturnMission, getVacationCount, getLastTripType,
  tripDayProgress, extendVacation,
  daysRemaining, type TripType, type VacationState, type Mission,
} from '@/lib/vacationMode';
const { width, height } = Dimensions.get('window');

const UPSELL_DISMISSED_KEY = 'pro_upsell_dismissed';

function ProUpsellCard({
  warriorName,
  workoutCount,
  accentColor,
  isShieldmaiden,
  onDismiss,
}: {
  warriorName: string;
  workoutCount: number;
  accentColor: string;
  isShieldmaiden: boolean;
  onDismiss: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const body = isShieldmaiden
    ? `${workoutCount} battles logged. Freya's chosen unlock crew raids, full nutrition tracking, and all four training programs.`
    : `${workoutCount} battles logged. Pro warriors unlock crew raids, full nutrition tracking, and all four training programs.`;

  return (
    <Animated.View style={[
      upsellStyles.card,
      { borderColor: `${accentColor}30`, opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
    ]}>
      <LinearGradient
        colors={[`${accentColor}10`, 'rgba(10,8,14,0.95)', 'transparent']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', accentColor, 'transparent']}
        style={upsellStyles.topLine}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      />
      <TouchableOpacity
        style={upsellStyles.dismissBtn}
        onPress={onDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={upsellStyles.dismissText}>✕</Text>
      </TouchableOpacity>
      <View style={upsellStyles.inner}>
        <View style={[upsellStyles.iconWrap, { borderColor: `${accentColor}30`, backgroundColor: `${accentColor}12` }]}>
          <Text style={[upsellStyles.icon, { color: accentColor }]}>✦</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[upsellStyles.title, { color: accentColor }]}>
            {warriorName} — your saga is incomplete.
          </Text>
          <Text style={upsellStyles.body}>{body}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[upsellStyles.ctaBtn, { borderColor: `${accentColor}40` }]}
        onPress={() => router.push('/(modals)/paywall')}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[`${accentColor}20`, `${accentColor}08`]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        />
        <Text style={[upsellStyles.ctaText, { color: accentColor }]}>
          START FREE — 3-DAY TRIAL  →
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const upsellStyles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,8,14,0.95)',
    gap: 12,
  },
  topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  dismissBtn: {
    position: 'absolute', top: 10, right: 12,
    width: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  dismissText: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textDim },
  inner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingRight: 20 },
  iconWrap: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  icon: { fontSize: 18 },
  title: { fontFamily: Fonts.heading, fontSize: 13, letterSpacing: 0.5, lineHeight: 18 },
  body: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  ctaBtn: {
    borderWidth: 1, borderRadius: 10,
    paddingVertical: 11, alignItems: 'center',
    overflow: 'hidden',
  },
  ctaText: { fontFamily: Fonts.heading, fontSize: 12, letterSpacing: 1.5 },
});

const RAVEN_IMAGE = require('@/assets/images/raven_final.png');

// A short in-character response for each mood, so checking in feels like
// the ravens actually carrying something back to Odin, not just an app
// echoing your own word back at you. Picked deterministically from the
// date + mood (not randomly) so reopening the same day's report always
// shows the same line rather than reshuffling on every render.
const RAVEN_RESPONSES: Record<string, string[]> = {
  Triumphant: [
    'Huginn carries word of victory to the high seat.',
    'Odin nods. Even the ravens do not interrupt a warrior in triumph.',
  ],
  Steady: [
    'Muninn remembers this — steadiness, over time, becomes legend.',
    'No storm today. The ravens note a warrior who simply endured.',
  ],
  Weary: [
    'Huginn carries this too — weariness is not weakness, only its cost.',
    'Even Odin rests one eye. The ravens do not judge the tired.',
  ],
  Struggling: [
    'Muninn remembers the hard days most of all — they are rarely wasted.',
    'The ravens carry this to Valhalla too. Struggle is still training.',
  ],
  Resolute: [
    'Huginn carries word of an oath unbroken, despite the cost.',
    "Odin remembers resolve most — it is rarer than triumph.",
  ],
};

function pickRavenResponse(mood: string, dateStr: string): string {
  const pool = RAVEN_RESPONSES[mood] ?? RAVEN_RESPONSES.Resolute;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  return pool[Math.abs(hash) % pool.length];
}

const RAVEN_CHECKIN_XP = 15;

const BG_RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛋ', 'ᛗ', 'ᛟ'];
const RUNE_POSITIONS = [
  { top: 60,  left: 10,              right: undefined,   size: 72,  opacity: 0.10, rotate: '12deg'  },
  { top: 180, left: undefined,       right: 14,          size: 88,  opacity: 0.07, rotate: '-8deg'  },
  { top: 340, left: 20,              right: undefined,   size: 64,  opacity: 0.09, rotate: '20deg'  },
  { top: 500, left: undefined,       right: 8,           size: 96,  opacity: 0.06, rotate: '-15deg' },
  { top: 660, left: 14,              right: undefined,   size: 80,  opacity: 0.08, rotate: '5deg'   },
  { top: 820, left: undefined,       right: 20,          size: 70,  opacity: 0.07, rotate: '30deg'  },
];

const DEFAULT_SPLIT: Record<number, {
  title: string; subtitle: string;
  type: 'strength' | 'endurance' | 'combat' | 'recovery';
  exercises: string[]; duration: string; xp: number; rune: string;
}> = {
  1: { title: 'Push Day',        subtitle: 'Chest, Shoulders & Triceps', type: 'strength',  rune: 'ᚦ', exercises: ['Bench Press 4x8', 'Overhead Press 3x10', 'Lateral Raises 3x15', 'Tricep Pushdown 3x12'], duration: '45-60 min', xp: 200 },
  2: { title: 'Pull Day',        subtitle: 'Back & Biceps',              type: 'strength',  rune: 'ᚦ', exercises: ['Deadlift 3x5', 'Pull Ups 4x8', 'Barbell Row 3x10', 'Hammer Curls 3x12'],              duration: '45-60 min', xp: 200 },
  3: { title: 'The Long Raid',   subtitle: 'Cardio & Endurance',         type: 'endurance', rune: 'ᚢ', exercises: ['Run 5km or 30 min', 'Zone 2 heart rate', 'Cool down 10 min'],                          duration: '40-50 min', xp: 150 },
  4: { title: 'Leg Day',         subtitle: 'The Foundation',             type: 'strength',  rune: 'ᚦ', exercises: ['Back Squat 4x6', 'Romanian Deadlift 3x10', 'Leg Press 3x12', 'Calf Raises 4x20'],     duration: '50-65 min', xp: 220 },
  5: { title: 'Battle Drills',   subtitle: 'HIIT & Conditioning',        type: 'combat',    rune: 'ᚱ', exercises: ['Burpees 4x15', 'KB Swings 4x20', 'Box Jumps 3x12', 'Battle Ropes 5x30s'],             duration: '35-45 min', xp: 175 },
  6: { title: 'Full Body Forge', subtitle: 'Strength & Conditioning',    type: 'strength',  rune: 'ᚦ', exercises: ['Squat 3x8', 'Push Press 3x8', 'Pull Ups 3x10', 'Core Circuit 3x'],                   duration: '50-60 min', xp: 200 },
  0: { title: 'Sacred Rest',     subtitle: 'Recovery & Mobility',        type: 'recovery',  rune: 'ᛁ', exercises: ['Full body stretch 20 min', 'Foam rolling 15 min', 'Light walk optional'],              duration: '20-30 min', xp: 80  },
};

function getMission(activeProgram: string | null, completedDays: string[]) {
  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const dayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todayKey = DAYS[dayIndex];
  if (activeProgram) {
    const program = PROGRAMS.find(p => p.id === activeProgram);
    if (program) {
      const day = program.days[dayIndex];
      return {
        title: day.name, subtitle: program.name, type: day.type,
        exercises: day.exercises, duration: day.duration, xp: day.xp,
        rune: program.rune, color: program.color, programId: program.id,
        isCompleted: completedDays.includes(todayKey),
      };
    }
  }
  const split = DEFAULT_SPLIT[new Date().getDay()];
  return { ...split, color: TYPE_COLORS[split.type], programId: null, isCompleted: false };
}

function RavenIcon({ size = 20, color = '#8B6FD4' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3 C9 3 7 5 6 8 C5.5 9.5 4 10 2.5 9.5 C3.5 11.5 5.5 12.5 7 12
           C6.5 14 6.5 16.5 8 18.5 C7 18.5 6 19 5.5 20
           C7.5 20.5 9.5 19.5 10.5 18 C11 18.5 11.5 18.7 12 18.7
           C12.5 18.7 13 18.5 13.5 18 C14.5 19.5 16.5 20.5 18.5 20
           C18 19 17 18.5 16 18.5 C17.5 16.5 17.5 14 17 12
           C18.5 12.5 20.5 11.5 21.5 9.5 C20 10 18.5 9.5 18 8
           C17 5 15 3 12 3 Z"
        fill={color}
        opacity={0.9}
      />
    </Svg>
  );
}

export default function HomeScreen() {
  const { warrior, todayWorkouts, workoutCount, totalMiles, loadWarrior,isPro } = useWarriorStore();
  const [activeProgram, setActiveProgram] = useState<string | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const [completedDays, setCompletedDays] = useState<string[]>([]);
  const [crewName, setCrewName] = useState<string | null>(null);
  const [isCrewLeader, setIsCrewLeader] = useState(false);
  const [latestChronicleEntry, setLatestChronicleEntry] = useState<SagaEntry | null>(null);
  const [todayRavenCheckin, setTodayRavenCheckin] = useState<RavenCheckin | null>(null);
  const [ravenHistory, setRavenHistory] = useState<RavenCheckin[]>([]);
  const [ravenPanelOpen, setRavenPanelOpen] = useState(false);
  const [ravenNote, setRavenNote] = useState('');
  const [vacation, setVacationState] = useState<VacationState | null>(null);
  const [vacationPanelOpen, setVacationPanelOpen] = useState(false);
  const [pendingTripType, setPendingTripType] = useState<TripType | null>(null);
   const [returnMission, setReturnMission] = useState<Mission | null>(null);
  const [vacationCount, setVacationCount] = useState(0);
  const [lastTripType, setLastTripType] = useState<TripType | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [trialProgress, setTrialProgress] = useState<TrialProgress | null>(null);
  const [trialClaimed, setTrialClaimed] = useState(false);
  const [trialPanelOpen, setTrialPanelOpen] = useState(false);
const { isShieldmaiden } = useWarriorProfile();
  const fadeAnim        = useRef(new Animated.Value(0)).current;
  const runeAnim        = useRef(new Animated.Value(0)).current;
  const missionAnim     = useRef(new Animated.Value(0)).current;
  const xpAnim          = useRef(new Animated.Value(0)).current;
  const toastAnim       = useRef(new Animated.Value(0)).current;
   const havamolAnim     = useRef(new Animated.Value(0)).current;
  const trialOrbAnim    = useRef(new Animated.Value(0)).current;
  const [havamolVerse, setHavamolVerse] = useState<{ num: number; text: string } | null>(null);
  const xp          = warrior?.total_xp ?? 0;
  const rank        = getRank(xp);
  const streakDays  = warrior?.streak_days ?? 0;
  const baseMission = getMission(activeProgram, completedDays);
  const tripProfile = vacation ? getTripProfile(vacation.tripType) : null;
  const tripProgress = vacation ? tripDayProgress(vacation) : null;
  const vacationMission = vacation ? getVacationMission(vacation) : null;
  const mission = vacationMission
    ? { ...vacationMission, color: Colors.ice, programId: null, isCompleted: false }
    : returnMission
    ? { ...returnMission, color: TYPE_COLORS[returnMission.type], programId: null, isCompleted: false }
    : baseMission;
  const trainedToday = todayWorkouts.length > 0;
  const xpPct       = Math.round(rank.progress * 100);
const accentColor = isShieldmaiden ? '#D4A8C4' : Colors.gold;
const seasonalTheme = getSeasonalTheme();
  const trialColor = seasonalTheme?.color ?? Colors.gold;
  const trialAccent = seasonalTheme?.accent ?? '#B8860B';
useFocusEffect(useCallback(() => {
    loadWarrior();
    loadProgramState();
    loadCrewState();
    loadChronicleState();
       loadRavenState();
    loadVacationState();
    loadWeeklyTrialState();
    setTimeout(() => checkNewVerse(), 300);
  }, [isPro]));
  async function loadProgramState() {
    try {
      const prog = await AsyncStorage.getItem('active_program');
      const days = await AsyncStorage.getItem('completed_days');
      if (prog) setActiveProgram(prog);
      if (days) setCompletedDays(JSON.parse(days));
    } catch (e) {}
  }

  async function loadCrewState() {
    try {
      const name   = await AsyncStorage.getItem('valhalla_crew_name');
      const leader = await AsyncStorage.getItem('valhalla_is_leader');
      setCrewName(name);
      setIsCrewLeader(leader === 'true');
    } catch (e) {}
  }

  function loadChronicleState() {
    try {
      if (!isPro) { setLatestChronicleEntry(null); return; }
      const recent = getRecentSagaEntries(1);
      setLatestChronicleEntry(recent[0] ?? null);
    } catch (e) {
      setLatestChronicleEntry(null);
    }
  }

  function loadRavenState() {
    try {
      setTodayRavenCheckin(getTodayRavenCheckin());
      setRavenHistory(getRecentRavenCheckins(7));
    } catch (e) {
      setTodayRavenCheckin(null);
      setRavenHistory([]);
    }
  }
    async function loadWeeklyTrialState() {
    try {
      setTrialProgress(getTrialProgress());
      setTrialClaimed(await isTrialClaimedThisWeek());
    } catch (e) {}
  }

  async function handleClaimTrial() {
    if (!trialProgress?.complete || trialClaimed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await claimTrialReward();
    addXP(WEEKLY_TRIAL_REWARD_XP);
    loadWarrior();
    setTrialClaimed(true);
  }

  async function loadVacationState() {
    try {
      const active = await getActiveVacation();
      setVacationState(active);
      setReturnMission(active ? null : await getReturnMission());
      setVacationCount(await getVacationCount());
      setLastTripType(await getLastTripType());
    } catch (e) {}
  }

  function handleBeginVacation(days: number) {
    if (!pendingTripType) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startVacation(pendingTripType, days).then(state => {
      setVacationState(state);
      setReturnMission(null);
      setLastTripType(pendingTripType);
      setVacationCount(c => c + 1);
      setVacationPanelOpen(false);
      setPendingTripType(null);
    });
  }

  function handleEndVacation() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    endVacation().then(() => {
      setVacationState(null);
      setVacationPanelOpen(false);
      setConfirmEnd(false);
    });
  }

  function handleEndVacationPress() {
    if (!confirmEnd) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setConfirmEnd(true);
      setTimeout(() => setConfirmEnd(false), 4000);
      return;
    }
    handleEndVacation();
  }

  function handleExtendVacation(days: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    extendVacation(days).then(state => {
      if (state) setVacationState(state);
    });
  }
  function ravenMoodColor(mood: string): string {
    if (mood.includes('Triumphant')) return Colors.gold;
    if (mood.includes('Steady'))     return Colors.ice;
    if (mood.includes('Weary'))      return Colors.textMuted;
    if (mood.includes('Struggling')) return Colors.blood;
    if (mood.includes('Resolute'))   return '#8B6FD4';
    return '#8B6FD4';
  }

  function submitRavenCheckin(mood: string) {
    const isFirstCheckinToday = !todayRavenCheckin;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logRavenCheckin(mood, ravenNote.trim());

    if (isFirstCheckinToday) {
      addXP(RAVEN_CHECKIN_XP);
      loadWarrior();
    }

    setRavenNote('');
    loadRavenState();
  }

  async function checkNewVerse() {
    try {
      const lastShown = await AsyncStorage.getItem('havamol_last_verse_shown');
      const lastCount = lastShown ? parseInt(lastShown) : 0;
      const liveCount = useWarriorStore.getState().workoutCount;
      const current = Math.max(3, Math.min(liveCount, 164));
    if (current > lastCount && liveCount > 0) {
        const VERSE_PREVIEWS: Record<number, string> = {
          4:  'The witless man thinks all who smile at him are friends.',
          5:  'A man who travels far rarely needs more wit than ordinary men.',
          10: 'The fool thinks he will live forever if he avoids a fight.',
          21: 'Cattle die. Kinsmen die. One day you too will die.',
          22: 'I know one thing that never dies — the reputation of the dead.',
          30: 'Iron sharpens iron, and one man sharpens another.',
          34: 'The generous and bold man lives the best life.',
          76: 'The fame of one who has done good deeds will never die.',
          77: 'Cattle die. Kinsmen die. One day you too will die.',
        };
        const preview = VERSE_PREVIEWS[current] ?? `Stanza ${current} now revealed.`;
        setHavamolVerse({ num: current, text: preview });
        await AsyncStorage.setItem('havamol_last_verse_shown', String(current));
        havamolAnim.setValue(0);
        Animated.sequence([
          Animated.timing(havamolAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.delay(3500),
          Animated.timing(havamolAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => setHavamolVerse(null));
      }
    } catch (e) {}
  }

   useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,    { toValue: 1,            duration: 700,  useNativeDriver: true }),
      Animated.timing(runeAnim,    { toValue: 1,            duration: 2000, useNativeDriver: true }),
      Animated.timing(missionAnim, { toValue: 1,            duration: 800,  delay: 150, useNativeDriver: true }),
      Animated.timing(xpAnim,      { toValue: rank.progress, duration: 1600, delay: 600, useNativeDriver: false }),
    ]).start();
  }, [xp]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(trialOrbAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(trialOrbAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
  if (isPro) { setShowUpsell(false); return; }
  AsyncStorage.getItem(UPSELL_DISMISSED_KEY).then(val => {
    if (val !== 'true' && workoutCount >= 5) {
      setShowUpsell(true);
    }
  });
}, [isPro, workoutCount]);

async function dismissUpsell() {
  setShowUpsell(false);
  await AsyncStorage.setItem(UPSELL_DISMISSED_KEY, 'true');
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

  function handleBeginMission() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (mission.type === 'strength')       router.push('/(modals)/exercise-picker');
    else if (mission.type === 'recovery')  router.push({ pathname: '/(modals)/recovery-log', params: { type: 'recovery' } });
    else                                   router.push({ pathname: '/(modals)/cardio-log',   params: { type: mission.type } });
  }

  const xpBarWidth = xpAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0E0B14', '#08060C', '#050508']} style={StyleSheet.absoluteFill} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} />
      <LinearGradient colors={['rgba(201,168,76,0.06)', 'transparent']} style={styles.topHaze} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} pointerEvents="none" />

      <Animated.View style={[styles.runeField, { opacity: runeAnim, pointerEvents: 'none' }]}>
        {RUNE_POSITIONS.map((pos, i) => (
          <Text key={i} style={[styles.bgRune, {
            top: pos.top,
            ...(pos.left !== undefined ? { left: pos.left } : { right: pos.right }),
            fontSize: pos.size, opacity: pos.opacity,
            transform: [{ rotate: pos.rotate }],
          }]}>{BG_RUNES[i % BG_RUNES.length]}</Text>
        ))}
      </Animated.View>

      {/* Frost shield toast */}
      <Animated.View style={[styles.toast, {
        opacity: toastAnim,
        transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
      }]}>
        <LinearGradient colors={['rgba(168,196,212,0.15)', 'rgba(168,196,212,0.05)']} style={StyleSheet.absoluteFill} />
        <Text style={styles.toastIcon}>ᚲ</Text>
        <Text style={styles.toastText}>Frost Shield used — streak protected</Text>
      </Animated.View>

      {/* Hávamál verse unlock toast */}
      {havamolVerse && (
        <Animated.View style={[styles.havamolToast, {
          opacity: havamolAnim,
          transform: [{ translateY: havamolAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
        }]}>
          <LinearGradient colors={['rgba(201,168,76,0.12)', 'rgba(201,168,76,0.04)']} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['transparent', Colors.gold, 'transparent']} style={styles.havamolToastLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          <TouchableOpacity
            style={styles.havamolToastInner}
            onPress={() => router.push('/(modals)/havamol' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.havamolToastRune}>ᚺ</Text>
            <View style={styles.havamolToastText}>
              <Text style={styles.havamolToastEyebrow}>ODIN'S WISDOM · STANZA {havamolVerse.num} UNLOCKED</Text>
              <Text style={styles.havamolToastVerse} numberOfLines={1}>{havamolVerse.text}</Text>
            </View>
            <Text style={styles.havamolToastArrow}>→</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >

          {/* ── HEADER ── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.warriorName} numberOfLines={1}>
                {warrior?.name ?? 'Warrior'}
              </Text>
            </View>
            <View style={styles.headerChips}>
              <TouchableOpacity
                style={styles.ravenHeaderBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRavenPanelOpen(o => !o); }}
                activeOpacity={0.8}
              >
                <Image source={RAVEN_IMAGE} style={styles.ravenHeaderBtnImage} resizeMode="contain" />
              </TouchableOpacity>
              <View style={styles.headerChipsColumn}>
                <TouchableOpacity
                  style={[styles.crewChip, crewName
                    ? { borderColor: 'rgba(201,168,76,0.3)', backgroundColor: 'rgba(201,168,76,0.08)' }
                    : { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/crew' as any); }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.crewChipRune, { color: crewName ? Colors.gold : Colors.textMuted }]}>ᚢ</Text>
                  <Text style={[styles.crewChipText, { color: crewName ? Colors.gold : Colors.textMuted }]} numberOfLines={1}>
                    {crewName ?? 'No Crew'}
                  </Text>
                  {isCrewLeader && <View style={styles.crewLeaderDot} />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.proChip} onPress={() => router.push('/(modals)/paywall')}>
                  <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <Text style={styles.proChipText}>✦ PRO</Text>
                </TouchableOpacity>
              </View>
            </View>
                   </View>

          {/* ── WEEKLY TRIAL ORB ── */}
                      {trialProgress && (
            <TouchableOpacity
              style={[styles.trialBanner, { borderColor: `${trialColor}50`, shadowColor: trialColor }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTrialPanelOpen(o => !o); }}
              activeOpacity={0.9}
            >
              <View style={styles.trialBannerClip}>
                <LinearGradient colors={[`${trialColor}22`, 'transparent', `${trialAccent}12`]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <LinearGradient colors={[`${trialAccent}18`, 'transparent', `${trialColor}10`]} style={StyleSheet.absoluteFill} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} />
                <LinearGradient colors={['transparent', trialColor, 'transparent']} style={styles.trialBannerTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                <View style={styles.trialInnerEngrave} pointerEvents="none" />

                <Text style={[styles.trialWatermarkRune, { color: trialColor }]} pointerEvents="none">
                  {seasonalTheme?.rune ?? trialProgress.trial.rune}
                </Text>

                <View style={[styles.trialCornerTL, { borderColor: `${trialAccent}90` }]} pointerEvents="none" />
                <View style={[styles.trialCornerTR, { borderColor: `${trialAccent}90` }]} pointerEvents="none" />
                <View style={[styles.trialCornerBL, { borderColor: `${trialAccent}90` }]} pointerEvents="none" />
                <View style={[styles.trialCornerBR, { borderColor: `${trialAccent}90` }]} pointerEvents="none" />

                <View style={[styles.trialConstellationDot, { top: 10, right: 74, backgroundColor: trialColor, opacity: 0.14 }]} />
                <View style={[styles.trialConstellationDot, { top: 26, right: 52, backgroundColor: trialColor, opacity: 0.2 }]} />
                <View style={[styles.trialConstellationDot, { top: 15, right: 32, backgroundColor: trialColor, opacity: 0.1 }]} />
                <View style={[styles.trialConstellationDot, { top: 34, right: 16, backgroundColor: trialColor, opacity: 0.16 }]} />
              </View>

              <View style={styles.trialOrbWrap}>
                <View style={[styles.trialCompassV, { backgroundColor: trialColor }]} />
                <View style={[styles.trialCompassH, { backgroundColor: trialColor }]} />
                <Animated.View style={[styles.trialOrbGlow, {
                  backgroundColor: trialColor,
                  opacity: trialOrbAnim.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.55] }),
                  transform: [{ scale: trialOrbAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) }],
                }]} />
                <View style={[styles.trialOrb, { borderColor: `${trialAccent}95` }]}>
                  <LinearGradient colors={[trialColor, trialAccent]} style={StyleSheet.absoluteFill} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} />
                  <View style={styles.trialOrbInnerRing} />
                  <LinearGradient colors={['rgba(255,255,255,0.3)', 'transparent']} style={styles.trialOrbSheen} start={{ x: 0.1, y: 0 }} end={{ x: 0.6, y: 0.8 }} />
                  <Text style={styles.trialOrbRune}>{seasonalTheme?.rune ?? trialProgress.trial.rune}</Text>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.trialBannerEyebrow, { color: trialColor }]}>
                  {seasonalTheme ? seasonalTheme.label : 'WEEKLY TRIAL'}
                </Text>
                <Text style={styles.trialBannerTitle}>{trialProgress.trial.title}</Text>
                <Text style={styles.trialBannerSub}>
                  {trialClaimed ? 'Claimed — new trial next week' : trialProgress.trial.description}
                </Text>
              </View>

              {!trialClaimed && (
                <View style={[styles.trialStatBadge, { borderColor: `${trialAccent}50`, backgroundColor: `${trialColor}16` }]}>
                  <Text style={[styles.trialStatBadgeVal, { color: trialColor }]}>{trialProgress.current}</Text>
                  <Text style={styles.trialStatBadgeSep}>/{trialProgress.trial.target}</Text>
                </View>
              )}
              <Text style={[styles.trialBannerArrow, { color: trialColor }]}>{trialPanelOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          )}

        {trialPanelOpen && trialProgress && (
          <View style={[styles.trialCard, { borderColor: `${trialColor}50` }]}>
            <View style={styles.trialCardClip}>
              <LinearGradient colors={[`${trialColor}20`, 'transparent', `${trialAccent}10`]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <LinearGradient colors={[`${trialAccent}16`, 'transparent', `${trialColor}0C`]} style={StyleSheet.absoluteFill} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} />
              <LinearGradient colors={['transparent', trialColor, 'transparent']} style={styles.trialTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              <View style={styles.trialCardInnerEngrave} pointerEvents="none" />
              <Text style={[styles.trialCardWatermarkRune, { color: trialColor }]} pointerEvents="none">
                {seasonalTheme?.rune ?? trialProgress.trial.rune}
              </Text>
              <View style={[styles.trialCornerTL, { borderColor: `${trialAccent}90`, top: 7, left: 7 }]} pointerEvents="none" />
              <View style={[styles.trialCornerTR, { borderColor: `${trialAccent}90`, top: 7, right: 7 }]} pointerEvents="none" />
              <View style={[styles.trialCornerBL, { borderColor: `${trialAccent}90`, bottom: 7, left: 7 }]} pointerEvents="none" />
              <View style={[styles.trialCornerBR, { borderColor: `${trialAccent}90`, bottom: 7, right: 7 }]} pointerEvents="none" />
            </View>

            <View style={styles.trialCardSealWrap}>
              <View style={[styles.trialCardSeal, { borderColor: `${trialAccent}95` }]}>
                <LinearGradient colors={[trialColor, trialAccent]} style={StyleSheet.absoluteFill} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} />
                <View style={styles.trialOrbInnerRing} />
                <LinearGradient colors={['rgba(255,255,255,0.3)', 'transparent']} style={styles.trialOrbSheen} start={{ x: 0.1, y: 0 }} end={{ x: 0.6, y: 0.8 }} />
                <Text style={styles.trialCardSealRune}>{seasonalTheme?.rune ?? trialProgress.trial.rune}</Text>
              </View>
            </View>

            <Text style={[styles.trialEyebrow, { color: trialColor, textAlign: 'center' }]}>
              {seasonalTheme ? seasonalTheme.label : 'WEEKLY TRIAL'}
            </Text>
            <Text style={styles.trialCardTitle}>{trialProgress.trial.title}</Text>
            <Text style={[styles.trialPromptText, { textAlign: 'center' }]}>{trialProgress.trial.description}</Text>

            <View style={styles.trialProgressTrack}>
              <View style={[styles.trialProgressFill, { width: `${Math.min(100, (trialProgress.current / trialProgress.trial.target) * 100)}%`, backgroundColor: trialColor }]} />
            </View>
            <Text style={[styles.trialProgressLabel, { textAlign: 'center' }]}>{trialProgress.current} / {trialProgress.trial.target}</Text>

            {trialClaimed ? (
              <Text style={styles.trialClaimedText}>Claimed — a new trial rises next week</Text>
            ) : trialProgress.complete ? (
              <TouchableOpacity style={[styles.trialClaimBtn, { borderColor: `${trialAccent}90` }]} onPress={handleClaimTrial} activeOpacity={0.85}>
                <LinearGradient colors={[trialColor, trialAccent]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Text style={[styles.trialClaimBtnText, { color: Colors.void }]}>CLAIM · +{WEEKLY_TRIAL_REWARD_XP} VALOR</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.trialClaimedText}>{trialProgress.trial.target - trialProgress.current} more to complete this trial</Text>
            )}
          </View>
        )}

          {/* ── VACATION MODE BANNER ── */}
          <TouchableOpacity
            style={styles.vacationBanner}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (!vacation && !pendingTripType && lastTripType) setPendingTripType(lastTripType);
              setVacationPanelOpen(o => !o);
            }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['rgba(168,196,212,0.1)', 'rgba(168,196,212,0.03)', 'transparent']} style={StyleSheet.absoluteFill} />
            <Text style={styles.vacationBannerIcon}>{vacation && tripProfile ? tripProfile.rune : 'ᛚ'}</Text>
            <View style={{ flex: 1 }}>
              {vacation && tripProfile ? (
                <>
                  <Text style={styles.vacationBannerEyebrow}>ON VACATION · {tripProfile.chipLabel}</Text>
                  <Text style={styles.vacationBannerSub}>
                    Protecting your {streakDays}-day streak · {daysRemaining(vacation)} {daysRemaining(vacation) === 1 ? 'day' : 'days'} left
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.vacationBannerEyebrow}>GOING SOMEWHERE?</Text>
                  <Text style={styles.vacationBannerSub}>
                    {vacationCount > 0 ? `Plan your ${ordinal(vacationCount + 1)} protected trip` : 'Plan Vacation Mode — protect your streak on the trip'}
                  </Text>
                </>
              )}
            </View>
            <Text style={styles.vacationBannerArrow}>{vacationPanelOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {/* ── MISSION CARD — dominant ── */}
          <Animated.View style={[styles.missionCard, {
            opacity: missionAnim,
            borderColor: vacation ? 'rgba(168,196,212,0.35)' : (trainedToday ? 'rgba(74,175,80,0.35)' : `${mission.color}40`),
          }]}>
            <LinearGradient
              colors={vacation
                ? ['rgba(168,196,212,0.1)', 'rgba(168,196,212,0.03)', 'transparent']
                : trainedToday
                ? ['rgba(74,175,80,0.1)', 'rgba(74,175,80,0.03)', 'transparent']
                : [`${mission.color}16`, `${mission.color}06`, 'transparent']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <LinearGradient
              colors={['transparent', vacation ? Colors.ice : (trainedToday ? '#4CAF50' : mission.color), 'transparent']}
              style={styles.missionLine}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
              <Text style={[styles.missionEyebrow, { color: vacation ? Colors.ice : (trainedToday ? '#4CAF50' : mission.color) }]}>
                {vacation && tripProgress ? `ON VACATION · DAY ${tripProgress.day} OF ${tripProgress.total}` : returnMission ? 'WELCOME BACK' : (trainedToday ? 'WORKOUT COMPLETE' : "TODAY'S WORKOUT")}
            </Text>
            <View style={styles.missionTitleRow}>
              <Text style={styles.missionTitle}>{mission.title}</Text>
              <View style={[styles.missionXPBadge, { borderColor: `${mission.color}40`, backgroundColor: `${mission.color}12` }]}>
                <Text style={[styles.missionXPRune, { color: mission.color }]}>{mission.rune}</Text>
                <Text style={[styles.missionXPVal, { color: mission.color }]}>{mission.xp}</Text>
                <Text style={[styles.missionXPLabel, { color: `${mission.color}80` }]}>XP</Text>
              </View>
            </View>
            <Text style={[styles.missionDuration, { color: mission.color }]}>{mission.duration}</Text>
            <Text style={styles.missionSub}>{mission.subtitle}</Text>
            <View style={[styles.missionDivider, { backgroundColor: `${mission.color}15` }]} />
            {trainedToday ? (
              <TouchableOpacity style={styles.missionBtnDone} onPress={() => router.push('/(tabs)/trials')} activeOpacity={0.7}>
                <Text style={styles.missionBtnDoneText}>✓  Trained today · Log another →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.missionBtn} onPress={handleBeginMission} activeOpacity={0.88}>
                <LinearGradient
                  colors={[`${mission.color}CC`, mission.color, `${mission.color}DD`]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <LinearGradient colors={['rgba(255,255,255,0.12)', 'transparent']} style={styles.missionBtnShine} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
                <Text style={styles.missionBtnText}>{vacation ? 'LOG IT ANYWAY' : 'BEGIN WORKOUT'}</Text>
                <View style={styles.missionBtnArrow}>
                  <Text style={styles.missionBtnArrowText}>→</Text>
                </View>
              </TouchableOpacity>
            )}
          </Animated.View>

          {vacationPanelOpen && (
            <View style={styles.vacationCard}>
              <LinearGradient colors={['rgba(168,196,212,0.06)', 'transparent']} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', Colors.ice, 'transparent']} style={styles.vacationTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />

                            {vacation ? (
                <View>
                  <Text style={styles.vacationEyebrow}>CURRENTLY AWAY</Text>
                  <Text style={styles.vacationPromptText}>
                    Your streak stays safe the whole trip — no shield spent, nothing to remember. Back early? End it below.
                  </Text>
                  <Text style={[styles.vacationEyebrow, { marginTop: 4 }]}>NEED MORE TIME?</Text>
                  <View style={styles.vacationDaysRow}>
                    {[3, 5, 7].map((d) => (
                      <TouchableOpacity key={d} style={styles.vacationDayBtn} onPress={() => handleExtendVacation(d)} activeOpacity={0.8}>
                        <Text style={styles.vacationDayBtnText}>+{d} DAYS</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={[styles.vacationEndBtn, { marginTop: 10 }]} onPress={handleEndVacationPress} activeOpacity={0.8}>
                    <Text style={styles.vacationEndBtnText}>{confirmEnd ? 'TAP AGAIN TO CONFIRM' : 'END VACATION EARLY'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={styles.vacationEyebrow}>WHERE ARE YOU HEADED?</Text>
                  <View style={styles.vacationTripRow}>
                    {TRIP_PROFILES.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.vacationTripChip, pendingTripType === p.id && styles.vacationTripChipActive]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPendingTripType(p.id); }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.vacationTripChipRune}>{p.rune}</Text>
                        <Text style={[styles.vacationTripChipText, pendingTripType === p.id && styles.vacationTripChipTextActive]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {pendingTripType && (
                    <>
                      <Text style={[styles.vacationEyebrow, { marginTop: 12 }]}>FOR HOW LONG?</Text>
                      <View style={styles.vacationDaysRow}>
                        {[3, 5, 7, 10].map((d) => (
                          <TouchableOpacity
                            key={d}
                            style={styles.vacationDayBtn}
                            onPress={() => handleBeginVacation(d)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.vacationDayBtnText}>{d} DAYS</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>
          )}

          {ravenPanelOpen && (
            <View style={styles.ravenCard}>
              <LinearGradient colors={['rgba(139,111,212,0.06)', 'transparent']} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', '#8B6FD4', 'transparent']} style={styles.ravenTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />

              {todayRavenCheckin ? (
                <View style={styles.ravenReportedRow}>
                  <View style={styles.ravenInlineIconWrap}>
                    <Image source={RAVEN_IMAGE} style={styles.ravenInlineIconImage} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ravenEyebrow}>HUGINN & MUNINN HAVE RETURNED</Text>
                    <Text style={[styles.ravenReportedText, { color: ravenMoodColor(todayRavenCheckin.mood) }]} numberOfLines={1}>
                      {todayRavenCheckin.mood}{todayRavenCheckin.note ? ` — "${todayRavenCheckin.note}"` : ''}
                    </Text>
                    <Text style={styles.ravenResponseText}>
                      {pickRavenResponse(todayRavenCheckin.mood, todayRavenCheckin.date)}
                    </Text>
                  </View>
                </View>
              ) : (
                <View>
                  <View style={styles.ravenHeaderRow}>
                    <View style={styles.ravenInlineIconWrap}>
                      <Image source={RAVEN_IMAGE} style={styles.ravenInlineIconImage} resizeMode="contain" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ravenEyebrow}>WHAT WILL THE RAVENS CARRY BACK TO ODIN?</Text>
                      <Text style={styles.ravenXpHint}>+{RAVEN_CHECKIN_XP} Valor for today's report</Text>
                    </View>
                  </View>
                  <View style={styles.ravenMoodRow}>
                    {[
                      { label: 'TRIUMPHANT', mood: 'Triumphant' },
                      { label: 'STEADY',     mood: 'Steady' },
                      { label: 'WEARY',      mood: 'Weary' },
                      { label: 'STRUGGLING', mood: 'Struggling' },
                      { label: 'RESOLUTE',   mood: 'Resolute' },
                    ].map((m) => (
                      <TouchableOpacity
                        key={m.label}
                        style={styles.ravenMoodBtn}
                        onPress={() => submitRavenCheckin(m.mood)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.ravenMoodBtnText}>{m.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.ravenNoteInput}
                    value={ravenNote}
                    onChangeText={setRavenNote}
                    placeholder="A word for the Norns, if you wish (optional)"
                    placeholderTextColor={Colors.textDim}
                    maxLength={60}
                    returnKeyType="done"
                  />
                </View>
              )}

              {ravenHistory.length > 0 && (
                <View style={styles.ravenHistoryRow}>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const daysAgo = 6 - i;
                    const d = new Date();
                    d.setDate(d.getDate() - daysAgo);
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const entry = ravenHistory.find(r => r.date === dateStr);
                    return (
                      <View
                        key={i}
                        style={[
                          styles.ravenHistoryDot,
                          entry
                            ? { backgroundColor: ravenMoodColor(entry.mood), opacity: 0.8 }
                            : { backgroundColor: 'rgba(255,255,255,0.06)' },
                        ]}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* ── SKALD'S CHRONICLE PREVIEW ── */}
          <TouchableOpacity
            style={styles.chronicleCard}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/sagas' as any); }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['rgba(201,168,76,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['transparent', Colors.gold, 'transparent']} style={styles.chronicleLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <View style={styles.chronicleIconWrap}>
              <Text style={styles.chronicleIcon}>ᛉ</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.chronicleEyebrow}>SKALD'S CHRONICLE</Text>
              {isPro && latestChronicleEntry ? (
                <Text style={styles.chronicleText} numberOfLines={2}>
                  "{cleanSagaText(latestChronicleEntry.entry)}"
                </Text>
              ) : isPro ? (
                <Text style={styles.chronicleTextMuted}>Train today, and the skald will carve your first line.</Text>
              ) : (
                <Text style={styles.chronicleTextMuted}>Your saga, written by an AI skald — unlock with Pro.</Text>
              )}
            </View>
            <Text style={styles.chronicleArrow}>→</Text>
          </TouchableOpacity>

          {/* ── STATS STRIP ── */}
          <View style={styles.statsStrip}>
            <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
              <LinearGradient colors={['rgba(201,168,76,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
              <Text style={[styles.statVal, { color: Colors.gold }]}>{xp.toLocaleString()}</Text>
              <Text style={styles.statLabel}>VALOR</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <LinearGradient
                colors={streakDays >= 3 ? ['rgba(255,140,0,0.08)', 'transparent'] : ['transparent', 'transparent']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.statStreakRow}>
                <StreakFlame streak={streakDays} size={16} />
                <Text style={[styles.statVal, { color: streakDays >= 3 ? '#FF8C00' : Colors.textMuted }]}>{streakDays}</Text>
              </View>
              <Text style={styles.statLabel}>STREAK</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <LinearGradient colors={['rgba(139,26,26,0.06)', 'transparent']} style={StyleSheet.absoluteFill} />
              <Text style={[styles.statVal, { color: Colors.blood }]}>{workoutCount}</Text>
              <Text style={styles.statLabel}>WORKOUTS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <LinearGradient colors={['rgba(168,196,212,0.06)', 'transparent']} style={StyleSheet.absoluteFill} />
              <Text style={[styles.statVal, { color: Colors.ice }]}>{totalMiles}</Text>
              <Text style={styles.statLabel}>MILES</Text>
            </View>
          </View>

          {/* ── RANK CARD ── */}
          <TouchableOpacity style={styles.rankCard} onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.85}>
            <LinearGradient colors={['rgba(201,168,76,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['transparent', Colors.gold, 'transparent']} style={styles.rankLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <View style={styles.rankCardLeft}>
              <Text style={styles.rankIcon}>{rank.icon}</Text>
              <View>
              <Text style={styles.rankTitle}>{getRankTitle(rank, isShieldmaiden).toUpperCase()}</Text>
                {rank.nextRank && <Text style={styles.rankNext}>→ {getRankTitle(rank.nextRank, isShieldmaiden)}</Text>}
              </View>
            </View>
            <View style={styles.rankCardRight}>
              <View style={styles.rankXpTrack}>
                <Animated.View style={[styles.rankXpFill, { width: xpBarWidth }]}>
                  <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                </Animated.View>
              </View>
              <Text style={styles.rankXpPct}>{xpPct}% to next rank</Text>
            </View>
          </TouchableOpacity>

          {/* ── TODAY'S BATTLES ── */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>TODAY'S WORKOUTS</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/trials')}>
              <Text style={styles.sectionLink}>+ Log →</Text>
            </TouchableOpacity>
          </View>

          {todayWorkouts.length === 0 ? (
            <View style={styles.emptyBattles}>
              <Text style={styles.emptyRune}>ᚷ</Text>
              <Text style={styles.emptyTitle}>No workouts logged today.</Text>
              <Text style={styles.emptySub}>The Valkyries are watching.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.battlesScroll}>
              {todayWorkouts.map((w) => {
                const meta  = WORKOUT_META[w.type as keyof typeof WORKOUT_META];
                const color = meta?.color ?? Colors.gold;
                const xpEarned = Math.abs(w.xp_earned);
                return (
                  <View key={w.id} style={[styles.battlePill, { borderColor: `${color}30` }]}>
                    <LinearGradient colors={[`${color}12`, 'transparent']} style={StyleSheet.absoluteFill} />
                    <Text style={[styles.battlePillIcon, { color }]}>{meta?.icon ?? 'ᚦ'}</Text>
                    <Text style={[styles.battlePillName, { color }]}>{meta?.label ?? w.type}</Text>
                    <Text style={styles.battlePillTime}>
                      {new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={[styles.battlePillXP, { color }]}>+{xpEarned} XP</Text>
                  </View>
                );
              })}
              <TouchableOpacity style={styles.battlePillAdd} onPress={() => router.push('/(modals)/log-workout')} activeOpacity={0.8}>
                <Text style={styles.battlePillAddIcon}>+</Text>
                <Text style={styles.battlePillAddText}>Log</Text>
              </TouchableOpacity>
            </ScrollView>
          )}


{/* ── QUICK ACCESS ── */}
<View style={styles.sectionRow}>
  <Text style={styles.sectionTitle}>QUICK ACCESS</Text>
</View>

<View style={styles.quickGrid}>
  {[
    { label: 'Iron Forge',   sub: 'Strength Training', icon: 'ᚦ', color: Colors.gold,  route: '/(modals)/exercise-picker', proOnly: false },
    { label: 'Protocols',    sub: 'Workout Programs',     icon: 'ᛒ', color: Colors.blood, route: '/(tabs)/berserker',         proOnly: false },
    { label: 'Mead Hall',    sub: 'Macro Tracking',       icon: 'ᚠ', color: Colors.ice,   route: '/(tabs)/mead-hall',         proOnly: false },
    { label: 'Weapon Forge', sub: 'Your weapon',  icon: 'ᚲ', color: '#8B6FD4',    route: '/(modals)/weapon-forge',    proOnly: false },
    { label: 'Stretch Vault', sub: 'Recovery',    icon: 'ᛁ', color: Colors.ice,   route: '/(modals)/stretch-library', proOnly: true  },
  ].map((item, index, arr) => (
    <TouchableOpacity
      key={item.label}
      style={[
        styles.quickCard,
        { borderColor: `${item.color}20` },
        index === arr.length - 1 && styles.quickCardFullWidth,
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (item.proOnly && !isPro) { router.push('/(modals)/paywall'); return; }
        router.push(item.route as any);
      }}
      activeOpacity={0.75}
    >
      <LinearGradient colors={[`${item.color}10`, 'transparent']} style={StyleSheet.absoluteFill} />
      <Text style={[styles.quickIcon, { color: item.color }]}>{item.icon}</Text>
      <Text style={styles.quickLabel}>{item.label}</Text>
      <Text style={styles.quickSub}>{item.sub}</Text>
    </TouchableOpacity>

  ))}
</View>
<View style={styles.bottomRuneStrip}>
  <Text style={styles.bottomRuneText}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ  ᚲ  ᚷ  ᚹ</Text>
</View>
{showUpsell && (
  <ProUpsellCard
    warriorName={warrior?.name ?? 'Warrior'}
    workoutCount={workoutCount}
    accentColor={accentColor}
    isShieldmaiden={isShieldmaiden}
    onDismiss={dismissUpsell}
  />
)}
</Animated.ScrollView>
</SafeAreaView>
</View>
);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#050508' },
  safe:    { flex: 1 },
  scroll:  { flex: 1 },
  content: { paddingBottom: 110 },

  topHaze:   { position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.4, zIndex: 0 },
  runeField: { ...StyleSheet.absoluteFill, zIndex: 0 },
  bgRune:    { position: 'absolute', color: Colors.gold, fontFamily: 'System' },

  toast: {
    position: 'absolute', top: 60,
    left: Spacing.lg, right: Spacing.lg, zIndex: 100,
    borderWidth: 1, borderColor: 'rgba(168,196,212,0.3)',
    borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    overflow: 'hidden', backgroundColor: 'rgba(10,12,18,0.95)',
  },
  toastIcon: { fontSize: 18, color: Colors.ice, fontFamily: 'System' },
  toastText: { fontFamily: Fonts.subheading, fontSize: 13, color: Colors.ice, flex: 1 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 10, zIndex: 1,
  },
  headerLeft: { flex: 1, marginRight: 10 },
  greeting:   { fontFamily: Fonts.prose, fontSize: 13, color: Colors.textMuted, marginBottom: 2 },
  warriorName: { fontFamily: Fonts.heading, fontSize: 32, color: Colors.text, letterSpacing: 0.5, lineHeight: 36 },
  headerChips: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8, flexShrink: 0 },
  headerChipsColumn: { flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  ravenHeaderBtn: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1, overflow: 'hidden',
    borderColor: 'rgba(201,168,76,0.25)',
    backgroundColor: 'rgba(201,168,76,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  ravenHeaderBtnImage: { width: '100%', height: '100%' },
  ravenInlineIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1, overflow: 'hidden',
    borderColor: 'rgba(201,168,76,0.25)',
    backgroundColor: 'rgba(201,168,76,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  ravenInlineIconImage: { width: '100%', height: '100%' },
  crewChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 5, maxWidth: 130 },
  crewChipRune: { fontSize: 11, fontFamily: 'System' },
  crewChipText: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 1 },
  crewLeaderDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.gold, marginLeft: 2 },
  proChip: { borderRadius: Radii.full, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 7, flexShrink: 0 },
  proChipText: { fontFamily: Fonts.body, fontSize: 10, color: Colors.void, letterSpacing: 2 },
  trialBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: Spacing.lg, marginBottom: 10,
    borderWidth: 1.5, borderRadius: 18,
    backgroundColor: 'rgba(22,18,14,0.97)',
    paddingHorizontal: Spacing.md, paddingVertical: 13,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.26, shadowRadius: 14,
  },
  trialBannerClip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16.5, overflow: 'hidden' },
  trialBannerTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 },
  trialInnerEngrave: { position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  trialWatermarkRune: { position: 'absolute', bottom: -18, right: -6, fontSize: 88, fontFamily: 'System', opacity: 0.045 },
  trialCornerTL: { position: 'absolute', top: 5, left: 5, width: 12, height: 12, borderTopWidth: 1.25, borderLeftWidth: 1.25 },
  trialCornerTR: { position: 'absolute', top: 5, right: 5, width: 12, height: 12, borderTopWidth: 1.25, borderRightWidth: 1.25 },
  trialCornerBL: { position: 'absolute', bottom: 5, left: 5, width: 12, height: 12, borderBottomWidth: 1.25, borderLeftWidth: 1.25 },
  trialCornerBR: { position: 'absolute', bottom: 5, right: 5, width: 12, height: 12, borderBottomWidth: 1.25, borderRightWidth: 1.25 },
  trialConstellationDot: { position: 'absolute', width: 2, height: 2, borderRadius: 1 },
  trialOrbWrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  trialCompassV: { position: 'absolute', width: 1, height: 84, top: -16, left: '50%', marginLeft: -0.5, opacity: 0.07 },
  trialCompassH: { position: 'absolute', width: 84, height: 1, left: -16, top: '50%', marginTop: -0.5, opacity: 0.07 },
  trialOrbGlow: { position: 'absolute', width: 52, height: 52, borderRadius: 26 },
  trialOrb: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 1.5, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  trialOrbInnerRing: { position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  trialOrbSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  trialOrbRune: {
    fontSize: 20, fontFamily: 'System', color: Colors.void,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1,
  },
  trialBannerEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2.5, marginBottom: 2 },
  trialBannerTitle: {
    fontFamily: Fonts.heading, fontSize: 16, color: Colors.text, letterSpacing: 1.1, marginBottom: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1,
  },
  trialBannerSub: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted },
  trialStatBadge: {
    flexDirection: 'row', alignItems: 'baseline',
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  trialStatBadgeVal: { fontFamily: Fonts.heading, fontSize: 13 },
  trialStatBadgeSep: { fontFamily: Fonts.body, fontSize: 10, color: Colors.textMuted },
  trialBannerArrow: { fontFamily: Fonts.body, fontSize: 10, opacity: 0.7 },
  trialCard: {
    marginHorizontal: Spacing.lg, marginBottom: 10,
    borderWidth: 1, borderRadius: 18, overflow: 'hidden',
    backgroundColor: 'rgba(22,18,14,0.97)',
    padding: 16,
  },
  trialTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 },
  trialEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, marginBottom: 6 },
  trialPromptText: { fontFamily: Fonts.prose, fontSize: 13, color: Colors.textMuted, marginBottom: 12, lineHeight: 18 },
  trialProgressTrack: { height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  trialProgressFill: { height: '100%', borderRadius: 5 },
  trialProgressLabel: { fontFamily: Fonts.heading, fontSize: 11, color: Colors.textMuted, marginTop: 6, marginBottom: 12, letterSpacing: 0.5 },
  trialClaimBtn: {
    alignItems: 'center', borderWidth: 1.5, borderRadius: 12,
    paddingVertical: 13, overflow: 'hidden',
  },
  trialClaimBtnText: { fontFamily: Fonts.heading, fontSize: 12, letterSpacing: 1.5 },
  trialClaimedText: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted, textAlign: 'center' },  vacationBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: Spacing.lg, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(168,196,212,0.3)',
    borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(14,11,20,0.95)',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
    trialCardClip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16.5, overflow: 'hidden' },
  trialCardInnerEngrave: { position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  trialCardWatermarkRune: { position: 'absolute', bottom: -24, right: -10, fontSize: 120, fontFamily: 'System', opacity: 0.04 },
  trialCardSealWrap: { alignItems: 'center', marginBottom: 10 },
  trialCardSeal: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  trialCardSealRune: {
    fontSize: 28, fontFamily: 'System', color: Colors.void,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1,
  },
  trialCardTitle: {
    fontFamily: Fonts.heading, fontSize: 18, color: Colors.text, textAlign: 'center',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1,
  },
  vacationBannerIcon: { fontSize: 20, color: Colors.ice, fontFamily: 'System' },
  vacationBannerEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 1.5, color: Colors.ice, marginBottom: 2 },
  vacationBannerSub: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted },
  vacationBannerArrow: { fontFamily: Fonts.body, fontSize: 10, color: Colors.ice, opacity: 0.7 },

  vacationCard: {
    marginHorizontal: Spacing.lg, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(168,196,212,0.2)',
    borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(14,11,20,0.95)',
    padding: 14,
  },
  vacationTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  vacationEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: Colors.ice, opacity: 0.85, marginBottom: 8 },
  vacationPromptText: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 17, marginBottom: 12 },
  vacationTripRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  vacationTripChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: 'rgba(168,196,212,0.25)',
    borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: 'rgba(168,196,212,0.05)',
  },
  vacationTripChipActive: { borderColor: Colors.ice, backgroundColor: 'rgba(168,196,212,0.18)' },
  vacationTripChipRune: { fontSize: 12, fontFamily: 'System', color: Colors.ice },
  vacationTripChipText: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 0.5, color: Colors.textMuted },
  vacationTripChipTextActive: { color: Colors.ice },
  vacationDaysRow: { flexDirection: 'row', gap: 8 },
  vacationDayBtn: {
    flex: 1, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.ice, borderRadius: 10,
    paddingVertical: 10, backgroundColor: 'rgba(168,196,212,0.1)',
  },
  vacationDayBtnText: { fontFamily: Fonts.heading, fontSize: 11, letterSpacing: 1, color: Colors.ice },
  vacationEndBtn: {
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(168,196,212,0.3)',
    borderRadius: 10, paddingVertical: 10,
  },
  vacationEndBtnText: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 1.5, color: Colors.textMuted },

  missionCard: {
    marginHorizontal: Spacing.lg, marginBottom: 10,
    borderWidth: 1, borderRadius: 22,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
    overflow: 'hidden', backgroundColor: 'rgba(14,11,20,0.95)',
    gap: 8,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 20,
  },
  missionLine:    { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  missionEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 4 },
  missionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  missionTitle:   { fontFamily: Fonts.heading, fontSize: 28, color: Colors.text, letterSpacing: 0.5, flex: 1 },
  missionXPBadge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', gap: 1, marginLeft: 10 },
  missionXPRune:  { fontSize: 18, fontFamily: 'System' },
  missionXPVal:   { fontFamily: Fonts.heading, fontSize: 16, lineHeight: 18 },
  missionXPLabel: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 1 },
  missionDuration: { fontFamily: Fonts.heading, fontSize: 14, letterSpacing: 0.5 },
  missionSub:     { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', marginTop: -4 },
  missionDivider: { height: 1, marginVertical: 4 },
  missionBtn: {
    borderRadius: 14, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12,
  },
  missionBtnShine: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  missionBtnText:  { fontFamily: Fonts.heading, fontSize: 16, color: Colors.void, letterSpacing: 2 },
  missionBtnArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  missionBtnArrowText: { fontSize: 16, color: Colors.void, fontFamily: 'System' },
  missionBtnDone:  { alignItems: 'center', paddingVertical: 8 },
  missionBtnDoneText: { fontFamily: Fonts.prose, fontSize: 13, color: '#4CAF50' },

  chronicleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: Spacing.lg, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.goldBorder,
    borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(14,11,20,0.95)',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  chronicleLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  chronicleIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.goldBorder,
    backgroundColor: 'rgba(201,168,76,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  chronicleIcon: { fontSize: 18, color: Colors.gold, fontFamily: 'System' },
  chronicleEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2.5, color: `${Colors.gold}90`, marginBottom: 3 },
  chronicleText: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.text, fontStyle: 'italic', lineHeight: 17 },
  chronicleTextMuted: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 17 },
  chronicleArrow: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.gold, opacity: 0.6 },

  statsStrip: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(14,11,20,0.9)',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 3, overflow: 'hidden' },
  statStreakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statVal:   { fontFamily: Fonts.heading, fontSize: 20, lineHeight: 22 },
  statLabel: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 1.5, color: Colors.textMuted },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 10 },

  ravenCard: {
    marginHorizontal: Spacing.lg, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(139,111,212,0.2)',
    borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(14,11,20,0.95)',
    padding: 12,
  },
  ravenTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  ravenPromptRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ravenReportedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ravenHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  ravenIcon: { fontSize: 22, color: '#8B6FD4', fontFamily: 'System' },
  ravenEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: '#8B6FD4', opacity: 0.8, marginBottom: 3 },
  ravenPromptText: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
  ravenReportedText: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.text, fontStyle: 'italic' },
  ravenResponseText: {
    fontFamily: Fonts.proseItalic, fontSize: 11, color: Colors.textMuted,
    fontStyle: 'italic', marginTop: 3, lineHeight: 15,
  },
  ravenXpHint: {
    fontFamily: Fonts.body, fontSize: 9, letterSpacing: 0.5,
    color: Colors.gold, marginTop: 2,
  },
  ravenArrow: { fontFamily: Fonts.heading, fontSize: 16, color: '#8B6FD4', opacity: 0.6 },
  ravenMoodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  ravenMoodBtn: {
    borderWidth: 1, borderColor: 'rgba(139,111,212,0.3)',
    borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: 'rgba(139,111,212,0.06)',
  },
  ravenMoodBtnText: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 0.5, color: '#8B6FD4' },
  ravenNoteInput: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: Fonts.prose, fontSize: 12, color: Colors.text,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  ravenHistoryRow: {
    flexDirection: 'row', gap: 6, marginTop: 12,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  ravenHistoryDot: { flex: 1, height: 4, borderRadius: 2 },

  rankCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(14,11,20,0.9)',
    paddingHorizontal: Spacing.md, paddingVertical: 12, gap: 12,
  },
  rankLine:     { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  rankCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankIcon:     { fontSize: 20, fontFamily: 'System', color: Colors.gold },
  rankTitle:    { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 2, color: Colors.gold },
  rankNext:     { fontFamily: Fonts.prose, fontSize: 9, color: Colors.textDim, marginTop: 1 },
  rankCardRight: { flex: 1, gap: 4 },
  rankXpTrack:  { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  rankXpFill:   { height: '100%', borderRadius: 2, overflow: 'hidden' },
  rankXpPct:    { fontFamily: Fonts.body, fontSize: 8, color: Colors.textMuted, letterSpacing: 0.5 },

  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, marginBottom: 8, marginTop: 6,
  },
  sectionTitle: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, color: Colors.textMuted },
  sectionLink:  { fontFamily: Fonts.prose, fontSize: 13, color: Colors.gold, opacity: 0.6 },

  emptyBattles: {
    marginHorizontal: Spacing.lg, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, paddingVertical: 20,
    alignItems: 'center', gap: 2, backgroundColor: 'rgba(14,11,20,0.6)',
  },
  emptyRune:  { fontSize: 22, color: 'rgba(201,168,76,0.25)', fontFamily: 'System', marginBottom: 4 },
  emptyTitle: { fontFamily: Fonts.subheading, fontSize: 13, color: Colors.textMuted },
  emptySub:   { fontFamily: Fonts.proseItalic, fontSize: 11, color: Colors.textMuted, fontStyle: 'italic' },

  battlesScroll: { paddingHorizontal: Spacing.lg, gap: 8, paddingBottom: 10 },
  battlePill: {
    borderWidth: 1, borderRadius: 14, padding: 12, gap: 3, overflow: 'hidden',
    backgroundColor: 'rgba(14,11,20,0.9)', minWidth: 115,
  },
  battlePillIcon: { fontSize: 15, fontFamily: 'System' },
  battlePillName: { fontFamily: Fonts.subheading, fontSize: 11, marginTop: 2 },
  battlePillTime: { fontFamily: Fonts.prose, fontSize: 10, color: Colors.textMuted },
  battlePillXP:   { fontFamily: Fonts.heading, fontSize: 12, marginTop: 2 },
  battlePillAdd: {
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)',
    borderRadius: 14, padding: 12, minWidth: 64,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(14,11,20,0.6)', gap: 3,
  },
  battlePillAddIcon: { fontSize: 20, color: Colors.gold, fontFamily: 'System' },
  battlePillAddText: { fontFamily: Fonts.body, fontSize: 9, color: Colors.gold, letterSpacing: 1 },

  quickGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg, gap: 8, marginBottom: Spacing.lg,
  },
  quickCard: {
    width: (width - Spacing.lg * 2 - 8) / 2,
    backgroundColor: 'rgba(14,11,20,0.9)',
    borderWidth: 1, borderRadius: 14,
    padding: 14, gap: 3, overflow: 'hidden',
  },
  quickCardFullWidth: {
    width: width - Spacing.lg * 2,
  },
  quickIcon:  { fontSize: 22, fontFamily: 'System', marginBottom: 4 },
  quickLabel: { fontFamily: Fonts.subheading, fontSize: 13, color: Colors.text },
  quickSub:   { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted },

  bottomRuneStrip: { alignItems: 'center', paddingVertical: Spacing.md, paddingBottom: Spacing.lg },
  bottomRuneText:  { fontFamily: 'System', fontSize: 13, color: 'rgba(201,168,76,0.22)', letterSpacing: 10 },

  havamolToast: {
    position: 'absolute', top: 60,
    left: Spacing.lg, right: Spacing.lg, zIndex: 101,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
    borderRadius: 14, overflow: 'hidden',
    backgroundColor: 'rgba(10,8,14,0.97)',
  },
  havamolToastLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  havamolToastInner: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, padding: 12,
  },
  havamolToastRune: { fontSize: 22, color: Colors.gold, fontFamily: 'System' },
  havamolToastText: { flex: 1, gap: 2 },
  havamolToastEyebrow: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 2, color: 'rgba(201,168,76,0.6)' },
  havamolToastVerse: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
  havamolToastArrow: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.gold, opacity: 0.6 },
});