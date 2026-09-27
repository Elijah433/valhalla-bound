import AsyncStorage from '@react-native-async-storage/async-storage';
import { EXERCISES, type Exercise } from '@/constants/exercises';
import { getWorkoutHistory } from '@/lib/db';

export type EquipmentPreference = 'home' | 'gym';

export interface GeneratedExercise {
  exercise: Exercise;
  sets: number;
  reps: string; // e.g. "8-10" — a range reads more naturally than a single number
}

export interface GeneratedWorkout {
  exercises: GeneratedExercise[];
  estimatedMinutes: number;
  categoriesAvoided: string[]; // shown to the user as "skipped — trained recently"
  // Non-null whenever an injury flag was in effect when this plan was
  // generated, regardless of whether it actually changed which exercises
  // got picked — the screen uses it to explain what's happening.
  injuryAvoidance: InjuryStatus | null;
}

// Rough real-world time budget per exercise: ~1 minute per working set
// (actual lift) + ~90 seconds rest between sets, averaged across a
// typical 3-set exercise. This is a practical estimate, not a precise
// physiological calculation — the same "reasonable planning number, not
// clinical precision" spirit as the macro goal presets already in the app.
const MINUTES_PER_EXERCISE = 7;

// How many recent days count as "recently trained" for the purpose of
// deprioritizing a muscle category — 2 days gives typical muscle groups a
// reasonable recovery window without being so long that half the
// exercise list gets excluded on a busy training week.
const RECENT_DAYS_WINDOW = 2;

// Categories eligible for the generator at all — recovery/custom/olympic
// are excluded: recovery isn't a "workout" in this context, custom has no
// fixed equipment tag to rely on, and olympic lifts need real coaching/
// technique that a randomly-assembled short workout shouldn't be
// assigning to someone by algorithm. Cardio is excluded too — it's
// already treated as the odd one out everywhere else on this screen
// (tapping a cardio pick routes to a separate logging flow, and Guided
// Session filters it out of the auto-advance queue entirely), and mixing
// it into a short strength plan reads as arbitrary rather than
// intentional — a 15-minute "gym" plan landing on one bicep curl and a
// hike isn't a coherent session. Swift Forge is a strength/bodyweight
// generator now; cardio stays available through Track a Run and the
// manual Cardio Log, same as before.
const ELIGIBLE_CATEGORIES: Exercise['category'][] = [
  'push', 'pull', 'legs', 'core', 'cable', 'bodyweight',
];

function getRecentlyTrainedCategories(): Set<string> {
  const history = getWorkoutHistory(RECENT_DAYS_WINDOW);
  const categoryLookup: Record<string, Exercise['category']> = {};
  EXERCISES.forEach(e => { categoryLookup[e.id] = e.category; });

  const recentCategories = new Set<string>();
  history.forEach(day => {
    day.strengthSessions.forEach(session => {
      const cat = categoryLookup[session.exercise_id];
      if (cat) recentCategories.add(cat);
    });
  });
  return recentCategories;
}

function pickSetsAndReps(category: Exercise['category']): { sets: number; reps: string } {
  // Cardio/bodyweight conditioning work reads oddly as "3 sets of 8-10" —
  // give those a duration-style rep range instead.
  if (category === 'cardio') return { sets: 1, reps: '10-15 min' };
  if (category === 'core') return { sets: 3, reps: '12-15' };
  return { sets: 3, reps: '8-10' };
}

// ── Injury-aware adaptation ──────────────────────────────────────────
//
// A warrior can flag a body area that's bothering them ("my shoulder's
// off today") right from Swift Forge. For a few days the generator
// excludes exercises that load that area entirely; after that it eases
// back in by deprioritizing them the same way recently-trained
// categories already are, rather than snapping straight back to normal.
// The flag clears itself automatically — nothing to remember to turn
// back off.

export type BodyArea = 'Shoulder' | 'Back' | 'Knee' | 'Elbow' | 'Wrist' | 'Hip';
export const BODY_AREAS: BodyArea[] = ['Shoulder', 'Back', 'Knee', 'Elbow', 'Wrist', 'Hip'];

export interface InjuryFlag {
  area: BodyArea;
  loggedAt: string; // ISO timestamp
}

export interface InjuryStatus {
  area: BodyArea;
  phase: 'avoiding' | 'easing';
  daysAgo: number;
  daysUntilClear: number;
}

const INJURY_STORAGE_KEY = 'valhalla_injury_flag';

// Days 0–2: fully avoided. Days 3–5: eased back in (deprioritized, not
// excluded). Day 6+: flag auto-expires and training goes back to normal.
const INJURY_AVOID_DAYS = 3;
const INJURY_EASE_DAYS = 3;

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

export async function getInjuryFlag(): Promise<InjuryFlag | null> {
  try {
    const raw = await AsyncStorage.getItem(INJURY_STORAGE_KEY);
    if (!raw) return null;
    const flag: InjuryFlag = JSON.parse(raw);
    if (daysSince(flag.loggedAt) >= INJURY_AVOID_DAYS + INJURY_EASE_DAYS) {
      await AsyncStorage.removeItem(INJURY_STORAGE_KEY);
      return null;
    }
    return flag;
  } catch {
    return null;
  }
}

export async function setInjuryFlag(area: BodyArea): Promise<void> {
  const flag: InjuryFlag = { area, loggedAt: new Date().toISOString() };
  await AsyncStorage.setItem(INJURY_STORAGE_KEY, JSON.stringify(flag));
}

export async function clearInjuryFlag(): Promise<void> {
  await AsyncStorage.removeItem(INJURY_STORAGE_KEY);
}

export function getInjuryStatus(flag: InjuryFlag): InjuryStatus {
  const daysAgo = daysSince(flag.loggedAt);
  const phase: InjuryStatus['phase'] = daysAgo < INJURY_AVOID_DAYS ? 'avoiding' : 'easing';
  const daysUntilClear = Math.max(0, Math.ceil(INJURY_AVOID_DAYS + INJURY_EASE_DAYS - daysAgo));
  return { area: flag.area, phase, daysAgo, daysUntilClear };
}

// Best-effort mapping from a body area to the free-text `muscles`
// keywords that indicate an exercise loads it. The exercise library only
// tracks a loose muscle-group string, not joint-level stress, so this is
// a practical approximation — not an anatomical guarantee — biased
// toward avoiding a bit more rather than a bit less.
const BODY_AREA_KEYWORDS: Record<BodyArea, string[]> = {
  Shoulder: ['Shoulder', 'Delt'],
  Back: ['Back', 'Lats', 'Traps', 'Spine'],
  Knee: ['Quad'],
  Elbow: ['Tricep', 'Bicep'],
  Wrist: ['Forearm'],
  Hip: ['Glute', 'Hip', 'Hamstring'],
};

// Some body-area stress doesn't show up in the `muscles` text at all —
// running, hiking, jump rope, stair climbing, and box/jump squats load
// the knee through repeated impact rather than through a "Quad"-tagged
// muscle group, so cardio's generic "Full Body, Cardio" / "Full Body,
// Low Impact" tag slips right past the keyword check above. Walking is
// deliberately left off this list — it's tagged "Low Impact" for a
// reason and is often fine, even recommended, for a knee that's off.
// Patches known blind spots by exercise id, layered on top of the
// keyword match rather than replacing it.
const BODY_AREA_EXTRA_IDS: Partial<Record<BodyArea, string[]>> = {
  Knee: ['run', 'tempo_run', 'interval_run', 'long_run', 'hike', 'jump_rope', 'stair_climb', 'box_jump', 'jump_squat', 'burpee'],
};

function loadsArea(exercise: Exercise, area: BodyArea): boolean {
  if (BODY_AREA_EXTRA_IDS[area]?.includes(exercise.id)) return true;
  const muscles = exercise.muscles.toLowerCase();
  return BODY_AREA_KEYWORDS[area].some(k => muscles.includes(k.toLowerCase()));
}

// Generates a workout that fits the given time budget, preferring
// exercises from categories NOT trained in the last couple of days, and
// filtered to only what's actually possible with the chosen equipment.
// An active injury flag further excludes (or, once easing, deprioritizes)
// exercises that load the flagged area.
export function generateAdaptiveWorkout(
  minutesAvailable: number,
  equipment: EquipmentPreference,
  injuryFlag?: InjuryFlag | null
): GeneratedWorkout {
  const targetExerciseCount = Math.max(1, Math.round(minutesAvailable / MINUTES_PER_EXERCISE));
  const injuryStatus = injuryFlag ? getInjuryStatus(injuryFlag) : null;

  const available = EXERCISES.filter(e => {
    if (!ELIGIBLE_CATEGORIES.includes(e.category)) return false;
    // 'home' preference can use anything tagged 'both'; 'gym' preference
    // can use anything tagged 'gym' OR 'both', since a gym has everything
    // a home setup has and more.
    if (equipment === 'home') {
      if (e.equipment !== 'both') return false;
    } else {
      if (!(e.equipment === 'gym' || e.equipment === 'both')) return false;
    }
    // While actively avoiding a flagged area, exclude anything that
    // loads it outright — this window is about not touching it, not
    // just training it less.
    if (injuryStatus?.phase === 'avoiding' && loadsArea(e, injuryStatus.area)) return false;
    return true;
  });

  const recentCategories = getRecentlyTrainedCategories();

  // Split into "fresh" (not trained recently, not easing an injury) and
  // "recent" (deprioritized, but not fully excluded — if someone only
  // has core exercises available after filtering, we'd rather still give
  // them something than an empty workout). Once past the initial
  // avoidance window, an injury-flagged area folds into this same
  // deprioritized pool instead of a hard exclusion — the "easing back
  // in" part of easing back in.
  const isDeprioritized = (e: Exercise) =>
    recentCategories.has(e.category) ||
    (injuryStatus?.phase === 'easing' && loadsArea(e, injuryStatus.area));

  const fresh = available.filter(e => !isDeprioritized(e));
  const recent = available.filter(e => isDeprioritized(e));

  // Shuffle each pool independently so the same exercises don't show up
  // in the same order every time this runs.
  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const shuffledFresh = shuffle(fresh);
  const shuffledRecent = shuffle(recent);

  // Fill from the fresh pool first, only reaching into the deprioritized
  // pool if there aren't enough fresh options to fill the time budget.
  // Also avoids picking more than 2 exercises from the exact same
  // category in one workout, so a 45-minute session doesn't accidentally
  // become "8 push exercises and nothing else."
  const selected: Exercise[] = [];
  const categoryCounts: Record<string, number> = {};

  function tryAdd(pool: Exercise[]) {
    for (const ex of pool) {
      if (selected.length >= targetExerciseCount) break;
      const count = categoryCounts[ex.category] ?? 0;
      if (count >= 2) continue;
      selected.push(ex);
      categoryCounts[ex.category] = count + 1;
    }
  }

  tryAdd(shuffledFresh);
  if (selected.length < targetExerciseCount) tryAdd(shuffledRecent);

  const generatedExercises: GeneratedExercise[] = selected.map(exercise => {
    const { sets, reps } = pickSetsAndReps(exercise.category);
    return { exercise, sets, reps };
  });

  return {
    exercises: generatedExercises,
    estimatedMinutes: generatedExercises.length * MINUTES_PER_EXERCISE,
    categoriesAvoided: Array.from(recentCategories),
    injuryAvoidance: injuryStatus,
  };
}