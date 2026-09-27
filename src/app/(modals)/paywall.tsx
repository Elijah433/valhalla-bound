import { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Animated, Dimensions, Linking,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeaponSVG } from '../../components/WeaponSVG';
import { getOffering, purchasePackage, restorePurchases } from '@/lib/purchases';
import { useWarriorStore } from '@/lib/store';
import { useWarriorProfile } from '@/lib/useWarriorProfile';
import { recordTrialStart, scheduleTrialEndReminder } from '@/lib/notifications';
import { getSagaEntryCount } from '@/lib/db';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width } = Dimensions.get('window');

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)' as any);
  }
}

const WEAPON_NAMES: Record<string, string> = {
  mjolnir: 'MJOLNIR',
  broadsword: 'BROADSWORD',
  axe: 'VIKING AXE',
  spear: 'GUNGNIR',
};

const WEAPON_COLORS: Record<string, string> = {
  mjolnir: '#C9A84C',
  broadsword: '#A8C4D4',
  axe: '#E05050',
  spear: '#8B6FD4',
};

function CrewIcon({ size = 20, color = Colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="8" cy="8" r="3" fill={color} opacity={0.9} />
      <Circle cx="16" cy="8" r="3" fill={color} opacity={0.7} />
      <Path d="M2 20 C2 16 5 14 8 14 C11 14 14 16 14 20" fill={color} opacity={0.9} />
      <Path d="M14 15 C15.5 14.2 17 14 18 14 C21 14 22 16 22 18" fill={color} opacity={0.6} />
    </Svg>
  );
}

function ScrollIcon({ size = 20, color = Colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="4" y="3" width="16" height="18" rx="2" fill={color} opacity={0.85} />
      <Rect x="7" y="7" width="10" height="1.5" rx="0.75" fill="rgba(0,0,0,0.3)" />
      <Rect x="7" y="11" width="10" height="1.5" rx="0.75" fill="rgba(0,0,0,0.3)" />
      <Rect x="7" y="15" width="7" height="1.5" rx="0.75" fill="rgba(0,0,0,0.3)" />
    </Svg>
  );
}

function RankIcon({ size = 20, color = Colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2 L14 8 L20 8 L15.5 12 L17.5 18 L12 14.5 L6.5 18 L8.5 12 L4 8 L10 8 Z"
        fill={color} opacity={0.9} />
    </Svg>
  );
}

function SwordIcon({ size = 20, color = Colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3 L14 10 L12 21 L10 10 Z" fill={color} opacity={0.9} />
      <Rect x="7" y="10" width="10" height="2" rx="1" fill={color} opacity={0.7} />
      <Circle cx="12" cy="21" r="2" fill={color} opacity={0.6} />
    </Svg>
  );
}

function ChaliceIcon({ size = 20, color = Colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 3 L17 3 L14.5 12 C14.5 14.5 13 16 12 16 C11 16 9.5 14.5 9.5 12 Z"
        fill={color} opacity={0.85} />
      <Rect x="11" y="16" width="2" height="4" rx="1" fill={color} opacity={0.7} />
      <Rect x="8" y="20" width="8" height="1.5" rx="0.75" fill={color} opacity={0.6} />
    </Svg>
  );
}

function ShieldIcon({ size = 20, color = Colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3 L20 6.5 L20 12 C20 16.5 16.5 20 12 21 C7.5 20 4 16.5 4 12 L4 6.5 Z"
        fill={color} opacity={0.85} />
      <Path d="M12 5.5 L18 8.5 L18 12 C18 15.5 15.5 18.5 12 19.5 C8.5 18.5 6 15.5 6 12 L6 8.5 Z"
        fill="rgba(0,0,0,0.2)" />
    </Svg>
  );
}

function HavamolIcon({ size = 20, color = Colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2 C8 2 5 5 5 9 L5 20 C5 21 6 22 7 22 L17 22 C18 22 19 21 19 20 L19 9 C19 5 16 2 12 2 Z"
        fill={color} opacity={0.12} />
      <Path d="M5 9 C5 5 8 2 12 2 C16 2 19 5 19 9"
        fill="none" stroke={color} strokeWidth="1.5" opacity={0.9} />
      <Path d="M8 10 L12 6 L16 10" fill="none" stroke={color} strokeWidth="1.2" opacity={0.85} />
      <Path d="M12 6 L12 18" stroke={color} strokeWidth="1.2" opacity={0.85} />
      <Path d="M9 13 L15 13" stroke={color} strokeWidth="1" opacity={0.55} />
      <Path d="M9 16.5 L15 16.5" stroke={color} strokeWidth="1" opacity={0.35} />
    </Svg>
  );
}

// Quill/rune-pen icon for Skald's Chronicle — a distinct mark from ScrollIcon
// (which represents the plain workout history log) since Chronicle is the
// AI-written saga narrative, a different feature worth its own visual identity.
function QuillIcon({ size = 20, color = Colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M20 4 C14 6 8 12 5 19 L4 20 L5 20 C8 18 12 16 14 12 C16 8 18 6 20 4 Z"
        fill={color} opacity={0.9} />
      <Path d="M4 20 L7 17" stroke={color} strokeWidth="1.3" opacity={0.7} />
      <Circle cx="18" cy="6" r="1.3" fill={color} opacity={0.6} />
    </Svg>
  );
}

// Fork + knife icon for Recipe Ideas — distinct from ChaliceIcon (Mead
// Hall's macro/nutrition tracking) since this is about finding NEW food
// ideas, not logging what you already ate.
function RecipeIcon({ size = 20, color = Colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="5" y="2" width="1.6" height="10" rx="0.8" fill={color} opacity={0.9} />
      <Rect x="8" y="2" width="1.6" height="10" rx="0.8" fill={color} opacity={0.9} />
      <Path d="M5 2 L5 8 C5 9.5 6.5 10 6.8 10 C7.1 10 8.6 9.5 8.6 8 L8.6 2" fill="none" stroke={color} strokeWidth="1.3" opacity={0.9} />
      <Rect x="6.2" y="10" width="1.2" height="12" rx="0.6" fill={color} opacity={0.9} />
      <Path d="M16 2 C13.5 2 12.5 5 12.5 8 C12.5 10 14 11 15.3 11 L15.3 22"
        fill="none" stroke={color} strokeWidth="1.4" opacity={0.9} />
    </Svg>
  );
}

// Hourglass icon for Intermittent Fasting — a simple, universally
// recognizable "time window" symbol distinct from anything else used here.
function FastingIcon({ size = 20, color = Colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 3 L18 3 L18 6 C18 9 15 11 12 11.5 C9 11 6 9 6 6 Z" fill={color} opacity={0.85} />
      <Path d="M6 21 L18 21 L18 18 C18 15 15 13 12 12.5 C9 13 6 15 6 18 Z" fill={color} opacity={0.6} />
      <Rect x="5" y="2" width="14" height="1.5" rx="0.75" fill={color} opacity={0.9} />
      <Rect x="5" y="20.5" width="14" height="1.5" rx="0.75" fill={color} opacity={0.9} />
    </Svg>
  );
}

const PRO_FEATURES = [
  { Icon: ShieldIcon,  label: 'Frost Shields',     desc: 'Protect your streak from one missed day',                     color: '#8B6FD4' },
  { Icon: RankIcon,    label: 'All Ranks',         desc: 'Unlock Jarl, Drengr, and Einherjar',                           color: '#FFD700' },
  { Icon: ChaliceIcon, label: 'Mead Hall',         desc: 'Full macro and nutrition tracking',                           color: '#E05020' },
  { Icon: RecipeIcon,  label: 'Recipe Ideas',      desc: 'High protein, vegan, keto & more — filterable recipe search', color: '#E05020' },
  { Icon: FastingIcon, label: 'Intermittent Fasting', desc: 'Live timer, protocols, and fasting history',                color: '#8B6FD4' },
  { Icon: ScrollIcon,  label: 'Full Saga Log',    desc: 'Unlimited workout history and analytics',                     color: Colors.ice },
  { Icon: HavamolIcon, label: "Odin's Wisdom",     desc: "All 164 verses of the Hávamál — unlocked",                    color: '#C9784C' },
];

const STATIC_PACKAGES = [
  { identifier: '$rc_annual',  packageType: 'ANNUAL',  product: { priceString: '$49.99/yr', price: 49.99 } },
  { identifier: '$rc_monthly', packageType: 'MONTHLY', product: { priceString: '$9.99/mo',  price: 9.99  } },
];

function isAnnualPkg(pkg: any): boolean {
  return pkg.packageType === 'ANNUAL' || pkg.identifier?.toLowerCase().includes('annual') || pkg.identifier === '$rc_annual';
}

function isMonthlyPkg(pkg: any): boolean {
  return pkg.packageType === 'MONTHLY' || pkg.identifier?.toLowerCase().includes('monthly') || pkg.identifier === '$rc_monthly';
}

export default function PaywallModal() {
  const [packages, setPackages] = useState<any[]>(STATIC_PACKAGES);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<any>(STATIC_PACKAGES[1]);
  const [rcError, setRcError] = useState(false);
  const [weaponKey, setWeaponKey] = useState<string>('broadsword');

  const setPro = useWarriorStore((s) => s.setPro);
  const warrior = useWarriorStore((s) => s.warrior);
  const isPro = useWarriorStore((s) => s.isPro);
  const { isShieldmaiden } = useWarriorProfile();

  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const glowAnim     = useRef(new Animated.Value(0)).current;
  const scaleAnim    = useRef(new Animated.Value(0.96)).current;
  const weaponPulse  = useRef(new Animated.Value(1)).current;
  const weaponScale  = useRef(new Animated.Value(0.7)).current;
  const weaponOpacity = useRef(new Animated.Value(0)).current;
  const ringRotate   = useRef(new Animated.Value(0)).current;

  const accentColor = isShieldmaiden ? '#D4A8C4' : Colors.gold;
  const weaponColor = WEAPON_COLORS[weaponKey] ?? accentColor;
  const weaponName  = WEAPON_NAMES[weaponKey] ?? 'YOUR WEAPON';
  const warriorName = warrior?.name ?? '';

  useEffect(() => {
    loadOffering();
    AsyncStorage.getItem('valhalla_weapon').then(w => { if (w) setWeaponKey(w); });

    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(weaponScale,   { toValue: 1, tension: 35, friction: 8, useNativeDriver: true }),
        Animated.timing(weaponOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]).start();
    }, 400);

    Animated.loop(
      Animated.sequence([
        Animated.timing(weaponPulse, { toValue: 1.06, duration: 1600, useNativeDriver: true }),
        Animated.timing(weaponPulse, { toValue: 1,    duration: 1600, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 18000, useNativeDriver: true })
    ).start();
  }, []);

  async function loadOffering() {
    try {
      const offering = await getOffering();
      if (!offering || !offering.availablePackages?.length) {
        setRcError(true);
        setPackages(STATIC_PACKAGES);
        setSelectedPkg(STATIC_PACKAGES[1]);
        setLoading(false);
        return;
      }
      const pkgs = offering.availablePackages;
      const sorted = [...pkgs].sort((a, b) => isAnnualPkg(a) ? -1 : isAnnualPkg(b) ? 1 : 0);
      setPackages(sorted);
      setSelectedPkg(sorted.find(isMonthlyPkg) ?? sorted[0]);
      setRcError(false);
    } catch (e) {
      setRcError(true);
      setPackages(STATIC_PACKAGES);
      setSelectedPkg(STATIC_PACKAGES[1]);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase() {
    if (!selectedPkg) return;
    if (rcError) {
      Alert.alert('Store Unavailable', 'Could not connect to the App Store. Check your connection and try again.', [{ text: 'OK' }]);
      return;
    }
    setPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const success = await purchasePackage(selectedPkg);
      if (success) {
        setPro(true);

        try {
          await recordTrialStart();
          const freshWarrior = useWarriorStore.getState().warrior;
          const chronicleCount = getSagaEntryCount();
          await scheduleTrialEndReminder(
            freshWarrior?.name ?? 'Warrior',
            freshWarrior?.total_xp ?? 0,
            freshWarrior?.streak_days ?? 0,
            chronicleCount,
          );
        } catch (e) {}

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Valhalla Awaits',
          isShieldmaiden ? 'Freya has chosen you. Your saga begins now.' : 'You are now Einherjar. Your saga begins.',
          [{ text: 'Enter Valhalla', onPress: () => goBack() }]
        );
      }
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert('Purchase Failed', e?.message ?? 'Something went wrong. Please try again.', [{ text: 'OK' }]);
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setLoading(true);
    try {
      const success = await restorePurchases();
      if (success) {
        setPro(true);
        Alert.alert('Restored', 'Your Pro access has been restored.', [{ text: 'Continue', onPress: () => goBack() }]);
      } else {
        Alert.alert('Nothing to Restore', 'No active Pro subscription found on this Apple ID.');
      }
    } catch (e) {
      Alert.alert('Restore Failed', 'Could not connect. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.2] });
  const ringDeg     = ringRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (isPro) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#0A0812', '#050508']} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.topGlow, { opacity: glowOpacity, backgroundColor: weaponColor }]} />

        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <Animated.ScrollView
            style={[styles.scroll, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
            contentContainerStyle={[styles.content, styles.proContent]}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity style={styles.closeBtn} onPress={goBack}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.weaponHero}>
              <Animated.View style={[styles.runeRingOuter, {
                borderColor: `${weaponColor}15`,
                transform: [{ rotate: ringDeg }],
              }]}>
                {['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ'].map((r, i) => {
                  const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                  const radius = 90;
                  return (
                    <Text key={i} style={[styles.ringRune, {
                      color: `${weaponColor}35`,
                      position: 'absolute',
                      left: 90 + Math.cos(angle) * radius - 7,
                      top:  90 + Math.sin(angle) * radius - 7,
                    }]}>{r}</Text>
                  );
                })}
              </Animated.View>

              <Animated.View style={[styles.runeRingInner, { borderColor: `${weaponColor}20`, opacity: glowAnim }]} />

              <Animated.View style={[styles.weaponWrap, {
                opacity: weaponOpacity,
                borderColor: `${weaponColor}25`,
                transform: [{ scale: weaponScale }],
              }]}>
                <LinearGradient colors={[`${weaponColor}20`, `${weaponColor}06`]} style={StyleSheet.absoluteFill} />
                <Animated.View style={{ transform: [{ scale: weaponPulse }] }}>
                  <WeaponSVG weapon={weaponKey} color={weaponColor} size={80} glowOpacity={0.7} />
                </Animated.View>
              </Animated.View>
            </View>

            <View style={styles.hero}>
              {warriorName ? (
                <Text style={[styles.heroName, { color: weaponColor }]}>{warriorName}</Text>
              ) : null}
              <Text style={[styles.heroEyebrow, { color: `${weaponColor}80` }]}>
                {isShieldmaiden ? "YOU ARE FREYA'S CHOSEN" : 'YOU ARE EINHERJAR'}
              </Text>
              <Text style={styles.heroTitle}>
                Your saga{'\n'}already continues.
              </Text>
              <View style={[styles.weaponBadge, { borderColor: `${weaponColor}30`, backgroundColor: `${weaponColor}08` }]}>
                <Text style={[styles.weaponBadgeText, { color: weaponColor }]}>
                  PRO ACTIVE · {weaponName}
                </Text>
              </View>
              <Text style={styles.heroSub}>
                All Pro features are unlocked — Longship Crew raids, every Battle Protocol, the full Mead Hall, Weapon Forge progression, and all 164 verses of Odin's wisdom.
              </Text>
            </View>

            <View style={styles.runeRow}>
              <LinearGradient colors={['transparent', `${weaponColor}40`, 'transparent']} style={styles.runeDivider} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              <Text style={[styles.runeRowText, { color: weaponColor }]}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ</Text>
              <LinearGradient colors={['transparent', `${weaponColor}40`, 'transparent']} style={styles.runeDivider} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            </View>

            <View style={styles.featuresCard}>
              <LinearGradient colors={[`${accentColor}06`, 'transparent']} style={StyleSheet.absoluteFill} />
              {PRO_FEATURES.map((f, i) => (
                <View key={f.label} style={[styles.featureRow, i < PRO_FEATURES.length - 1 && styles.featureRowBorder]}>
                  <View style={[styles.featureIconWrap, { borderColor: `${f.color}25`, backgroundColor: `${f.color}10` }]}>
                    <f.Icon size={16} color={f.color} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureLabel}>{f.label}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                  <Text style={[styles.featureCheck, { color: accentColor }]}>✓</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.ctaBtn, { opacity: loading ? 0.8 : 1 }]}
              onPress={goBack}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={isShieldmaiden ? ['#8B3A6A', '#D4A8C4', '#8B3A6A'] : [Colors.goldDark, Colors.gold, Colors.goldLight]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
              <LinearGradient colors={['rgba(255,255,255,0.15)', 'transparent']} style={styles.ctaShine} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
              <View style={styles.ctaInner}>
                <Text style={styles.ctaEyebrow}>EINHERJAR</Text>
                <Text style={styles.ctaText}>CONTINUE MY SAGA  →</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.footer}>
              <TouchableOpacity onPress={handleRestore} disabled={loading}>
                <Text style={styles.footerLink}>Restore Purchases</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity onPress={() => Linking.openURL('https://elijah433.github.io/valhalla-bound-legal/')}>
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://elijah433.github.io/valhalla-bound-legal/terms.html')}>
                <Text style={styles.footerLink}>Terms of Use</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.bottomRunes, { color: `${accentColor}08` }]}>
              ᚠ  ᚢ  ᚦ  ᚨ  ᚱ  ᚲ  ᚷ  ᚹ
            </Text>
          </Animated.ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0A0812', '#050508']} style={StyleSheet.absoluteFill} />

      <Animated.View style={[styles.topGlow, { opacity: glowOpacity, backgroundColor: weaponColor }]} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.closeBtn} onPress={goBack}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.weaponHero}>
            <Animated.View style={[styles.runeRingOuter, {
              borderColor: `${weaponColor}15`,
              transform: [{ rotate: ringDeg }],
            }]}>
              {['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ'].map((r, i) => {
                const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                const radius = 90;
                return (
                  <Text key={i} style={[styles.ringRune, {
                    color: `${weaponColor}35`,
                    position: 'absolute',
                    left: 90 + Math.cos(angle) * radius - 7,
                    top:  90 + Math.sin(angle) * radius - 7,
                  }]}>{r}</Text>
                );
              })}
            </Animated.View>

            <Animated.View style={[styles.runeRingInner, { borderColor: `${weaponColor}20`, opacity: glowAnim }]} />

            <Animated.View style={[styles.weaponWrap, {
              opacity: weaponOpacity,
              borderColor: `${weaponColor}25`,
              transform: [{ scale: weaponScale }],
            }]}>
              <LinearGradient colors={[`${weaponColor}20`, `${weaponColor}06`]} style={StyleSheet.absoluteFill} />
              <Animated.View style={{ transform: [{ scale: weaponPulse }] }}>
                <WeaponSVG weapon={weaponKey} color={weaponColor} size={80} glowOpacity={0.7} />
              </Animated.View>
            </Animated.View>
          </View>

          <View style={styles.hero}>
            {warriorName ? (
              <Text style={[styles.heroName, { color: weaponColor }]}>{warriorName}</Text>
            ) : null}
            <Text style={[styles.heroEyebrow, { color: `${weaponColor}80` }]}>
              {isShieldmaiden ? 'FREYA\'S CHOSEN' : 'JOIN THE EINHERJAR'}
            </Text>
            <Text style={styles.heroTitle}>
              {isShieldmaiden
                ? 'Feast in Freya\'s Hall.\nFight Until Ragnarök.'
                : 'Feast in Odin\'s Hall.\nTrain Until Ragnarök.'}
            </Text>
            <View style={[styles.weaponBadge, { borderColor: `${weaponColor}30`, backgroundColor: `${weaponColor}08` }]}>
              <Text style={[styles.weaponBadgeText, { color: weaponColor }]}>
                {weaponName} · RAW → EINHERJAR
              </Text>
            </View>
            <Text style={styles.heroSub}>
              Your {weaponName.toLowerCase()} is forged RAW. Every Pro battle heats the forge. Unlock all 7 tiers and evolve your weapon to EINHERJAR.
            </Text>
          </View>

          <View style={styles.runeRow}>
            <LinearGradient colors={['transparent', `${weaponColor}40`, 'transparent']} style={styles.runeDivider} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <Text style={[styles.runeRowText, { color: weaponColor }]}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ</Text>
            <LinearGradient colors={['transparent', `${weaponColor}40`, 'transparent']} style={styles.runeDivider} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          </View>

          <View style={styles.sagaPreviewCard}>
            <LinearGradient colors={[`${accentColor}08`, 'transparent']} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['transparent', accentColor, 'transparent']} style={styles.sagaPreviewTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <Text style={[styles.sagaPreviewLabel, { color: accentColor }]}>A GLIMPSE OF YOUR SAGA</Text>
            <Text style={styles.sagaPreviewDate}>Day 47 of the unbroken oath</Text>
            <Text style={styles.sagaPreviewText}>
              "{(warriorName || 'The warrior')} met the iron with fury undimmed, and the forge itself seemed to lean in closer to watch. Two thousand Valor now rests in their name, and the gates of Valhalla creak wider still."
            </Text>
            <Text style={styles.sagaPreviewFooter}>Written fresh by the skald, every day you train — Pro only</Text>
          </View>

          <View style={styles.compareCard}>
            <View style={styles.compareHeaderRow}>
              <Text style={styles.compareHeaderSpacer}></Text>
              <Text style={styles.compareHeaderFree}>FREE</Text>
              <Text style={[styles.compareHeaderPro, { color: accentColor }]}>PRO</Text>
            </View>
            <View style={[styles.compareRow, styles.compareRowBorder]}>
              <Text style={styles.compareLabel}>Manual logbook</Text>
              <Text style={styles.compareFree}>✓</Text>
              <Text style={[styles.comparePro, { color: accentColor }]}>✓</Text>
            </View>
            <View style={[styles.compareRow, styles.compareRowBorder]}>
              <Text style={styles.compareLabel}>Skald's Chronicle</Text>
              <Text style={styles.compareFree}>—</Text>
              <Text style={[styles.comparePro, { color: accentColor }]}>Full saga + epic</Text>
            </View>
            <View style={[styles.compareRow, styles.compareRowBorder]}>
              <Text style={styles.compareLabel}>Longship Crew raids</Text>
              <Text style={styles.compareFree}>Join only</Text>
              <Text style={[styles.comparePro, { color: accentColor }]}>Lead + Epic Raids</Text>
            </View>
            <View style={styles.compareRow}>
              <Text style={styles.compareLabel}>Training programs</Text>
              <Text style={styles.compareFree}>1</Text>
              <Text style={[styles.comparePro, { color: accentColor }]}>All 4</Text>
            </View>
          </View>

          <View style={styles.trainerCard}>
            <LinearGradient colors={[`${accentColor}08`, 'transparent']} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['transparent', accentColor, 'transparent']} style={styles.trainerTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <Text style={[styles.trainerEyebrow, { color: accentColor }]}>SMARTER THAN A TRAINER</Text>
            <Text style={styles.trainerPrice}>
              A personal trainer runs $300-600/month.{'\n'}This is $9.99.
            </Text>
            <View style={styles.trainerDivider} />
            {[
              { label: 'Knows when to push harder', desc: 'Detects real plateaus and tells you exactly what to change — reps, sets, or rest' },
              { label: 'Builds your workout on the spot', desc: 'Tell it your time and equipment, get a real generated session' },
              { label: 'Never forgets your history', desc: 'Tracks every set, every plateau, every PR — automatically' },
            ].map((item) => (
              <View key={item.label} style={styles.trainerRow}>
                <Text style={[styles.trainerCheck, { color: accentColor }]}>✓</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trainerLabel}>{item.label}</Text>
                  <Text style={styles.trainerDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.featuresCard}>
            <LinearGradient colors={[`${accentColor}06`, 'transparent']} style={StyleSheet.absoluteFill} />
            {PRO_FEATURES.map((f, i) => (
              <View key={f.label} style={[styles.featureRow, i < PRO_FEATURES.length - 1 && styles.featureRowBorder]}>
                <View style={[styles.featureIconWrap, { borderColor: `${f.color}25`, backgroundColor: `${f.color}10` }]}>
                  <f.Icon size={16} color={f.color} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
                <Text style={[styles.featureCheck, { color: accentColor }]}>✓</Text>
              </View>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator color={accentColor} style={{ marginVertical: 32 }} />
          ) : (
            <>
              {rcError && (
                <View style={styles.rcErrorBanner}>
                  <Text style={styles.rcErrorText}>Could not load live prices. Showing estimated pricing.</Text>
                </View>
              )}
              <View style={styles.packages}>
                {packages.map((pkg: any) => {
                  const isSelected   = selectedPkg?.identifier === pkg.identifier;
                  const annual       = isAnnualPkg(pkg);
                  const monthlyEquiv = annual && pkg.product.price
                    ? `~$${(pkg.product.price / 12).toFixed(2)}/mo`
                    : null;
                  return (
                    <TouchableOpacity
                      key={pkg.identifier}
                      style={[styles.packageCard, isSelected && { borderColor: `${accentColor}60`, backgroundColor: `${accentColor}08` }]}
                      onPress={() => { setSelectedPkg(pkg); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      activeOpacity={0.85}
                    >
                      {isSelected && (
                        <LinearGradient colors={['transparent', accentColor, 'transparent']} style={styles.packageTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                      )}

                      {annual ? (
                        <View style={[styles.savingsBadge, { backgroundColor: accentColor }]}>
                          <Text style={[styles.savingsText, { color: Colors.void }]}>MOST POPULAR · SAVE 58%</Text>
                        </View>
                      ) : (
                        <View style={[styles.savingsBadge, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                          <Text style={[styles.savingsText, { color: Colors.textMuted }]}>FLEXIBLE</Text>
                        </View>
                      )}

                      <Text style={[styles.packageType, { color: isSelected ? accentColor : Colors.textMuted }]}>
                        {annual ? 'ANNUAL' : 'MONTHLY'}
                      </Text>
                      <Text style={[styles.packagePrice, { color: isSelected ? accentColor : Colors.text }]}>
                        {pkg.product.priceString}
                      </Text>
                      <Text style={styles.packagePeriod}>{annual ? 'per year' : 'per month'}</Text>

                      {monthlyEquiv
                        ? <Text style={[styles.packageEquiv, { color: accentColor }]}>{monthlyEquiv}</Text>
                        :  <Text style={[styles.packageEquiv, { color: Colors.textDim }]}>Cancel anytime</Text>
                      }

                      {isSelected && <View style={[styles.selectedDot, { backgroundColor: accentColor }]} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <View style={[styles.trialRow, { borderColor: `${accentColor}25` }]}>
            <LinearGradient colors={[`${accentColor}08`, 'transparent']} style={StyleSheet.absoluteFill} />
            <Text style={[styles.trialRune, { color: accentColor }]}>ᚲ</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.trialHeadline, { color: accentColor }]}>3 days, completely free</Text>
              <Text style={styles.trialNote}>Cancel anytime in Settings — one tap, no questions asked. You're only charged if you decide to stay.</Text>
            </View>
          </View>

          <Text style={styles.founderNote}>
            Built by one guy training the same battles you are — nights and weekends, for people who actually want to become this.
          </Text>

          <TouchableOpacity
            style={[styles.ctaBtn, { opacity: purchasing || !selectedPkg || rcError ? 0.8 : 1 }]}
            onPress={handlePurchase}
            disabled={purchasing || !selectedPkg}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={isShieldmaiden ? ['#8B3A6A', '#D4A8C4', '#8B3A6A'] : [Colors.goldDark, Colors.gold, Colors.goldLight]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
            <LinearGradient colors={['rgba(255,255,255,0.15)', 'transparent']} style={styles.ctaShine} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
            {purchasing ? (
              <ActivityIndicator color={Colors.void} />
            ) : (
              <View style={styles.ctaInner}>
                <Text style={styles.ctaEyebrow}>BEGIN YOUR SAGA</Text>
                <Text style={styles.ctaText}>{rcError ? 'TRY AGAIN' : 'START FREE TRIAL  →'}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <TouchableOpacity onPress={handleRestore} disabled={loading}>
              <Text style={styles.footerLink}>Restore Purchases</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>·</Text>
            <TouchableOpacity onPress={goBack}>
              <Text style={styles.footerLink}>Not now</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={() => Linking.openURL('https://elijah433.github.io/valhalla-bound-legal/')}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://elijah433.github.io/valhalla-bound-legal/terms.html')}>
              <Text style={styles.footerLink}>Terms of Use</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.legalNote}>
            Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Manage in App Store settings.
          </Text>

          <Text style={[styles.bottomRunes, { color: `${accentColor}08` }]}>
            ᚠ  ᚢ  ᚦ  ᚨ  ᚱ  ᚲ  ᚷ  ᚹ
          </Text>

        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  proContent: { flexGrow: 1 },

  topGlow: {
    position: 'absolute',
    top: -100, left: width * 0.05,
    width: width * 0.9, height: 340,
    borderRadius: 999,
    transform: [{ scaleX: 1.2 }, { scaleY: 0.4 }],
    pointerEvents: 'none',
  },

  closeBtn: {
    alignSelf: 'flex-end',
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.md, marginBottom: Spacing.md,
  },
  closeBtnText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted },

  weaponHero: {
    width: 200, height: 200,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    position: 'relative',
  },
  runeRingOuter: {
    position: 'absolute',
    width: 192, height: 192,
    borderRadius: 96, borderWidth: 1,
  },
  runeRingInner: {
    position: 'absolute',
    width: 140, height: 140,
    borderRadius: 70, borderWidth: 1,
  },
  ringRune: { fontFamily: 'System', fontSize: 12 },
  weaponWrap: {
    width: 110, height: 110,
    borderRadius: 26, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },

  hero: { alignItems: 'center', gap: 8, paddingBottom: Spacing.lg },
  heroName: { fontFamily: Fonts.display, fontSize: 28, letterSpacing: 4, textAlign: 'center' },
  heroEyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 4 },
  heroTitle: {
    fontFamily: Fonts.display ?? Fonts.heading,
    fontSize: 30, color: Colors.text,
    textAlign: 'center', letterSpacing: 1, lineHeight: 38,
  },
  weaponBadge: { borderWidth: 1, borderRadius: Radii.full, paddingHorizontal: 16, paddingVertical: 5 },
  weaponBadgeText: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 2 },
  heroSub: {
    fontFamily: Fonts.proseItalic, fontSize: 13,
    color: Colors.textMuted, textAlign: 'center',
    lineHeight: 20, fontStyle: 'italic',
    paddingHorizontal: Spacing.md,
  },

  runeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.lg },
  runeDivider: { flex: 1, height: 1 },
  runeRowText: { fontFamily: 'System', fontSize: 12, letterSpacing: 6, opacity: 0.6 },

  sagaPreviewCard: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.9)',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: 6,
  },
  sagaPreviewTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  sagaPreviewLabel: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3 },
  sagaPreviewDate: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 1, color: Colors.textMuted },
  sagaPreviewText: {
    fontFamily: Fonts.proseItalic, fontSize: 14, color: Colors.text,
    fontStyle: 'italic', lineHeight: 21, marginTop: 2,
  },
  sagaPreviewFooter: {
    fontFamily: Fonts.prose, fontSize: 10, color: Colors.textDim,
    marginTop: 4,
  },

  compareCard: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.85)',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  compareHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10,
  },
  compareHeaderSpacer: { flex: 1.6 },
  compareHeaderFree: {
    flex: 1, textAlign: 'center',
    fontFamily: Fonts.body, fontSize: 9, letterSpacing: 2, color: Colors.textMuted,
  },
  compareHeaderPro: {
    flex: 1, textAlign: 'center',
    fontFamily: Fonts.body, fontSize: 9, letterSpacing: 2,
  },
  compareRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12,
  },
  compareRowBorder: {
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  compareLabel: {
    flex: 1.6,
    fontFamily: Fonts.prose, fontSize: 12, color: Colors.text,
  },
  compareFree: {
    flex: 1, textAlign: 'center',
    fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted,
  },
  comparePro: {
    flex: 1, textAlign: 'center',
    fontFamily: Fonts.subheading, fontSize: 11,
  },

  trainerCard: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18, overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.9)',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: 4,
  },
  trainerTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  trainerEyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3 },
  trainerPrice: {
    fontFamily: Fonts.subheading, fontSize: 15, color: Colors.text,
    lineHeight: 21, marginTop: 2,
  },
  trainerDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 10,
  },
  trainerRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 7,
  },
  trainerCheck: { fontFamily: Fonts.heading, fontSize: 13, marginTop: 1 },
  trainerLabel: { fontFamily: Fonts.subheading, fontSize: 13, color: Colors.text, marginBottom: 2 },
  trainerDesc: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted, lineHeight: 15 },

  featuresCard: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18, overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.9)',
    marginBottom: Spacing.lg,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: 12 },
  featureRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  featureIconWrap: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1 },
  featureLabel: { fontFamily: Fonts.subheading, fontSize: 13, color: Colors.text, marginBottom: 2 },
  featureDesc: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted },
  featureCheck: { fontFamily: Fonts.heading, fontSize: 14 },

  rcErrorBanner: { borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)', borderRadius: 10, padding: 10, marginBottom: 10, backgroundColor: 'rgba(255,140,0,0.06)' },
  rcErrorText: { fontFamily: Fonts.prose, fontSize: 11, color: 'rgba(255,140,0,0.8)', textAlign: 'center' },

  packages: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  packageCard: {
    flex: 1, backgroundColor: 'rgba(12,10,16,0.9)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 16, alignItems: 'center', gap: 4,
    overflow: 'hidden', position: 'relative',
  },
  packageTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  savingsBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  savingsText: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 1 },
  packageType: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2 },
  packagePrice: { fontFamily: Fonts.heading, fontSize: 22, lineHeight: 26 },
  packagePeriod: { fontFamily: Fonts.prose, fontSize: 10, color: Colors.textDim },
  packageEquiv: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 0.5, marginTop: 2 },
  selectedDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },

  trialRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: Spacing.md, padding: Spacing.md,
    borderWidth: 1, borderRadius: 12, overflow: 'hidden',
  },
  trialRune: { fontSize: 18, fontFamily: 'System' },
  trialHeadline: { fontFamily: Fonts.heading, fontSize: 13, letterSpacing: 0.3, marginBottom: 2 },
  trialNote: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
  founderNote: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textDim,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },

  ctaBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: Spacing.md, height: 64, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.gold, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20 },
  ctaShine: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  ctaInner: { alignItems: 'center', gap: 2 },
  ctaEyebrow: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 3, color: Colors.void, opacity: 0.6 },
  ctaText: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.void, letterSpacing: 2 },

  footer: { flexDirection: 'row', justifyContent: 'center', gap: 12, alignItems: 'center', marginBottom: Spacing.md },
  footerLink: { fontFamily: Fonts.prose, fontSize: 13, color: Colors.textMuted },
  footerDot: { color: Colors.textDim },

  legalNote: { fontFamily: Fonts.prose, fontSize: 10, color: Colors.textDim, textAlign: 'center', lineHeight: 16, marginBottom: Spacing.lg, paddingHorizontal: Spacing.md },
  bottomRunes: { fontFamily: 'System', fontSize: 13, letterSpacing: 10, textAlign: 'center', paddingBottom: Spacing.md },
});