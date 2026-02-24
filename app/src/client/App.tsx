import { useCallback, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { I18nProvider } from './i18n';

import { ErrorBoundary } from './components/ErrorBoundary';
import AppShell from './components/layout/AppShell';
import QuickAdd from './components/QuickAdd';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import AgentMonitor from './pages/AgentMonitor';
import Agents from './pages/Agents';
import CommandCenter from './pages/CommandCenter';
import Inbox from './pages/Inbox';
import Login from './pages/Login';
import TodayView from './pages/operations/TodayView';
import Documents from './pages/Documents';
import Chat from './pages/Chat';
import Knowledge from './pages/Knowledge';
import Dashboards from './pages/Dashboards';
import PlaceholderPage from './pages/PlaceholderPage';
import Settings from './pages/Settings';
import Signup from './pages/Signup';
import BoardView from './pages/operations/BoardView';
import CanvasPage from './pages/CanvasPage';
import Memory from './pages/Memory';
import Skills from './pages/Skills';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000
    }
  }
});

function AppWithShortcuts() {
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const openQuickAdd = useCallback(() => {
    setQuickAddOpen(true);
  }, []);

  const closeQuickAdd = useCallback(() => {
    setQuickAddOpen(false);
  }, []);

  useGlobalShortcuts(openQuickAdd);

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route element={<AppShell />}>
          <Route index element={<CommandCenter />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/operations" element={<Navigate to="/operations/today" replace />} />
          <Route path="/operations/today" element={<TodayView />} />
          <Route
            path="/operations/board"
            element={<BoardView />}
          />
          <Route path="/documents" element={<Documents />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/memory" element={<Memory />} />
          <Route
            path="/dashboards"
            element={<Dashboards />}
          />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/monitor" element={<AgentMonitor />} />
          <Route path="/canvas/:id" element={<CanvasPage />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <QuickAdd open={quickAddOpen} onClose={closeQuickAdd} />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <AppWithShortcuts />
          </BrowserRouter>
        </ErrorBoundary>
      </I18nProvider>
    </QueryClientProvider>
  );
}
