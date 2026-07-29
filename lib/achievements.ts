import {
  getAllPersonalRecords, getLatestWeight, getWorkoutCount, getPersonalRecord,
  getSagaEntryCount, getRecentRavenCheckins, unlockAchievement, getWarrior,
  getWorkoutTypesThisWeek,
} from './db';
import { ACHIEVEMENTS, type Achievement } from '@/constants/achievements';

// Checks every achievement condition that can be evaluated purely from
// existing stored data (no extra parameters needed), and unlocks any that
// newly qualify. Safe to call from multiple trigger points (after a
// workout, after logging weight, on Home screen focus, etc.) since
// unlockAchievement() itself is idempotent — already-unlocked ones are
// silently skipped, and this function only ever returns achievements that
// were NOT already unlocked before this specific call.
export function checkAchievements(): Achievement[] {
  const newlyUnlocked: Achievement[] = [];

  function tryUnlock(id: string) {
    if (unlockAchievement(id)) {
      const a = ACHIEVEMENTS.find(a => a.id === id);
      if (a) newlyUnlocked.push(a);
    }
  }

  const warrior = getWarrior();
  const streak = warrior?.streak_days ?? 0;
  const battles = getWorkoutCount();

  if (getAllPersonalRecords().length >= 1) tryUnlock('first_blood');
  if (streak >= 7) tryUnlock('iron_will_7');
  if (streak >= 30) tryUnlock('iron_will_30');
  if (battles >= 10) tryUnlock('battles_10');
  if (battles >= 50) tryUnlock('battles_50');
  if (battles >= 100) tryUnlock('battles_100');
  if (getLatestWeight() !== null) tryUnlock('weight_logged');
  if (getSagaEntryCount() >= 1) tryUnlock('chronicle_started');
  if (getRecentRavenCheckins(100).length >= 10) tryUnlock('ten_ravens');
  if ((warrior?.total_xp ?? 0) >= 180000) tryUnlock('asgard_reached');

  // Full Circle — all 4 workout types logged within the current week
  const typesThisWeek = getWorkoutTypesThisWeek();
  const allFourTypes = ['strength', 'endurance', 'combat', 'recovery'];
  if (allFourTypes.every(t => typesThisWeek.includes(t))) tryUnlock('full_circle');

  // The 500 Club — combined best-ever squat + bench + deadlift single-set
  // weight crosses 500 lbs. Uses each lift's all-time PR, not necessarily
  // all achieved in the same session.
  const squat = getPersonalRecord('squat');
  const bench = getPersonalRecord('bench');
  const deadlift = getPersonalRecord('deadlift');
  if (squat && bench && deadlift) {
    const total = squat.best_weight + bench.best_weight + deadlift.best_weight;
    if (total >= 500) tryUnlock('five_hundred_club');
  }

  // Bodyweight lift — approximated using the heaviest single-exercise PR
  // ever logged against the most recent bodyweight entry, since there
  // isn't currently a stored "heaviest single set across all exercises"
  // query separate from per-exercise PRs.
  const latestWeight = getLatestWeight();
  if (latestWeight) {
    const allPRs = getAllPersonalRecords();
    const heaviestPR = allPRs.reduce((max, pr) => Math.max(max, pr.best_weight), 0);
    if (heaviestPR >= latestWeight.weight) tryUnlock('bodyweight_lift');
  }

  return newlyUnlocked;
}

// Frost Shield use and Crew joining are specific one-off events rather
// than conditions derivable from stored state at any arbitrary moment —
// each gets its own explicit trigger, called directly from wherever that
// event actually happens (store.ts's checkStreakOnOpen for the shield,
// crew.tsx/create-crew.tsx for joining), rather than being folded into
// the general sweep above.
export function checkFrostShieldAchievement(): Achievement | null {
  if (unlockAchievement('frost_shield_used')) {
    return ACHIEVEMENTS.find(a => a.id === 'frost_shield_used') ?? null;
  }
  return null;
}

export function checkCrewAchievement(): Achievement | null {
  if (unlockAchievement('crew_joined')) {
    return ACHIEVEMENTS.find(a => a.id === 'crew_joined') ?? null;
  }
  return null;
}