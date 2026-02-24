import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Target } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Card, CardContent, CardHeader, CardTitle, ProgressBar } from '../ui';
function getProgressColor(progress) {
    if (progress <= 33) {
        return 'bg-error';
    }
    if (progress <= 66) {
        return 'bg-warning';
    }
    return 'bg-success';
}
export default function KeyResultProgress({ className, objectives }) {
    return (_jsxs(Card, { className: cn(className), children: [_jsx(CardHeader, { className: "mb-3", children: _jsxs(CardTitle, { className: "inline-flex items-center gap-2", children: [_jsx(Target, { className: "h-5 w-5" }), "Key Result Progress"] }) }), _jsx(CardContent, { className: "space-y-4", children: objectives.length ? (objectives.map((objective) => (_jsxs("article", { className: "rounded-md border border-border bg-bg-surface p-3", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-2", children: [_jsx("p", { className: "text-sm font-medium text-text-primary", children: objective.title }), _jsxs("span", { className: "text-xs text-text-secondary", children: [objective.progress, "%"] })] }), _jsx(ProgressBar, { value: objective.progress, colorClassName: getProgressColor(objective.progress) }), _jsx("div", { className: "mt-3 space-y-2", children: objective.keyResults.map((result) => (_jsxs("div", { className: "rounded bg-bg-overlay/60 px-2 py-1.5", children: [_jsxs("div", { className: "mb-1 flex items-center justify-between gap-2 text-xs", children: [_jsx("span", { className: "text-text-secondary", children: result.label }), _jsxs("span", { className: "font-mono text-text-tertiary", children: [result.current, "/", result.target] })] }), _jsx(ProgressBar, { value: result.progress, colorClassName: getProgressColor(result.progress) })] }, result.id))) })] }, objective.id)))) : (_jsx("p", { className: "text-sm text-text-secondary", children: "No objectives are tracking progress yet." })) })] }));
}
//# sourceMappingURL=KeyResultProgress.js.map