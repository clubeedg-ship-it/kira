import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, Clock, FileText, Flame, Layers, ListTodo, MessageSquare, Network, ShieldAlert, Sparkles, Trophy, Zap, } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { useTaskQueryParam } from '../hooks/useTaskQueryParam';
// ── Helpers ────────────────────────────────────────────────────────────────
function relativeTime(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)
        return 'just now';
    if (mins < 60)
        return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)
        return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}
function xpForLevel(level) {
    return level * 100;
}
function DonutChart({ segments, size = 160 }) {
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    if (total === 0) {
        return (_jsx("svg", { width: size, height: size, viewBox: "0 0 36 36", className: "mx-auto", children: _jsx("circle", { cx: "18", cy: "18", r: "14", fill: "none", stroke: "currentColor", strokeWidth: "4", className: "text-zinc-800" }) }));
    }
    const radius = 14;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 36 36", className: "mx-auto -rotate-90", children: segments.map((seg, i) => {
            const pct = seg.value / total;
            const dashLen = pct * circumference;
            const dashOffset = -offset;
            offset += dashLen;
            return (_jsx("circle", { cx: "18", cy: "18", r: radius, fill: "none", stroke: seg.color, strokeWidth: "4", strokeDasharray: `${dashLen} ${circumference - dashLen}`, strokeDashoffset: dashOffset, strokeLinecap: "round", className: "transition-all duration-700" }, i));
        }) }));
}
// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, accent = 'text-violet-400', }) {
    return (_jsxs(Card, { className: "flex items-center gap-4 bg-zinc-900/60 border-zinc-800 p-4", children: [_jsx("div", { className: `rounded-lg bg-zinc-800/80 p-2.5 ${accent}`, children: _jsx(Icon, { size: 20 }) }), _jsxs("div", { children: [_jsx("p", { className: "text-2xl font-bold text-zinc-100", children: value }), _jsx("p", { className: "text-xs text-zinc-500", children: label })] })] }));
}
// ── Activity Icon ──────────────────────────────────────────────────────────
function ActivityIcon({ type }) {
    if (type === 'task_completed')
        return _jsx(CheckCircle2, { size: 16, className: "text-emerald-400" });
    if (type === 'message_sent')
        return _jsx(MessageSquare, { size: 16, className: "text-sky-400" });
    return _jsx(Circle, { size: 16, className: "text-violet-400" });
}
// ── Main Component ─────────────────────────────────────────────────────────
const statusColors = {
    todo: 'text-zinc-400',
    in_progress: 'text-yellow-400',
    done: 'text-emerald-400',
    blocked: 'text-red-400',
    review: 'text-violet-400',
    waiting: 'text-amber-400',
};
const priorityLabels = {
    0: { label: 'Critical', color: 'text-red-400' },
    1: { label: 'High', color: 'text-orange-400' },
    2: { label: 'Medium', color: 'text-sky-400' },
    3: { label: 'Low', color: 'text-zinc-500' },
};
export default function Dashboards() {
    const { openTask } = useTaskQueryParam();
    const { data, isLoading } = useQuery({
        queryKey: ['dashboards', 'stats'],
        queryFn: () => apiRequest('/api/v1/dashboards/stats'),
    });
    const { data: recentTasks } = useQuery({
        queryKey: ['dashboards', 'recent-tasks'],
        queryFn: () => apiRequest('/api/v1/dashboards/recent-tasks'),
    });
    if (isLoading || !data) {
        return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsx("h1", { className: "text-2xl font-bold text-zinc-100", children: "Dashboard" }), _jsx("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-4", children: Array.from({ length: 4 }).map((_, i) => (_jsx(Skeleton, { className: "h-20 rounded-lg" }, i))) }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(Skeleton, { className: "h-64 rounded-lg" }), _jsx(Skeleton, { className: "h-64 rounded-lg" })] })] }));
    }
    const donutSegments = [
        { value: data.tasks.todo, color: '#a78bfa', label: 'To Do' },
        { value: data.tasks.inProgress, color: '#facc15', label: 'In Progress' },
        { value: data.tasks.done, color: '#34d399', label: 'Done' },
        { value: data.tasks.blocked, color: '#f87171', label: 'Blocked' },
    ];
    const xpNeeded = xpForLevel(data.xp.level);
    const xpInLevel = data.xp.currentXp % xpNeeded || (data.xp.currentXp > 0 ? xpNeeded : 0);
    const xpPct = Math.min(100, (xpInLevel / xpNeeded) * 100);
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsx("h1", { className: "text-2xl font-bold text-zinc-100", children: "Dashboard" }), _jsxs("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-5", children: [_jsx(StatCard, { icon: ListTodo, value: data.tasks.total, label: "Total Tasks" }), _jsx(StatCard, { icon: Layers, value: data.projects.active, label: "Active Projects", accent: "text-sky-400" }), _jsx(StatCard, { icon: FileText, value: data.documents.total, label: "Documents", accent: "text-amber-400" }), _jsx(StatCard, { icon: Trophy, value: data.xp.level, label: "Level", accent: "text-emerald-400" }), _jsx(StatCard, { icon: Flame, value: data.xp.streak, label: "Day Streak", accent: "text-orange-400" })] }), _jsxs("div", { className: "grid gap-6 md:grid-cols-2", children: [_jsxs(Card, { className: "bg-zinc-900/60 border-zinc-800 p-5", children: [_jsx("h2", { className: "mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400", children: "Task Breakdown" }), _jsx(DonutChart, { segments: donutSegments }), _jsx("div", { className: "mt-4 flex flex-wrap justify-center gap-4", children: donutSegments.map((seg) => (_jsxs("div", { className: "flex items-center gap-2 text-xs text-zinc-400", children: [_jsx("span", { className: "inline-block h-2.5 w-2.5 rounded-full", style: { backgroundColor: seg.color } }), seg.label, " (", seg.value, ")"] }, seg.label))) })] }), _jsxs(Card, { className: "bg-zinc-900/60 border-zinc-800 p-5", children: [_jsx("h2", { className: "mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400", children: "Recent Activity" }), data.recentActivity.length === 0 ? (_jsx("p", { className: "text-sm text-zinc-600", children: "No recent activity yet." })) : (_jsx("ul", { className: "space-y-3 max-h-64 overflow-y-auto pr-1", children: data.recentActivity.map((ev, i) => (_jsxs("li", { className: "flex items-start gap-3", children: [_jsx("div", { className: "mt-0.5", children: _jsx(ActivityIcon, { type: ev.type }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm text-zinc-300", children: ev.title }), _jsx("p", { className: "text-xs text-zinc-600", children: relativeTime(ev.timestamp) })] })] }, i))) }))] })] }), _jsxs(Card, { className: "bg-zinc-900/60 border-zinc-800 p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wider text-zinc-400", children: "XP Progress" }), _jsxs("div", { className: "flex items-center gap-2 text-zinc-400", children: [_jsx(Sparkles, { size: 14, className: "text-violet-400" }), _jsxs("span", { className: "text-sm font-medium text-zinc-300", children: [data.xp.currentXp, " XP"] })] })] }), _jsx("div", { className: "relative h-3 w-full overflow-hidden rounded-full bg-zinc-800", children: _jsx("div", { className: "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-700", style: { width: `${xpPct}%` } }) }), _jsxs("div", { className: "mt-2 flex items-center justify-between text-xs text-zinc-500", children: [_jsxs("span", { children: ["Level ", data.xp.level] }), _jsxs("span", { children: [Math.round(xpPct), "% to Level ", data.xp.level + 1] })] }), data.xp.streak > 0 && (_jsxs("div", { className: "mt-3 flex items-center gap-2 text-sm text-orange-400", children: [_jsx(Flame, { size: 16 }), _jsxs("span", { children: [data.xp.streak, "-day streak \u2014 keep it going!"] })] }))] }), _jsxs(Card, { className: "bg-zinc-900/60 border-zinc-800 p-5", children: [_jsx("h2", { className: "mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400", children: "Recent Tasks" }), !recentTasks || recentTasks.length === 0 ? (_jsx("p", { className: "text-sm text-zinc-600", children: "No tasks yet." })) : (_jsx("ul", { className: "space-y-2 max-h-72 overflow-y-auto pr-1", children: recentTasks.map((task) => {
                            const pri = priorityLabels[task.priority] ?? priorityLabels[2];
                            return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => openTask(task.id), className: "flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2.5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/70", children: [_jsx(Clock, { size: 14, className: statusColors[task.status] ?? 'text-zinc-400' }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm font-medium text-zinc-200", children: task.title }), _jsxs("p", { className: "text-xs text-zinc-500", children: [_jsx("span", { className: pri.color, children: pri.label }), ' · ', _jsx("span", { className: "capitalize", children: task.status.replace('_', ' ') }), task.dueDate && _jsxs(_Fragment, { children: [" \u00B7 Due ", task.dueDate] })] })] })] }) }, task.id));
                        }) }))] }), _jsxs("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-4", children: [_jsx(StatCard, { icon: Network, value: data.entities.total, label: "Knowledge Entities", accent: "text-purple-400" }), _jsx(StatCard, { icon: MessageSquare, value: data.conversations.total, label: "Conversations", accent: "text-sky-400" }), _jsx(StatCard, { icon: Zap, value: data.conversations.messagesTotal, label: "Messages", accent: "text-yellow-400" }), _jsx(StatCard, { icon: ShieldAlert, value: data.tasks.blocked, label: "Blocked Tasks", accent: "text-red-400" })] })] }));
}
//# sourceMappingURL=Dashboards.js.map