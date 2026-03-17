import { supabase } from './supabaseClient';

/** 充值档位配置 */
export const RECHARGE_OPTIONS = [
    { price: 6, coins: 60, bonus: 0, label: '入门' },
    { price: 68, coins: 700, bonus: 20, label: '进阶' },
    { price: 198, coins: 2200, bonus: 220, label: '推荐' },
    { price: 648, coins: 7500, bonus: 1500, label: '至尊' },
] as const;

const LOCAL_BALANCE_KEY = 'destiny_os_balance';
const LOCAL_TRANSACTIONS_KEY = 'destiny_os_transactions';

export interface Transaction {
    id: string;
    type: 'SIGNUP' | 'RECHARGE' | 'DEDUCT' | 'WOODEN_FISH';
    amount: number;
    desc: string;
    ts: number;
    balanceBefore?: number;
    balanceAfter?: number;
}

/** 获取本地余额（兜底） */
const getLocalBalance = (): number => {
    return parseFloat(localStorage.getItem(LOCAL_BALANCE_KEY) || '0');
};

const setLocalBalance = (v: number) => {
    localStorage.setItem(LOCAL_BALANCE_KEY, String(Math.max(0, v)));
};

const addLocalTransaction = (tx: Transaction) => {
    const list: Transaction[] = JSON.parse(localStorage.getItem(LOCAL_TRANSACTIONS_KEY) || '[]');
    list.unshift(tx);
    localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(list.slice(0, 50)));
};

/** 写入交易记录到 Supabase */
const recordTransactionToDB = async (
    type: Transaction['type'],
    amount: number,
    balanceBefore: number,
    balanceAfter: number,
    description: string
): Promise<void> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('balance_transactions')
            .insert({
                user_id: user.id,
                type,
                amount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                description
            });

        if (error) {
            console.error('[Wallet] Failed to record transaction to DB:', error.message);
        }
    } catch (e) {
        console.error('[Wallet] Exception recording transaction:', e);
    }
};

/** 读取余额：优先从 Supabase user_metadata 读取 */
export const getBalance = async (): Promise<number> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.balance !== undefined) {
            const remoteBalance = Number(user.user_metadata.balance);
            setLocalBalance(remoteBalance); // 同步本地
            return remoteBalance;
        }
    } catch (e) {
        // ignore
    }
    return getLocalBalance();
};

/** 充值：增加余额并持久化 */
export const addBalance = async (
    coins: number,
    desc: string,
    type: Transaction['type'] = 'RECHARGE'
): Promise<number> => {
    const current = await getBalance();
    const newBalance = current + coins;

    // 写入 Supabase user_metadata
    try {
        await supabase.auth.updateUser({
            data: { balance: newBalance }
        });
    } catch (e) {
        console.error('[Wallet] Failed to update balance in user_metadata:', e);
    }

    setLocalBalance(newBalance);

    // 记录到本地
    addLocalTransaction({
        id: Date.now().toString(),
        type,
        amount: coins,
        desc,
        ts: Date.now(),
        balanceBefore: current,
        balanceAfter: newBalance
    });

    // 同步写入数据库
    await recordTransactionToDB(type, coins, current, newBalance, desc);

    return newBalance;
};

/** 扣费：扣除天机币（生成报告消耗） */
export const deductBalance = async (amount: number, desc: string): Promise<{ success: boolean; newBalance: number }> => {
    const current = await getBalance();
    if (current < amount) {
        return { success: false, newBalance: current };
    }

    const newBalance = current - amount;

    try {
        await supabase.auth.updateUser({
            data: { balance: newBalance }
        });
    } catch (e) {
        console.error('[Wallet] Failed to update balance in user_metadata:', e);
    }

    setLocalBalance(newBalance);

    // 记录到本地
    addLocalTransaction({
        id: Date.now().toString(),
        type: 'DEDUCT',
        amount: -amount, // 扣费显示为负数
        desc,
        ts: Date.now(),
        balanceBefore: current,
        balanceAfter: newBalance
    });

    // 同步写入数据库
    await recordTransactionToDB('DEDUCT', -amount, current, newBalance, desc);

    return { success: true, newBalance };
};

/** 读取交易记录：优先从 Supabase 读取，失败则 localStorage 兜底 */
export const getTransactions = async (): Promise<Transaction[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return getLocalTransactions();
        }

        const { data, error } = await supabase
            .from('balance_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        if (data && data.length > 0) {
            return data.map(tx => ({
                id: tx.id,
                type: tx.type as Transaction['type'],
                amount: tx.amount,
                desc: tx.description,
                ts: new Date(tx.created_at).getTime(),
                balanceBefore: tx.balance_before,
                balanceAfter: tx.balance_after
            }));
        }
    } catch (e) {
        console.error('[Wallet] Failed to fetch transactions from DB:', e);
    }
    
    return getLocalTransactions();
};

/** 获取本地交易记录（兜底） */
const getLocalTransactions = (): Transaction[] => {
    return JSON.parse(localStorage.getItem(LOCAL_TRANSACTIONS_KEY) || '[]');
};
