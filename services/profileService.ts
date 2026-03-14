
import { UserProfile } from '../types';
import { MOCK_PROFILES } from './mockDataService';
import { supabase } from './supabaseClient';

const STORAGE_KEY = 'destiny_os_profiles';

// Helper to simulate Bazi Calculation based on date
// In a real app, this would involve complex lunar calendar algorithms
const calculateMockBazi = (dateStr: string, timeStr: string): string => {
  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  const date = new Date(dateStr);
  const year = date.getFullYear();
  const day = date.getDate();

  // Deterministic pseudo-random based on input
  const yearIdx = (year - 4) % 10;
  const yearBranchIdx = (year - 4) % 12;

  const monthIdx = (date.getMonth() + 2) % 10;
  const monthBranchIdx = (date.getMonth() + 2) % 12;

  const dayIdx = day % 10;
  const dayBranchIdx = day % 12;

  const timeHour = parseInt(timeStr.split(':')[0] || '0');
  const timeIdx = timeHour % 10;
  const timeBranchIdx = Math.floor((timeHour + 1) / 2) % 12;

  return `${stems[yearIdx]}${branches[yearBranchIdx]} ${stems[monthIdx]}${branches[monthBranchIdx]} ${stems[dayIdx]}${branches[dayBranchIdx]} ${stems[timeIdx]}${branches[timeBranchIdx]}`;
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
