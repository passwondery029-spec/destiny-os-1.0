import React, { useState } from 'react';
import { MOCK_PROFILES } from '../services/mockDataService';
import { motion, AnimatePresence } from 'framer-motion';
import { Cog6ToothIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

const MotionButton = motion.button as any;
const MotionSpan = motion.span as any;
const MotionDiv = motion.div as any;

const Wellness: React.FC = () => {
  // WOODEN FISH STATE
  const [count, setCount] = useState(0);
  const [ripples, setRipples] = useState<{id: number, x: number, y: number}[]>([]);
  
  // PROFILE STATE
  const [isOthersExpanded, setIsOthersExpanded] = useState(false);

  // Separate Self from Others
  const selfProfile = MOCK_PROFILES.find(p => p.relation === 'SELF');
  const otherProfiles = MOCK_PROFILES.filter(p => p.relation !== 'SELF');

  const handleFishClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setCount(c => c + 1);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newRipple = { id: Date.now(), x, y };
    setRipples(prev => [...prev, newRipple]);
    setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 1000);
  };

  return (
    <div className="space-y-10 pb-20">
      
      {/* 1. PERSONAL CENTER - SELF (Main Card) */}
      <section>
          <header className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold text-[#1F1F1F]">本命元辰</h2>
              <button className="p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600">
                  <Cog6ToothIcon className="w-5 h-5" />
              </button>
          </header>
          
          {selfProfile && (
              <div className="bg-[#1F1F1F] text-[#F7F7F5] p-6 rounded-2xl shadow-lg relative overflow-hidden group">
                  <div className="absolute right-0 top-0 opacity-10 font-calligraphy text-9xl pointer-events-none select-none -translate-y-4 translate-x-4">
                      命
                  </div>
                  
                  <div className="flex items-start gap-5 relative z-10">
                      <div className="w-16 h-16 rounded-full border-2 border-[#B8860B] flex items-center justify-center text-2xl font-serif bg-[#2a2a2a] shadow-inner">
                          {selfProfile.name[0]}
                      </div>
                      <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-xl font-bold tracking-wide">{selfProfile.name}</h3>
                              <span className="text-[10px] px-2 py-0.5 border border-[#B8860B] text-[#B8860B] rounded-full">求道者</span>
                          </div>
                          <p className="text-stone-400 text-xs font-mono mb-4">
                              {selfProfile.birthDate} | {selfProfile.birthTime}
                          </p>
                          
                          <div className="bg-[#2a2a2a] rounded-lg p-3 border border-stone-700/50">
                              <span className="text-xs text-stone-500 block mb-1">八字排盘</span>
                              <p className="text-[#B8860B] font-serif text-lg tracking-widest">
                                  {selfProfile.bazi}
                              </p>
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </section>

      {/* 2. RELATIONS (Merged/Collapsed) */}
      <section>
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-stone-50 transition-colors"
                onClick={() => setIsOthersExpanded(!isOthersExpanded)}
              >
                  <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-stone-800">眷属档案</span>
                      <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                          {otherProfiles.length}人
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
                          {otherProfiles.map((profile) => (
                              <div key={profile.id} className="p-4 border-b border-stone-100 last:border-0 flex items-center justify-between hover:bg-white transition-colors">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-serif shadow-sm" style={{backgroundColor: profile.avatarColor}}>
                                          {profile.name[0]}
                                      </div>
                                      <div>
                                          <p className="text-sm font-bold text-stone-800">{profile.name}</p>
                                          <p className="text-[10px] text-stone-400 font-mono">{profile.bazi ? profile.bazi.split(' ').slice(0,2).join(' ') + '...' : '八字未录入'}</p>
                                      </div>
                                  </div>
                                  <span className="text-xs text-stone-500 bg-white border border-stone-200 px-2 py-1 rounded">
                                      {profile.relation === 'FAMILY' ? '家人' : '客户'}
                                  </span>
                              </div>
                          ))}
                          <button className="w-full py-3 text-center text-xs text-[#B8860B] hover:bg-[#B8860B]/5 font-medium transition-colors border-t border-stone-100">
                              + 添加新档案
                          </button>
                      </MotionDiv>
                  )}
              </AnimatePresence>
          </div>
      </section>

      {/* 3. CULTIVATION (WOODEN FISH) SECTION */}
      <section className="flex flex-col items-center justify-center space-y-6 pt-6 border-t border-dashed border-stone-200">
        <div className="text-center space-y-1">
            <h2 className="text-xl font-serif font-bold text-[#1F1F1F]">每日修心</h2>
            <p className="text-xs text-stone-500 font-serif">轻触木鱼，积累赛博功德</p>
        </div>

        <div className="relative">
            <MotionButton
                whileTap={{ scale: 0.95 }}
                onClick={handleFishClick}
                className="w-40 h-40 rounded-full bg-gradient-to-br from-[#2c2c2c] to-[#000] border-4 border-stone-200 shadow-xl relative overflow-hidden group outline-none ring-1 ring-stone-300"
            >
                {/* Center Icon */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-20 h-20 text-[#B8860B] opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-lg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z"/>
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
            
            {/* Floating Merits */}
            <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 h-16 w-full flex justify-center pointer-events-none">
                {ripples.map(r => (
                    <MotionDiv
                        key={'text-' + r.id}
                        initial={{ y: 20, opacity: 1 }}
                        animate={{ y: -60, opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute text-[#8B0000] font-serif font-bold text-2xl"
                    >
                        功德 +1
                    </MotionDiv>
                ))}
            </div>
        </div>

        <div className="bg-white px-6 py-2 rounded-full border border-stone-200 shadow-sm flex items-center gap-3">
            <span className="text-stone-400 uppercase tracking-widest text-[10px] font-serif">当前功德</span>
            <div className="h-4 w-[1px] bg-stone-300"></div>
            <span className="text-xl font-serif text-[#B8860B] font-bold tabular-nums">{count}</span>
        </div>
      </section>
    </div>
  );
};

export default Wellness;