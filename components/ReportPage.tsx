import React from 'react';
import { motion } from 'framer-motion';
import {
    ChevronLeftIcon,
    DocumentTextIcon,
    ChartBarIcon,
    ArrowDownTrayIcon,
    ShareIcon
} from '@heroicons/react/24/outline';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import { useEffect, useRef } from 'react';
import { DestinyReport } from '../types';
import { toPng } from 'html-to-image';
import ReportPoster from './ReportPoster';

interface ReportPageProps {
    report: DestinyReport | null;
    onBack: () => void;
}

const MotionDiv = motion.div as any;

const ReportPage: React.FC<ReportPageProps> = ({ report, onBack }) => {
    if (!report) return (
        <div className="flex flex-col items-center justify-center p-20 text-stone-400">
            <p>未找到报告内容</p>
            <button onClick={onBack} className="mt-4 text-[#B8860B] underline">返回</button>
        </div>
    );

    const isKLine = report.type === 'K_LINE';
    const markdownRef = useRef<HTMLDivElement>(null);
    const posterRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = React.useState(false);

    useEffect(() => {
        if (report?.content) {
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
                                const id = `report-page-mermaid-${Date.now()}-${i}`;
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
            setTimeout(renderMermaid, 50);
        }
    }, [report?.content, isKLine]);

    const handleDownloadPoster = async () => {
        if (!posterRef.current || isExporting) return;

        setIsExporting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            const dataUrl = await toPng(posterRef.current, {
                quality: 1.0,
                pixelRatio: 2,
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

    return (
        <MotionDiv
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`min-h-screen pb-20 -m-5 lg:-m-10 p-5 lg:p-10 ${isKLine ? 'bg-[#0A0A0A] text-[#F7F7F5]' : 'bg-[#FDFDFB] text-stone-800'
                }`}
        >
            {/* Search Header / Navigation */}
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={onBack}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isKLine ? 'hover:bg-[#1A1A1A] text-stone-400' : 'hover:bg-stone-100 text-stone-600'
                        }`}
                >
                    <ChevronLeftIcon className="w-5 h-5" />
                    <span className="font-bold">返回</span>
                </button>

                <div className="flex items-center gap-2">
                    <button className={`p-2 rounded-xl transition-colors ${isKLine ? 'hover:bg-[#1A1A1A] text-stone-400' : 'hover:bg-stone-100 text-stone-600'}`}>
                        <ShareIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleDownloadPoster}
                        disabled={isExporting}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md ${isKLine ? 'bg-[#B8860B] text-white hover:bg-[#9A7009]' : 'bg-[#1F1F1F] text-white hover:bg-[#333]'
                            }`}
                    >
                        {isExporting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowDownTrayIcon className="w-4 h-4" />}
                        保存长图
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-10">
                {/* Title Section */}
                <div className="text-center space-y-4">
                    <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${isKLine ? 'bg-[#1A1A1A] border border-[#333]' : 'bg-white border border-stone-100'}`}>
                        {isKLine ? <ChartBarIcon className="w-8 h-8 text-[#B8860B]" /> : <DocumentTextIcon className="w-8 h-8 text-[#B8860B]" />}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">{report.title}</h1>
                    <div className="flex items-center justify-center gap-4 text-xs font-mono opacity-50">
                        <span>档案号: {report.id.substring(0, 8).toUpperCase()}</span>
                        <span>|</span>
                        <span>生成日期: {report.date}</span>
                    </div>
                </div>

                {/* Summary Card */}
                <div className={`p-8 rounded-3xl border ${isKLine ? 'bg-[#1A1A1A] border-[#333]' : 'bg-white border-stone-200 shadow-md'
                    }`}>
                    <h2 className={`text-xs font-bold tracking-[0.4em] uppercase mb-6 ${isKLine ? 'text-[#B8860B]' : 'text-[#8B0000]'}`}>
                        核心断语
                    </h2>
                    <p className="text-xl md:text-2xl font-serif leading-relaxed italic opacity-90">
                        {report.summary}
                    </p>
                </div>

                {/* Main Body */}
                <div className="space-y-8">
                    <div className="flex items-center gap-6">
                        <span className="text-xs font-bold tracking-[0.3em] uppercase opacity-40 shrink-0">详批正文</span>
                        <div className={`h-[1px] w-full ${isKLine ? 'bg-[#333]' : 'bg-stone-100'}`}></div>
                    </div>

                    {/* 如果有 HTML 内容，优先渲染 HTML；否则渲染 Markdown */}
                    {report.htmlContent ? (
                        &lt;div 
                            className={`max-w-none font-serif leading-loose ${isKLine ? 'text-[#F7F7F5]' : 'text-stone-800'}`}
                            dangerouslySetInnerHTML={{ __html: report.htmlContent }}
                        /&gt;
                    ) : (
                        &lt;div className={`prose prose-lg max-w-none font-serif leading-loose ${isKLine ? 'prose-invert' : ''}`} ref={markdownRef}&gt;
                            &lt;Markdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                            &gt;
                                {report.content || ""}
                            &lt;/Markdown&gt;
                        &lt;/div&gt;
                    )}
                &lt;/div&gt;

                {/* Tags */}
                <div className="flex flex-wrap gap-2 pt-10 border-t border-stone-100/10">
                    {report.tags.map(tag => (
                        <span key={tag} className={`text-xs px-4 py-2 rounded-full border ${isKLine ? 'border-[#333] bg-[#1A1A1A] text-stone-500' : 'border-stone-100 bg-stone-50 text-stone-400'}`}>
                            #{tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* Hidden Poster */}
            <ReportPoster report={report} posterRef={posterRef} />
        </MotionDiv>
    );
};

export default ReportPage;
