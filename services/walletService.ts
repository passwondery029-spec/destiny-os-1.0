
import { supabase } from './supabaseClient';
import { addExp } from './levelService';

/** 每份定制报告的价格（天机币） */
export const REPORT_PRICE = 6;

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
    type: 'RECHARGE' | 'DEDUCT';
    amount: number;
    desc: string;
    ts: number;
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
    desc: string
): Promise<number> => {
    const current = await getBalance();
    const newBalance = current + coins;

    // 写入 Supabase user_metadata
    try {
        await supabase.auth.updateUser({
            data: { balance: newBalance }
        });
    } catch (e) {
        // ignore, use local fallback
    }

    setLocalBalance(newBalance);

    addLocalTransaction({
        id: Date.now().toString(),
        type: 'RECHARGE',
        amount: coins,
        desc,
        ts: Date.now(),
    });

    // 充值触发经验按比例增加: 1 天机币 = 10 灵力值(Exp)
    addExp(coins * 10);

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
        // ignore
    }

    setLocalBalance(newBalance);

    addLocalTransaction({
        id: Date.now().toString(),
        type: 'DEDUCT',
        amount,
        desc,
        ts: Date.now(),
    });

    return { success: true, newBalance };
};

/** 读取消费记录 */
export const getTransactions = (): Transaction[] => {
    return JSON.parse(localStorage.getItem(LOCAL_TRANSACTIONS_KEY) || '[]');
};
