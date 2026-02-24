import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Card, CardContent, CardHeader, CardTitle } from '../ui';
function formatTimeAgo(completedAt) {
    if (!completedAt) {
        return 'Recently';
    }
    const completedTime = new Date(completedAt).getTime();
    if (Number.isNaN(completedTime)) {
        return 'Recently';
    }
    const diffMs = Date.now() - completedTime;
    if (diffMs < 60_000) {
        return 'just now';
    }
    const diffMinutes = Math.floor(diffMs / 60_000);
    if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}
export default function RecentCompletions({ className, items }) {
    return (_jsxs(Card, { className: cn(className), children: [_jsx(CardHeader, { className: "mb-3", children: _jsx(CardTitle, { children: "Recent Completions" }) }), _jsx(CardContent, { className: "space-y-2", children: items.length ? (items.map((item) => (_jsxs("article", { className: "flex items-center justify-between gap-2 rounded-md border border-border bg-bg-surface px-3 py-2", children: [_jsx("p", { className: "text-sm text-text-primary", children: item.title }), _jsxs("span", { className: "inline-flex items-center gap-1 text-xs text-text-secondary", children: [_jsx(CheckCircle2, { className: "h-3.5 w-3.5 text-success" }), formatTimeAgo(item.completedAt)] })] }, item.id)))) : (_jsx("p", { className: "text-sm text-text-secondary", children: "No completed tasks yet." })) })] }));
}
//# sourceMappingURL=RecentCompletions.js.map