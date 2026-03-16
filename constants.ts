import { FiveElementsData, EnergyPoint, OracleLevelConfig } from './types';

export const THEME_COLORS = {
  GOLD: '#B8860B',
  CINNABAR: '#8B0000',
  PAPER: '#F7F7F5',
  INK: '#1F1F1F',
  TEXT_MUTED: '#666666',
  TEXT_LIGHT: '#333333',
};

export const INITIAL_ELEMENTS_DATA: FiveElementsData[] = [
  { subject: '金 (专注)', A: 80, fullMark: 100 },
  { subject: '木 (成长)', A: 45, fullMark: 100 },
  { subject: '水 (智慧)', A: 90, fullMark: 100 },
  { subject: '火 (活力)', A: 60, fullMark: 100 },
  { subject: '土 (稳重)', A: 75, fullMark: 100 },
];

export const DAILY_ENERGY_CURVE: EnergyPoint[] = [
  { time: '卯时', energy: 40 },
  { time: '辰时', energy: 85 },
  { time: '午时', energy: 60 },
  { time: '申时', energy: 50 },
  { time: '酉时', energy: 75 },
  { time: '亥时', energy: 90 },
  { time: '子时', energy: 30 },
];

// 10-Tier Level System with Memory Limits and Computing Power
export const LEVEL_CONFIGS: OracleLevelConfig[] = [
  { level: 1, title: '初窥门径', minExp: 0, maxMemoryContext: 5, freeReportQuota: 1, unlockPrice: 0, maxMemoryCount: 50, computingPowerPercent: 100, _maxChatHistory: 3, _maxResponseLength: 80 },
  { level: 2, title: '炼气化神', minExp: 100, maxMemoryContext: 10, freeReportQuota: 2, unlockPrice: 6, maxMemoryCount: 100, computingPowerPercent: 150, _maxChatHistory: 5, _maxResponseLength: 150 },
  { level: 3, title: '筑基修士', minExp: 300, maxMemoryContext: 20, freeReportQuota: 3, unlockPrice: 18, maxMemoryCount: 200, computingPowerPercent: 200, _maxChatHistory: 8, _maxResponseLength: 250 },
  { level: 4, title: '金丹大成', minExp: 800, maxMemoryContext: 30, freeReportQuota: 5, unlockPrice: 68, maxMemoryCount: 300, computingPowerPercent: 280, _maxChatHistory: 12, _maxResponseLength: 400 },
  { level: 5, title: '元婴老祖', minExp: 2000, maxMemoryContext: 50, freeReportQuota: 8, unlockPrice: 128, maxMemoryCount: 500, computingPowerPercent: 380, _maxChatHistory: 18, _maxResponseLength: 600 },
  { level: 6, title: '化神尊者', minExp: 5000, maxMemoryContext: 80, freeReportQuota: 10, unlockPrice: 198, maxMemoryCount: 800, computingPowerPercent: 500, _maxChatHistory: 25, _maxResponseLength: 900 },
  { level: 7, title: '返虚地仙', minExp: 10000, maxMemoryContext: 120, freeReportQuota: 15, unlockPrice: 328, maxMemoryCount: 1200, computingPowerPercent: 650, _maxChatHistory: 35, _maxResponseLength: 1200 },
  { level: 8, title: '大乘天仙', minExp: 25000, maxMemoryContext: 200, freeReportQuota: 20, unlockPrice: 648, maxMemoryCount: 2000, computingPowerPercent: 850, _maxChatHistory: 50, _maxResponseLength: 1800 },
  { level: 9, title: '九天玄仙', minExp: 50000, maxMemoryContext: 300, freeReportQuota: 30, unlockPrice: 1288, maxMemoryCount: 3000, computingPowerPercent: 1000, _maxChatHistory: 80, _maxResponseLength: 2500 },
  { level: 10, title: '太上道祖', minExp: 100000, maxMemoryContext: 500, freeReportQuota: 50, unlockPrice: 0, maxMemoryCount: 9999, computingPowerPercent: 1500, _maxChatHistory: 150, _maxResponseLength: 5000 },
];

export const SYSTEM_INSTRUCTION = `你是"命运魔术师"，一位神秘的命理咨询师兼心理疗愈师。

**人设特点**：
1. 神秘、温和、知性，善于倾听。
2. 精于八字、紫微、占星等命理术数，但更擅长心理分析。
3. 绝对不使用恐吓式话术（如"大凶"、"破财"），而是用能量周期、成长挑战等积极表述。
4. 经常提及"记忆碎片"、"灵魂档案"等概念，暗示你能看到用户的过去。

**回复风格**：
- 使用温和、鼓励的语调
- 适当使用emoji增加亲和力
- 结合命理和心理学分析
- 避免过于绝对的断言

**记忆使用**：
- 当用户的问题涉及过去的经历时，主动引用已有的"记忆碎片"
- 如果发现新的重要信息，暗示会将其"存入档案"

**禁忌**：
- 绝对禁止说"大凶"、"破财"、"克夫"等封建迷信词汇
- 不给用户造成焦虑或恐惧
- 不做医疗、法律等专业领域的建议`;
