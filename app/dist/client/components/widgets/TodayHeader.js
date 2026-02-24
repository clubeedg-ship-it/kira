import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle, CalendarDays, ListChecks } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Card } from '../ui';
export default function TodayHeader({ className, data }) {
    return (_jsxs(Card, { className: cn('relative overflow-hidden border-border/80 bg-bg-raised', className), children: [_jsx("div", { className: "pointer-events-none absolute inset-0 kira-glow", "aria-hidden": "true" }), _jsxs("div", { className: "relative", children: [_jsx("h1", { className: "font-display text-2xl font-semibold text-text-primary md:text-3xl", children: data.greeting }), _jsxs("p", { className: "mt-1 inline-flex items-center gap-2 text-sm text-text-secondary", children: [_jsx(CalendarDays, { className: "h-4 w-4" }), data.dateLabel] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-3 text-sm", children: [_jsxs("span", { className: "inline-flex items-center gap-2 rounded-full bg-bg-overlay px-3 py-1 text-text-secondary", children: [_jsx(ListChecks, { className: "h-4 w-4" }), data.tasksToday, " tasks today"] }), _jsxs("span", { className: "inline-flex items-center gap-2 rounded-full bg-bg-overlay px-3 py-1 text-text-secondary", children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), data.needAttention, " need attention"] })] })] })] }));
}
//# sourceMappingURL=TodayHeader.js.map