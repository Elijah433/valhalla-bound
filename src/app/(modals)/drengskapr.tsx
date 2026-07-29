import { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, ScrollView, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Tenet {
  rune: string;
  name: string;
  oldNorse: string;
  line: string;
  verse: string;
}

const TENETS: Tenet[] = [
  {
    rune: 'ᛏ',
    name: 'COURAGE',
    oldNorse: 'Hugr',
    line: 'The first rep you fear is the one that forges you.',
    verse: 'Be strong and courageous. The gods reward those who answer the call.',
  },
  {
    rune: 'ᛟ',
    name: 'HONOR',
    oldNorse: 'Heiður',
    line: 'Train as if your name depends on it. It does.',
    verse: "Cattle die, kinsmen die — the self must also die. One thing never dies: a dead man's reputation.",
  },
  {
    rune: 'ᛗ',
    name: 'SELF-RELIANCE',
    oldNorse: 'Sjálfstæði',
    line: 'No one carries your bar for you.',
    verse: 'Every man must forge his own saga. No one does it for you.',
  },
  {
    rune: 'ᛉ',
    name: 'PERSEVERANCE',
    oldNorse: 'Þrautseigja',
    line: 'Cattle die. Kinsmen die. The rep you finish never does.',
    verse: 'Even Odin fell. He rose again. So shall you.',
  },
  {
    rune: 'ᛞ',
    name: 'DISCIPLINE',
    oldNorse: 'Agi',
    line: 'Show up when the forge holds no warmth.',
    verse: 'Be not wise in words alone — be wise in deeds.',
  },
  {
    rune: 'ᚨ',
    name: 'WISDOM',
    oldNorse: 'Speki',
    line: 'Train smart, not just hard. Ego makes a poor coach.',
    verse: 'No better burden can a man carry than a store of common sense.',
  },
  {
    rune: 'ᚷ',
    name: 'BROTHERHOOD',
    oldNorse: 'Félagskapur',
    line: 'No warrior finishes the raid alone. Lift with your crew.',
    verse: 'The wolf that hunts alone eats last. Find your war band.',
  },
  {
    rune: 'ᛒ',
    name: 'MODERATION',
    oldNorse: 'Hóf',
    line: 'Push hard, but know when to rest. Burnout is not strength.',
    verse: 'The knowing man is moderate in all things.',
  },
  {
    rune: 'ᛈ',
    name: 'RESOURCEFULNESS',
    oldNorse: 'Úrræði',
    line: 'No excuse stops a true warrior. Adapt the lift, not your commitment.',
    verse: 'The lame can ride. The handless can drive cattle. The deaf can fight and succeed.',
  },
  {
    rune: 'ᛋ',
    name: 'INTEGRITY',
    oldNorse: 'Heilindi',
    line: "Log the truth. Live the training you'd be proud to call your own.",
    verse: 'Fire is best. The sight of the sun. A life without shame.',
  },
];

export default function DrengskaprModal() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  function toggleTenet(i: number) {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpenIndex(openIndex === i ? null : i);
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0C0A10', '#050508']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>PROFILE</Text>
              <Text style={styles.title}>DRENGSKAPR</Text>
              <Text style={styles.subtitle}>Tap a tenet to read the verse it's drawn from</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dividerWrap}>
            <LinearGradient
              colors={['transparent', Colors.gold, 'transparent']}
              style={styles.divider}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {TENETS.map((tenet, i) => {
              const isOpen = openIndex === i;
              return (
                <TouchableOpacity
                  key={tenet.name}
                  style={styles.tenetCard}
                  onPress={() => toggleTenet(i)}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={['rgba(201,168,76,0.04)', 'transparent']} style={StyleSheet.absoluteFill} />
                  <View style={styles.tenetHeaderRow}>
                    <Text style={styles.tenetRune}>{tenet.rune}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tenetName}>
                        {tenet.name}
                        <Text style={styles.tenetOldNorse}>  {tenet.oldNorse}</Text>
                      </Text>
                    </View>
                    <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                  </View>

                  <Text style={styles.tenetLine}>{tenet.line}</Text>

                  {isOpen && (
                    <View style={styles.detailWrap}>
                      <Text style={styles.detailLabel}>FROM THE HÁVAMÁL</Text>
                      <Text style={styles.detailVerse}>"{tenet.verse}"</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            <Text style={styles.footerNote}>
              Drengskapr — an Old Norse word found throughout the sagas,{'\n'}
              meaning honor and courage shown through action.
            </Text>
          </ScrollView>

        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 4, color: Colors.gold, opacity: 0.7, marginBottom: 4 },
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.text, letterSpacing: 1, marginBottom: 6 },
  subtitle: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', maxWidth: 240 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  closeBtnText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted },

  dividerWrap: { marginBottom: 16 },
  divider: { height: 1, width: '100%' },

  scrollContent: { gap: 10, paddingBottom: 40 },

  tenetCard: {
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
    borderRadius: 14, padding: Spacing.md,
    overflow: 'hidden', backgroundColor: 'rgba(10,8,14,0.9)',
  },
  tenetHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tenetRune: { fontSize: 17, fontFamily: 'System', color: Colors.gold, width: 22, textAlign: 'center' },
  tenetName: { fontFamily: Fonts.subheading, fontSize: 13, color: Colors.text, letterSpacing: 1 },
  tenetOldNorse: { fontFamily: Fonts.proseItalic, fontSize: 10, color: Colors.textMuted, fontStyle: 'italic', letterSpacing: 0 },
  chevron: { fontFamily: Fonts.body, fontSize: 10, color: Colors.textDim },

  tenetLine: {
    fontFamily: Fonts.prose, fontSize: 11.5, color: Colors.textMuted,
    lineHeight: 18, marginTop: 6, marginLeft: 32,
  },

  detailWrap: {
    marginTop: 10, marginLeft: 32, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(201,168,76,0.12)',
  },
  detailLabel: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 2, color: Colors.gold, opacity: 0.7, marginBottom: 4 },
  detailVerse: {
    fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textMuted,
    fontStyle: 'italic', lineHeight: 19,
  },

  footerNote: {
    fontFamily: Fonts.proseItalic, fontSize: 11,
    color: Colors.textDim, fontStyle: 'italic',
    textAlign: 'center', lineHeight: 18, marginTop: 8,
  },
});