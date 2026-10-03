import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Animated, ActivityIndicator, Image, Linking,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { logMeal } from '@/lib/db';
import {
  getRemainingMacros, pickMealCombo, searchRecipesForRemaining, getRecipeDetail,
  type RemainingMacros, type MealCombo, type ComboTier, type RecipeSuggestion, type RecipeDetail,
} from '@/lib/mealRecommendation';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const LOG_MEAL_TYPES = [
  { key: 'morning', label: 'Breakfast' },
  { key: 'midday', label: 'Lunch' },
  { key: 'evening', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

// Defaults the "LOG AS" pill to whatever meal actually makes sense right
// now, instead of always starting on Snack — someone opening this at
// 7:30am is almost certainly thinking about breakfast, not a snack. Still
// fully overridable by tapping a different pill; this only sets the
// starting point.
function getDefaultMealType(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'midday';
  if (hour >= 16 && hour < 21) return 'evening';
  return 'snack';
}

type Mode = 'quick' | 'cheap' | 'cook';

export default function FeastRecommendationScreen() {
  const [remaining, setRemaining] = useState<RemainingMacros | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [logMealType, setLogMealType] = useState(getDefaultMealType);

  const [selectedCombo, setSelectedCombo] = useState<MealCombo | null>(null);
  const [shownComboIds, setShownComboIds] = useState<string[]>([]);

  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    setRemaining(getRemainingMacros());
  }, []));

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, []);

  function pickTier(tier: ComboTier, remainingMacros: RemainingMacros) {
    const combo = pickMealCombo(tier, remainingMacros, [], logMealType);
    setSelectedCombo(combo);
    setShownComboIds([combo.id]);
  }

  function selectMode(next: Mode) {
    if (!remaining) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMode(next);
    setSelectedRecipe(null);

    if (next === 'cook') {
      fetchRecipes(remaining);
    } else {
      pickTier(next, remaining);
    }
  }

  function tryAnother() {
    if (!remaining || mode === 'cook' || !mode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const combo = pickMealCombo(mode, remaining, shownComboIds, logMealType);
    setSelectedCombo(combo);
    setShownComboIds(prev => [...prev, combo.id]);
  }

  async function fetchRecipes(remainingMacros: RemainingMacros) {
    setLoadingRecipes(true);
    setRecipeError(null);
    try {
      const results = await searchRecipesForRemaining(remainingMacros, logMealType);
      setRecipes(results);
    } catch (e: any) {
      setRecipeError(e?.message ?? 'Could not load recipes right now.');
      setRecipes([]);
    } finally {
      setLoadingRecipes(false);
    }
  }

  async function openRecipe(id: number) {
    setLoadingDetail(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const detail = await getRecipeDetail(id);
      setSelectedRecipe(detail);
    } catch (e) {
      // Fail back to the list silently — the summary card already has
      // enough info that a detail failure isn't a dead end.
    } finally {
      setLoadingDetail(false);
    }
  }

  function logCombo() {
    if (!selectedCombo) return;
    logMeal(
      logMealType,
      selectedCombo.title,
      selectedCombo.calories,
      selectedCombo.protein,
      selectedCombo.carbs,
      selectedCombo.fat,
      selectedCombo.items.join(', '),
      selectedCombo.fiber
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  function logRecipe() {
    if (!selectedRecipe) return;
    const cal = selectedRecipe.calories ?? 0;
    const pro = parseFloat(selectedRecipe.protein ?? '0') || 0;
    const carb = parseFloat(selectedRecipe.carbs ?? '0') || 0;
    const fat = parseFloat(selectedRecipe.fat ?? '0') || 0;
    const fib = parseFloat(selectedRecipe.fiber ?? '0') || 0;
    logMeal(logMealType, selectedRecipe.title, cal, pro, carb, fat, '1 serving', fib);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0A0510', '#080305', '#050508']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>WHAT SHOULD I EAT?</Text>
          <View style={{ width: 36 }} />
        </View>

        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Remaining macros readout */}
          {remaining && (
            <View style={styles.remainingCard}>
              <LinearGradient colors={['rgba(201,168,76,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', Colors.gold, 'transparent']} style={styles.remainingTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              <Text style={styles.remainingEyebrow}>LEFT TODAY</Text>
              <View style={styles.remainingRow}>
                {[
                  { label: 'CAL', value: remaining.calories, color: '#E05020' },
                  { label: 'PROTEIN', value: remaining.protein, color: Colors.gold },
                  { label: 'CARBS', value: remaining.carbs, color: Colors.ice },
                  { label: 'FIBER', value: remaining.fiber, color: '#4CAF50' },
                ].map((s) => (
                  <View key={s.label} style={styles.remainingItem}>
                    <Text style={[styles.remainingVal, { color: s.color }]}>{s.value}</Text>
                    <Text style={styles.remainingLabel}>{s.label}{s.label !== 'CAL' ? 'g' : ''}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Meal type to log into */}
          <Text style={styles.sectionLabel}>LOG AS</Text>
          <View style={styles.mealTypeRow}>
            {LOG_MEAL_TYPES.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.mealTypeChip, logMealType === m.key && styles.mealTypeChipActive]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLogMealType(m.key); }}
              >
                <Text style={[styles.mealTypeChipText, logMealType === m.key && styles.mealTypeChipTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Mode picker */}
          <Text style={styles.sectionLabel}>CHOOSE YOUR PATH</Text>
          <View style={styles.modeRow}>
            <ModeButton label="Quick" sub="Minimal prep" icon="ᚹ" active={mode === 'quick'} onPress={() => selectMode('quick')} />
            <ModeButton label="Cheap" sub="Pantry staples" icon="ᛒ" active={mode === 'cheap'} onPress={() => selectMode('cheap')} />
            <ModeButton label="Cook a Meal" sub="Real recipe" icon="ᛗ" active={mode === 'cook'} onPress={() => selectMode('cook')} />
          </View>

          {/* Quick / Cheap result */}
          {(mode === 'quick' || mode === 'cheap') && selectedCombo && (
            <View style={styles.comboCard}>
              <LinearGradient colors={['rgba(201,168,76,0.06)', 'transparent']} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', Colors.gold, 'transparent']} style={styles.comboTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              <View style={styles.comboHeader}>
                <View style={styles.comboRuneWrap}>
                  <Text style={styles.comboRune}>{selectedCombo.rune}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.comboEyebrow}>RECOMMENDED FEAST</Text>
                  <Text style={styles.comboTitle}>{selectedCombo.title}</Text>
                </View>
              </View>

              <View style={styles.comboItems}>
                {selectedCombo.items.map((item, i) => (
                  <Text key={i} style={styles.comboItemText}>• {item}</Text>
                ))}
              </View>

              <View style={styles.macroRow}>
                {[
                  { label: 'KCAL', value: selectedCombo.calories, color: '#E05020' },
                  { label: 'PROTEIN', value: selectedCombo.protein, color: Colors.gold },
                  { label: 'CARBS', value: selectedCombo.carbs, color: Colors.ice },
                  { label: 'FAT', value: selectedCombo.fat, color: '#8B6FD4' },
                  { label: 'FIBER', value: selectedCombo.fiber, color: '#4CAF50' },
                ].map((m) => (
                  <View key={m.label} style={styles.macroItem}>
                    <Text style={[styles.macroVal, { color: m.color }]}>{m.value}</Text>
                    <Text style={styles.macroKey}>{m.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.comboBtnRow}>
                <TouchableOpacity style={styles.tryAnotherBtn} onPress={tryAnother}>
                  <Text style={styles.tryAnotherBtnText}>↻ Try Another</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.logBtn} onPress={logCombo}>
                  <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <Text style={styles.logBtnText}>⚔️  LOG THIS</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Cook a Meal result */}
          {mode === 'cook' && (
            loadingRecipes ? (
              <View style={styles.centerWrap}>
                <ActivityIndicator color={Colors.gold} size="large" />
              </View>
            ) : recipeError ? (
              <View style={styles.centerWrap}>
                <Text style={styles.errorText}>{recipeError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => remaining && fetchRecipes(remaining)}>
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.recipeGrid}>
                {recipes.map((r) => (
                  <TouchableOpacity key={r.id} style={styles.recipeCard} onPress={() => openRecipe(r.id)} activeOpacity={0.85}>
                    {r.image ? (
                      <Image source={{ uri: r.image }} style={styles.recipeImage} />
                    ) : (
                      <View style={[styles.recipeImage, styles.recipeImagePlaceholder]} />
                    )}
                    <Text style={styles.recipeTitle} numberOfLines={2}>{r.title}</Text>
                    <View style={styles.recipeMacros}>
                      {r.calories !== null && <Text style={styles.recipeMacroText}>{r.calories} cal</Text>}
                      {r.protein && <Text style={[styles.recipeMacroText, { color: Colors.gold }]}>{r.protein} P</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
                {recipes.length === 0 && (
                  <Text style={styles.emptyText}>No recipes found for what's left today — try Quick or Cheap instead.</Text>
                )}
              </View>
            )
          )}

          <View style={{ height: 40 }} />
        </Animated.ScrollView>
      </SafeAreaView>

      {/* Recipe detail overlay */}
      {(selectedRecipe || loadingDetail) && (
        <View style={styles.detailOverlay}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setSelectedRecipe(null)} style={styles.backBtn}>
                <Text style={styles.backBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={1}>RECIPE</Text>
              <View style={{ width: 36 }} />
            </View>

            {loadingDetail ? (
              <View style={styles.centerWrap}>
                <ActivityIndicator color={Colors.gold} size="large" />
              </View>
            ) : selectedRecipe && (
              <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
                {selectedRecipe.image && (
                  <Image source={{ uri: selectedRecipe.image }} style={styles.detailImage} />
                )}
                <Text style={styles.detailTitle}>{selectedRecipe.title}</Text>
                <View style={styles.detailMetaRow}>
                  <Text style={styles.detailMetaText}>{selectedRecipe.servings} servings</Text>
                  <Text style={styles.detailMetaDot}>·</Text>
                  <Text style={styles.detailMetaText}>{selectedRecipe.readyInMinutes} min</Text>
                </View>

                <View style={styles.detailMacroCard}>
                  {selectedRecipe.calories !== null && (
                    <View style={styles.detailMacroItem}>
                      <Text style={styles.detailMacroVal}>{selectedRecipe.calories}</Text>
                      <Text style={styles.detailMacroLabel}>CAL</Text>
                    </View>
                  )}
                  {selectedRecipe.protein && (
                    <View style={styles.detailMacroItem}>
                      <Text style={[styles.detailMacroVal, { color: Colors.gold }]}>{selectedRecipe.protein}</Text>
                      <Text style={styles.detailMacroLabel}>PROTEIN</Text>
                    </View>
                  )}
                  {selectedRecipe.carbs && (
                    <View style={styles.detailMacroItem}>
                      <Text style={[styles.detailMacroVal, { color: Colors.ice }]}>{selectedRecipe.carbs}</Text>
                      <Text style={styles.detailMacroLabel}>CARBS</Text>
                    </View>
                  )}
                  {selectedRecipe.fat && (
                    <View style={styles.detailMacroItem}>
                      <Text style={[styles.detailMacroVal, { color: '#8B6FD4' }]}>{selectedRecipe.fat}</Text>
                      <Text style={styles.detailMacroLabel}>FAT</Text>
                    </View>
                  )}
                  {selectedRecipe.fiber && (
                    <View style={styles.detailMacroItem}>
                      <Text style={[styles.detailMacroVal, { color: '#4CAF50' }]}>{selectedRecipe.fiber}</Text>
                      <Text style={styles.detailMacroLabel}>FIBER</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity style={styles.logBtn} onPress={logRecipe}>
                  <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <Text style={styles.logBtnText}>⚔️  LOG THIS (1 SERVING)</Text>
                </TouchableOpacity>

                <Text style={styles.detailSectionLabel}>INGREDIENTS</Text>
                {selectedRecipe.ingredients.map((ing, i) => (
                  <Text key={i} style={styles.ingredientText}>• {ing}</Text>
                ))}

                <Text style={styles.detailSectionLabel}>INSTRUCTIONS</Text>
                <Text style={styles.instructionsText}>{selectedRecipe.instructions}</Text>

                {selectedRecipe.sourceUrl && (
                  <TouchableOpacity onPress={() => Linking.openURL(selectedRecipe.sourceUrl)} style={styles.sourceLink}>
                    <Text style={styles.sourceLinkText}>View full recipe source →</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

function ModeButton({ label, sub, icon, active, onPress }: {
  label: string; sub: string; icon: string; active: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.modeBtn, active && styles.modeBtnActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {active && <LinearGradient colors={['rgba(201,168,76,0.12)', 'transparent']} style={StyleSheet.absoluteFill} />}
      <Text style={[styles.modeBtnIcon, active && { color: Colors.gold }]}>{icon}</Text>
      <Text style={[styles.modeBtnLabel, active && { color: Colors.gold }]}>{label}</Text>
      <Text style={styles.modeBtnSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.text, letterSpacing: 1 },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },

  remainingCard: {
    borderWidth: 1, borderColor: Colors.goldBorder, borderRadius: 16,
    padding: Spacing.lg, marginBottom: Spacing.lg, overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.9)', gap: 10,
  },
  remainingTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  remainingEyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, color: Colors.textMuted },
  remainingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  remainingItem: { alignItems: 'center', gap: 2 },
  remainingVal: { fontFamily: Fonts.heading, fontSize: 20 },
  remainingLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 1, color: Colors.textMuted },

  sectionLabel: {
    fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3,
    color: Colors.textMuted, marginBottom: 10, marginTop: 4,
  },

  mealTypeRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  mealTypeChip: {
    flex: 1, paddingVertical: 9, borderRadius: Radii.full, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)',
  },
  mealTypeChipActive: { borderColor: Colors.goldBorder, backgroundColor: Colors.goldMuted },
  mealTypeChipText: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 0.5, color: Colors.textMuted },
  mealTypeChipTextActive: { color: Colors.gold },

  modeRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  modeBtn: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', gap: 4, overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
  },
  modeBtnActive: { borderColor: Colors.goldBorder },
  modeBtnIcon: { fontSize: 20, color: Colors.textMuted, fontFamily: 'System' },
  modeBtnLabel: { fontFamily: Fonts.heading, fontSize: 12, color: Colors.text, letterSpacing: 0.3 },
  modeBtnSub: { fontFamily: Fonts.body, fontSize: 8, color: Colors.textDim, letterSpacing: 0.3, textAlign: 'center' },

  comboCard: {
    borderWidth: 1, borderColor: Colors.goldBorder, borderRadius: 16,
    padding: Spacing.lg, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.9)', gap: 14,
  },
  comboTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  comboHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  comboRuneWrap: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: Colors.goldBorder,
    backgroundColor: Colors.goldMuted, alignItems: 'center', justifyContent: 'center',
  },
  comboRune: { fontSize: 20, color: Colors.gold, fontFamily: 'System' },
  comboEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: Colors.textMuted, marginBottom: 2 },
  comboTitle: { fontFamily: Fonts.heading, fontSize: 17, color: Colors.text, letterSpacing: 0.3 },
  comboItems: { gap: 4 },
  comboItemText: { fontFamily: Fonts.prose, fontSize: 13, color: Colors.textMuted, lineHeight: 19 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroItem: { alignItems: 'center', gap: 2 },
  macroVal: { fontFamily: Fonts.heading, fontSize: 16 },
  macroKey: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 1, color: Colors.textMuted },
  comboBtnRow: { flexDirection: 'row', gap: 10 },
  tryAnotherBtn: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: Radii.sm,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
  },
  tryAnotherBtnText: { fontFamily: Fonts.heading, fontSize: 12, color: Colors.textMuted, letterSpacing: 0.5 },
  logBtn: { flex: 1.3, borderRadius: Radii.sm, overflow: 'hidden', padding: 14, alignItems: 'center' },
  logBtnText: { fontFamily: Fonts.heading, fontSize: 12, color: Colors.void, letterSpacing: 1.5 },

  centerWrap: { alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 60 },
  errorText: { fontFamily: Fonts.prose, fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  retryBtn: { borderWidth: 1, borderColor: Colors.goldBorder, borderRadius: Radii.md, paddingHorizontal: 20, paddingVertical: 12 },
  retryBtnText: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.gold, letterSpacing: 1 },
  emptyText: { fontFamily: Fonts.proseItalic, fontSize: 13, color: Colors.textDim, textAlign: 'center', marginTop: 20, fontStyle: 'italic' },

  recipeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  recipeCard: {
    width: '47%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14,
    overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.85)', paddingBottom: 10,
  },
  recipeImage: { width: '100%', height: 100 },
  recipeImagePlaceholder: { backgroundColor: 'rgba(255,255,255,0.04)' },
  recipeTitle: { fontFamily: Fonts.subheading, fontSize: 12, color: Colors.text, padding: 8, paddingBottom: 4, lineHeight: 16 },
  recipeMacros: { flexDirection: 'row', gap: 8, paddingHorizontal: 8 },
  recipeMacroText: { fontFamily: Fonts.body, fontSize: 10, color: Colors.textMuted },

  detailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#050508' },
  detailContent: { paddingHorizontal: Spacing.lg, paddingBottom: 60, gap: 6 },
  detailImage: { width: '100%', height: 200, borderRadius: 14, marginBottom: 10 },
  detailTitle: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text, lineHeight: 26, marginBottom: 4 },
  detailMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  detailMetaText: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted },
  detailMetaDot: { color: Colors.textDim },
  detailMacroCard: {
    flexDirection: 'row', justifyContent: 'space-around',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14,
    paddingVertical: 14, marginBottom: 18, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  detailMacroItem: { alignItems: 'center', gap: 2 },
  detailMacroVal: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.text },
  detailMacroLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 1, color: Colors.textMuted },
  detailSectionLabel: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 2, color: Colors.gold, marginTop: 20, marginBottom: 8 },
  ingredientText: { fontFamily: Fonts.prose, fontSize: 13, color: Colors.textMuted, lineHeight: 20 },
  instructionsText: { fontFamily: Fonts.prose, fontSize: 13, color: Colors.textMuted, lineHeight: 21 },
  sourceLink: { marginTop: 20, alignItems: 'center' },
  sourceLinkText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.gold },
});