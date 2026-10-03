import { getMacroGoals, getTodayMacros } from './db';

// ── What Should I Eat? ──────────────────────────────────────────
// Powers the Mead Hall "What Should I Eat?" card. Two tiers (Quick, Cheap)
// resolve instantly from a curated local list — same pattern as
// weeklyTrial.ts's TRIAL_TEMPLATES, no API call, no cost, never fails.
// The third tier (Cook a Meal) reuses the exact Spoonacular request shape
// already proven out in recipe-ideas.tsx, just with dynamic macro bounds
// instead of a fixed diet filter chip.

export interface RemainingMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

// Clamped at 0 — if today's already over a goal, there's nothing left to
// suggest filling, not a negative number to show someone.
export function getRemainingMacros(): RemainingMacros {
  const goals = getMacroGoals();
  const eaten = getTodayMacros();
  return {
    calories: Math.max(Math.round(goals.calories - eaten.calories), 0),
    protein: Math.max(Math.round(goals.protein - eaten.protein), 0),
    carbs: Math.max(Math.round(goals.carbs - eaten.carbs), 0),
    fat: Math.max(Math.round(goals.fat - eaten.fat), 0),
    fiber: Math.max(Math.round(goals.fiber - eaten.fiber), 0),
  };
}

export type ComboTier = 'quick' | 'cheap';

export interface MealCombo {
  id: string;
  tier: ComboTier;
  title: string;
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  rune: string;
  // Which meal(s) this combo fits best — 'morning' | 'midday' | 'evening' |
  // 'snack', matching feast-recommendation.tsx's LOG_MEAL_TYPES keys. Used
  // to bias suggestions toward what's actually appropriate right now (no
  // more "Chocolate Milk & Mixed Nuts" surfacing as a 7am suggestion), but
  // never a hard filter — pickMealCombo() falls back to the full tier pool
  // if nothing matches, so there's always a result.
  mealTypes: string[];
}

// Every combo's macros are computed from USDA FoodData Central /
// verified-nutrition-source values per ingredient (checked individually,
// not eyeballed) and summed per serving — e.g. "6 oz chicken breast" =
// 165 cal / 31g protein per 100g × 170g. Corrected twice now against real
// sources: pass one caught "1 cup oats" being read as a cooked-oatmeal
// portion (~300 cal) when 1 cup of DRY oats is actually ~607 cal, and the
// chicken/rice/broccoli combo undercounting chicken's protein. Pass two
// (checking every ingredient that hadn't been individually sourced yet)
// caught deli turkey (real USDA value has notably less protein per oz
// than generic "turkey" assumptions), rice cakes (68 cal EACH, not ~35),
// genoa salami (85 cal/oz, not ~115), and shrimp (119 cal/100g cooked, a
// bit higher than first estimated) — all fixed below. "Protein bar" stays
// a middle-of-the-road generic estimate since real bars range roughly
// 100-300 cal depending on brand; check the actual wrapper if precision
// matters there.
export const MEAL_COMBOS: MealCombo[] = [
  // Quick — minimal prep, mostly assembly. No real cooking required.
  { id: 'q1', tier: 'quick', title: 'Protein & Berries Bowl', items: ['1 cup Greek yogurt (nonfat)', '1/2 cup blueberries', '1 scoop whey protein'], calories: 296, protein: 48, carbs: 22, fat: 2, fiber: 2, rune: 'ᚠ', mealTypes: ['morning', 'snack'] },
  { id: 'q2', tier: 'quick', title: 'Banana Protein Shake', items: ['1 banana', '1 scoop whey protein', '1 cup milk'], calories: 374, protein: 33, carbs: 42, fat: 9, fiber: 3, rune: 'ᚢ', mealTypes: ['morning', 'snack'] },
  { id: 'q3', tier: 'quick', title: 'Rotisserie & Microwave Rice', items: ['6 oz rotisserie chicken', '1 pack microwave rice', 'handful spinach'], calories: 507, protein: 47, carbs: 45, fat: 14, fiber: 2, rune: 'ᚦ', mealTypes: ['midday', 'evening'] },
  { id: 'q4', tier: 'quick', title: 'Tuna Packet & Crackers', items: ['1 pouch tuna (5oz)', '8 whole wheat crackers', '1 string cheese'], calories: 309, protein: 34, carbs: 21, fat: 11, fiber: 3, rune: 'ᚨ', mealTypes: ['midday', 'snack'] },
  { id: 'q5', tier: 'quick', title: 'Egg & Toast', items: ['3 eggs, scrambled', '2 slices whole wheat toast', '1/2 avocado'], calories: 480, protein: 26, carbs: 33, fat: 28, fiber: 9, rune: 'ᚱ', mealTypes: ['morning'] },
  { id: 'q6', tier: 'quick', title: 'Cottage Cheese & Fruit', items: ['1 cup cottage cheese', '1 apple, sliced', '1 tbsp honey'], calories: 342, protein: 24, carbs: 53, fat: 5, fiber: 4, rune: 'ᚲ', mealTypes: ['morning', 'snack'] },
  { id: 'q7', tier: 'quick', title: 'Turkey & Cheese Roll-ups', items: ['4 oz deli turkey', '2 cheese slices', 'handful baby carrots'], calories: 270, protein: 26, carbs: 21, fat: 9, fiber: 4, rune: 'ᚷ', mealTypes: ['midday', 'snack'] },
  { id: 'q8', tier: 'quick', title: 'Protein Bar & Apple', items: ['1 protein bar', '1 apple'], calories: 285, protein: 20, carbs: 49, fat: 6, fiber: 9, rune: 'ᚹ', mealTypes: ['snack'] },
  { id: 'q9', tier: 'quick', title: 'Hummus & Veggie Plate', items: ['1/2 cup hummus', 'baby carrots', '1 oz pita chips'], calories: 366, protein: 13, carbs: 47, fat: 16, fiber: 11, rune: 'ᚺ', mealTypes: ['snack', 'midday'] },
  { id: 'q10', tier: 'quick', title: 'PB&J on Whole Wheat', items: ['2 tbsp peanut butter', '1 tbsp jelly', '2 slices whole wheat bread'], calories: 382, protein: 13, carbs: 46, fat: 18, fiber: 6, rune: 'ᚾ', mealTypes: ['midday', 'snack'] },
  { id: 'q11', tier: 'quick', title: 'Smoked Salmon Bagel', items: ['2 oz smoked salmon', '1 bagel', '1 tbsp cream cheese'], calories: 402, protein: 22, carbs: 58, fat: 9, fiber: 3, rune: 'ᛁ', mealTypes: ['morning'] },
  { id: 'q12', tier: 'quick', title: 'Greek Yogurt Parfait', items: ['1 cup Greek yogurt', '1/2 cup granola', '1 tbsp honey'], calories: 448, protein: 28, carbs: 59, fat: 12, fiber: 3, rune: 'ᛃ', mealTypes: ['morning', 'snack'] },
  { id: 'q13', tier: 'quick', title: 'Deli Turkey Wrap', items: ['4 oz deli turkey', '1 tortilla', 'lettuce & mustard'], calories: 250, protein: 22, carbs: 26, fat: 6, fiber: 2, rune: 'ᛇ', mealTypes: ['midday'] },
  { id: 'q14', tier: 'quick', title: 'Microwave Burrito Bowl', items: ['1 pack instant rice', '1/2 cup canned black beans', 'salsa'], calories: 330, protein: 11, carbs: 68, fat: 1, fiber: 8, rune: 'ᛈ', mealTypes: ['midday', 'evening'] },
  { id: 'q15', tier: 'quick', title: 'Chocolate Milk & Mixed Nuts', items: ['1 cup chocolate milk', '1 oz mixed nuts'], calories: 360, protein: 13, carbs: 32, fat: 23, fiber: 3, rune: 'ᛉ', mealTypes: ['snack'] },
  { id: 'q16', tier: 'quick', title: 'Turkey & Cheese Pita Pocket', items: ['1 whole wheat pita', '3 oz sliced turkey', '1 oz cheese'], calories: 372, protein: 28, carbs: 39, fat: 12, fiber: 5, rune: 'ᛋ', mealTypes: ['midday'] },
  { id: 'q17', tier: 'quick', title: 'Chicken Caesar Wrap', items: ['4 oz rotisserie chicken', '1 tortilla', 'romaine lettuce', '2 tbsp parmesan'], calories: 371, protein: 35, carbs: 21, fat: 16, fiber: 2, rune: 'ᛏ', mealTypes: ['midday', 'evening'] },
  { id: 'q18', tier: 'quick', title: 'Egg Bites & Banana', items: ['2 egg white bites', '1 banana'], calories: 275, protein: 15, carbs: 38, fat: 9, fiber: 3, rune: 'ᛒ', mealTypes: ['morning'] },
  { id: 'q19', tier: 'quick', title: 'Protein Shake & Rice Cakes', items: ['1 scoop whey protein', '1 cup milk', '2 rice cakes'], calories: 405, protein: 35, carbs: 44, fat: 9, fiber: 2, rune: 'ᛖ', mealTypes: ['morning', 'snack'] },
  { id: 'q20', tier: 'quick', title: 'Salami, Cheese & Almonds Box', items: ['2 oz salami', '1 oz cheese', '1 oz almonds'], calories: 448, protein: 25, carbs: 6, fat: 37, fiber: 4, rune: 'ᛗ', mealTypes: ['snack'] },
  // Cheap — budget staples, pantry-friendly, cooks well in bulk.
  { id: 'c1', tier: 'cheap', title: 'Chicken, Rice & Broccoli', items: ['6 oz chicken breast', '1 cup rice', '1 cup broccoli'], calories: 540, protein: 61, carbs: 57, fat: 7, fiber: 6, rune: 'ᛚ', mealTypes: ['midday', 'evening'] },
  { id: 'c2', tier: 'cheap', title: 'Ground Beef & Baked Potato', items: ['6 oz ground beef (90/10)', '1 baked potato', 'side salad'], calories: 520, protein: 38, carbs: 43, fat: 20, fiber: 6, rune: 'ᛜ', mealTypes: ['evening'] },
  { id: 'c3', tier: 'cheap', title: 'Egg & Oatmeal Plate', items: ['4 eggs', '1/2 cup dry oats (oatmeal)', '1 banana'], calories: 705, protein: 40, carbs: 80, fat: 23, fiber: 11, rune: 'ᛝ', mealTypes: ['morning'] },
  { id: 'c4', tier: 'cheap', title: 'Lentil & Rice Bowl', items: ['1 cup cooked lentils', '1 cup rice', '1 cup mixed vegetables'], calories: 490, protein: 25, carbs: 95, fat: 2, fiber: 20, rune: 'ᛞ', mealTypes: ['midday', 'evening'] },
  { id: 'c5', tier: 'cheap', title: 'Canned Chicken & Beans', items: ['1 can chicken breast (5oz)', '1 cup black beans', '1/2 cup rice'], calories: 453, protein: 40, carbs: 66, fat: 2, fiber: 12, rune: 'ᚠ', mealTypes: ['midday', 'evening'] },
  { id: 'c6', tier: 'cheap', title: 'Peanut Butter Oats', items: ['1/2 cup dry oats', '2 tbsp peanut butter', '1 scoop protein powder'], calories: 612, protein: 45, carbs: 61, fat: 19, fiber: 10, rune: 'ᚢ', mealTypes: ['morning'] },
  { id: 'c7', tier: 'cheap', title: 'Pasta & Ground Turkey', items: ['6 oz ground turkey (93/7)', '1 cup pasta', '1/2 cup marinara'], calories: 611, protein: 56, carbs: 54, fat: 17, fiber: 5, rune: 'ᚦ', mealTypes: ['evening'] },
  { id: 'c8', tier: 'cheap', title: 'Black Bean & Rice Burrito', items: ['1 cup black beans', '1/2 cup rice', '1 tortilla', '1 oz shredded cheese'], calories: 577, protein: 26, carbs: 86, fat: 14, fiber: 13, rune: 'ᚨ', mealTypes: ['midday', 'evening'] },
  { id: 'c9', tier: 'cheap', title: 'Baked Chicken Thighs & Sweet Potato', items: ['6 oz chicken thighs', '1 sweet potato', '1 cup green beans'], calories: 496, protein: 48, carbs: 34, fat: 19, fiber: 8, rune: 'ᚱ', mealTypes: ['evening'] },
  { id: 'c10', tier: 'cheap', title: 'Tuna Pasta Salad', items: ['1 can tuna (5oz)', '1 cup pasta', '2 tbsp light mayo', '1/2 cup peas'], calories: 461, protein: 37, carbs: 56, fat: 10, fiber: 7, rune: 'ᚲ', mealTypes: ['midday'] },
  { id: 'c11', tier: 'cheap', title: 'Chickpea & Spinach Curry', items: ['1 cup chickpeas', '2 cups spinach', '1 cup rice'], calories: 488, protein: 21, carbs: 92, fat: 5, fiber: 15, rune: 'ᚷ', mealTypes: ['evening'] },
  { id: 'c12', tier: 'cheap', title: 'Egg Fried Rice', items: ['3 eggs', '1.5 cups cooked rice', '1 cup frozen mixed vegetables'], calories: 589, protein: 28, carbs: 80, fat: 16, fiber: 5, rune: 'ᚹ', mealTypes: ['morning', 'midday'] },
  { id: 'c13', tier: 'cheap', title: 'Pork Chop & Rice', items: ['6 oz pork chop', '1 cup rice', '1 cup green beans'], calories: 488, protein: 43, carbs: 53, fat: 11, fiber: 5, rune: 'ᚺ', mealTypes: ['evening'] },
  { id: 'c14', tier: 'cheap', title: 'Beef & Bean Chili', items: ['6 oz ground beef (90/10)', '1 cup kidney beans', '1/2 cup canned tomatoes'], calories: 527, protein: 47, carbs: 42, fat: 18, fiber: 12, rune: 'ᚾ', mealTypes: ['evening'] },
  { id: 'c15', tier: 'cheap', title: 'Baked Potato Bar', items: ['1 large baked potato', '1/2 cup cottage cheese', '1 cup broccoli'], calories: 490, protein: 25, carbs: 94, fat: 4, fiber: 13, rune: 'ᛁ', mealTypes: ['midday', 'evening'] },
  { id: 'c16', tier: 'cheap', title: 'Shrimp & Rice Skillet', items: ['6 oz shrimp', '1 cup rice', '1 cup peppers & onions'], calories: 467, protein: 45, carbs: 59, fat: 4, fiber: 3, rune: 'ᛃ', mealTypes: ['evening'] },
  { id: 'c17', tier: 'cheap', title: 'Salmon & Quinoa Bowl', items: ['6 oz salmon', '1 cup quinoa', '1 cup broccoli'], calories: 627, protein: 50, carbs: 50, fat: 25, fiber: 10, rune: 'ᛇ', mealTypes: ['evening'] },
  { id: 'c18', tier: 'cheap', title: 'Turkey & Bean Chili', items: ['6 oz ground turkey (93/7)', '1 cup kidney beans', '1/2 cup canned tomatoes'], calories: 548, protein: 60, carbs: 42, fat: 15, fiber: 12, rune: 'ᛈ', mealTypes: ['evening'] },
  { id: 'c19', tier: 'cheap', title: 'Egg & Black Bean Tacos', items: ['3 eggs', '1/2 cup black beans', '2 corn tortillas', 'salsa'], calories: 456, protein: 29, carbs: 47, fat: 17, fiber: 10, rune: 'ᛉ', mealTypes: ['morning'] },
  { id: 'c20', tier: 'cheap', title: 'Baked Tilapia & Rice', items: ['6 oz tilapia', '1 cup rice', '1 cup green beans'], calories: 461, protein: 51, carbs: 53, fat: 5, fiber: 5, rune: 'ᛋ', mealTypes: ['evening'] },
];

// Picks whichever combo of the given tier best matches what's actually
// left today — not a random pick. Calorie fit narrows the pool first
// (nothing that blows way past what's left), then protein closeness ranks
// what remains, since protein is usually the macro people are short on by
// the time they're asking this question. Rather than always returning the
// single best-ranked match (which looks "broken" when remaining macros
// haven't changed between taps — same input, same deterministic output,
// every time), it picks randomly among the top 3 closest matches, so
// tapping the same mode twice in a row actually varies. excludeIds lets
// "Try Another" avoid repeating whatever's already been shown.
export function pickMealCombo(
  tier: ComboTier,
  remaining: RemainingMacros,
  excludeIds: string[] = [],
  mealType?: string
): MealCombo {
  const allOfTier = MEAL_COMBOS.filter(c => c.tier === tier);
  const notExcluded = allOfTier.filter(c => !excludeIds.includes(c.id));
  const candidates = notExcluded.length > 0 ? notExcluded : allOfTier;

  // Bias toward combos tagged for the meal being logged (so a 7am "Quick"
  // tap doesn't surface something like Chocolate Milk & Mixed Nuts) — but
  // never a hard filter. If nothing tagged for this meal type survives
  // (e.g. only 1 combo left after excludeIds and it's not a match), fall
  // back to the untagged-filtered candidates rather than return nothing.
  const matchingMealType = mealType
    ? candidates.filter(c => c.mealTypes.includes(mealType))
    : candidates;
  const mealTyped = matchingMealType.length > 0 ? matchingMealType : candidates;

  const withinCalories = remaining.calories > 0
    ? mealTyped.filter(c => c.calories <= remaining.calories * 1.2)
    : mealTyped;
  const pool = withinCalories.length > 0 ? withinCalories : mealTyped;

  const sorted = [...pool].sort(
    (a, b) => Math.abs(a.protein - remaining.protein) - Math.abs(b.protein - remaining.protein)
  );

  const topMatches = sorted.slice(0, Math.min(3, sorted.length));
  return topMatches[Math.floor(Math.random() * topMatches.length)] ?? candidates[0];
}

// ── Cook a Meal (Spoonacular) ────────────────────────────────────
// Same request shape as recipe-ideas.tsx's fetchRecipes()/openRecipe(),
// just with dynamic macro bounds pulled from what's left today instead of
// a fixed filter chip's params.

export interface RecipeSuggestion {
  id: number;
  title: string;
  image: string;
  calories: number | null;
  protein: string | null;
  carbs: string | null;
  fat: string | null;
  fiber: string | null;
}

export interface RecipeDetail extends RecipeSuggestion {
  servings: number;
  readyInMinutes: number;
  sourceUrl: string;
  ingredients: string[];
  instructions: string;
}

function parseNutrients(nutrients: any[]): { calories: number | null; protein: string | null; carbs: string | null; fat: string | null; fiber: string | null } {
  const find = (name: string) => nutrients?.find((n: any) => n.name === name)?.amount ?? null;
  const cal = find('Calories');
  const pro = find('Protein');
  const carb = find('Carbohydrates');
  const fat = find('Fat');
  const fib = find('Fiber');
  return {
    calories: cal !== null ? Math.round(cal) : null,
    protein: pro !== null ? `${Math.round(pro)}g` : null,
    carbs: carb !== null ? `${Math.round(carb)}g` : null,
    fat: fat !== null ? `${Math.round(fat)}g` : null,
    fiber: fib !== null ? `${Math.round(fib)}g` : null,
  };
}

// Maps feast-recommendation.tsx's LOG_MEAL_TYPES keys to Spoonacular's
// own `type` dish-category param, so Cook a Meal results are at least
// dish-appropriate for when they're actually being logged (no dinner-style
// casseroles surfacing for a 7am breakfast request).
function mealTypeToSpoonacularType(mealType?: string): string | undefined {
  switch (mealType) {
    case 'morning': return 'breakfast';
    case 'snack': return 'snack';
    case 'midday':
    case 'evening':
      return 'main course';
    default:
      return undefined;
  }
}

export async function searchRecipesForRemaining(remaining: RemainingMacros, mealType?: string): Promise<RecipeSuggestion[]> {
  const apiKey = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;
  if (!apiKey) throw new Error("Recipe search isn't configured yet.");

  // minProtein/maxCalories are floors/ceilings, not exact targets — a real
  // recipe database won't hit remaining macros on the nose, so this is
  // "close enough and in the right direction" rather than a precise match.
  //
  // Capped minProtein at 45g: most single-serving recipes don't carry much
  // more than that, so demanding more just to match someone's remaining
  // protein would filter out nearly everything.
  let minProtein: number | undefined = remaining.protein > 5
    ? Math.min(Math.max(remaining.protein - 15, 10), 45)
    : undefined;

  // Generous ceiling (1.4x remaining, floor of 500) rather than a tight
  // one — sides, drinks, and portion rounding all eat into "remaining"
  // without the recipe itself being a bad match, and a tight ceiling
  // starves the search of results.
  let maxCalories: number | undefined = remaining.calories > 0
    ? Math.max(Math.round(remaining.calories * 1.4), 500)
    : undefined;

  // If the two constraints still contradict — not enough calorie headroom
  // for the protein floor — relax the ceiling instead of sending a query
  // that can only ever return zero results. A recipe needs roughly 4 cal
  // per gram of protein just from the protein itself, before counting any
  // carbs or fat, so e.g. "85g protein" + "under 230 calories" is not a
  // real recipe, it's an impossible combination.
  if (minProtein && maxCalories && minProtein * 4 > maxCalories) {
    maxCalories = Math.round(minProtein * 4 * 1.5);
  }

  const dishType = mealTypeToSpoonacularType(mealType);

  const params = new URLSearchParams({
    apiKey,
    number: '10',
    addRecipeNutrition: 'true',
    sort: 'max-used-ingredients',
  });
  if (minProtein) params.set('minProtein', String(minProtein));
  if (maxCalories) params.set('maxCalories', String(maxCalories));
  if (dishType) params.set('type', dishType);

  const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Could not load recipes right now.');

  let results = (json.results ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    image: r.image,
    ...parseNutrients(r.nutrition?.nutrients ?? []),
  }));

  // Still empty (an unusual combination of goals, or Spoonacular just has
  // nothing that matches today) — retry once with every constraint dropped,
  // including the dish-type hint, rather than showing a dead end. Some
  // results beat none, even if they're not quite breakfast-shaped.
  if (results.length === 0 && (minProtein || maxCalories || dishType)) {
    const fallbackParams = new URLSearchParams({
      apiKey,
      number: '10',
      addRecipeNutrition: 'true',
      sort: 'max-used-ingredients',
    });
    const fallbackRes = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${fallbackParams}`);
    const fallbackJson = await fallbackRes.json();
    if (fallbackRes.ok) {
      results = (fallbackJson.results ?? []).map((r: any) => ({
        id: r.id,
        title: r.title,
        image: r.image,
        ...parseNutrients(r.nutrition?.nutrients ?? []),
      }));
    }
  }

  return results;
}

export async function getRecipeDetail(id: number): Promise<RecipeDetail> {
  const apiKey = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;
  if (!apiKey) throw new Error("Recipe search isn't configured yet.");

  const res = await fetch(
    `https://api.spoonacular.com/recipes/${id}/information?apiKey=${apiKey}&includeNutrition=true`
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Could not load this recipe.');

  const ingredients: string[] = (json.extendedIngredients ?? []).map((i: any) => i.original);
  const instructions = (json.instructions ?? 'No instructions provided.')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    id: json.id,
    title: json.title,
    image: json.image,
    servings: json.servings,
    readyInMinutes: json.readyInMinutes,
    sourceUrl: json.sourceUrl,
    ingredients,
    instructions,
    ...parseNutrients(json.nutrition?.nutrients ?? []),
  };
}