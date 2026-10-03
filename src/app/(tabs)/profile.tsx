import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, TextInput, Alert, Linking, Image, Keyboard,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useWarriorStore } from '@/lib/store';
import { getRank, RANKS, getRankTitle, getRankDescription } from '@/constants/ranks';
import { getRealm, NINE_REALMS } from '@/constants/realms';
import { useWarriorProfile } from '@/lib/useWarriorProfile';
import { restorePurchases } from '@/lib/purchases';
import {
  getLatestWeight, getWeightChange, getAllTimeWeightChange, logWeight,
  getLatestMeasurement, getMeasurementChange, logMeasurement,
  type BodyMeasurement,
} from '@/lib/db';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';


const { width } = Dimensions.get('window');

// How many ranks to show on either side of the current one before the
// rank path collapses behind a "View Full Path" toggle — keeps the list
// from rendering every single rank (locked ones included) by default.
const RANK_WINDOW = 2;

const HAVAMOL_PREVIEW = [
  'Cattle die. Kinsmen die. One day you too will die. But the fame of a good man never dies.',
  'Fire needs fire to be kindled. Man needs man to be a man. Iron sharpens iron.',
  'Better a house of your own, though small it may be. Each man is master at home.',
  'The generous and bold man lives the best life and seldom nurses grief.',
  'Only a fool lies awake all night worrying. When morning comes the trouble is just as it was.',
];

const DAILY_SAGAS = [
  {
    saga: 'Egils Saga',
    chapter: 'Ch. 55',
    rune: 'ᛖ',
    image: require('@/assets/images/saga_egil_vinhedr.png'),
    text: 'At the Battle of Vinheðr, Egil stood alone against the army of Erik Bloodaxe. Outnumbered and cut off from his men, he fought through the line and walked off the field alive.',
    application: 'Show up even when the conditions are not right.',
  },
  {
    saga: 'Völsunga Saga',
    chapter: 'Ch. 18',
    rune: 'ᚹ',
    image: require('@/assets/images/saga_sigurd_flame.png'),
    text: 'When Sigurd rode through the wall of flame to reach Brynhildr, he did not slow his horse. He had sworn to do it and so he did it. The saga records simply that he rode in.',
    application: 'The oath matters more than the fear.',
  },
  {
    saga: 'Grettis Saga',
    chapter: 'Ch. 35',
    rune: 'ᚷ',
    image: require('@/assets/images/saga_grettir_glamr.png'),
    text: 'Grettir wrestled Glámr the undead revenant alone in the dark, though every man before him had fled. He was thrown and lost ground — but he would not release his grip.',
    application: 'Losing ground is not the same as losing.',
  },
  {
    saga: 'Njáls Saga',
    chapter: 'Ch. 77',
    rune: 'ᚾ',
    image: require('@/assets/images/saga_gunnar_prepare.png'),
    text: 'Gunnar of Hlíðarendi was the finest warrior in Iceland. When asked his secret, he said he made sure he was never in a fight he had not prepared for.',
    application: 'Confidence is built before the moment, not during it.',
  },
  {
    saga: 'Heimskringla',
    chapter: 'Óláfs Saga Ch. 208',
    rune: 'ᚺ',
    image: require('@/assets/images/saga_olaf_stiklastadir.png'),
    text: 'At the Battle of Stiklastaðir, Óláfr was struck by three weapons. He did not fall until the third blow. His men remembered not that he fell, but how long he stood.',
    application: 'How you carry yourself under pressure is what people remember.',
  },
  {
    saga: 'Laxdæla Saga',
    chapter: 'Ch. 49',
    rune: 'ᛚ',
    image: require('@/assets/images/saga_kjartan_training.png'),
    text: 'Kjartan Ólafsson was said to be the most accomplished man of his generation — swimmer, swordsman, skald. He trained every discipline as if each were the only one that mattered.',
    application: 'Excellence in one thing is a habit that transfers.',
  },
  {
    saga: 'Egils Saga',
    chapter: 'Ch. 78',
    rune: 'ᛖ',
    image: require('@/assets/images/saga_egil_grief.png'),
    text: 'After the death of his son Böðvarr, Egil locked himself away and refused food for three days. His daughter Þorgerðr sat beside him and refused to eat either — until he chose to live and write the poem Sonatorrek instead.',
    application: 'Grief is real. So is the choice to turn it into something.',
  },
  {
    saga: 'Grettis Saga',
    chapter: 'Ch. 57',
    rune: 'ᚷ',
    image: require('@/assets/images/saga_grettir_drangey.png'),
    text: 'Grettir spent 19 years outlawed and hunted across Iceland. He never stopped training. When men finally cornered him on Drangey island, he was still the strongest man they had ever faced.',
    application: 'Isolation is not an excuse to stop becoming.',
  },
  {
    saga: 'Hrafnkels Saga',
    chapter: 'Ch. 6',
    rune: 'ᚺ',
    image: require('@/assets/images/saga_hrafnkell_R.png'),
    text: 'After Hrafnkell was defeated, stripped of his farm, and publicly humiliated, he started over on worse land with fewer men. Within years he had rebuilt everything. His enemies became afraid of him again.',
    application: 'Starting over from nothing is still starting.',
  },
  {
    saga: 'Njáls Saga',
    chapter: 'Ch. 45',
    rune: 'ᚾ',
    image: require('@/assets/images/saga_njall_counsel.png'),
    text: 'Njáll could not grow a beard and was mocked for it his whole life. He was not a warrior. But no man in Iceland gave better counsel, and the saga records that his words saved more lives than swords did.',
    application: 'Strength takes more than one shape.',
  },
  {
    saga: 'Völsunga Saga',
    chapter: 'Ch. 20',
    rune: 'ᚹ',
    imageOffset: -55,
    image: require('@/assets/images/saga_sigurd_birds.png'),
    text: "After slaying Fáfnir, Sigurd tasted the dragon's blood and gained the speech of birds. The birds warned him of danger ahead. He listened. The saga marks this as the moment a great warrior became a wise one.",
    application: 'Winning a battle means nothing if you stop paying attention afterward.',
  },
  {
    saga: 'Egils Saga',
    chapter: 'Ch. 40',
    rune: 'ᛖ',
    image: require('@/assets/images/saga_egil_night_verse.png'),
    text: 'Before the Battle of Vinheðr, Egil composed verse in the night rather than sleeping. The saga notes he arrived at the field clear-headed while other men arrived anxious. He had already settled his mind before the fighting began.',
    application: 'Prepare your mind the night before, not the morning of.',
  },
  {
    saga: 'Heimskringla',
    chapter: 'Ynglinga Saga Ch. 6',
    rune: 'ᚺ',
    image: require('@/assets/images/saga_odin_knowledge.png'),
    text: "Snorri writes that Óðinn's power over enemies came not from sorcery alone but from knowing them — their fears, their weaknesses, their habits — better than they knew themselves.",
    application: 'Study your opposition. Knowledge is the original weapon.',
  },
  {
    saga: 'Grettis Saga',
    chapter: 'Ch. 19',
    rune: 'ᚷ',
    image: require('@/assets/images/saga_grettir_bear.png'),
    text: 'When Grettir killed the bear that had been terrorizing the farm at Haramsey, he did it alone and without being asked. No reward was promised. The saga notes simply that it needed doing and he was there.',
    application: 'Do the hard thing because it needs doing, not because someone is watching.',
  },
  {
    saga: 'Laxdæla Saga',
    chapter: 'Ch. 28',
    rune: 'ᛚ',
    image: require('@/assets/images/saga_olafr_hall.png'),
    text: "Óláfr the Peacock built the finest hall in Iceland despite being born a slave's son. Every man who saw it said it should not have been possible. The saga records that he built it anyway and made no comment on what others said.",
    application: 'Where you started has nothing to do with where you build.',
  },
];

function DailySagaCard({ accentColor }: { accentColor: string }) {
   const dayIndex = (new Date().getDate() - 1) % DAILY_SAGAS.length;

  const entry = DAILY_SAGAS[dayIndex];

  return (
    <View style={styles.sagaCard}>
      <LinearGradient
        colors={['rgba(139,26,26,0.10)', 'rgba(201,168,76,0.05)', 'transparent']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', Colors.gold, 'transparent']}
        style={styles.sagaTopLine}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      />
      <View style={styles.sagaHeaderRow}>
        <View style={styles.sagaRuneWrap}>
          <Text style={styles.sagaRune}>{entry.rune}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sagaEyebrow}>SAGA OF THE DAY</Text>
          <Text style={styles.sagaName}>{entry.saga}</Text>
          <Text style={styles.sagaChapter}>{entry.chapter}</Text>
        </View>
        <View style={styles.sagaDayWrap}>
          <Text style={[styles.sagaDayNum, { color: accentColor }]}>
            {new Date().getDate()}
          </Text>
          <Text style={styles.sagaDayLabel}>TODAY</Text>
        </View>
      </View>
      <View style={styles.sagaDivider} />
      {entry.image && (
        <View style={styles.sagaImageWrap}>
          <Image
            source={entry.image}
            style={[styles.sagaImage, entry.imageOffset ? { top: entry.imageOffset } : null]}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(10,8,14,0.95)']}
            style={styles.sagaImageFade}
          />
        </View>
      )}
      <Text style={styles.sagaText}>{entry.text}</Text>
      <View style={[styles.sagaApplicationWrap, { borderLeftColor: accentColor }]}>
        <Text style={styles.sagaApplicationLabel}>THE LESSON</Text>
        <Text style={[styles.sagaApplication, { color: accentColor }]}>
          {entry.application}
        </Text>
      </View>
    </View>
  );
}

// A single drifting ember — rises slowly from near the bottom of the hero
// card, wobbling slightly side to side, fading in then out, then resets
// and repeats on its own loop. Several of these with staggered delays and
// durations give the embers an unsynced, natural feel instead of a single
// obvious repeating animation.
function FireEmber({ delay, duration, left, size, color }: {
  delay: number; duration: number; left: `${number}%`; size: number; color: string;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [0, -100]);
    const translateX = Math.sin(progress.value * Math.PI * 2) * 5;
    const opacity = interpolate(progress.value, [0, 0.15, 0.7, 1], [0, 0.5, 0.3, 0]);
    return { opacity, transform: [{ translateY }, { translateX }] };
  });

  return (
    <Reanimated.View
      pointerEvents="none"
      style={[
        styles.fireEmber,
        { left, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

export default function ProfileScreen() {
  const { warrior, isPro, setName, setPro, workoutCount } = useWarriorStore();
  const { isShieldmaiden } = useWarriorProfile();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(warrior?.name ?? '');
  const [selectedRune, setSelectedRune] = useState<string | null>(null);

  // Weight & Measurements — mirrors the same functions Mead Hall and the
  // Goals screen already use for weight, so numbers shown here always
  // agree with what's shown there.
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [weightChange, setWeightChange] = useState<number | null>(null);
  const [allTimeWeightChange, setAllTimeWeightChange] = useState<number | null>(null);
  const [latestMeasurement, setLatestMeasurement] = useState<BodyMeasurement | null>(null);
  const [measurementChange, setMeasurementChange] = useState<Record<string, number | null>>({});
  const [showBodyLogForm, setShowBodyLogForm] = useState(false);
  const [logWeightInput, setLogWeightInput] = useState('');
  const [logChest, setLogChest] = useState('');
  const [logWaist, setLogWaist] = useState('');
  const [logHips, setLogHips] = useState('');
  const [logArms, setLogArms] = useState('');
  const [logThighs, setLogThighs] = useState('');
  const [logBodyFat, setLogBodyFat] = useState('');
  const [showFullRankPath, setShowFullRankPath] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const xp = warrior?.total_xp ?? 0;
  const rank = getRank(xp);
  const realm = getRealm(xp);
  const accentColor = isShieldmaiden ? '#D4A8C4' : Colors.gold;

  // Compact "Explore" tile row — Nine Realms, Valkyrie Codex, and Hávamál
  // used to each render as their own full-width card with near-identical
  // icon+title+subtitle+arrow layout. Collapsed into one horizontal scroll
  // row so the page doesn't stack four look-alike navigation cards.
  const EXPLORE_TILES = [
    {
      label: 'Nine Realms',
      sub: `Now walking ${realm.name}`,
      icon: realm.rune,
      color: realm.color,
      action: () => router.push('/(modals)/nine-realms' as any),
    },
    ...(isShieldmaiden ? [{
      label: 'Valkyrie Codex',
      sub: 'Eight legendary Norse women',
      icon: 'ᚱ',
      color: '#D4A8C4',
      action: () => router.push('/(modals)/valkyrie-codex' as any),
    }] : []),
    {
      label: 'Hávamál',
      sub: `${Math.max(3, Math.min(workoutCount, 164))} verses unlocked`,
      icon: 'ᚺ',
      color: Colors.gold,
      action: () => router.push('/(modals)/havamol' as any),
    },
  ];

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  // Hero card micro-animations — a breathing glow on the rune medallion, a
  // slow light sweep across the card's glass surface, and a brief tap
  // bounce. All run on the UI thread via Reanimated so they stay smooth
  // even while the rest of the screen is busy.
  const iconGlowShadow = useSharedValue(0.4);
  const iconScale = useSharedValue(1);
  const rankUpFlash = useSharedValue(0);

  useEffect(() => {
    iconGlowShadow.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  // If Valor has gone up since the last time this screen was opened, give
  // the card a brief gold flash + success haptic — a small "you earned
  // this" moment instead of the number just silently being higher.
  useEffect(() => {
    AsyncStorage.getItem('valhalla_last_seen_xp').then((stored) => {
      const lastXp = stored ? parseInt(stored, 10) : null;
      if (lastXp !== null && xp > lastXp) {
        rankUpFlash.value = withSequence(
          withTiming(0.35, { duration: 220 }),
          withTiming(0, { duration: 900 }),
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      AsyncStorage.setItem('valhalla_last_seen_xp', String(xp));
    });
  }, [xp]);

  function onIconPressIn() {
    iconScale.value = withTiming(0.92, { duration: 100 });
  }
  function onIconPressOut() {
    iconScale.value = withTiming(1, { duration: 180 });
  }

  const iconGlowAnimatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: iconGlowShadow.value,
    transform: [{ scale: iconScale.value }],
  }));
  const rankUpFlashStyle = useAnimatedStyle(() => ({
    opacity: rankUpFlash.value,
  }));

  function loadBodyStats() {
    const latest = getLatestWeight();
    setLatestWeight(latest?.weight ?? null);
    setWeightChange(getWeightChange(30));
    setAllTimeWeightChange(getAllTimeWeightChange());
    setLatestMeasurement(getLatestMeasurement());
    setMeasurementChange(getMeasurementChange(30));
  }

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('valhalla_rune').then(val => {
      if (val) setSelectedRune(val);
    });
    loadBodyStats();
  }, []));

  // Saves whatever fields were actually filled in — weight and each
  // measurement are independently optional, since someone might only
  // want to log their waist today, not the full set.
  function saveBodyStats() {
    const w = parseFloat(logWeightInput);
    const c = parseFloat(logChest);
    const wa = parseFloat(logWaist);
    const h = parseFloat(logHips);
    const a = parseFloat(logArms);
    const t = parseFloat(logThighs);
    const bf = parseFloat(logBodyFat);

    const hasWeight = !isNaN(w) && w > 0;
    const hasAnyMeasurement = [c, wa, h, a, t, bf].some(v => !isNaN(v) && v > 0);

    if (!hasWeight && !hasAnyMeasurement) {
      Alert.alert('Nothing to log', 'Enter at least one value.');
      return;
    }

    if (hasWeight) logWeight(w);
    if (hasAnyMeasurement) {
      logMeasurement(
        !isNaN(c) && c > 0 ? c : null,
        !isNaN(wa) && wa > 0 ? wa : null,
        !isNaN(h) && h > 0 ? h : null,
        !isNaN(a) && a > 0 ? a : null,
        !isNaN(t) && t > 0 ? t : null,
        !isNaN(bf) && bf > 0 ? bf : null,
      );
    }

    setLogWeightInput(''); setLogChest(''); setLogWaist('');
    setLogHips(''); setLogArms(''); setLogThighs(''); setLogBodyFat('');
    setShowBodyLogForm(false);
    Keyboard.dismiss();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    loadBodyStats();
  }

  function saveName() {
    if (!nameInput.trim()) return;
    setName(nameInput.trim());
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const SETTINGS = [
    { label: 'Your Saga', icon: 'ᛋ', action: () => router.push('/(tabs)/sagas' as any) },
    { label: 'Workout History', icon: 'ᛉ', action: () => router.push('/(modals)/workout-history' as any) },
    { label: 'Achievements', icon: 'ᚹ', action: () => router.push('/(modals)/achievements-hall' as any) },
    { label: 'Hall of Legends', icon: 'ᛚ', action: () => router.push('/(modals)/hall-of-legends' as any) },
    { label: 'The Crew', icon: 'ᚢ', action: () => router.push('/(tabs)/crew' as any) },
    { label: 'My Rune', icon: 'ᛟ', action: () => router.push('/(modals)/character-creator' as any) },
    { label: 'Gear Guide', icon: 'ᚦ', action: () => router.push('/(modals)/gear-guide' as any) },
    ...(isShieldmaiden ? [
      { label: 'Valkyrie Codex', icon: 'ᚱ', action: () => router.push('/(modals)/valkyrie-codex' as any) },
      { label: "Freya's Wardrobe", icon: 'ᛈ', action: () => router.push('/(modals)/valkyrie-aesthetic' as any) },
    ] : []),
    { label: "Odin's Wisdom", icon: 'ᚺ', action: () => router.push('/(modals)/havamol' as any) },
    { label: 'Notifications', icon: 'ᛜ', action: () => router.push('/(modals)/notifications' as any) },
    {
      label: 'Restore Purchases',
      icon: 'ᚾ',
      action: async () => {
        try {
          const success = await restorePurchases();
          if (success) {
            setPro(true);
            Alert.alert('Restored', 'Your Pro access has been restored.');
          } else {
            Alert.alert('Nothing to Restore', 'No active Pro subscription found.');
          }
        } catch (e) {
          Alert.alert('Error', 'Could not restore purchases. Try again.');
        }
      },
    },
    { label: 'Privacy Policy', icon: 'ᛃ', action: () => Linking.openURL('https://elijah433.github.io/valhalla-bound-legal') },
    { label: 'Terms of Service', icon: 'ᛗ', action: () => Linking.openURL('https://elijah433.github.io/valhalla-bound-legal/terms.html') },
  ];


  return (
    <View style={styles.root}>
      <LinearGradient colors={["#0C0A10", "#050508"]} style={StyleSheet.absoluteFill} />
      <Text style={styles.watermark}>ᛟ</Text>

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>{isShieldmaiden ? 'VALKYRIE' : 'WARRIOR'}</Text>
              <Text style={styles.title}>PROFILE</Text>
            </View>
          </View>

          {/* Hero card */}
          <View style={styles.heroCardOuterGlow}>
          <View style={[styles.heroCard, { borderColor: `${accentColor}40` }]}>
            <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient colors={[`${accentColor}14`, 'transparent', `${accentColor}08`]} style={StyleSheet.absoluteFill} />
            <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.gold, borderRadius: 18 }, rankUpFlashStyle]} pointerEvents="none" />

            {/* Drifting fire embers — subtle, staggered, never synced */}
            <View style={styles.fireEmbersLayer} pointerEvents="none">
              <FireEmber delay={0} duration={4600} left="10%" size={3} color="#FF9D4D" />
              <FireEmber delay={1100} duration={5300} left="26%" size={2} color={Colors.gold} />
              <FireEmber delay={2200} duration={4900} left="46%" size={3.5} color="#FF8142" />
              <FireEmber delay={500} duration={5500} left="64%" size={2.5} color="#FFB347" />
              <FireEmber delay={1700} duration={4700} left="80%" size={2.5} color="#FF9D4D" />
              <FireEmber delay={2900} duration={5100} left="93%" size={2} color={Colors.gold} />
            </View>

            <LinearGradient colors={['transparent', accentColor, 'transparent']} style={styles.heroTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']} style={styles.heroGlassHighlight} pointerEvents="none" />
            <View style={[styles.heroInsetBorder, { borderColor: `${accentColor}18` }]} pointerEvents="none" />

            {/* HUD-style corner brackets */}
            <View style={[styles.heroCornerTL, { borderColor: accentColor }]} pointerEvents="none" />
            <View style={[styles.heroCornerTR, { borderColor: accentColor }]} pointerEvents="none" />
            <View style={[styles.heroCornerBL, { borderColor: accentColor }]} pointerEvents="none" />
            <View style={[styles.heroCornerBR, { borderColor: accentColor }]} pointerEvents="none" />

            <Reanimated.View style={[styles.heroIconGlowWrap, { shadowColor: accentColor }, iconGlowAnimatedStyle]}>
              <TouchableOpacity
                style={[styles.heroIconWrap, { borderColor: `${accentColor}55` }]}
                onPress={() => router.push('/(modals)/character-creator' as any)}
                onPressIn={onIconPressIn}
                onPressOut={onIconPressOut}
                activeOpacity={0.85}
              >
                <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
                <LinearGradient colors={[`${accentColor}22`, `${accentColor}08`]} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']} style={styles.iconGlassShine} pointerEvents="none" />
                <View style={[styles.iconInsetRing, { borderColor: `${accentColor}35` }]} pointerEvents="none" />
                <Text style={[styles.heroIcon, { color: accentColor }]}>{selectedRune ?? rank.icon}</Text>
              </TouchableOpacity>
            </Reanimated.View>

            {editing ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  maxLength={20}
                  placeholderTextColor={Colors.textMuted}
                  placeholder="Your name"
                  autoCapitalize="words"
                  onSubmitEditing={saveName}
                />
                <TouchableOpacity style={styles.saveBtn} onPress={saveName}>
                  <LinearGradient
                    colors={isShieldmaiden ? ['#3D1A35', '#D4A8C4'] : [Colors.goldDark, Colors.gold]}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.saveBtnText}>SAVE</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.nameRow}
                onPress={() => { setEditing(true); setNameInput(warrior?.name ?? ''); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Text style={[styles.heroName, { textShadowColor: `${accentColor}80` }]}>{warrior?.name ?? 'Warrior'}</Text>
                <Text style={styles.editIcon}>✎</Text>
              </TouchableOpacity>
            )}

            <View style={styles.badgeRow}>
              <View style={[styles.rankBadge, { borderColor: `${accentColor}45`, backgroundColor: `${accentColor}14` }]}>
                <LinearGradient colors={[`${accentColor}20`, 'transparent']} style={StyleSheet.absoluteFill} />
                <Text style={[styles.rankBadgeText, { color: accentColor }]}>{getRankTitle(rank, isShieldmaiden).toUpperCase()}</Text>
              </View>
              {isPro && (
                <View style={styles.proBadge}>
                  <LinearGradient colors={['rgba(201,168,76,0.22)', 'rgba(201,168,76,0.06)']} style={StyleSheet.absoluteFill} />
                  <Text style={styles.proBadgeText}>✦ PRO</Text>
                </View>
              )}
              {isShieldmaiden && (
                <View style={styles.valkBadge}>
                  <Text style={styles.valkBadgeText}>ᚱ VALKYRIE</Text>
                </View>
              )}
            </View>

            <View style={[styles.heroDivider, { backgroundColor: `${accentColor}20` }]} />

            {allTimeWeightChange !== null && (
              <View style={styles.progressStatWrap}>
                <Text style={styles.progressStatLabel}>PROGRESS</Text>
                <Text style={[styles.progressStatValue, {
                  color: allTimeWeightChange < 0 ? '#4CAF50' : allTimeWeightChange > 0 ? Colors.blood : Colors.textMuted,
                }]}>
                  {Math.abs(allTimeWeightChange).toFixed(1)} lbs {allTimeWeightChange < 0 ? 'lost' : allTimeWeightChange > 0 ? 'gained' : ''}
                </Text>
              </View>
            )}

            <Text style={styles.rankDesc}>{getRankDescription(rank, isShieldmaiden)}</Text>

            <View style={styles.xpRow}>
              <Text style={[styles.xpNum, { color: accentColor }]}>{xp.toLocaleString()}</Text>
              <Text style={styles.xpLabel}> VALOR</Text>
            </View>

            <TouchableOpacity
              style={[styles.buildAvatarBtn, { borderColor: `${accentColor}25` }]}
              onPress={() => router.push('/(modals)/character-creator' as any)}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[`${accentColor}08`, 'transparent']} style={StyleSheet.absoluteFill} />
              <Text style={[styles.buildAvatarText, { color: accentColor }]}>
                {selectedRune ? 'ᛟ  Change Your Rune  →' : 'ᛟ  Choose Your Rune  →'}
              </Text>
            </TouchableOpacity>
          </View>
          </View>

          {/* Rank path */}
          {/* Weight & Measurements — combined card, same pattern as
              MyFitnessPal's "Weight & Measurements" section. Reuses the
              exact weight functions Mead Hall and Goals already rely on,
              so this always agrees with what's shown there. */}
          <View style={styles.bodyStatsCard}>
            <LinearGradient colors={['rgba(139,111,212,0.06)', 'transparent']} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['transparent', '#8B6FD4', 'transparent']} style={styles.bodyStatsTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <Text style={styles.bodyStatsTitle}>WEIGHT & MEASUREMENTS</Text>

            <View style={styles.bodyStatsRow}>
              <View style={styles.bodyStatsStat}>
                <Text style={styles.bodyStatsLabel}>WEIGHT</Text>
                <Text style={styles.bodyStatsValue}>
                  {latestWeight !== null ? latestWeight : '—'}
                  <Text style={styles.bodyStatsUnit}> lbs</Text>
                </Text>
                {weightChange !== null && (
                  <Text style={[styles.bodyStatsChange, {
                    color: weightChange < 0 ? '#4CAF50' : weightChange > 0 ? Colors.blood : Colors.textMuted,
                  }]}>
                    {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} / 30d
                  </Text>
                )}
              </View>

              {[
                { key: 'chest', label: 'CHEST', unit: 'in' },
                { key: 'waist', label: 'WAIST', unit: 'in' },
                { key: 'arms', label: 'ARMS', unit: 'in' },
                { key: 'body_fat', label: 'BODY FAT', unit: '%' },
              ].map((m) => {
                const val = latestMeasurement?.[m.key as keyof BodyMeasurement] as number | null | undefined;
                const change = measurementChange[m.key];
                return (
                  <View key={m.key} style={styles.bodyStatsStat}>
                    <Text style={styles.bodyStatsLabel}>{m.label}</Text>
                    <Text style={styles.bodyStatsValue}>
                      {val != null ? val : '—'}
                      <Text style={styles.bodyStatsUnit}> {m.unit}</Text>
                    </Text>
                    {change !== null && change !== undefined && (
                      <Text style={[styles.bodyStatsChange, {
                        color: change < 0 ? '#4CAF50' : change > 0 ? Colors.blood : Colors.textMuted,
                      }]}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)} / 30d
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            {!showBodyLogForm ? (
              <TouchableOpacity
                style={styles.bodyStatsLogBtn}
                onPress={() => { setShowBodyLogForm(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                activeOpacity={0.85}
              >
                <Text style={styles.bodyStatsLogBtnText}>+ Log Weight & Measurements</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.bodyStatsForm}>
                <View style={styles.bodyStatsFormRow}>
                  <View style={styles.bodyStatsFormField}>
                    <Text style={styles.bodyStatsFormLabel}>WEIGHT (lbs)</Text>
                    <TextInput style={styles.bodyStatsFormInput} value={logWeightInput} onChangeText={setLogWeightInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textDim} />
                  </View>
                  <View style={styles.bodyStatsFormField}>
                    <Text style={styles.bodyStatsFormLabel}>CHEST (in)</Text>
                    <TextInput style={styles.bodyStatsFormInput} value={logChest} onChangeText={setLogChest} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textDim} />
                  </View>
                </View>
                <View style={styles.bodyStatsFormRow}>
                  <View style={styles.bodyStatsFormField}>
                    <Text style={styles.bodyStatsFormLabel}>WAIST (in)</Text>
                    <TextInput style={styles.bodyStatsFormInput} value={logWaist} onChangeText={setLogWaist} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textDim} />
                  </View>
                  <View style={styles.bodyStatsFormField}>
                    <Text style={styles.bodyStatsFormLabel}>HIPS (in)</Text>
                    <TextInput style={styles.bodyStatsFormInput} value={logHips} onChangeText={setLogHips} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textDim} />
                  </View>
                </View>
                <View style={styles.bodyStatsFormRow}>
                  <View style={styles.bodyStatsFormField}>
                    <Text style={styles.bodyStatsFormLabel}>ARMS (in)</Text>
                    <TextInput style={styles.bodyStatsFormInput} value={logArms} onChangeText={setLogArms} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textDim} />
                  </View>
                  <View style={styles.bodyStatsFormField}>
                    <Text style={styles.bodyStatsFormLabel}>THIGHS (in)</Text>
                    <TextInput style={styles.bodyStatsFormInput} value={logThighs} onChangeText={setLogThighs} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textDim} />
                  </View>
                </View>
                <View style={styles.bodyStatsFormRow}>
                  <View style={styles.bodyStatsFormField}>
                    <Text style={styles.bodyStatsFormLabel}>BODY FAT (%)</Text>
                    <TextInput style={styles.bodyStatsFormInput} value={logBodyFat} onChangeText={setLogBodyFat} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textDim} />
                  </View>
                  <View style={styles.bodyStatsFormField} />
                </View>
                <Text style={styles.bodyStatsFormHint}>Leave any field blank to skip it today.</Text>
                <View style={styles.bodyStatsFormBtnRow}>
                  <TouchableOpacity style={styles.bodyStatsCancelBtn} onPress={() => { setShowBodyLogForm(false); Keyboard.dismiss(); }}>
                    <Text style={styles.bodyStatsCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bodyStatsSaveBtn} onPress={saveBodyStats}>
                    <Text style={styles.bodyStatsSaveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <Text style={styles.sectionLabel}>PATH TO VALHALLA</Text>
          <View style={styles.rankPath}>
            {(() => {
              const ranked = RANKS.map((r, i) => ({ r, i }));
              const visible = showFullRankPath
                ? ranked
                : ranked.filter(({ i }) => Math.abs(i - rank.index) <= RANK_WINDOW);
              return visible.map(({ r, i }, idx) => {
                const reached = i <= rank.index;
                const isCurrent = i === rank.index;
                const isLastVisible = idx === visible.length - 1;
                return (
                  <View key={r.title} style={styles.rankPathRow}>
                    <View style={styles.rankPathLeft}>
                      <View style={[
                        styles.rankPathDot,
                        reached && { backgroundColor: isShieldmaiden ? '#8B3A6A' : Colors.goldDark, borderColor: accentColor },
                        isCurrent && { backgroundColor: accentColor, borderColor: accentColor },
                      ]}>
                        {isCurrent && <View style={styles.rankPathDotInner} />}
                      </View>
                      {!isLastVisible && (
                        <View style={[styles.rankPathLine, reached && i < rank.index && { backgroundColor: isShieldmaiden ? '#8B3A6A' : Colors.goldDark }]} />
                      )}
                    </View>
                    <View style={[styles.rankPathCard, isCurrent && { borderColor: `${accentColor}40` }]}>
                      {isCurrent && <LinearGradient colors={[`${accentColor}07`, 'transparent']} style={StyleSheet.absoluteFill} />}
                      <View style={styles.rankPathCardLeft}>
                    <Text style={[styles.rankPathIcon, { color: reached ? accentColor : 'rgba(255,255,255,0.35)' }]}>{r.icon}</Text>
                        <View>
                          <Text style={[styles.rankPathName, isCurrent && { color: accentColor }, !reached && styles.rankPathNameLocked]}>
                            {getRankTitle(r, isShieldmaiden).toUpperCase()}
                          </Text>
                          <Text style={styles.rankPathXP}>{r.minXP.toLocaleString()} VALOR</Text>
                        </View>
                      </View>
                      {isCurrent && (
                        <View style={[styles.currentBadge, { backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }]}>
                          <Text style={[styles.currentBadgeText, { color: accentColor }]}>NOW</Text>
                        </View>
                      )}
                      {reached && !isCurrent && <Text style={[styles.checkmark, { color: accentColor }]}>✓</Text>}
                      {!reached && <Text style={styles.lockIcon}>ᚲ</Text>}
                    </View>
                  </View>
                );
              });
            })()}
            {RANKS.length > RANK_WINDOW * 2 + 1 && (
              <TouchableOpacity
                style={styles.rankPathToggle}
                onPress={() => { setShowFullRankPath(v => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.rankPathToggleText, { color: accentColor }]}>
                  {showFullRankPath ? '↑  Show Fewer Ranks' : `↓  View Full Path (${RANKS.length} Ranks)`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── EXPLORE — compact tile row ──
              Nine Realms, Valkyrie Codex, and Hávamál collapsed from three
              full-width teaser cards into one horizontal scroll row. */}
          <Text style={styles.sectionLabel}>EXPLORE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.exploreRow}
            contentContainerStyle={styles.exploreRowContent}
          >
            {EXPLORE_TILES.map((tile) => (
              <TouchableOpacity
                key={tile.label}
                style={[styles.exploreTile, { borderColor: `${tile.color}30` }]}
                onPress={tile.action}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[`${tile.color}10`, 'transparent']} style={StyleSheet.absoluteFill} />
                <View style={[styles.exploreTileIconWrap, { borderColor: `${tile.color}40`, backgroundColor: `${tile.color}12` }]}>
                  <Text style={[styles.exploreTileIcon, { color: tile.color }]}>{tile.icon}</Text>
                </View>
                <Text style={[styles.exploreTileLabel, { color: tile.color }]}>{tile.label}</Text>
                <Text style={styles.exploreTileSub} numberOfLines={2}>{tile.sub}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Upgrade or Pro card */}
          {!isPro ? (
            <TouchableOpacity style={styles.upgradeCard} onPress={() => router.push('/(modals)/paywall')} activeOpacity={0.85}>
              <LinearGradient colors={['rgba(201,168,76,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', Colors.gold, 'transparent']} style={styles.upgradeTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              <Text style={[styles.upgradeIcon, { color: accentColor, fontFamily: 'System', fontSize: 24 }]}>✦</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.upgradeTitle}>{isShieldmaiden ? "Become Freya's Chosen" : 'Become Einherjar'}</Text>
                <Text style={styles.upgradeSub}>Unlock the full saga — crew raids, macro tracking, all ranks.</Text>
              </View>
              <Text style={styles.upgradeArrow}>→</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.proCard}>
              <LinearGradient colors={['rgba(201,168,76,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
              <Text style={[styles.proCardIcon, { color: accentColor, fontFamily: 'System', fontSize: 24 }]}>✦</Text>
              <View>
                <Text style={styles.proCardTitle}>{isShieldmaiden ? "Freya's Chosen" : 'Einherjar Pro'}</Text>
                <Text style={styles.proCardSub}>You have been chosen. Valhalla awaits.</Text>
              </View>
            </View>
          )}

          {/* Daily Saga card */}
          <DailySagaCard accentColor={accentColor} />

          {/* Settings */}
          <Text style={styles.sectionLabel}>SETTINGS</Text>
          <View style={styles.settingsCard}>
            {SETTINGS.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.settingsRow, i < SETTINGS.length - 1 && styles.settingsRowBorder]}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.settingsIcon,
                  item.label === 'Valkyrie Codex' && { color: '#D4A8C4' },
                  item.label === 'My Rune' && { color: accentColor },
                  item.label === 'Gear Guide' && { color: Colors.gold },
                  item.label === "Odin's Wisdom" && { color: Colors.gold },
                ]}>
                  {item.icon}
                </Text>
                <Text style={[
                  styles.settingsLabel,
                  item.label === 'Valkyrie Codex' && { color: '#D4A8C4' },
                  item.label === 'My Rune' && { color: accentColor },
                  item.label === "Odin's Wisdom" && { color: Colors.gold },
                ]}>
                  {item.label}
                </Text>
                <Text style={styles.settingsArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerRunes}>{isShieldmaiden ? 'ᚠ  ᚢ  ᚱ  ᚨ  ᛁ' : 'ᚠ  ᚢ  ᚦ  ᚨ  ᚱ'}</Text>
            <Text style={styles.footerVersion}>VALHALLA BOUND v2.6.0</Text>
            <Text style={styles.footerVerse}>
              {isShieldmaiden
                ? '"She is clothed with strength and dignity." — Proverbs 31:25'
                : '"Be strong and courageous." — Joshua 1:9'}
            </Text>
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
  content: { paddingBottom: 110 },

  watermark: {
    position: 'absolute', bottom: 100, left: -30,
    fontSize: 240, color: 'rgba(201,168,76,0.02)',
    fontFamily: 'System', transform: [{ rotate: '8deg' }],
    pointerEvents: 'none',
  },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  eyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 4, color: Colors.textMuted, marginBottom: 2 },
  title: { fontFamily: Fonts.heading, fontSize: 34, color: Colors.text, letterSpacing: 1 },

  heroCardOuterGlow: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderRadius: 18,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 10,
  },
  heroCard: {
    borderWidth: 1, borderRadius: 18, padding: Spacing.lg,
    alignItems: 'center', gap: 10, overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.55)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
  },
  heroTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  heroGlassHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 70,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
  },
  heroInsetBorder: {
    position: 'absolute', top: 3, left: 3, right: 3, bottom: 3,
    borderWidth: 1, borderRadius: 15,
  },
  fireEmbersLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  fireEmber: { position: 'absolute', bottom: 6 },
  heroCornerTL: { position: 'absolute', top: 10, left: 10, width: 16, height: 16, borderTopWidth: 1.5, borderLeftWidth: 1.5, opacity: 0.7 },
  heroCornerTR: { position: 'absolute', top: 10, right: 10, width: 16, height: 16, borderTopWidth: 1.5, borderRightWidth: 1.5, opacity: 0.7 },
  heroCornerBL: { position: 'absolute', bottom: 10, left: 10, width: 16, height: 16, borderBottomWidth: 1.5, borderLeftWidth: 1.5, opacity: 0.7 },
  heroCornerBR: { position: 'absolute', bottom: 10, right: 10, width: 16, height: 16, borderBottomWidth: 1.5, borderRightWidth: 1.5, opacity: 0.7 },
  heroIconGlowWrap: {
    borderRadius: 20, marginBottom: 4,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 14, elevation: 9,
  },
  heroIconWrap: {
    width: 80, height: 80, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, overflow: 'hidden',
  },
  iconGlassShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 30,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  iconInsetRing: {
    position: 'absolute', top: 3, left: 3, right: 3, bottom: 3,
    borderWidth: 1, borderRadius: 17,
  },
  heroIcon: { fontSize: 42, fontFamily: 'System' },
  buildAvatarBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, overflow: 'hidden', marginTop: 4 },
  buildAvatarText: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroName: {
    fontFamily: Fonts.heading, fontSize: 26, color: Colors.text, letterSpacing: 1,
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  editIcon: { fontSize: 16, color: Colors.textMuted, opacity: 0.4 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  nameInput: { flex: 1, fontFamily: Fonts.heading, fontSize: 20, color: Colors.text, borderBottomWidth: 1, borderBottomColor: Colors.goldBorder, paddingVertical: 6, letterSpacing: 1 },
  saveBtn: { borderRadius: Radii.sm, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 8 },
  saveBtnText: { fontFamily: Fonts.body, fontSize: 10, color: Colors.void, letterSpacing: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  rankBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  rankBadgeText: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 1.5 },
  proBadge: { backgroundColor: 'rgba(201,168,76,0.1)', borderWidth: 1, borderColor: Colors.goldBorder, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  proBadgeText: { fontFamily: Fonts.body, fontSize: 9, color: Colors.gold, letterSpacing: 1.5 },
  heroDivider: { height: 1, width: '60%', marginVertical: 2 },
  valkBadge: { backgroundColor: 'rgba(212,168,196,0.1)', borderWidth: 1, borderColor: 'rgba(212,168,196,0.3)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  valkBadgeText: { fontFamily: Fonts.body, fontSize: 9, color: '#D4A8C4', letterSpacing: 1.5 },
  progressStatWrap: { alignItems: 'center', gap: 2, marginVertical: 2 },
  progressStatLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: Colors.textMuted },
  progressStatValue: { fontFamily: Fonts.heading, fontSize: 20, letterSpacing: 0.3 },

  rankDesc: { fontFamily: Fonts.proseItalic, fontSize: 13, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
  xpRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  xpNum: { fontFamily: Fonts.heading, fontSize: 28 },
  xpLabel: { fontFamily: Fonts.body, fontSize: 10, color: Colors.textMuted, letterSpacing: 2 },

  bodyStatsCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(139,111,212,0.25)', borderRadius: 18,
    padding: Spacing.lg, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.9)', gap: 12,
  },
  bodyStatsTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  bodyStatsTitle: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, color: '#8B6FD4' },
  bodyStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bodyStatsStat: { alignItems: 'center', gap: 2, flex: 1 },
  bodyStatsLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 1, color: Colors.textMuted },
  bodyStatsValue: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.text },
  bodyStatsUnit: { fontFamily: Fonts.prose, fontSize: 10, color: Colors.textMuted },
  bodyStatsChange: { fontFamily: Fonts.body, fontSize: 9 },
  bodyStatsLogBtn: {
    borderWidth: 1, borderColor: 'rgba(139,111,212,0.3)', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(139,111,212,0.06)',
  },
  bodyStatsLogBtnText: { fontFamily: Fonts.subheading, fontSize: 12, color: '#8B6FD4' },
  bodyStatsForm: { gap: 10 },
  bodyStatsFormRow: { flexDirection: 'row', gap: 10 },
  bodyStatsFormField: { flex: 1 },
  bodyStatsFormLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 1, color: Colors.textMuted, marginBottom: 4 },
  bodyStatsFormInput: {
    fontFamily: Fonts.heading, fontSize: 16, color: Colors.text,
    borderWidth: 1, borderColor: 'rgba(139,111,212,0.25)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  bodyStatsFormHint: { fontFamily: Fonts.proseItalic, fontSize: 10, color: Colors.textDim, fontStyle: 'italic' },
  bodyStatsFormBtnRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  bodyStatsCancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  bodyStatsCancelBtnText: { fontFamily: Fonts.subheading, fontSize: 12, color: Colors.textMuted },
  bodyStatsSaveBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8, backgroundColor: '#8B6FD4' },
  bodyStatsSaveBtnText: { fontFamily: Fonts.heading, fontSize: 12, color: Colors.void, letterSpacing: 0.5 },

  sectionLabel: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, color: Colors.textMuted, paddingHorizontal: Spacing.lg, marginBottom: 10 },

  rankPath: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  rankPathRow: { flexDirection: 'row', gap: 12 },
  rankPathLeft: { alignItems: 'center', width: 14, paddingTop: 14 },
  rankPathDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  rankPathDotInner: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.void },
  rankPathLine: { flex: 1, width: 2, backgroundColor: 'rgba(255,255,255,0.05)', marginTop: 2, marginBottom: 2, minHeight: 16 },
  rankPathCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: Spacing.md, marginBottom: 8, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.5)' },
  rankPathCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankPathIcon: { fontSize: 18 },
  rankPathName: { fontFamily: Fonts.subheading, fontSize: 12, color: Colors.textMuted, marginBottom: 2 },
  rankPathNameLocked: { color: Colors.textDim },
  rankPathXP: { fontFamily: Fonts.body, fontSize: 8, color: Colors.textDim, letterSpacing: 1 },
  currentBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  currentBadgeText: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 1 },
  checkmark: { fontSize: 13 },
  lockIcon: { fontSize: 13, color: Colors.textDim, opacity: 0.3, fontFamily: 'System' },
  rankPathToggle: { alignItems: 'center', paddingVertical: 10, marginTop: 2 },
  rankPathToggleText: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 1.5 },

  exploreRow: { marginBottom: Spacing.lg },
  exploreRowContent: { paddingHorizontal: Spacing.lg, gap: 10 },
  exploreTile: {
    width: 118, borderWidth: 1, borderRadius: 14, padding: Spacing.md,
    overflow: 'hidden', backgroundColor: 'rgba(10,8,14,0.95)', gap: 6,
  },
  exploreTileIconWrap: {
    width: 32, height: 32, borderRadius: 9, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  exploreTileIcon: { fontSize: 15, fontFamily: 'System' },
  exploreTileLabel: { fontFamily: Fonts.heading, fontSize: 12, letterSpacing: 0.3 },
  exploreTileSub: { fontFamily: Fonts.prose, fontSize: 10, color: Colors.textMuted, lineHeight: 14 },

  upgradeCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.goldBorder, borderRadius: 14, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  upgradeTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  upgradeIcon: { fontSize: 24 },
  upgradeTitle: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.gold, letterSpacing: 0.5, marginBottom: 3 },
  upgradeSub: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
  upgradeArrow: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.gold, opacity: 0.5 },

  proCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.goldBorder, borderRadius: 14, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  proCardIcon: { fontSize: 24 },
  proCardTitle: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.gold, letterSpacing: 0.5, marginBottom: 3 },
  proCardSub: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },

  sagaCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
    borderRadius: 16, padding: Spacing.lg,
    overflow: 'hidden', backgroundColor: 'rgba(10,8,14,0.95)', gap: 12,
  },
  sagaTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  sagaHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sagaRuneWrap: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)', backgroundColor: 'rgba(201,168,76,0.06)', alignItems: 'center', justifyContent: 'center' },
  sagaRune: { fontSize: 22, fontFamily: 'System', color: Colors.gold },
  sagaEyebrow: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 3, color: 'rgba(201,168,76,0.5)', marginBottom: 2 },
  sagaName: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.gold, letterSpacing: 0.5 },
  sagaChapter: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 1, color: Colors.textDim, marginTop: 2 },
  sagaDayWrap: { alignItems: 'center', gap: 2 },
  sagaDayNum: { fontFamily: Fonts.heading, fontSize: 22, lineHeight: 24 },
  sagaDayLabel: { fontFamily: Fonts.body, fontSize: 6, letterSpacing: 1.5, color: Colors.textMuted },
  sagaDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  sagaImageWrap: {
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
  },
  sagaImage: {
    width: '100%',
    height: 220,
    position: 'absolute',
    top: 0,
  },
  sagaImageFade: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 60,
  },
  sagaText: { fontFamily: Fonts.proseItalic, fontSize: 13, color: Colors.textMuted, lineHeight: 20, fontStyle: 'italic' },
  sagaApplicationWrap: { borderLeftWidth: 2, paddingLeft: 10, gap: 3 },
  sagaApplicationLabel: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 2, color: Colors.textDim },
  sagaApplication: { fontFamily: Fonts.subheading, fontSize: 13, lineHeight: 18 },

  settingsCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.8)' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: 12 },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  settingsIcon: { fontSize: 18, width: 26, color: Colors.textMuted, fontFamily: 'System' },
  settingsLabel: { flex: 1, fontFamily: Fonts.subheading, fontSize: 14, color: Colors.text },
  settingsArrow: { fontFamily: Fonts.body, fontSize: 20, color: Colors.textMuted },

  footer: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 8 },
  footerRunes: { fontFamily: 'System', fontSize: 14, color: 'rgba(201,168,76,0.12)', letterSpacing: 8 },
  footerVersion: { fontFamily: Fonts.body, fontSize: 9, color: Colors.textDim, letterSpacing: 3 },
  footerVerse: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textDim, fontStyle: 'italic' },
});