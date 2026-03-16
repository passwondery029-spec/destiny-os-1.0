
import { UserProfile } from '../types';
import { MOCK_PROFILES } from './mockDataService';
import { supabase } from './supabaseClient';
import { calculateBazi } from './baziCalculator';

const STORAGE_KEY = 'destiny_os_profiles';

// Helper to calculate real Bazi using our algorithm
const calculateMockBazi = (dateStr: string, timeStr: string): string => {
  const bazi = calculateBazi(dateStr, timeStr);
  return `${bazi.year.tiangan}${bazi.year.dizhi} ${bazi.month.tiangan}${bazi.month.dizhi} ${bazi.day.tiangan}${bazi.day.dizhi} ${bazi.time.tiangan}${bazi.time.dizhi}`;
};

// Get profiles completely sync from localStorage as fallback/initial state
export const getProfilesSync = (): UserProfile[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_PROFILES));
    return MOCK_PROFILES;
  }
  return JSON.parse(stored);
};

// Async version that fetches from Supabase user_metadata and updates LocalStorage
export const getProfiles = async (): Promise<UserProfile[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.user_metadata?.destiny_profiles) {
    const profiles = session.user.user_metadata.destiny_profiles as UserProfile[];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    return profiles;
  }
  return getProfilesSync();
};

const syncToCloud = async (profiles: UserProfile[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await supabase.auth.updateUser({
      data: { destiny_profiles: profiles }
    });
  }
};

export const updateProfile = async (id: string, updates: Partial<UserProfile>): Promise<UserProfile[]> => {
  let profiles = getProfilesSync();
  const index = profiles.findIndex(p => p.id === id);

  if (index !== -1) {
    // If birth date/time changed, recalculate Bazi
    let newBazi = profiles[index].bazi;
    if (updates.birthDate || updates.birthTime) {
      const d = updates.birthDate || profiles[index].birthDate;
      const t = updates.birthTime || profiles[index].birthTime;
      newBazi = calculateMockBazi(d, t);
    }

    profiles[index] = {
      ...profiles[index],
      ...updates,
      bazi: newBazi
    };
    await syncToCloud(profiles);
  }
  return profiles;
};

export const addProfile = async (newProfile: UserProfile): Promise<UserProfile[]> => {
  const profiles = getProfilesSync();
  const updated = [...profiles, newProfile];
  await syncToCloud(updated);
  return updated;
};
