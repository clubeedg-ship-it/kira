import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';
const sizeClasses = {
    sm: 'max-w-[400px]',
    md: 'max-w-[560px]',
    lg: 'max-w-[720px]'
};
export function Modal({ open, title, children, footer, size = 'md', onClose }) {
    useEffect(() => {
        if (!open) {
            return;
        }
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);
    if (!open) {
        return null;
    }
    return (_jsxs("div", { className: "fixed inset-0 z-modal flex items-center justify-center bg-black/40 p-4", role: "dialog", "aria-modal": "true", children: [_jsx("button", { className: "absolute inset-0 cursor-default", "aria-label": "Close modal", onClick: onClose }), _jsxs("div", { className: cn('relative w-full rounded-lg border border-border bg-bg-raised p-6 shadow-lg', sizeClasses[size]), children: [title ? (_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h3", { className: "font-display text-xl font-semibold text-text-primary", children: title }), _jsx(Button, { variant: "ghost", size: "sm", "aria-label": "Close modal", onClick: onClose, children: _jsx(X, { className: "h-4 w-4" }) })] })) : null, _jsx("div", { children: children }), footer ? _jsx("div", { className: "mt-5 flex items-center justify-end gap-2", children: footer }) : null] })] }));
}
//# sourceMappingURL=Modal.js.map