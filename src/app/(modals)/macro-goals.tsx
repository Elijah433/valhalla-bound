import { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getMacroGoals, updateMacroGoals } from '@/lib/db';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

// Water values per preset are rough, illustrative defaults matching each
// archetype's general food volume/activity level — not a precise clinical
// hydration calculation, same spirit as the calorie/macro presets
// themselves already being reasonable starting points rather than exact
// personalized targets.
const PRESETS = [
  { label: 'BERSERKER', sub: 'Bulk & Strength', calories: 3200, protein: 220, carbs: 380, fat: 100, water: 160, icon: '🔥' },
  { label: 'WARRIOR', sub: 'Recomp & Performance', calories: 2500, protein: 180, carbs: 250, fat: 80, water: 128, icon: '⚔️' },
  { label: 'SHIELDMAIDEN', sub: 'Lean & Tone', calories: 1800, protein: 140, carbs: 180, fat: 60, water: 100, icon: '🛡️' },
  { label: 'RAID MODE', sub: 'Cut & Define', calories: 1500, protein: 160, carbs: 120, fat: 50, water: 112, icon: '🗡️' },
];

export default function MacroGoalsModal() {
  const [calories, setCalories] = useState('2500');
  const [protein, setProtein] = useState('180');
  const [carbs, setCarbs] = useState('250');
  const [fat, setFat] = useState('80');
  const [water, setWater] = useState('128');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    const goals = getMacroGoals();
    setCalories(String(goals.calories));
    setProtein(String(goals.protein));
    setCarbs(String(goals.carbs));
    setFat(String(goals.fat));
    setWater(String(goals.water_goal_oz));
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

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#080305', '#050508']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.kbAware}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

            <View style={styles.header}>
              <View style={styles.handle} />
              <Text style={styles.eyebrow}>FEAST PLANNING</Text>
              <Text style={styles.title}>SET YOUR GOALS</Text>
              <Text style={styles.subtitle}>
                How much should a warrior of your stature consume?
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

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
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.03)', 'transparent']}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.presetIcon}>{p.icon}</Text>
                    <Text style={styles.presetLabel}>{p.label}</Text>
                    <Text style={styles.presetSub}>{p.sub}</Text>
                    <Text style={styles.presetCals}>{p.calories} kcal</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.sectionLabel}>OR SET MANUALLY</Text>

              {[
                { label: 'FIRE (CALORIES)', key: 'calories', value: calories, setter: setCalories, color: '#E05020', unit: 'kcal' },
                { label: 'MEAT (PROTEIN)', key: 'protein', value: protein, setter: setProtein, color: Colors.gold, unit: 'g' },
                { label: 'GRAIN (CARBS)', key: 'carbs', value: carbs, setter: setCarbs, color: Colors.ice, unit: 'g' },
                { label: 'MEAD (FAT)', key: 'fat', value: fat, setter: setFat, color: '#8B6FD4', unit: 'g' },
                { label: 'WELL (WATER)', key: 'water', value: water, setter: setWater, color: '#5BA3C7', unit: 'oz' },
              ].map((item) => (
                <View key={item.key} style={styles.inputRow}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.02)', 'transparent']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={[styles.inputColorBar, { backgroundColor: item.color }]} />
                  <View style={styles.inputInfo}>
                    <Text style={[styles.inputLabel, { color: item.color }]}>{item.label}</Text>
                    <Text style={styles.inputUnit}>{item.unit} per day</Text>
                  </View>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={[styles.input, { color: item.color }]}
                      value={item.value}
                      onChangeText={item.setter}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                  </View>
                </View>
              ))}

              <View style={styles.summaryCard}>
                <LinearGradient
                  colors={['rgba(201,168,76,0.06)', 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.summaryTitle}>DAILY FEAST SUMMARY</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Protein calories</Text>
                  <Text style={styles.summaryValue}>{(parseInt(protein) || 0) * 4} kcal</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Carb calories</Text>
                  <Text style={styles.summaryValue}>{(parseInt(carbs) || 0) * 4} kcal</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Fat calories</Text>
                  <Text style={styles.summaryValue}>{(parseInt(fat) || 0) * 9} kcal</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={styles.summaryTotalLabel}>Total from macros</Text>
                  <Text style={[styles.summaryTotalValue, {
                    color: Math.abs(
                      parseInt(calories) - ((parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9)
                    ) < 50 ? Colors.gold : Colors.blood
                  }]}>
                    {(parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9} kcal
                  </Text>
                </View>
              </View>

            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <LinearGradient
                colors={['#3A1A1A', '#1A0808']}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['transparent', Colors.gold, 'transparent']}
                style={styles.saveBtnTopLine}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={styles.saveBtnText}>⚡  FORGE YOUR FEAST PLAN</Text>
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
    fontSize: 28,
    color: Colors.gold,
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: 'rgba(201,168,76,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontFamily: Fonts.proseItalic,
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
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
    width: 130,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,8,10,0.7)',
  },
  presetIcon: { fontSize: 24, marginBottom: 4 },
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
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radii.md,
    marginBottom: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,8,10,0.6)',
  },
  inputColorBar: {
    width: 3,
    alignSelf: 'stretch',
    opacity: 0.7,
  },
  inputInfo: { flex: 1, padding: Spacing.md },
  inputLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 2,
  },
  inputUnit: {
    fontFamily: Fonts.prose,
    fontSize: 11,
    color: Colors.textMuted,
  },
  inputWrap: { paddingRight: Spacing.md },
  input: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    textAlign: 'right',
    minWidth: 80,
  },

  summaryCard: {
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginVertical: Spacing.md,
    overflow: 'hidden',
    gap: 8,
  },
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
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveBtnTopLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  saveBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.gold,
    letterSpacing: 2,
  },
});