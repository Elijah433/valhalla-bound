import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getWarrior,
  addXP,
  updateStreak,
  logWorkout,
  logCardioRoute,
  getTodayWorkouts,
  getWorkoutCount,
  getTotalMiles,
  updateWarriorName,
  setWarriorPro,
  type Warrior,
  type Workout,
} from '@/lib/db';
import { WORKOUT_XP, type WorkoutType } from '@/constants/ranks';
import { rescheduleAfterWorkout } from '@/lib/notifications';
import { dealBossDamage } from '@/lib/bossRaid';
import { syncMyStatsIfInCrew } from '@/lib/crew';
import { generateSagaEntry } from '@/lib/skald';
import { checkAchievements, checkFrostShieldAchievement } from '@/lib/achievements';
import { vacationCoversGapSince } from '@/lib/vacationMode';

interface WeeklyStats {
  battles: number;
  xp: number;
  miles: number;
  bestDay: number;
  dailyCounts: number[];
  streak: number;
  frostShields: number;
  weekKey: string;
}

interface WarriorStore {
  warrior: Warrior | null;
  todayWorkouts: Workout[];
  workoutCount: number;
  totalMiles: number;
  isPro: boolean;
  streakDays: number;
  frostShields: number;
  streakBroken: boolean;

  loadWarrior: () => Promise<void>;
  recordWorkout: (
    type: WorkoutType,
    notes?: string,
    duration?: number,
    distanceMeters?: number,
    routePoints?: { lat: number; lng: number; t: number }[] | null,
    isGpsTracked?: boolean
  ) => number;
  setName: (name: string) => void;
  setPro: (val: boolean) => void;
  checkStreakOnOpen: () => Promise<{ broken: boolean; shieldUsed: boolean; weeklySagaReady: boolean }>;
  clearStreakBroken: () => void;
  updateWeeklyStats: (xp: number, miles: number) => Promise<void>;
}

// ── Local date helpers ──────────────────────────────────────
// Date.toISOString() / getDay() math based on it always resolves to UTC, not
// the device's local time — that can shift week/day boundaries by a full
// day depending on timezone and time of day. These helpers operate on the
// local Date object directly so "today" and "this week" match what the user
// actually sees on their calendar.
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parses a "YYYY-MM-DD" string (as produced by getLocalDateString) back into
// a local-midnight Date. This is NOT the same as `new Date(dateString)` —
// per the ISO 8601 spec, a date-only string with no time component is
// parsed as UTC midnight, not local midnight. In a timezone behind UTC
// (e.g. US Eastern), that UTC midnight lands in the *previous* local
// evening, which can silently shift a day-difference calculation by a full
// day depending on what time of day the comparison runs. Constructing the
// Date from explicit year/month/day components instead always anchors it
// to local midnight, matching how the string was originally produced.
function parseLocalDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getWeekKey() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  return getLocalDateString(weekStart);
}

function getMondayKey() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return getLocalDateString(monday);
}

function isSundayEvening() {
  const now = new Date();
  return now.getDay() === 0 && now.getHours() >= 19;
}

const STREAK_MILESTONES = [7, 14, 30, 60];

// Single source of truth for "is this streak number a milestone, and has it
// already been celebrated." Called from both recordWorkout() and
// checkStreakOnOpen() so a streak change via EITHER path gets the
// celebration check — previously this lived only inside recordWorkout(),
// so if the streak ever changed through checkStreakOnOpen()'s backfill
// branch instead of an actual workout log, the celebration would be
// silently skipped until whenever the next real workout happened to fire.
async function checkAndShowMilestone(streak: number) {
  if (!STREAK_MILESTONES.includes(streak)) return;
  try {
    const shown = await AsyncStorage.getItem(`streak_milestone_shown_${streak}`);
    if (shown) return;
    await AsyncStorage.setItem(`streak_milestone_shown_${streak}`, 'true');
    setTimeout(() => {
      const { router } = require('expo-router');
      router.push({ pathname: '/(modals)/streak-milestone', params: { days: String(streak) } });
    }, 1500);
  } catch (e) {}
}

// Shows a celebratory unlock screen for the first newly-earned achievement
// from a batch (if multiple unlock at once from a single event, only the
// first is shown immediately — the rest are still recorded as unlocked in
// the database, just without a back-to-back flood of celebration screens).
function showAchievementUnlock(achievements: { id: string; name: string; description: string; rune: string; color: string }[]) {
  if (achievements.length === 0) return;
  const first = achievements[0];
  setTimeout(() => {
    const { router } = require('expo-router');
    router.push({
      pathname: '/(modals)/achievement-unlocked',
      params: {
        id: first.id, name: first.name, description: first.description,
        rune: first.rune, color: first.color,
      },
    });
  }, 1800); // after the streak-milestone delay above, so they don't collide
}

export const useWarriorStore = create<WarriorStore>((set, get) => ({
  warrior: null,
  todayWorkouts: [],
  workoutCount: 0,
  totalMiles: 0,
  isPro: false,
  streakDays: 0,
  frostShields: 1,
  streakBroken: false,

  loadWarrior: async () => {
    const warrior = getWarrior();
    const todayWorkouts = getTodayWorkouts();
    const workoutCount = getWorkoutCount();
    const totalMiles = getTotalMiles();
    set({
      warrior,
      todayWorkouts,
      workoutCount,
      totalMiles,
      streakDays: warrior?.streak_days ?? 0,
       isPro: warrior?.is_pro === 1,




    });
  },

  recordWorkout: (
    type: WorkoutType,
    notes?: string,
    duration?: number,
    distanceMeters?: number,
    routePoints?: { lat: number; lng: number; t: number }[] | null,
    isGpsTracked?: boolean
  ) => {
    const xp = WORKOUT_XP[type];
    const workoutId = logWorkout(type, xp, notes, duration);

    // Real distance (typed manually or captured live via GPS) is now the
    // source of truth when we have it — only fall back to the old
    // duration/10-or-flat-2 guess when no real distance was passed at all,
    // so existing call sites that don't pass distance yet keep behaving
    // exactly as before.
    const METERS_PER_MILE = 1609.344;
    let miles: number;
    if (distanceMeters != null && distanceMeters > 0) {
      miles = distanceMeters / METERS_PER_MILE;
      logCardioRoute(workoutId, distanceMeters, routePoints ?? null, !!isGpsTracked);
    } else {
      miles = type === 'endurance' ? (duration ? duration / 10 : 2) : 0;
    }

    addXP(xp);
    updateStreak();
    const updatedWarrior = getWarrior();
    const streak = updatedWarrior?.streak_days ?? 0;
    checkAndShowMilestone(streak);
    AsyncStorage.setItem('last_workout_date', getLocalDateString());
    get().updateWeeklyStats(xp, miles);
    get().loadWarrior();
    const w = getWarrior();
    rescheduleAfterWorkout(w?.name ?? 'Warrior', w?.streak_days ?? 0);

    AsyncStorage.getItem('valhalla_crew_id').then(crewId => {
      if (crewId) {
        dealBossDamage(crewId, xp);
      }
    });

    // Sync stats to the crew automatically right after every workout, not
    // just when the user happens to open the Crew tab. Previously,
    // syncMyStats() only ran from inside crew.tsx's loadCrew() — a crew
    // member who trained regularly but rarely revisited the Crew screen
    // could have their stats sit stale (or never sync at all) on every
    // other crewmate's view, even though their own local progress was
    // correct the whole time. This is fire-and-forget and wrapped
    // defensively inside syncMyStatsIfInCrew() — if anything goes wrong
    // (offline, not in a crew, etc.) it fails silently and never affects
    // the rest of this function, which has already completed by this point.
    AsyncStorage.getItem('valhalla_gender').then(gender => {
      const isShieldmaiden = gender === 'shieldmaiden';
      syncMyStatsIfInCrew(w?.name ?? 'Warrior', w?.total_xp ?? 0, w?.streak_days ?? 0, isShieldmaiden);
    });

    // Skald's Chronicle is now a Pro-only feature end to end — generation
    // itself is gated here, not just visibility in the UI. This checks the
    // raw warrior.is_pro value from SQLite directly (not the store's `isPro`
    // state), so the dev-only `isPro: true` override in loadWarrior() above
    // does NOT accidentally unlock real Chronicle generation for free users
    // during testing — only an actual paid/trial subscription does.
    if (w?.is_pro === 1) {
      generateSagaEntry(w?.name ?? 'Warrior', type, w?.streak_days ?? 0, w?.total_xp ?? 0);
    }

    // Achievement check — runs after every logged workout, since most
    // conditions (streak length, battle count, weekly variety, etc.)
    // depend on state that a workout log can change. checkAchievements()
    // itself only returns achievements that are NEWLY unlocked by this
    // call, so this never re-shows something already earned.
    try {
      const newlyUnlocked = checkAchievements();
      showAchievementUnlock(newlyUnlocked);
    } catch (e) {}

    return xp;
  },

  setName: (name: string) => {
    updateWarriorName(name);
    get().loadWarrior();
  },

  setPro: (val: boolean) => {
    setWarriorPro(val);
    get().loadWarrior();
  },

  clearStreakBroken: () => set({ streakBroken: false }),

  updateWeeklyStats: async (xp: number, miles: number) => {
    try {
      const weekKey = getWeekKey();
      const raw = await AsyncStorage.getItem('weekly_stats');
      const existing: WeeklyStats | null = raw ? JSON.parse(raw) : null;

      const isNewWeek = existing?.weekKey !== weekKey;

      // The moment we detect a real week boundary has been crossed (we have
      // existing data from a DIFFERENT week, not just "no data yet" on
      // first-ever use) — snapshot that finished week's final numbers
      // before they get reset. This only fires once per week transition,
      // never on a same-week update, since `isNewWeek` is only true the
      // first time updateWeeklyStats() runs after the week actually changed.
      if (existing && isNewWeek) {
        await AsyncStorage.setItem('last_week_stats', JSON.stringify(existing));
      }

      const dayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
      const dailyCounts = !isNewWeek
        ? [...(existing?.dailyCounts ?? [0,0,0,0,0,0,0])]
        : [0,0,0,0,0,0,0];

      dailyCounts[dayIndex] = (dailyCounts[dayIndex] ?? 0) + 1;
      const bestDay = dailyCounts.indexOf(Math.max(...dailyCounts));

      const warrior = getWarrior();
      const stats: WeeklyStats = {
        battles: !isNewWeek ? (existing?.battles ?? 0) + 1 : 1,
        xp: !isNewWeek ? (existing?.xp ?? 0) + xp : xp,
        miles: !isNewWeek ? (existing?.miles ?? 0) + miles : miles,
        bestDay,
        dailyCounts,
        streak: warrior?.streak_days ?? 0,
        frostShields: get().frostShields,
        weekKey,
      };

      await AsyncStorage.setItem('weekly_stats', JSON.stringify(stats));
    } catch (e) {}
  },

  checkStreakOnOpen: async () => {
    try {
      const lastWorkoutDate = await AsyncStorage.getItem('last_workout_date');
      const lastShieldReset = await AsyncStorage.getItem('frost_shield_reset');
      const mondayKey = getMondayKey();
      const isPro = get().isPro;

      // Reset frost shield on Monday (Pro only)
      let frostShields = get().frostShields;
      if (isPro) {
        if (lastShieldReset !== mondayKey) {
          frostShields = 1;
          await AsyncStorage.setItem('frost_shield_reset', mondayKey);
          await AsyncStorage.setItem('frost_shields', '1');
          set({ frostShields: 1 });
        } else {
          const stored = await AsyncStorage.getItem('frost_shields');
          frostShields = stored ? parseInt(stored) : 1;
          set({ frostShields });
        }
      }

      // Check if weekly saga should show (Pro only)
      const weekKey = getWeekKey();
      const weeklySagaShown = await AsyncStorage.getItem('weekly_saga_shown');
      const weeklySagaReady = isPro && isSundayEvening() && weeklySagaShown !== weekKey;

      if (!lastWorkoutDate) {
        // Backfill — if warrior has a streak but no stored date, assume trained today
        const warrior = getWarrior();
        if (warrior && (warrior.streak_days ?? 0) > 0) {
          await AsyncStorage.setItem('last_workout_date', getLocalDateString());
          // Streak may have reached a milestone through a path other than
          // recordWorkout() (e.g. it was already set before this device's
          // last_workout_date existed) — check here too so the celebration
          // isn't missed until some later, unrelated workout log.
          checkAndShowMilestone(warrior.streak_days ?? 0);
        }
        return { broken: false, shieldUsed: false, weeklySagaReady };
      }

      // Parse the stored date string as a LOCAL date, not via new Date(string)
      // — see parseLocalDateString's comment for why that distinction matters.
      const lastMidnight = parseLocalDateString(lastWorkoutDate);
      const now = new Date();
      const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffDays = Math.floor((nowMidnight.getTime() - lastMidnight.getTime()) / (1000 * 60 * 60 * 24));

      // Trained today or yesterday — streak safe
      if (diffDays <= 1) {
        return { broken: false, shieldUsed: false, weeklySagaReady };
      }

      // Vacation Mode — a deliberate, planned break, not a random missed-day
      // safety net (that's what Frost Shields are for). Protects the streak
      // for free, for every warrior regardless of Pro status — the whole
      // point is stopping "I missed a few days on a trip, my streak's
      // gone, why bother reopening the app" churn, and that risk isn't
      // unique to Pro subscribers. vacationCoversGapSince() also guards
      // against starting a vacation AFTER the streak had already lapsed —
      // it only protects days actually covered by the vacation window, see
      // its own comment in lib/vacationMode.ts for why that matters.
      if (await vacationCoversGapSince(lastWorkoutDate)) {
        await AsyncStorage.setItem('last_workout_date', getLocalDateString());
        return { broken: false, shieldUsed: false, weeklySagaReady };
      }

      // Missed days — check frost shield (Pro only)
      if (isPro && frostShields > 0) {
        const newShields = frostShields - 1;
        await AsyncStorage.setItem('frost_shields', String(newShields));
        set({ frostShields: newShields });
        // Frost Shield achievement — a specific one-off event, not a
        // condition derivable from stored state, so it gets its own
        // explicit trigger here rather than living inside checkAchievements().
        try {
          const unlocked = checkFrostShieldAchievement();
          if (unlocked) showAchievementUnlock([unlocked]);
        } catch (e) {}
        return { broken: false, shieldUsed: true, weeklySagaReady };
      }

      // No shield or free user — streak broken.
      // Only actually break it (and show the broken-streak UI) once per calendar
      // day — otherwise every app open on the same missed day re-triggers
      // updateStreak() and the broken banner/modal repeatedly.
      const today = getLocalDateString();
      const alreadyHandledToday = await AsyncStorage.getItem('streak_broken_handled_date');

      if (alreadyHandledToday !== today) {
        updateStreak();
        await AsyncStorage.setItem('streak_broken_handled_date', today);
        set({ streakDays: 0, streakBroken: true });
        return { broken: true, shieldUsed: false, weeklySagaReady };
      }

      // Already handled earlier today — streak is already reset, don't
      // re-trigger the broken-streak UI again.
      set({ streakDays: 0 });
      return { broken: false, shieldUsed: false, weeklySagaReady };

    } catch (e) {
      return { broken: false, shieldUsed: false, weeklySagaReady: false };
    }
  },
}));