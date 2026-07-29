import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Image, AppState, type AppStateStatus } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';
import {
  BOSS_ROSTER,
  getActiveBossRaid,
  subscribeToBossRaid,
  type BossRaid,
} from '@/lib/bossRaid';

// ── Boss portraits — AI-generated art per boss, indexed to match BOSS_ROSTER ──
const BOSS_IMAGES = [
  require('@/assets/images/fenrir.png'),       // 0 — Fenrir
  require('@/assets/images/jormungandr.png'),  // 1 — Jörmungandr
  require('@/assets/images/sutr.png'),        // 2 — Surtr
  require('@/assets/images/hel.png'),          // 3 — Hel
  require('@/assets/images/ghostship.png'),    // 4 — Naglfar's Crew
];

function BossIcon({ index, size = 40 }: { index: number; size?: number }) {
  const source = BOSS_IMAGES[index % BOSS_IMAGES.length];
  return (
    <Image
      source={source}
      style={{ width: size, height: size, borderRadius: size / 4 }}
      resizeMode="cover"
    />
  );
}

interface Props {
  crewId: string;
  memberCount: number;
}

export default function BossRaidCard({ crewId, memberCount }: Props) {
  const [raid, setRaid] = useState<BossRaid | null>(null);
  const fillAnim = useRef(new Animated.Value(0)).current;
  const subscriptionRef = useRef<any>(null);
  const mountedRef = useRef(true);

  function connect() {
    // Re-fetch fresh data and (re)establish the realtime subscription.
    // Used both on initial mount and whenever the app returns to the
    // foreground, since a realtime websocket connection can silently drop
    // during extended backgrounding without the app being notified —
    // previously this only happened once on mount, so a dropped connection
    // left the card showing stale HP until a full app relaunch forced the
    // component to remount.
    getActiveBossRaid(crewId, memberCount).then(r => {
      if (mountedRef.current) setRaid(r);
    });

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    subscriptionRef.current = subscribeToBossRaid(crewId, (updated) => {
      if (mountedRef.current) setRaid(updated);
    });
  }

  useEffect(() => {
    mountedRef.current = true;
    connect();

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        connect();
      }
    };
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      mountedRef.current = false;
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
      appStateSubscription.remove();
    };
  }, [crewId, memberCount]);

  useEffect(() => {
    if (!raid) return;
    const pct = Math.max(0, Math.min(1, raid.current_hp / raid.max_hp));
    Animated.timing(fillAnim, {
      toValue: pct,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [raid?.current_hp, raid?.max_hp]);

  if (!raid) return null;

  const boss = BOSS_ROSTER[raid.boss_index % BOSS_ROSTER.length];
  const isDefeated = raid.status === 'defeated';
  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const hpPct = Math.round((raid.current_hp / raid.max_hp) * 100);

  return (
    <View style={[styles.card, { borderColor: `${boss.color}35` }]}>
      <LinearGradient
        colors={[`${boss.color}12`, 'transparent']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', boss.color, 'transparent']}
        style={styles.topLine}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <View style={styles.header}>
        <View style={[styles.iconWrap, { borderColor: `${boss.color}40`, backgroundColor: `${boss.color}12` }]}>
          <BossIcon index={raid.boss_index} size={48} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>BOSS RAID</Text>
          <Text style={[styles.bossName, { color: boss.color }]}>{boss.name}</Text>
        </View>
        {isDefeated && (
          <View style={[styles.slainBadge, { borderColor: `${boss.color}50` }]}>
            <Text style={[styles.slainText, { color: boss.color }]}>SLAIN</Text>
          </View>
        )}
      </View>

      <Text style={styles.lore}>{boss.lore}</Text>

      {/* Health bar */}
      <View style={styles.healthTrack}>
        <Animated.View style={[styles.healthFill, { width: fillWidth }]}>
          <LinearGradient
            colors={isDefeated ? ['#4CAF50', '#2E7D32'] : [boss.color, `${boss.color}AA`]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.hpText}>
          {isDefeated
            ? 'Boss defeated — the next foe approaches'
            : `${raid.current_hp.toLocaleString()} / ${raid.max_hp.toLocaleString()} HP`}
        </Text>
        <Text style={[styles.hpPct, { color: boss.color }]}>
          {isDefeated ? '✦' : `${hpPct}%`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,8,14,0.95)',
  },
  topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconWrap: {
    width: 60, height: 60,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  bossName: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    letterSpacing: 0.5,
  },
  slainBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  slainText: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 2,
  },

  lore: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },

  healthTrack: {
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  healthFill: {
    height: '100%',
    borderRadius: 7,
    overflow: 'hidden',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hpText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    letterSpacing: 0.5,
    color: Colors.textMuted,
  },
  hpPct: {
    fontFamily: Fonts.heading,
    fontSize: 13,
  },
});