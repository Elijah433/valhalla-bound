import { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore, type Gender } from '@/lib/onboarding-store';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width } = Dimensions.get('window');

const GENDERS: {
  key: Gender;
  title: string;
  subtitle: string;
  rune: string;
  color: string;
  desc: string;
}[] = [
  {
    key: 'warrior',
    title: 'WARRIOR',
    subtitle: 'Path of the Einherjar',
    rune: 'ᚠ',
    color: '#C9A84C',
    desc: 'Train to be chosen by Odin. Raw strength, relentless will.',
  },
  {
    key: 'shieldmaiden',
    title: 'SHIELDMAIDEN',
    subtitle: 'Path of the Valkyrie',
    rune: 'ᚢ',
    color: '#D4A8C4',
    desc: 'Fight with precision and grace. The Valkyries choose their own.',
  },
];

export default function NameScreen() {
  const { data, setField } = useOnboardingStore();
  const [name, setName] = useState(data.name ?? '');
  const [selectedGender, setSelectedGender] = useState<Gender | null>(data.gender ?? null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  function handleNext() {
    if (!name.trim() || !selectedGender) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setField('name', name.trim().toUpperCase());
    setField('gender', selectedGender);
    router.push('/onboarding/goal');
  }

  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/welcome' as any);
    }
  }

  function selectGender(g: Gender) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGender(g);
  }

  const canContinue = name.trim().length > 0 && selectedGender !== null;
  const selectedGenderData = GENDERS.find(g => g.key === selectedGender);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#080308', '#050508']} style={StyleSheet.absoluteFill} />
      <View style={styles.topGlow} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.kbAware}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.topRow}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <View style={styles.progressRow}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.progressDot, i === 0 && styles.progressDotActive]} />
              ))}
            </View>
            <View style={styles.backBtnSpacer} />
          </View>
          <Text style={styles.progressLabel}>STEP 1 OF 4</Text>

          <Animated.View style={[styles.content, {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }]}>
            <Text style={styles.stepLabel}>THE VALKYRIE ASKS</Text>
            <Text style={styles.title}>WHO ARE YOU?</Text>
            <Text style={styles.subtitle}>
              Your name will be carved into the stones of Valhalla.
            </Text>

            <View style={styles.inputWrap}>
              <LinearGradient
                colors={['transparent', Colors.gold, 'transparent']}
                style={styles.inputTopLine}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={styles.inputLabel}>YOUR NAME</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your warrior name"
                placeholderTextColor={Colors.textDim}
                autoCapitalize="words"
                maxLength={24}
                returnKeyType="done"
              />
            </View>

            <Text style={styles.chooseLabel}>CHOOSE YOUR PATH</Text>

            <View style={styles.genderRow}>
              {GENDERS.map((g) => {
                const isSelected = selectedGender === g.key;
                return (
                  <TouchableOpacity
                    key={g.key}
                    style={[
                      styles.genderCard,
                      isSelected && { borderColor: `${g.color}50` },
                    ]}
                    onPress={() => selectGender(g.key)}
                    activeOpacity={0.8}
                  >
                    {isSelected && (
                      <LinearGradient
                        colors={[`${g.color}10`, 'transparent']}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    {isSelected && (
                      <LinearGradient
                        colors={['transparent', g.color, 'transparent']}
                        style={styles.genderCardTopLine}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    )}

                    {/* Rune background watermark */}
                    <Text style={[
                      styles.genderRuneBg,
                      { color: isSelected ? `${g.color}15` : 'rgba(255,255,255,0.03)' },
                    ]}>
                      {g.rune}
                    </Text>

                    {/* Rune icon wrap */}
                    <View style={[
                      styles.genderIconWrap,
                      isSelected && {
                        borderColor: `${g.color}35`,
                        backgroundColor: `${g.color}10`,
                      },
                    ]}>
                      <Text style={[
                        styles.genderRune,
                        { color: isSelected ? g.color : Colors.textMuted },
                      ]}>
                        {g.rune}
                      </Text>
                    </View>

                    <Text style={[
                      styles.genderTitle,
                      isSelected && { color: g.color },
                    ]}>
                      {g.title}
                    </Text>
                    <Text style={styles.genderDesc}>{g.desc}</Text>

                    {isSelected && (
                      <View style={[
                        styles.selectedCheck,
                        { borderColor: `${g.color}50`, backgroundColor: `${g.color}15` },
                      ]}>
                        <Text style={[styles.selectedCheckText, { color: g.color }]}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          <TouchableOpacity
            style={[styles.nextBtn, !canContinue && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canContinue}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={canContinue ? ['#3A1A1A', '#1A0808'] : ['#111', '#0A0A0A']}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={canContinue
                ? ['transparent', selectedGenderData?.color ?? Colors.gold, 'transparent']
                : ['transparent', 'rgba(255,255,255,0.06)', 'transparent']}
              style={styles.nextBtnTopLine}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Text style={[
              styles.nextBtnText,
              !canContinue && { color: Colors.textMuted },
              canContinue && { color: selectedGenderData?.color ?? Colors.gold },
            ]}>
              {canContinue ? 'CONTINUE YOUR SAGA →' : 'CHOOSE YOUR PATH'}
            </Text>
          </TouchableOpacity>

          {canContinue && (
            <Text style={styles.ctaFooter}>Your saga begins the moment you continue.</Text>
          )}

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  kbAware: { flex: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },

  topGlow: {
    position: 'absolute',
    top: -60,
    left: width * 0.1,
    width: width * 0.8,
    height: 200,
    backgroundColor: 'rgba(139,26,26,0.15)',
    borderRadius: 999,
    pointerEvents: 'none',
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
  progressDot: {
    flex: 1, height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
  },
  progressDotActive: { backgroundColor: Colors.gold },
  progressLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 2,
    color: Colors.textDim,
    marginBottom: Spacing.lg,
  },

  content: { flex: 1 },

  stepLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 4,
    color: Colors.blood,
    marginBottom: 6,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.gold,
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: 'rgba(201,168,76,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontFamily: Fonts.proseItalic,
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },

  inputWrap: {
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(10,8,10,0.8)',
    overflow: 'hidden',
  },
  inputTopLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  inputLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 3,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  input: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: 1,
  },

  chooseLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.textMuted,
    marginBottom: 12,
  },

  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: 5,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,8,10,0.8)',
    position: 'relative',
    minHeight: 160,
  },
  genderCardTopLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },

  genderRuneBg: {
    position: 'absolute',
    bottom: -8,
    right: 6,
    fontSize: 60,
    fontFamily: 'System',
  },

  genderIconWrap: {
    width: 44, height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  genderRune: {
    fontSize: 22,
    fontFamily: 'System',
  },

  genderTitle: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  genderSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 1,
    color: Colors.textDim,
  },
  genderDesc: {
    fontFamily: Fonts.prose,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    marginTop: 4,
  },

  selectedCheck: {
    position: 'absolute',
    top: 10, right: 10,
    width: 20, height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckText: {
    fontFamily: Fonts.body,
    fontSize: 10,
  },

  nextBtn: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
    padding: Spacing.lg,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  nextBtnDisabled: { borderColor: 'rgba(255,255,255,0.05)' },
  nextBtnTopLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  nextBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.gold,
    letterSpacing: 3,
  },
  ctaFooter: {
    fontFamily: Fonts.proseItalic,
    fontSize: 11,
    color: Colors.textDim,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
});