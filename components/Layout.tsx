
import React from 'react';
import { AppRoute } from '../types';
import {
  ChartPieIcon,
  ChatBubbleLeftRightIcon,
  ArchiveBoxIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import {
  ChartPieIcon as ChartPieIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  ArchiveBoxIcon as ArchiveBoxIconSolid,
  UserIcon as UserIconSolid
} from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;

interface LayoutProps {
  currentRoute: AppRoute;
  setRoute: (route: AppRoute) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentRoute, setRoute, children }) => {
  const navItems = [
    { id: AppRoute.DASHBOARD, label: '运势', icon: ChartPieIcon, iconSolid: ChartPieIconSolid },
    { id: AppRoute.ORACLE, label: '天机', icon: ChatBubbleLeftRightIcon, iconSolid: ChatBubbleLeftRightIconSolid },
    // Divination is now hidden from main nav
    { id: AppRoute.DATABASE, label: '档案', icon: ArchiveBoxIcon, iconSolid: ArchiveBoxIconSolid },
    { id: AppRoute.MINE, label: '我的', icon: UserIcon, iconSolid: UserIconSolid },
  ];

  return (
    // Use 100dvh to handle mobile browser address bars correctly
    <div className="flex w-full overflow-hidden bg-[#F7F7F5] text-stone-800 selection:bg-[#8B0000] selection:text-white" style={{ height: '100dvh' }}>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-72 border-r border-stone-200/80 flex-col items-center glass-panel relative z-20 shadow-sm">
        <div className="h-32 flex flex-col items-center justify-center w-full border-b border-stone-100">
          <div className="w-16 h-16 rounded-full bg-[#1F1F1F] text-[#F7F7F5] flex items-center justify-center font-calligraphy text-3xl shadow-lg mb-3 ring-4 ring-stone-100">
            命
          </div>
          <h1 className="font-serif text-xl font-bold tracking-widest text-[#1F1F1F]">天命系统</h1>
          <span className="text-[9px] text-[#B8860B] tracking-[0.3em] uppercase opacity-80">Destiny OS</span>
        </div>

        <nav className="flex-1 w-full py-8 flex flex-col gap-2 px-4">
          {navItems.map((item) => {
            const isActive = currentRoute === item.id;
            const Icon = isActive ? item.iconSolid : item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setRoute(item.id)}
                className={`flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-300 group relative overflow-hidden text-left
                  ${isActive
                    ? 'bg-stone-200/60 text-[#8B0000] shadow-sm'
                    : 'hover:bg-stone-100/80 text-stone-500 hover:text-stone-800'
                  }`}
              >
                <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${isActive ? 'text-[#8B0000]' : ''}`} />
                <span className="font-medium tracking-widest text-base font-serif">
                  {item.label}
                </span>
                {isActive && (
                  <MotionDiv layoutId="desktop-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#8B0000] rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Snippet */}
        <div className="p-6 w-full border-t border-stone-200/60">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-white to-stone-50 border border-stone-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            <div className="h-10 w-10 rounded-full bg-stone-200 border border-white shadow-inner flex items-center justify-center text-xs font-serif text-[#1F1F1F]">
              乙亥
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-stone-800 font-serif">求道者</p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[10px] text-stone-400">在线</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[#F7F7F5]/90 backdrop-blur-md border-b border-stone-200/60 z-30 flex items-center justify-center shadow-sm" style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)', height: 'calc(56px + env(safe-area-inset-top, 0px))' }}>
        <h1 className="font-calligraphy text-2xl text-[#1F1F1F]">天命系统</h1>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-[#F7F7F5] scroll-smooth" style={{ paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))', paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Background Texture */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}>
        </div>

        {/* Ambient Gradient Orbs */}
        <div className="fixed top-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-b from-[#E6D5B8]/30 to-transparent blur-3xl pointer-events-none mix-blend-multiply" />
        <div className="fixed bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-t from-[#B8860B]/5 to-transparent blur-3xl pointer-events-none" />

        <div className="p-5 lg:p-10 max-w-6xl mx-auto relative z-10 min-h-full flex flex-col">
          {children}

          {/* Web Footer (Compliance Info) */}
          <footer className="mt-auto pt-12 pb-6 text-center space-y-2">
            <p className="text-[10px] text-stone-400 font-serif">
              天命系统 Destiny OS &copy; 2025 <br />
              <span className="opacity-50">天机阁AI 提供技术支持</span>
            </p>
            <div className="flex flex-col items-center gap-1 text-[9px] text-stone-300">
              <p>京ICP备12345678号-1 | 京公网安备11010502030000号</p>
              <p className="max-w-md">
                本服务提供的命理分析仅供娱乐与文化研究，不依据科学标准，不应作为重大生活决策的依据。请用户相信科学，拒绝迷信。
              </p>
            </div>
          </footer>
        </div>
      </main>

      {/* MOBILE BOTTOM TAB BAR */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-stone-200 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = currentRoute === item.id;
            const Icon = isActive ? item.iconSolid : item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setRoute(item.id)}
                className="flex-1 flex flex-col items-center justify-center h-full active:scale-95 transition-transform"
              >
                <div className={`relative p-1.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-stone-100' : 'bg-transparent'}`}>
                  <Icon className={`h-6 w-6 ${isActive ? 'text-[#8B0000]' : 'text-stone-400'}`} />
                </div>
                <span className={`text-[10px] mt-1 font-medium font-serif transition-colors ${isActive ? 'text-[#1F1F1F]' : 'text-stone-400'}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

    </div>
  );
};

export default Layout;
