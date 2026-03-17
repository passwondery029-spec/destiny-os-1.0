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

// Get user ID
const getUserId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
        return user.id;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
        return session.user.id;
    }
    const stored = localStorage.getItem('sb-kvqqrlmapsfmskhhyyvm-auth-token');
    if (stored) {
        try {
            const tokenData = JSON.parse(stored);
            if (tokenData?.access_token) {
                const payload = JSON.parse(atob(tokenData.access_token.split('.')[1]));
                if (payload?.sub) {
                    return payload.sub;
                }
            }
        } catch (e) {}
    }
    return null;
    return user?.id || null;
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

// Async version that fetches from backend API
export const getProfiles = async (): Promise<UserProfile[]> => {
  try {
    const userId = await getUserId();
    if (!userId) return getProfilesSync();

    const response = await fetch('/api/profiles', {
        headers: { 'x-user-id': userId }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch profiles');
    }

    const profiles = await response.json();
    
    // 同步到本地存储作为兜底
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    return profiles;
  } catch (e) {
    console.error('[ProfileService] getProfiles error:', e);
    return getProfilesSync();
  }
};

export const updateProfile = async (id: string, updates: Partial<UserProfile>): Promise<UserProfile[]> => {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error('Not logged in');

    // 如果有修改生辰，重新计算八字
    let newBazi: string | undefined;
    const currentProfiles = getProfilesSync();
    const currentProfile = currentProfiles.find(p => p.id === id);
    
    if ((updates.birthDate || updates.birthTime) && currentProfile) {
        const d = updates.birthDate || currentProfile.birthDate;
        const t = updates.birthTime || currentProfile.birthTime;
        newBazi = calculateMockBazi(d, t);
    }

    const response = await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
        },
        body: JSON.stringify({
            ...updates,
            ...(newBazi && { bazi: newBazi })
        })
    });

    if (!response.ok) {
        throw new Error('Failed to update profile');
    }

    // 刷新列表
    return await getProfiles();
  } catch (e) {
    console.error('[ProfileService] updateProfile error:', e);
    throw e;
  }
};

export const addProfile = async (newProfile: UserProfile): Promise<UserProfile[]> => {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error('Not logged in');

    // 计算八字
    if (newProfile.birthDate && newProfile.birthTime) {
        newProfile.bazi = calculateMockBazi(newProfile.birthDate, newProfile.birthTime);
    }

    const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
        },
        body: JSON.stringify(newProfile)
    });

    if (!response.ok) {
        throw new Error('Failed to add profile');
    }

    // 刷新列表
    return await getProfiles();
  } catch (e) {
    console.error('[ProfileService] addProfile error:', e);
    throw e;
  }
};
