import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type Gender = 'warrior' | 'shieldmaiden';
export type Goal = 'strength' | 'endurance' | 'both' | 'weightloss';
export type Weapon = 'mjolnir' | 'broadsword' | 'axe' | 'spear';

export interface OnboardingData {
  name: string;
  gender: Gender;
  goal: Goal;
  weapon: Weapon;
}

interface OnboardingStore {
  data: Partial<OnboardingData>;
  isComplete: boolean;
  // True until checkComplete() has actually resolved at least once. Lets
  // consumers (e.g. the launch redirect in _layout.tsx) wait for the real
  // value instead of acting on the default `isComplete: false` before the
  // AsyncStorage read has had a chance to finish — that race was sending
  // already-onboarded users back through onboarding on every relaunch.
  isLoading: boolean;
  setField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  checkComplete: () => Promise<void>;
  markComplete: () => Promise<void>;
  reset: () => Promise<void>;
}

export const ONBOARDING_KEY = 'valhalla_onboarding_complete';

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  data: {},
  isComplete: false,
  isLoading: true,

  setField: (key, value) => {
    set((s) => ({ data: { ...s.data, [key]: value } }));
  },

  checkComplete: async () => {
    const val = await AsyncStorage.getItem(ONBOARDING_KEY);
    set({ isComplete: val === 'true', isLoading: false });
  },

  markComplete: async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    set({ isComplete: true, isLoading: false });
  },

  reset: async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    set({ isComplete: false, data: {}, isLoading: false });
  },
}));