import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../lib/cn';
const variantClasses = {
    flat: 'bg-bg-surface border-border-subtle shadow-none',
    raised: 'bg-bg-raised border-border shadow-sm',
    elevated: 'bg-bg-raised border-border-strong shadow-md'
};
export function Card({ className, variant = 'flat', ...props }) {
    return _jsx("div", { className: cn('rounded-lg border p-5', variantClasses[variant], className), ...props });
}
export function CardHeader({ className, ...props }) {
    return _jsx("div", { className: cn('mb-4 space-y-1', className), ...props });
}
export function CardTitle({ className, ...props }) {
    return _jsx("h3", { className: cn('font-display text-lg font-semibold text-text-primary', className), ...props });
}
export function CardDescription({ className, ...props }) {
    return _jsx("p", { className: cn('text-sm text-text-secondary', className), ...props });
}
export function CardContent({ className, ...props }) {
    return _jsx("div", { className: cn('space-y-4', className), ...props });
}
export function CardFooter({ className, ...props }) {
    return _jsx("div", { className: cn('mt-5 flex items-center justify-end gap-2', className), ...props });
}
//# sourceMappingURL=Card.js.map