import { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Defs, RadialGradient, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛋᛗᛚᛜᛞᛟ';

function ValknutEmblem({ size = 100 }: { size?: number }) {
  const s = size;
  const c = Colors.gold;
  return (
    <Svg width={s} height={s} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="vGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={c} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={c} stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="vMetal" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.3} />
          <Stop offset="50%" stopColor={c} stopOpacity={1} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0.3} />
        </SvgLinearGradient>
      </Defs>

      {/* Glow */}
      <Circle cx="50" cy="50" r="48" fill="url(#vGlow)" />

      {/* Outer ring */}
      <Circle cx="50" cy="50" r="46" fill="none" stroke={c} strokeWidth="0.8" opacity={0.3} />
      <Circle cx="50" cy="50" r="40" fill="none" stroke={c} strokeWidth="0.5" opacity={0.15} />

      {/* Valknut — three interlocked triangles */}
      {/* Triangle 1 */}
      <Path
        d="M50 14 L66 42 L34 42 Z"
        fill="none"
        stroke="url(#vMetal)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Triangle 2 — rotated 120deg */}
      <Path
        d="M50 14 L66 42 L34 42 Z"
        fill="none"
        stroke="url(#vMetal)"
        strokeWidth="3"
        strokeLinejoin="round"
        transform="rotate(120, 50, 50)"
      />
      {/* Triangle 3 — rotated 240deg */}
      <Path
        d="M50 14 L66 42 L34 42 Z"
        fill="none"
        stroke="url(#vMetal)"
        strokeWidth="3"
        strokeLinejoin="round"
        transform="rotate(240, 50, 50)"
      />

      {/* Center dot */}
      <Circle cx="50" cy="50" r="4" fill={c} opacity={0.9} />
      <Circle cx="50" cy="50" r="2" fill="#FFF" opacity={0.4} />
    </Svg>
  );
}

export default function WelcomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const runeAnims = useRef(
    Array.from({ length: 12 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();

    runeAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 800,
        delay: 600 + i * 100,
        useNativeDriver: true,
      }).start();
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6],
  });

  function handleBegin() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/onboarding/name');
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#0A0305', '#050508', '#020208']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.bloodGlow, { opacity: glowOpacity }]} />

      <View style={styles.runeField} pointerEvents="none">
        {Array.from({ length: 12 }).map((_, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.floatingRune,
              {
                opacity: runeAnims[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.06 + (i % 3) * 0.02],
                }),
                top: `${8 + (i * 7.5) % 85}%`,
                left: `${5 + (i * 17) % 88}%`,
                fontSize: 24 + (i % 3) * 12,
                transform: [{ rotate: `${(i * 37) % 360}deg` }],
              },
            ]}
          >
            {RUNES[i % RUNES.length]}
          </Animated.Text>
        ))}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.topRunes}>ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ</Text>

        {/* Valknut SVG emblem */}
        <View style={styles.emblemWrap}>
          <Animated.View style={[styles.emblemGlow, { opacity: glowOpacity }]} />
          <ValknutEmblem size={110} />
        </View>

        <Text style={styles.titleSmall}>THE CALL TO</Text>
        <Text style={styles.titleLarge}>VALHALLA</Text>
        <View style={styles.titleDivider}>
          <LinearGradient
            colors={['transparent', Colors.gold, 'transparent']}
            style={styles.titleDividerLine}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
        <Text style={styles.titleSub}>BOUND</Text>

        <Text style={styles.tagline}>
          The Valkyries are watching.{'\n'}Only the worthy are chosen.
        </Text>
        <Text style={styles.desc}>
          Train not to look good.{'\n'}Train to be remembered.
        </Text>
      </Animated.View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.beginBtn}
          onPress={handleBegin}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#3A1010', '#200808']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <LinearGradient
            colors={['transparent', Colors.gold, 'transparent']}
            style={styles.beginBtnTopLine}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <View style={styles.beginBtnContent}>
            <Text style={styles.beginBtnEyebrow}>ANSWER THE CALL</Text>
            <Text style={styles.beginBtnTitle}>BEGIN YOUR SAGA</Text>
          </View>
          <Text style={styles.beginBtnArrow}>ᚦ</Text>
        </TouchableOpacity>

        <Text style={styles.bottomNote}>
          No accounts. No cloud. Your saga stays on your device.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },

  bloodGlow: {
    position: 'absolute',
    top: -100, left: -50,
    width: width * 1.2,
    height: height * 0.5,
    backgroundColor: 'rgba(139,26,26,0.4)',
    borderRadius: 999,
    transform: [{ scaleX: 1.2 }, { scaleY: 0.6 }],
  },

  runeField: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  floatingRune: {
    position: 'absolute',
    color: Colors.gold,
    fontFamily: 'System',
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    zIndex: 1,
  },

  topRunes: {
    fontFamily: 'System',
    fontSize: 14,
    color: 'rgba(201,168,76,0.2)',
    letterSpacing: 8,
    marginBottom: Spacing.xl,
  },

  emblemWrap: {
    width: 130, height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emblemGlow: {
    position: 'absolute',
    width: 160, height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(139,26,26,0.35)',
  },

  titleSmall: {
    fontFamily: Fonts.body,
    fontSize: 11,
    letterSpacing: 6,
    color: 'rgba(201,168,76,0.5)',
    marginBottom: 4,
  },
  titleLarge: {
    fontFamily: Fonts.display,
    fontSize: 52,
    color: Colors.gold,
    letterSpacing: 4,
    textShadowColor: 'rgba(201,168,76,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
    lineHeight: 56,
  },
  titleDivider: { width: 200, marginVertical: 6 },
  titleDividerLine: { height: 1, width: '100%' },
  titleSub: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: 'rgba(201,168,76,0.6)',
    letterSpacing: 8,
    marginBottom: Spacing.lg,
  },

  tagline: {
    fontFamily: Fonts.proseItalic,
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 26,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  desc: {
    fontFamily: Fonts.prose,
    fontSize: 14,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 22,
  },

  bottom: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 48,
    gap: 14,
    zIndex: 1,
  },
  beginBtn: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    shadowColor: Colors.blood,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  beginBtnTopLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  beginBtnContent: { gap: 4 },
  beginBtnEyebrow: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: 'rgba(201,168,76,0.5)',
  },
  beginBtnTitle: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    color: Colors.gold,
    letterSpacing: 2,
    textShadowColor: 'rgba(201,168,76,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  beginBtnArrow: {
    fontSize: 32,
    color: Colors.gold,
    fontFamily: 'System',
    opacity: 0.6,
  },

  bottomNote: {
    fontFamily: Fonts.prose,
    fontSize: 11,
    color: Colors.textDim,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});