import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { getBalance, addBalance as walletAddBalance, deductBalance as walletDeductBalance, getTransactions, Transaction } from '../services/walletService';
import { getProfiles, updateProfile as profileUpdateProfile, addProfile as profileAddProfile, getProfilesSync } from '../services/profileService';
import { getLevelState, addExp as levelAddExp, getCurrentLevelConfig, UserLevelState } from '../services/levelService';
import { getMemories, deleteMemory as memoryDeleteMemory, addMemory as memoryAddMemory } from '../services/memoryService';
import { getReports, deleteReport as reportDeleteReport, addReport as reportAddReport } from '../services/reportService';
import { UserProfile, Memory, DestinyReport, OracleLevelConfig } from '../types';
import { LEVEL_CONFIGS } from '../constants';

// ============== 类型定义 ==============

interface UserDataContextValue {
    // 认证状态
    session: Session | null;
    isInitializing: boolean;
    
    // 天机币
    balance: number;
    isLoadingBalance: boolean;
    transactions: Transaction[];
    addBalance: (coins: number, desc: string, type?: Transaction['type']) => Promise<number>;
    deductBalance: (amount: number, desc: string) => Promise<{ success: boolean; newBalance: number }>;
    refreshBalance: () => Promise<void>;
    
    // 用户档案
    profiles: UserProfile[];
    isLoadingProfiles: boolean;
    activeProfileId: string;
    setActiveProfileId: (id: string) => void;
    activeProfile: UserProfile | null;
    updateProfile: (id: string, updates: Partial<UserProfile>) => Promise<UserProfile[]>;
    addProfile: (profile: UserProfile) => Promise<UserProfile[]>;
    refreshProfiles: () => Promise<void>;
    
    // 等级与灵力
    levelState: UserLevelState;
    levelConfig: OracleLevelConfig;
    isLoadingLevel: boolean;
    addExp: (amount: number) => Promise<UserLevelState>;
    refreshLevel: () => Promise<void>;
    
    // 记忆碎片
    memories: Memory[];
    isLoadingMemories: boolean;
    addMemory: (content: string, category: Memory['category'], profileId?: string) => Promise<Memory>;
    deleteMemory: (id: string) => Promise<void>;
    refreshMemories: () => Promise<void>;
    
    // 报告
    reports: DestinyReport[];
    isLoadingReports: boolean;
    addReport: (report: DestinyReport) => Promise<DestinyReport>;
    deleteReport: (id: string) => Promise<void>;
    refreshReports: () => Promise<void>;
    
    // 全局刷新
    refreshAll: () => Promise<void>;
}

const UserDataContext = createContext<UserDataContextValue | undefined>(undefined);

// ============== Provider 组件 ==============

interface UserDataProviderProps {
    children: ReactNode;
}

export const UserDataProvider: React.FC<UserDataProviderProps> = ({ children }) => {
    // ============== 认证状态 ==============
    const [session, setSession] = useState<Session | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    
    // ============== 天机币 ==============
    const [balance, setBalance] = useState(0);
    const [isLoadingBalance, setIsLoadingBalance] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    
    // ============== 用户档案 ==============
    const [profiles, setProfiles] = useState<UserProfile[]>(() => getProfilesSync());
    const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
    const [activeProfileId, setActiveProfileId] = useState<string>('self');
    
    // ============== 等级与灵力 ==============
    const [levelState, setLevelState] = useState<UserLevelState>({
        level: 1,
        exp: 0,
        totalExp: 0,
        lastLoginDate: '',
        lastDailyReportDate: ''
    });
    const [levelConfig, setLevelConfig] = useState<OracleLevelConfig>(LEVEL_CONFIGS[0]);
    const [isLoadingLevel, setIsLoadingLevel] = useState(true);
    
    // ============== 记忆碎片 ==============
    const [memories, setMemories] = useState<Memory[]>([]);
    const [isLoadingMemories, setIsLoadingMemories] = useState(true);
    
    // ============== 报告 ==============
    const [reports, setReports] = useState<DestinyReport[]>([]);
    const [isLoadingReports, setIsLoadingReports] = useState(true);
    
    // ============== 计算属性 ==============
    const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles.find(p => p.relation === 'SELF') || profiles[0] || null;
    
    // ============== 数据加载函数 ==============
    
    const refreshBalance = useCallback(async () => {
        setIsLoadingBalance(true);
        try {
            const [b, txs] = await Promise.all([
                getBalance(),
                getTransactions()
            ]);
            setBalance(b);
            setTransactions(txs);
        } catch (e) {
            console.error('[UserDataContext] refreshBalance error:', e);
        } finally {
            setIsLoadingBalance(false);
        }
    }, []);
    
    const refreshProfiles = useCallback(async () => {
        setIsLoadingProfiles(true);
        try {
            const p = await getProfiles();
            setProfiles(p);
        } catch (e) {
            console.error('[UserDataContext] refreshProfiles error:', e);
        } finally {
            setIsLoadingProfiles(false);
        }
    }, []);
    
    const refreshLevel = useCallback(async () => {
        setIsLoadingLevel(true);
        try {
            const [state, config] = await Promise.all([
                getLevelState(),
                getCurrentLevelConfig()
            ]);
            setLevelState(state);
            setLevelConfig(config);
        } catch (e) {
            console.error('[UserDataContext] refreshLevel error:', e);
        } finally {
            setIsLoadingLevel(false);
        }
    }, []);
    
    const refreshMemories = useCallback(async () => {
        setIsLoadingMemories(true);
        try {
            const m = await getMemories();
            setMemories(m);
        } catch (e) {
            console.error('[UserDataContext] refreshMemories error:', e);
        } finally {
            setIsLoadingMemories(false);
        }
    }, []);
    
    const refreshReports = useCallback(async () => {
        setIsLoadingReports(true);
        try {
            const r = await getReports();
            setReports(r);
        } catch (e) {
            console.error('[UserDataContext] refreshReports error:', e);
        } finally {
            setIsLoadingReports(false);
        }
    }, []);
    
    const refreshAll = useCallback(async () => {
        await Promise.all([
            refreshBalance(),
            refreshProfiles(),
            refreshLevel(),
            refreshMemories(),
            refreshReports()
        ]);
    }, [refreshBalance, refreshProfiles, refreshLevel, refreshMemories, refreshReports]);
    
    // ============== 数据修改函数 ==============
    
    const handleAddBalance = useCallback(async (coins: number, desc: string, type?: Transaction['type']) => {
        const newBalance = await walletAddBalance(coins, desc, type);
        setBalance(newBalance);
        // 刷新交易记录
        const txs = await getTransactions();
        setTransactions(txs);
        return newBalance;
    }, []);
    
    const handleDeductBalance = useCallback(async (amount: number, desc: string) => {
        const result = await walletDeductBalance(amount, desc);
        if (result.success) {
            setBalance(result.newBalance);
            // 刷新交易记录
            const txs = await getTransactions();
            setTransactions(txs);
        }
        return result;
    }, []);
    
    const handleUpdateProfile = useCallback(async (id: string, updates: Partial<UserProfile>) => {
        const updated = await profileUpdateProfile(id, updates);
        setProfiles(updated);
        return updated;
    }, []);
    
    const handleAddProfile = useCallback(async (profile: UserProfile) => {
        const updated = await profileAddProfile(profile);
        setProfiles(updated);
        return updated;
    }, []);
    
    const handleAddExp = useCallback(async (amount: number) => {
        const state = await levelAddExp(amount);
        setLevelState(state);
        const config = LEVEL_CONFIGS.find(l => l.level === state.level) || LEVEL_CONFIGS[0];
        setLevelConfig(config);
        return state;
    }, []);
    
    const handleAddMemory = useCallback(async (content: string, category: Memory['category'], profileId?: string) => {
        const memory = await memoryAddMemory(content, category, profileId);
        // 刷新记忆列表
        const m = await getMemories();
        setMemories(m);
        return memory;
    }, []);
    
    const handleDeleteMemory = useCallback(async (id: string) => {
        await memoryDeleteMemory(id);
        setMemories(prev => prev.filter(m => m.id !== id));
    }, []);
    
    const handleAddReport = useCallback(async (report: DestinyReport) => {
        const r = await reportAddReport(report);
        // 刷新报告列表
        const allReports = await getReports();
        setReports(allReports);
        return r;
    }, []);
    
    const handleDeleteReport = useCallback(async (id: string) => {
        await reportDeleteReport(id);
        setReports(prev => prev.filter(r => r.id !== id));
    }, []);
    
    // ============== 初始化：认证状态 ==============
    useEffect(() => {
        let mounted = true;
        
        const initSession = async () => {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                if (mounted) {
                    setSession(initialSession);
                }
            } catch (e) {
                console.error('[UserDataContext] initSession error:', e);
            } finally {
                if (mounted) {
                    setIsInitializing(false);
                }
            }
        };
        
        initSession();
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (mounted) {
                setSession(newSession);
            }
        });
        
        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);
    
    // ============== 登录后加载数据 ==============
    useEffect(() => {
        if (session && !isInitializing) {
            // 用户已登录，加载所有数据
            refreshAll();
        }
    }, [session, isInitializing, refreshAll]);
    
    // ============== Context Value ==============
    const value: UserDataContextValue = {
        // 认证
        session,
        isInitializing,
        
        // 天机币
        balance,
        isLoadingBalance,
        transactions,
        addBalance: handleAddBalance,
        deductBalance: handleDeductBalance,
        refreshBalance,
        
        // 档案
        profiles,
        isLoadingProfiles,
        activeProfileId,
        setActiveProfileId,
        activeProfile,
        updateProfile: handleUpdateProfile,
        addProfile: handleAddProfile,
        refreshProfiles,
        
        // 等级
        levelState,
        levelConfig,
        isLoadingLevel,
        addExp: handleAddExp,
        refreshLevel,
        
        // 记忆
        memories,
        isLoadingMemories,
        addMemory: handleAddMemory,
        deleteMemory: handleDeleteMemory,
        refreshMemories,
        
        // 报告
        reports,
        isLoadingReports,
        addReport: handleAddReport,
        deleteReport: handleDeleteReport,
        refreshReports,
        
        // 全局
        refreshAll
    };
    
    return (
        <UserDataContext.Provider value={value}>
            {children}
        </UserDataContext.Provider>
    );
};

// ============== Hook ==============

export const useUserData = (): UserDataContextValue => {
    const context = useContext(UserDataContext);
    if (!context) {
        throw new Error('useUserData must be used within a UserDataProvider');
    }
    return context;
};

// ============== 可选 Hook（用于可能不在 Provider 内的组件）=============

export const useUserDataOptional = (): UserDataContextValue | undefined => {
    return useContext(UserDataContext);
};
