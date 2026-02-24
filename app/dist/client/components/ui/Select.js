import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';
export const Select = forwardRef(({ className, id, label, error, helperText, placeholder, icon, options, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    return (_jsxs("div", { className: "w-full space-y-1.5", children: [label ? (_jsx("label", { htmlFor: selectId, className: "text-xs font-medium text-text-secondary", children: label })) : null, _jsxs("div", { className: "relative", children: [icon ? _jsx("span", { className: "pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-tertiary", children: icon }) : null, _jsxs("select", { ref: ref, id: selectId, "aria-invalid": Boolean(error), className: cn('h-9 w-full appearance-none rounded-md border border-border bg-bg-surface px-3 text-sm text-text-primary', 'transition-colors duration-fast ease-out focus-visible:border-border-accent focus-visible:outline-none', 'pr-9', error ? 'border-error focus-visible:border-error' : '', icon ? 'pl-9' : '', className), ...props, children: [placeholder ? (_jsx("option", { value: "", disabled: true, children: placeholder })) : null, options?.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))), children] }), _jsx("span", { className: "pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-tertiary", children: "\u25BE" })] }), error ? _jsx("p", { className: "text-xs text-error", children: error }) : null, !error && helperText ? _jsx("p", { className: "text-xs text-text-tertiary", children: helperText }) : null] }));
});
Select.displayName = 'Select';
//# sourceMappingURL=Select.js.map