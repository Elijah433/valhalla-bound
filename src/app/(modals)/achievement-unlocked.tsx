import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { height } = Dimensions.get('window');

// Celebratory full-screen moment for a newly-unlocked achievement — reuses
// the same visual language as the PR flash in strength-log.tsx (rune,
// color glow, scale-in animation) but simpler, since achievements don't
// need a weapon graphic. Triggered via router.push from store.ts whenever
// checkAchievements() or checkFrostShieldAchievement() returns something
// newly earned.
export default function AchievementUnlockedScreen() {
  const params = useLocalSearchParams<{ name: string; description: string; rune: string; color: string }>();
  const color = params.color || Colors.gold;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 250);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  function dismiss() {
    Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      if (router.canGoBack()) router.back();
    });
  }

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <LinearGradient colors={['rgba(5,5,8,0.97)', 'rgba(8,4,12,0.97)']} style={StyleSheet.absoluteFill} />
      <View style={[styles.atmosphere, { backgroundColor: color }]} />

      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={[styles.eyebrow, { color: `${color}90` }]}>ACHIEVEMENT UNLOCKED</Text>

          <View style={[styles.iconWrap, { borderColor: `${color}40` }]}>
            <LinearGradient colors={[`${color}20`, `${color}05`]} style={StyleSheet.absoluteFill} />
            <Text style={[styles.icon, { color }]}>{params.rune || 'ᛟ'}</Text>
          </View>

          <Text style={[styles.name, { color }]}>{params.name}</Text>
          <Text style={styles.description}>{params.description}</Text>

          <Text style={[styles.runes, { color: `${color}35` }]}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ</Text>
        </Animated.View>

        <TouchableOpacity style={styles.dismissBtn} onPress={dismiss} activeOpacity={0.7}>
          <Text style={styles.dismissText}>CONTINUE →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 300 },
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  atmosphere: { position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.5, opacity: 0.06 },
  content: { alignItems: 'center', gap: 10, paddingHorizontal: Spacing.lg },
  eyebrow: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 5 },
  iconWrap: {
    width: 100, height: 100, borderRadius: 26, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginVertical: 12,
  },
  icon: { fontSize: 46, fontFamily: 'System' },
  name: { fontFamily: Fonts.display, fontSize: 30, letterSpacing: 1, textAlign: 'center' },
  description: {
    fontFamily: Fonts.proseItalic, fontSize: 14, color: Colors.textMuted,
    fontStyle: 'italic', textAlign: 'center', lineHeight: 21, paddingHorizontal: Spacing.lg, marginTop: 4,
  },
  runes: { fontFamily: 'System', fontSize: 13, letterSpacing: 8, marginTop: 12 },
  dismissBtn: { position: 'absolute', bottom: 60, alignItems: 'center', paddingVertical: 10 },
  dismissText: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textMuted, letterSpacing: 3 },
});