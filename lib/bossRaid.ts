import { supabase } from './supabase';

// ── Boss Roster ──────────────────────────────────────────
export interface Boss {
  name: string;
  lore: string;
  color: string;
  hpPerMember: number;
}

export const BOSS_ROSTER: Boss[] = [
  {
    name: 'Fenrir',
    lore: 'The great wolf, bound by chains until the end of days.',
    color: '#8A8A8A',
    hpPerMember: 8000,
  },
  {
    name: 'Jörmungandr',
    lore: 'The world serpent, coiled around Midgard, awaiting Ragnarök.',
    color: '#4CAF50',
    hpPerMember: 14000,
  },
  {
    name: 'Surtr',
    lore: 'The fire giant, wielder of the blade that will burn the nine realms.',
    color: '#E05020',
    hpPerMember: 22000,
  },
  {
    name: 'Hel',
    lore: 'Ruler of the underworld, half living, half corpse.',
    color: '#7A4A8A',
    hpPerMember: 32000,
  },
  {
    name: "Naglfar's Crew",
    lore: 'The ship of the dead, crewed by giants, sailing to herald the final battle.',
    color: '#1A1A1A',
    hpPerMember: 48000,
  },
];

const WEEKLY_REGEN_PCT = 0.3; // boss regenerates 30% of max HP if not defeated by week's end

export interface BossRaid {
  id: string;
  crew_id: string;
  boss_index: number;
  max_hp: number;
  current_hp: number;
  status: 'active' | 'defeated';
  week_start: string;
  defeated_at: string | null;
  created_at: string;
}

// Date.toISOString() always resolves to UTC, not the device's local time —
// that can shift the "Monday" boundary by up to a day depending on timezone
// and time of day, which is what was causing the boss to look like it fully
// regenerated when only a partial weekly regen (or no regen at all) should
// have happened. Build the date string from local date parts instead.
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMondayKey(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return getLocalDateString(monday);
}

function createRaidRow(crewId: string, bossIndex: number, memberCount: number) {
  const boss = BOSS_ROSTER[bossIndex % BOSS_ROSTER.length];
  const maxHp = boss.hpPerMember * Math.max(1, memberCount);
  return {
    crew_id: crewId,
    boss_index: bossIndex,
    max_hp: maxHp,
    current_hp: maxHp,
    status: 'active' as const,
    week_start: getMondayKey(),
  };
}

// ── Get (or create) the crew's active boss raid ───────────
export async function getActiveBossRaid(
  crewId: string,
  memberCount: number,
): Promise<BossRaid | null> {
  try {
    const { data: existing, error } = await supabase
      .from('crew_boss_raids')
      .select('*')
      .eq('crew_id', crewId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !existing) {
      // No raid yet — start the first boss
      const { data: created, error: createError } = await supabase
        .from('crew_boss_raids')
        .insert(createRaidRow(crewId, 0, memberCount))
        .select()
        .single();
      if (createError || !created) return null;
      return created;
    }

    // If the current boss was defeated, start the next one
    if (existing.status === 'defeated') {
      const nextIndex = existing.boss_index + 1;
      const { data: created, error: createError } = await supabase
        .from('crew_boss_raids')
        .insert(createRaidRow(crewId, nextIndex, memberCount))
        .select()
        .single();
      if (createError || !created) return existing;
      return created;
    }

    // If a new week has started and the boss wasn't defeated, partial regen
    const currentWeek = getMondayKey();
    if (existing.week_start !== currentWeek) {
      const regen = Math.round(existing.max_hp * WEEKLY_REGEN_PCT);
      const newHp = Math.min(existing.max_hp, existing.current_hp + regen);
      const { data: updated, error: updateError } = await supabase
        .from('crew_boss_raids')
        .update({ current_hp: newHp, week_start: currentWeek })
        .eq('id', existing.id)
        .select()
        .single();
      if (updateError || !updated) return existing;
      return updated;
    }

    return existing;
  } catch (e) {
    return null;
  }
}

// ── Deal damage to the active boss ────────────────────────
export async function dealBossDamage(
  crewId: string,
  damage: number,
): Promise<{ defeated: boolean; bossName: string } | null> {
  try {
    const { data: raid, error } = await supabase
      .from('crew_boss_raids')
      .select('*')
      .eq('crew_id', crewId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !raid || raid.status === 'defeated') return null;

    const newHp = raid.current_hp - damage;
    const boss = BOSS_ROSTER[raid.boss_index % BOSS_ROSTER.length];

    if (newHp <= 0) {
      await supabase
        .from('crew_boss_raids')
        .update({ current_hp: 0, status: 'defeated', defeated_at: new Date().toISOString() })
        .eq('id', raid.id);
      return { defeated: true, bossName: boss.name };
    }

    await supabase
      .from('crew_boss_raids')
      .update({ current_hp: newHp })
      .eq('id', raid.id);
    return { defeated: false, bossName: boss.name };
  } catch (e) {
    return null;
  }
}

// ── Real-time subscription, same pattern as crew members ──
export function subscribeToBossRaid(
  crewId: string,
  onUpdate: (raid: BossRaid) => void,
) {
  const channel = supabase
    .channel(`boss_raid:${crewId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'crew_boss_raids',
        filter: `crew_id=eq.${crewId}`,
      },
      (payload) => {
        if (payload.new) onUpdate(payload.new as BossRaid);
      }
    )
    .subscribe();

  return channel;
}