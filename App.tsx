import React from 'react';
import Auth from './components/Auth';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import OracleChat from './components/OracleChat';
import LifeDatabase from './components/LifeDatabase';
import Mine from './components/Mine';
import DivinationConsole from './components/DivinationConsole';
import ReportPage from './components/ReportPage';
import { AppRoute, DestinyReport } from './types';
import { UserDataProvider, useUserData } from './contexts/UserDataContext';

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

// 内部组件：使用 Context 数据
function AppContent() {
  const { session, isInitializing } = useUserData();
  const [route, setRoute] = React.useState<AppRoute>(AppRoute.DASHBOARD);
  const [initialChatPrompt, setInitialChatPrompt] = React.useState<string | null>(null);
  const [selectedReport, setSelectedReport] = React.useState<DestinyReport | null>(null);
  const [previousRoute, setPreviousRoute] = React.useState<AppRoute>(AppRoute.DASHBOARD);

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

  // 简化渲染：保持所有页面挂载，用 hidden class 控制显隐
  const renderAllPages = () => (
    <>
      <div className={route === AppRoute.DASHBOARD ? 'block' : 'hidden'}>
        <Dashboard onNavigateToChat={handleNavigateToOracle} />
      </div>
      <div className={route === AppRoute.ORACLE ? 'block' : 'hidden'}>
        <OracleChat
          session={session}
          initialPrompt={initialChatPrompt}
          onPromptConsumed={() => setInitialChatPrompt(null)}
          onNavigate={setRoute}
          onViewReport={handleViewReport}
          currentRoute={route}
        />
      </div>
      <div className={route === AppRoute.DIVINATION ? 'block' : 'hidden'}>
        <DivinationConsole onBack={() => setRoute(AppRoute.ORACLE)} />
      </div>
      <div className={route === AppRoute.DATABASE ? 'block' : 'hidden'}>
        <LifeDatabase onViewReport={handleViewReport} />
      </div>
      <div className={route === AppRoute.MINE ? 'block' : 'hidden'}>
        <Mine session={session} />
      </div>
      <div className={route === AppRoute.REPORT_DETAIL ? 'block' : 'hidden'}>
        <ReportPage report={selectedReport} onBack={() => setRoute(previousRoute)} />
      </div>
    </>
  );

  return (
    <ErrorBoundary>
      <Layout currentRoute={route} setRoute={setRoute}>
        {renderAllPages()}
      </Layout>
    </ErrorBoundary>
  );
}

// 外层组件：包裹 Provider
function App() {
  return (
    <UserDataProvider>
      <AppContent />
    </UserDataProvider>
  );
}

export default App;
