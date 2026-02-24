import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../lib/cn';
const variantClasses = {
    default: 'bg-bg-overlay text-text-secondary',
    primary: 'bg-primary-900 text-primary-200',
    success: 'bg-success-subtle text-success',
    warning: 'bg-warning-subtle text-warning',
    danger: 'bg-error-subtle text-error',
    info: 'bg-info-subtle text-info'
};
const sizeClasses = {
    sm: 'h-[18px] px-2 text-xs',
    md: 'h-[22px] px-2.5 text-xs'
};
export function Badge({ className, variant = 'default', size = 'sm', ...props }) {
    return (_jsx("span", { className: cn('inline-flex items-center rounded-full font-medium', variantClasses[variant], sizeClasses[size], className), ...props }));
}
//# sourceMappingURL=Badge.js.map