import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './i18n';
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
    return (_jsxs(_Fragment, { children: [_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/signup", element: _jsx(Signup, {}) }), _jsxs(Route, { element: _jsx(AppShell, {}), children: [_jsx(Route, { index: true, element: _jsx(CommandCenter, {}) }), _jsx(Route, { path: "/inbox", element: _jsx(Inbox, {}) }), _jsx(Route, { path: "/chat", element: _jsx(Chat, {}) }), _jsx(Route, { path: "/operations", element: _jsx(Navigate, { to: "/operations/today", replace: true }) }), _jsx(Route, { path: "/operations/today", element: _jsx(TodayView, {}) }), _jsx(Route, { path: "/operations/board", element: _jsx(BoardView, {}) }), _jsx(Route, { path: "/documents", element: _jsx(Documents, {}) }), _jsx(Route, { path: "/knowledge", element: _jsx(Knowledge, {}) }), _jsx(Route, { path: "/memory", element: _jsx(Memory, {}) }), _jsx(Route, { path: "/dashboards", element: _jsx(Dashboards, {}) }), _jsx(Route, { path: "/agents", element: _jsx(Agents, {}) }), _jsx(Route, { path: "/agents/monitor", element: _jsx(AgentMonitor, {}) }), _jsx(Route, { path: "/canvas/:id", element: _jsx(CanvasPage, {}) }), _jsx(Route, { path: "/skills", element: _jsx(Skills, {}) }), _jsx(Route, { path: "/settings", element: _jsx(Settings, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }), _jsx(QuickAdd, { open: quickAddOpen, onClose: closeQuickAdd })] }));
}
export default function App() {
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(I18nProvider, { children: _jsx(BrowserRouter, { children: _jsx(AppWithShortcuts, {}) }) }) }));
}
//# sourceMappingURL=App.js.map