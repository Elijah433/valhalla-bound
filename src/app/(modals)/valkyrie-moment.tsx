import { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

const DAILY_AFFIRMATIONS = [
  { rune: 'ᚦ', title: 'YOU TRAINED LIKE A VALKYRIE', sub: 'The Norns recorded your battle today.', affirmation: 'Strength is not built in comfort. You chose the forge today. Freya is proud.' },
  { rune: 'ᚢ', title: 'THE GODS WITNESSED YOU', sub: 'Another day written in your saga.', affirmation: 'Every rep, every step, every drop of sweat is a prayer to Valhalla. You showed up.' },
  { rune: 'ᚱ', title: 'FREYA WALKS BESIDE YOU', sub: 'You are becoming the warrior you were born to be.', affirmation: 'The most powerful thing you did today was not give up when it got hard. Remember that.' },
  { rune: 'ᛁ', title: 'YOUR SAGA GROWS', sub: 'One more chapter written in iron.', affirmation: 'You are not training to be perfect. You are training to be unbreakable. Big difference.' },
  { rune: 'ᚠ', title: 'VALHALLA TAKES NOTE', sub: 'The worthy are always chosen.', affirmation: 'Freya did not become the queen of the Valkyries by being average. Neither will you.' },
  { rune: 'ᛋ', title: 'THE VALKYRIES CHOOSE YOU', sub: 'You earned your place today.', affirmation: 'Today you were stronger than yesterday. That is all that is required. Keep going.' },
  { rune: 'ᛟ', title: 'EINHERJAR ENERGY', sub: 'The elite are made on days like today.', affirmation: 'There are warriors who wish they had your discipline. You have no idea how rare you are.' },
];

const STYLE_FLASH = [
  'Tonight: wear something that makes you feel as powerful as you trained.',
  'Post-workout glow is your best accessory. Lean into it.',
  'You earned a long shower, a nourishing meal, and your softest clothes.',
  'Reminder: the version of you that just trained deserves to be celebrated.',
  'Recovery fits are self-care fits. Make them intentional.',
  'You just did something most people only think about. Dress accordingly.',
  'Your body did extraordinary things today. Honor it tonight.',
];

export default function ValkyrieMomentModal() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const dayIndex = new Date().getDay();
  const affirmation = DAILY_AFFIRMATIONS[dayIndex % DAILY_AFFIRMATIONS.length];
  const styleFlash = STYLE_FLASH[dayIndex % STYLE_FLASH.length];

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.3],
  });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A0818', '#0A0510', '#050508']}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated glow */}
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

      <Animated.View style={[styles.container, {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }]}>

        {/* Rune */}
        <Animated.View style={[styles.runeWrap, { opacity: glowOpacity }]}>
          <View style={styles.runeRing} />
          <View style={styles.runeRingOuter} />
          <Text style={styles.rune}>{affirmation.rune}</Text>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>{affirmation.title}</Text>
        <Text style={styles.sub}>{affirmation.sub}</Text>

        {/* Divider */}
        <View style={styles.dividerWrap}>
          <LinearGradient
            colors={['transparent', '#D4A8C4', 'transparent']}
            style={styles.divider}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>

        {/* Affirmation */}
        <Text style={styles.affirmation}>{affirmation.affirmation}</Text>

        {/* Style flash */}
        <View style={styles.styleCard}>
          <LinearGradient
            colors={['rgba(212,168,196,0.08)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['transparent', '#D4A8C4', 'transparent']}
            style={styles.styleCardLine}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <Text style={styles.styleCardEyebrow}>VALKYRIE STYLE NOTE</Text>
          <Text style={styles.styleCardText}>{styleFlash}</Text>
          <TouchableOpacity
            style={styles.aestheticBtn}
            onPress={() => {
              router.back();
              setTimeout(() => router.push('/(modals)/valkyrie-aesthetic'), 300);
            }}
          >
            <Text style={styles.aestheticBtnText}>Open Valkyrie Codex →</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom runes */}
        <Text style={styles.bottomRunes}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ</Text>

        {/* Dismiss */}
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['rgba(212,168,196,0.15)', 'rgba(212,168,196,0.05)']}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['transparent', '#D4A8C4', 'transparent']}
            style={styles.dismissBtnLine}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <Text style={styles.dismissBtnText}>CLAIM YOUR VALOR  ᚦ</Text>
        </TouchableOpacity>

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

  glow: {
    position: 'absolute',
    top: -100,
    left: width * 0.05,
    width: width * 0.9,
    height: height * 0.5,
    backgroundColor: '#D4A8C4',
    borderRadius: 999,
    transform: [{ scaleX: 1.2 }, { scaleY: 0.4 }],
    pointerEvents: 'none',
  },

  container: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: 16,
    width: '100%',
  },

  runeWrap: {
    width: 100, height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  runeRing: {
    position: 'absolute',
    width: 90, height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(212,168,196,0.3)',
  },
  runeRingOuter: {
    position: 'absolute',
    width: 108, height: 108,
    borderRadius: 54,
    borderWidth: 1,
    borderColor: 'rgba(212,168,196,0.1)',
  },
  rune: {
    fontSize: 52,
    color: '#D4A8C4',
    fontFamily: 'System',
    textShadowColor: 'rgba(212,168,196,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  title: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Colors.text,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  sub: {
    fontFamily: Fonts.proseItalic,
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: -8,
  },

  dividerWrap: { width: width * 0.6 },
  divider: { height: 1, width: '100%' },

  affirmation: {
    fontFamily: Fonts.prose,
    fontSize: 15,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
  },

  styleCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(212,168,196,0.2)',
    borderRadius: 16,
    padding: Spacing.lg,
    overflow: 'hidden',
    gap: 8,
    marginTop: 4,
  },
  styleCardLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  styleCardEyebrow: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 3,
    color: '#D4A8C4',
    opacity: 0.7,
  },
  styleCardText: {
    fontFamily: Fonts.proseItalic,
    fontSize: 14,
    color: Colors.text,
    fontStyle: 'italic',
    lineHeight: 21,
  },
  aestheticBtn: {
    paddingTop: 4,
  },
  aestheticBtnText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: '#D4A8C4',
    letterSpacing: 1,
    opacity: 0.8,
  },

  bottomRunes: {
    fontFamily: 'System',
    fontSize: 13,
    color: 'rgba(212,168,196,0.12)',
    letterSpacing: 8,
  },

  dismissBtn: {
    width: '100%',
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,168,196,0.25)',
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: 4,
  },
  dismissBtnLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  dismissBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: '#D4A8C4',
    letterSpacing: 2,
  },
});