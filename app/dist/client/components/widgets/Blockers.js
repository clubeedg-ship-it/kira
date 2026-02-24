import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertOctagon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Card, CardContent, CardHeader, CardTitle } from '../ui';
export default function Blockers({ className, items }) {
    return (_jsxs(Card, { className: cn(className), children: [_jsx(CardHeader, { className: "mb-3", children: _jsxs(CardTitle, { className: "inline-flex items-center gap-2 text-error", children: [_jsx(AlertOctagon, { className: "h-5 w-5" }), "Blockers & Warnings"] }) }), _jsx(CardContent, { className: "space-y-2", children: items.length ? (items.map((item) => (_jsxs("article", { className: "rounded-md border border-error/50 bg-error/10 p-3", children: [_jsx("p", { className: "text-sm font-medium text-text-primary", children: item.title }), _jsx("p", { className: "mt-1 text-xs text-text-secondary", children: item.reason })] }, item.id)))) : (_jsx("p", { className: "text-sm text-text-secondary", children: "No blockers right now." })) })] }));
}
//# sourceMappingURL=Blockers.js.map