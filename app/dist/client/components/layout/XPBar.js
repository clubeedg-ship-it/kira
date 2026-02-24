import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Flame } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { cn } from '../../lib/cn';
const TIER_COLORS = {
    Newcomer: 'bg-emerald-500',
    Explorer: 'bg-blue-500',
    Builder: 'bg-indigo-500',
    Master: 'bg-purple-500',
    Architect: 'bg-violet-500',
    Visionary: 'bg-fuchsia-500',
    Legend: 'bg-amber-500',
};
function getTierColor(title) {
    return TIER_COLORS[title] ?? 'bg-primary-400';
}
export default function XPBar({ collapsed }) {
    const [expanded, setExpanded] = useState(false);
    const queryClient = useQueryClient();
    const { data: xp } = useQuery({
        queryKey: ['user-xp'],
        queryFn: () => apiRequest('/api/v1/xp'),
        staleTime: 30_000,
        retry: 1,
    });
    // Listen for SSE xp events to refetch
    useEffect(() => {
        const source = new EventSource('/api/v1/events/stream?channels=xp', { withCredentials: true });
        const handleXpGained = () => {
            void queryClient.invalidateQueries({ queryKey: ['user-xp'] });
        };
        source.addEventListener('xp.gained', handleXpGained);
        source.addEventListener('xp.level_up', handleXpGained);
        source.addEventListener('xp.streak_updated', handleXpGained);
        source.addEventListener('xp.streak_broken', handleXpGained);
        source.onerror = () => {
            // Silently reconnect handled by browser
        };
        return () => {
            source.removeEventListener('xp.gained', handleXpGained);
            source.removeEventListener('xp.level_up', handleXpGained);
            source.removeEventListener('xp.streak_updated', handleXpGained);
            source.removeEventListener('xp.streak_broken', handleXpGained);
            source.close();
        };
    }, [queryClient]);
    const toggleExpanded = useCallback(() => setExpanded((v) => !v), []);
    if (!xp)
        return null;
    const barColor = getTierColor(xp.title);
    if (collapsed) {
        return (_jsxs("div", { className: "flex flex-col items-center gap-1 px-1 py-2", title: `Lv ${xp.level} ${xp.title} — ${xp.icon}`, children: [_jsx("span", { className: "text-base", children: xp.icon }), _jsx("span", { className: "text-[10px] font-bold text-text-secondary", children: xp.level }), xp.current_streak > 0 && (_jsxs("span", { className: "flex items-center text-[10px] text-orange-400", children: [_jsx(Flame, { className: "h-3 w-3" }), xp.current_streak] }))] }));
    }
    return (_jsxs("div", { className: "px-2 py-2", children: [_jsxs("button", { onClick: toggleExpanded, className: "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg-overlay", children: [_jsx("span", { className: "text-base", children: xp.icon }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-xs font-semibold text-text-primary", children: [xp.title, " ", _jsxs("span", { className: "text-text-tertiary", children: ["Lv ", xp.level] })] }), _jsxs("div", { className: "flex items-center gap-1", children: [xp.current_streak > 0 && (_jsxs("span", { className: "flex items-center gap-0.5 text-[11px] font-medium text-orange-400", children: [_jsx(Flame, { className: "h-3 w-3" }), xp.current_streak] })), expanded ? (_jsx(ChevronUp, { className: "h-3 w-3 text-text-tertiary" })) : (_jsx(ChevronDown, { className: "h-3 w-3 text-text-tertiary" }))] })] }), _jsx("div", { className: "mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-overlay", children: _jsx("div", { className: cn('h-full rounded-full transition-all duration-500 ease-out', barColor), style: { width: `${xp.progress}%` } }) })] })] }), expanded && (_jsxs("div", { className: "mt-2 space-y-1.5 rounded-md bg-bg-overlay px-3 py-2 text-[11px]", children: [_jsxs("div", { className: "flex justify-between text-text-secondary", children: [_jsx("span", { children: "Total XP" }), _jsx("span", { className: "font-medium text-text-primary", children: xp.total_xp.toLocaleString() })] }), _jsxs("div", { className: "flex justify-between text-text-secondary", children: [_jsx("span", { children: "Next level" }), _jsxs("span", { className: "font-medium text-text-primary", children: [xp.xp_to_next_level.toLocaleString(), " XP"] })] }), _jsxs("div", { className: "flex justify-between text-text-secondary", children: [_jsx("span", { children: "Streak" }), _jsxs("span", { className: "font-medium text-text-primary", children: [xp.current_streak, " days"] })] }), _jsxs("div", { className: "flex justify-between text-text-secondary", children: [_jsx("span", { children: "Best streak" }), _jsxs("span", { className: "font-medium text-text-primary", children: [xp.longest_streak, " days"] })] }), _jsxs("div", { className: "flex justify-between text-text-secondary", children: [_jsx("span", { children: "Freezes left" }), _jsx("span", { className: "font-medium text-text-primary", children: xp.streak_freezes })] })] }))] }));
}
//# sourceMappingURL=XPBar.js.map