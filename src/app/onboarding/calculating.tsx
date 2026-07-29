import { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeaponSVG } from '../../components/WeaponSVG';
import { useOnboardingStore } from '@/lib/onboarding-store';
import { useWarriorStore } from '@/lib/store';
import { Colors, Fonts, Spacing } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

const RUNE_SEQUENCE = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛋᛗᛚᛜᛞᛟ';

const BG_RUNES = [
  { rune: 'ᚠ', top: 60,   left: -20,  size: 120, opacity: 0.04, rotate: '15deg'  },
  { rune: 'ᚢ', top: 200,  right: -30, size: 140, opacity: 0.03, rotate: '-10deg' },
  { rune: 'ᚦ', top: 380,  left: 10,   size: 100, opacity: 0.04, rotate: '25deg'  },
  { rune: 'ᛟ', top: 560,  right: -10, size: 160, opacity: 0.03, rotate: '-20deg' },
  { rune: 'ᚱ', top: 700,  left: -15,  size: 110, opacity: 0.035, rotate: '8deg' },
];

const WEAPON_COLORS: Record<string, string> = {
  mjolnir:    '#C9A84C',
  broadsword: '#A8C4D4',
  axe:        '#E05050',
  spear:      '#8B6FD4',
};

const WEAPON_NAMES: Record<string, string> = {
  mjolnir:    'MJOLNIR',
  broadsword: 'BROADSWORD',
  axe:        'VIKING AXE',
  spear:      'GUNGNIR',
};

const GOAL_LABELS: Record<string, string> = {
  strength:   'strength protocol',
  endurance:  'endurance raids',
  both:       'complete warrior path',
  weightloss: 'forge-the-body protocol',
};

// A short, specific line of what's ahead for their chosen goal — used in
// the final reveal so the promise feels tailored to what they actually
// picked, not generic. Reuses the exact goal keys already defined in
// GOAL_LABELS above rather than introducing a second mapping to keep in sync.
const GOAL_PROMISES: Record<string, string> = {
  strength:   'Every rep will be counted. Every heavy day, remembered.',
  endurance:  'Every mile raided will be written into your legend.',
  both:       'Every battle, of every kind, becomes part of your saga.',
  weightloss: 'Every transformation, tracked and told, one day at a time.',
};

function getSagaLines(name: string, weapon: string, gender: string, goal: string): string[] {
  const weaponName = WEAPON_NAMES[weapon] ?? 'YOUR WEAPON';
  const path = gender === 'shieldmaiden' ? 'Path of the Valkyrie' : 'Path of the Einherjar';
  const goalLabel = GOAL_LABELS[goal] ?? 'your path';
  return [
    `Inscribing ${name} into the stones...`,
    `Heating the forge for ${weaponName}...`,
    `Mapping the ${goalLabel}...`,
    `Consulting the Norns...`,
    `Carving your ${path}...`,
    `The skald sharpens his quill for your saga...`,
    `The ancient texts await you...`,
    `The Valkyries have spoken.`,
  ];
}

export default function CalculatingScreen() {
  const { data, markComplete } = useOnboardingStore();
  const { setName } = useWarriorStore();
  const [currentLine, setCurrentLine] = useState(0);
  const [currentRune, setCurrentRune] = useState(0);
  const [done, setDone] = useState(false);
  const [canSkip, setCanSkip] = useState(false);

  // Guards so the finish/redirect logic can only ever run once, whether it's
  // triggered by the automatic timer or by the person tapping to skip ahead.
  const hasFinishedRef = useRef(false);
  const hasRedirectedRef = useRef(false);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weaponColor = WEAPON_COLORS[data.weapon ?? 'mjolnir'] ?? Colors.gold;
  const sagaLines = getSagaLines(
    data.name ?? 'WARRIOR',
    data.weapon ?? 'mjolnir',
    data.gender ?? 'warrior',
    data.goal ?? 'strength',
  );
  const goalPromise = GOAL_PROMISES[data.goal ?? 'strength'] ?? GOAL_PROMISES.strength;

  const fadeAnim           = useRef(new Animated.Value(0)).current;
  const progressAnim       = useRef(new Animated.Value(0)).current;
  const glowAnim           = useRef(new Animated.Value(0)).current;
  const titleAnim          = useRef(new Animated.Value(0)).current;
  const lineAnim           = useRef(new Animated.Value(1)).current;
  const weaponRevealScale  = useRef(new Animated.Value(0.3)).current;
  const weaponRevealOpacity = useRef(new Animated.Value(0)).current;
  const weaponPulse        = useRef(new Animated.Value(1)).current;
  const ringRotate         = useRef(new Animated.Value(0)).current;
  const hazeAnim           = useRef(new Animated.Value(0)).current;
  const skipAnim           = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim,     { toValue: 1, duration: 800,  useNativeDriver: true }).start();
    Animated.timing(progressAnim, { toValue: 1, duration: 8000, useNativeDriver: false }).start();
    Animated.timing(hazeAnim,     { toValue: 1, duration: 2000, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 2500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 2500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 8000, useNativeDriver: true })
    ).start();

    let lineIndex = 0;
    const lineTimer = setInterval(() => {
      lineIndex++;
      if (lineIndex < sagaLines.length) {
        Animated.sequence([
          Animated.timing(lineAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(lineAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
        setCurrentLine(lineIndex);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        clearInterval(lineTimer);
      }
    }, 1400);

    const runeTimer = setInterval(() => {
      setCurrentRune((r) => (r + 1) % RUNE_SEQUENCE.length);
    }, 120);

    // After ~3s, let people tap through instead of waiting out the full
    // saga-line sequence — the automatic timer below still fires as a
    // fallback for anyone who doesn't tap anything.
    const skipRevealTimer = setTimeout(() => {
      setCanSkip(true);
      Animated.timing(skipAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, 3000);

    async function runFinish() {
      if (hasFinishedRef.current) return;
      hasFinishedRef.current = true;

      clearInterval(lineTimer);
      clearInterval(runeTimer);
      setDone(true);

      if (data.name)   setName(data.name);
      if (data.weapon) await AsyncStorage.setItem('valhalla_weapon', data.weapon);
      if (data.gender) await AsyncStorage.setItem('valhalla_gender', data.gender);
      if (data.goal)   await AsyncStorage.setItem('valhalla_goal', data.goal);

      // Mark onboarding complete as soon as we know the user's data is
      // valid and saved — not several seconds later at the end of the
      // reveal animation. A force-close during the reveal (or any delay
      // before it fires) would otherwise leave isComplete stuck at false.
      await markComplete();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.parallel([
        Animated.timing(titleAnim,           { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(weaponRevealScale,   { toValue: 1, tension: 35, friction: 8, useNativeDriver: true }),
        Animated.timing(weaponRevealOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(weaponPulse, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
            Animated.timing(weaponPulse, { toValue: 1,    duration: 1200, useNativeDriver: true }),
          ])
        ).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 700);

      redirectTimeoutRef.current = setTimeout(() => {
        goToPaywall();
      }, 2800);
    }

    const finishTimer = setTimeout(runFinish, 8500);

    return () => {
      clearInterval(lineTimer);
      clearInterval(runeTimer);
      clearTimeout(skipRevealTimer);
      clearTimeout(finishTimer);
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToPaywall() {
    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;
    if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    router.replace('/(modals)/paywall');
  }

  function handleSkipTap() {
    if (!canSkip || hasFinishedRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Re-run the same finish path the automatic timer would have run —
    // hasFinishedRef guards against the timer firing again afterward.
    (async () => {
      hasFinishedRef.current = true;
      setDone(true);

      if (data.name)   setName(data.name);
      if (data.weapon) await AsyncStorage.setItem('valhalla_weapon', data.weapon);
      if (data.gender) await AsyncStorage.setItem('valhalla_gender', data.gender);
      if (data.goal)   await AsyncStorage.setItem('valhalla_goal', data.goal);
      await markComplete();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.parallel([
        Animated.timing(titleAnim,           { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(weaponRevealScale,   { toValue: 1, tension: 35, friction: 8, useNativeDriver: true }),
        Animated.timing(weaponRevealOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(weaponPulse, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
            Animated.timing(weaponPulse, { toValue: 1,    duration: 1200, useNativeDriver: true }),
          ])
        ).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 500);

      redirectTimeoutRef.current = setTimeout(() => {
        goToPaywall();
      }, 2800);
    })();
  }

  function handleRevealTap() {
    // Lets someone tap through the final reveal screen immediately instead
    // of waiting out its own 2.8s auto-redirect.
    goToPaywall();
  }

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const ringDeg       = ringRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const hazeOpacity   = hazeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#06030A', '#050508', '#040408']}
        style={StyleSheet.absoluteFill}
      />

      {/* Top atmospheric haze — weapon color, very subtle */}
      <Animated.View
        pointerEvents="none"
        style={[styles.topHaze, { backgroundColor: weaponColor, opacity: hazeOpacity }]}
      />

      {/* Bottom dark vignette */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(4,4,8,0.8)']}
        style={styles.bottomVignette}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      />

      {/* Background carved runes */}
      {BG_RUNES.map((r, i) => (
        <Text
          key={i}
          style={[styles.bgRune, {
            top: r.top,
            left: 'left' in r ? (r as any).left : undefined,
            right: 'right' in r ? (r as any).right : undefined,
            fontSize: r.size,
            opacity: r.opacity,
            color: weaponColor,
            transform: [{ rotate: r.rotate }],
          }]}
        >
          {r.rune}
        </Text>
      ))}

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

        {!done ? (
          <>
            <View style={styles.runeSpinnerWrap}>
              <Animated.View style={[styles.runeSpinnerRingOuter, {
                borderColor: `${weaponColor}18`,
                transform: [{ rotate: ringDeg }],
              }]} />
              <View style={[styles.runeSpinnerRing, { borderColor: `${weaponColor}25` }]} />
              <Text style={[styles.runeSpinner, {
                color: weaponColor,
                textShadowColor: `${weaponColor}60`,
              }]}>
                {RUNE_SEQUENCE[currentRune]}
              </Text>
            </View>

            <Text style={styles.calculatingTitle}>CALCULATING</Text>
            <Text style={[styles.calculatingSubtitle, { color: weaponColor }]}>YOUR SAGA</Text>

            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
                <LinearGradient
                  colors={[Colors.blood, weaponColor]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <View style={styles.progressShine} />
              </Animated.View>
            </View>

            <Animated.Text style={[styles.sagaLine, { opacity: lineAnim }]}>
              {sagaLines[currentLine]}
            </Animated.Text>

            {data.name && (
              <View style={[styles.warriorPreview, { borderColor: `${weaponColor}20` }]}>
                <LinearGradient colors={[`${weaponColor}08`, 'transparent']} style={StyleSheet.absoluteFill} />
                <Text style={[styles.warriorPreviewName, { color: weaponColor }]}>{data.name}</Text>
                <Text style={styles.warriorPreviewPath}>
                  {data.gender === 'shieldmaiden' ? 'Path of the Valkyrie' : 'Path of the Einherjar'}
                </Text>
              </View>
            )}

            <Text style={[styles.runeRow, { color: `${weaponColor}20` }]}>ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ</Text>

            {/* Skip control — fades in a few seconds in, so the saga-line
                sequence still gets its moment, but nobody's forced to sit
                through all of it if they'd rather move on. */}
            <Animated.View style={{ opacity: skipAnim, marginTop: 4 }}>
              <TouchableOpacity
                onPress={handleSkipTap}
                disabled={!canSkip}
                hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
                activeOpacity={0.7}
              >
                <Text style={[styles.skipText, { color: `${weaponColor}90` }]}>
                  Skip →
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        ) : (
          <TouchableOpacity activeOpacity={0.92} onPress={handleRevealTap} style={{ width: '100%' }}>
            <Animated.View style={[styles.revealWrap, { opacity: titleAnim }]}>
              <Text style={styles.revealTitle}>YOUR SAGA</Text>
              <Text style={[styles.revealSubtitle, {
                color: weaponColor,
                textShadowColor: `${weaponColor}60`,
              }]}>
                IS WRITTEN
              </Text>

              <Animated.View style={[styles.weaponRevealWrap, {
                opacity: weaponRevealOpacity,
                transform: [{ scale: weaponRevealScale }],
                borderColor: `${weaponColor}30`,
              }]}>
                <LinearGradient colors={[`${weaponColor}20`, `${weaponColor}05`]} style={StyleSheet.absoluteFill} />
                <Animated.View style={{ transform: [{ scale: weaponPulse }] }}>
                  <WeaponSVG
                    weapon={data.weapon ?? 'broadsword'}
                    color={weaponColor}
                    size={90}
                    glowOpacity={0.8}
                  />
                </Animated.View>
              </Animated.View>

              <Text style={styles.revealName}>{data.name}</Text>
              <Text style={[styles.revealWeapon, { color: weaponColor }]}>
                {WEAPON_NAMES[data.weapon ?? 'broadsword']} · RAW
              </Text>
              <Text style={styles.revealDesc}>
                The Valkyries have assessed your worth.{'\n'}Your journey to Valhalla begins now.
              </Text>

              {/* Goal-specific promise line — ties the reveal to the exact
                  thing they picked earlier in onboarding, instead of only
                  generic Valhalla copy. Plain static text, no new animation. */}
              <Text style={[styles.goalPromise, { color: `${weaponColor}CC` }]}>
                {goalPromise}
              </Text>

              {/* Chronicle tease — previews the AI-written saga feature
                  before the person ever sees the Sagas tab, so it's already
                  something they're anticipating by the time they reach the
                  paywall. Static text only. */}
              <Text style={styles.chronicleTease}>
                A skald will chronicle every day you train — the next verse in a saga only you are writing.
              </Text>

              <Text style={[styles.revealRuneRow, { color: `${weaponColor}25` }]}>
                ᚠ  ᚢ  ᚦ  ᚨ  ᚱ  ᚲ  ᚷ  ᚹ
              </Text>

              <Text style={[styles.tapContinue, { color: `${weaponColor}70` }]}>
                Tap to continue →
              </Text>
            </Animated.View>
          </TouchableOpacity>
        )}

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050508',
    alignItems: 'center',
    justifyContent: 'center',
  },

  topHaze: {
    position: 'absolute',
    top: -80, left: 0, right: 0,
    height: height * 0.45,
    transform: [{ scaleX: 1.1 }],
  },

  bottomVignette: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: height * 0.3,
  },

  bgRune: {
    position: 'absolute',
    fontFamily: 'System',
    lineHeight: 160,
  },

  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: 20,
    zIndex: 1,
  },

  runeSpinnerWrap: {
    width: 110, height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  runeSpinnerRing: {
    position: 'absolute',
    width: 90, height: 90,
    borderRadius: 45,
    borderWidth: 1,
  },
  runeSpinnerRingOuter: {
    position: 'absolute',
    width: 112, height: 112,
    borderRadius: 56,
    borderWidth: 1,
  },
  runeSpinner: {
    fontSize: 52,
    fontFamily: 'System',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  calculatingTitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    letterSpacing: 6,
    color: Colors.textMuted,
  },
  calculatingSubtitle: {
    fontFamily: Fonts.display,
    fontSize: 36,
    letterSpacing: 4,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginTop: -8,
  },

  progressTrack: {
    width: width * 0.7,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressShine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },

  sagaLine: {
    fontFamily: Fonts.proseItalic,
    fontSize: 15,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  warriorPreview: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(10,8,10,0.6)',
    overflow: 'hidden',
  },
  warriorPreviewName: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    letterSpacing: 2,
  },
  warriorPreviewPath: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  runeRow: {
    fontFamily: 'System',
    fontSize: 14,
    letterSpacing: 8,
  },

  skipText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    letterSpacing: 2,
  },

  revealWrap: { alignItems: 'center', gap: 10 },
  revealTitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    letterSpacing: 6,
    color: Colors.textMuted,
  },
  revealSubtitle: {
    fontFamily: Fonts.display,
    fontSize: 40,
    letterSpacing: 4,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
    marginTop: -8,
  },

  weaponRevealWrap: {
    width: 140, height: 140,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginVertical: 8,
  },

  revealName: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    color: Colors.text,
    letterSpacing: 3,
    marginTop: 4,
  },
  revealWeapon: {
    fontFamily: Fonts.body,
    fontSize: 10,
    letterSpacing: 3,
    marginTop: -4,
  },
  revealDesc: {
    fontFamily: Fonts.proseItalic,
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 6,
  },
  goalPromise: {
    fontFamily: Fonts.subheading,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 2,
  },
  chronicleTease: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textDim,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    paddingHorizontal: Spacing.md,
  },
  revealRuneRow: {
    fontFamily: 'System',
    fontSize: 13,
    letterSpacing: 8,
    marginTop: 8,
  },
  tapContinue: {
    fontFamily: Fonts.body,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: 6,
  },
});