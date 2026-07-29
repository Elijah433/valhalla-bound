import { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ACHIEVEMENTS } from '@/constants/achievements';
import { getUnlockedAchievementIds } from '@/lib/db';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

export default function AchievementsHallScreen() {
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    setUnlockedIds(getUnlockedAchievementIds());
  }, []));

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile' as any);
  }

  const unlockedCount = unlockedIds.length;
  const totalCount = ACHIEVEMENTS.length;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0A0812', '#050508']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ACHIEVEMENTS</Text>
          <Text style={styles.headerCount}>{unlockedCount} / {totalCount} EARNED</Text>
        </View>

        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {ACHIEVEMENTS.map((a) => {
            const unlocked = unlockedIds.includes(a.id);
            return (
              <View
                key={a.id}
                style={[
                  styles.card,
                  { borderColor: unlocked ? `${a.color}40` : 'rgba(255,255,255,0.06)' },
                ]}
              >
                {unlocked && <LinearGradient colors={[`${a.color}10`, 'transparent']} style={StyleSheet.absoluteFill} />}
                <View style={[
                  styles.iconWrap,
                  { borderColor: unlocked ? `${a.color}40` : 'rgba(255,255,255,0.08)' },
                  { backgroundColor: unlocked ? `${a.color}12` : 'rgba(255,255,255,0.02)' },
                ]}>
                  <Text style={[styles.icon, { color: unlocked ? a.color : 'rgba(255,255,255,0.2)' }]}>
                    {unlocked ? a.rune : 'ᚲ'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, !unlocked && styles.nameLocked]}>{a.name}</Text>
                  <Text style={styles.description}>{a.description}</Text>
                </View>
                {unlocked && <Text style={[styles.checkmark, { color: a.color }]}>✓</Text>}
              </View>
            );
          })}

          <View style={styles.bottomRunes}>
            <Text style={styles.bottomRuneText}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ  ᚲ  ᚷ  ᚹ</Text>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 60 },

  header: {
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
    alignItems: 'center',
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  backBtnText: { fontFamily: Fonts.body, fontSize: 11, letterSpacing: 2, color: Colors.textMuted },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.text, letterSpacing: 2, marginTop: 4 },
  headerCount: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 1, color: Colors.gold, marginTop: 4 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: Spacing.lg, marginBottom: 10,
    borderWidth: 1, borderRadius: 14, padding: Spacing.md, overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 20, fontFamily: 'System' },
  name: { fontFamily: Fonts.subheading, fontSize: 14, color: Colors.text, marginBottom: 3 },
  nameLocked: { color: Colors.textMuted },
  description: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
  checkmark: { fontSize: 18, fontFamily: Fonts.heading },

  bottomRunes: { alignItems: 'center', paddingVertical: Spacing.lg },
  bottomRuneText: { fontFamily: 'System', fontSize: 13, color: 'rgba(201,168,76,0.1)', letterSpacing: 10 },
});