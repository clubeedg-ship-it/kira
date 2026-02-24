import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';
export const Input = forwardRef(({ className, id, label, error, helperText, icon, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (_jsxs("div", { className: "w-full space-y-1.5", children: [label ? (_jsx("label", { htmlFor: inputId, className: "text-xs font-medium text-text-secondary", children: label })) : null, _jsxs("div", { className: "relative", children: [icon ? (_jsx("span", { className: "pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-tertiary", children: icon })) : null, _jsx("input", { ref: ref, id: inputId, "aria-invalid": Boolean(error), className: cn('h-9 w-full rounded-md border border-border bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-tertiary', 'transition-colors duration-fast ease-out focus-visible:border-border-accent focus-visible:outline-none', error ? 'border-error focus-visible:border-error' : '', icon ? 'pl-9' : '', className), ...props })] }), error ? _jsx("p", { className: "text-xs text-error", children: error }) : null, !error && helperText ? _jsx("p", { className: "text-xs text-text-tertiary", children: helperText }) : null] }));
});
Input.displayName = 'Input';
//# sourceMappingURL=Input.js.map