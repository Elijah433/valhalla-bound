import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Vacation Mode ──────────────────────────────────────────────────────
//
// A deliberate, planned break, not a random missed-day safety net (that's
// what Frost Shields are for). While active, the streak is protected for
// free — no shield spent — for every warrior regardless of Pro status.
//
// "Smart" here means trip-type and day-of-trip aware, not location-aware —
// no GPS or external weather API involved. Fully offline, nothing that can
// fail from a network hiccup.

const VACATION_KEY = 'valhalla_vacation_mode';
const LAST_ENDED_KEY = 'valhalla_vacation_last_ended';
const VACATION_COUNT_KEY = 'valhalla_vacation_count';
const LAST_TRIP_TYPE_KEY = 'valhalla_vacation_last_trip_type';

export type TripType = 'beach' | 'hiking' | 'city' | 'family';

export interface VacationState {
  tripType: TripType;
  startDate: string; // local YYYY-MM-DD, inclusive
  endDate: string;   // local YYYY-MM-DD, inclusive
}

export interface Mission {
  title: string;
  subtitle: string;
  type: 'recovery' | 'endurance';
  duration: string;
  xp: number;
  rune: string;
}

export interface TripProfile {
  id: TripType;
  label: string;
  chipLabel: string;
  rune: string;
  // Day-of-trip variants: [arrival day, ...middle-day rotation, wind-down day].
  // getVacationMission() picks the right one based on where you are in the trip.
  missions: Mission[];
}

export const TRIP_PROFILES: TripProfile[] = [
  {
    id: 'beach',
    label: 'Beach & Resort',
    chipLabel: 'BEACH & RESORT',
    rune: 'ᛚ',
    missions: [
      { title: 'Sea & Sand', subtitle: 'Swim, walk the shore, or just rest — your call', type: 'endurance', duration: '15-20 min', xp: 60, rune: 'ᛚ' },
      { title: 'Tide Walker', subtitle: 'Long beach walk or bodysurf — whatever the water allows', type: 'endurance', duration: '20-25 min', xp: 65, rune: 'ᛚ' },
      { title: 'Sun & Stretch', subtitle: 'Short swim, easy stretch — wind down before you head back', type: 'recovery', duration: '10-15 min', xp: 50, rune: 'ᛚ' },
    ],
  },
  {
    id: 'hiking',
    label: 'Hiking & Outdoors',
    chipLabel: 'HIKING & OUTDOORS',
    rune: 'ᛟ',
    missions: [
      { title: 'The Trail Is the Training', subtitle: 'Hiking counts — no extra workout owed today', type: 'endurance', duration: 'however long you wander', xp: 80, rune: 'ᛟ' },
      { title: 'Summit Push', subtitle: 'Extra elevation today counts double in spirit', type: 'endurance', duration: 'however long the trail runs', xp: 90, rune: 'ᛟ' },
      { title: 'Legs Up, Rest Day', subtitle: 'Trail legs earned a break — light stretch only', type: 'recovery', duration: '10 min', xp: 40, rune: 'ᛟ' },
    ],
  },
  {
    id: 'city',
    label: 'City & Business',
    chipLabel: 'CITY & BUSINESS',
    rune: 'ᛒ',
    missions: [
      { title: 'Hotel Room Circuit', subtitle: 'Bodyweight only — squats, push-ups, a short walk', type: 'recovery', duration: '15 min', xp: 60, rune: 'ᛒ' },
      { title: 'Stairwell Raid', subtitle: 'Skip the elevator, take the stairs whenever you can today', type: 'endurance', duration: 'all day', xp: 55, rune: 'ᛒ' },
      { title: 'Wind Down Circuit', subtitle: 'Light stretch before the flight or drive home', type: 'recovery', duration: '10 min', xp: 45, rune: 'ᛒ' },
    ],
  },
  {
    id: 'family',
    label: 'Visiting Family',
    chipLabel: 'VISITING FAMILY',
    rune: 'ᛁ',
    missions: [
      { title: 'Stay Loose', subtitle: 'A short walk or stretch — family first today', type: 'recovery', duration: '10-15 min', xp: 50, rune: 'ᛁ' },
      { title: 'Backyard Battle', subtitle: 'Toss a ball, chase the kids — anything that moves counts', type: 'endurance', duration: '15 min', xp: 55, rune: 'ᛁ' },
      { title: 'Quiet Recovery', subtitle: 'Just rest — you\u2019ve earned it', type: 'recovery', duration: '5-10 min', xp: 35, rune: 'ᛁ' },
    ],
  },
];

// The mission shown when a vacation just ended, easing back into the normal
// split instead of dropping straight back into the full program cold.
export const RETURN_MISSION: Mission = {
  title: 'Back in the Fold',
  subtitle: 'Eased return — light session before the full split resumes',
  type: 'recovery',
  duration: '15-20 min',
  xp: 70,
  rune: 'ᚨ',
};

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

function daysBetween(fromStr: string, toStr: string): number {
  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

// Picks the day-appropriate mission variant: first variant on arrival day,
// last variant on the trip's final day (a natural wind-down beat), and
// rotates through whatever's in between for the middle of the trip — so a
// week-long trip doesn't show the exact same card every morning.
export function getVacationMission(state: VacationState): Mission {
  const profile = getTripProfile(state.tripType);
  const missions = profile.missions;
  if (missions.length === 1) return missions[0];

  const today = getLocalDateString();
  if (today === state.endDate) return missions[missions.length - 1];
  if (today === state.startDate) return missions[0];

  const dayIndex = daysBetween(state.startDate, today);
  return missions[dayIndex % missions.length];
}

async function markVacationEnded(tripType: TripType, endedDate: string) {
  await AsyncStorage.setItem(LAST_ENDED_KEY, JSON.stringify({ tripType, endedDate }));
}

export async function startVacation(tripType: TripType, days: number): Promise<VacationState> {
  const startDate = getLocalDateString();
  const endDate = addDays(startDate, days - 1);
  const state: VacationState = { tripType, startDate, endDate };
  await AsyncStorage.setItem(VACATION_KEY, JSON.stringify(state));
  await AsyncStorage.setItem(LAST_TRIP_TYPE_KEY, tripType);
  const count = await getVacationCount();
  await AsyncStorage.setItem(VACATION_COUNT_KEY, String(count + 1));
  return state;
}

export async function endVacation(): Promise<void> {
  const raw = await AsyncStorage.getItem(VACATION_KEY);
  if (raw) {
    const state: VacationState = JSON.parse(raw);
    await markVacationEnded(state.tripType, getLocalDateString());
  }
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
      await markVacationEnded(state.tripType, state.endDate);
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

// Valid for the day a vacation ends and the day right after it — covers both
// a manual "end early" tap and the natural midnight auto-expiry — then
// clears itself so it doesn't linger past that window.
export async function getReturnMission(): Promise<Mission | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_ENDED_KEY);
    if (!raw) return null;
    const { endedDate } = JSON.parse(raw) as { endedDate: string };
    const today = getLocalDateString();
    if (today === endedDate || today === addDays(endedDate, 1)) {
      return RETURN_MISSION;
    }
    await AsyncStorage.removeItem(LAST_ENDED_KEY);
    return null;
  } catch {
    return null;
  }
}
// Where you are in the trip, for the "Day X of Y" readout on the mission
// card — purely date math, matches the same day count getVacationMission()
// uses to pick which variant to show.
export function tripDayProgress(state: VacationState): { day: number; total: number } {
  const total = daysBetween(state.startDate, state.endDate) + 1;
  const today = getLocalDateString();
  const rawDay = daysBetween(state.startDate, today) + 1;
  return { day: Math.min(Math.max(rawDay, 1), total), total };
}

// Pushes the end date out by more days — used when a trip runs longer than
// planned, so the warrior doesn't have to end and restart (losing the
// mission-variety day count) just to cover a few extra days.
export async function extendVacation(days: number): Promise<VacationState | null> {
  const raw = await AsyncStorage.getItem(VACATION_KEY);
  if (!raw) return null;
  const state: VacationState = JSON.parse(raw);
  const extended: VacationState = { ...state, endDate: addDays(state.endDate, days) };
  await AsyncStorage.setItem(VACATION_KEY, JSON.stringify(extended));
  return extended;
}

export async function getVacationCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(VACATION_COUNT_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

export async function getLastTripType(): Promise<TripType | null> {
  const raw = await AsyncStorage.getItem(LAST_TRIP_TYPE_KEY);
  return (raw as TripType) ?? null;
}

// Checks whether an active vacation both covers today AND started no later
// than the day right after the warrior's last logged workout — i.e. there's
// no unprotected gap of missed days sitting before the vacation began.
// Called from store.ts's checkStreakOnOpen().
export async function vacationCoversGapSince(lastWorkoutDate: string): Promise<boolean> {
  const vacation = await getActiveVacation();
  if (!vacation) return false;
  const nextDay = addDays(lastWorkoutDate, 1);
  return vacation.startDate <= nextDay;
}