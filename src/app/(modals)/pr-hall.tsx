import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Share,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getAllPersonalRecords, type PersonalRecord } from '@/lib/db';
import { useWarriorStore } from '@/lib/store';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width } = Dimensions.get('window');

const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᛁ', 'ᛟ'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PRHallScreen() {
  const { warrior } = useWarriorStore();
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef<Animated.Value[]>([]).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const prs = getAllPersonalRecords();
    setRecords(prs);

    prs.forEach((_, i) => {
      if (!cardAnims[i]) cardAnims[i] = new Animated.Value(0);
    });

    Animated.sequence([
      Animated.timing(fadeAnim,   { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    prs.forEach((_, i) => {
      Animated.timing(cardAnims[i] ?? new Animated.Value(0), {
        toValue: 1, duration: 500, delay: 200 + i * 100, useNativeDriver: true,
      }).start();
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  async function handleShare(pr: PersonalRecord) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await Share.share({
        message: [
          `⚔️ FEAT OF STRENGTH ⚔️`,
          ``,
          `${pr.exercise_name.toUpperCase()}`,
          `${pr.best_weight} lbs × ${pr.best_reps} reps`,
          ``,
          `🪓 ${warrior?.name ?? 'Warrior'} — Valhalla Bound`,
          `Train Until Ragnarök`,
          ``,
          `#ValhallaFit #NewPR #FeatsOfStrength #VikingFitness`,
        ].join('\n'),
      });
    } catch {}
  }

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.22] });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0C0810', '#050508', '#08050C']}
        style={StyleSheet.absoluteFill}
      />

      {/* Atmospheric side glows — not blobs */}
      <Animated.View style={[styles.leftGlow, { opacity: glowOpacity }]} />
      <Animated.View style={[styles.rightGlow, { opacity: glowOpacity }]} />

      {/* Large background rune — subtle */}
      <Text style={styles.bgRune}>ᛟ</Text>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← BACK</Text>
            </TouchableOpacity>
          </View>

          {/* Title block */}
          <Animated.View style={[styles.titleBlock, { opacity: headerAnim }]}>
            <Text style={styles.titleEyebrow}>THE WARRIOR'S TROPHY</Text>

            {/* Decorative rune border */}
            <View style={styles.runeBorder}>
              <View style={[styles.runeBorderLine, { backgroundColor: 'rgba(201,168,76,0.25)' }]} />
              <Text style={styles.runeBorderText}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ  ᚲ  ᚷ  ᚹ</Text>
              <View style={[styles.runeBorderLine, { backgroundColor: 'rgba(201,168,76,0.25)' }]} />
            </View>

            <Text style={styles.titleMain}>HALL OF{'\n'}FEATS</Text>

            <View style={styles.runeBorder}>
              <View style={[styles.runeBorderLine, { backgroundColor: 'rgba(201,168,76,0.15)' }]} />
              <Text style={[styles.runeboarderSmall]}>ᚦ  ᚨ  ᚱ</Text>
              <View style={[styles.runeBorderLine, { backgroundColor: 'rgba(201,168,76,0.15)' }]} />
            </View>

            <Text style={styles.titleSub}>
              Every record carved here was won through iron and will.
            </Text>
          </Animated.View>

          {records.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyRune}>ᚦ</Text>
              <Text style={styles.emptyTitle}>No Feats Yet</Text>
              <Text style={styles.emptySub}>
                Begin forging iron.{'\n'}Your first PR will be carved here.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => { router.back(); router.push('/(modals)/exercise-picker' as any); }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[Colors.goldDark, Colors.gold]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <Text style={styles.emptyBtnText}>BEGIN FORGING →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Warrior banner */}
              <View style={styles.warriorBanner}>
                <LinearGradient colors={['rgba(201,168,76,0.1)', 'rgba(201,168,76,0.04)', 'transparent']} style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={['transparent', Colors.gold, 'transparent']}
                  style={styles.bannerTopLine}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <View style={styles.bannerStat}>
                  <Text style={styles.bannerStatVal}>{records.length}</Text>
                  <Text style={styles.bannerStatLabel}>FEATS{'\n'}EARNED</Text>
                </View>
                <View style={styles.bannerDivider} />
                <View style={styles.bannerCenter}>
                  <Text style={styles.bannerName}>{warrior?.name ?? 'WARRIOR'}</Text>
                  <Text style={styles.bannerTitle}>EINHERJAR</Text>
                </View>
                <View style={styles.bannerDivider} />
                <View style={styles.bannerStat}>
                  <Text style={styles.bannerStatVal}>
                    {Math.max(...records.map(r => r.best_weight))}
                  </Text>
                  <Text style={styles.bannerStatLabel}>HEAVIEST{'\n'}LBS</Text>
                </View>
              </View>

              {/* PR cards */}
              {records.map((pr, i) => (
                <Animated.View
                  key={pr.exercise_id}
                  style={[styles.prCard, {
                    opacity: cardAnims[i] ?? 1,
                    transform: [{
                      translateY: (cardAnims[i] ?? new Animated.Value(1)).interpolate({
                        inputRange: [0, 1], outputRange: [24, 0],
                      }),
                    }],
                  }]}
                >
                  <LinearGradient
                    colors={['rgba(201,168,76,0.07)', 'rgba(201,168,76,0.02)', 'transparent']}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={['transparent', Colors.gold, 'transparent']}
                    style={styles.prTopLine}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  />

                  {/* Background rune */}
                  <Text style={styles.prBgRune}>{RUNES[i % RUNES.length]}</Text>

                  {/* Top row */}
                  <View style={styles.prTop}>
                    <Text style={styles.prEyebrow}>FEAT OF STRENGTH · {formatDate(pr.achieved_at)}</Text>
                  </View>

                  {/* Main content */}
                  <View style={styles.prMain}>
                    <Text style={styles.prName}>{pr.exercise_name}</Text>
                    <View style={styles.prWeightRow}>
                      <Text style={styles.prWeight}>{pr.best_weight}</Text>
                      <View style={styles.prWeightMeta}>
                        <Text style={styles.prWeightUnit}>LBS</Text>
                        <Text style={styles.prReps}>{pr.best_reps} REPS</Text>
                      </View>
                    </View>
                  </View>

                  {/* Runic divider */}
                  <View style={styles.prDivider}>
                    <View style={[styles.prDividerLine, { backgroundColor: 'rgba(201,168,76,0.15)' }]} />
                    <Text style={styles.prDividerRune}>ᚠ</Text>
                    <View style={[styles.prDividerLine, { backgroundColor: 'rgba(201,168,76,0.15)' }]} />
                  </View>

                  {/* Share — prominent, social-ready */}
                  <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={() => handleShare(pr)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['rgba(201,168,76,0.12)', 'rgba(201,168,76,0.06)']}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                    />
                    <Text style={styles.shareIcon}>↑</Text>
                    <Text style={styles.shareBtnText}>SHARE TO INSTAGRAM · TWITTER · X</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}

              <View style={styles.bottomRunes}>
                <Text style={styles.bottomRuneText}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ  ᚲ  ᚷ  ᚹ</Text>
              </View>
            </ScrollView>
          )}

        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  container: { flex: 1 },

  bgRune: {
    position: 'absolute',
    fontSize: 420, fontFamily: 'System',
    color: 'rgba(201,168,76,0.03)',
    top: 30, left: -50,
    lineHeight: 420, pointerEvents: 'none',
  },

  // Side atmospheric glows — not blobs
  leftGlow: {
    position: 'absolute',
    left: -60, top: 100,
    width: 160, height: 400,
    backgroundColor: 'rgba(139,26,26,0.4)',
    borderRadius: 999,
    transform: [{ scaleX: 0.3 }, { scaleY: 1.5 }],
    pointerEvents: 'none',
  },
  rightGlow: {
    position: 'absolute',
    right: -60, top: 300,
    width: 160, height: 400,
    backgroundColor: 'rgba(201,168,76,0.25)',
    borderRadius: 999,
    transform: [{ scaleX: 0.3 }, { scaleY: 1.5 }],
    pointerEvents: 'none',
  },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  backBtnText: { fontFamily: Fonts.body, fontSize: 11, letterSpacing: 2, color: Colors.textMuted },

  // Title block
  titleBlock: { alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: 10 },
  titleEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 5, color: 'rgba(201,168,76,0.45)' },

  runeBorder: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '85%' },
  runeBorderLine: { flex: 1, height: 1 },
  runeboarderSmall: { fontFamily: 'System', fontSize: 12, color: 'rgba(201,168,76,0.35)', letterSpacing: 6 },
  runeorderText: { fontFamily: 'System', fontSize: 10 },
  runeorderLineSmall: { flex: 1, height: 1 },
  runeorderSmall: { fontFamily: 'System', fontSize: 11, letterSpacing: 5 },
  runeorderSmallText: { fontFamily: 'System', fontSize: 10, letterSpacing: 5 },
  runeorderTextSmall: { fontFamily: 'System', fontSize: 10, letterSpacing: 4 },
  runeorderBorderText: { fontFamily: 'System', fontSize: 11, letterSpacing: 5 },
  runeorderBorder: { fontFamily: 'System', fontSize: 11 },
  runeorderBorderLine: { flex: 1, height: 1 },
  runeorderBorderSmall: { fontFamily: 'System', fontSize: 10 },
  runeorderBorderLarger: { fontFamily: 'System', fontSize: 12 },
  runeBorderText: { fontFamily: 'System', fontSize: 11, color: 'rgba(201,168,76,0.4)', letterSpacing: 6 },

  titleMain: {
    fontFamily: Fonts.display, fontSize: 44, color: Colors.gold,
    letterSpacing: 4, textAlign: 'center', lineHeight: 50,
    textShadowColor: 'rgba(201,168,76,0.4)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24,
  },
  titleSub: {
    fontFamily: Fonts.proseItalic, fontSize: 13,
    color: Colors.textMuted, textAlign: 'center',
    lineHeight: 20, fontStyle: 'italic',
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 50 },

  // Warrior banner
  warriorBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.22)',
    borderRadius: 16, overflow: 'hidden',
    backgroundColor: 'rgba(10,8,14,0.95)',
    marginBottom: Spacing.lg, padding: Spacing.md,
  },
  bannerTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  bannerStat: { flex: 1, alignItems: 'center', gap: 2 },
  bannerStatVal: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.gold },
  bannerStatLabel: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 1.5, color: Colors.textMuted, textAlign: 'center', lineHeight: 11 },
  bannerDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.08)' },
  bannerCenter: { flex: 2, alignItems: 'center', gap: 2 },
  bannerName: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.gold, letterSpacing: 2 },
  bannerTitle: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 3, color: 'rgba(201,168,76,0.5)' },

  // PR cards — carved stone feel
  prCard: {
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.22)',
    borderRadius: 20, padding: Spacing.lg,
    overflow: 'hidden', backgroundColor: 'rgba(8,6,12,0.98)',
    marginBottom: 12, gap: 14,
  },
  prTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  prBgRune: {
    position: 'absolute', right: 14, bottom: 14,
    fontSize: 80, fontFamily: 'System',
    color: 'rgba(201,168,76,0.05)',
    lineHeight: 84,
  },
  prTop: {},
  prEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 3, color: 'rgba(201,168,76,0.4)' },

  prMain: { gap: 6 },
  prName: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.text, letterSpacing: 1 },
  prWeightRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  prWeight: {
    fontFamily: Fonts.display, fontSize: 60, color: Colors.gold,
    lineHeight: 64,
    textShadowColor: 'rgba(201,168,76,0.3)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
  },
  prWeightMeta: { paddingBottom: 8, gap: 2 },
  prWeightUnit: { fontFamily: Fonts.body, fontSize: 11, color: 'rgba(201,168,76,0.6)', letterSpacing: 2 },
  prReps: { fontFamily: Fonts.prose, fontSize: 14, color: Colors.textMuted },

  prDivider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prDividerLine: { flex: 1, height: 1 },
  prDividerRune: { fontFamily: 'System', fontSize: 14, color: 'rgba(201,168,76,0.3)' },

  // Share button — prominent
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    borderRadius: 12, paddingVertical: 13,
    overflow: 'hidden',
  },
  shareIcon: { fontSize: 16, color: Colors.gold, fontFamily: 'System' },
  shareBtnText: { fontFamily: Fonts.body, fontSize: 10, color: Colors.gold, letterSpacing: 2 },

  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl, gap: 14,
  },
  emptyRune: { fontSize: 72, color: 'rgba(201,168,76,0.12)', fontFamily: 'System' },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.textMuted, letterSpacing: 1 },
  emptySub: {
    fontFamily: Fonts.proseItalic, fontSize: 14,
    color: Colors.textDim, textAlign: 'center',
    lineHeight: 22, fontStyle: 'italic',
  },
  emptyBtn: {
    borderRadius: Radii.md, overflow: 'hidden',
    paddingHorizontal: 32, paddingVertical: 16, marginTop: 8,
  },
  emptyBtnText: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.void, letterSpacing: 2 },

  bottomRunes: { alignItems: 'center', paddingVertical: Spacing.xl },
  bottomRuneText: { fontFamily: 'System', fontSize: 12, color: 'rgba(201,168,76,0.18)', letterSpacing: 8 },
});