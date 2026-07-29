export type WorkoutType = 'strength' | 'endurance' | 'combat' | 'recovery';

export interface Rank {
  title: string;
  shieldmaidenTitle: string;
  minXP: number;
  icon: string;
  description: string;
  shieldmaidenDescription: string;
}

export const RANKS: Rank[] = [
  {
    title: 'Thrall',    shieldmaidenTitle: 'Thrall',
    minXP: 0,     icon: 'ᚠ',
    description: 'You have just begun your saga.',
    shieldmaidenDescription: 'Your saga is just beginning.',
  },
  {
    title: 'Karl',      shieldmaidenTitle: 'Skjaldmær',
    minXP: 500,   icon: 'ᚢ',
    description: 'A free warrior of the North.',
    shieldmaidenDescription: 'A Shieldmaiden who has taken up the blade.',
  },
  {
    title: 'Huscarl',   shieldmaidenTitle: 'Víkingr',
    minXP: 2000,  icon: 'ᚦ',
    description: 'A sworn household warrior.',
    shieldmaidenDescription: 'One who raids far and fears nothing.',
  },
  {
    title: 'Berserker', shieldmaidenTitle: 'Valkyrja',
    minXP: 5000,  icon: 'ᚱ',
    description: 'Feared on every battlefield.',
    shieldmaidenDescription: 'A chooser of the slain. Freya walks beside you.',
  },
  {
    title: 'Jarl',      shieldmaidenTitle: 'Skjaldmær Jarl',
    minXP: 12000, icon: 'ᚲ',
    description: 'A lord of men and war.',
    shieldmaidenDescription: 'A warrior-queen who commands with iron and grace.',
  },
  {
    title: 'Drengr',    shieldmaidenTitle: 'Brynhildr',
    minXP: 25000, icon: 'ᛋ',
    description: 'A warrior of legendary honor.',
    shieldmaidenDescription: 'The greatest Valkyrie — she who defied Odin himself.',
  },
  {
    title: 'Einherjar', shieldmaidenTitle: "Freya's Chosen",
    minXP: 50000, icon: 'ᛟ',
    description: 'Chosen by the Valkyries for Valhalla.',
    shieldmaidenDescription: 'Blessed by Freya. Destined for her hall in Fólkvangr.',
  },
];

export const WORKOUT_XP: Record<WorkoutType, number> = {
  strength: 200,
  endurance: 150,
  combat: 175,
  recovery: 100,
};

export const WORKOUT_META: Record<WorkoutType, { label: string; icon: string; color: string }> = {
  strength:  { label: 'Feats of Strength', icon: 'ᚦ', color: '#C9A84C' },
  endurance: { label: 'The Long Raid',     icon: 'ᚢ', color: '#A8C4D4' },
  combat:    { label: 'Battle Drills',     icon: 'ᚱ', color: '#E05050' },
  recovery:  { label: 'Sacred Rest',       icon: 'ᛁ', color: '#7A7590' },
};

export function getRank(xp: number): Rank & { index: number; nextRank: Rank | null; progress: number } {
  let current = RANKS[0];
  let index = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXP) {
      current = RANKS[i];
      index = i;
      break;
    }
  }
  const nextRank = index < RANKS.length - 1 ? RANKS[index + 1] : null;
  const progress = nextRank
    ? (xp - current.minXP) / (nextRank.minXP - current.minXP)
    : 1;
  return { ...current, index, nextRank, progress };
}

// Helper to get the right title based on gender
export function getRankTitle(rank: Rank, isShieldmaiden: boolean): string {
  return isShieldmaiden ? rank.shieldmaidenTitle : rank.title;
}

export function getRankDescription(rank: Rank, isShieldmaiden: boolean): string {
  return isShieldmaiden ? rank.shieldmaidenDescription : rank.description;
}