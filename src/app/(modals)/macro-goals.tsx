import { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getMacroGoals, updateMacroGoals, getLatestWeight, getWeightChange } from '@/lib/db';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const PRESETS = [
  { label: 'BERSERKER', sub: 'Bulk & Strength', calories: 3200, protein: 220, carbs: 380, fat: 100, water: 160, icon: '🔥' },
  { label: 'WARRIOR', sub: 'Recomp & Performance', calories: 2500, protein: 180, carbs: 250, fat: 80, water: 128, icon: '⚔️' },
  { label: 'SHIELDMAIDEN', sub: 'Lean & Tone', calories: 1800, protein: 140, carbs: 180, fat: 60, water: 100, icon: '🛡️' },
  { label: 'RAID MODE', sub: 'Cut & Define', calories: 1500, protein: 160, carbs: 120, fat: 50, water: 112, icon: '🗡️' },
];

// Plain functional names only — no Norse subtitle underneath. Unlike Mead
// Hall's macro rings (where the themed name still works as flavor), having
// a themed label here felt forced rather than fun, so it's cut entirely
// on this screen rather than just demoted to a subtitle.
const GOAL_ITEMS = [
  { key: 'calories', label: 'CALORIES', unit: 'cal', color: '#E05020', rune: 'ᚱ' },
  { key: 'protein',  label: 'PROTEIN',  unit: 'g',   color: Colors.gold, rune: 'ᚦ' },
  { key: 'carbs',    label: 'CARBS',    unit: 'g',   color: Colors.ice,  rune: 'ᚨ' },
  { key: 'fat',      label: 'FAT',      unit: 'g',   color: '#8B6FD4',   rune: 'ᛗ' },
  { key: 'water',    label: 'WATER',    unit: 'oz',  color: '#5BA3C7',   rune: 'ᛇ' },
];

export default function MacroGoalsModal() {
  const [calories, setCalories] = useState('2500');
  const [protein, setProtein] = useState('180');
  const [carbs, setCarbs] = useState('250');
  const [fat, setFat] = useState('80');
  const [water, setWater] = useState('128');
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [weightChange, setWeightChange] = useState<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;

  const VALUES: Record<string, [string, (v: string) => void]> = {
    calories: [calories, setCalories],
    protein: [protein, setProtein],
    carbs: [carbs, setCarbs],
    fat: [fat, setFat],
    water: [water, setWater],
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }),
    ]).start();
    const goals = getMacroGoals();
    setCalories(String(goals.calories));
    setProtein(String(goals.protein));
    setCarbs(String(goals.carbs));
    setFat(String(goals.fat));
    setWater(String(goals.water_goal_oz));

    const latest = getLatestWeight();
    setLatestWeight(latest?.weight ?? null);
    setWeightChange(getWeightChange(30));
  }, []);

  function applyPreset(preset: typeof PRESETS[0]) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCalories(String(preset.calories));
    setProtein(String(preset.protein));
    setCarbs(String(preset.carbs));
    setFat(String(preset.fat));
    setWater(String(preset.water));
  }

  function handleSave() {
    const c = parseInt(calories) || 2500;
    const p = parseInt(protein) || 180;
    const cb = parseInt(carbs) || 250;
    const f = parseInt(fat) || 80;
    const w = parseInt(water) || 128;
    updateMacroGoals(c, p, cb, f, w);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  const startWeight = latestWeight !== null && weightChange !== null
    ? Math.round((latestWeight - weightChange) * 10) / 10
    : null;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0A0510', '#080305', '#050508']} style={StyleSheet.absoluteFill} />
      <View style={styles.topGlow} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.kbAware}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>

            <View style={styles.header}>
              <View style={styles.handle} />
              <Text style={styles.eyebrow}>FEAST PLANNING</Text>
              <Text style={styles.title}>SET YOUR GOALS</Text>
              <Text style={styles.subtitle}>
                How much should a warrior of your stature consume?
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              {latestWeight !== null && (
                <View style={styles.weightProgressCard}>
                  <LinearGradient colors={['rgba(139,111,212,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
                  <LinearGradient
                    colors={['transparent', '#8B6FD4', 'transparent']}
                    style={styles.weightProgressTopLine}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  />
                  <Text style={styles.weightProgressTitle}>YOUR PROGRESS</Text>
                  <View style={styles.weightProgressRow}>
                    <View style={styles.weightProgressStat}>
                      <Text style={styles.weightProgressLabel}>START</Text>
                      <Text style={styles.weightProgressValue}>
                        {startWeight !== null ? startWeight : latestWeight}
                        <Text style={styles.weightProgressUnit}> lbs</Text>
                      </Text>
                    </View>
                    <View style={styles.weightProgressDivider} />
                    <View style={styles.weightProgressStat}>
                      <Text style={styles.weightProgressLabel}>CURRENT</Text>
                      <Text style={[styles.weightProgressValue, { color: '#8B6FD4' }]}>
                        {latestWeight}
                        <Text style={styles.weightProgressUnit}> lbs</Text>
                      </Text>
                    </View>
                    <View style={styles.weightProgressDivider} />
                    <View style={styles.weightProgressStat}>
                      <Text style={styles.weightProgressLabel}>CHANGE (30D)</Text>
                      <Text style={[styles.weightProgressValue, {
                        color: weightChange !== null && weightChange < 0 ? '#4CAF50'
                          : weightChange !== null && weightChange > 0 ? Colors.blood
                          : Colors.textMuted,
                      }]}>
                        {weightChange !== null
                          ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}`
                          : '0'}
                        <Text style={styles.weightProgressUnit}> lbs</Text>
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <Text style={styles.sectionLabel}>CHOOSE A WARRIOR PATH</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsRow}
              >
                {PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p.label}
                    style={styles.presetCard}
                    onPress={() => applyPreset(p)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.05)', 'transparent']}
                      style={StyleSheet.absoluteFill}
                    />
                    <LinearGradient
                      colors={['transparent', Colors.gold, 'transparent']}
                      style={styles.presetCardTopLine}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    />
                    <View style={styles.presetIconWrap}>
                      <Text style={styles.presetIcon}>{p.icon}</Text>
                    </View>
                    <Text style={styles.presetLabel}>{p.label}</Text>
                    <Text style={styles.presetSub}>{p.sub}</Text>
                    <Text style={styles.presetCals}>{p.calories} cal</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.sectionLabel}>OR SET MANUALLY</Text>

              {GOAL_ITEMS.map((item) => {
                const [value, setter] = VALUES[item.key];
                return (
                  <View key={item.key} style={styles.inputRow}>
                    <LinearGradient
                      colors={[`${item.color}08`, 'transparent']}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={[styles.inputIconWrap, { borderColor: `${item.color}30`, backgroundColor: `${item.color}12` }]}>
                      <Text style={[styles.inputRune, { color: item.color }]}>{item.rune}</Text>
                    </View>
                    <View style={styles.inputInfo}>
                      <Text style={[styles.inputLabel, { color: item.color }]}>{item.label}</Text>
                      <Text style={styles.inputThemed}>{item.unit} per day</Text>
                    </View>
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={[styles.input, { color: item.color }]}
                        value={value}
                        onChangeText={setter}
                        keyboardType="number-pad"
                        selectTextOnFocus
                      />
                    </View>
                  </View>
                );
              })}

              <View style={styles.summaryCard}>
                <LinearGradient
                  colors={['rgba(201,168,76,0.08)', 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={['transparent', Colors.gold, 'transparent']}
                  style={styles.summaryCardTopLine}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <Text style={styles.summaryTitle}>DAILY SUMMARY</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Protein calories</Text>
                  <Text style={styles.summaryValue}>{(parseInt(protein) || 0) * 4} cal</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Carb calories</Text>
                  <Text style={styles.summaryValue}>{(parseInt(carbs) || 0) * 4} cal</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Fat calories</Text>
                  <Text style={styles.summaryValue}>{(parseInt(fat) || 0) * 9} cal</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={styles.summaryTotalLabel}>Total from macros</Text>
                  <Text style={[styles.summaryTotalValue, {
                    color: Math.abs(
                      parseInt(calories) - ((parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9)
                    ) < 50 ? Colors.gold : Colors.blood
                  }]}>
                    {(parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9} cal
                  </Text>
                </View>
              </View>

            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.88}>
              <LinearGradient
                colors={[Colors.goldDark, Colors.gold, Colors.goldLight]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
              <LinearGradient
                colors={['rgba(255,255,255,0.15)', 'transparent']}
                style={styles.saveBtnShine}
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              />
              <Text style={styles.saveBtnText}>SAVE GOALS →</Text>
            </TouchableOpacity>

          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  kbAware: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },

  topGlow: {
    position: 'absolute', top: -80, left: '10%', width: '80%', height: 220,
    backgroundColor: 'rgba(201,168,76,0.08)', borderRadius: 999,
    transform: [{ scaleX: 1.3 }, { scaleY: 0.5 }], pointerEvents: 'none',
  },

  header: { alignItems: 'center', paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  handle: {
    width: 40, height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 4,
    color: '#E05020',
    marginBottom: 6,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 30,
    color: Colors.gold,
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: 'rgba(201,168,76,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  subtitle: {
    fontFamily: Fonts.proseItalic,
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  weightProgressCard: {
    borderWidth: 1,
    borderColor: 'rgba(139,111,212,0.25)',
    borderRadius: 18,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.92)',
    gap: 12,
    shadowColor: '#8B6FD4', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16,
  },
  weightProgressTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  weightProgressTitle: {
    fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, color: '#8B6FD4',
  },
  weightProgressRow: { flexDirection: 'row', alignItems: 'center' },
  weightProgressStat: { flex: 1, alignItems: 'center', gap: 3 },
  weightProgressDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.08)' },
  weightProgressLabel: {
    fontFamily: Fonts.body, fontSize: 8, letterSpacing: 1.5, color: Colors.textMuted,
  },
  weightProgressValue: {
    fontFamily: Fonts.heading, fontSize: 20, color: Colors.text,
  },
  weightProgressUnit: {
    fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted,
  },

  sectionLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.textMuted,
    marginBottom: 10,
    marginTop: 4,
  },

  presetsRow: {
    gap: 10,
    paddingBottom: Spacing.md,
  },
  presetCard: {
    width: 138,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: Spacing.md,
    gap: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,8,10,0.9)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10,
  },
  presetCardTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  presetIconWrap: {
    width: 40, height: 40, borderRadius: 11,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
    backgroundColor: 'rgba(201,168,76,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  presetIcon: { fontSize: 20 },
  presetLabel: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.gold,
    letterSpacing: 1,
  },
  presetSub: {
    fontFamily: Fonts.prose,
    fontSize: 10,
    color: Colors.textMuted,
  },
  presetCals: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: '#E05020',
    letterSpacing: 1,
    marginTop: 4,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,8,10,0.85)',
    padding: Spacing.sm,
    gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8,
  },
  inputIconWrap: {
    width: 40, height: 40, borderRadius: 11,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  inputRune: { fontSize: 18, fontFamily: 'System' },
  inputInfo: { flex: 1 },
  inputLabel: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: 2,
  },
  inputThemed: {
    fontFamily: Fonts.prose,
    fontSize: 10,
    color: Colors.textMuted,
  },
  inputWrap: { paddingRight: Spacing.sm },
  input: {
    fontFamily: Fonts.heading,
    fontSize: 26,
    textAlign: 'right',
    minWidth: 76,
  },

  summaryCard: {
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 18,
    padding: Spacing.md,
    marginVertical: Spacing.md,
    overflow: 'hidden',
    gap: 8,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 14,
  },
  summaryCardTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  summaryTitle: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontFamily: Fonts.prose,
    fontSize: 13,
    color: Colors.textMuted,
  },
  summaryValue: {
    fontFamily: Fonts.subheading,
    fontSize: 13,
    color: Colors.text,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 8,
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.text,
  },
  summaryTotalValue: {
    fontFamily: Fonts.heading,
    fontSize: 16,
  },

  saveBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginTop: Spacing.sm,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16,
  },
  saveBtnShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
  },
  saveBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    color: Colors.void,
    letterSpacing: 2,
  },
});