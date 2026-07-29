import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, TextInput, Dimensions, ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logMeal } from '@/lib/db';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width } = Dimensions.get('window');
const FAVORITES_KEY = 'valhalla_food_favorites';

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  brand?: string;
}

const QUICK_FOODS: FoodItem[] = [
  { id: 'q1', name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, servingSize: '100g' },
  { id: 'q2', name: 'White Rice (cooked)', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, servingSize: '100g' },
  { id: 'q3', name: 'Eggs (large)', calories: 78, protein: 6, carbs: 0.6, fat: 5, servingSize: '1 egg' },
  { id: 'q4', name: 'Oats (dry)', calories: 389, protein: 17, carbs: 66, fat: 7, servingSize: '100g' },
  { id: 'q5', name: 'Ground Beef 80/20', calories: 215, protein: 26, carbs: 0, fat: 13, servingSize: '100g' },
  { id: 'q6', name: 'Sweet Potato', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, servingSize: '100g' },
  { id: 'q7', name: 'Greek Yogurt', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, servingSize: '100g' },
  { id: 'q8', name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 13, servingSize: '100g' },
  { id: 'q9', name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, servingSize: '1 medium' },
  { id: 'q10', name: 'Whey Protein Shake', calories: 120, protein: 25, carbs: 3, fat: 1.5, servingSize: '1 scoop' },
  { id: 'q11', name: 'Almonds', calories: 579, protein: 21, carbs: 22, fat: 50, servingSize: '100g' },
  { id: 'q12', name: 'Broccoli', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, servingSize: '100g' },
];

type Tab = 'search' | 'favorites' | 'custom';

export default function FoodSearchModal() {
  const params = useLocalSearchParams<{ mealType: string; mealLabel: string }>();
  const mealType = params.mealType ?? 'snack';
  const mealLabel = params.mealLabel ?? 'Feast';

  const [tab, setTab] = useState<Tab>('search');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState('1');
  const [favorites, setFavorites] = useState<FoodItem[]>([]);

  const [customName, setCustomName] = useState('');
  const [customCals, setCustomCals] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customServing, setCustomServing] = useState('1 serving');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    loadFavorites();
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (search.length < 2) {
      setResults([]);
      if (abortRef.current) abortRef.current.abort();
      return;
    }
    searchTimeout.current = setTimeout(() => searchFood(search), 900);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [search]);

  async function loadFavorites() {
    try {
      const raw = await AsyncStorage.getItem(FAVORITES_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
  }

  async function toggleFavorite(food: FoodItem) {
    try {
      const exists = favorites.find(f => f.id === food.id);
      let updated: FoodItem[];
      if (exists) {
        updated = favorites.filter(f => f.id !== food.id);
      } else {
        updated = [food, ...favorites];
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setFavorites(updated);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch {}
  }

  function isFavorite(food: FoodItem) {
    return favorites.some(f => f.id === food.id);
  }

  async function searchFood(query: string) {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setLoading(true);
    try {
      const apiKey = process.env.EXPO_PUBLIC_USDA_API_KEY ?? 'DEMO_KEY';

      const params = new URLSearchParams({
        query,
        pageSize: '25',
        api_key: apiKey,
      });
      params.append('dataType', 'SR Legacy');
      params.append('dataType', 'Survey (FNDDS)');
      params.append('dataType', 'Foundation');
      params.append('dataType', 'Branded');

      const usdaRes = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?${params.toString()}`,
        { signal }
      );

      if (!usdaRes.ok) throw new Error(`USDA ${usdaRes.status}`);

      const usdaData = await usdaRes.json();

      if (usdaData.foods?.length > 0) {
        const items: FoodItem[] = usdaData.foods
          .map((f: any) => {
            const getNutrient = (id: number) =>
              f.foodNutrients?.find((n: any) => n.nutrientId === id)?.value ?? 0;
            const calories = Math.round(getNutrient(1008));
            return {
              id: `usda_${f.fdcId}`,
              name: f.description,
              brand: f.brandOwner ?? f.brandName ?? undefined,
              calories,
              protein: Math.round(getNutrient(1003) * 10) / 10,
              carbs: Math.round(getNutrient(1005) * 10) / 10,
              fat: Math.round(getNutrient(1004) * 10) / 10,
              servingSize: f.servingSize
                ? `${f.servingSize}${f.servingSizeUnit ?? 'g'}`
                : '100g',
            };
          })
          .filter((f: FoodItem) => f.calories > 0)
          .slice(0, 20);

        setResults(items);
        setLoading(false);
        return;
      }

      const offRes = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&fields=product_name,brands,nutriments,serving_size`,
        { signal }
      );
      if (!offRes.ok) throw new Error(`OFF ${offRes.status}`);

      const offData = await offRes.json();
      const items: FoodItem[] = (offData.products ?? [])
        .filter((p: any) =>
          p.product_name?.trim() &&
          p.nutriments?.['energy-kcal_100g'] > 0
        )
        .slice(0, 15)
        .map((p: any, i: number) => ({
          id: `off_${i}_${Date.now()}`,
          name: p.product_name.trim(),
          brand: p.brands?.trim() || undefined,
          calories: Math.round(p.nutriments['energy-kcal_100g'] ?? 0),
          protein: Math.round((p.nutriments['proteins_100g'] ?? 0) * 10) / 10,
          carbs: Math.round((p.nutriments['carbohydrates_100g'] ?? 0) * 10) / 10,
          fat: Math.round((p.nutriments['fat_100g'] ?? 0) * 10) / 10,
          servingSize: p.serving_size?.trim() ?? '100g',
        }))
        .filter((f: FoodItem) => f.calories > 0);

      setResults(items);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setResults([]);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }

  function handleSelect(food: FoodItem) {
    setSelected(food);
    setServings('1');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleLog() {
    if (!selected) return;
    const multiplier = parseFloat(servings) || 1;
    logMeal(
      mealType,
      selected.name,
      Math.round(selected.calories * multiplier),
      Math.round(selected.protein * multiplier * 10) / 10,
      Math.round(selected.carbs * multiplier * 10) / 10,
      Math.round(selected.fat * multiplier * 10) / 10,
      `${servings}x ${selected.servingSize}`
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  function handleCustomLog() {
    if (!customName.trim()) {
      Alert.alert('Name required', 'Enter a name for this food.');
      return;
    }
    const cals = parseFloat(customCals) || 0;
    const protein = parseFloat(customProtein) || 0;
    const carbs = parseFloat(customCarbs) || 0;
    const fat = parseFloat(customFat) || 0;

    logMeal(mealType, customName.trim(), Math.round(cals), protein, carbs, fat, customServing);

    const customFood: FoodItem = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      calories: cals,
      protein,
      carbs,
      fat,
      servingSize: customServing,
    };
    toggleFavorite(customFood);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  const displayFoods = search.length >= 2 ? results : QUICK_FOODS;
  const multiplier = parseFloat(servings) || 1;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#080305', '#050508']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

          <View style={styles.header}>
            <View>
              <Text style={styles.headerEyebrow}>ADDING TO</Text>
              <Text style={styles.headerTitle}>{mealLabel}</Text>
            </View>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            {(['search', 'favorites', 'custom'] as Tab[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => { setTab(t); setSelected(null); }}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'search' ? 'Search' : t === 'favorites' ? `Saved (${favorites.length})` : 'Custom'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'search' && (
            <>
              <View style={styles.searchWrap}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search 600,000+ foods..."
                  placeholderTextColor={Colors.textDim}
                  autoCapitalize="none"
                />
                {loading && <ActivityIndicator size="small" color={Colors.gold} />}
                {!loading && search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Text style={styles.searchClear}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {search.length === 0 && (
                <Text style={styles.quickLabel}>⚡ WARRIOR STAPLES</Text>
              )}

              {selected && <SelectedCard
                selected={selected}
                servings={servings}
                setServings={setServings}
                multiplier={multiplier}
                isFav={isFavorite(selected)}
                onToggleFav={() => toggleFavorite(selected)}
                onLog={handleLog}
              />}

              <ScrollView
                style={styles.listScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {displayFoods.map((food) => (
                  <FoodRow
                    key={food.id}
                    food={food}
                    isSelected={selected?.id === food.id}
                    isFav={isFavorite(food)}
                    onSelect={() => handleSelect(food)}
                    onToggleFav={() => toggleFavorite(food)}
                  />
                ))}
                {search.length >= 2 && results.length === 0 && !loading && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyRune}>ᚷ</Text>
                    <Text style={styles.emptyText}>No foods found</Text>
                    <Text style={styles.emptySub}>Try a different term or use Custom entry</Text>
                  </View>
                )}
                <View style={{ height: 40 }} />
              </ScrollView>
            </>
          )}

          {tab === 'favorites' && (
            <>
              {selected && <SelectedCard
                selected={selected}
                servings={servings}
                setServings={setServings}
                multiplier={multiplier}
                isFav={isFavorite(selected)}
                onToggleFav={() => toggleFavorite(selected)}
                onLog={handleLog}
              />}
              <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
                {favorites.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyRune}>ᚹ</Text>
                    <Text style={styles.emptyText}>No saved foods yet</Text>
                    <Text style={styles.emptySub}>Tap ♡ on any food to save it here</Text>
                  </View>
                ) : (
                  favorites.map((food) => (
                    <FoodRow
                      key={food.id}
                      food={food}
                      isSelected={selected?.id === food.id}
                      isFav={true}
                      onSelect={() => handleSelect(food)}
                      onToggleFav={() => toggleFavorite(food)}
                    />
                  ))
                )}
                <View style={{ height: 40 }} />
              </ScrollView>
            </>
          )}

          {tab === 'custom' && (
            <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.customCard}>
                <LinearGradient
                  colors={['rgba(201,168,76,0.06)', 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.customTitle}>Manual Entry</Text>
                <Text style={styles.customSub}>Log any food with custom macros</Text>

                <CustomField label="FOOD NAME *" value={customName} onChange={setCustomName} placeholder="e.g. Mom's Stew" />
                <CustomField label="SERVING SIZE" value={customServing} onChange={setCustomServing} placeholder="e.g. 1 bowl" />

                <View style={styles.customMacroRow}>
                  <View style={{ flex: 1 }}>
                    <CustomField label="CALORIES" value={customCals} onChange={setCustomCals} placeholder="0" numeric />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CustomField label="PROTEIN (g)" value={customProtein} onChange={setCustomProtein} placeholder="0" numeric />
                  </View>
                </View>
                <View style={styles.customMacroRow}>
                  <View style={{ flex: 1 }}>
                    <CustomField label="CARBS (g)" value={customCarbs} onChange={setCustomCarbs} placeholder="0" numeric />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CustomField label="FAT (g)" value={customFat} onChange={setCustomFat} placeholder="0" numeric />
                  </View>
                </View>

                {(customCals || customProtein || customCarbs || customFat) ? (
                  <View style={styles.macroRow}>
                    {[
                      { label: 'KCAL', value: customCals || '0', color: '#E05020' },
                      { label: 'PROTEIN', value: customProtein || '0', color: Colors.gold },
                      { label: 'CARBS', value: customCarbs || '0', color: Colors.ice },
                      { label: 'FAT', value: customFat || '0', color: '#8B6FD4' },
                    ].map((m) => (
                      <View key={m.label} style={styles.macroItem}>
                        <Text style={[styles.macroVal, { color: m.color }]}>{m.value}</Text>
                        <Text style={styles.macroKey}>{m.label}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <TouchableOpacity style={styles.logBtn} onPress={handleCustomLog}>
                  <LinearGradient
                    colors={[Colors.goldDark, Colors.gold]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <Text style={styles.logBtnText}>⚔️  ADD TO FEAST</Text>
                </TouchableOpacity>
                <Text style={styles.customSaveNote}>Custom foods are auto-saved to your favorites</Text>
              </View>
              <View style={{ height: 60 }} />
            </ScrollView>
          )}

        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function SelectedCard({
  selected, servings, setServings, multiplier, isFav, onToggleFav, onLog,
}: {
  selected: FoodItem; servings: string; setServings: (s: string) => void;
  multiplier: number; isFav: boolean; onToggleFav: () => void; onLog: () => void;
}) {
  return (
    <View style={styles.selectedCard}>
      <LinearGradient colors={['rgba(201,168,76,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['transparent', Colors.gold, 'transparent']}
        style={styles.selectedTopLine}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      />
      <View style={styles.selectedHeader}>
        <Text style={styles.selectedName} numberOfLines={2}>{selected.name}</Text>
        <TouchableOpacity onPress={onToggleFav} style={styles.favBtn}>
          <Text style={[styles.favBtnText, isFav && { color: Colors.gold }]}>
            {isFav ? '♥' : '♡'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.selectedServing}>{selected.servingSize}</Text>

      <View style={styles.servingsRow}>
        <Text style={styles.servingsLabel}>SERVINGS</Text>
        <View style={styles.servingsInput}>
          <TouchableOpacity
            style={styles.servingsBtn}
            onPress={() => setServings(String(Math.max(0.5, (parseFloat(servings) || 1) - 0.5)))}
          >
            <Text style={styles.servingsBtnText}>−</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.servingsValue}
            value={servings}
            onChangeText={setServings}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity
            style={styles.servingsBtn}
            onPress={() => setServings(String((parseFloat(servings) || 1) + 0.5))}
          >
            <Text style={styles.servingsBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.macroRow}>
        {[
          { label: 'KCAL', value: Math.round(selected.calories * multiplier), color: '#E05020' },
          { label: 'PROTEIN', value: Math.round(selected.protein * multiplier), color: Colors.gold },
          { label: 'CARBS', value: Math.round(selected.carbs * multiplier), color: Colors.ice },
          { label: 'FAT', value: Math.round(selected.fat * multiplier), color: '#8B6FD4' },
        ].map((m) => (
          <View key={m.label} style={styles.macroItem}>
            <Text style={[styles.macroVal, { color: m.color }]}>{m.value}</Text>
            <Text style={styles.macroKey}>{m.label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logBtn} onPress={onLog}>
        <LinearGradient
          colors={[Colors.goldDark, Colors.gold]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <Text style={styles.logBtnText}>⚔️  ADD TO FEAST</Text>
      </TouchableOpacity>
    </View>
  );
}

function FoodRow({
  food, isSelected, isFav, onSelect, onToggleFav,
}: {
  food: FoodItem; isSelected: boolean; isFav: boolean;
  onSelect: () => void; onToggleFav: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.foodRow, isSelected && styles.foodRowSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {isSelected && (
        <LinearGradient
          colors={['rgba(201,168,76,0.06)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.foodInfo}>
        <Text style={styles.foodName} numberOfLines={1}>{food.name}</Text>
        {food.brand && <Text style={styles.foodBrand} numberOfLines={1}>{food.brand}</Text>}
        <Text style={styles.foodMacros}>
          {food.calories} kcal · {food.protein}P · {food.carbs}C · {food.fat}F · {food.servingSize}
        </Text>
      </View>
      <TouchableOpacity onPress={onToggleFav} style={styles.favBtnSmall} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={[styles.favBtnSmallText, isFav && { color: Colors.gold }]}>
          {isFav ? '♥' : '♡'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function CustomField({
  label, value, onChange, placeholder, numeric,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; numeric?: boolean;
}) {
  return (
    <View style={styles.customField}>
      <Text style={styles.customFieldLabel}>{label}</Text>
      <TextInput
        style={styles.customFieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textDim}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  headerEyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 4, color: '#E05020', marginBottom: 4 },
  headerTitle: { fontFamily: Fonts.display, fontSize: 24, color: Colors.gold, letterSpacing: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  closeBtnText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted },
  tabs: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: Radii.md, padding: 3, gap: 3 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: Radii.sm, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(201,168,76,0.12)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)' },
  tabText: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 0.5, color: Colors.textMuted },
  tabTextActive: { color: Colors.gold },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: Radii.md, paddingHorizontal: Spacing.md, gap: 10 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontFamily: Fonts.prose, fontSize: 15, color: Colors.text, paddingVertical: 12 },
  searchClear: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted },
  quickLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 3, color: Colors.textMuted, paddingHorizontal: Spacing.lg, marginBottom: 8 },
  selectedCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.goldBorder, borderRadius: Radii.md, padding: Spacing.md, overflow: 'hidden', gap: 10, backgroundColor: 'rgba(10,8,10,0.9)' },
  selectedTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  selectedHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  selectedName: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.text, flex: 1 },
  favBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  favBtnText: { fontSize: 20, color: Colors.textMuted },
  selectedServing: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted, marginTop: -6 },
  servingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  servingsLabel: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 2, color: Colors.textMuted },
  servingsInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' },
  servingsBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  servingsBtnText: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.gold },
  servingsValue: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.text, width: 48, textAlign: 'center' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroItem: { alignItems: 'center', gap: 2 },
  macroVal: { fontFamily: Fonts.heading, fontSize: 18 },
  macroKey: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 1.5, color: Colors.textMuted },
  logBtn: { borderRadius: Radii.sm, overflow: 'hidden', padding: 14, alignItems: 'center' },
  logBtnText: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.void, letterSpacing: 2 },
  listScroll: { flex: 1 },
  foodRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' },
  foodRowSelected: { borderBottomColor: 'rgba(201,168,76,0.1)' },
  foodInfo: { flex: 1 },
  foodName: { fontFamily: Fonts.subheading, fontSize: 14, color: Colors.text, marginBottom: 2 },
  foodBrand: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textDim, marginBottom: 2 },
  foodMacros: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted },
  favBtnSmall: { paddingLeft: 12, paddingVertical: 4 },
  favBtnSmallText: { fontSize: 18, color: Colors.textDim },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 8 },
  emptyRune: { fontSize: 36, color: 'rgba(201,168,76,0.15)' },
  emptyText: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.textMuted },
  emptySub: { fontFamily: Fonts.prose, fontSize: 13, color: Colors.textDim, textAlign: 'center' },
  customCard: { marginHorizontal: Spacing.lg, marginTop: Spacing.sm, borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)', borderRadius: 16, padding: Spacing.lg, overflow: 'hidden', gap: 12, backgroundColor: 'rgba(10,8,10,0.9)' },
  customTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.gold, letterSpacing: 1 },
  customSub: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted, marginTop: -6 },
  customMacroRow: { flexDirection: 'row', gap: 10 },
  customField: { gap: 4 },
  customFieldLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: Colors.textMuted },
  customFieldInput: { fontFamily: Fonts.prose, fontSize: 15, color: Colors.text, borderBottomWidth: 1, borderBottomColor: 'rgba(201,168,76,0.2)', paddingVertical: 8 },
  customSaveNote: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textDim, textAlign: 'center', fontStyle: 'italic' },
});