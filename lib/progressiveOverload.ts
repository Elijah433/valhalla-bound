import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSessionsForExercise } from '@/lib/db';
import { estimatedOneRepMax } from '@/lib/oneRepMax';

export type OverloadSuggestionType = 'more_reps' | 'extra_set' | 'reduce_rest' | 'deload' | 'decline';

export interface OverloadSuggestion {
  type: OverloadSuggestionType;
  message: string;
}

// Only real, data-backed levers are ever suggested — no tempo or range-
// of-motion advice, since nothing in this app tracks either of those.
const MIN_SESSIONS_FOR_PATTERN = 3;
const REP_RANGE_LOW = 8;
const REP_RANGE_HIGH = 12;

// Sessions further apart than this aren't a real stall, just infrequent
// training — see the comment on the date-span check below for why this
// matters.
const MAX_DAYS_SPAN_FOR_PLATEAU = 21;

// Using estimated 1RM (weight × reps combined into one number) instead of
// comparing weight and reps separately means a real trade-off — like
// dropping from 135×8 to 140×6 — reads correctly as roughly flat effort
// rather than looking like unrelated "reps went down" and "weight went
// up" signals that cancel out confusingly.
const PROGRESS_THRESHOLD = 0.03; // 3%+ higher than recent average = real progress
const DECLINE_THRESHOLD = 0.05;  // 5%+ lower than recent average = genuine decline, not just noise

function parseUtcTimestamp(timestamp: string): Date {
  const isoish = timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T') + 'Z';
  return new Date(isoish);
}

// Which levers make sense to try, and in what order, depends on where the
// person's reps already sit — suggesting "get one more rep" to someone
// already doing 12 reps doesn't make sense as a starting point, so the
// escalation path itself adapts to the rep range rather than always
// starting from the same first lever for everyone.
function getEscalationOrder(avgReps: number): OverloadSuggestionType[] {
  if (avgReps < REP_RANGE_LOW) return ['more_reps', 'extra_set', 'reduce_rest', 'deload'];
  if (avgReps >= REP_RANGE_HIGH) return ['reduce_rest', 'deload'];
  return ['extra_set', 'reduce_rest', 'deload'];
}

interface StoredProgress {
  level: number;
  score: number;   // the estimated 1RM at the time this level was suggested
  orderKey: string; // identifies which escalation path was in use
}

async function getStoredProgress(exerciseId: string): Promise<StoredProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(`overload_progress_${exerciseId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

async function setStoredProgress(exerciseId: string, progress: StoredProgress) {
  try {
    await AsyncStorage.setItem(`overload_progress_${exerciseId}`, JSON.stringify(progress));
  } catch (e) {}
}

function buildMessage(
  type: OverloadSuggestionType,
  exerciseName: string,
  weight: number,
  reps: number,
  sessionCount: number,
  isEscalation: boolean
): string {
  const stillPrefix = isEscalation ? 'Still holding at the same level. ' : '';

  switch (type) {
    case 'more_reps':
      return `${exerciseName} has held at ${weight} lbs × ${reps} for ${sessionCount} sessions. ${stillPrefix}Try pushing for a rep or two more at the same weight before adding load.`;
    case 'extra_set':
      return `${exerciseName} has held at ${weight} lbs × ${reps} for ${sessionCount} sessions. ${stillPrefix}Try adding one extra set today instead of more weight.`;
    case 'reduce_rest':
      return `${exerciseName} has held steady at ${weight} lbs with strong rep counts. ${stillPrefix}Try cutting your rest by 15-20 seconds to raise intensity instead.`;
    case 'deload':
      return `${exerciseName} hasn't moved even after adjusting reps, sets, and rest. This might be a good week to back off about 10% and let your body recover before pushing again.`;
    default:
      return '';
  }
}

// Looks at the last few sessions for ONE exercise and determines what's
// actually happening: real progress (stay silent), a genuine decline
// (different message than a plateau — worth naming honestly rather than
// giving generic "try harder" advice), a genuine plateau close enough
// together in time to mean something, or nothing conclusive yet. When a
// plateau IS detected, it also remembers what was suggested last time via
// AsyncStorage, and escalates to the next real lever if the same stall
// persisted past that suggestion rather than repeating advice that
// evidently hasn't worked.
export async function analyzeProgressiveOverload(
  exerciseId: string,
  exerciseName: string
): Promise<OverloadSuggestion | null> {
  const sessions = getSessionsForExercise(exerciseId, MIN_SESSIONS_FOR_PATTERN)
    .filter(s => s.sets && s.sets.length > 0); // guard against a just-created session with no sets yet
  if (sessions.length < MIN_SESSIONS_FOR_PATTERN) return null;

  const mostRecentDate = parseUtcTimestamp(sessions[0].created_at);
  const oldestDate = parseUtcTimestamp(sessions[sessions.length - 1].created_at);
  const daySpan = (mostRecentDate.getTime() - oldestDate.getTime()) / 86400000;
  if (daySpan > MAX_DAYS_SPAN_FOR_PLATEAU) return null;

  function topSetOf(session: typeof sessions[0]) {
    return session.sets.reduce((best, set) => {
      if (set.weight > best.weight) return set;
      if (set.weight === best.weight && set.reps > best.reps) return set;
      return best;
    }, session.sets[0]);
  }

  const topSets = sessions.map(topSetOf);
  const scores = topSets.map(s => estimatedOneRepMax(s.weight, s.reps));
  const mostRecent = topSets[0];
  const mostRecentScore = scores[0];
  const olderAvgScore = scores.slice(1).reduce((sum, s) => sum + s, 0) / (scores.length - 1);

  // Real progress — the score-based comparison catches trade-offs a
  // simple "did weight OR reps go up" check would miss or misread.
  if (mostRecentScore > olderAvgScore * (1 + PROGRESS_THRESHOLD)) {
    await AsyncStorage.removeItem(`overload_progress_${exerciseId}`).catch(() => {});
    return null;
  }

  // Genuine decline — worth naming honestly rather than giving the same
  // "add a rep" advice that doesn't fit what's actually happening.
  if (mostRecentScore < olderAvgScore * (1 - DECLINE_THRESHOLD)) {
    return {
      type: 'decline',
      message: `${exerciseName} has actually trended down over your last ${sessions.length} sessions, not just held steady. Worth considering whether recovery, sleep, or stress might be playing a role before pushing harder.`,
    };
  }

  // Plateau — figure out which lever to suggest, escalating past
  // whatever was already tried and evidently hasn't worked.
  const avgReps = topSets.reduce((sum, s) => sum + s.reps, 0) / topSets.length;
  const order = getEscalationOrder(avgReps);
  const orderKey = order.join('|');
  const scoreRounded = Math.round(mostRecentScore);

  const stored = await getStoredProgress(exerciseId);
  let level = 0;
  let isEscalation = false;

  if (stored && stored.orderKey === orderKey && Math.abs(stored.score - scoreRounded) < 1) {
    // Same plateau, same score, as when we last suggested something —
    // move to the next real lever instead of repeating the same advice.
    level = Math.min(stored.level + 1, order.length - 1);
    isEscalation = level > 0;
  }

  await setStoredProgress(exerciseId, { level, score: scoreRounded, orderKey });

  const type = order[level];
  return {
    type,
    message: buildMessage(type, exerciseName, mostRecent.weight, mostRecent.reps, sessions.length, isEscalation),
  };
}