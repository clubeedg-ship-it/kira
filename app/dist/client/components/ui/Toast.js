import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';
const variantClasses = {
    success: 'border-l-success',
    error: 'border-l-error',
    info: 'border-l-info',
    warning: 'border-l-warning'
};
const variantIcons = {
    success: _jsx(CheckCircle2, { className: "h-4 w-4 text-success" }),
    error: _jsx(AlertCircle, { className: "h-4 w-4 text-error" }),
    info: _jsx(Info, { className: "h-4 w-4 text-info" }),
    warning: _jsx(AlertTriangle, { className: "h-4 w-4 text-warning" })
};
export function Toast({ title, description, variant = 'info', actionLabel, onAction, onClose }) {
    return (_jsx("div", { className: cn('w-full max-w-sm rounded-lg border border-border bg-bg-raised p-3 shadow-md', 'border-l-4 text-sm', variantClasses[variant]), role: "status", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: "mt-0.5", children: variantIcons[variant] }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-semibold text-text-primary", children: title }), description ? _jsx("p", { className: "mt-1 text-text-secondary", children: description }) : null, actionLabel && onAction ? (_jsx("button", { className: "mt-2 text-xs font-semibold text-primary-300 hover:text-primary-200", onClick: onAction, children: actionLabel })) : null] }), onClose ? (_jsx(Button, { variant: "ghost", size: "sm", "aria-label": "Close toast", onClick: onClose, children: _jsx(X, { className: "h-4 w-4" }) })) : null] }) }));
}
//# sourceMappingURL=Toast.js.map