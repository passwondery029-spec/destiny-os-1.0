
import { UserLevelState, OracleLevelConfig } from '../types';
import { LEVEL_CONFIGS } from '../constants';

const STORAGE_KEY = 'destiny_os_level_state';

const INITIAL_STATE: UserLevelState = {
    currentLevel: 1,
    currentExp: 0,
    todayReportCount: 0,
    lastLoginDate: new Date().toISOString().split('T')[0],
    lastReportDate: ''  // 记录上次生成报告的日期
};

export const getLevelState = (): UserLevelState => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STATE));
        return INITIAL_STATE;
    }
    
    // Check daily reset for reports
    const state = JSON.parse(stored);
    const today = new Date().toISOString().split('T')[0];
    if (state.lastLoginDate !== today) {
        state.todayReportCount = 0;
        state.lastLoginDate = today;
        // Daily Login Bonus
        state.currentExp += 20; 
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    
    return state;
};

export const addExp = (amount: number): UserLevelState => {
    const state = getLevelState();
    state.currentExp += amount;
    
    // Check Level Up
    const nextLevel = LEVEL_CONFIGS.find(l => l.level === state.currentLevel + 1);
    if (nextLevel && state.currentExp >= nextLevel.minExp) {
        state.currentLevel += 1;
        // Could trigger a toast notification here in UI
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
};

export const getCurrentLevelConfig = (): OracleLevelConfig => {
    const state = getLevelState();
    return LEVEL_CONFIGS.find(l => l.level === state.currentLevel) || LEVEL_CONFIGS[0];
};

export const canGenerateFreeReport = (): boolean => {
    const state = getLevelState();
    const config = getCurrentLevelConfig();
    return state.todayReportCount < config.freeReportQuota;
};

export const incrementReportCount = (): void => {
    const state = getLevelState();
    state.todayReportCount += 1;
    // Generating report gives lots of XP
    state.currentExp += 50;
    
    // Check Level Up again logic (simplified duplication)
    const nextLevel = LEVEL_CONFIGS.find(l => l.level === state.currentLevel + 1);
    if (nextLevel && state.currentExp >= nextLevel.minExp) {
        state.currentLevel += 1;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

// 检查今天是否已生成过天命报告
export const canGenerateTodayReport = (): boolean => {
    const state = getLevelState();
    const today = new Date().toISOString().split('T')[0];
    return state.lastReportDate !== today;
};

// 标记今日已生成报告
export const markTodayReportGenerated = (): void => {
    const state = getLevelState();
    const today = new Date().toISOString().split('T')[0];
    state.lastReportDate = today;
    state.todayReportCount += 1;
    state.currentExp += 50;
    
    const nextLevel = LEVEL_CONFIGS.find(l => l.level === state.currentLevel + 1);
    if (nextLevel && state.currentExp >= nextLevel.minExp) {
        state.currentLevel += 1;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const instantUpgrade = (targetLevel: number): UserLevelState => {
    const state = getLevelState();
    const targetConfig = LEVEL_CONFIGS.find(l => l.level === targetLevel);
    if (targetConfig) {
        state.currentLevel = targetLevel;
        state.currentExp = Math.max(state.currentExp, targetConfig.minExp);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    return state;
};
