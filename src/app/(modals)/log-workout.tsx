import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWarriorStore } from '@/lib/store';
import { WORKOUT_META, WORKOUT_XP, getRank, type WorkoutType } from '@/constants/ranks';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const WORKOUT_TYPES: WorkoutType[] = ['strength', 'endurance', 'combat', 'recovery'];

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

export default function LogWorkoutModal() {
  const [selected, setSelected] = useState<WorkoutType | null>(null);
  const [loggedTypes, setLoggedTypes] = useState<WorkoutType[]>([]);
  const recordWorkout = useWarriorStore((s) => s.recordWorkout);

  useEffect(() => {
    loadLoggedTypes();
  }, []);

  async function loadLoggedTypes() {
    try {
      const raw = await AsyncStorage.getItem(`manual_logged_types_${getTodayKey()}`);
      setLoggedTypes(raw ? JSON.parse(raw) : []);
    } catch (e) {}
  }

  function selectType(type: WorkoutType) {
    setSelected(type);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleLog() {
    if (!selected) {
      Alert.alert('Choose your trial', 'Select a battle type before claiming victory.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const alreadyLogged = loggedTypes.includes(selected);

    // Update logged types for today
    if (!alreadyLogged) {
      const updated = [...loggedTypes, selected];
      setLoggedTypes(updated);
      await AsyncStorage.setItem(`manual_logged_types_${getTodayKey()}`, JSON.stringify(updated));
    }

    // Capture XP before recording
    const prevXP = useWarriorStore.getState().warrior?.total_xp ?? 0;
    const xpGained = alreadyLogged ? 0 : recordWorkout(selected);
    const { warrior, workoutCount } = useWarriorStore.getState();

    // If already logged today, just go back — no XP, no victory screen
    if (alreadyLogged) {
      Alert.alert(
        'Already logged today',
        `You already earned Valor for ${WORKOUT_META[selected].label} today. The workout is recorded but no XP is awarded.`,
        [{ text: 'Understood', onPress: () => router.back() }]
      );
      return;
    }

    // Check for new rune
    const MILESTONES = [5, 10, 15, 20, 30, 40, 50, 75];
    const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ'];
    const newRuneIndex = MILESTONES.indexOf(workoutCount);
    const newRune = newRuneIndex >= 0 ? RUNES[newRuneIndex] : undefined;

    // Check for rank up
    const prevRank = getRank(prevXP);
    const newRank = getRank(prevXP + xpGained);
    const rankedUp = newRank.title !== prevRank.title;

    // Only show full victory screen for special moments
    const isSpecial = !!newRune || rankedUp;

    if (isSpecial) {
      router.replace({
        pathname: '/(modals)/victory',
        params: {
          workoutType: selected,
          xpGained: String(xpGained),
          newRune: newRune ?? '',
          rankedUp: String(rankedUp),
          newRankTitle: rankedUp ? newRank.title : '',
          streakDays: String(warrior?.streak_days ?? 0),
        },
      });
    } else {
      router.back();
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.handle} />

        <Text style={styles.title}>Begin a Trial</Text>
        <Text style={styles.subtitle}>
          Choose your battle. Each victory earns Valor and brings you closer to Valhalla.
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {WORKOUT_TYPES.map((type) => {
              const meta = WORKOUT_META[type];
              const isSelected = selected === type;
              const alreadyLogged = loggedTypes.includes(type);
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeCard, isSelected && styles.typeCardSelected]}
                  onPress={() => selectType(type)}
                  activeOpacity={0.8}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={['rgba(201,168,76,0.1)', 'transparent']}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  )}
                  <Text style={styles.typeEmoji}>{meta.icon}</Text>
                  <Text style={styles.typeName}>{meta.label}</Text>
                  <View style={[styles.typeXPBadge, alreadyLogged && styles.typeXPBadgeDone]}>
                    <Text style={[styles.typeXP, alreadyLogged && styles.typeXPDone]}>
                      {alreadyLogged ? '✦ LOGGED' : `+${WORKOUT_XP[type]} XP`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {selected && (
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedLabel}>SELECTED TRIAL</Text>
              <Text style={styles.selectedValue}>{WORKOUT_META[selected].label}</Text>
              <Text style={styles.selectedXP}>
                {loggedTypes.includes(selected)
                  ? 'Already logged today — no XP will be awarded'
                  : `+${WORKOUT_XP[selected]} Valor Points awarded upon completion`}
              </Text>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.logBtn, !selected && styles.logBtnDisabled]}
          onPress={handleLog}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={selected && !loggedTypes.includes(selected)
              ? [Colors.goldDark, Colors.gold]
              : ['#333', '#444']}
            style={styles.logBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.logBtnText, (!selected || loggedTypes.includes(selected as WorkoutType)) && { color: Colors.textMuted }]}>
              {selected && loggedTypes.includes(selected) ? '⚡   LOG AGAIN (NO XP)' : '⚡   CLAIM VICTORY'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Retreat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: { flex: 1, padding: Spacing.lg },

  handle: {
    width: 40, height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },

  title: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    color: Colors.gold,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.proseItalic,
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.md,
  },
  typeCard: {
    width: '48%',
    backgroundColor: Colors.mid,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  typeCardSelected: {
    borderColor: Colors.goldBorder,
  },
  typeEmoji: { fontSize: 28 },
  typeName: {
    fontFamily: Fonts.subheading,
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
  },
  typeXPBadge: {
    backgroundColor: Colors.goldMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeXPBadgeDone: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  typeXP: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.gold,
  },
  typeXPDone: {
    color: Colors.textMuted,
  },

  selectedInfo: {
    backgroundColor: Colors.mid,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  selectedLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  selectedValue: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  selectedXP: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.gold,
  },

  logBtn: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  logBtnDisabled: { shadowOpacity: 0 },
  logBtnGradient: { padding: 18, alignItems: 'center' },
  logBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.void,
    letterSpacing: 3,
  },

  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: {
    fontFamily: Fonts.prose,
    fontSize: 15,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});