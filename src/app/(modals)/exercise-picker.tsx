import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, TextInput, Dimensions, Alert,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line } from 'react-native-svg';
import { EXERCISES, CATEGORY_LABELS, CATEGORY_ORDER, CATEGORY_RUNES, CATEGORY_COLORS, type Exercise } from '@/constants/exercises';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCustomExercises, addCustomExercise, getRecentExercises, type RecentExerciseSummary } from '@/lib/db';
import { useGuidedSessionStore, type GuidedExercise } from '@/lib/guidedSession';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width } = Dimensions.get('window');

// A "Recently Forged" dismiss is purely a UI preference (hide this
// exercise from the quick-jump row), not a request to delete any real
// logged workout data — so this lives in AsyncStorage, the same tool
// already used elsewhere in the app for this kind of lightweight
// per-device preference, rather than touching the database at all.
const HIDDEN_RECENT_KEY = 'hidden_recent_exercise_ids';

function SearchIcon({ size = 16, color = Colors.textMuted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="10.5" cy="10.5" r="6.5" stroke={color} strokeWidth={2} fill="none" />
      <Line x1="15.5" y1="15.5" x2="21" y2="21" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export default function ExercisePickerModal() {
    const params = useLocalSearchParams<{ noXp: string }>();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Exercise['category'] | 'all'>('all');
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [recentExercises, setRecentExercises] = useState<RecentExerciseSummary[]>([]);
  const [hiddenRecentIds, setHiddenRecentIds] = useState<string[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscles, setCustomMuscles] = useState('');
  const [customCategory, setCustomCategory] = useState<Exercise['category']>('custom');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Guided Session build mode — when on, tapping an exercise adds it to
  // an ordered queue instead of jumping straight into Strength Log.
  // Order is preserved as selection order (the order they'll be trained
  // in), not category order.
  const [guidedMode, setGuidedMode] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const startGuidedSession = useGuidedSessionStore(s => s.startSession);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  // useFocusEffect (not a plain useEffect) so this reloads every time the
  // screen comes back into view — e.g. returning here after finishing a
  // workout in strength-log.tsx. A plain useEffect with an empty dependency
  // array only runs once on first mount; if expo-router keeps this screen
  // instance alive in the stack rather than remounting it, that effect
  // never fires again, leaving "Recently Forged" stuck showing whatever it
  // was before that last workout — exactly the staleness being fixed here.
  useFocusEffect(useCallback(() => {
    loadCustom();
    loadRecentExercises();
  }, []));

  async function loadRecentExercises() {
    try {
      const raw = await AsyncStorage.getItem(HIDDEN_RECENT_KEY);
      const hidden: string[] = raw ? JSON.parse(raw) : [];
      setHiddenRecentIds(hidden);
      // Fetch generously (20) since some of the most recent ones may get
      // filtered out by the hidden list — still want up to 8 to actually
      // display afterward.
      const recent = getRecentExercises(20);
      setRecentExercises(recent.filter(r => !hidden.includes(r.exerciseId)).slice(0, 8));
    } catch (e) {
      setRecentExercises(getRecentExercises(8));
    }
  }

  // Dismisses one exercise from the Recently Forged row going forward —
  // does NOT touch any actual logged sets/sessions/PRs, purely hides it
  // from this one quick-access widget.
  async function hideFromRecent(exerciseId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = [...hiddenRecentIds, exerciseId];
    setHiddenRecentIds(updated);
    setRecentExercises(prev => prev.filter(r => r.exerciseId !== exerciseId));
    await AsyncStorage.setItem(HIDDEN_RECENT_KEY, JSON.stringify(updated));
  }

  function loadCustom() {
    const custom = getCustomExercises();
    setCustomExercises(custom.map(c => ({
      id: c.id,
      name: c.name,
      category: (c.category as Exercise['category']) ?? 'custom',
      muscles: c.muscles,
      // Custom exercises aren't tagged with an equipment requirement in
      // the database — 'both' is the safe default so a custom exercise
      // never gets silently filtered out of the Adaptive Workout
      // Generator regardless of Home/Gym selection.
      equipment: 'both',
    })));
  }

 function handlePick(exercise: Exercise) {
  if (guidedMode) {
    toggleGuidedSelection(exercise);
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  router.push({
    pathname: '/(modals)/strength-log',
    params: {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      noXp: params.noXp ?? '0',
    },
  });
}

  function handlePickRecent(recent: RecentExerciseSummary) {
    if (guidedMode) {
      // Recent entries don't carry category/muscles — the guided queue
      // only needs id/name/category (muscles are cosmetic on this
      // screen), so 'custom' is a safe placeholder category here; it's
      // never shown once the session starts.
      toggleGuidedSelection({
        id: recent.exerciseId,
        name: recent.exerciseName,
        category: 'custom',
        muscles: '',
        equipment: 'both',
      });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(modals)/strength-log',
      params: {
        exerciseId: recent.exerciseId,
        exerciseName: recent.exerciseName,
        noXp: params.noXp ?? '0',
      },
    });
  }

  // Toggles guided-session membership for one exercise, tap to add,
  // tap again to remove — preserves selection order for everything
  // already picked.
  function toggleGuidedSelection(exercise: Exercise) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedExercises(prev => {
      const already = prev.some(e => e.id === exercise.id);
      if (already) return prev.filter(e => e.id !== exercise.id);
      return [...prev, exercise];
    });
  }

  function toggleGuidedMode() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGuidedMode(prev => {
      if (prev) setSelectedExercises([]); // leaving build mode clears the draft
      return !prev;
    });
  }

  function handleStartGuidedSession() {
    if (selectedExercises.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const queue: GuidedExercise[] = selectedExercises.map(e => ({
      exerciseId: e.id,
      exerciseName: e.name,
      category: e.category,
    }));
    startGuidedSession(queue);
    const first = queue[0];
    router.push({
      pathname: '/(modals)/strength-log',
      params: {
        exerciseId: first.exerciseId,
        exerciseName: first.exerciseName,
        guided: '1',
        noXp: params.noXp ?? '0',
      },
    });
  }

  function handleAddCustom() {
    if (!customName.trim()) {
      Alert.alert('Name required', 'Enter a name for your custom exercise.');
      return;
    }
    const id = addCustomExercise(customName.trim(), customMuscles.trim(), customCategory);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newExercise: Exercise = {
      id, name: customName.trim(), category: customCategory,
      muscles: customMuscles.trim(), equipment: 'both',
    };
    setShowAddCustom(false);
    setCustomName('');
    setCustomMuscles('');
    setCustomCategory('custom');
    loadCustom();
    // In guided mode this adds the new exercise to the draft queue
    // instead of jumping straight into Strength Log, matching how every
    // other pick behaves while building a session.
    if (guidedMode) {
      setSelectedExercises(prev => [...prev, newExercise]);
      return;
    }
   router.push({
  pathname: '/(modals)/strength-log',
  params: {
    exerciseId: id,
    exerciseName: customName.trim(),
    noXp: params.noXp ?? '0',
  },
});
  }

  function openAddCustomFromSearch() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCustomName(search);
    setShowAddCustom(true);
  }

  const allExercises = [...EXERCISES, ...customExercises];

  const filtered = allExercises.filter(e => {
    const matchesSearch = search.length === 0 ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.muscles.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || e.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const exercises = filtered.filter(e => e.category === cat);
    if (exercises.length > 0) acc[cat] = exercises;
    return acc;
  }, {} as Record<string, Exercise[]>);

  const showRecentRow = search.length === 0 && activeCategory === 'all' && recentExercises.length > 0;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0A0308', '#050508']} style={StyleSheet.absoluteFill} />
      <Text style={styles.watermark}>ᚦ</Text>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

          <View style={styles.header}>
            <View>
              <Text style={styles.headerEyebrow}>CHOOSE YOUR WORKOUT</Text>
              <Text style={styles.headerTitle}>EXERCISES</Text>
            </View>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.guidedToggle, guidedMode && styles.guidedToggleActive]}
            onPress={toggleGuidedMode}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={guidedMode ? ['rgba(201,168,76,0.14)', 'rgba(201,168,76,0.04)'] : ['rgba(255,255,255,0.03)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.guidedToggleRune}>⚡</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.guidedToggleTitle, guidedMode && styles.guidedToggleTitleActive]}>
                {guidedMode ? 'BUILDING GUIDED SESSION' : 'BUILD A GUIDED SESSION'}
              </Text>
              <Text style={styles.guidedToggleSub}>
                {guidedMode ? 'Tap exercises below to add them, in order' : 'Pick several exercises, train them back to back with auto rest timers'}
              </Text>
            </View>
            <Text style={styles.guidedToggleAction}>{guidedMode ? 'CANCEL' : 'START'}</Text>
          </TouchableOpacity>

          <View style={styles.searchWrap}>
            <SearchIcon size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search exercises..."
              placeholderTextColor={Colors.textDim}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={styles.searchClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.categoryScrollWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryContent}
            >
              <TouchableOpacity
                style={[styles.categoryChip, activeCategory === 'all' && styles.categoryChipActive]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveCategory('all'); }}
              >
                <Text style={[styles.categoryChipText, activeCategory === 'all' && styles.categoryChipTextActive]}>
                  ALL
                </Text>
              </TouchableOpacity>
              {CATEGORY_ORDER.map((cat) => {
                const catColor = CATEGORY_COLORS[cat];
                const isActive = activeCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      isActive && { backgroundColor: `${catColor}18`, borderColor: `${catColor}50` },
                    ]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveCategory(cat); }}
                  >
                    <Text style={[styles.categoryChipRune, { color: isActive ? catColor : 'rgba(255,255,255,0.25)' }]}>
                      {CATEGORY_RUNES[cat]}
                    </Text>
                    <Text style={[styles.categoryChipText, isActive && { color: catColor }]}>
                      {CATEGORY_LABELS[cat]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <LinearGradient
              colors={['transparent', '#050508']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.categoryFade}
              pointerEvents="none"
            />
          </View>

          {showAddCustom ? (
            <View style={styles.addCustomForm}>
              <LinearGradient
                colors={['rgba(201,168,76,0.06)', 'transparent']}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.addCustomTitle}>ADD CUSTOM EXERCISE</Text>
              <TextInput
                style={styles.addCustomInput}
                value={customName}
                onChangeText={setCustomName}
                placeholder="Exercise name"
                placeholderTextColor={Colors.textDim}
                autoFocus
              />
              <TextInput
                style={styles.addCustomInput}
                value={customMuscles}
                onChangeText={setCustomMuscles}
                placeholder="Muscles worked (optional)"
                placeholderTextColor={Colors.textDim}
              />

              <Text style={styles.addCustomCategoryLabel}>CATEGORY</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.addCustomCategoryRow}
              >
                {CATEGORY_ORDER.map((cat) => {
                  const catColor = CATEGORY_COLORS[cat];
                  const isActive = customCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.addCustomCategoryChip,
                        isActive && { backgroundColor: `${catColor}18`, borderColor: `${catColor}60` },
                      ]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCustomCategory(cat); }}
                    >
                      <Text style={[styles.categoryChipRune, { color: isActive ? catColor : 'rgba(255,255,255,0.25)' }]}>
                        {CATEGORY_RUNES[cat]}
                      </Text>
                      <Text style={[styles.categoryChipText, isActive && { color: catColor }]}>
                        {CATEGORY_LABELS[cat]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.addCustomBtns}>
                <TouchableOpacity
                  style={styles.addCustomCancel}
                  onPress={() => setShowAddCustom(false)}
                >
                  <Text style={styles.addCustomCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addCustomSave} onPress={handleAddCustom}>
                  <LinearGradient
                    colors={[Colors.goldDark, Colors.gold]}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.addCustomSaveText}>ADD & START</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addCustomBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddCustom(true); }}
            >
              <Text style={styles.addCustomBtnText}>+ ADD CUSTOM EXERCISE</Text>
            </TouchableOpacity>
          )}

          <ScrollView
            style={styles.listScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {showRecentRow && (
              <View style={styles.recentSection}>
                <Text style={styles.categoryLabel}>RECENTLY FORGED</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recentRow}
                >
                  {recentExercises.map((r) => {
                    const selectedIndex = selectedExercises.findIndex(e => e.id === r.exerciseId);
                    const isSelected = selectedIndex !== -1;
                    return (
                      <TouchableOpacity
                        key={r.exerciseId}
                        style={[styles.recentCard, isSelected && styles.exerciseRowSelected]}
                        onPress={() => handlePickRecent(r)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient colors={['rgba(201,168,76,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
                        {!guidedMode && (
                          <TouchableOpacity
                            style={styles.recentCardDismiss}
                            onPress={() => hideFromRecent(r.exerciseId)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.recentCardDismissText}>✕</Text>
                          </TouchableOpacity>
                        )}
                        {guidedMode && isSelected && (
                          <View style={[styles.selectBadge, styles.selectBadgeActive, styles.recentCardDismiss]}>
                            <Text style={styles.selectBadgeText}>{selectedIndex + 1}</Text>
                          </View>
                        )}
                        <Text style={styles.recentCardName} numberOfLines={1}>{r.exerciseName}</Text>
                        <Text style={styles.recentCardLast}>
                          Last: {r.lastWeight} lbs × {r.lastReps}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {Object.entries(grouped).map(([cat, exercises]) => {
              const catColor = CATEGORY_COLORS[cat as Exercise['category']];
              return (
                <View key={cat}>
                  <View style={styles.categoryLabelRow}>
                    <Text style={[styles.categoryLabelRune, { color: catColor }]}>{CATEGORY_RUNES[cat as Exercise['category']]}</Text>
                    <Text style={styles.categoryLabel}>
                      {CATEGORY_LABELS[cat as Exercise['category']]}
                    </Text>
                  </View>
                  {exercises.map((exercise) => {
                    const selectedIndex = selectedExercises.findIndex(e => e.id === exercise.id);
                    const isSelected = selectedIndex !== -1;
                    return (
                      <TouchableOpacity
                        key={exercise.id}
                        style={[styles.exerciseRow, isSelected && styles.exerciseRowSelected]}
                        onPress={() => handlePick(exercise)}
                        activeOpacity={0.7}
                      >
                        <LinearGradient
                          colors={isSelected ? ['rgba(201,168,76,0.1)', 'transparent'] : [`${catColor}08`, 'transparent']}
                          style={StyleSheet.absoluteFill}
                        />
                        <View style={[styles.exerciseDot, { backgroundColor: catColor }]} />
                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseName}>{exercise.name}</Text>
                          <Text style={styles.exerciseMuscles}>{exercise.muscles}</Text>
                        </View>
                        {guidedMode ? (
                          <View style={[styles.selectBadge, isSelected && styles.selectBadgeActive]}>
                            <Text style={styles.selectBadgeText}>{isSelected ? selectedIndex + 1 : ''}</Text>
                          </View>
                        ) : (
                          <Text style={[styles.exerciseArrow, { color: `${catColor}90` }]}>›</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}

            {filtered.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyRune}>ᚷ</Text>
                <Text style={styles.emptyText}>No exercises found</Text>
                <Text style={styles.emptySub}>Try a different search, or add it as a custom exercise</Text>
                {search.length > 0 && (
                  <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddCustomFromSearch} activeOpacity={0.85}>
                    <Text style={styles.emptyAddBtnText}>+ ADD "{search.toUpperCase()}" AS CUSTOM</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={{ height: guidedMode && selectedExercises.length > 0 ? 90 : 40 }} />
          </ScrollView>

          {guidedMode && selectedExercises.length > 0 && (
            <View style={styles.startBar}>
              <LinearGradient colors={['transparent', '#050508', '#050508']} style={styles.startBarFade} pointerEvents="none" />
              <TouchableOpacity style={styles.startBarBtn} onPress={handleStartGuidedSession} activeOpacity={0.85}>
                <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                <Text style={styles.startBarBtnText}>
                  ▶  START GUIDED SESSION · {selectedExercises.length} {selectedExercises.length === 1 ? 'EXERCISE' : 'EXERCISES'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  container: { flex: 1 },

  watermark: {
    position: 'absolute', bottom: 60, right: -40,
    fontSize: 260, color: 'rgba(201,168,76,0.02)',
    fontFamily: 'System', transform: [{ rotate: '-12deg' }],
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
  headerEyebrow: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 4,
    color: Colors.blood,
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.gold,
    letterSpacing: 2,
  },
  closeBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  closeBtnText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
  },

  guidedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  guidedToggleActive: { borderColor: Colors.goldBorder },
  guidedToggleRune: { fontSize: 16, fontFamily: 'System' },
  guidedToggleTitle: { fontFamily: Fonts.subheading, fontSize: 12, color: Colors.text, letterSpacing: 0.5 },
  guidedToggleTitleActive: { color: Colors.gold },
  guidedToggleSub: { fontFamily: Fonts.prose, fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  guidedToggleAction: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 1.5, color: Colors.textMuted },

  selectBadge: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  selectBadgeActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  selectBadgeText: { fontFamily: Fonts.heading, fontSize: 11, color: Colors.void },
  exerciseRowSelected: { borderBottomColor: 'rgba(201,168,76,0.25)' },

  startBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: Spacing.lg, paddingTop: 30, paddingBottom: 10,
  },
  startBarFade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  startBarBtn: {
    borderRadius: Radii.md, overflow: 'hidden', paddingVertical: 15,
    alignItems: 'center',
  },
  startBarBtnText: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.void, letterSpacing: 1 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.prose,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 12,
  },
  searchClear: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },

  categoryScrollWrap: { position: 'relative' },
  categoryScroll: { maxHeight: 44 },
  categoryContent: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
    alignItems: 'center',
  },
  categoryFade: {
    position: 'absolute', top: 0, right: 0, bottom: 0, width: 32,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  categoryChipActive: {
    backgroundColor: Colors.goldMuted,
    borderColor: Colors.goldBorder,
  },
  categoryChipRune: {
    fontSize: 10,
    fontFamily: 'System',
  },
  categoryChipText: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 1.5,
    color: Colors.textMuted,
  },
  categoryChipTextActive: { color: Colors.gold },

  addCustomBtn: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
    borderRadius: Radii.sm,
    paddingVertical: 10,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  addCustomBtnText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(201,168,76,0.5)',
  },

  addCustomForm: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: 10,
    overflow: 'hidden',
  },
  addCustomTitle: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.textMuted,
  },
  addCustomInput: {
    fontFamily: Fonts.prose,
    fontSize: 15,
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
  },
  addCustomCategoryLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 2,
    color: Colors.textMuted,
    marginTop: 2,
  },
  addCustomCategoryRow: {
    gap: 6,
    paddingVertical: 2,
  },
  addCustomCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  addCustomBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  addCustomCancel: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radii.sm,
  },
  addCustomCancelText: {
    fontFamily: Fonts.prose,
    fontSize: 13,
    color: Colors.textMuted,
  },
  addCustomSave: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  addCustomSaveText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: Colors.void,
    letterSpacing: 1,
  },

  listScroll: { flex: 1 },

  recentSection: { marginBottom: 4 },
  recentRow: { paddingHorizontal: Spacing.lg, gap: 8, paddingBottom: 4 },
  recentCard: {
    width: 140, borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
    borderRadius: 12, padding: 10, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)', gap: 2,
  },
  recentCardDismiss: {
    position: 'absolute', top: 6, right: 6, zIndex: 1,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  recentCardDismissText: { fontFamily: Fonts.body, fontSize: 9, color: Colors.textMuted },
  recentCardName: { fontFamily: Fonts.subheading, fontSize: 13, color: Colors.text, paddingRight: 16 },
  recentCardLast: { fontFamily: Fonts.body, fontSize: 10, color: Colors.gold, letterSpacing: 0.3 },

  categoryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 8,
  },
  categoryLabelRune: {
    fontSize: 11,
    fontFamily: 'System',
  },
  categoryLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  exerciseDot: {
    width: 6, height: 6, borderRadius: 3, opacity: 0.8,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: {
    fontFamily: Fonts.subheading,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 2,
  },
  exerciseMuscles: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textMuted,
  },
  exerciseArrow: {
    fontFamily: Fonts.body,
    fontSize: 22,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: 8,
  },
  emptyRune: { fontSize: 36, color: 'rgba(201,168,76,0.15)' },
  emptyText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.textMuted,
  },
  emptySub: {
    fontFamily: Fonts.prose,
    fontSize: 13,
    color: Colors.textDim,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyAddBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    backgroundColor: Colors.goldMuted,
    borderRadius: Radii.full,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  emptyAddBtnText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    letterSpacing: 1,
    color: Colors.gold,
  },
});