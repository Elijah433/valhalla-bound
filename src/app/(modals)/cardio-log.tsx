import { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useWarriorStore } from '@/lib/store';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const CARDIO_TYPES = [
  { id: 'run', label: 'Run', rune: 'ᚢ' },
  { id: 'row', label: 'Row', rune: 'ᚱ' },
  { id: 'bike', label: 'Bike', rune: 'ᚷ' },
  { id: 'swim', label: 'Swim', rune: 'ᚹ' },
  { id: 'hiit', label: 'HIIT', rune: 'ᚦ' },
  { id: 'circuit', label: 'Circuit', rune: 'ᛋ' },
  { id: 'other', label: 'Other', rune: 'ᛟ' },
];

const INTENSITY_LEVELS = [
  { id: 'easy', label: 'EASY', desc: 'Zone 1-2, conversational', color: Colors.ice },
  { id: 'moderate', label: 'MODERATE', desc: 'Zone 3, steady effort', color: Colors.gold },
  { id: 'hard', label: 'HARD', desc: 'Zone 4, pushing limits', color: '#E05020' },
  { id: 'max', label: 'MAX EFFORT', desc: 'Zone 5, all out war', color: Colors.blood },
];

const METERS_PER_MILE = 1609.344;

export default function CardioLogModal() {
 const params = useLocalSearchParams<{ type: string; noXp: string }>();
  const { recordWorkout } = useWarriorStore();

  const [cardioType, setCardioType] = useState('run');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [intensity, setIntensity] = useState('moderate');
  const [notes, setNotes] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isCombat = params.type === 'combat';
  const accentColor = isCombat ? Colors.blood : Colors.ice;
  const title = isCombat ? 'BATTLE DRILLS' : 'THE LONG RAID';
  const eyebrow = isCombat ? 'COMBAT LOG' : 'ENDURANCE LOG';

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  function handleLog() {
  if (!duration) return;
  if (params.noXp !== '1') {
    // Real numbers you actually typed — previously only the workout type
    // made it to recordWorkout(); duration, distance, and notes were
    // collected here and shown in the summary above, but never saved.
    const durationMinutes = parseInt(duration, 10);
    const distanceMiles = parseFloat(distance);
    const distanceMeters = !isNaN(distanceMiles) && distanceMiles > 0
      ? distanceMiles * METERS_PER_MILE
      : undefined;
    recordWorkout(
      params.type === 'combat' ? 'combat' : 'endurance',
      notes.trim() || undefined,
      !isNaN(durationMinutes) ? durationMinutes : undefined,
      distanceMeters
    );
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  router.back();
}

  const selectedIntensity = INTENSITY_LEVELS.find(i => i.id === intensity);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0C0A10', '#050508']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.kbAware}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.handle} />
              <View style={styles.headerRow}>
                <View>
                  <Text style={[styles.eyebrow, { color: accentColor }]}>{eyebrow}</Text>
                  <Text style={styles.title}>{title}</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Track Live — only for outdoor types GPS actually makes
                  sense for. Manual entry below stays the default/only
                  option for row/swim/hiit/circuit/other. */}
              {(cardioType === 'run' || cardioType === 'bike') && (
                <TouchableOpacity
                  style={styles.trackLiveBtn}
                  onPress={() => router.replace({ pathname: '/(modals)/track-run' as any })}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[`${accentColor}10`, 'transparent']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={[styles.trackLiveBtnText, { color: accentColor }]}>
                    🏃  Track Live Instead →
                  </Text>
                </TouchableOpacity>
              )}

              {/* Activity type */}
              <Text style={styles.sectionLabel}>DISCIPLINE</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.typeRow}
              >
                {CARDIO_TYPES.map((t) => {
                  const isSelected = cardioType === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.typeChip, isSelected && { borderColor: `${accentColor}50`, backgroundColor: `${accentColor}10` }]}
                      onPress={() => {
                        setCardioType(t.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={[styles.typeChipRune, { color: isSelected ? accentColor : Colors.textMuted }]}>
                        {t.rune}
                      </Text>
                      <Text style={[styles.typeChipLabel, isSelected && { color: accentColor }]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Duration + Distance */}
              <Text style={styles.sectionLabel}>METRICS</Text>
              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.02)', 'transparent']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.metricLabel}>DURATION</Text>
                  <View style={styles.metricInputRow}>
                    <TextInput
                      style={[styles.metricInput, { color: accentColor }]}
                      value={duration}
                      onChangeText={setDuration}
                      placeholder="0"
                      placeholderTextColor={Colors.textDim}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                    <Text style={styles.metricUnit}>min</Text>
                  </View>
                </View>

                <View style={styles.metricCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.02)', 'transparent']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.metricLabel}>DISTANCE</Text>
                  <View style={styles.metricInputRow}>
                    <TextInput
                      style={[styles.metricInput, { color: accentColor }]}
                      value={distance}
                      onChangeText={setDistance}
                      placeholder="0.0"
                      placeholderTextColor={Colors.textDim}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                    />
                    <Text style={styles.metricUnit}>mi</Text>
                  </View>
                </View>
              </View>

              {/* Intensity */}
              <Text style={styles.sectionLabel}>INTENSITY</Text>
              <View style={styles.intensityGrid}>
                {INTENSITY_LEVELS.map((level) => {
                  const isSelected = intensity === level.id;
                  return (
                    <TouchableOpacity
                      key={level.id}
                      style={[
                        styles.intensityCard,
                        isSelected && { borderColor: `${level.color}40`, backgroundColor: `${level.color}08` },
                      ]}
                      onPress={() => {
                        setIntensity(level.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      activeOpacity={0.75}
                    >
                      {isSelected && (
                        <LinearGradient
                          colors={[`${level.color}06`, 'transparent']}
                          style={StyleSheet.absoluteFill}
                        />
                      )}
                      <Text style={[styles.intensityLabel, isSelected && { color: level.color }]}>
                        {level.label}
                      </Text>
                      <Text style={styles.intensityDesc}>{level.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Notes */}
              <Text style={styles.sectionLabel}>WAR NOTES</Text>
              <View style={styles.notesWrap}>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="What did you conquer today?"
                  placeholderTextColor={Colors.textDim}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Summary */}
              {(duration || distance) && (
                <View style={styles.summaryCard}>
                  <LinearGradient
                    colors={[`${accentColor}06`, 'transparent']}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={['transparent', accentColor, 'transparent']}
                    style={styles.summaryLine}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                  <Text style={styles.summaryTitle}>RAID SUMMARY</Text>
                  <View style={styles.summaryRow}>
                    {duration ? (
                      <View style={styles.summaryItem}>
                        <Text style={[styles.summaryVal, { color: accentColor }]}>{duration}</Text>
                        <Text style={styles.summaryItemLabel}>MINUTES</Text>
                      </View>
                    ) : null}
                    {distance ? (
                      <View style={styles.summaryItem}>
                        <Text style={[styles.summaryVal, { color: accentColor }]}>{distance}</Text>
                        <Text style={styles.summaryItemLabel}>MILES</Text>
                      </View>
                    ) : null}
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryVal, { color: Colors.gold }]}>
                        {params.noXp === '1' ? '+0' : `+${params.type === 'combat' ? 175 : 150}`}
                        </Text>
                      <Text style={styles.summaryItemLabel}>VALOR</Text>
                    </View>
                  </View>
                  {selectedIntensity && (
                    <Text style={[styles.summaryIntensity, { color: selectedIntensity.color }]}>
                      {selectedIntensity.label} — {selectedIntensity.desc}
                    </Text>
                  )}
                </View>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Log button */}
            <TouchableOpacity
              style={[styles.logBtn, !duration && styles.logBtnDisabled]}
              onPress={handleLog}
              disabled={!duration}
              activeOpacity={0.85}
            >
              {duration ? (
                <LinearGradient
                  colors={[Colors.goldDark, Colors.gold]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              ) : null}
              <Text style={[styles.logBtnText, !duration && styles.logBtnTextDisabled]}>
                {duration ? 'RECORD THE RAID →' : 'ENTER DURATION TO LOG'}
              </Text>
            </TouchableOpacity>

          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  kbAware: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.lg },

  header: { paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  handle: {
    width: 40, height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 4,
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    color: Colors.text,
    letterSpacing: 1,
  },
  closeBtn: {
    width: 34, height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },

  sectionLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.textMuted,
    marginBottom: 10,
    marginTop: 4,
  },

  trackLiveBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  trackLiveBtnText: {
    fontFamily: Fonts.subheading,
    fontSize: 13,
    letterSpacing: 0.5,
  },

  typeRow: {
    gap: 8,
    paddingBottom: Spacing.lg,
  },
  typeChip: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(12,10,16,0.8)',
    minWidth: 64,
  },
  typeChipRune: {
    fontSize: 16,
    fontFamily: 'System',
  },
  typeChipLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.textMuted,
  },

  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: Spacing.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
  },
  metricLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 2,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  metricInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  metricInput: {
    fontFamily: Fonts.heading,
    fontSize: 36,
    lineHeight: 40,
    minWidth: 60,
  },
  metricUnit: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1,
  },

  intensityGrid: {
    gap: 8,
    marginBottom: Spacing.lg,
  },
  intensityCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: Spacing.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
  },
  intensityLabel: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  intensityDesc: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textDim,
  },

  notesWrap: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(12,10,16,0.8)',
  },
  notesInput: {
    fontFamily: Fonts.prose,
    fontSize: 14,
    color: Colors.text,
    minHeight: 70,
    textAlignVertical: 'top',
  },

  summaryCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
    gap: 10,
    marginBottom: Spacing.md,
  },
  summaryLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  summaryTitle: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 3,
    color: Colors.textMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 20,
  },
  summaryItem: { gap: 2 },
  summaryVal: {
    fontFamily: Fonts.heading,
    fontSize: 26,
    lineHeight: 28,
  },
  summaryItemLabel: {
    fontFamily: Fonts.body,
    fontSize: 7,
    letterSpacing: 2,
    color: Colors.textMuted,
  },
  summaryIntensity: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    fontStyle: 'italic',
  },

  logBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  logBtnDisabled: {
    borderColor: 'rgba(255,255,255,0.06)',
  },
  logBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.void,
    letterSpacing: 2,
  },
  logBtnTextDisabled: {
    color: Colors.textMuted,
  },
});