import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Share, Alert, Image, RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useWarriorStore } from '@/lib/store';
import { useWarriorProfile } from '@/lib/useWarriorProfile';
import { getRank } from '@/constants/ranks';
import { StreakFlame } from '../../components/StreakFlame';
import CrewLongshipJourney from '../../components/CrewLongshipJourney';
import BossRaidCard from '../../components/BossRaidCard';
import { getActiveOath, getOathDayCount, getCrewOaths, subscribeToCrewOaths, type Oath, type CrewOath } from '@/lib/oaths';

const ARM_RING_IMAGE = require('@/assets/images/VIKINGARMRING.png');
import {
  getLocalCrewState,
  getCrewMembers,
  getCrewInfo,
  syncMyStats,
  leaveCrew,
  subscribeToCrewChanges,
  getRankFromXP,
  formatLastActive,
  getDeviceId,
} from '@/lib/crew';
import type { CrewMember, Crew } from '@/lib/supabase';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function CrewScreen() {
  const { warrior, isPro, loadWarrior } = useWarriorStore();
  const { isShieldmaiden } = useWarriorProfile();
  const [crewId, setCrewId] = useState<string | null>(null);
  const [crewCode, setCrewCode] = useState<string | null>(null);
  const [crewName, setCrewName] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [myDeviceId, setMyDeviceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeOath, setActiveOath] = useState<Oath | null>(null);
  const [crewOaths, setCrewOaths] = useState<CrewOath[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const subscriptionRef = useRef<any>(null);
  const oathSubscriptionRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const accentColor = isShieldmaiden ? '#D4A8C4' : Colors.gold;
  const xp = warrior?.total_xp ?? 0;
  const rank = getRank(xp);

  useFocusEffect(useCallback(() => {
    loadCrew();
    loadOathState();
    // Poll every 30s as a safety net for missed subscription events —
    // crewId may not be set yet on first mount so we read it from
    // AsyncStorage inside loadCrew() rather than relying on state here.
    pollRef.current = setInterval(() => {
      loadCrew();
    }, 30000);
    return () => {
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
      if (oathSubscriptionRef.current) oathSubscriptionRef.current.unsubscribe();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []));

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  async function loadOathState() {
    const oath = await getActiveOath();
    setActiveOath(oath);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadCrew();
    setRefreshing(false);
  }

  async function loadCrew() {
    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      setMyDeviceId(deviceId);

      await loadWarrior();
      const freshWarrior = useWarriorStore.getState().warrior;

      const state = await getLocalCrewState();
      setCrewId(state.crewId);
      setCrewCode(state.crewCode);
      setCrewName(state.crewName);
      setIsLeader(state.isLeader);

      if (state.crewId) {
        await syncMyStats(
          freshWarrior?.name ?? 'Warrior',
          freshWarrior?.total_xp ?? 0,
          freshWarrior?.streak_days ?? 0,
          isShieldmaiden,
        );

        const m = await getCrewMembers(state.crewId);
        setMembers(m);

        subscriptionRef.current = subscribeToCrewChanges(
          state.crewId,
          (updated) => setMembers(updated),
        );

        const oaths = await getCrewOaths(state.crewId);
        setCrewOaths(oaths);
        oathSubscriptionRef.current = subscribeToCrewOaths(
          state.crewId,
          (updated) => setCrewOaths(updated),
        );
      }
    } catch (e) {}
    setLoading(false);
  }

  async function handleShare() {
    if (!crewCode || !crewName) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Share.share({
      message: `Join my crew "${crewName}" on Valhalla Bound!\n\nEnter code: ${crewCode}\n\nDownload Valhalla Bound on the App Store.`,
      title: `Join ${crewName}`,
    });
  }

  async function handleLeave() {
    Alert.alert(
      isLeader ? 'Disband Crew' : 'Leave Crew',
      isLeader
        ? 'Disbanding will remove all members. This cannot be undone.'
        : 'Are you sure you want to leave this crew?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isLeader ? 'Disband' : 'Leave',
          style: 'destructive',
          onPress: async () => {
            await leaveCrew();
            setCrewId(null);
            setCrewCode(null);
            setCrewName(null);
            setIsLeader(false);
            setMembers([]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  const totalCrewXP = members.reduce((a, m) => a + m.rank_xp, 0);
  const trainedToday = members.filter(m => {
    const last = new Date(m.last_active);
    const today = new Date();
    return last.toDateString() === today.toDateString();
  }).length;

  // ── NO CREW STATE ──────────────────────────────────────────
  if (!loading && !crewId) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#0C0A10', '#050508']} style={StyleSheet.absoluteFill} />
        <Text style={styles.watermark}>ᚢ</Text>

        <SafeAreaView style={styles.safe} edges={['top']}>
          <Animated.ScrollView
            style={[styles.scroll, { opacity: fadeAnim }]}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.gold}
              />
            }
          >
            <View style={styles.header}>
              <Text style={styles.eyebrow}>RAID PARTY</Text>
              <Text style={styles.title}>THE CREW</Text>
            </View>

            <View style={[styles.emptyHero, { borderColor: `${accentColor}20` }]}>
              <LinearGradient colors={[`${accentColor}08`, 'transparent']} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', accentColor, 'transparent']} style={styles.heroLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              <Text style={[styles.emptyHeroRune, { color: accentColor }]}>ᚢ</Text>
              <Text style={styles.emptyHeroTitle}>No crew yet</Text>
              <Text style={styles.emptyHeroSub}>Warriors are stronger together. Create a crew or join one with a code.</Text>
            </View>

            <TouchableOpacity
              style={[styles.actionCard, { borderColor: `${accentColor}30` }]}
              onPress={() => {
                if (!isPro) { router.push('/(modals)/paywall'); return; }
                router.push('/(modals)/create-crew' as any);
              }}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[`${accentColor}12`, `${accentColor}04`]} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', accentColor, 'transparent']} style={styles.actionCardLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              <View style={[styles.actionIconWrap, { backgroundColor: `${accentColor}15`, borderColor: `${accentColor}30` }]}>
                <Text style={[styles.actionIcon, { color: accentColor }]}>ᚲ</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.actionTitleRow}>
                  <Text style={[styles.actionTitle, { color: accentColor }]}>Create a Crew</Text>
                  {!isPro && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionSub}>Lead up to 10 warriors. Share your code and raid together.</Text>
              </View>
              <Text style={[styles.actionArrow, { color: accentColor }]}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { borderColor: 'rgba(255,255,255,0.08)' }]}
              onPress={() => router.push('/(modals)/join-crew' as any)}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['rgba(255,255,255,0.04)', 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                <Text style={styles.actionIcon}>ᚷ</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Join a Crew</Text>
                <Text style={styles.actionSub}>Enter a 6-character code to join an existing crew.</Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>WHAT IS A CREW</Text>
            <View style={styles.infoCard}>
              {[
                { rune: 'ᚢ', title: 'Raid Together', body: 'See your crewmates\' streaks, XP, and battles in real time.' },
                { rune: 'ᚦ', title: 'Shared Valor', body: 'Combined weekly XP — the crew rises and falls together.' },
                { rune: 'ᛟ', title: 'Stay Accountable', body: 'Your crew can see if you\'ve trained today. No hiding.' },
                { rune: 'ᚱ', title: 'Up to 10 Warriors', body: 'Build your raid party. Free members can join any crew.' },
              ].map((item, i) => (
                <View key={i} style={[styles.infoRow, i < 3 && styles.infoRowBorder]}>
                  <Text style={[styles.infoRune, { color: accentColor }]}>{item.rune}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoTitle}>{item.title}</Text>
                    <Text style={styles.infoBody}>{item.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.bottomRunes}>
              <Text style={[styles.bottomRuneText, { color: `${accentColor}08` }]}>ᚢ  ᚦ  ᚷ  ᚱ  ᛟ</Text>
            </View>
          </Animated.ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── IN CREW STATE ──────────────────────────────────────────
  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0C0A10', '#050508']} style={StyleSheet.absoluteFill} />
      <Text style={styles.watermark}>ᚢ</Text>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.gold}
            />
          }
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>RAID PARTY</Text>
              <Text style={styles.title}>{crewName ?? 'THE CREW'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.shareBtn, { borderColor: `${accentColor}30` }]}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[`${accentColor}12`, 'transparent']} style={StyleSheet.absoluteFill} />
              <Text style={[styles.shareBtnText, { color: accentColor }]}>ᚷ Share</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.crewStatsCard, { borderColor: `${accentColor}25` }]}>
            <LinearGradient colors={[`${accentColor}08`, 'transparent']} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['transparent', accentColor, 'transparent']} style={styles.heroLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <View style={styles.crewCodeRow}>
              <View style={[styles.codeBadge, { borderColor: `${accentColor}30`, backgroundColor: `${accentColor}10` }]}>
                <Text style={styles.codeBadgeLabel}>CREW CODE</Text>
                <Text style={[styles.codeBadgeValue, { color: accentColor }]}>{crewCode}</Text>
              </View>
              {isLeader && (
                <View style={[styles.leaderBadge, { borderColor: `${accentColor}30`, backgroundColor: `${accentColor}10` }]}>
                  <Text style={[styles.leaderBadgeText, { color: accentColor }]}>ᚲ LEADER</Text>
                </View>
              )}
            </View>
            <View style={styles.crewStatsRow}>
              <View style={styles.crewStat}>
                <Text style={[styles.crewStatVal, { color: accentColor }]}>{members.length}</Text>
                <Text style={styles.crewStatLabel}>WARRIORS</Text>
              </View>
              <View style={styles.crewStatDivider} />
              <View style={styles.crewStat}>
                <Text style={[styles.crewStatVal, { color: Colors.gold }]}>{totalCrewXP.toLocaleString()}</Text>
                <Text style={styles.crewStatLabel}>CREW VALOR</Text>
              </View>
              <View style={styles.crewStatDivider} />
              <View style={styles.crewStat}>
                <Text style={[styles.crewStatVal, { color: trainedToday === members.length ? '#4CAF50' : Colors.textMuted }]}>
                  {trainedToday}/{members.length}
                </Text>
                <Text style={styles.crewStatLabel}>TRAINED TODAY</Text>
              </View>
            </View>
            {trainedToday === members.length && members.length > 1 && (
              <View style={styles.raidBanner}>
                <LinearGradient colors={['rgba(74,175,80,0.1)', 'transparent']} style={StyleSheet.absoluteFill} />
                <Text style={styles.raidBannerText}>ᚦ  Full crew raided today — Valhalla honors you</Text>
              </View>
            )}
          </View>

          <CrewLongshipJourney totalCrewXP={totalCrewXP} />
          <BossRaidCard crewId={crewId!} memberCount={members.length} />

          <TouchableOpacity
            style={[styles.oathCard, { borderColor: `${accentColor}30` }]}
            onPress={() => router.push('/(modals)/oath' as any)}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[`${accentColor}08`, 'transparent']} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['transparent', accentColor, 'transparent']} style={styles.oathCardLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <View style={[styles.oathIconWrap, { backgroundColor: `${accentColor}12`, borderColor: `${accentColor}30` }]}>
              <Text style={[styles.oathIcon, { color: accentColor }]}>ᛏ</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.oathEyebrow, { color: accentColor }]}>
                {activeOath ? 'OATH SWORN' : 'SWEAR BEFORE YOUR JARL'}
              </Text>
              <Text style={styles.oathTitle}>{activeOath ? activeOath.title : 'The Oath'}</Text>
              <Text style={styles.oathSub}>
                {activeOath
                  ? `Day ${getOathDayCount(activeOath)} of ${activeOath.durationDays} — your crew is watching`
                  : 'Make a vow your crew will witness — and remember.'}
              </Text>
            </View>
            <Text style={[styles.oathArrow, { color: accentColor }]}>→</Text>
          </TouchableOpacity>

          {crewOaths.filter(o => o.device_id !== myDeviceId).length > 0 && (
            <View style={styles.crewOathsWrap}>
              <Text style={styles.sectionLabel}>OATHS SWORN BY YOUR CREW</Text>
              {crewOaths
                .filter(o => o.device_id !== myDeviceId)
                .map((crewOath) => (
                  <View key={crewOath.id} style={styles.crewOathRow}>
                    <View style={styles.crewOathLeft}>
                      <Text style={styles.crewOathRune}>ᛏ</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.crewOathName}>{crewOath.warrior_name}</Text>
                      <Text style={styles.crewOathTitle}>{crewOath.title}</Text>
                    </View>
                    <Text style={styles.crewOathDay}>
                      Day {crewOath.checked_in_dates.length}/{crewOath.duration_days}
                    </Text>
                  </View>
                ))}
            </View>
          )}

          <Text style={styles.sectionLabel}>YOUR WARRIORS</Text>
          <View style={styles.membersCard}>
            {members.map((member, i) => {
              const memberRank = getRankFromXP(member.rank_xp);
              const isMe = member.device_id === myDeviceId;
              const trainedTodayMember = new Date(member.last_active).toDateString() === new Date().toDateString();
              return (
                <View key={member.id} style={[styles.memberRow, i < members.length - 1 && styles.memberRowBorder]}>
                  <View style={[styles.memberIconWrap, {
                    borderColor: member.is_shieldmaiden ? 'rgba(212,168,196,0.25)' : 'rgba(201,168,76,0.25)',
                    backgroundColor: member.is_shieldmaiden ? 'rgba(212,168,196,0.08)' : 'rgba(201,168,76,0.08)',
                  }]}>
                    <Text style={[styles.memberIcon, { color: member.is_shieldmaiden ? '#D4A8C4' : Colors.gold }]}>
                      {memberRank.icon}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName} numberOfLines={1}>{member.warrior_name}</Text>
                      {isMe && (
                        <View style={[styles.meBadge, { borderColor: `${accentColor}30`, backgroundColor: `${accentColor}10` }]}>
                          <Text style={[styles.meBadgeText, { color: accentColor }]}>YOU</Text>
                        </View>
                      )}
                      {member.device_id === members[0]?.device_id && !isMe && (
                        <View style={styles.leaderSmallBadge}>
                          <Text style={styles.leaderSmallText}>ᚲ</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.memberMetaRow}>
                      <Text style={[styles.memberRank, { color: member.is_shieldmaiden ? '#D4A8C4' : Colors.gold }]}>
                        {memberRank.title}
                      </Text>
                      <Text style={styles.memberDot}>·</Text>
                      <Text style={styles.memberXP}>{member.rank_xp.toLocaleString()} valor</Text>
                      <Text style={styles.memberDot}>·</Text>
                      <Text style={[styles.memberActive, { color: trainedTodayMember ? '#4CAF50' : Colors.textDim }]}>
                        {formatLastActive(member.last_active)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.memberStreak}>
                    <StreakFlame streak={member.streak_days} size={22} />
                    <Text style={[styles.memberStreakVal, { color: member.streak_days >= 3 ? '#FF8C00' : Colors.textMuted }]}>
                      {member.streak_days}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={[styles.shareCard, { borderColor: `${accentColor}18` }]}>
            <LinearGradient colors={[`${accentColor}06`, 'transparent']} style={StyleSheet.absoluteFill} />
            <Text style={[styles.shareCardEyebrow, { color: accentColor }]}>INVITE WARRIORS</Text>
            <Text style={styles.shareCardBody}>
              Share your code <Text style={[styles.shareCardCode, { color: accentColor }]}>{crewCode}</Text> with friends to join your crew.
            </Text>
            <TouchableOpacity style={[styles.shareCardBtn, { borderColor: `${accentColor}35` }]} onPress={handleShare} activeOpacity={0.85}>
              <LinearGradient colors={[`${accentColor}18`, `${accentColor}08`]} style={StyleSheet.absoluteFill} />
              <Text style={[styles.shareCardBtnText, { color: accentColor }]}>ᚷ  Share Invite  →</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave} activeOpacity={0.7}>
            <Text style={styles.leaveBtnText}>{isLeader ? 'Disband Crew' : 'Leave Crew'}</Text>
          </TouchableOpacity>

          <View style={styles.bottomRunes}>
            <Text style={[styles.bottomRuneText, { color: `${accentColor}08` }]}>ᚢ  ᚦ  ᚷ  ᚱ  ᛟ</Text>
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
  content: { paddingBottom: 110 },
  watermark: { position: 'absolute', bottom: 100, left: -30, fontSize: 240, color: 'rgba(201,168,76,0.02)', fontFamily: 'System', transform: [{ rotate: '8deg' }], pointerEvents: 'none' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  eyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 4, color: Colors.textMuted, marginBottom: 2 },
  title: { fontFamily: Fonts.heading, fontSize: 34, color: Colors.text, letterSpacing: 1 },
  shareBtn: { borderWidth: 1, borderRadius: Radii.full, paddingHorizontal: 14, paddingVertical: 7, overflow: 'hidden', marginTop: 10 },
  shareBtnText: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 1 },
  heroLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  emptyHero: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderRadius: 20, padding: Spacing.xl, alignItems: 'center', gap: 10, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.9)' },
  emptyHeroRune: { fontSize: 52, fontFamily: 'System', opacity: 0.6, marginBottom: 4 },
  emptyHeroTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text, letterSpacing: 1 },
  emptyHeroSub: { fontFamily: Fonts.proseItalic, fontSize: 14, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center', lineHeight: 22 },
  actionCard: { marginHorizontal: Spacing.lg, marginBottom: 10, borderWidth: 1, borderRadius: 16, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.8)' },
  actionCardLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  actionIconWrap: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionIcon: { fontSize: 22, fontFamily: 'System', color: Colors.textMuted },
  actionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  actionTitle: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.text, letterSpacing: 0.5 },
  actionSub: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  actionArrow: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.textMuted, opacity: 0.5 },
  proBadge: { backgroundColor: 'rgba(201,168,76,0.12)', borderWidth: 1, borderColor: Colors.goldBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  proBadgeText: { fontFamily: Fonts.body, fontSize: 7, color: Colors.gold, letterSpacing: 1 },
  sectionLabel: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, color: Colors.textMuted, paddingHorizontal: Spacing.lg, marginBottom: 10, marginTop: 6 },
  infoCard: { marginHorizontal: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.8)' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md, gap: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  infoRune: { fontSize: 20, fontFamily: 'System', width: 28, marginTop: 2 },
  infoTitle: { fontFamily: Fonts.subheading, fontSize: 13, color: Colors.text, marginBottom: 3 },
  infoBody: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  crewStatsCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderRadius: 20, padding: Spacing.lg, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.9)', gap: 14 },
  crewCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, gap: 2 },
  codeBadgeLabel: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 2, color: Colors.textMuted },
  codeBadgeValue: { fontFamily: Fonts.heading, fontSize: 20, letterSpacing: 4 },
  leaderBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  leaderBadgeText: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 1.5 },
  crewStatsRow: { flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.02)' },
  crewStat: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 3 },
  crewStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.06)', alignSelf: 'stretch' },
  crewStatVal: { fontFamily: Fonts.heading, fontSize: 20, lineHeight: 22 },
  crewStatLabel: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 1.5, color: Colors.textMuted },
  raidBanner: { borderWidth: 1, borderColor: 'rgba(74,175,80,0.25)', borderRadius: 10, padding: 10, overflow: 'hidden', alignItems: 'center' },
  raidBannerText: { fontFamily: Fonts.proseItalic, fontSize: 13, color: '#4CAF50', fontStyle: 'italic', letterSpacing: 0.5 },
  oathCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderRadius: 16, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.85)' },
  oathCardLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  oathIconWrap: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  oathIcon: { fontSize: 22, fontFamily: 'System' },
  oathIconImage: { width: 26, height: 26, borderRadius: 6, overflow: 'hidden' },
  oathEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2.5, marginBottom: 2 },
  oathTitle: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.text, letterSpacing: 0.5, marginBottom: 2 },
  oathSub: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
  oathArrow: { fontFamily: Fonts.heading, fontSize: 18, opacity: 0.6 },
  crewOathsWrap: { marginBottom: Spacing.lg },
  crewOathRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: Spacing.lg, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: Spacing.md, backgroundColor: 'rgba(12,10,16,0.7)' },
  crewOathLeft: { width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  crewOathRune: { fontSize: 16, color: Colors.textMuted, fontFamily: 'System' },
  crewOathName: { fontFamily: Fonts.subheading, fontSize: 12, color: Colors.text, marginBottom: 2 },
  crewOathTitle: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted },
  crewOathDay: { fontFamily: Fonts.heading, fontSize: 11, color: Colors.gold, letterSpacing: 0.3 },
  membersCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.8)' },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: 12 },
  memberRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  memberIconWrap: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  memberIcon: { fontSize: 20, fontFamily: 'System' },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  memberName: { fontFamily: Fonts.subheading, fontSize: 14, color: Colors.text, flex: 1 },
  meBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  meBadgeText: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 1 },
  leaderSmallBadge: { paddingHorizontal: 4 },
  leaderSmallText: { fontSize: 12, color: Colors.gold, fontFamily: 'System' },
  memberMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  memberRank: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 0.5 },
  memberDot: { color: Colors.textDim, fontSize: 10 },
  memberXP: { fontFamily: Fonts.prose, fontSize: 10, color: Colors.textMuted },
  memberActive: { fontFamily: Fonts.prose, fontSize: 10 },
  memberStreak: { alignItems: 'center', gap: 2 },
  memberStreakVal: { fontFamily: Fonts.heading, fontSize: 12, lineHeight: 13 },
  shareCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderRadius: 16, padding: Spacing.lg, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.6)', gap: 10 },
  shareCardEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 3 },
  shareCardBody: { fontFamily: Fonts.prose, fontSize: 13, color: Colors.textMuted, lineHeight: 20 },
  shareCardCode: { fontFamily: Fonts.heading, fontSize: 14, letterSpacing: 3 },
  shareCardBtn: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center', overflow: 'hidden' },
  shareCardBtnText: { fontFamily: Fonts.heading, fontSize: 13, letterSpacing: 2 },
  leaveBtn: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, padding: Spacing.md, alignItems: 'center' },
  leaveBtnText: { fontFamily: Fonts.body, fontSize: 11, color: Colors.blood, letterSpacing: 1, opacity: 0.6 },
  bottomRunes: { alignItems: 'center', paddingVertical: Spacing.md },
  bottomRuneText: { fontFamily: 'System', fontSize: 13, letterSpacing: 10 },
});