import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ChevronDown, ChevronRight, Code, Cpu, File, FileText, Mic, Paperclip, Send, Sparkles, Square, Check, Copy, ExternalLink, Maximize2, Wrench, X, Zap, } from 'lucide-react';
import { apiRequest } from '../lib/api';
import AgentCarousel from './AgentCarousel';
/* ── Helpers ───────────────────────────────────────── */
function formatDateDivider(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (msgDate.getTime() === today.getTime())
        return 'Today';
    if (msgDate.getTime() === yesterday.getTime())
        return 'Yesterday';
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}
function getDateKey(dateStr) {
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
function parseTableBlock(lines) {
    if (lines.length < 2)
        return null;
    const parse = (l) => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    const headers = parse(lines[0]);
    let dataStart = 1;
    let alignments = headers.map(() => 'left');
    if (lines.length > 1 && /^\|?[\s\-:|]+\|/.test(lines[1])) {
        alignments = parse(lines[1]).map(sep => {
            const s = sep.trim();
            if (s.startsWith(':') && s.endsWith(':'))
                return 'center';
            if (s.endsWith(':'))
                return 'right';
            return 'left';
        });
        dataStart = 2;
    }
    const rows = lines.slice(dataStart).map(parse);
    const cols = headers.length;
    while (alignments.length < cols)
        alignments.push('left');
    rows.forEach(r => { while (r.length < cols)
        r.push(''); });
    return { headers, rows, alignments };
}
function MarkdownTable({ headers, rows, alignments }) {
    return (_jsx("div", { className: "my-3 overflow-x-auto rounded-lg border border-zinc-800", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsx("tr", { className: "bg-zinc-900/80", children: headers.map((h, i) => (_jsx("th", { className: "px-4 py-2.5 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-700", style: { textAlign: (alignments[i] || 'left') }, children: h }, i))) }) }), _jsx("tbody", { children: rows.map((row, ri) => (_jsx("tr", { className: `${ri % 2 === 0 ? 'bg-zinc-950/30' : 'bg-zinc-900/20'} hover:bg-zinc-800/40 transition-colors`, children: row.slice(0, headers.length).map((cell, ci) => (_jsx("td", { className: "px-4 py-2 text-zinc-400 border-b border-zinc-800/50", style: { textAlign: (alignments[ci] || 'left') }, children: cell }, ci))) }, ri))) })] }) }));
}
function CodeBlock({ code, language }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (_jsxs("div", { className: "relative group my-2", children: [_jsx("div", { className: "absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10", children: _jsxs("button", { onClick: handleCopy, className: "flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700/80 hover:bg-zinc-600 text-zinc-300 rounded-md transition-colors", children: [copied ? _jsx(Check, { size: 12 }) : _jsx(Copy, { size: 12 }), copied ? 'Copied!' : 'Copy'] }) }), language && (_jsx("span", { className: "absolute left-3 top-2 text-[10px] text-zinc-600 font-mono", children: language })), _jsx("pre", { className: "bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 pt-8 overflow-x-auto", children: _jsx("code", { className: "text-sm font-mono text-zinc-300", children: code }) })] }));
}
function InlineCode({ code }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (_jsxs("code", { onClick: handleCopy, className: "bg-zinc-800/60 text-violet-300 px-1.5 py-0.5 rounded text-sm font-mono cursor-pointer hover:bg-zinc-700/60 transition-colors relative", title: "Click to copy", children: [code, copied && (_jsx("span", { className: "absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[10px] bg-zinc-700 text-zinc-200 rounded whitespace-nowrap", children: "Copied!" }))] }));
}
function Markdown({ text }) {
    const lines = text.split('\n');
    const elements = [];
    let inCode = false;
    let codeBuf = [];
    let codeLang = '';
    let tableBuf = [];
    const flushTable = (key) => {
        if (tableBuf.length > 0) {
            const parsed = parseTableBlock(tableBuf);
            if (parsed)
                elements.push(_jsx(MarkdownTable, { headers: parsed.headers, rows: parsed.rows, alignments: parsed.alignments }, key));
            tableBuf = [];
        }
    };
    const isTableLine = (l) => /^\|.+\|/.test(l.trim());
    lines.forEach((line, i) => {
        if (line.startsWith('```')) {
            flushTable(`t${i}`);
            if (!inCode) {
                inCode = true;
                codeLang = line.slice(3).trim();
                codeBuf = [];
            }
            else {
                inCode = false;
                elements.push(_jsx(CodeBlock, { code: codeBuf.join('\n'), language: codeLang || undefined }, `c${i}`));
            }
            return;
        }
        if (inCode) {
            codeBuf.push(line);
            return;
        }
        if (isTableLine(line)) {
            tableBuf.push(line);
            return;
        }
        else {
            flushTable(`t${i}`);
        }
        // Parse inline elements into React nodes (to support InlineCode as a component)
        const parseInline = (text) => {
            const nodes = [];
            const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
            let last = 0;
            let m;
            let ki = 0;
            while ((m = pattern.exec(text)) !== null) {
                if (m.index > last)
                    nodes.push(text.slice(last, m.index));
                if (m[1] != null)
                    nodes.push(_jsx("strong", { className: "text-zinc-100 font-semibold", children: m[1] }, `b${i}-${ki++}`));
                else if (m[2] != null)
                    nodes.push(_jsx("em", { children: m[2] }, `i${i}-${ki++}`));
                else if (m[3] != null)
                    nodes.push(_jsx(InlineCode, { code: m[3] }, `ic${i}-${ki++}`));
                else if (m[4] != null && m[5] != null)
                    nodes.push(_jsx("a", { href: m[5], target: "_blank", className: "text-violet-400 hover:text-violet-300 underline underline-offset-2", children: m[4] }, `a${i}-${ki++}`));
                last = m.index + m[0].length;
            }
            if (last < text.length)
                nodes.push(text.slice(last));
            return nodes;
        };
        if (line.startsWith('### '))
            elements.push(_jsx("h3", { className: "text-sm font-semibold text-zinc-200 mt-3 mb-1", children: parseInline(line.slice(4)) }, i));
        else if (line.startsWith('## '))
            elements.push(_jsx("h2", { className: "text-base font-semibold text-zinc-100 mt-4 mb-1", children: parseInline(line.slice(3)) }, i));
        else if (line.startsWith('- ') || line.startsWith('* '))
            elements.push(_jsx("li", { className: "ml-6 pl-1 text-sm list-disc", children: parseInline(line.slice(2)) }, i));
        else if (line.trim() === '')
            elements.push(_jsx("div", { className: "h-2" }, i));
        else
            elements.push(_jsx("p", { className: "text-sm leading-relaxed", children: parseInline(line) }, i));
    });
    flushTable('tend');
    return _jsx("div", { className: "space-y-0.5", children: elements });
}
/* ── Tool Call Block ───────────────────────────────── */
function ToolCallBlock({ tool }) {
    const [open, setOpen] = useState(false);
    const friendlyNames = {
        execute_code: 'Running code', read_file: 'Reading file', write_file: 'Writing file',
        list_files: 'Listing files', create_task: 'Creating task', search_tasks: 'Searching tasks',
        create_document: 'Creating document', search_knowledge: 'Searching knowledge', list_projects: 'Listing projects',
        // OpenClaw tools
        exec: 'Running command', Read: 'Reading file', Write: 'Writing file', Edit: 'Editing file',
        web_search: 'Searching web', web_fetch: 'Fetching URL', browser: 'Browser action',
        memory_search: 'Searching memory', memory_get: 'Reading memory',
        sessions_spawn: 'Spawning sub-agent', sessions_send: 'Sending to session',
        session_status: 'Session status', cron: 'Cron job', message: 'Sending message',
        image: 'Analyzing image', tts: 'Text to speech',
    };
    const isCode = tool.name === 'execute_code';
    const lang = tool.args.language || 'bash';
    const code = tool.args.code || '';
    const result = tool.result;
    return (_jsxs("div", { className: "my-2 border border-zinc-800/60 rounded-lg overflow-hidden bg-zinc-900/30", children: [_jsxs("button", { onClick: () => setOpen(!open), className: "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-800/30 transition-colors", children: [isCode ? _jsx(Cpu, { size: 12, className: "text-cyan-400" }) : _jsx(Wrench, { size: 12, className: "text-amber-400" }), _jsxs("span", { className: "text-zinc-400", children: [isCode ? lang : friendlyNames[tool.name] || tool.name, tool.args.title ? `: "${tool.args.title}"` : '', tool.args.filename ? `: ${tool.args.filename}` : '', tool.args.command ? `: ${tool.args.command.slice(0, 60)}${tool.args.command.length > 60 ? '…' : ''}` : '', (tool.args.file_path || tool.args.path) ? `: ${(tool.args.file_path || tool.args.path)}` : '', tool.args.query ? `: "${tool.args.query.slice(0, 40)}"` : ''] }), tool.status === 'calling' && (_jsxs("span", { className: "ml-auto flex items-center gap-1 text-amber-400", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" }), " running"] })), tool.status === 'done' && (_jsx("span", { className: "ml-auto text-emerald-400", children: "\u2713" })), open ? _jsx(ChevronDown, { size: 12, className: "text-zinc-500" }) : _jsx(ChevronRight, { size: 12, className: "text-zinc-500" })] }), open && (_jsxs("div", { className: "border-t border-zinc-800/40", children: [isCode && code && (_jsx("pre", { className: "px-3 py-2 text-[12px] font-mono text-zinc-400 bg-zinc-950/50 overflow-x-auto max-h-48 overflow-y-auto", children: _jsx("code", { children: code }) })), !isCode && Object.keys(tool.args).length > 0 && (_jsx("div", { className: "px-3 py-2 text-[11px] text-zinc-500 font-mono bg-zinc-950/30", children: Object.entries(tool.args).map(([k, v]) => (_jsxs("div", { children: [_jsxs("span", { className: "text-zinc-600", children: [k, ":"] }), " ", typeof v === 'string' ? v : JSON.stringify(v)] }, k))) })), result && (_jsx("div", { className: "px-3 py-2 border-t border-zinc-800/30", children: typeof result === 'string' ? (_jsx("pre", { className: "text-[12px] font-mono text-emerald-300/80 whitespace-pre-wrap max-h-48 overflow-y-auto", children: result })) : result.stdout ? (_jsxs(_Fragment, { children: [_jsx("pre", { className: "text-[12px] font-mono text-emerald-300/80 whitespace-pre-wrap max-h-48 overflow-y-auto", children: String(result.stdout) }), result.stderr ? _jsx("pre", { className: "text-[12px] font-mono text-red-300/70 whitespace-pre-wrap mt-1", children: String(result.stderr) }) : null] })) : (_jsx("div", { className: "text-[11px] text-zinc-500 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto", children: JSON.stringify(result, null, 2) })) }))] }))] }));
}
function ThinkingIndicator() {
    return (_jsxs("div", { className: "flex items-center gap-2 py-3 px-1", children: [_jsxs("div", { className: "flex gap-1", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce", style: { animationDelay: '0ms' } }), _jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce", style: { animationDelay: '150ms' } }), _jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce", style: { animationDelay: '300ms' } })] }), _jsx("span", { className: "text-xs text-zinc-500", children: "Kira is thinking..." })] }));
}
/* ── File helpers ──────────────────────────────────── */
function formatFileSize(bytes) {
    if (bytes < 1024)
        return `${bytes}B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
const CODE_EXTS = ['js', 'ts', 'tsx', 'jsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'sh', 'css', 'scss', 'sql'];
function getFileCategory(name, mime) {
    if (mime.startsWith('image/'))
        return 'image';
    if (mime === 'application/pdf')
        return 'pdf';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['md', 'markdown'].includes(ext))
        return 'markdown';
    if (CODE_EXTS.includes(ext))
        return 'code';
    return 'other';
}
function FileChip({ file, onRemove }) {
    const cat = getFileCategory(file.name, file.type);
    const [thumb, setThumb] = useState(null);
    useEffect(() => {
        if (cat === 'image') {
            const url = URL.createObjectURL(file);
            setThumb(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [file, cat]);
    return (_jsxs("div", { className: "flex items-center gap-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2 py-1.5 text-xs text-zinc-300", children: [cat === 'image' && thumb ? _jsx("img", { src: thumb, alt: "", className: "w-8 h-8 object-cover rounded" }) :
                cat === 'pdf' ? _jsx(FileText, { size: 16, className: "text-red-400 flex-shrink-0" }) :
                    cat === 'code' ? _jsx(Code, { size: 16, className: "text-emerald-400 flex-shrink-0" }) :
                        _jsx(File, { size: 16, className: "text-zinc-400 flex-shrink-0" }), _jsx("span", { className: "truncate max-w-[120px]", children: file.name }), _jsx("span", { className: "text-zinc-500", children: formatFileSize(file.size) }), _jsx("button", { onClick: onRemove, className: "text-zinc-500 hover:text-zinc-300 ml-1", children: _jsx(X, { size: 12 }) })] }));
}
function ImagePreview({ src, alt, onClose }) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const imgRef = useRef(null);
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') {
                if (isFullscreen) {
                    document.exitFullscreen?.();
                    setIsFullscreen(false);
                }
                else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isFullscreen, onClose]);
    const toggleFullscreen = () => {
        if (!isFullscreen && imgRef.current) {
            imgRef.current.requestFullscreen?.();
            setIsFullscreen(true);
        }
        else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm", onClick: (e) => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { ref: imgRef, className: "relative max-w-[70vw] max-h-[80vh]", children: [_jsx("button", { onClick: onClose, className: "absolute -top-3 -right-3 z-10 p-1.5 bg-zinc-800 rounded-full border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors", children: _jsx(X, { size: 16 }) }), _jsxs("div", { className: "absolute top-2 left-2 flex gap-1.5", children: [_jsx("button", { onClick: toggleFullscreen, className: "p-1.5 bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-white transition-colors", title: "Fullscreen", children: _jsx(Maximize2, { size: 14 }) }), _jsx("a", { href: src, target: "_blank", rel: "noopener", className: "p-1.5 bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-white transition-colors", title: "Open in new tab", children: _jsx(ExternalLink, { size: 14 }) })] }), _jsx("img", { src: src, alt: alt || '', className: "max-w-full max-h-[80vh] rounded-lg object-contain" })] }) }));
}
function AttachmentPreview({ attachment, onImageClick }) {
    const cat = getFileCategory(attachment.originalName, attachment.mimeType);
    if (cat === 'image') {
        return (_jsx("div", { className: "block mt-2", children: _jsx("img", { src: attachment.url, alt: attachment.originalName, className: "max-w-[400px] rounded-lg border border-zinc-700/50 cursor-pointer hover:opacity-90 transition-opacity", loading: "lazy", onClick: () => onImageClick?.(attachment.url) }) }));
    }
    const icon = cat === 'pdf' ? _jsx(FileText, { size: 24, className: "text-red-400 flex-shrink-0" }) :
        cat === 'code' ? _jsx(Code, { size: 24, className: "text-emerald-400 flex-shrink-0" }) :
            _jsx(File, { size: 24, className: "text-zinc-400 flex-shrink-0" });
    return (_jsxs("div", { className: "flex items-center gap-3 mt-2 bg-zinc-800/40 border border-zinc-700/50 rounded-lg px-3 py-2 max-w-sm", children: [icon, _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm text-zinc-200 truncate", children: attachment.originalName }), _jsx("p", { className: "text-xs text-zinc-500", children: formatFileSize(attachment.size) })] }), _jsx("a", { href: attachment.url, target: "_blank", rel: "noopener noreferrer", className: "text-xs text-violet-400 hover:text-violet-300", children: "Open" })] }));
}
/* ── ChatPanel Component ───────────────────────────── */
export default function ChatPanel({ conversationId, agentName, modelName, showHeader = false, onClose }) {
    const queryClient = useQueryClient();
    const [input, setInput] = useState('');
    const [streamingContent, setStreamingContent] = useState('');
    const [toolBlocks, setToolBlocks] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [liveTranscript, setLiveTranscript] = useState('');
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const analyserRef = useRef(null);
    const animFrameRef = useRef(0);
    const audioCtxRef = useRef(null);
    const recordingTimerRef = useRef(null);
    const waveCanvasRef = useRef(null);
    const silenceStartRef = useRef(null);
    const silenceCheckRef = useRef(null);
    const chunkRecorderRef = useRef(null);
    const chunkIntervalRef = useRef(null);
    const liveTranscriptRef = useRef('');
    const stopRecordingRef = useRef(() => { });
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const textareaRef = useRef(null);
    const abortRef = useRef(null);
    const userScrolledRef = useRef(false);
    const streamBufferRef = useRef('');
    const flushTimerRef = useRef(null);
    const autoSendRef = useRef(false);
    const { data: chatMessages = [] } = useQuery({
        queryKey: ['messages', conversationId],
        queryFn: () => apiRequest(`/api/v1/chat/conversations/${conversationId}/messages`),
        enabled: !!conversationId,
        refetchInterval: isStreaming ? 5000 : 5000,
        refetchOnWindowFocus: true,
    });
    // Abort in-flight stream and reset state when conversation changes or unmounts
    useEffect(() => {
        return () => {
            abortRef.current?.abort();
            if (flushTimerRef.current) {
                clearTimeout(flushTimerRef.current);
                flushTimerRef.current = null;
            }
            streamBufferRef.current = '';
            setIsStreaming(false);
            setIsThinking(false);
            setStreamingContent('');
            setToolBlocks([]);
        };
    }, [conversationId]);
    const isNearBottom = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el)
            return true;
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
        if (!userScrolledRef.current)
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, streamingContent, toolBlocks]);
    const handleInputChange = useCallback((e) => {
        setInput(e.target.value);
        const ta = e.target;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
    }, []);
    const cancelStreaming = useCallback(() => {
        abortRef.current?.abort();
        if (flushTimerRef.current) {
            clearTimeout(flushTimerRef.current);
            flushTimerRef.current = null;
        }
        streamBufferRef.current = '';
        setIsStreaming(false);
        setIsThinking(false);
        setStreamingContent('');
        setToolBlocks([]);
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    }, [conversationId, queryClient]);
    const uploadFile = useCallback(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const resp = await fetch('/api/v1/chat/upload', { method: 'POST', credentials: 'include', body: formData });
            if (!resp.ok)
                return null;
            const json = await resp.json();
            return json.data;
        }
        catch {
            return null;
        }
    }, []);
    // Auto-send after voice recording completes
    useEffect(() => {
        if (autoSendRef.current && input.trim() && !isStreaming && !isRecording) {
            autoSendRef.current = false;
            sendMessage();
        }
    }, [input, isStreaming, isRecording]);
    const sendMessage = useCallback(async () => {
        if (!input.trim() || !conversationId || isStreaming)
            return;
        const content = input.trim();
        const filesToUpload = [...pendingFiles];
        setInput('');
        setPendingFiles([]);
        if (textareaRef.current)
            textareaRef.current.style.height = 'auto';
        let attachments = [];
        if (filesToUpload.length > 0) {
            setIsUploading(true);
            const results = await Promise.all(filesToUpload.map(uploadFile));
            attachments = results.filter((r) => r !== null);
            setIsUploading(false);
        }
        const tempUserMsg = {
            id: `temp-${Date.now()}`, conversationId, role: 'user', content,
            metadata: attachments.length > 0 ? { attachments } : null, createdAt: new Date().toISOString(),
        };
        queryClient.setQueryData(['messages', conversationId], (old = []) => [...old, tempUserMsg]);
        setIsStreaming(true);
        setIsThinking(true);
        setStreamingContent('');
        setToolBlocks([]);
        userScrolledRef.current = false;
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const response = await fetch(`/api/v1/chat/conversations/${conversationId}/messages`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({ content, attachments }), signal: controller.signal,
            });
            if (!response.ok || !response.body) {
                try {
                    const json = JSON.parse(await response.text());
                    if (json.data)
                        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
                }
                catch { }
                setIsStreaming(false);
                setIsThinking(false);
                return;
            }
            const ct = response.headers.get('content-type') || '';
            if (!ct.includes('text/event-stream')) {
                try {
                    JSON.parse(await response.text());
                }
                catch { }
                queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
                setIsStreaming(false);
                setIsThinking(false);
                return;
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let accumulated = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data: '))
                        continue;
                    const data = trimmed.slice(6);
                    if (data === '[DONE]')
                        continue;
                    try {
                        const event = JSON.parse(data);
                        switch (event.type) {
                            case 'thinking':
                                setIsThinking(true);
                                break;
                            case 'delta':
                                setIsThinking(false);
                                accumulated += event.content || '';
                                streamBufferRef.current = accumulated;
                                if (!flushTimerRef.current) {
                                    flushTimerRef.current = window.setTimeout(() => {
                                        setStreamingContent(streamBufferRef.current);
                                        flushTimerRef.current = null;
                                    }, 50);
                                }
                                break;
                            case 'tool_call':
                                setIsThinking(false);
                                setToolBlocks(prev => [...prev, { id: event.callId || `tc-${Date.now()}`, name: event.name || 'unknown', args: event.args || {}, status: 'calling' }]);
                                break;
                            case 'tool_result':
                                setToolBlocks(prev => prev.map(tb => tb.id === event.callId ? { ...tb, result: event.result, status: 'done' } : tb));
                                setIsThinking(true);
                                accumulated = '';
                                setStreamingContent('');
                                break;
                            case 'assistant_message':
                                // Snap to final — flush any pending buffer immediately
                                if (flushTimerRef.current) {
                                    clearTimeout(flushTimerRef.current);
                                    flushTimerRef.current = null;
                                }
                                setStreamingContent(streamBufferRef.current);
                                queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
                                break;
                            case 'error':
                                console.error('Chat error:', event.error);
                                // Show error as streaming content so user sees it
                                accumulated += `\n\n⚠️ Error: ${event.error || 'Unknown error'}`;
                                streamBufferRef.current = accumulated;
                                setStreamingContent(accumulated);
                                setIsThinking(false);
                                break;
                        }
                    }
                    catch { }
                }
            }
        }
        catch (err) {
            if (err.name === 'AbortError') {
                // Cleanup handled by the conversationId useEffect
                return;
            }
            console.error('Chat error:', err);
            // Force refetch on stream failure so DB-persisted messages still show
            queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
        if (flushTimerRef.current) {
            clearTimeout(flushTimerRef.current);
            flushTimerRef.current = null;
        }
        streamBufferRef.current = '';
        // Wait for DB messages to load BEFORE clearing streaming content,
        // so there's no flash where the response disappears
        await queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        setIsStreaming(false);
        setIsThinking(false);
        setStreamingContent('');
        setToolBlocks([]);
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }, [input, conversationId, isStreaming, pendingFiles, queryClient, uploadFile]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);
    const addFiles = useCallback((files) => {
        const arr = Array.from(files).filter(f => f.size <= 10 * 1024 * 1024);
        setPendingFiles(prev => [...prev, ...arr]);
    }, []);
    // Voice recording — smooth bar waveform (minimalist, blue)
    const WAVEFORM_BARS = 48;
    const waveBarsRef = useRef(new Array(WAVEFORM_BARS).fill(3));
    const drawWaveform = useCallback(() => {
        const analyser = analyserRef.current;
        if (!analyser)
            return;
        const bufLen = analyser.frequencyBinCount;
        const data = new Uint8Array(bufLen);
        analyser.getByteFrequencyData(data);
        const step = Math.max(1, Math.floor(bufLen / WAVEFORM_BARS));
        const newBars = [...waveBarsRef.current];
        for (let i = 0; i < WAVEFORM_BARS; i++) {
            const val = data[Math.min(i * step, bufLen - 1)] || 0;
            const target = Math.max(3, (val / 255) * 40);
            // Smooth interpolation
            newBars[i] = newBars[i] * 0.6 + target * 0.4;
        }
        waveBarsRef.current = newBars;
        // Update DOM bars directly for performance
        const container = waveCanvasRef.current;
        if (container) {
            const bars = container.children;
            for (let i = 0; i < bars.length; i++) {
                bars[i].style.height = `${newBars[i]}px`;
            }
        }
        animFrameRef.current = requestAnimationFrame(drawWaveform);
    }, []);
    const transcribeChunk = useCallback(async (blob) => {
        const form = new FormData();
        form.append('audio', blob, 'chunk.webm');
        try {
            const resp = await fetch('/api/v1/transcribe', { method: 'POST', credentials: 'include', body: form });
            const reader = resp.body?.getReader();
            const decoder = new TextDecoder();
            let chunkText = '';
            while (reader) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                const raw = decoder.decode(value, { stream: true });
                for (const line of raw.split('\n')) {
                    if (!line.startsWith('data: '))
                        continue;
                    try {
                        const d = JSON.parse(line.slice(6));
                        if (d.type === 'word')
                            chunkText += (chunkText ? ' ' : '') + d.text;
                        else if (d.type === 'done')
                            chunkText = d.fullText || chunkText;
                    }
                    catch { }
                }
            }
            if (chunkText.trim()) {
                liveTranscriptRef.current += (liveTranscriptRef.current ? ' ' : '') + chunkText.trim();
                setLiveTranscript(liveTranscriptRef.current);
            }
        }
        catch (err) {
            console.error('Chunk transcription error:', err);
        }
    }, []);
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioCtx = new AudioContext();
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            audioCtx.createMediaStreamSource(stream).connect(analyser);
            analyserRef.current = analyser;
            audioCtxRef.current = audioCtx;
            // Full recording for fallback
            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
            const recorder = new MediaRecorder(stream, { mimeType });
            chunksRef.current = [];
            recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
            recorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                audioCtx.close();
                // If we didn't get real-time text, transcribe the full recording
                if (!liveTranscriptRef.current.trim()) {
                    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    const form = new FormData();
                    form.append('audio', blob, 'recording.webm');
                    try {
                        const resp = await fetch('/api/v1/transcribe', { method: 'POST', credentials: 'include', body: form });
                        const reader = resp.body?.getReader();
                        const decoder = new TextDecoder();
                        let text = '';
                        while (reader) {
                            const { done, value } = await reader.read();
                            if (done)
                                break;
                            const chunk = decoder.decode(value, { stream: true });
                            for (const line of chunk.split('\n')) {
                                if (!line.startsWith('data: '))
                                    continue;
                                try {
                                    const d = JSON.parse(line.slice(6));
                                    if (d.type === 'done')
                                        text = d.fullText || text;
                                    else if (d.type === 'word')
                                        text += (text ? ' ' : '') + d.text;
                                }
                                catch { }
                            }
                        }
                        if (text.trim()) {
                            setInput(text.trim());
                            // Auto-send after short delay to let state update
                            setTimeout(() => { autoSendRef.current = true; }, 100);
                        }
                    }
                    catch (err) {
                        console.error('Transcription error:', err);
                    }
                }
                else {
                    setInput(liveTranscriptRef.current);
                    setTimeout(() => { autoSendRef.current = true; }, 100);
                }
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
            // Chunk recorder: every 3s, send a chunk to Whisper for real-time text
            const startChunkRecorder = () => {
                if (!stream.active)
                    return;
                const cr = new MediaRecorder(stream, { mimeType });
                const chunks = [];
                cr.ondataavailable = (e) => chunks.push(e.data);
                cr.onstop = () => {
                    if (chunks.length > 0)
                        transcribeChunk(new Blob(chunks, { type: 'audio/webm' }));
                };
                cr.start();
                chunkRecorderRef.current = cr;
            };
            startChunkRecorder();
            chunkIntervalRef.current = window.setInterval(() => {
                if (chunkRecorderRef.current?.state === 'recording')
                    chunkRecorderRef.current.stop();
                startChunkRecorder();
            }, 3000);
            // Silence detection: auto-stop after 3s of silence
            silenceStartRef.current = null;
            silenceCheckRef.current = window.setInterval(() => {
                if (!analyserRef.current)
                    return;
                const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(freqData);
                const avg = freqData.reduce((a, b) => a + b, 0) / freqData.length;
                if (avg < 5) {
                    silenceStartRef.current = silenceStartRef.current || Date.now();
                    if (Date.now() - silenceStartRef.current > 3000)
                        stopRecordingRef.current();
                }
                else {
                    silenceStartRef.current = null;
                }
            }, 200);
            setIsRecording(true);
            setRecordingDuration(0);
            setLiveTranscript('');
            liveTranscriptRef.current = '';
            recordingTimerRef.current = window.setInterval(() => setRecordingDuration(d => d + 1), 1000);
            // Start waveform animation
            requestAnimationFrame(drawWaveform);
        }
        catch (err) {
            console.error('Mic access denied:', err);
        }
    }, [drawWaveform, transcribeChunk]);
    const stopRecording = useCallback(() => {
        if (chunkRecorderRef.current?.state === 'recording')
            chunkRecorderRef.current.stop();
        if (chunkIntervalRef.current) {
            clearInterval(chunkIntervalRef.current);
            chunkIntervalRef.current = null;
        }
        if (silenceCheckRef.current) {
            clearInterval(silenceCheckRef.current);
            silenceCheckRef.current = null;
        }
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
        setRecordingDuration(0);
        cancelAnimationFrame(animFrameRef.current);
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
    }, []);
    // Keep ref in sync for silence detection callback
    useEffect(() => { stopRecordingRef.current = stopRecording; }, [stopRecording]);
    // Cmd+J / Ctrl+J keyboard shortcut for voice recording
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
                e.preventDefault();
                if (isRecording)
                    stopRecording();
                else
                    startRecording();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isRecording, startRecording, stopRecording]);
    // Auto-focus textarea and capture keyboard input directly
    useEffect(() => {
        textareaRef.current?.focus();
    }, [conversationId]);
    useEffect(() => {
        const handler = (e) => {
            const ta = textareaRef.current;
            if (!ta || isStreaming || isRecording)
                return;
            // Skip if already focused on an input element
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable))
                return;
            // Skip modifier combos (except shift for uppercase) and non-printable keys
            if (e.metaKey || e.ctrlKey || e.altKey)
                return;
            if (e.key.length !== 1)
                return;
            ta.focus();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isStreaming, isRecording]);
    const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0)
            addFiles(e.dataTransfer.files);
    }, [addFiles]);
    const hasMessages = chatMessages.length > 0 || isStreaming;
    let lastDateKey = '';
    return (_jsxs("div", { className: "relative flex flex-col h-full min-w-0", children: [_jsx(AgentCarousel, {}), showHeader && (_jsxs("div", { className: "flex items-center gap-2 px-3 h-9 border-b border-zinc-800/40 flex-shrink-0 bg-zinc-950/80", children: [_jsx("div", { className: "w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center", children: _jsx(Zap, { size: 8, className: "text-violet-400" }) }), _jsx("span", { className: "text-xs font-medium text-zinc-300 truncate", children: agentName || 'Kira' }), modelName && (_jsx("span", { className: "text-[9px] text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded-full", children: modelName })), onClose && (_jsx("button", { onClick: onClose, className: "ml-auto text-zinc-600 hover:text-zinc-300 transition-colors", children: _jsx(X, { size: 12 }) }))] })), _jsxs("div", { className: "flex-1 overflow-y-auto relative", ref: scrollContainerRef, onScroll: handleScroll, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, children: [isDragging && (_jsx("div", { className: "absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm", children: _jsxs("div", { className: "border-2 border-dashed border-violet-500/50 rounded-2xl px-8 py-6 text-center", children: [_jsx(Paperclip, { size: 24, className: "text-violet-400 mx-auto mb-2" }), _jsx("p", { className: "text-sm text-violet-300", children: "Drop files here" })] }) })), _jsxs("div", { className: "max-w-3xl mx-auto px-4 py-6 space-y-0", children: [!hasMessages && (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 gap-4", children: [_jsx("div", { className: "w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center", children: _jsx(Sparkles, { size: 20, className: "text-violet-400" }) }), _jsxs("div", { className: "text-center", children: [_jsx("h3", { className: "text-sm font-medium text-zinc-300 mb-1", children: "How can I help?" }), _jsx("p", { className: "text-xs text-zinc-500", children: "Try one of these or type your own message" })] }), _jsx("div", { className: "grid grid-cols-2 gap-2 max-w-md w-full", children: SUGGESTION_CHIPS.map(chip => (_jsx("button", { onClick: () => { setInput(chip); textareaRef.current?.focus(); }, className: "px-3 py-2 rounded-xl border border-zinc-800/50 bg-zinc-900/40 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700/60 hover:bg-zinc-800/40 transition-all text-left", children: chip }, chip))) })] })), chatMessages.filter((msg, i) => {
                                // While streaming, hide the last assistant message (it's shown as streamingContent)
                                if (isStreaming && msg.role === 'assistant' && i === chatMessages.length - 1)
                                    return false;
                                return true;
                            }).map(msg => {
                                const dateKey = getDateKey(msg.createdAt);
                                const showDivider = dateKey !== lastDateKey;
                                lastDateKey = dateKey;
                                const meta = msg.metadata;
                                const msgModel = meta?.model;
                                return (_jsxs("div", { children: [showDivider && (_jsxs("div", { className: "flex items-center gap-3 py-4", children: [_jsx("div", { className: "flex-1 h-px bg-zinc-800/40" }), _jsx("span", { className: "text-[10px] text-zinc-600 font-medium uppercase tracking-wider", children: formatDateDivider(msg.createdAt) }), _jsx("div", { className: "flex-1 h-px bg-zinc-800/40" })] })), _jsxs("div", { className: "py-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [msg.role === 'user' ? (_jsx("div", { className: "w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center", children: _jsx("span", { className: "text-[10px] text-zinc-300 font-medium", children: "O" }) })) : (_jsx("div", { className: "w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center", children: _jsx(Zap, { size: 10, className: "text-violet-400" }) })), _jsx("span", { className: "text-xs font-medium text-zinc-400", children: msg.role === 'user' ? 'You' : (agentName || 'Kira') }), _jsx("span", { className: "text-[10px] text-zinc-600", children: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }), msg.role === 'assistant' && msgModel && (_jsx("span", { className: "text-[9px] text-zinc-600 bg-zinc-800/40 px-1.5 py-0.5 rounded-full", children: msgModel.split('/').pop() }))] }), _jsxs("div", { className: `pl-7 ${msg.role === 'user' ? 'text-zinc-200' : 'text-zinc-300'}`, children: [_jsx(Markdown, { text: msg.content }), Array.isArray(meta?.attachments) && meta.attachments.map((att) => (_jsx(AttachmentPreview, { attachment: att, onImageClick: setPreviewImage }, att.id)))] })] })] }, msg.id));
                            }), toolBlocks.length > 0 && (_jsx("div", { className: "pl-7 py-2", children: toolBlocks.map(tb => _jsx(ToolCallBlock, { tool: tb }, tb.id)) })), isStreaming && streamingContent && (_jsxs("div", { className: "py-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("div", { className: "w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center", children: _jsx(Zap, { size: 10, className: "text-violet-400" }) }), _jsx("span", { className: "text-xs font-medium text-zinc-400", children: agentName || 'Kira' })] }), _jsxs("div", { className: "pl-7 text-zinc-300", children: [_jsx(Markdown, { text: streamingContent }), _jsx("span", { className: "inline-block w-0.5 h-4 bg-violet-400 animate-pulse ml-0.5 -mb-0.5" })] })] })), isThinking && !streamingContent && _jsx(ThinkingIndicator, {}), _jsx("div", { ref: messagesEndRef })] }), showScrollBtn && (_jsx("button", { onClick: scrollToBottom, className: "sticky bottom-4 left-1/2 -translate-x-1/2 ml-[50%] w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-all shadow-lg", children: _jsx(ArrowDown, { size: 14 }) }))] }), _jsx("div", { className: "border-t border-zinc-800/40 bg-zinc-950", children: _jsxs("div", { className: "max-w-3xl mx-auto px-4 py-3", children: [pendingFiles.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 mb-2", children: pendingFiles.map((f, i) => _jsx(FileChip, { file: f, onRemove: () => setPendingFiles(prev => prev.filter((_, j) => j !== i)) }, `${f.name}-${i}`)) })), isUploading && (_jsxs("div", { className: "flex items-center gap-2 mb-2 text-xs text-zinc-400", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-violet-400 animate-pulse" }), " Uploading files..."] })), _jsx("input", { ref: fileInputRef, type: "file", multiple: true, className: "hidden", accept: "image/*,application/pdf,text/*,application/json", onChange: e => { if (e.target.files)
                                addFiles(e.target.files); e.target.value = ''; } }), isRecording ? (
                        /* Voice recording — replaces entire input area */
                        _jsxs("div", { className: "bg-zinc-900/60 border border-blue-500/20 rounded-xl overflow-hidden transition-all", children: [_jsx("div", { className: "flex items-center justify-center px-4 py-3 gap-[2px]", ref: waveCanvasRef, children: Array.from({ length: WAVEFORM_BARS }).map((_, i) => (_jsx("div", { style: { width: '3px', minHeight: '3px', height: '3px', borderRadius: '2px', background: '#3b82f6', transition: 'height 0.06s ease-out', willChange: 'height' } }, i))) }), liveTranscript && (_jsx("div", { className: "px-4 py-2 border-t border-zinc-800/50 max-h-[120px] overflow-y-auto", children: _jsx("div", { className: "text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words", children: liveTranscript }) })), _jsxs("div", { className: "flex items-center justify-between px-4 py-2 border-t border-zinc-800/50", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" }), _jsxs("span", { className: "text-[11px] text-zinc-500 font-mono", children: [Math.floor(recordingDuration / 60), ":", String(recordingDuration % 60).padStart(2, '0')] }), !liveTranscript && _jsx("span", { className: "text-[11px] text-zinc-600 italic ml-2", children: "Listening..." })] }), _jsxs("button", { onClick: stopRecording, className: "px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors text-xs text-zinc-400 flex items-center gap-1.5", title: "Stop recording", children: [_jsx(Square, { size: 8, className: "text-blue-400 fill-blue-400" }), "Stop"] })] })] })) : (_jsxs("div", { className: `flex items-end gap-2 bg-zinc-900/60 border rounded-xl px-3 py-2 transition-all border-zinc-800/50 focus-within:border-violet-500/30`, children: [_jsx("button", { onClick: () => fileInputRef.current?.click(), className: "p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors", title: "Attach files", children: _jsx(Paperclip, { size: 14 }) }), _jsx("textarea", { ref: textareaRef, value: input, onChange: handleInputChange, onKeyDown: handleKeyDown, placeholder: `Message ${agentName || 'Kira'}...`, disabled: isStreaming, rows: 1, className: "flex-1 resize-none bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50 min-h-[32px]", style: { maxHeight: '200px' } }), _jsx("button", { onClick: startRecording, className: "p-1.5 text-zinc-500 hover:text-violet-400 transition-colors", title: "Voice input (\u2318J)", children: _jsx(Mic, { size: 14 }) }), isStreaming ? (_jsx("button", { onClick: cancelStreaming, className: "p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all", title: "Stop generating", children: _jsx(Square, { size: 14 }) })) : (_jsx("button", { onClick: sendMessage, disabled: !input.trim(), className: `p-1.5 rounded-lg transition-all ${input.trim() ? 'bg-violet-500 text-white hover:bg-violet-400' : 'text-zinc-600'}`, children: _jsx(Send, { size: 14 }) }))] }))] }) }), previewImage && (_jsx(ImagePreview, { src: previewImage, onClose: () => setPreviewImage(null) }))] }));
}
//# sourceMappingURL=ChatPanel.js.map