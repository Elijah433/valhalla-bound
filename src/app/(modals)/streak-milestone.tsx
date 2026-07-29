import { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useWarriorStore } from '@/lib/store';
import { useWarriorProfile } from '@/lib/useWarriorProfile';
import { Colors, Fonts } from '@/constants/theme';
import * as StoreReview from 'expo-store-review';
const { width, height } = Dimensions.get('window');

// Frost-shield upsell line shown only to free users, only at 7+ day
// milestones — day 1 is intentionally skipped so a person's very first
// taste of success doesn't immediately get paired with a sales pitch.
// The framing scales with how much is at stake: a fragile early streak
// vs. a long one that would be devastating to lose.
const UPSELL_LINES: Record<number, string> = {
  7:  'A week of work, one missed day from gone. Einherjar Pro keeps a Frost Shield ready.',
  14: "Two weeks isn't luck — it's discipline. Protect it with a Frost Shield.",
  30: "A month-long saga, undone by one bad day? Einherjar Pro won't let that happen.",
  60: "Sixty days is rare. Don't let one missed day erase it — Frost Shields are Pro.",
};

const MILESTONES: Record<number, {
  title: string;
  subtitle: string;
  shieldmaidenTitle: string;
  shieldmaidenSubtitle: string;
  rune: string;
  verse: string;
}> = {
  1: {
    title: 'ONE DAY',
    subtitle: 'The first step of a thousand. The gods are watching.',
    shieldmaidenTitle: 'ONE DAY',
    shieldmaidenSubtitle: 'The first step on Freya\'s path.',
    rune: 'ᚠ',
    verse: 'Every saga begins with a single word. You have spoken yours.',
  },
  7: {
    title: 'SEVEN DAYS',
    subtitle: 'A week of iron. The gods have noticed.',
    shieldmaidenTitle: 'SEVEN DAYS',
    shieldmaidenSubtitle: 'Freya has taken note of your devotion.',
    rune: 'ᚢ',
    verse: 'Seven nights I kept the flame alive. So shall you.',
  },
  14: {
    title: 'FOURTEEN DAYS',
    subtitle: 'Two weeks forged. Your saga grows longer.',
    shieldmaidenTitle: 'FOURTEEN DAYS',
    shieldmaidenSubtitle: 'The Norns have woven two weeks of your saga.',
    rune: 'ᚱ',
    verse: 'The man who holds his course for fourteen days has proved something to himself.',
  },
  30: {
    title: 'THIRTY DAYS',
    subtitle: 'A month of war. You are no longer a beginner.',
    shieldmaidenTitle: 'THIRTY DAYS',
    shieldmaidenSubtitle: 'A moon cycle of battle. You are Valkyrja.',
    rune: 'ᛋ',
    verse: 'Thirty days the warrior trained. On the thirty-first, he did not question whether to train.',
  },
  60: {
    title: 'SIXTY DAYS',
    subtitle: 'Two months. The forge has shaped you.',
    shieldmaidenTitle: 'SIXTY DAYS',
    shieldmaidenSubtitle: 'Sixty days of the Shieldmaiden\'s path. Brynhildr sees you.',
    rune: 'ᛟ',
    verse: 'At sixty days, the body stops asking why. It simply becomes.',
  },
};

export default function StreakMilestoneScreen() {
  const params = useLocalSearchParams<{ days: string }>();
  const days = parseInt(params.days ?? '7');
  const milestone = MILESTONES[days] ?? MILESTONES[7];

  const { warrior, isPro } = useWarriorStore();
  const { isShieldmaiden } = useWarriorProfile();

  const showUpsell = !isPro && UPSELL_LINES[days] !== undefined;

  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0.88)).current;
  const runeAnim    = useRef(new Animated.Value(0)).current;
  const glowAnim    = useRef(new Animated.Value(0)).current;
  const ringAnim    = useRef(new Animated.Value(0)).current;
  const titleAnim   = useRef(new Animated.Value(0)).current;
  const verseAnim   = useRef(new Animated.Value(0)).current;
  const btnAnim     = useRef(new Animated.Value(0)).current;
  const upsellAnim  = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(
    Array.from({ length: 8 }, () => ({
      opacity: new Animated.Value(0),
      y: new Animated.Value(0),
    }))
  ).current;

  const accentColor = isShieldmaiden ? '#D4A8C4' : Colors.gold;
  const title    = isShieldmaiden ? milestone.shieldmaidenTitle : milestone.title;
  const subtitle = isShieldmaiden ? milestone.shieldmaidenSubtitle : milestone.subtitle;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 600);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      Animated.spring(runeAnim, { toValue: 1, tension: 35, friction: 7, useNativeDriver: true }),
      Animated.delay(100),
      Animated.timing(titleAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(200),
      Animated.timing(verseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.delay(300),
      Animated.timing(btnAnim,   { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(150),
      Animated.timing(upsellAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // Subtle glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.2, duration: 3000, useNativeDriver: true }),
      ])
    ).start();

    // Ring rotate
    Animated.loop(
      Animated.timing(ringAnim, { toValue: 1, duration: 12000, useNativeDriver: true })
    ).start();

    // Floating rune particles
    particleAnims.forEach((p, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 300),
          Animated.parallel([
            Animated.timing(p.opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
            Animated.timing(p.y, { toValue: -80 - i * 8, duration: 2400, useNativeDriver: true }),
          ]),
          Animated.timing(p.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          Animated.timing(p.y, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });

    // Auto-dismiss is held a little longer when the upsell line is shown,
    // so it isn't yanked away before someone's had a real chance to read
    // and tap it.
    const timer = setTimeout(() => router.back(), showUpsell ? 13000 : 10000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start(async () => {
      // Only prompt for review at meaningful streak milestones —
      // day 7 is the first real signal of genuine engagement.
      if ((days === 7 || days === 30 || days === 100) && await StoreReview.hasAction()) {
        setTimeout(async () => {
          await StoreReview.requestReview();
        }, 1500);
      }
    });
  }, []);


  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.18] });
  const ringDeg     = ringAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const runeScale   = runeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  const PARTICLE_RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ'];
  const PARTICLE_X = [
    width * 0.08, width * 0.22, width * 0.38,
    width * 0.54, width * 0.68, width * 0.82,
    width * 0.14, width * 0.60,
  ];

  function handleUpsellPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(modals)/paywall');
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#080510', '#050508', '#050508']}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle top haze — accent color only, no orbs */}
      <Animated.View style={[styles.topHaze, {
        backgroundColor: accentColor,
        opacity: glowOpacity,
      }]} />

      {/* Floating rune particles */}
      {particleAnims.map((p, i) => (
        <Animated.Text
          key={i}
          style={[styles.particle, {
            left: PARTICLE_X[i],
            bottom: height * 0.12,
            opacity: p.opacity,
            color: `${accentColor}70`,
            transform: [{ translateY: p.y }],
          }]}
        >
          {PARTICLE_RUNES[i]}
        </Animated.Text>
      ))}

      <Animated.View style={[styles.content, {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }]}>

        {/* Days counter */}
        <Animated.View style={[styles.daysWrap, { opacity: titleAnim }]}>
          <Text style={[styles.daysNum, {
            color: accentColor,
            textShadowColor: `${accentColor}30`,
          }]}>{days}</Text>
          <Text style={styles.daysLabel}>DAY SAGA</Text>
        </Animated.View>

        {/* Rune hero — rotating ring + center stone, NO circles */}
        <View style={styles.runeHero}>
          {/* Rotating rune ring */}
          <Animated.View style={[styles.runeRingOuter, {
            borderColor: `${accentColor}18`,
            transform: [{ rotate: ringDeg }],
          }]}>
            {['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ'].map((r, i) => {
              const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
              const radius = 88;
              return (
                <Text key={i} style={[styles.ringRune, {
                  color: `${accentColor}30`,
                  left: 88 + Math.cos(angle) * radius - 7,
                  top:  88 + Math.sin(angle) * radius - 7,
                }]}>{r}</Text>
              );
            })}
          </Animated.View>

          {/* Center rune stone — square, not circle */}
          <Animated.View style={[styles.runeStone, {
            borderColor: `${accentColor}35`,
            transform: [{ scale: runeScale }],
            opacity: runeAnim,
          }]}>
            <LinearGradient
              colors={[`${accentColor}12`, `${accentColor}04`, 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['transparent', accentColor, 'transparent']}
              style={styles.stoneTopLine}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
            <Text style={[styles.runeCenter, { color: accentColor }]}>
              {milestone.rune}
            </Text>
            <Text style={[styles.runeStoneDays, { color: `${accentColor}60` }]}>
              {days}
            </Text>
          </Animated.View>
        </View>

        {/* Title block */}
        <Animated.View style={[styles.titleBlock, {
          opacity: titleAnim,
          transform: [{
            translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
          }],
        }]}>
          <Text style={[styles.title, {
            color: accentColor,
            textShadowColor: `${accentColor}25`,
          }]}>{title}</Text>
          <Text style={styles.warriorName}>{warrior?.name ?? 'WARRIOR'}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>

        {/* Rune divider */}
        <Animated.View style={[styles.dividerRow, { opacity: verseAnim }]}>
          <View style={[styles.dividerLine, { backgroundColor: `${accentColor}20` }]} />
          <Text style={[styles.dividerRune, { color: `${accentColor}45` }]}>{milestone.rune}</Text>
          <View style={[styles.dividerLine, { backgroundColor: `${accentColor}20` }]} />
        </Animated.View>

        {/* Verse */}
        <Animated.Text style={[styles.verse, { opacity: verseAnim }]}>
          "{milestone.verse}"
        </Animated.Text>

        {/* Pro upsell — free users only, 7+ day milestones only. Wrapped in
            its own TouchableOpacity (not a bare onTouchEnd) so the tap is
            unambiguously captured here rather than falling through to the
            full-screen dismiss-catcher rendered below in the tree. */}
        {showUpsell && (
          <Animated.View style={[styles.upsellWrap, { opacity: upsellAnim }, { borderColor: `${accentColor}25` }]}>
            <TouchableOpacity onPress={handleUpsellPress} activeOpacity={0.8} style={styles.upsellTouchable}>
              <LinearGradient
                colors={[`${accentColor}10`, 'transparent']}
                style={StyleSheet.absoluteFill}
              />
              <Text style={[styles.upsellRune, { color: accentColor }]}>ᚲ</Text>
              <Text style={styles.upsellText}>{UPSELL_LINES[days]}</Text>
              <Text style={[styles.upsellCta, { color: accentColor }]}>GET PRO →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Dismiss */}
        <Animated.Text style={[styles.dismiss, { opacity: btnAnim }]}>
          Tap anywhere to continue
        </Animated.Text>

      </Animated.View>

      {/* Full screen tap — dismisses the screen. Sits BELOW `content` in the
          tree, so the upsell TouchableOpacity above (which is part of
          `content`) receives its own taps first; this only catches taps
          that land outside any of content's interactive children. */}
      <View
        style={StyleSheet.absoluteFill}
        onTouchEnd={() => router.back()}
        pointerEvents="box-only"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508', alignItems: 'center', justifyContent: 'center' },

  topHaze: {
    position: 'absolute',
    top: -120, left: width * 0.1,
    width: width * 0.8, height: 320,
    borderRadius: 999,
    transform: [{ scaleY: 0.35 }],
    pointerEvents: 'none',
  },

  particle: {
    position: 'absolute',
    fontSize: 16, fontFamily: 'System',
  },

  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 20,
    zIndex: 1,
  },

  daysWrap: { alignItems: 'center', gap: 0 },
  daysNum: {
    fontFamily: Fonts.display, fontSize: 88, lineHeight: 88,
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 30,
  },
  daysLabel: {
    fontFamily: Fonts.body, fontSize: 9,
    letterSpacing: 7, color: Colors.textMuted,
    marginTop: -6,
  },

  runeHero: {
    width: 200, height: 200,
    alignItems: 'center', justifyContent: 'center',
  },
  runeRingOuter: {
    position: 'absolute',
    width: 192, height: 192,
    borderRadius: 96, borderWidth: 1,
  },
  ringRune: { position: 'absolute', fontFamily: 'System', fontSize: 13 },

  // Square stone — Viking, not techy circle
  runeStone: {
    width: 110, height: 110,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    gap: 0,
    backgroundColor: 'rgba(8,6,12,0.95)',
  },
  stoneTopLine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
  },
  runeCenter: { fontSize: 52, fontFamily: 'System', lineHeight: 56 },
  runeStoneDays: {
    fontFamily: Fonts.body, fontSize: 8,
    letterSpacing: 2, marginTop: -4,
  },

  titleBlock: { alignItems: 'center', gap: 6 },
  title: {
    fontFamily: Fonts.display, fontSize: 28,
    letterSpacing: 4, textAlign: 'center',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
  },
  warriorName: {
    fontFamily: Fonts.heading, fontSize: 18,
    color: Colors.text, letterSpacing: 3,
  },
  subtitle: {
    fontFamily: Fonts.proseItalic, fontSize: 14,
    color: Colors.textMuted, textAlign: 'center',
    lineHeight: 22, fontStyle: 'italic',
    paddingHorizontal: 16,
  },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '80%' },
  dividerLine: { flex: 1, height: 1 },
  dividerRune: { fontFamily: 'System', fontSize: 18 },

  verse: {
    fontFamily: Fonts.proseItalic, fontSize: 13,
    color: Colors.textMuted, textAlign: 'center',
    lineHeight: 22, fontStyle: 'italic',
    paddingHorizontal: 20,
  },

  upsellWrap: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,8,14,0.8)',
  },
  upsellTouchable: {
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  upsellRune: { fontSize: 16, fontFamily: 'System', opacity: 0.8 },
  upsellText: {
    fontFamily: Fonts.prose, fontSize: 12,
    color: Colors.textMuted, textAlign: 'center',
    lineHeight: 18, paddingHorizontal: 8,
  },
  upsellCta: {
    fontFamily: Fonts.heading, fontSize: 12,
    letterSpacing: 1.5, marginTop: 2,
  },

  dismiss: {
    fontFamily: Fonts.body, fontSize: 9,
    letterSpacing: 2, color: Colors.textDim,
    marginTop: 4,
  },
});