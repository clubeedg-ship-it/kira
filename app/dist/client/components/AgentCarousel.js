import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, Loader2, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
export default function AgentCarousel() {
    const [expandedId, setExpandedId] = useState(null);
    const [dismissed, setDismissed] = useState(new Set());
    const scrollRef = useRef(null);
    const transcriptRef = useRef(null);
    const { data: dbAgents = [] } = useQuery({
        queryKey: ['agent-runs-carousel'],
        queryFn: async () => {
            const resp = await fetch('/api/v1/agents/runs?status=all&limit=20', { credentials: 'include' });
            if (!resp.ok)
                return [];
            const json = await resp.json();
            return json.data || [];
        },
        refetchInterval: 3000,
    });
    const { data: openclawAgents = [] } = useQuery({
        queryKey: ['openclaw-agents-carousel'],
        queryFn: async () => {
            try {
                const resp = await fetch('/api/v1/agents/runs?status=all&limit=10', { credentials: 'include' });
                if (!resp.ok)
                    return [];
                const json = await resp.json();
                return Array.isArray(json.data) ? json.data : [];
            }
            catch {
                return [];
            }
        },
        refetchInterval: 5000,
    });
    const allAgents = [...dbAgents, ...openclawAgents].filter(a => !dismissed.has(a.id));
    // Auto-dismiss completed agents after 30s
    useEffect(() => {
        const timers = [];
        allAgents.forEach(a => {
            if ((a.status === 'done' || a.status === 'error') && a.finishedAt) {
                const elapsed = Date.now() - new Date(a.finishedAt).getTime();
                const remaining = Math.max(0, 30000 - elapsed);
                timers.push(setTimeout(() => {
                    setDismissed(prev => new Set(prev).add(a.id));
                }, remaining));
            }
        });
        return () => timers.forEach(clearTimeout);
    }, [allAgents]);
    // Auto-scroll transcript
    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [expandedId, allAgents]);
    if (allAgents.length === 0)
        return null;
    const activeCount = allAgents.filter(a => a.status === 'running' || a.status === 'pending').length;
    const scrollCarousel = (dir) => {
        if (!scrollRef.current)
            return;
        scrollRef.current.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' });
    };
    const formatDuration = (start, end) => {
        const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
        const s = Math.floor(ms / 1000);
        if (s < 60)
            return `${s}s`;
        return `${Math.floor(s / 60)}m ${s % 60}s`;
    };
    const borderClass = (status) => {
        switch (status) {
            case 'running': return 'border-violet-500/50 shadow-[0_0_8px_rgba(139,92,246,0.15)]';
            case 'pending': return 'border-amber-500/40';
            case 'done': return 'border-green-500/40';
            case 'error': return 'border-red-500/40';
            default: return 'border-zinc-800';
        }
    };
    const expandedAgent = allAgents.find(a => a.id === expandedId);
    return (_jsxs("div", { className: "w-full flex-shrink-0 border-b border-zinc-800/40 bg-zinc-950/60", children: [_jsxs("div", { className: "flex items-center justify-between px-3 py-1.5", children: [_jsxs("div", { className: "flex items-center gap-2", children: [activeCount > 0 && _jsx("span", { className: "w-2 h-2 rounded-full bg-violet-400 animate-pulse" }), _jsx("span", { className: "text-[11px] font-medium text-zinc-400", children: activeCount > 0 ? `${activeCount} Agent${activeCount > 1 ? 's' : ''} Working` : 'Recent Agents' })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => scrollCarousel('left'), className: "p-0.5 text-zinc-600 hover:text-zinc-300", children: _jsx(ChevronLeft, { size: 14 }) }), _jsx("button", { onClick: () => scrollCarousel('right'), className: "p-0.5 text-zinc-600 hover:text-zinc-300", children: _jsx(ChevronRight, { size: 14 }) })] })] }), expandedAgent && (_jsxs("div", { className: "mx-2 mb-2 border border-zinc-800 rounded-lg bg-zinc-900/80 overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between px-3 py-2 border-b border-zinc-800/50", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [expandedAgent.status === 'running' ? (_jsx(Loader2, { size: 12, className: "animate-spin text-violet-400 flex-shrink-0" })) : expandedAgent.status === 'done' ? (_jsx(CheckCircle2, { size: 12, className: "text-green-400 flex-shrink-0" })) : expandedAgent.status === 'error' ? (_jsx(AlertCircle, { size: 12, className: "text-red-400 flex-shrink-0" })) : (_jsx(Bot, { size: 12, className: "text-zinc-500 flex-shrink-0" })), _jsx("span", { className: "text-xs font-medium text-zinc-200 truncate", children: expandedAgent.name }), _jsx("span", { className: "text-[10px] text-zinc-600", children: formatDuration(expandedAgent.startedAt, expandedAgent.finishedAt) })] }), _jsx("button", { onClick: () => setExpandedId(null), className: "p-1 text-zinc-600 hover:text-zinc-300", children: _jsx(X, { size: 12 }) })] }), expandedAgent.input && (_jsxs("div", { className: "px-3 py-2 border-b border-zinc-800/30", children: [_jsx("span", { className: "text-[10px] text-zinc-600 uppercase tracking-wider", children: "Task" }), _jsx("p", { className: "text-xs text-zinc-400 mt-0.5 line-clamp-2", children: expandedAgent.input })] })), _jsx("div", { ref: transcriptRef, className: "max-h-64 overflow-y-auto p-3", children: expandedAgent.output ? (_jsx("pre", { className: "text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed", children: expandedAgent.output })) : expandedAgent.error ? (_jsx("pre", { className: "text-xs text-red-300 whitespace-pre-wrap font-mono", children: expandedAgent.error })) : expandedAgent.status === 'running' ? (_jsxs("div", { className: "flex items-center gap-2 text-xs text-violet-400", children: [_jsx(Loader2, { size: 12, className: "animate-spin" }), " Working..."] })) : (_jsx("span", { className: "text-xs text-zinc-600", children: "No output yet" })) })] })), _jsx("div", { ref: scrollRef, className: "flex gap-2 px-2 pb-2 overflow-x-auto", style: { scrollSnapType: 'x mandatory', scrollbarWidth: 'thin' }, children: allAgents.map(agent => (_jsxs("button", { onClick: () => setExpandedId(expandedId === agent.id ? null : agent.id), className: `flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-zinc-900 transition-all hover:bg-zinc-800/60 text-left
              ${borderClass(agent.status)}
              ${expandedId === agent.id ? 'ring-1 ring-violet-500/30' : ''}
              ${agent.status === 'running' ? 'animate-pulse-subtle' : ''}`, style: { scrollSnapAlign: 'start', minWidth: 200, maxWidth: 280 }, children: [agent.status === 'running' ? (_jsx(Loader2, { size: 14, className: "animate-spin text-violet-400 flex-shrink-0" })) : agent.status === 'done' ? (_jsx(CheckCircle2, { size: 14, className: "text-green-400 flex-shrink-0" })) : agent.status === 'error' ? (_jsx(AlertCircle, { size: 14, className: "text-red-400 flex-shrink-0" })) : (_jsx(Bot, { size: 14, className: "text-amber-400 flex-shrink-0" })), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-xs font-medium text-zinc-200 truncate", children: agent.name }), _jsx("div", { className: "text-[10px] text-zinc-600 truncate", children: agent.input?.slice(0, 50) || 'Working...' })] }), _jsx("span", { className: "text-[10px] text-zinc-600 flex-shrink-0", children: formatDuration(agent.startedAt, agent.finishedAt) })] }, agent.id))) })] }));
}
//# sourceMappingURL=AgentCarousel.js.map