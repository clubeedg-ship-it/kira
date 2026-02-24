import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Clock, Zap, Play, Settings, Trash2, Plus, ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle, ToggleLeft, ToggleRight, } from 'lucide-react';
import { Button, Skeleton } from '../components/ui';
import { Drawer } from '../components/ui/Drawer';
import { apiRequest } from '../lib/api';
import { cn } from '../lib/cn';
// ── Models (reuse from Settings) ─────────────────────────────────────────────
const AVAILABLE_MODELS = [
    { id: 'anthropic/claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'Anthropic' },
    { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'Anthropic' },
    { id: 'openai/o3', name: 'OpenAI o3', provider: 'OpenAI' },
    { id: 'openai/o4-mini', name: 'OpenAI o4-mini', provider: 'OpenAI' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek' },
    { id: 'minimax/minimax-m2.5', name: 'MiniMax M2.5', provider: 'MiniMax' },
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
    { id: 'openai/gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI' },
    { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'OpenAI' },
    { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek' },
    { id: 'qwen/qwen3-235b-a22b', name: 'Qwen3 235B', provider: 'Qwen' },
    { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta' },
    { id: 'anthropic/claude-haiku-3.5', name: 'Claude Haiku 3.5', provider: 'Anthropic' },
    { id: 'openai/gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'OpenAI' },
    { id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout', provider: 'Meta' },
    { id: 'qwen/qwen3-32b', name: 'Qwen3 32B', provider: 'Qwen' },
    { id: 'anthropic/claude-code', name: 'Claude Code', provider: 'Anthropic' },
    { id: 'google/gemini-2.5-flash-lite-preview', name: 'Gemini 2.5 Flash Lite', provider: 'Google' },
];
const TOOLS_LIST = [
    'execute_code',
    'read_file',
    'write_file',
    'list_files',
    'search_tasks',
    'create_task',
    'list_projects',
    'create_document',
    'search_knowledge',
];
const SCHEDULE_TYPES = [
    { value: 'manual', label: 'Manual only' },
    { value: 'every_n_min', label: 'Every N minutes' },
    { value: 'daily', label: 'Daily at HH:MM' },
    { value: 'weekly', label: 'Weekly on DAY at HH:MM' },
    { value: 'cron', label: 'Custom cron' },
    { value: 'on_message', label: 'On every message' },
];
const QUERY_KEY = ['user-agents'];
const RUNS_KEY = ['user-agents-recent-runs'];
// ── Helpers ──────────────────────────────────────────────────────────────────
function relativeTime(ts) {
    if (!ts)
        return '—';
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 0) {
        const absDiff = -diff;
        if (absDiff < 60_000)
            return `in ${Math.round(absDiff / 1000)}s`;
        if (absDiff < 3_600_000)
            return `in ${Math.round(absDiff / 60_000)} min`;
        if (absDiff < 86_400_000)
            return `in ${Math.round(absDiff / 3_600_000)}h`;
        return `in ${Math.round(absDiff / 86_400_000)}d`;
    }
    if (diff < 60_000)
        return `${Math.round(diff / 1000)}s ago`;
    if (diff < 3_600_000)
        return `${Math.round(diff / 60_000)} min ago`;
    if (diff < 86_400_000)
        return `${Math.round(diff / 3_600_000)}h ago`;
    return `${Math.round(diff / 86_400_000)}d ago`;
}
function scheduleLabel(schedule, type) {
    if (type === 'event' || schedule === 'on_message')
        return 'On message';
    if (!schedule)
        return 'Manual';
    if (schedule.startsWith('*/')) {
        const mins = schedule.split(' ')[0]?.replace('*/', '');
        return `Every ${mins} min`;
    }
    return schedule;
}
function getCategory(agent) {
    if (agent.type === 'main' || agent.type === 'running')
        return 'running';
    if (agent.type === 'event' || agent.schedule === 'on_message')
        return 'event';
    return 'scheduled';
}
function durationMs(start, end) {
    if (!start || !end)
        return '—';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60_000)
        return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60_000).toFixed(1)}m`;
}
function providerColor(model) {
    if (model.includes('anthropic'))
        return 'bg-amber-800/60';
    if (model.includes('openai'))
        return 'bg-emerald-800/60';
    if (model.includes('google'))
        return 'bg-blue-800/60';
    if (model.includes('deepseek'))
        return 'bg-cyan-800/60';
    if (model.includes('meta'))
        return 'bg-purple-800/60';
    return 'bg-zinc-700';
}
// ── Schedule helpers ─────────────────────────────────────────────────────────
function parseScheduleType(schedule, type) {
    if (type === 'event' || schedule === 'on_message')
        return 'on_message';
    if (!schedule)
        return 'manual';
    if (schedule.startsWith('*/'))
        return 'every_n_min';
    // simple daily/weekly detection
    const parts = schedule.split(' ');
    if (parts.length === 5) {
        if (parts[4] !== '*')
            return 'weekly';
        if (parts[1] !== '*')
            return 'daily';
        return 'cron';
    }
    return 'cron';
}
function buildCron(schedType, mins, hour, minute, dayOfWeek, customCron) {
    switch (schedType) {
        case 'manual': return null;
        case 'on_message': return 'on_message';
        case 'every_n_min': return `*/${mins || '30'} * * * *`;
        case 'daily': return `${minute || '0'} ${hour || '9'} * * *`;
        case 'weekly': return `${minute || '0'} ${hour || '9'} * * ${dayOfWeek || '1'}`;
        case 'cron': return customCron || null;
        default: return null;
    }
}
function ConfigurePanel({ agent, isNew, onClose, onSave, onDelete, onRunNow, saving, runningNow }) {
    const [name, setName] = useState(agent?.name || '');
    const [model, setModel] = useState(agent?.model || 'openai/gpt-4.1-nano');
    const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt || '');
    const [tools, setTools] = useState(agent?.tools || []);
    const [enabled, setEnabled] = useState(agent?.enabled ?? true);
    const [agentType, setAgentType] = useState(agent?.type || 'custom');
    const [schedType, setSchedType] = useState(() => parseScheduleType(agent?.schedule ?? null, agent?.type ?? 'custom'));
    const [mins, setMins] = useState('30');
    const [hour, setHour] = useState('9');
    const [minute, setMinute] = useState('0');
    const [dayOfWeek, setDayOfWeek] = useState('1');
    const [customCron, setCustomCron] = useState(agent?.schedule || '');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const toggleTool = (t) => {
        setTools(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
    };
    const handleSave = () => {
        const schedule = buildCron(schedType, mins, hour, minute, dayOfWeek, customCron);
        const type = schedType === 'on_message' ? 'event' : agentType;
        onSave({ name, model, systemPrompt, tools, schedule, enabled, type });
    };
    const handleDelete = () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        onDelete?.();
    };
    return (_jsx(Drawer, { open: true, title: isNew ? 'New Agent' : 'Configure Agent', onClose: onClose, footer: _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { onClick: handleSave, disabled: saving || !name || !systemPrompt, children: [saving ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : null, "Save"] }), !isNew && (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "outline", onClick: onRunNow, disabled: runningNow, children: [runningNow ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(Play, { className: "h-3.5 w-3.5" }), "Run Now"] }), _jsxs(Button, { variant: "outline", onClick: handleDelete, className: confirmDelete ? 'border-red-500 text-red-400' : '', children: [_jsx(Trash2, { className: "h-3.5 w-3.5" }), confirmDelete ? 'Confirm Delete' : 'Delete'] })] }))] }), children: _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400", children: "Name" }), _jsx("input", { className: "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500", value: name, onChange: e => setName(e.target.value), placeholder: "My Agent" })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400", children: "Model" }), _jsx("select", { className: "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500", value: model, onChange: e => setModel(e.target.value), children: AVAILABLE_MODELS.map(m => (_jsxs("option", { value: m.id, children: [m.name, " (", m.provider, ")"] }, m.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400", children: "Schedule" }), _jsx("select", { className: "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500", value: schedType, onChange: e => setSchedType(e.target.value), children: SCHEDULE_TYPES.map(s => _jsx("option", { value: s.value, children: s.label }, s.value)) }), schedType === 'every_n_min' && (_jsxs("div", { className: "mt-2 flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-zinc-400", children: "Every" }), _jsx("input", { type: "number", min: "1", max: "1440", className: "w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100", value: mins, onChange: e => setMins(e.target.value) }), _jsx("span", { className: "text-xs text-zinc-400", children: "minutes" })] })), (schedType === 'daily' || schedType === 'weekly') && (_jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-2", children: [schedType === 'weekly' && (_jsx("select", { className: "rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100", value: dayOfWeek, onChange: e => setDayOfWeek(e.target.value), children: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (_jsx("option", { value: String(i), children: d }, i))) })), _jsx("span", { className: "text-xs text-zinc-400", children: "at" }), _jsx("input", { type: "number", min: "0", max: "23", className: "w-16 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100", value: hour, onChange: e => setHour(e.target.value), placeholder: "HH" }), _jsx("span", { className: "text-zinc-400", children: ":" }), _jsx("input", { type: "number", min: "0", max: "59", className: "w-16 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100", value: minute, onChange: e => setMinute(e.target.value), placeholder: "MM" })] })), schedType === 'cron' && (_jsx("input", { className: "mt-2 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 font-mono", value: customCron, onChange: e => setCustomCron(e.target.value), placeholder: "*/30 * * * *" }))] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400", children: "System Prompt" }), _jsx("textarea", { className: "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 min-h-[150px]", rows: 6, value: systemPrompt, onChange: e => setSystemPrompt(e.target.value), placeholder: "You are a helpful agent that..." })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400", children: "Tools" }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: TOOLS_LIST.map(t => (_jsxs("label", { className: "flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 hover:bg-zinc-800/30 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: tools.includes(t), onChange: () => toggleTool(t), className: "rounded border-zinc-600 bg-zinc-900 text-blue-500" }), _jsx("span", { className: "text-xs text-zinc-300 font-mono", children: t })] }, t))) })] }), _jsxs("div", { className: "flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3", children: [_jsx("span", { className: "text-sm text-zinc-300", children: "Enabled" }), _jsx("button", { onClick: () => setEnabled(!enabled), className: "text-zinc-300 hover:text-zinc-100", children: enabled
                                ? _jsx(ToggleRight, { className: "h-7 w-7 text-green-500" })
                                : _jsx(ToggleLeft, { className: "h-7 w-7 text-zinc-600" }) })] })] }) }));
}
function AgentCard({ agent, onConfigure, onRunNow, onToggle, onViewLogs, isRunning }) {
    return (_jsxs("div", { className: "group rounded-xl border border-zinc-800 bg-zinc-950 p-4 hover:bg-zinc-800/30 transition-colors", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [_jsx("div", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800", children: getCategory(agent) === 'event' ? _jsx(Zap, { className: "h-5 w-5 text-yellow-400" }) :
                                    getCategory(agent) === 'running' ? _jsx(Bot, { className: "h-5 w-5 text-blue-400" }) :
                                        _jsx(Clock, { className: "h-5 w-5 text-zinc-400" }) }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h3", { className: "text-sm font-semibold text-zinc-100 truncate", children: agent.name }), _jsx("span", { className: cn('rounded-full px-2 py-0.5 text-[10px] font-medium text-zinc-300', providerColor(agent.model)), children: agent.model.split('/').pop() })] }), _jsxs("p", { className: "text-xs text-zinc-500 mt-0.5", children: [scheduleLabel(agent.schedule, agent.type), agent.lastRunAt && _jsxs(_Fragment, { children: [" \u00B7 Last: ", relativeTime(agent.lastRunAt)] }), agent.nextRunAt && _jsxs(_Fragment, { children: [" \u00B7 Next: ", relativeTime(agent.nextRunAt)] })] })] })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: cn('h-2 w-2 rounded-full', agent.enabled ? 'bg-green-500' : 'bg-zinc-600') }), _jsx("button", { onClick: onToggle, className: "text-zinc-500 hover:text-zinc-300 p-1", title: agent.enabled ? 'Disable' : 'Enable', children: agent.enabled
                                    ? _jsx(ToggleRight, { className: "h-5 w-5 text-green-500" })
                                    : _jsx(ToggleLeft, { className: "h-5 w-5" }) })] })] }), _jsxs("div", { className: "mt-3 flex items-center gap-2", children: [_jsxs("button", { onClick: onConfigure, className: "flex items-center gap-1 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors", children: [_jsx(Settings, { className: "h-3 w-3" }), " Configure"] }), _jsxs("button", { onClick: onRunNow, disabled: isRunning, className: "flex items-center gap-1 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors disabled:opacity-50", children: [isRunning ? _jsx(Loader2, { className: "h-3 w-3 animate-spin" }) : _jsx(Play, { className: "h-3 w-3" }), "Run Now"] }), _jsx("button", { onClick: onViewLogs, className: "flex items-center gap-1 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors", children: "View Logs" })] })] }));
}
// ── Main Page ────────────────────────────────────────────────────────────────
export default function Agents() {
    const qc = useQueryClient();
    const [configAgent, setConfigAgent] = useState(null);
    const [isNewAgent, setIsNewAgent] = useState(false);
    const [expandedRunId, setExpandedRunId] = useState(null);
    const [runningId, setRunningId] = useState(null);
    const [logsAgentId, setLogsAgentId] = useState(null);
    const { data: agents = [], isLoading } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: () => apiRequest('/api/v1/user-agents'),
        refetchInterval: 30_000,
    });
    const { data: recentRuns = [] } = useQuery({
        queryKey: RUNS_KEY,
        queryFn: () => apiRequest('/api/v1/user-agents/runs/recent'),
        refetchInterval: 30_000,
    });
    const { data: agentLogs = [] } = useQuery({
        queryKey: ['agent-logs', logsAgentId],
        queryFn: () => apiRequest(`/api/v1/user-agents/${logsAgentId}/runs`),
        enabled: !!logsAgentId,
    });
    const invalidate = () => {
        void qc.invalidateQueries({ queryKey: QUERY_KEY });
        void qc.invalidateQueries({ queryKey: RUNS_KEY });
    };
    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (data.id) {
                return apiRequest(`/api/v1/user-agents/${data.id}`, {
                    method: 'PUT', body: JSON.stringify(data.body),
                });
            }
            return apiRequest('/api/v1/user-agents', {
                method: 'POST', body: JSON.stringify(data.body),
            });
        },
        onSuccess: () => { invalidate(); setConfigAgent(null); setIsNewAgent(false); },
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => apiRequest(`/api/v1/user-agents/${id}`, { method: 'DELETE' }),
        onSuccess: () => { invalidate(); setConfigAgent(null); setIsNewAgent(false); },
    });
    const toggleMutation = useMutation({
        mutationFn: (agent) => apiRequest(`/api/v1/user-agents/${agent.id}`, {
            method: 'PUT', body: JSON.stringify({ enabled: !agent.enabled }),
        }),
        onMutate: async (agent) => {
            await qc.cancelQueries({ queryKey: QUERY_KEY });
            const prev = qc.getQueryData(QUERY_KEY);
            qc.setQueryData(QUERY_KEY, old => old?.map(a => a.id === agent.id ? { ...a, enabled: !a.enabled } : a) ?? []);
            return { prev };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev)
                qc.setQueryData(QUERY_KEY, ctx.prev);
        },
        onSettled: () => invalidate(),
    });
    const runNowMutation = useMutation({
        mutationFn: (id) => apiRequest(`/api/v1/user-agents/${id}/run`, { method: 'POST' }),
        onMutate: (id) => setRunningId(id),
        onSettled: () => { setRunningId(null); invalidate(); },
    });
    const grouped = useMemo(() => {
        const groups = {
            running: [], scheduled: [], event: [],
        };
        for (const a of agents) {
            groups[getCategory(a)].push(a);
        }
        return groups;
    }, [agents]);
    const openNew = useCallback(() => {
        setIsNewAgent(true);
        setConfigAgent({
            id: '', name: '', type: 'custom', model: 'openai/gpt-4.1-nano',
            systemPrompt: '', tools: [], schedule: null, enabled: true,
            config: {}, lastRunAt: null, nextRunAt: null, createdAt: '', updatedAt: '',
        });
    }, []);
    if (isLoading) {
        return (_jsxs("div", { className: "space-y-4", children: [_jsx(Skeleton, { className: "h-12 w-full" }), _jsx(Skeleton, { className: "h-48 w-full" }), _jsx(Skeleton, { className: "h-48 w-full" })] }));
    }
    const categoryLabel = { running: 'Running', scheduled: 'Scheduled', event: 'Event-Triggered' };
    const categoryIcon = {
        running: _jsx(Bot, { className: "h-4 w-4 text-blue-400" }),
        scheduled: _jsx(Clock, { className: "h-4 w-4 text-zinc-400" }),
        event: _jsx(Zap, { className: "h-4 w-4 text-yellow-400" }),
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "font-display text-2xl font-semibold text-zinc-100", children: "Agents" }), _jsxs(Button, { onClick: openNew, children: [_jsx(Plus, { className: "h-4 w-4" }), " New Agent"] })] }), ['running', 'scheduled', 'event'].map(cat => {
                const list = grouped[cat];
                if (cat !== 'running' && list.length === 0)
                    return null;
                return (_jsxs("section", { children: [_jsxs("div", { className: "mb-3 flex items-center gap-2", children: [categoryIcon[cat], _jsx("h2", { className: "text-sm font-medium uppercase tracking-wide text-zinc-400", children: categoryLabel[cat] }), _jsx("span", { className: "rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500", children: list.length })] }), _jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children: list.map(agent => (_jsx(AgentCard, { agent: agent, onConfigure: () => { setConfigAgent(agent); setIsNewAgent(false); }, onRunNow: () => runNowMutation.mutate(agent.id), onToggle: () => toggleMutation.mutate(agent), onViewLogs: () => setLogsAgentId(agent.id), isRunning: runningId === agent.id }, agent.id))) })] }, cat));
            }), _jsxs("section", { children: [_jsx("h2", { className: "mb-3 text-sm font-medium uppercase tracking-wide text-zinc-400", children: "Recent Runs" }), recentRuns.length === 0 ? (_jsx("p", { className: "text-sm text-zinc-600", children: "No runs yet." })) : (_jsx("div", { className: "rounded-xl border border-zinc-800 overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-zinc-900/80", children: _jsxs("tr", { className: "text-left text-xs text-zinc-500", children: [_jsx("th", { className: "px-4 py-2.5", children: "Time" }), _jsx("th", { className: "px-4 py-2.5", children: "Agent" }), _jsx("th", { className: "px-4 py-2.5", children: "Status" }), _jsx("th", { className: "px-4 py-2.5", children: "Duration" }), _jsx("th", { className: "px-4 py-2.5", children: "Tokens" }), _jsx("th", { className: "px-4 py-2.5 w-8" })] }) }), _jsx("tbody", { className: "divide-y divide-zinc-800/50", children: recentRuns.map(run => (_jsxs(_Fragment, { children: [_jsxs("tr", { className: "hover:bg-zinc-800/20 cursor-pointer", onClick: () => setExpandedRunId(expandedRunId === run.id ? null : run.id), children: [_jsx("td", { className: "px-4 py-2.5 text-zinc-400", children: relativeTime(run.createdAt) }), _jsx("td", { className: "px-4 py-2.5 text-zinc-200", children: run.agentName || '—' }), _jsx("td", { className: "px-4 py-2.5", children: run.status === 'success' || run.status === 'completed'
                                                            ? _jsx(CheckCircle2, { className: "h-4 w-4 text-green-500" })
                                                            : run.status === 'failed' || run.status === 'error'
                                                                ? _jsx(XCircle, { className: "h-4 w-4 text-red-500" })
                                                                : _jsx(Loader2, { className: "h-4 w-4 text-zinc-500 animate-spin" }) }), _jsx("td", { className: "px-4 py-2.5 text-zinc-400", children: durationMs(run.startedAt, run.finishedAt) }), _jsx("td", { className: "px-4 py-2.5 text-zinc-400", children: run.tokensUsed ?? '—' }), _jsx("td", { className: "px-4 py-2.5 text-zinc-500", children: expandedRunId === run.id ? _jsx(ChevronDown, { className: "h-3 w-3" }) : _jsx(ChevronRight, { className: "h-3 w-3" }) })] }, run.id), expandedRunId === run.id && (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "bg-zinc-900/50 px-4 py-3", children: _jsx("pre", { className: "whitespace-pre-wrap text-xs text-zinc-400 max-h-60 overflow-auto", children: run.output || run.error || 'No output' }) }) }, `${run.id}-detail`))] }))) })] }) }))] }), configAgent && (_jsx(ConfigurePanel, { agent: configAgent, isNew: isNewAgent, onClose: () => { setConfigAgent(null); setIsNewAgent(false); }, onSave: (body) => saveMutation.mutate({ id: isNewAgent ? undefined : configAgent.id, body }), onDelete: () => configAgent.id ? deleteMutation.mutate(configAgent.id) : undefined, onRunNow: () => configAgent.id ? runNowMutation.mutate(configAgent.id) : undefined, saving: saveMutation.isPending, runningNow: runningId === configAgent.id })), logsAgentId && (_jsx(Drawer, { open: true, title: "Agent Run Logs", onClose: () => setLogsAgentId(null), children: _jsx("div", { className: "space-y-3", children: agentLogs.length === 0 ? (_jsx("p", { className: "text-sm text-zinc-500", children: "No runs yet." })) : agentLogs.map(run => (_jsxs("div", { className: "rounded-lg border border-zinc-800 p-3", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-zinc-400", children: [_jsx("span", { children: relativeTime(run.createdAt) }), _jsx("span", { className: run.status === 'success' || run.status === 'completed' ? 'text-green-500' : run.status === 'failed' ? 'text-red-500' : 'text-zinc-500', children: run.status })] }), _jsxs("div", { className: "mt-1 flex gap-3 text-xs text-zinc-500", children: [_jsx("span", { children: durationMs(run.startedAt, run.finishedAt) }), run.tokensUsed && _jsxs("span", { children: [run.tokensUsed, " tokens"] })] }), (run.output || run.error) && (_jsx("pre", { className: "mt-2 whitespace-pre-wrap text-xs text-zinc-400 max-h-40 overflow-auto rounded bg-zinc-900 p-2", children: run.output || run.error }))] }, run.id))) }) }))] }));
}
//# sourceMappingURL=Agents.js.map