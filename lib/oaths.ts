import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { getDeviceId } from './crew';

// Local date helpers — same pattern as store.ts/db.ts/bossRaid.ts. Always
// derive "today" from local date parts, never from toISOString() or
// new Date(dateString), both of which silently resolve to UTC and can
// shift day-boundary math by a full day depending on timezone.
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

export type OathStatus = 'active' | 'fulfilled' | 'broken';

export interface OathPreset {
  id: string;
  title: string;
  description: string;
  durationDays: number;
  rune: string;
  color: string;
  stakesLine: string;
}

export interface Oath {
  presetId: string;
  title: string;
  description: string;
  durationDays: number;
  startDate: string;          // local date string, day the oath was sworn
  checkedInDates: string[];   // local date strings, one per successful check-in
  status: OathStatus;
  brokenOnDay?: number;       // which day (1-indexed) it broke on, if broken
  // Present and true on any oath created by the current swearOath(). Absent
  // (undefined) on oaths that were already sitting in storage before missed-
  // day enforcement existed — used by evaluateOathOnOpen() to tell "old,
  // never-enforced data" apart from "a normal new oath," so the one-time
  // grandfather pass only applies to genuinely legacy oaths, not to every
  // fresh install's very first evaluation.
  enforced?: boolean;
}

export const OATH_PRESETS: OathPreset[] = [
  {
    id: 'iron90',
    title: '90 Days of Iron',
    description: 'Train every day for 90 days straight. No exceptions, no excuses.',
    durationDays: 90,
    rune: 'ᚦ',
    color: '#E05050',
    stakesLine: 'Break this, and your crew will know.',
  },
  {
    id: 'forge30',
    title: 'The Forge Calls',
    description: 'Train every day for 30 days straight.',
    durationDays: 30,
    rune: 'ᚱ',
    color: '#E08838',
    stakesLine: 'The forge cools fast for warriors who quit.',
  },
  {
    id: 'longfast30',
    title: 'The Long Fast',
    description: 'No alcohol for 30 days. The mind stays sharp; the body stays whole.',
    durationDays: 30,
    rune: 'ᛇ',
    color: '#5BA3C7',
    stakesLine: "A warrior's resolve is tested in what he refuses.",
  },
  {
    id: 'skald30',
    title: "Skald's Discipline",
    description: 'Read every day for 30 days. Wisdom is also a weapon.',
    durationDays: 30,
    rune: 'ᛗ',
    color: '#8B6FD4',
    stakesLine: 'The mind that stops sharpening starts to dull.',
  },
  {
    id: 'silent14',
    title: 'Silent Strength',
    description: "No complaining for 14 days — not aloud, not in your own mind.",
    durationDays: 14,
    rune: 'ᛋ',
    color: '#7A8B7A',
    stakesLine: 'Easy to swear. Hard to keep. That is the point.',
  },
];

const ACTIVE_OATH_KEY = 'active_oath';
const OATH_HISTORY_KEY = 'oath_history';

export async function getActiveOath(): Promise<Oath | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_OATH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Same as getActiveOath(), but with a recovery step: if local storage has
// no oath, and the user is in a crew, check whether Supabase has a mirrored
// active oath for THIS device (pushOathToCrew already writes one on every
// swear/check-in). If so, treat that as the source of truth and restore it
// locally.
//
// This exists because the oath's real source of truth is local AsyncStorage
// only — the crew_oaths table is a write-only mirror for crewmates to see,
// never read back for the owner's own device. If local storage is ever
// cleared (most commonly: reinstalling the app during development, which
// can create a fresh sandbox container even with the same bundle ID, since
// a different code-signing/provisioning identity is enough for iOS to treat
// it as a new install), the oath silently vanishes even though a perfectly
// good copy already exists in Supabase. This function is the fix: it makes
// crew members' oaths self-healing across that kind of local data loss.
// Non-crew users have no remote copy to recover from and are unaffected —
// this simply falls through to the same null result getActiveOath() would
// have given them.
export async function getActiveOathWithRecovery(): Promise<Oath | null> {
  const local = await getActiveOath();
  if (local) return local;

  try {
    const crewId = await AsyncStorage.getItem('valhalla_crew_id');
    if (!crewId) return null; // not in a crew — nothing to recover from

    const deviceId = await getDeviceId();
    const { data, error } = await supabase
      .from('crew_oaths')
      .select('*')
      .eq('crew_id', crewId)
      .eq('device_id', deviceId)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !data) return null;

    const preset = OATH_PRESETS.find(p => p.id === data.preset_id);

    const recovered: Oath = {
      presetId: data.preset_id,
      title: data.title,
      description: preset?.description ?? '',
      durationDays: data.duration_days,
      startDate: data.start_date,
      checkedInDates: data.checked_in_dates ?? [],
      status: data.status,
    };

    // Write it back locally so every subsequent call (including
    // evaluateOathOnOpen, checkInOath, etc.) reads a normal local oath
    // from here on — recovery only needs to happen once per data loss.
    await AsyncStorage.setItem(ACTIVE_OATH_KEY, JSON.stringify(recovered));
    return recovered;
  } catch (e) {
    return null;
  }
}

export async function swearOath(preset: OathPreset, warriorName: string = 'Warrior'): Promise<Oath> {
  const oath: Oath = {
    presetId: preset.id,
    title: preset.title,
    description: preset.description,
    durationDays: preset.durationDays,
    startDate: getLocalDateString(),
    checkedInDates: [],
    status: 'active',
    enforced: true,
  };
  await AsyncStorage.setItem(ACTIVE_OATH_KEY, JSON.stringify(oath));
  pushOathToCrew(oath, warriorName); // fire-and-forget — never blocks the local write
  return oath;
}

// Checks the active oath against today's date. If a day was missed (more
// than one calendar day since the last check-in, or since the start date
// if no check-ins yet), marks the oath as broken and archives it. Call
// this once per app open, same pattern as checkStreakOnOpen() — it should
// run BEFORE the user has a chance to check in today, so a missed day is
// caught honestly rather than papered over by a same-day check-in.
//
// IMPORTANT: any oath missing the `enforced` flag is legacy data that
// existed before missed-day enforcement was wired into app startup. Such
// an oath is grandfathered exactly once — its startDate is reset to today
// and it's marked enforced, rather than being judged against a gap that
// was never actually being checked while it accumulated. This is checked
// per-oath (via the `enforced` field), not per-device, specifically so a
// brand-new oath sworn by a fresh install — which is always created with
// enforced: true by swearOath() — is never accidentally grandfathered on
// its own first evaluation; only genuinely pre-existing legacy oaths are.
export async function evaluateOathOnOpen(warriorName: string = 'Warrior'): Promise<Oath | null> {
  const oath = await getActiveOathWithRecovery();
  if (!oath || oath.status !== 'active') return oath;

  if (!oath.enforced) {
    const today = getLocalDateString();
    const grandfathered: Oath = { ...oath, startDate: today, enforced: true };
    await AsyncStorage.setItem(ACTIVE_OATH_KEY, JSON.stringify(grandfathered));
    return grandfathered;
  }

  const today = getLocalDateString();
  const lastDate = oath.checkedInDates.length > 0
    ? oath.checkedInDates[oath.checkedInDates.length - 1]
    : oath.startDate;

  // Already checked in today, or the oath just started today — nothing to evaluate yet.
  if (lastDate === today) return oath;

  const lastMidnight = parseLocalDateString(lastDate);
  const todayMidnight = parseLocalDateString(today);
  const gap = daysBetween(lastMidnight, todayMidnight);

  // gap === 1 means yesterday was the last check-in (or start day) — still
  // on track, today simply hasn't been checked in yet.
  if (gap <= 1) return oath;

  // A real day was missed. The oath breaks.
  const brokenOnDay = oath.checkedInDates.length + 1;
  const broken: Oath = { ...oath, status: 'broken', brokenOnDay };
  await archiveOath(broken);
  await AsyncStorage.removeItem(ACTIVE_OATH_KEY);
  pushOathToCrew(broken, warriorName); // let the crew see the broken status too
  return broken;
}

// Records today's check-in. Returns the updated oath, marking it fulfilled
// if this check-in completes the required duration.
export async function checkInOath(warriorName: string = 'Warrior'): Promise<Oath | null> {
  const oath = await getActiveOathWithRecovery();
  if (!oath || oath.status !== 'active') return oath;

  const today = getLocalDateString();
  if (oath.checkedInDates.includes(today)) return oath; // already checked in today

  const updatedDates = [...oath.checkedInDates, today];
  const isFulfilled = updatedDates.length >= oath.durationDays;

  const updated: Oath = {
    ...oath,
    checkedInDates: updatedDates,
    status: isFulfilled ? 'fulfilled' : 'active',
  };

  if (isFulfilled) {
    await archiveOath(updated);
    await AsyncStorage.removeItem(ACTIVE_OATH_KEY);
  } else {
    await AsyncStorage.setItem(ACTIVE_OATH_KEY, JSON.stringify(updated));
  }

  pushOathToCrew(updated, warriorName); // fire-and-forget — never blocks the local write
  return updated;
}

export async function abandonOath(warriorName: string = 'Warrior'): Promise<void> {
  const oath = await getActiveOathWithRecovery();
  if (oath) {
    const broken: Oath = { ...oath, status: 'broken', brokenOnDay: oath.checkedInDates.length + 1 };
    await archiveOath(broken);
    pushOathToCrew(broken, warriorName);
  }
  await AsyncStorage.removeItem(ACTIVE_OATH_KEY);
}

async function archiveOath(oath: Oath): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(OATH_HISTORY_KEY);
    const history: Oath[] = raw ? JSON.parse(raw) : [];
    history.push(oath);
    await AsyncStorage.setItem(OATH_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {}
}

export async function getOathHistory(): Promise<Oath[]> {
  try {
    const raw = await AsyncStorage.getItem(OATH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function getOathDayCount(oath: Oath): number {
  return oath.checkedInDates.length;
}

export function getOathProgress(oath: Oath): number {
  return Math.min(1, oath.checkedInDates.length / oath.durationDays);
}

// ── Crew sync ────────────────────────────────────────────────
// Pushes the local active oath (or its broken/fulfilled final state) to
// Supabase so crewmates can see it. This is purely additive on top of the
// local AsyncStorage system, which remains the source of truth for the
// user's own device — every call here is wrapped so that if Supabase is
// unreachable for any reason, the local oath flow continues working
// exactly as it does today, completely unaffected.
export interface CrewOath {
  id: string;
  crew_id: string;
  device_id: string;
  warrior_name: string;
  preset_id: string;
  title: string;
  duration_days: number;
  start_date: string;
  checked_in_dates: string[];
  status: OathStatus;
  broken_on_day: number | null;
  updated_at: string;
}

export async function pushOathToCrew(oath: Oath, warriorName: string): Promise<void> {
  try {
    const crewId = await AsyncStorage.getItem('valhalla_crew_id');
    if (!crewId) return; // not in a crew — nothing to push

    const deviceId = await getDeviceId();

    await supabase
      .from('crew_oaths')
      .upsert(
        {
          crew_id: crewId,
          device_id: deviceId,
          warrior_name: warriorName,
          preset_id: oath.presetId,
          title: oath.title,
          duration_days: oath.durationDays,
          start_date: oath.startDate,
          checked_in_dates: oath.checkedInDates,
          status: oath.status,
          broken_on_day: oath.brokenOnDay ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'crew_id,device_id' },
      );
  } catch (e) {
    // Sync failures are silent by design — the local oath is unaffected.
  }
}

export async function getCrewOaths(crewId: string): Promise<CrewOath[]> {
  try {
    const { data, error } = await supabase
      .from('crew_oaths')
      .select('*')
      .eq('crew_id', crewId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (error || !data) return [];
    return data;
  } catch (e) {
    return [];
  }
}

export function subscribeToCrewOaths(
  crewId: string,
  onUpdate: (oaths: CrewOath[]) => void,
) {
  const channel = supabase
    .channel(`crew_oaths:${crewId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'crew_oaths',
        filter: `crew_id=eq.${crewId}`,
      },
      async () => {
        const oaths = await getCrewOaths(crewId);
        onUpdate(oaths);
      }
    )
    .subscribe();

  return channel;
}