import { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  STRETCHES, BODY_AREAS, searchStretches, getStretchesByArea, STRETCH_FACTS,
  type Stretch, type BodyArea,
} from '@/constants/Stretches';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

function StretchCard({ stretch, expanded, onToggle }: {
  stretch: Stretch; expanded: boolean; onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.stretchCard}
      onPress={onToggle}
      activeOpacity={0.85}
    >
      <View style={styles.stretchCardHeader}>
        <View style={styles.stretchIconWrap}>
          <Text style={styles.stretchIcon}>{stretch.rune}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.stretchName}>{stretch.name}</Text>
          <Text style={styles.stretchPlainName}>{stretch.plainName}</Text>
        </View>
        <View style={styles.stretchDurationWrap}>
          <Text style={styles.stretchDuration}>{stretch.duration}</Text>
          <Text style={styles.stretchExpandIcon}>{expanded ? '−' : '+'}</Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.stretchDetail}>
          <View style={styles.stretchDivider} />

          <Text style={styles.detailLabel}>HOW TO</Text>
          {stretch.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}

          <View style={styles.whyWrap}>
            <Text style={styles.detailLabel}>WHY IT HELPS</Text>
            <Text style={styles.whyText}>{stretch.whyItHelps}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function StretchLibraryScreen() {
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeArea, setActiveArea] = useState<BodyArea | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/mead-hall' as any);
  }

  function toggleStretch(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedId(prev => (prev === id ? null : id));
  }

  const isSearching = query.trim().length > 0;
  const searchResults = isSearching ? searchStretches(query) : [];

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0A0812', '#050508']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>STRETCH LIBRARY</Text>
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={(t) => { setQuery(t); setExpandedId(null); }}
            placeholder="Search by area or symptom — try 'headache'"
            placeholderTextColor={Colors.textDim}
            returnKeyType="search"
          />
          {isSearching && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.searchClearBtn}>
              <Text style={styles.searchClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {isSearching ? (
            <>
              <Text style={styles.sectionLabel}>
                {searchResults.length > 0
                  ? `${searchResults.length} STRETCH${searchResults.length === 1 ? '' : 'ES'} FOUND`
                  : 'NO MATCHES'}
              </Text>
              {searchResults.length === 0 && (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>
                    Try a body area like "lower back," or a symptom like "headache" or "sciatica."
                  </Text>
                </View>
              )}
              {searchResults.map(s => (
                <StretchCard
                  key={s.id}
                  stretch={s}
                  expanded={expandedId === s.id}
                  onToggle={() => toggleStretch(s.id)}
                />
              ))}
            </>
          ) : (
            <>
              {/* Did You Know — one fact per day, rotating through the
                  verified list, same day-of-month cycling pattern used by
                  the Daily Saga card in Profile. */}
              {STRETCH_FACTS.length > 0 && (() => {
                const dayIndex = (new Date().getDate() - 1) % STRETCH_FACTS.length;
                const f = STRETCH_FACTS[dayIndex];
                return (
                  <View key={f.id} style={styles.factCard}>
                    <LinearGradient colors={['rgba(201,168,76,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
                    <Text style={styles.factEyebrow}>DID YOU KNOW</Text>
                    <Text style={styles.factTitle}>{f.title}</Text>
                    <Text style={styles.factText}>{f.fact}</Text>
                    <Text style={styles.factSource}>{f.source}</Text>
                  </View>
                );
              })()}

              {/* Body area filter chips */}
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.areaChipsRow}
              >
                <TouchableOpacity
                  style={[styles.areaChip, activeArea === null && styles.areaChipActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveArea(null); }}
                >
                  <Text style={[styles.areaChipText, activeArea === null && styles.areaChipTextActive]}>ALL</Text>
                </TouchableOpacity>
                {BODY_AREAS.map(a => (
                  <TouchableOpacity
                    key={a.key}
                    style={[styles.areaChip, activeArea === a.key && styles.areaChipActive]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveArea(a.key); }}
                  >
                    <Text style={styles.areaChipRune}>{a.rune}</Text>
                    <Text style={[styles.areaChipText, activeArea === a.key && styles.areaChipTextActive]}>
                      {a.label.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {activeArea === null ? (
                // Grouped by area, in order
                BODY_AREAS.map(area => {
                  const areaStretches = getStretchesByArea(area.key);
                  if (areaStretches.length === 0) return null;
                  return (
                    <View key={area.key}>
                      <Text style={styles.sectionLabel}>{area.rune}  {area.label.toUpperCase()}</Text>
                      {areaStretches.map(s => (
                        <StretchCard
                          key={s.id}
                          stretch={s}
                          expanded={expandedId === s.id}
                          onToggle={() => toggleStretch(s.id)}
                        />
                      ))}
                    </View>
                  );
                })
              ) : (
                // Single area filtered view
                getStretchesByArea(activeArea).map(s => (
                  <StretchCard
                    key={s.id}
                    stretch={s}
                    expanded={expandedId === s.id}
                    onToggle={() => toggleStretch(s.id)}
                  />
                ))
              )}
            </>
          )}

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
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
    alignItems: 'center',
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  backBtnText: { fontFamily: Fonts.body, fontSize: 11, letterSpacing: 2, color: Colors.textMuted },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.text, letterSpacing: 2, marginTop: 4 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)', borderRadius: 12,
    backgroundColor: 'rgba(12,10,16,0.8)', paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1, fontFamily: Fonts.prose, fontSize: 14, color: Colors.text,
    paddingVertical: 12,
  },
  searchClearBtn: { padding: 6 },
  searchClearText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted },

  factCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)', borderRadius: 14,
    padding: Spacing.md, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.85)',
  },
  factEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2.5, color: 'rgba(201,168,76,0.7)', marginBottom: 4 },
  factTitle: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.gold, marginBottom: 6 },
  factText: { fontFamily: Fonts.prose, fontSize: 13, color: Colors.textMuted, lineHeight: 19, marginBottom: 8 },
  factSource: { fontFamily: Fonts.body, fontSize: 9, color: Colors.textDim, fontStyle: 'italic' },

  areaChipsRow: { paddingHorizontal: Spacing.lg, gap: 8, paddingBottom: Spacing.md },
  areaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: Radii.full,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  areaChipActive: { borderColor: Colors.goldBorder, backgroundColor: 'rgba(201,168,76,0.12)' },
  areaChipRune: { fontSize: 11, fontFamily: 'System', color: Colors.textMuted },
  areaChipText: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 1, color: Colors.textMuted },
  areaChipTextActive: { color: Colors.gold },

  sectionLabel: {
    fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, color: Colors.textMuted,
    paddingHorizontal: Spacing.lg, marginBottom: 10, marginTop: 4,
  },

  emptyWrap: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  emptyText: {
    fontFamily: Fonts.proseItalic, fontSize: 13, color: Colors.textDim,
    fontStyle: 'italic', lineHeight: 19,
  },

  stretchCard: {
    marginHorizontal: Spacing.lg, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.85)',
  },
  stretchCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: Spacing.md,
  },
  stretchIconWrap: {
    width: 40, height: 40, borderRadius: 11, borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)', backgroundColor: 'rgba(201,168,76,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  stretchIcon: { fontSize: 18, fontFamily: 'System', color: Colors.gold },
  stretchName: { fontFamily: Fonts.subheading, fontSize: 14, color: Colors.text, marginBottom: 2 },
  stretchPlainName: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted },
  stretchDurationWrap: { alignItems: 'center', gap: 4 },
  stretchDuration: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 0.5, color: Colors.textDim },
  stretchExpandIcon: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.gold },

  stretchDetail: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  stretchDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 12 },
  detailLabel: {
    fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: Colors.gold,
    opacity: 0.7, marginBottom: 8,
  },
  stepRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  stepNum: {
    fontFamily: Fonts.heading, fontSize: 11, color: Colors.gold,
    width: 16,
  },
  stepText: { flex: 1, fontFamily: Fonts.prose, fontSize: 13, color: Colors.textMuted, lineHeight: 19 },

  whyWrap: {
    marginTop: 8, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  whyText: {
    fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textMuted,
    fontStyle: 'italic', lineHeight: 18,
  },

  bottomRunes: { alignItems: 'center', paddingVertical: Spacing.lg },
  bottomRuneText: { fontFamily: 'System', fontSize: 13, color: 'rgba(201,168,76,0.1)', letterSpacing: 10 },
});