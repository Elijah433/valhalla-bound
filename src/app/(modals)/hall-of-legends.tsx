import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getLegends, formatTrialResult, type LegendEntry } from '@/lib/weeklyTrial';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function HallOfLegendsScreen() {
  const [legends, setLegends] = useState<LegendEntry[]>([]);
  const [selected, setSelected] = useState<LegendEntry | null>(null);

  useFocusEffect(useCallback(() => {
    getLegends().then(setLegends);
  }, []));

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0C0A10', '#050508']} style={StyleSheet.absoluteFill} />
      <Text style={styles.watermark}>ᛟ</Text>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
              <Text style={styles.backBtnText}>‹</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.eyebrow}>YOUR SAGA</Text>
              <Text style={styles.title}>HALL OF LEGENDS</Text>
            </View>
          </View>

          {legends.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyRune}>ᛟ</Text>
              <Text style={styles.emptyTitle}>No Legends Yet</Text>
              <Text style={styles.emptyText}>
                Complete a Weekly Trial on the Home screen and it will be carved into your saga here — forever.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.countLabel}>{legends.length} {legends.length === 1 ? 'LEGEND' : 'LEGENDS'} EARNED</Text>
              <View style={styles.grid}>
                {legends.map(entry => {
                  const c = entry.seasonColor ?? Colors.gold;
                  const isSelected = selected?.weekIndex === entry.weekIndex;
                  return (
                    <TouchableOpacity
                      key={entry.weekIndex}
                      style={styles.sealTile}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelected(isSelected ? null : entry);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.sealTileOrb, { borderColor: isSelected ? c : `${c}90` }]}>
                        <LinearGradient colors={[c, `${c}85`]} style={StyleSheet.absoluteFill} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} />
                        <Text style={styles.sealTileRune}>{entry.rune}</Text>
                      </View>
                      <Text style={styles.sealTileDate} numberOfLines={1}>
                        {new Date(entry.completedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {selected && (
            <View style={[styles.detailCard, { borderColor: `${(selected.seasonColor ?? Colors.gold)}50` }]}>
              <View style={styles.detailClip}>
                <LinearGradient colors={[`${(selected.seasonColor ?? Colors.gold)}20`, 'transparent']} style={StyleSheet.absoluteFill} />
                <View style={styles.detailInnerEngrave} pointerEvents="none" />
                <View style={[styles.detailCorner, { top: 8, left: 8, borderTopWidth: 1.25, borderLeftWidth: 1.25, borderColor: `${(selected.seasonColor ?? Colors.gold)}90` }]} pointerEvents="none" />
                <View style={[styles.detailCorner, { top: 8, right: 8, borderTopWidth: 1.25, borderRightWidth: 1.25, borderColor: `${(selected.seasonColor ?? Colors.gold)}90` }]} pointerEvents="none" />
                <View style={[styles.detailCorner, { bottom: 8, left: 8, borderBottomWidth: 1.25, borderLeftWidth: 1.25, borderColor: `${(selected.seasonColor ?? Colors.gold)}90` }]} pointerEvents="none" />
                <View style={[styles.detailCorner, { bottom: 8, right: 8, borderBottomWidth: 1.25, borderRightWidth: 1.25, borderColor: `${(selected.seasonColor ?? Colors.gold)}90` }]} pointerEvents="none" />
              </View>

              <TouchableOpacity style={styles.detailCloseBtn} onPress={() => setSelected(null)} hitSlop={10}>
                <Text style={styles.detailCloseBtnText}>✕</Text>
              </TouchableOpacity>

              <View style={styles.detailSealWrap}>
                <View style={[styles.detailSeal, { borderColor: `${(selected.seasonColor ?? Colors.gold)}95` }]}>
                  <LinearGradient colors={[selected.seasonColor ?? Colors.gold, selected.seasonColor ?? Colors.gold]} style={StyleSheet.absoluteFill} />
                  <View style={styles.detailSealInnerRing} />
                  <Text style={styles.detailSealRune}>{selected.rune}</Text>
                </View>
              </View>

              {selected.seasonLabel && (
                <Text style={[styles.detailEyebrow, { color: selected.seasonColor ?? Colors.gold }]}>{selected.seasonLabel}</Text>
              )}
              <Text style={styles.detailTitle}>{selected.title}</Text>
              <Text style={styles.detailMeta}>
                Completed {new Date(selected.completedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>

              <View style={styles.detailStatRow}>
                <Text style={styles.detailStatLabel}>Trial Result</Text>
                <Text style={styles.detailStatValue}>{formatTrialResult(selected)}</Text>
              </View>
              <View style={styles.detailStatRow}>
                <Text style={styles.detailStatLabel}>Workouts That Week</Text>
                <Text style={styles.detailStatValue}>{selected.workoutsThisWeek}</Text>
              </View>
              <View style={[styles.detailStatRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailStatLabel}>Legendary Mark</Text>
                <Text style={[styles.detailStatValue, { color: selected.seasonColor ?? Colors.gold }]}>Earned</Text>
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerRunes}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ</Text>
            <Text style={styles.footerVerse}>"The fame of a good man never dies." — Hávamál</Text>
          </View>
        </ScrollView>
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

  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  backBtn: {
    width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)',
  },
  backBtnText: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.textMuted, marginTop: -2 },
  eyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 4, color: Colors.textMuted, marginBottom: 2 },
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.text, letterSpacing: 1 },

  emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: Spacing.lg, gap: 10 },
  emptyRune: { fontSize: 56, color: 'rgba(201,168,76,0.15)', fontFamily: 'System' },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.text, letterSpacing: 1 },
  emptyText: { fontFamily: Fonts.prose, fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 280 },

  countLabel: { paddingHorizontal: Spacing.lg, marginBottom: 12, fontFamily: Fonts.body, fontSize: 9, letterSpacing: 2, color: Colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: 16, marginBottom: Spacing.lg },
  sealTile: { width: 68, alignItems: 'center', gap: 6 },
  sealTileOrb: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  sealTileRune: {
    fontSize: 22, fontFamily: 'System', color: Colors.void,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1,
  },
  sealTileDate: { fontFamily: Fonts.body, fontSize: 9, color: Colors.textDim, letterSpacing: 0.5 },

  detailCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderWidth: 1.5, borderRadius: 18,
    backgroundColor: 'rgba(22,18,14,0.97)',
    padding: Spacing.lg,
  },
  detailClip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16.5, overflow: 'hidden' },
  detailInnerEngrave: { position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  detailCorner: { position: 'absolute', width: 12, height: 12 },
  detailCloseBtn: {
    position: 'absolute', top: 12, right: 12, width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', zIndex: 1,
  },
  detailCloseBtnText: { fontSize: 12, color: Colors.textMuted },
  detailSealWrap: { alignItems: 'center', marginBottom: 10 },
  detailSeal: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  detailSealInnerRing: { position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderRadius: 29, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  detailSealRune: {
    fontSize: 28, fontFamily: 'System', color: Colors.void,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1,
  },
  detailEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2.5, marginBottom: 4, textAlign: 'center' },
  detailTitle: {
    fontFamily: Fonts.heading, fontSize: 18, color: Colors.text, textAlign: 'center',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1,
  },
  detailMeta: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginBottom: 16 },
  detailStatRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  detailStatLabel: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 1, color: Colors.textMuted },
  detailStatValue: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.text },

  footer: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 8 },
  footerRunes: { fontFamily: 'System', fontSize: 14, color: 'rgba(201,168,76,0.12)', letterSpacing: 8 },
  footerVerse: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textDim, fontStyle: 'italic' },
});