import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width } = Dimensions.get('window');

// ── Crew Rank Tiers ──────────────────────────────────────
// Thresholds scaled ~10x from initial draft — this should be a
// sustained, multi-week crew effort, not something one solo
// grinder gets halfway through alone.
export interface CrewTier {
  name: string;
  target: string;
  minXP: number;
}

export const CREW_TIERS: CrewTier[] = [
  { name: 'Strandhögg Band', target: 'The Coastal Village', minXP: 0 },
  { name: 'Félag', target: "Lindisfarne's Shore", minXP: 50000 },
  { name: 'Herlith', target: 'The Frankish Coast', minXP: 200000 },
  { name: "Sækonungar's Fleet", target: 'Miklagård', minXP: 600000 },
  { name: 'Einherjar Legion', target: 'The Gates of Valhalla', minXP: 1500000 },
];

export function getCrewTier(totalXP: number) {
  let current = CREW_TIERS[0];
  let next: CrewTier | null = CREW_TIERS[1] ?? null;
  for (let i = 0; i < CREW_TIERS.length; i++) {
    if (totalXP >= CREW_TIERS[i].minXP) {
      current = CREW_TIERS[i];
      next = CREW_TIERS[i + 1] ?? null;
    }
  }
  const progress = next
    ? Math.min(1, (totalXP - current.minXP) / (next.minXP - current.minXP))
    : 1;
  return { current, next, progress };
}

// ── Stylized castle/fortress for the raid target ──────────────
function CastleIcon({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {/* Base wall */}
      <Rect x="8" y="34" width="44" height="20" fill={Colors.gold} />
      {/* Battlements */}
      <Rect x="8" y="28" width="6" height="6" fill={Colors.gold} />
      <Rect x="18" y="28" width="6" height="6" fill={Colors.gold} />
      <Rect x="28" y="28" width="6" height="6" fill={Colors.gold} />
      <Rect x="38" y="28" width="6" height="6" fill={Colors.gold} />
      <Rect x="48" y="28" width="6" height="6" fill={Colors.gold} />
      {/* Left tower */}
      <Rect x="6" y="16" width="12" height="38" fill={Colors.gold} />
      <Path d="M 6 16 L 12 6 L 18 16 Z" fill={Colors.gold} />
      {/* Right tower */}
      <Rect x="42" y="16" width="12" height="38" fill={Colors.gold} />
      <Path d="M 42 16 L 48 6 L 54 16 Z" fill={Colors.gold} />
      {/* Gate */}
      <Path d="M 24 54 L 24 40 Q 30 34 36 40 L 36 54 Z" fill="rgba(5,5,8,0.7)" />
    </Svg>
  );
}

// ── Main component ──────────────────────────────────────
interface Props {
  totalCrewXP: number;
}

export default function CrewLongshipJourney({ totalCrewXP }: Props) {
  const { current, next, progress } = getCrewTier(totalCrewXP);
  const shipAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(shipAnim, {
      toValue: progress,
      duration: 1400,
      useNativeDriver: false,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [progress]);

  const trackWidth = width - Spacing.lg * 2 - 80; // leave room for ship + target icon
  const shipLeft = shipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, trackWidth],
  });
  const bob = waveAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(201,168,76,0.08)', 'transparent']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', Colors.gold, 'transparent']}
        style={styles.topLine}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>CREW RANK</Text>
        <Text style={styles.tierName}>{current.name}</Text>
      </View>

      <Text style={styles.voyageText}>
        Sailing toward <Text style={styles.voyageTarget}>{next ? next.target : current.target}</Text>
      </Text>

      {/* Ocean path */}
      <View style={styles.ocean}>
        <LinearGradient
          colors={['rgba(168,196,212,0.08)', 'rgba(8,6,16,0)']}
          style={StyleSheet.absoluteFill}
        />
        {/* Dashed path line */}
        <View style={styles.pathLine} />

        {/* Start marker */}
        <View style={[styles.portMarker, { left: -4 }]}>
          <Text style={styles.portIcon}>⚒</Text>
        </View>

        {/* Ship — real drakkar asset. Split into two nested
            Animated.Views so the JS-driven horizontal position and
            the native-driven bobbing don't fight over the same node. */}
        <Animated.View style={[styles.shipWrap, { left: shipLeft }]}>
          <Animated.View style={{ transform: [{ translateY: bob }] }}>
            <Image
              source={require('../../assets/images/drakkar.png')}
              style={styles.shipImage}
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>

        {/* Target marker */}
        <View style={styles.targetMarker}>
          {next ? <CastleIcon size={26} /> : <Text style={styles.targetIcon}>✦</Text>}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.progressText}>
          {next
            ? `${Math.round(progress * 100)}% to ${next.name}`
            : 'Final destination reached — Valhalla awaits'}
        </Text>
        <Text style={styles.xpText}>{totalCrewXP.toLocaleString()} Crew Valor</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
    borderRadius: 20,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,8,14,0.95)',
  },
  topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },

  header: { marginBottom: 4 },
  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: 'rgba(201,168,76,0.6)',
    marginBottom: 2,
  },
  tierName: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Colors.gold,
    letterSpacing: 0.5,
  },

  voyageText: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  voyageTarget: { color: Colors.gold, fontStyle: 'normal' },

  ocean: {
    height: 70,
    marginBottom: Spacing.md,
    justifyContent: 'center',
    position: 'relative',
  },
  pathLine: {
    position: 'absolute',
    left: 0, right: 0, top: '50%',
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
  },
  portMarker: {
    position: 'absolute',
    top: '50%',
    marginTop: -10,
    width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  portIcon: { fontSize: 14, opacity: 0.5 },
  shipWrap: {
    position: 'absolute',
    top: '50%',
    marginTop: -19,
  },
  shipImage: {
    width: 42,
    height: 38,
  },
  targetMarker: {
    position: 'absolute',
    right: -4,
    top: '50%',
    marginTop: -14,
    width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  targetIcon: { fontSize: 20 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    letterSpacing: 1,
    color: Colors.textMuted,
  },
  xpText: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.gold,
  },
});