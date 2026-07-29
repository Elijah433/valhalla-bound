import { supabase, type Crew, type CrewMember } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// ── Device ID ─────────────────────────────────────────────
export async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem('valhalla_device_id');
  if (!id) {
    id = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${Date.now()}-${Math.random()}`
    );
    await AsyncStorage.setItem('valhalla_device_id', id);
  }
  return id;
}

// ── Code generation ────────────────────────────────────────
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function uniqueCode(): Promise<string> {
  let code = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data } = await supabase
      .from('crews')
      .select('id')
      .eq('code', code)
      .single();
    if (!data) break;
    code = generateCode();
    attempts++;
  }
  return code;
}

// ── Create crew ────────────────────────────────────────────
export async function createCrew(
  name: string,
  warriorName: string,
  rankXp: number,
  streakDays: number,
  isShieldmaiden: boolean,
): Promise<{ crew: Crew; error: string | null }> {
  try {
    const deviceId = await getDeviceId();
    const code = await uniqueCode();

    // Create crew
    const { data: crew, error: crewError } = await supabase
      .from('crews')
      .insert({
        name,
        code,
        leader_device_id: deviceId,
      })
      .select()
      .single();

    if (crewError || !crew) {
      return { crew: null as any, error: crewError?.message ?? 'Failed to create crew' };
    }

    // Add leader as first member
    const { error: memberError } = await supabase
      .from('crew_members')
      .insert({
        crew_id: crew.id,
        device_id: deviceId,
        warrior_name: warriorName,
        rank_xp: rankXp,
        streak_days: streakDays,
        is_shieldmaiden: isShieldmaiden,
        last_active: new Date().toISOString(),
      });

    if (memberError) {
      return { crew: null as any, error: memberError.message };
    }

    // Save crew to local storage
    await AsyncStorage.setItem('valhalla_crew_id', crew.id);
    await AsyncStorage.setItem('valhalla_crew_code', code);
    await AsyncStorage.setItem('valhalla_crew_name', name);
    await AsyncStorage.setItem('valhalla_is_leader', 'true');

    return { crew, error: null };
  } catch (e: any) {
    return { crew: null as any, error: e.message ?? 'Unknown error' };
  }
}

// ── Join crew ──────────────────────────────────────────────
export async function joinCrew(
  code: string,
  warriorName: string,
  rankXp: number,
  streakDays: number,
  isShieldmaiden: boolean,
): Promise<{ crew: Crew; error: string | null }> {
  try {
    const deviceId = await getDeviceId();

    // Find crew by code
    const { data: crew, error: findError } = await supabase
      .from('crews')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .single();

    if (findError || !crew) {
      return { crew: null as any, error: 'Crew not found. Check your code.' };
    }

    // Check member count
    const { count } = await supabase
      .from('crew_members')
      .select('*', { count: 'exact', head: true })
      .eq('crew_id', crew.id);

    if ((count ?? 0) >= 10) {
      return { crew: null as any, error: 'This crew is full (10/10 warriors).' };
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('crew_members')
      .select('id')
      .eq('crew_id', crew.id)
      .eq('device_id', deviceId)
      .single();

    if (existing) {
      // Already in crew — just update local storage
      await AsyncStorage.setItem('valhalla_crew_id', crew.id);
      await AsyncStorage.setItem('valhalla_crew_code', crew.code);
      await AsyncStorage.setItem('valhalla_crew_name', crew.name);
      await AsyncStorage.setItem('valhalla_is_leader',
        crew.leader_device_id === deviceId ? 'true' : 'false'
      );
      return { crew, error: null };
    }

    // Join as new member
    const { error: joinError } = await supabase
      .from('crew_members')
      .insert({
        crew_id: crew.id,
        device_id: deviceId,
        warrior_name: warriorName,
        rank_xp: rankXp,
        streak_days: streakDays,
        is_shieldmaiden: isShieldmaiden,
        last_active: new Date().toISOString(),
      });

    if (joinError) {
      return { crew: null as any, error: joinError.message };
    }

    await AsyncStorage.setItem('valhalla_crew_id', crew.id);
    await AsyncStorage.setItem('valhalla_crew_code', crew.code);
    await AsyncStorage.setItem('valhalla_crew_name', crew.name);
    await AsyncStorage.setItem('valhalla_is_leader', 'false');

    return { crew, error: null };
  } catch (e: any) {
    return { crew: null as any, error: e.message ?? 'Unknown error' };
  }
}

// ── Leave crew ─────────────────────────────────────────────
export async function leaveCrew(): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    const crewId = await AsyncStorage.getItem('valhalla_crew_id');
    if (!crewId) return;

    const isLeader = await AsyncStorage.getItem('valhalla_is_leader') === 'true';

    if (isLeader) {
      // Delete entire crew if leader leaves
      await supabase.from('crews').delete().eq('id', crewId);
    } else {
      await supabase
        .from('crew_members')
        .delete()
        .eq('crew_id', crewId)
        .eq('device_id', deviceId);
    }

    await AsyncStorage.multiRemove([
      'valhalla_crew_id',
      'valhalla_crew_code',
      'valhalla_crew_name',
      'valhalla_is_leader',
    ]);
  } catch (e) {}
}

// ── Sync my stats ──────────────────────────────────────────
export async function syncMyStats(
  warriorName: string,
  rankXp: number,
  streakDays: number,
  isShieldmaiden: boolean,
): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    const crewId = await AsyncStorage.getItem('valhalla_crew_id');
    if (!crewId) return;

    await supabase
      .from('crew_members')
      .update({
        warrior_name: warriorName,
        rank_xp: rankXp,
        streak_days: streakDays,
        is_shieldmaiden: isShieldmaiden,
        last_active: new Date().toISOString(),
      })
      .eq('crew_id', crewId)
      .eq('device_id', deviceId);
  } catch (e) {}
}

// Same as syncMyStats(), but checks crew membership first and is a no-op
// if the user isn't in a crew — meant to be called from places (like
// recordWorkout()) that don't otherwise need to know about crew state at
// all. This is what makes stats sync automatically the moment a workout
// is logged, rather than only when the user happens to open the Crew tab
// — previously, a crew member's stats could go stale indefinitely if they
// trained regularly but rarely revisited the Crew screen, since
// syncMyStats() was only ever called from crew.tsx's loadCrew().
export async function syncMyStatsIfInCrew(
  warriorName: string,
  rankXp: number,
  streakDays: number,
  isShieldmaiden: boolean,
): Promise<void> {
  try {
    const crewId = await AsyncStorage.getItem('valhalla_crew_id');
    if (!crewId) return; // not in a crew — nothing to do
    await syncMyStats(warriorName, rankXp, streakDays, isShieldmaiden);
  } catch (e) {}
}

// ── Get crew members ───────────────────────────────────────
export async function getCrewMembers(crewId: string): Promise<CrewMember[]> {
  try {
    const { data, error } = await supabase
      .from('crew_members')
      .select('*')
      .eq('crew_id', crewId)
      .order('rank_xp', { ascending: false });

    if (error || !data) return [];
    return data;
  } catch (e) {
    return [];
  }
}

// ── Get crew info ──────────────────────────────────────────
export async function getCrewInfo(crewId: string): Promise<Crew | null> {
  try {
    const { data, error } = await supabase
      .from('crews')
      .select('*')
      .eq('id', crewId)
      .single();

    if (error || !data) return null;
    return data;
  } catch (e) {
    return null;
  }
}

// ── Subscribe to crew changes ──────────────────────────────
export function subscribeToCrewChanges(
  crewId: string,
  onUpdate: (members: CrewMember[]) => void,
) {
  const channel = supabase
    .channel(`crew:${crewId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'crew_members',
        filter: `crew_id=eq.${crewId}`,
      },
      async () => {
        const members = await getCrewMembers(crewId);
        onUpdate(members);
      }
    )
    .subscribe();

  return channel;
}

// ── Check if user is in a crew ─────────────────────────────
export async function getLocalCrewState(): Promise<{
  crewId: string | null;
  crewCode: string | null;
  crewName: string | null;
  isLeader: boolean;
}> {
  const [crewId, crewCode, crewName, isLeaderStr] = await Promise.all([
    AsyncStorage.getItem('valhalla_crew_id'),
    AsyncStorage.getItem('valhalla_crew_code'),
    AsyncStorage.getItem('valhalla_crew_name'),
    AsyncStorage.getItem('valhalla_is_leader'),
  ]);

  return {
    crewId,
    crewCode,
    crewName,
    isLeader: isLeaderStr === 'true',
  };
}

// ── Get rank info from XP ──────────────────────────────────
export function getRankFromXP(xp: number): { title: string; icon: string } {
  if (xp >= 10000) return { title: 'Einherjar', icon: 'ᛟ' };
  if (xp >= 5000) return { title: 'Berserker', icon: 'ᚱ' };
  if (xp >= 2000) return { title: 'Huscarl', icon: 'ᚦ' };
  if (xp >= 500) return { title: 'Raider', icon: 'ᚢ' };
  return { title: 'Thrall', icon: 'ᚠ' };
}

// ── Format last active ─────────────────────────────────────
export function formatLastActive(lastActive: string): string {
  const now = new Date();
  const then = new Date(lastActive);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 5) return 'active now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
}