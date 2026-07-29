import { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CATEGORY_COLORS, CATEGORY_RUNES, CATEGORY_LABELS } from '@/constants/exercises';
import { generateAdaptiveWorkout, type GeneratedWorkout, type EquipmentPreference } from '@/lib/adaptiveWorkout';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

// Quick-select presets rather than a raw number input — matches the same
// "tap a sensible default, don't make someone type a number" pattern
// already used for macro goal presets elsewhere in the app.
const TIME_PRESETS = [15, 22, 30, 45, 60];

export default function AdaptiveWorkoutScreen() {
  const [minutes, setMinutes] = useState(22);
  const [equipment, setEquipment] = useState<EquipmentPreference>('home');
  const [workout, setWorkout] = useState<GeneratedWorkout | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  function handleGenerate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setWorkout(generateAdaptiveWorkout(minutes, equipment));
  }

  function handleRegenerate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWorkout(generateAdaptiveWorkout(minutes, equipment));
  }

  // Cardio exercises log through the cardio flow (matching how Berserker
  // routes non-strength day types); everything else jumps directly into
  // Strength Log with the specific exercise already chosen — no need to
  // send them through the picker again since the generator already made
  // that choice for them.
  function handleLogExercise(exerciseId: string, exerciseName: string, category: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (category === 'cardio') {
      router.push({ pathname: '/(modals)/cardio-log', params: { type: 'endurance' } });
    } else {
      router.push({
        pathname: '/(modals)/strength-log',
        params: { exerciseId, exerciseName },
      });
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/berserker' as any);
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0E0A14', '#080510', '#050508']} style={StyleSheet.absoluteFill} />
      <Text style={styles.watermark}>ᛞ</Text>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SWIFT FORGE</Text>
        </View>

        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>ADAPTIVE TRAINING</Text>
          <Text style={styles.title}>How much time do you have?</Text>
          <Text style={styles.subtitle}>
            The forge builds a battle plan around your time, your tools, and what you've already trained.
          </Text>

          {/* Time presets */}
          <View style={styles.timeRow}>
            {TIME_PRESETS.map((t) => {
              const isActive = minutes === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeChip, isActive && styles.timeChipActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMinutes(t); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.timeChipVal, isActive && styles.timeChipValActive]}>{t}</Text>
                  <Text style={[styles.timeChipLabel, isActive && styles.timeChipLabelActive]}>MIN</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Equipment toggle */}
          <Text style={styles.sectionLabel}>WHERE ARE YOU TRAINING?</Text>
          <View style={styles.equipmentRow}>
            {(['home', 'gym'] as EquipmentPreference[]).map((eq) => {
              const isActive = equipment === eq;
              return (
                <TouchableOpacity
                  key={eq}
                  style={[styles.equipmentChip, isActive && styles.equipmentChipActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEquipment(eq); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.equipmentChipText, isActive && styles.equipmentChipTextActive]}>
                    {eq === 'home' ? '🏠  HOME' : '🏋️  GYM'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} activeOpacity={0.85}>
            <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <Text style={styles.generateBtnText}>
              {workout ? '⚡  FORGE ANOTHER PLAN' : '⚡  FORGE MY WORKOUT'}
            </Text>
          </TouchableOpacity>

          {/* Generated workout */}
          {workout && (
            <View style={styles.resultSection}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>YOUR BATTLE PLAN</Text>
                <Text style={styles.resultMeta}>~{workout.estimatedMinutes} min · {workout.exercises.length} exercises</Text>
              </View>

              {workout.categoriesAvoided.length > 0 && (
                <View style={styles.avoidedNote}>
                  <Text style={styles.avoidedNoteText}>
                    Deprioritized {workout.categoriesAvoided.map(c => CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS]).join(', ')} — trained recently.
                  </Text>
                </View>
              )}

              {workout.exercises.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No exercises fit that combination right now — try a different equipment setting or a bit more time.
                  </Text>
                </View>
              )}

              {workout.exercises.map((ge, i) => {
                const color = CATEGORY_COLORS[ge.exercise.category];
                return (
                  <TouchableOpacity
                    key={ge.exercise.id + i}
                    style={styles.exerciseCard}
                    onPress={() => handleLogExercise(ge.exercise.id, ge.exercise.name, ge.exercise.category)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={[`${color}10`, 'transparent']} style={StyleSheet.absoluteFill} />
                    <View style={[styles.exerciseRune, { backgroundColor: `${color}15`, borderColor: `${color}35` }]}>
                      <Text style={[styles.exerciseRuneText, { color }]}>{CATEGORY_RUNES[ge.exercise.category]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exerciseName}>{ge.exercise.name}</Text>
                      <Text style={styles.exerciseMeta}>{ge.exercise.muscles}</Text>
                    </View>
                    <View style={styles.exerciseSets}>
                      <Text style={[styles.exerciseSetsVal, { color }]}>{ge.sets}×{ge.reps}</Text>
                    </View>
                    <Text style={[styles.exerciseArrow, { color: `${color}90` }]}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 80 },

  watermark: {
    position: 'absolute', bottom: 80, right: -30, fontSize: 240,
    color: 'rgba(201,168,76,0.02)', fontFamily: 'System',
    transform: [{ rotate: '-12deg' }], pointerEvents: 'none',
  },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  backBtnText: { fontFamily: Fonts.body, fontSize: 11, letterSpacing: 2, color: Colors.textMuted },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.text, letterSpacing: 2, marginTop: 4 },

  eyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 4, color: Colors.blood, marginTop: Spacing.md },
  title: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.text, letterSpacing: 0.5, marginTop: 6 },
  subtitle: { fontFamily: Fonts.proseItalic, fontSize: 13, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 19, marginTop: 8, marginBottom: Spacing.lg },

  timeRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  timeChip: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)',
  },
  timeChipActive: { borderColor: Colors.goldBorder, backgroundColor: Colors.goldMuted },
  timeChipVal: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.textMuted },
  timeChipValActive: { color: Colors.gold },
  timeChipLabel: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 1, color: Colors.textDim, marginTop: 2 },
  timeChipLabelActive: { color: Colors.gold },

  sectionLabel: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, color: Colors.textMuted, marginBottom: 10 },
  equipmentRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  equipmentChip: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)',
  },
  equipmentChipActive: { borderColor: Colors.goldBorder, backgroundColor: Colors.goldMuted },
  equipmentChipText: { fontFamily: Fonts.subheading, fontSize: 13, color: Colors.textMuted },
  equipmentChipTextActive: { color: Colors.gold },

  generateBtn: {
    borderRadius: Radii.md, overflow: 'hidden', paddingVertical: 16,
    alignItems: 'center', marginBottom: Spacing.lg,
  },
  generateBtnText: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.void, letterSpacing: 1.5 },

  resultSection: { gap: 8 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  resultTitle: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, color: Colors.textMuted },
  resultMeta: { fontFamily: Fonts.body, fontSize: 10, color: Colors.gold, letterSpacing: 0.5 },

  avoidedNote: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 10,
    padding: 10, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  avoidedNoteText: { fontFamily: Fonts.proseItalic, fontSize: 11, color: Colors.textDim, fontStyle: 'italic' },

  emptyState: { padding: Spacing.lg, alignItems: 'center' },
  emptyStateText: { fontFamily: Fonts.proseItalic, fontSize: 13, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center' },

  exerciseCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
    padding: Spacing.md, overflow: 'hidden', backgroundColor: 'rgba(14,11,20,0.8)',
  },
  exerciseRune: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  exerciseRuneText: { fontSize: 16, fontFamily: 'System' },
  exerciseName: { fontFamily: Fonts.subheading, fontSize: 14, color: Colors.text, marginBottom: 2 },
  exerciseMeta: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted },
  exerciseSets: { alignItems: 'flex-end' },
  exerciseSetsVal: { fontFamily: Fonts.heading, fontSize: 13 },
  exerciseArrow: { fontFamily: Fonts.heading, fontSize: 18 },

  bottomRunes: { alignItems: 'center', paddingVertical: Spacing.lg },
  bottomRuneText: { fontFamily: 'System', fontSize: 13, color: 'rgba(201,168,76,0.08)', letterSpacing: 10 },
});
