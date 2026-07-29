import { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from 'react-native';
import { WeaponSVG } from '../../components/WeaponSVG';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWarriorStore } from '@/lib/store';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

const WEAPONS: Record<string, { name: string; subtitle: string; color: string; desc: string; power: string }> = {
  mjolnir:    { name: 'MJOLNIR',    subtitle: "Thor's Hammer",     color: '#C9A84C', desc: 'The weapon of gods. Each strike shakes the heavens.',    power: 'STRENGTH'  },
  broadsword: { name: 'BROADSWORD', subtitle: 'Blade of the Jarl', color: '#A8C4D4', desc: 'Balanced and precise. The mark of a true warrior.',      power: 'BALANCE'   },
  axe:        { name: 'VIKING AXE', subtitle: 'The Berserker Axe', color: '#CC4444', desc: 'Wild and ferocious. Fear is your greatest weapon.',       power: 'FURY'      },
  spear:      { name: 'GUNGNIR',    subtitle: "Odin's Spear",      color: '#8B6FD4', desc: 'Swift and true. The spear that never misses.',            power: 'ENDURANCE' },
};

const RUNE_MILESTONES = [
  { rune: 'ᚠ', milestone: 5,  name: 'Wealth',   desc: '5 battles fought'  },
  { rune: 'ᚢ', milestone: 10, name: 'Strength',  desc: '10 battles fought' },
  { rune: 'ᚦ', milestone: 15, name: 'Thor',      desc: '15 battles fought' },
  { rune: 'ᚨ', milestone: 20, name: 'Odin',      desc: '20 battles fought' },
  { rune: 'ᚱ', milestone: 30, name: 'Journey',   desc: '30 battles fought' },
  { rune: 'ᚲ', milestone: 40, name: 'Fire',      desc: '40 battles fought' },
  { rune: 'ᚷ', milestone: 50, name: 'Gift',      desc: '50 battles fought' },
  { rune: 'ᚹ', milestone: 75, name: 'Valhalla',  desc: '75 battles fought' },
];

// Weapon tiers — unlock as runes are earned
const WEAPON_TIERS = [
  { min: 0, name: 'RAW',        glowIntensity: 0.08, ringOpacity: 0.15, particleCount: 0  },
  { min: 1, name: 'IRON',       glowIntensity: 0.18, ringOpacity: 0.25, particleCount: 0  },
  { min: 2, name: 'FORGED',     glowIntensity: 0.32, ringOpacity: 0.40, particleCount: 2  },
  { min: 4, name: 'TEMPERED',   glowIntensity: 0.48, ringOpacity: 0.55, particleCount: 4  },
  { min: 6, name: 'RUNED',      glowIntensity: 0.65, ringOpacity: 0.70, particleCount: 6  },
  { min: 7, name: 'LEGENDARY',  glowIntensity: 0.82, ringOpacity: 0.85, particleCount: 8  },
  { min: 8, name: 'EINHERJAR',  glowIntensity: 1.0,  ringOpacity: 1.0,  particleCount: 12 },
];

function getTier(earnedCount: number) {
  let tier = WEAPON_TIERS[0];
  for (const t of WEAPON_TIERS) {
    if (earnedCount >= t.min) tier = t;
  }
  return tier;
}

// ── EMBER PARTICLE ───────────────────────────────────────────
function EmberParticle({ color, delay, startX }: { color: string; delay: number; startX: number }) {
  const posY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    function animate() {
      posY.setValue(0);
      opacity.setValue(0);
      scale.setValue(0.3 + Math.random() * 0.4);
      Animated.sequence([
        Animated.delay(delay + Math.random() * 2000),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.8, duration: 400, useNativeDriver: true }),
          Animated.timing(posY, { toValue: -(60 + Math.random() * 80), duration: 2000 + Math.random() * 1000, useNativeDriver: true }),
        ]),
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start(() => animate());
    }
    animate();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      bottom: 0,
      left: startX,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: color,
      opacity,
      transform: [{ translateY: posY }, { scale }],
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
    }} />
  );
}

function EmberField({ color, count }: { color: string; count: number }) {
  if (count === 0) return null;
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    delay: (i / count) * 2000,
    startX: 30 + (i % 4) * 20,
  }));
  return (
    <View style={{ position: 'absolute', bottom: 10, left: 20, right: 20, height: 100, pointerEvents: 'none' }}>
      {particles.map(p => (
        <EmberParticle key={p.id} color={color} delay={p.delay} startX={p.startX} />
      ))}
    </View>
  );
}

// ── NEW RUNE FLASH ───────────────────────────────────────────
function NewRuneFlash({ color, runeName, onDone }: { color: string; runeName: string; onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(1800),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(onDone);
  }, []);

  return (
    <Animated.View style={[styles.runeFlash, { opacity }]}>
      <Animated.View style={[styles.runeFlashInner, { borderColor: color, transform: [{ scale }] }]}>
        <LinearGradient colors={[`${color}20`, `${color}05`]} style={StyleSheet.absoluteFill} />
        <Text style={[styles.runeFlashRune, { color }]}>{runeName}</Text>
        <Text style={styles.runeFlashLabel}>RUNE UNLOCKED</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ── MAIN SCREEN ──────────────────────────────────────────────
export default function WeaponForgeModal() {
  const { warrior, workoutCount, isPro } = useWarriorStore();
  const [weaponKey, setWeaponKey] = useState<string>('broadsword');
  const [newRune, setNewRune] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const weaponAnim = useRef(new Animated.Value(0.8)).current;
  const tierFlashAnim = useRef(new Animated.Value(0)).current;
  const runeAnims = useRef(RUNE_MILESTONES.map(() => new Animated.Value(0))).current;

  const weapon = WEAPONS[weaponKey] ?? WEAPONS.broadsword;
  const earnedRunes = RUNE_MILESTONES.filter(r => workoutCount >= r.milestone);
  const nextMilestone = RUNE_MILESTONES.find(r => workoutCount < r.milestone);
  const tier = getTier(earnedRunes.length);
  const nextTier = WEAPON_TIERS.find(t => t.min > earnedRunes.length);

  useEffect(() => {
    loadWeapon();
    checkForNewRune();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(weaponAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    earnedRunes.forEach((_, i) => {
      Animated.timing(runeAnims[i], {
        toValue: 1,
        duration: 500,
        delay: 400 + i * 150,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  async function loadWeapon() {
    try {
      const w = await AsyncStorage.getItem('valhalla_weapon');
      if (w) setWeaponKey(w);
    } catch {}
  }

  async function checkForNewRune() {
    try {
      const lastSeen = await AsyncStorage.getItem('last_seen_rune_count');
      const lastSeenCount = lastSeen ? parseInt(lastSeen) : 0;
      if (earnedRunes.length > lastSeenCount && earnedRunes.length > 0) {
        const latestRune = earnedRunes[earnedRunes.length - 1];
        setNewRune(latestRune.rune);
        // Flash the tier badge
        Animated.sequence([
          Animated.timing(tierFlashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(tierFlashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(tierFlashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(tierFlashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
      }
      await AsyncStorage.setItem('last_seen_rune_count', String(earnedRunes.length));
    } catch {}
  }

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [tier.glowIntensity * 0.3, tier.glowIntensity],
  });

  const ringOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [tier.ringOpacity * 0.4, tier.ringOpacity],
  });

  const tierFlashColor = tierFlashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', weapon.color + '30'],
  });

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#100808', '#0A0510', '#050508']} style={StyleSheet.absoluteFill} />

      {/* Forge glow — scales with tier */}
      <Animated.View style={[styles.forgeGlow, {
        opacity: glowOpacity,
        backgroundColor: weapon.color,
      }]} />

      {/* New rune flash overlay */}
      {newRune && (
        <NewRuneFlash
          color={weapon.color}
          runeName={newRune}
          onDone={() => setNewRune(null)}
        />
      )}

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim }}>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.handle} />
              <Text style={styles.eyebrow}>THE WEAPON FORGE</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Weapon hero */}
            <Animated.View style={[styles.weaponHero, { transform: [{ scale: weaponAnim }] }]}>
              {/* Ember particles rise from the weapon */}
              <EmberField color={weapon.color} count={tier.particleCount} />

              {/* Outer ring — pulses with tier intensity */}
              <Animated.View style={[styles.weaponRingOuter, {
                borderColor: weapon.color,
                opacity: ringOpacity,
              }]} />

              {/* Inner ring */}
              <View style={[styles.weaponRingInner, { borderColor: `${weapon.color}40` }]} />

              {/* Weapon icon */}
              <View style={styles.weaponIconWrap}>
                <LinearGradient
                  colors={[`${weapon.color}20`, `${weapon.color}08`]}
                  style={StyleSheet.absoluteFill}
                />
                <WeaponSVG
                  weapon={weaponKey}
                  color={weapon.color}
                  size={90}
                  glowOpacity={tier.glowIntensity}
                />
              </View>

              {/* Runes orbiting */}
              {RUNE_MILESTONES.map((r, i) => {
                const angle = (i / RUNE_MILESTONES.length) * Math.PI * 2 - Math.PI / 2;
                const radius = 90;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const earned = workoutCount >= r.milestone && isPro;
                const locked = !isPro && workoutCount >= r.milestone;

                return (
                  <Animated.View
                    key={r.rune}
                    style={[
                      styles.runeOrbit,
                      {
                        transform: [{ translateX: x }, { translateY: y }],
                        opacity: earned ? runeAnims[i] : locked ? 0.3 : 0.1,
                      },
                    ]}
                  >
                    <View style={[
                      styles.runeOrbitDot,
                      earned && { borderColor: weapon.color, backgroundColor: `${weapon.color}15` },
                      locked && { borderColor: 'rgba(255,255,255,0.1)' },
                    ]}>
                      <Text style={[
                        styles.runeOrbitText,
                        earned && { color: weapon.color },
                        locked && { color: 'rgba(255,255,255,0.2)' },
                      ]}>
                        {earned ? r.rune : locked ? '🔒' : r.rune}
                      </Text>
                    </View>
                  </Animated.View>
                );
              })}
            </Animated.View>

            {/* Weapon info */}
            <View style={styles.weaponInfo}>
              <Text style={[styles.weaponName, { color: weapon.color }]}>{weapon.name}</Text>
              <Text style={styles.weaponSubtitle}>{weapon.subtitle}</Text>
              <Text style={styles.weaponDesc}>{weapon.desc}</Text>

              {/* Tier badge */}
              <Animated.View style={[
                styles.tierBadge,
                { borderColor: `${weapon.color}60`, backgroundColor: `${weapon.color}12` },
              ]}>
                <Text style={[styles.tierBadgeText, { color: weapon.color }]}>
                  ✦ {tier.name}
                </Text>
              </Animated.View>

              <View style={[styles.powerBadge, { borderColor: `${weapon.color}40`, backgroundColor: `${weapon.color}10` }]}>
                <Text style={[styles.powerText, { color: weapon.color }]}>{weapon.power}</Text>
              </View>
            </View>

            {/* Tier progression */}
            {nextTier && (
              <View style={styles.tierProgressCard}>
                <LinearGradient
                  colors={[`${weapon.color}06`, 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.tierProgressRow}>
                  <Text style={styles.tierProgressLabel}>NEXT TIER</Text>
                  <Text style={[styles.tierProgressName, { color: weapon.color }]}>{nextTier.name}</Text>
                </View>
                <View style={styles.tierTrack}>
                  {WEAPON_TIERS.filter(t => t.min > 0).map((t, i) => (
                    <View
                      key={t.name}
                      style={[
                        styles.tierDot,
                        earnedRunes.length >= t.min
                          ? { backgroundColor: weapon.color, shadowColor: weapon.color, shadowOpacity: 0.6, shadowRadius: 4 }
                          : { backgroundColor: 'rgba(255,255,255,0.08)' },
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.tierProgressSub}>
                  {nextTier.min - earnedRunes.length} more rune{nextTier.min - earnedRunes.length !== 1 ? 's' : ''} to reach {nextTier.name}
                </Text>
              </View>
            )}
            {!nextTier && (
              <View style={[styles.tierProgressCard, { borderColor: `${weapon.color}40` }]}>
                <LinearGradient colors={[`${weapon.color}10`, 'transparent']} style={StyleSheet.absoluteFill} />
                <Text style={[styles.tierProgressName, { color: weapon.color, textAlign: 'center' }]}>
                  ✦ EINHERJAR — MAXIMUM POWER ✦
                </Text>
                <Text style={[styles.tierProgressSub, { textAlign: 'center' }]}>
                  Your weapon has reached its final form
                </Text>
              </View>
            )}

            {/* Forge progress */}
            <View style={styles.forgeCard}>
              <LinearGradient colors={[`${weapon.color}08`, 'transparent']} style={StyleSheet.absoluteFill} />
              <LinearGradient
                colors={['transparent', weapon.color, 'transparent']}
                style={styles.forgeCardLine}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />

              <View style={styles.forgeCardTop}>
                <View>
                  <Text style={styles.forgeCardEyebrow}>FORGE HEAT</Text>
                  <Text style={[styles.forgeCardTitle, { color: weapon.color }]}>
                    {earnedRunes.length} / {RUNE_MILESTONES.length} Runes Earned
                  </Text>
                </View>
                <View style={styles.forgeCardBattles}>
                  <Text style={[styles.forgeCardBattlesNum, { color: weapon.color }]}>
                    {workoutCount}
                  </Text>
                  <Text style={styles.forgeCardBattlesLabel}>BATTLES</Text>
                </View>
              </View>

              <View style={styles.forgeProgressTrack}>
                <View style={[styles.forgeProgressFill, {
                  width: `${(earnedRunes.length / RUNE_MILESTONES.length) * 100}%`,
                }]}>
                  <LinearGradient
                    colors={[`${weapon.color}60`, weapon.color]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  />
                </View>
              </View>

              {nextMilestone ? (
                <Text style={styles.forgeSub}>
                  {nextMilestone.milestone - workoutCount} battles until{' '}
                  <Text style={{ color: weapon.color }}>{nextMilestone.rune} {nextMilestone.name}</Text>
                </Text>
              ) : (
                <Text style={[styles.forgeSub, { color: weapon.color }]}>
                  ✦ All runes unlocked — your weapon is complete
                </Text>
              )}
            </View>

            {/* Rune list */}
            <Text style={styles.sectionLabel}>RUNE ENGRAVINGS</Text>

            <View style={styles.runeList}>
              {RUNE_MILESTONES.map((r, i) => {
                const earned = workoutCount >= r.milestone;
                const proLocked = earned && !isPro;
                return (
                  <View key={r.rune} style={[
                    styles.runeRow,
                    i < RUNE_MILESTONES.length - 1 && styles.runeRowBorder,
                    earned && !proLocked && { borderLeftWidth: 2, borderLeftColor: weapon.color },
                  ]}>
                    <View style={[
                      styles.runeIcon,
                      earned && !proLocked && { borderColor: `${weapon.color}40`, backgroundColor: `${weapon.color}10` },
                    ]}>
                      <Text style={[
                        styles.runeIconText,
                        earned && !proLocked && { color: weapon.color },
                        (!earned || proLocked) && { opacity: 0.2 },
                      ]}>
                        {proLocked ? '🔒' : r.rune}
                      </Text>
                    </View>
                    <View style={styles.runeInfo}>
                      <Text style={[
                        styles.runeName,
                        earned && !proLocked && { color: Colors.text },
                        (!earned || proLocked) && { color: Colors.textDim },
                      ]}>
                        {r.name}
                      </Text>
                      <Text style={styles.runeDesc}>{r.desc}</Text>
                    </View>
                    <View style={styles.runeStatus}>
                      {earned && !proLocked ? (
                        <Text style={[styles.runeEarned, { color: weapon.color }]}>✓</Text>
                      ) : proLocked ? (
                        <TouchableOpacity onPress={() => router.push('/(modals)/paywall')}>
                          <Text style={styles.runeProText}>PRO</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.runeMilestone}>{r.milestone}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {!isPro && (
              <TouchableOpacity
                style={styles.proBanner}
                onPress={() => router.push('/(modals)/paywall')}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['rgba(201,168,76,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={['transparent', Colors.gold, 'transparent']}
                  style={styles.proBannerLine}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <Text style={styles.proBannerIcon}>✨</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.proBannerTitle}>Unlock Weapon Progression</Text>
                  <Text style={styles.proBannerSub}>
                    See your runes unlock and weapon evolve with every battle. Pro only.
                  </Text>
                </View>
                <Text style={styles.proBannerArrow}>→</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  content: { paddingBottom: 40 },

  forgeGlow: {
    position: 'absolute',
    top: -100,
    left: width * 0.1,
    width: width * 0.8,
    height: 300,
    borderRadius: 999,
    transform: [{ scaleX: 1.5 }, { scaleY: 0.5 }],
    pointerEvents: 'none',
  },

  // New rune flash overlay
  runeFlash: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    pointerEvents: 'none',
  },
  runeFlashInner: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 40,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(5,5,8,0.92)',
  },
  runeFlashRune: {
    fontSize: 52,
    fontFamily: 'System',
  },
  runeFlashLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    letterSpacing: 4,
    color: Colors.textMuted,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
  },
  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 4,
    color: Colors.textMuted,
  },
  closeBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },

  weaponHero: {
    width: 220,
    height: 220,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xl,
    position: 'relative',
  },
  weaponRingOuter: {
    position: 'absolute',
    width: 210, height: 210,
    borderRadius: 105,
    borderWidth: 1,
  },
  weaponRingInner: {
    position: 'absolute',
    width: 160, height: 160,
    borderRadius: 80,
    borderWidth: 1,
  },
  weaponIconWrap: {
    width: 120, height: 120,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  runeOrbit: {
    position: 'absolute',
    width: 32, height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -16,
    marginTop: -16,
  },
  runeOrbitDot: {
    width: 28, height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(10,8,10,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  runeOrbitText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.15)',
    fontFamily: 'System',
  },

  weaponInfo: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: 6,
    marginBottom: Spacing.md,
  },
  weaponName: {
    fontFamily: Fonts.display,
    fontSize: 28,
    letterSpacing: 3,
  },
  weaponSubtitle: {
    fontFamily: Fonts.proseItalic,
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  weaponDesc: {
    fontFamily: Fonts.prose,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  tierBadge: {
    borderWidth: 1,
    borderRadius: Radii.full,
    paddingHorizontal: 20,
    paddingVertical: 6,
    marginTop: 4,
  },
  tierBadgeText: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    letterSpacing: 3,
  },
  powerBadge: {
    borderWidth: 1,
    borderRadius: Radii.full,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  powerText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    letterSpacing: 3,
  },

  // Tier progression card
  tierProgressCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: Spacing.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
    gap: 8,
  },
  tierProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierProgressLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 3,
    color: Colors.textMuted,
  },
  tierProgressName: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    letterSpacing: 2,
  },
  tierTrack: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  tierDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  tierProgressSub: {
    fontFamily: Fonts.prose,
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  forgeCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
    gap: 10,
  },
  forgeCardLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  forgeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  forgeCardEyebrow: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 3,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  forgeCardTitle: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  forgeCardBattles: { alignItems: 'flex-end' },
  forgeCardBattlesNum: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    lineHeight: 30,
  },
  forgeCardBattlesLabel: {
    fontFamily: Fonts.body,
    fontSize: 7,
    letterSpacing: 2,
    color: Colors.textMuted,
  },
  forgeProgressTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  forgeProgressFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  forgeSub: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  sectionLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    marginBottom: 10,
  },
  runeList: {
    marginHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
    marginBottom: Spacing.md,
  },
  runeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
    overflow: 'hidden',
  },
  runeRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  runeIcon: {
    width: 38, height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  runeIconText: {
    fontSize: 18,
    fontFamily: 'System',
  },
  runeInfo: { flex: 1 },
  runeName: {
    fontFamily: Fonts.subheading,
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  runeDesc: {
    fontFamily: Fonts.prose,
    fontSize: 11,
    color: Colors.textDim,
  },
  runeStatus: { alignItems: 'flex-end' },
  runeEarned: {
    fontFamily: Fonts.heading,
    fontSize: 16,
  },
  runeProText: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.gold,
    letterSpacing: 1,
    backgroundColor: Colors.goldMuted,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  runeMilestone: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textDim,
    letterSpacing: 1,
  },

  proBanner: {
    marginHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 14,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  proBannerLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  proBannerIcon: { fontSize: 22 },
  proBannerTitle: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.gold,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  proBannerSub: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  proBannerArrow: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Colors.gold,
    opacity: 0.5,
  },
});