
import React, { useState, useEffect } from 'react';
import { useUserData } from '../contexts/UserDataContext';
import { v4 as uuidv4 } from 'uuid';
import { Memory, DestinyReport, UserProfile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import ReportDetailModal from './ReportDetailModal';
import {
    TrashIcon, TagIcon, DocumentTextIcon, ChartBarIcon,
    ArrowTopRightOnSquareIcon, ChevronDownIcon, ChevronUpIcon,
    PlusIcon, UserIcon, PencilSquareIcon, XMarkIcon,
    CalendarDaysIcon, ClockIcon, InformationCircleIcon
} from '@heroicons/react/24/outline';

interface LifeDatabaseProps {
    onViewReport?: (report: DestinyReport) => void;
}

const MotionDiv = motion.div as any;

const LifeDatabase: React.FC<LifeDatabaseProps> = ({ onViewReport }) => {
    // 从 Context 获取数据
    const { 
        memories, 
        reports, 
        profiles,
        deleteMemory,
        addMemory,
        deleteReport,
        updateProfile,
        addProfile
    } = useUserData();
    
    const [activeTab, setActiveTab] = useState<'MEMORIES' | 'REPORTS'>('MEMORIES');

    // Profile State
    const [selectedProfileId, setSelectedProfileId] = useState<string>('self');
    const [isOthersExpanded, setIsOthersExpanded] = useState(false);

    // Profile Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'EDIT' | 'ADD'>('EDIT');

    // Edit Form State
    const [editForm, setEditForm] = useState<Partial<UserProfile>>({});

    // Add Memory State
    const [isAddMemoryModalOpen, setIsAddMemoryModalOpen] = useState(false);
    const [newMemoryContent, setNewMemoryContent] = useState('');
    const [newMemoryCategory, setNewMemoryCategory] = useState<Memory['category']>('FACT');

    // Derived Data
    const displayProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];

    // Safety Guard
    if (!displayProfile) {
        return <div className="flex items-center justify-center min-h-screen text-stone-400">Loading User Profile...</div>;
    }

    const listProfiles = profiles.filter(p => p.id !== displayProfile.id);

    const filteredMemories = memories.filter(m => (m.profileId || 'self') === displayProfile.id);
    const filteredReports = reports.filter(r => (r.profileId || 'self') === displayProfile.id);

    const handleDeleteMemory = async (id: string) => {
        await deleteMemory(id);
    };

    const handleAddMemory = async () => {
        if (!newMemoryContent.trim()) return;

        await addMemory(newMemoryContent, newMemoryCategory, displayProfile.id);

        // Reset and close
        setNewMemoryContent('');
        setNewMemoryCategory('FACT');
        setIsAddMemoryModalOpen(false);
    };

    const handleDeleteReport = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('确定要销毁这份珍贵的命理报告吗？')) {
            await deleteReport(id);
        }
    }

    const handleViewReport = (e: React.MouseEvent, report: DestinyReport) => {
        e.stopPropagation();
        if (onViewReport) {
            onViewReport(report);
        }
    };

    const openEditModal = () => {
        setModalMode('EDIT');
        setEditForm({ ...displayProfile });
        setIsEditModalOpen(true);
    };

    const openAddModal = () => {
        setModalMode('ADD');
        setEditForm({
            name: '',
            gender: 'MALE',
            relation: 'FRIEND',
            birthDate: '1990-01-01',
            birthTime: '12:00',
            avatarColor: '#8B0000',
            phone: '',
            email: ''
        });
        setIsEditModalOpen(true);
        setIsOthersExpanded(false);
    };

    const handleSaveProfile = async () => {
        if (modalMode === 'EDIT' && displayProfile && editForm) {
            await updateProfile(displayProfile.id, editForm);
        } else if (modalMode === 'ADD' && editForm.name && editForm.birthDate) {
            const newProfile: UserProfile = {
                id: uuidv4(),
                name: editForm.name,
                gender: editForm.gender as 'MALE' | 'FEMALE',
                relation: editForm.relation as any,
                birthDate: editForm.birthDate,
                birthTime: editForm.birthTime || '12:00',
                avatarColor: editForm.avatarColor || '#8B0000',
                phone: editForm.phone,
                email: editForm.email,
            };
            await addProfile(newProfile);
            setSelectedProfileId(newProfile.id); // Switch to the newly created profile
        }
        setIsEditModalOpen(false);
    };

    const getCategoryLabel = (cat: string) => {
        switch (cat) {
            case 'FACT': return '事实';
            case 'EMOTION': return '情绪';
            case 'EVENT': return '事件';
            case 'PREDICTION': return '预言';
            default: return '其他';
        }
    }

    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case 'FACT': return 'text-sky-700 border-sky-200 bg-sky-50';
            case 'EMOTION': return 'text-purple-700 border-purple-200 bg-purple-50';
            case 'EVENT': return 'text-emerald-700 border-emerald-200 bg-emerald-50';
            default: return 'text-stone-600 border-stone-200 bg-stone-50';
        }
    };

    return (
        <div className="space-y-6 min-h-screen pb-10">
            <header className="sticky top-0 z-20 bg-[#F7F7F5]/90 backdrop-blur-sm py-2 border-b border-stone-200/50">
                <div className="flex items-end justify-between mb-4">
                    <div>
                        <h2 className="text-3xl font-serif font-bold text-[#1F1F1F] mb-1">档案库</h2>
                        <p className="text-stone-500 text-sm max-w-lg font-serif">
                            管理您的本命元辰及因果档案。
                        </p>
                    </div>
                    {/* TAB SWITCHER */}
                    <div className="flex bg-stone-200/50 p-1.5 rounded-xl shrink-0 self-start md:self-end">
                        <button
                            onClick={() => setActiveTab('MEMORIES')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all font-serif ${activeTab === 'MEMORIES' ? 'bg-white shadow-sm text-[#8B0000]' : 'text-stone-500 hover:text-stone-700'}`}
                        >
                            碎片记忆
                        </button>
                        <button
                            onClick={() => setActiveTab('REPORTS')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all font-serif ${activeTab === 'REPORTS' ? 'bg-white shadow-sm text-[#8B0000]' : 'text-stone-500 hover:text-stone-700'}`}
                        >
                            深度报告
                        </button>
                    </div>
                </div>

                {/* COMPLIANCE WARNING */}
                <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100 text-[10px] text-amber-800 mb-2">
                    <InformationCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>档案中包含的预测性内容仅供娱乐参考，请勿沉迷。</p>
                </div>
            </header>

            {/* PROFILE SECTION */}
            <section className="space-y-4">
                {/* 1. ACTIVE PROFILE CARD (With Edit Button) */}
                <div className="bg-[#1F1F1F] text-[#F7F7F5] p-5 rounded-2xl shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 opacity-10 font-calligraphy text-9xl pointer-events-none select-none -translate-y-4 translate-x-4">
                        命
                    </div>

                    <div className="flex flex-col md:flex-row items-start gap-5 relative z-10">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div
                                className="w-16 h-16 rounded-full border-2 border-[#B8860B] flex items-center justify-center text-xl font-serif bg-[#2a2a2a] shadow-inner transition-transform"
                                style={{ borderColor: displayProfile.id === 'self' ? '#B8860B' : displayProfile.avatarColor }}
                            >
                                {displayProfile.name ? displayProfile.name[0] : '?'}
                            </div>
                            <div className="md:hidden flex-1">
                                <h3 className="text-lg font-bold tracking-wide">{displayProfile.name}</h3>
                                <p className="text-stone-400 text-xs">{displayProfile.birthDate}</p>
                            </div>
                            {/* Mobile Edit Button */}
                            <button
                                onClick={openEditModal}
                                className="md:hidden p-2 bg-white/10 rounded-full text-[#B8860B]"
                            >
                                <PencilSquareIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 w-full">
                            <div className="hidden md:flex items-center justify-between mb-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold tracking-wide">{displayProfile.name}</h3>
                                    <span className={`text-[10px] px-2 py-0.5 border rounded-full ${displayProfile.id === 'self' ? 'border-[#B8860B] text-[#B8860B]' : 'border-stone-500 text-stone-400'}`}>
                                        {displayProfile.relation === 'SELF' ? '求道者' :
                                            displayProfile.relation === 'FAMILY' ? '家眷' : '贵客'}
                                    </span>
                                    <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full">
                                        {displayProfile.gender === 'MALE' ? '乾造 (男)' : '坤造 (女)'}
                                    </span>
                                </div>
                                <button
                                    onClick={openEditModal}
                                    className="flex items-center gap-1 text-xs text-[#B8860B] hover:text-[#9A7009] transition-colors"
                                >
                                    <PencilSquareIcon className="w-4 h-4" />
                                    修改排盘
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-stone-300 font-mono mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-stone-500">生辰:</span>
                                    {displayProfile.birthDate} | {displayProfile.birthTime}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-stone-500">手机:</span>
                                    {displayProfile.phone || '未录入'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-stone-500">八字:</span>
                                    <span className="text-[#B8860B] font-serif">{displayProfile.bazi || '暂缺'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-stone-500">邮箱:</span>
                                    {displayProfile.email || '未录入'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. PROFILE SWITCHER (Removed Auth Section) */}
                <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                    <div
                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-stone-50 transition-colors"
                        onClick={() => setIsOthersExpanded(!isOthersExpanded)}
                    >
                        <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-stone-700 text-sm">切换档案</span>
                            <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                                {listProfiles.length}个其他档案
                            </span>
                        </div>
                        <div className="text-stone-400">
                            {isOthersExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                        </div>
                    </div>

                    <AnimatePresence>
                        {isOthersExpanded && (
                            <MotionDiv
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-stone-100 bg-stone-50/50"
                            >
                                {listProfiles.map((profile) => (
                                    <button
                                        key={profile.id}
                                        onClick={() => {
                                            setSelectedProfileId(profile.id);
                                            setIsOthersExpanded(false);
                                        }}
                                        className="w-full text-left p-3 border-b border-stone-100 last:border-0 flex items-center justify-between hover:bg-white transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-serif shadow-sm group-hover:scale-110 transition-transform" style={{ backgroundColor: profile.avatarColor }}>
                                                {profile.name[0]}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-stone-800">{profile.name}</p>
                                                    <span className="text-[8px] border border-stone-200 px-1 rounded text-stone-400">
                                                        {profile.gender === 'MALE' ? '男' : '女'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-stone-400 font-mono">
                                                    {profile.birthDate}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            查看 <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                                        </span>
                                    </button>
                                ))}
                                <button
                                    onClick={openAddModal}
                                    className="w-full py-2 text-center text-xs text-[#B8860B] hover:bg-[#B8860B]/5 font-medium transition-colors border-t border-stone-100 flex items-center justify-center gap-1"
                                >
                                    <PlusIcon className="w-3 h-3" />
                                    添加新档案
                                </button>
                            </MotionDiv>
                        )}
                    </AnimatePresence>
                </div>
            </section>

            <hr className="border-stone-200" />

            {/* CONTENT SECTIONS */}
            <AnimatePresence mode="wait">
                {activeTab === 'MEMORIES' ? (
                    <MotionDiv
                        key={`memories-container-${selectedProfileId}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                        {filteredMemories.map((memory) => (
                            <div
                                key={memory.id}
                                className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-[#B8860B]/30 transition-all group relative flex flex-col"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`text-[10px] px-2 py-1 rounded font-bold tracking-wider border ${getCategoryColor(memory.category)}`}>
                                        {getCategoryLabel(memory.category)}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteMemory(memory.id)}
                                        className="text-stone-300 hover:text-[#8B0000] transition-colors p-1"
                                        title="删除此条记忆"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-stone-700 text-sm leading-relaxed font-serif flex-1">
                                    {memory.content}
                                </p>
                                <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                                    <span className="flex items-center gap-1" title="AI置信度">
                                        <TagIcon className="w-3 h-3" />
                                        {Math.round(memory.confidence * 100)}%
                                    </span>
                                    <span>
                                        {new Date(memory.timestamp).toLocaleDateString('zh-CN')}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {/* Add Memory Button */}
                        <button
                            className="bg-stone-50 border border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center p-6 text-stone-400 hover:text-[#B8860B] hover:border-[#B8860B] hover:bg-[#B8860B]/5 transition-all min-h-[160px]"
                            onClick={() => setIsAddMemoryModalOpen(true)}
                        >
                            <PlusIcon className="w-8 h-8 mb-2" />
                            <span className="text-sm font-bold">录入新记忆</span>
                            <span className="text-[10px] mt-1">手动添加事实或事件</span>
                        </button>
                    </MotionDiv>
                ) : (
                    <MotionDiv
                        key={`reports-container-${selectedProfileId}`}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 gap-6"
                    >
                        {filteredReports.map((report) => (
                            <div
                                key={report.id}
                                className={`relative overflow-hidden rounded-2xl border transition-all cursor-pointer group ${report.type === 'K_LINE'
                                    ? 'bg-[#1F1F1F] text-[#F7F7F5] border-[#333] shadow-lg'
                                    : 'bg-white text-stone-800 border-stone-200 shadow-sm hover:border-[#B8860B]/30'
                                    }`}
                            >
                                {/* Visual Background for K-Line reports */}
                                {report.type === 'K_LINE' && (
                                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                                        <svg width="100%" height="100%" preserveAspectRatio="none">
                                            <path d="M0,100 C150,50 250,120 400,60 L400,200 L0,200 Z" fill="url(#grad1)" />
                                            <defs>
                                                <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                                                    <stop offset="0%" style={{ stopColor: '#B8860B', stopOpacity: 1 }} />
                                                    <stop offset="100%" style={{ stopColor: '#1F1F1F', stopOpacity: 1 }} />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                    </div>
                                )}
                                <div className="flex flex-col md:flex-row h-full relative z-10">
                                    <div className={`w-full md:w-2 ${report.type === 'K_LINE' ? 'bg-[#B8860B]' : 'bg-stone-200 group-hover:bg-[#B8860B] transition-colors'}`}></div>
                                    <div className="p-6 flex-1 flex flex-col justify-center">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                {report.type === 'K_LINE' ? <ChartBarIcon className="w-5 h-5 text-[#B8860B]" /> : <DocumentTextIcon className="w-5 h-5 text-[#B8860B]" />}
                                                <span className={`text-xs font-bold tracking-[0.2em] uppercase ${report.type === 'K_LINE' ? 'text-stone-400' : 'text-[#8B0000]'}`}>
                                                    {report.type === 'K_LINE' ? '全息图表' : '深度命书'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-mono ${report.type === 'K_LINE' ? 'text-stone-500' : 'text-stone-400'}`}>
                                                    {report.date}
                                                </span>
                                                <button onClick={(e) => handleDeleteReport(e, report.id)} className="text-stone-300 hover:text-red-500 p-1">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className={`text-2xl font-serif font-bold mb-2 ${report.type === 'K_LINE' ? 'text-[#F7F7F5]' : 'text-[#1F1F1F]'}`}>{report.title}</h3>
                                        <p className={`text-sm leading-relaxed mb-4 line-clamp-2 ${report.type === 'K_LINE' ? 'text-stone-400' : 'text-stone-600'}`}>{report.summary}</p>

                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex gap-2">
                                                {report.tags.map(tag => (
                                                    <span key={tag} className={`text-[10px] px-2 py-1 rounded-md border ${report.type === 'K_LINE'
                                                        ? 'border-stone-700 bg-stone-800 text-stone-300'
                                                        : 'border-stone-100 bg-stone-50 text-stone-500'
                                                        }`}>
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <button
                                                onClick={(e) => handleViewReport(e, report)}
                                                className={`flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity ${report.type === 'K_LINE' ? 'text-[#B8860B]' : 'text-[#8B0000]'}`}
                                            >
                                                <span>查看详情</span>
                                                <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </MotionDiv>
                )}
            </AnimatePresence>

            {/* ADD MEMORY MODAL */}
            <AnimatePresence>
                {isAddMemoryModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <MotionDiv
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsAddMemoryModalOpen(false)}
                        />
                        <MotionDiv
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl w-full max-w-lg p-6 relative z-10 shadow-2xl border border-stone-200 flex flex-col"
                        >
                            <button
                                onClick={() => setIsAddMemoryModalOpen(false)}
                                className="absolute right-4 top-4 text-stone-400 hover:text-stone-600"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>

                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-[#1F1F1F] rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                                    <PlusIcon className="w-8 h-8 text-[#B8860B]" />
                                </div>
                                <h3 className="text-xl font-serif font-bold text-stone-800">录入新记忆</h3>
                                <p className="text-stone-500 text-xs mt-1">手动添加事实、情绪或事件，丰富您的档案库</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-stone-500">记忆内容</label>
                                    <textarea
                                        value={newMemoryContent}
                                        onChange={e => setNewMemoryContent(e.target.value)}
                                        placeholder="例如：今天换了一份新工作，感觉很有挑战性..."
                                        className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-sm focus:border-[#B8860B] outline-none min-h-[120px] resize-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-stone-500">分类</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {(['FACT', 'EMOTION', 'EVENT', 'PREDICTION'] as const).map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setNewMemoryCategory(cat)}
                                                className={`py-2 text-xs rounded-lg transition-colors border ${newMemoryCategory === cat
                                                    ? 'bg-[#1F1F1F] text-[#B8860B] border-[#1F1F1F]'
                                                    : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
                                                    }`}
                                            >
                                                {getCategoryLabel(cat)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => setIsAddMemoryModalOpen(false)}
                                    className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleAddMemory}
                                    disabled={!newMemoryContent.trim()}
                                    className="flex-[2] py-3 bg-[#1F1F1F] text-[#F7F7F5] rounded-xl font-bold hover:bg-[#333] shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    保存记忆
                                </button>
                            </div>
                        </MotionDiv>
                    </div>
                )}
            </AnimatePresence>

            {/* PAIPAN (EDIT/ADD) MODAL */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <MotionDiv
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsEditModalOpen(false)}
                        />
                        <MotionDiv
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl w-full max-w-lg p-6 relative z-10 shadow-2xl border border-stone-200 flex flex-col max-h-[90vh] overflow-y-auto"
                        >
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="absolute right-4 top-4 text-stone-400 hover:text-stone-600"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>

                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-[#1F1F1F] rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                                    <span className="text-[#B8860B] font-serif text-2xl font-bold">盘</span>
                                </div>
                                <h3 className="text-xl font-serif font-bold text-stone-800">
                                    {modalMode === 'EDIT' ? '八字排盘修正' : '新建命理档案'}
                                </h3>
                                <p className="text-stone-500 text-xs mt-1">
                                    {modalMode === 'EDIT' ? '修改生辰将自动重新推演八字' : '输入生辰信息，系统将自动推演八字'}
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* Name & Gender */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-stone-500">称呼 / 姓名</label>
                                        <input
                                            type="text"
                                            value={editForm.name || ''}
                                            onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-sm focus:border-[#B8860B] outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-stone-500">造化 (性别)</label>
                                        <div className="flex bg-stone-50 rounded-lg p-1 border border-stone-200">
                                            <button
                                                onClick={() => setEditForm(prev => ({ ...prev, gender: 'MALE' }))}
                                                className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${editForm.gender === 'MALE' ? 'bg-[#1F1F1F] text-[#B8860B]' : 'text-stone-400'}`}
                                            >乾 (男)</button>
                                            <button
                                                onClick={() => setEditForm(prev => ({ ...prev, gender: 'FEMALE' }))}
                                                className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${editForm.gender === 'FEMALE' ? 'bg-[#1F1F1F] text-[#B8860B]' : 'text-stone-400'}`}
                                            >坤 (女)</button>
                                        </div>
                                    </div>
                                </div>

                                {/* Relation (Only for ADD) */}
                                {modalMode === 'ADD' && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-stone-500">关系</label>
                                        <select
                                            value={editForm.relation || 'FRIEND'}
                                            onChange={e => setEditForm(prev => ({ ...prev, relation: e.target.value as any }))}
                                            className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-sm focus:border-[#B8860B] outline-none"
                                        >
                                            <option value="FAMILY">家眷 (亲属)</option>
                                            <option value="FRIEND">知己 (朋友)</option>
                                            <option value="CLIENT">贵客 (客户)</option>
                                        </select>
                                    </div>
                                )}

                                {/* Birth Date & Time */}
                                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                                    <div className="flex items-center gap-2 text-[#B8860B] text-xs font-bold uppercase tracking-wider">
                                        <CalendarDaysIcon className="w-4 h-4" />
                                        <span>生辰八字核心数据</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs text-stone-500">公历日期</label>
                                            <input
                                                type="date"
                                                value={editForm.birthDate || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, birthDate: e.target.value }))}
                                                className="w-full bg-white border border-stone-200 rounded-lg p-2 text-sm outline-none focus:border-[#B8860B]"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-stone-500">出生时辰</label>
                                            <input
                                                type="time"
                                                value={editForm.birthTime || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, birthTime: e.target.value }))}
                                                className="w-full bg-white border border-stone-200 rounded-lg p-2 text-sm outline-none focus:border-[#B8860B]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Info (Optional) */}
                                <div className="space-y-3 pt-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-stone-500">手机号码 (选填)</label>
                                        <input
                                            type="tel"
                                            value={editForm.phone || ''}
                                            onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="暂未录入"
                                            className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-sm focus:border-[#B8860B] outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-stone-500">电子邮箱 (选填)</label>
                                        <input
                                            type="email"
                                            value={editForm.email || ''}
                                            onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="暂未录入"
                                            className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-sm focus:border-[#B8860B] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={!editForm.name || !editForm.birthDate}
                                    className="flex-[2] py-3 bg-[#1F1F1F] text-[#F7F7F5] rounded-xl font-bold hover:bg-[#333] shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <PencilSquareIcon className="w-4 h-4" />
                                    {modalMode === 'EDIT' ? '重新排盘并保存' : '创建档案并排盘'}
                                </button>
                            </div>
                        </MotionDiv>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LifeDatabase;
