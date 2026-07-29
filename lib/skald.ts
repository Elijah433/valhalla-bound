import {
  getSagaEntryForDate,
  insertSagaEntry,
  getSagaEntryCount,
  getEpicForCount,
  insertEpic,
  getAllSagaEntries,
  getRecentSagaEntries,
  cleanSagaText,
} from '@/lib/db';
import { getRank } from '@/constants/ranks';

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY;
// If Hermes AI (TLevels-side) already has a shared Gemini endpoint constant,
// point this at the same one instead of duplicating the model version here.
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const WORKOUT_LABELS: Record<string, string> = {
  strength: 'strength training',
  endurance: 'an endurance trial',
  combat: 'combat drills',
  recovery: 'recovery rites',
};

// A rotating cast of Norse mythological touchstones the skald can reach for
// — Odin, the Norns, Yggdrasil, Ragnarök, Sleipnir, ravens, wolves, etc.
// Passing a random handful each time (rather than leaving it fully open)
// steers the model away from defaulting to the same one or two references
// (it leaned hard on "the forge" before) without hand-scripting every line.
const MYTHIC_TOUCHSTONES = [
  'Huginn and Muninn, Odin\'s ravens, who carry word of deeds to Asgard',
  'the Norns at the well of Urd, who weave fate into the roots of Yggdrasil',
  'Sleipnir, the eight-legged steed who outpaces all mortal roads',
  'the wolves Skoll and Hati, ever hunting the sun and moon',
  'the Bifrost, the burning bridge that only the worthy may cross',
  'Mimir\'s well, where wisdom is bought at great cost',
  'the einherjar of Valhalla, who feast and battle in preparation for Ragnarök',
  'the world tree Yggdrasil, whose roots and branches bind all nine realms',
  'Freyja\'s hall of Fólkvangr, where half the slain find rest',
  'the runes carved by Odin upon the World Tree, won through sacrifice',
];

function pickTouchstones(n: number): string[] {
  const shuffled = [...MYTHIC_TOUCHSTONES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Makes a single attempt against the Gemini API. Returns null on any
// failure (missing key, network error, non-2xx response) so the caller
// can decide whether to retry.
async function callGeminiOnce(prompt: string): Promise<{ text: string | null; status: number | null }> {
  // TEMP: reintroduced for one quick diagnostic pass since we're on
  // Simulator with DevTools attached right now. Remove once confirmed.
  console.log('[Skald] key present?', !!GEMINI_KEY);
  if (!GEMINI_KEY) return { text: null, status: null };
  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    console.log('[Skald] status:', res.status, res.ok);
    if (!res.ok) {
      const errBody = await res.text();
      console.log('[Skald] error body:', errBody);
      return { text: null, status: res.status };
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('[Skald] got text?', !!text);
    return { text: typeof text === 'string' ? text.trim() : null, status: res.status };
  } catch (e) {
    console.log('[Skald] fetch threw:', e);
    return { text: null, status: null };
  }
}

// Wraps callGeminiOnce() with a single retry after a short delay, since
// Gemini occasionally returns a transient 503 ("model overloaded, try
// again") that has nothing to do with our request — it clears up on its
// own within seconds most of the time. Chronicle only calls this once a
// day, so a brief retry is cheap insurance against losing that day's
// entry to a passing server hiccup, rather than giving up immediately.
async function callGemini(prompt: string): Promise<string | null> {
  const first = await callGeminiOnce(prompt);
  if (first.text) return first.text;

  if (first.status === 503) {
    await sleep(2500);
    const retry = await callGeminiOnce(prompt);
    if (retry.text) return retry.text;
  }

  return null;
}

// Builds a short recap of the most recent entries so the new entry can
// continue the ongoing story rather than reading like an isolated blurb.
// Capped at 3 prior entries — enough for local continuity without bloating
// the prompt (and therefore the token cost) as the saga grows over time.
function buildRecentContext(): string {
  const recent = getRecentSagaEntries(3); // newest first
  if (recent.length === 0) return '';
  const oldestFirst = [...recent].reverse();
  const lines = oldestFirst.map(e => `Day ${e.streak_at_time}: ${e.entry}`).join('\n');
  return `For continuity, here is what has been chronicled so far, oldest first:\n${lines}\n\nContinue the saga from here — do not repeat these events, and do not restart the story. Move it forward. Vary your sentence structure and imagery from the entries above — do not reuse the same phrases, metaphors, or sentence openings twice in a row.\n\n`;
}

/**
 * Generates today's Chronicle entry — but ONLY if one doesn't already exist.
 * This is the cost guard: getSagaEntryForDate() is checked first, so no
 * matter how many times recordWorkout() calls this in a single day, Gemini
 * only ever gets hit once (plus at most one automatic retry on a transient
 * 503). Safe to call fire-and-forget; never throws.
 */
export async function generateSagaEntry(
  name: string,
  workoutType: string,
  streak: number,
  totalXP: number
): Promise<void> {
  try {
    const today = getLocalDateString();

    const existing = getSagaEntryForDate(today);
    if (existing) return; // already generated today — no API call

    const rank = getRank(totalXP);
    const workoutLabel = WORKOUT_LABELS[workoutType] ?? workoutType;
    const recentContext = buildRecentContext();
    const touchstones = pickTouchstones(3).map(t => `- ${t}`).join('\n');

    // This entry's position in the overall saga — a near-zero-cost addition
    // (a handful of extra tokens) that lets the model gesture at the arc of
    // the whole journey even though it only sees the last 3 entries in
    // full. "Entry #47" reads very differently than "entry #3."
    const entryNumber = getSagaEntryCount() + 1;

    const prompt = `You are a Norse skald recording the ongoing, continuous saga of a single warrior's journey toward Valhalla — not a series of disconnected daily notes, but one unfolding epic told a few lines at a time, growing more legendary with every entry.

Write your response in English, in the style of an epic Old Norse saga translation (like the Bellows translation of the Hávamál) — archaic, weighty, carved-in-stone prose that a reader would be proud to see written about themselves. Do not write in Old Norse, Icelandic, or any language other than English. No modern language, no motivational clichés, no generic fitness-app phrasing.

You may optionally weave in ONE of the following mythological touchstones if it genuinely fits — do not force it, and do not use more than one:
${touchstones}

Vary your imagery and sentence rhythm from entry to entry. Do not lean on the same handful of images (the forge, iron, stone) every time — draw from the wider well of saga imagery: weather, animals, the sea, weapons, fate, kinship, hunger, cold, fire, blood, oaths, omens.

This is chronicle entry #${entryNumber} in ${name}'s saga.

${recentContext}Today's entry: ${name} trained ${workoutLabel} today. It is day ${streak} of their unbroken oath. They have earned ${totalXP} Valor in total. Their rank is ${rank.title}. Write exactly 2-3 sentences that continue their saga forward with real weight and momentum — reference their growing strength, their advancing rank, the length of their oath, or their nearing destiny in Valhalla where fitting, so each entry feels like the next verse of one long, escalating legend rather than a standalone moment. Make it feel like something worth reading again.`;

    const entryText = await callGemini(prompt);
    if (!entryText) return;

    const cleanedEntry = cleanSagaText(entryText);
    if (!cleanedEntry) return;

    // Belt-and-suspenders re-check right before insert, in case two calls
    // both passed the check above before either had written. The UNIQUE
    // constraint + ON CONFLICT DO NOTHING in insertSagaEntry() is the real
    // backstop that prevents a duplicate row either way.
    if (getSagaEntryForDate(today)) return;

    insertSagaEntry(today, cleanedEntry, workoutType, totalXP, streak);

    maybeGenerateEpic(name);
  } catch (e) {
    // Fire-and-forget: a saga generation failure must never affect workout logging.
  }
}

/**
 * Fires only when the entry count crosses a multiple of 100 (100, 200, 300…).
 * This is a separate, rare event from the daily entry call above — it does
 * NOT count against the "one Gemini call per day" budget since it happens
 * once per 100 workouts logged, not once per day.
 */
async function maybeGenerateEpic(name: string): Promise<void> {
  try {
    const count = getSagaEntryCount();
    if (count < 100 || count % 100 !== 0) return;
    if (getEpicForCount(count)) return;

    const entries = getAllSagaEntries().slice(0, 100);
    const condensed = entries.map(e => `Day ${e.streak_at_time}: ${e.entry}`).join('\n');

    const prompt = `You are a Norse skald tasked with composing the full epic saga of the warrior ${name}, drawn from ${entries.length} recorded daily deeds that trace their entire journey toward Valhalla. Write your response in English. Here are the daily chronicle entries, oldest first:\n\n${condensed}\n\nWeave these into a single continuous epic saga of 600-800 words, written in English in the style of an epic Old Norse saga translation (like the Bellows translation of the Hávamál) — structured as one cohesive narrative arc from ${name}'s earliest days of the oath through to where they now stand, building toward their destiny in Valhalla. This is not a list of events — it is one story, with rising stakes, real emotional weight, and a growing sense of legend, the kind of saga a warrior would be proud to have carved about them. Draw on the full range of saga imagery — weather, sea, blood, fate, kinship, omens, beasts, weapons — not just fire and stone. Write as if carving ${name}'s legend into stone for all eternity, in English prose with an archaic, saga-like tone. No modern language. No motivational clichés. Do not write in Old Norse, Icelandic, or any language other than English.`;

    const epicText = await callGemini(prompt);
    if (!epicText) return;

    const cleanedEpic = cleanSagaText(epicText);
    if (!cleanedEpic) return;

    insertEpic(count, cleanedEpic);
  } catch (e) {
    // Fire-and-forget
  }
}