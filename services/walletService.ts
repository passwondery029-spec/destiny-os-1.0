import { supabase } from './supabaseClient';

/** 充值档位配置 */
export const RECHARGE_OPTIONS = [
    { price: 6, coins: 60, bonus: 0, label: '入门' },
    { price: 68, coins: 700, bonus: 20, label: '进阶' },
    { price: 198, coins: 2200, bonus: 220, label: '推荐' },
    { price: 648, coins: 7500, bonus: 1500, label: '至尊' },
] as const;

export interface Transaction {
    id: string;
    type: 'SIGNUP' | 'RECHARGE' | 'DEDUCT' | 'WOODEN_FISH';
    amount: number;
    desc: string;
    ts: number;
    balanceBefore?: number;
    balanceAfter?: number;
}

/** 获取用户 ID - 尝试多种方式 */
const getUserId = async (): Promise<string | null> => {
    // 方式1: 从 supabase auth 获取
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
        return user.id;
    }
    
    // 方式2: 从 session 获取
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
        return session.user.id;
    }
    
    // 方式3: 从 localStorage 获取 (某些登录方式可能存这里)
    const stored = localStorage.getItem('sb-kvqqrlmapsfmskhhyyvm-auth-token');
    if (stored) {
        try {
            const tokenData = JSON.parse(stored);
            if (tokenData?.access_token) {
                // 尝试解码 JWT 获取 user_id
                const payload = JSON.parse(atob(tokenData.access_token.split('.')[1]));
                if (payload?.sub) {
                    return payload.sub;
                }
            }
        } catch (e) {
            console.warn('[Wallet] Failed to parse stored token:', e);
        }
    }
    
    return null;
};

/** 获取余额（通过后端 API） */
export const getBalance = async (): Promise<number> => {
    try {
        const userId = await getUserId();
        console.log('[Wallet] getBalance - userId:', userId);
        if (!userId) {
            console.warn('[Wallet] getBalance - no userId, returning 0');
            return 0;
        }

        const response = await fetch('/api/wallet/balance', {
            headers: { 'x-user-id': userId }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch balance');
        }
        
        const data = await response.json();
        console.log('[Wallet] getBalance - response:', data);
        return data.balance || 0;
    } catch (e) {
        console.error('[Wallet] getBalance error:', e);
        return 0;
    }
};

/** 充值（通过后端 API） */
export const addBalance = async (
    coins: number,
    desc: string,
    type: Transaction['type'] = 'RECHARGE'
): Promise<number> => {
    try {
        const userId = await getUserId();
        if (!userId) throw new Error('Not logged in');

        const response = await fetch('/api/wallet/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId
            },
            body: JSON.stringify({ amount: coins, desc, type })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to add balance');
        }

        const data = await response.json();
        return data.balance;
    } catch (e) {
        console.error('[Wallet] addBalance error:', e);
        throw e;
    }
};

/** 扣费（通过后端 API） */
export const deductBalance = async (amount: number, desc: string): Promise<{ success: boolean; newBalance: number }> => {
    try {
        const userId = await getUserId();
        if (!userId) throw new Error('Not logged in');

        const response = await fetch('/api/wallet/deduct', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId
            },
            body: JSON.stringify({ amount, desc })
        });

        if (!response.ok) {
            const err = await response.json();
            if (err.error === '余额不足') {
                const currentBalance = await getBalance();
                return { success: false, newBalance: currentBalance };
            }
            throw new Error(err.error || 'Failed to deduct balance');
        }

        const data = await response.json();
        return { success: true, balance: data.balance };
    } catch (e) {
        console.error('[Wallet] deductBalance error:', e);
        const currentBalance = await getBalance();
        return { success: false, newBalance: currentBalance };
    }
};

/** 获取交易记录（通过后端 API） */
export const getTransactions = async (): Promise<Transaction[]> => {
    try {
        const userId = await getUserId();
        if (!userId) return [];

        const response = await fetch('/api/wallet/transactions', {
            headers: { 'x-user-id': userId }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch transactions');
        }

        return await response.json();
    } catch (e) {
        console.error('[Wallet] getTransactions error:', e);
        return [];
    }
};
