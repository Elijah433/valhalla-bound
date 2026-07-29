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

export default function StreakBrokenModal() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();

    // Shake the rune
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]).start();
    }, 400);

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.4] });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A0505', '#0A0305', '#050508']}
        style={StyleSheet.absoluteFill}
      />

      {/* Blood glow */}
      <Animated.View style={[styles.bloodGlow, { opacity: glowOpacity }]} />

      <Animated.View style={[styles.container, {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }]}>

        {/* Broken rune */}
        <Animated.View style={[styles.runeWrap, {
          transform: [{ translateX: shakeAnim }],
        }]}>
          <View style={styles.runeRing} />
          <Text style={styles.rune}>ᚾ</Text>
          {/* Crack lines */}
          <View style={styles.crack1} />
          <View style={styles.crack2} />
        </Animated.View>

        <Text style={styles.eyebrow}>YOUR SAGA WAS INTERRUPTED</Text>
        <Text style={styles.title}>STREAK{'\n'}BROKEN</Text>

        <View style={styles.dividerWrap}>
          <LinearGradient
            colors={['transparent', Colors.blood, 'transparent']}
            style={styles.divider}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>

        <Text style={styles.body}>
          The gods do not wait for those who rest too long.
          Your streak has been reset — but your saga is not over.
        </Text>

        <Text style={styles.quote}>
          "Even Odin fell. He rose again."
        </Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>0</Text>
            <Text style={styles.statLabel}>NEW STREAK</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: Colors.blood }]}>ᚾ</Text>
            <Text style={styles.statLabel}>NAUTHIZ — NEED</Text>
          </View>
        </View>

        {/* Rise button */}
        <TouchableOpacity
          style={styles.riseBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.replace('/(tabs)');
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['rgba(139,26,26,0.3)', 'rgba(139,26,26,0.1)']}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['transparent', Colors.blood, 'transparent']}
            style={styles.riseBtnLine}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <Text style={styles.riseBtnText}>RISE AGAIN  ᚦ</Text>
        </TouchableOpacity>

        <Text style={styles.bottomNote}>
          Train today to begin your new saga.
        </Text>

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

  bloodGlow: {
    position: 'absolute',
    top: -100,
    left: width * 0.05,
    width: width * 0.9,
    height: height * 0.5,
    backgroundColor: '#8B1A1A',
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
    position: 'relative',
  },
  runeRing: {
    position: 'absolute',
    width: 90, height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(139,26,26,0.4)',
  },
  rune: {
    fontSize: 52,
    color: Colors.blood,
    fontFamily: 'System',
    textShadowColor: 'rgba(139,26,26,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  crack1: {
    position: 'absolute',
    top: 20, left: 52,
    width: 1.5, height: 30,
    backgroundColor: Colors.blood,
    opacity: 0.6,
    transform: [{ rotate: '15deg' }],
  },
  crack2: {
    position: 'absolute',
    top: 30, left: 46,
    width: 1.5, height: 20,
    backgroundColor: Colors.blood,
    opacity: 0.4,
    transform: [{ rotate: '-20deg' }],
  },

  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 3,
    color: Colors.blood,
    opacity: 0.8,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 40,
    color: Colors.text,
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 44,
    marginTop: -4,
  },

  dividerWrap: { width: width * 0.5 },
  divider: { height: 1, width: '100%' },

  body: {
    fontFamily: Fonts.prose,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  quote: {
    fontFamily: Fonts.proseItalic,
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.7,
  },

  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(139,26,26,0.2)',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(14,5,5,0.8)',
    width: '100%',
    marginTop: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(139,26,26,0.2)',
    alignSelf: 'stretch',
  },
  statVal: {
    fontFamily: Fonts.heading,
    fontSize: 26,
    color: Colors.text,
    lineHeight: 28,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: 7,
    letterSpacing: 1.5,
    color: Colors.textMuted,
  },

  riseBtn: {
    width: '100%',
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,26,26,0.4)',
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: 4,
  },
  riseBtnLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  riseBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.blood,
    letterSpacing: 3,
  },

  bottomNote: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textDim,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});