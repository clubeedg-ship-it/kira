import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, ChevronUp, Clock3, Play, Pause } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Skeleton, } from '../components/ui';
import { ApiError, apiRequest } from '../lib/api';
import { cn } from '../lib/cn';
const AGENT_MONITOR_QUERY_KEY = ['agents-monitor'];
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_STATS = {
    approvalRate: 0,
    completedToday: 0,
    costToday: 0,
};
const statusMeta = {
    working: {
        badgeVariant: 'success',
        dotClassName: 'bg-success',
        label: 'Working',
        order: 0,
    },
    idle: {
        badgeVariant: 'default',
        dotClassName: 'bg-slate-400',
        label: 'Idle',
        order: 1,
    },
    blocked: {
        badgeVariant: 'warning',
        dotClassName: 'bg-amber-400',
        label: 'Blocked',
        order: 2,
    },
    paused: {
        badgeVariant: 'warning',
        dotClassName: 'bg-amber-400',
        label: 'Paused',
        order: 3,
    },
    error: {
        badgeVariant: 'danger',
        dotClassName: 'bg-error',
        label: 'Error',
        order: 4,
    },
    unknown: {
        badgeVariant: 'default',
        dotClassName: 'bg-slate-400',
        label: 'Unknown',
        order: 5,
    },
};
const currencyFormatter = new Intl.NumberFormat('en-US', {
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: 'currency',
});
const timestampFormatter = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
});
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function readString(record, ...keys) {
    for (const key of keys) {
        const rawValue = record[key];
        if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
            return rawValue.trim();
        }
    }
    return null;
}
function readNullableString(record, ...keys) {
    for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(record, key)) {
            continue;
        }
        const rawValue = record[key];
        if (rawValue === null) {
            return null;
        }
        if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
            return rawValue.trim();
        }
        return null;
    }
    return undefined;
}
function readNumber(record, ...keys) {
    for (const key of keys) {
        const rawValue = record[key];
        if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
            return rawValue;
        }
        if (typeof rawValue === 'string') {
            const parsed = Number(rawValue);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
    }
    return null;
}
function normalizeAgentStatus(value) {
    if (typeof value !== 'string') {
        return 'unknown';
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === 'working') {
        return 'working';
    }
    if (normalized === 'idle') {
        return 'idle';
    }
    if (normalized === 'blocked') {
        return 'blocked';
    }
    if (normalized === 'error' || normalized === 'failed') {
        return 'error';
    }
    if (normalized === 'paused') {
        return 'paused';
    }
    return 'unknown';
}
function normalizeAgent(raw) {
    if (!isRecord(raw)) {
        return null;
    }
    const id = readString(raw, 'id');
    const name = readString(raw, 'name');
    const role = readString(raw, 'role');
    if (!id || !name || !role) {
        return null;
    }
    return {
        id,
        name,
        role,
        model: readString(raw, 'model') ?? 'unknown-model',
        status: normalizeAgentStatus(raw.status),
    };
}
function normalizeAgentTask(raw) {
    if (!isRecord(raw)) {
        return null;
    }
    const id = readString(raw, 'id');
    const title = readString(raw, 'title');
    if (!id || !title) {
        return null;
    }
    return {
        id,
        title,
        status: readString(raw, 'status') ?? 'todo',
        executorId: readString(raw, 'executorId', 'executor_id'),
    };
}
function normalizeStats(raw) {
    if (!isRecord(raw)) {
        return DEFAULT_STATS;
    }
    const completedToday = Math.max(0, Math.floor(readNumber(raw, 'tasksCompletedToday', 'tasks_completed_today') ?? 0));
    const costToday = Math.max(0, readNumber(raw, 'totalCostToday', 'total_cost_today') ?? 0);
    const rawApprovalRate = readNumber(raw, 'approvalRate', 'approval_rate') ?? 0;
    const normalizedApprovalRate = rawApprovalRate > 1 ? Math.min(1, Math.max(0, rawApprovalRate / 100)) : Math.min(1, Math.max(0, rawApprovalRate));
    return {
        approvalRate: normalizedApprovalRate,
        completedToday,
        costToday,
    };
}
function normalizeHistoryEntry(raw, taskTitleById) {
    if (!isRecord(raw)) {
        return null;
    }
    const id = readString(raw, 'id');
    if (!id) {
        return null;
    }
    const taskId = readString(raw, 'taskId', 'task_id');
    const taskTitle = readString(raw, 'taskTitle', 'task_title') ??
        (taskId ? taskTitleById[taskId] : null) ??
        null;
    const costUsd = Math.max(0, readNumber(raw, 'costUsd', 'cost_usd') ?? 0);
    const durationMsRaw = readNumber(raw, 'durationMs', 'duration_ms');
    const durationMs = durationMsRaw !== null && Number.isFinite(durationMsRaw) && durationMsRaw >= 0
        ? Math.round(durationMsRaw)
        : null;
    return {
        id,
        action: readString(raw, 'action') ?? 'task_completed',
        costUsd,
        createdAt: readString(raw, 'createdAt', 'created_at') ?? new Date().toISOString(),
        durationMs,
        taskId,
        taskTitle,
    };
}
function parseSsePayload(event) {
    if (!(event instanceof MessageEvent) || typeof event.data !== 'string') {
        return null;
    }
    try {
        const parsed = JSON.parse(event.data);
        return isRecord(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}
function formatCurrency(value) {
    return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}
function formatApprovalRate(value) {
    return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
}
function formatTimestamp(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'Unknown time';
    }
    return timestampFormatter.format(parsed);
}
function formatDuration(durationMs) {
    if (durationMs === null) {
        return 'n/a';
    }
    const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
    if (totalSeconds < 60) {
        return `${totalSeconds}s`;
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes < 60) {
        return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
function formatAction(action) {
    return action.replace(/_/g, ' ').trim();
}
function getWeeklyCost(history) {
    const cutoff = Date.now() - WEEK_IN_MS;
    let total = 0;
    for (const entry of history) {
        const timestamp = Date.parse(entry.createdAt);
        if (Number.isNaN(timestamp) || timestamp < cutoff) {
            continue;
        }
        total += entry.costUsd;
    }
    return total;
}
function getErrorMessage(error) {
    if (error instanceof ApiError) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'Unable to complete action.';
}
async function fetchAgentMonitorData() {
    const [rawAgents, rawTasks] = await Promise.all([
        apiRequest('/api/v1/agents?expand=current_task,stats,work_log_recent'),
        apiRequest('/api/v1/tasks?executor_type=agent'),
    ]);
    const agents = rawAgents
        .map((rawAgent) => normalizeAgent(rawAgent))
        .filter((agent) => Boolean(agent));
    const tasks = rawTasks
        .map((rawTask) => normalizeAgentTask(rawTask))
        .filter((task) => Boolean(task));
    const taskTitleById = {};
    const inProgressTaskIdsByAgentId = new Map();
    for (const task of tasks) {
        taskTitleById[task.id] = task.title;
        if (task.status !== 'in_progress' || !task.executorId) {
            continue;
        }
        const existing = inProgressTaskIdsByAgentId.get(task.executorId) ?? [];
        existing.push(task.id);
        inProgressTaskIdsByAgentId.set(task.executorId, existing);
    }
    const enrichedAgents = await Promise.all(agents.map(async (agent) => {
        const [rawStats, rawHistory] = await Promise.all([
            apiRequest(`/api/v1/agents/${agent.id}/stats`).catch(() => null),
            apiRequest(`/api/v1/agents/${agent.id}/work-log`).catch(() => []),
        ]);
        const history = Array.isArray(rawHistory)
            ? rawHistory
                .map((entry) => normalizeHistoryEntry(entry, taskTitleById))
                .filter((entry) => Boolean(entry))
            : [];
        const currentTaskId = (inProgressTaskIdsByAgentId.get(agent.id) ?? [])[0] ?? null;
        const currentTaskTitle = currentTaskId
            ? taskTitleById[currentTaskId] ?? 'Task in progress'
            : null;
        return {
            id: agent.id,
            model: agent.model,
            name: agent.name,
            role: agent.role,
            status: agent.status,
            stats: normalizeStats(rawStats),
            history,
            currentTaskId,
            currentTaskTitle,
        };
    }));
    return {
        agents: enrichedAgents,
        taskTitleById,
    };
}
function AgentMonitorSkeleton() {
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(Skeleton, { className: "h-24 w-full" }), _jsxs("div", { className: "grid gap-4 lg:grid-cols-2", children: [_jsx(Skeleton, { className: "h-[280px] w-full" }), _jsx(Skeleton, { className: "h-[280px] w-full" })] }), _jsx(Skeleton, { className: "h-52 w-full" })] }));
}
export default function AgentMonitor() {
    const queryClient = useQueryClient();
    const [actionError, setActionError] = useState(null);
    const [expandedHistoryByAgentId, setExpandedHistoryByAgentId] = useState({});
    const [liveOverrides, setLiveOverrides] = useState({});
    const { data: monitorData, error, isError, isLoading, isFetching, } = useQuery({
        queryKey: AGENT_MONITOR_QUERY_KEY,
        queryFn: fetchAgentMonitorData,
        refetchInterval: 45_000,
    });
    const runMutation = useMutation({
        mutationFn: async (agentId) => {
            await apiRequest(`/api/v1/agents/${agentId}/run`, {
                method: 'POST',
            });
        },
        onMutate: (agentId) => {
            setActionError(null);
            setLiveOverrides((current) => ({
                ...current,
                [agentId]: {
                    ...current[agentId],
                    status: 'working',
                },
            }));
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: AGENT_MONITOR_QUERY_KEY });
        },
        onError: (mutationError) => {
            setActionError(getErrorMessage(mutationError));
            void queryClient.invalidateQueries({ queryKey: AGENT_MONITOR_QUERY_KEY });
        },
    });
    const pauseMutation = useMutation({
        mutationFn: async ({ agentId, status }) => {
            await apiRequest(`/api/v1/agents/${agentId}`, {
                body: JSON.stringify({ status }),
                method: 'PUT',
            });
        },
        onMutate: ({ agentId, status }) => {
            setActionError(null);
            setLiveOverrides((current) => ({
                ...current,
                [agentId]: {
                    ...current[agentId],
                    status,
                },
            }));
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: AGENT_MONITOR_QUERY_KEY });
        },
        onError: (mutationError) => {
            setActionError(getErrorMessage(mutationError));
            void queryClient.invalidateQueries({ queryKey: AGENT_MONITOR_QUERY_KEY });
        },
    });
    useEffect(() => {
        const source = new EventSource('/api/v1/events/stream?channels=agent', {
            withCredentials: true,
        });
        const handleStatusChanged = (event) => {
            const payload = parseSsePayload(event);
            if (!payload) {
                return;
            }
            const agentId = readString(payload, 'agent_id', 'id');
            if (!agentId) {
                return;
            }
            const nextStatus = normalizeAgentStatus(payload.new_status ?? payload.status);
            const currentTaskId = readNullableString(payload, 'current_task', 'currentTask');
            setLiveOverrides((current) => ({
                ...current,
                [agentId]: {
                    ...current[agentId],
                    status: nextStatus,
                    ...(currentTaskId !== undefined ? { currentTaskId } : {}),
                },
            }));
            void queryClient.invalidateQueries({ queryKey: AGENT_MONITOR_QUERY_KEY });
        };
        const handleAgentRefresh = () => {
            void queryClient.invalidateQueries({ queryKey: AGENT_MONITOR_QUERY_KEY });
        };
        source.addEventListener('agent.status_changed', handleStatusChanged);
        source.addEventListener('agent.work_completed', handleAgentRefresh);
        source.addEventListener('agent.cost_updated', handleAgentRefresh);
        return () => {
            source.removeEventListener('agent.status_changed', handleStatusChanged);
            source.removeEventListener('agent.work_completed', handleAgentRefresh);
            source.removeEventListener('agent.cost_updated', handleAgentRefresh);
            source.close();
        };
    }, [queryClient]);
    useEffect(() => {
        if (!monitorData) {
            return;
        }
        const agentIds = new Set(monitorData.agents.map((agent) => agent.id));
        setLiveOverrides((current) => {
            const next = Object.entries(current).filter(([agentId]) => agentIds.has(agentId));
            if (next.length === Object.keys(current).length) {
                return current;
            }
            return Object.fromEntries(next);
        });
    }, [monitorData]);
    const agents = useMemo(() => {
        if (!monitorData) {
            return [];
        }
        return monitorData.agents
            .map((agent) => {
            const override = liveOverrides[agent.id];
            const status = override?.status ?? agent.status;
            const nextTaskId = override && Object.prototype.hasOwnProperty.call(override, 'currentTaskId')
                ? (override.currentTaskId ?? null)
                : agent.currentTaskId;
            const nextTaskTitle = nextTaskId
                ? monitorData.taskTitleById[nextTaskId] ?? agent.currentTaskTitle ?? 'Task in progress'
                : null;
            return {
                ...agent,
                status,
                currentTaskId: nextTaskId,
                currentTaskTitle: nextTaskTitle,
            };
        })
            .sort((left, right) => {
            const leftOrder = statusMeta[left.status].order;
            const rightOrder = statusMeta[right.status].order;
            if (leftOrder !== rightOrder) {
                return leftOrder - rightOrder;
            }
            return left.name.localeCompare(right.name);
        });
    }, [monitorData, liveOverrides]);
    const summary = useMemo(() => {
        const totalAgents = agents.length;
        const activeCount = agents.filter((agent) => agent.status === 'working').length;
        const idleCount = agents.filter((agent) => agent.status === 'idle').length;
        const todayCost = agents.reduce((total, agent) => total + agent.stats.costToday, 0);
        return {
            activeCount,
            idleCount,
            todayCost,
            totalAgents,
        };
    }, [agents]);
    const costRows = useMemo(() => {
        const rows = agents.map((agent) => ({
            id: agent.id,
            name: agent.name,
            weeklyCost: getWeeklyCost(agent.history),
        }));
        const maxWeeklyCost = rows.reduce((max, row) => Math.max(max, row.weeklyCost), 0);
        return {
            maxWeeklyCost,
            rows: rows.sort((left, right) => right.weeklyCost - left.weeklyCost),
            weeklyTotal: rows.reduce((total, row) => total + row.weeklyCost, 0),
        };
    }, [agents]);
    const runLoadingAgentId = runMutation.isPending ? runMutation.variables : null;
    const pauseLoadingAgentId = pauseMutation.isPending ? pauseMutation.variables?.agentId ?? null : null;
    const toggleHistory = (agentId) => {
        setExpandedHistoryByAgentId((current) => ({
            ...current,
            [agentId]: !current[agentId],
        }));
    };
    if (isLoading) {
        return _jsx(AgentMonitorSkeleton, {});
    }
    if (isError) {
        return (_jsx(Card, { variant: "raised", children: _jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Agent Monitor" }), _jsx(CardDescription, { children: getErrorMessage(error) })] }) }));
    }
    if (!agents.length) {
        return (_jsx(EmptyState, { title: "No agents yet", description: "Create agents to start running autonomous work." }));
    }
    return (_jsxs("div", { className: "space-y-5", children: [_jsxs("header", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h1", { className: "font-display text-2xl font-semibold text-text-primary", children: "Agent Monitor" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Live status, work history, and cost tracking for your AI team." })] }), isFetching ? _jsx("span", { className: "text-xs text-text-tertiary", children: "Refreshing..." }) : null] }), actionError ? (_jsxs("div", { className: "flex items-center gap-2 rounded-md border border-error/60 bg-error-subtle/20 px-3 py-2 text-sm text-error", children: [_jsx(AlertTriangle, { className: "h-4 w-4 shrink-0" }), _jsx("span", { children: actionError })] })) : null, _jsx(Card, { variant: "raised", className: "border-primary-300/50", children: _jsxs(CardContent, { className: "grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-text-tertiary", children: "Total Agents" }), _jsx("p", { className: "mt-1 text-2xl font-semibold text-text-primary", children: summary.totalAgents })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-text-tertiary", children: "Active" }), _jsx("p", { className: "mt-1 text-2xl font-semibold text-success", children: summary.activeCount })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-text-tertiary", children: "Idle" }), _jsx("p", { className: "mt-1 text-2xl font-semibold text-text-primary", children: summary.idleCount })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-text-tertiary", children: "Today's Cost" }), _jsx("p", { className: "mt-1 text-2xl font-semibold text-text-primary", children: formatCurrency(summary.todayCost) })] })] }) }), _jsx("section", { className: "grid gap-4 lg:grid-cols-2", children: agents.map((agent) => {
                    const isHistoryExpanded = Boolean(expandedHistoryByAgentId[agent.id]);
                    const status = statusMeta[agent.status];
                    const pauseLabel = agent.status === 'paused' ? 'Resume' : 'Pause';
                    const nextPauseStatus = agent.status === 'paused' ? 'idle' : 'paused';
                    const isRunDisabled = agent.status === 'paused';
                    const showCurrentTask = agent.status === 'working';
                    return (_jsxs(Card, { variant: "raised", className: "overflow-hidden", children: [_jsx(CardHeader, { className: "mb-3", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex min-w-0 items-start gap-3", children: [_jsxs("div", { className: "relative", children: [_jsx(Avatar, { name: agent.name, size: "md" }), _jsx("span", { className: cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg-raised', status.dotClassName) })] }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-base font-semibold text-text-primary", children: agent.name }), _jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-2", children: [_jsx(Badge, { size: "sm", variant: "info", children: agent.role }), _jsx("span", { className: "rounded-full border border-border px-2 py-0.5 text-xs text-text-secondary", children: agent.model })] })] })] }), _jsx(Badge, { variant: status.badgeVariant, children: status.label })] }) }), _jsxs(CardContent, { className: "space-y-3", children: [showCurrentTask ? (_jsxs("div", { className: "rounded-md border border-border bg-bg-overlay px-3 py-2", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-text-tertiary", children: "Current Task" }), _jsx("p", { className: "mt-1 text-sm font-medium text-text-primary", children: agent.currentTaskTitle ?? 'Picking up next task...' })] })) : null, _jsxs("p", { className: "text-sm text-text-secondary", children: [agent.stats.completedToday, " completed | ", formatApprovalRate(agent.stats.approvalRate), " approval |", ' ', formatCurrency(agent.stats.costToday)] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs(Button, { size: "sm", onClick: () => runMutation.mutate(agent.id), loading: runLoadingAgentId === agent.id, disabled: isRunDisabled, children: [_jsx(Play, { className: "h-3.5 w-3.5" }), "Run Next Task"] }), _jsxs(Button, { size: "sm", variant: "outline", onClick: () => pauseMutation.mutate({ agentId: agent.id, status: nextPauseStatus }), loading: pauseLoadingAgentId === agent.id, children: [_jsx(Pause, { className: "h-3.5 w-3.5" }), pauseLabel] }), _jsxs(Button, { size: "sm", variant: "ghost", onClick: () => toggleHistory(agent.id), children: [_jsx(Clock3, { className: "h-3.5 w-3.5" }), "History", isHistoryExpanded ? _jsx(ChevronUp, { className: "h-3.5 w-3.5" }) : _jsx(ChevronDown, { className: "h-3.5 w-3.5" })] })] }), isHistoryExpanded ? (_jsx("div", { className: "border-t border-border pt-3", children: agent.history.length ? (_jsx("ol", { className: "space-y-3", children: agent.history.map((entry) => {
                                                const isFailure = /failed|error/i.test(entry.action);
                                                return (_jsxs("li", { className: "relative pl-5", children: [_jsx("span", { className: cn('absolute left-0 top-2 h-2 w-2 rounded-full', isFailure ? 'bg-error' : 'bg-success') }), _jsx("p", { className: "text-xs text-text-tertiary", children: formatTimestamp(entry.createdAt) }), _jsx("p", { className: "text-sm text-text-primary", children: entry.taskTitle ?? 'Task' }), _jsxs("p", { className: "text-xs text-text-secondary", children: [formatAction(entry.action), " | ", formatDuration(entry.durationMs), " | ", formatCurrency(entry.costUsd)] })] }, entry.id));
                                            }) })) : (_jsx("p", { className: "text-sm text-text-tertiary", children: "No work history yet." })) })) : null] })] }, agent.id));
                }) }), _jsxs(Card, { variant: "raised", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Cost Tracking" }), _jsx(CardDescription, { children: "Per-agent cost over the last 7 days." })] }), _jsxs(CardContent, { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between rounded-md bg-bg-overlay px-3 py-2", children: [_jsx("span", { className: "text-sm text-text-secondary", children: "Weekly total" }), _jsx("span", { className: "text-sm font-semibold text-text-primary", children: formatCurrency(costRows.weeklyTotal) })] }), _jsx("div", { className: "space-y-3", children: costRows.rows.map((row) => {
                                    const width = costRows.maxWeeklyCost > 0
                                        ? Math.max(6, (row.weeklyCost / costRows.maxWeeklyCost) * 100)
                                        : 0;
                                    return (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-text-secondary", children: [_jsx("span", { children: row.name }), _jsx("span", { children: formatCurrency(row.weeklyCost) })] }), _jsx("div", { className: "h-2 w-full rounded-full bg-bg-overlay", children: _jsx("div", { className: "h-2 rounded-full bg-primary-400 transition-all duration-fast ease-out", style: { width: `${width}%` } }) })] }, row.id));
                                }) })] })] })] }));
}
//# sourceMappingURL=AgentMonitor.js.map