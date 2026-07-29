import { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore, type Goal } from '@/lib/onboarding-store';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width } = Dimensions.get('window');

const GOALS: {
  key: Goal;
  title: string;
  subtitle: string;
  rune: string;
  color: string;
  desc: string;
}[] = [
  {
    key: 'strength',
    title: 'FEATS OF STRENGTH',
    subtitle: 'Become the Berserker',
    rune: 'ᚦ',
    color: '#C9A84C',
    desc: 'Build raw power. Lift heavy. Leave your mark on iron.',
  },
  {
    key: 'endurance',
    title: 'ENDURANCE RAIDS',
    subtitle: 'Run with the Wolves',
    rune: 'ᚢ',
    color: '#A8C4D4',
    desc: 'Cover distance. Build stamina. Raid far lands.',
  },
  {
    key: 'both',
    title: 'COMPLETE WARRIOR',
    subtitle: 'Path of the Jarl',
    rune: 'ᚨ',
    color: '#C9A84C',
    desc: 'Strength and endurance. The all-around warrior.',
  },
  {
    key: 'weightloss',
    title: 'FORGE THE BODY',
    subtitle: 'Shieldmaiden Tone',
    rune: 'ᚱ',
    color: '#D4A8C4',
    desc: 'Burn fat. Build lean muscle. Transform completely.',
  },
];

export default function GoalScreen() {
  const { data, setField } = useOnboardingStore();
  const [selected, setSelected] = useState<Goal | null>(data.goal ?? null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(GOALS.map(() => new Animated.Value(0))).current;
  const cardScales = useRef(GOALS.map(() => new Animated.Value(1))).current;
  const confirmAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    GOALS.forEach((_, i) => {
      Animated.timing(cardAnims[i], {
        toValue: 1,
        duration: 400,
        delay: 150 + i * 80,
        useNativeDriver: true,
      }).start();
    });

    // Slow ambient background pulse — same restrained technique used on the
    // paywall's hero glow, so this screen reads as part of the same premium
    // visual family rather than a plainer, earlier-generation screen.
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 3200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 3200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  function selectGoal(key: Goal, index: number) {
    setSelected(key);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Small confident "settle" animation on the chosen card — a quick
    // scale-up-then-back rather than an instant snap, so picking a path
    // feels like a decision landing, not just a toggle flipping.
    Animated.sequence([
      Animated.spring(cardScales[index], { toValue: 1.04, tension: 300, friction: 10, useNativeDriver: true }),
      Animated.spring(cardScales[index], { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();

    confirmAnim.setValue(0);
    Animated.timing(confirmAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }

  function handleNext() {
    if (!selected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setField('goal', selected);
    router.push('/onboarding/weapon');
  }

  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/name' as any);
    }
  }

  const selectedGoal = GOALS.find(g => g.key === selected);
  const glowColor = selectedGoal?.color ?? Colors.gold;
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.14] });

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#060508', '#050508']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.ambientGlow, { opacity: glowOpacity, backgroundColor: glowColor }]} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.container}>

          <View style={styles.topRow}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <View style={styles.progressRow}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.progressDotTrack}>
                  <View style={[
                    styles.progressDotFill,
                    i <= 1 && { backgroundColor: Colors.gold, width: '100%' },
                  ]} />
                </View>
              ))}
            </View>
            <View style={styles.backBtnSpacer} />
          </View>
          <Text style={styles.progressLabel}>STEP 2 OF 4</Text>

          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.stepLabel}>THE VALKYRIE ASKS</Text>
            <Text style={styles.title}>WHAT IS YOUR{'\n'}CALLING?</Text>
            <Text style={styles.subtitle}>
              Choose the path the Norns have laid before you.
            </Text>
          </Animated.View>

          <View style={styles.goalGrid}>
            {GOALS.map((goal, i) => {
              const isSelected = selected === goal.key;
              return (
                <Animated.View
                  key={goal.key}
                  style={{
                    opacity: cardAnims[i],
                    transform: [
                      {
                        translateY: cardAnims[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                      { scale: cardScales[i] },
                    ],
                    width: '48%',
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.goalCard,
                      isSelected && {
                        borderColor: `${goal.color}60`,
                        shadowColor: goal.color,
                        shadowOpacity: 0.35,
                        shadowRadius: 14,
                        shadowOffset: { width: 0, height: 6 },
                      },
                    ]}
                    onPress={() => selectGoal(goal.key, i)}
                    activeOpacity={0.8}
                  >
                    {isSelected && (
                      <LinearGradient
                        colors={[`${goal.color}16`, 'transparent']}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    {isSelected && (
                      <LinearGradient
                        colors={['transparent', goal.color, 'transparent']}
                        style={styles.goalCardTopLine}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    )}

                    {/* Rune as large background watermark */}
                    <Text style={[
                      styles.goalRuneBg,
                      { color: isSelected ? `${goal.color}25` : 'rgba(255,255,255,0.04)' },
                    ]}>
                      {goal.rune}
                    </Text>

                    {/* Rune as icon */}
                    <View style={[
                      styles.goalIconWrap,
                      isSelected && {
                        borderColor: `${goal.color}45`,
                        backgroundColor: `${goal.color}14`,
                      },
                    ]}>
                      <Text style={[
                        styles.goalRune,
                        { color: isSelected ? goal.color : Colors.textMuted },
                      ]}>
                        {goal.rune}
                      </Text>
                    </View>

                    <Text style={[
                      styles.goalTitle,
                      isSelected && { color: goal.color },
                    ]}>
                      {goal.title}
                    </Text>
                    <Text style={styles.goalSubtitle}>{goal.subtitle}</Text>
                    <Text style={styles.goalDesc}>{goal.desc}</Text>

                    {isSelected && (
                      <View style={[
                        styles.selectedCheck,
                        { borderColor: `${goal.color}60`, backgroundColor: `${goal.color}22` },
                      ]}>
                        <Text style={[styles.selectedCheckText, { color: goal.color }]}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* Confirmation line — reinforces the choice just made, giving a
              small moment of "yes, this is you" before moving on, rather
              than jumping straight from tap to button. */}
          {selected && (
            <Animated.View style={[
              styles.confirmRow,
              {
                opacity: confirmAnim,
                transform: [{
                  translateY: confirmAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }),
                }],
              },
            ]}>
              <Text style={[styles.confirmRune, { color: glowColor }]}>{selectedGoal?.rune}</Text>
              <Text style={styles.confirmText}>
                You walk the path of <Text style={{ color: glowColor }}>{selectedGoal?.subtitle}</Text>
              </Text>
            </Animated.View>
          )}

          <TouchableOpacity
            style={[styles.nextBtn, !selected && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!selected}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={selected ? [glowColor, glowColor] : ['#111', '#0A0A0A']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
            {selected && (
              <LinearGradient
                colors={['rgba(255,255,255,0.18)', 'transparent']}
                style={styles.nextBtnShine}
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              />
            )}
            <Text style={[
              styles.nextBtnText,
              !selected && { color: Colors.textMuted },
              selected && { color: Colors.void },
            ]}>
              {selected ? 'FORGE YOUR PATH →' : 'CHOOSE YOUR CALLING'}
            </Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },

  ambientGlow: {
    position: 'absolute',
    top: -80, left: width * 0.1,
    width: width * 0.8, height: 300,
    borderRadius: 999,
    transform: [{ scaleX: 1.3 }, { scaleY: 0.4 }],
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: Spacing.md,
    marginBottom: 6,
  },
  backBtn: {
    width: 28, height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontFamily: Fonts.body,
    fontSize: 18,
    color: Colors.textMuted,
  },
  backBtnSpacer: { width: 28 },

  progressRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  progressDotTrack: {
    flex: 1, height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressDotFill: {
    height: '100%',
    width: 0,
    borderRadius: 2,
  },
  progressLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 2,
    color: Colors.textDim,
    marginBottom: Spacing.lg,
  },

  stepLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 4,
    color: Colors.blood,
    marginBottom: 6,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.gold,
    letterSpacing: 2,
    marginBottom: 8,
    lineHeight: 34,
    textShadowColor: 'rgba(201,168,76,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontFamily: Fonts.proseItalic,
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },

  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    flex: 1,
    alignContent: 'flex-start',
    marginBottom: Spacing.md,
  },
  goalCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: 5,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,8,10,0.8)',
    minHeight: 150,
    position: 'relative',
  },
  goalCardTopLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },

  goalRuneBg: {
    position: 'absolute',
    bottom: -10,
    right: 4,
    fontSize: 64,
    fontFamily: 'System',
  },

  goalIconWrap: {
    width: 42, height: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  goalRune: {
    fontSize: 20,
    fontFamily: 'System',
  },

  goalTitle: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  goalSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 2,
  },
  goalDesc: {
    fontFamily: Fonts.prose,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },

  selectedCheck: {
    position: 'absolute',
    top: 8, right: 8,
    width: 18, height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckText: {
    fontFamily: Fonts.body,
    fontSize: 9,
  },

  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
    paddingHorizontal: 2,
  },
  confirmRune: {
    fontSize: 16,
    fontFamily: 'System',
  },
  confirmText: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  nextBtn: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
    padding: Spacing.lg,
    alignItems: 'center',
  },
  nextBtnDisabled: { borderColor: 'rgba(255,255,255,0.05)' },
  nextBtnShine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '55%',
  },
  nextBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.gold,
    letterSpacing: 3,
  },
});