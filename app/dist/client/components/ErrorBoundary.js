import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
export class ErrorBoundary extends Component {
    state = { error: null };
    static getDerivedStateFromError(error) {
        return { error };
    }
    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }
    render() {
        if (this.state.error) {
            return this.props.fallback || (_jsxs("div", { style: { padding: 24, color: '#ef4444', fontFamily: 'monospace' }, children: [_jsx("h2", { children: "Something crashed" }), _jsx("pre", { style: { whiteSpace: 'pre-wrap', fontSize: 12, marginTop: 8 }, children: this.state.error.message }), _jsx("button", { onClick: () => this.setState({ error: null }), style: { marginTop: 16, padding: '6px 16px', cursor: 'pointer', border: '1px solid #ef4444', borderRadius: 4 }, children: "Try Again" })] }));
        }
        return this.props.children;
    }
}
//# sourceMappingURL=ErrorBoundary.js.map