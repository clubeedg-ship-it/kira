import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../lib/cn';
export function ProgressBar({ value, max = 100, showLabel = false, colorClassName }) {
    const safeMax = max > 0 ? max : 100;
    const safeValue = Math.min(Math.max(value, 0), safeMax);
    const percent = Math.round((safeValue / safeMax) * 100);
    return (_jsxs("div", { className: "w-full space-y-1.5", children: [showLabel ? _jsxs("div", { className: "text-right text-xs text-text-secondary", children: [percent, "%"] }) : null, _jsx("div", { className: "h-1 w-full overflow-hidden rounded-full bg-bg-wash", children: _jsx("div", { className: cn('h-full rounded-full bg-primary-500 transition-all duration-slow ease-out', colorClassName), style: { width: `${percent}%` } }) })] }));
}
//# sourceMappingURL=ProgressBar.js.map