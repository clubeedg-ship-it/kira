import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, X, Loader2, CheckCircle2, AlertCircle, Clock, Maximize2, Minimize2, ChevronDown, ChevronRight, Wrench, MessageSquare } from 'lucide-react';
// ─── Helpers ────────────────────────────────────────────────────────
const BRIDGE_URL = 'http://localhost:3855';
const BRIDGE_TOKEN = 'kira-bridge-2024';
function fmtDuration(start, end) {
    const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60)
        return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60)
        return `${m}m ${s % 60}s`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function mdToHtml(t) {
    return t
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-zinc-900 rounded p-2 my-1 overflow-x-auto text-[11px]"><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code class="bg-zinc-800 px-1 rounded text-violet-300">$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<strong class="text-zinc-200">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br/>');
}
// ─── Data fetching ──────────────────────────────────────────────────
async function fetchAgents() {
    // Try bridge first
    let bridgeAgents = [];
    try {
        const r = await fetch(`${BRIDGE_URL}/api/sessions/openclaw`, {
            headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` },
            signal: AbortSignal.timeout(3000),
        });
        if (r.ok) {
            const sessions = await r.json();
            bridgeAgents = sessions.map(s => ({
                id: s.sessionId,
                name: s.label || s.sessionKey,
                status: s.state === 'complete' ? 'done' : s.state,
                task: s.task || s.lastMessage || '',
                startedAt: s.startedAt,
                finishedAt: s.state !== 'running' ? s.lastActivityAt : undefined,
                lastOutput: s.lastMessage,
                source: 'bridge',
                sessionId: s.sessionId,
                kind: s.kind,
            }));
        }
    }
    catch { /* bridge unavailable */ }
    if (bridgeAgents.length > 0)
        return bridgeAgents;
    // Fallback to legacy
    const results = [];
    try {
        const [r1, r2] = await Promise.all([
            fetch('/api/v1/agents/runs?status=all&limit=20', { credentials: 'include' }).catch(() => null),
            fetch('/api/v1/agents/openclaw', { credentials: 'include' }).catch(() => null),
        ]);
        for (const r of [r1, r2]) {
            if (r?.ok) {
                const j = await r.json();
                for (const a of (j.data || [])) {
                    results.push({
                        id: a.id, name: a.name, status: a.status, task: a.input,
                        startedAt: a.startedAt, finishedAt: a.finishedAt,
                        lastOutput: a.output?.slice(0, 200), source: 'legacy',
                    });
                }
            }
        }
    }
    catch { /* ignore */ }
    return results;
}
async function fetchTranscript(sessionId) {
    try {
        const r = await fetch(`${BRIDGE_URL}/api/sessions/openclaw/${sessionId}/transcript`, {
            headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` },
            signal: AbortSignal.timeout(5000),
        });
        if (!r.ok)
            return [];
        const data = await r.json();
        return data.messages || [];
    }
    catch {
        return [];
    }
}
// ─── StatusIcon ─────────────────────────────────────────────────────
function StatusIcon({ status }) {
    switch (status) {
        case 'running': return _jsx(Loader2, { size: 12, className: "animate-spin text-violet-400" });
        case 'pending': return _jsx(Clock, { size: 12, className: "text-amber-400" });
        case 'done': return _jsx(CheckCircle2, { size: 12, className: "text-green-400" });
        case 'error': return _jsx(AlertCircle, { size: 12, className: "text-red-400" });
        default: return _jsx(Bot, { size: 12, className: "text-zinc-500" });
    }
}
function statusBorder(status) {
    switch (status) {
        case 'running': return 'border-violet-500/30 bg-violet-500/5';
        case 'pending': return 'border-amber-500/30 bg-amber-500/5';
        case 'done': return 'border-green-500/30 bg-green-500/5';
        case 'error': return 'border-red-500/30 bg-red-500/5';
        default: return 'border-zinc-800 bg-zinc-900/50';
    }
}
// ─── LiveTimer ──────────────────────────────────────────────────────
function LiveTimer({ start, end, running }) {
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!running)
            return;
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, [running]);
    return _jsx("span", { className: "text-[10px] text-zinc-600 tabular-nums", children: fmtDuration(start, end) });
}
// ─── ToolCallBlock ──────────────────────────────────────────────────
function ToolCallBlock({ call }) {
    const [open, setOpen] = useState(false);
    return (_jsxs("div", { className: "my-1 border border-zinc-800 rounded-lg overflow-hidden", children: [_jsxs("button", { onClick: () => setOpen(!open), className: "w-full flex items-center gap-2 px-2.5 py-1.5 bg-zinc-900/80 hover:bg-zinc-800/80 transition-colors text-left", children: [open ? _jsx(ChevronDown, { size: 10, className: "text-zinc-500" }) : _jsx(ChevronRight, { size: 10, className: "text-zinc-500" }), _jsx(Wrench, { size: 10, className: "text-amber-400" }), _jsx("span", { className: "text-[11px] font-mono text-amber-300 truncate", children: call.name })] }), open && (_jsxs("div", { className: "px-2.5 py-2 bg-zinc-950/50 space-y-2", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[9px] uppercase tracking-wider text-zinc-600", children: "Input" }), _jsx("pre", { className: "text-[10px] text-zinc-400 font-mono whitespace-pre-wrap mt-0.5 max-h-[200px] overflow-y-auto", children: call.input })] }), call.output && (_jsxs("div", { children: [_jsx("span", { className: "text-[9px] uppercase tracking-wider text-zinc-600", children: "Output" }), _jsx("pre", { className: "text-[10px] text-zinc-400 font-mono whitespace-pre-wrap mt-0.5 max-h-[200px] overflow-y-auto", children: call.output })] }))] }))] }));
}
// ─── MessageBubble ──────────────────────────────────────────────────
function MessageBubble({ msg }) {
    if (msg.role === 'system') {
        return _jsx("p", { className: "text-[10px] text-zinc-600 italic text-center px-3 py-1", children: msg.content.slice(0, 200) });
    }
    if (msg.role === 'tool_result') {
        return (_jsx("div", { className: "px-3 py-1", children: _jsxs("div", { className: "bg-zinc-900/60 border border-zinc-800/50 rounded-lg px-2.5 py-1.5", children: [_jsx("span", { className: "text-[9px] uppercase tracking-wider text-amber-500/60", children: "Tool Result" }), _jsx("pre", { className: "text-[10px] text-zinc-500 font-mono whitespace-pre-wrap mt-0.5 max-h-[120px] overflow-y-auto", children: msg.content.slice(0, 500) })] }) }));
    }
    const isUser = msg.role === 'user';
    return (_jsx("div", { className: "px-3 py-1", children: _jsxs("div", { className: `rounded-lg px-3 py-2 ${isUser ? 'bg-zinc-800 border border-zinc-700/50' : 'bg-zinc-900/60 border border-zinc-800/30'}`, children: [_jsxs("div", { className: "flex items-center gap-1.5 mb-1", children: [_jsx("span", { className: `text-[9px] font-semibold uppercase tracking-wider ${isUser ? 'text-blue-400/70' : 'text-violet-400/70'}`, children: isUser ? 'User' : 'Assistant' }), msg.timestamp && (_jsx("span", { className: "text-[9px] text-zinc-700", children: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }))] }), _jsx("div", { className: "text-[11px] text-zinc-300 leading-relaxed break-words", dangerouslySetInnerHTML: { __html: mdToHtml(msg.content) } }), msg.toolCalls?.map((tc, i) => _jsx(ToolCallBlock, { call: tc }, i))] }) }));
}
// ─── TranscriptView ─────────────────────────────────────────────────
function TranscriptView({ agent, onClose }) {
    const scrollRef = useRef(null);
    const isRunning = agent.status === 'running';
    const { data: messages = [], isLoading } = useQuery({
        queryKey: ['transcript', agent.id],
        queryFn: () => agent.sessionId ? fetchTranscript(agent.sessionId) : Promise.resolve([]),
        enabled: !!agent.sessionId,
        refetchInterval: isRunning ? 3000 : false,
    });
    useEffect(() => {
        if (isRunning && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length, isRunning]);
    return (_jsxs("div", { className: "flex flex-col h-full", children: [_jsxs("div", { className: "flex items-center justify-between px-3 py-2 border-b border-zinc-800/50 shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx(StatusIcon, { status: agent.status }), _jsx("span", { className: "text-xs font-medium text-zinc-200 truncate", children: agent.name }), _jsx(LiveTimer, { start: agent.startedAt, end: agent.finishedAt, running: isRunning })] }), _jsx("button", { onClick: onClose, className: "p-1 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0", children: _jsx(X, { size: 12 }) })] }), _jsx("div", { className: "px-3 py-1.5 border-b border-zinc-800/30 shrink-0", children: _jsx("p", { className: "text-[10px] text-zinc-500 leading-relaxed", children: agent.task.slice(0, 200) }) }), _jsx("div", { ref: scrollRef, className: "flex-1 overflow-y-auto py-2 space-y-0.5", children: isLoading ? (_jsxs("div", { className: "flex items-center justify-center py-8 gap-2 text-zinc-600", children: [_jsx(Loader2, { size: 14, className: "animate-spin" }), _jsx("span", { className: "text-xs", children: "Loading transcript\u2026" })] })) : messages.length > 0 ? (messages.map((m, i) => _jsx(MessageBubble, { msg: m }, i))) : (_jsxs("div", { className: "flex flex-col items-center justify-center py-8 text-zinc-700", children: [_jsx(MessageSquare, { size: 20, className: "mb-2" }), _jsx("span", { className: "text-xs", children: agent.source === 'legacy' ? 'Transcript unavailable (legacy agent)' : 'No messages yet' }), agent.source === 'legacy' && agent.lastOutput && (_jsxs("div", { className: "mt-3 mx-3 p-2 bg-zinc-900/50 border border-zinc-800 rounded-lg", children: [_jsx("span", { className: "text-[9px] text-zinc-600 uppercase tracking-wider", children: "Last Output" }), _jsx("pre", { className: "text-[10px] text-zinc-400 font-mono whitespace-pre-wrap mt-1", children: agent.lastOutput })] }))] })) })] }));
}
// ─── Main Component ─────────────────────────────────────────────────
export default function AgentActivityPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const { data: agents = [] } = useQuery({
        queryKey: ['unified-agents'],
        queryFn: fetchAgents,
        refetchInterval: 3000,
    });
    const activeCount = agents.filter(a => a.status === 'running' || a.status === 'pending').length;
    const hasActive = activeCount > 0;
    useEffect(() => {
        if (hasActive && !isOpen)
            setIsOpen(true);
    }, [hasActive]);
    const selected = agents.find(a => a.id === selectedId);
    if (agents.length === 0)
        return null;
    // Collapsed pill
    if (!isOpen) {
        return (_jsxs("button", { onClick: () => setIsOpen(true), className: `absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all
          ${hasActive
                ? 'bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-500 hover:bg-zinc-800'}`, children: [hasActive && _jsx("span", { className: "w-2 h-2 rounded-full bg-violet-400 animate-pulse" }), _jsx(Bot, { size: 14 }), _jsxs("span", { className: "text-xs font-medium", children: [activeCount, " active"] })] }));
    }
    return (_jsxs("div", { className: `absolute top-3 right-3 z-20 flex flex-col border border-zinc-800 rounded-xl bg-zinc-950/95 backdrop-blur-sm shadow-2xl transition-all duration-200
      ${isExpanded ? 'w-[min(560px,calc(100%-24px))] max-h-[80%]' : 'w-[min(360px,calc(100%-24px))] max-h-[55%]'}`, children: [_jsxs("div", { className: "flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/50 shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [hasActive && _jsx("span", { className: "w-2 h-2 rounded-full bg-violet-400 animate-pulse" }), _jsx("span", { className: "text-xs font-semibold text-zinc-300", children: "Agents" }), _jsxs("span", { className: "text-[10px] text-zinc-600 bg-zinc-800 px-1.5 rounded-full", children: [activeCount, " active \u00B7 ", agents.length, " total"] })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => setIsExpanded(!isExpanded), className: "p-1 text-zinc-600 hover:text-zinc-300 transition-colors", children: isExpanded ? _jsx(Minimize2, { size: 12 }) : _jsx(Maximize2, { size: 12 }) }), _jsx("button", { onClick: () => { setIsOpen(false); setSelectedId(null); }, className: "p-1 text-zinc-600 hover:text-zinc-300 transition-colors", children: _jsx(X, { size: 12 }) })] })] }), _jsx("div", { className: "flex-1 overflow-hidden flex flex-col", children: selected ? (_jsx(TranscriptView, { agent: selected, onClose: () => setSelectedId(null) })) : (_jsx("div", { className: "flex-1 overflow-y-auto p-2 space-y-1", children: agents.map(agent => (_jsxs("button", { onClick: () => setSelectedId(agent.id), className: `w-full flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors text-left hover:bg-zinc-800/30
                  ${statusBorder(agent.status)}`, children: [_jsx("div", { className: "mt-0.5", children: _jsx(StatusIcon, { status: agent.status }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-xs font-medium text-zinc-200 truncate", children: agent.name }), _jsx(LiveTimer, { start: agent.startedAt, end: agent.finishedAt, running: agent.status === 'running' })] }), _jsx("p", { className: "text-[11px] text-zinc-500 truncate mt-0.5", children: agent.task?.slice(0, 80) }), agent.kind && (_jsx("span", { className: `text-[9px] mt-1 inline-block px-1.5 py-0.5 rounded-full ${agent.kind === 'sub-agent' ? 'bg-violet-500/10 text-violet-400' : 'bg-zinc-800 text-zinc-500'}`, children: agent.kind })), agent.status === 'done' && agent.lastOutput && (_jsxs("p", { className: "text-[10px] text-green-400/70 truncate mt-0.5", children: ["\u2713 ", agent.lastOutput.slice(0, 60), "\u2026"] }))] })] }, agent.id))) })) })] }));
}
//# sourceMappingURL=AgentActivityPanel.js.map