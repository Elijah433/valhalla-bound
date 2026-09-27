import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('valhalla.db');
  }
  return _db;
}

// ── Local date helpers ──────────────────────────────────────
// IMPORTANT: Date.toISOString() always returns UTC, not the device's local
// time. For a user in the US, that means anything logged in the evening can
// get tagged with "tomorrow's" UTC date, which breaks streaks, "today's"
// workout/meal lists, and any other day-boundary logic. These helpers build
// the date string from local date parts instead, so "today" always matches
// what the user actually sees on their calendar.
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// SQLite's created_at columns are stored via datetime('now'), which is UTC.
// To compare a UTC timestamp string ("YYYY-MM-DD HH:MM:SS") against a local
// "today", we convert it to a local Date first, then to a local date string.
function utcTimestampToLocalDateString(utcTimestamp: string): string {
  // SQLite's datetime('now') format is "YYYY-MM-DD HH:MM:SS" with no
  // timezone marker — append "Z" so JS parses it as UTC, not local.
  const isoish = utcTimestamp.includes('T') ? utcTimestamp : utcTimestamp.replace(' ', 'T') + 'Z';
  const d = new Date(isoish);
  return getLocalDateString(d);
}

export async function initDb() {
  const db = getDb();

  db.execSync(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      xp_earned INTEGER NOT NULL,
      notes TEXT,
      duration_minutes INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS warrior (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL DEFAULT 'Warrior',
      total_xp INTEGER NOT NULL DEFAULT 0,
      streak_days INTEGER NOT NULL DEFAULT 0,
      last_workout_date TEXT,
      is_pro INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS crew_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '👤',
      miles REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS strength_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS strength_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      set_number INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight REAL NOT NULL,
      is_pr INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES strength_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS personal_records (
      exercise_id TEXT PRIMARY KEY,
      exercise_name TEXT NOT NULL,
      best_weight REAL NOT NULL,
      best_reps INTEGER NOT NULL,
      achieved_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      muscles TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'custom',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS macro_goals (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      calories INTEGER NOT NULL DEFAULT 2500,
      protein INTEGER NOT NULL DEFAULT 180,
      carbs INTEGER NOT NULL DEFAULT 250,
      fat INTEGER NOT NULL DEFAULT 80,
      water_goal_oz INTEGER NOT NULL DEFAULT 128
    );

    CREATE TABLE IF NOT EXISTS meal_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_type TEXT NOT NULL,
      food_name TEXT NOT NULL,
      calories INTEGER NOT NULL DEFAULT 0,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      serving_size TEXT NOT NULL DEFAULT '1 serving',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saga_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      entry TEXT NOT NULL,
      workout_types TEXT NOT NULL,
      xp_at_time INTEGER NOT NULL,
      streak_at_time INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saga_epics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_count INTEGER UNIQUE NOT NULL,
      epic_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weight REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'lbs',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS progress_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      photo_uri TEXT NOT NULL,
      weight_at_time REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS raven_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      mood TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS unlocked_achievements (
      id TEXT PRIMARY KEY,
      unlocked_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO warrior (id, name, total_xp, streak_days)
    VALUES (1, 'Warrior', 0, 0);

    INSERT OR IGNORE INTO macro_goals (id, calories, protein, carbs, fat)
    VALUES (1, 2500, 180, 250, 80);
  `);

  // Migration: custom_exercises gained a `category` column after some
  // installs already created the table without it. ALTER TABLE ADD COLUMN
  // fails if the column already exists, so this is wrapped defensively and
  // only ever needs to actually run once per install.
  try {
    db.execSync(`ALTER TABLE custom_exercises ADD COLUMN category TEXT NOT NULL DEFAULT 'custom';`);
  } catch (e) {
    // Column already exists — expected on every launch after the first.
  }

  // Migration: macro_goals gained a `water_goal_oz` column after some
  // installs already had the table without it — same defensive pattern
  // as the migration above.
  try {
    db.execSync(`ALTER TABLE macro_goals ADD COLUMN water_goal_oz INTEGER NOT NULL DEFAULT 128;`);
  } catch (e) {
    // Column already exists — expected on every launch after the first.
  }
}

// ── Warrior ──────────────────────────────────────────────
export interface Warrior {
  id: number;
  name: string;
  total_xp: number;
  streak_days: number;
  last_workout_date: string | null;
  is_pro: number;
}

export function getWarrior(): Warrior | null {
  const db = getDb();
  return db.getFirstSync<Warrior>('SELECT * FROM warrior WHERE id = 1') ?? null;
}

export function updateWarriorName(name: string) {
  const db = getDb();
  db.runSync('UPDATE warrior SET name = ? WHERE id = 1', [name]);
}

export function addXP(amount: number) {
  const db = getDb();
  db.runSync('UPDATE warrior SET total_xp = total_xp + ? WHERE id = 1', [amount]);
}

export function updateStreak() {
  const db = getDb();
  const warrior = getWarrior();
  if (!warrior) return;

  // Use the device's LOCAL calendar day, not UTC — otherwise an evening
  // workout can get tagged with tomorrow's UTC date and silently eat the
  // next day's streak credit (or vice versa, depending on timezone).
  const today = getLocalDateString();
  const last = warrior.last_workout_date;

  if (last === today) return;

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateString(yesterdayDate);

  const newStreak = last === yesterday ? warrior.streak_days + 1 : 1;

  db.runSync(
    'UPDATE warrior SET streak_days = ?, last_workout_date = ? WHERE id = 1',
    [newStreak, today]
  );
}

export function setWarriorPro(isPro: boolean) {
  const db = getDb();
  db.runSync('UPDATE warrior SET is_pro = ? WHERE id = 1', [isPro ? 1 : 0]);
}

// ── Workouts ──────────────────────────────────────────────
export interface Workout {
  id: number;
  type: string;
  xp_earned: number;
  notes: string | null;
  duration_minutes: number | null;
  created_at: string;
}

export function logWorkout(
  type: string,
  xpEarned: number,
  notes?: string,
  durationMinutes?: number
): number {
  const db = getDb();
  const result = db.runSync(
    'INSERT INTO workouts (type, xp_earned, notes, duration_minutes) VALUES (?, ?, ?, ?)',
    [type, xpEarned, notes ?? null, durationMinutes ?? null]
  );
  return result.lastInsertRowId;
}

export function getRecentWorkouts(limit = 20): Workout[] {
  const db = getDb();
  return db.getAllSync<Workout>(
    'SELECT * FROM workouts ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
}

export function getTodayWorkouts(): Workout[] {
  const db = getDb();
  // created_at is stored as a UTC timestamp by SQLite's datetime('now').
  // We can't just compare date(created_at) against a local "today" string —
  // that compares a UTC date against a local date, which is exactly the bug
  // we're fixing. Instead, pull everything from roughly the last 2 local
  // days (cheap upper bound) and filter precisely in JS using local time.
  const today = getLocalDateString();
  const all = db.getAllSync<Workout>(
    "SELECT * FROM workouts WHERE created_at >= datetime('now', '-2 days') ORDER BY created_at DESC"
  );
  return all.filter(w => utcTimestampToLocalDateString(w.created_at) === today);
}

export function getWorkoutCount(): number {
  const db = getDb();
  const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM workouts');
  return row?.count ?? 0;
}

// Real distance (from cardio_routes) is used per-workout wherever it
// exists — GPS-tracked runs and manually-typed distances alike. Any
// endurance workout logged without one (blank DISTANCE field, or logged
// before this feature existed) falls back to the old flat 3-mile estimate
// instead, so this total doesn't suddenly drop for existing data the
// moment real tracking ships — it just gets progressively more accurate
// as more real distances get logged going forward.
export function getTotalMiles(): number {
  const db = getDb();
  ensureCardioRoutesTable(db);
  const rows = db.getAllSync<{ distance_meters: number | null }>(
    `SELECT cr.distance_meters as distance_meters
     FROM workouts w
     LEFT JOIN cardio_routes cr ON cr.workout_id = w.id
     WHERE w.type = 'endurance'`
  );
  const METERS_PER_MILE = 1609.344;
  const totalMiles = rows.reduce(
    (sum, row) => sum + (row.distance_meters != null ? row.distance_meters / METERS_PER_MILE : 3),
    0
  );
  return Math.round(totalMiles * 10) / 10;
}

// ── Strength Sessions ──────────────────────────────────────────────
export interface StrengthSession {
  id: number;
  exercise_id: string;
  exercise_name: string;
  created_at: string;
}

export interface StrengthSet {
  id: number;
  session_id: number;
  set_number: number;
  reps: number;
  weight: number;
  is_pr: number;
  created_at: string;
}

export interface PersonalRecord {
  exercise_id: string;
  exercise_name: string;
  best_weight: number;
  best_reps: number;
  achieved_at: string;
}

export interface CustomExercise {
  id: string;
  name: string;
  muscles: string;
  category: string;
  created_at: string;
}

export function createStrengthSession(exerciseId: string, exerciseName: string): number {
  const db = getDb();
  const result = db.runSync(
    'INSERT INTO strength_sessions (exercise_id, exercise_name) VALUES (?, ?)',
    [exerciseId, exerciseName]
  );
  return result.lastInsertRowId;
}

export function addStrengthSet(
  sessionId: number,
  setNumber: number,
  reps: number,
  weight: number,
  isPR: boolean
): number {
  const db = getDb();
  const result = db.runSync(
    'INSERT INTO strength_sets (session_id, set_number, reps, weight, is_pr) VALUES (?, ?, ?, ?, ?)',
    [sessionId, setNumber, reps, weight, isPR ? 1 : 0]
  );
  return result.lastInsertRowId;
}

export function getSessionSets(sessionId: number): StrengthSet[] {
  const db = getDb();
  return db.getAllSync<StrengthSet>(
    'SELECT * FROM strength_sets WHERE session_id = ? ORDER BY set_number ASC',
    [sessionId]
  );
}

export function getPersonalRecord(exerciseId: string): PersonalRecord | null {
  const db = getDb();
  return db.getFirstSync<PersonalRecord>(
    'SELECT * FROM personal_records WHERE exercise_id = ?',
    [exerciseId]
  ) ?? null;
}

export function updatePersonalRecord(
  exerciseId: string,
  exerciseName: string,
  weight: number,
  reps: number
) {
  const db = getDb();
  db.runSync(
    `INSERT INTO personal_records (exercise_id, exercise_name, best_weight, best_reps, achieved_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(exercise_id) DO UPDATE SET
       best_weight = excluded.best_weight,
       best_reps = excluded.best_reps,
       achieved_at = excluded.achieved_at`,
    [exerciseId, exerciseName, weight, reps]
  );
}

export function checkAndUpdatePR(
  exerciseId: string,
  exerciseName: string,
  weight: number,
  reps: number
): boolean {
  const existing = getPersonalRecord(exerciseId);
  if (!existing || weight > existing.best_weight) {
    updatePersonalRecord(exerciseId, exerciseName, weight, reps);
    return true;
  }
  return false;
}

export function getAllPersonalRecords(): PersonalRecord[] {
  const db = getDb();
  return db.getAllSync<PersonalRecord>(
    'SELECT * FROM personal_records ORDER BY achieved_at DESC'
  );
}

export function getRecentStrengthSessions(limit = 20): (StrengthSession & { sets: StrengthSet[] })[] {
  const db = getDb();
  const sessions = db.getAllSync<StrengthSession>(
    'SELECT * FROM strength_sessions ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
  return sessions.map(s => ({
    ...s,
    sets: getSessionSets(s.id),
  }));
}

// Returns the most recent sessions for ONE specific exercise, most recent
// first — used by the Progressive Overload suggestion (needs to look at
// history for a single exercise, not the general recent-activity feed
// getRecentStrengthSessions() above provides). Skips sessions with zero
// sets logged (abandoned), same as other functions in this file.
export function getSessionsForExercise(
  exerciseId: string,
  limit: number = 4
): (StrengthSession & { sets: StrengthSet[] })[] {
  const db = getDb();
  const sessions = db.getAllSync<StrengthSession>(
    'SELECT * FROM strength_sessions WHERE exercise_id = ? ORDER BY created_at DESC LIMIT ?',
    [exerciseId, limit * 2] // pull extra in case some have zero sets
  );
  return sessions
    .map(s => ({ ...s, sets: getSessionSets(s.id) }))
    .filter(s => s.sets.length > 0)
    .slice(0, limit);
}

// ── Workout History (for the Profile → Workout History screen) ──────────
// Merges BOTH ways this app logs training into one per-day view: the
// generic `workouts` table (used for endurance/combat/recovery, and the
// XP/streak system) and the detailed `strength_sessions`/`strength_sets`
// tables (used for exercise-level strength logging). Without merging
// both, a day with only a run or recovery session logged would show up
// as blank, even though the user actually trained that day. Only returns
// days where something was actually logged — a 30+ day lookback showing
// every single rest day too would bury the days that matter in noise.
export interface DayHistoryEntry {
  date: string; // local YYYY-MM-DD
  workouts: Workout[];
  strengthSessions: (StrengthSession & { sets: StrengthSet[] })[];
}

export function getWorkoutHistory(daysBack: number = 60): DayHistoryEntry[] {
  const db = getDb();

  const allWorkouts = db.getAllSync<Workout>(
    `SELECT * FROM workouts WHERE created_at >= datetime('now', '-${daysBack + 1} days') ORDER BY created_at DESC`
  );
  const allSessions = db.getAllSync<StrengthSession>(
    `SELECT * FROM strength_sessions WHERE created_at >= datetime('now', '-${daysBack + 1} days') ORDER BY created_at DESC`
  );

  const byDate: Record<string, DayHistoryEntry> = {};
  function ensureDay(date: string): DayHistoryEntry {
    if (!byDate[date]) byDate[date] = { date, workouts: [], strengthSessions: [] };
    return byDate[date];
  }

  allWorkouts.forEach(w => {
    const date = utcTimestampToLocalDateString(w.created_at);
    ensureDay(date).workouts.push(w);
  });

  allSessions.forEach(s => {
    const date = utcTimestampToLocalDateString(s.created_at);
    const sets = getSessionSets(s.id);
    if (sets.length === 0) return; // session with no sets logged (abandoned) — skip
    ensureDay(date).strengthSessions.push({ ...s, sets });
  });

  return Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));
}

// After deleting a set or a whole session, the personal_records table can
// be left pointing at a PR that no longer actually exists in the data —
// e.g. deleting the one set that set that PR. This re-derives the true
// current best directly from whatever sets for that exercise actually
// remain, and either updates the record to match or removes it entirely
// if no sets are left at all. Called automatically by both delete
// functions below, so a stale PR is never something the caller has to
// remember to handle separately.
function recalculatePersonalRecord(exerciseId: string, exerciseName: string) {
  const db = getDb();
  const best = db.getFirstSync<{ weight: number; reps: number }>(
    `SELECT st.weight, st.reps FROM strength_sets st
     JOIN strength_sessions ss ON ss.id = st.session_id
     WHERE ss.exercise_id = ?
     ORDER BY st.weight DESC, st.reps DESC
     LIMIT 1`,
    [exerciseId]
  );

  if (best) {
    updatePersonalRecord(exerciseId, exerciseName, best.weight, best.reps);
  } else {
    // No sets remain at all for this exercise — the PR itself no longer
    // has any basis in real data, so remove it rather than leave a PR
    // "achieved" by nothing.
    db.runSync('DELETE FROM personal_records WHERE exercise_id = ?', [exerciseId]);
  }
}

// Deletes a single logged set (the "oops, wrong number" case while still
// actively logging, or cleaning up a past session). Automatically
// re-checks the PR for that set's exercise afterward — see
// recalculatePersonalRecord() above for why that matters.
export function deleteStrengthSet(setId: number): void {
  const db = getDb();
  const set = db.getFirstSync<StrengthSet & { exercise_id: string; exercise_name: string }>(
    `SELECT st.*, ss.exercise_id, ss.exercise_name FROM strength_sets st
     JOIN strength_sessions ss ON ss.id = st.session_id
     WHERE st.id = ?`,
    [setId]
  );
  if (!set) return;

  db.runSync('DELETE FROM strength_sets WHERE id = ?', [setId]);
  recalculatePersonalRecord(set.exercise_id, set.exercise_name);
}

// Deletes an entire past workout session and all of its sets, then
// re-checks the PR for that exercise the same way deleteStrengthSet() does.
export function deleteStrengthSession(sessionId: number): void {
  const db = getDb();
  const session = db.getFirstSync<StrengthSession>(
    'SELECT * FROM strength_sessions WHERE id = ?',
    [sessionId]
  );
  if (!session) return;

  db.runSync('DELETE FROM strength_sets WHERE session_id = ?', [sessionId]);
  db.runSync('DELETE FROM strength_sessions WHERE id = ?', [sessionId]);
  recalculatePersonalRecord(session.exercise_id, session.exercise_name);
}

// ── Recent Exercises (for the Exercise Picker's "Recently Forged" row) ──
// Returns the most recently trained DISTINCT exercises, each with the
// actual last set logged (weight × reps) from that most recent session —
// not just "you've done this before," but "here's exactly where you left
// off." Pulls a generous window of recent sessions and dedupes in JS
// (keeping only the first/most-recent occurrence per exercise_id) rather
// than a complex SQL window-function query, since personal workout volume
// is small enough that this stays fast and simple.
export interface RecentExerciseSummary {
  exerciseId: string;
  exerciseName: string;
  lastWeight: number;
  lastReps: number;
  sessionDate: string; // local YYYY-MM-DD
}

export function getRecentExercises(limit: number = 8): RecentExerciseSummary[] {
  const db = getDb();
  const sessions = db.getAllSync<StrengthSession>(
    'SELECT * FROM strength_sessions ORDER BY created_at DESC LIMIT 100'
  );

  const seen = new Set<string>();
  const result: RecentExerciseSummary[] = [];

  for (const session of sessions) {
    if (seen.has(session.exercise_id)) continue;
    const sets = getSessionSets(session.id);
    if (sets.length === 0) continue;
    const lastSet = sets[sets.length - 1];
    seen.add(session.exercise_id);
    result.push({
      exerciseId: session.exercise_id,
      exerciseName: session.exercise_name,
      lastWeight: lastSet.weight,
      lastReps: lastSet.reps,
      sessionDate: utcTimestampToLocalDateString(session.created_at),
    });
    if (result.length >= limit) break;
  }

  return result;
}

export function addCustomExercise(name: string, muscles: string, category: string = 'custom'): string {
  const db = getDb();
  const id = `custom_${Date.now()}`;
  db.runSync(
    'INSERT INTO custom_exercises (id, name, muscles, category) VALUES (?, ?, ?, ?)',
    [id, name, muscles, category]
  );
  return id;
}

export function getCustomExercises(): CustomExercise[] {
  const db = getDb();
  return db.getAllSync<CustomExercise>(
    'SELECT * FROM custom_exercises ORDER BY created_at DESC'
  );
}

// ── Mead Hall ──────────────────────────────────────────────
export interface MacroGoals {
  id: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water_goal_oz: number;
}

export interface MealLog {
  id: number;
  meal_type: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;
  created_at: string;
}

export interface DayMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function getMacroGoals(): MacroGoals {
  const db = getDb();
  return db.getFirstSync<MacroGoals>('SELECT * FROM macro_goals WHERE id = 1') ?? {
    id: 1, calories: 2500, protein: 180, carbs: 250, fat: 80, water_goal_oz: 128,
  };
}

export function updateMacroGoals(calories: number, protein: number, carbs: number, fat: number, waterGoalOz?: number) {
  const db = getDb();
  // If no water goal is passed (e.g. an older call site that doesn't know
  // about it yet), preserve whatever is already stored rather than
  // silently resetting it to a hardcoded default — a person's custom
  // water goal shouldn't get wiped out just because they updated their
  // calorie/macro targets from a screen that hasn't been updated to pass
  // the water value too.
  const resolvedWater = waterGoalOz ?? getMacroGoals().water_goal_oz;
  db.runSync(
    'UPDATE macro_goals SET calories = ?, protein = ?, carbs = ?, fat = ?, water_goal_oz = ? WHERE id = 1',
    [calories, protein, carbs, fat, resolvedWater]
  );
}

export function logMeal(
  mealType: string,
  foodName: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  servingSize: string
): number {
  const db = getDb();
  const result = db.runSync(
    `INSERT INTO meal_logs (meal_type, food_name, calories, protein, carbs, fat, serving_size)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [mealType, foodName, calories, protein, carbs, fat, servingSize]
  );
  return result.lastInsertRowId;
}

export function getTodayMeals(): MealLog[] {
  const db = getDb();
  // Same local-vs-UTC fix as getTodayWorkouts() — see the comment there.
  const today = getLocalDateString();
  const all = db.getAllSync<MealLog>(
    "SELECT * FROM meal_logs WHERE created_at >= datetime('now', '-2 days') ORDER BY created_at ASC"
  );
  return all.filter(m => utcTimestampToLocalDateString(m.created_at) === today);
}

export function getTodayMacros(): DayMacros {
  // Built from getTodayMeals() (already local-date-correct) rather than a
  // separate SQL date(created_at) comparison, so the two can never disagree.
  const meals = getTodayMeals();
  return meals.reduce(
    (totals, m) => ({
      calories: totals.calories + m.calories,
      protein: totals.protein + m.protein,
      carbs: totals.carbs + m.carbs,
      fat: totals.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function deleteMealLog(id: number) {
  const db = getDb();
  db.runSync('DELETE FROM meal_logs WHERE id = ?', [id]);
}

// Edits a logged meal's numbers directly (correcting a mistake) rather
// than requiring delete-and-re-add. food_name is included since a
// mislabeled entry is just as fixable as a wrong number.
export function updateMealLog(
  id: number,
  foodName: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number
) {
  const db = getDb();
  db.runSync(
    `UPDATE meal_logs SET food_name = ?, calories = ?, protein = ?, carbs = ?, fat = ? WHERE id = ?`,
    [foodName, calories, protein, carbs, fat, id]
  );
}
export function getMealsForDateRange(daysBack: number): { date: string; macros: DayMacros }[] {
  const db = getDb();
  const all = db.getAllSync<MealLog>(
    `SELECT * FROM meal_logs WHERE created_at >= datetime('now', '-${daysBack + 1} days') ORDER BY created_at ASC`
  );

  // Group by local date — same UTC->local conversion as getTodayMeals().
  const byDate: Record<string, DayMacros> = {};
  all.forEach(m => {
    const date = utcTimestampToLocalDateString(m.created_at);
    if (!byDate[date]) byDate[date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    byDate[date].calories += m.calories;
    byDate[date].protein += m.protein;
    byDate[date].carbs += m.carbs;
    byDate[date].fat += m.fat;
  });

  // Build an entry for every day in range, including days with no data.
  const result: { date: string; macros: DayMacros }[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    result.push({ date: dateStr, macros: byDate[dateStr] ?? { calories: 0, protein: 0, carbs: 0, fat: 0 } });
  }
  return result;
}

// ── Skald's Chronicle ──────────────────────────────────────
// Strips markdown artifacts Gemini sometimes adds on its own initiative —
// most commonly a leading "**Chronicle Entry #N**" title line, or stray
// "**bold**" markers scattered through the prose. Nothing in our prompt
// ever asks for a title or markdown; this is just occasional LLM habit
// leaking through. Used both at generation time (skald.ts, before insert,
// so new entries are clean) and at render time (sagas.tsx, home.tsx, so
// any already-stored entries with this artifact display correctly without
// needing a database migration or losing the entry).
export function cleanSagaText(text: string): string {
  return text
    .replace(/^\s*\*\*[^*]*\*\*\s*/, '') // strip one leading **title** line
    .replace(/\*\*/g, '')                 // strip any remaining bold markers
    .trim();
}

export interface SagaEntry {
  id: number;
  date: string;
  entry: string;
  workout_types: string;
  xp_at_time: number;
  streak_at_time: number;
  created_at: string;
}

export interface SagaEpic {
  id: number;
  entry_count: number;
  epic_text: string;
  created_at: string;
}

export function getSagaEntryForDate(date: string): SagaEntry | null {
  const db = getDb();
  return db.getFirstSync<SagaEntry>('SELECT * FROM saga_entries WHERE date = ?', [date]) ?? null;
}

export function insertSagaEntry(
  date: string,
  entry: string,
  workoutTypes: string,
  xpAtTime: number,
  streakAtTime: number
): number {
  const db = getDb();
  const result = db.runSync(
    `INSERT INTO saga_entries (date, entry, workout_types, xp_at_time, streak_at_time)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(date) DO NOTHING`,
    [date, entry, workoutTypes, xpAtTime, streakAtTime]
  );
  return result.lastInsertRowId;
}

export function getAllSagaEntries(): SagaEntry[] {
  const db = getDb();
  return db.getAllSync<SagaEntry>('SELECT * FROM saga_entries ORDER BY date DESC');
}

export function getRecentSagaEntries(limit = 7): SagaEntry[] {
  const db = getDb();
  return db.getAllSync<SagaEntry>('SELECT * FROM saga_entries ORDER BY date DESC LIMIT ?', [limit]);
}

export function getSagaEntryCount(): number {
  const db = getDb();
  const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM saga_entries');
  return row?.count ?? 0;
}

export function getEpicForCount(entryCount: number): SagaEpic | null {
  const db = getDb();
  return db.getFirstSync<SagaEpic>('SELECT * FROM saga_epics WHERE entry_count = ?', [entryCount]) ?? null;
}

export function insertEpic(entryCount: number, epicText: string): number {
  const db = getDb();
  const result = db.runSync(
    `INSERT INTO saga_epics (entry_count, epic_text) VALUES (?, ?) ON CONFLICT(entry_count) DO NOTHING`,
    [entryCount, epicText]
  );
  return result.lastInsertRowId;
}

export function getLatestEpic(): SagaEpic | null {
  const db = getDb();
  return db.getFirstSync<SagaEpic>('SELECT * FROM saga_epics ORDER BY entry_count DESC LIMIT 1') ?? null;
}

// ── Body Weight ──────────────────────────────────────────────
export interface WeightLog {
  id: number;
  weight: number;
  unit: string;
  created_at: string;
}

export interface WeightPoint {
  date: string;
  weight: number | null;
}

export function logWeight(weight: number, unit: string = 'lbs'): number {
  const db = getDb();
  const result = db.runSync(
    'INSERT INTO weight_logs (weight, unit) VALUES (?, ?)',
    [weight, unit]
  );
  return result.lastInsertRowId;
}

export function getLatestWeight(): WeightLog | null {
  const db = getDb();
  return db.getFirstSync<WeightLog>(
    'SELECT * FROM weight_logs ORDER BY created_at DESC LIMIT 1'
  ) ?? null;
}

export function deleteWeightLog(id: number) {
  const db = getDb();
  db.runSync('DELETE FROM weight_logs WHERE id = ?', [id]);
}

// Returns individual weight log ENTRIES with their real database ids —
// distinct from getWeightHistory(), which returns one aggregated point
// per calendar day (collapsing multiple same-day entries and losing the
// id needed to edit or delete a specific one). This is what a "recent
// entries" edit/delete list should read from instead.
export function getRecentWeightLogs(limit: number = 20): WeightLog[] {
  const db = getDb();
  return db.getAllSync<WeightLog>(
    'SELECT * FROM weight_logs ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
}

// Corrects a specific weight entry's value in place (e.g. a mistyped
// number) rather than requiring delete-and-re-log.
export function updateWeightLog(id: number, weight: number) {
  const db = getDb();
  db.runSync('UPDATE weight_logs SET weight = ? WHERE id = ?', [weight, id]);
}

// Returns one point per day for the last `daysBack` days, taking the LAST
// (most recent) weigh-in of each day if the user logged more than once.
// Days with no entry come back with weight: null so the trend line can
// show real gaps instead of a misleading flat/zero value — same pattern
// as getMealsForDateRange()'s day-filling approach.
export function getWeightHistory(daysBack: number = 30): WeightPoint[] {
  const db = getDb();
  const all = db.getAllSync<WeightLog>(
    `SELECT * FROM weight_logs WHERE created_at >= datetime('now', '-${daysBack + 1} days') ORDER BY created_at ASC`
  );

  const byDate: Record<string, number> = {};
  all.forEach(w => {
    const date = utcTimestampToLocalDateString(w.created_at);
    byDate[date] = w.weight; // later entries in the same day overwrite earlier ones
  });

  const result: WeightPoint[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    result.push({ date: dateStr, weight: byDate[dateStr] ?? null });
  }
  return result;
}

// Compares the most recent weigh-in against the earliest one within the
// window, so the Mead Hall can show "down 3.2 lbs this month" etc. Returns
// null if there isn't at least one entry near each end of the range to
// compare — a single data point can't show a trend.
export function getWeightChange(daysBack: number = 30): number | null {
  const history = getWeightHistory(daysBack);
  const points = history.filter(p => p.weight !== null) as { date: string; weight: number }[];
  if (points.length < 2) return null;
  return points[points.length - 1].weight - points[0].weight;
}

// ── Progress Photos ──────────────────────────────────────────
// Photos themselves are never touched here — this only tracks the local
// file path (photo_uri) SQLite. Actual file writes/deletes on disk happen
// in the UI layer (via expo-file-system), keeping this file's only concern
// the database record, same separation used everywhere else in this file.
export interface ProgressPhoto {
  id: number;
  photo_uri: string;
  weight_at_time: number | null;
  created_at: string;
}

export function addProgressPhoto(photoUri: string, weightAtTime: number | null = null): number {
  const db = getDb();
  const result = db.runSync(
    'INSERT INTO progress_photos (photo_uri, weight_at_time) VALUES (?, ?)',
    [photoUri, weightAtTime]
  );
  return result.lastInsertRowId;
}

export function getProgressPhotos(limit: number = 50): ProgressPhoto[] {
  const db = getDb();
  return db.getAllSync<ProgressPhoto>(
    'SELECT * FROM progress_photos ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
}

export function getProgressPhotoById(id: number): ProgressPhoto | null {
  const db = getDb();
  return db.getFirstSync<ProgressPhoto>('SELECT * FROM progress_photos WHERE id = ?', [id]) ?? null;
}

// Only removes the database row. The caller is responsible for deleting
// the actual file at photo_uri first (via FileSystem.deleteAsync) — call
// getProgressPhotoById() to get that path before calling this.
export function deleteProgressPhotoRecord(id: number): void {
  const db = getDb();
  db.runSync('DELETE FROM progress_photos WHERE id = ?', [id]);
}

// Dev/testing helper — deletes a single day's Chronicle entry so
// generateSagaEntry() will treat that date as ungenerated again and produce
// a fresh entry on the next workout. NOT used anywhere in normal app flow;
// only call this manually while testing, never wire it into a real user-facing
// button in production.
// export function deleteSagaEntryForDate(date: string) {
//   const db = getDb();
//   db.runSync('DELETE FROM saga_entries WHERE date = ?', [date]);
// }

// ── Odin's Ravens ────────────────────────────────────────────
// A lightweight daily check-in ritual — Huginn (thought) and Muninn
// (memory) "return" once per day to hear how training went. Pure in-app
// flavor, no notifications involved: this only ever gets read/written when
// the person is already looking at the Home screen.
export interface RavenCheckin {
  id: number;
  date: string;
  mood: string;
  note: string | null;
  created_at: string;
}

export function logRavenCheckin(mood: string, note: string = ''): number {
  const db = getDb();
  const today = getLocalDateString();
  const result = db.runSync(
    `INSERT INTO raven_checkins (date, mood, note)
     VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET mood = excluded.mood, note = excluded.note`,
    [today, mood, note || null]
  );
  return result.lastInsertRowId;
}

export function getTodayRavenCheckin(): RavenCheckin | null {
  const db = getDb();
  const today = getLocalDateString();
  return db.getFirstSync<RavenCheckin>('SELECT * FROM raven_checkins WHERE date = ?', [today]) ?? null;
}

export function getRecentRavenCheckins(limit: number = 7): RavenCheckin[] {
  const db = getDb();
  return db.getAllSync<RavenCheckin>(
    'SELECT * FROM raven_checkins ORDER BY date DESC LIMIT ?',
    [limit]
  );
}

// ── Achievements ─────────────────────────────────────────────
// Discrete, one-time feats — separate from the continuous XP/rank/realm
// systems. A row existing in unlocked_achievements means that achievement
// has been earned; there's nothing else to track per-achievement beyond
// when it happened.
export function getUnlockedAchievementIds(): string[] {
  const db = getDb();
  const rows = db.getAllSync<{ id: string }>('SELECT id FROM unlocked_achievements');
  return rows.map(r => r.id);
}

export function isAchievementUnlocked(id: string): boolean {
  const db = getDb();
  const row = db.getFirstSync<{ id: string }>(
    'SELECT id FROM unlocked_achievements WHERE id = ?',
    [id]
  );
  return !!row;
}

// Returns true if this call actually unlocked it (i.e. it was NOT already
// unlocked before), false if it was already earned — so callers can tell
// whether to show a celebratory moment or silently no-op.
export function unlockAchievement(id: string): boolean {
  if (isAchievementUnlocked(id)) return false;
  const db = getDb();
  db.runSync(
    'INSERT OR IGNORE INTO unlocked_achievements (id) VALUES (?)',
    [id]
  );
  return true;
}

// Returns the distinct workout `type` values logged within the current
// calendar week (Sunday-start, matching the week boundary logic already
// used for weekly stats elsewhere in the app) — powers the "Full Circle"
// achievement (training strength, endurance, combat, AND recovery all
// within the same week).
export function getWorkoutTypesThisWeek(): string[] {
  const db = getDb();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = getLocalDateString(weekStart);

  const all = db.getAllSync<Workout>(
    "SELECT * FROM workouts WHERE created_at >= datetime('now', '-8 days') ORDER BY created_at DESC"
  );
  const thisWeek = all.filter(w => utcTimestampToLocalDateString(w.created_at) >= weekStartStr);
  return Array.from(new Set(thisWeek.map(w => w.type)));
}
// ── BODY MEASUREMENTS ─────────────────────────────────────────
// Same pattern as the existing weight-logging functions — a defensive
// CREATE TABLE IF NOT EXISTS (safe to run on every launch), plus
// log/read/update/delete functions mirroring logWeight/getLatestWeight/
// updateWeightLog/deleteWeightLog exactly, so this feels consistent
// with code that's already proven to work.

export interface BodyMeasurement {
  id: number;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  arms: number | null;
  thighs: number | null;
  body_fat: number | null;
  created_at: string;
}

// Call this once alongside your other table-creation calls (wherever
// getDb() sets up the schema on first launch).
function ensureMeasurementsTable(db: ReturnType<typeof getDb>) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS body_measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chest REAL,
      waist REAL,
      hips REAL,
      arms REAL,
      thighs REAL,
      created_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now'))
    );
  `);
  // Migration: body_measurements gained a `body_fat` column after some
  // installs already created the table without it — same defensive
  // pattern as the custom_exercises/macro_goals migrations in initDb().
  try {
    db.execSync(`ALTER TABLE body_measurements ADD COLUMN body_fat REAL;`);
  } catch (e) {
    // Column already exists — expected on every launch after the first.
  }
}

// Logs a new measurement entry. Pass null for any field you don't want
// to record that day — someone might only measure their waist, not the
// full set, and shouldn't be forced to fill in numbers they don't have.
export function logMeasurement(
  chest: number | null,
  waist: number | null,
  hips: number | null,
  arms: number | null,
  thighs: number | null,
  bodyFat: number | null = null
): number {
  const db = getDb();
  ensureMeasurementsTable(db);
  const result = db.runSync(
    `INSERT INTO body_measurements (chest, waist, hips, arms, thighs, body_fat) VALUES (?, ?, ?, ?, ?, ?)`,
    [chest, waist, hips, arms, thighs, bodyFat]
  );
  return result.lastInsertRowId;
}

export function getLatestMeasurement(): BodyMeasurement | null {
  const db = getDb();
  ensureMeasurementsTable(db);
  const rows = db.getAllSync<BodyMeasurement>(
    `SELECT * FROM body_measurements ORDER BY created_at DESC LIMIT 1`
  );
  return rows[0] ?? null;
}

// Same "edit/delete history list" pattern as getRecentWeightLogs.
export function getRecentMeasurementLogs(limit: number = 20): BodyMeasurement[] {
  const db = getDb();
  ensureMeasurementsTable(db);
  return db.getAllSync<BodyMeasurement>(
    `SELECT * FROM body_measurements ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
}

export function updateMeasurementLog(
  id: number,
  chest: number | null,
  waist: number | null,
  hips: number | null,
  arms: number | null,
  thighs: number | null,
  bodyFat: number | null = null
): void {
  const db = getDb();
  db.runSync(
    `UPDATE body_measurements SET chest = ?, waist = ?, hips = ?, arms = ?, thighs = ?, body_fat = ? WHERE id = ?`,
    [chest, waist, hips, arms, thighs, bodyFat, id]
  );
}

export function deleteMeasurementLog(id: number): void {
  const db = getDb();
  db.runSync(`DELETE FROM body_measurements WHERE id = ?`, [id]);
}

// Returns the change in each measurement over the given number of days,
// comparing the latest entry to the oldest entry within that window —
// same convention as getWeightChange(30), just per-field instead of a
// single number. Returns null for any field where there isn't enough
// data yet to compute a real change.
export function getMeasurementChange(days: number = 30): Record<string, number | null> {
  const db = getDb();
  ensureMeasurementsTable(db);
  const rows = db.getAllSync<BodyMeasurement>(
    `SELECT * FROM body_measurements WHERE created_at >= datetime('now', ?) ORDER BY created_at ASC`,
    [`-${days} days`]
  );
  if (rows.length < 2) {
    return { chest: null, waist: null, hips: null, arms: null, thighs: null, body_fat: null };
  }
  const oldest = rows[0];
  const latest = rows[rows.length - 1];
  const fields: (keyof BodyMeasurement)[] = ['chest', 'waist', 'hips', 'arms', 'thighs', 'body_fat'];
  const change: Record<string, number | null> = {};
  for (const field of fields) {
    const oldVal = oldest[field] as number | null;
    const newVal = latest[field] as number | null;
    change[field] = (oldVal !== null && newVal !== null)
      ? Math.round((newVal - oldVal) * 10) / 10
      : null;
  }
  return change;
}
// ── All-time weight progress (for Profile's prominent "lbs lost" stat) ──
// Different from getWeightChange(30) — that compares against 30 days ago.
// "Progress: X lbs lost" implies the WHOLE journey, so this compares the
// latest entry against the very first one ever logged, with no day limit.
export function getAllTimeWeightChange(): number | null {
  const db = getDb();
  const first = db.getFirstSync<WeightLog>(
    'SELECT * FROM weight_logs ORDER BY created_at ASC LIMIT 1'
  );
  const latest = db.getFirstSync<WeightLog>(
    'SELECT * FROM weight_logs ORDER BY created_at DESC LIMIT 1'
  );
  if (!first || !latest || first.id === latest.id) return null; // need at least 2 distinct entries
  return Math.round((latest.weight - first.weight) * 10) / 10;
}

// ── Intermittent Fasting ──────────────────────────────────────
// A fast is "open" while end_time is null (currently fasting), and
// "closed" once end_time is set (the fast finished or was ended early).
// planned_hours records what protocol they picked (16, 18, 20, 24, or a
// custom number) so history can show "16:8 — completed" vs. "ended early".

export interface FastingLog {
  id: number;
  start_time: string;
  end_time: string | null;
  planned_hours: number;
}

function ensureFastingTable(db: ReturnType<typeof getDb>) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS fasting_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time TEXT NOT NULL DEFAULT (datetime('now')),
      end_time TEXT,
      planned_hours REAL NOT NULL
    );
  `);
}

// Starts a new fast. Only one fast can be open at a time — the caller
// (UI layer) is responsible for checking getActiveFast() first and not
// calling this again while one is already running.
export function startFast(plannedHours: number): number {
  const db = getDb();
  ensureFastingTable(db);
  const result = db.runSync(
    'INSERT INTO fasting_logs (planned_hours) VALUES (?)',
    [plannedHours]
  );
  return result.lastInsertRowId;
}

// Returns the currently open fast (end_time IS NULL), or null if nothing
// is running right now.
export function getActiveFast(): FastingLog | null {
  const db = getDb();
  ensureFastingTable(db);
  return db.getFirstSync<FastingLog>(
    'SELECT * FROM fasting_logs WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1'
  ) ?? null;
}

// Closes the currently open fast by stamping end_time to now — whether
// that's because the planned window completed naturally or the person
// chose to break the fast early. Both cases are recorded the same way;
// how long it actually ran vs. planned_hours can be derived afterward by
// comparing start_time/end_time.
export function endFast(id: number): void {
  const db = getDb();
  db.runSync(
    `UPDATE fasting_logs SET end_time = datetime('now') WHERE id = ?`,
    [id]
  );
}

export function getRecentFasts(limit: number = 20): FastingLog[] {
  const db = getDb();
  ensureFastingTable(db);
  return db.getAllSync<FastingLog>(
    'SELECT * FROM fasting_logs WHERE end_time IS NOT NULL ORDER BY start_time DESC LIMIT ?',
    [limit]
  );
}

export function deleteFastingLog(id: number): void {
  const db = getDb();
  db.runSync('DELETE FROM fasting_logs WHERE id = ?', [id]);
}

// ── Sleep ──────────────────────────────────────────────────────
// Same shape as the Body Weight section above — one entry per night,
// a rolling trend, and a simple average over a window. Quality is
// optional (a 1-5 rating) since some nights someone only wants to log
// hours without rating how well they actually slept.

export interface SleepLog {
  id: number;
  hours: number;
  quality: number | null; // 1-5, optional
  created_at: string;
}

export interface SleepPoint {
  date: string;
  hours: number | null;
}

function ensureSleepTable(db: ReturnType<typeof getDb>) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sleep_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hours REAL NOT NULL,
      quality INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function logSleep(hours: number, quality: number | null = null): number {
  const db = getDb();
  ensureSleepTable(db);
  const result = db.runSync(
    'INSERT INTO sleep_logs (hours, quality) VALUES (?, ?)',
    [hours, quality]
  );
  return result.lastInsertRowId;
}

export function getLatestSleep(): SleepLog | null {
  const db = getDb();
  ensureSleepTable(db);
  return db.getFirstSync<SleepLog>(
    'SELECT * FROM sleep_logs ORDER BY created_at DESC LIMIT 1'
  ) ?? null;
}

export function getRecentSleepLogs(limit: number = 20): SleepLog[] {
  const db = getDb();
  ensureSleepTable(db);
  return db.getAllSync<SleepLog>(
    'SELECT * FROM sleep_logs ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
}

export function updateSleepLog(id: number, hours: number, quality: number | null): void {
  const db = getDb();
  db.runSync(
    'UPDATE sleep_logs SET hours = ?, quality = ? WHERE id = ?',
    [hours, quality, id]
  );
}

export function deleteSleepLog(id: number): void {
  const db = getDb();
  db.runSync('DELETE FROM sleep_logs WHERE id = ?', [id]);
}

// Same day-filling pattern as getWeightHistory() — one point per day for
// the window, null where nothing was logged, so a trend line can show
// real gaps instead of a misleading flat value.
export function getSleepHistory(daysBack: number = 7): SleepPoint[] {
  const db = getDb();
  ensureSleepTable(db);
  const all = db.getAllSync<SleepLog>(
    `SELECT * FROM sleep_logs WHERE created_at >= datetime('now', '-${daysBack + 1} days') ORDER BY created_at ASC`
  );

  // Reuses the same UTC->local conversion already defined at the top of
  // this file for every other "today"/date-range function.
  const byDate: Record<string, number> = {};
  all.forEach(s => {
    const date = utcTimestampToLocalDateString(s.created_at);
    byDate[date] = s.hours; // later entries in the same day overwrite earlier ones
  });

  const result: SleepPoint[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    result.push({ date: dateStr, hours: byDate[dateStr] ?? null });
  }
  return result;
}

// Average hours logged over the window — null if nothing's been logged
// at all in that range, rather than showing a misleading "0h average".
export function getSleepAverage(daysBack: number = 7): number | null {
  const history = getSleepHistory(daysBack);
  const points = history.filter(p => p.hours !== null) as { date: string; hours: number }[];
  if (points.length === 0) return null;
  const total = points.reduce((sum, p) => sum + p.hours, 0);
  return Math.round((total / points.length) * 10) / 10;
}

// ── Cardio Routes (real distance, GPS or manual) ────────────────────────
// Links a real distance to a `workouts` row that's already been created via
// logWorkout(). Both a manually-typed distance and a live GPS-tracked run
// flow through this same table — `is_gps_tracked` just marks which one it
// was, so the UI knows whether a route/map replay actually exists.
// `route_points` is only ever set for a GPS-tracked entry; a manual
// distance entry stores null there. This table is the single source of
// truth for real distance — getTotalMiles()'s old workoutCount*3 estimate
// and recordWorkout()'s old duration/10-or-flat-2 guess both get replaced
// by real numbers from here wherever a row exists.

interface CardioRouteRow {
  id: number;
  workout_id: number;
  distance_meters: number;
  route_points: string | null;
  is_gps_tracked: number;
  created_at: string;
}

export interface CardioRoute {
  id: number;
  workout_id: number;
  distance_meters: number;
  route_points: { lat: number; lng: number; t: number }[] | null;
  is_gps_tracked: number;
  created_at: string;
}

function parseCardioRouteRow(row: CardioRouteRow): CardioRoute {
  return {
    ...row,
    route_points: row.route_points ? JSON.parse(row.route_points) : null,
  };
}

function ensureCardioRoutesTable(db: ReturnType<typeof getDb>) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS cardio_routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      distance_meters REAL NOT NULL,
      route_points TEXT,
      is_gps_tracked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workout_id) REFERENCES workouts(id)
    );
  `);
}

export function logCardioRoute(
  workoutId: number,
  distanceMeters: number,
  routePoints: { lat: number; lng: number; t: number }[] | null,
  isGpsTracked: boolean
): number {
  const db = getDb();
  ensureCardioRoutesTable(db);
  const result = db.runSync(
    `INSERT INTO cardio_routes (workout_id, distance_meters, route_points, is_gps_tracked) VALUES (?, ?, ?, ?)`,
    [workoutId, distanceMeters, routePoints ? JSON.stringify(routePoints) : null, isGpsTracked ? 1 : 0]
  );
  return result.lastInsertRowId;
}

export function getCardioRouteForWorkout(workoutId: number): CardioRoute | null {
  const db = getDb();
  ensureCardioRoutesTable(db);
  const row = db.getFirstSync<CardioRouteRow>(
    `SELECT * FROM cardio_routes WHERE workout_id = ?`,
    [workoutId]
  );
  return row ? parseCardioRouteRow(row) : null;
}

export function deleteCardioRoute(id: number): void {
  const db = getDb();
  db.runSync(`DELETE FROM cardio_routes WHERE id = ?`, [id]);
}

// ── Cardio Personal Records ──────────────────────────────────────────
// Mirrors the strength personal_records concept, but computed on the fly
// from cardio_routes/workouts rather than stored in their own table —
// there's no "current best" to maintain incrementally the way strength PRs
// are (checkAndUpdatePR runs on every set logged); cardio records are rare
// enough events that recomputing via MAX/MIN across all logged runs each
// time the PR Hall is opened is cheap and can never drift out of sync.
export interface CardioRecordEntry {
  workoutId: number;
  achievedAt: string;
  isGpsTracked: boolean;
}

export interface CardioPersonalRecords {
  longestDistance: (CardioRecordEntry & { miles: number }) | null;
  fastestPace: (CardioRecordEntry & { secondsPerMile: number; miles: number }) | null;
  longestDuration: (CardioRecordEntry & { minutes: number }) | null;
}

// Below this, a single tracked point or two (GPS noise, or someone tapping
// Finish almost immediately) can produce a technically-real but
// meaningless "fastest pace" — same reasoning as the live pace guard in
// Track a Run, just applied to the all-time record instead of the live
// display.
const MIN_METERS_FOR_PACE_RECORD = 400; // ~0.25 mi

export function getCardioPersonalRecords(): CardioPersonalRecords {
  const db = getDb();
  ensureCardioRoutesTable(db);

  const METERS_PER_MILE = 1609.344;

  const longestDistanceRow = db.getFirstSync<{
    workout_id: number; distance_meters: number; is_gps_tracked: number; created_at: string;
  }>(
    `SELECT cr.workout_id, cr.distance_meters, cr.is_gps_tracked, w.created_at
     FROM cardio_routes cr
     JOIN workouts w ON w.id = cr.workout_id
     WHERE w.type = 'endurance'
     ORDER BY cr.distance_meters DESC
     LIMIT 1`
  );

  const fastestPaceRow = db.getFirstSync<{
    workout_id: number; distance_meters: number; duration_minutes: number;
    is_gps_tracked: number; created_at: string;
  }>(
    `SELECT cr.workout_id, cr.distance_meters, w.duration_minutes, cr.is_gps_tracked, w.created_at
     FROM cardio_routes cr
     JOIN workouts w ON w.id = cr.workout_id
     WHERE w.type = 'endurance'
       AND cr.distance_meters >= ${MIN_METERS_FOR_PACE_RECORD}
       AND w.duration_minutes IS NOT NULL
       AND w.duration_minutes > 0
     ORDER BY (w.duration_minutes * 60.0) / cr.distance_meters ASC
     LIMIT 1`
  );

  const longestDurationRow = db.getFirstSync<{
    id: number; duration_minutes: number; created_at: string;
  }>(
    `SELECT id, duration_minutes, created_at
     FROM workouts
     WHERE type = 'endurance' AND duration_minutes IS NOT NULL AND duration_minutes > 0
     ORDER BY duration_minutes DESC
     LIMIT 1`
  );

  return {
    longestDistance: longestDistanceRow ? {
      workoutId: longestDistanceRow.workout_id,
      achievedAt: longestDistanceRow.created_at,
      isGpsTracked: longestDistanceRow.is_gps_tracked === 1,
      miles: Math.round((longestDistanceRow.distance_meters / METERS_PER_MILE) * 100) / 100,
    } : null,
    fastestPace: fastestPaceRow ? {
      workoutId: fastestPaceRow.workout_id,
      achievedAt: fastestPaceRow.created_at,
      isGpsTracked: fastestPaceRow.is_gps_tracked === 1,
      secondsPerMile: Math.round(
        (fastestPaceRow.duration_minutes * 60) / (fastestPaceRow.distance_meters / METERS_PER_MILE)
      ),
      miles: Math.round((fastestPaceRow.distance_meters / METERS_PER_MILE) * 100) / 100,
    } : null,
    longestDuration: longestDurationRow ? {
      workoutId: longestDurationRow.id,
      achievedAt: longestDurationRow.created_at,
      isGpsTracked: false,
      minutes: longestDurationRow.duration_minutes,
    } : null,
  };
}

// ── Active Run Points (live GPS buffer) ─────────────────────────────────
// Holds the in-progress point stream for whatever run is currently being
// tracked. This exists SEPARATELY from cardio_routes because the
// background location task that writes into it can run in a JS context
// with no React/Zustand state available at all (iOS may relaunch the app
// fresh just to deliver a location update) — so points need somewhere
// durable to land immediately, not somewhere that depends on component
// state surviving. Only ever holds one run's worth of data at a time:
// startActiveRun() clears it, points accumulate during the run, and
// finishing/discarding a run clears it again.

export interface ActiveRunPoint {
  id: number;
  lat: number;
  lng: number;
  timestamp: number;
}

function ensureActiveRunPointsTable(db: ReturnType<typeof getDb>) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS active_run_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      timestamp INTEGER NOT NULL
    );
  `);
}

export function addActiveRunPoint(lat: number, lng: number, timestamp: number): void {
  const db = getDb();
  ensureActiveRunPointsTable(db);
  db.runSync(
    `INSERT INTO active_run_points (lat, lng, timestamp) VALUES (?, ?, ?)`,
    [lat, lng, timestamp]
  );
}

export function getActiveRunPoints(): ActiveRunPoint[] {
  const db = getDb();
  ensureActiveRunPointsTable(db);
  return db.getAllSync<ActiveRunPoint>(
    `SELECT * FROM active_run_points ORDER BY timestamp ASC`
  );
}

export function clearActiveRunPoints(): void {
  const db = getDb();
  ensureActiveRunPointsTable(db);
  db.runSync(`DELETE FROM active_run_points`);
}