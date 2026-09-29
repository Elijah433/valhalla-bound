import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, RefreshControl, TextInput, Keyboard,
  Image, Modal, Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Path, Circle, Line, Rect, G } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getMacroGoals, getTodayMacros, getTodayMeals, deleteMealLog, updateMealLog, getMealsForDateRange, type MealLog,
  logWeight, getLatestWeight, getWeightHistory, getWeightChange, getRecentWeightLogs, updateWeightLog, deleteWeightLog, type WeightPoint, type WeightLog,
  addProgressPhoto, getProgressPhotos, getProgressPhotoById, deleteProgressPhotoRecord, type ProgressPhoto,
  logSleep, getLatestSleep, getSleepHistory, getSleepAverage, getRecentSleepLogs, updateSleepLog, deleteSleepLog, type SleepLog, type SleepPoint,
} from '@/lib/db';
import { useWarriorStore } from '@/lib/store';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width } = Dimensions.get('window');

const PHOTOS_DIR = FileSystem.documentDirectory + 'progress_photos/';

function resolvePhotoUri(storedPath: string): string {
  const filename = storedPath.split('/').pop();
  return PHOTOS_DIR + filename;
}

const WATER_INCREMENT = 8;
const WATER_KEY = 'mead_hall_water';

function SunriseIcon({ size = 24, color = Colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1="2" y1="17" x2="22" y2="17" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity={0.5} />
      <Path d="M12 17 A5 5 0 0 1 7 17" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M12 17 A5 5 0 0 0 17 17" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Line x1="12" y1="6" x2="12" y2="4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="6.5" y1="8.5" x2="5.1" y2="7.1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="17.5" y1="8.5" x2="18.9" y2="7.1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="4" y1="14" x2="2" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="20" y1="14" x2="22" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function ShieldIcon({ size = 24, color = Colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3 L20 6.5 L20 12 C20 16.5 16.5 20 12 21 C7.5 20 4 16.5 4 12 L4 6.5 Z" fill={color} opacity={0.85} />
      <Path d="M12 5.5 L18 8.5 L18 12 C18 15.5 15.5 18.5 12 19.5 C8.5 18.5 6 15.5 6 12 L6 8.5 Z" fill="rgba(0,0,0,0.25)" />
      <Line x1="12" y1="8" x2="12" y2="17" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round" />
      <Line x1="8" y1="12" x2="16" y2="12" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round" />
    </Svg>
  );
}

function FlameIcon({ size = 24, color = Colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 21 C8 21 5 18 5 14 C5 11 7 9 8 7 C8.5 9.5 10 11 10 11 C10 8 11 5 12 3 C13 5 14 8 14 11 C14 11 15.5 9.5 16 7 C17 9 19 11 19 14 C19 18 16 21 12 21 Z" fill={color} opacity={0.85} />
      <Path d="M12 19 C10 19 8.5 17.5 8.5 15.5 C8.5 14 9.5 13 10 12 C10.2 13.5 11 14.5 11 14.5 C11 13 11.5 11.5 12 10.5 C12.5 11.5 13 13 13 14.5 C13 14.5 13.8 13.5 14 12 C14.5 13 15.5 14 15.5 15.5 C15.5 17.5 14 19 12 19 Z" fill="rgba(255,255,255,0.25)" />
    </Svg>
  );
}

function ChaliceIcon({ size = 24, color = Colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 3 L17 3 L14.5 12 C14.5 14.5 13 16 12 16 C11 16 9.5 14.5 9.5 12 Z" fill={color} opacity={0.85} />
      <Rect x="11" y="16" width="2" height="4" rx="1" fill={color} opacity={0.7} />
      <Rect x="8" y="20" width="8" height="1.5" rx="0.75" fill={color} opacity={0.6} />
      <Path d="M9 5 C9 5 10 7 12 7 C14 7 15 5 15 5" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function ProRuneIcon({ size = 22, color = Colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2 L14 8 L20 8 L15.5 12 L17.5 18 L12 14.5 L6.5 18 L8.5 12 L4 8 L10 8 Z" fill={color} opacity={0.9} />
    </Svg>
  );
}

function TrendArrowIcon({ size = 14, color = Colors.gold, down = true }: { size?: number; color?: string; down?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: [{ rotate: down ? '0deg' : '180deg' }] }}>
      <Path d="M12 4 L20 16 L4 16 Z" fill={color} opacity={0.9} transform="rotate(180 12 12)" />
    </Svg>
  );
}

const MEAL_TYPES = [
  { key: 'morning', label: 'Breakfast', sub: 'Morning Raid', color: '#E0A020', Icon: SunriseIcon },
  { key: 'midday', label: 'Lunch', sub: 'Midday Feast', color: Colors.gold, Icon: ShieldIcon },
  { key: 'evening', label: 'Dinner', sub: 'Evening Hall', color: '#E05020', Icon: FlameIcon },
  { key: 'snack', label: 'Snacks', sub: 'Spoils of War', color: Colors.blood, Icon: ChaliceIcon },
];

const MACROS = [
  { key: 'protein', label: 'Protein', sub: 'Meat', color: Colors.gold, rune: 'ᚦ', unit: 'g' },
  { key: 'carbs', label: 'Carbs', sub: 'Grain', color: Colors.ice, rune: 'ᚨ', unit: 'g' },
  { key: 'fat', label: 'Fat', sub: 'Fuel', color: '#8B6FD4', rune: 'ᚱ', unit: 'g' },
];

function MacroRing({ value, goal, color, label, sub, rune, unit, delay }: {
  value: number; goal: number; color: string; label: string;
  sub: string; rune: string; unit: string; delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const progress = Math.min(value / Math.max(goal, 1), 1);
  const isOver = value > goal;
  const size = 86;
  const stroke = 6;

  useEffect(() => {
    Animated.timing(anim, { toValue: progress, duration: 1100, delay, useNativeDriver: false }).start();
  }, [value, goal]);

  const pct = Math.round(progress * 100);

  return (
    <View style={{ alignItems: 'center', gap: 5, flex: 1 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: `${color}15` }} />
        <Animated.View style={{
          position: 'absolute', width: size, height: size,
          borderRadius: size / 2, borderWidth: stroke,
          borderColor: isOver ? Colors.blood : color,
          borderTopColor: 'transparent',
          borderRightColor: pct > 25 ? (isOver ? Colors.blood : color) : 'transparent',
          borderBottomColor: pct > 50 ? (isOver ? Colors.blood : color) : 'transparent',
          borderLeftColor: pct > 75 ? (isOver ? Colors.blood : color) : 'transparent',
          opacity: anim,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 5,
        }} />
        <View style={{ alignItems: 'center', gap: 1 }}>
          <Text style={{ fontSize: 11, color, fontFamily: 'System' }}>{rune}</Text>
          <Text style={{ fontFamily: Fonts.heading, fontSize: 17, color: isOver ? Colors.blood : Colors.text, lineHeight: 19 }}>
            {Math.round(value)}
          </Text>
          <Text style={{ fontFamily: Fonts.body, fontSize: 7, letterSpacing: 1, color }}>{unit}</Text>
        </View>
      </View>
      <Text style={{ fontFamily: Fonts.subheading, fontSize: 12, color }}>{label}</Text>
      <Text style={{ fontFamily: Fonts.body, fontSize: 7, letterSpacing: 1.5, color: Colors.textMuted }}>{sub}</Text>
      <Text style={{ fontFamily: Fonts.prose, fontSize: 10, color: isOver ? Colors.blood : Colors.textDim }}>
        {isOver ? `+${Math.round(value - goal)} over` : `${Math.round(goal - value)} left`}
      </Text>
    </View>
  );
}

function MacroSplitDonut({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein * 4 + carbs * 4 + fat * 9;
  const size = 120;
  const r = 44;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const proteinPct = total > 0 ? (protein * 4) / total : 0;
  const carbsPct = total > 0 ? (carbs * 4) / total : 0;
  const fatPct = total > 0 ? (fat * 9) / total : 0;

  const proteinDash = proteinPct * circumference;
  const carbsDash = carbsPct * circumference;
  const fatDash = fatPct * circumference;
  const proteinOffset = 0;
  const carbsOffset = -(proteinDash);
  const fatOffset = -(proteinDash + carbsDash);

  if (total === 0) {
    return (
      <View style={styles.splitDonutWrap}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        </Svg>
        <View style={styles.splitDonutCenter}>
          <Text style={styles.splitDonutEmpty}>—</Text>
          <Text style={styles.splitDonutLabel}>NO DATA</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.splitDonutWrap}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${cx}, ${cy}`}>
          <Circle cx={cx} cy={cy} r={r} fill="none"
            stroke={Colors.gold} strokeWidth={10}
            strokeDasharray={`${proteinDash} ${circumference}`}
            strokeDashoffset={proteinOffset}
            strokeLinecap="butt"
          />
          <Circle cx={cx} cy={cy} r={r} fill="none"
            stroke={Colors.ice} strokeWidth={10}
            strokeDasharray={`${carbsDash} ${circumference}`}
            strokeDashoffset={carbsOffset}
            strokeLinecap="butt"
          />
          <Circle cx={cx} cy={cy} r={r} fill="none"
            stroke="#8B6FD4" strokeWidth={10}
            strokeDasharray={`${fatDash} ${circumference}`}
            strokeDashoffset={fatOffset}
            strokeLinecap="butt"
          />
        </G>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={10} />
      </Svg>
      <View style={styles.splitDonutCenter}>
        <Text style={styles.splitDonutPct}>{Math.round(proteinPct * 100)}P</Text>
        <Text style={styles.splitDonutLabel}>SPLIT</Text>
      </View>
    </View>
  );
}

function WeeklyHistoryBar({ data, goalCalories }: {
  data: { date: string; macros: { calories: number; protein: number; carbs: number; fat: number } }[];
  goalCalories: number;
}) {
  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const labels = data.map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (data.length - 1 - i));
    return dayLabels[d.getDay()];
  });

  const maxCal = Math.max(...data.map(d => d.macros.calories), goalCalories);

  return (
    <View style={styles.weeklyCard}>
      <LinearGradient colors={['rgba(201,168,76,0.04)', 'transparent']} style={StyleSheet.absoluteFill} />
      <View style={styles.weeklyHeader}>
        <Text style={styles.weeklyTitle}>7-DAY HISTORY</Text>
        <View style={styles.weeklyLegend}>
          <View style={[styles.weeklyLegendDot, { backgroundColor: Colors.gold }]} />
          <Text style={styles.weeklyLegendLabel}>Calories</Text>
        </View>
      </View>
      <View style={styles.weeklyBars}>
        {data.map((d, i) => {
          const heightPct = d.macros.calories > 0 ? d.macros.calories / maxCal : 0;
          const isToday = i === data.length - 1;
          const overGoal = d.macros.calories > goalCalories;
          const barColor = overGoal ? Colors.blood : isToday ? Colors.gold : `${Colors.gold}60`;

          return (
            <View key={i} style={styles.weeklyBarCol}>
              <View style={styles.weeklyBarTrack}>
                <View style={[styles.weeklyGoalLine, { bottom: `${(goalCalories / maxCal) * 100}%` }]} />
                <View style={[styles.weeklyBarFill, { height: `${heightPct * 100}%`, backgroundColor: barColor }]} />
              </View>
              {d.macros.calories > 0 && (
                <Text style={[styles.weeklyBarVal, { color: overGoal ? Colors.blood : Colors.textMuted }]}>
                  {d.macros.calories > 999 ? `${(d.macros.calories / 1000).toFixed(1)}k` : d.macros.calories}
                </Text>
              )}
              <Text style={[styles.weeklyBarDay, isToday && { color: Colors.gold }]}>{labels[i]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function WeightTrendGraph({ data, compact = false }: { data: WeightPoint[]; compact?: boolean }) {
  // Compact mode fits the graph inside a half-width card (side-by-side
  // with Sleep), instead of assuming it spans the full screen width.
  const w = compact
    ? (width - Spacing.lg * 2 - 10) / 2 - Spacing.md * 2
    : width - Spacing.lg * 2 - Spacing.lg * 2;
  const h = compact ? 50 : 70;
  const padding = 6;

  const points = data
    .map((p, i) => ({ i, weight: p.weight }))
    .filter(p => p.weight !== null) as { i: number; weight: number }[];

  if (points.length === 0) {
    return (
      <View style={[styles.weightGraphEmpty, { width: w, height: h }]}>
        <Text style={styles.weightGraphEmptyText}>{compact ? 'No weigh-ins yet' : 'No weigh-ins yet — log your first below'}</Text>
      </View>
    );
  }

  if (points.length === 1) {
    return (
      <View style={[styles.weightGraphEmpty, { width: w, height: h }]}>
        <Text style={styles.weightGraphEmptyText}>{compact ? 'One entry logged' : 'One entry logged — check back tomorrow to see your trend begin'}</Text>
      </View>
    );
  }

  const weights = points.map(p => p.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = Math.max(maxW - minW, 1);

  // Spreads whatever points ARE logged evenly across the full width,
  // rather than anchoring each point to its absolute day position in
  // the 30-day window. Anchoring to absolute day caused sparse or
  // recent-only logging to bunch every point near one edge, with the
  // rest of the graph sitting empty — this way the line always uses
  // the full width, however many or few points actually exist.
  const xFor = (idx: number, total: number) => padding + (idx / Math.max(total - 1, 1)) * (w - padding * 2);
  const yFor = (weight: number) => h - padding - ((weight - minW) / range) * (h - padding * 2);

  // Connect every logged point into one continuous line, regardless of
  // gaps between them — most people don't log every single day, and
  // breaking the line on every missed day made the graph look like
  // scattered dots instead of a real trend.
  const segments: { i: number; weight: number }[][] = [points];

  return (
    <Svg width={w} height={h}>
      {segments.map((seg, si) => {
        if (seg.length === 1) {
          return (
            <Circle key={si} cx={xFor(0, seg.length)} cy={yFor(seg[0].weight)} r={3} fill={Colors.gold} />
          );
        }
        const d = seg.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xFor(idx, seg.length)} ${yFor(p.weight)}`).join(' ');
        return (
          <G key={si}>
            <Path d={d} stroke={Colors.gold} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {seg.map((p, pi) => (
              <Circle key={pi} cx={xFor(pi, seg.length)} cy={yFor(p.weight)} r={pi === seg.length - 1 ? 3.5 : 2} fill={Colors.gold} />
            ))}
          </G>
        );
      })}
    </Svg>
  );
}

// Same day-filling / gap-aware rendering as WeightTrendGraph — one point
// per day in the window, null where nothing was logged, real visual
// breaks in the line rather than a misleading interpolation across gaps.
function SleepTrendGraph({ data, compact = false }: { data: SleepPoint[]; compact?: boolean }) {
  const w = compact
    ? (width - Spacing.lg * 2 - 10) / 2 - Spacing.md * 2
    : width - Spacing.lg * 2 - Spacing.lg * 2;
  const h = compact ? 50 : 70;
  const padding = 6;

  const points = data
    .map((p, i) => ({ i, hours: p.hours }))
    .filter(p => p.hours !== null) as { i: number; hours: number }[];

  if (points.length === 0) {
    return (
      <View style={[styles.weightGraphEmpty, { width: w, height: h }]}>
        <Text style={styles.weightGraphEmptyText}>{compact ? 'No sleep logged yet' : 'No sleep logged yet — log your first below'}</Text>
      </View>
    );
  }

  if (points.length === 1) {
    return (
      <View style={[styles.weightGraphEmpty, { width: w, height: h }]}>
        <Text style={styles.weightGraphEmptyText}>{compact ? 'One night logged' : 'One night logged — check back tomorrow to see your trend begin'}</Text>
      </View>
    );
  }

  const hoursVals = points.map(p => p.hours);
  const minH = Math.min(...hoursVals);
  const maxH = Math.max(...hoursVals);
  const range = Math.max(maxH - minH, 1);

  const xFor = (idx: number, total: number) => padding + (idx / Math.max(total - 1, 1)) * (w - padding * 2);
  const yFor = (hrs: number) => h - padding - ((hrs - minH) / range) * (h - padding * 2);

  // Connect every logged point into one continuous line, regardless of
  // gaps between them — same fix as WeightTrendGraph above.
  const segments: { i: number; hours: number }[][] = [points];

  return (
    <Svg width={w} height={h}>
      {segments.map((seg, si) => {
        if (seg.length === 1) {
          return (
            <Circle key={si} cx={xFor(0, seg.length)} cy={yFor(seg[0].hours)} r={3} fill="#8B6FD4" />
          );
        }
        const d = seg.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xFor(idx, seg.length)} ${yFor(p.hours)}`).join(' ');
        return (
          <G key={si}>
            <Path d={d} stroke="#8B6FD4" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {seg.map((p, pi) => (
              <Circle key={pi} cx={xFor(pi, seg.length)} cy={yFor(p.hours)} r={pi === seg.length - 1 ? 3.5 : 2} fill="#8B6FD4" />
            ))}
          </G>
        );
      })}
    </Svg>
  );
}

export default function MeadHallScreen() {
  const { isPro } = useWarriorStore();

  const [macros, setMacros] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [goals, setGoals] = useState({ calories: 2500, protein: 180, carbs: 250, fat: 80, water_goal_oz: 128 });
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ date: string; macros: { calories: number; protein: number; carbs: number; fat: number } }[]>([]);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [weightHistory, setWeightHistory] = useState<WeightPoint[]>([]);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [weightChange, setWeightChange] = useState<number | null>(null);
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<ProgressPhoto | null>(null);

  // Sleep — same shape as weight tracking above: latest entry, a rolling
  // trend, and an inline log form.
  const [sleepHistory, setSleepHistory] = useState<SleepPoint[]>([]);
  const [latestSleep, setLatestSleep] = useState<SleepLog | null>(null);
  const [sleepAverage, setSleepAverage] = useState<number | null>(null);
  const [showSleepInput, setShowSleepInput] = useState(false);
  const [sleepInput, setSleepInput] = useState('');

  const [showWeightLogList, setShowWeightLogList] = useState(false);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [editingWeightLogId, setEditingWeightLogId] = useState<number | null>(null);
  const [editWeightValue, setEditWeightValue] = useState('');

  const [editingMeal, setEditingMeal] = useState<MealLog | null>(null);
  const [editFoodName, setEditFoodName] = useState('');
  const [editCalories, setEditCalories] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editCarbs, setEditCarbs] = useState('');
  const [editFat, setEditFat] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => { loadData(); }, []));

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  async function loadData() {
    const currentGoals = getMacroGoals();
    setGoals(currentGoals);
    setMacros(getTodayMacros());
    setMeals(getTodayMeals());
    setWeeklyData(getMealsForDateRange(7));

    const latest = getLatestWeight();
    setLatestWeight(latest?.weight ?? null);
    setWeightHistory(getWeightHistory(30));
    setWeightChange(getWeightChange(30));
    setWeightLogs(getRecentWeightLogs(20));
    setPhotos(getProgressPhotos(30));

    setLatestSleep(getLatestSleep());
    setSleepHistory(getSleepHistory(30));
    setSleepAverage(getSleepAverage(7));

    try {
      const raw = await AsyncStorage.getItem(WATER_KEY);
      if (raw) {
        const [count, date] = raw.split('|');
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setWaterGlasses(date === todayStr ? parseInt(count) : 0);
      }
    } catch (e) {}
  }

  const waterGoal = goals.water_goal_oz;
  const waterMax = Math.round(waterGoal * 1.5);

  async function handleWater(delta: number) {
    const next = Math.max(0, Math.min(waterMax, waterGlasses + delta * WATER_INCREMENT));
    setWaterGlasses(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await AsyncStorage.setItem(WATER_KEY, `${next}|${todayStr}`);
  }

  function handleRefresh() {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  }

  function handleDelete(id: number) {
    deleteMealLog(id);
    loadData();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function openEditMeal(meal: MealLog) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingMeal(meal);
    setEditFoodName(meal.food_name);
    setEditCalories(String(meal.calories));
    setEditProtein(String(meal.protein));
    setEditCarbs(String(meal.carbs));
    setEditFat(String(meal.fat));
  }

  function saveEditMeal() {
    if (!editingMeal) return;
    const cal = parseFloat(editCalories) || 0;
    const pro = parseFloat(editProtein) || 0;
    const carb = parseFloat(editCarbs) || 0;
    const fat = parseFloat(editFat) || 0;
    if (!editFoodName.trim()) {
      Alert.alert('Name required', 'Enter a name for this food.');
      return;
    }
    updateMealLog(editingMeal.id, editFoodName.trim(), cal, pro, carb, fat);
    setEditingMeal(null);
    Keyboard.dismiss();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    loadData();
  }

  function handleLogWeight() {
    const val = parseFloat(weightInput);
    if (!val || val <= 0 || val > 999) return;
    logWeight(val);
    setWeightInput('');
    setShowWeightInput(false);
    Keyboard.dismiss();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    loadData();
  }

  function handleLogSleep() {
    const val = parseFloat(sleepInput);
    if (!val || val <= 0 || val > 24) return;
    logSleep(val);
    setSleepInput('');
    setShowSleepInput(false);
    Keyboard.dismiss();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    loadData();
  }

  function startEditWeightLog(log: WeightLog) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingWeightLogId(log.id);
    setEditWeightValue(String(log.weight));
  }

  function saveEditWeightLog() {
    if (editingWeightLogId === null) return;
    const val = parseFloat(editWeightValue);
    if (!val || val <= 0 || val > 999) return;
    updateWeightLog(editingWeightLogId, val);
    setEditingWeightLogId(null);
    setEditWeightValue('');
    Keyboard.dismiss();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    loadData();
  }

  function handleDeleteWeightLogEntry(log: WeightLog) {
    Alert.alert('Delete this entry?', `${log.weight} lbs — this cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteWeightLogAndRefresh(log.id);
        },
      },
    ]);
  }

  function deleteWeightLogAndRefresh(id: number) {
    deleteWeightLog(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    loadData();
  }

  async function pickAndSavePhoto(source: 'camera' | 'library') {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Camera access needed', 'Enable camera access in Settings to take a progress photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Photo access needed', 'Enable photo library access in Settings to choose a progress photo.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsEditing: false,
        });
      }

      if (result.canceled || !result.assets?.[0]) return;

      await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true }).catch(() => {});
      const filename = `photo_${Date.now()}.jpg`;
      const dest = PHOTOS_DIR + filename;
      await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });

      addProgressPhoto(dest, latestWeight);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadData();
    } catch (e) {
      Alert.alert('Could not save photo', 'Something went wrong saving that photo. Please try again.');
    }
  }

  function promptAddPhoto() {
    Alert.alert('Add Progress Photo', 'Photos stay on your device only — never uploaded anywhere.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose from Library', onPress: () => pickAndSavePhoto('library') },
      { text: 'Take Photo', onPress: () => pickAndSavePhoto('camera') },
    ]);
  }

  async function handleDeletePhoto(photo: ProgressPhoto) {
    Alert.alert('Delete this photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await FileSystem.deleteAsync(resolvePhotoUri(photo.photo_uri), { idempotent: true });
          } catch (e) {}
          deleteProgressPhotoRecord(photo.id);
          setPreviewPhoto(null);
          loadData();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  }

  const calPct = Math.min((macros.calories / goals.calories) * 100, 100);
  const calOver = macros.calories > goals.calories;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0C0A10', '#050508']} style={StyleSheet.absoluteFill} />
      <Text style={styles.watermark}>ᚠ</Text>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>MEAL PLANNING</Text>
              <Text style={styles.title}>MEAD HALL</Text>
            </View>
            <TouchableOpacity style={styles.goalsBtn} onPress={() => router.push('/(modals)/macro-goals')}>
              <Text style={styles.goalsBtnText}>Set Goals</Text>
            </TouchableOpacity>
          </View>

          {/* Weekly log streak — reuses weeklyData already fetched for the
              calorie history further down. A day counts as "logged" if any
              calories were recorded that day, regardless of amount — this
              row is about consistency, not quantity, same idea as the
              7-circle habit row seen in other tracking apps. */}
          <View style={styles.logStreakRow}>
            <LinearGradient colors={['rgba(201,168,76,0.05)', 'transparent']} style={StyleSheet.absoluteFill} />
            {weeklyData.map((d, i) => {
              const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
              const dateObj = new Date();
              dateObj.setDate(dateObj.getDate() - (weeklyData.length - 1 - i));
              const dayLabel = dayLabels[dateObj.getDay()];
              const logged = d.macros.calories > 0;
              const isToday = i === weeklyData.length - 1;
              return (
                <View key={i} style={styles.logStreakCol}>
                  <View style={[
                    styles.logStreakDot,
                    logged && styles.logStreakDotFilled,
                    isToday && !logged && styles.logStreakDotToday,
                  ]}>
                    {logged && <Text style={styles.logStreakDotRune}>ᚦ</Text>}
                  </View>
                  <Text style={[styles.logStreakDayLabel, isToday && { color: Colors.gold }]}>{dayLabel}</Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>NUTRITION</Text>

          {/* Calorie bar */}
          <View style={styles.calCard}>
            <LinearGradient
              colors={[calOver ? 'rgba(139,26,26,0.12)' : 'rgba(224,80,32,0.07)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['transparent', calOver ? Colors.blood : '#E05020', 'transparent']}
              style={styles.calTopLine}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
            <View style={styles.calRow}>
              <View>
                <Text style={styles.calEyebrow}>TODAY'S CALORIES</Text>
                <View style={styles.calNums}>
                  <Text style={[styles.calConsumed, calOver && { color: Colors.blood }]}>
                    {Math.round(macros.calories)}
                  </Text>
                  <Text style={styles.calOf}> / {goals.calories}</Text>
                  <Text style={styles.calUnit}> cal</Text>
                </View>
              </View>
              <View style={styles.calPctWrap}>
                <Text style={[styles.calPct, calOver && { color: Colors.blood }]}>{Math.round(calPct)}%</Text>
                <Text style={styles.calPctLabel}>of goal</Text>
              </View>
            </View>
            <View style={styles.calBar}>
              <View style={[styles.calFill, { width: `${calPct}%` }]}>
                <LinearGradient
                  colors={calOver ? [Colors.blood, '#FF4444'] : ['#8B1A1A', '#E05020', '#FFB380']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              </View>
            </View>
            <Text style={styles.calSub}>
              {calOver
                ? `${Math.round(macros.calories - goals.calories)} cal over limit`
                : `${Math.round(goals.calories - macros.calories)} cal remaining`}
            </Text>
          </View>

          {/* Macro rings */}
          <View style={styles.ringsCard}>
            {MACROS.map((m, i) => (
              <MacroRing
                key={m.key}
                value={macros[m.key as keyof typeof macros]}
                goal={goals[m.key as keyof typeof goals] as number}
                color={m.color}
                label={m.label}
                sub={m.sub}
                rune={m.rune}
                unit={m.unit}
                delay={150 + i * 80}
              />
            ))}
          </View>

          {/* Macro split donut + water tracking side by side */}
          <View style={styles.splitWaterRow}>
            <View style={styles.splitCard}>
              <LinearGradient colors={['rgba(255,255,255,0.02)', 'transparent']} style={StyleSheet.absoluteFill} />
              <Text style={styles.splitCardTitle}>MACRO SPLIT</Text>
              <MacroSplitDonut protein={macros.protein} carbs={macros.carbs} fat={macros.fat} />
              <View style={styles.splitLegend}>
                {[
                  { label: 'P', color: Colors.gold, value: macros.protein > 0 ? Math.round((macros.protein * 4) / Math.max(macros.protein * 4 + macros.carbs * 4 + macros.fat * 9, 1) * 100) : 0 },
                  { label: 'C', color: Colors.ice, value: macros.carbs > 0 ? Math.round((macros.carbs * 4) / Math.max(macros.protein * 4 + macros.carbs * 4 + macros.fat * 9, 1) * 100) : 0 },
                  { label: 'F', color: '#8B6FD4', value: macros.fat > 0 ? Math.round((macros.fat * 9) / Math.max(macros.protein * 4 + macros.carbs * 4 + macros.fat * 9, 1) * 100) : 0 },
                ].map(s => (
                  <View key={s.label} style={styles.splitLegendItem}>
                    <View style={[styles.splitLegendDot, { backgroundColor: s.color }]} />
                    <Text style={[styles.splitLegendPct, { color: s.color }]}>{s.value}%</Text>
                    <Text style={styles.splitLegendLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.waterCard}>
              <LinearGradient colors={['rgba(91,163,199,0.06)', 'transparent']} style={StyleSheet.absoluteFill} />
              <Text style={styles.waterTitle}>WATER</Text>
              <Text style={styles.waterRune}>ᛇ</Text>
              <Text style={styles.waterCount}>{waterGlasses}</Text>
              <Text style={styles.waterGoal}>of {waterGoal} oz</Text>
              <View style={styles.waterDots}>
                {Array.from({ length: Math.round(waterGoal / WATER_INCREMENT) }).map((_, i) => (
                  <View key={i} style={[
                    styles.waterDot,
                    i < waterGlasses / WATER_INCREMENT && styles.waterDotFilled,
                  ]} />
                ))}
              </View>
              <View style={styles.waterBtns}>
                <TouchableOpacity style={styles.waterBtn} onPress={() => handleWater(-1)}>
                  <Text style={styles.waterBtnText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.waterBtn, styles.waterBtnAdd]} onPress={() => handleWater(1)}>
                  <Text style={[styles.waterBtnText, styles.waterBtnAddText]}>+</Text>
                </TouchableOpacity>
              </View>
              {waterGlasses >= waterGoal && (
                <Text style={styles.waterDone}>ᚹ Goal met</Text>
              )}
            </View>
          </View>

          {/* Recipe Ideas — links out to a dedicated screen with real
              recipe search (Spoonacular), filterable by diet/macros.
              Sits here rather than being buried in settings since this is
              exactly the moment someone's thinking about food. */}
          <TouchableOpacity
            style={styles.recipeIdeasCard}
            onPress={() => {
              if (!isPro) { router.push('/(modals)/paywall'); return; }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(modals)/recipe-ideas' as any);
            }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['rgba(224,80,32,0.06)', 'transparent']} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['transparent', '#E05020', 'transparent']} style={styles.recipeIdeasTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <View style={styles.recipeIdeasIconWrap}>
              <Text style={styles.recipeIdeasIcon}>ᛗ</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recipeIdeasTitle}>Recipe Ideas</Text>
              <Text style={styles.recipeIdeasSub}>High protein, vegan, low carb & more</Text>
            </View>
            {!isPro && (
              <View style={styles.featureProBadge}>
                <Text style={styles.featureProBadgeText}>PRO</Text>
              </View>
            )}
            <Text style={styles.recipeIdeasArrow}>→</Text>
          </TouchableOpacity>

          {/* Intermittent Fasting — links to its own dedicated timer
              screen, same pattern as Recipe Ideas above. */}
          <TouchableOpacity
            style={styles.fastingCard}
            onPress={() => {
              if (!isPro) { router.push('/(modals)/paywall'); return; }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(modals)/fasting' as any);
            }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['rgba(139,111,212,0.06)', 'transparent']} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['transparent', '#8B6FD4', 'transparent']} style={styles.fastingTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <View style={styles.fastingIconWrap}>
              <Text style={styles.fastingIcon}>ᛁ</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fastingTitle}>Intermittent Fasting</Text>
              <Text style={styles.fastingSub}>Track your eating window</Text>
            </View>
            {!isPro && (
              <View style={styles.featureProBadge}>
                <Text style={styles.featureProBadgeText}>PRO</Text>
              </View>
            )}
            <Text style={styles.fastingArrow}>→</Text>
          </TouchableOpacity>

          {/* Meal sections */}
          <Text style={styles.sectionLabel}>TODAY'S MEALS</Text>

          {MEAL_TYPES.map((mealType) => {
            const typeMeals = meals.filter(m => m.meal_type === mealType.key);
            const typeCals = typeMeals.reduce((a, m) => a + m.calories, 0);
            const { Icon } = mealType;
            return (
              <View key={mealType.key} style={[styles.mealCard, { borderColor: `${mealType.color}18` }]}>
                <LinearGradient colors={[`${mealType.color}06`, 'transparent']} style={StyleSheet.absoluteFill} />
                <View style={styles.mealHeader}>
                  <View style={styles.mealHeaderLeft}>
                    <View style={[styles.mealIconWrap, { borderColor: `${mealType.color}25`, backgroundColor: `${mealType.color}10` }]}>
                      <Icon size={18} color={mealType.color} />
                    </View>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={styles.mealLabel} numberOfLines={1}>{mealType.label}</Text>
                      <Text style={styles.mealSub} numberOfLines={1}>{mealType.sub}</Text>
                    </View>
                  </View>
                  <View style={styles.mealHeaderRight}>
                    {typeCals > 0 && (
                      <Text style={[styles.mealCals, { color: mealType.color }]} numberOfLines={1}>{typeCals} cal</Text>
                    )}
                    <TouchableOpacity
                      style={[styles.scanBtn, { borderColor: `${mealType.color}40`, backgroundColor: `${mealType.color}08` }]}
                      onPress={() => {
                        if (!isPro) { router.push('/(modals)/paywall'); return; }
                        router.push({ pathname: '/(modals)/barcode-scanner', params: { mealType: mealType.key, mealLabel: mealType.label } });
                      }}
                    >
                      <Text style={[styles.scanBtnLabel, { color: mealType.color }]}>Scan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.addBtn, { borderColor: `${mealType.color}40`, backgroundColor: `${mealType.color}08` }]}
                      onPress={() => {
                        if (!isPro) { router.push('/(modals)/paywall'); return; }
                        router.push({ pathname: '/(modals)/food-search', params: { mealType: mealType.key, mealLabel: mealType.label } });
                      }}
                    >
                      <Text style={[styles.addBtnText, { color: mealType.color }]}>+ Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {typeMeals.map((meal, i) => (
                  <TouchableOpacity
                    key={meal.id}
                    style={[styles.mealRow, i < typeMeals.length - 1 && styles.mealRowBorder]}
                    onPress={() => openEditMeal(meal)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.mealRowInfo}>
                      <Text style={styles.mealRowName} numberOfLines={1}>{meal.food_name}</Text>
                      <Text style={styles.mealRowMacros}>
                        {meal.calories} cal · {Math.round(meal.protein)}P · {Math.round(meal.carbs)}C · {Math.round(meal.fat)}F
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(meal.id)}>
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}

                {typeMeals.length === 0 && (
                  <View style={styles.mealEmptyWrap}>
                    <Text style={[styles.mealEmptyRune, { color: mealType.color }]}>
                      {mealType.key === 'morning' ? 'ᚢ' : mealType.key === 'midday' ? 'ᚦ' : mealType.key === 'evening' ? 'ᚱ' : 'ᚠ'}
                    </Text>
                    <Text style={styles.mealEmpty}>Nothing logged yet</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* 7-day calorie history */}
          <Text style={styles.sectionLabel}>BODY PROGRESS</Text>

          {/* Body weight + Sleep — compact side-by-side cards instead of
              two stacked full-width blocks, same visual density as the
              macro-split + water row above. Log forms expand full-width
              below the row rather than being squeezed into a half card. */}
          <View style={styles.bodyStatsRow}>
            <View style={styles.compactStatCard}>
              <LinearGradient colors={['rgba(139,111,212,0.05)', 'transparent']} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', '#8B6FD4', 'transparent']} style={styles.weightTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              <Text style={styles.compactStatEyebrow}>BODY WEIGHT</Text>
              {latestWeight !== null ? (
                <View style={styles.compactStatNumRow}>
                  <Text style={styles.compactStatNum}>{latestWeight}</Text>
                  <Text style={styles.compactStatUnit}>lbs</Text>
                </View>
              ) : (
                <Text style={styles.compactStatEmptyNum}>— lbs</Text>
              )}
              {weightChange !== null && (
                <View style={styles.compactStatChangeWrap}>
                  <TrendArrowIcon size={10} color={weightChange < 0 ? '#4CAF50' : weightChange > 0 ? Colors.blood : Colors.textMuted} down={weightChange < 0} />
                  <Text style={[styles.compactStatChangeText, {
                    color: weightChange < 0 ? '#4CAF50' : weightChange > 0 ? Colors.blood : Colors.textMuted,
                  }]}>
                    {Math.abs(weightChange).toFixed(1)} / 30d
                  </Text>
                </View>
              )}
              <WeightTrendGraph data={weightHistory} compact />
              <TouchableOpacity style={styles.compactLogBtn} onPress={() => setShowWeightInput(!showWeightInput)} activeOpacity={0.85}>
                <Text style={styles.compactLogBtnText}>{showWeightInput ? '✕ Cancel' : '+ Log'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.compactStatCard}>
              <LinearGradient colors={['rgba(139,111,212,0.05)', 'transparent']} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', '#8B6FD4', 'transparent']} style={styles.weightTopLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              <Text style={styles.compactStatEyebrow}>SLEEP</Text>
              {latestSleep !== null ? (
                <View style={styles.compactStatNumRow}>
                  <Text style={styles.compactStatNum}>{latestSleep.hours}</Text>
                  <Text style={styles.compactStatUnit}>hrs</Text>
                </View>
              ) : (
                <Text style={styles.compactStatEmptyNum}>— hrs</Text>
              )}
              {sleepAverage !== null && (
                <View style={styles.compactStatChangeWrap}>
                  <Text style={styles.compactStatChangeText}>{sleepAverage} avg / 7d</Text>
                </View>
              )}
              <SleepTrendGraph data={sleepHistory} compact />
              <TouchableOpacity style={styles.compactLogBtn} onPress={() => setShowSleepInput(!showSleepInput)} activeOpacity={0.85}>
                <Text style={styles.compactLogBtnText}>{showSleepInput ? '✕ Cancel' : '+ Log'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Expanded log forms — render full-width below the compact
              row for whichever one is currently active, rather than
              cramming an input row into a half-width card. */}
          {showWeightInput && (
            <View style={styles.expandedLogForm}>
              <Text style={styles.expandedLogFormLabel}>LOG TODAY'S WEIGHT</Text>
              <View style={styles.weightInputRow}>
                <TextInput
                  style={styles.weightInput}
                  value={weightInput}
                  onChangeText={setWeightInput}
                  placeholder="Weight"
                  placeholderTextColor={Colors.textDim}
                  keyboardType="decimal-pad"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleLogWeight}
                />
                <Text style={styles.weightInputUnit}>lbs</Text>
                <TouchableOpacity style={styles.weightLogBtn} onPress={handleLogWeight}>
                  <Text style={styles.weightLogBtnText}>Log</Text>
                </TouchableOpacity>
              </View>
              {weightLogs.length > 0 && (
                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowWeightLogList(true); }}>
                  <Text style={styles.weightHistoryLink}>Edit past entries →</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {showSleepInput && (
            <View style={styles.expandedLogForm}>
              <Text style={styles.expandedLogFormLabel}>LOG LAST NIGHT'S SLEEP</Text>
              <View style={styles.weightInputRow}>
                <TextInput
                  style={styles.weightInput}
                  value={sleepInput}
                  onChangeText={setSleepInput}
                  placeholder="Hours"
                  placeholderTextColor={Colors.textDim}
                  keyboardType="decimal-pad"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleLogSleep}
                />
                <Text style={styles.weightInputUnit}>hrs</Text>
                <TouchableOpacity style={styles.weightLogBtn} onPress={handleLogSleep}>
                  <Text style={styles.weightLogBtnText}>Log</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Progress photos */}
          <View style={styles.photosCard}>
            <LinearGradient colors={['rgba(139,111,212,0.04)', 'transparent']} style={StyleSheet.absoluteFill} />
            <Text style={styles.photosTitle}>PROGRESS PHOTOS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
              <TouchableOpacity style={styles.photoAddTile} onPress={promptAddPhoto} activeOpacity={0.8}>
                <Text style={styles.photoAddPlus}>+</Text>
                <Text style={styles.photoAddLabel}>Add</Text>
              </TouchableOpacity>
              {photos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoThumbWrap}
                  onPress={() => setPreviewPhoto(photo)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: resolvePhotoUri(photo.photo_uri) }} style={styles.photoThumb} />
                  <Text style={styles.photoThumbDate}>
                    {new Date(photo.created_at.replace(' ', 'T') + 'Z').toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              ))}
              {photos.length === 0 && (
                <View style={styles.photosEmptyHint}>
                  <Text style={styles.photosEmptyHintText}>Your first photo starts the timeline</Text>
                </View>
              )}
            </ScrollView>
          </View>

          <Text style={styles.sectionLabel}>HISTORY</Text>
          <WeeklyHistoryBar data={weeklyData} goalCalories={goals.calories} />

          {/* Pro banner */}
          {!isPro && (
            <TouchableOpacity style={styles.proBanner} onPress={() => router.push('/(modals)/paywall')} activeOpacity={0.85}>
              <LinearGradient colors={['rgba(201,168,76,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', Colors.gold, 'transparent']} style={styles.proBannerLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              <ProRuneIcon size={22} color={Colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.proBannerTitle}>Unlock the Mead Hall</Text>
                <Text style={styles.proBannerSub}>Scan barcodes, log meals, and track macros. Pro only.</Text>
              </View>
              <Text style={styles.proBannerArrow}>→</Text>
            </TouchableOpacity>
          )}

          <View style={styles.bottomRunes}>
            <Text style={styles.bottomRuneText}>ᚠ  ᚢ  ᚦ  ᚨ  ᚱ</Text>
          </View>

        </Animated.ScrollView>
      </SafeAreaView>

      {/* Full-screen photo preview */}
      <Modal visible={!!previewPhoto} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewPhoto(null)}>
            <Text style={styles.previewCloseText}>✕</Text>
          </TouchableOpacity>
          {previewPhoto && (
            <>
              <Image source={{ uri: resolvePhotoUri(previewPhoto.photo_uri) }} style={styles.previewImage} resizeMode="contain" />
              <View style={styles.previewInfo}>
                <Text style={styles.previewDate}>
                  {new Date(previewPhoto.created_at.replace(' ', 'T') + 'Z').toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
                {previewPhoto.weight_at_time !== null && (
                  <Text style={styles.previewWeight}>{previewPhoto.weight_at_time} lbs</Text>
                )}
                <TouchableOpacity style={styles.previewDeleteBtn} onPress={() => handleDeletePhoto(previewPhoto)}>
                  <Text style={styles.previewDeleteText}>Delete Photo</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Weight log history */}
      <Modal visible={showWeightLogList} transparent animationType="slide" onRequestClose={() => setShowWeightLogList(false)}>
        <View style={styles.weightListOverlay}>
          <View style={styles.weightListSheet}>
            <View style={styles.weightListHeader}>
              <Text style={styles.weightListTitle}>WEIGHT ENTRIES</Text>
              <TouchableOpacity onPress={() => { setShowWeightLogList(false); setEditingWeightLogId(null); }}>
                <Text style={styles.weightListClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {weightLogs.map((log) => (
                <View key={log.id} style={styles.weightListRow}>
                  <Text style={styles.weightListDate}>
                    {new Date(log.created_at.replace(' ', 'T') + 'Z').toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                  {editingWeightLogId === log.id ? (
                    <View style={styles.weightListEditRow}>
                      <TextInput
                        style={styles.weightListEditInput}
                        value={editWeightValue}
                        onChangeText={setEditWeightValue}
                        keyboardType="decimal-pad"
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={saveEditWeightLog}
                      />
                      <TouchableOpacity onPress={saveEditWeightLog} style={styles.weightListSaveBtn}>
                        <Text style={styles.weightListSaveBtnText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.weightListValue}>{log.weight} lbs</Text>
                      <View style={styles.weightListActions}>
                        <TouchableOpacity onPress={() => startEditWeightLog(log)} style={styles.weightListActionBtn}>
                          <Text style={styles.weightListActionText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteWeightLogEntry(log)} style={styles.weightListActionBtn}>
                          <Text style={[styles.weightListActionText, { color: Colors.blood }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Meal edit-in-place */}
      <Modal visible={!!editingMeal} transparent animationType="slide" onRequestClose={() => setEditingMeal(null)}>
        <View style={styles.weightListOverlay}>
          <View style={styles.weightListSheet}>
            <View style={styles.weightListHeader}>
              <Text style={styles.weightListTitle}>EDIT MEAL</Text>
              <TouchableOpacity onPress={() => setEditingMeal(null)}>
                <Text style={styles.weightListClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 12 }}>
              <View>
                <Text style={styles.editFieldLabel}>FOOD NAME</Text>
                <TextInput style={styles.editFieldInput} value={editFoodName} onChangeText={setEditFoodName} placeholder="Food name" placeholderTextColor={Colors.textDim} />
              </View>
              <View style={styles.editFieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFieldLabel}>CALORIES</Text>
                  <TextInput style={styles.editFieldInput} value={editCalories} onChangeText={setEditCalories} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textDim} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFieldLabel}>PROTEIN (g)</Text>
                  <TextInput style={styles.editFieldInput} value={editProtein} onChangeText={setEditProtein} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textDim} />
                </View>
              </View>
              <View style={styles.editFieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFieldLabel}>CARBS (g)</Text>
                  <TextInput style={styles.editFieldInput} value={editCarbs} onChangeText={setEditCarbs} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textDim} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFieldLabel}>FAT (g)</Text>
                  <TextInput style={styles.editFieldInput} value={editFat} onChangeText={setEditFat} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textDim} />
                </View>
              </View>
              <TouchableOpacity style={styles.editSaveBtn} onPress={saveEditMeal}>
                <Text style={styles.editSaveBtnText}>SAVE CHANGES</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 110 },

  watermark: {
    position: 'absolute', bottom: 100, right: -30,
    fontSize: 240, color: 'rgba(201,168,76,0.02)',
    fontFamily: 'System', transform: [{ rotate: '-10deg' }],
    pointerEvents: 'none',
  },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
  },
  eyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 4, color: Colors.textMuted, marginBottom: 2 },
  title: { fontFamily: Fonts.heading, fontSize: 34, color: Colors.text, letterSpacing: 1 },
  goalsBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radii.full,
    borderWidth: 1, borderColor: Colors.goldBorder, backgroundColor: Colors.goldMuted, marginBottom: 4,
  },
  goalsBtnText: { fontFamily: Fonts.body, fontSize: 10, color: Colors.gold, letterSpacing: 1 },

  logStreakRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.1)', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 10, overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.6)',
  },
  logStreakCol: { alignItems: 'center', gap: 5 },
  logStreakDot: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center', justifyContent: 'center',
  },
  logStreakDotFilled: {
    borderColor: Colors.gold, backgroundColor: Colors.gold,
  },
  logStreakDotToday: { borderColor: 'rgba(201,168,76,0.35)', borderStyle: 'dashed' },
  logStreakDotRune: { fontSize: 10, color: Colors.void, fontFamily: 'System' },
  logStreakDayLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 0.5, color: Colors.textDim },

  calCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(224,80,32,0.2)', borderRadius: 16,
    padding: Spacing.lg, overflow: 'hidden', backgroundColor: 'rgba(12,5,5,0.9)', gap: 10,
  },
  calTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  calRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  calEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 3, color: '#E05020', opacity: 0.7, marginBottom: 4 },
  calNums: { flexDirection: 'row', alignItems: 'baseline' },
  calConsumed: { fontFamily: Fonts.heading, fontSize: 38, color: '#E05020', lineHeight: 40 },
  calOf: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.textMuted },
  calUnit: { fontFamily: Fonts.prose, fontSize: 13, color: Colors.textMuted },
  calPctWrap: { alignItems: 'flex-end' },
  calPct: { fontFamily: Fonts.heading, fontSize: 22, color: '#E05020' },
  calPctLabel: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted },
  calBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  calFill: { height: '100%', borderRadius: 3, overflow: 'hidden' },
  calSub: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },

  ringsCard: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: 'rgba(12,10,16,0.8)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.sm, gap: 4,
  },

  splitWaterRow: {
    flexDirection: 'row', marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md, gap: 10,
  },
  splitCard: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: Spacing.md, overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)', alignItems: 'center', gap: 8,
  },
  splitCardTitle: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: Colors.textMuted },
  splitDonutWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  splitDonutCenter: { position: 'absolute', alignItems: 'center' },
  splitDonutPct: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.gold },
  splitDonutLabel: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 1.5, color: Colors.textMuted },
  splitDonutEmpty: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.textDim },
  splitLegend: { flexDirection: 'row', gap: 8 },
  splitLegendItem: { alignItems: 'center', gap: 3 },
  splitLegendDot: { width: 6, height: 6, borderRadius: 3 },
  splitLegendPct: { fontFamily: Fonts.heading, fontSize: 12 },
  splitLegendLabel: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 1, color: Colors.textMuted },

  waterCard: {
    width: 130, borderWidth: 1, borderColor: 'rgba(91,163,199,0.15)',
    borderRadius: 16, padding: Spacing.md, overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)', alignItems: 'center', gap: 4,
  },
  waterTitle: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: '#5BA3C7' },
  waterRune: { fontSize: 18, fontFamily: 'System', color: '#5BA3C740' },
  waterCount: { fontFamily: Fonts.heading, fontSize: 32, color: '#5BA3C7', lineHeight: 34 },
  waterGoal: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 1, color: Colors.textMuted },
  waterDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginVertical: 4 },
  waterDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(91,163,199,0.15)', borderWidth: 1, borderColor: 'rgba(91,163,199,0.25)' },
  waterDotFilled: { backgroundColor: '#5BA3C7', borderColor: '#5BA3C7' },
  waterBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
  waterBtn: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1, borderColor: 'rgba(91,163,199,0.3)',
    backgroundColor: 'rgba(91,163,199,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  waterBtnAdd: { backgroundColor: 'rgba(91,163,199,0.2)', borderColor: '#5BA3C7' },
  waterBtnText: { fontFamily: Fonts.heading, fontSize: 18, color: '#5BA3C7', lineHeight: 20 },
  waterBtnAddText: { color: '#5BA3C7' },
  waterDone: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 1, color: '#5BA3C7', marginTop: 2 },

  weightCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(139,111,212,0.2)', borderRadius: 16,
    padding: Spacing.lg, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.85)', gap: 12,
  },
  weightTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  weightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  weightEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 3, color: '#8B6FD4', marginBottom: 4 },
  weightNumRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  weightNum: { fontFamily: Fonts.heading, fontSize: 32, color: Colors.text, lineHeight: 40 },
  weightUnit: { fontFamily: Fonts.prose, fontSize: 13, color: Colors.textMuted },
  weightEmptyNum: { fontFamily: Fonts.heading, fontSize: 32, color: Colors.textDim, lineHeight: 34 },
  weightChangeWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weightChangeText: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 0.5 },
  weightHistoryLink: { fontFamily: Fonts.body, fontSize: 10, color: '#8B6FD4', letterSpacing: 0.5 },
  weightGraphEmpty: { alignItems: 'center', justifyContent: 'center' },
  weightGraphEmptyText: { fontFamily: Fonts.proseItalic, fontSize: 11, color: Colors.textDim, fontStyle: 'italic' },
  weightLogPrompt: {
    borderWidth: 1, borderColor: 'rgba(139,111,212,0.3)', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(139,111,212,0.06)',
  },
  weightLogPromptText: { fontFamily: Fonts.subheading, fontSize: 12, color: '#8B6FD4' },
  weightInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weightInput: {
    flex: 1, fontFamily: Fonts.heading, fontSize: 16, color: Colors.text,
    borderWidth: 1, borderColor: 'rgba(139,111,212,0.3)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  weightInputUnit: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted },
  weightLogBtn: {
    backgroundColor: '#8B6FD4', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
  },
  weightLogBtnText: { fontFamily: Fonts.heading, fontSize: 12, color: Colors.void, letterSpacing: 0.5 },
  weightCancelBtn: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  weightCancelBtnText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted },

  bodyStatsRow: {
    flexDirection: 'row', marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm, gap: 10,
  },
  compactStatCard: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(139,111,212,0.2)',
    borderRadius: 16, padding: Spacing.md, overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.85)', alignItems: 'center', gap: 6,
  },
  compactStatEyebrow: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: '#8B6FD4' },
  compactStatNumRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  compactStatNum: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.text },
  compactStatUnit: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted },
  compactStatEmptyNum: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.textDim },
  compactStatChangeWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  compactStatChangeText: { fontFamily: Fonts.body, fontSize: 9, color: Colors.textMuted },
  compactLogBtn: {
    borderWidth: 1, borderColor: 'rgba(139,111,212,0.3)', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 12, marginTop: 2,
    backgroundColor: 'rgba(139,111,212,0.06)',
  },
  compactLogBtnText: { fontFamily: Fonts.subheading, fontSize: 10, color: '#8B6FD4' },

  expandedLogForm: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(139,111,212,0.2)', borderRadius: 14,
    padding: Spacing.md, backgroundColor: 'rgba(12,10,16,0.7)', gap: 8,
  },
  expandedLogFormLabel: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 2, color: '#8B6FD4' },

  photosCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(139,111,212,0.15)', borderRadius: 16,
    padding: Spacing.md, overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.8)', gap: 10,
  },
  photosTitle: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: Colors.textMuted },
  photosRow: { flexDirection: 'row', gap: 10, paddingRight: 4 },
  photoAddTile: {
    width: 64, height: 84, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed',
    borderColor: 'rgba(139,111,212,0.35)', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(139,111,212,0.05)', gap: 2,
  },
  photoAddPlus: { fontFamily: Fonts.heading, fontSize: 22, color: '#8B6FD4', lineHeight: 24 },
  photoAddLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 0.5, color: '#8B6FD4' },
  photoThumbWrap: { alignItems: 'center', gap: 4 },
  photoThumb: {
    width: 64, height: 84, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  photoThumbDate: { fontFamily: Fonts.body, fontSize: 7, letterSpacing: 0.3, color: Colors.textDim },
  photosEmptyHint: { justifyContent: 'center', paddingHorizontal: 12 },
  photosEmptyHintText: {
    fontFamily: Fonts.proseItalic, fontSize: 11, color: Colors.textDim,
    fontStyle: 'italic', maxWidth: 160,
  },

  recipeIdeasCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(224,80,32,0.2)', borderRadius: 16,
    overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.85)',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  recipeIdeasTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  recipeIdeasIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(224,80,32,0.25)',
    backgroundColor: 'rgba(224,80,32,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  recipeIdeasIcon: { fontSize: 18, color: '#E05020', fontFamily: 'System' },
  recipeIdeasTitle: { fontFamily: Fonts.heading, fontSize: 13, color: '#E05020', letterSpacing: 0.5, marginBottom: 2 },
  recipeIdeasSub: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted },
  recipeIdeasArrow: { fontFamily: Fonts.heading, fontSize: 16, color: '#E05020', opacity: 0.6 },

  fastingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(139,111,212,0.2)', borderRadius: 16,
    overflow: 'hidden', backgroundColor: 'rgba(12,10,16,0.85)',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  fastingTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  fastingIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(139,111,212,0.25)',
    backgroundColor: 'rgba(139,111,212,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  fastingIcon: { fontSize: 18, color: '#8B6FD4', fontFamily: 'System' },
  fastingTitle: { fontFamily: Fonts.heading, fontSize: 13, color: '#8B6FD4', letterSpacing: 0.5, marginBottom: 2 },
  fastingSub: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted },
  fastingArrow: { fontFamily: Fonts.heading, fontSize: 16, color: '#8B6FD4', opacity: 0.6 },

  featureProBadge: {
    borderWidth: 1, borderColor: Colors.goldBorder, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, backgroundColor: Colors.goldMuted,
  },
  featureProBadgeText: { fontFamily: Fonts.body, fontSize: 8, color: Colors.gold, letterSpacing: 1 },

  previewOverlay: {
    flex: 1, backgroundColor: 'rgba(4,4,8,0.97)',
    alignItems: 'center', justifyContent: 'center', padding: Spacing.lg,
  },
  previewClose: {
    position: 'absolute', top: 60, right: Spacing.lg, zIndex: 2,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  previewCloseText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text },
  previewImage: { width: '100%', height: '65%', borderRadius: 16 },
  previewInfo: { marginTop: Spacing.lg, alignItems: 'center', gap: 8 },
  previewDate: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.text, letterSpacing: 0.5 },
  previewWeight: { fontFamily: Fonts.prose, fontSize: 13, color: '#8B6FD4' },
  previewDeleteBtn: {
    marginTop: 10, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(139,26,26,0.4)',
    backgroundColor: 'rgba(139,26,26,0.1)',
  },
  previewDeleteText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.blood, letterSpacing: 0.5 },

  weightListOverlay: { flex: 1, backgroundColor: 'rgba(4,4,8,0.85)', justifyContent: 'flex-end' },
  weightListSheet: {
    backgroundColor: '#0C0A10', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: 'rgba(139,111,212,0.2)', borderBottomWidth: 0,
    padding: Spacing.lg, paddingBottom: Spacing.xl, gap: 4,
  },
  weightListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  weightListTitle: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 3, color: Colors.textMuted },
  weightListClose: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted },
  weightListRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  weightListDate: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted, width: 60 },
  weightListValue: { fontFamily: Fonts.subheading, fontSize: 15, color: Colors.text, flex: 1 },
  weightListActions: { flexDirection: 'row', gap: 14 },
  weightListActionBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  weightListActionText: { fontFamily: Fonts.body, fontSize: 12, color: '#8B6FD4' },
  weightListEditRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  weightListEditInput: {
    flex: 1, fontFamily: Fonts.heading, fontSize: 15, color: Colors.text,
    borderWidth: 1, borderColor: 'rgba(139,111,212,0.3)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  weightListSaveBtn: { backgroundColor: '#8B6FD4', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  weightListSaveBtnText: { fontFamily: Fonts.heading, fontSize: 11, color: Colors.void },

  editFieldLabel: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: Colors.textMuted, marginBottom: 4 },
  editFieldInput: {
    fontFamily: Fonts.subheading, fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  editFieldRow: { flexDirection: 'row', gap: 10 },
  editSaveBtn: {
    backgroundColor: Colors.gold, borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  editSaveBtnText: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.void, letterSpacing: 1 },

  weeklyCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: Spacing.lg, overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)', gap: 12,
  },
  weeklyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weeklyTitle: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 2, color: Colors.textMuted },
  weeklyLegend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weeklyLegendDot: { width: 6, height: 6, borderRadius: 3 },
  weeklyLegendLabel: { fontFamily: Fonts.body, fontSize: 8, color: Colors.textMuted, letterSpacing: 0.5 },
  weeklyBars: { flexDirection: 'row', gap: 6, height: 80, alignItems: 'flex-end' },
  weeklyBarCol: { flex: 1, alignItems: 'center', gap: 4 },
  weeklyBarTrack: { flex: 1, width: '100%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden', position: 'relative', justifyContent: 'flex-end' },
  weeklyGoalLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(201,168,76,0.3)' },
  weeklyBarFill: { width: '100%', borderRadius: 4, minHeight: 2, opacity: 0.85 },
  weeklyBarVal: { fontFamily: Fonts.body, fontSize: 6, letterSpacing: 0.3 },
  weeklyBarDay: { fontFamily: Fonts.body, fontSize: 8, letterSpacing: 0.5, color: Colors.textDim },

  sectionLabel: {
    fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3,
    color: Colors.textMuted, paddingHorizontal: Spacing.lg, marginBottom: 10,
  },

  mealCard: {
    marginHorizontal: Spacing.lg, marginBottom: 10,
    borderWidth: 1, borderRadius: 16, overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
  },
  mealHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  mealHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 8 },
  mealIconWrap: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mealLabel: { fontFamily: Fonts.subheading, fontSize: 13, color: Colors.text },
  mealSub: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted },
  mealHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  mealCals: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 0.5 },
  addBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radii.full, borderWidth: 1 },
  addBtnText: { fontFamily: Fonts.body, fontSize: 10, letterSpacing: 0.5 },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 10, gap: 10 },
  mealRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  mealRowInfo: { flex: 1 },
  mealRowName: { fontFamily: Fonts.subheading, fontSize: 13, color: Colors.text, marginBottom: 2 },
  mealRowMacros: { fontFamily: Fonts.prose, fontSize: 11, color: Colors.textMuted },
  deleteBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(139,26,26,0.15)', borderWidth: 1, borderColor: 'rgba(139,26,26,0.25)', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontFamily: Fonts.body, fontSize: 9, color: Colors.blood },
  mealEmptyWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md, paddingVertical: 12 },
  mealEmptyRune: { fontSize: 16, fontFamily: 'System', opacity: 0.4 },
  mealEmpty: { fontFamily: Fonts.proseItalic, fontSize: 12, color: Colors.textDim, fontStyle: 'italic' },

  proBanner: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.sm, borderWidth: 1,
    borderColor: Colors.goldBorder, borderRadius: 14, padding: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden',
  },
  proBannerLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  proBannerTitle: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.gold, letterSpacing: 0.5, marginBottom: 3 },
  proBannerSub: { fontFamily: Fonts.prose, fontSize: 12, color: Colors.textMuted },
  proBannerArrow: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.gold, opacity: 0.5 },

  bottomRunes: { alignItems: 'center', paddingVertical: Spacing.lg },
  bottomRuneText: { fontFamily: 'System', fontSize: 13, color: 'rgba(201,168,76,0.08)', letterSpacing: 10 },

  scanBtnText: { fontSize: 16, fontFamily: 'System' },
  scanBtn: { paddingHorizontal: 12, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  scanBtnRune: { fontSize: 13, fontFamily: 'System' },
  scanBtnLabel: { fontSize: 10, fontFamily: Fonts.body, letterSpacing: 0.5 },
});