import { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWarriorStore } from '@/lib/store';
import { getRank, getRankTitle } from '@/constants/ranks';
import { getRealm, NINE_REALMS } from '@/constants/realms';
import { useWarriorProfile } from '@/lib/useWarriorProfile';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

// Real illustrated realm art — same offline-generated, dark-painterly
// style as the raven artwork and boss portraits. Keyed by the exact
// `name` string used in constants/realms.ts (which includes accented
// characters), mapped to the plain-caps filenames actually saved on disk.
// Vanaheim, Álfheim, Helheim, and Asgard were generated as wide 16:9
// landscape scenes rather than square object crops — they still render
// fine via resizeMode="cover", which crops to fill the box rather than
// distorting or letterboxing them.
const REALM_IMAGES: Record<string, any> = {
  'Midgard': require('@/assets/images/MIDGARD.png'),
  'Niflheim': require('@/assets/images/NIFLHEIM.png'),
  'Muspelheim': require('@/assets/images/MUSPELHEIM.png'),
  'Jötunheim': require('@/assets/images/JOTUNHEIM.png'),
  'Svartálfheim': require('@/assets/images/SVARTALFHEIM.png'),
  'Vanaheim': require('@/assets/images/VANAHEIM.png'),
  'Álfheim': require('@/assets/images/ALFHEIM.png'),
  'Helheim': require('@/assets/images/HELHEIM.png'),
  'Asgard': require('@/assets/images/ASGARD.png'),
};

export default function NineRealmsScreen() {
  const { warrior } = useWarriorStore();
  const { isShieldmaiden } = useWarriorProfile();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const xp = warrior?.total_xp ?? 0;
  const rank = getRank(xp);
  const realm = getRealm(xp);
  const heroImage = REALM_IMAGES[realm.name];

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile' as any);
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0A0812', '#050508']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>THE NINE REALMS</Text>
        </View>

        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero — current realm, large, with the real illustrated art
              as a full-width banner behind the text content. */}
          <View style={[styles.heroCard, { borderColor: `${realm.color}35` }]}>
            {heroImage && (
              <Image
                source={heroImage}
                style={realm.name === 'Midgard' ? styles.heroImageMidgard : styles.heroImage}
                resizeMode="cover"
              />
            )}
            <LinearGradient
              // colors={['rgba(5,4,8,0.35)', 'rgba(5,4,8,0.85)', 'rgba(5,4,8,0.96)']}
             colors={['rgba(5,4,8,0.1)', 'rgba(5,4,8,0.5)', 'rgba(5,4,8,0.92)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.heroIconWrap, { borderColor: `${realm.color}45`, backgroundColor: `${realm.color}15` }]}>
              <Text style={[styles.heroIcon, { color: realm.color }]}>{realm.rune}</Text>
            </View>
            <Text style={styles.heroEyebrow}>YOU ARE NOW WALKING</Text>
            <Text style={[styles.heroName, { color: realm.color }]}>{realm.name}</Text>
            <Text style={styles.heroDesc}>{realm.description}</Text>

            {realm.nextRealm ? (
              <View style={styles.heroProgressWrap}>
                <View style={styles.heroProgressTrack}>
                  <View style={[styles.heroProgressFill, { width: `${Math.round(realm.progress * 100)}%`, backgroundColor: realm.color }]} />
                </View>
                <Text style={styles.heroProgressText}>
                  {(realm.nextRealm.minXP - xp).toLocaleString()} Valor until {realm.nextRealm.name}
                </Text>
              </View>
            ) : (
              <View style={[styles.arrivedBadge, { borderColor: `${realm.color}50`, backgroundColor: `${realm.color}15` }]}>
                <Text style={[styles.arrivedBadgeText, { color: realm.color }]}>THE HALL LIES OPEN</Text>
              </View>
            )}
          </View>

          {/* The framing line resolving rank-vs-realm */}
          <View style={styles.framingCard}>
            <Text style={styles.framingText}>
              Being named <Text style={{ color: Colors.gold }}>{getRankTitle(rank, isShieldmaiden)}</Text> means
              the Valkyries have chosen you — but even the chosen must walk the Nine Realms
              before they stand in Odin's hall.
            </Text>
          </View>

          {/* Full list of all 9 realms */}
          <Text style={styles.sectionLabel}>THE FULL JOURNEY</Text>
          <View style={styles.realmsList}>
            {NINE_REALMS.map((r, i) => {
              const reached = i <= realm.index;
              const isCurrent = i === realm.index;
              const image = REALM_IMAGES[r.name];
              return (
                <View
                  key={r.name}
                  style={[
                    styles.realmRow,
                    i < NINE_REALMS.length - 1 && styles.realmRowBorder,
                    isCurrent && { backgroundColor: `${r.color}08` },
                  ]}
                >
                  <View style={styles.realmRowLeft}>
                    <View style={[
                      styles.realmDot,
                      reached && { backgroundColor: r.color, borderColor: r.color },
                    ]} />
                    {i < NINE_REALMS.length - 1 && (
                      <View style={[styles.realmConnector, reached && i < realm.index && { backgroundColor: r.color }]} />
                    )}
                  </View>

                  <View style={[
                    styles.realmIconBox,
                    { borderColor: reached ? `${r.color}40` : 'rgba(255,255,255,0.08)' },
                    { backgroundColor: reached ? `${r.color}12` : 'rgba(255,255,255,0.02)' },
                  ]}>
                    {image ? (
                      <Image
                        source={image}
                        style={[styles.realmIconImage, !reached && styles.realmIconImageLocked]}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={[styles.realmIconText, { color: reached ? r.color : 'rgba(255,255,255,0.25)' }]}>{r.rune}</Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.realmRowName,
                      isCurrent && { color: r.color },
                      !reached && styles.realmRowNameLocked,
                    ]}>
                      {r.name.toUpperCase()}
                    </Text>
                    <Text style={styles.realmRowXP}>{r.minXP.toLocaleString()} Valor</Text>
                    {isCurrent && <Text style={styles.realmRowDesc}>{r.description}</Text>}
                  </View>

                  {isCurrent && (
                    <View style={[styles.nowBadge, { borderColor: `${r.color}40`, backgroundColor: `${r.color}15` }]}>
                      <Text style={[styles.nowBadgeText, { color: r.color }]}>NOW</Text>
                    </View>
                  )}
                  {reached && !isCurrent && <Text style={[styles.checkmark, { color: r.color }]}>✓</Text>}
                  {!reached && <Text style={styles.lockIcon}>ᚲ</Text>}
                </View>
              );
            })}
          </View>

          <View style={styles.bottomRunes}>
            <Text style={styles.bottomRuneText}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ  ᚲ  ᚷ  ᚹ</Text>
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

  header: {
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
    alignItems: 'center',
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  backBtnText: { fontFamily: Fonts.body, fontSize: 11, letterSpacing: 2, color: Colors.textMuted },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.text, letterSpacing: 2, marginTop: 4 },

  heroCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderRadius: 20, padding: Spacing.xl,
    alignItems: 'center', gap: 8, overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.9)',
    height: 320,
  },
  // heroImage: {
  //   position: 'absolute', top: -210 , left: -175, right: 0, bottom: 0,
  //   resizeMode: 'cover',
  // transform: [{ scale: 0.5}], // smaller = zoom out
   
  // },
  heroImage: {
  position: 'absolute',
  top: -210,
  left: -455,
  right: 0,
  bottom: 30,
  resizeMode: 'cover',
  transform: [{ scale: 0.5}], // smaller = zoom out
},
  // Midgard is currently the only realm image that's still a square crop
  // (700x700) rather than the wide 1408x768 shape all 8 other realms use
  // — so the manually-tuned offset/scale numbers above (which were dialed
  // in specifically for the wide images) don't apply to it. This is its
  // own dedicated style instead, using the simple, already-proven four-
  // edge-pin technique that correctly fills the card for a square image.
  heroImageMidgard: {
    position: 'absolute', top: -175, left: -174.3, right: 0, bottom: 0,
    resizeMode: 'cover',
    transform: [{ scale: 0.5}],
  },
  heroIconWrap: {
    width: 72, height: 72, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  heroIcon: { fontSize: 34, fontFamily: 'System' },
  heroEyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, color: Colors.textMuted },
  heroName: { fontFamily: Fonts.display, fontSize: 30, letterSpacing: 1, marginTop: 2 },
  heroDesc: {
    fontFamily: Fonts.proseItalic, fontSize: 13, color: Colors.textMuted,
    fontStyle: 'italic', textAlign: 'center', lineHeight: 19, marginTop: 4,
  },
  heroProgressWrap: { width: '100%', marginTop: 10, gap: 6 },
  heroProgressTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  heroProgressFill: { height: '100%', borderRadius: 3 },
  heroProgressText: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 0.5, color: Colors.textMuted, textAlign: 'center' },
  arrivedBadge: { borderWidth: 1, borderRadius: Radii.full, paddingHorizontal: 16, paddingVertical: 6, marginTop: 8 },
  arrivedBadgeText: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 2 },

  framingCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
    padding: Spacing.lg, backgroundColor: 'rgba(12,10,16,0.6)',
  },
  framingText: {
    fontFamily: Fonts.proseItalic, fontSize: 13, color: Colors.textMuted,
    fontStyle: 'italic', lineHeight: 20, textAlign: 'center',
  },

  sectionLabel: {
    fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, color: Colors.textMuted,
    paddingHorizontal: Spacing.lg, marginBottom: 10,
  },

  realmsList: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
    overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.7)',
  },
  realmRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  realmRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  realmRowLeft: { alignItems: 'center', width: 12 },
  realmDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 1,
  },
  realmConnector: { width: 2, flex: 1, minHeight: 20, backgroundColor: 'rgba(255,255,255,0.05)', marginTop: 2 },
  realmIconBox: {
    width: 40, height: 40, borderRadius: 11, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  realmIconImage: { width: 40, height: 40, resizeMode: 'cover' },
  realmIconImageLocked: { opacity: 0.35 },
  realmIconText: { fontSize: 18, fontFamily: 'System' },
  realmRowName: { fontFamily: Fonts.subheading, fontSize: 13, color: Colors.textMuted, marginBottom: 2 },
  realmRowNameLocked: { color: Colors.textDim },
  realmRowXP: { fontFamily: Fonts.body, fontSize: 9, color: Colors.textDim, letterSpacing: 1 },
  realmRowDesc: { fontFamily: Fonts.proseItalic, fontSize: 11, color: Colors.textMuted, fontStyle: 'italic', marginTop: 3, lineHeight: 16 },
  nowBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  nowBadgeText: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 1 },
  checkmark: { fontSize: 14 },
  lockIcon: { fontSize: 14, color: Colors.textDim, opacity: 0.3, fontFamily: 'System' },

  bottomRunes: { alignItems: 'center', paddingVertical: Spacing.lg },
  bottomRuneText: { fontFamily: 'System', fontSize: 13, color: 'rgba(201,168,76,0.1)', letterSpacing: 10 },
});