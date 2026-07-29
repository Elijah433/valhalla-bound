import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { VERSES } from '@/constants/havamol';

// How notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function hasNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function scheduleAllNotifications(
  warriorName: string,
  streakDays: number,
  trainedToday: boolean,
  isShieldmaiden: boolean = false,
) {
  const granted = await hasNotificationPermissions();
  if (!granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const morningPref   = await AsyncStorage.getItem('notif_morning');
  const afternoonPref = await AsyncStorage.getItem('notif_afternoon');
  const streakPref    = await AsyncStorage.getItem('notif_streak');
  const sagaPref      = await AsyncStorage.getItem('notif_saga');
  const quotePref     = await AsyncStorage.getItem('notif_quote');
  const quoteHourRaw  = await AsyncStorage.getItem('notif_quote_hour');
  const quoteHour     = quoteHourRaw ? parseInt(quoteHourRaw) : 7;

  // ── Morning notification ─────────────────────────────────
  // Viking-voiced, personalized, time-appropriate
  const morningTitle = isShieldmaiden
    ? `The shield calls, ${warriorName}.`
    : `The forge awaits, ${warriorName}.`;
  const morningBody = isShieldmaiden
    ? 'Freya does not rest. Neither shall you.'
    : 'Odin gave an eye for wisdom. What will you give today?';

  if (morningPref !== 'false') {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: morningTitle,
        body: morningBody,
        sound: true,
        data: { type: 'morning_mission' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
      },
    });
  }

  // ── Afternoon nudge — only if not yet trained ────────────
  const afternoonTitle = isShieldmaiden
    ? `The sun descends, ${warriorName}.`
    : `The day is fading, ${warriorName}.`;
  const afternoonBody = isShieldmaiden
    ? 'The Valkyries ride at dusk. Will you be among the worthy?'
    : 'The Valkyries are still watching. Will you answer before dark?';

  if (afternoonPref !== 'false' && !trainedToday) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: afternoonTitle,
        body: afternoonBody,
        sound: true,
        data: { type: 'afternoon_nudge' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 18,
        minute: 0,
      },
    });
  }

  // ── Streak risk 9pm — only if not yet trained ────────────
  // Named streaks feel more urgent than generic ones
  const streakTitle = streakDays >= 7
    ? isShieldmaiden
      ? `${streakDays}-day saga at risk, ${warriorName}.`
      : `${streakDays}-day streak at risk, ${warriorName}.`
    : isShieldmaiden
      ? `Your saga dims, ${warriorName}.`
      : `The gods grow restless, ${warriorName}.`;

  const streakBody = streakDays >= 30
    ? 'Thirty days of honor. Do not let it end tonight.'
    : streakDays >= 7
    ? 'Three hours remain. The Norns do not pause for hesitation.'
    : isShieldmaiden
    ? 'Three hours remain. Freya watches.'
    : 'Three hours remain. Rise and log your battle.';

  if (streakPref !== 'false' && streakDays > 0 && !trainedToday) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: streakTitle,
        body: streakBody,
        sound: true,
        data: { type: 'streak_risk' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
    });
  }

  // ── Sunday 7pm weekly saga ───────────────────────────────
  if (sagaPref !== 'false') {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your weekly saga is written.',
        body: isShieldmaiden
          ? 'The Norns have recorded your deeds, Shieldmaiden. Open to see your saga.'
          : 'The Norns have recorded your deeds. Open to see your saga.',
        sound: true,
        data: { type: 'weekly_saga' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1,
        hour: 19,
        minute: 0,
      },
    });
  }

  // ── Daily Hávamál quote — pulled from the verified Bellows
  // 1923 translation used in the app itself, not paraphrases ──
  if (quotePref !== 'false') {
    const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const verse = VERSES[seed % VERSES.length];
    await Notifications.scheduleNotificationAsync({
      content: {
        title: isShieldmaiden
          ? `Hávamál — Stanza ${verse.num}`
          : `Words of the All-Father — Stanza ${verse.num}`,
        body: `"${verse.text}"`,
        sound: false,
        data: { type: 'daily_quote' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: quoteHour,
        minute: 0,
      },
    });
  }
}

export async function cancelWorkoutRemindersForToday() {
  const granted = await hasNotificationPermissions();
  if (!granted) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    const type = notif.content.data?.type;
    if (type === 'afternoon_nudge' || type === 'streak_risk') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

export async function rescheduleAfterWorkout(
  warriorName: string,
  streakDays: number,
  isShieldmaiden: boolean = false,
) {
  await cancelWorkoutRemindersForToday();

  const granted = await hasNotificationPermissions();
  if (!granted) return;

  const streakPref = await AsyncStorage.getItem('notif_streak');

  // Replace streak risk with a positive momentum notification
  if (streakPref !== 'false' && streakDays > 0) {
    const title = streakDays >= 30
      ? `${streakDays} days. Odin himself takes note, ${warriorName}.`
      : streakDays >= 7
      ? `${streakDays}-day streak. ${isShieldmaiden ? 'Freya is proud.' : 'Odin is watching.'}`
      : isShieldmaiden
      ? `Battle logged, ${warriorName}. Freya is proud.`
      : `Battle logged, ${warriorName}. Odin is watching.`;

    const body = streakDays >= 30
      ? 'Thirty days of unbroken honor. Return tomorrow and forge the next.'
      : isShieldmaiden
      ? 'Train again tomorrow to keep your saga alive.'
      : 'Train again tomorrow to keep the streak alive.';

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { type: 'streak_risk' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
    });
  }
}

export async function requestPermissionsAndSchedule(
  warriorName: string,
  streakDays: number,
  trainedToday: boolean,
  isShieldmaiden: boolean = false,
): Promise<boolean> {
  const granted = await requestNotificationPermissions();
  if (!granted) return false;
  await scheduleAllNotifications(warriorName, streakDays, trainedToday, isShieldmaiden);
  await AsyncStorage.setItem('notifications_scheduled', 'true');
  return true;
}

export async function handleNotificationTap(
  response: Notifications.NotificationResponse,
  onWeeklySaga: () => void,
) {
  const type = response.notification.request.content.data?.type;
  if (type === 'weekly_saga') {
    onWeeklySaga();
  }
}

function nextOccurrence(hour: number, minute: number): Date {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}

function nextSundayAt(hour: number, minute: number): Date {
  const now = new Date();
  const next = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  next.setDate(now.getDate() + daysUntilSunday);
  next.setHours(hour, minute, 0, 0);
  return next;
}

// ── Trial-end reminder ───────────────────────────────────────
const TRIAL_STARTED_KEY = 'trial_started_at';
const TRIAL_LENGTH_DAYS = 3; // matches the "3 days, completely free" trial on the paywall

// Call this once, right when a purchase/trial successfully starts (from the
// paywall's purchase handler). Records the trial start date locally so the
// reminder below knows when the trial actually began — RevenueCat manages
// the real trial/billing state, this is only used to time a local
// notification, never to grant or check entitlements.
export async function recordTrialStart(): Promise<void> {
  const existing = await AsyncStorage.getItem(TRIAL_STARTED_KEY);
  if (existing) return; // don't reset the timer on a restore/renewal
  await AsyncStorage.setItem(TRIAL_STARTED_KEY, new Date().toISOString());
}

// Schedules (or re-schedules) a single one-time notification roughly 24
// hours before the trial ends, personalized with the warrior's current
// stats. Safe to call repeatedly (e.g. on every app open and after every
// workout, same pattern as rescheduleAfterWorkout) — it always cancels any
// previously-scheduled trial-ending notification first, so the content
// stays fresh right up until shortly before it actually fires, and it
// silently does nothing once the reminder window has already passed (no
// duplicate or late "your trial is ending" after the fact).
export async function scheduleTrialEndReminder(
  warriorName: string,
  totalXP: number,
  streakDays: number,
  chronicleCount: number,
): Promise<void> {
  const granted = await hasNotificationPermissions();
  if (!granted) return;

  const startedRaw = await AsyncStorage.getItem(TRIAL_STARTED_KEY);
  if (!startedRaw) return; // no trial on record — nothing to remind about

  const started = new Date(startedRaw);
  const trialEnd = new Date(started.getTime() + TRIAL_LENGTH_DAYS * 24 * 60 * 60 * 1000);
  const reminderTime = new Date(trialEnd.getTime() - 24 * 60 * 60 * 1000);

  // Always clear any previously-scheduled reminder before deciding whether
  // to set a new one — otherwise re-running this on every app open would
  // stack up duplicate notifications instead of replacing the old one.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.type === 'trial_ending') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  const now = new Date();
  if (reminderTime <= now) return; // reminder window already passed — stay silent

  const parts: string[] = [];
  if (streakDays > 0) parts.push(`a ${streakDays}-day streak`);
  parts.push(`${totalXP.toLocaleString()} Valor`);
  if (chronicleCount > 0) parts.push(`${chronicleCount} chronicle${chronicleCount === 1 ? '' : 's'} written`);
  const statsLine = parts.join(', ');

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Your trial ends tomorrow, ${warriorName}.`,
      body: `You've already earned ${statsLine}. Don't lose it now — your saga continues with Pro.`,
      sound: true,
      data: { type: 'trial_ending' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderTime,
    },
  });
}