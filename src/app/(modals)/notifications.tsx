import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Switch, Alert, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWarriorStore } from '@/lib/store';
import { useWarriorProfile } from '@/lib/useWarriorProfile';
import {
  requestPermissionsAndSchedule,
  hasNotificationPermissions,
  scheduleAllNotifications,
} from '@/lib/notifications';
import { VERSES } from '@/constants/havamol';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const QUOTE_HOURS = [5, 6, 7, 8, 9, 10];
const QUOTE_HOUR_LABELS = ['5:00 AM', '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM'];

export default function NotificationsModal() {
  const { warrior } = useWarriorStore();
  const { isShieldmaiden } = useWarriorProfile();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [masterEnabled, setMasterEnabled] = useState(true);
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [afternoonEnabled, setAfternoonEnabled] = useState(true);
  const [streakEnabled, setStreakEnabled] = useState(true);
  const [sagaEnabled, setSagaEnabled] = useState(true);
  const [quoteEnabled, setQuoteEnabled] = useState(true);
  const [quoteHour, setQuoteHour] = useState(7);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  const accentColor = isShieldmaiden ? '#D4A8C4' : Colors.gold;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const granted = await hasNotificationPermissions();
      setHasPermission(granted);

      const master    = await AsyncStorage.getItem('notifications_enabled');
      const morning   = await AsyncStorage.getItem('notif_morning');
      const afternoon = await AsyncStorage.getItem('notif_afternoon');
      const streak    = await AsyncStorage.getItem('notif_streak');
      const saga      = await AsyncStorage.getItem('notif_saga');
      const quote     = await AsyncStorage.getItem('notif_quote');
      const qHour     = await AsyncStorage.getItem('notif_quote_hour');

      setMasterEnabled(master !== 'false');
      setMorningEnabled(morning !== 'false');
      setAfternoonEnabled(afternoon !== 'false');
      setStreakEnabled(streak !== 'false');
      setSagaEnabled(saga !== 'false');
      setQuoteEnabled(quote !== 'false');
      if (qHour) setQuoteHour(parseInt(qHour));
    } catch (e) {}
    setLoading(false);
  }

  // Single reschedule function — delegates entirely to scheduleAllNotifications
  // in lib/notifications.ts so there's one source of truth for notification
  // content. Previously this screen had its own duplicate scheduling logic
  // with different (inaccurate) copy that would override the lib version
  // whenever a user toggled a setting.
  async function reschedule() {
    const trainedToday = false; // conservative — better to remind than miss
    await scheduleAllNotifications(
      warrior?.name ?? 'Warrior',
      warrior?.streak_days ?? 0,
      trainedToday,
      isShieldmaiden,
    );
  }

  async function toggleMaster(val: boolean) {
    setMasterEnabled(val);
    await AsyncStorage.setItem('notifications_enabled', val ? 'true' : 'false');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (val) {
      if (!hasPermission) {
        await requestPermissionsAndSchedule(
          warrior?.name ?? 'Warrior',
          warrior?.streak_days ?? 0,
          false,
          isShieldmaiden,
        );
        setHasPermission(true);
      } else {
        await reschedule();
      }
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  }

  async function toggleSetting(key: string, val: boolean, setter: (v: boolean) => void) {
    setter(val);
    await AsyncStorage.setItem(key, val ? 'true' : 'false');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await reschedule();
  }

  async function changeQuoteHour(hour: number) {
    setQuoteHour(hour);
    await AsyncStorage.setItem('notif_quote_hour', String(hour));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await reschedule();
  }

  async function handleRequestPermission() {
    const granted = await requestPermissionsAndSchedule(
      warrior?.name ?? 'Warrior',
      warrior?.streak_days ?? 0,
      false,
      isShieldmaiden,
    );
    if (granted) {
      setHasPermission(true);
    } else {
      Alert.alert(
        'Permission Required',
        'Enable notifications in iOS Settings → Valhalla Bound → Notifications.',
        [{ text: 'OK' }]
      );
    }
  }

  // Today's verse preview — pulled from the verified Bellows translation
  const todayVerseIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % VERSES.length;
  const todayVerse = VERSES[todayVerseIndex];

  const NOTIFICATION_ITEMS = [
    {
      key: 'notif_morning',
      label: 'Morning Mission',
      sub: 'Daily 8am — your mission for the day',
      rune: 'ᚢ',
      enabled: morningEnabled,
      setter: setMorningEnabled,
    },
    {
      key: 'notif_afternoon',
      label: 'Afternoon Call',
      sub: "Daily 6pm — if you haven't trained yet",
      rune: 'ᚱ',
      enabled: afternoonEnabled,
      setter: setAfternoonEnabled,
    },
    {
      key: 'notif_streak',
      label: 'Streak at Risk',
      sub: 'Daily 9pm — when your streak needs saving',
      rune: 'ᚾ',
      enabled: streakEnabled,
      setter: setStreakEnabled,
    },
    {
      key: 'notif_saga',
      label: 'Weekly Saga',
      sub: 'Sunday 7pm — your week in review',
      rune: 'ᛋ',
      enabled: sagaEnabled,
      setter: setSagaEnabled,
    },
  ];

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0C0A10', '#050508']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.eyebrow, { color: accentColor }]}>SETTINGS</Text>
              <Text style={styles.title}>NOTIFICATIONS</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* Permission banner */}
            {!hasPermission && (
              <TouchableOpacity
                style={styles.permissionBanner}
                onPress={handleRequestPermission}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[`${accentColor}12`, 'transparent']} style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={['transparent', accentColor, 'transparent']}
                  style={styles.bannerLine}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <Text style={[styles.permissionRune, { color: accentColor }]}>ᚺ</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.permissionTitle, { color: accentColor }]}>Enable Notifications</Text>
                  <Text style={styles.permissionSub}>Tap to allow — the gods need a way to reach you.</Text>
                </View>
                <Text style={[styles.permissionArrow, { color: accentColor }]}>→</Text>
              </TouchableOpacity>
            )}

            {/* Master toggle */}
            <View style={[styles.masterCard, { borderColor: `${accentColor}25` }]}>
              <LinearGradient colors={[`${accentColor}08`, 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={styles.masterLeft}>
                <Text style={[styles.masterRune, { color: accentColor }]}>ᚺ</Text>
                <View>
                  <Text style={[styles.masterLabel, { color: accentColor }]}>All Notifications</Text>
                  <Text style={styles.masterSub}>
                    {masterEnabled ? 'The gods can reach you' : 'Silence — no calls will come'}
                  </Text>
                </View>
              </View>
              <Switch
                value={masterEnabled}
                onValueChange={toggleMaster}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: `${accentColor}60` }}
                thumbColor={masterEnabled ? accentColor : 'rgba(255,255,255,0.4)'}
                ios_backgroundColor="rgba(255,255,255,0.1)"
              />
            </View>

            {/* Standard toggles */}
            <View style={[styles.notifCard, { opacity: masterEnabled ? 1 : 0.4 }]}>
              {NOTIFICATION_ITEMS.map((item, i) => (
                <View key={item.key}>
                  <View style={styles.notifRow}>
                    <Text style={[styles.notifRune, { color: accentColor }]}>{item.rune}</Text>
                    <View style={styles.notifInfo}>
                      <Text style={styles.notifLabel}>{item.label}</Text>
                      <Text style={styles.notifSub}>{item.sub}</Text>
                    </View>
                    <Switch
                      value={item.enabled && masterEnabled}
                      onValueChange={(val) => {
                        if (!masterEnabled) return;
                        toggleSetting(item.key, val, item.setter);
                      }}
                      trackColor={{ false: 'rgba(255,255,255,0.08)', true: `${accentColor}50` }}
                      thumbColor={item.enabled && masterEnabled ? accentColor : 'rgba(255,255,255,0.3)'}
                      ios_backgroundColor="rgba(255,255,255,0.08)"
                      disabled={!masterEnabled}
                    />
                  </View>
                  {i < NOTIFICATION_ITEMS.length - 1 && <View style={styles.notifDivider} />}
                </View>
              ))}
            </View>

            {/* Daily Hávamál quote — separate card with time picker */}
            <View style={[styles.quoteCard, {
              borderColor: `${accentColor}20`,
              opacity: masterEnabled ? 1 : 0.4,
            }]}>
              <LinearGradient colors={[`${accentColor}06`, 'transparent']} style={StyleSheet.absoluteFill} />
              <LinearGradient
                colors={['transparent', accentColor, 'transparent']}
                style={styles.quoteCardLine}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />

              <View style={styles.notifRow}>
                <Text style={[styles.notifRune, { color: accentColor }]}>ᚹ</Text>
                <View style={styles.notifInfo}>
                  <Text style={styles.notifLabel}>Daily Hávamál</Text>
                  <Text style={styles.notifSub}>A verse from the All-Father, every morning</Text>
                </View>
                <Switch
                  value={quoteEnabled && masterEnabled}
                  onValueChange={(val) => {
                    if (!masterEnabled) return;
                    toggleSetting('notif_quote', val, setQuoteEnabled);
                  }}
                  trackColor={{ false: 'rgba(255,255,255,0.08)', true: `${accentColor}50` }}
                  thumbColor={quoteEnabled && masterEnabled ? accentColor : 'rgba(255,255,255,0.3)'}
                  ios_backgroundColor="rgba(255,255,255,0.08)"
                  disabled={!masterEnabled}
                />
              </View>

              {quoteEnabled && masterEnabled && (
                <>
                  <View style={styles.notifDivider} />
                  <View style={styles.timePickerWrap}>
                    <Text style={styles.timePickerLabel}>DELIVERY TIME</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.timePickerScroll}
                    >
                      {QUOTE_HOURS.map((h, i) => {
                        const isSelected = quoteHour === h;
                        return (
                          <TouchableOpacity
                            key={h}
                            style={[
                              styles.timeChip,
                              isSelected && {
                                borderColor: accentColor,
                                backgroundColor: `${accentColor}18`,
                              },
                            ]}
                            onPress={() => changeQuoteHour(h)}
                            activeOpacity={0.75}
                          >
                            {isSelected && (
                              <LinearGradient
                                colors={[`${accentColor}15`, 'transparent']}
                                style={StyleSheet.absoluteFill}
                              />
                            )}
                            <Text style={[
                              styles.timeChipText,
                              { color: isSelected ? accentColor : Colors.textMuted },
                            ]}>
                              {QUOTE_HOUR_LABELS[i]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Preview of today's actual Hávamál verse */}
                  <View style={styles.quotePreview}>
                    <Text style={[styles.quotePreviewLabel, { color: accentColor }]}>
                      TODAY'S VERSE — STANZA {todayVerse.num}
                    </Text>
                    <Text style={styles.quotePreviewText}>
                      "{todayVerse.text}"
                    </Text>
                  </View>
                </>
              )}
            </View>

            <Text style={styles.footerNote}>
              Notifications are scheduled locally on your device.{'\n'}
              No data leaves your phone.
            </Text>

          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  scrollContent: { gap: 14, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  eyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 4, marginBottom: 4 },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.text, letterSpacing: 1 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  closeBtnText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted },
  permissionBanner: { borderWidth: 1, borderRadius: 14, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.9)' },
  bannerLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  permissionRune: { fontSize: 24, fontFamily: 'System' },
  permissionTitle: { fontFamily: Fonts.heading, fontSize: 14, letterSpacing: 0.5, marginBottom: 2 },
  permissionSub: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted },
  permissionArrow: { fontFamily: Fonts.heading, fontSize: 18, opacity: 0.5 },
  masterCard: { borderWidth: 1, borderRadius: 16, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.9)' },
  masterLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  masterRune: { fontSize: 22, fontFamily: 'System' },
  masterLabel: { fontFamily: Fonts.heading, fontSize: 15, letterSpacing: 0.5, marginBottom: 2 },
  masterSub: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
  notifCard: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.8)' },
  notifRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: 12 },
  notifDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: Spacing.md },
  notifRune: { fontSize: 18, fontFamily: 'System', width: 26, textAlign: 'center' },
  notifInfo: { flex: 1 },
  notifLabel: { fontFamily: Fonts.subheading, fontSize: 14, color: Colors.text, marginBottom: 2 },
  notifSub: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted },
  quoteCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.8)' },
  quoteCardLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  timePickerWrap: { paddingHorizontal: Spacing.md, paddingVertical: 12, gap: 10 },
  timePickerLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2.5, color: Colors.textMuted },
  timePickerScroll: { gap: 8 },
  timeChip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, overflow: 'hidden' },
  timeChipText: { fontFamily: Fonts.body, fontSize: 11, letterSpacing: 0.5 },
  quotePreview: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, gap: 6, backgroundColor: 'rgba(255,255,255,0.02)' },
  quotePreviewLabel: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 2 },
  quotePreviewText: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 18 },
  footerNote: { fontFamily: Fonts.proseItalic, fontSize: 11, color: Colors.textDim, fontStyle: 'italic', textAlign: 'center', lineHeight: 18, marginTop: 4 },
});