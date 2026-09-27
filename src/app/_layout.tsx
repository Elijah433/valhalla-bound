import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { CinzelDecorative_900Black } from '@expo-google-fonts/cinzel-decorative';
import {
  Cinzel_400Regular,
  Cinzel_600SemiBold,
  Cinzel_700Bold,
} from '@expo-google-fonts/cinzel';
import {
  CrimsonPro_300Light,
  CrimsonPro_400Regular,
  CrimsonPro_300Light_Italic,
} from '@expo-google-fonts/crimson-pro';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDb, setWarriorPro, getSagaEntryCount } from '@/lib/db';
import { initRevenueCat, isPro as checkRevenueCatPro } from '@/lib/purchases';
import { useWarriorStore } from '@/lib/store';
import { useOnboardingStore } from '@/lib/onboarding-store';
import { evaluateOathOnOpen } from '@/lib/oaths';
import { Colors } from '@/constants/theme';
import { router } from 'expo-router';
import {
  scheduleAllNotifications,
  scheduleTrialEndReminder,
  handleNotificationTap,
  hasNotificationPermissions,
  hasBeenPromptedForPermission,
  requestPermissionsAndSchedule,
} from '@/lib/notifications';

// Side-effect only — this registers the background location task via
// TaskManager.defineTask() at module scope. Must be imported unconditionally
// here so the registration happens on EVERY app launch, including when iOS
// relaunches the app silently in the background just to deliver a location
// update with no UI ever shown. Nothing from this import is used directly
// in this file.
import '@/lib/runTracking';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadWarrior = useWarriorStore((s) => s.loadWarrior);
  const checkStreakOnOpen = useWarriorStore((s) => s.checkStreakOnOpen);
  const warrior = useWarriorStore((s) => s.warrior);
  const isPro = useWarriorStore((s) => s.isPro);
  const { checkComplete, isComplete, isLoading: onboardingLoading } = useOnboardingStore();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  // Guards against refreshNotifications() running concurrently with itself.
  // prepare() (on launch) and the warrior-change effect below can both call
  // refreshNotifications() close together — loadWarrior() inside prepare()
  // updates the warrior object, which can trigger the second effect before
  // prepare()'s own call has finished. Both calls independently cancel and
  // reschedule everything, and since the scheduling calls inside aren't
  // atomic as a batch, overlapping calls can interleave and leave behind
  // duplicate notifications of the same type. isRefreshingNotifications
  // blocks a second call while one is already in flight; pendingRefresh
  // remembers that a refresh was requested during that window so it still
  // runs exactly once afterward, rather than being silently dropped.
  const isRefreshingNotifications = useRef(false);
  const pendingNotificationRefresh = useRef(false);

  const [fontsLoaded] = useFonts({
    CinzelDecorative_900Black,
    Cinzel_400Regular,
    Cinzel_600SemiBold,
    Cinzel_700Bold,
    CrimsonPro_300Light,
    CrimsonPro_400Regular,
    CrimsonPro_300Light_Italic,
  });

  useEffect(() => {
    async function prepare() {
      try {
        await initDb();
        await initRevenueCat();

        // Sync local Pro status with RevenueCat's real entitlement on every
        // launch. Without this, a real subscriber who reinstalls the app,
        // switches devices, or whose local is_pro flag ever drifts from
        // reality would incorrectly lose Pro access — this is the safety
        // net that protects paying customers now that isPro is no longer
        // hardcoded to true.
        try {
          const reallyPro = await checkRevenueCatPro();
          setWarriorPro(reallyPro);
        } catch (e) {
          // If RevenueCat can't be reached (offline, etc.), leave whatever
          // is_pro already has in SQLite rather than locking the user out.
          console.warn('[Pro sync] Could not verify entitlement on launch:', e);
        }

        await checkComplete();
        await loadWarrior();

        const result = await checkStreakOnOpen();

        if (result.broken) {
          setTimeout(() => router.push('/(modals)/streak-broken'), 800);
        } else if (result.weeklySagaReady) {
          setTimeout(() => router.push('/(modals)/weekly-saga'), 1200);
        }

        // Evaluate the active oath (if any) before the user has a chance to
        // check in today — catches a genuinely missed day honestly, the
        // same way checkStreakOnOpen() does for the workout streak. This
        // must run on every launch, not just when the Oath screen is
        // opened, since otherwise a missed day could go undetected
        // indefinitely if the user never happens to revisit that screen.
        try {
          const freshWarrior = useWarriorStore.getState().warrior;
          await evaluateOathOnOpen(freshWarrior?.name ?? 'Warrior');
        } catch (e) {
          console.warn('[Oath] Could not evaluate oath on launch:', e);
        }

        // One-time notification permission prompt for users who onboarded
        // before this prompt existed. New users are already covered at the
        // end of the onboarding flow itself — this only fires for someone
        // who's already past onboarding (isComplete true) and has never
        // been asked before, so nobody sees two permission dialogs back to
        // back and nobody gets asked more than once regardless of what
        // they choose. Deliberately not awaited — the splash screen below
        // hides as soon as the rest of launch prep finishes, and the OS
        // permission dialog appears a moment later over the app itself,
        // instead of holding the splash screen frozen while the person
        // decides.
        (async () => {
          try {
            const { isComplete: alreadyOnboarded } = useOnboardingStore.getState();
            const alreadyPrompted = await hasBeenPromptedForPermission();
            if (alreadyOnboarded && !alreadyPrompted) {
              const freshWarrior = useWarriorStore.getState().warrior;
              const gender = (await AsyncStorage.getItem('valhalla_gender')) ?? 'warrior';
              await requestPermissionsAndSchedule(
                freshWarrior?.name ?? 'Warrior',
                freshWarrior?.streak_days ?? 0,
                false,
                gender === 'shieldmaiden',
              );
            }
          } catch (e) {
            console.warn('[Notifications] Could not run one-time permission prompt:', e);
          }
        })();

        await refreshNotifications();

      } catch (e) {
        console.warn(e);
      } finally {
        if (fontsLoaded) {
          SplashScreen.hideAsync();
        }
      }
    }
    prepare();
  }, [fontsLoaded]);

  useEffect(() => {
    if (warrior) {
      refreshNotifications();
    }
  }, [warrior?.name, warrior?.streak_days]);

  async function refreshNotifications() {
    // If a refresh is already running, don't start a second overlapping
    // one — just remember that we need to run again once the current one
    // finishes, so the latest warrior/streak data still gets picked up.
    if (isRefreshingNotifications.current) {
      pendingNotificationRefresh.current = true;
      return;
    }

    isRefreshingNotifications.current = true;
    try {
      const notifEnabled = await AsyncStorage.getItem('notifications_enabled');
      if (notifEnabled === 'false') return;

      const granted = await hasNotificationPermissions();
      if (!granted) return;

      const name = warrior?.name ?? 'Warrior';
      const streak = warrior?.streak_days ?? 0;
      const gender = await AsyncStorage.getItem('valhalla_gender') ?? 'warrior';
      const isShieldmaiden = gender === 'shieldmaiden';

      const lastWorkout = await AsyncStorage.getItem('last_workout_date');
      const today = new Date().toISOString().split('T')[0];
      const trainedToday = lastWorkout === today;

      await scheduleAllNotifications(name, streak, trainedToday, isShieldmaiden);

      // Keep the trial-end reminder's stats current — this is a no-op if
      // there's no trial on record (recordTrialStart() was never called
      // from the paywall), and it's cheap enough to run alongside the
      // other notifications this function already refreshes on every
      // launch and warrior change.
      try {
        await scheduleTrialEndReminder(
          name,
          warrior?.total_xp ?? 0,
          streak,
          getSagaEntryCount(),
        );
      } catch (e) {}
    } catch (e) {
    } finally {
      isRefreshingNotifications.current = false;
      // If another refresh was requested while this one was running, run
      // it now so the most current data is reflected — but only once,
      // not in a tight loop.
      if (pendingNotificationRefresh.current) {
        pendingNotificationRefresh.current = false;
        refreshNotifications();
      }
    }
  }

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      const type = notification.request.content.data?.type;
      if (type === 'weekly_saga') {
        const { isPro } = useWarriorStore.getState();
        if (isPro) {
          setTimeout(() => router.push('/(modals)/weekly-saga'), 500);
        }
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // Delay to ensure router is fully mounted before navigating
      setTimeout(() => {
        handleNotificationTap(response, () => {
          const { isPro } = useWarriorStore.getState();
          if (isPro) {
            router.push('/(modals)/weekly-saga');
          }
        });

        const type = response.notification.request.content.data?.type;
        if (type === 'morning_mission' || type === 'afternoon_nudge' || type === 'streak_risk') {
          router.replace('/(tabs)' as any);
        }
      }, 1000);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  useEffect(() => {
    // Wait for both fonts AND the onboarding check to actually finish
    // before deciding whether to redirect. Previously this only waited on
    // fontsLoaded, which let it fire using the store's default
    // isComplete=false before checkComplete()'s AsyncStorage read had
    // resolved — a race that intermittently (and on some devices,
    // consistently) sent already-onboarded users back through onboarding
    // on every relaunch, even though their real isComplete value was true.
    if (!fontsLoaded) return;
    if (onboardingLoading) return;
    if (!isComplete) {
      router.replace('/onboarding/welcome');
    }
  }, [fontsLoaded, isComplete, onboardingLoading]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.void }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.void } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="(modals)/log-workout"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/paywall"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/exercise-picker"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/strength-log"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/weapon-forge"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/food-search"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/macro-goals"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/cardio-log"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/track-run"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/recovery-log"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/valkyrie-aesthetic"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/valkyrie-moment"
          options={{ presentation: 'fullScreenModal', animation: 'fade', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/character-creator"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/gear-guide"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/streak-broken"
          options={{ presentation: 'fullScreenModal', animation: 'fade', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/weekly-saga"
          options={{ presentation: 'fullScreenModal', animation: 'fade', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/notifications"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/create-crew"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/join-crew"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/victory"
          options={{ presentation: 'fullScreenModal', animation: 'fade', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/pr-hall"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/havamol"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
            <Stack.Screen
      name="(modals)/valkyrie-codex"
      options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
    />
          <Stack.Screen
        name="(modals)/streak-milestone"
        options={{ presentation: 'fullScreenModal', animation: 'fade', headerShown: false }}
      />
      <Stack.Screen
        name="(modals)/barcode-scanner"
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', headerShown: false }}
      />
      <Stack.Screen
        name="(modals)/drengskapr"
        options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
/>
      <Stack.Screen
        name="(modals)/viking-challenges"
        options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
      />
      <Stack.Screen
        name="(modals)/oath"
        options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
      />
      <Stack.Screen
        name="(modals)/saga-card"
        options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
        />
      <Stack.Screen
        name="(modals)/nine-realms"
        options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
      />
      <Stack.Screen
        name="(modals)/stretch-library"
        options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
      />
      <Stack.Screen
        name="(modals)/workout-history"
        options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
      />
      <Stack.Screen
        name="(modals)/achievement-unlocked"
        options={{ presentation: 'fullScreenModal', animation: 'fade', headerShown: false }}
      />
      <Stack.Screen
        name="(modals)/achievements-hall"
        options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
      />
      <Stack.Screen
        name="(modals)/adaptive-workout"
        options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: false }}
      />
      </Stack>
    </GestureHandlerRootView>
  );
}