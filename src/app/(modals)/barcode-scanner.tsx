import { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { logMeal } from '@/lib/db';
import { Colors, Fonts, Spacing } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

interface FoodProduct {
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  servingSize: string;
  novaGroup: number | null;
  nutriscore: string | null;
  additives: string[];
  ingredientsText: string;
  allergens: string[];
  sugarLevel: string | null;
  saltLevel: string | null;
  fatLevel: string | null;
  servingBased: boolean;
}


// ── ADDITIVE LOOKUP ──────────────────────────────────────────
// Maps E-numbers and common US additive codes to a risk tier and
// a short plain-English explanation. Viking-framed labels match
// the NOVA group language already used in the Pillage Report.
// Sources: EFSA evaluations, FDA GRAS list, IARC classifications.
type AdditiveTier = 'CURSED' | 'TAINTED' | 'FORGED';

interface AdditiveInfo {
  name: string;
  tier: AdditiveTier;
  desc: string;
}

const ADDITIVE_DB: Record<string, AdditiveInfo> = {
  // ── CURSED — strong concern ─────────────────────────────
  'E102': { name: 'Tartrazine', tier: 'CURSED', desc: 'Artificial yellow dye — linked to hyperactivity in children. Banned in some countries.' },
  'E104': { name: 'Quinoline Yellow', tier: 'CURSED', desc: 'Artificial yellow dye — banned in the US and Australia. Linked to hyperactivity.' },
  'E110': { name: 'Sunset Yellow', tier: 'CURSED', desc: 'Artificial orange dye — linked to hyperactivity. Requires warning label in the EU.' },
  'E122': { name: 'Carmoisine', tier: 'CURSED', desc: 'Artificial red dye — linked to hyperactivity. Banned in the US.' },
  'E124': { name: 'Ponceau 4R', tier: 'CURSED', desc: 'Artificial red dye — banned in the US. Linked to hyperactivity and allergic reactions.' },
  'E129': { name: 'Allura Red', tier: 'CURSED', desc: 'Artificial red dye — linked to hyperactivity in children. Requires EU warning label.' },
  'E150D': { name: 'Sulphite Ammonia Caramel', tier: 'CURSED', desc: 'Artificial caramel color — contains 4-MEI, a possible carcinogen.' },
  'E210': { name: 'Benzoic Acid', tier: 'CURSED', desc: 'Preservative — can form benzene (a carcinogen) when combined with vitamin C.' },
  'E211': { name: 'Sodium Benzoate', tier: 'CURSED', desc: 'Preservative — forms benzene with vitamin C. Linked to hyperactivity in children.' },
  'E212': { name: 'Potassium Benzoate', tier: 'CURSED', desc: 'Preservative — same concerns as sodium benzoate. Avoid with vitamin C.' },
  'E220': { name: 'Sulphur Dioxide', tier: 'CURSED', desc: 'Preservative — can trigger asthma and allergic reactions, especially in sensitive individuals.' },
  'E249': { name: 'Potassium Nitrite', tier: 'CURSED', desc: 'Curing agent — nitrites in processed meat are linked to colorectal cancer (WHO Group 1).' },
  'E250': { name: 'Sodium Nitrite', tier: 'CURSED', desc: 'Curing agent — linked to colorectal cancer. Common in processed meats.' },
  'E320': { name: 'BHA', tier: 'CURSED', desc: 'Antioxidant preservative — listed as a possible human carcinogen (IARC Group 2B).' },
  'E321': { name: 'BHT', tier: 'CURSED', desc: 'Antioxidant preservative — possible carcinogen. Banned in food in some countries.' },
  'E951': { name: 'Aspartame', tier: 'CURSED', desc: 'Artificial sweetener — classified as a possible carcinogen (IARC Group 2B) in 2023.' },
  'E954': { name: 'Saccharin', tier: 'CURSED', desc: 'Artificial sweetener — early studies linked to bladder cancer in animals. Controversial.' },

  // ── TAINTED — worth knowing about ──────────────────────
  'E120': { name: 'Cochineal / Carmine', tier: 'TAINTED', desc: 'Natural red dye from crushed insects. Can cause severe allergic reactions in some people.' },
  'E150A': { name: 'Plain Caramel', tier: 'TAINTED', desc: 'Natural caramel color. Generally safe but adds no nutritional value.' },
  'E160B': { name: 'Annatto', tier: 'TAINTED', desc: 'Natural yellow-orange dye. Can trigger allergic reactions in aspirin-sensitive individuals.' },
  'E202': { name: 'Potassium Sorbate', tier: 'TAINTED', desc: 'Preservative. Generally safe but can cause skin irritation in some people.' },
  'E203': { name: 'Calcium Sorbate', tier: 'TAINTED', desc: 'Preservative. Generally considered safe at normal food levels.' },
  'E300': { name: 'Ascorbic Acid (Vit C)', tier: 'FORGED', desc: 'Vitamin C used as an antioxidant. Safe and beneficial.' },
  'E330': { name: 'Citric Acid', tier: 'FORGED', desc: 'Natural acid from citrus fruits. Safe preservative and flavor enhancer.' },
  'E407': { name: 'Carrageenan', tier: 'TAINTED', desc: 'Seaweed extract thickener. Some studies link it to gut inflammation at high doses.' },
  'E412': { name: 'Guar Gum', tier: 'TAINTED', desc: 'Natural thickener. Generally safe but can cause digestive discomfort in large amounts.' },
  'E415': { name: 'Xanthan Gum', tier: 'TAINTED', desc: 'Fermented thickener. Generally safe. Can cause digestive issues in large amounts.' },
  'E420': { name: 'Sorbitol', tier: 'TAINTED', desc: 'Sugar alcohol sweetener. Can cause digestive discomfort and bloating in large amounts.' },
  'E421': { name: 'Mannitol', tier: 'TAINTED', desc: 'Sugar alcohol. Can cause digestive issues. Often used as a bulking agent.' },
  'E450': { name: 'Diphosphates', tier: 'TAINTED', desc: 'Phosphate salts — high phosphate intake linked to kidney stress and cardiovascular risk.' },
  'E451': { name: 'Triphosphates', tier: 'TAINTED', desc: 'Phosphate additive — excess phosphate linked to kidney and bone health concerns.' },
  'E452': { name: 'Polyphosphates', tier: 'TAINTED', desc: 'Phosphate additive — associated with kidney stress at high dietary levels.' },
  'E621': { name: 'MSG', tier: 'TAINTED', desc: 'Monosodium glutamate — flavor enhancer. FDA considers it safe. Some people report sensitivity.' },
  'E627': { name: 'Disodium Guanylate', tier: 'TAINTED', desc: 'Flavor enhancer — often used with MSG. Avoid if you have gout.' },
  'E631': { name: 'Disodium Inosinate', tier: 'TAINTED', desc: 'Flavor enhancer — derived from meat or fish. Avoid if you have gout.' },
  'E950': { name: 'Acesulfame K', tier: 'TAINTED', desc: 'Artificial sweetener — some animal studies raised concerns. More research needed.' },
  'E952': { name: 'Cyclamate', tier: 'TAINTED', desc: 'Artificial sweetener — banned in the US since 1969. Allowed in EU with limits.' },
  'E955': { name: 'Sucralose', tier: 'TAINTED', desc: 'Artificial sweetener. May negatively affect gut bacteria at high doses.' },
  'E960': { name: 'Steviol Glycosides', tier: 'TAINTED', desc: 'Stevia-derived sweetener. Generally considered safe. Natural origin.' },

  // ── FORGED — generally safe ─────────────────────────────
  'E100': { name: 'Curcumin', tier: 'FORGED', desc: 'Natural yellow dye from turmeric. Anti-inflammatory properties. Generally safe.' },
  'E101': { name: 'Riboflavin (Vit B2)', tier: 'FORGED', desc: 'Vitamin B2 used as a yellow dye. Beneficial nutrient.' },
  'E160A': { name: 'Beta-Carotene', tier: 'FORGED', desc: 'Natural orange dye — precursor to Vitamin A. Safe and nutritionally beneficial.' },
  'E200': { name: 'Sorbic Acid', tier: 'FORGED', desc: 'Natural preservative derived from berries. Generally safe at food levels.' },
  'E260': { name: 'Acetic Acid', tier: 'FORGED', desc: 'Vinegar — natural preservative. Safe.' },
  'E270': { name: 'Lactic Acid', tier: 'FORGED', desc: 'Natural acid produced by fermentation. Safe — found naturally in yogurt.' },
  'E306': { name: 'Tocopherols (Vit E)', tier: 'FORGED', desc: 'Vitamin E antioxidant. Beneficial nutrient used as a natural preservative.' },
  'E307': { name: 'Alpha-Tocopherol (Vit E)', tier: 'FORGED', desc: 'Synthetic Vitamin E. Safe antioxidant.' },
  'E322': { name: 'Lecithin', tier: 'FORGED', desc: 'Natural emulsifier from soy or sunflower. Generally safe. Common in chocolate.' },
  'E440': { name: 'Pectin', tier: 'FORGED', desc: 'Natural fiber from fruit peels. Safe — used as a gelling agent in jams.' },
  'E471': { name: 'Mono/Diglycerides', tier: 'TAINTED', desc: 'Emulsifiers from fats. Generally safe but may contain trans fats from their source.' },
  'E500': { name: 'Sodium Carbonates', tier: 'FORGED', desc: 'Baking soda family. Safe leavening agent.' },
  'E503': { name: 'Ammonium Carbonates', tier: 'FORGED', desc: 'Leavening agent. Safe at food levels.' },
  'E509': { name: 'Calcium Chloride', tier: 'FORGED', desc: 'Firming agent and salt substitute. Generally safe.' },
  'E575': { name: 'Glucono Delta-Lactone', tier: 'FORGED', desc: 'Natural acidifier — found in honey and fruit juices. Generally safe.' },
};

// Normalize an additive tag from Open Food Facts to a lookup key.
// OFF returns tags like "en:e211", "en:sodium-benzoate", "en:e102" etc.
function normalizeAdditiveTag(tag: string): string {
  return tag
    .replace(/^en:/, '')
    .replace(/-/g, '')
    .toUpperCase()
    .replace(/^E0+/, 'E');
}

function lookupAdditive(tag: string): AdditiveInfo | null {
  const key = normalizeAdditiveTag(tag);
  if (ADDITIVE_DB[key]) return ADDITIVE_DB[key];
  // Try with E prefix if not already present
  if (!key.startsWith('E') && ADDITIVE_DB[`E${key}`]) return ADDITIVE_DB[`E${key}`];
  return null;
}

const ADDITIVE_TIER_COLORS: Record<AdditiveTier, string> = {
  CURSED:  Colors.blood,
  TAINTED: '#E0A020',
  FORGED:  Colors.ice,
};

const NOVA_LABELS: Record<number, { label: string; color: string; desc: string }> = {
  1: { label: 'RAW',     color: '#4CAF50', desc: 'Unprocessed or minimally processed' },
  2: { label: 'FORGED',  color: '#A8C4D4', desc: 'Processed culinary ingredients' },
  3: { label: 'TAINTED', color: '#E0A020', desc: 'Processed food' },
  4: { label: 'CURSED',  color: Colors.blood, desc: 'Ultra-processed food' },
};

const GRADE_COLORS: Record<string, string> = {
  a: '#4CAF50', b: '#8BC34A', c: '#E0A020', d: '#E05020', e: Colors.blood,
};

const LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  low:      { label: 'LOW',  color: '#4CAF50' },
  moderate: { label: 'MED',  color: '#E0A020' },
  high:     { label: 'HIGH', color: Colors.blood },
};

export default function BarcodeScannerScreen() {
  const params = useLocalSearchParams<{ mealType: string; mealLabel: string }>();
  const mealType  = params.mealType  ?? 'midday';
  const mealLabel = params.mealLabel ?? 'Midday Feast';

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [product, setProduct]     = useState<FoodProduct | null>(null);
  const [servings, setServings]   = useState('1');
  const [logged, setLogged]       = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const scanAnim    = useRef(new Animated.Value(0)).current;
  const resultAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const reportAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const scanLineY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 200] });

  async function handleBarcode({ data }: { data: string }) {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${data}.json`);
      const json = await res.json();

      if (json.status !== 1 || !json.product) {
        Alert.alert('Not Found', 'This product was not found in our database. Try searching manually.', [
          { text: 'Scan Again', onPress: () => { setScanned(false); setLoading(false); } },
          { text: 'Cancel', onPress: () => router.back() },
        ]);
        return;
      }

      const p = json.product;
      const nutriments = p.nutriments ?? {};

      // Prefer per-serving values; fall back to per-100g.
      // Track which basis was used so we can tell the user.
      const servingBased = !!(
        nutriments['energy-kcal_serving'] ||
        nutriments['proteins_serving'] ||
        nutriments['carbohydrates_serving']
      );

      const additiveTags: string[] = p.additives_tags ?? [];
      const additives = additiveTags.map((tag: string) => tag.replace('en:', '').toUpperCase());

      const allergenTags: string[] = p.allergens_tags ?? [];
      const allergens = allergenTags.map((tag: string) =>
        tag.replace('en:', '').replace(/-/g, ' ')
      );

      const food: FoodProduct = {
        name:        p.product_name ?? p.product_name_en ?? 'Unknown Product',
        brand:       p.brands ?? '',
        calories:    Math.round(nutriments['energy-kcal_serving'] ?? nutriments['energy-kcal_100g'] ?? 0),
        protein:     Math.round((nutriments['proteins_serving'] ?? nutriments['proteins_100g'] ?? 0) * 10) / 10,
        carbs:       Math.round((nutriments['carbohydrates_serving'] ?? nutriments['carbohydrates_100g'] ?? 0) * 10) / 10,
        fat:         Math.round((nutriments['fat_serving'] ?? nutriments['fat_100g'] ?? 0) * 10) / 10,
        fiber:       Math.round((nutriments['fiber_serving'] ?? nutriments['fiber_100g'] ?? 0) * 10) / 10,
        servingSize: p.serving_size ?? '1 serving',
        novaGroup:   p.nova_group ?? null,
        nutriscore:  p.nutriscore_grade ?? null,
        additives,
        ingredientsText: p.ingredients_text ?? p.ingredients_text_en ?? '',
        allergens,
        sugarLevel:  p.nutrient_levels?.sugars ?? null,
        saltLevel:   p.nutrient_levels?.salt ?? null,
        fatLevel:    p.nutrient_levels?.fat ?? null,
        servingBased,
      };

      setProduct(food);
      Animated.spring(resultAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }).start();
    } catch (e) {
      Alert.alert('Error', 'Could not fetch product info. Check your connection.', [
        { text: 'Scan Again', onPress: () => { setScanned(false); setLoading(false); } },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function toggleReport() {
    const next = !reportOpen;
    setReportOpen(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(reportAnim, { toValue: next ? 1 : 0, duration: 300, useNativeDriver: false }).start();
  }

  function handleLog() {
    if (!product) return;
    const qty = parseFloat(servings) || 1;
    logMeal(
      mealType,
      product.name,
      Math.round(product.calories * qty),
      Math.round(product.protein * qty * 10) / 10,
      Math.round(product.carbs   * qty * 10) / 10,
      Math.round(product.fat     * qty * 10) / 10,
      `${qty} × ${product.servingSize}`,
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLogged(true);
    setTimeout(() => router.back(), 1200);
  }

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 }]}>
        <LinearGradient colors={['#0C0810', '#050508']} style={StyleSheet.absoluteFill} />
        <Text style={styles.permRune}>ᚺ</Text>
        <Text style={styles.permTitle}>ALLOW CAMERA ACCESS</Text>
        <Text style={styles.permSub}>Point your camera at a barcode to scan calories, macros, and ingredients.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={StyleSheet.absoluteFill} />
          <Text style={styles.permBtnText}>GRANT ACCESS →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.permCancel}>Not now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nova = product?.novaGroup ? NOVA_LABELS[product.novaGroup] : null;
  const gradeColor = product?.nutriscore ? GRADE_COLORS[product.nutriscore] ?? Colors.textMuted : Colors.textMuted;

  // Resolve additive info for all additives that have a known entry
  const resolvedAdditives = (product?.additives ?? []).map(tag => ({
    tag,
    info: lookupAdditive(tag),
  }));
  const knownAdditives = resolvedAdditives.filter(a => a.info !== null);
  const unknownAdditives = resolvedAdditives.filter(a => a.info === null);

  // Sort known additives by severity: CURSED first, then TAINTED, then FORGED
  const tierOrder: Record<AdditiveTier, number> = { CURSED: 0, TAINTED: 1, FORGED: 2 };
  knownAdditives.sort((a, b) => tierOrder[a.info!.tier] - tierOrder[b.info!.tier]);

  const hasReportContent = product && (
    product.additives.length > 0 ||
    product.ingredientsText ||
    product.novaGroup ||
    product.nutriscore ||
    product.allergens.length > 0
  );

  return (
    <View style={styles.root}>
      {!product && (
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={scanned ? undefined : handleBarcode}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
        />
      )}

      {!product && (
        <>
          <View style={styles.overlayTop} />
          <View style={styles.overlayBottom} />
          <View style={styles.overlayLeft} />
          <View style={styles.overlayRight} />
        </>
      )}

      {product && (
        <LinearGradient colors={['#0C0810', '#050508', '#08060C']} style={StyleSheet.absoluteFill} />
      )}

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerEyebrow}>{mealLabel.toUpperCase()}</Text>
              <Text style={styles.headerTitle}>SCAN PROVISIONS</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          {!product && !loading && (
            <View style={styles.scannerWrap}>
              <View style={styles.scanFrame}>
                <Animated.Text style={[styles.cornerRune, styles.cornerTL, { opacity: pulseAnim }]}>ᚠ</Animated.Text>
                <Animated.Text style={[styles.cornerRune, styles.cornerTR, { opacity: pulseAnim }]}>ᚢ</Animated.Text>
                <Animated.Text style={[styles.cornerRune, styles.cornerBL, { opacity: pulseAnim }]}>ᚦ</Animated.Text>
                <Animated.Text style={[styles.cornerRune, styles.cornerBR, { opacity: pulseAnim }]}>ᚨ</Animated.Text>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
                <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]}>
                  <LinearGradient colors={['transparent', Colors.gold, 'transparent']} style={{ flex: 1, height: 2 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                </Animated.View>
              </View>
              <Text style={styles.scanHint}>Point at the barcode on your provisions</Text>
              <Text style={[styles.scanHintRunes, { color: 'rgba(201,168,76,0.3)' }]}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ</Text>
            </View>
          )}

          {loading && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Colors.gold} size="large" />
              <Text style={styles.loadingText}>LOOKING UP PRODUCT...</Text>
              <Text style={styles.loadingRunes}>ᚺ  ᚾ  ᛁ  ᛃ  ᛇ</Text>
            </View>
          )}

          {product && (
            <Animated.View style={[styles.resultWrap, {
              opacity: resultAnim,
              transform: [{ translateY: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            }]}>
              {logged ? (
                <View style={styles.loggedWrap}>
                  <Text style={styles.loggedRune}>ᚠ</Text>
                  <Text style={styles.loggedTitle}>LOGGED</Text>
                  <Text style={styles.loggedSub}>Added to {mealLabel}</Text>
                </View>
              ) : (
                <Animated.ScrollView
                  style={styles.resultScroll}
                  contentContainerStyle={styles.resultContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Product card */}
                  <View style={styles.productCard}>
                    <LinearGradient colors={['rgba(201,168,76,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
                    <LinearGradient colors={['transparent', Colors.gold, 'transparent']} style={styles.productTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />

                    {product.brand ? <Text style={styles.productBrand}>{product.brand.toUpperCase()}</Text> : null}
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    <Text style={styles.productServing}>
                      per {product.servingSize}
                      {!product.servingBased ? ' (per 100g — no serving size on file)' : ''}
                    </Text>

                    <View style={styles.macroGrid}>
                      <View style={styles.macroItem}>
                        <Text style={[styles.macroVal, { color: '#E05020' }]}>{product.calories}</Text>
                        <Text style={styles.macroLabel}>KCAL</Text>
                      </View>
                      <View style={styles.macroDivider} />
                      <View style={styles.macroItem}>
                        <Text style={[styles.macroVal, { color: Colors.gold }]}>{product.protein}g</Text>
                        <Text style={styles.macroLabel}>PROTEIN</Text>
                      </View>
                      <View style={styles.macroDivider} />
                      <View style={styles.macroItem}>
                        <Text style={[styles.macroVal, { color: Colors.ice }]}>{product.carbs}g</Text>
                        <Text style={styles.macroLabel}>CARBS</Text>
                      </View>
                      <View style={styles.macroDivider} />
                      <View style={styles.macroItem}>
                        <Text style={[styles.macroVal, { color: '#8B6FD4' }]}>{product.fat}g</Text>
                        <Text style={styles.macroLabel}>FAT</Text>
                      </View>
                      {product.fiber > 0 && (
                        <>
                          <View style={styles.macroDivider} />
                          <View style={styles.macroItem}>
                            <Text style={[styles.macroVal, { color: '#4CAF50', fontSize: 15 }]}>{product.fiber}g</Text>
                            <Text style={styles.macroLabel}>FIBER</Text>
                          </View>
                        </>
                      )}
                    </View>

                    {(nova || product.nutriscore) && (
                      <View style={styles.badgeRow}>
                        {nova && (
                          <View style={[styles.novaBadge, { borderColor: `${nova.color}40`, backgroundColor: `${nova.color}10` }]}>
                            <Text style={[styles.novaBadgeText, { color: nova.color }]}>{nova.label}</Text>
                          </View>
                        )}
                        {product.nutriscore && (
                          <View style={[styles.gradeBadge, { borderColor: `${gradeColor}40`, backgroundColor: `${gradeColor}10` }]}>
                            <Text style={[styles.gradeBadgeText, { color: gradeColor }]}>GRADE {product.nutriscore.toUpperCase()}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Pillage Report */}
                  {hasReportContent && (
                    <View style={styles.reportCard}>
                      <TouchableOpacity onPress={toggleReport} activeOpacity={0.8} style={styles.reportHeader}>
                        <Text style={styles.reportHeaderRune}>ᛉ</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reportHeaderTitle}>INGREDIENTS & ADDITIVES</Text>
                          <Text style={styles.reportHeaderSub}>
                            {knownAdditives.some(a => a.info?.tier === 'CURSED')
                              ? '⚠ Cursed additives detected'
                              : knownAdditives.some(a => a.info?.tier === 'TAINTED')
                              ? 'Tainted additives present'
                              : nova ? nova.desc
                              : "Pillage Report · what's really in this provision"}
                          </Text>
                        </View>
                        <Text style={styles.reportChevron}>{reportOpen ? '↑' : '↓'}</Text>
                      </TouchableOpacity>

                      {reportOpen && (
                        <View style={styles.reportBody}>
                          {/* Nutrient levels */}
                          {(product.sugarLevel || product.saltLevel || product.fatLevel) && (
                            <View style={styles.levelRow}>
                              {product.sugarLevel && (
                                <View style={styles.levelChip}>
                                  <Text style={styles.levelChipLabel}>SUGAR</Text>
                                  <Text style={[styles.levelChipVal, { color: LEVEL_LABELS[product.sugarLevel]?.color ?? Colors.textMuted }]}>
                                    {LEVEL_LABELS[product.sugarLevel]?.label ?? product.sugarLevel.toUpperCase()}
                                  </Text>
                                </View>
                              )}
                              {product.saltLevel && (
                                <View style={styles.levelChip}>
                                  <Text style={styles.levelChipLabel}>SALT</Text>
                                  <Text style={[styles.levelChipVal, { color: LEVEL_LABELS[product.saltLevel]?.color ?? Colors.textMuted }]}>
                                    {LEVEL_LABELS[product.saltLevel]?.label ?? product.saltLevel.toUpperCase()}
                                  </Text>
                                </View>
                              )}
                              {product.fatLevel && (
                                <View style={styles.levelChip}>
                                  <Text style={styles.levelChipLabel}>FAT</Text>
                                  <Text style={[styles.levelChipVal, { color: LEVEL_LABELS[product.fatLevel]?.color ?? Colors.textMuted }]}>
                                    {LEVEL_LABELS[product.fatLevel]?.label ?? product.fatLevel.toUpperCase()}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}

                          {/* Known additives with explanations */}
                          {knownAdditives.length > 0 && (
                            <View style={styles.reportSection}>
                              <Text style={styles.reportSectionLabel}>
                                ADDITIVES DECODED ({knownAdditives.length})
                              </Text>
                              {knownAdditives.map((a, i) => {
                                const tierColor = ADDITIVE_TIER_COLORS[a.info!.tier];
                                return (
                                  <View key={i} style={[styles.additiveRow, { borderLeftColor: tierColor }]}>
                                    <View style={styles.additiveRowTop}>
                                      <Text style={[styles.additiveName, { color: tierColor }]}>{a.info!.name}</Text>
                                      <View style={[styles.additiveTierBadge, { backgroundColor: `${tierColor}15`, borderColor: `${tierColor}30` }]}>
                                        <Text style={[styles.additiveTierText, { color: tierColor }]}>{a.info!.tier}</Text>
                                      </View>
                                    </View>
                                    <Text style={styles.additiveDesc}>{a.info!.desc}</Text>
                                    <Text style={styles.additiveCode}>{a.tag}</Text>
                                  </View>
                                );
                              })}
                            </View>
                          )}

                          {/* Unknown additives — just show codes */}
                          {unknownAdditives.length > 0 && (
                            <View style={styles.reportSection}>
                              <Text style={styles.reportSectionLabel}>
                                OTHER ADDITIVES ({unknownAdditives.length})
                              </Text>
                              <View style={styles.additiveChipWrap}>
                                {unknownAdditives.map((a, i) => (
                                  <View key={i} style={styles.additiveChip}>
                                    <Text style={styles.additiveChipText}>{a.tag}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          )}

                          {/* Allergens */}
                          {product.allergens.length > 0 && (
                            <View style={styles.reportSection}>
                              <Text style={[styles.reportSectionLabel, { color: Colors.blood }]}>ALLERGENS</Text>
                              <Text style={styles.allergenText}>{product.allergens.join(', ')}</Text>
                            </View>
                          )}

                          {/* Full ingredients */}
                          {product.ingredientsText && (
                            <View style={styles.reportSection}>
                              <Text style={styles.reportSectionLabel}>FULL INGREDIENTS</Text>
                              <Text style={styles.ingredientsText}>{product.ingredientsText}</Text>
                            </View>
                          )}

                          {product.additives.length === 0 && product.allergens.length === 0 && !product.ingredientsText && (
                            <Text style={styles.reportEmpty}>No additional data available for this provision.</Text>
                          )}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Servings */}
                  <View style={styles.servingsCard}>
                    <LinearGradient colors={['rgba(255,255,255,0.03)', 'transparent']} style={StyleSheet.absoluteFill} />
                    <Text style={styles.servingsLabel}>SERVINGS</Text>
                    <View style={styles.servingsRow}>
                      <TouchableOpacity
                        style={styles.servingsBtn}
                        onPress={() => { const v = Math.max(0.5, (parseFloat(servings) || 1) - 0.5); setServings(String(v)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      >
                        <Text style={styles.servingsBtnText}>−</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.servingsInput}
                        value={servings}
                        onChangeText={setServings}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                      />
                      <TouchableOpacity
                        style={styles.servingsBtn}
                        onPress={() => { const v = (parseFloat(servings) || 1) + 0.5; setServings(String(v)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      >
                        <Text style={styles.servingsBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.servingsTotal}>
                      {Math.round(product.calories * (parseFloat(servings) || 1))} kcal total
                    </Text>
                  </View>

                  {/* Log button */}
                  <TouchableOpacity style={styles.logBtn} onPress={handleLog} activeOpacity={0.88}>
                    <LinearGradient colors={[Colors.goldDark, Colors.gold, Colors.goldLight]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                    <LinearGradient colors={['rgba(255,255,255,0.15)', 'transparent']} style={styles.logBtnShine} />
                    <Text style={styles.logBtnEyebrow}>ADD TO {mealLabel.toUpperCase()}</Text>
                    <Text style={styles.logBtnText}>LOG THIS FOOD →</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.scanAgainBtn}
                    onPress={() => { setProduct(null); setScanned(false); setServings('1'); setReportOpen(false); }}
                  >
                    <Text style={styles.scanAgainText}>ᚺ  Scan another</Text>
                  </TouchableOpacity>
                </Animated.ScrollView>
              )}
            </Animated.View>
          )}

        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const FRAME_SIZE = width * 0.72;
const OVERLAY_COLOR = 'rgba(5,5,8,0.82)';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  container: { flex: 1 },
  overlayTop: { position: 'absolute', top: 0, left: 0, right: 0, height: (height - FRAME_SIZE) / 2, backgroundColor: OVERLAY_COLOR },
  overlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: (height - FRAME_SIZE) / 2, backgroundColor: OVERLAY_COLOR },
  overlayLeft: { position: 'absolute', top: (height - FRAME_SIZE) / 2, left: 0, width: (width - FRAME_SIZE) / 2, height: FRAME_SIZE, backgroundColor: OVERLAY_COLOR },
  overlayRight: { position: 'absolute', top: (height - FRAME_SIZE) / 2, right: 0, width: (width - FRAME_SIZE) / 2, height: FRAME_SIZE, backgroundColor: OVERLAY_COLOR },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text },
  headerCenter: { alignItems: 'center' },
  headerEyebrow: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 3, color: Colors.gold, opacity: 0.6 },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.text, letterSpacing: 1 },
  scannerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  scanFrame: { width: FRAME_SIZE, height: FRAME_SIZE * 0.65, position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: Colors.gold, borderWidth: 2 },
  cornerTopLeft: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTopRight: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerBottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  cornerBottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  cornerRune: { position: 'absolute', fontSize: 11, fontFamily: 'System', color: Colors.gold },
  cornerTL: { top: -18, left: 0 },
  cornerTR: { top: -18, right: 0 },
  cornerBL: { bottom: -18, left: 0 },
  cornerBR: { bottom: -18, right: 0 },
  scanLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 2 },
  scanHint: { fontFamily: Fonts.proseItalic, fontSize: 14, color: Colors.textMuted, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 40 },
  scanHintRunes: { fontFamily: 'System', fontSize: 12, letterSpacing: 8 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 3, color: Colors.textMuted },
  loadingRunes: { fontFamily: 'System', fontSize: 13, color: 'rgba(201,168,76,0.3)', letterSpacing: 8 },
  resultWrap: { flex: 1, paddingHorizontal: Spacing.lg },
  resultScroll: { flex: 1 },
  resultContent: { gap: 12, paddingBottom: 24 },
  productCard: { borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)', borderRadius: 18, padding: Spacing.lg, overflow: 'hidden', backgroundColor: 'rgba(10,8,14,0.98)', gap: 8 },
  productTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  productBrand: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 3, color: 'rgba(201,168,76,0.5)' },
  productName: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.text, letterSpacing: 0.5, lineHeight: 24 },
  productServing: { fontFamily: Fonts.proseItalic, fontSize: 11, color: Colors.textMuted, fontStyle: 'italic' },
  macroGrid: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(8,6,12,0.8)', marginTop: 4 },
  macroItem: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2 },
  macroDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.06)' },
  macroVal: { fontFamily: Fonts.heading, fontSize: 18, lineHeight: 20 },
  macroLabel: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 1.5, color: Colors.textMuted },
  macroSub: { fontFamily: Fonts.body, fontSize: 6, letterSpacing: 1, color: Colors.textDim },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  novaBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  novaBadgeText: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 1.5 },
  gradeBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  gradeBadgeText: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 1 },
  reportCard: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(10,8,14,0.9)' },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.md },
  reportHeaderRune: { fontSize: 18, fontFamily: 'System', color: Colors.textMuted },
  reportHeaderTitle: { fontFamily: Fonts.subheading, fontSize: 12, color: Colors.text, letterSpacing: 1, marginBottom: 2 },
  reportHeaderSub: { fontFamily: Fonts.prose, fontSize: 10, color: Colors.textMuted },
  reportChevron: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textDim },
  reportBody: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: Spacing.md },
  levelRow: { flexDirection: 'row', gap: 8 },
  levelChip: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 8, alignItems: 'center', paddingVertical: 8, gap: 2, backgroundColor: 'rgba(255,255,255,0.02)' },
  levelChipLabel: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 1, color: Colors.textDim },
  levelChipVal: { fontFamily: Fonts.heading, fontSize: 11, letterSpacing: 0.5 },
  reportSection: { gap: 8 },
  reportSectionLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: Colors.textMuted },

  // New additive row styles — explained cards instead of just chips
  additiveRow: {
    borderLeftWidth: 3, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10, gap: 4,
  },
  additiveRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  additiveName: { fontFamily: Fonts.subheading, fontSize: 13 },
  additiveTierBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  additiveTierText: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 1 },
  additiveDesc: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
  additiveCode: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 1, color: Colors.textDim },

  // Unknown additives — still shown as chips
  additiveChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  additiveChip: { borderWidth: 1, borderColor: 'rgba(224,80,32,0.25)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(224,80,32,0.06)' },
  additiveChipText: { fontFamily: Fonts.body, fontSize: 9, color: '#E0A020', letterSpacing: 0.5 },

  allergenText: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.blood, lineHeight: 18 },
  ingredientsText: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted, lineHeight: 18 },
  reportEmpty: { fontFamily: Fonts.proseItalic, fontSize: 11, color: Colors.textDim, fontStyle: 'italic' },
  servingsCard: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: Spacing.md, overflow: 'hidden', backgroundColor: 'rgba(10,8,14,0.95)', alignItems: 'center', gap: 10 },
  servingsLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 3, color: Colors.textMuted },
  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  servingsBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)', backgroundColor: 'rgba(201,168,76,0.08)', alignItems: 'center', justifyContent: 'center' },
  servingsBtnText: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.gold, lineHeight: 24 },
  servingsInput: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.gold, textAlign: 'center', minWidth: 60, borderBottomWidth: 1, borderBottomColor: 'rgba(201,168,76,0.3)', paddingVertical: 4 },
  servingsTotal: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted },
  logBtn: { borderRadius: 16, overflow: 'hidden', height: 64, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16 },
  logBtnShine: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  logBtnEyebrow: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 3, color: 'rgba(0,0,0,0.5)' },
  logBtnText: { fontFamily: Fonts.heading, fontSize: 14, color: '#050508', letterSpacing: 2 },
  scanAgainBtn: { alignItems: 'center', paddingVertical: 8 },
  scanAgainText: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textMuted, letterSpacing: 2 },
  loggedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loggedRune: { fontSize: 72, fontFamily: 'System', color: Colors.gold, textShadowColor: 'rgba(201,168,76,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  loggedTitle: { fontFamily: Fonts.display, fontSize: 32, color: Colors.gold, letterSpacing: 4 },
  loggedSub: { fontFamily: Fonts.proseItalic, fontSize: 14, color: Colors.textMuted, fontStyle: 'italic' },
  permRune: { fontSize: 72, fontFamily: 'System', color: 'rgba(201,168,76,0.3)' },
  permTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.text, letterSpacing: 1, textAlign: 'center' },
  permSub: { fontFamily: Fonts.proseItalic, fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },
  permBtn: { borderRadius: 14, overflow: 'hidden', paddingHorizontal: 32, paddingVertical: 16 },
  permBtnText: { fontFamily: Fonts.heading, fontSize: 13, color: '#050508', letterSpacing: 2 },
  permCancel: { fontFamily: Fonts.prose, fontSize: 13, color: Colors.textMuted },
});