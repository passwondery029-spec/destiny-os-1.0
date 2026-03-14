import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, DocumentTextIcon, ChartBarIcon, ArrowDownTrayIcon, ShareIcon } from '@heroicons/react/24/outline';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import { useEffect, useRef } from 'react';
import { DestinyReport } from '../types';
import { toPng } from 'html-to-image';
import ReportPoster from './ReportPoster';

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DestinyReport | null;
}

const MotionDiv = motion.div as any;

const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ isOpen, onClose, report }) => {
  if (!report) return null;

  const isKLine = report.type === 'K_LINE';
  const markdownRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const handleDownloadPoster = async () => {
    if (!posterRef.current || isExporting) return;

    setIsExporting(true);
    try {
      // Small delay to ensure any dynamic charts in the poster are ready
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await toPng(posterRef.current, {
        quality: 1.0,
        pixelRatio: 2, // Higher resolution
        backgroundColor: isKLine ? '#0A0A0A' : '#FDFDFB',
        skipAutoScale: true,
      });

      const link = document.createElement('a');
      link.download = `Destiny-Report-${report.title.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('图片导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (isOpen && report?.content) {
      mermaid.initialize({ startOnLoad: false, theme: isKLine ? 'dark' : 'default' });
      const renderMermaid = async () => {
        if (markdownRef.current) {
          const mNodes = markdownRef.current.querySelectorAll('.language-mermaid');
          for (let i = 0; i < mNodes.length; i++) {
            const node = mNodes[i];
            const parent = node.parentElement;
            if (parent && parent.tagName === 'PRE') {
              const code = node.textContent || '';
              try {
                const id = `mermaid-${Date.now()}-${i}`;
                const { svg } = await mermaid.render(id, code);
                parent.innerHTML = svg;
                parent.classList.add('flex', 'justify-center', 'my-6');
                parent.style.backgroundColor = 'transparent';
              } catch (e) {
                console.error("Mermaid parsing failed", e);
              }
            }
          }
        }
      };
      // slight delay to let react-markdown render DOM first
      setTimeout(renderMermaid, 50);
    }
  }, [isOpen, report?.content, isKLine]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <MotionDiv
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={`relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border ${isKLine ? 'bg-[#1F1F1F] border-[#333] text-[#F7F7F5]' : 'bg-[#FDFDFB] border-stone-200 text-stone-800'
              }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-6 border-b ${isKLine ? 'border-[#333]' : 'border-stone-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isKLine ? 'bg-[#2a2a2a]' : 'bg-stone-100'}`}>
                  {isKLine ? <ChartBarIcon className="w-6 h-6 text-[#B8860B]" /> : <DocumentTextIcon className="w-6 h-6 text-[#B8860B]" />}
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold">{report.title}</h2>
                  <p className={`text-xs font-mono mt-1 ${isKLine ? 'text-stone-400' : 'text-stone-500'}`}>
                    生成日期: {report.date}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-colors ${isKLine ? 'hover:bg-[#333] text-stone-400' : 'hover:bg-stone-100 text-stone-500'}`}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">

              {/* Summary Section */}
              <div className={`p-5 rounded-2xl border ${isKLine ? 'bg-[#2a2a2a] border-[#444]' : 'bg-white border-stone-200 shadow-sm'}`}>
                <h3 className={`text-sm font-bold tracking-widest uppercase mb-3 ${isKLine ? 'text-[#B8860B]' : 'text-[#8B0000]'}`}>
                  核心断语
                </h3>
                <p className={`text-base leading-relaxed font-serif ${isKLine ? 'text-stone-300' : 'text-stone-700'}`}>
                  {report.summary}
                </p>
              </div>

              {/* Detailed Content Placeholder (Since we don't have full content in DB yet) */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`h-[1px] flex-1 ${isKLine ? 'bg-[#333]' : 'bg-stone-200'}`}></div>
                  <span className={`text-xs font-bold tracking-[0.2em] uppercase ${isKLine ? 'text-stone-500' : 'text-stone-400'}`}>
                    详批正文
                  </span>
                  <div className={`h-[1px] flex-1 ${isKLine ? 'bg-[#333]' : 'bg-stone-200'}`}></div>
                </div>

                <div className={`prose prose-sm md:prose-base max-w-none font-serif leading-loose ${isKLine ? 'prose-invert prose-p:text-stone-300' : 'prose-p:text-stone-700'}`}>
                  {report.content ? (
                    <div className="markdown-body" ref={markdownRef}>
                      <Markdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                      >
                        {report.content}
                      </Markdown>
                    </div>
                  ) : (
                    <>
                      <p>
                        夫天地造化，阴阳流转。观阁下之命局，五行禀赋各有偏枯。此报告基于您的本命元辰与近期因果数据，经由天机阁核心算法推演而成。
                      </p>
                      <p>
                        <strong>【近期运势起伏】</strong><br />
                        近期星象显示，您的能量场正处于一个关键的转换期。木火相生之势渐强，意味着在事业或人际关系上将迎来新的机遇。然而，水气偏弱，需防范情绪上的焦虑与不安。建议您在做重大决策前，多听取长辈或专业人士的意见，切勿盲目冲动。
                      </p>
                      <p>
                        <strong>【关键转折点预警】</strong><br />
                        推演结果表明，在接下来的三个月内，您可能会面临一次重要的选择。这可能涉及到职业路径的变更或一段重要关系的走向。请保持内心的平静，倾听直觉的指引。
                      </p>
                      <p>
                        <strong>【化解与调理建议】</strong><br />
                        1. <strong>五行补益：</strong> 建议多接触水属性的事物，如佩戴黑曜石、多喝水、或在居室北方放置水景。<br />
                        2. <strong>行为风水：</strong> 每日清晨进行十分钟的静坐冥想，有助于稳定心神，提升决策的清晰度。<br />
                        3. <strong>因果积淀：</strong> 多行善举，积累福报，可有效化解潜在的阻碍。
                      </p>
                      <p className="text-center italic opacity-60 mt-8">
                        （注：此为系统生成的深度推演报告，天机深邃，仅供参考。命运之笔，终握于您自己手中。）
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 pt-4">
                {report.tags.map(tag => (
                  <span
                    key={tag}
                    className={`text-xs px-3 py-1.5 rounded-lg border ${isKLine
                      ? 'border-[#444] bg-[#2a2a2a] text-stone-400'
                      : 'border-stone-200 bg-stone-50 text-stone-500'
                      }`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className={`p-4 md:p-6 border-t flex items-center justify-end gap-3 ${isKLine ? 'border-[#333] bg-[#1a1a1a]' : 'border-stone-200 bg-stone-50'}`}>
              <button className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${isKLine ? 'text-stone-400 hover:bg-[#333]' : 'text-stone-600 hover:bg-stone-200'
                }`}>
                <ShareIcon className="w-4 h-4" />
                分享
              </button>
              <button
                onClick={handleDownloadPoster}
                disabled={isExporting}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-50 ${isKLine ? 'bg-[#B8860B] text-white hover:bg-[#9A7009]' : 'bg-[#1F1F1F] text-white hover:bg-[#333]'
                  }`}
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    保存为长图
                  </>
                )}
              </button>
            </div>

            {/* Hidden Poster for Rendering */}
            <ReportPoster report={report} posterRef={posterRef} />
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReportDetailModal;
