import { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useWarriorStore } from '@/lib/store';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

const ACCENT = '#D4A8C4';

interface LegendaryWoman {
  name: string;
  title: string;
  rune: string;
  era: string;
  archetype: string;
  story: string;
  verse: string;
  unlockAt: number;
}

const WOMEN: LegendaryWoman[] = [
  {
    name: 'FREYA',
    title: 'Goddess of War & Love',
    rune: 'ᚠ',
    era: 'Norse Mythology',
    archetype: 'THE SOVEREIGN',
    story: 'Freya rides into battle on a chariot pulled by cats, her tears turning to gold. Of all who fall in battle, she takes the first half to her hall Fólkvangr — even before Odin. She is both the goddess of love and the first Valkyrie, proving that tenderness and ferocity are never opposites.',
    verse: '"She is the most glorious of the goddesses. Hers is the first choice of the slain." — Prose Edda',
    unlockAt: 0,
  },
  {
    name: 'BRYNHILDR',
    title: 'The Greatest Valkyrie',
    rune: 'ᛒ',
    era: 'Volsunga Saga',
    archetype: 'THE DEFIANT',
    story: 'Brynhildr disobeyed Odin himself — she granted victory to a warrior Odin had condemned to die. For this, Odin put her to sleep surrounded by a wall of fire, to be claimed by whoever dared cross it. When the hero Sigurd rode through the flames, he found the greatest Valkyrie in full armor, unyielding even in sleep.',
    verse: '"She slept in full armor, and none could wake her. Through fire he rode, and she did not yield." — Volsunga Saga',
    unlockAt: 1,
  },
  {
    name: 'LAGERTHA',
    title: 'The Shieldmaiden of Legend',
    rune: 'ᛚ',
    era: 'c. 9th Century',
    archetype: 'THE SHIELDMAIDEN',
    story: 'Lagertha is the most famous shieldmaiden in the Norse world. When Ragnar Lothbrok came to avenge her village, she fought beside him in disguise alongside the men. He won the battle because of her. She later ruled as Jarl in her own right, and when an earl attempted to take her by force, she killed him herself with a spearhead she had concealed in her dress.',
    verse: '"She had the courage of a man, and fought in front among the bravest with her hair loose over her shoulders." — Saxo Grammaticus',
    unlockAt: 2,
  },
  {
    name: 'HERVOR',
    title: 'The Skjaldmær',
    rune: 'ᚺ',
    era: 'Hervarar Saga',
    archetype: 'THE FEARLESS',
    story: "Hervor was the most famous skjaldmær — shieldmaiden — in the sagas. She disguised herself as a man, led a crew of Vikings, and sailed alone at night to the cursed island of Samsø to wake her dead father's ghost. In the dark, surrounded by the fires of Hel, she demanded he give her the cursed sword Tyrfing. He warned her it would destroy her line. She took it anyway.",
    verse: '"I sailed to Munarvágr alone. At night. I walked among the dead. I asked for what was mine." — Hervarar Saga',
    unlockAt: 3,
  },
  {
    name: 'GUDRUN',
    title: 'The Avenging Queen',
    rune: 'ᚷ',
    era: 'Volsunga Saga',
    archetype: 'THE AVENGER',
    story: 'Gudrun lost her brothers to treachery. Rather than mourn, she acted. She served their killer his own sons at a feast, told him what he had eaten, then took up a sword and joined the assault that ended his life. She was not celebrated for softness. She was feared for her memory and her willingness to pay every debt — in full.',
    verse: '"She served him wine and the flesh of his sons, and told him what it was. This was her revenge." — Atlamál',
    unlockAt: 4,
  },
  {
    name: 'SIGRUN',
    title: 'The Valkyrie Who Chose',
    rune: 'ᛋ',
    era: 'Helgakviða Hundingsbana',
    archetype: 'THE CHOOSER',
    story: "Sigrun was a Valkyrie who chose her own husband — the hero Helgi — against her father's explicit command. Her father had betrothed her to another man without her consent. She went to Helgi anyway, fought alongside him in the battle that resulted, and when he fell in another war she wept not like a woman who had been denied, but like a warrior who had lost her equal.",
 verse: `"She chose him against her father's will, and for this she grieved like a warrior, not a widow." — Helgakviða`,
    unlockAt: 5,
  },
  {
    name: 'SKULD',
    title: 'The Norn of Future',
    rune: 'ᛋ',
    era: 'Norse Mythology',
    archetype: 'THE WEAVER',
    story: 'Skuld is one of the three Norns who sit at the Well of Urð beneath Yggdrasil and weave the fates of gods and men. Her name means "Debt" or "Future." She cuts the thread when she decides. She is not cruel — she is inevitable. Every warrior who has ever died in battle died at the moment Skuld chose. To train hard is to earn a longer thread.',
    verse: '"Urðr carved the past. Verðandi carved the present. Skuld will carve what must come." — Völuspá',
    unlockAt: 6,
  },
  {
    name: 'ÞÓRGERÐR',
    title: 'She Who Fought With Ten Arrows',
    rune: 'ᚦ',
    era: 'Battle of Hjörungavágr, c. 986',
    archetype: 'THE DESTROYER',
    story: 'At the Battle of Hjörungavágr, when the Norse fleet was losing against the Jomsvikings, Jarl Hákon prayed to the goddess Þórgerðr Hölgabrúðr. A storm rose. And then — witnesses said — two women appeared in the bows of the Norse ships, firing arrows into the enemy. One arrow for every finger. Ten arrows at once. The Jomsvikings broke. They could not kill what could not be touched.',
    verse: '"She appeared at the prow in the storm. One arrow for every finger. The enemy could not touch her." — Njáls Saga',
    unlockAt: 7,
  },
];

export default function ValkyrieCodexScreen() {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(WOMEN.map(() => new Animated.Value(0))).current;
  const [expanded, setExpanded] = useState<string | null>(null);

  const unlockedCount = WOMEN.length;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    ).start();
    WOMEN.forEach((_, i) => {
      Animated.timing(cardAnims[i], {
        toValue: 1, duration: 500, delay: 100 + i * 100, useNativeDriver: true,
      }).start();
    });
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.22] });

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#100810', '#050508', '#0C0810']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.topGlow, { opacity: glowOpacity }]} />
      <Animated.View style={[styles.sideGlow, { opacity: glowOpacity }]} />
      <Text style={styles.bgRune}>ᚠ</Text>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← BACK</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            <View style={styles.titleBlock}>
              <Text style={styles.eyebrow}>FOR THE SHIELDMAIDEN</Text>
              <Text style={styles.title}>VALKYRIE{'\n'}CODEX</Text>
              <View style={styles.runeRow}>
                <View style={[styles.runeLine, { backgroundColor: `${ACCENT}30` }]} />
                <Text style={[styles.runeRowText, { color: `${ACCENT}50` }]}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ  ᚲ</Text>
                <View style={[styles.runeLine, { backgroundColor: `${ACCENT}30` }]} />
              </View>
              <Text style={styles.subtitle}>
                Eight women who shaped the Norse world.{'\n'}Their stories belong to you.
              </Text>
            </View>

            {WOMEN.map((woman, i) => {
              const isExpanded = expanded === woman.name;
              return (
                <Animated.View
                  key={woman.name}
                  style={{
                    opacity: cardAnims[i],
                    transform: [{
                      translateY: cardAnims[i].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
                    }],
                  }}
                >
                  <TouchableOpacity
                    style={[styles.womanCard, isExpanded && styles.womanCardExpanded]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setExpanded(isExpanded ? null : woman.name);
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={isExpanded
                        ? [`${ACCENT}10`, `${ACCENT}04`, 'transparent']
                        : ['rgba(255,255,255,0.03)', 'transparent']}
                      style={StyleSheet.absoluteFill}
                    />
                    {isExpanded && (
                      <LinearGradient
                        colors={['transparent', ACCENT, 'transparent']}
                        style={styles.womanCardTopLine}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      />
                    )}
                    <Text style={[styles.womanWatermark, isExpanded && { color: `${ACCENT}08` }]}>
                      {woman.rune}
                    </Text>
                    <View style={styles.womanHeader}>
                      <View style={[styles.womanRuneBadge, isExpanded && { backgroundColor: `${ACCENT}15`, borderColor: `${ACCENT}40` }]}>
                        <Text style={[styles.womanRuneChar, isExpanded && { color: ACCENT }]}>{woman.rune}</Text>
                      </View>
                      <View style={styles.womanHeaderText}>
                        <Text style={[styles.womanArchetype, isExpanded && { color: `${ACCENT}80` }]}>
                          {woman.archetype}
                        </Text>
                        <Text style={[styles.womanName, isExpanded && { color: ACCENT }]}>
                          {woman.name}
                        </Text>
                        <Text style={styles.womanTitle}>{woman.title}</Text>
                      </View>
                      <Text style={[styles.womanChevron, isExpanded && { color: ACCENT }]}>
                        {isExpanded ? '↑' : '↓'}
                      </Text>
                    </View>
                    <View style={[styles.eraBadge, isExpanded && { borderColor: `${ACCENT}30`, backgroundColor: `${ACCENT}08` }]}>
                      <Text style={[styles.eraText, isExpanded && { color: ACCENT }]}>{woman.era}</Text>
                    </View>
                    {isExpanded && (
                      <View style={styles.womanExpanded}>
                        <View style={styles.storyDivider}>
                          <View style={[styles.storyDividerLine, { backgroundColor: `${ACCENT}20` }]} />
                          <Text style={[styles.storyDividerRune, { color: `${ACCENT}50` }]}>{woman.rune}</Text>
                          <View style={[styles.storyDividerLine, { backgroundColor: `${ACCENT}20` }]} />
                        </View>
                        <Text style={styles.womanStory}>{woman.story}</Text>
                        <View style={[styles.verseBlock, { borderColor: `${ACCENT}20`, backgroundColor: `${ACCENT}06` }]}>
                          <LinearGradient colors={['transparent', ACCENT, 'transparent']} style={styles.verseBlockLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                          <Text style={[styles.verseText, { color: `${ACCENT}90` }]}>{woman.verse}</Text>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}

            <View style={styles.bottom}>
              <Text style={[styles.bottomRunes, { color: `${ACCENT}20` }]}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ  ᚲ  ᚷ  ᚹ</Text>
              <Text style={styles.bottomNote}>
                These women lived, fought, and chose their own fate.{'\n'}
                Their sagas were told for a thousand years.{'\n'}
                Yours is still being written.
              </Text>
            </View>

          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  container: { flex: 1 },

  topGlow: {
    position: 'absolute', top: -100, left: width * 0.05,
    width: width * 0.9, height: 400,
    backgroundColor: '#8B3A6A',
    borderRadius: 999,
    transform: [{ scaleX: 1.2 }, { scaleY: 0.4 }],
    pointerEvents: 'none',
  },
  sideGlow: {
    position: 'absolute', right: -40, top: height * 0.3,
    width: 120, height: height * 0.4,
    backgroundColor: ACCENT,
    borderRadius: 999,
    transform: [{ scaleX: 0.3 }],
    pointerEvents: 'none',
  },
  bgRune: {
    position: 'absolute', fontSize: 400, fontFamily: 'System',
    color: 'rgba(212,168,196,0.025)', top: 30, left: -60,
    lineHeight: 400, pointerEvents: 'none',
  },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  backBtnText: { fontFamily: Fonts.body, fontSize: 11, letterSpacing: 2, color: Colors.textMuted },

  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 60 },

  titleBlock: { alignItems: 'center', gap: 10, marginBottom: Spacing.lg },
  eyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 5, color: `${ACCENT}70` },
  title: {
    fontFamily: Fonts.display, fontSize: 46, color: ACCENT,
    letterSpacing: 4, textAlign: 'center', lineHeight: 52,
    textShadowColor: `${ACCENT}40`,
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24,
  },
  runeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '90%' },
  runeLine: { flex: 1, height: 1 },
  runeRowText: { fontFamily: 'System', fontSize: 11, letterSpacing: 5 },
  subtitle: {
    fontFamily: Fonts.proseItalic, fontSize: 13,
    color: Colors.textMuted, textAlign: 'center',
    lineHeight: 20, fontStyle: 'italic',
  },

  womanCard: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18, padding: Spacing.md,
    overflow: 'hidden', backgroundColor: 'rgba(8,6,12,0.95)',
    marginBottom: 8, gap: 10,
  },
  womanCardExpanded: { borderColor: `${ACCENT}30`, marginBottom: 14 },
  womanCardTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  womanWatermark: {
    position: 'absolute', right: 10, bottom: 6,
    fontSize: 72, fontFamily: 'System',
    color: 'rgba(255,255,255,0.025)', lineHeight: 76,
  },
  womanHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  womanRuneBadge: {
    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center', justifyContent: 'center',
  },
  womanRuneChar: { fontSize: 22, fontFamily: 'System', color: Colors.textMuted },
  womanHeaderText: { flex: 1, gap: 1 },
  womanArchetype: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 3, color: Colors.textDim },
  womanName: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.text, letterSpacing: 1 },
  womanTitle: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
  womanChevron: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textDim, marginTop: 4 },
  eraBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radii.full,
    paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  eraText: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 1.5, color: Colors.textDim },
  womanExpanded: { gap: 14 },
  storyDivider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storyDividerLine: { flex: 1, height: 1 },
  storyDividerRune: { fontFamily: 'System', fontSize: 16 },
  womanStory: {
    fontFamily: Fonts.prose, fontSize: 14,
    color: Colors.text, lineHeight: 24,
  },
  verseBlock: {
    borderWidth: 1, borderRadius: 12,
    padding: Spacing.md, overflow: 'hidden',
  },
  verseBlockLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  verseText: {
    fontFamily: Fonts.proseItalic, fontSize: 12,
    fontStyle: 'italic', lineHeight: 20,
  },
  bottom: { alignItems: 'center', paddingTop: Spacing.xl, gap: 10 },
  bottomRunes: { fontFamily: 'System', fontSize: 12, letterSpacing: 8 },
  bottomNote: {
    fontFamily: Fonts.proseItalic, fontSize: 12,
    color: Colors.textDim, textAlign: 'center',
    fontStyle: 'italic', lineHeight: 20,
  },
});