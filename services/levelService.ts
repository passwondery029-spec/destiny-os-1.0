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

// 从数据库获取等级状态
const getLevelFromDB = async (userId: string): Promise<UserLevelState | null> => {
    const { data, error } = await supabase
        .from('user_levels')
        .select('*')
        .eq('user_id', userId)
        .single();
    
    if (error || !data) {
        return null;
    }
    
    return {
        level: data.level,
        exp: data.exp,
        totalExp: data.total_exp,
        lastLoginDate: data.last_login_date || '',
        lastDailyReportDate: data.last_daily_report_date || ''
    };
};

// 从 localStorage 获取等级状态（兜底）
const getLevelFromLocal = (): UserLevelState => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        // 返回新对象，避免修改 INITIAL_STATE 常量
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

// 同步等级状态到数据库
const syncLevelToDB = async (userId: string, state: UserLevelState): Promise<void> => {
    const { error } = await supabase
        .from('user_levels')
        .upsert({
            user_id: userId,
            level: state.level,
            exp: state.exp,
            total_exp: state.totalExp,
            last_login_date: state.lastLoginDate,
            last_daily_report_date: state.lastDailyReportDate,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    
    if (error) {
        console.error('[levelService] syncLevelToDB error:', error.message);
    }
    
    // 同时更新 localStorage 作为本地缓存
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

// 获取用户等级状态（异步，优先数据库）
export const getLevelState = async (): Promise<UserLevelState> => {
    const userId = await getCurrentUserId();
    const today = new Date().toISOString().split('T')[0];
    
    if (userId) {
        const dbState = await getLevelFromDB(userId);
        if (dbState) {
            // 检查是否是新的一天，给予登录奖励
            if (dbState.lastLoginDate !== today) {
                const newState = {
                    ...dbState,
                    lastLoginDate: today,
                    exp: dbState.exp + 20,
                    totalExp: dbState.totalExp + 20
                };
                // 检查升级
                const nextLevel = LEVEL_CONFIGS.find(l => l.level === newState.level + 1);
                if (nextLevel && newState.exp >= nextLevel.minExp) {
                    newState.level += 1;
                }
                await syncLevelToDB(userId, newState);
                return newState;
            }
            return dbState;
        }
    }
    
    // 未登录或数据库无数据，使用 localStorage
    const localState = getLevelFromLocal();
    if (localState.lastLoginDate !== today) {
        localState.lastLoginDate = today;
        localState.exp += 20;
        localState.totalExp += 20;
        const nextLevel = LEVEL_CONFIGS.find(l => l.level === localState.level + 1);
        if (nextLevel && localState.exp >= nextLevel.minExp) {
            localState.level += 1;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localState));
        
        // 如果已登录，同步到数据库
        if (userId) {
            await syncLevelToDB(userId, localState);
        }
    }
    
    return localState;
};

// 添加灵力值
export const addExp = async (amount: number): Promise<UserLevelState> => {
    const userId = await getCurrentUserId();
    const state = await getLevelState();
    
    state.exp += amount;
    state.totalExp += amount;
    
    // 检查升级
    const nextLevel = LEVEL_CONFIGS.find(l => l.level === state.level + 1);
    if (nextLevel && state.exp >= nextLevel.minExp) {
        state.level += 1;
    }
    
    if (userId) {
        await syncLevelToDB(userId, state);
    } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    
    return state;
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
    const state = await getLevelState();
    const today = new Date().toISOString().split('T')[0];
    
    state.lastDailyReportDate = today;
    state.exp += 50;
    state.totalExp += 50;
    
    // 检查升级
    const nextLevel = LEVEL_CONFIGS.find(l => l.level === state.level + 1);
    if (nextLevel && state.exp >= nextLevel.minExp) {
        state.level += 1;
    }
    
    if (userId) {
        await syncLevelToDB(userId, state);
    } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    
    return state;
};

// 直接升级到指定等级（付费解锁）
export const instantUpgrade = async (targetLevel: number): Promise<UserLevelState> => {
    const userId = await getCurrentUserId();
    const state = await getLevelState();
    const targetConfig = LEVEL_CONFIGS.find(l => l.level === targetLevel);
    
    if (targetConfig) {
        state.level = targetLevel;
        state.exp = Math.max(state.exp, targetConfig.minExp);
        
        if (userId) {
            await syncLevelToDB(userId, state);
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
    }
    
    return state;
};

// 初始化用户等级（注册后调用）
export const initUserLevel = async (userId: string): Promise<void> => {
    const today = new Date().toISOString().split('T')[0];
    const initialState: UserLevelState = {
        level: 1,
        exp: 20, // 首次登录奖励
        totalExp: 20,
        lastLoginDate: today,
        lastDailyReportDate: ''
    };
    
    await syncLevelToDB(userId, initialState);
};
