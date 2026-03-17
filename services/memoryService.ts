import { Memory } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabaseClient';

// Mock initial memories for the "Cold Start" experience
const INITIAL_MEMORIES: Memory[] = [
  {
    id: '1',
    profileId: 'self',
    content: '用户生于1995年，乙亥猪年（木猪）。',
    category: 'FACT',
    timestamp: Date.now() - 10000000,
    confidence: 1.0,
  },
  {
    id: '2',
    profileId: 'self',
    content: '最近表达了对职业发展停滞的焦虑感。',
    category: 'EMOTION',
    timestamp: Date.now() - 5000000,
    confidence: 0.8,
  },
  {
    id: '3',
    profileId: 'self',
    content: '比起剧烈运动，更倾向于冥想和静态活动。',
    category: 'FACT',
    timestamp: Date.now() - 200000,
    confidence: 0.9,
  }
];

// Fallback to local storage if Supabase fails or is not configured
const STORAGE_KEY = 'destiny_os_memories';

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

const getLocalMemories = (): Memory[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MEMORIES));
    return INITIAL_MEMORIES;
  }
  return JSON.parse(stored);
};

export const getMemories = async (): Promise<Memory[]> => {
  try {
    const userId = await getUserId();
    if (!userId) return getLocalMemories();

    const response = await fetch('/api/memories', {
        headers: { 'x-user-id': userId }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch memories');
    }

    const data = await response.json();
    
    // 转换为前端需要的格式
    if (data && data.length > 0) {
      return data.map((m: any) => ({
        id: m.id,
        profileId: m.profile_id || m.profileId,
        content: m.content,
        category: m.category,
        timestamp: new Date(m.created_at || m.timestamp).getTime(),
        confidence: m.confidence || 0.9
      }));
    }
    
    return getLocalMemories();
  } catch (error) {
    console.error('[MemoryService] getMemories error:', error);
    return getLocalMemories();
  }
};

export const addMemory = async (content: string, category: Memory['category'], profileId: string = 'self'): Promise<Memory> => {
  const newMemory: Memory = {
    id: uuidv4(),
    profileId,
    content,
    category,
    timestamp: Date.now(),
    confidence: 0.9,
  };

  try {
    const userId = await getUserId();
    if (!userId) throw new Error('Not logged in');

    const response = await fetch('/api/memories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
        },
        body: JSON.stringify({
            content,
            category,
            profileId
        })
    });

    if (!response.ok) {
        throw new Error('Failed to add memory');
    }

    const data = await response.json();
    return {
        id: data.id,
        profileId: data.profile_id || profileId,
        content: data.content,
        category: data.category,
        timestamp: new Date(data.createdAt).getTime(),
        confidence: 0.9
    };
  } catch (error) {
    console.error('[MemoryService] addMemory error:', error);
    // Fallback to local storage
    const memories = getLocalMemories();
    const updated = [newMemory, ...memories];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newMemory;
  }
};

export const deleteMemory = async (id: string): Promise<void> => {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error('Not logged in');

    const response = await fetch(`/api/memories/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId }
    });

    if (!response.ok) {
        throw new Error('Failed to delete memory');
    }
  } catch (error) {
    console.error('[MemoryService] deleteMemory error:', error);
    // Fallback to local storage
    const memories = getLocalMemories();
    const updated = memories.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
};

export const getContextString = async (profileId: string = 'self'): Promise<string> => {
  const memories = await getMemories();
  const profileMemories = memories.filter(m => (m.profileId || 'self') === profileId);
  if (profileMemories.length === 0) return "暂无历史档案。";
  
  return profileMemories.map(m => `[${m.category}] ${m.content}`).join('\n');
};
