import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import TaskDetail from '../TaskDetail';
import LevelUpToast from '../LevelUpToast';
import { useSSE } from '../../hooks/useSSE';
import { useTaskQueryParam } from '../../hooks/useTaskQueryParam';
import AuthGuard from '../AuthGuard';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
const DESKTOP_BREAKPOINT = 1024;
function useIsBelowDesktop() {
    const [isBelowDesktop, setIsBelowDesktop] = useState(() => window.innerWidth < DESKTOP_BREAKPOINT);
    useEffect(() => {
        const mediaQuery = window.matchMedia(`(max-width: ${DESKTOP_BREAKPOINT - 1}px)`);
        const onChange = (event) => setIsBelowDesktop(event.matches);
        setIsBelowDesktop(mediaQuery.matches);
        mediaQuery.addEventListener('change', onChange);
        return () => {
            mediaQuery.removeEventListener('change', onChange);
        };
    }, []);
    return isBelowDesktop;
}
function RealtimeBridge() {
    useSSE();
    return null;
}
export default function AppShell({ children }) {
    const isBelowDesktop = useIsBelowDesktop();
    const [collapsed, setCollapsed] = useState(false);
    const sidebarCollapsed = isBelowDesktop ? true : collapsed;
    const { taskId, closeTask, openTask } = useTaskQueryParam();
    return (_jsxs(AuthGuard, { children: [_jsx(RealtimeBridge, {}), _jsx(LevelUpToast, {}), _jsxs("div", { className: "flex h-screen bg-bg-base text-text-primary", children: [_jsx(Sidebar, { collapsed: sidebarCollapsed, canToggle: !isBelowDesktop, onToggle: () => setCollapsed((current) => !current) }), _jsxs("div", { className: "flex min-w-0 flex-1 flex-col", children: [_jsx(TopBar, {}), _jsx("main", { className: "min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-6", children: children ?? _jsx(Outlet, {}) })] }), _jsx(TaskDetail, { open: Boolean(taskId), taskId: taskId, onClose: closeTask, onOpenTask: openTask })] })] }));
}
//# sourceMappingURL=AppShell.js.map