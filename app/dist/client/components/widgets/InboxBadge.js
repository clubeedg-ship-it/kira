import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '../ui';
function formatType(type) {
    return type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
export default function InboxBadge({ className, data }) {
    return (_jsx(Link, { to: "/inbox", className: "block", children: _jsxs(Card, { className: cn('transition-colors duration-fast hover:border-primary-300', className), children: [_jsx(CardHeader, { className: "mb-2", children: _jsxs(CardTitle, { className: "flex items-center justify-between gap-2", children: [_jsxs("span", { className: "inline-flex items-center gap-2", children: [_jsx(Inbox, { className: "h-5 w-5" }), "Inbox"] }), _jsx(Badge, { variant: "primary", size: "md", children: data.pendingCount })] }) }), _jsxs(CardContent, { className: "space-y-2", children: [_jsx("p", { className: "text-sm text-text-secondary", children: "Pending input queue items" }), data.breakdown.length ? (_jsx("div", { className: "flex flex-wrap gap-2", children: data.breakdown.map((entry) => (_jsxs(Badge, { variant: "default", children: [formatType(entry.type), ": ", entry.count] }, entry.type))) })) : (_jsx("p", { className: "text-xs text-text-tertiary", children: "No pending items." }))] })] }) }));
}
//# sourceMappingURL=InboxBadge.js.map