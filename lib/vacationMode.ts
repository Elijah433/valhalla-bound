import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Vacation Mode ──────────────────────────────────────────────────────
//
// A deliberate, planned break, not a random missed-day safety net (that's
// what Frost Shields are for). While active, the streak is protected for
// free — no shield spent — for every warrior regardless of Pro status: the
// point is stopping "I missed a few days on a trip, my streak's gone, why
// bother reopening the app" churn, and that risk isn't unique to Pro
// subscribers.
//
// "Smart" here means trip-type aware, not location-aware — no GPS or
// external weather API involved. The warrior picks the kind of trip
// they're on and the Home screen's suggested mission swaps to a lighter,
// tailored-to-that-trip-type suggestion for the duration, instead of the
// usual program/split day. Fully offline, nothing that can fail from a
// network hiccup.

const VACATION_KEY = 'valhalla_vacation_mode';

export type TripType = 'beach' | 'hiking' | 'city' | 'family';

export interface VacationState {
  tripType: TripType;
  startDate: string; // local YYYY-MM-DD, inclusive
  endDate: string;   // local YYYY-MM-DD, inclusive
}

export interface TripProfile {
  id: TripType;
  label: string;
  chipLabel: string;
  rune: string;
  mission: {
    title: string;
    subtitle: string;
    type: 'recovery' | 'endurance';
    duration: string;
    xp: number;
    rune: string;
  };
}

export const TRIP_PROFILES: TripProfile[] = [
  {
    id: 'beach',
    label: 'Beach & Resort',
    chipLabel: 'BEACH & RESORT',
    rune: 'ᛚ',
    mission: {
      title: 'Sea & Sand',
      subtitle: 'Swim, walk the shore, or just rest — your call',
      type: 'endurance',
      duration: '15-20 min',
      xp: 60,
      rune: 'ᛚ',
    },
  },
  {
    id: 'hiking',
    label: 'Hiking & Outdoors',
    chipLabel: 'HIKING & OUTDOORS',
    rune: 'ᛟ',
    mission: {
      title: 'The Trail Is the Training',
      subtitle: 'Hiking counts — no extra workout owed today',
      type: 'endurance',
      duration: 'however long you wander',
      xp: 80,
      rune: 'ᛟ',
    },
  },
  {
    id: 'city',
    label: 'City & Business',
    chipLabel: 'CITY & BUSINESS',
    rune: 'ᛒ',
    mission: {
      title: 'Hotel Room Circuit',
      subtitle: 'Bodyweight only — squats, push-ups, a short walk',
      type: 'recovery',
      duration: '15 min',
      xp: 60,
      rune: 'ᛒ',
    },
  },
  {
    id: 'family',
    label: 'Visiting Family',
    chipLabel: 'VISITING FAMILY',
    rune: 'ᛁ',
    mission: {
      title: 'Stay Loose',
      subtitle: 'A short walk or stretch — family first today',
      type: 'recovery',
      duration: '10-15 min',
      xp: 50,
      rune: 'ᛁ',
    },
  },
];

export function getTripProfile(tripType: TripType): TripProfile {
  return TRIP_PROFILES.find(p => p.id === tripType) ?? TRIP_PROFILES[0];
}

function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

export async function startVacation(tripType: TripType, days: number): Promise<VacationState> {
  const startDate = getLocalDateString();
  const endDate = addDays(startDate, days - 1);
  const state: VacationState = { tripType, startDate, endDate };
  await AsyncStorage.setItem(VACATION_KEY, JSON.stringify(state));
  return state;
}

export async function endVacation(): Promise<void> {
  await AsyncStorage.removeItem(VACATION_KEY);
}

// Returns the active vacation if today falls within [startDate, endDate],
// auto-clearing (and returning null) once it's over so it doesn't linger
// as stale state the next time the app opens.
export async function getActiveVacation(): Promise<VacationState | null> {
  try {
    const raw = await AsyncStorage.getItem(VACATION_KEY);
    if (!raw) return null;
    const state: VacationState = JSON.parse(raw);
    const today = getLocalDateString();
    if (today > state.endDate) {
      await AsyncStorage.removeItem(VACATION_KEY);
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function daysRemaining(state: VacationState): number {
  const today = getLocalDateString();
  const [ey, em, ed] = state.endDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  const end = new Date(ey, em - 1, ed);
  const now = new Date(ty, tm - 1, td);
  return Math.max(0, Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

// Checks whether an active vacation both covers today AND started no later
// than the day right after the warrior's last logged workout — i.e. there's
// no unprotected gap of missed days sitting before the vacation began.
// Without this guard, someone could let their streak lapse first and THEN
// start Vacation Mode, retroactively "un-breaking" days that were never
// actually covered by a trip. Called from store.ts's checkStreakOnOpen().
export async function vacationCoversGapSince(lastWorkoutDate: string): Promise<boolean> {
  const vacation = await getActiveVacation();
  if (!vacation) return false;
  const nextDay = addDays(lastWorkoutDate, 1);
  return vacation.startDate <= nextDay;
}