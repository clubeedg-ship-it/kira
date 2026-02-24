import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bell, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Avatar, Button } from '../ui';
const segmentLabels = {
    inbox: 'Inbox',
    chat: 'Chat',
    operations: 'Operations',
    today: 'Today',
    board: 'Board',
    documents: 'Documents',
    knowledge: 'Knowledge',
    dashboards: 'Dashboards',
    settings: 'Settings',
    agents: 'Agents',
    signup: 'Signup',
    login: 'Login'
};
function getLabel(segment) {
    return segmentLabels[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}
function buildBreadcrumb(pathname) {
    const segments = pathname.split('/').filter(Boolean);
    if (!segments.length) {
        return [{ label: 'Home', to: '/' }];
    }
    const crumbs = [{ label: 'Home', to: '/' }];
    let currentPath = '';
    for (const segment of segments) {
        currentPath += `/${segment}`;
        crumbs.push({ label: getLabel(segment), to: currentPath });
    }
    return crumbs;
}
export default function TopBar() {
    const location = useLocation();
    const { user, signOut } = useAuth();
    const breadcrumbs = buildBreadcrumb(location.pathname);
    return (_jsxs("header", { className: "sticky top-0 z-sticky flex h-14 items-center gap-4 border-b border-border bg-bg-base/95 px-4 backdrop-blur md:px-6 lg:px-8", children: [_jsx("nav", { className: "hidden min-w-0 flex-1 items-center gap-2 text-sm md:flex", "aria-label": "Breadcrumb", children: breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    return (_jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [isLast ? (_jsx("span", { className: "truncate font-semibold text-text-primary", children: crumb.label })) : (_jsx(Link, { className: "truncate text-text-secondary transition-colors hover:text-text-primary", to: crumb.to, children: crumb.label })), !isLast ? _jsx("span", { className: "text-text-tertiary", children: "/" }) : null] }, crumb.to));
                }) }), _jsxs("div", { className: "hidden h-9 min-w-[220px] items-center gap-2 rounded-md border border-border bg-bg-surface px-3 text-sm text-text-tertiary lg:flex", children: [_jsx(Search, { className: "h-4 w-4" }), _jsx("span", { children: "Search (Cmd+K)" })] }), _jsx(Button, { variant: "ghost", size: "sm", "aria-label": "Notifications placeholder", children: _jsx(Bell, { className: "h-4 w-4" }) }), _jsxs("div", { className: "flex items-center gap-2 rounded-md border border-border bg-bg-surface px-2 py-1", children: [_jsx(Avatar, { size: "sm", name: user?.name ?? undefined, src: user?.image ?? null }), _jsx("div", { className: "hidden sm:block", children: _jsx("p", { className: "max-w-[120px] truncate text-xs font-medium text-text-primary", children: user?.name ?? 'User' }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => void signOut(), children: "Sign out" })] })] }));
}
//# sourceMappingURL=TopBar.js.map