import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeaponSVG } from '../../components/WeaponSVG';
import { useWarriorStore } from '@/lib/store';
import { WORKOUT_META, type WorkoutType } from '@/constants/ranks';
import { Colors, Fonts, Spacing } from '@/constants/theme';

const { width } = Dimensions.get('window');

function RunicDivider({ color }: { color: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: `${color}30` }]} />
      <Text style={[styles.dividerRune, { color: `${color}80` }]}>ᚦ</Text>
      <Text style={[styles.dividerRune, { color: `${color}50` }]}>ᚨ</Text>
      <Text style={[styles.dividerRune, { color: `${color}80` }]}>ᚱ</Text>
      <View style={[styles.dividerLine, { backgroundColor: `${color}30` }]} />
    </View>
  );
}

function FloatingRune({ rune, color, delay, startX }: { rune: string; color: string; delay: number; startX: number }) {
  const posY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    function animate() {
      posY.setValue(0);
      opacity.setValue(0);
      Animated.sequence([
        Animated.delay(delay + Math.random() * 3000),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
          Animated.timing(posY, { toValue: -(50 + Math.random() * 60), duration: 3000 + Math.random() * 1000, useNativeDriver: true }),
        ]),
        Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]).start(() => animate());
    }
    animate();
  }, []);

  return (
    <Animated.Text style={{
      position: 'absolute',
      bottom: 0,
      left: startX,
      fontSize: 14,
      fontFamily: 'System',
      color,
      opacity,
      transform: [{ translateY: posY }],
    }}>
      {rune}
    </Animated.Text>
  );
}

function RuneField({ color }: { color: string }) {
  const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᛁ', 'ᛟ'];
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    rune: runes[i % runes.length],
    delay: i * 400,
    startX: 20 + (i * 35),
  }));
  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, pointerEvents: 'none' }}>
      {particles.map(p => (
        <FloatingRune key={p.id} rune={p.rune} color={`${color}40`} delay={p.delay} startX={p.startX} />
      ))}
    </View>
  );
}

const VERSES: Record<WorkoutType, { text: string; source: string }> = {
  strength: { text: 'A man who is never tested cannot know what manner of man he is.', source: 'HÁVAMÁL · VERSE 11' },
  endurance: { text: 'The miles make the warrior. No saga was written by those who stayed.', source: 'HÁVAMÁL · VERSE 71' },
  combat: { text: 'Better to fight and fall than to live without hope.', source: 'VOLSUNGA SAGA' },
  recovery: { text: 'The wise warrior knows when to rest. Even Odin slept.', source: 'HÁVAMÁL · VERSE 22' },
};

const BATTLE_CRIES: Record<WorkoutType, string> = {
  strength: 'IRON FORGED',
  endurance: 'THE LONG RAID',
  combat: 'BATTLE WON',
  recovery: 'SACRED REST',
};

const WORKOUT_RUNE: Record<WorkoutType, string> = {
  strength: 'ᚦ',
  endurance: 'ᚢ',
  combat: 'ᚱ',
  recovery: 'ᛁ',
};

export default function VictoryModal() {
  const params = useLocalSearchParams<{
    workoutType: string;
    xpGained: string;
    newRune?: string;
    rankedUp?: string;
    newRankTitle?: string;
    streakDays: string;
  }>();

  const workoutType = (params.workoutType ?? 'strength') as WorkoutType;
  const xpGained = parseInt(params.xpGained ?? '0');
  const newRune = params.newRune && params.newRune.length > 0 ? params.newRune : null;
  const rankedUp = params.rankedUp === 'true';
  const newRankTitle = params.newRankTitle;
  const streakDays = parseInt(params.streakDays ?? '0');

  const { warrior } = useWarriorStore();
  const meta = WORKOUT_META[workoutType];
  const verse = VERSES[workoutType];
  const battleCry = BATTLE_CRIES[workoutType];
  const workoutRune = WORKOUT_RUNE[workoutType];
  const color = meta.color;

  const [weaponKey, setWeaponKey] = useState<string>('broadsword');

  useEffect(() => {
    AsyncStorage.getItem('valhalla_weapon').then(w => { if (w) setWeaponKey(w); });
  }, []);

  // Animations — all start at 0, stagger in smoothly
  const masterFade = useRef(new Animated.Value(0)).current;
  const weaponScale = useRef(new Animated.Value(0.6)).current;
  const weaponOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const xpTranslate = useRef(new Animated.Value(20)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const statsTranslate = useRef(new Animated.Value(16)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const cardsTranslate = useRef(new Animated.Value(16)).current;
  const verseOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smooth staggered entrance
    Animated.sequence([
      // Screen fades in
      Animated.timing(masterFade, { toValue: 1, duration: 350, useNativeDriver: true }),
      // Weapon rises in with glow
      Animated.parallel([
        Animated.spring(weaponScale, { toValue: 1, tension: 35, friction: 9, useNativeDriver: true }),
        Animated.timing(weaponOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
      Animated.delay(80),
      // XP slides up
      Animated.parallel([
        Animated.timing(xpOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(xpTranslate, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
      ]),
      Animated.delay(80),
      // Stats
      Animated.parallel([
        Animated.timing(statsOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(statsTranslate, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
      ]),
      Animated.delay(60),
      // Cards (rune unlock, rank up)
      Animated.parallel([
        Animated.timing(cardsOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(cardsTranslate, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
      ]),
      Animated.delay(60),
      // Verse
      Animated.timing(verseOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(60),
      // Button
      Animated.timing(btnOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Gentle XP pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    ).start();

    // Slow rune ring rotation
    Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 22000, useNativeDriver: true })
    ).start();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (rankedUp) {
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 900);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 1150);
    }
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.28] });
  const bottomGlowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.07] });
  const ringDeg = ringRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#080510', '#04030A', '#080510']} style={StyleSheet.absoluteFill} />

      <Text style={[styles.watermarkRune, { color: `${color}05` }]}>{workoutRune}</Text>
      <Animated.View style={[styles.topGlow, { backgroundColor: color, opacity: glowOpacity }]} />
      <Animated.View style={[styles.bottomGlow, { backgroundColor: color, opacity: bottomGlowOpacity }]} />
      <RuneField color={color} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={[{ flex: 1 }, { opacity: masterFade }]}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>

            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.eyebrow, { color: `${color}70` }]}>SAGA ENTRY</Text>
              <Text style={[styles.battleCry, { color }]}>{battleCry}</Text>
              <RunicDivider color={color} />
            </View>

            {/* Weapon hero */}
            <View style={styles.weaponSection}>
              <Animated.View style={[styles.runeRingOuter, {
                borderColor: `${color}15`,
                transform: [{ rotate: ringDeg }],
              }]}>
                {['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ'].map((r, i) => {
                  const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                  const radius = 118;
                  return (
                    <Text key={i} style={[styles.ringRune, {
                      color: `${color}40`,
                      position: 'absolute',
                      left: 118 + Math.cos(angle) * radius - 8,
                      top: 118 + Math.sin(angle) * radius - 8,
                    }]}>{r}</Text>
                  );
                })}
              </Animated.View>

              <Animated.View style={[styles.runeRingInner, { borderColor: `${color}20`, opacity: glowAnim }]} />

              <Animated.View style={[styles.weaponWrap, {
                opacity: weaponOpacity,
                transform: [{ scale: weaponScale }],
              }]}>
                <LinearGradient colors={[`${color}22`, `${color}06`]} style={StyleSheet.absoluteFill} />
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <WeaponSVG weapon={weaponKey} color={color} size={100} glowOpacity={0.7} />
                </Animated.View>
              </Animated.View>
            </View>

            {/* XP */}
            <Animated.View style={[styles.xpBlock, {
              opacity: xpOpacity,
              transform: [{ translateY: xpTranslate }],
            }]}>
              <Animated.Text style={[styles.xpNumber, { color, transform: [{ scale: pulseAnim }] }]}>
                +{xpGained}
              </Animated.Text>
              <Text style={[styles.xpLabel, { color: `${color}70` }]}>VALOR EARNED</Text>
            </Animated.View>

            {/* Rune row */}
            <View style={styles.runeRow}>
              {['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ'].map((r, i) => (
                <Text key={i} style={[styles.runeRowChar, {
                  color: `${color}${i % 2 === 0 ? '55' : '28'}`,
                  fontSize: i === 3 || i === 4 ? 16 : 12,
                }]}>{r}</Text>
              ))}
            </View>

            {/* Stats */}
            <Animated.View style={[styles.statsCard, {
              opacity: statsOpacity,
              borderColor: `${color}18`,
              transform: [{ translateY: statsTranslate }],
            }]}>
              <LinearGradient colors={[`${color}08`, 'transparent']} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', `${color}30`, 'transparent']} style={styles.statsTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              <View style={styles.statItem}>
                <Text style={[styles.statRuneChar, { color: `${color}80` }]}>ᚠ</Text>
                <Text style={[styles.statValue, { color }]}>{streakDays}</Text>
                <Text style={styles.statLabel}>DAY STREAK</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: `${color}18` }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statRuneChar, { color: `${color}80` }]}>ᚢ</Text>
                <Text style={[styles.statValue, { color }]}>+{xpGained}</Text>
                <Text style={styles.statLabel}>XP GAINED</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: `${color}18` }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statRuneChar, { color: `${color}80` }]}>ᚦ</Text>
                <Text style={[styles.statValue, { color }]}>{warrior?.total_xp ?? 0}</Text>
                <Text style={styles.statLabel}>TOTAL XP</Text>
              </View>
            </Animated.View>

            {/* Rune unlock + rank up cards */}
            <Animated.View style={{
              opacity: cardsOpacity,
              transform: [{ translateY: cardsTranslate }],
            }}>
              {newRune && (
                <View style={[styles.specialCard, { borderColor: `${color}35` }]}>
                  <LinearGradient colors={[`${color}10`, `${color}03`]} style={StyleSheet.absoluteFill} />
                  <LinearGradient colors={['transparent', color, 'transparent']} style={styles.cardLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                  <View style={styles.specialCardLeft}>
                    <Text style={[styles.specialCardBigRune, { color }]}>{newRune}</Text>
                  </View>
                  <View style={styles.specialCardRight}>
                    <Text style={[styles.specialCardTitle, { color }]}>RUNE ENGRAVED</Text>
                    <Text style={styles.specialCardSub}>Your weapon drinks from this victory. The forge grows hotter.</Text>
                  </View>
                </View>
              )}

              {rankedUp && newRankTitle && (
                <View style={[styles.specialCard, { borderColor: 'rgba(201,168,76,0.35)' }]}>
                  <LinearGradient colors={['rgba(201,168,76,0.12)', 'transparent']} style={StyleSheet.absoluteFill} />
                  <LinearGradient colors={['transparent', Colors.gold, 'transparent']} style={styles.cardLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                  <View style={styles.specialCardLeft}>
                    <Text style={[styles.specialCardBigRune, { color: Colors.gold }]}>ᛟ</Text>
                  </View>
                  <View style={styles.specialCardRight}>
                    <Text style={[styles.specialCardTitle, { color: Colors.gold }]}>TITLE BESTOWED</Text>
                    <Text style={[styles.specialCardName, { color: Colors.gold }]}>{newRankTitle}</Text>
                    <Text style={styles.specialCardSub}>The Valkyries take notice of your deeds.</Text>
                  </View>
                </View>
              )}
            </Animated.View>

            {/* Verse */}
            <Animated.View style={[styles.verseWrap, { opacity: verseOpacity }]}>
              <RunicDivider color={color} />
              <Text style={[styles.verseSource, { color: `${color}55` }]}>{verse.source}</Text>
              <Text style={styles.verseText}>"{verse.text}"</Text>
              <RunicDivider color={color} />
            </Animated.View>

            {/* Button */}
            <Animated.View style={[styles.btnWrap, { opacity: btnOpacity }]}>
              <TouchableOpacity
                style={styles.returnBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.dismissAll();
                }}
                activeOpacity={0.88}
              >
                <LinearGradient colors={[`${color}99`, color, `${color}99`]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                <LinearGradient colors={['rgba(255,255,255,0.2)', 'transparent']} style={styles.btnShine} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
                <Text style={styles.btnEyebrow}>YOUR SAGA CONTINUES</Text>
                <Text style={styles.btnText}>RETURN FROM BATTLE</Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.footer}>
              <Text style={[styles.footerRunes, { color: `${color}15` }]}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ  ᚲ  ᚷ  ᚹ</Text>
            </View>

          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#04030A' },
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },

  watermarkRune: {
    position: 'absolute',
    fontSize: 420,
    fontFamily: 'System',
    top: 40,
    left: -60,
    pointerEvents: 'none',
    lineHeight: 420,
  },
  topGlow: {
    position: 'absolute',
    top: -100, left: width * 0.05,
    width: width * 0.9, height: 320,
    borderRadius: 999,
    transform: [{ scaleX: 1.2 }, { scaleY: 0.38 }],
    pointerEvents: 'none',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -80, left: width * 0.1,
    width: width * 0.8, height: 200,
    borderRadius: 999,
    transform: [{ scaleX: 1.2 }, { scaleY: 0.3 }],
    pointerEvents: 'none',
  },

  header: { alignItems: 'center', paddingTop: Spacing.lg, paddingHorizontal: Spacing.lg, gap: 8, marginBottom: 8 },
  eyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 5 },
  battleCry: { fontFamily: Fonts.display, fontSize: 34, letterSpacing: 4, textAlign: 'center' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '75%', marginTop: 2 },
  dividerLine: { flex: 1, height: 1 },
  dividerRune: { fontFamily: 'System', fontSize: 15 },

  weaponSection: {
    width: 260, height: 260,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
    position: 'relative',
  },
  runeRingOuter: {
    position: 'absolute',
    width: 248, height: 248,
    borderRadius: 124,
    borderWidth: 1,
  },
  ringRune: { fontFamily: 'System', fontSize: 13 },
  runeRingInner: {
    position: 'absolute',
    width: 180, height: 180,
    borderRadius: 90,
    borderWidth: 1,
  },
  weaponWrap: {
    width: 130, height: 130,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  xpBlock: { alignItems: 'center', gap: 4, marginBottom: 8 },
  xpNumber: { fontFamily: Fonts.display, fontSize: 76, lineHeight: 80 },
  xpLabel: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 5 },

  runeRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: Spacing.lg, paddingHorizontal: Spacing.lg },
  runeRowChar: { fontFamily: 'System' },

  statsCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(8,6,16,0.95)',
    marginBottom: Spacing.md,
  },
  statsTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  statItem: { flex: 1, alignItems: 'center', gap: 5 },
  statRuneChar: { fontFamily: 'System', fontSize: 20 },
  statValue: { fontFamily: Fonts.heading, fontSize: 24, lineHeight: 26 },
  statLabel: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 1.5, color: Colors.textDim },
  statDivider: { width: 1, marginVertical: 6 },

  specialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(8,6,16,0.95)',
    gap: 14,
  },
  cardLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  specialCardLeft: { width: 60, alignItems: 'center', justifyContent: 'center' },
  specialCardBigRune: { fontFamily: 'System', fontSize: 48, lineHeight: 52 },
  specialCardRight: { flex: 1, gap: 3 },
  specialCardTitle: { fontFamily: Fonts.heading, fontSize: 11, letterSpacing: 2.5 },
  specialCardName: { fontFamily: Fonts.display, fontSize: 20, lineHeight: 24 },
  specialCardSub: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },

  verseWrap: { alignItems: 'center', paddingHorizontal: Spacing.lg, gap: 10, marginBottom: Spacing.lg },
  verseSource: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 3 },
  verseText: {
    fontFamily: Fonts.proseItalic, fontSize: 15,
    color: Colors.textMuted, textAlign: 'center',
    lineHeight: 25, fontStyle: 'italic',
    paddingHorizontal: Spacing.sm,
  },

  btnWrap: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  returnBtn: { borderRadius: 18, overflow: 'hidden', height: 68, alignItems: 'center', justifyContent: 'center', gap: 3 },
  btnShine: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  btnEyebrow: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 4, color: Colors.void, opacity: 0.6 },
  btnText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.void, letterSpacing: 4 },

  footer: { alignItems: 'center', paddingVertical: Spacing.md },
  footerRunes: { fontFamily: 'System', fontSize: 12, letterSpacing: 8 },
});