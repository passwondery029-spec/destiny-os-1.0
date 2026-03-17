import { UserLevelState as UserLevelStateType, OracleLevelConfig } from '../types';
import { LEVEL_CONFIGS } from '../constants';
import { supabase } from './supabaseClient';

// 导出类型供组件使用
export type UserLevelState = UserLevelStateType;

const STORAGE_KEY = 'destiny_os_level_state';

// 初始状态
const INITIAL_STATE: UserLevelState = {
    level: 1,
    exp: 0,
    totalExp: 0,
    lastLoginDate: '',
    lastDailyReportDate: ''
};

// 获取当前用户 ID
const getCurrentUserId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
};

// 调用后端 API 获取等级
const fetchLevelFromAPI = async (userId: string): Promise<UserLevelState | null> => {
    try {
        const response = await fetch(`/api/level`, {
            headers: {
                'x-user-id': userId
            }
        });
        
        if (!response.ok) {
            const err = await response.json();
            console.error('[levelService] API error:', err);
            return null;
        }
        
        const data = await response.json();
        console.log('[levelService] getLevelState from API:', data);
        return data;
    } catch (e: any) {
        console.error('[levelService] fetchLevelFromAPI error:', e);
        return null;
    }
};

// 从 localStorage 获取等级状态（兜底）
const getLevelFromLocal = (): UserLevelState => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        return { ...INITIAL_STATE };
    }
    const parsed = JSON.parse(stored);
    return {
        level: parsed.currentLevel || parsed.level || 1,
        exp: parsed.currentExp || parsed.exp || 0,
        totalExp: parsed.totalExp || 0,
        lastLoginDate: parsed.lastLoginDate || '',
        lastDailyReportDate: parsed.lastReportDate || parsed.lastDailyReportDate || ''
    };
};

// 获取用户等级状态
export const getLevelState = async (): Promise<UserLevelState> => {
    const userId = await getCurrentUserId();
    
    if (userId) {
        const apiState = await fetchLevelFromAPI(userId);
        if (apiState) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(apiState));
            return apiState;
        }
    }
    
    // 兜底用 localStorage
    const localState = getLevelFromLocal();
    return localState;
};

// 添加灵力值
export const addExp = async (amount: number): Promise<UserLevelState> => {
    const userId = await getCurrentUserId();
    
    if (!userId) {
        throw new Error('用户未登录');
    }
    
    try {
        const response = await fetch(`/api/level/add-exp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId
            },
            body: JSON.stringify({ amount })
        });
        
        if (!response.ok) {
            throw new Error('Failed to add exp');
        }
        
        const result = await response.json();
        const state: UserLevelState = {
            level: 1, // 暂时简化
            exp: result.exp,
            totalExp: result.totalExp,
            lastLoginDate: '',
            lastDailyReportDate: ''
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return state;
    } catch (e: any) {
        console.error('[levelService] addExp error:', e);
        throw e;
    }
};

// 获取当前等级配置
export const getCurrentLevelConfig = async (): Promise<OracleLevelConfig> => {
    const state = await getLevelState();
    return LEVEL_CONFIGS.find(l => l.level === state.level) || LEVEL_CONFIGS[0];
};

// 同步版本（用于不需要等待结果的场景）
export const getCurrentLevelConfigSync = (): OracleLevelConfig => {
    const localState = getLevelFromLocal();
    return LEVEL_CONFIGS.find(l => l.level === localState.level) || LEVEL_CONFIGS[0];
};

// 检查今天是否已生成过天命报告
export const canGenerateTodayReport = async (): Promise<boolean> => {
    const state = await getLevelState();
    const today = new Date().toISOString().split('T')[0];
    return state.lastDailyReportDate !== today;
};

// 标记今日已生成报告（并给予灵力奖励）
export const markTodayReportGenerated = async (): Promise<UserLevelState> => {
    const userId = await getCurrentUserId();
    
    if (!userId) {
        throw new Error('用户未登录');
    }
    
    try {
        const response = await fetch(`/api/level/mark-report`, {
            method: 'POST',
            headers: {
                'x-user-id': userId
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to mark report');
        }
        
        const result = await response.json();
        const state: UserLevelState = {
            level: 1,
            exp: result.exp,
            totalExp: result.totalExp,
            lastLoginDate: '',
            lastDailyReportDate: ''
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return state;
    } catch (e: any) {
        console.error('[levelService] markTodayReportGenerated error:', e);
        throw e;
    }
};

// 直接升级到指定等级（付费解锁）
export const instantUpgrade = async (targetLevel: number): Promise<UserLevelState> => {
    // 暂时简化实现
    const state = await getLevelState();
    state.level = targetLevel;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
};

// 初始化用户等级（注册后调用）
export const initUserLevel = async (userId: string): Promise<void> => {
    // 通过 API 初始化
    await fetchLevelFromAPI(userId);
};
