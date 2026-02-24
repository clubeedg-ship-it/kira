import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import FormRenderer from './FormRenderer';
import WizardRenderer from './WizardRenderer';
import HtmlCanvas from './HtmlCanvas';
import AppPreview from './AppPreview';
async function apiFetch(url, opts) {
    const res = await fetch(url, {
        ...opts,
        headers: { 'Content-Type': 'application/json', ...opts?.headers },
        credentials: 'include',
    });
    if (!res.ok)
        throw new Error(`API error ${res.status}`);
    const json = await res.json();
    return json.data;
}
export default function LiveCanvas({ canvasId, onDismiss }) {
    const [canvas, setCanvas] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        apiFetch(`/api/v1/canvas/${canvasId}`)
            .then(setCanvas)
            .catch(e => setError(e.message));
    }, [canvasId]);
    const handleSubmit = async (data) => {
        await apiFetch(`/api/v1/canvas/${canvasId}/respond`, {
            method: 'POST',
            body: JSON.stringify({ response: data }),
        });
    };
    const handleDismiss = async () => {
        await apiFetch(`/api/v1/canvas/${canvasId}`, { method: 'DELETE' });
        onDismiss?.();
    };
    if (error) {
        return (_jsxs("div", { className: "flex items-center justify-center h-full text-red-400 text-sm", children: ["Failed to load canvas: ", error] }));
    }
    if (!canvas) {
        return (_jsx("div", { className: "flex items-center justify-center h-full", children: _jsx("div", { className: "w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" }) }));
    }
    const content = canvas.content;
    return (_jsxs("div", { className: "flex flex-col h-full bg-zinc-950", children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-3 border-b border-zinc-800", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-medium uppercase tracking-wider", children: canvas.type }), _jsx("h2", { className: "text-sm font-medium text-zinc-100", children: canvas.title })] }), _jsx("button", { onClick: handleDismiss, className: "text-zinc-500 hover:text-zinc-300 transition-colors", title: "Dismiss", children: _jsx("svg", { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), _jsx("div", { className: "flex-1 overflow-auto p-6", children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [canvas.type === 'form' && (_jsx(FormRenderer, { definition: content, onSubmit: handleSubmit, onCancel: handleDismiss })), canvas.type === 'wizard' && (_jsx(WizardRenderer, { definition: content, onSubmit: handleSubmit, onCancel: handleDismiss })), canvas.type === 'html' && (_jsx("div", { className: "h-[600px]", children: _jsx(HtmlCanvas, { html: content.html || String(content) }) })), canvas.type === 'visualization' && (_jsx("div", { className: "h-[600px]", children: _jsx(HtmlCanvas, { html: content.html || '<p>Visualization</p>' }) })), canvas.type === 'app' && (_jsx("div", { className: "h-[600px]", children: _jsx(AppPreview, { url: content.url || '', title: canvas.title }) }))] }) })] }));
}
//# sourceMappingURL=LiveCanvas.js.map