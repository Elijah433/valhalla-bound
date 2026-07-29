import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWarriorStore } from '@/lib/store';
import { WORKOUT_XP } from '@/constants/ranks';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

// All challenges complete as a 'recovery' type workout — same fixed XP as
// Sacred Rest, and the same recordWorkout() call that feeds streak, boss
// damage, and weekly stats exactly like any other logged activity.
const CHALLENGE_XP = WORKOUT_XP.recovery;

const CHALLENGE_POOL = [
  { id: 'c1',  title: 'Cold Plunge',       desc: 'Take a cold shower, at least 60 seconds.',          rune: 'ᛁ' },
  { id: 'c2',  title: "Raider's March",    desc: 'Walk at least 2 miles today.',                       rune: 'ᚢ' },
  { id: 'c3',  title: 'Iron Discipline',   desc: 'Lift weights, even a short session.',                rune: 'ᚦ' },
  { id: 'c4',  title: "Skald's Page",      desc: 'Read at least 10 pages of a book.',                  rune: 'ᛗ' },
  { id: 'c5',  title: 'Act of Courage',    desc: 'Do one thing today that scares you a little.',       rune: 'ᛏ' },
  { id: 'c6',  title: 'Silent Hours',      desc: 'No social media for 2 hours straight.',              rune: 'ᛟ' },
  { id: 'c7',  title: 'Dawn Riser',        desc: 'Wake up before sunrise.',                            rune: 'ᚨ' },
  { id: 'c8',  title: "Drengskapr's Word", desc: 'Tell someone the truth you\'ve been avoiding.',       rune: 'ᛞ' },
  { id: 'c9',  title: 'Cleared Mind',      desc: 'Sit in silence for 10 minutes, no phone.',           rune: 'ᛋ' },
  { id: 'c10', title: 'Fed Right',         desc: 'Eat a full day of meals with no processed sugar.',    rune: 'ᛈ' },
  { id: 'c11', title: "Wolf's Patience",   desc: 'Go a full hour without complaining, even silently.',  rune: 'ᛜ' },
  { id: 'c12', title: 'Kept Word',         desc: 'Follow through on one promise you made to yourself.', rune: 'ᛒ' },
  { id: 'c13', title: 'Empty Cup',         desc: 'Go the whole day without alcohol.',                  rune: 'ᛇ' },
  { id: 'c14', title: 'Mended Bridge',     desc: 'Reach out to someone you\'ve lost touch with.',       rune: 'ᛚ' },
  { id: 'c15', title: "Smith's Hands",     desc: 'Build, fix, or make something with your own hands.',  rune: 'ᛉ' },
  { id: 'c16', title: 'Cleared Hall',      desc: 'Clean and organize one room in your home.',          rune: 'ᛃ' },
  { id: 'c17', title: 'Earned Sleep',      desc: 'Get to bed at least 30 minutes earlier than usual.',  rune: 'ᚺ' },
  { id: 'c18', title: 'Hydrated Warrior',  desc: 'Drink at least 8 cups of water today.',              rune: 'ᚾ' },
  { id: 'c19', title: 'Stoic Mind',        desc: 'Write down 3 things you\'re grateful for.',           rune: 'ᛖ' },
  { id: 'c20', title: 'Gift to a Stranger',desc: 'Do something kind for someone who won\'t know it was you.', rune: 'ᛡ' },
  { id: 'c21', title: 'Cold Sun',          desc: 'Spend 15 minutes outside, no screen in hand.',       rune: 'ᚹ' },
  { id: 'c22', title: 'Spoken Honor',      desc: 'Give a genuine compliment to someone today.',        rune: 'ᛕ' },
  { id: 'c23', title: 'Forged Focus',      desc: 'Do one hard task you\'ve been putting off.',          rune: 'ᚳ' },
  { id: 'c24', title: 'Counted Breath',    desc: 'Do 5 minutes of deep, deliberate breathing.',        rune: 'ᛂ' },
];

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Same deterministic-by-date pattern as Trials' getDailyQuests() — everyone
// sees the same 3 challenges on the same calendar day, rotating at midnight.
function getDailyChallenges() {
  const todayKey = getTodayKey();
  const seed = todayKey.split('-').reduce((a, b) => a + parseInt(b), 0);
  const shuffled = [...CHALLENGE_POOL].sort((a, b) => {
    const ha = (seed * a.id.charCodeAt(1)) % 97;
    const hb = (seed * b.id.charCodeAt(1)) % 97;
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}

export default function VikingChallengesScreen() {
  const { recordWorkout, isPro } = useWarriorStore();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const dailyChallenges = getDailyChallenges();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    loadCompletedChallenges();
  }, []));

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  async function loadCompletedChallenges() {
    try {
      const raw = await AsyncStorage.getItem(`viking_challenges_completed_${getTodayKey()}`);
      setCompletedIds(raw ? JSON.parse(raw) : []);
    } catch (e) {}
  }

  function completeChallenge(challenge: typeof CHALLENGE_POOL[0]) {
    if (completedIds.includes(challenge.id)) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated = [...completedIds, challenge.id];
    setCompletedIds(updated);
    AsyncStorage.setItem(`viking_challenges_completed_${getTodayKey()}`, JSON.stringify(updated));
    // Logs as a 'recovery' workout — same XP value as Sacred Rest, and the
    // same call path that updates streak, weekly stats, and (if in a crew)
    // deals boss damage, exactly like completing an Ordained Trial does.
    recordWorkout('recovery');
  }

  const completedCount = completedIds.length;
  const totalChallenges = dailyChallenges.length;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0C0A10', '#050508']} style={StyleSheet.absoluteFill} />
      <Text style={styles.watermark}>ᛏ</Text>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← BACK</Text>
            </TouchableOpacity>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.eyebrow}>DAILY</Text>
                <Text style={styles.title}>VIKING{'\n'}CHALLENGES</Text>
              </View>
              {isPro && (
                <View style={styles.questCounter}>
                  <Text style={styles.questCounterNum}>{completedCount}</Text>
                  <View style={styles.questCounterDivider} />
                  <Text style={styles.questCounterTotal}>{totalChallenges}</Text>
                  <Text style={styles.questCounterLabel}>DONE</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitle}>
              Not every battle is fought with iron. These trials forge character.
            </Text>
          </View>

          {isPro ? (
            <>
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${(completedCount / totalChallenges) * 100}%` }]}>
                    <LinearGradient
                      colors={[Colors.goldDark, Colors.gold]}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  </View>
                </View>
                <Text style={styles.progressText}>
                  {completedCount === totalChallenges
                    ? 'All challenges complete — your character is forged'
                    : `${totalChallenges - completedCount} challenge${totalChallenges - completedCount !== 1 ? 's' : ''} remaining`}
                </Text>
              </View>

              {dailyChallenges.map((challenge) => {
                const isDone = completedIds.includes(challenge.id);
                return (
                  <TouchableOpacity
                    key={challenge.id}
                    style={[styles.challengeCard, isDone && styles.challengeCardDone]}
                    onPress={() => completeChallenge(challenge)}
                    activeOpacity={0.75}
                    disabled={isDone}
                  >
                    {isDone && (
                      <LinearGradient
                        colors={['rgba(201,168,76,0.04)', 'transparent']}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <LinearGradient
                      colors={['transparent', Colors.gold, 'transparent']}
                      style={[styles.challengeCardLine, isDone && { opacity: 0.3 }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                    <View style={[styles.challengeRune, isDone && styles.challengeRuneDone]}>
                      <Text style={[styles.challengeRuneText, isDone && { color: Colors.gold, opacity: 0.4 }]}>
                        {isDone ? '✓' : challenge.rune}
                      </Text>
                    </View>
                    <View style={styles.challengeInfo}>
                      <Text style={[styles.challengeTitle, isDone && styles.challengeTitleDone]}>
                        {challenge.title}
                      </Text>
                      <Text style={styles.challengeDesc}>{challenge.desc}</Text>
                    </View>
                    <View style={styles.challengeXPWrap}>
                      <Text style={[styles.challengeXP, isDone && { opacity: 0.3 }]}>
                        {isDone ? '✦' : `+${CHALLENGE_XP}`}
                      </Text>
                      <Text style={styles.challengeXPLabel}>
                        {isDone ? 'CLAIMED' : 'VALOR'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <View style={styles.noteCard}>
                <Text style={styles.noteText}>
                  New challenges rise with the sun. Return tomorrow for three more.
                </Text>
              </View>
            </>
          ) : (
            <TouchableOpacity
              style={styles.proLockCard}
              onPress={() => router.push('/(modals)/paywall')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['rgba(201,168,76,0.08)', 'transparent']}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['transparent', Colors.gold, 'transparent']}
                style={styles.proLockCardLine}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
              <View style={styles.proLockLeft}>
                <Text style={styles.proLockRune}>ᚲ</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.proLockTitle}>Viking Challenges</Text>
                <Text style={styles.proLockSub}>
                  Daily character trials beyond the gym. Unlock with Einherjar Pro.
                </Text>
              </View>
              <View style={styles.proLockBadge}>
                <Text style={styles.proLockBadgeText}>PRO</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.bottomRunes}>
            <Text style={styles.bottomRuneText}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ</Text>
          </View>

        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 80 },

  watermark: {
    position: 'absolute',
    bottom: 120, right: -20,
    fontSize: 220,
    color: 'rgba(201,168,76,0.025)',
    fontFamily: 'System',
    transform: [{ rotate: '-15deg' }],
    pointerEvents: 'none',
  },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 4 },
  backBtnText: { fontFamily: Fonts.body, fontSize: 11, letterSpacing: 2, color: Colors.textMuted },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 4,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 30,
    color: Colors.text,
    letterSpacing: 1,
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: Fonts.proseItalic,
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 19,
  },
  questCounter: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 14,
    backgroundColor: Colors.goldMuted,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
    gap: 2,
  },
  questCounterNum: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Colors.gold,
    lineHeight: 20,
  },
  questCounterDivider: {
    width: 20, height: 1,
    backgroundColor: Colors.goldBorder,
  },
  questCounterTotal: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  questCounterLabel: {
    fontFamily: Fonts.body,
    fontSize: 6,
    letterSpacing: 1.5,
    color: Colors.textMuted,
    marginTop: 2,
  },

  progressWrap: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: 8,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressText: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textDim,
    fontStyle: 'italic',
  },

  challengeCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
  },
  challengeCardDone: {
    borderColor: 'rgba(201,168,76,0.12)',
    opacity: 0.55,
  },
  challengeCardLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  challengeRune: {
    width: 40, height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeRuneDone: {
    backgroundColor: 'rgba(201,168,76,0.06)',
    borderColor: 'rgba(201,168,76,0.15)',
  },
  challengeRuneText: {
    fontSize: 18,
    color: Colors.textMuted,
    fontFamily: 'System',
  },
  challengeInfo: { flex: 1 },
  challengeTitle: {
    fontFamily: Fonts.subheading,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 3,
  },
  challengeTitleDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  challengeDesc: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  challengeXPWrap: { alignItems: 'flex-end' },
  challengeXP: {
    fontFamily: Fonts.heading,
    fontSize: 17,
    color: Colors.gold,
  },
  challengeXPLabel: {
    fontFamily: Fonts.body,
    fontSize: 7,
    letterSpacing: 2,
    color: Colors.textMuted,
  },

  noteCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  noteText: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textDim,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  proLockCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 16,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.9)',
  },
  proLockCardLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  proLockLeft: {
    width: 44, height: 44,
    borderRadius: 12,
    backgroundColor: Colors.goldMuted,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proLockRune: {
    fontSize: 22,
    color: Colors.gold,
    fontFamily: 'System',
  },
  proLockTitle: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.gold,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  proLockSub: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  proLockBadge: {
    backgroundColor: Colors.goldMuted,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proLockBadgeText: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.gold,
    letterSpacing: 1.5,
  },

  bottomRunes: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  bottomRuneText: {
    fontFamily: 'System',
    fontSize: 13,
    color: 'rgba(201,168,76,0.08)',
    letterSpacing: 10,
  },
});