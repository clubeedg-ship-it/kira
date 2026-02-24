import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from '../components/ui';
export default function PlaceholderPage({ title, description }) {
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: title }), _jsx(CardDescription, { children: description })] }), _jsx(CardContent, { children: _jsx(EmptyState, { icon: _jsx(Sparkles, { className: "h-10 w-10" }), title: "Coming soon", description: "This route is wired into the app shell and ready for the next task implementation." }) })] }));
}
//# sourceMappingURL=PlaceholderPage.js.map