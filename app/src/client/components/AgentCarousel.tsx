import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, Loader2, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface AgentRun {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  input: string;
  output?: string;
  error?: string;
  startedAt: string;
  finishedAt?: string;
}

export default function AgentCarousel() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const { data: dbAgents = [] } = useQuery<AgentRun[]>({
    queryKey: ['agent-runs-carousel'],
    queryFn: async () => {
      const resp = await fetch('/api/v1/agents/runs?status=all&limit=20', { credentials: 'include' });
      if (!resp.ok) return [];
      const json = await resp.json();
      return json.data || [];
    },
    refetchInterval: 3000,
  });

  const { data: openclawAgents = [] } = useQuery<AgentRun[]>({
    queryKey: ['openclaw-agents-carousel'],
    queryFn: async () => {
      try {
        const resp = await fetch('/api/v1/agents/runs?status=all&limit=10', { credentials: 'include' });
        if (!resp.ok) return [];
        const json = await resp.json();
        return Array.isArray(json.data) ? json.data : [];
      } catch { return []; }
    },
    refetchInterval: 5000,
  });

  const allAgents = [...dbAgents, ...openclawAgents].filter(a => !dismissed.has(a.id));

  // Auto-dismiss completed agents after 30s
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
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

  if (allAgents.length === 0) return null;

  const activeCount = allAgents.filter(a => a.status === 'running' || a.status === 'pending').length;

  const scrollCarousel = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  const formatDuration = (start: string, end?: string) => {
    const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const borderClass = (status: string) => {
    switch (status) {
      case 'running': return 'border-violet-500/50 shadow-[0_0_8px_rgba(139,92,246,0.15)]';
      case 'pending': return 'border-amber-500/40';
      case 'done': return 'border-green-500/40';
      case 'error': return 'border-red-500/40';
      default: return 'border-zinc-800';
    }
  };

  const expandedAgent = allAgents.find(a => a.id === expandedId);

  return (
    <div className="w-full flex-shrink-0 border-b border-zinc-800/40 bg-zinc-950/60">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-2">
          {activeCount > 0 && <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />}
          <span className="text-[11px] font-medium text-zinc-400">
            {activeCount > 0 ? `${activeCount} Agent${activeCount > 1 ? 's' : ''} Working` : 'Recent Agents'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => scrollCarousel('left')} className="p-0.5 text-zinc-600 hover:text-zinc-300"><ChevronLeft size={14} /></button>
          <button onClick={() => scrollCarousel('right')} className="p-0.5 text-zinc-600 hover:text-zinc-300"><ChevronRight size={14} /></button>
        </div>
      </div>

      {/* Expanded view */}
      {expandedAgent && (
        <div className="mx-2 mb-2 border border-zinc-800 rounded-lg bg-zinc-900/80 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
            <div className="flex items-center gap-2 min-w-0">
              {expandedAgent.status === 'running' ? (
                <Loader2 size={12} className="animate-spin text-violet-400 flex-shrink-0" />
              ) : expandedAgent.status === 'done' ? (
                <CheckCircle2 size={12} className="text-green-400 flex-shrink-0" />
              ) : expandedAgent.status === 'error' ? (
                <AlertCircle size={12} className="text-red-400 flex-shrink-0" />
              ) : (
                <Bot size={12} className="text-zinc-500 flex-shrink-0" />
              )}
              <span className="text-xs font-medium text-zinc-200 truncate">{expandedAgent.name}</span>
              <span className="text-[10px] text-zinc-600">{formatDuration(expandedAgent.startedAt, expandedAgent.finishedAt)}</span>
            </div>
            <button onClick={() => setExpandedId(null)} className="p-1 text-zinc-600 hover:text-zinc-300">
              <X size={12} />
            </button>
          </div>
          {expandedAgent.input && (
            <div className="px-3 py-2 border-b border-zinc-800/30">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Task</span>
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{expandedAgent.input}</p>
            </div>
          )}
          <div ref={transcriptRef} className="max-h-64 overflow-y-auto p-3">
            {expandedAgent.output ? (
              <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">{expandedAgent.output}</pre>
            ) : expandedAgent.error ? (
              <pre className="text-xs text-red-300 whitespace-pre-wrap font-mono">{expandedAgent.error}</pre>
            ) : expandedAgent.status === 'running' ? (
              <div className="flex items-center gap-2 text-xs text-violet-400">
                <Loader2 size={12} className="animate-spin" /> Working...
              </div>
            ) : (
              <span className="text-xs text-zinc-600">No output yet</span>
            )}
          </div>
        </div>
      )}

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-2 px-2 pb-2 overflow-x-auto"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'thin' }}
      >
        {allAgents.map(agent => (
          <button
            key={agent.id}
            onClick={() => setExpandedId(expandedId === agent.id ? null : agent.id)}
            className={`flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-zinc-900 transition-all hover:bg-zinc-800/60 text-left
              ${borderClass(agent.status)}
              ${expandedId === agent.id ? 'ring-1 ring-violet-500/30' : ''}
              ${agent.status === 'running' ? 'animate-pulse-subtle' : ''}`}
            style={{ scrollSnapAlign: 'start', minWidth: 200, maxWidth: 280 }}
          >
            {agent.status === 'running' ? (
              <Loader2 size={14} className="animate-spin text-violet-400 flex-shrink-0" />
            ) : agent.status === 'done' ? (
              <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
            ) : agent.status === 'error' ? (
              <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
            ) : (
              <Bot size={14} className="text-amber-400 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-zinc-200 truncate">{agent.name}</div>
              <div className="text-[10px] text-zinc-600 truncate">{agent.input?.slice(0, 50) || 'Working...'}</div>
            </div>
            <span className="text-[10px] text-zinc-600 flex-shrink-0">{formatDuration(agent.startedAt, agent.finishedAt)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
