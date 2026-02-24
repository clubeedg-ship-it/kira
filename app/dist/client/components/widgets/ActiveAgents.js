import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bot } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Card, CardContent, CardHeader, CardTitle } from '../ui';
const STATUS_LABEL = {
    idle: 'Idle',
    waiting: 'Waiting',
    working: 'Working',
};
const STATUS_DOT_CLASS = {
    idle: 'bg-text-tertiary',
    waiting: 'bg-warning',
    working: 'bg-success',
};
export default function ActiveAgents({ agents, className }) {
    return (_jsxs(Card, { className: cn(className), children: [_jsx(CardHeader, { className: "mb-3", children: _jsxs(CardTitle, { className: "inline-flex items-center gap-2", children: [_jsx(Bot, { className: "h-5 w-5" }), "Active Agents"] }) }), _jsx(CardContent, { className: "space-y-3", children: agents.length ? (agents.map((agent) => (_jsx("article", { className: "rounded-md border border-border bg-bg-surface p-3", children: _jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-text-primary", children: agent.name }), _jsx("p", { className: "mt-1 text-xs text-text-secondary", children: agent.currentTask ?? 'Idle' })] }), _jsxs("span", { className: "inline-flex items-center gap-2 text-xs text-text-secondary", children: [_jsx("span", { className: cn('inline-block h-2.5 w-2.5 rounded-full', STATUS_DOT_CLASS[agent.status], agent.status === 'working' ? 'animate-pulse' : '') }), STATUS_LABEL[agent.status]] })] }) }, agent.id)))) : (_jsx("p", { className: "text-sm text-text-secondary", children: "No agent activity yet." })) })] }));
}
//# sourceMappingURL=ActiveAgents.js.map