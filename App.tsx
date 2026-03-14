
import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import Auth from './components/Auth';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import OracleChat from './components/OracleChat';
import LifeDatabase from './components/LifeDatabase';
import Mine from './components/Mine';
import DivinationConsole from './components/DivinationConsole';
import ReportPage from './components/ReportPage';
import { AppRoute, DestinyReport } from './types';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F7F7F5] text-center">
          <h2 className="text-2xl font-serif font-bold text-[#8B0000] mb-4">抱歉，系统出现了一点小偏差</h2>
          <p className="text-stone-500 mb-6">推演过程遇到了预料外的波动。</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#1F1F1F] text-[#B8860B] rounded-full font-bold"
          >
            重启系统
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [route, setRoute] = useState<AppRoute>(AppRoute.DASHBOARD);
  const [initialChatPrompt, setInitialChatPrompt] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<DestinyReport | null>(null);
  const [previousRoute, setPreviousRoute] = useState<AppRoute>(AppRoute.DASHBOARD);

  useEffect(() => {
    // Initial session check
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isInitializing) {
    return null; // Let the index.html loading screen handle it
  }

  if (!session) {
    return (
      <ErrorBoundary>
        <Auth />
      </ErrorBoundary>
    );
  }

  const handleNavigateToOracle = (prompt: string) => {
    setInitialChatPrompt(prompt);
    setRoute(AppRoute.ORACLE);
  };

  const handleViewReport = (report: DestinyReport) => {
    setSelectedReport(report);
    setPreviousRoute(route);
    setRoute(AppRoute.REPORT_DETAIL);
  };

  const renderContent = () => {
    switch (route) {
      case AppRoute.DASHBOARD:
        return <Dashboard onNavigateToChat={handleNavigateToOracle} />;
      case AppRoute.ORACLE:
        return (
          <OracleChat
            initialPrompt={initialChatPrompt}
            onPromptConsumed={() => setInitialChatPrompt(null)}
            onNavigate={setRoute}
            onViewReport={handleViewReport}
          />
        );
      case AppRoute.DIVINATION:
        return <DivinationConsole onBack={() => setRoute(AppRoute.ORACLE)} />;
      case AppRoute.DATABASE:
        return <LifeDatabase onViewReport={handleViewReport} />;
      case AppRoute.MINE:
        return <Mine />;
      case AppRoute.REPORT_DETAIL:
        return <ReportPage
          report={selectedReport}
          onBack={() => setRoute(previousRoute)}
        />;
      default:
        return <Dashboard onNavigateToChat={handleNavigateToOracle} />;
    }
  };

  return (
    <ErrorBoundary>
      <Layout currentRoute={route} setRoute={setRoute}>
        {renderContent()}
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
