import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown, ChevronDown, ChevronRight, Code, Cpu, File, FileText,
  Mic, Paperclip, Send, Sparkles, Square, Check, Copy, ExternalLink,
  Maximize2, Wrench, X, Zap, Pencil, Trash2, GripVertical,
} from 'lucide-react';

import { apiRequest } from '../lib/api';
import { useAgentActivity, useChatEvents } from '../hooks/useAgentActivity';
import { usePromptQueue, QueuedPrompt } from '../hooks/usePromptQueue';
import AgentCarousel from './AgentCarousel';

/* ── Types ─────────────────────────────────────────── */

interface Message {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  metadata: unknown;
  createdAt: string;
}

interface StreamEvent {
  type: 'user_message' | 'delta' | 'thinking' | 'tool_call' | 'tool_result' | 'assistant_message' | 'error';
  content?: string;
  message?: Message;
  name?: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  callId?: string;
  round?: number;
  error?: string;
}

interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

interface ToolBlock {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: 'calling' | 'done';
}

export interface ChatPanelProps {
  conversationId: string;
  agentName?: string;
  modelName?: string;
  showHeader?: boolean;
  onClose?: () => void;
}

/* ── Helpers ───────────────────────────────────────── */

function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (msgDate.getTime() === today.getTime()) return 'Today';
  if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const SUGGESTION_CHIPS = [
  'Create a task for...',
  'Analyze this data...',
  'Write a document about...',
  'Search my projects for...',
];

/* ── Markdown renderer ─────────────────────────────── */

function parseTableBlock(lines: string[]): { headers: string[]; rows: string[][]; alignments: string[] } | null {
  if (lines.length < 2) return null;
  const parse = (l: string) => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  const headers = parse(lines[0]);
  let dataStart = 1;
  let alignments = headers.map(() => 'left' as string);
  if (lines.length > 1 && /^\|?[\s\-:|]+\|/.test(lines[1])) {
    alignments = parse(lines[1]).map(sep => {
      const s = sep.trim();
      if (s.startsWith(':') && s.endsWith(':')) return 'center';
      if (s.endsWith(':')) return 'right';
      return 'left';
    });
    dataStart = 2;
  }
  const rows = lines.slice(dataStart).map(parse);
  const cols = headers.length;
  while (alignments.length < cols) alignments.push('left');
  rows.forEach(r => { while (r.length < cols) r.push(''); });
  return { headers, rows, alignments };
}

function MarkdownTable({ headers, rows, alignments }: { headers: string[]; rows: string[][]; alignments: string[] }) {
  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900/80">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-700" style={{ textAlign: (alignments[i] || 'left') as any }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={`${ri % 2 === 0 ? 'bg-zinc-950/30' : 'bg-zinc-900/20'} hover:bg-zinc-800/40 transition-colors`}>
              {row.slice(0, headers.length).map((cell, ci) => (
                <td key={ci} className="px-4 py-2 text-zinc-400 border-b border-zinc-800/50" style={{ textAlign: (alignments[ci] || 'left') as any }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative group my-2">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700/80 hover:bg-zinc-600 text-zinc-300 rounded-md transition-colors">
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {language && <span className="absolute left-3 top-2 text-[10px] text-zinc-600 font-mono">{language}</span>}
      <pre className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 pt-8 overflow-x-auto"><code className="text-sm font-mono text-zinc-300">{code}</code></pre>
    </div>
  );
}

function InlineCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => { e.stopPropagation(); await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <code onClick={handleCopy} className="bg-zinc-800/60 text-violet-300 px-1.5 py-0.5 rounded text-sm font-mono cursor-pointer hover:bg-zinc-700/60 transition-colors relative" title="Click to copy">
      {code}
      {copied && <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[10px] bg-zinc-700 text-zinc-200 rounded whitespace-nowrap">Copied!</span>}
    </code>
  );
}

function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCode = false, codeBuf: string[] = [], codeLang = '', tableBuf: string[] = [];

  const flushTable = (key: string) => {
    if (tableBuf.length > 0) {
      const parsed = parseTableBlock(tableBuf);
      if (parsed) elements.push(<MarkdownTable key={key} headers={parsed.headers} rows={parsed.rows} alignments={parsed.alignments} />);
      tableBuf = [];
    }
  };
  const isTableLine = (l: string) => /^\|.+\|/.test(l.trim());

  const parseInline = (text: string, lineIdx: number): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
    let last = 0, m: RegExpExecArray | null, ki = 0;
    while ((m = pattern.exec(text)) !== null) {
      if (m.index > last) nodes.push(text.slice(last, m.index));
      if (m[1] != null) nodes.push(<strong key={`b${lineIdx}-${ki++}`} className="text-zinc-100 font-semibold">{m[1]}</strong>);
      else if (m[2] != null) nodes.push(<em key={`i${lineIdx}-${ki++}`}>{m[2]}</em>);
      else if (m[3] != null) nodes.push(<InlineCode key={`ic${lineIdx}-${ki++}`} code={m[3]} />);
      else if (m[4] != null && m[5] != null) nodes.push(<a key={`a${lineIdx}-${ki++}`} href={m[5]} target="_blank" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">{m[4]}</a>);
      last = m.index + m[0].length;
    }
    if (last < text.length) nodes.push(text.slice(last));
    return nodes;
  };

  lines.forEach((line, i) => {
    if (line.startsWith('```')) {
      flushTable(`t${i}`);
      if (!inCode) { inCode = true; codeLang = line.slice(3).trim(); codeBuf = []; }
      else { inCode = false; elements.push(<CodeBlock key={`c${i}`} code={codeBuf.join('\n')} language={codeLang || undefined} />); }
      return;
    }
    if (inCode) { codeBuf.push(line); return; }
    if (isTableLine(line)) { tableBuf.push(line); return; }
    else { flushTable(`t${i}`); }

    if (line.startsWith('### ')) elements.push(<h3 key={i} className="text-sm font-semibold text-zinc-200 mt-3 mb-1">{parseInline(line.slice(4), i)}</h3>);
    else if (line.startsWith('## ')) elements.push(<h2 key={i} className="text-base font-semibold text-zinc-100 mt-4 mb-1">{parseInline(line.slice(3), i)}</h2>);
    else if (line.startsWith('- ') || line.startsWith('* ')) elements.push(<li key={i} className="ml-6 pl-1 text-sm list-disc">{parseInline(line.slice(2), i)}</li>);
    else if (line.trim() === '') elements.push(<div key={i} className="h-2" />);
    else elements.push(<p key={i} className="text-sm leading-relaxed">{parseInline(line, i)}</p>);
  });
  flushTable('tend');
  return <div className="space-y-0.5">{elements}</div>;
}

/* ── Tool Call Block ───────────────────────────────── */

function ToolCallBlock({ tool }: { tool: ToolBlock }) {
  const [open, setOpen] = useState(false);
  const friendlyNames: Record<string, string> = {
    exec: 'Running command', Read: 'Reading file', Write: 'Writing file', Edit: 'Editing file',
    web_search: 'Searching web', web_fetch: 'Fetching URL', browser: 'Browser action',
    memory_search: 'Searching memory', memory_get: 'Reading memory',
    sessions_spawn: 'Spawning sub-agent', sessions_send: 'Sending to session',
    session_status: 'Session status', cron: 'Cron job', message: 'Sending message',
    image: 'Analyzing image', tts: 'Text to speech',
    execute_code: 'Running code', read_file: 'Reading file', write_file: 'Writing file',
    list_files: 'Listing files', create_task: 'Creating task',
  };
  const isCode = tool.name === 'execute_code';
  const lang = (tool.args.language as string) || 'bash';
  const code = (tool.args.code as string) || '';
  const result = tool.result as Record<string, unknown> | undefined;

  return (
    <div className="my-2 border border-zinc-800/60 rounded-lg overflow-hidden bg-zinc-900/30">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-800/30 transition-colors">
        {isCode ? <Cpu size={12} className="text-cyan-400" /> : <Wrench size={12} className="text-amber-400" />}
        <span className="text-zinc-400">
          {isCode ? lang : friendlyNames[tool.name] || tool.name}
          {tool.args.command ? `: ${(tool.args.command as string).slice(0, 60)}${(tool.args.command as string).length > 60 ? '…' : ''}` : ''}
          {(tool.args.file_path || tool.args.path) ? `: ${(tool.args.file_path || tool.args.path) as string}` : ''}
          {tool.args.query ? `: "${(tool.args.query as string).slice(0, 40)}"` : ''}
        </span>
        {tool.status === 'calling' && (
          <span className="ml-auto flex items-center gap-1 text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> running</span>
        )}
        {tool.status === 'done' && <span className="ml-auto text-emerald-400">✓</span>}
        {open ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
      </button>
      {open && (
        <div className="border-t border-zinc-800/40">
          {isCode && code && <pre className="px-3 py-2 text-[12px] font-mono text-zinc-400 bg-zinc-950/50 overflow-x-auto max-h-48 overflow-y-auto"><code>{code}</code></pre>}
          {!isCode && Object.keys(tool.args).length > 0 && (
            <div className="px-3 py-2 text-[11px] text-zinc-500 font-mono bg-zinc-950/30">
              {Object.entries(tool.args).map(([k, v]) => <div key={k}><span className="text-zinc-600">{k}:</span> {typeof v === 'string' ? v : JSON.stringify(v)}</div>)}
            </div>
          )}
          {result && (
            <div className="px-3 py-2 border-t border-zinc-800/30">
              {typeof result === 'string' ? (
                <pre className="text-[12px] font-mono text-emerald-300/80 whitespace-pre-wrap max-h-48 overflow-y-auto">{result}</pre>
              ) : (result as any).stdout ? (
                <><pre className="text-[12px] font-mono text-emerald-300/80 whitespace-pre-wrap max-h-48 overflow-y-auto">{String((result as any).stdout)}</pre>
                  {(result as any).stderr ? <pre className="text-[12px] font-mono text-red-300/70 whitespace-pre-wrap mt-1">{String((result as any).stderr)}</pre> : null}</>
              ) : (
                <div className="text-[11px] text-zinc-500 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">{JSON.stringify(result, null, 2)}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Activity Indicator (real-time, survives refresh) ── */

function ActivityIndicator({ activity }: { activity: { state: string; toolName?: string; startedAt?: number } }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activity.startedAt) { setElapsed(0); return; }
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - activity.startedAt!) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [activity.startedAt]);

  if (activity.state === 'idle') return null;

  const label = activity.state === 'thinking' ? 'Kira is thinking...'
    : activity.state === 'tool_call' ? `Running ${activity.toolName || 'tool'}...`
    : activity.state === 'streaming' ? 'Kira is responding...'
    : 'Working...';

  return (
    <div className="flex items-center gap-2 py-3 px-1">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs text-zinc-500">{label}</span>
      {elapsed > 0 && <span className="text-[10px] text-zinc-600">{elapsed}s</span>}
    </div>
  );
}

/* ── Prompt Queue UI ──────────────────────────────── */

function PromptQueueBar({ queue, onEdit, onRemove }: {
  queue: QueuedPrompt[];
  onEdit: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.focus();
  }, [editingId]);

  if (queue.length === 0) return null;

  return (
    <div className="border-t border-zinc-800/40 bg-zinc-900/40 px-4 py-2">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">Queued prompts</span>
        <span className="text-[10px] text-zinc-600 bg-zinc-800/60 px-1.5 py-0.5 rounded-full">{queue.length}</span>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {queue.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <span className="text-[10px] text-zinc-600 w-4 text-center">{idx + 1}</span>
            {editingId === item.id ? (
              <input
                ref={inputRef}
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { onEdit(item.id, editText); setEditingId(null); }
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onBlur={() => { onEdit(item.id, editText); setEditingId(null); }}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-xs text-zinc-200 outline-none focus:border-violet-500/50"
              />
            ) : (
              <span className="flex-1 text-xs text-zinc-400 truncate">{item.text}</span>
            )}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => { setEditText(item.text); setEditingId(item.id); }}
                className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors"
                title="Edit"
              >
                <Pencil size={10} />
              </button>
              <button
                onClick={() => onRemove(item.id)}
                className="p-0.5 text-zinc-600 hover:text-red-400 transition-colors"
                title="Remove"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── File helpers ──────────────────────────────────── */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const CODE_EXTS = ['js', 'ts', 'tsx', 'jsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'sh', 'css', 'scss', 'sql'];

function getFileCategory(name?: string, mime?: string): 'image' | 'pdf' | 'code' | 'other' {
  if (mime?.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  const ext = (name || '').split('.').pop()?.toLowerCase() || '';
  if (CODE_EXTS.includes(ext)) return 'code';
  return 'other';
}

function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const cat = getFileCategory(file.name, file.type);
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    if (cat === 'image') { const url = URL.createObjectURL(file); setThumb(url); return () => URL.revokeObjectURL(url); }
  }, [file, cat]);
  return (
    <div className="flex items-center gap-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2 py-1.5 text-xs text-zinc-300">
      {cat === 'image' && thumb ? <img src={thumb} alt="" className="w-8 h-8 object-cover rounded" /> :
       cat === 'pdf' ? <FileText size={16} className="text-red-400 flex-shrink-0" /> :
       cat === 'code' ? <Code size={16} className="text-emerald-400 flex-shrink-0" /> :
       <File size={16} className="text-zinc-400 flex-shrink-0" />}
      <span className="truncate max-w-[120px]">{file.name}</span>
      <span className="text-zinc-500">{formatFileSize(file.size)}</span>
      <button onClick={onRemove} className="text-zinc-500 hover:text-zinc-300 ml-1"><X size={12} /></button>
    </div>
  );
}

function ImagePreview({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative max-w-[70vw] max-h-[80vh]">
        <button onClick={onClose} className="absolute -top-3 -right-3 z-10 p-1.5 bg-zinc-800 rounded-full border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"><X size={16} /></button>
        <div className="absolute top-2 left-2 flex gap-1.5">
          <a href={src} target="_blank" rel="noopener" className="p-1.5 bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Open in new tab"><ExternalLink size={14} /></a>
        </div>
        <img src={src} alt="" className="max-w-full max-h-[80vh] rounded-lg object-contain" />
      </div>
    </div>
  );
}

function AttachmentPreview({ attachment, onImageClick }: { attachment: Attachment; onImageClick?: (url: string) => void }) {
  const cat = getFileCategory(attachment.originalName, attachment.mimeType);
  if (cat === 'image') {
    return (
      <div className="block mt-2">
        <img src={attachment.url} alt={attachment.originalName}
          className="max-w-[400px] rounded-lg border border-zinc-700/50 cursor-pointer hover:opacity-90 transition-opacity"
          loading="lazy" onClick={() => onImageClick?.(attachment.url)} />
      </div>
    );
  }
  const icon = cat === 'pdf' ? <FileText size={24} className="text-red-400 flex-shrink-0" /> :
               cat === 'code' ? <Code size={24} className="text-emerald-400 flex-shrink-0" /> :
               <File size={24} className="text-zinc-400 flex-shrink-0" />;
  return (
    <div className="flex items-center gap-3 mt-2 bg-zinc-800/40 border border-zinc-700/50 rounded-lg px-3 py-2 max-w-sm">
      {icon}
      <div className="flex-1 min-w-0"><p className="text-sm text-zinc-200 truncate">{attachment.originalName}</p><p className="text-xs text-zinc-500">{formatFileSize(attachment.size)}</p></div>
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:text-violet-300">Open</a>
    </div>
  );
}

/* ── ChatPanel Component ───────────────────────────── */

export default function ChatPanel({ conversationId, agentName, modelName, showHeader = false, onClose }: ChatPanelProps) {
  const queryClient = useQueryClient();
  const activity = useAgentActivity();
  const { queue, enqueue, dequeue, remove: removeQueued, update: updateQueued } = usePromptQueue();
  
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [toolBlocks, setToolBlocks] = useState<ToolBlock[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const silenceStartRef = useRef<number | null>(null);
  const silenceCheckRef = useRef<number | null>(null);
  const chunkRecorderRef = useRef<MediaRecorder | null>(null);
  const chunkIntervalRef = useRef<number | null>(null);
  const liveTranscriptRef = useRef('');
  const stopRecordingRef = useRef<() => void>(() => {});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const userScrolledRef = useRef(false);
  const streamBufferRef = useRef('');
  const flushTimerRef = useRef<number | null>(null);
  const autoSendRef = useRef(false);
  // Track if we should auto-send the next queued prompt
  const shouldAutoSendQueue = useRef(false);

  const { data: chatMessages = [] } = useQuery<Message[]>({
    queryKey: ['messages', conversationId],
    queryFn: () => apiRequest(`/api/v1/chat/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  // Abort in-flight stream when conversation changes or unmounts
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
      streamBufferRef.current = '';
      setIsStreaming(false);
      setStreamingContent('');
      setToolBlocks([]);
    };
  }, [conversationId]);

  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    userScrolledRef.current = false;
  }, []);

  const handleScroll = useCallback(() => {
    const near = isNearBottom();
    setShowScrollBtn(!near);
    userScrolledRef.current = !near;
  }, [isNearBottom]);

  useEffect(() => {
    if (!userScrolledRef.current) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingContent, toolBlocks]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, []);

  const cancelStreaming = useCallback(() => {
    setIsStreaming(false);
    setStreamingContent('');
    setToolBlocks([]);
    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
  }, [conversationId, queryClient]);

  const uploadFile = useCallback(async (file: File): Promise<Attachment | null> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const resp = await fetch('/api/v1/chat/upload', { method: 'POST', credentials: 'include', body: formData });
      if (!resp.ok) return null;
      return (await resp.json()).data as Attachment;
    } catch { return null; }
  }, []);

  // Subscribe to real-time chat events from WS bridge SSE
  useChatEvents(useCallback((evt) => {
    switch (evt.type) {
      case 'delta':
        if (evt.text) {
          setStreamingContent(evt.text);
          setIsStreaming(true);
        }
        break;
      case 'final':
        // Final message arrived — clear streaming, refetch from DB
        setStreamingContent('');
        setToolBlocks([]);
        setIsStreaming(false);
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        // Auto-send next queued prompt
        shouldAutoSendQueue.current = true;
        break;
      case 'thinking':
        setIsStreaming(true);
        break;
      case 'error':
        setStreamingContent(prev => prev + `\n\n⚠️ ${evt.error || 'Error'}`);
        setIsStreaming(false);
        break;
    }
  }, [conversationId, queryClient]));

  // Track activity state to detect when agent goes idle (backup for 'final' event)
  const prevActivityState = useRef(activity.state);
  useEffect(() => {
    if (prevActivityState.current !== 'idle' && activity.state === 'idle' && isStreaming) {
      // Agent went idle — force clear streaming state and refetch
      setTimeout(() => {
        setStreamingContent('');
        setToolBlocks([]);
        setIsStreaming(false);
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        shouldAutoSendQueue.current = true;
      }, 500); // Small delay to let DB write complete
    }
    prevActivityState.current = activity.state;
  }, [activity.state, isStreaming, conversationId, queryClient]);

  // Core send function — POST message, response comes via SSE
  const doSend = useCallback(async (content: string, filesToUpload: File[] = []) => {
    if (!conversationId) return;

    let attachments: Attachment[] = [];
    if (filesToUpload.length > 0) {
      setIsUploading(true);
      const results = await Promise.all(filesToUpload.map(uploadFile));
      attachments = results.filter((r): r is Attachment => r !== null);
      setIsUploading(false);
    }

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`, conversationId, role: 'user', content,
      metadata: attachments.length > 0 ? { attachments } : null, createdAt: new Date().toISOString(),
    };
    queryClient.setQueryData<Message[]>(['messages', conversationId], (old = []) => [...old, tempUserMsg]);
    userScrolledRef.current = false;

    // POST — returns immediately, response comes via WS bridge SSE
    try {
      const resp = await fetch(`/api/v1/chat/conversations/${conversationId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ content, attachments }),
      });
      if (!resp.ok) {
        console.error('Failed to send message:', resp.status);
      }
      // Refetch to get the persisted user message with real ID
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    } catch (err) {
      console.error('Send error:', err);
    }
  }, [conversationId, queryClient, uploadFile]);

  // Auto-send queued prompts when streaming finishes
  useEffect(() => {
    if (!isStreaming && shouldAutoSendQueue.current && queue.length > 0) {
      shouldAutoSendQueue.current = false;
      const next = queue[0];
      if (next) {
        removeQueued(next.id);
        doSend(next.text, next.files);
      }
    }
  }, [isStreaming, queue, doSend, removeQueued]);

  // Send message: if streaming, queue it; otherwise send immediately
  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    const content = input.trim();
    const files = [...pendingFiles];
    setInput('');
    setPendingFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    if (isStreaming) {
      // Queue it — user can edit/delete before it's sent
      enqueue(content, files.length > 0 ? files : undefined);
      return;
    }

    doSend(content, files);
  }, [input, pendingFiles, isStreaming, enqueue, doSend]);

  // Auto-send after voice recording completes
  useEffect(() => {
    if (autoSendRef.current && input.trim() && !isStreaming && !isRecording) {
      autoSendRef.current = false;
      sendMessage();
    }
  }, [input, isStreaming, isRecording, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.size <= 10 * 1024 * 1024);
    setPendingFiles(prev => [...prev, ...arr]);
  }, []);

  // Voice recording
  const WAVEFORM_BARS = 48;
  const waveBarsRef = useRef<number[]>(new Array(WAVEFORM_BARS).fill(3));

  const drawWaveform = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const bufLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufLen);
    analyser.getByteFrequencyData(data);
    const step = Math.max(1, Math.floor(bufLen / WAVEFORM_BARS));
    const newBars = [...waveBarsRef.current];
    for (let i = 0; i < WAVEFORM_BARS; i++) {
      const val = data[Math.min(i * step, bufLen - 1)] || 0;
      const target = Math.max(3, (val / 255) * 40);
      newBars[i] = newBars[i] * 0.6 + target * 0.4;
    }
    waveBarsRef.current = newBars;
    const container = waveCanvasRef.current;
    if (container) {
      const bars = container.children;
      for (let i = 0; i < bars.length; i++) (bars[i] as HTMLElement).style.height = `${newBars[i]}px`;
    }
    animFrameRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  const transcribeChunk = useCallback(async (blob: Blob) => {
    const form = new FormData(); form.append('audio', blob, 'chunk.webm');
    try {
      const resp = await fetch('/api/v1/transcribe', { method: 'POST', credentials: 'include', body: form });
      const reader = resp.body?.getReader(); const decoder = new TextDecoder(); let chunkText = '';
      while (reader) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try { const d = JSON.parse(line.slice(6)); if (d.type === 'word') chunkText += (chunkText ? ' ' : '') + d.text; else if (d.type === 'done') chunkText = d.fullText || chunkText; } catch {}
        }
      }
      if (chunkText.trim()) { liveTranscriptRef.current += (liveTranscriptRef.current ? ' ' : '') + chunkText.trim(); setLiveTranscript(liveTranscriptRef.current); }
    } catch (err) { console.error('Chunk transcription error:', err); }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser(); analyser.fftSize = 2048;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser; audioCtxRef.current = audioCtx;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop()); audioCtx.close();
        if (!liveTranscriptRef.current.trim()) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const form = new FormData(); form.append('audio', blob, 'recording.webm');
          try {
            const resp = await fetch('/api/v1/transcribe', { method: 'POST', credentials: 'include', body: form });
            const reader = resp.body?.getReader(); const decoder = new TextDecoder(); let text = '';
            while (reader) {
              const { done, value } = await reader.read(); if (done) break;
              for (const line of decoder.decode(value, { stream: true }).split('\n')) {
                if (!line.startsWith('data: ')) continue;
                try { const d = JSON.parse(line.slice(6)); if (d.type === 'done') text = d.fullText || text; else if (d.type === 'word') text += (text ? ' ' : '') + d.text; } catch {}
              }
            }
            if (text.trim()) { setInput(text.trim()); setTimeout(() => { autoSendRef.current = true; }, 100); }
          } catch (err) { console.error('Transcription error:', err); }
        } else { setInput(liveTranscriptRef.current); setTimeout(() => { autoSendRef.current = true; }, 100); }
      };
      recorder.start(); mediaRecorderRef.current = recorder;
      const startChunkRecorder = () => {
        if (!stream.active) return;
        const cr = new MediaRecorder(stream, { mimeType }); const chunks: Blob[] = [];
        cr.ondataavailable = (e) => chunks.push(e.data);
        cr.onstop = () => { if (chunks.length > 0) transcribeChunk(new Blob(chunks, { type: 'audio/webm' })); };
        cr.start(); chunkRecorderRef.current = cr;
      };
      startChunkRecorder();
      chunkIntervalRef.current = window.setInterval(() => {
        if (chunkRecorderRef.current?.state === 'recording') chunkRecorderRef.current.stop();
        startChunkRecorder();
      }, 3000);
      silenceStartRef.current = null;
      silenceCheckRef.current = window.setInterval(() => {
        if (!analyserRef.current) return;
        const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(freqData);
        const avg = freqData.reduce((a, b) => a + b, 0) / freqData.length;
        if (avg < 5) { silenceStartRef.current = silenceStartRef.current || Date.now(); if (Date.now() - silenceStartRef.current > 3000) stopRecordingRef.current(); }
        else silenceStartRef.current = null;
      }, 200);
      setIsRecording(true); setRecordingDuration(0); setLiveTranscript(''); liveTranscriptRef.current = '';
      recordingTimerRef.current = window.setInterval(() => setRecordingDuration(d => d + 1), 1000);
      requestAnimationFrame(drawWaveform);
    } catch (err) { console.error('Mic access denied:', err); }
  }, [drawWaveform, transcribeChunk]);

  const stopRecording = useCallback(() => {
    if (chunkRecorderRef.current?.state === 'recording') chunkRecorderRef.current.stop();
    if (chunkIntervalRef.current) { clearInterval(chunkIntervalRef.current); chunkIntervalRef.current = null; }
    if (silenceCheckRef.current) { clearInterval(silenceCheckRef.current); silenceCheckRef.current = null; }
    mediaRecorderRef.current?.stop(); setIsRecording(false); setRecordingDuration(0);
    cancelAnimationFrame(animFrameRef.current);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  }, []);

  useEffect(() => { stopRecordingRef.current = stopRecording; }, [stopRecording]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') { e.preventDefault(); if (isRecording) stopRecording(); else startRecording(); }
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, [isRecording, startRecording, stopRecording]);

  // Auto-focus textarea
  useEffect(() => { textareaRef.current?.focus(); }, [conversationId]);

  // Capture keystrokes to focus textarea
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ta = textareaRef.current;
      if (!ta || isRecording) return;
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return;
      ta.focus();
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, [isRecording]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files); }, [addFiles]);

  const hasMessages = chatMessages.length > 0 || isStreaming;
  let lastDateKey = '';

  // Determine if the real-time activity indicator should show (even after refresh)
  const agentBusy = activity.state !== 'idle';
  const showActivityIndicator = agentBusy && !streamingContent;

  return (
    <div className="relative flex flex-col h-full min-w-0">
      <AgentCarousel />
      {showHeader && (
        <div className="flex items-center gap-2 px-3 h-9 border-b border-zinc-800/40 flex-shrink-0 bg-zinc-950/80">
          <div className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center"><Zap size={8} className="text-violet-400" /></div>
          <span className="text-xs font-medium text-zinc-300 truncate">{agentName || 'Kira'}</span>
          {/* Live activity dot */}
          {agentBusy && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
          {modelName && <span className="text-[9px] text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded-full">{modelName}</span>}
          {onClose && <button onClick={onClose} className="ml-auto text-zinc-600 hover:text-zinc-300 transition-colors"><X size={12} /></button>}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto relative" ref={scrollContainerRef} onScroll={handleScroll} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
            <div className="border-2 border-dashed border-violet-500/50 rounded-2xl px-8 py-6 text-center">
              <Paperclip size={24} className="text-violet-400 mx-auto mb-2" /><p className="text-sm text-violet-300">Drop files here</p>
            </div>
          </div>
        )}
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-0">
          {!hasMessages && !agentBusy && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center">
                <Sparkles size={20} className="text-violet-400" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-zinc-300 mb-1">How can I help?</h3>
                <p className="text-xs text-zinc-500">Try one of these or type your own message</p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                {SUGGESTION_CHIPS.map(chip => (
                  <button key={chip} onClick={() => { setInput(chip); textareaRef.current?.focus(); }}
                    className="px-3 py-2 rounded-xl border border-zinc-800/50 bg-zinc-900/40 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700/60 hover:bg-zinc-800/40 transition-all text-left"
                  >{chip}</button>
                ))}
              </div>
            </div>
          )}

          {chatMessages.filter((msg, i) => {
            if (isStreaming && msg.role === 'assistant' && i === chatMessages.length - 1) return false;
            return true;
          }).map(msg => {
            const dateKey = getDateKey(msg.createdAt);
            const showDivider = dateKey !== lastDateKey;
            lastDateKey = dateKey;
            const meta = msg.metadata as Record<string, unknown> | null;
            const msgModel = meta?.model as string | undefined;
            return (
              <div key={msg.id}>
                {showDivider && (
                  <div className="flex items-center gap-3 py-4">
                    <div className="flex-1 h-px bg-zinc-800/40" />
                    <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">{formatDateDivider(msg.createdAt)}</span>
                    <div className="flex-1 h-px bg-zinc-800/40" />
                  </div>
                )}
                <div className="py-4">
                  <div className="flex items-center gap-2 mb-2">
                    {msg.role === 'user' ? (
                      <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center"><span className="text-[10px] text-zinc-300 font-medium">O</span></div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center"><Zap size={10} className="text-violet-400" /></div>
                    )}
                    <span className="text-xs font-medium text-zinc-400">{msg.role === 'user' ? 'You' : (agentName || 'Kira')}</span>
                    <span className="text-[10px] text-zinc-600">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {msg.role === 'assistant' && msgModel && <span className="text-[9px] text-zinc-600 bg-zinc-800/40 px-1.5 py-0.5 rounded-full">{(msgModel as string).split('/').pop()}</span>}
                  </div>
                  <div className={`pl-7 ${msg.role === 'user' ? 'text-zinc-200' : 'text-zinc-300'}`}>
                    <Markdown text={msg.content} />
                    {Array.isArray(meta?.attachments) && (meta!.attachments as Attachment[]).map((att: Attachment) => (
                      <AttachmentPreview key={att.id} attachment={att} onImageClick={setPreviewImage} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {toolBlocks.length > 0 && (
            <div className="pl-7 py-2">
              {toolBlocks.map(tb => <ToolCallBlock key={tb.id} tool={tb} />)}
            </div>
          )}

          {isStreaming && streamingContent && (
            <div className="py-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center"><Zap size={10} className="text-violet-400" /></div>
                <span className="text-xs font-medium text-zinc-400">{agentName || 'Kira'}</span>
              </div>
              <div className="pl-7 text-zinc-300">
                <Markdown text={streamingContent} />
                <span className="inline-block w-0.5 h-4 bg-violet-400 animate-pulse ml-0.5 -mb-0.5" />
              </div>
            </div>
          )}

          {/* Real-time activity indicator — survives page refresh */}
          {showActivityIndicator && <ActivityIndicator activity={activity} />}
          
          <div ref={messagesEndRef} />
        </div>

        {showScrollBtn && (
          <button onClick={scrollToBottom}
            className="sticky bottom-4 left-1/2 -translate-x-1/2 ml-[50%] w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-all shadow-lg"
          ><ArrowDown size={14} /></button>
        )}
      </div>

      {/* Prompt Queue */}
      <PromptQueueBar queue={queue} onEdit={updateQueued} onRemove={removeQueued} />

      {/* Input — ALWAYS typeable, even during streaming */}
      <div className="border-t border-zinc-800/40 bg-zinc-950">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pendingFiles.map((f, i) => <FileChip key={`${f.name}-${i}`} file={f} onRemove={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} />)}
            </div>
          )}
          {isUploading && (
            <div className="flex items-center gap-2 mb-2 text-xs text-zinc-400"><span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" /> Uploading files...</div>
          )}
          <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*,application/pdf,text/*,application/json"
            onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
          
          {isRecording ? (
            <div className="bg-zinc-900/60 border border-blue-500/20 rounded-xl overflow-hidden transition-all">
              <div className="flex items-center justify-center px-4 py-3 gap-[2px]" ref={waveCanvasRef as any}>
                {Array.from({ length: WAVEFORM_BARS }).map((_, i) => (
                  <div key={i} style={{ width: '3px', minHeight: '3px', height: '3px', borderRadius: '2px', background: '#3b82f6', transition: 'height 0.06s ease-out', willChange: 'height' }} />
                ))}
              </div>
              {liveTranscript && (
                <div className="px-4 py-2 border-t border-zinc-800/50 max-h-[120px] overflow-y-auto">
                  <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">{liveTranscript}</div>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800/50">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-[11px] text-zinc-500 font-mono">{Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}</span>
                  {!liveTranscript && <span className="text-[11px] text-zinc-600 italic ml-2">Listening...</span>}
                </div>
                <button onClick={stopRecording} className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors text-xs text-zinc-400 flex items-center gap-1.5" title="Stop recording">
                  <Square size={8} className="text-blue-400 fill-blue-400" /> Stop
                </button>
              </div>
            </div>
          ) : (
            <div className={`flex items-end gap-2 bg-zinc-900/60 border rounded-xl px-3 py-2 transition-all ${isStreaming ? 'border-violet-500/20' : 'border-zinc-800/50'} focus-within:border-violet-500/30`}>
              <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors" title="Attach files">
                <Paperclip size={14} />
              </button>
              <textarea
                ref={textareaRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
                placeholder={isStreaming ? 'Type to queue next prompt...' : `Message ${agentName || 'Kira'}...`}
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none min-h-[32px]"
                style={{ maxHeight: '200px' }}
              />
              <button onClick={startRecording} className="p-1.5 text-zinc-500 hover:text-violet-400 transition-colors" title="Voice input (⌘J)">
                <Mic size={14} />
              </button>
              {isStreaming ? (
                <div className="flex items-center gap-1">
                  {input.trim() && (
                    <button onClick={sendMessage}
                      className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all" title="Queue this prompt">
                      <Send size={14} />
                    </button>
                  )}
                  <button onClick={cancelStreaming} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all" title="Stop generating">
                    <Square size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={sendMessage} disabled={!input.trim()}
                  className={`p-1.5 rounded-lg transition-all ${input.trim() ? 'bg-violet-500 text-white hover:bg-violet-400' : 'text-zinc-600'}`}>
                  <Send size={14} />
                </button>
              )}
            </div>
          )}
          {/* Queue hint */}
          {isStreaming && !input && queue.length === 0 && (
            <p className="text-[10px] text-zinc-600 mt-1.5 ml-1">You can type while Kira responds — prompts will be queued and sent after the response.</p>
          )}
        </div>
      </div>
      {previewImage && <ImagePreview src={previewImage} onClose={() => setPreviewImage(null)} />}
    </div>
  );
}
