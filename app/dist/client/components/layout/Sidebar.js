import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bot, ChevronLeft, ChevronRight, FileText, Home, Inbox, LayoutDashboard, MessageSquare, Brain, Network, Settings, Workflow, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/cn';
import { Avatar } from '../ui';
import XPBar from './XPBar';
const navItems = [
    { labelKey: 'nav.home', to: '/', icon: Home },
    { labelKey: 'nav.inbox', to: '/inbox', icon: Inbox },
    { labelKey: 'nav.chat', to: '/chat', icon: MessageSquare },
    { labelKey: 'nav.operations', to: '/operations', icon: Workflow },
    { labelKey: 'nav.documents', to: '/documents', icon: FileText },
    { labelKey: 'nav.knowledge', to: '/knowledge', icon: Network },
    { labelKey: 'nav.memory', to: '/memory', icon: Brain },
    { labelKey: 'nav.dashboards', to: '/dashboards', icon: LayoutDashboard },
    { labelKey: 'nav.skills', to: '/skills', icon: Zap },
    { labelKey: 'nav.settings', to: '/settings', icon: Settings },
    { labelKey: 'nav.agents', to: '/agents', icon: Bot }
];
function isActivePath(pathname, targetPath) {
    if (targetPath === '/') {
        return pathname === '/';
    }
    return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}
function normalizePendingCount(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(0, Math.floor(value));
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return Math.max(0, Math.floor(parsed));
        }
    }
    return null;
}
export default function Sidebar({ collapsed, canToggle, onToggle }) {
    const location = useLocation();
    const { user } = useAuth();
    const { t } = useI18n();
    const [pendingCount, setPendingCount] = useState(0);
    useEffect(() => {
        let isMounted = true;
        const loadPendingCount = async () => {
            try {
                const response = await fetch('/api/v1/input-queue/count', {
                    credentials: 'include'
                });
                if (!response.ok) {
                    return;
                }
                const payload = (await response.json().catch(() => null));
                const nextPendingCount = normalizePendingCount(payload?.data?.pendingCount);
                if (isMounted && nextPendingCount !== null) {
                    setPendingCount(nextPendingCount);
                }
            }
            catch {
                // Ignore transient network issues for nav badges.
            }
        };
        void loadPendingCount();
        const eventSource = new EventSource('/api/v1/events/stream?channels=input_queue');
        const onCountChanged = (event) => {
            if (!(event instanceof MessageEvent) || typeof event.data !== 'string') {
                return;
            }
            try {
                const payload = JSON.parse(event.data);
                const nextPendingCount = normalizePendingCount(payload.pendingCount ?? payload.pending_count);
                if (nextPendingCount !== null) {
                    setPendingCount(nextPendingCount);
                }
            }
            catch {
                // Ignore malformed event payloads.
            }
        };
        eventSource.addEventListener('input_queue.count_changed', onCountChanged);
        return () => {
            isMounted = false;
            eventSource.removeEventListener('input_queue.count_changed', onCountChanged);
            eventSource.close();
        };
    }, []);
    const inboxBadgeLabel = pendingCount > 99 ? '99+' : `${pendingCount}`;
    return (_jsxs("aside", { className: cn('z-sidebar flex h-screen shrink-0 flex-col border-r border-border bg-bg-surface px-2 py-3 transition-all duration-normal ease-in-out', collapsed ? 'w-16' : 'w-[240px]'), children: [_jsxs("div", { className: cn('mb-3 flex h-10 items-center', collapsed ? 'justify-center' : 'justify-between px-1'), children: [!collapsed ? (_jsx("span", { className: "truncate font-display text-lg font-semibold tracking-wide text-text-primary", children: "KIRA" })) : null, _jsx("button", { className: cn('inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-overlay hover:text-text-primary', !canToggle ? 'opacity-50' : ''), onClick: onToggle, disabled: !canToggle, "aria-label": "Toggle sidebar", type: "button", children: collapsed ? _jsx(ChevronRight, { className: "h-4 w-4" }) : _jsx(ChevronLeft, { className: "h-4 w-4" }) })] }), _jsx("nav", { className: "space-y-1", "aria-label": "Primary", children: navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActivePath(location.pathname, item.to);
                    const showInboxBadge = item.to === '/inbox' && pendingCount > 0;
                    const label = t(item.labelKey);
                    return (_jsxs(Link, { to: item.to, title: collapsed ? label : undefined, className: cn('relative flex h-12 items-center rounded-md px-3 text-sm font-medium transition-colors duration-fast ease-out', collapsed ? 'justify-center' : 'gap-3', active
                            ? 'border-l-[3px] border-l-primary-400 bg-bg-overlay text-text-primary'
                            : 'text-text-secondary hover:bg-bg-overlay hover:text-text-primary'), children: [_jsx(Icon, { className: "h-5 w-5 shrink-0" }), !collapsed ? _jsx("span", { className: "truncate", children: label }) : null, showInboxBadge ? (_jsx("span", { className: cn('inline-flex items-center justify-center rounded-full bg-error px-1.5 py-0.5 text-[10px] font-semibold text-white', collapsed ? 'absolute right-1.5 top-1.5 min-w-[20px]' : 'ml-auto min-w-[24px]'), children: inboxBadgeLabel })) : null] }, item.to));
                }) }), _jsxs("div", { className: "mt-auto", children: [_jsx("div", { className: "border-t border-border", children: _jsx(XPBar, { collapsed: collapsed }) }), _jsx("div", { className: "border-t border-border pt-3", children: _jsxs("div", { className: cn('flex items-center', collapsed ? 'justify-center' : 'gap-3 px-2'), children: [_jsx(Avatar, { size: collapsed ? 'sm' : 'md', name: user?.name ?? undefined, src: user?.image ?? null }), !collapsed ? (_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-sm font-medium text-text-primary", children: user?.name ?? 'Kira User' }), _jsx("p", { className: "truncate text-xs text-text-tertiary", children: user?.email ?? 'Not signed in' })] })) : null] }) })] })] }));
}
//# sourceMappingURL=Sidebar.js.map