import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '../ui';
const PRIORITY_META = {
    0: { label: 'Critical', variant: 'danger' },
    1: { label: 'High', variant: 'warning' },
    2: { label: 'Medium', variant: 'info' },
    3: { label: 'Low', variant: 'default' },
};
const dateFormatter = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
});
function formatDueDate(dueDate) {
    if (!dueDate) {
        return 'No due date';
    }
    const parsedDate = new Date(`${dueDate}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
        return dueDate;
    }
    return dateFormatter.format(parsedDate);
}
function isOverdue(dueDate) {
    if (!dueDate) {
        return false;
    }
    return new Date(`${dueDate}T23:59:59`).getTime() < Date.now();
}
export default function TopPriorities({ className, items }) {
    return (_jsxs(Card, { className: cn(className), children: [_jsx(CardHeader, { className: "mb-3", children: _jsx(CardTitle, { children: "Top Priorities" }) }), _jsxs(CardContent, { className: "space-y-3", children: [items.length ? (items.map((item) => {
                        const priority = PRIORITY_META[item.priority] ?? PRIORITY_META[3];
                        return (_jsxs("article", { className: "rounded-md border border-border bg-bg-surface p-3", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-2", children: [_jsx("p", { className: "text-sm font-medium text-text-primary", children: item.title }), _jsx(Badge, { variant: priority.variant, size: "sm", children: priority.label })] }), _jsx("p", { className: "mt-1 text-xs text-text-tertiary", children: item.project ?? 'No project' }), _jsxs("div", { className: "mt-2 flex items-center justify-between text-xs", children: [_jsxs("span", { className: "text-text-tertiary", children: ["score ", item.priorityScore] }), _jsx("span", { className: cn('text-text-secondary', isOverdue(item.dueDate) ? 'text-error' : ''), children: formatDueDate(item.dueDate) })] })] }, item.id));
                    })) : (_jsx("p", { className: "text-sm text-text-secondary", children: "No priority tasks yet." })), _jsxs(Link, { to: "/operations", className: "inline-flex items-center gap-1 text-sm font-medium text-primary-300 hover:text-primary-200", children: ["View all tasks", _jsx(ArrowRight, { className: "h-4 w-4" })] })] })] }));
}
//# sourceMappingURL=TopPriorities.js.map