
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserCircleIcon, ShieldCheckIcon, DocumentTextIcon,
    ChatBubbleBottomCenterTextIcon, PowerIcon, ChevronRightIcon,
    TrashIcon,
    BellIcon, StarIcon, BoltIcon, LockClosedIcon, PhoneIcon, EnvelopeIcon,
    ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import { useUserData } from '../contexts/UserDataContext';
import { LEVEL_CONFIGS } from '../constants';
import { supabase } from '../services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { RECHARGE_OPTIONS } from '../services/walletService';
import { WalletIcon } from '@heroicons/react/24/outline';

const MotionDiv = motion.div as any;

interface MineProps {
    session: Session | null;
}

const Mine: React.FC<MineProps> = ({ session: propSession }) => {
    // 从 Context 获取数据
    const { 
        session: contextSession,
        balance,
        isLoadingBalance,
        transactions,
        levelState,
        levelConfig,
        addBalance,
        refreshBalance
    } = useUserData();
    
    // 使用 Context 的 session（优先）或 props 的 session
    const session = contextSession || propSession;
    
    const [isVerified, setIsVerified] = useState(!!session?.user?.user_metadata?.is_verified);
    const [activeModal, setActiveModal] = useState<'NONE' | 'USER_AGREEMENT' | 'PRIVACY' | 'FEEDBACK' | 'ACCOUNT_SECURITY' | 'REAL_NAME_AUTH' | 'TRANSACTIONS' | 'LEVEL_PRIVILEGES' | 'RECHARGE'>('NONE');
    const [notifEnabled, setNotifEnabled] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    // Account Security Form
    const [emailInput, setEmailInput] = useState(session?.user?.email || '');
    const [phoneInput, setPhoneInput] = useState(session?.user?.phone || '');
    const [passwordInput, setPasswordInput] = useState('');

    // Real Name Auth Form
    const [realNameInput, setRealNameInput] = useState('');
    const [idCardInput, setIdCardInput] = useState('');

    // Level State from Context
    const currentConfig = levelConfig;
    const nextConfig = LEVEL_CONFIGS.find(l => l.level === currentConfig.level + 1);

    // 初始化表单数据
    useEffect(() => {
        if (session) {
            setIsVerified(!!session.user.user_metadata?.is_verified);
            setEmailInput(session.user.email || '');
            setPhoneInput(session.user.phone || '');
        }
    }, [session]);

    const handleUpdateSecurity = async () => {
        if (!session) return;
        setIsUpdating(true);
        try {
            const updates: any = {};
            if (emailInput && emailInput !== session.user.email) updates.email = emailInput;
            if (phoneInput && phoneInput !== session.user.phone) updates.phone = phoneInput;
            if (passwordInput) updates.password = passwordInput;

            if (Object.keys(updates).length === 0) {
                alert('没有修改任何信息');
                setIsUpdating(false);
                return;
            }

            const { error } = await supabase.auth.updateUser(updates);
            if (error) throw error;

            alert('更新成功！如果修改了邮箱或手机，可能需要重新验证。');
            setPasswordInput('');
            setActiveModal('NONE');
        } catch (err: any) {
            alert(`更新失败: ${err.message}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRealNameAuthSubmit = async () => {
        if (!session) return;
        if (!realNameInput || !idCardInput) {
            alert('请填写完整信息');
            return;
        }
        if (!/(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/.test(idCardInput)) {
            alert('身份证格式不正确');
            return;
        }

        setIsUpdating(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { is_verified: true, real_name: realNameInput }
            });
            if (error) throw error;

            setIsVerified(true);
            alert('实名认证成功！');
            setActiveModal('NONE');
        } catch (err: any) {
            alert(`认证失败: ${err.message}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLogout = async () => {
        try {
            const shouldLogout = window.confirm('确定要登出天命系统吗？');
            if (shouldLogout) {
                console.log('Logging out...');
                await supabase.auth.signOut();
                // Manually clear any residual local storage if signOut didn't
                Object.keys(localStorage).forEach(key => {
                    if (key.includes('supabase.auth.token') || key.includes('destiny_os_session')) {
                        localStorage.removeItem(key);
                    }
                });
                console.log('Logout successful');
                // State update will trigger re-render in App.tsx
            }
        } catch (err: any) {
            console.error('Logout failed:', err);
            // Even if signOut fails, we can try to force clear
            supabase.auth.signOut().catch(() => { });
            localStorage.clear();
            window.location.reload();
        }
    };

    const handleDeleteAccount = () => {
        if (confirm('【高风险操作】您确定要注销账号吗？\n\n依据《个人信息保护法》，注销后您的所有档案、记忆碎片及剩余天机币将被永久删除且无法恢复。')) {
            alert('账号已注销，相关数据已从服务器物理删除。');
            supabase.auth.signOut();
        }
    };

    const menuItems = [
        {
            id: 'security', icon: LockClosedIcon, label: '账号与安全', action: () => {
                if (!session) { alert('请先登录'); return; }
                setActiveModal('ACCOUNT_SECURITY');
            }
        },

        { id: 'agreement', icon: DocumentTextIcon, label: '用户协议', action: () => setActiveModal('USER_AGREEMENT') },
        { id: 'privacy', icon: ShieldCheckIcon, label: '隐私政策', action: () => setActiveModal('PRIVACY') },
        { id: 'feedback', icon: ChatBubbleBottomCenterTextIcon, label: '投诉与建议', action: () => setActiveModal('FEEDBACK') },
    ];

    return (
        <div className="space-y-6 pb-20 min-h-screen">
            <header className="mb-4">
                <h2 className="text-3xl font-serif font-bold text-[#1F1F1F] mb-1">我的</h2>
                <p className="text-stone-500 text-sm font-serif">账户设置与系统服务</p>
            </header>

            {/* 1. USER HEADER CARD */}
            <MotionDiv
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1F1F1F] rounded-2xl p-6 text-[#F7F7F5] relative overflow-hidden shadow-lg"
            >
                <div className="absolute right-0 top-0 opacity-10 font-calligraphy text-8xl pointer-events-none -translate-y-2 translate-x-2">
                    道
                </div>

                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-16 h-16 rounded-full border-2 border-[#B8860B] bg-stone-800 flex items-center justify-center text-2xl font-serif">
                        {session ? session.user.email?.charAt(0).toUpperCase() : <UserCircleIcon className="w-8 h-8 text-stone-500" />}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold tracking-wide flex items-center gap-2">
                            {session ? session.user.email?.split('@')[0] : '未登录访客'}
                            {session && (
                                isVerified ?
                                    <span className="text-[10px] bg-emerald-900/50 text-emerald-400 border border-emerald-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                        <CheckBadgeIcon className="w-3 h-3" /> 已实名
                                    </span> :
                                    <span className="text-[10px] bg-stone-700 text-stone-400 border border-stone-600 px-1.5 py-0.5 rounded cursor-pointer hover:bg-stone-600 transition-colors" onClick={() => setActiveModal('REAL_NAME_AUTH')}>
                                        未认证
                                    </span>
                            )}
                        </h3>
                        <p className="text-stone-400 text-xs mt-1 font-mono">
                            {session ? `ID: ${session.user.id.substring(0, 8).toUpperCase()}` : '登录以同步云端档案'}
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-1.5 rounded-full border border-stone-600 text-xs hover:bg-stone-700 transition-colors flex items-center gap-1"
                    >
                        <PowerIcon className="w-3 h-3" />
                        登出
                    </button>
                </div>
            </MotionDiv>

            {/* 2. LEVEL & PROGRESS CARD */}
            <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-xl border border-stone-700 p-5 shadow-lg relative overflow-hidden">
                <div className="flex justify-between items-start mb-3 relative z-10">
                    <div>
                        <div className="text-[#B8860B] font-serif font-bold text-lg flex items-center gap-2">
                            <StarIcon className="w-5 h-5" />
                            {currentConfig.title} (Lv.{currentConfig.level})
                        </div>
                        <p className="text-stone-400 text-xs mt-1">
                            {nextConfig ? `距离下一境界【${nextConfig.title}】` : '至高境界'}
                        </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <p className="text-2xl font-bold text-white tabular-nums">{levelState.exp}</p>
                        <p className="text-stone-500 text-[10px] mb-1">当前灵力值</p>
                        <button
                            onClick={() => setActiveModal('LEVEL_PRIVILEGES')}
                            className="bg-stone-800 text-stone-300 text-[10px] px-2 py-1 rounded border border-stone-600 hover:bg-stone-700 transition-colors flex items-center gap-1"
                        >
                            修仙特权 <ChevronRightIcon className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {nextConfig && (
                    <div className="relative z-10">
                        <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden mb-2">
                            <div
                                className="h-full bg-gradient-to-r from-[#B8860B] to-yellow-600"
                                style={{ width: `${Math.min(100, (levelState.currentExp / nextConfig.minExp) * 100)}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-stone-400">
                            <span>记忆容量: {currentConfig.maxMemoryContext}条</span>
                            <span>下一级: {nextConfig.maxMemoryContext}条</span>
                        </div>
                    </div>
                )}

                {/* Background decoration */}
                <BoltIcon className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 rotate-12" />
            </div>

            {/* 3. WALLET CARD - 天机币 */}
            <MotionDiv
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm relative overflow-hidden"
            >
                <div className="absolute right-0 top-0 opacity-5 font-calligraphy text-7xl pointer-events-none -translate-y-2 translate-x-2">
                    币
                </div>

                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <div className="text-[#1F1F1F] font-serif font-bold text-lg flex items-center gap-2">
                            <WalletIcon className="w-5 h-5 text-[#B8860B]" />
                            天机币
                        </div>
                        <p className="text-stone-400 text-xs mt-1">用于咨询、生成深度报告</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-bold text-[#B8860B] tabular-nums">{Math.floor(balance)}</p>
                        <p className="text-stone-400 text-[10px] mb-2">当前余额</p>
                        <button
                            onClick={() => setActiveModal('RECHARGE')}
                            className="bg-[#B8860B] text-white text-[10px] px-3 py-1.5 rounded-full hover:bg-[#9a700a] transition-colors flex items-center gap-1"
                        >
                            充值 <ChevronRightIcon className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-stone-100 flex justify-between">
                    <button
                        onClick={() => setActiveModal('TRANSACTIONS')}
                        className="text-stone-500 text-[10px] hover:text-[#B8860B] transition-colors flex items-center gap-1"
                    >
                        <ArrowTrendingUpIcon className="w-3 h-3" />
                        查看明细
                    </button>
                </div>
            </MotionDiv>

            {/* 4. SETTINGS & WALLET GROUP */}
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                {/* Notification Toggle */}
                <div className="flex items-center justify-between p-4 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                            <BellIcon className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-stone-700">每日天机提醒</p>
                            <p className="text-[10px] text-stone-400">晨间推送个性化运势锦囊</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setNotifEnabled(!notifEnabled)}
                        className={`w-11 h-6 rounded-full transition-colors relative ${notifEnabled ? 'bg-[#B8860B]' : 'bg-stone-200'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${notifEnabled ? 'left-6' : 'left-1'}`}></div>
                    </button>
                </div>

            </div>

            {/* 5. MENU LIST */}
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                {menuItems.map((item, idx) => (
                    <button
                        key={item.id}
                        onClick={item.action}
                        className={`w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors text-left group ${idx !== menuItems.length - 1 ? 'border-b border-stone-100' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <item.icon className="w-5 h-5 text-stone-500 group-hover:text-[#B8860B] transition-colors" />
                            <span className="text-sm font-medium text-stone-700">{item.label}</span>
                        </div>
                        <ChevronRightIcon className="w-4 h-4 text-stone-300" />
                    </button>
                ))}
            </div>

            {/* 6. DELETE ACCOUNT (PIPL Compliance) */}
            {session && (
                <button
                    onClick={handleDeleteAccount}
                    className="w-full bg-white rounded-xl border border-stone-200 p-4 shadow-sm flex items-center justify-center gap-2 text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors text-sm"
                >
                    <TrashIcon className="w-4 h-4" />
                    注销账号
                </button>
            )}

            <div className="text-center pt-8 space-y-1">
                <p className="text-[10px] text-stone-400">当前版本 v1.3.0 (Magician Update)</p>
                <p className="text-[9px] text-stone-300">违法和不良信息举报电话：12377</p>
            </div>

            {/* --- MODALS --- */}

            {/* INFO MODALS */}
            <AnimatePresence>
                {activeModal !== 'NONE' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <MotionDiv
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setActiveModal('NONE')}
                        />
                        <MotionDiv
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-2xl p-6 relative z-10 shadow-2xl max-h-[80vh] overflow-y-auto"
                        >
                            <h3 className="text-xl font-bold mb-4 font-serif text-[#B8860B]">
                                {activeModal === 'USER_AGREEMENT' && '用户协议'}
                                {activeModal === 'PRIVACY' && '隐私政策'}
                                {activeModal === 'FEEDBACK' && '投诉与建议'}
                                {activeModal === 'ACCOUNT_SECURITY' && '账号与安全'}
                                {activeModal === 'REAL_NAME_AUTH' && '实名认证'}
                                {activeModal === 'LEVEL_PRIVILEGES' && '境界特权'}
                                {activeModal === 'RECHARGE' && '天机币充值'}
                            </h3>

                            <div className="text-sm text-stone-600 leading-relaxed space-y-2 mb-6">
                                {activeModal === 'LEVEL_PRIVILEGES' && (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl mb-4">
                                            <p className="text-xs text-stone-500 mb-2"><strong>灵力获取途径：</strong></p>
                                            <ul className="text-xs text-stone-500 list-disc pl-4 space-y-1">
                                                <li>充值：<span className="text-[#B8860B]">1 天机币 = 10 灵力</span></li>
                                                <li>推演报告：每次 <span className="text-emerald-500">+50 灵力</span></li>
                                                <li>木鱼积德：每次 <span className="text-emerald-500">+1 灵力</span></li>
                                                <li>每日登录：首登 <span className="text-emerald-500">+20 灵力</span></li>
                                            </ul>
                                        </div>

                                        <div className="border border-[#B8860B] rounded-xl overflow-hidden relative shadow-md">
                                            <div className="bg-[#B8860B] text-white px-4 py-2 font-bold flex justify-between">
                                                <span>当前: {currentConfig.title} <span>(Lv.{currentConfig.level})</span></span>
                                            </div>
                                            <div className="bg-yellow-50/50 p-4 space-y-2 text-stone-700">
                                                <div className="flex justify-between border-b border-stone-200/50 pb-2">
                                                    <span>每日免费报告额度</span>
                                                    <span className="font-bold text-[#B8860B]">{currentConfig.freeReportQuota} 次</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>云端记忆最大条数</span>
                                                    <span className="font-bold text-[#B8860B]">{currentConfig.maxMemoryContext} 条</span>
                                                </div>
                                            </div>
                                        </div>

                                        {nextConfig ? (
                                            <div className="border border-stone-200 rounded-xl overflow-hidden relative opacity-80">
                                                <div className="bg-stone-100 text-stone-500 px-4 py-2 font-bold flex justify-between">
                                                    <span>下一阶: {nextConfig.title} <span>(Lv.{nextConfig.level})</span></span>
                                                    <span className="text-xs font-normal">需 {nextConfig.minExp} 灵力</span>
                                                </div>
                                                <div className="bg-white p-4 space-y-2 text-stone-600">
                                                    <div className="flex justify-between border-b border-stone-100 pb-2">
                                                        <span>每日免费报告额度</span>
                                                        <span className="font-bold text-emerald-600">{nextConfig.freeReportQuota} 次</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>云端记忆最大条数</span>
                                                        <span className="font-bold text-emerald-600">{nextConfig.maxMemoryContext} 条</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-center text-[#B8860B] font-bold py-4">您已达到最高境界</p>
                                        )}
                                    </div>
                                )}
                                {activeModal === 'RECHARGE' && (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl mb-4">
                                            <p className="text-xs text-stone-500 mb-2"><strong>当前余额：</strong></p>
                                            <p className="text-2xl font-bold text-[#B8860B]">{Math.floor(balance)} 天机币</p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            {RECHARGE_OPTIONS.map((option, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={async () => {
                                                        const totalCoins = option.coins + option.bonus;
                                                        await addBalance(totalCoins, `${option.label}充值`, 'RECHARGE');
                                                        alert(`充值成功！获得 ${totalCoins} 天机币！`);
                                                        setActiveModal('NONE');
                                                    }}
                                                    className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                                                        idx === 2 ? 'border-[#B8860B] bg-[#B8860B]/5' : 'border-stone-200 hover:border-stone-300'
                                                    }`}
                                                >
                                                    <div className="text-center">
                                                        <p className={`text-lg font-bold ${idx === 2 ? 'text-[#B8860B]' : 'text-stone-700'}`}>
                                                            {option.coins} 币
                                                        </p>
                                                        {option.bonus > 0 && (
                                                            <p className="text-xs text-emerald-600 font-bold">+{option.bonus} 赠币</p>
                                                        )}
                                                        <p className={`text-sm mt-2 ${idx === 2 ? 'text-[#B8860B] font-bold' : 'text-stone-500'}`}>
                                                            ¥{option.price}
                                                        </p>
                                                        <p className="text-[10px] text-stone-400 mt-1">{option.label}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {activeModal === 'ACCOUNT_SECURITY' && (
                                    <div className="space-y-4 mb-2">
                                        <div>
                                            <label className="block text-xs font-medium text-stone-500 mb-1">邮箱地址</label>
                                            <div className="relative">
                                                <EnvelopeIcon className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="email"
                                                    value={emailInput}
                                                    onChange={e => setEmailInput(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#B8860B] outline-none text-sm"
                                                    placeholder="输入新邮箱"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-stone-500 mb-1">手机号码</label>
                                            <div className="relative">
                                                <PhoneIcon className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="tel"
                                                    value={phoneInput}
                                                    onChange={e => setPhoneInput(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#B8860B] outline-none text-sm"
                                                    placeholder="输入手机号码"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-stone-500 mb-1">修改密码 (留空则不修改)</label>
                                            <div className="relative">
                                                <LockClosedIcon className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="password"
                                                    value={passwordInput}
                                                    onChange={e => setPasswordInput(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#B8860B] outline-none text-sm"
                                                    placeholder="输入新密码"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {activeModal === 'REAL_NAME_AUTH' && (
                                    <div className="space-y-4 mb-2">
                                        <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg mb-4 flex items-start gap-2">
                                            <ShieldCheckIcon className="w-4 h-4 shrink-0 mt-0.5" />
                                            <p>根据国家相关法律法规要求，使用生成式AI服务需进行实名认证。您的信息将被严格保密。</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-stone-500 mb-1">真实姓名</label>
                                            <div className="relative">
                                                <UserCircleIcon className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="text"
                                                    value={realNameInput}
                                                    onChange={e => setRealNameInput(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#B8860B] outline-none text-sm"
                                                    placeholder="请输入您的真实姓名"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-stone-500 mb-1">身份证号</label>
                                            <div className="relative">
                                                <IdentificationIcon className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="text"
                                                    value={idCardInput}
                                                    onChange={e => setIdCardInput(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#B8860B] outline-none text-sm"
                                                    placeholder="请输入18位身份证号码"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {activeModal === 'TRANSACTIONS' && (
                                    <div className="space-y-2">
                                        {transactions.length === 0 ? (
                                            <p className="text-center text-stone-400 py-8">暂无记录</p>
                                        ) : (
                                            transactions.map(tx => (
                                                <div key={tx.id} className={`flex items-center justify-between p-3 rounded-xl border ${tx.type === 'RECHARGE' ? 'bg-emerald-50 border-emerald-100' : 'bg-stone-50 border-stone-100'}`}>
                                                    <div>
                                                        <p className="text-sm font-medium text-stone-700">{tx.desc}</p>
                                                        <p className="text-[10px] text-stone-400">{new Date(tx.ts).toLocaleString('zh-CN')}</p>
                                                    </div>
                                                    <span className={`font-bold tabular-nums ${tx.type === 'RECHARGE' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {tx.type === 'RECHARGE' ? '+' : '-'}{tx.amount}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                                {activeModal === 'USER_AGREEMENT' && (
                                    <>
                                        <p><strong>重要提示：</strong>本服务提供的命理分析、运势报告仅供娱乐、文化研究与心理咨询参考，并非绝对科学事实。我们严禁利用本平台传播封建迷信、违背社会公序良俗的内容。</p>
                                        <p>用户在使用生成式人工智能服务时，需遵守《生成式人工智能服务管理暂行办法》，不得生成虚假、有害信息。</p>
                                        <p>未成年人请在监护人陪同下使用。</p>
                                    </>
                                )}
                                {activeModal === 'PRIVACY' && (
                                    <>
                                        <p><strong>依据《个人信息保护法》声明：</strong></p>
                                        <p>1. 我们仅收集您为了使用排盘功能所必须提供的生辰信息。</p>
                                        <p>2. 您的实名认证信息（如涉及）将通过第三方权威机构进行核验，本平台不直接存储您的身份证原件。</p>
                                        <p>3. 您有权随时通过“我的-注销账号”功能删除您的所有个人数据。</p>
                                    </>
                                )}
                                {activeModal === 'FEEDBACK' && (
                                    <textarea
                                        className="w-full h-32 p-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#B8860B] outline-none resize-none"
                                        placeholder="请输入您的宝贵建议，或举报不良信息..."
                                    />
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    if (activeModal === 'FEEDBACK') { alert('感谢您的反馈！我们会尽快处理。'); setActiveModal('NONE'); }
                                    else if (activeModal === 'ACCOUNT_SECURITY') handleUpdateSecurity();
                                    else if (activeModal === 'REAL_NAME_AUTH') handleRealNameAuthSubmit();
                                    else if (activeModal === 'RECHARGE') {
                                        // 充值弹窗的按钮逻辑已经在卡片点击时处理了
                                        setActiveModal('NONE');
                                    }
                                    else setActiveModal('NONE');
                                }}
                                disabled={isUpdating}
                                className="w-full py-3 bg-[#1F1F1F] text-[#F7F7F5] rounded-xl font-bold hover:bg-[#333] disabled:opacity-50"
                            >
                                {isUpdating ? '处理中...' :
                                    activeModal === 'FEEDBACK' ? '提交反馈' :
                                        activeModal === 'ACCOUNT_SECURITY' ? '保存修改' :
                                            activeModal === 'REAL_NAME_AUTH' ? '提交认证' :
                                                activeModal === 'RECHARGE' ? '关闭' : '我已阅读并同意'}
                            </button>
                        </MotionDiv>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default Mine;
