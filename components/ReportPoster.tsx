import React, { useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import { DestinyReport } from '../types';

interface ReportPosterProps {
    report: DestinyReport;
    posterRef: React.RefObject<HTMLDivElement>;
}

const ReportPoster: React.FC<ReportPosterProps> = ({ report, posterRef }) => {
    const isKLine = report.type === 'K_LINE';
    const mermaidRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (report?.content) {
            mermaid.initialize({
                startOnLoad: false,
                theme: isKLine ? 'dark' : 'default',
                securityLevel: 'loose'
            });

            const renderMermaid = async () => {
                if (mermaidRef.current) {
                    const mNodes = mermaidRef.current.querySelectorAll('.language-mermaid');
                    for (let i = 0; i < mNodes.length; i++) {
                        const node = mNodes[i];
                        const parent = node.parentElement;
                        if (parent && parent.tagName === 'PRE') {
                            const code = node.textContent || '';
                            try {
                                const id = `poster-mermaid-${Date.now()}-${i}`;
                                const { svg } = await mermaid.render(id, code);
                                parent.innerHTML = svg;
                                parent.classList.add('flex', 'justify-center', 'my-8');
                            } catch (e) {
                                console.error("Poster Mermaid parsing failed", e);
                            }
                        }
                    }
                }
            };
            setTimeout(renderMermaid, 100);
        }
    }, [report?.content, isKLine]);

    return (
        <div
            className="fixed left-[-9999px] top-0" // Hide it from view but keep in DOM for capture
            aria-hidden="true"
        >
            <div
                ref={posterRef}
                className={`w-[450px] p-10 font-serif leading-relaxed relative ${isKLine
                        ? 'bg-[#0A0A0A] text-stone-200'
                        : 'bg-[#FDFDFB] text-stone-800'
                    }`}
                style={{ minHeight: '800px' }}
            >
                {/* Decorative Background Elements */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#B8860B 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                {/* Border Frame */}
                <div className={`absolute inset-4 border-2 ${isKLine ? 'border-[#B8860B]/30' : 'border-[#B8860B]/20'} pointer-events-none`} />

                {/* Content Header */}
                <div className="relative z-10 text-center mb-10">
                    <div className="w-16 h-1 bg-[#B8860B] mx-auto mb-6"></div>
                    <h1 className="text-3xl font-bold tracking-widest mb-2 font-serif">{report.title}</h1>
                    <p className="text-[10px] uppercase tracking-[0.5em] opacity-50">天机阁 · 深度推演长卷</p>
                    <div className="mt-4 text-[10px] opacity-40">
                        <span>生成日期：{report.date}</span>
                        <span className="mx-2">|</span>
                        <span>档案号：OS-{Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                    </div>
                </div>

                {/* Core Summary Box */}
                <div className={`relative z-10 p-6 mb-10 rounded-xl border ${isKLine ? 'bg-[#1A1A1A] border-[#333]' : 'bg-white border-stone-200 shadow-sm'
                    }`}>
                    <h2 className={`text-xs font-bold mb-4 tracking-[0.3em] uppercase ${isKLine ? 'text-[#B8860B]' : 'text-[#8B0000]'}`}>
                        —— 核心断语 ——
                    </h2>
                    <p className="text-lg leading-relaxed italic">{report.summary}</p>
                </div>

                {/* Main Content */}
                <div className="relative z-10" ref={mermaidRef}>
                    <div className={`prose prose-sm max-w-none ${isKLine ? 'prose-invert' : ''}`}>
                        <Markdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                        >
                            {report.content}
                        </Markdown>
                    </div>
                </div>

                {/* Poster Footer */}
                <div className="relative z-10 mt-16 pt-10 border-t border-[#B8860B]/20 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-12 h-12 grayscale opacity-50 border-2 border-[#B8860B] rounded-lg rotate-45 flex items-center justify-center">
                            <span className="text-[8px] -rotate-45 font-bold">天命</span>
                        </div>
                    </div>
                    <p className="text-[10px] opacity-40 tracking-wider">天机阁官方认证 · 命运魔术师出品</p>
                    <p className="text-[8px] opacity-20 mt-2 italic">“凡所有相，皆是虚妄。若见诸相非相，即见如来。”</p>
                </div>
            </div>
        </div>
    );
};

export default ReportPoster;
