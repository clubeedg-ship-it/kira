import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, X, Loader2, CheckCircle2, AlertCircle, Clock, Maximize2, Minimize2, ChevronDown, ChevronRight, Wrench, MessageSquare } from 'lucide-react';

// ─── Bridge API Types ───────────────────────────────────────────────

interface OpenClawSession {
  sessionId: string;
  sessionKey: string;
  label?: string;
  kind: 'main' | 'sub-agent';
  state: 'running' | 'complete' | 'error';
  task?: string;
  messageCount: number;
  startedAt: string;
  lastActivityAt: string;
  lastMessage?: string;
}

interface TranscriptMessage {
  role: 'user' | 'assistant' | 'system' | 'tool_result';
  content: string;
  timestamp?: string;
  toolCalls?: { name: string; input: string; output?: string }[];
}

interface TranscriptResponse {
  messages: TranscriptMessage[];
  metadata: {
    sessionKey: string;
    label?: string;
    messageCount: number;
    startedAt: string;
    lastActivityAt: string;
  };
}

// ─── Legacy Types ───────────────────────────────────────────────────

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

// ─── Unified Agent ──────────────────────────────────────────────────

interface UnifiedAgent {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  task: string;
  startedAt: string;
  finishedAt?: string;
  lastOutput?: string;
  source: 'bridge' | 'legacy';
  sessionId?: string;
  kind?: 'main' | 'sub-agent';
}

// ─── Helpers ────────────────────────────────────────────────────────

const BRIDGE_URL = 'http://localhost:3855';
const BRIDGE_TOKEN = 'kira-bridge-2024';

function fmtDuration(start: string, end?: string): string {
  const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function mdToHtml(t: string): string {
  return t
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-zinc-900 rounded p-2 my-1 overflow-x-auto text-[11px]"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-800 px-1 rounded text-violet-300">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-zinc-200">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

// ─── Data fetching ──────────────────────────────────────────────────

async function fetchAgents(): Promise<UnifiedAgent[]> {
  // Try bridge first
  let bridgeAgents: UnifiedAgent[] = [];
  try {
    const r = await fetch(`${BRIDGE_URL}/api/sessions/openclaw`, {
      headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` },
      signal: AbortSignal.timeout(3000),
    });
    if (r.ok) {
      const sessions: OpenClawSession[] = await r.json();
      bridgeAgents = sessions.map(s => ({
        id: s.sessionId,
        name: s.label || s.sessionKey,
        status: s.state === 'complete' ? 'done' as const : s.state as 'running' | 'error',
        task: s.task || s.lastMessage || '',
        startedAt: s.startedAt,
        finishedAt: s.state !== 'running' ? s.lastActivityAt : undefined,
        lastOutput: s.lastMessage,
        source: 'bridge' as const,
        sessionId: s.sessionId,
        kind: s.kind,
      }));
    }
  } catch { /* bridge unavailable */ }

  if (bridgeAgents.length > 0) return bridgeAgents;

  // Fallback to legacy
  const results: UnifiedAgent[] = [];
  try {
    const [r1, r2] = await Promise.all([
      fetch('/api/v1/agents/runs?status=all&limit=20', { credentials: 'include' }).catch(() => null),
      fetch('/api/v1/agents/openclaw', { credentials: 'include' }).catch(() => null),
    ]);
    for (const r of [r1, r2]) {
      if (r?.ok) {
        const j = await r.json();
        for (const a of (j.data || []) as AgentRun[]) {
          results.push({
            id: a.id, name: a.name, status: a.status, task: a.input,
            startedAt: a.startedAt, finishedAt: a.finishedAt,
            lastOutput: a.output?.slice(0, 200), source: 'legacy',
          });
        }
      }
    }
  } catch { /* ignore */ }
  return results;
}

async function fetchTranscript(sessionId: string): Promise<TranscriptMessage[]> {
  try {
    const r = await fetch(`${BRIDGE_URL}/api/sessions/openclaw/${sessionId}/transcript`, {
      headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return [];
    const data: TranscriptResponse = await r.json();
    return data.messages || [];
  } catch { return []; }
}

// ─── StatusIcon ─────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'running': return <Loader2 size={12} className="animate-spin text-violet-400" />;
    case 'pending': return <Clock size={12} className="text-amber-400" />;
    case 'done': return <CheckCircle2 size={12} className="text-green-400" />;
    case 'error': return <AlertCircle size={12} className="text-red-400" />;
    default: return <Bot size={12} className="text-zinc-500" />;
  }
}

function statusBorder(status: string) {
  switch (status) {
    case 'running': return 'border-violet-500/30 bg-violet-500/5';
    case 'pending': return 'border-amber-500/30 bg-amber-500/5';
    case 'done': return 'border-green-500/30 bg-green-500/5';
    case 'error': return 'border-red-500/30 bg-red-500/5';
    default: return 'border-zinc-800 bg-zinc-900/50';
  }
}

// ─── LiveTimer ──────────────────────────────────────────────────────

function LiveTimer({ start, end, running }: { start: string; end?: string; running: boolean }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return <span className="text-[10px] text-zinc-600 tabular-nums">{fmtDuration(start, end)}</span>;
}

// ─── ToolCallBlock ──────────────────────────────────────────────────

function ToolCallBlock({ call }: { call: { name: string; input: string; output?: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-1 border border-zinc-800 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-zinc-900/80 hover:bg-zinc-800/80 transition-colors text-left">
        {open ? <ChevronDown size={10} className="text-zinc-500" /> : <ChevronRight size={10} className="text-zinc-500" />}
        <Wrench size={10} className="text-amber-400" />
        <span className="text-[11px] font-mono text-amber-300 truncate">{call.name}</span>
      </button>
      {open && (
        <div className="px-2.5 py-2 bg-zinc-950/50 space-y-2">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-zinc-600">Input</span>
            <pre className="text-[10px] text-zinc-400 font-mono whitespace-pre-wrap mt-0.5 max-h-[200px] overflow-y-auto">{call.input}</pre>
          </div>
          {call.output && (
            <div>
              <span className="text-[9px] uppercase tracking-wider text-zinc-600">Output</span>
              <pre className="text-[10px] text-zinc-400 font-mono whitespace-pre-wrap mt-0.5 max-h-[200px] overflow-y-auto">{call.output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MessageBubble ──────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: TranscriptMessage }) {
  if (msg.role === 'system') {
    return <p className="text-[10px] text-zinc-600 italic text-center px-3 py-1">{msg.content.slice(0, 200)}</p>;
  }
  if (msg.role === 'tool_result') {
    return (
      <div className="px-3 py-1">
        <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg px-2.5 py-1.5">
          <span className="text-[9px] uppercase tracking-wider text-amber-500/60">Tool Result</span>
          <pre className="text-[10px] text-zinc-500 font-mono whitespace-pre-wrap mt-0.5 max-h-[120px] overflow-y-auto">{msg.content.slice(0, 500)}</pre>
        </div>
      </div>
    );
  }
  const isUser = msg.role === 'user';
  return (
    <div className="px-3 py-1">
      <div className={`rounded-lg px-3 py-2 ${isUser ? 'bg-zinc-800 border border-zinc-700/50' : 'bg-zinc-900/60 border border-zinc-800/30'}`}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`text-[9px] font-semibold uppercase tracking-wider ${isUser ? 'text-blue-400/70' : 'text-violet-400/70'}`}>
            {isUser ? 'User' : 'Assistant'}
          </span>
          {msg.timestamp && (
            <span className="text-[9px] text-zinc-700">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="text-[11px] text-zinc-300 leading-relaxed break-words"
          dangerouslySetInnerHTML={{ __html: mdToHtml(msg.content) }} />
        {msg.toolCalls?.map((tc, i) => <ToolCallBlock key={i} call={tc} />)}
      </div>
    </div>
  );
}

// ─── TranscriptView ─────────────────────────────────────────────────

function TranscriptView({ agent, onClose }: { agent: UnifiedAgent; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRunning = agent.status === 'running';

  const { data: messages = [], isLoading } = useQuery<TranscriptMessage[]>({
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon status={agent.status} />
          <span className="text-xs font-medium text-zinc-200 truncate">{agent.name}</span>
          <LiveTimer start={agent.startedAt} end={agent.finishedAt} running={isRunning} />
        </div>
        <button onClick={onClose} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
          <X size={12} />
        </button>
      </div>

      <div className="px-3 py-1.5 border-b border-zinc-800/30 shrink-0">
        <p className="text-[10px] text-zinc-500 leading-relaxed">{agent.task.slice(0, 200)}</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-zinc-600">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">Loading transcript…</span>
          </div>
        ) : messages.length > 0 ? (
          messages.map((m, i) => <MessageBubble key={i} msg={m} />)
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-700">
            <MessageSquare size={20} className="mb-2" />
            <span className="text-xs">
              {agent.source === 'legacy' ? 'Transcript unavailable (legacy agent)' : 'No messages yet'}
            </span>
            {agent.source === 'legacy' && agent.lastOutput && (
              <div className="mt-3 mx-3 p-2 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Last Output</span>
                <pre className="text-[10px] text-zinc-400 font-mono whitespace-pre-wrap mt-1">{agent.lastOutput}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function AgentActivityPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: agents = [] } = useQuery<UnifiedAgent[]>({
    queryKey: ['unified-agents'],
    queryFn: fetchAgents,
    refetchInterval: 3000,
  });

  const activeCount = agents.filter(a => a.status === 'running' || a.status === 'pending').length;
  const hasActive = activeCount > 0;

  useEffect(() => {
    if (hasActive && !isOpen) setIsOpen(true);
  }, [hasActive]);

  const selected = agents.find(a => a.id === selectedId);

  if (agents.length === 0) return null;

  // Collapsed pill
  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)}
        className={`absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all
          ${hasActive
            ? 'bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20'
            : 'bg-zinc-900/80 border-zinc-800 text-zinc-500 hover:bg-zinc-800'}`}>
        {hasActive && <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />}
        <Bot size={14} />
        <span className="text-xs font-medium">{activeCount} active</span>
      </button>
    );
  }

  return (
    <div className={`absolute top-3 right-3 z-20 flex flex-col border border-zinc-800 rounded-xl bg-zinc-950/95 backdrop-blur-sm shadow-2xl transition-all duration-200
      ${isExpanded ? 'w-[min(560px,calc(100%-24px))] max-h-[80%]' : 'w-[min(360px,calc(100%-24px))] max-h-[55%]'}`}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/50 shrink-0">
        <div className="flex items-center gap-2">
          {hasActive && <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />}
          <span className="text-xs font-semibold text-zinc-300">Agents</span>
          <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 rounded-full">
            {activeCount} active · {agents.length} total
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors">
            {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <button onClick={() => { setIsOpen(false); setSelectedId(null); }} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selected ? (
          <TranscriptView agent={selected} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {agents.map(agent => (
              <button key={agent.id} onClick={() => setSelectedId(agent.id)}
                className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors text-left hover:bg-zinc-800/30
                  ${statusBorder(agent.status)}`}>
                <div className="mt-0.5"><StatusIcon status={agent.status} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-200 truncate">{agent.name}</span>
                    <LiveTimer start={agent.startedAt} end={agent.finishedAt} running={agent.status === 'running'} />
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">{agent.task?.slice(0, 80)}</p>
                  {agent.kind && (
                    <span className={`text-[9px] mt-1 inline-block px-1.5 py-0.5 rounded-full ${
                      agent.kind === 'sub-agent' ? 'bg-violet-500/10 text-violet-400' : 'bg-zinc-800 text-zinc-500'
                    }`}>{agent.kind}</span>
                  )}
                  {agent.status === 'done' && agent.lastOutput && (
                    <p className="text-[10px] text-green-400/70 truncate mt-0.5">✓ {agent.lastOutput.slice(0, 60)}…</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
