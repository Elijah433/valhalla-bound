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
// assigning to someone by algorithm.
const ELIGIBLE_CATEGORIES: Exercise['category'][] = [
  'push', 'pull', 'legs', 'core', 'cable', 'bodyweight', 'cardio',
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

// Generates a workout that fits the given time budget, preferring
// exercises from categories NOT trained in the last couple of days, and
// filtered to only what's actually possible with the chosen equipment.
export function generateAdaptiveWorkout(
  minutesAvailable: number,
  equipment: EquipmentPreference
): GeneratedWorkout {
  const targetExerciseCount = Math.max(1, Math.round(minutesAvailable / MINUTES_PER_EXERCISE));

  const available = EXERCISES.filter(e => {
    if (!ELIGIBLE_CATEGORIES.includes(e.category)) return false;
    // 'home' preference can use anything tagged 'both'; 'gym' preference
    // can use anything tagged 'gym' OR 'both', since a gym has everything
    // a home setup has and more.
    if (equipment === 'home') return e.equipment === 'both';
    return e.equipment === 'gym' || e.equipment === 'both';
  });

  const recentCategories = getRecentlyTrainedCategories();

  // Split into "fresh" (not trained recently) and "recent" (deprioritized,
  // but not fully excluded — if someone only has core exercises available
  // after filtering, we'd rather still give them something than an empty
  // workout).
  const fresh = available.filter(e => !recentCategories.has(e.category));
  const recent = available.filter(e => recentCategories.has(e.category));

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

  // Fill from the fresh pool first, only reaching into the recently-
  // trained pool if there aren't enough fresh options to fill the time
  // budget. Also avoids picking more than 2 exercises from the exact same
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
  };
}