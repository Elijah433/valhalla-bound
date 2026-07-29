import { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useWarriorProfile } from '@/lib/useWarriorProfile';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width } = Dimensions.get('window');

const SHIELDMAIDEN_GEAR = [
  {
    id: 'sports_bra',
    name: 'Sports Bra',
    rune: 'ᚢ',
    color: '#D4A8C4',
    tagline: 'Your most important piece of kit.',
    why: 'Most women wear the wrong size or the wrong support level for their training. A poorly fitted sports bra can cause long-term tissue damage, back pain, and will make high-impact training genuinely uncomfortable. This is not optional kit — it is foundational.',
    levels: [
      { name: 'Low Impact', desc: 'Yoga, walking, pilates, stretching', examples: 'Bralette styles, light compression' },
      { name: 'Medium Impact', desc: 'Cycling, hiking, strength training', examples: 'Encapsulation or compression, adjustable straps' },
      { name: 'High Impact', desc: 'Running, HIIT, jumping, combat', examples: 'Full encapsulation, underwire optional, wide straps' },
    ],
    whatToLookFor: [
      'Get professionally fitted — cup size changes with band size',
      'The band should sit level all the way around your body',
      'You should be able to fit two fingers under the band — no more',
      'Straps should not dig in or fall off your shoulders',
      'Replace every 6-12 months or when elasticity goes',
      'Moisture-wicking fabric prevents chafing on long sessions',
    ],
    priceTiers: [
      { tier: 'Budget', range: '$20-40', note: 'Old Navy, Primark Sport — fine for low impact' },
      { tier: 'Mid', range: '$40-70', note: 'Lululemon Align Bra, Nike Dri-FIT — worth every penny' },
      { tier: 'Elite', range: '$70-120', note: 'Shock Absorber, Panache Sport — for serious runners' },
    ],
    norse: 'The Valkyries wore armor that fit. Ill-fitting gear is the mark of a warrior unprepared. Know your body, equip it correctly.',
  },
  {
    id: 'leggings',
    name: 'Training Leggings',
    rune: 'ᚦ',
    color: '#A8C4D4',
    tagline: 'Not all leggings are created equal.',
    why: 'The difference between cheap leggings and quality training tights is the difference between a distracted session and a focused one. Squat transparency, waistband rolling, and poor compression are not minor inconveniences — they pull you out of the warrior mindset.',
    levels: [
      { name: 'Casual', desc: 'Walking, yoga, light cardio', examples: 'Cotton blend, relaxed fit, basic compression' },
      { name: 'Training', desc: 'Strength, HIIT, cycling', examples: 'High-waist, squat-proof, four-way stretch' },
      { name: 'Performance', desc: 'Running, competition, endurance', examples: 'Compression technology, muscle support, reflective details' },
    ],
    whatToLookFor: [
      'Squat test — hold them up to light, squat down, check transparency',
      'High waist stays up through all movements — no rolling',
      'Four-way stretch — side to side AND up and down',
      'Flat seams prevent chafing on long runs',
      'Pockets are not a luxury — they are functional',
      'Dark colors for heavy sessions, lighter for low impact',
    ],
    priceTiers: [
      { tier: 'Budget', range: '$15-35', note: 'Gymshark, ASOS 4505 — decent quality, watch the squat test' },
      { tier: 'Mid', range: '$50-80', note: 'Lululemon Align, Sweaty Betty — genuinely excellent' },
      { tier: 'Elite', range: '$80-130', note: 'Vuori, Alo Yoga, 2XU Compression — for serious training' },
    ],
    norse: 'A Valkyrie\'s armor moved with her, not against her. Your leggings are your battle armor. Choose them like your performance depends on it — because it does.',
  },
  {
    id: 'shoes',
    name: 'Training Shoes',
    rune: 'ᚱ',
    color: '#C9A84C',
    tagline: 'The foundation of every movement.',
    why: 'Running shoes are designed for forward motion. Wearing them for lifting compresses your arch and creates an unstable base that reduces power and risks ankle injury. Wearing lifting shoes for running destroys your joints. The right shoe for the right session is not a luxury — it is biomechanics.',
    levels: [
      { name: 'Cross Trainer', desc: 'General gym, HIIT, light lifting', examples: 'Nike Metcon, Reebok Nano — versatile all-rounder' },
      { name: 'Running Shoe', desc: 'Cardio, treadmill, outdoor runs', examples: 'ASICS Gel, New Balance Fresh Foam, Brooks Ghost' },
      { name: 'Lifting Shoe', desc: 'Heavy squats, Olympic lifting', examples: 'Nike Romaleos, Adidas Adipower — elevated heel' },
    ],
    whatToLookFor: [
      'Get gait-analysed at a running store — overpronation changes everything',
      'Thumb-width of space between your longest toe and the shoe end',
      'Heels should not slip — lace properly for your foot shape',
      'Replace running shoes every 300-500 miles regardless of appearance',
      'Wide toe box prevents bunions and nerve compression',
      'Zero drop for lifting, cushioning for impact activities',
    ],
    priceTiers: [
      { tier: 'Budget', range: '$50-80', note: 'New Balance 574, Saucony Cohesion — solid entry point' },
      { tier: 'Mid', range: '$100-140', note: 'Nike Metcon, ASICS Gel-Nimbus — the sweet spot' },
      { tier: 'Elite', range: '$150-250', note: 'On Cloud, Hoka, Nike Vaporfly — for serious athletes' },
    ],
    norse: 'Vikings chose their footwear based on terrain. You choose yours based on your training. The wrong shoes are the wrong weapon for the wrong battle.',
  },
  {
    id: 'recovery',
    name: 'Recovery Extras',
    rune: 'ᛁ',
    color: '#8B6FD4',
    tagline: 'How you recover determines how you perform.',
    why: 'Recovery is not weakness — it is strategy. The Valkyries did not fight without rest. The tools you use to recover directly affect how hard you can train in your next session. These are not luxuries.',
    levels: [
      { name: 'Essential', desc: 'Every warrior needs these', examples: 'Foam roller, resistance bands, good sleep mask' },
      { name: 'Upgrade', desc: 'Accelerate your recovery', examples: 'Massage gun, magnesium supplements, compression socks' },
      { name: 'Elite', desc: 'Train like a professional', examples: 'Ice bath, infrared sauna, hypervolt, NormaTec boots' },
    ],
    whatToLookFor: [
      'Foam roller — firm density for glutes and IT band, softer for back',
      'Resistance bands — set of 3 different resistances minimum',
      'Magnesium glycinate before bed — reduces soreness significantly',
      'Compression socks after long runs — reduces next-day swelling',
      'Sleep is the most powerful recovery tool available — protect it',
      'Protein within 30 minutes of training — non-negotiable for muscle repair',
    ],
    priceTiers: [
      { tier: 'Budget', range: '$20-50', note: 'Foam roller + bands kit — everything you need to start' },
      { tier: 'Mid', range: '$80-150', note: 'Theragun Mini, quality sleep supplements — noticeable difference' },
      { tier: 'Elite', range: '$300+', note: 'Ice bath setup, NormaTec compression — professional recovery' },
    ],
    norse: 'Odin himself rested. The Einherjar feasted and recovered between battles. Recovery is not the absence of training — it is part of the saga.',
  },
];

const WARRIOR_GEAR = [
  {
    id: 'shoes',
    name: 'Training Shoes',
    rune: 'ᚦ',
    color: '#C9A84C',
    tagline: 'Your foundation. Literally.',
    why: 'Most guys train in whatever shoes they have. This is a mistake. Running shoes have a raised heel and cushioning that destabilizes your squat base and reduces power transfer to the floor. Flat, stiff-soled shoes add measurable weight to your lifts and protect your joints. This single change will improve your squat and deadlift immediately.',
    levels: [
      { name: 'Cross Trainer', desc: 'General gym, HIIT, cardio days', examples: 'Nike Metcon, Reebok Nano, New Balance Minimus' },
      { name: 'Lifting Flat', desc: 'Deadlifts, rows, hip hinge work', examples: 'Converse Chuck Taylors, Vans — flat and stiff' },
      { name: 'Lifting Heel', desc: 'Olympic squats, front squats', examples: 'Nike Romaleos, Adidas Adipower, Pendlay Do-Wins' },
    ],
    whatToLookFor: [
      'Zero or minimal drop for deadlifts — you want floor contact',
      'Elevated heel (0.75-1") for squat depth if mobility is limited',
      'Wide toe box — your foot should spread naturally under load',
      'Stiff sole — you should not be able to twist the shoe easily',
      'Replace every 300-500 miles for running shoes',
      'Keep separate shoes for lifting and cardio — it matters',
    ],
    priceTiers: [
      { tier: 'Budget', range: '$30-60', note: 'Converse Chuck Taylor — the original lifting flat, still excellent' },
      { tier: 'Mid', range: '$100-140', note: 'Nike Metcon 8, Reebok Nano X — best all-rounders' },
      { tier: 'Elite', range: '$180-240', note: 'Nike Romaleos 4, Adidas Adipower — serious Olympic lifting' },
    ],
    norse: 'A Viking warrior chose his boots based on the terrain. You choose yours based on the lift. The foundation of Valhalla was solid. So is yours.',
  },
  {
    id: 'belt',
    name: 'Belt & Straps',
    rune: 'ᚢ',
    color: '#8B1A1A',
    tagline: 'Tool, not crutch. Know the difference.',
    why: 'A lifting belt does not replace core strength — it enhances intra-abdominal pressure for maximal effort sets. Used correctly, it allows you to lift heavier safely. Used incorrectly, it masks weakness and creates dependency. Straps extend your grip endurance so back fatigue, not grip, becomes the limiting factor on heavy pulls.',
    levels: [
      { name: 'Belt — When to use', desc: 'Working sets above 80% of 1RM on squat, deadlift, overhead press', examples: 'Not for warm-ups. Not for accessory work.' },
      { name: 'Straps — When to use', desc: 'Heavy rows, RDLs, rack pulls — when grip fails before the target muscle', examples: 'Not for curls. Not to avoid building grip strength.' },
      { name: 'Chalk', desc: 'Before straps — maximize natural grip first', examples: 'Liquid chalk for gyms that restrict block chalk' },
    ],
    whatToLookFor: [
      'Belt width: 4" all the way around for powerlifting, tapered for Olympic',
      'Leather belts last decades — velcro belts are for beginners',
      'Belt should fit snugly — not uncomfortably tight at rest',
      'Brace INTO the belt — do not suck your stomach in',
      'Straps: cotton for moderate weight, leather for heavy pulls',
      'Never use straps on deadlifts in competition — train without sometimes',
    ],
    priceTiers: [
      { tier: 'Budget', range: '$30-50', note: 'Harbinger belt and straps — solid entry point, will last years' },
      { tier: 'Mid', range: '$80-120', note: 'Inzer Forever Belt, SBD straps — noticeable quality difference' },
      { tier: 'Elite', range: '$150-200', note: 'Pioneer Cut Belt, custom leather — buy once, use forever' },
    ],
    norse: 'The belt is your war armor for the spine. The straps are your shield for the hands. A warrior knows when to use his shield and when to fight bare-handed.',
  },
  {
    id: 'compression',
    name: 'Compression & Base Layer',
    rune: 'ᚱ',
    color: '#2A4A6B',
    tagline: 'What you wear under the armor matters.',
    why: 'Compression gear reduces muscle oscillation during impact training, which reduces micro-damage and next-day soreness. It also improves proprioception — your awareness of where your body is in space — which improves movement quality under fatigue. This is not broscience. It is biomechanics.',
    levels: [
      { name: 'Shorts', desc: 'Squats, lunges, leg day — freedom of movement', examples: '5" inseam minimum for deep squat, no restriction' },
      { name: 'Tights / Compression', desc: 'Running, HIIT, heavy leg sessions', examples: '3/4 or full length, graduated compression from ankle' },
      { name: 'Top Layer', desc: 'T-shirt or tank — moisture wicking essential', examples: 'Polyester blend, not cotton — cotton holds sweat' },
    ],
    whatToLookFor: [
      'Never cotton for training — it holds moisture and causes chafing',
      'Four-way stretch minimum for lower body work',
      'Flat lock seams prevent inner thigh chafing on long sessions',
      'Compression tights should feel firm but not restrict circulation',
      'Odor-resistant fabric is worth paying for if you train daily',
      'Dark colors for heavy sessions when sweating heavily',
    ],
    priceTiers: [
      { tier: 'Budget', range: '$20-40', note: 'Under Armour HeatGear, Nike Dri-FIT — reliable performance basics' },
      { tier: 'Mid', range: '$50-80', note: 'Lululemon ABC shorts, 2XU tights — premium feel, long lasting' },
      { tier: 'Elite', range: '$100-150', note: '2XU MCS, Skins A400 — professional compression technology' },
    ],
    norse: 'The Einherjar did not train in their feast clothes. Purpose-built training gear is not vanity — it is preparation. Dress for the battle you are fighting.',
  },
  {
    id: 'recovery',
    name: 'Recovery Arsenal',
    rune: 'ᛁ',
    color: '#4A5A6B',
    tagline: 'The forge cools between battles. So do you.',
    why: 'Strength is not built in the gym. It is built in the recovery period between sessions. The warriors who grow fastest are not those who train hardest — they are those who recover most efficiently. Sleep, nutrition, and targeted recovery tools are what separate the warriors from the legends.',
    levels: [
      { name: 'Foundation', desc: 'Non-negotiable basics every warrior needs', examples: 'Foam roller, lacrosse ball, resistance bands' },
      { name: 'Accelerate', desc: 'Tools that meaningfully speed recovery', examples: 'Massage gun, creatine, magnesium, cold therapy' },
      { name: 'Optimize', desc: 'Elite-level recovery protocols', examples: 'Ice bath, sauna access, NormaTec, sleep tracking' },
    ],
    whatToLookFor: [
      '8 hours sleep is more anabolic than any supplement — protect it',
      'Creatine monohydrate — the most studied supplement, just works',
      'Magnesium glycinate before bed — reduces DOMS significantly',
      'Cold exposure within 1 hour of training reduces inflammation',
      'Foam roll before — dynamic stretch after, not before',
      '0.8-1g protein per pound bodyweight minimum for muscle repair',
    ],
    priceTiers: [
      { tier: 'Budget', range: '$30-60', note: 'Foam roller, creatine, magnesium — highest ROI recovery stack' },
      { tier: 'Mid', range: '$100-200', note: 'Theragun Elite, quality creatine, cold shower protocol' },
      { tier: 'Elite', range: '$500+', note: 'Ice bath, infrared sauna, Oura Ring sleep tracking, NormaTec' },
    ],
    norse: 'Odin gained wisdom through sacrifice and rest. The forge that never cools produces brittle iron. Rest is not weakness — it is the making of a legend.',
  },
];

export default function GearGuideModal() {
  const { isShieldmaiden } = useWarriorProfile();
  const [activeTab, setActiveTab] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const gear = isShieldmaiden ? SHIELDMAIDEN_GEAR : WARRIOR_GEAR;
  const accentColor = isShieldmaiden ? '#D4A8C4' : Colors.gold;
  const activeGear = gear[activeTab];

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  function switchTab(i: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(i);
  }

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.12] });

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0A0810', '#050508']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.topGlow, { opacity: glowOpacity, backgroundColor: accentColor }]} />
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
              <Text style={[styles.eyebrow, { color: accentColor }]}>
                {isShieldmaiden ? 'VALKYRIE' : 'WARRIOR'} ARSENAL
              </Text>
              <Text style={styles.title}>GEAR GUIDE</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.headerDesc}>
            {isShieldmaiden
              ? 'The right gear is not vanity. It is preparation. Every Valkyrie equips herself for the battle ahead.'
              : 'The right tool for the right battle. Equipment is not an excuse — it is an investment in your performance.'}
          </Text>

          {/* Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
          >
            {gear.map((g, i) => {
              const isActive = activeTab === i;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.tab,
                    isActive && { borderColor: `${g.color}50`, backgroundColor: `${g.color}10` },
                  ]}
                  onPress={() => switchTab(i)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabRune, { color: isActive ? g.color : Colors.textMuted }]}>
                    {g.rune}
                  </Text>
                  <Text style={[styles.tabName, isActive && { color: g.color }]}>
                    {g.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Active gear card */}
          <View style={[styles.gearCard, { borderColor: `${activeGear.color}25` }]}>
            <LinearGradient
              colors={[`${activeGear.color}08`, 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['transparent', activeGear.color, 'transparent']}
              style={styles.gearCardLine}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />

            <View style={styles.gearCardTop}>
              <Text style={[styles.gearRune, { color: activeGear.color }]}>{activeGear.rune}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.gearName, { color: activeGear.color }]}>{activeGear.name}</Text>
                <Text style={styles.gearTagline}>{activeGear.tagline}</Text>
              </View>
            </View>

            {/* Why it matters */}
            <View style={styles.whySection}>
              <Text style={styles.subLabel}>WHY IT MATTERS</Text>
              <Text style={styles.whyText}>{activeGear.why}</Text>
            </View>

            {/* Levels */}
            <Text style={styles.subLabel}>CHOOSE YOUR LEVEL</Text>
            <View style={styles.levelsWrap}>
              {activeGear.levels.map((level, i) => (
                <View key={i} style={[styles.levelRow, i < activeGear.levels.length - 1 && styles.levelRowBorder]}>
                  <View style={[styles.levelDot, { backgroundColor: activeGear.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.levelName, { color: activeGear.color }]}>{level.name}</Text>
                    <Text style={styles.levelDesc}>{level.desc}</Text>
                    <Text style={styles.levelExamples}>{level.examples}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* What to look for */}
            <Text style={styles.subLabel}>WHAT TO LOOK FOR</Text>
            <View style={styles.checkList}>
              {activeGear.whatToLookFor.map((item, i) => (
                <View key={i} style={styles.checkRow}>
                  <Text style={[styles.checkMark, { color: activeGear.color }]}>ᚦ</Text>
                  <Text style={styles.checkText}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Price tiers */}
            <Text style={styles.subLabel}>PRICE GUIDE</Text>
            <View style={styles.priceTiers}>
              {activeGear.priceTiers.map((tier, i) => (
                <View key={i} style={[styles.priceTier, { borderColor: `${activeGear.color}20` }]}>
                  <LinearGradient
                    colors={[`${activeGear.color}06`, 'transparent']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.priceTierTop}>
                    <Text style={[styles.priceTierName, { color: activeGear.color }]}>{tier.tier}</Text>
                    <Text style={[styles.priceTierRange, { color: activeGear.color }]}>{tier.range}</Text>
                  </View>
                  <Text style={styles.priceTierNote}>{tier.note}</Text>
                </View>
              ))}
            </View>

            {/* Norse wisdom */}
            <View style={[styles.norseCard, { borderColor: `${activeGear.color}20` }]}>
              <LinearGradient
                colors={[`${activeGear.color}06`, 'transparent']}
                style={StyleSheet.absoluteFill}
              />
              <Text style={[styles.norseRune, { color: activeGear.color }]}>{activeGear.rune}</Text>
              <Text style={[styles.norseText, { color: Colors.textMuted }]}>{activeGear.norse}</Text>
            </View>
          </View>

          {/* Bottom runes */}
          <View style={styles.bottomRunes}>
            <Text style={[styles.bottomRuneText, { color: `${accentColor}10` }]}>
              ᚠ  ᚢ  ᚦ  ᚨ  ᚱ  ᚲ  ᚷ  ᚹ
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
  content: { paddingBottom: 60 },

  topGlow: {
    position: 'absolute',
    top: -80,
    left: width * 0.1,
    width: width * 0.8,
    height: 280,
    borderRadius: 999,
    transform: [{ scaleX: 1.3 }, { scaleY: 0.4 }],
    pointerEvents: 'none',
  },
  watermark: {
    position: 'absolute',
    bottom: 80, right: -30,
    fontSize: 200,
    color: 'rgba(201,168,76,0.02)',
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
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 30,
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
    lineHeight: 20,
  },

  // Tabs
  tabsRow: {
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  tab: {
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
  tabRune: {
    fontSize: 18,
    fontFamily: 'System',
  },
  tabName: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 0.5,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Gear card
  gearCard: {
    marginHorizontal: Spacing.lg,
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,8,16,0.9)',
    gap: 16,
    marginBottom: Spacing.lg,
  },
  gearCardLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  gearCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  gearRune: {
    fontSize: 36,
    fontFamily: 'System',
    opacity: 0.7,
    marginTop: -4,
  },
  gearName: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  gearTagline: {
    fontFamily: Fonts.proseItalic,
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  subLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 3,
    color: Colors.textMuted,
    marginBottom: -4,
  },

  // Why section
  whySection: { gap: 8 },
  whyText: {
    fontFamily: Fonts.prose,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 21,
  },

  // Levels
  levelsWrap: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: Spacing.md,
  },
  levelRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  levelDot: {
    width: 6, height: 6,
    borderRadius: 3,
    marginTop: 6,
    opacity: 0.7,
  },
  levelName: {
    fontFamily: Fonts.subheading,
    fontSize: 13,
    marginBottom: 2,
  },
  levelDesc: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 2,
    lineHeight: 17,
  },
  levelExamples: {
    fontFamily: Fonts.proseItalic,
    fontSize: 11,
    color: Colors.textDim,
    fontStyle: 'italic',
    lineHeight: 16,
  },

  // Check list
  checkList: { gap: 8 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkMark: {
    fontSize: 12,
    fontFamily: 'System',
    marginTop: 2,
    opacity: 0.7,
  },
  checkText: {
    flex: 1,
    fontFamily: Fonts.prose,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 19,
  },

  // Price tiers
  priceTiers: { gap: 8 },
  priceTier: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    overflow: 'hidden',
    gap: 4,
  },
  priceTierTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceTierName: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  priceTierRange: {
    fontFamily: Fonts.heading,
    fontSize: 15,
  },
  priceTierNote: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },

  // Norse wisdom
  norseCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  norseRune: {
    fontSize: 22,
    fontFamily: 'System',
    opacity: 0.5,
    marginTop: 2,
  },
  norseText: {
    flex: 1,
    fontFamily: Fonts.proseItalic,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  bottomRunes: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  bottomRuneText: {
    fontFamily: 'System',
    fontSize: 13,
    letterSpacing: 10,
  },
});