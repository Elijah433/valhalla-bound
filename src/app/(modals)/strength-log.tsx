import { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, TextInput, Alert, KeyboardAvoidingView,
  Platform, Linking, Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeaponSVG } from '../../components/WeaponSVG';
import {
  createStrengthSession, addStrengthSet, checkAndUpdatePR, deleteStrengthSet,
  getPersonalRecord,
} from '@/lib/db';
import { analyzeProgressiveOverload, type OverloadSuggestion } from '@/lib/progressiveOverload';
import { estimatedOneRepMax } from '@/lib/oneRepMax';
import { useWarriorStore } from '@/lib/store';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

const WEAPON_COLORS: Record<string, string> = {
  mjolnir:    '#C9A84C',
  broadsword: '#A8C4D4',
  axe:        '#E05050',
  spear:      '#8B6FD4',
};

const VIKING_LINES = [
  'No iron lifted is ever lost.',
  'The forge remembers every heat.',
  'Strength is earned, not given.',
  'Every set carved into your saga.',
  'Odin watches those who train.',
];

interface LoggedSet {
  id: number; setNumber: number; reps: number; weight: number; isPR: boolean;
}

// Deliberately not shown for sets of 1 rep (estimation from a true 1RM is
// redundant) or very high rep counts (the formula's error margin grows
// considerably past ~10-12 reps, so presenting it as a precise number
// that far out would overstate its accuracy). The underlying formula
// itself now lives in lib/oneRepMax.ts, shared with the Progressive
// Overload analysis so both agree on the same number for the same set.
function estimatedOneRepMaxForDisplay(weight: number, reps: number): number | null {
  if (reps <= 1) return null;
  if (reps > 12) return null;
  return Math.round(estimatedOneRepMax(weight, reps));
}

// Live, in-session coaching — reacts to the sets logged THIS session as
// they're added, distinct from the cross-session Progressive Overload
// analysis (which only looks at PAST completed sessions, before today's
// even started). This only ever looks backward at the last couple of
// sets already in state, so it needs at least 2 logged to say anything.
// Checked in priority order: fatigue first (safety-relevant), then
// PR-pace (motivating and timely), then a consistency callout for
// steady multi-set work — first match wins so only one tip shows at a
// time.
function getSessionTip(sets: LoggedSet[], currentPR: number | null): string | null {
  if (sets.length < 2) return null;

  const last = sets[sets.length - 1];
  const prev = sets[sets.length - 2];

  // Same weight, reps fell off by 2+ — a normal sign of fatigue, worth
  // flagging in the moment rather than only after the fact.
  if (last.weight === prev.weight && prev.reps - last.reps >= 2) {
    return `Reps dropped from ${prev.reps} to ${last.reps} at the same ${last.weight} lbs. That's a normal sign of fatigue — a bit more rest before your next set could help you finish stronger.`;
  }

  // This set is at or above the current PR weight — worth calling out
  // while it's actually happening.
  if (currentPR !== null && last.weight >= currentPR) {
    return `You're working right at your current PR weight of ${currentPR} lbs. Stay tight on form — one more clean rep could put you over it.`;
  }

  // Three or more sets at the same weight with reps holding steady or
  // climbing — genuinely consistent work worth acknowledging.
  if (sets.length >= 3) {
    const lastThree = sets.slice(-3);
    const sameWeight = lastThree.every(s => s.weight === lastThree[0].weight);
    const repsHeld = lastThree.every((s, i) => i === 0 || s.reps >= lastThree[i - 1].reps);
    if (sameWeight && repsHeld) {
      return `Three solid sets at ${lastThree[0].weight} lbs with reps holding steady or climbing. That's exactly the kind of consistency that builds real strength.`;
    }
  }

  return null;
}

function FloatingRune({ color, delay, x }: { color: string; delay: number; x: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ'];
  const rune = runes[Math.floor(Math.random() * runes.length)];
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.65, duration: 400, useNativeDriver: true }),
        Animated.timing(y, { toValue: -(70 + Math.random() * 90), duration: 1800, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.Text style={{
      position: 'absolute', bottom: height * 0.3, left: x,
      fontSize: 16 + Math.random() * 14, fontFamily: 'System',
      color, opacity, transform: [{ translateY: y }],
    }}>{rune}</Animated.Text>
  );
}

// ── SOCIAL SHARE SCREEN ──────────────────────────────────────────────────────
function SocialShareScreen({ exerciseName, prWeight, prReps, weaponKey, warriorName, onDismiss }: {
  exerciseName: string; prWeight: string; prReps: string;
  weaponKey: string; warriorName: string; onDismiss: () => void;
}) {
  const weaponColor = WEAPON_COLORS[weaponKey] ?? Colors.gold;
  const slideAnim   = useRef(new Animated.Value(height)).current;
  const [toast, setToast] = useState('');

  const shareText = [
    `⚔️ FEAT OF STRENGTH ⚔️`, ``,
    exerciseName.toUpperCase(),
    `${prWeight} lbs × ${prReps} reps`, ``,
    `🪓 ${warriorName} — Valhalla Bound`,
    `Train Until Ragnarök`, ``,
    `#ValhallaFit #NewPR #FeatsOfStrength #VikingFitness`,
  ].join('\n');

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }).start();
  }, []);

  function dismiss() {
    Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: true }).start(onDismiss);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function shareToX() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const encoded = encodeURIComponent(shareText);
    try {
      const canX = await Linking.canOpenURL('x://');
      const canT = await Linking.canOpenURL('twitter://');
      if (canX)      await Linking.openURL(`x://post?message=${encoded}`);
      else if (canT) await Linking.openURL(`twitter://post?message=${encoded}`);
      else           await Linking.openURL(`https://twitter.com/intent/tweet?text=${encoded}`);
    } catch {
      await Linking.openURL(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`);
    }
  }

  async function shareToInstagram() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(shareText);
    try {
      await Linking.openURL('instagram://');
      showToast('Caption copied — paste in your post');
    } catch {
      showToast('Caption copied — open Instagram and paste');
    }
  }

  async function shareToTikTok() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(shareText);
    try {
      await Linking.openURL('snssdk1233://');
      showToast('Caption copied — paste in your post');
    } catch {
      try {
        await Linking.openURL('tiktok://');
        showToast('Caption copied — paste in your post');
      } catch {
        showToast('Caption copied — open TikTok and paste');
      }
    }
  }

  async function copyText() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(shareText);
    showToast('Copied to clipboard');
  }

  const PLATFORMS = [
    {
      label: 'X / TWITTER', sub: 'Opens with caption pre-filled',
      icon: 'ᚷ', iconStyle: { fontFamily: 'System', fontSize: 22, color: Colors.gold },
      boxStyle: { backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 1, borderColor: Colors.goldBorder },
      onPress: shareToX,
    },
    {
      label: 'INSTAGRAM', sub: 'Caption copied · opens app',
      icon: 'ᛖ', iconStyle: { fontFamily: 'System', fontSize: 22, color: Colors.gold },
      boxStyle: { backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 1, borderColor: Colors.goldBorder },
      onPress: shareToInstagram,
    },
    {
      label: 'TIKTOK', sub: 'Caption copied · opens app',
      icon: 'ᛗ', iconStyle: { fontFamily: 'System', fontSize: 22, color: Colors.gold },
      boxStyle: { backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 1, borderColor: Colors.goldBorder },
      onPress: shareToTikTok,
    },
    {
      label: 'COPY TEXT', sub: 'Paste anywhere',
      icon: 'ᚲ', iconStyle: { fontFamily: 'System', fontSize: 22, color: Colors.gold },
      boxStyle: { backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 1, borderColor: Colors.goldBorder },
      onPress: copyText,
    },
  ];

  return (
    <Animated.View style={[ss.root, { transform: [{ translateY: slideAnim }] }]}>
      <LinearGradient colors={['#0C0810', '#050508', '#080310']} style={StyleSheet.absoluteFill} />
      <View style={[ss.sideGlow, { left: -40, backgroundColor: weaponColor }]} />
      <View style={[ss.sideGlow, { right: -40, backgroundColor: Colors.blood }]} />
      <Text style={ss.bgRune}>ᛟ</Text>

      <SafeAreaView style={ss.safe} edges={['top', 'bottom']}>
        <View style={ss.container}>

          {!!toast && (
            <View style={ss.toast}>
              <Text style={ss.toastText}>✓  {toast}</Text>
            </View>
          )}

          <View style={ss.titleBlock}>
            <Text style={[ss.eyebrow, { color: `${weaponColor}70` }]}>YOUR FEAT IS LEGENDARY</Text>
            <Text style={ss.title}>SPREAD{'\n'}THE SAGA</Text>
            <View style={ss.runeRow}>
              <View style={[ss.runeLine, { backgroundColor: `${weaponColor}30` }]} />
              <Text style={[ss.runeRowText, { color: `${weaponColor}50` }]}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ</Text>
              <View style={[ss.runeLine, { backgroundColor: `${weaponColor}30` }]} />
            </View>
          </View>

          {/* PR summary */}
          <View style={[ss.prStone, { borderColor: `${weaponColor}25` }]}>
            <LinearGradient colors={[`${weaponColor}10`, 'transparent']} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['transparent', weaponColor, 'transparent']} style={ss.prStoneLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <Text style={ss.prStoneExercise}>{exerciseName.toUpperCase()}</Text>
            <Text style={[ss.prStoneWeight, { color: weaponColor }]}>{prWeight}<Text style={ss.prStoneLbs}> lbs</Text></Text>
            <Text style={ss.prStoneReps}>{prReps} reps</Text>
          </View>

          {/* Platform buttons */}
          <View style={ss.platforms}>
            {PLATFORMS.map((p) => (
              <TouchableOpacity key={p.label} style={ss.platformBtn} onPress={p.onPress} activeOpacity={0.8}>
                <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']} style={ss.platformLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                {/* Icon box */}
                <View style={[ss.iconBox, p.boxStyle]}>
                  <Text style={[ss.iconBoxText, p.iconStyle]}>{p.icon}</Text>
                </View>
                <View style={ss.platformText}>
                  <Text style={ss.platformName}>{p.label}</Text>
                  <Text style={ss.platformSub}>{p.sub}</Text>
                </View>
                <Text style={ss.platformArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={ss.dismissBtn} onPress={dismiss} activeOpacity={0.85}>
            <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <Text style={ss.dismissText}>CONTINUE FORGING →</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const ss = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 },
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.lg, justifyContent: 'center', gap: 14 },
  bgRune: { position: 'absolute', fontSize: 400, fontFamily: 'System', color: 'rgba(201,168,76,0.03)', top: 20, left: -60, lineHeight: 400, pointerEvents: 'none' },
  sideGlow: { position: 'absolute', top: 80, width: 120, height: height * 0.6, borderRadius: 999, opacity: 0.08, transform: [{ scaleX: 0.3 }] },
  toast: { position: 'absolute', top: 20, alignSelf: 'center', backgroundColor: 'rgba(74,175,80,0.15)', borderWidth: 1, borderColor: 'rgba(74,175,80,0.3)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, zIndex: 10 },
  toastText: { fontFamily: Fonts.body, fontSize: 11, color: '#4CAF50', letterSpacing: 1 },
  titleBlock: { alignItems: 'center', gap: 8 },
  eyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 4 },
  title: { fontFamily: Fonts.display, fontSize: 38, color: Colors.gold, letterSpacing: 4, textAlign: 'center', lineHeight: 44, textShadowColor: 'rgba(201,168,76,0.35)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  runeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '80%' },
  runeLine: { flex: 1, height: 1 },
  runeRowText: { fontFamily: 'System', fontSize: 12, letterSpacing: 6 },
  prStone: { borderWidth: 1, borderRadius: 16, padding: Spacing.md, overflow: 'hidden', backgroundColor: 'rgba(8,6,12,0.95)', alignItems: 'center', gap: 2 },
  prStoneLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  prStoneExercise: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, color: Colors.textMuted },
  prStoneWeight: { fontFamily: Fonts.display, fontSize: 34, lineHeight: 38 },
  prStoneLbs: { fontSize: 18 },
  prStoneReps: { fontFamily: Fonts.proseItalic, fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  platforms: { gap: 8 },
  platformBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, overflow: 'hidden', backgroundColor: 'rgba(10,8,14,0.9)' },
  platformLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconBoxText: {},
  platformText: { flex: 1 },
  platformName: { fontFamily: Fonts.heading, fontSize: 12, color: Colors.text, letterSpacing: 1 },
  platformSub: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  platformArrow: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.textMuted },
  dismissBtn: { borderRadius: Radii.md, overflow: 'hidden', paddingVertical: 16, alignItems: 'center' },
  dismissText: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.void, letterSpacing: 2 },
});

// ── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function StrengthLogScreen() {
  const params = useLocalSearchParams<{ exerciseId: string; exerciseName: string; noXp: string }>();
  const exerciseId   = params.exerciseId   ?? 'custom';
  const exerciseName = params.exerciseName ?? 'Exercise';
  const { recordWorkout, warrior } = useWarriorStore();

  const [sessionId,    setSessionId]    = useState<number | null>(null);
  const [sets,         setSets]         = useState<LoggedSet[]>([]);
  const [reps,         setReps]         = useState('');
  const [weight,       setWeight]       = useState('');
  const [restTimer,    setRestTimer]    = useState(0);
  const [timerActive,  setTimerActive]  = useState(false);
  const [currentPR,    setCurrentPR]    = useState<number | null>(null);
  const [overloadSuggestion, setOverloadSuggestion] = useState<OverloadSuggestion | null>(null);
  const [overloadDismissed, setOverloadDismissed] = useState(false);
  const [sessionTipDismissed, setSessionTipDismissed] = useState(false);
  const [showPRFlash,  setShowPRFlash]  = useState(false);
  const [showSocial,   setShowSocial]   = useState(false);
  const [prWeight,     setPrWeight]     = useState('');
  const [prReps,       setPrReps]       = useState('');
  const [weaponKey,    setWeaponKey]    = useState('broadsword');
  const [runeParticles, setRuneParticles] = useState<number[]>([]);
  const vikingLine = VIKING_LINES[Math.floor(Math.random() * VIKING_LINES.length)];

  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const prAnim        = useRef(new Animated.Value(0)).current;
  const prScaleAnim   = useRef(new Animated.Value(0.4)).current;
  const prActionsAnim = useRef(new Animated.Value(0)).current;
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const repsRef       = useRef<TextInput>(null);
  const lastSessionTipRef = useRef<string | null>(null);

  const weaponColor = WEAPON_COLORS[weaponKey] ?? Colors.gold;

  // The best estimated 1RM across all sets logged THIS session — updates
  // live as sets are added, shown prominently at the top of the screen.
  const bestEstimatedOneRepMax = sets.reduce((best, s) => {
    const est = estimatedOneRepMaxForDisplay(s.weight, s.reps);
    if (est === null) return best;
    return best === null ? est : Math.max(best, est);
  }, null as number | null);

  const sessionTip = getSessionTip(sets, currentPR);

  // Reset the dismissal whenever the tip itself actually changes (a new
  // set was logged and the analysis now says something different), so a
  // fresh tip can surface again even if an earlier one was dismissed.
  useEffect(() => {
    if (sessionTip !== lastSessionTipRef.current) {
      lastSessionTipRef.current = sessionTip;
      setSessionTipDismissed(false);
    }
  }, [sessionTip]);

  useEffect(() => {
    // Run the overload analysis BEFORE creating today's session, and
    // filter empty-set sessions defensively inside
    // analyzeProgressiveOverload() itself — belt and suspenders, since a
    // freshly created empty session for this exercise was otherwise
    // getting pulled in as "most recent" and crashing the score
    // calculation, silently rejecting the promise. analyzeProgressiveOverload()
    // is async (it reads/writes AsyncStorage to remember escalation
    // state), so this uses .then() rather than making the effect
    // callback itself async, which React doesn't support directly.
    // .catch() ensures any future bad data shape fails safe instead of
    // leaving the suggestion stuck at null forever.
    analyzeProgressiveOverload(exerciseId, exerciseName)
      .then(setOverloadSuggestion)
      .catch(() => setOverloadSuggestion(null));

    const id = createStrengthSession(exerciseId, exerciseName);
    setSessionId(id);
    const pr = getPersonalRecord(exerciseId);
    if (pr) setCurrentPR(pr.best_weight);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    AsyncStorage.getItem('valhalla_weapon').then(w => { if (w) setWeaponKey(w); });
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startRestTimer() {
    setRestTimer(90);
    setTimerActive(true);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRestTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current!); setTimerActive(false); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  function flashPR(w: string, r: string) {
    Keyboard.dismiss();
    setPrWeight(w); setPrReps(r);
    setRuneParticles(Array.from({ length: 10 }, (_, i) => i));
    setShowPRFlash(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 500);
    prAnim.setValue(0); prScaleAnim.setValue(0.4); prActionsAnim.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(prAnim,      { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(prScaleAnim, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }),
      ]),
      Animated.delay(600),
      Animated.timing(prActionsAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }

  function dismissPRFlash() {
    Animated.timing(prAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      setShowPRFlash(false); setRuneParticles([]);
    });
  }

  function handleAddSet() {
    const repsNum = parseInt(reps);
    const weightNum = parseFloat(weight);
    if (!repsNum || repsNum < 1) { Alert.alert('Missing reps', 'Enter how many reps you completed.'); return; }
    if (isNaN(weightNum) || weightNum < 0) { Alert.alert('Missing weight', 'Enter the weight used.'); return; }
    if (!sessionId) return;
    const setNum = sets.length + 1;
    const isPR = checkAndUpdatePR(exerciseId, exerciseName, weightNum, repsNum);
    const setId = addStrengthSet(sessionId, setNum, repsNum, weightNum, isPR);
    setSets(prev => [...prev, { id: setId, setNumber: setNum, reps: repsNum, weight: weightNum, isPR }]);
    if (isPR) { setCurrentPR(weightNum); flashPR(weight, reps); }
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    startRestTimer();
    setReps(''); setWeight('');
  }

  // Deletes a logged set — confirmed first, same pattern as the progress
  // photo delete flow in Mead Hall, since this is also an irreversible
  // action. Removes it from the database (which also re-checks the PR for
  // this exercise, in case the deleted set was the one that set it — see
  // db.ts's recalculatePersonalRecord()), then updates local state and
  // renumbers the remaining sets sequentially for a clean display.
  function handleDeleteSet(setToDelete: LoggedSet) {
    Alert.alert(
      'Delete this set?',
      `${setToDelete.weight} lbs × ${setToDelete.reps} reps — this cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteStrengthSet(setToDelete.id);
            setSets(prev =>
              prev
                .filter(s => s.id !== setToDelete.id)
                .map((s, i) => ({ ...s, setNumber: i + 1 }))
            );
            // The deleted set may have been the current PR — refresh from
            // the database's now-recalculated value rather than assuming.
            const pr = getPersonalRecord(exerciseId);
            setCurrentPR(pr?.best_weight ?? null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
      ]
    );
  }

  function handleFinish() {
    if (sets.length === 0) { Alert.alert('No sets logged', 'Log at least one set before finishing.'); return; }
    if (timerRef.current) clearInterval(timerRef.current);
    if (params.noXp !== '1') {
      recordWorkout('strength');
    }
    router.back();
  }
  const timerPercent = (restTimer / 90) * 100;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#080308', '#050508']} style={StyleSheet.absoluteFill} />
      <View style={styles.topGlow} />

      {/* PR FLASH */}
      {showPRFlash && (
        <Animated.View style={[styles.prOverlay, { opacity: prAnim }]} pointerEvents="box-none">
          <LinearGradient colors={['rgba(5,5,8,0.97)', 'rgba(8,4,12,0.97)']} style={StyleSheet.absoluteFill} />
          <View style={[styles.prAtmosphere, { backgroundColor: weaponColor }]} />
          {runeParticles.map((_, i) => (
            <FloatingRune key={i} color={weaponColor} delay={i * 120} x={20 + (i * (width - 40) / 10)} />
          ))}
          <Animated.View style={[styles.prContent, { transform: [{ scale: prScaleAnim }] }]} pointerEvents="none">
            <Text style={[styles.prEyebrow, { color: `${weaponColor}70` }]}>FEAT OF STRENGTH</Text>
            <Animated.View style={[styles.prWeaponWrap, { borderColor: `${weaponColor}30` }]}>
              <LinearGradient colors={[`${weaponColor}18`, `${weaponColor}04`]} style={StyleSheet.absoluteFill} />
              <WeaponSVG weapon={weaponKey} color={weaponColor} size={80} glowOpacity={0.8} />
            </Animated.View>
            <Text style={[styles.prTitle, { color: weaponColor }]}>NEW PR</Text>
            <Text style={styles.prExercise}>{exerciseName.toUpperCase()}</Text>
            <Text style={[styles.prWeightDisplay, { color: weaponColor }]}>{prWeight}<Text style={styles.prWeightUnit}> lbs</Text></Text>
            <Text style={styles.prRepsDisplay}>{prReps} reps</Text>
            <Text style={[styles.prRunes, { color: `${weaponColor}35` }]}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ</Text>
          </Animated.View>
          <Animated.View style={[styles.prActions, { opacity: prActionsAnim }]}>
            <TouchableOpacity style={[styles.prShareBtn, { borderColor: weaponColor, backgroundColor: `${weaponColor}12` }]} onPress={() => setShowSocial(true)} activeOpacity={0.85}>
              <LinearGradient colors={[`${weaponColor}20`, `${weaponColor}08`]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
              <Text style={[styles.prShareIcon, { color: weaponColor }]}>↑</Text>
              <Text style={[styles.prShareTitle, { color: weaponColor }]}>SHARE THIS FEAT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.prDismissBtn} onPress={dismissPRFlash} activeOpacity={0.7}>
              <Text style={styles.prDismissText}>CONTINUE FORGING →</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}

      {/* SOCIAL SHARE — separate, on top */}
      {showSocial && (
        <SocialShareScreen
          exerciseName={exerciseName} prWeight={prWeight} prReps={prReps}
          weaponKey={weaponKey} warriorName={warrior?.name ?? 'Warrior'}
          onDismiss={() => { setShowSocial(false); dismissPRFlash(); }}
        />
      )}

      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView style={styles.kbAware} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← BACK</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
              <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Text style={styles.finishBtnText}>FINISH</Text>
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

            {/* Exercise header */}
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseEyebrow}>NOW FORGING</Text>
              <View style={styles.exerciseNameRow}>
                <Text style={styles.exerciseName} numberOfLines={1} adjustsFontSizeToFit>
                  {exerciseName.toUpperCase()}
                </Text>
                <TouchableOpacity style={styles.hallBtn} onPress={() => router.push('/(modals)/pr-hall' as any)}>
                  <Text style={styles.hallBtnText}>ᛟ FEATS</Text>
                </TouchableOpacity>
              </View>

              {/* Estimated 1RM — the "more pro" stat at the top of the
                  page. Uses the Epley formula against the best set logged
                  so far THIS session, updating live as sets are added.
                  Only appears once at least one qualifying set exists
                  (2-12 reps) — silent otherwise rather than showing a
                  misleading placeholder. */}
              {bestEstimatedOneRepMax !== null && (
                <View style={styles.oneRepMaxRow}>
                  <View style={styles.oneRepMaxBadge}>
                    <Text style={styles.oneRepMaxLabel}>EST. 1-REP MAX</Text>
                    <Text style={[styles.oneRepMaxValue, { color: weaponColor }]}>
                      {bestEstimatedOneRepMax}<Text style={styles.oneRepMaxUnit}> lbs</Text>
                    </Text>
                  </View>
                  <Text style={styles.oneRepMaxNote}>Estimated from today's best set · Epley formula</Text>
                </View>
              )}
            </View>

            {/* Rest timer */}
            {timerActive && (
              <View style={styles.timerWrap}>
                <LinearGradient colors={['rgba(168,196,212,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
                <View style={styles.timerTop}>
                  <Text style={styles.timerLabel}>REST TIMER</Text>
                  <Text style={styles.timerValue}>{Math.floor(restTimer / 60)}:{String(restTimer % 60).padStart(2, '0')}</Text>
                </View>
                <View style={styles.timerTrack}>
                  <View style={[styles.timerFill, { width: `${timerPercent}%` }]}>
                    <LinearGradient colors={[Colors.ice, 'rgba(168,196,212,0.4)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                  </View>
                </View>
              </View>
            )}

            {/* Middle area — fills available space */}
            <View style={styles.middle}>
              {sets.length === 0 ? (
                /* Empty state — shows PR + motivation, fills space nicely */
                <View style={styles.emptyArea}>
                  {currentPR !== null && (
                    <View style={styles.prevBestCard}>
                      <LinearGradient colors={['rgba(201,168,76,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
                      <LinearGradient colors={['transparent', Colors.gold, 'transparent']} style={styles.prevBestLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                      <Text style={styles.prevBestLabel}>CURRENT PR</Text>
                      <Text style={styles.prevBestWeight}>{currentPR}<Text style={styles.prevBestUnit}> lbs</Text></Text>
                      <Text style={styles.prevBestSub}>Beat this. Carve a new rune.</Text>
                    </View>
                  )}
                  {overloadSuggestion && !overloadDismissed && (
                    <View style={styles.overloadCard}>
                      <LinearGradient colors={['rgba(168,196,212,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
                      <TouchableOpacity
                        style={styles.overloadDismissBtn}
                        onPress={() => setOverloadDismissed(true)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.overloadDismissText}>✕</Text>
                      </TouchableOpacity>
                      <Text style={styles.overloadLabel}>PROGRESS CHECK</Text>
                      <Text style={styles.overloadText}>{overloadSuggestion.message}</Text>
                    </View>
                  )}
                  <View style={styles.emptyMotivation}>
                    <Text style={styles.emptyRune}>ᚦ</Text>
                    <Text style={styles.emptyLine}>"{vikingLine}"</Text>
                    <Text style={styles.emptyStart}>Log your first set below</Text>
                  </View>
                </View>
              ) : (
                <>
                  {/* Live in-session tip — reacts to the sets logged so
                      far THIS session (fatigue, PR pace, consistency).
                      Separate from the PROGRESS CHECK card above, which
                      only looks at past completed sessions. */}
                  {sessionTip && !sessionTipDismissed && (
                    <View style={[styles.overloadCard, { marginBottom: 10 }]}>
                      <LinearGradient colors={['rgba(168,196,212,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
                      <TouchableOpacity
                        style={styles.overloadDismissBtn}
                        onPress={() => setSessionTipDismissed(true)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.overloadDismissText}>✕</Text>
                      </TouchableOpacity>
                      <Text style={styles.overloadLabel}>LIVE TIP</Text>
                      <Text style={styles.overloadText}>{sessionTip}</Text>
                    </View>
                  )}
                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={styles.setsTable}>
                      <View style={styles.setsTableHeader}>
                        <Text style={[styles.setsTableHead, { flex: 0.5 }]}>SET</Text>
                        <Text style={[styles.setsTableHead, { flex: 1 }]}>WEIGHT</Text>
                        <Text style={[styles.setsTableHead, { flex: 1 }]}>REPS</Text>
                        <Text style={[styles.setsTableHead, { flex: 0.8 }]}>STATUS</Text>
                        <View style={{ width: 32 }} />
                      </View>
                      {sets.map((s) => (
                        <View key={s.id} style={[styles.setRow, s.isPR && styles.setRowPR]}>
                          {s.isPR && <LinearGradient colors={['rgba(201,168,76,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />}
                          <Text style={[styles.setCell, { flex: 0.5 }]}>{s.setNumber}</Text>
                          <Text style={[styles.setCell, { flex: 1 }, s.isPR && styles.setCellPR]}>{s.weight} lbs</Text>
                          <Text style={[styles.setCell, { flex: 1 }]}>{s.reps}</Text>
                          <View style={{ flex: 0.8, alignItems: 'center' }}>
                            {s.isPR
                              ? <View style={styles.prTag}><Text style={styles.prTagText}>⚡ PR</Text></View>
                              : <Text style={styles.setCell}>✓</Text>}
                          </View>
                          <TouchableOpacity
                            style={styles.setDeleteBtn}
                            onPress={() => handleDeleteSet(s)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.setDeleteBtnText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}
            </View>

            {/* Input — always at bottom */}
            <View style={styles.inputSection}>
              <LinearGradient colors={['transparent', Colors.gold, 'transparent']} style={styles.inputSectionTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              <Text style={styles.inputSectionLabel}>SET {sets.length + 1} — LOG YOUR IRON</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>WEIGHT (lbs)</Text>
                  <TextInput
                    style={styles.input} value={weight} onChangeText={setWeight}
                    keyboardType="decimal-pad" placeholder="135" placeholderTextColor="rgba(255,255,255,0.08)"
                    returnKeyType="done" blurOnSubmit={false}
                    onSubmitEditing={() => repsRef.current?.focus()}
                  />
                </View>
                <View style={styles.inputDivider} />
                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>REPS</Text>
                  <TextInput
                    ref={repsRef} style={styles.input} value={reps} onChangeText={setReps}
                    keyboardType="number-pad" placeholder="8" placeholderTextColor="rgba(255,255,255,0.08)"
                    returnKeyType="done" blurOnSubmit onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
              </View>
              <TouchableOpacity style={styles.addSetBtn} onPress={handleAddSet} activeOpacity={0.85}>
                <LinearGradient colors={['#3A1A1A', '#1A0808']} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={['transparent', Colors.gold, 'transparent']} style={styles.addSetBtnTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                <Text style={styles.addSetBtnText}>⚔️  LOG SET {sets.length + 1}</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1, zIndex: 2 },
  kbAware: { flex: 1 },
  topGlow: { position: 'absolute', top: -60, left: width * 0.1, width: width * 0.8, height: 200, backgroundColor: 'rgba(139,26,26,0.15)', borderRadius: 999, pointerEvents: 'none' },

  prOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, alignItems: 'center', justifyContent: 'center' },
  prAtmosphere: { position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.45, opacity: 0.06 },
  prContent: { alignItems: 'center', gap: 8, paddingHorizontal: Spacing.lg },
  prEyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 5 },
  prWeaponWrap: { width: 120, height: 120, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginVertical: 10 },
  prTitle: { fontFamily: Fonts.display, fontSize: 52, letterSpacing: 4, lineHeight: 56, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24 },
  prExercise: { fontFamily: Fonts.heading, fontSize: 12, color: Colors.textMuted, letterSpacing: 2 },
  prWeightDisplay: { fontFamily: Fonts.display, fontSize: 64, lineHeight: 68 },
  prWeightUnit: { fontSize: 24, lineHeight: 28 },
  prRepsDisplay: { fontFamily: Fonts.proseItalic, fontSize: 17, color: Colors.textMuted, fontStyle: 'italic', marginTop: -6 },
  prRunes: { fontFamily: 'System', fontSize: 13, letterSpacing: 8, marginTop: 4 },
  prActions: { position: 'absolute', bottom: 50, left: Spacing.lg, right: Spacing.lg, gap: 10 },
  prShareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingVertical: 16, overflow: 'hidden' },
  prShareIcon: { fontSize: 20, fontFamily: 'System' },
  prShareTitle: { fontFamily: Fonts.heading, fontSize: 14, letterSpacing: 1 },
  prDismissBtn: { alignItems: 'center', paddingVertical: 10 },
  prDismissText: { fontFamily: Fonts.body, fontSize: 10, color: Colors.textMuted, letterSpacing: 3 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  backBtn: { paddingVertical: 8 },
  backBtnText: { fontFamily: Fonts.body, fontSize: 11, letterSpacing: 2, color: Colors.textMuted },
  finishBtn: { borderRadius: Radii.sm, overflow: 'hidden', paddingHorizontal: 18, paddingVertical: 8 },
  finishBtnText: { fontFamily: Fonts.heading, fontSize: 12, color: Colors.void, letterSpacing: 2 },

  content: { flex: 1, paddingHorizontal: Spacing.lg },
  exerciseHeader: { marginBottom: Spacing.sm, gap: 4 },
  exerciseEyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 4, color: Colors.blood },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  exerciseName: { fontFamily: Fonts.display, fontSize: 22, color: Colors.gold, letterSpacing: 2, flex: 1, textShadowColor: 'rgba(201,168,76,0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15 },
  hallBtn: { borderWidth: 1, borderColor: Colors.goldBorder, borderRadius: Radii.full, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: Colors.goldMuted },
  hallBtnText: { fontFamily: Fonts.body, fontSize: 9, color: Colors.gold, letterSpacing: 1 },

  oneRepMaxRow: { marginTop: 8, gap: 4 },
  oneRepMaxBadge: {
    flexDirection: 'row', alignItems: 'baseline', gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  oneRepMaxLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: Colors.textMuted },
  oneRepMaxValue: { fontFamily: Fonts.heading, fontSize: 18 },
  oneRepMaxUnit: { fontSize: 11, color: Colors.textMuted },
  oneRepMaxNote: { fontFamily: Fonts.body, fontSize: 8, color: Colors.textDim, letterSpacing: 0.5 },

  timerWrap: { borderWidth: 1, borderColor: 'rgba(168,196,212,0.2)', borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.sm, overflow: 'hidden', gap: 8 },
  timerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timerLabel: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, color: Colors.ice, opacity: 0.6 },
  timerValue: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.ice },
  timerTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 2, overflow: 'hidden' },

  // Middle area — fills all space between header and input
  middle: { flex: 1, marginBottom: Spacing.sm },

  // Empty state — properly fills the space
  emptyArea: { flex: 1, justifyContent: 'center', gap: 16 },
  prevBestCard: {
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)', borderRadius: 16,
    padding: Spacing.lg, overflow: 'hidden', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(10,8,14,0.9)',
  },
  prevBestLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  prevBestLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 3, color: 'rgba(201,168,76,0.5)' },
  prevBestWeight: { fontFamily: Fonts.display, fontSize: 48, color: Colors.gold, lineHeight: 52, textShadowColor: 'rgba(201,168,76,0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
  prevBestUnit: { fontSize: 22 },
  prevBestSub: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
  overloadCard: {
    borderWidth: 1, borderColor: 'rgba(168,196,212,0.25)', borderRadius: 14,
    padding: Spacing.md, paddingRight: 34, overflow: 'hidden', backgroundColor: 'rgba(10,8,14,0.9)', gap: 4,
  },
  overloadDismissBtn: {
    position: 'absolute', top: 10, right: 10, zIndex: 1,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  overloadDismissText: { fontFamily: Fonts.body, fontSize: 10, color: Colors.textMuted },
  overloadLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: Colors.ice },
  overloadText: { fontFamily: Fonts.prose, fontSize: 13, color: Colors.text, lineHeight: 19 },
  emptyMotivation: { alignItems: 'center', gap: 8 },
  emptyRune: { fontSize: 32, color: 'rgba(201,168,76,0.2)', fontFamily: 'System' },
  emptyLine: { fontFamily: Fonts.proseItalic, fontSize: 14, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center', lineHeight: 22 },
  emptyStart: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 2, color: Colors.textDim },

  // Sets table
  setsTable: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: Radii.md, overflow: 'hidden', backgroundColor: 'rgba(10,8,10,0.6)' },
  setsTableHeader: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  setsTableHead: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: Colors.textMuted, textAlign: 'center' },
  setRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', alignItems: 'center', overflow: 'hidden' },
  setRowPR: { borderBottomColor: 'rgba(201,168,76,0.1)' },
  setCell: { fontFamily: Fonts.subheading, fontSize: 14, color: Colors.text, textAlign: 'center' },
  setCellPR: { color: Colors.gold },
  prTag: { backgroundColor: Colors.goldMuted, borderWidth: 1, borderColor: Colors.goldBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  prTagText: { fontFamily: Fonts.body, fontSize: 8, color: Colors.gold, letterSpacing: 1 },
  setDeleteBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(139,26,26,0.1)',
  },
  setDeleteBtnText: { fontFamily: Fonts.body, fontSize: 11, color: Colors.blood },

  // Input section — always at bottom
  inputSection: { borderWidth: 1, borderColor: 'rgba(201,168,76,0.5)', borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.lg, overflow: 'hidden', backgroundColor: 'rgba(10,8,10,0.8)', gap: 12 },
  inputSectionTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  inputSectionLabel: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, color: Colors.textMuted },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputWrap: { flex: 1, gap: 6 },
  inputLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: Colors.textMuted },
  input: { fontFamily: Fonts.heading, fontSize: 32, color: Colors.text, letterSpacing: 1 },
  inputDivider: { width: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: Spacing.md },
  addSetBtn: { borderRadius: Radii.sm, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)', padding: 14, alignItems: 'center' },
  addSetBtnTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  addSetBtnText: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.gold, letterSpacing: 2 },
});