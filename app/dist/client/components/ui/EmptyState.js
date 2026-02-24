import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from './Button';
export function EmptyState({ icon, title, description, actionLabel, onAction }) {
    return (_jsxs("div", { className: "flex min-h-[260px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-10 text-center", children: [_jsx("div", { className: "mb-4 text-text-tertiary", children: icon }), _jsx("h3", { className: "font-display text-lg font-semibold text-text-primary", children: title }), _jsx("p", { className: "mt-2 max-w-md text-sm text-text-secondary", children: description }), actionLabel && onAction ? (_jsx(Button, { className: "mt-5", onClick: onAction, children: actionLabel })) : null] }));
}
//# sourceMappingURL=EmptyState.js.map