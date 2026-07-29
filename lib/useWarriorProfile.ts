import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WarriorProfile {
  gender: 'warrior' | 'shieldmaiden' | null;
  goal: string | null;
  weapon: string | null;
  isShieldmaiden: boolean;
}

export function useWarriorProfile(): WarriorProfile {
  const [profile, setProfile] = useState<WarriorProfile>({
    gender: null,
    goal: null,
    weapon: null,
    isShieldmaiden: false,
  });

  useEffect(() => {
    async function load() {
      try {
        const [gender, goal, weapon] = await Promise.all([
          AsyncStorage.getItem('valhalla_gender'),
          AsyncStorage.getItem('valhalla_goal'),
          AsyncStorage.getItem('valhalla_weapon'),
        ]);
        setProfile({
          gender: gender as 'warrior' | 'shieldmaiden' | null,
          goal,
          weapon,
          isShieldmaiden: gender === 'shieldmaiden',
        });
      } catch (e) {}
    }
    load();
  }, []);

  return profile;
}