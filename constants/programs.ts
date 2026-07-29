export interface ProgramDay {
  day: string;
  name: string;
  type: 'strength' | 'endurance' | 'combat' | 'recovery';
  exercises: string[];
  duration: string;
  xp: number;
}

export interface Program {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  rune: string;
  color: string;
  desc: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  goal: string;
  proOnly: boolean;
  days: ProgramDay[];
}

export const PROGRAMS: Program[] = [
  {
    id: 'thor',
    name: "Thor's Forge",
    subtitle: 'Powerbuilding Protocol',
    icon: 'ᚦ',
    rune: 'ᚦ',
    color: '#C9A84C',
    desc: 'Build legendary strength and size. Heavy compound lifts, progressive overload, forged in iron.',
    difficulty: 'Advanced',
    goal: 'Strength & Mass',
    proOnly: true,
    days: [
      { day: 'MON', name: 'Push — Chest & Shoulders', type: 'strength', exercises: ['Bench Press 4x5', 'Overhead Press 4x6', 'Incline DB Press 3x10', 'Lateral Raises 3x15', 'Tricep Pushdown 3x12'], duration: '60-75 min', xp: 250 },
      { day: 'TUE', name: 'Pull — Back & Biceps', type: 'strength', exercises: ['Deadlift 4x4', 'Pull Ups 4x8', 'Barbell Row 3x8', 'Face Pulls 3x15', 'Hammer Curls 3x12'], duration: '60-75 min', xp: 250 },
      { day: 'WED', name: 'Sacred Rest', type: 'recovery', exercises: ['Light stretching 20 min', 'Foam rolling', 'Walk 20-30 min'], duration: '20-30 min', xp: 80 },
      { day: 'THU', name: 'Legs — The Foundation', type: 'strength', exercises: ['Back Squat 5x5', 'Romanian Deadlift 3x10', 'Leg Press 3x12', 'Leg Curl 3x12', 'Calf Raises 4x20'], duration: '60-75 min', xp: 250 },
      { day: 'FRI', name: 'Full Body — Berserker', type: 'strength', exercises: ['Power Clean 4x4', 'Front Squat 3x6', 'Push Press 3x8', 'Chin Ups 3x10', 'Core Circuit 3x'], duration: '75-90 min', xp: 300 },
      { day: 'SAT', name: 'Conditioning Raid', type: 'endurance', exercises: ['5km Run or Row 20 min', 'Battle Ropes 5x30s', 'Sled Push 5x20m', 'Burpees 3x20'], duration: '45-60 min', xp: 200 },
      { day: 'SUN', name: 'Feast & Recover', type: 'recovery', exercises: ['Full body stretch 30 min', 'Cold exposure', 'Meal prep for the week'], duration: '30-45 min', xp: 80 },
    ],
  },
  {
    id: 'odin',
    name: "Odin's Endurance",
    subtitle: 'Endurance Protocol',
    icon: 'ᚢ',
    rune: 'ᚨ',
    color: '#A8C4D4',
    desc: 'Cover vast distances. Build relentless stamina. Run, row, and conquer like a Viking raider.',
    difficulty: 'Intermediate',
    goal: 'Endurance & Cardio',
    proOnly: true,
    days: [
      { day: 'MON', name: 'Long Raid Run', type: 'endurance', exercises: ['Easy run 8km', 'Heart rate zone 2', 'Cool down stretch 10 min'], duration: '50-60 min', xp: 200 },
      { day: 'TUE', name: 'Strength Foundation', type: 'strength', exercises: ['Squat 3x10', 'Deadlift 3x8', 'Push Ups 3x15', 'Pull Ups 3x10', 'Plank 3x60s'], duration: '45-60 min', xp: 180 },
      { day: 'WED', name: 'Interval Storm', type: 'combat', exercises: ['Warm up 10 min', '8x400m intervals', '90s rest between', 'Cool down 10 min'], duration: '50-60 min', xp: 220 },
      { day: 'THU', name: 'Sacred Rest', type: 'recovery', exercises: ['Yoga or stretching 30 min', 'Light walk 20 min', 'Ice bath or cold shower'], duration: '30-45 min', xp: 80 },
      { day: 'FRI', name: 'Tempo Raid', type: 'endurance', exercises: ['Warm up 10 min', 'Tempo run 5km at race pace', 'Cool down 10 min'], duration: '45-55 min', xp: 200 },
      { day: 'SAT', name: 'The Long Voyage', type: 'endurance', exercises: ['Long slow run 12-16km', 'Zone 2 heart rate', 'Fuel every 45 min', 'Cool down stretch'], duration: '75-100 min', xp: 300 },
      { day: 'SUN', name: 'Feast & Recover', type: 'recovery', exercises: ['Full rest day', 'Light walk optional', 'Meal prep', 'Sleep 8+ hours'], duration: '0-30 min', xp: 80 },
    ],
  },
{
  id: 'shieldmaiden',
  name: "Freya's Fury",
  subtitle: 'The Valkyrie Queen',
  icon: 'ᚱ',
  rune: 'ᚱ',
  color: '#D4A8C4',
  desc: 'Train like the goddess of war and beauty. Lean muscle, fierce conditioning, Valkyrie strength.',
  difficulty: 'Beginner',
  goal: 'Tone & Lean Muscle',
  proOnly: false,
  days: [
    { day: 'MON', name: 'Lower Body Power', type: 'strength', exercises: ['Goblet Squat 3x12', 'Hip Thrust 4x15', 'Lunges 3x12 each', 'Leg Curl 3x15', 'Calf Raises 3x20'], duration: '45-55 min', xp: 200 },
    { day: 'TUE', name: 'Cardio Raid', type: 'endurance', exercises: ['Run or walk 30 min', 'Zone 2 pace', 'Cool down stretch 10 min'], duration: '40-45 min', xp: 150 },
    { day: 'WED', name: 'Upper Body Strength', type: 'strength', exercises: ['DB Press 3x12', 'Lat Pulldown 3x12', 'Lateral Raises 3x15', 'Face Pulls 3x15', 'Tricep Pushdown 3x15'], duration: '45-55 min', xp: 200 },
    { day: 'THU', name: 'Sacred Rest', type: 'recovery', exercises: ['Yoga flow 30 min', 'Foam rolling 15 min', 'Light walk optional'], duration: '30-45 min', xp: 80 },
    { day: 'FRI', name: "Freya's Circuit", type: 'combat', exercises: ['KB Swings 4x20', 'Push Ups 4x12', 'Squat Jumps 4x15', 'DB Row 4x12', 'Plank 4x45s'], duration: '40-50 min', xp: 200 },
    { day: 'SAT', name: 'Valkyrie Recovery', type: 'recovery', exercises: ['Hike or long walk 60 min', 'Stretching 15 min', 'Focus on protein intake'], duration: '60-75 min', xp: 100 },
    { day: 'SUN', name: 'Feast & Recover', type: 'recovery', exercises: ['Full rest', 'Meal prep', 'Visualise the week ahead', 'Sleep 8+ hours'], duration: '0 min', xp: 80 },
  ],
},
{
  id: 'ulfhednar',
  name: 'Ulfhednar',
  subtitle: 'The Wolf-Coat Protocol',
  icon: 'ᛟ',
  rune: 'ᚾ',
  color: '#9AA0A8',
  desc: 'Wear the wolf. Brutal hybrid strength and conditioning, built for warriors who have already mastered the forge and demand more. No mercy. No mode you can hide in.',
  difficulty: 'Advanced',
  goal: 'Hybrid Strength & Conditioning',
  proOnly: true,
  days: [
    { day: 'MON', name: 'The Hunt — Heavy Lower', type: 'strength', exercises: ['Back Squat 5x5 @ heavy', 'Deficit Deadlift 4x4', 'Bulgarian Split Squat 4x10 each', 'Nordic Curl 3x8', 'Weighted Carries 3x40m'], duration: '75-90 min', xp: 320 },
    { day: 'TUE', name: 'Wolf Pack Conditioning', type: 'combat', exercises: ['EMOM 20 min: 10 KB Swings + 5 Burpees', 'Sled Push 6x20m heavy', 'Battle Ropes 6x30s', 'Assault Bike 5x500m sprints'], duration: '50-60 min', xp: 280 },
    { day: 'WED', name: 'The Pelt — Upper Power', type: 'strength', exercises: ['Weighted Pull Ups 5x5', 'Bench Press 5x5 @ heavy', 'Weighted Dips 4x8', 'Barbell Row 4x8', 'Face Pulls 3x20'], duration: '70-85 min', xp: 300 },
    { day: 'THU', name: 'Berserker Engine', type: 'endurance', exercises: ['10km run, mixed terrain', 'Negative split — second half faster', 'Hill repeats 6x', 'Cool down 10 min'], duration: '65-80 min', xp: 280 },
    { day: 'FRI', name: 'Frenzy — Full Body Brutal', type: 'combat', exercises: ['Power Clean 5x3', 'Thruster 5x8', 'Muscle Ups or Pull Up + Dip 4x6', 'Tire Flips 5x10', "Devil's Press 4x12"], duration: '75-90 min', xp: 340 },
    { day: 'SAT', name: 'The Long Raid', type: 'endurance', exercises: ['90-120 min mixed effort — hike, row, or bike', 'Carry weight if possible', 'Fuel and hydrate throughout'], duration: '90-120 min', xp: 320 },
    { day: 'SUN', name: 'Howl & Recover', type: 'recovery', exercises: ['Deep tissue work or massage gun 20 min', 'Full mobility flow 30 min', 'Cold exposure', 'Sleep 8+ hours — the wolf rests to hunt again'], duration: '45-60 min', xp: 100 },
  ],
},
];

export const TYPE_COLORS: Record<string, string> = {
  strength: '#C9A84C',
  endurance: '#A8C4D4',
  combat: '#8B1A1A',
  recovery: '#4A4560',
};

export const TYPE_ICONS: Record<string, string> = {
  strength: 'ᚦ',
  endurance: 'ᚢ',
  combat: 'ᚱ',
  recovery: 'ᛁ',
};