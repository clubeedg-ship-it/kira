import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cn } from '../../lib/cn';
const variantClasses = {
    primary: 'bg-primary-500 text-white shadow-glow-primary hover:bg-primary-400 focus-visible:outline-primary-400',
    secondary: 'bg-bg-raised text-text-primary hover:bg-bg-overlay focus-visible:outline-primary-400',
    ghost: 'bg-transparent text-text-secondary hover:bg-bg-overlay hover:text-text-primary focus-visible:outline-primary-400',
    danger: 'bg-error text-white hover:bg-error/90 focus-visible:outline-error',
    outline: 'border border-border text-text-primary hover:bg-bg-overlay focus-visible:outline-primary-400'
};
const sizeClasses = {
    sm: 'h-7 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-11 px-6 text-base'
};
export const Button = forwardRef(({ className, children, variant = 'primary', size = 'md', loading = false, disabled, ...props }, ref) => {
    return (_jsxs("button", { ref: ref, className: cn('inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-fast ease-out', 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40', variantClasses[variant], sizeClasses[size], className), disabled: disabled || loading, ...props, children: [loading ? (_jsx("span", { className: "h-4 w-4 animate-spin rounded-full border-2 border-current border-b-transparent", "aria-hidden": "true" })) : null, _jsx("span", { children: children })] }));
});
Button.displayName = 'Button';
//# sourceMappingURL=Button.js.map