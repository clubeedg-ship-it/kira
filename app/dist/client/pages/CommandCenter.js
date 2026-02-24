import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActiveAgents, Blockers, InboxBadge, KeyResultProgress, RecentCompletions, TodayHeader, TopPriorities, } from '../components/widgets';
import { Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton } from '../components/ui';
const COMMAND_CENTER_QUERY_KEY = ['command-center', 'view'];
async function fetchCommandCenterView() {
    const response = await fetch('/api/v1/views/command-center', {
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error('Unable to load command center.');
    }
    const payload = (await response.json());
    return payload.data;
}
function CommandCenterSkeleton() {
    return (_jsxs("div", { className: "grid grid-cols-1 gap-4 p-6 lg:grid-cols-2", children: [_jsx(Skeleton, { className: "h-36 lg:col-span-2" }), _jsx(Skeleton, { className: "h-72" }), _jsx(Skeleton, { className: "h-48" }), _jsx(Skeleton, { className: "h-72" }), _jsx(Skeleton, { className: "h-72" }), _jsx(Skeleton, { className: "h-56" }), _jsx(Skeleton, { className: "h-44 lg:col-span-2" })] }));
}
export default function CommandCenter() {
    const navigate = useNavigate();
    const commandCenterQuery = useQuery({
        queryKey: COMMAND_CENTER_QUERY_KEY,
        queryFn: fetchCommandCenterView,
        staleTime: 30_000,
    });
    if (commandCenterQuery.isLoading) {
        return _jsx(CommandCenterSkeleton, {});
    }
    if (commandCenterQuery.isError || !commandCenterQuery.data) {
        const message = commandCenterQuery.error instanceof Error
            ? commandCenterQuery.error.message
            : 'Unable to load command center.';
        return (_jsx("div", { className: "p-6", children: _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Unable to Load Command Center" }) }), _jsx(CardContent, { children: _jsx("p", { className: "text-sm text-text-secondary", children: message }) })] }) }));
    }
    const viewData = commandCenterQuery.data;
    if (!viewData.hasData) {
        return (_jsx("div", { className: "p-6", children: _jsx(EmptyState, { icon: _jsx(Sparkles, { className: "h-10 w-10" }), title: "Welcome to Kira", description: "Let's set up your operating system. You can define structure first, or start chatting and let Kira learn from context.", actionLabel: "Open chat", onAction: () => navigate('/chat') }) }));
    }
    return (_jsxs("div", { className: "grid grid-cols-1 gap-4 p-6 lg:grid-cols-2", children: [_jsx(TodayHeader, { className: "order-1 lg:order-1 lg:col-span-2", data: viewData.todayHeader }), viewData.blockers.length > 0 ? (_jsx(Blockers, { className: "order-2 lg:order-7 lg:col-span-2", items: viewData.blockers })) : null, _jsx(TopPriorities, { className: "order-3 lg:order-2", items: viewData.topPriorities }), _jsx(InboxBadge, { className: "order-4 lg:order-3", data: viewData.inboxBadge }), _jsx(ActiveAgents, { className: "order-5 lg:order-4", agents: viewData.activeAgents }), _jsx(KeyResultProgress, { className: "order-6 lg:order-5", objectives: viewData.keyResultProgress }), _jsx(RecentCompletions, { className: "order-7 lg:order-6", items: viewData.recentCompletions })] }));
}
//# sourceMappingURL=CommandCenter.js.map