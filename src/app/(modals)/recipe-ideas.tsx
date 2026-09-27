import { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Animated, ActivityIndicator, Image, Linking,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const API_KEY = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;

// Each filter maps to real Spoonacular query params — diet and macro
// thresholds combine in the same request, so "High Protein" and "Vegan"
// aren't mutually exclusive categories, they're just different filters
// that can, in principle, both apply to the same search.
const FILTERS = [
  { key: 'high_protein', label: 'HIGH PROTEIN', params: { minProtein: 25 }, color: Colors.gold },
  { key: 'vegan',        label: 'VEGAN',         params: { diet: 'vegan' }, color: '#4CAF50' },
  { key: 'vegetarian',   label: 'VEGETARIAN',    params: { diet: 'vegetarian' }, color: '#8BC34A' },
  { key: 'low_carb',     label: 'LOW CARB',      params: { maxCarbs: 20 }, color: Colors.ice },
  { key: 'keto',         label: 'KETO',          params: { diet: 'ketogenic' }, color: '#8B6FD4' },
  { key: 'high_calorie', label: 'BULKING',       params: { minCalories: 600 }, color: '#E05020' },
];

interface RecipeSummary {
  id: number;
  title: string;
  image: string;
  calories: number | null;
  protein: string | null;
  carbs: string | null;
  fat: string | null;
}

interface RecipeDetail extends RecipeSummary {
  servings: number;
  readyInMinutes: number;
  sourceUrl: string;
  ingredients: string[];
  instructions: string;
}

function parseNutrients(nutrients: any[]): { calories: number | null; protein: string | null; carbs: string | null; fat: string | null } {
  const find = (name: string) => nutrients?.find((n: any) => n.name === name)?.amount ?? null;
  const cal = find('Calories');
  const pro = find('Protein');
  const carb = find('Carbohydrates');
  const fat = find('Fat');
  return {
    calories: cal !== null ? Math.round(cal) : null,
    protein: pro !== null ? `${Math.round(pro)}g` : null,
    carbs: carb !== null ? `${Math.round(carb)}g` : null,
    fat: fat !== null ? `${Math.round(fat)}g` : null,
  };
}

export default function RecipeIdeasScreen() {
  const [activeFilter, setActiveFilter] = useState<string | null>('high_protein');
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    fetchRecipes('high_protein');
  }, []);

  async function fetchRecipes(filterKey: string) {
    if (!API_KEY) {
      setError('Recipe search is not configured. Missing API key.');
      return;
    }
    setLoading(true);
    setError(null);
    setActiveFilter(filterKey);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const filter = FILTERS.find(f => f.key === filterKey);
    const params = new URLSearchParams({
      apiKey: API_KEY,
      number: '12',
      addRecipeNutrition: 'true',
      ...Object.fromEntries(
        Object.entries(filter?.params ?? {}).map(([k, v]) => [k, String(v)])
      ),
    });

    try {
      const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.message || 'Could not load recipes right now.');
        setRecipes([]);
        return;
      }

      const parsed: RecipeSummary[] = (json.results ?? []).map((r: any) => ({
        id: r.id,
        title: r.title,
        image: r.image,
        ...parseNutrients(r.nutrition?.nutrients ?? []),
      }));
      setRecipes(parsed);
    } catch (e) {
      setError('Could not reach the recipe database. Check your connection.');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }

  async function openRecipe(id: number) {
    if (!API_KEY) return;
    setLoadingDetail(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const res = await fetch(
        `https://api.spoonacular.com/recipes/${id}/information?apiKey=${API_KEY}&includeNutrition=true`
      );
      const json = await res.json();

      const ingredients: string[] = (json.extendedIngredients ?? []).map((i: any) => i.original);
      // Spoonacular's instructions field is raw HTML — strip tags for
      // plain display rather than rendering markup we have no parser for.
      const instructions = (json.instructions ?? 'No instructions provided.')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      setSelectedRecipe({
        id: json.id,
        title: json.title,
        image: json.image,
        servings: json.servings,
        readyInMinutes: json.readyInMinutes,
        sourceUrl: json.sourceUrl,
        ingredients,
        instructions,
        ...parseNutrients(json.nutrition?.nutrients ?? []),
      });
    } catch (e) {
      // Silently fail back to the list — the summary card already has
      // enough info that a detail-view failure isn't a dead end.
    } finally {
      setLoadingDetail(false);
    }
  }

  const activeFilterMeta = FILTERS.find(f => f.key === activeFilter);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0A0812', '#050508']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>RECIPE IDEAS</Text>
          <View style={{ width: 36 }} />
        </View>

        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((f) => {
              const isActive = activeFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.filterChip,
                    isActive && { borderColor: f.color, backgroundColor: `${f.color}15` },
                  ]}
                  onPress={() => fetchRecipes(f.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isActive && { color: f.color }]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {!API_KEY ? (
            <View style={styles.centerWrap}>
              <Text style={styles.errorText}>Recipe search isn't configured yet.</Text>
            </View>
          ) : loading ? (
            <View style={styles.centerWrap}>
              <ActivityIndicator color={activeFilterMeta?.color ?? Colors.gold} size="large" />
            </View>
          ) : error ? (
            <View style={styles.centerWrap}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => activeFilter && fetchRecipes(activeFilter)}>
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.recipeGrid} showsVerticalScrollIndicator={false}>
              {recipes.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={styles.recipeCard}
                  onPress={() => openRecipe(r.id)}
                  activeOpacity={0.85}
                >
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
                <Text style={styles.emptyText}>No recipes found for this filter.</Text>
              )}
            </ScrollView>
          )}
        </Animated.View>
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
                </View>

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

  filterRow: { paddingHorizontal: Spacing.lg, gap: 8, paddingBottom: Spacing.md },
  filterChip: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: Radii.full,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  filterChipText: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 1, color: Colors.textMuted },

  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: Spacing.lg },
  errorText: { fontFamily: Fonts.prose, fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  retryBtn: { borderWidth: 1, borderColor: Colors.goldBorder, borderRadius: Radii.md, paddingHorizontal: 20, paddingVertical: 12 },
  retryBtnText: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.gold, letterSpacing: 1 },
  emptyText: { fontFamily: Fonts.proseItalic, fontSize: 13, color: Colors.textDim, textAlign: 'center', marginTop: 40, fontStyle: 'italic' },

  recipeGrid: { paddingHorizontal: Spacing.lg, paddingBottom: 40, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
  detailSectionLabel: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 2, color: Colors.gold, marginTop: 10, marginBottom: 8 },
  ingredientText: { fontFamily: Fonts.prose, fontSize: 13, color: Colors.textMuted, lineHeight: 20 },
  instructionsText: { fontFamily: Fonts.prose, fontSize: 13, color: Colors.textMuted, lineHeight: 21 },
  sourceLink: { marginTop: 20, alignItems: 'center' },
  sourceLinkText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.gold },
});