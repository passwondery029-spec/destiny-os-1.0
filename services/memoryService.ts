
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
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    
    // Convert snake_case from DB to camelCase for frontend
    if (data && data.length > 0) {
      return data.map(m => ({
        id: m.id,
        profileId: m.profile_id,
        content: m.content,
        category: m.category,
        timestamp: Number(m.timestamp),
        confidence: m.confidence
      }));
    }
    
    return getLocalMemories(); // Fallback if DB is empty
  } catch (error) {
    console.error('Error fetching memories from Supabase:', error);
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
    // Insert into Supabase
    const { error } = await supabase
      .from('memories')
      .insert([
        {
          id: newMemory.id,
          profile_id: newMemory.profileId,
          content: newMemory.content,
          category: newMemory.category,
          timestamp: newMemory.timestamp,
          confidence: newMemory.confidence
        }
      ]);

    if (error) throw error;
  } catch (error) {
    console.error('Error adding memory to Supabase:', error);
    // Fallback to local storage
    const memories = getLocalMemories();
    const updated = [newMemory, ...memories];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  return newMemory;
};

export const deleteMemory = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting memory from Supabase:', error);
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
