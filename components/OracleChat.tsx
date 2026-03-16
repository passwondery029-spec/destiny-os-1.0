
import React, { useState, useEffect, useRef } from 'react';
import { sendMessageToOracle, generateReportContent, initializeChat } from '../services/tianjiService';
import { supabase } from '../services/supabaseClient';
import { addReport } from '../services/reportService';
import { getCurrentLevelConfig, addExp, canGenerateFreeReport, incrementReportCount } from '../services/levelService';
import { ChatMessage, UserProfile, AppRoute } from '../types';
import { MOCK_PROFILES, USER_STATS } from '../services/mockDataService';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PaperAirplaneIcon, SparklesIcon, ArrowsRightLeftIcon,
    DocumentPlusIcon, LockClosedIcon, XMarkIcon,
    Squares2X2Icon, ScaleIcon, ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/solid';
import { DestinyReport } from '../types';

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

import { Session } from '@supabase/supabase-js';

interface OracleChatProps {
    session?: Session | null;
    initialPrompt?: string | null;
    onPromptConsumed?: () => void;
    onNavigate?: (route: AppRoute) => void;
    onViewReport?: (report: DestinyReport) => void;
}

const REPORT_ACTIONS = [
    { label: '2025流年运势', prompt: '请为我生成一份2025乙巳年流年运势深度报告，包含事业、财运、感情三方面。', type: 'YEARLY' },
    { label: '事业前程详批', prompt: '请详细推演我未来的事业发展路径，包含行业选择与升迁机会。', type: 'CAREER' },
    { label: '财库补全指引', prompt: '请分析我的财运走势，并给出补财库的具体建议。', type: 'WEALTH' },
];

const OracleChat: React.FC<OracleChatProps> = ({ initialPrompt, onPromptConsumed, onNavigate, onViewReport }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'model',
            text: '求道者，幸会。我是您的命运魔术师。今日星象变幻，您似乎有心事？不妨说来听听，也许我能为您从记忆的碎片中找到答案。',
            timestamp: Date.now()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoadingHistory, setIsLoadingHistory] = useState(false); // 专门用于历史加载
    const [isSendingMessage, setIsSendingMessage] = useState(false); // 专门用于发送消息
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
    const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
    const [showTools, setShowTools] = useState(false);
    const [lastGeneratedReport, setLastGeneratedReport] = useState<DestinyReport | null>(null);

    // Custom Report Payment State
    const [showPayModal, setShowPayModal] = useState(false);
    const [customReportTopic, setCustomReportTopic] = useState('');
    const [paymentProcessing, setPaymentProcessing] = useState(false);

    // Level State
    const levelConfig = getCurrentLevelConfig();

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasProcessedPrompt = useRef(false);

    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    };

    // 滚动到底部：加载历史后 + 发送新消息后都要滚动
    const [lastMsgCount, setLastMsgCount] = useState(0);
    useEffect(() => {
        // 加载完历史后滚动到底部（显示最新记录）
        if (!isLoadingHistory && messages.length > 0) {
            // 如果是从欢迎语变成有历史记录，或者消息数量大幅增加（加载历史）
            if (lastMsgCount <= 1 || messages.length > lastMsgCount + 1) {
                // 延迟一点确保 DOM 渲染完成
                setTimeout(() => scrollToBottom(false), 100);
            }
            // 新增单条消息时也滚动
            else if (messages.length > lastMsgCount) {
                scrollToBottom();
            }
        }
        setLastMsgCount(messages.length);
    }, [messages.length, isLoadingHistory]);

    // Only scroll while generating (the user is waiting for a reply)
    useEffect(() => {
        if (isGeneratingReport) scrollToBottom();
    }, [isGeneratingReport]);

    // Load profiles on mount (Async)
    useEffect(() => {
        const initProfiles = async () => {
            if (!activeProfile) {
                const { getProfiles } = await import('../services/profileService');
                const profiles = await getProfiles();
                if (profiles && profiles.length > 0) {
                    setActiveProfile(profiles[0]);
                } else {
                    setActiveProfile(MOCK_PROFILES[0]);
                }
            }
        };
        initProfiles();
    }, []);

    // Load History on Mount or Profile Change
    // localStorage key for chat history
    const getChatStorageKey = (profileId: string) => `destiny_chat_${profileId}`;

    // Save to localStorage
    const saveToLocalStorage = (msgs: ChatMessage[], profileId: string) => {
        try {
            console.log('[Chat] saveToLocalStorage called with profileId:', profileId, 'key:', getChatStorageKey(profileId));
            localStorage.setItem(getChatStorageKey(profileId), JSON.stringify(msgs));
        } catch (e) { console.error('localStorage save failed:', e); }
    };

    // Load from localStorage (fallback)
    const loadFromLocalStorage = (profileId: string): ChatMessage[] | null => {
        try {
            const key = getChatStorageKey(profileId);
            console.log('[Chat] loadFromLocalStorage with profileId:', profileId, 'key:', key);
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                console.log('[Chat] localStorage content for key:', key, 'length:', parsed.length);
            }
            return stored ? JSON.parse(stored) : null;
        } catch (e) { console.error('localStorage load failed:', e); return null; }
    };

    useEffect(() => {
        if (!activeProfile) return;
        const loadHistory = async () => {
            setIsLoadingHistory(true);
            
            // 1️⃣ 优先从 localStorage 加载（最快）
            const localMsgs = loadFromLocalStorage(activeProfile.id);
            if (localMsgs && localMsgs.length > 0) {
                console.log('[Chat] Loaded from localStorage:', localMsgs.length, 'messages');
                const engineHistory = localMsgs.map(l => ({
                    role: l.role === 'user' ? 'user' : 'assistant',
                    content: l.text
                }));
                setMessages(localMsgs);
                await initializeChat(activeProfile.id, engineHistory);
                setIsLoadingHistory(false);
                return;
            }

            // 2️⃣ Fallback 到 DB 加载
            try {
                console.log('[Chat] Loading from DB, profileId:', activeProfile.id);
                const { data: logs, error } = await supabase
                    .from('chat_logs')
                    .select('*')
                    .eq('profile_id', activeProfile.id)
                    .order('timestamp', { ascending: true })
                    .limit(50);

                if (error) {
                    console.error('[Chat] DB load error:', error);
                    throw error;
                }
                console.log('[Chat] DB logs count:', logs?.length, logs);

                let loadedMessages: ChatMessage[] = [];
                let engineHistory: { role: string, content: string }[] = [];

                if (logs && logs.length > 0) {
                    loadedMessages = logs.map(l => ({
                        role: l.role === 'user' ? 'user' : 'model',
                        text: l.text,
                        timestamp: l.timestamp
                    }));
                    engineHistory = logs.map(l => ({
                        role: l.role === 'user' ? 'user' : 'assistant',
                        content: l.text
                    }));
                    console.log('[Chat] Loaded messages:', loadedMessages);
                    // 同步到 localStorage
                    saveToLocalStorage(loadedMessages, activeProfile.id);
                } else {
                    loadedMessages = [{
                        role: 'model',
                        text: '求道者，幸会。我是您的命运魔术师。今日星象变幻，您似乎有心事？不妨说来听听，也许我能为您从记忆的碎片中找到答案。',
                        timestamp: Date.now()
                    }];
                }

                setMessages(loadedMessages);
                await initializeChat(activeProfile.id, engineHistory);
            } catch (e) {
                console.error('Failed to load history:', e);
                // Fallback 到默认欢迎语
                setMessages([{
                    role: 'model',
                    text: '求道者，幸会。我是您的命运魔术师。今日星象变幻，您似乎有心事？不妨说来听听，也许我能为您从记忆的碎片中找到答案。',
                    timestamp: Date.now()
                }]);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        loadHistory();
    }, [activeProfile?.id]);

    // 自动保存聊天记录到 localStorage（当 messages 变化时）
    useEffect(() => {
        if (activeProfile && messages.length > 0) {
            // 排除初始欢迎语（如果是刚加载的默认消息则不覆盖已保存的历史）
            const isDefaultWelcome = messages.length === 1 && messages[0].role === 'model' && messages[0].text.includes('幸会');
            if (!isDefaultWelcome) {
                console.log('[Chat] Saving to localStorage, messages count:', messages.length, 
                    'last msg role:', messages[messages.length - 1].role);
                saveToLocalStorage(messages, activeProfile.id);
            }
        }
    }, [messages, activeProfile?.id]);

    // Handle Initial Prompt (Deep link from Dashboard)
    useEffect(() => {
        // 必须等 activeProfile 加载完、历史加载完，才处理 initialPrompt
        if (initialPrompt && !hasProcessedPrompt.current && !isLoadingHistory && activeProfile && messages.length > 0) {
            console.log('[OracleChat] Processing initialPrompt, activeProfile:', activeProfile.name);
            hasProcessedPrompt.current = true;
            
            // 添加一个专门的提示消息让用户知道正在生成报告
            const notificationMsg: ChatMessage = {
                role: 'model',
                text: '正在为您生成今日详细天命报告，请稍候...\n\n（基于您的生辰八字和今日运势数据进行深度分析）',
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, notificationMsg]);
            
            // 延迟一小段时间再发送，让用户先看到提示
            // 用户界面只显示简洁文字，完整 prompt 只发给 API
            setTimeout(() => {
                console.log('[OracleChat] Calling handleSendMessage with initialPrompt');
                handleSendMessage(initialPrompt, '请帮我生成今日的天机报告');
            }, 500);
            
            if (onPromptConsumed) {
                onPromptConsumed();
            }
        }
    }, [initialPrompt, isLoadingHistory, activeProfile, messages.length]);

    /**
     * @param text 发送给 API 的完整文本
     * @param displayText 可选，显示在聊天框的简洁文本（不传则显示 text）
     */
    const handleSendMessage = async (text: string, displayText?: string) => {
        const shownText = displayText || text;
        const userMsg: ChatMessage = {
            role: 'user',
            text: shownText,  // UI 显示简洁文本
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setIsSendingMessage(true);

        // Add XP for chatting
        addExp(5);

        try {
            // Prepend context about WHO is being asked about
            // 注意：发给 API 的是完整的 text，不是 displayText
            const contextAwarePrompt = `[当前咨询对象：${activeProfile.name}, 关系：${activeProfile.relation}, 八字：${activeProfile.bazi || '未知'}, 当前AI等级: ${levelConfig.title}] ${text}`;

            // 传 displayText 给服务端，数据库存简洁文本
            const responseText = await sendMessageToOracle(contextAwarePrompt, activeProfile.id, levelConfig, displayText);
            const aiMsg: ChatMessage = {
                role: 'model',
                text: responseText,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error('Chat Error:', error);
            
            // 对普通用户友好的错误提示
            const userFriendlyMsg = "天机暂时混沌，稍后再试。\n\n如问题持续，请联系客服或稍后重试。";
            
            setMessages(prev => [...prev, {
                role: 'model',
                text: userFriendlyMsg,
                timestamp: Date.now()
            }]);
        } finally {
            setIsSendingMessage(false);
        }
    };

    const handleSendClick = async () => {
        if (!input.trim() || isSendingMessage || isGeneratingReport) return;
        const textToSend = input;
        setInput(''); // Clear input early
        await handleSendMessage(textToSend);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendClick();
        }
    };

    // --- REPORT GENERATION LOGIC ---
    const handleQuickReport = async (action: typeof REPORT_ACTIONS[0]) => {
        if (isSendingMessage || isGeneratingReport) return;

        if (!canGenerateFreeReport()) {
            alert(`您的等级【${levelConfig.title}】今日免费报告次数已用尽。请升级或明日再来。`);
            return;
        }

        // 1. Send message to Chat UI
        const userMsg: ChatMessage = {
            role: 'user',
            text: `[生成报告] ${action.label}`,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMsg]);
        setIsSendingMessage(true);
        setIsGeneratingReport(true);

        try {
            // 2. Parallel: Get Chat Response AND Generate Report Metadata
            const profileInfo = `${activeProfile.name} (${activeProfile.bazi})`;

            // Generate Report Metadata (Title/Summary) via AI
            const reportData = await generateReportContent(action.prompt, profileInfo, activeProfile.id);

            // Add to Database (LINKED TO PROFILE ID)
            const newReport = await addReport(
                reportData.title,
                action.type as any,
                reportData.summary,
                ['AI生成', action.label],
                activeProfile.id,
                reportData.content
            );

            setLastGeneratedReport(newReport);
            incrementReportCount(); // Consume quota and give big XP

            // Get Chat Response
            const chatResponse = await sendMessageToOracle(
                `用户刚刚生成了一份《${reportData.title}》。请简短告知用户报告已生成，并已存入档案库。`,
                activeProfile.id,
                levelConfig
            );

            setMessages(prev => [...prev, {
                role: 'model',
                text: `${chatResponse}\n\n📝 **系统提示**：报告《${reportData.title}》已归档至【档案页-深度报告】。`,
                timestamp: Date.now()
            }]);

        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'model', text: "报告生成失败，请稍后重试。", timestamp: Date.now() }]);
        } finally {
            setIsSendingMessage(false);
            setIsGeneratingReport(false);
        }
    };

    const handleCustomReportPay = async () => {
        if (!customReportTopic.trim()) return;
        setPaymentProcessing(true);

        // Simulate Payment Delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        setPaymentProcessing(false);
        setShowPayModal(false);

        // Execute Generation
        const customAction = {
            label: '定制深度报告',
            prompt: `请针对以下主题为我生成深度命理报告：${customReportTopic}`,
            type: 'K_LINE'
        };

        setCustomReportTopic(''); // Reset
        handleQuickReport(customAction);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-env(safe-area-inset-bottom)-110px)] lg:h-[calc(100vh-110px)] relative overflow-hidden pb-safe">

            {/* 1. TOP STATS BAR */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-stone-200 p-3 flex justify-between items-center text-[10px] text-stone-500 font-serif mb-2 rounded-xl shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1F1F1F] text-[#B8860B] flex items-center justify-center font-bold text-xs border-2 border-[#B8860B]">
                            Lv.{levelConfig.level}
                        </div>
                        <div>
                            <span className="block font-bold text-[#1F1F1F] text-xs">{levelConfig.title}</span>
                            <div className="flex gap-3">
                                <span>报告: {Math.max(0, levelConfig.freeReportQuota - (canGenerateFreeReport() ? 0 : 999))}/{levelConfig.freeReportQuota}</span>
                                <span className="text-[#B8860B]">算力: {levelConfig.computingPowerPercent}%</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-right opacity-60">
                    魔术师在线<br />引导回忆
                </div>
            </div>

            {/* 2. CHAT CONTAINER */}
            <div className="flex-1 glass-panel rounded-2xl overflow-hidden border border-stone-200 shadow-sm flex flex-col relative mb-2">
                {/* Chat Header - Compact */}
                <div className="p-3 border-b border-stone-200 bg-white/50 flex items-center justify-between backdrop-blur-md relative z-20">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#8B0000] animate-pulse"></div>
                        <div>
                            <h3 className="font-serif font-bold text-stone-800 text-base flex items-center gap-2">
                                天机阁
                                <span className="text-[8px] bg-[#B8860B] text-white px-1 rounded">v2.1</span>
                            </h3>
                            <p className="text-[9px] text-stone-400">正在为 <span className="text-[#8B0000] font-bold">{activeProfile?.name || '...'}</span> 推演</p>
                        </div>
                    </div>

                    {/* SUB-AI TOOLS ENTRY */}
                    <div className="relative">
                        <button
                            onClick={() => setShowTools(!showTools)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${showTools ? 'bg-[#1F1F1F] text-[#B8860B] border-[#1F1F1F]' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                        >
                            <Squares2X2Icon className="w-4 h-4" />
                            <span className="text-xs font-bold">法器</span>
                        </button>

                        <AnimatePresence>
                            {showTools && (
                                <MotionDiv
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden"
                                >
                                    <div className="p-2">
                                        <p className="px-2 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">功能型副脑</p>
                                        <button
                                            onClick={() => onNavigate && onNavigate(AppRoute.DIVINATION)}
                                            className="w-full flex items-center gap-3 p-2 hover:bg-stone-50 rounded-lg transition-colors text-left"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-[#1F1F1F] flex items-center justify-center text-[#B8860B]">
                                                <ScaleIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="block text-sm font-bold text-stone-800">断事局</span>
                                                <span className="block text-[10px] text-stone-500">一事一测，铁口直断</span>
                                            </div>
                                        </button>
                                        {/* Placeholder for Future AIs */}
                                        <button disabled className="w-full flex items-center gap-3 p-2 opacity-40 cursor-not-allowed text-left">
                                            <div className="w-8 h-8 rounded-lg bg-stone-200 flex items-center justify-center text-stone-400">
                                                <SparklesIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="block text-sm font-bold text-stone-800">解梦台</span>
                                                <span className="block text-[10px] text-stone-500">敬请期待...</span>
                                            </div>
                                        </button>
                                    </div>
                                </MotionDiv>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#FDFDFB] relative">
                    {/* Subtle Cyber Grid Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: 'linear-gradient(#B8860B 1px, transparent 1px), linear-gradient(90deg, #B8860B 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                    <AnimatePresence initial={false}>
                        {messages.map((msg, idx) => (
                            <MotionDiv
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] lg:max-w-[70%] p-5 rounded-2xl shadow-sm relative ${msg.role === 'user'
                                        ? 'bg-[#1F1F1F] text-white rounded-br-none'
                                        : 'bg-white border border-stone-100 text-stone-700 rounded-bl-none'
                                        }`}
                                >
                                    <div className="prose prose-sm max-w-none leading-relaxed whitespace-pre-wrap font-serif break-words overflow-hidden">
                                        {msg.text.split('\n').map((line, i) => (
                                            <p key={i} className={`mb-2 last:mb-0 break-words ${msg.role === 'user' ? 'text-gray-200' : 'text-stone-700'}`}>{line}</p>
                                        ))}
                                    </div>

                                    {/* Report Shortcut Button */}
                                    {msg.role === 'model' && msg.text.includes('报告《') && lastGeneratedReport && (
                                        <div className="mt-4 pt-4 border-t border-stone-100">
                                            <button
                                                onClick={() => onViewReport && onViewReport(lastGeneratedReport)}
                                                className="w-full flex items-center justify-between px-4 py-3 bg-[#1F1F1F] text-[#B8860B] rounded-xl font-bold text-xs hover:bg-[#333] transition-colors shadow-sm"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <DocumentPlusIcon className="w-4 h-4" />
                                                    <span>立即查看完整报告内容</span>
                                                </div>
                                                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </MotionDiv>
                        ))}
                    </AnimatePresence>

                    {(isSendingMessage || isGeneratingReport) && (
                        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                            <div className="bg-white border border-stone-100 p-4 rounded-2xl rounded-bl-none flex items-center gap-2 shadow-sm">
                                <SparklesIcon className="w-4 h-4 text-[#B8860B] animate-spin" />
                                <span className="text-xs text-stone-500 font-serif">
                                    {isGeneratingReport ? '正在编撰深度报告并归档...' : '正在魔术师的礼帽中寻找答案...'}
                                </span>
                            </div>
                        </MotionDiv>
                    )}
                    <div ref={messagesEndRef} />

                    {/* AIGC DISCLAIMER */}
                    <div className="text-center py-2">
                        <span className="text-[9px] text-stone-300 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-100">
                            内容由人工智能生成，仅供娱乐与参考
                        </span>
                    </div>
                </div>

                {/* Quick Actions Bar */}
                <div className="px-4 pt-2 bg-white/50 border-t border-stone-100 flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                    {REPORT_ACTIONS.map((action) => (
                        <button
                            key={action.type}
                            onClick={() => handleQuickReport(action)}
                            disabled={isSendingMessage || isGeneratingReport}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-[#F7F7F5] border border-stone-200 rounded-full text-[10px] font-bold text-stone-600 transition-colors disabled:opacity-50"
                        >
                            <DocumentPlusIcon className="w-3 h-3 text-[#B8860B]" />
                            {action.label}
                        </button>
                    ))}

                    <div className="w-[1px] h-4 bg-stone-300 mx-1 flex-shrink-0"></div>

                    <button
                        onClick={() => setShowPayModal(true)}
                        disabled={isSendingMessage || isGeneratingReport}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#1F1F1F] to-[#333] border border-[#1F1F1F] rounded-full text-[10px] font-bold text-[#B8860B] shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                    >
                        <LockClosedIcon className="w-3 h-3" />
                        定制报告 (付费)
                    </button>
                </div>

                {/* Input Area - Fixed bottom for mobile/desktop compatibility */}
                <div className="p-3 bg-gradient-to-t from-white via-white to-transparent z-30 pb-[max(12px,env(safe-area-inset-bottom))]">
                    <div className="relative bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder={messages.length <= 1 ? "请聊聊您的近况..." : `回复${activeProfile?.name || '...'}...`}
                            className="w-full bg-transparent text-stone-800 rounded-2xl pl-4 pr-12 py-3 outline-none resize-none h-12 min-h-[48px] max-h-[120px] transition-all placeholder:text-stone-400 text-sm"
                            disabled={isSendingMessage || isGeneratingReport || !activeProfile}
                        />
                        <button
                            onClick={handleSendClick}
                            disabled={isSendingMessage || isGeneratingReport || !input.trim()}
                            className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square flex items-center justify-center bg-[#1F1F1F] hover:bg-[#333] text-[#B8860B] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <PaperAirplaneIcon className="w-4 h-4 -ml-0.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. PROFILE SWITCHER FAB */}
            <div className="absolute bottom-32 right-4 z-20">
                <AnimatePresence>
                    {showProfileSwitcher && (
                        <MotionDiv
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="absolute bottom-14 right-0 bg-white border border-stone-200 rounded-xl shadow-xl w-48 overflow-hidden mb-2"
                        >
                            <div className="p-2 bg-stone-50 border-b border-stone-100 text-xs font-bold text-stone-500 uppercase tracking-wider">切换咨询对象</div>
                            <div className="max-h-60 overflow-y-auto p-1">
                                {MOCK_PROFILES.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => { setActiveProfile(p); setShowProfileSwitcher(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-serif flex items-center gap-2 hover:bg-stone-50 transition-colors ${activeProfile.id === p.id ? 'bg-[#F7F7F5] text-[#8B0000]' : 'text-stone-700'}`}
                                    >
                                        <span className="w-2 h-2 rounded-full" style={{ background: p.avatarColor }}></span>
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </MotionDiv>
                    )}
                </AnimatePresence>

                <MotionButton
                    onClick={() => setShowProfileSwitcher(!showProfileSwitcher)}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 bg-[#B8860B] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#9A7009] transition-colors ring-4 ring-white"
                    title="更换八字"
                >
                    <ArrowsRightLeftIcon className="w-6 h-6" />
                </MotionButton>
            </div>

            {/* 4. CUSTOM REPORT PAYMENT MODAL */}
            <AnimatePresence>
                {showPayModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowPayModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl border border-stone-200"
                        >
                            <button
                                onClick={() => setShowPayModal(false)}
                                className="absolute right-4 top-4 text-stone-400 hover:text-stone-600"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>

                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-[#1F1F1F] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <LockClosedIcon className="w-8 h-8 text-[#B8860B]" />
                                </div>
                                <h3 className="text-xl font-serif font-bold text-stone-800">定制深度命理报告</h3>
                                <p className="text-stone-500 text-sm mt-1">请描述您想了解的具体方向，AI将为您生成专属报告。</p>
                            </div>

                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 mb-6">
                                <textarea
                                    className="w-full bg-transparent border-none outline-none text-sm resize-none font-serif placeholder:text-stone-400 h-24"
                                    placeholder="例如：我想知道2025年如果跳槽去互联网行业，我的正财运和偏财运如何？是否会影响婚姻？"
                                    value={customReportTopic}
                                    onChange={(e) => setCustomReportTopic(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center justify-between border-t border-stone-100 pt-4">
                                <div className="flex flex-col">
                                    <span className="text-xs text-stone-400 line-through">原价 ¥99.00</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold text-[#8B0000]">¥9.90</span>
                                        <span className="text-xs text-stone-500">限时特惠</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCustomReportPay}
                                    disabled={!customReportTopic.trim() || paymentProcessing}
                                    className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${!customReportTopic.trim() || paymentProcessing
                                        ? 'bg-stone-300 cursor-not-allowed'
                                        : 'bg-[#B8860B] hover:bg-[#9A7009] active:scale-95'
                                        }`}
                                >
                                    {paymentProcessing ? (
                                        <>
                                            <SparklesIcon className="w-4 h-4 animate-spin" />
                                            支付中...
                                        </>
                                    ) : '立即支付并生成'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default OracleChat;

