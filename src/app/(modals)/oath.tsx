import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Alert, Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useWarriorStore } from '@/lib/store';
import { useWarriorProfile } from '@/lib/useWarriorProfile';
import {
  OATH_PRESETS,
  getActiveOath,
  swearOath,
  checkInOath,
  abandonOath,
  getOathDayCount,
  getOathProgress,
  type Oath,
  type OathPreset,
} from '@/lib/oaths';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const OATH_IMAGES = {
  warrior: require('@/assets/images/vikingoath.png'),
  shieldmaiden: require('@/assets/images/OATH-shieldmaiden.png'),
  longhouse: require('@/assets/images/longhouse-oath.png'),
  armring: require('@/assets/images/VIKINGARMRING.png'),
};

export default function OathScreen() {
  const { isPro, warrior } = useWarriorStore();
  const { isShieldmaiden } = useWarriorProfile();
  const [oath, setOath] = useState<Oath | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<OathPreset | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    loadOath();
  }, []));

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  async function loadOath() {
    setLoading(true);
    const active = await getActiveOath();
    setOath(active);
    setLoading(false);
  }

  function beginSwearing(preset: OathPreset) {
    setSelectedPreset(preset);
    setConfirming(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  async function confirmOath() {
    if (!selectedPreset) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newOath = await swearOath(selectedPreset, warrior?.name ?? 'Warrior');
    setOath(newOath);
    setConfirming(false);
    setSelectedPreset(null);
  }

  function cancelSwearing() {
    setConfirming(false);
    setSelectedPreset(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleCheckIn() {
    if (!oath) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated = await checkInOath(warrior?.name ?? 'Warrior');
    setOath(updated?.status === 'active' ? updated : null);

    if (updated?.status === 'fulfilled') {
      setTimeout(() => {
        Alert.alert(
          'Oath Fulfilled',
          `Your oath, "${updated.title}," is complete. Valhalla remembers warriors who keep their word.`,
          [{ text: 'Honor Earned', onPress: () => loadOath() }]
        );
      }, 300);
    }
  }

  function handleAbandon() {
    if (!oath) return;
    Alert.alert(
      'Break This Oath?',
      `You will abandon "${oath.title}" on day ${getOathDayCount(oath) + 1}. This cannot be undone.`,
      [
        { text: 'Stay True', style: 'cancel' },
        {
          text: 'Break the Oath',
          style: 'destructive',
          onPress: async () => {
            await abandonOath(warrior?.name ?? 'Warrior');
            setOath(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  }

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.14] });

  const alreadyCheckedInToday = oath
    ? oath.checkedInDates[oath.checkedInDates.length - 1] === getTodayLocal()
    : false;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0A0610', '#050508']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.topGlow, { opacity: glowOpacity }]} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← BACK</Text>
            </TouchableOpacity>
            <Text style={styles.eyebrow}>SWORN BEFORE THE JARL</Text>
            <Text style={styles.title}>THE OATH</Text>
          </View>

          {!isPro ? (
            <TouchableOpacity
              style={styles.proLockCard}
              onPress={() => router.push('/(modals)/paywall')}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['rgba(201,168,76,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
              <LinearGradient
                colors={['transparent', Colors.gold, 'transparent']}
                style={styles.proLockCardLine}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
              <View style={styles.proLockLeft}>
                <Text style={styles.proLockRune}>ᚲ</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.proLockTitle}>The Oath</Text>
                <Text style={styles.proLockSub}>
                  Swear before your crew. Unlock with Einherjar Pro.
                </Text>
              </View>
              <View style={styles.proLockBadge}>
                <Text style={styles.proLockBadgeText}>PRO</Text>
              </View>
            </TouchableOpacity>
          ) : confirming && selectedPreset ? (
            <View style={styles.ceremonyWrap}>
              <View style={styles.ceremonyImageWrap}>
                <LinearGradient
                  colors={['transparent', 'rgba(5,5,8,0.9)']}
                  style={styles.ceremonyImageFade}
                  pointerEvents="none"
                />
                <Image
                  source={isShieldmaiden ? OATH_IMAGES.shieldmaiden : OATH_IMAGES.warrior}
                  style={styles.ceremonyImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.ceremonyRune}>{selectedPreset.rune}</Text>
              <Text style={styles.ceremonyTitle}>{selectedPreset.title}</Text>
              <Text style={styles.ceremonyDesc}>{selectedPreset.description}</Text>

              <View style={styles.ceremonyDivider}>
                <View style={styles.ceremonyDividerLine} />
                <Text style={styles.ceremonyDividerRune}>ᛏ</Text>
                <View style={styles.ceremonyDividerLine} />
              </View>

              <Text style={styles.ceremonyWarning}>
                An oath sworn before your crew cannot be broken lightly. They will see your
                progress — and they will see if you fall.
              </Text>

              <Text style={styles.ceremonyQuestion}>
                Do you swear this oath, here, before the gods and your crew?
              </Text>

              <TouchableOpacity
                style={styles.swearBtn}
                onPress={confirmOath}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={[Colors.goldDark, Colors.gold]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <Text style={styles.swearBtnText}>I SWEAR THIS OATH</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={cancelSwearing} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Not yet</Text>
              </TouchableOpacity>
            </View>
          ) : oath ? (
            <View style={styles.activeOathWrap}>
              <View style={[styles.activeCard, { borderColor: `${Colors.gold}25` }]}>
                <LinearGradient colors={[`${Colors.gold}08`, 'transparent']} style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={['transparent', Colors.gold, 'transparent']}
                  style={styles.activeCardLine}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <Text style={styles.activeOathRune}>ᛏ</Text>
                <Text style={styles.activeEyebrow}>OATH SWORN</Text>
                <Text style={styles.activeTitle}>{oath.title}</Text>
                <Text style={styles.activeDesc}>{oath.description}</Text>

                <View style={styles.activeProgressTrack}>
                  <View style={[styles.activeProgressFill, { width: `${getOathProgress(oath) * 100}%` }]}>
                    <LinearGradient
                      colors={[Colors.goldDark, Colors.gold]}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    />
                  </View>
                </View>
                <Text style={styles.activeDayText}>
                  Day {getOathDayCount(oath)} of {oath.durationDays}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.checkInBtn, alreadyCheckedInToday && styles.checkInBtnDone]}
                onPress={handleCheckIn}
                disabled={alreadyCheckedInToday}
                activeOpacity={0.85}
              >
                {!alreadyCheckedInToday && (
                  <LinearGradient
                    colors={[Colors.goldDark, Colors.gold]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  />
                )}
                <Text style={[styles.checkInBtnText, alreadyCheckedInToday && styles.checkInBtnTextDone]}>
                  {alreadyCheckedInToday ? "✓ TODAY'S OATH KEPT" : 'CHECK IN — KEEP YOUR WORD'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleAbandon} style={styles.abandonBtn}>
                <Text style={styles.abandonBtnText}>Break this oath</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.longhouseImageWrap}>
                <LinearGradient
                  colors={['transparent', 'rgba(5,5,8,0.95)']}
                  style={styles.longhouseImageFade}
                  pointerEvents="none"
                />
                <Image
                  source={OATH_IMAGES.longhouse}
                  style={styles.longhouseImage}
                  resizeMode="cover"
                />
              </View>

              <Text style={styles.subtitle}>
                Choose your oath. Speak it before your crew. Keep it, or fall in their eyes.
              </Text>

              {OATH_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.presetCard, { borderColor: `${preset.color}30` }]}
                  onPress={() => beginSwearing(preset)}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={[`${preset.color}10`, 'transparent']} style={StyleSheet.absoluteFill} />
                  <LinearGradient
                    colors={['transparent', preset.color, 'transparent']}
                    style={styles.presetCardLine}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  />
                  <View style={styles.presetTopRow}>
                    <View style={[styles.presetRune, { borderColor: `${preset.color}40`, backgroundColor: `${preset.color}12` }]}>
                      <Text style={[styles.presetRuneText, { color: preset.color }]}>{preset.rune}</Text>
                    </View>
                    <View style={styles.presetInfo}>
                      <Text style={styles.presetTitle}>{preset.title}</Text>
                      <Text style={styles.presetDesc}>{preset.description}</Text>
                      <Text style={[styles.presetDuration, { color: preset.color }]}>{preset.durationDays} DAYS</Text>
                    </View>
                    <Text style={[styles.presetArrow, { color: preset.color }]}>→</Text>
                  </View>
                  <View style={[styles.stakesRow, { borderTopColor: `${preset.color}18` }]}>
                    <Text style={[styles.stakesIcon, { color: preset.color }]}>ᛏ</Text>
                    <Text style={styles.stakesText}>{preset.stakesLine}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          <View style={styles.bottomRunes}>
            <Text style={styles.bottomRuneText}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ</Text>
          </View>

        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

function getTodayLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 80 },

  topGlow: {
    position: 'absolute',
    top: -100, left: 20, right: 20,
    height: 300,
    backgroundColor: Colors.gold,
    borderRadius: 999,
    transform: [{ scaleY: 0.4 }],
    pointerEvents: 'none',
  },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8 },
  backBtnText: { fontFamily: Fonts.body, fontSize: 11, letterSpacing: 2, color: Colors.textMuted },
  eyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 4, color: 'rgba(201,168,76,0.5)', marginBottom: 4 },
  title: {
    fontFamily: Fonts.display, fontSize: 40, color: Colors.gold,
    letterSpacing: 3,
    textShadowColor: 'rgba(201,168,76,0.4)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24,
  },
  subtitle: {
    fontFamily: Fonts.proseItalic, fontSize: 13, color: Colors.textMuted,
    fontStyle: 'italic', paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, lineHeight: 20,
  },

  proLockCard: {
    marginHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.goldBorder,
    borderRadius: 16, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center',
    gap: 14, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.9)',
  },
  proLockCardLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  proLockLeft: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.goldMuted,
    borderWidth: 1, borderColor: Colors.goldBorder, alignItems: 'center', justifyContent: 'center',
  },
  proLockRune: { fontSize: 22, color: Colors.gold, fontFamily: 'System' },
  proLockTitle: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.gold, letterSpacing: 0.5, marginBottom: 4 },
  proLockSub: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  proLockBadge: {
    backgroundColor: Colors.goldMuted, borderWidth: 1, borderColor: Colors.goldBorder,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  proLockBadgeText: { fontFamily: Fonts.body, fontSize: 8, color: Colors.gold, letterSpacing: 1.5 },

  longhouseImageWrap: {
    width: '100%',
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    position: 'relative',
    alignSelf: 'center',
  },
  longhouseImage: { width: '100%', height: '100%' },
  longhouseImageFade: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '65%',
    zIndex: 1,
  },

  presetCard: {
    marginHorizontal: Spacing.lg, marginBottom: 10, borderWidth: 1,
    borderRadius: 16, overflow: 'hidden',
    backgroundColor: 'rgba(10,8,12,0.9)',
  },
  presetCardLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  presetTopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: Spacing.lg,
  },
  presetRune: {
    width: 46, height: 46, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  presetRuneText: { fontSize: 22, fontFamily: 'System' },
  presetInfo: { flex: 1, gap: 2 },
  presetTitle: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.text, letterSpacing: 0.5 },
  presetDesc: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
  presetDuration: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 1.5, marginTop: 3 },
  presetArrow: { fontFamily: Fonts.heading, fontSize: 18, opacity: 0.7 },
  stakesRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    borderTopWidth: 1,
  },
  stakesIcon: { fontSize: 13, fontFamily: 'System', opacity: 0.8 },
  stakesText: {
    flex: 1, fontFamily: Fonts.proseItalic, fontSize: 11,
    color: Colors.textDim, fontStyle: 'italic',
  },

  ceremonyWrap: { paddingHorizontal: Spacing.lg, alignItems: 'center', gap: 14 },
  ceremonyImageWrap: {
    width: '100%',
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 6,
    position: 'relative',
  },
  ceremonyImage: {
    width: '100%',
    height: '100%',
  },
  ceremonyImageFade: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '60%',
    zIndex: 1,
  },
  ceremonyRune: { fontSize: 48, color: Colors.gold, fontFamily: 'System', marginBottom: 4 },
  ceremonyTitle: {
    fontFamily: Fonts.heading, fontSize: 26, color: Colors.text,
    letterSpacing: 1, textAlign: 'center',
  },
  ceremonyDesc: {
    fontFamily: Fonts.proseItalic, fontSize: 14, color: Colors.textMuted,
    fontStyle: 'italic', textAlign: 'center', lineHeight: 21,
  },
  ceremonyDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '80%', marginVertical: 6 },
  ceremonyDividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(201,168,76,0.2)' },
  ceremonyDividerRune: { fontFamily: 'System', fontSize: 16, color: 'rgba(201,168,76,0.4)' },
  ceremonyWarning: {
    fontFamily: Fonts.prose, fontSize: 13, color: Colors.blood,
    textAlign: 'center', lineHeight: 20, opacity: 0.85,
  },
  ceremonyQuestion: {
    fontFamily: Fonts.heading, fontSize: 16, color: Colors.gold,
    textAlign: 'center', letterSpacing: 0.5, marginTop: 8, lineHeight: 24,
  },
  swearBtn: {
    width: '100%', borderRadius: 14, overflow: 'hidden', padding: Spacing.lg,
    alignItems: 'center', marginTop: 16,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  swearBtnText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.void, letterSpacing: 2 },
  cancelBtn: { paddingVertical: 12 },
  cancelBtnText: { fontFamily: Fonts.prose, fontSize: 13, color: Colors.textMuted },

  activeOathWrap: { paddingHorizontal: Spacing.lg, gap: 14 },
  activeCard: {
    borderWidth: 1, borderRadius: 20, padding: Spacing.lg, overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.95)', gap: 10,
  },
  activeCardLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  activeOathRune: { fontSize: 32, color: Colors.gold, fontFamily: 'System', alignSelf: 'center', marginBottom: 6, opacity: 0.8 },
  activeEyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, color: 'rgba(201,168,76,0.6)' },
  activeTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text, letterSpacing: 0.5 },
  activeDesc: { fontFamily: Fonts.proseItalic, fontSize: 13, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 19 },
  activeProgressTrack: {
    height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: 6,
  },
  activeProgressFill: { height: '100%', borderRadius: 4, overflow: 'hidden' },
  activeDayText: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.gold, letterSpacing: 0.5 },

  checkInBtn: {
    borderRadius: 14, overflow: 'hidden', padding: Spacing.lg, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.goldBorder,
  },
  checkInBtnDone: { borderColor: 'rgba(76,175,80,0.3)', backgroundColor: 'rgba(76,175,80,0.06)' },
  checkInBtnText: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.void, letterSpacing: 1.5 },
  checkInBtnTextDone: { color: '#4CAF50' },

  abandonBtn: { alignItems: 'center', paddingVertical: 10 },
  abandonBtnText: { fontFamily: Fonts.body, fontSize: 11, color: Colors.blood, letterSpacing: 1, opacity: 0.6 },

  bottomRunes: { alignItems: 'center', paddingVertical: Spacing.lg },
  bottomRuneText: { fontFamily: 'System', fontSize: 13, color: 'rgba(201,168,76,0.08)', letterSpacing: 10 },
});