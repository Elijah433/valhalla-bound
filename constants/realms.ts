// The Nine Realms — a long-arc visual progression layer that sits
// alongside (never replaces) the existing rank system in ranks.ts. Ranks
// answer "what are you called right now"; realms answer "how far through
// the whole journey to Valhalla are you." Deliberately extends well past
// the current top rank's 50,000 XP ceiling (Einherjar / Freya's Chosen),
// since reaching max rank currently leaves nothing further to visually
// chase — the realms give long-term players a real reason to keep
// training even after "maxing out."

export interface Realm {
  name: string;
  rune: string;
  minXP: number;
  description: string;
  color: string;
}

export const NINE_REALMS: Realm[] = [
  {
    name: 'Midgard',
    rune: 'ᛗ',
    minXP: 0,
    description: 'The mortal world. Every saga begins here.',
    color: '#7A8B7A',
  },
  {
    name: 'Niflheim',
    rune: 'ᚻ',
    minXP: 3000,
    description: 'The realm of ice. Endurance is tested first.',
    color: '#A8C4D4',
  },
  {
    name: 'Muspelheim',
    rune: 'ᚱ',
    minXP: 8000,
    description: 'The realm of fire. Strength is forged here.',
    color: '#E05050',
  },
  {
    name: 'Jötunheim',
    rune: 'ᚦ',
    minXP: 18000,
    description: 'Land of giants. Only the truly tested pass through.',
    color: '#8B7355',
  },
  {
    name: 'Svartálfheim',
    rune: 'ᚲ',
    minXP: 35000,
    description: "The dwarven forges. Discipline becomes craft.",
    color: '#6B5B95',
  },
  {
    name: 'Vanaheim',
    rune: 'ᚨ',
    minXP: 60000,
    description: 'Realm of the Vanir. Wisdom joins strength.',
    color: '#88A87A',
  },
  {
    name: 'Álfheim',
    rune: 'ᛁ',
    minXP: 90000,
    description: 'Realm of light. Mastery begins to show.',
    color: '#D4C896',
  },
  {
    name: 'Helheim',
    rune: 'ᚺ',
    minXP: 130000,
    description: "Even the dead are faced without fear.",
    color: '#5A5568',
  },
  {
    name: 'Asgard',
    rune: 'ᛟ',
    minXP: 180000,
    description: 'The hall of the gods. Valhalla awaits within.',
    color: '#C9A84C',
  },
];

export function getRealm(xp: number): Realm & {
  index: number;
  nextRealm: Realm | null;
  progress: number;
  isFinalRealm: boolean;
} {
  let current = NINE_REALMS[0];
  let index = 0;
  for (let i = NINE_REALMS.length - 1; i >= 0; i--) {
    if (xp >= NINE_REALMS[i].minXP) {
      current = NINE_REALMS[i];
      index = i;
      break;
    }
  }
  const nextRealm = index < NINE_REALMS.length - 1 ? NINE_REALMS[index + 1] : null;
  const progress = nextRealm
    ? (xp - current.minXP) / (nextRealm.minXP - current.minXP)
    : 1;
  return { ...current, index, nextRealm, progress, isFinalRealm: nextRealm === null };
}