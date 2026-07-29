import { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width } = Dimensions.get('window');

const STYLE_THEMES = [
  {
    id: 'dark_viking',
    name: 'Dark Viking',
    subtitle: 'The Shield Maiden of the North',
    rune: 'ᚦ',
    color: '#C9A84C',
    palette: ['#1A0A0A', '#2D1B1B', '#C9A84C', '#8B1A1A'],
    vibe: 'Fierce. Commanding. Unapologetic.',
    keywords: ['Black leather', 'Bronze accents', 'Fur trim', 'Combat boots', 'Dark florals'],
    workout: 'Black compression set, bronze-toned accessories, dark sneakers',
    recovery: 'Oversized black hoodie, wool socks, thermal leggings',
    desc: 'You dress like you just raided a village and looked incredible doing it. Dark tones, leather, and gold accents that say "I fear nothing."',
  },
  {
    id: 'cottage_norse',
    name: 'Cottage Norse',
    subtitle: 'The Herbalist of the Forest',
    rune: 'ᛁ',
    color: '#8BAF7C',
    palette: ['#1A2010', '#3D5A30', '#8BAF7C', '#C4A882'],
    vibe: 'Earthy. Soft. Wild.',
    keywords: ['Linen layers', 'Earthy tones', 'Braided hair', 'Wooden jewelry', 'Wildflower prints'],
    workout: 'Sage green or earth-tone set, minimal jewelry, natural hair',
    recovery: 'Linen pants, knit sweater, barefoot or simple sandals',
    desc: 'You gather herbs, speak to ravens, and still PR your deadlift. Nature meets strength in the most beautiful way.',
  },
  {
    id: 'warrior_minimal',
    name: 'Warrior Minimalist',
    subtitle: 'The Elite of Valhalla',
    rune: 'ᚢ',
    color: '#A8C4D4',
    palette: ['#050810', '#0A1520', '#A8C4D4', '#FFFFFF'],
    vibe: 'Clean. Intentional. Powerful.',
    keywords: ['Monochrome fits', 'Clean lines', 'Subtle silver', 'Technical fabrics', 'Sharp tailoring'],
    workout: 'All-white or all-black set, silver chain, white sneakers',
    recovery: 'Matching tracksuit, minimal accessories, sleek ponytail',
    desc: 'Every piece is chosen with purpose. You don\'t need ornamentation — your presence is enough. Less is legendary.',
  },
  {
    id: 'freya_goddess',
    name: "Freya's Goddess",
    subtitle: 'Queen of the Valkyries',
    rune: 'ᚱ',
    color: '#D4A8C4',
    palette: ['#1A0A18', '#3D1A35', '#D4A8C4', '#F0C4E0'],
    vibe: 'Ethereal. Magnetic. Divine.',
    keywords: ['Mauve & rose gold', 'Flowing layers', 'Crystal jewelry', 'Velvet textures', 'Celestial prints'],
    workout: 'Dusty rose or mauve set, rose gold accessories, soft waves',
    recovery: 'Silk robe, crystals, candles, lavender everything',
    desc: 'Freya was the goddess of love AND war. You embody both. Soft femininity and fierce strength are not opposites — they are your superpower.',
  },
];

const DAILY_LOOKS = [
  { day: 0, theme: 'dark_viking', look: 'Black wide-leg trousers, fitted ribbed top, leather belt, combat boots. Bronze ring. Hair half-up.', energy: 'CONQUER' },
  { day: 1, theme: 'cottage_norse', look: 'Linen trousers, oversized cream knit, wooden bead necklace, ankle boots. Hair braided.', energy: 'RESTORE' },
  { day: 2, theme: 'warrior_minimal', look: 'All-black everything. Silver cuff. White sneakers. Sleek bun. Zero distractions.', energy: 'FOCUS' },
  { day: 3, theme: 'freya_goddess', look: 'Mauve slip dress over a fitted long sleeve. Rose gold jewelry. Soft waves. You\'re the main character.', energy: 'RADIATE' },
  { day: 4, theme: 'dark_viking', look: 'Dark wash jeans, black corset top, leather jacket, chunky boots. Gold chain. You raid at dawn.', energy: 'DOMINATE' },
  { day: 5, theme: 'cottage_norse', look: 'Earth-tone midi skirt, simple white top, woven bag, flat sandals. Wildflower in your hair optional.', energy: 'BLOOM' },
  { day: 6, theme: 'warrior_minimal', look: 'Matching grey set, silver hoops, white trainers, glossy skin. Clean girl. Strong girl.', energy: 'REIGN' },
];

const WORKOUT_FITS = [
  {
    type: 'strength',
    title: 'Iron Day Fit',
    rune: 'ᚦ',
    items: [
      'High-waist leggings in black or deep burgundy',
      'Fitted crop top or sports bra — show the work',
      'Weightlifting belt if going heavy',
      'Mid-sole training shoes (not running shoes)',
      'Hair: tight braid or high bun — no loose ends',
      'Minimal jewelry — one ring max',
    ],
    tip: 'Dress like you mean business. The iron knows.',
  },
  {
    type: 'endurance',
    title: 'Raid Day Fit',
    rune: 'ᚢ',
    items: [
      'Moisture-wicking 2-in-1 shorts or running tights',
      'Lightweight tank or long sleeve depending on weather',
      'Quality running shoes fitted to your gait',
      'Hair: high ponytail or Dutch braid',
      'Minimal — no jewelry that bounces',
      'Reflective details if running at dawn or dusk',
    ],
    tip: 'Viking raiders traveled light. So do you.',
  },
  {
    type: 'recovery',
    title: 'Rest Day Ritual',
    rune: 'ᛁ',
    items: [
      'Your softest, most oversized set',
      'Fuzzy socks or slippers — non-negotiable',
      'Hair down or loose braid',
      'A crystal if that\'s your thing (no judgment)',
      'Cozy layers you can peel off during yoga',
      'Something that smells good — you deserve it',
    ],
    tip: 'Rest is not weakness. Freya rested. Then she conquered.',
  },
  {
    type: 'combat',
    title: 'Battle Drill Fit',
    rune: 'ᚱ',
    items: [
      'Compression shorts or fitted biker shorts',
      'Supportive sports bra — HIIT demands it',
      'Cross-training shoes with lateral support',
      'Hair: tightest style possible — two French braids ideal',
      'Nothing loose, nothing dangling',
      'Dark colors hide sweat — train like Freya, not for the \'gram',
    ],
    tip: 'You\'re about to go to war. Dress accordingly.',
  },
];

export default function ValkyrieAestheticModal() {
  const [activeTheme, setActiveTheme] = useState(STYLE_THEMES[0]);
  const [activeWorkout, setActiveWorkout] = useState(WORKOUT_FITS[0]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const todayLook = DAILY_LOOKS[new Date().getDay()];
  const todayTheme = STYLE_THEMES.find(t => t.id === todayLook.theme) ?? STYLE_THEMES[0];

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.06, 0.14],
  });

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#140A18', '#0A050E', '#050508']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.topGlow, { opacity: glowOpacity }]} />
      <Text style={styles.watermark}>ᚢ</Text>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>VALKYRIE CODEX</Text>
              <Text style={styles.title}>THE AESTHETIC</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.headerDesc}>
            Freya was the most powerful goddess in Norse mythology.{'\n'}
            She was fierce, beautiful, wise, and unapologetic.{'\n'}
            So are you.
          </Text>

          {/* Today's look */}
          <View style={[styles.todayCard, { borderColor: `${todayTheme.color}35` }]}>
            <LinearGradient
              colors={[`${todayTheme.color}10`, 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['transparent', todayTheme.color, 'transparent']}
              style={styles.todayCardLine}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <View style={styles.todayCardTop}>
              <View>
                <Text style={styles.todayCardEyebrow}>TODAY'S LOOK</Text>
                <Text style={[styles.todayCardTheme, { color: todayTheme.color }]}>
                  {todayTheme.name}
                </Text>
              </View>
              <View style={[styles.energyBadge, { borderColor: `${todayTheme.color}40`, backgroundColor: `${todayTheme.color}10` }]}>
                <Text style={[styles.energyText, { color: todayTheme.color }]}>
                  {todayLook.energy}
                </Text>
              </View>
            </View>
            <Text style={styles.todayLookText}>{todayLook.look}</Text>
            <View style={styles.paletteRow}>
              {todayTheme.palette.map((c, i) => (
                <View key={i} style={[styles.paletteColor, { backgroundColor: c }]} />
              ))}
              <Text style={styles.paletteLabel}>Today's palette</Text>
            </View>
          </View>

          {/* Style themes */}
          <Text style={styles.sectionLabel}>YOUR STYLE PATHS</Text>
          <Text style={styles.sectionSub}>
            Each path is an expression of your warrior spirit. You can embody them all.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.themesRow}
          >
            {STYLE_THEMES.map((theme) => {
              const isActive = activeTheme.id === theme.id;
              return (
                <TouchableOpacity
                  key={theme.id}
                  style={[styles.themeTab, isActive && { borderColor: `${theme.color}50`, backgroundColor: `${theme.color}10` }]}
                  onPress={() => {
                    setActiveTheme(theme);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.themeTabRune, { color: isActive ? theme.color : Colors.textMuted }]}>
                    {theme.rune}
                  </Text>
                  <Text style={[styles.themeTabName, isActive && { color: theme.color }]}>
                    {theme.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[styles.themeCard, { borderColor: `${activeTheme.color}30` }]}>
            <LinearGradient
              colors={[`${activeTheme.color}08`, 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['transparent', activeTheme.color, 'transparent']}
              style={styles.themeCardLine}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />

            <View style={styles.themeCardTop}>
              <View>
                <Text style={[styles.themeCardName, { color: activeTheme.color }]}>
                  {activeTheme.name}
                </Text>
                <Text style={styles.themeCardSubtitle}>{activeTheme.subtitle}</Text>
              </View>
              <Text style={[styles.themeCardRune, { color: activeTheme.color }]}>
                {activeTheme.rune}
              </Text>
            </View>

            <Text style={[styles.themeVibe, { color: activeTheme.color }]}>
              {activeTheme.vibe}
            </Text>

            <Text style={styles.themeDesc}>{activeTheme.desc}</Text>

            <View style={styles.keywordsRow}>
              {activeTheme.keywords.map((kw, i) => (
                <View key={i} style={[styles.keywordTag, { borderColor: `${activeTheme.color}30`, backgroundColor: `${activeTheme.color}08` }]}>
                  <Text style={[styles.keywordText, { color: activeTheme.color }]}>{kw}</Text>
                </View>
              ))}
            </View>

            <View style={styles.paletteRow}>
              {activeTheme.palette.map((c, i) => (
                <View key={i} style={[styles.paletteColor, { backgroundColor: c }]} />
              ))}
              <Text style={styles.paletteLabel}>Colour palette</Text>
            </View>

            <View style={styles.fitSection}>
              <Text style={styles.fitLabel}>WORKOUT DAY</Text>
              <Text style={styles.fitText}>{activeTheme.workout}</Text>
              <Text style={styles.fitLabel}>REST DAY</Text>
              <Text style={styles.fitText}>{activeTheme.recovery}</Text>
            </View>
          </View>

          {/* Workout fits */}
          <Text style={styles.sectionLabel}>TRAINING DAY FITS</Text>
          <Text style={styles.sectionSub}>
            What you wear to train matters. Dress for the version of you that already won.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.workoutTabsRow}
          >
            {WORKOUT_FITS.map((fit) => {
              const isActive = activeWorkout.type === fit.type;
              const fitColor = fit.type === 'strength' ? Colors.gold
                : fit.type === 'endurance' ? Colors.ice
                : fit.type === 'recovery' ? '#D4A8C4'
                : Colors.blood;
              return (
                <TouchableOpacity
                  key={fit.type}
                  style={[styles.workoutTab, isActive && { borderColor: `${fitColor}50`, backgroundColor: `${fitColor}10` }]}
                  onPress={() => {
                    setActiveWorkout(fit);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.workoutTabRune, { color: isActive ? fitColor : Colors.textMuted }]}>
                    {fit.rune}
                  </Text>
                  <Text style={[styles.workoutTabName, isActive && { color: fitColor }]}>
                    {fit.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {(() => {
            const fitColor = activeWorkout.type === 'strength' ? Colors.gold
              : activeWorkout.type === 'endurance' ? Colors.ice
              : activeWorkout.type === 'recovery' ? '#D4A8C4'
              : Colors.blood;
            return (
              <View style={[styles.workoutFitCard, { borderColor: `${fitColor}25` }]}>
                <LinearGradient
                  colors={[`${fitColor}07`, 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={[styles.workoutFitTitle, { color: fitColor }]}>
                  {activeWorkout.title}
                </Text>
                <View style={styles.workoutFitItems}>
                  {activeWorkout.items.map((item, i) => (
                    <View key={i} style={styles.workoutFitRow}>
                      <View style={[styles.workoutFitDot, { backgroundColor: fitColor }]} />
                      <Text style={styles.workoutFitText}>{item}</Text>
                    </View>
                  ))}
                </View>
                <View style={[styles.workoutFitTip, { borderColor: `${fitColor}25`, backgroundColor: `${fitColor}06` }]}>
                  <Text style={[styles.workoutFitTipRune, { color: fitColor }]}>ᚢ</Text>
                  <Text style={[styles.workoutFitTipText, { color: fitColor }]}>
                    {activeWorkout.tip}
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* Freya's words */}
          <View style={styles.freyaCard}>
            <LinearGradient
              colors={['rgba(212,168,196,0.08)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['transparent', '#D4A8C4', 'transparent']}
              style={styles.freyaCardLine}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Text style={styles.freyaRune}>ᚱ</Text>
            <Text style={styles.freyaTitle}>FREYA'S WORDS</Text>
            <Text style={styles.freyaQuote}>
              "I am the goddess of both love and war.{'\n'}
              I choose what to fight for.{'\n'}
              I choose how I show up.{'\n'}
              I am never both weak and beautiful —{'\n'}
              I am always both fierce and radiant.{'\n'}
              This is the Valkyrie way."
            </Text>
          </View>

          <View style={styles.bottomRunes}>
            <Text style={styles.bottomRuneText}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ</Text>
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

  topGlow: {
    position: 'absolute',
    top: -80,
    left: width * 0.1,
    width: width * 0.8,
    height: 300,
    backgroundColor: '#D4A8C4',
    borderRadius: 999,
    transform: [{ scaleX: 1.3 }, { scaleY: 0.4 }],
    pointerEvents: 'none',
  },
  watermark: {
    position: 'absolute',
    bottom: 80, right: -30,
    fontSize: 220,
    color: 'rgba(212,168,196,0.025)',
    fontFamily: 'System',
    transform: [{ rotate: '-12deg' }],
    pointerEvents: 'none',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 4,
    color: '#D4A8C4',
    marginBottom: 4,
    opacity: 0.8,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 32,
    color: Colors.text,
    letterSpacing: 1,
  },
  closeBtn: {
    width: 34, height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  closeBtnText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  headerDesc: {
    fontFamily: Fonts.proseItalic,
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },

  // Today's look
  todayCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(14,8,18,0.9)',
    gap: 12,
  },
  todayCardLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  todayCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  todayCardEyebrow: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 3,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  todayCardTheme: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    letterSpacing: 0.5,
  },
  energyBadge: {
    borderWidth: 1,
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  energyText: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 2,
  },
  todayLookText: {
    fontFamily: Fonts.prose,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  paletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paletteColor: {
    width: 20, height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  paletteLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.textDim,
    marginLeft: 4,
  },

  sectionLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    marginBottom: 6,
  },
  sectionSub: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textDim,
    fontStyle: 'italic',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },

  // Theme tabs
  themesRow: {
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  themeTab: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(12,8,16,0.8)',
    minWidth: 80,
  },
  themeTabRune: {
    fontSize: 18,
    fontFamily: 'System',
  },
  themeTabName: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 1,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Theme card
  themeCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(14,8,18,0.9)',
    gap: 12,
  },
  themeCardLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  themeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  themeCardName: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  themeCardSubtitle: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  themeCardRune: {
    fontSize: 36,
    fontFamily: 'System',
    opacity: 0.5,
  },
  themeVibe: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    letterSpacing: 2,
  },
  themeDesc: {
    fontFamily: Fonts.prose,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordTag: {
    borderWidth: 1,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  keywordText: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 1,
  },
  fitSection: { gap: 6 },
  fitLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 2,
    color: Colors.textMuted,
    marginTop: 4,
  },
  fitText: {
    fontFamily: Fonts.prose,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
  },

  // Workout fit tabs
  workoutTabsRow: {
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  workoutTab: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(12,8,16,0.8)',
    minWidth: 80,
  },
  workoutTabRune: {
    fontSize: 16,
    fontFamily: 'System',
  },
  workoutTabName: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 0.5,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Workout fit card
  workoutFitCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(14,8,18,0.9)',
    gap: 12,
  },
  workoutFitTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    letterSpacing: 1,
  },
  workoutFitItems: { gap: 8 },
  workoutFitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  workoutFitDot: {
    width: 5, height: 5,
    borderRadius: 3,
    marginTop: 6,
    opacity: 0.7,
  },
  workoutFitText: {
    flex: 1,
    fontFamily: Fonts.prose,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 19,
  },
  workoutFitTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  workoutFitTipRune: {
    fontSize: 16,
    fontFamily: 'System',
    marginTop: 1,
  },
  workoutFitTipText: {
    flex: 1,
    fontFamily: Fonts.proseItalic,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
  },

  // Freya card
  freyaCard: {
    marginHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212,168,196,0.2)',
    borderRadius: 18,
    padding: Spacing.xl,
    overflow: 'hidden',
    backgroundColor: 'rgba(14,8,18,0.9)',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  freyaCardLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  freyaRune: {
    fontSize: 36,
    color: '#D4A8C4',
    fontFamily: 'System',
    opacity: 0.5,
    marginBottom: 4,
  },
  freyaTitle: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 4,
    color: '#D4A8C4',
    opacity: 0.7,
  },
  freyaQuote: {
    fontFamily: Fonts.proseItalic,
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
  },

  bottomRunes: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  bottomRuneText: {
    fontFamily: 'System',
    fontSize: 13,
    color: 'rgba(212,168,196,0.08)',
    letterSpacing: 10,
  },
});