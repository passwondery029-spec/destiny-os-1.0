
import React, { useState, useEffect } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { THEME_COLORS } from '../constants';
import { addExp, getLevelState, canGenerateFreeReport, incrementReportCount, getCurrentLevelConfig, canGenerateTodayReport, markTodayReportGenerated } from '../services/levelService';
import { generateDailyFortune, DailyFortune } from '../services/fortuneService';
import { getProfiles } from '../services/profileService';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, ArrowRightIcon, XMarkIcon, SunIcon, WalletIcon } from '@heroicons/react/24/outline';
import { getBalance, deductBalance, REPORT_PRICE } from '../services/walletService';

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;
const MotionSpan = motion.span as any;

// Outfit Component
const OutfitVisualizer: React.FC<{
    colors: { hat: string, top: string, bottom: string, shoes: string };
    label: string;
    styleDesc: string;
}> = ({ colors, label, styleDesc }) => (
    <div className="flex flex-col items-center">
        <svg viewBox="0 0 100 220" className="w-24 h-48 drop-shadow-md mb-3">
            <circle cx="50" cy="30" r="16" fill="#F7F7F5" stroke="#1F1F1F" strokeWidth="2" />
            <path d="M34 22 C34 10, 66 10, 66 22 L66 26 L34 26 Z" fill={colors.hat} stroke="#1F1F1F" strokeWidth="2" />
            <path d="M30 50 L20 80 L30 90 L35 80 L35 120 L65 120 L65 80 L70 90 L80 80 L70 50 Q50 60 30 50 Z"
                fill={colors.top} stroke="#1F1F1F" strokeWidth="2" />
            <path d="M35 120 L32 190 L48 190 L50 140 L52 190 L68 190 L65 120 Z"
                fill={colors.bottom} stroke="#1F1F1F" strokeWidth="2" />
            <ellipse cx="40" cy="195" rx="8" ry="4" fill={colors.shoes} stroke="#1F1F1F" strokeWidth="2" />
            <ellipse cx="60" cy="195" rx="8" ry="4" fill={colors.shoes} stroke="#1F1F1F" strokeWidth="2" />
        </svg>
        <div className="text-center">
            <span className="block text-xs font-bold text-stone-800 font-serif mb-1">{label}</span>
            <span className="block text-[10px] text-stone-400 font-serif">{styleDesc}</span>
        </div>
    </div>
);

interface DashboardProps {
    onNavigateToChat?: (prompt: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToChat }) => {
    const [fortune, setFortune] = useState<DailyFortune | null>(null);
    const [balance, setBalance] = useState(0);
    const [freeReportsLeft, setFreeReportsLeft] = useState(0);
    const [showPaywall, setShowPaywall] = useState(false); // 充値提示弹窗
    const [isGenerating, setIsGenerating] = useState(false); // 正在生成报告的状态
    const [todayReportGenerated, setTodayReportGenerated] = useState(false); // 今日是否已生成报告

    // Wooden Fish State
    const [meritCount, setMeritCount] = useState(0);
    const [ripples, setRipples] = useState<{ id: number, x: number, y: number }[]>([]);
    const [xpGainedToday, setXpGainedToday] = useState(0);

    // Daily Notification State
    const [showDailyNotif, setShowDailyNotif] = useState(false);

    useEffect(() => {
        // 检查今日是否已生成过报告
        setTodayReportGenerated(!canGenerateTodayReport());
        
        // Initialize Fortune
        getProfiles().then(profiles => {
            const selfProfile = profiles.find(p => p.relation === 'SELF');
            const userBazi = selfProfile?.bazi;
            const userGender = selfProfile?.gender || 'MALE';
            const userBirthDate = selfProfile?.birthDate;
            const userBirthTime = selfProfile?.birthTime;

            supabase.auth.getSession().then(({ data: { session } }) => {
                const userId = session?.user?.id || 'guest';
                setFortune(generateDailyFortune(userId, userBazi, userGender, userBirthDate, userBirthTime));
            });
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const userId = session?.user?.id || 'guest';
            // We assume userGender and userBazi here are fetched earlier, but let's re-fetch to be safe if this fires later
            getProfiles().then(profiles => {
                const selfProf = profiles.find(p => p.relation === 'SELF');
                setFortune(generateDailyFortune(userId, selfProf?.bazi, selfProf?.gender || 'MALE', selfProf?.birthDate, selfProf?.birthTime));
            });
        });

        // Check if we showed the daily notification today
        const lastNotif = localStorage.getItem('destiny_os_last_daily_notif');
        const today = new Date().toISOString().split('T')[0];

        if (lastNotif !== today) {
            setTimeout(() => setShowDailyNotif(true), 800);
        }

        // Load initial merit/XP
        const state = getLevelState();
        setMeritCount(state.currentExp);

        // Load balance & free quota
        getBalance().then(b => setBalance(b));
        const config = getCurrentLevelConfig();
        const levelState = getLevelState();
        setFreeReportsLeft(Math.max(0, config.freeReportQuota - levelState.todayReportCount));

        return () => subscription.unsubscribe();
    }, []);

    const handleCloseNotif = () => {
        setShowDailyNotif(false);
        localStorage.setItem('destiny_os_last_daily_notif', new Date().toISOString().split('T')[0]);
    };

    const handleFishClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        // Visuals
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const newRipple = { id: Date.now(), x, y };
        setRipples(prev => [...prev, newRipple]);
        setTimeout(() => {
            setRipples(prev => prev.filter(r => r.id !== newRipple.id));
        }, 1000);

        // Logic: Add XP (Cap at 50 clicks per session to avoid spamming storage too hard, real app uses backend)
        if (xpGainedToday < 50) {
            addExp(1);
            setXpGainedToday(p => p + 1);
            setMeritCount(c => c + 1);
        }
    };

    const handleDetailedReport = async () => {
        if (!onNavigateToChat || !fortune || isGenerating) return;

        setIsGenerating(true);

        try {
            // 获取用户的准确八字信息
            const profiles = await getProfiles();
            const selfProfile = profiles.find(p => p.relation === 'SELF');
            const userBazi = selfProfile?.bazi || '未知';
            const userName = selfProfile?.name || '求道者';
            const userGender = selfProfile?.gender === 'MALE' ? '乾造（男）' : '坤造（女）';
            const userBirthDate = selfProfile?.birthDate || '未知';
            const userBirthTime = selfProfile?.birthTime || '未知';

            // 构建详细的今日运势数据对象
            const fortuneData = {
                user: {
                    name: userName,
                    gender: userGender,
                    birthDate: userBirthDate,
                    birthTime: userBirthTime,
                    bazi: userBazi
                },
                today: {
                    score: fortune.score,
                    auspiciousness: fortune.auspiciousness,
                    liuRi: fortune.liuRi,
                    luckyElement: fortune.luckyElement,
                    luckyColorName: fortune.luckyColorName,
                    luckyAction: fortune.luckyAction,
                    brief: fortune.brief,
                    advice: fortune.advice,
                    notifText: fortune.notifText
                },
                outfitOptions: {
                    optionA: fortune.outfitOptionA,
                    optionB: fortune.outfitOptionB
                }
            };

            // 构建包含所有数据的详细 prompt
            const detailedPrompt = `【生成今日详细天命报告】

【用户基本信息】
- 姓名：${fortuneData.user.name}
- 性别：${fortuneData.user.gender}
- 出生日期：${fortuneData.user.birthDate}
- 出生时辰：${fortuneData.user.birthTime}
- 生辰八字：${fortuneData.user.bazi}

【今日运势数据】
- 今日流日：${fortuneData.today.liuRi}
- 运势总分：${fortuneData.today.score}分
- 运势评价：${fortuneData.today.auspiciousness}
- 旺运五行：${fortuneData.today.luckyElement}
- 幸运颜色：${fortuneData.today.luckyColorName}
- 今日宜：${fortuneData.today.luckyAction}
- 运势简语：${fortuneData.today.brief}
- 行事建议：${fortuneData.today.advice}

【穿搭方案】
方案一（利事业正财）：
- 帽子：${fortuneData.outfitOptions.optionA.colors.hat}
- 上装：${fortuneData.outfitOptions.optionA.colors.top}
- 下装：${fortuneData.outfitOptions.optionA.colors.bottom}
- 鞋子：${fortuneData.outfitOptions.optionA.colors.shoes}
- 说明：${fortuneData.outfitOptions.optionA.styleDesc}

方案二（利创意社交）：
- 帽子：${fortuneData.outfitOptions.optionB.colors.hat}
- 上装：${fortuneData.outfitOptions.optionB.colors.top}
- 下装：${fortuneData.outfitOptions.optionB.colors.bottom}
- 鞋子：${fortuneData.outfitOptions.optionB.colors.shoes}
- 说明：${fortuneData.outfitOptions.optionB.styleDesc}

【任务要求】
请根据以上用户的准确八字和今日运势数据，为用户生成一份约800字的详细今日天命报告。

【报告结构（严格按此排版）】
## 🌅 今日天命总览
（2-3句话概括今日整体运势走向）

## 🔮 八字与流日深度解析  
（分析日柱与流日的五行生克关系，200字左右）

## 💼 事业 · 财运 · 感情
（分三个小段落，每段2-3句，给出具体、可操作的建议）

## 👔 今日穿搭解读
（结合两套方案，解读五行色彩搭配的原理和适用场景）

## ✨ 魔术师寄语
（1-2句温暖收尾，给用户正向力量）

【风格要求】
- 以命运魔术师的口吻，专业且有温度
- 每段之间留有呼吸感，不要密密麻麻
- 适当使用 emoji 点缀，但不过度

【输出约束 - 严格遵守】
- 直接输出报告正文，不要加任何系统性备注、存档提示、元数据标注
- 禁止出现"存档"、"录入档案"、"切片区"等内部术语
- 报告面向真实付费用户，语言流畅自然
- 不要在报告末尾添加括号备注或系统指令`;

            // 1️⃣ 先检查今日是否已生成
            if (!canGenerateTodayReport()) {
                // 今日已生成，直接跳转到天机阁查看
                onNavigateToChat('');
                return;
            }

            // 2️⃣ 生成报告并标记今日已生成
            markTodayReportGenerated();
            setTodayReportGenerated(true);  // 更新按钮状态
            onNavigateToChat(detailedPrompt);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!fortune) return <div className="p-8 text-center text-stone-500">推演天机中...</div>;

    return (
        <div className="space-y-6 pb-20">

            {/* 1. HERO SECTION: Score & Brief */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MotionDiv
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-white to-stone-50 rounded-2xl p-6 border border-stone-200 shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[220px]"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <div className="text-[120px] font-serif leading-none select-none pointer-events-none">吉</div>
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-sm font-serif text-stone-500 tracking-widest">今日运势总分</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] border border-emerald-100">{fortune.auspiciousness}</span>
                        </div>
                        <div className="flex items-end gap-3">
                            <span className="text-7xl md:text-8xl font-serif font-bold text-[#B8860B] tracking-tighter">{fortune.score}</span>
                            <span className="text-stone-400 mb-4 font-serif">/ 100</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-stone-200">
                            <p className="text-stone-700 font-serif text-lg font-medium">
                                "{fortune.brief}"
                            </p>
                            <p className="text-sm text-stone-500 mt-1">
                                {fortune.advice}
                            </p>
                        </div>
                    </div>
                </MotionDiv>

                {/* 2. OUTFIT SECTION: Dual Options */}
                <MotionDiv
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm relative overflow-hidden"
                >
                    <h3 className="font-serif font-bold text-lg text-[#1F1F1F] flex items-center gap-2 mb-4">
                        <SparklesIcon className="w-4 h-4 text-[#B8860B]" />
                        今日穿搭指引
                    </h3>

                    <div className="flex items-start justify-around">
                        <OutfitVisualizer {...fortune.outfitOptionA} />
                        <div className="h-40 w-[1px] bg-stone-100 mx-2"></div>
                        <OutfitVisualizer {...fortune.outfitOptionB} />
                    </div>

                    <p className="text-[10px] text-stone-400 text-center mt-4">
                        方案一利事业正财，方案二利创意社交。
                    </p>
                </MotionDiv>
            </div>

            {/* 3. CALL TO ACTION: Generate Report */}
            <MotionButton
                onClick={handleDetailedReport}
                whileHover={{ scale: todayReportGenerated || isGenerating ? 1 : 1.01 }}
                whileTap={{ scale: todayReportGenerated || isGenerating ? 1 : 0.98 }}
                disabled={todayReportGenerated || isGenerating}
                className={`w-full bg-[#1F1F1F] text-[#F7F7F5] p-4 rounded-xl shadow-lg flex items-center justify-between group cursor-pointer transition-all ${todayReportGenerated || isGenerating ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center">
                        {isGenerating ? (
                            <div className="w-5 h-5 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin"></div>
                        ) : todayReportGenerated ? (
                            <SparklesIcon className="w-5 h-5 text-emerald-400" />
                        ) : (
                            <SparklesIcon className="w-5 h-5 text-[#B8860B]" />
                        )}
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-sm tracking-wide">
                            {todayReportGenerated ? '本日已生成' : isGenerating ? '正在跳转天机阁...' : '生成今日详细天命报告'}
                        </p>
                        {isGenerating ? (
                            <p className="text-[10px] text-[#B8860B]">请稍候，正在准备您的专属报告...</p>
                        ) : todayReportGenerated ? (
                            <p className="text-[10px] text-emerald-400">可前往天机阁查看完整报告</p>
                        ) : (
                            <p className="text-[10px] text-[#B8860B]">每日仅可生成一次</p>
                        )}
                    </div>
                </div>
                {!isGenerating && (
                    <ArrowRightIcon className={`w-5 h-5 transform group-hover:translate-x-1 transition-transform ${todayReportGenerated ? 'text-emerald-400' : 'text-[#B8860B]'}`} />
                )}
            </MotionButton>

            {/* 4. MERIT / WOODEN FISH SECTION */}
            <MotionDiv
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex items-center justify-between overflow-hidden relative"
            >
                <div className="flex items-center gap-4 relative z-10">
                    <MotionButton
                        whileTap={{ scale: 0.95 }}
                        onClick={handleFishClick}
                        className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2c2c2c] to-[#000] border-2 border-stone-200 shadow-lg relative overflow-hidden group outline-none ring-1 ring-stone-100 shrink-0"
                    >
                        {/* Center Icon */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#B8860B] opacity-80 group-hover:opacity-100 transition-opacity">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z" />
                            </svg>
                        </div>
                        {/* Ripples */}
                        {ripples.map(r => (
                            <MotionSpan
                                key={r.id}
                                initial={{ scale: 0, opacity: 0.5 }}
                                animate={{ scale: 4, opacity: 0 }}
                                transition={{ duration: 0.8 }}
                                style={{ left: r.x, top: r.y }}
                                className="absolute w-10 h-10 bg-[#fff] rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 mix-blend-overlay"
                            />
                        ))}
                    </MotionButton>

                    {/* Floating Merits Text */}
                    <div className="absolute left-8 -top-10 w-full flex justify-center pointer-events-none">
                        {ripples.map(r => (
                            <MotionDiv
                                key={'text-' + r.id}
                                initial={{ y: 0, opacity: 1 }}
                                animate={{ y: -40, opacity: 0 }}
                                transition={{ duration: 1 }}
                                className="absolute text-[#8B0000] font-serif font-bold text-lg whitespace-nowrap"
                            >
                                灵力 +1
                            </MotionDiv>
                        ))}
                    </div>

                    <div>
                        <h4 className="font-serif font-bold text-stone-800">修心积德</h4>
                        <p className="text-[10px] text-stone-400">轻触木鱼提升灵力，解锁等级。</p>
                    </div>
                </div>

                <div className="text-right">
                    <span className="text-[10px] text-stone-400 block uppercase tracking-wider">总灵力 (XP)</span>
                    <span className="text-2xl font-serif text-[#B8860B] font-bold tabular-nums">{meritCount}</span>
                </div>
            </MotionDiv>

            {/* 5. DATA VISUALIZATION SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Five Elements Radar */}
                <MotionDiv
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="col-span-1 lg:col-span-1 glass-panel rounded-2xl p-6"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-stone-800">五行平衡</h3>
                        <span className="font-serif text-2xl text-stone-200 select-none">金</span>
                    </div>
                    <div className="h-[240px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={fortune.elementsData}>
                                <PolarGrid stroke="#e5e5e5" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 12, fontFamily: 'Noto Serif SC' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="能量值"
                                    dataKey="A"
                                    stroke={THEME_COLORS.GOLD}
                                    strokeWidth={2}
                                    fill={THEME_COLORS.GOLD}
                                    fillOpacity={0.3}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </MotionDiv>

                {/* Fortune Curve */}
                <MotionDiv
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="col-span-1 lg:col-span-2 glass-panel rounded-2xl p-6"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-stone-800">气运流转</h3>
                        <span className="font-serif text-2xl text-stone-200 select-none">流</span>
                    </div>
                    <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={fortune.energyCurve}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={THEME_COLORS.GOLD} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={THEME_COLORS.GOLD} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                                <XAxis dataKey="time" stroke="#999" tick={{ fontSize: 12, fill: '#666' }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#999" tick={{ fontSize: 12, fill: '#666' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e5e5e5', color: '#333', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Area
                                    type="natural"
                                    dataKey="energy"
                                    stroke={THEME_COLORS.GOLD}
                                    fillOpacity={1}
                                    fill="url(#colorEnergy)"
                                    strokeWidth={2}
                                    name="气运值"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </MotionDiv>
            </div>

            {/* DAILY REMINDER MODAL (SIMULATED NOTIFICATION) */}
            <AnimatePresence>
                {showDailyNotif && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <MotionDiv
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={handleCloseNotif}
                        />
                        <MotionDiv
                            initial={{ y: -50, opacity: 0, scale: 0.9 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="bg-white w-full max-w-sm rounded-2xl p-0 relative z-10 shadow-2xl overflow-hidden"
                        >
                            {/* Decoration Header */}
                            <div className="h-24 bg-gradient-to-br from-[#1F1F1F] to-[#333] relative flex items-center justify-center">
                                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #B8860B 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                                <SunIcon className="w-10 h-10 text-[#B8860B]" />
                            </div>

                            <div className="p-6 text-center">
                                <h3 className="text-xl font-bold font-serif text-stone-800 mb-2">晨间天机锦囊</h3>
                                <p className="text-sm text-stone-500 mb-6 leading-relaxed">
                                    "{fortune.notifText}"
                                </p>

                                <div className="bg-stone-50 rounded-xl p-3 mb-6 border border-stone-100 flex items-center justify-center gap-4 text-xs font-mono">
                                    <div>
                                        <span className="text-stone-400 block">幸运色</span>
                                        <span className="text-[#B8860B] font-bold">{fortune.luckyColorName}</span>
                                    </div>
                                    <div className="w-[1px] h-6 bg-stone-200"></div>
                                    <div>
                                        <span className="text-stone-400 block">宜</span>
                                        <span className="text-stone-700 font-bold">{fortune.luckyAction}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCloseNotif}
                                    className="w-full py-3 bg-[#1F1F1F] text-[#F7F7F5] rounded-xl font-bold hover:bg-[#333] shadow-lg"
                                >
                                    收下锦囊 (+20灵力)
                                </button>
                            </div>
                        </MotionDiv>
                    </div>
                )}
            </AnimatePresence>

            {/* PAYWALL MODAL */}
            <AnimatePresence>
                {showPaywall && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <MotionDiv
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowPaywall(false)}
                        />
                        <MotionDiv
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-sm rounded-2xl overflow-hidden relative z-10 shadow-2xl"
                        >
                            <div className="h-20 bg-gradient-to-br from-[#1F1F1F] to-[#333] flex items-center justify-center relative">
                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #B8860B 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                                <WalletIcon className="w-8 h-8 text-[#B8860B]" />
                            </div>
                            <div className="p-6 text-center">
                                <h3 className="text-xl font-bold font-serif text-stone-800 mb-2">天机币不足</h3>
                                <p className="text-sm text-stone-500 mb-1">当前余额：<span className="font-bold text-[#B8860B]">{Math.floor(balance)} 天机币</span></p>
                                <p className="text-sm text-stone-500 mb-6">定制报告消耗 <span className="font-bold">{REPORT_PRICE} 天机币</span>/份</p>
                                <button
                                    onClick={() => setShowPaywall(false)}
                                    className="w-full py-3 bg-[#1F1F1F] text-[#B8860B] rounded-xl font-bold hover:bg-stone-800 shadow-md mb-3"
                                >
                                    前往「我的」 → 充値天机币
                                </button>
                                <button
                                    onClick={() => setShowPaywall(false)}
                                    className="w-full py-2 text-stone-400 text-sm hover:text-stone-600"
                                >
                                    取消
                                </button>
                            </div>
                        </MotionDiv>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default Dashboard;
