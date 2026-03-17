
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
  type: 'YEARLY' | 'CAREER' | 'WEALTH' | 'RELATIONSHIP' | 'K_LINE' | 'CUSTOM';
  summary: string;
  content?: string; // Full detailed report content (Markdown)
  htmlContent?: string; // HTML format report from Dify
  date: string;
  tags: string[];
  cost?: number; // 天机币花费
}

// 报告类型配置
export interface ReportTypeConfig {
  type: DestinyReport['type'];
  label: string;
  prompt: string;
  cost: number; // 天机币价格
}

export const REPORT_TYPE_CONFIGS: ReportTypeConfig[] = [
  { type: 'YEARLY', label: '2025流年运势', prompt: '请为我生成一份2025乙巳年流年运势深度报告，包含事业、财运、感情三方面。', cost: 10 },
  { type: 'CAREER', label: '事业前程详批', prompt: '请详细推演我未来的事业发展路径，包含行业选择与升迁机会。', cost: 10 },
  { type: 'WEALTH', label: '财库补全指引', prompt: '请分析我的财运走势，并给出补财库的具体建议。', cost: 10 },
  { type: 'RELATIONSHIP', label: '姻缘天定', prompt: '请为我分析姻缘感情运势，包含正缘时机、感情发展建议。', cost: 10 },
  { type: 'CUSTOM', label: '定制深度报告', prompt: '', cost: 20 },
];

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
  computingPowerPercent: number; // 算力百分比显示给用户 (100%, 150%, 200%...)
  // 内部使用的具体数值，不显示给用户
  _maxChatHistory: number; // Maximum number of chat history messages to send
  _maxResponseLength: number; // Maximum AI response length (in characters)
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
