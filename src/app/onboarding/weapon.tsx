import { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore, type Weapon } from '@/lib/onboarding-store';
import { WeaponSVG } from '../../components/WeaponSVG';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width } = Dimensions.get('window');

const WEAPONS: {
  key: Weapon;
  name: string;
  subtitle: string;
  color: string;
  rune: string;
  desc: string;
  power: string;
  forgeDesc: string;
}[] = [
  {
    key: 'mjolnir',
    name: 'MJOLNIR',
    subtitle: "Thor's Hammer",
    color: '#C9A84C',
    rune: 'ᚦ',
    desc: 'Unstoppable force. Chosen by the strongest.',
    power: 'STRENGTH',
    forgeDesc: 'Grows heavier and more devastating with each feat of iron.',
  },
  {
    key: 'broadsword',
    name: 'BROADSWORD',
    subtitle: 'Blade of the Jarl',
    color: '#A8C4D4',
    rune: 'ᛏ',
    desc: 'Balanced and precise. The weapon of warriors.',
    power: 'BALANCE',
    forgeDesc: 'Sharpens with every battle. A true warrior\'s blade.',
  },
  {
    key: 'axe',
    name: 'VIKING AXE',
    subtitle: 'The Berserker Axe',
    color: '#E05050',
    rune: 'ᚷ',
    desc: 'Wild and ferocious. For those who fear nothing.',
    power: 'FURY',
    forgeDesc: 'Each rage-filled workout carves deeper runes into the blade.',
  },
  {
    key: 'spear',
    name: 'GUNGNIR',
    subtitle: "Odin's Spear",
    color: '#8B6FD4',
    rune: 'ᚨ',
    desc: 'Swift and enduring. Speed over raw power.',
    power: 'ENDURANCE',
    forgeDesc: 'Flies truer with every mile raided, every breath earned.',
  },
];

const TIERS = ['RAW', 'IRON', 'FORGED', 'TEMPERED', 'RUNED', 'LEGENDARY', 'EINHERJAR'];

export default function WeaponScreen() {
  const { data, setField } = useOnboardingStore();
  const [selected, setSelected] = useState<Weapon | null>(data.weapon ?? null);
  const [showDetail, setShowDetail] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const weaponAnims = useRef(WEAPONS.map(() => ({
    scale: new Animated.Value(0.9),
    opacity: new Animated.Value(0),
  }))).current;
  const cardSettle = useRef(WEAPONS.map(() => new Animated.Value(1))).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const detailAnim = useRef(new Animated.Value(0)).current;
  const explainerAnim = useRef(new Animated.Value(0)).current;
  const ctaPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    WEAPONS.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(weaponAnims[i].opacity, {
          toValue: 1, duration: 500, delay: 100 + i * 100, useNativeDriver: true,
        }),
        Animated.spring(weaponAnims[i].scale, {
          toValue: 1, tension: 50, friction: 8, delay: 100 + i * 100, useNativeDriver: true,
        }),
      ]).start();
    });

    // Explainer fades in after cards
    Animated.timing(explainerAnim, {
      toValue: 1, duration: 600, delay: 600, useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  function selectWeapon(w: Weapon, index: number) {
    setSelected(w);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Same "settle" bounce used on the goal-selection screen — a quick
    // scale-up-then-back so picking a weapon feels like a decision landing,
    // consistent with the rest of the onboarding flow's feel.
    Animated.sequence([
      Animated.spring(cardSettle[index], { toValue: 1.04, tension: 300, friction: 10, useNativeDriver: true }),
      Animated.spring(cardSettle[index], { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();

    // Show detail panel after selection
    detailAnim.setValue(0);
    Animated.timing(detailAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    setShowDetail(true);

    // Once something is chosen, give the CTA a slow, gentle breathing pulse
    // — a small visual "this is ready, tap me" cue rather than a static bar
    // that looks identical to its own disabled state a moment ago.
    ctaPulse.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, { toValue: 1.03, duration: 900, useNativeDriver: true }),
        Animated.timing(ctaPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }

  function handleNext() {
    if (!selected) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setField('weapon', selected);
    router.push('/onboarding/calculating');
  }

  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/goal' as any);
    }
  }

  const selectedWeapon = WEAPONS.find(w => w.key === selected);
  const glowColor = selectedWeapon?.color ?? '#B43C0A';
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.22] });

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#080308', '#050508']} style={StyleSheet.absoluteFill} />

      {/* Ambient forge glow — reactivated and tied to whichever weapon is
          currently selected, so the whole screen warms toward that
          weapon's color instead of sitting flat. Matches the same
          restrained ambient-glow technique used on the goal-selection
          and paywall screens. */}
      <Animated.View style={[styles.forgeGlow, { opacity: glowOpacity, backgroundColor: glowColor }]} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.container}>

          {/* Progress */}
          <View style={styles.topRow}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <View style={styles.progressRow}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.progressDotTrack}>
                  <View style={[
                    styles.progressDotFill,
                    i <= 2 && { backgroundColor: Colors.gold, width: '100%' },
                  ]} />
                </View>
              ))}
            </View>
            <View style={styles.backBtnSpacer} />
          </View>
          <Text style={styles.progressLabel}>STEP 3 OF 4</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* Header */}
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.stepLabel}>THE FORGE AWAITS</Text>
              <Text style={styles.title}>CHOOSE YOUR{'\n'}WEAPON</Text>
            </Animated.View>

            {/* Forge explainer — the key addition */}
            <Animated.View style={[styles.forgeExplainer, { opacity: explainerAnim }]}>
              <LinearGradient colors={['rgba(201,168,76,0.06)', 'transparent']} style={StyleSheet.absoluteFill} />
              <LinearGradient
                colors={['transparent', 'rgba(201,168,76,0.3)', 'transparent']}
                style={styles.explainerTopLine}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
              <View style={styles.explainerRow}>
                <Text style={styles.explainerRune}>ᚲ</Text>
                <View style={styles.explainerText}>
                  <Text style={styles.explainerTitle}>THIS WEAPON IS YOURS FOREVER</Text>
                  <Text style={styles.explainerDesc}>
                    Every workout heats the forge. Every battle earns runes. Your weapon evolves through 7 tiers — from RAW to EINHERJAR.
                  </Text>
                </View>
              </View>

              {/* Tier progression preview */}
              <View style={styles.tierRow}>
                {TIERS.map((tier, i) => (
                  <View key={tier} style={styles.tierItem}>
                    <View style={[styles.tierDot, {
                      backgroundColor: i === 0 ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)',
                    }]} />
                    <Text style={[styles.tierLabel, i === 0 && { color: Colors.gold }]}>{tier}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Weapon grid */}
            <View style={styles.weaponGrid}>
              {WEAPONS.map((weapon, i) => {
                const isSelected = selected === weapon.key;
                return (
                  <Animated.View
                    key={weapon.key}
                    style={{
                      opacity: weaponAnims[i].opacity,
                      transform: [
                        { scale: weaponAnims[i].scale },
                        { scale: cardSettle[i] },
                      ],
                      width: '48%',
                    }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.weaponCard,
                        isSelected && {
                          borderColor: `${weapon.color}60`,
                          shadowColor: weapon.color,
                          shadowOpacity: 0.35,
                          shadowRadius: 14,
                          shadowOffset: { width: 0, height: 6 },
                        },
                      ]}
                      onPress={() => selectWeapon(weapon.key, i)}
                      activeOpacity={0.8}
                    >
                      {isSelected && (
                        <LinearGradient
                          colors={[`${weapon.color}16`, 'transparent']}
                          style={StyleSheet.absoluteFill}
                        />
                      )}
                      {isSelected && (
                        <LinearGradient
                          colors={['transparent', weapon.color, 'transparent']}
                          style={styles.weaponCardTopLine}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        />
                      )}

                      <View style={[
                        styles.weaponIconWrap,
                        isSelected && {
                          borderColor: `${weapon.color}30`,
                          backgroundColor: `${weapon.color}10`,
                        },
                      ]}>
                        {isSelected && (
                          <View style={[styles.weaponIconGlow, { backgroundColor: `${weapon.color}20` }]} />
                        )}
                        <WeaponSVG
                          weapon={weapon.key}
                          color={weapon.color}
                          size={52}
                          glowOpacity={isSelected ? 0.6 : 0.2}
                        />
                      </View>

                      <Text style={[styles.weaponName, isSelected && { color: weapon.color }]}>
                        {weapon.name}
                      </Text>
                      <Text style={styles.weaponSubtitle}>{weapon.subtitle}</Text>
                      <Text style={styles.weaponDesc}>{weapon.desc}</Text>

                      <View style={[
                        styles.powerBadge,
                        isSelected && {
                          backgroundColor: `${weapon.color}12`,
                          borderColor: `${weapon.color}30`,
                          borderWidth: 1,
                        },
                      ]}>
                        <Text style={[styles.powerRune, isSelected && { color: weapon.color }]}>
                          {weapon.rune}
                        </Text>
                        <Text style={[styles.powerText, isSelected && { color: weapon.color }]}>
                          {weapon.power}
                        </Text>
                      </View>

                      {isSelected && (
                        <View style={[styles.selectedCheck, {
                          borderColor: `${weapon.color}60`,
                          backgroundColor: `${weapon.color}15`,
                        }]}>
                          <Text style={[styles.selectedCheckText, { color: weapon.color }]}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            {/* Selected weapon detail — shows after picking */}
            {showDetail && selectedWeapon && (
              <Animated.View style={[styles.detailCard, {
                borderColor: `${selectedWeapon.color}30`,
                opacity: detailAnim,
              }]}>
                <LinearGradient colors={[`${selectedWeapon.color}08`, 'transparent']} style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={['transparent', selectedWeapon.color, 'transparent']}
                  style={styles.detailTopLine}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <Text style={[styles.detailRuneBig, { color: selectedWeapon.color }]}>
                  {selectedWeapon.rune}
                </Text>
                <View style={styles.detailText}>
                  <Text style={[styles.detailName, { color: selectedWeapon.color }]}>
                    {selectedWeapon.name} CHOSEN
                  </Text>
                  <Text style={styles.detailForgeDesc}>{selectedWeapon.forgeDesc}</Text>
                  <Text style={styles.detailNote}>
                    Starts at RAW · Earns runes at 5, 10, 15, 20, 30, 40, 50, 75 battles
                  </Text>
                </View>
              </Animated.View>
            )}

            <View style={{ height: 150 }} />
          </ScrollView>

          {/* Fade scrim behind the fixed CTA — without this, scrolled
              content can end up sitting flush against the button with no
              visual separation. This gradient fades the background to
              solid right where the button sits, so content always reads
              as "behind" the CTA rather than touching it. */}
          <LinearGradient
            colors={['transparent', '#050508', '#050508']}
            style={styles.ctaScrim}
            pointerEvents="none"
          />

          {/* CTA — same dark-gradient-plus-accent-line pattern used across
              the app (Iron Forge's "LOG SET" button uses the identical
              colors), with a subtle top shine added for extra polish. */}
          <Animated.View style={{
            transform: [{ scale: ctaPulse }],
            position: 'absolute',
            bottom: Spacing.lg, left: Spacing.lg, right: Spacing.lg,
          }}>
            <TouchableOpacity
              style={[styles.nextBtn, !selected && styles.nextBtnDisabled]}
              onPress={handleNext}
              disabled={!selected}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={selected ? ['#3A1A1A', '#1A0808'] : ['#111', '#0A0A0A']}
                style={StyleSheet.absoluteFill}
              />
              {selected && (
                <LinearGradient
                  colors={['rgba(255,255,255,0.08)', 'transparent']}
                  style={styles.nextBtnShine}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                />
              )}
              <LinearGradient
                colors={selected
                  ? ['transparent', selectedWeapon?.color ?? Colors.gold, 'transparent']
                  : ['transparent', 'rgba(255,255,255,0.06)', 'transparent']}
                style={styles.nextBtnTopLine}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
              <Text style={[
                styles.nextBtnText,
                !selected && { color: Colors.textMuted },
                selected && { color: selectedWeapon?.color ?? Colors.gold },
              ]}>
                {selected ? `CLAIM ${selectedWeapon?.name} →` : 'CHOOSE YOUR WEAPON'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  scrollContent: { paddingBottom: 20 },

  forgeGlow: {
    position: 'absolute',
    bottom: -50, left: -50,
    width: width * 1.2,
    height: 300,
    borderRadius: 999,
    transform: [{ scaleX: 1.2 }, { scaleY: 0.4 }],
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
    color: '#E06020',
    marginBottom: 6,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.gold,
    letterSpacing: 2,
    lineHeight: 34,
    marginBottom: Spacing.md,
    textShadowColor: 'rgba(201,168,76,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  // Forge explainer
  forgeExplainer: {
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.15)',
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(8,6,10,0.9)',
    gap: 12,
  },
  explainerTopLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  explainerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  explainerRune: {
    fontSize: 28,
    color: Colors.gold,
    fontFamily: 'System',
    opacity: 0.7,
  },
  explainerText: { flex: 1, gap: 4 },
  explainerTitle: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.gold,
    letterSpacing: 1.5,
  },
  explainerDesc: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tierItem: { flex: 1, alignItems: 'center', gap: 4 },
  tierDot: {
    height: 3,
    width: '100%',
    borderRadius: 2,
  },
  tierLabel: {
    fontFamily: Fonts.body,
    fontSize: 6,
    letterSpacing: 0.5,
    color: Colors.textDim,
    textAlign: 'center',
  },

  // Weapon grid
  weaponGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.md,
  },
  weaponCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: 5,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,8,10,0.8)',
  },
  weaponCardTopLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  weaponIconWrap: {
    width: 62, height: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  weaponIconGlow: {
    position: 'absolute',
    width: '100%', height: '100%',
    borderRadius: 16,
  },
  weaponName: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  weaponSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 1,
    color: Colors.textDim,
    marginBottom: 2,
  },
  weaponDesc: {
    fontFamily: Fonts.prose,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  powerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  powerRune: {
    fontSize: 12,
    color: Colors.textDim,
    fontFamily: 'System',
  },
  powerText: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 1.5,
    color: Colors.textDim,
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

  // Detail card
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(8,6,10,0.95)',
    gap: 12,
    marginBottom: Spacing.sm,
  },
  detailTopLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  detailRuneBig: {
    fontFamily: 'System',
    fontSize: 40,
    lineHeight: 44,
  },
  detailText: { flex: 1, gap: 4 },
  detailName: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    letterSpacing: 2,
  },
  detailForgeDesc: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  detailNote: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 0.5,
    marginTop: 2,
  },

  ctaScrim: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 140,
  },

  // CTA
  nextBtn: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
  },
  nextBtnDisabled: { borderColor: 'rgba(255,255,255,0.05)' },
  nextBtnShine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '55%',
  },
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
});