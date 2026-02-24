import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';
export function Drawer({ open, title, children, footer, onClose, hideHeader = false, panelClassName, contentClassName, }) {
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
    return (_jsxs("div", { className: "fixed inset-0 z-30", "aria-hidden": !open, children: [_jsx("button", { className: "absolute inset-0 bg-black/20", onClick: onClose, "aria-label": "Close drawer" }), _jsxs("aside", { className: cn('absolute right-0 top-0 h-full w-full max-w-[480px] border-l border-border bg-bg-raised shadow-lg', 'flex flex-col', panelClassName), role: "dialog", "aria-modal": "true", children: [hideHeader ? null : (_jsxs("header", { className: "flex h-14 items-center justify-between border-b border-border px-4", children: [_jsx("h3", { className: "font-display text-lg font-semibold text-text-primary", children: title }), _jsx(Button, { variant: "ghost", size: "sm", "aria-label": "Close drawer", onClick: onClose, children: _jsx(ArrowRight, { className: "h-4 w-4" }) })] })), _jsx("div", { className: cn('flex-1 overflow-y-auto p-4', contentClassName), children: children }), footer ? _jsx("footer", { className: "border-t border-border px-4 py-3", children: footer }) : null] })] }));
}
//# sourceMappingURL=Drawer.js.map