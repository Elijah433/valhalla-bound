import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getWorkoutHistory, getCustomExercises, type DayHistoryEntry } from '@/lib/db';
import { EXERCISES, CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_RUNES, type Exercise } from '@/constants/exercises';
import { WORKOUT_META } from '@/constants/ranks';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

// Maps an exercise_id (built-in or custom) to its category, so a strength
// session can be labeled "PUSH DAY" etc. rather than just listing raw
// exercise names with no sense of what kind of day it was.
function buildCategoryLookup(customExercises: { id: string; category: string }[]): Record<string, Exercise['category']> {
  const lookup: Record<string, Exercise['category']> = {};
  EXERCISES.forEach(e => { lookup[e.id] = e.category; });
  customExercises.forEach(c => { lookup[c.id] = (c.category as Exercise['category']) ?? 'custom'; });
  return lookup;
}

function formatDayLabel(dateStr: string): string {
  // Parse as local date, not UTC — see db.ts's parseLocalDateString-style
  // reasoning; a plain `new Date(dateStr)` on a date-only string parses as
  // UTC midnight, which can silently roll back a day in some timezones.
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function WorkoutHistoryScreen() {
  const [history, setHistory] = useState<DayHistoryEntry[]>([]);
  const [categoryLookup, setCategoryLookup] = useState<Record<string, Exercise['category']>>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    const custom = getCustomExercises();
    setCategoryLookup(buildCategoryLookup(custom));
    setHistory(getWorkoutHistory(60));
  }, []));

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
          <Text style={styles.headerTitle}>WORKOUT HISTORY</Text>
        </View>

        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {history.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyRune}>ᚦ</Text>
              <Text style={styles.emptyText}>No training logged yet</Text>
              <Text style={styles.emptySub}>Your saga will be written here as you train.</Text>
            </View>
          ) : (
            history.map((day) => {
              // Distinct categories trained this day, from BOTH strength
              // sessions (via the exercise→category lookup) and generic
              // logged workouts (via their type — endurance/combat/etc.),
              // deduped so the same category doesn't show twice.
              const strengthCategories = Array.from(new Set(
                day.strengthSessions.map(s => categoryLookup[s.exercise_id] ?? 'custom')
              ));
              const genericTypes = Array.from(new Set(day.workouts.map(w => w.type)));

              return (
                <View key={day.date} style={styles.dayCard}>
                  <LinearGradient colors={['rgba(201,168,76,0.05)', 'transparent']} style={StyleSheet.absoluteFill} />
                  <Text style={styles.dayLabel}>{formatDayLabel(day.date)}</Text>

                  {/* Summary pills — what kind of day this was, at a glance */}
                  <View style={styles.pillRow}>
                    {strengthCategories.map(cat => (
                      <View key={cat} style={[styles.pill, { borderColor: `${CATEGORY_COLORS[cat]}40`, backgroundColor: `${CATEGORY_COLORS[cat]}12` }]}>
                        <Text style={[styles.pillRune, { color: CATEGORY_COLORS[cat] }]}>{CATEGORY_RUNES[cat]}</Text>
                        <Text style={[styles.pillText, { color: CATEGORY_COLORS[cat] }]}>{CATEGORY_LABELS[cat]}</Text>
                      </View>
                    ))}
                    {genericTypes.map(type => {
                      const meta = WORKOUT_META[type as keyof typeof WORKOUT_META];
                      if (!meta) return null;
                      return (
                        <View key={type} style={[styles.pill, { borderColor: `${meta.color}40`, backgroundColor: `${meta.color}12` }]}>
                          <Text style={[styles.pillRune, { color: meta.color }]}>{meta.icon}</Text>
                          <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Specific strength exercises trained, with each set */}
                  {day.strengthSessions.map(session => (
                    <View key={session.id} style={styles.exerciseBlock}>
                      <Text style={styles.exerciseName}>{session.exercise_name}</Text>
                      <Text style={styles.exerciseSets}>
                        {session.sets.map(s => `${s.weight}×${s.reps}`).join('  ·  ')}
                      </Text>
                    </View>
                  ))}

                  {/* Generic (non-strength) workouts logged that day */}
                  {day.workouts.map(w => {
                    const meta = WORKOUT_META[w.type as keyof typeof WORKOUT_META];
                    return (
                      <View key={w.id} style={styles.exerciseBlock}>
                        <Text style={styles.exerciseName}>{meta?.label ?? w.type}</Text>
                        {w.duration_minutes ? (
                          <Text style={styles.exerciseSets}>{w.duration_minutes} min</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              );
            })
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
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
    alignItems: 'center',
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  backBtnText: { fontFamily: Fonts.body, fontSize: 11, letterSpacing: 2, color: Colors.textMuted },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.text, letterSpacing: 2, marginTop: 4 },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl * 2, gap: 8 },
  emptyRune: { fontSize: 36, color: 'rgba(201,168,76,0.15)', fontFamily: 'System' },
  emptyText: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.textMuted },
  emptySub: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textDim, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 40 },

  dayCard: {
    marginHorizontal: Spacing.lg, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
    padding: Spacing.md, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.8)', gap: 8,
  },
  dayLabel: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.text, letterSpacing: 0.5 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: Radii.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  pillRune: { fontSize: 9, fontFamily: 'System' },
  pillText: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 1 },

  exerciseBlock: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
    paddingTop: 8, gap: 2,
  },
  exerciseName: { fontFamily: Fonts.subheading, fontSize: 13, color: Colors.text },
  exerciseSets: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted },

  bottomRunes: { alignItems: 'center', paddingVertical: Spacing.lg },
  bottomRuneText: { fontFamily: 'System', fontSize: 13, color: 'rgba(201,168,76,0.1)', letterSpacing: 10 },
});