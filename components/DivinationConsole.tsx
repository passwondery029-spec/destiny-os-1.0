
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { consultDiviner } from '../services/geminiService';
import { SparklesIcon, ScaleIcon, ArrowPathIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

type DivinationStep = 'INPUT' | 'RITUAL' | 'ANALYZING' | 'RESULT';

interface DivinationConsoleProps {
    onBack?: () => void;
}

const DivinationConsole: React.FC<DivinationConsoleProps> = ({ onBack }) => {
  const [question, setQuestion] = useState('');
  const [step, setStep] = useState<DivinationStep>('INPUT');
  const [coins, setCoins] = useState<number[]>([0,0,0]); // 0=Yin, 1=Yang representation visual
  const [shakeCount, setShakeCount] = useState(0);
  const [hexagramResult, setHexagramResult] = useState<string[]>([]); // Array of 6 lines (0/1 string representation)
  const [aiAnalysis, setAiAnalysis] = useState('');

  // 1. Start Ritual
  const startRitual = () => {
      if (!question.trim()) return;
      setStep('RITUAL');
      setShakeCount(0);
      setHexagramResult([]);
  };

  // 2. Shake Coins (Simulate 6 lines)
  const shake = () => {
      // Animate coins
      const newCoins = [Math.random() > 0.5 ? 1 : 0, Math.random() > 0.5 ? 1 : 0, Math.random() > 0.5 ? 1 : 0];
      setCoins(newCoins);
      
      const sum = newCoins.reduce((a,b) => a+b, 0);
      const lineCode = sum.toString(); 
      const newResult = [...hexagramResult, lineCode];
      setHexagramResult(newResult);
      setShakeCount(prev => prev + 1);

      if (newResult.length === 6) {
          setTimeout(() => performDivination(newResult), 800);
      }
  };

  // 3. Call AI
  const performDivination = async (lines: string[]) => {
      setStep('ANALYZING');
      const code = lines.join(','); 
      const result = await consultDiviner(question, code);
      setAiAnalysis(result);
      setStep('RESULT');
  };

  const reset = () => {
      setQuestion('');
      setStep('INPUT');
      setShakeCount(0);
      setHexagramResult([]);
      setAiAnalysis('');
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Back Button */}
      {onBack && (
          <button 
            onClick={onBack}
            className="absolute top-4 left-4 z-20 flex items-center gap-1 text-stone-500 hover:text-[#1F1F1F] px-3 py-2 rounded-lg hover:bg-white/50 transition-colors font-serif"
          >
              <ChevronLeftIcon className="w-4 h-4" />
              返回天机
          </button>
      )}

      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border-[50px] border-black rounded-full"></div>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border-[2px] border-black rounded-full"></div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* STEP 1: INPUT */}
        {step === 'INPUT' && (
            <MotionDiv 
                key="input"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-md bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-stone-200 text-center relative z-10"
            >
                <div className="w-16 h-16 bg-[#1F1F1F] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <ScaleIcon className="w-8 h-8 text-[#B8860B]" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-[#1F1F1F] mb-2">断事局</h2>
                <p className="text-stone-500 text-sm mb-6">不问前程，只问吉凶。一事一测，心诚则灵。</p>
                
                <input 
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="请输入具体疑惑（如：这笔投资能成吗？）"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4 text-center text-[#1F1F1F] placeholder:text-stone-400 focus:border-[#1F1F1F] outline-none transition-all mb-6 font-serif"
                    onKeyDown={(e) => e.key === 'Enter' && startRitual()}
                />
                
                <button 
                    onClick={startRitual}
                    disabled={!question.trim()}
                    className="w-full py-4 bg-[#1F1F1F] text-[#B8860B] rounded-xl font-bold tracking-widest hover:bg-[#333] transition-colors disabled:opacity-50 shadow-lg"
                >
                    开 坛
                </button>
            </MotionDiv>
        )}

        {/* STEP 2: RITUAL (SHAKING) */}
        {step === 'RITUAL' && (
            <MotionDiv 
                key="ritual"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center relative z-10"
            >
                <h3 className="text-xl font-serif text-[#1F1F1F] mb-8 animate-pulse">
                    请虔诚摇卦 ({shakeCount}/6)
                </h3>

                <div className="flex gap-4 justify-center mb-12 h-24 items-center">
                    {coins.map((c, i) => (
                        <motion.div 
                            key={i}
                            animate={{ rotateY: [0, 360, 720, c === 1 ? 0 : 180] }}
                            transition={{ duration: 0.6 }}
                            className="w-16 h-16 rounded-full border-4 border-[#B8860B] bg-[#1F1F1F] flex items-center justify-center text-[#B8860B] font-bold text-2xl shadow-lg"
                        >
                            <span className="select-none">{c === 1 ? '字' : '背'}</span>
                        </motion.div>
                    ))}
                </div>

                {/* Hexagram Lines Visualization (Building up) */}
                <div className="flex flex-col-reverse gap-2 items-center mb-8 h-32 justify-end">
                    {hexagramResult.map((line, idx) => {
                        const val = parseInt(line);
                        // Simplified visual: Even sum = Yin (broken), Odd sum = Yang (solid)
                        // This is a simplification for visual feedback only
                        const isYang = val % 2 !== 0; 
                        return (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="w-32 h-3 flex justify-between"
                            >
                                {isYang ? (
                                    <div className="w-full h-full bg-[#1F1F1F] rounded-sm"></div>
                                ) : (
                                    <>
                                        <div className="w-[48%] h-full bg-[#1F1F1F] rounded-sm"></div>
                                        <div className="w-[48%] h-full bg-[#1F1F1F] rounded-sm"></div>
                                    </>
                                )}
                            </motion.div>
                        )
                    })}
                </div>

                <button 
                    onClick={shake}
                    className="px-12 py-4 bg-[#B8860B] text-white rounded-full font-bold shadow-xl active:scale-95 transition-transform"
                >
                    {shakeCount === 6 ? '推演中...' : '摇 卦'}
                </button>
            </MotionDiv>
        )}

        {/* STEP 3: ANALYZING */}
        {step === 'ANALYZING' && (
            <MotionDiv key="analyzing" className="text-center z-10">
                <SparklesIcon className="w-12 h-12 text-[#B8860B] animate-spin mx-auto mb-4" />
                <p className="font-serif text-stone-600">铁口直断正在解析卦象...</p>
            </MotionDiv>
        )}

        {/* STEP 4: RESULT */}
        {step === 'RESULT' && (
             <MotionDiv 
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg bg-[#1F1F1F] text-[#F7F7F5] rounded-2xl shadow-2xl overflow-hidden relative z-10"
             >
                <div className="p-1 bg-gradient-to-r from-[#B8860B] to-yellow-600"></div>
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                        <div>
                            <p className="text-xs text-stone-400 mb-1">所问之事</p>
                            <p className="text-lg font-bold tracking-wide">{question}</p>
                        </div>
                        <div className="text-right">
                             <div className="text-3xl font-serif font-bold text-[#B8860B]">
                                 {aiAnalysis.includes('吉') ? '吉' : aiAnalysis.includes('凶') ? '凶' : '平'}
                             </div>
                        </div>
                    </div>
                    
                    <div className="prose prose-invert prose-sm max-w-none font-serif leading-relaxed">
                        {/* Render AI Markdown Response nicely */}
                        {aiAnalysis.split('\n').map((line, i) => (
                             <p key={i} className={`mb-2 ${line.startsWith('##') ? 'text-[#B8860B] font-bold text-lg mt-4' : ''}`}>
                                 {line.replace(/##/g, '').replace(/\*\*/g, '')}
                             </p>
                        ))}
                    </div>
                    
                    <button 
                        onClick={reset}
                        className="mt-8 w-full py-3 border border-stone-600 rounded-xl text-stone-400 hover:text-white hover:border-white transition-colors flex items-center justify-center gap-2"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                        再测一事
                    </button>
                </div>
             </MotionDiv>
        )}

      </AnimatePresence>
    </div>
  );
};

export default DivinationConsole;
