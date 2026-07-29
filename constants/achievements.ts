// Achievements — discrete, one-time feats, distinct from the continuous
// Rank/Realm progression systems. Ranks and Realms are treadmills (always
// climbing toward the next number); achievements are collectible moments
// that can surprise a warrior mid-session rather than only rewarding
// grinding toward one huge cumulative total.

export interface Achievement {
  id: string;
  name: string;
  description: string;
  rune: string;
  color: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Log your first personal record.',
    rune: 'ᚱ',
    color: '#E05050',
  },
  {
    id: 'bodyweight_lift',
    name: "Odin's Own Weight",
    description: 'Lift your own bodyweight in a single set.',
    rune: 'ᚦ',
    color: '#C9A84C',
  },
  {
    id: 'iron_will_7',
    name: 'Iron Will',
    description: 'Reach a 7-day training streak.',
    rune: 'ᛁ',
    color: '#FF8C00',
  },
  {
    id: 'iron_will_30',
    name: 'Unbroken',
    description: 'Reach a 30-day training streak.',
    rune: 'ᛁ',
    color: '#FF8C00',
  },
  {
    id: 'full_circle',
    name: 'Full Circle',
    description: 'Train strength, endurance, combat, and recovery all within one week.',
    rune: 'ᛟ',
    color: '#8B6FD4',
  },
  {
    id: 'battles_10',
    name: 'Blooded',
    description: 'Log 10 total battles.',
    rune: 'ᚷ',
    color: '#E05050',
  },
  {
    id: 'battles_50',
    name: 'Battle-Hardened',
    description: 'Log 50 total battles.',
    rune: 'ᚷ',
    color: '#E05050',
  },
  {
    id: 'battles_100',
    name: 'Veteran of a Hundred Battles',
    description: 'Log 100 total battles.',
    rune: 'ᚷ',
    color: '#E05050',
  },
  {
    id: 'five_hundred_club',
    name: 'The 500 Club',
    description: 'Combined single-set squat, bench, and deadlift weight crosses 500 lbs.',
    rune: 'ᚲ',
    color: '#C9A84C',
  },
  {
    id: 'frost_shield_used',
    name: 'Frost-Bitten',
    description: 'Use a Frost Shield to protect your streak.',
    rune: 'ᚲ',
    color: '#A8C4D4',
  },
  {
    id: 'weight_logged',
    name: 'Know Thyself',
    description: 'Log your bodyweight for the first time.',
    rune: 'ᛁ',
    color: '#7A9B6E',
  },
  {
    id: 'crew_joined',
    name: 'Shield-Brother',
    description: 'Join or form a crew.',
    rune: 'ᚢ',
    color: '#C9A84C',
  },
  {
    id: 'chronicle_started',
    name: "The Skald's First Line",
    description: 'Have your first Chronicle entry written.',
    rune: 'ᛉ',
    color: '#C9A84C',
  },
  {
    id: 'ten_ravens',
    name: "Huginn and Muninn's Trust",
    description: "Check in with Odin's Ravens 10 times.",
    rune: 'ᛗ',
    color: '#8B6FD4',
  },
  {
    id: 'asgard_reached',
    name: 'The Hall Lies Open',
    description: 'Reach Asgard — the final of the Nine Realms.',
    rune: 'ᛟ',
    color: '#C9A84C',
  },
];

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}