
export interface Memory {
  id: string;
  profileId?: string; // Linked to UserProfile.id
  content: string;
  category: 'FACT' | 'EMOTION' | 'EVENT' | 'PREDICTION';
  timestamp: number;
  confidence: number; // 0-1
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  relatedMemories?: string[]; // IDs of memories used for this answer
}

export interface FiveElementsData {
  subject: string;
  A: number; // User Value
  fullMark: number;
}

export interface EnergyPoint {
  time: string;
  energy: number;
}

export interface UserProfile {
  id: string;
  name: string;
  gender: 'MALE' | 'FEMALE'; // New Field
  phone?: string; // New Field
  email?: string; // New Field
  relation: 'SELF' | 'FAMILY' | 'CLIENT' | 'FRIEND';
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  bazi?: string; // e.g. "乙亥 丙子..."
  avatarColor: string;
}

export interface DestinyReport {
  id: string;
  profileId?: string; // Linked to UserProfile.id
  title: string;
  type: 'YEARLY' | 'CAREER' | 'WEALTH' | 'RELATIONSHIP' | 'K_LINE';
  summary: string;
  content?: string; // Full detailed report content
  date: string;
  tags: string[];
}

export enum AppRoute {
  DASHBOARD = 'dashboard',
  ORACLE = 'oracle', // Main Chat (Magician)
  DIVINATION = 'divination', // New: Specific Event Prediction (Diviner)
  DATABASE = 'database',
  MINE = 'mine',
  REPORT_DETAIL = 'report_detail'
}

// --- NEW LEVELING SYSTEM ---

export interface OracleLevelConfig {
  level: number;
  title: string; // e.g. "炼气士"
  minExp: number;
  maxMemoryContext: number; // How many memories AI can recall
  freeReportQuota: number; // Daily free reports
  unlockPrice?: number; // Price to instantly unlock (CNY)
  maxMemoryCount: number; // Maximum number of memory fragments allowed
}

export interface UserLevelState {
  currentLevel: number;
  currentExp: number;
  todayReportCount: number;
  lastLoginDate: string;
}

export interface NotificationSettings {
  enabled: boolean;
  morningTime: string; // "08:00"
  types: ('LUCK' | 'TABOO' | 'WEATHER')[];
}
