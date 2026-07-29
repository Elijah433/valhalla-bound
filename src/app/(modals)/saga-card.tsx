import { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useWarriorStore } from '@/lib/store';
import { useWarriorProfile } from '@/lib/useWarriorProfile';
import { getRank } from '@/constants/ranks';
import { getRecentSagaEntries, type SagaEntry } from '@/lib/db';
import { Colors, Fonts, Spacing } from '@/constants/theme';

const { width } = Dimensions.get('window');
// Card width is fixed and independent of device width, so the exported
// image is consistent across all devices. Height is NOT fixed — see
// CARD_MIN_SIZE below — because a Chronicle quote needs room to breathe
// and a hard square would either clip it or force it down to an
// unreadable size.
const CARD_WIDTH = Math.min(width - Spacing.lg * 2, 360);
const CARD_MIN_SIZE = CARD_WIDTH; // stats-only card stays square at minimum

export default function SagaCardScreen() {
  const { warrior, workoutCount, totalMiles, isPro } = useWarriorStore();
  const { isShieldmaiden } = useWarriorProfile();

  const viewShotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);
  const [latestEntry, setLatestEntry] = useState<SagaEntry | null>(null);

  const accentColor = isShieldmaiden ? '#D4A8C4' : Colors.gold;
  const xp = warrior?.total_xp ?? 0;
  const rank = getRank(xp);
  const streak = warrior?.streak_days ?? 0;
  const warriorName = warrior?.name ?? 'WARRIOR';

  useEffect(() => {
    // Only Pro warriors have Chronicle entries to begin with (generation
    // itself is Pro-gated in store.ts), so this naturally returns nothing
    // for free users — no separate check needed here.
    try {
      const recent = getRecentSagaEntries(1);
      setLatestEntry(recent[0] ?? null);
    } catch (e) {
      setLatestEntry(null);
    }
  }, []);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/sagas' as any);
  }

  async function handleShare() {
    if (!viewShotRef.current) return;
    setSharing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uri = await (viewShotRef.current as any).capture();
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share Your Saga',
      });
    } catch (e) {
      Alert.alert('Could Not Share', 'Something went wrong creating your saga card. Please try again.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0A0610', '#050508']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SHARE YOUR SAGA</Text>
        </View>

        <View style={styles.cardWrap}>
          {/* Everything inside ViewShot is what gets captured — no buttons,
              no chrome, just the card itself. Height is auto (not fixed)
              so the Chronicle quote below has room without being clipped
              or forced into unreadable tiny text. */}
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1, result: 'tmpfile' }}
            style={[styles.card, { width: CARD_WIDTH, minHeight: CARD_MIN_SIZE, borderColor: `${accentColor}30` }]}
          >
            <LinearGradient
              colors={['#120E1A', '#0A0712', '#08060E']}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={[`${accentColor}12`, 'transparent']}
              style={StyleSheet.absoluteFill}
            />

            {/* Rune watermark, subtle background texture */}
            <Text style={[styles.cardWatermark, { color: `${accentColor}06` }]}>{rank.icon}</Text>

            <View style={styles.cardInner}>
              <Text style={[styles.cardEyebrow, { color: `${accentColor}90` }]}>VALHALLA BOUND</Text>

              <Text style={styles.cardRankIcon}>{rank.icon}</Text>
              <Text style={[styles.cardRankTitle, { color: accentColor }]}>{rank.title.toUpperCase()}</Text>
              <Text style={styles.cardWarriorName}>{warriorName}</Text>

              <View style={[styles.cardDivider, { backgroundColor: `${accentColor}25` }]} />

              <View style={styles.cardStatsRow}>
                <View style={styles.cardStat}>
                  <Text style={[styles.cardStatVal, { color: accentColor }]}>{xp.toLocaleString()}</Text>
                  <Text style={styles.cardStatLabel}>TOTAL VALOR</Text>
                </View>
                <View style={styles.cardStat}>
                  <Text style={[styles.cardStatVal, { color: accentColor }]}>{streak}</Text>
                  <Text style={styles.cardStatLabel}>DAY STREAK</Text>
                </View>
              </View>
              <View style={styles.cardStatsRow}>
                <View style={styles.cardStat}>
                  <Text style={[styles.cardStatVal, { color: accentColor }]}>{workoutCount}</Text>
                  <Text style={styles.cardStatLabel}>BATTLES FOUGHT</Text>
                </View>
                <View style={styles.cardStat}>
                  <Text style={[styles.cardStatVal, { color: accentColor }]}>{totalMiles}</Text>
                  <Text style={styles.cardStatLabel}>MILES RAIDED</Text>
                </View>
              </View>

              {/* Chronicle quote — only Pro warriors ever have an entry to
                  show, so this naturally disappears for free users without
                  any extra gating logic here. Gives the share card a piece
                  of genuinely unique, personal content instead of only
                  numbers anyone's fitness app could produce. */}
              {latestEntry && (
                <>
                  <View style={[styles.cardDivider, { backgroundColor: `${accentColor}25`, marginTop: 14 }]} />
                  <Text style={[styles.cardChronicleEyebrow, { color: `${accentColor}70` }]}>SKALD'S CHRONICLE</Text>
                  <Text style={styles.cardChronicleText} numberOfLines={4}>
                    "{latestEntry.entry}"
                  </Text>
                </>
              )}

              <Text style={[styles.cardFooterRunes, { color: `${accentColor}30` }]}>ᚠ ᚢ ᚦ ᚨ ᚱ</Text>
            </View>
          </ViewShot>
        </View>

        {isPro ? (
          <TouchableOpacity
            style={[styles.shareBtn, { opacity: sharing ? 0.7 : 1 }]}
            onPress={handleShare}
            disabled={sharing}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[accentColor, isShieldmaiden ? '#8B3A6A' : Colors.goldDark]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
            <Text style={styles.shareBtnText}>{sharing ? 'PREPARING...' : 'SHARE MY SAGA  →'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.proLockBtn}
            onPress={() => router.push('/(modals)/paywall')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['rgba(201,168,76,0.1)', 'transparent']} style={StyleSheet.absoluteFill} />
            <Text style={styles.proLockText}>Sharing your Saga is a Pro feature — unlock it →</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    alignItems: 'center',
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  backBtnText: { fontFamily: Fonts.body, fontSize: 11, letterSpacing: 2, color: Colors.textMuted },
  headerTitle: {
    fontFamily: Fonts.heading, fontSize: 16, color: Colors.text,
    letterSpacing: 2, marginTop: 4,
  },

  cardWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardWatermark: {
    position: 'absolute',
    fontSize: 220,
    fontFamily: 'System',
    bottom: -30, right: -20,
  },
  cardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 8,
  },
  cardEyebrow: {
    fontFamily: Fonts.body, fontSize: 9, letterSpacing: 4,
    marginBottom: 4,
  },
  cardRankIcon: { fontSize: 40, marginBottom: 2 },
  cardRankTitle: {
    fontFamily: Fonts.display, fontSize: 22, letterSpacing: 2,
  },
  cardWarriorName: {
    fontFamily: Fonts.heading, fontSize: 15, color: Colors.text,
    letterSpacing: 1, marginBottom: 4,
  },
  cardDivider: { width: '60%', height: 1, marginVertical: 10 },
  cardStatsRow: {
    flexDirection: 'row', width: '100%', justifyContent: 'space-around',
  },
  cardStat: { alignItems: 'center', gap: 2 },
  cardStatVal: { fontFamily: Fonts.heading, fontSize: 22, lineHeight: 24 },
  cardStatLabel: {
    fontFamily: Fonts.body, fontSize: 7, letterSpacing: 1.5,
    color: Colors.textMuted,
  },
  cardChronicleEyebrow: {
    fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2.5,
    marginBottom: 4,
  },
  cardChronicleText: {
    fontFamily: Fonts.proseItalic, fontSize: 13, color: Colors.text,
    fontStyle: 'italic', textAlign: 'center', lineHeight: 19,
    paddingHorizontal: 8,
  },
  cardFooterRunes: {
    fontFamily: 'System', fontSize: 11, letterSpacing: 6,
    marginTop: 14,
  },

  shareBtn: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: 14,
    overflow: 'hidden',
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareBtnText: {
    fontFamily: Fonts.heading, fontSize: 14,
    color: Colors.void, letterSpacing: 2,
  },

  proLockBtn: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    overflow: 'hidden',
    paddingVertical: 16,
    alignItems: 'center',
  },
  proLockText: {
    fontFamily: Fonts.heading, fontSize: 13,
    color: Colors.gold, letterSpacing: 0.5,
  },
});