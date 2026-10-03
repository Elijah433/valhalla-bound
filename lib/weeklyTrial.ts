import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWeeklyTrialStats } from './db';

// ── Weekly Trial ─────────────────────────────────────────────────────
//
// A rotating personal challenge that resets every Sunday — the same week
// boundary db.ts's getWorkoutTypesThisWeek() already uses, so "this week"
// means one consistent thing across the whole app. Which challenge shows
// is picked deterministically from the week number, not randomly: it
// changes on its own every Sunday with zero scheduling, and reopening the
// app mid-week always shows the same one.

export type TrialMetric = 'workouts' | 'xp' | 'days' | 'categories';

export interface TrialTemplate {
  id: string;
  title: string;
  description: string;
  rune: string;
  target: number;
  metric: TrialMetric;
}
  export interface LegendEntry {
  weekIndex: number;
  trialId: string;
  title: string;
  rune: string;
  metric: TrialMetric;
  target: number;
  finalValue: number;
  workoutsThisWeek: number;
  completedDate: string; // local YYYY-MM-DD
  seasonLabel: string | null;
  seasonColor: string | null;
}

const LEGENDS_KEY = 'valhalla_hall_of_legends';

export async function recordLegend(entry: LegendEntry): Promise<void> {
  const existing = await getLegends();
  if (existing.some(e => e.weekIndex === entry.weekIndex)) return;
  const updated = [entry, ...existing].slice(0, 200);
  await AsyncStorage.setItem(LEGENDS_KEY, JSON.stringify(updated));
}

export async function getLegends(): Promise<LegendEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(LEGENDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function formatTrialResult(entry: LegendEntry): string {
  switch (entry.metric) {
    case 'workouts': return `${entry.finalValue}/${entry.target} workouts logged`;
    case 'xp': return `${entry.finalValue}/${entry.target} Valor earned`;
    case 'days': return `${entry.finalValue}/${entry.target} days trained`;
    case 'categories': return `${entry.finalValue}/${entry.target} categories trained`;
  }
}


export const TRIAL_TEMPLATES: TrialTemplate[] = [
  // Workouts logged
  { id: 'three_trials',  title: 'Three Trials',         description: 'Log 3 workouts this week',                rune: 'ᚦ', target: 3,   metric: 'workouts' },
  { id: 'four_trials',   title: 'Four Trials',          description: 'Log 4 workouts this week',                rune: 'ᚦ', target: 4,   metric: 'workouts' },
  { id: 'five_trials',   title: 'Five Trials',          description: 'Log 5 workouts this week',                rune: 'ᚦ', target: 5,   metric: 'workouts' },
  { id: 'relentless',    title: 'Relentless',           description: 'Log 6 workouts this week',                rune: 'ᚱ', target: 6,   metric: 'workouts' },

  // Valor (XP) earned
  { id: 'first_blood',   title: 'First Blood',          description: 'Earn 200 Valor this week',                rune: 'ᚨ', target: 200, metric: 'xp' },
  { id: 'valors_reach',  title: "Valor's Reach",        description: 'Earn 300 Valor this week',                rune: 'ᚨ', target: 300, metric: 'xp' },
  { id: 'gold_hoard',    title: 'Gold Hoard',           description: 'Earn 400 Valor this week',                rune: 'ᚨ', target: 400, metric: 'xp' },
  { id: 'odins_favor',   title: "Odin's Favor",         description: 'Earn 500 Valor this week',                rune: 'ᚨ', target: 500, metric: 'xp' },

  // Distinct days trained
  { id: 'three_sworn',   title: 'Three Days Sworn',     description: 'Train on 3 different days this week',     rune: 'ᛋ', target: 3,   metric: 'days' },
  { id: 'steady_hand',   title: 'Steady Hand',          description: 'Train on 4 different days this week',     rune: 'ᛋ', target: 4,   metric: 'days' },
  { id: 'five_strong',   title: 'Five Days Strong',     description: 'Train on 5 different days this week',     rune: 'ᛋ', target: 5,   metric: 'days' },
  { id: 'no_rest',       title: 'No Rest for the Bold', description: 'Train on 6 different days this week',     rune: 'ᛋ', target: 6,   metric: 'days' },

  // Category diversity
  { id: 'two_paths',     title: 'Two Paths',            description: 'Train 2 different categories this week',  rune: 'ᛟ', target: 2,   metric: 'categories' },
  { id: 'full_circle',   title: 'Full Circle',          description: 'Train 3 different categories this week',  rune: 'ᛟ', target: 3,   metric: 'categories' },
  { id: 'master_of_all', title: 'Master of All',        description: 'Train all 4 categories this week',        rune: 'ᛟ', target: 4,   metric: 'categories' },
];

const WEEKLY_TRIAL_REWARD_XP = 100;
export { WEEKLY_TRIAL_REWARD_XP };

const CLAIMED_KEY = 'valhalla_weekly_trial_claimed_week';

// A fixed reference Sunday, used only to derive a stable, ever-increasing
// week index — 2024-01-07 was a Sunday. The date itself has no meaning,
// it's purely a math anchor.
const REFERENCE_SUNDAY = new Date(2024, 0, 7);

function getCurrentWeekStart(): Date {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export function getWeekIndex(): number {
  const weekStart = getCurrentWeekStart();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((weekStart.getTime() - REFERENCE_SUNDAY.getTime()) / msPerWeek);
}

export function getCurrentTrial(): TrialTemplate {
  const len = TRIAL_TEMPLATES.length;
  const idx = ((getWeekIndex() % len) + len) % len;
  return TRIAL_TEMPLATES[idx];
}

export interface TrialProgress {
  trial: TrialTemplate;
  current: number;
  complete: boolean;
}

export function getTrialProgress(): TrialProgress {
  const trial = getCurrentTrial();
  const stats = getWeeklyTrialStats();
  const current =
    trial.metric === 'workouts' ? stats.workoutsThisWeek :
    trial.metric === 'xp'       ? stats.xpThisWeek :
    trial.metric === 'days'     ? stats.daysTrainedThisWeek :
    stats.categoriesThisWeek;
  return { trial, current: Math.min(current, trial.target), complete: current >= trial.target };
}

// Completing the target doesn't auto-grant XP — claiming is a deliberate
// tap, both for the feel-good moment and so a completed trial can only
// ever pay out once per week even if Home reloads multiple times after.
export async function isTrialClaimedThisWeek(): Promise<boolean> {
  const claimedWeek = await AsyncStorage.getItem(CLAIMED_KEY);
  return claimedWeek === String(getWeekIndex());
}

export async function claimTrialReward(): Promise<void> {
  await AsyncStorage.setItem(CLAIMED_KEY, String(getWeekIndex()));
}

// ── October reskin ───────────────────────────────────────────────────
// Purely presentational — swaps the orb's color/rune/label for the month,
// doesn't touch the challenge logic above at all. Add more months here
// later (Nov/Dec) the same way.

export interface SeasonalTheme { label: string; rune: string; color: string; accent: string; }

export function getSeasonalTheme(): SeasonalTheme | null {
  const month = new Date().getMonth(); // 0-indexed
  if (month === 9) { // October
    return { label: 'THE WILD HUNT', rune: 'ᛞ', color: '#FF6B1A', accent: '#B8390E' };
  }
  if (month === 11) { // December — Yule
    return { label: 'THE LONG NIGHT', rune: 'ᛃ', color: '#5EC2E8', accent: '#1E5C7A' };
  }
  return null;
}