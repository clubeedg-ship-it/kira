import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, UserRound } from 'lucide-react';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui';
import { useTaskQueryParam } from '../../hooks/useTaskQueryParam';
import { cn } from '../../lib/cn';
const TODAY_QUERY_KEY = 'operations-today';
const PIXELS_PER_MINUTE = 1;
const PRIORITY_META = {
    0: { label: 'Critical', variant: 'danger' },
    1: { label: 'High', variant: 'warning' },
    2: { label: 'Medium', variant: 'info' },
    3: { label: 'Low', variant: 'default' }
};
const TIME_BLOCK_CLASSES = {
    work: 'border-l-area-1 bg-area-1/10',
    deep_work: 'border-l-area-6 bg-area-6/10',
    meeting: 'border-l-area-2 bg-area-2/10',
    admin: 'border-l-area-4 bg-area-4/10',
    fitness: 'border-l-area-3 bg-area-3/10'
};
function toDateKey(value) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function shiftDate(dateKey, offsetDays) {
    const parsed = new Date(`${dateKey}T00:00:00`);
    parsed.setDate(parsed.getDate() + offsetDays);
    return toDateKey(parsed);
}
function normalizeDateKey(value) {
    if (!value) {
        return null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return toDateKey(parsed);
}
function parseTimeToMinutes(value) {
    if (!value) {
        return null;
    }
    const [hoursPart, minutesPart] = value.split(':');
    const hours = Number(hoursPart);
    const minutes = Number(minutesPart);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return null;
    }
    return hours * 60 + minutes;
}
function formatMinutesAsTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
function formatBlockTime(startTime, endTime) {
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    if (startMinutes === null && endMinutes === null) {
        return 'No fixed time';
    }
    if (startMinutes !== null && endMinutes !== null) {
        return `${formatMinutesAsTime(startMinutes)} - ${formatMinutesAsTime(endMinutes)}`;
    }
    if (startMinutes !== null) {
        return `Starts ${formatMinutesAsTime(startMinutes)}`;
    }
    return `Ends ${formatMinutesAsTime(endMinutes ?? 0)}`;
}
function formatDuration(durationMinutes) {
    if (!durationMinutes || durationMinutes < 1) {
        return 'No estimate';
    }
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    if (hours && minutes) {
        return `${hours}h ${minutes}m`;
    }
    if (hours) {
        return `${hours}h`;
    }
    return `${minutes}m`;
}
function isDoneStatus(status) {
    return status.toLowerCase() === 'done';
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function readString(record, ...keys) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.length > 0) {
            return value;
        }
    }
    return null;
}
function readNumber(record, ...keys) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
    }
    return null;
}
function normalizeTask(rawTask, defaultTimeBlockId) {
    if (!isRecord(rawTask)) {
        return null;
    }
    const id = readString(rawTask, 'id');
    const title = readString(rawTask, 'title');
    if (!id || !title) {
        return null;
    }
    const projectRecord = isRecord(rawTask.project) ? rawTask.project : null;
    const milestoneRecord = isRecord(rawTask.milestone) ? rawTask.milestone : null;
    return {
        id,
        title,
        status: readString(rawTask, 'status') ?? 'todo',
        priority: Math.max(0, Math.min(3, readNumber(rawTask, 'priority') ?? 2)),
        executorType: readString(rawTask, 'executorType', 'executor_type') ?? 'human',
        durationEst: readNumber(rawTask, 'durationEst', 'duration_est'),
        dueDate: normalizeDateKey(readString(rawTask, 'dueDate', 'due_date')),
        scheduledDate: normalizeDateKey(readString(rawTask, 'scheduledDate', 'scheduled_date')),
        timeBlockId: readString(rawTask, 'timeBlockId', 'time_block_id') ?? defaultTimeBlockId ?? null,
        projectTitle: readString(rawTask, 'projectTitle', 'project_title') ?? (projectRecord ? readString(projectRecord, 'title') : null),
        milestoneTitle: readString(rawTask, 'milestoneTitle', 'milestone_title') ??
            (milestoneRecord ? readString(milestoneRecord, 'title') : null),
        completedAt: readString(rawTask, 'completedAt', 'completed_at'),
        updatedAt: readString(rawTask, 'updatedAt', 'updated_at'),
        sortOrder: readNumber(rawTask, 'sortOrder', 'sort_order') ?? 0
    };
}
function normalizeTimeBlock(rawBlock) {
    if (!isRecord(rawBlock)) {
        return null;
    }
    const id = readString(rawBlock, 'id');
    const title = readString(rawBlock, 'title');
    if (!id || !title) {
        return null;
    }
    const nestedTasks = Array.isArray(rawBlock.tasks) ? rawBlock.tasks.map((task) => normalizeTask(task, id)).filter(Boolean) : [];
    return {
        id,
        title,
        blockType: (readString(rawBlock, 'blockType', 'block_type') ?? 'work').toLowerCase(),
        startTime: readString(rawBlock, 'startTime', 'start_time'),
        endTime: readString(rawBlock, 'endTime', 'end_time'),
        tasks: nestedTasks
    };
}
function sortTasks(tasks) {
    return [...tasks].sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
            return left.sortOrder - right.sortOrder;
        }
        if (left.priority !== right.priority) {
            return left.priority - right.priority;
        }
        return left.title.localeCompare(right.title);
    });
}
function attachTasksToBlocks(blocks, tasks) {
    const blockTasks = new Map();
    for (const task of tasks) {
        if (!task.timeBlockId) {
            continue;
        }
        const existing = blockTasks.get(task.timeBlockId) ?? [];
        existing.push(task);
        blockTasks.set(task.timeBlockId, existing);
    }
    return blocks
        .map((block) => ({
        ...block,
        tasks: sortTasks(blockTasks.get(block.id) ?? block.tasks)
    }))
        .sort((left, right) => {
        const leftStart = parseTimeToMinutes(left.startTime) ?? Number.MAX_SAFE_INTEGER;
        const rightStart = parseTimeToMinutes(right.startTime) ?? Number.MAX_SAFE_INTEGER;
        if (leftStart !== rightStart) {
            return leftStart - rightStart;
        }
        return left.title.localeCompare(right.title);
    });
}
function normalizeTodayViewResponse(payload, todayKey) {
    const envelope = isRecord(payload) ? payload : {};
    const data = isRecord(envelope.data) ? envelope.data : envelope;
    const rawTasks = Array.isArray(data.tasks) ? data.tasks : [];
    const rawTimeBlocks = Array.isArray(data.timeBlocks)
        ? data.timeBlocks
        : Array.isArray(data.time_blocks)
            ? data.time_blocks
            : [];
    const normalizedBlocks = rawTimeBlocks.map(normalizeTimeBlock).filter(Boolean);
    const normalizedTasks = rawTasks.map((task) => normalizeTask(task)).filter(Boolean);
    for (const block of normalizedBlocks) {
        for (const task of block.tasks) {
            if (!normalizedTasks.some((existing) => existing.id === task.id)) {
                normalizedTasks.push(task);
            }
        }
    }
    if (!normalizedTasks.length && !normalizedBlocks.length) {
        return buildFallbackTodayPayload(todayKey);
    }
    return {
        date: normalizeDateKey(readString(data, 'date')) ?? todayKey,
        tasks: sortTasks(normalizedTasks),
        timeBlocks: attachTasksToBlocks(normalizedBlocks, normalizedTasks)
    };
}
function buildFallbackTodayPayload(todayKey) {
    const yesterday = shiftDate(todayKey, -1);
    const completedAt = new Date().toISOString();
    const timeBlocks = [
        {
            id: '00000000-0000-4000-a000-000000000001',
            title: 'Sales Sprint',
            blockType: 'work',
            startTime: '09:00:00',
            endTime: '11:00:00',
            tasks: []
        },
        {
            id: '00000000-0000-4000-a000-000000000002',
            title: 'Build Window',
            blockType: 'deep_work',
            startTime: '11:30:00',
            endTime: '13:00:00',
            tasks: []
        },
        {
            id: '00000000-0000-4000-a000-000000000003',
            title: 'Admin Follow-up',
            blockType: 'admin',
            startTime: '14:00:00',
            endTime: '15:00:00',
            tasks: []
        }
    ];
    const tasks = [
        {
            id: '00000000-0000-4000-b000-000000000001',
            title: 'Review overdue proposal edits',
            status: 'todo',
            priority: 0,
            executorType: 'human',
            durationEst: 25,
            dueDate: yesterday,
            scheduledDate: todayKey,
            timeBlockId: '00000000-0000-4000-a000-000000000001',
            projectTitle: 'Outbound Sales Engine',
            milestoneTitle: 'Launch first outbound campaign',
            completedAt: null,
            updatedAt: null,
            sortOrder: 1
        },
        {
            id: '00000000-0000-4000-b000-000000000002',
            title: 'Call 10 warm leads',
            status: 'in_progress',
            priority: 1,
            executorType: 'human',
            durationEst: 60,
            dueDate: todayKey,
            scheduledDate: todayKey,
            timeBlockId: '00000000-0000-4000-a000-000000000001',
            projectTitle: 'Outbound Sales Engine',
            milestoneTitle: 'Launch first outbound campaign',
            completedAt: null,
            updatedAt: null,
            sortOrder: 2
        },
        {
            id: '00000000-0000-4000-b000-000000000003',
            title: 'Implement onboarding data model',
            status: 'todo',
            priority: 1,
            executorType: 'agent',
            durationEst: 90,
            dueDate: todayKey,
            scheduledDate: todayKey,
            timeBlockId: '00000000-0000-4000-a000-000000000002',
            projectTitle: 'Client Onboarding Automation',
            milestoneTitle: 'Ship onboarding portal MVP',
            completedAt: null,
            updatedAt: null,
            sortOrder: 3
        },
        {
            id: '00000000-0000-4000-b000-000000000004',
            title: 'Send nutrition grocery order',
            status: 'todo',
            priority: 2,
            executorType: 'human',
            durationEst: 20,
            dueDate: todayKey,
            scheduledDate: null,
            timeBlockId: null,
            projectTitle: 'Nutrition & Recovery System',
            milestoneTitle: 'Stabilize daily protein target',
            completedAt: null,
            updatedAt: null,
            sortOrder: 4
        },
        {
            id: '00000000-0000-4000-b000-000000000005',
            title: 'Summarize training recap adjustments',
            status: 'done',
            priority: 2,
            executorType: 'agent',
            durationEst: 15,
            dueDate: todayKey,
            scheduledDate: todayKey,
            timeBlockId: '00000000-0000-4000-a000-000000000003',
            projectTitle: 'Half Marathon Training Plan',
            milestoneTitle: null,
            completedAt,
            updatedAt: completedAt,
            sortOrder: 5
        }
    ];
    return {
        date: todayKey,
        tasks,
        timeBlocks: attachTasksToBlocks(timeBlocks, tasks)
    };
}
async function fetchTodayView(todayKey) {
    try {
        const response = await fetch(`/api/v1/views/today?date=${todayKey}`, {
            credentials: 'include',
            headers: {
                Accept: 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`Unable to load today view (${response.status})`);
        }
        const payload = await response.json();
        return normalizeTodayViewResponse(payload, todayKey);
    }
    catch {
        return buildFallbackTodayPayload(todayKey);
    }
}
async function patchTaskStatus(taskId, status) {
    const endpoints = [`/api/v1/tasks/${taskId}/status`, `/api/v1/tasks/${taskId}`];
    let lastError = null;
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify({ status })
            });
            if (response.ok) {
                return;
            }
            if (response.status === 404 || response.status === 405) {
                continue;
            }
            throw new Error(`Task update failed with status ${response.status}`);
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error('Task update failed');
        }
    }
    if (lastError) {
        throw lastError;
    }
}
function applyTaskOverrides(tasks, overrides) {
    return tasks.map((task) => {
        const override = overrides[task.id];
        if (!override) {
            return task;
        }
        return {
            ...task,
            status: override.status,
            completedAt: override.completedAt,
            updatedAt: override.completedAt ?? task.updatedAt
        };
    });
}
function getTaskCompletionDate(task) {
    if (!isDoneStatus(task.status)) {
        return null;
    }
    return normalizeDateKey(task.completedAt) ?? normalizeDateKey(task.updatedAt);
}
function getTimelineBounds(timeBlocks) {
    if (!timeBlocks.length) {
        return { start: 8 * 60, end: 18 * 60 };
    }
    const starts = timeBlocks.map((block) => parseTimeToMinutes(block.startTime)).filter((value) => value !== null);
    const ends = timeBlocks.map((block) => parseTimeToMinutes(block.endTime)).filter((value) => value !== null);
    if (!starts.length || !ends.length) {
        return { start: 8 * 60, end: 18 * 60 };
    }
    const start = Math.max(0, Math.min(...starts) - 30);
    const end = Math.min(24 * 60, Math.max(...ends) + 30);
    return {
        start,
        end: Math.max(end, start + 120)
    };
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function getExecutorLabel(executorType) {
    const normalizedType = executorType.toLowerCase();
    if (normalizedType === 'agent') {
        return { label: 'Agent', icon: _jsx(Bot, { className: "h-3.5 w-3.5" }) };
    }
    if (normalizedType === 'human') {
        return { label: 'You', icon: _jsx(UserRound, { className: "h-3.5 w-3.5" }) };
    }
    return { label: 'Mixed', icon: _jsx(CircleHelp, { className: "h-3.5 w-3.5" }) };
}
function TaskRow({ task, onToggle, onOpenTask, overdue = false }) {
    const done = isDoneStatus(task.status);
    const priorityMeta = PRIORITY_META[task.priority] ?? PRIORITY_META[2];
    const executor = getExecutorLabel(task.executorType);
    const breadcrumb = [task.projectTitle, task.milestoneTitle].filter(Boolean).join(' / ') || 'No project context';
    return (_jsx("div", { className: cn('rounded-md border px-3 py-3 transition-colors', overdue ? 'border-error/60 bg-error/10' : 'border-border bg-bg-raised', done ? 'opacity-75' : ''), children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("button", { type: "button", onClick: () => onToggle(task), className: cn('mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors', done ? 'border-success bg-success text-success-subtle' : 'border-border-strong bg-bg-surface hover:border-primary-400'), "aria-label": done ? `Mark ${task.title} as not done` : `Mark ${task.title} done`, children: done ? _jsx(Check, { className: "h-3 w-3" }) : null }), _jsxs("div", { className: "min-w-0 flex-1 space-y-2", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => onOpenTask(task.id), className: cn('text-left text-sm font-semibold text-text-primary hover:text-primary-300', done ? 'line-through text-text-secondary hover:text-text-secondary' : ''), children: task.title }), _jsx(Badge, { variant: priorityMeta.variant, size: "sm", children: priorityMeta.label })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary", children: [_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-bg-overlay px-2 py-0.5", children: [executor.icon, _jsx("span", { children: executor.label })] }), _jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-bg-overlay px-2 py-0.5", children: [_jsx(Clock3, { className: "h-3.5 w-3.5" }), _jsx("span", { children: formatDuration(task.durationEst) })] }), _jsx("span", { className: "truncate", children: breadcrumb })] })] })] }) }));
}
function TimelineTaskGroup({ block, top, height, onToggleTask, onOpenTask }) {
    const blockClass = TIME_BLOCK_CLASSES[block.blockType] ?? 'border-l-area-8 bg-area-8/10';
    return (_jsxs("article", { className: cn('absolute left-20 right-0 rounded-lg border border-border border-l-4 p-3', blockClass), style: { top, minHeight: Math.max(88, height) }, children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-2", children: [_jsx("p", { className: "text-sm font-semibold text-text-primary", children: block.title }), _jsx("span", { className: "text-xs font-medium text-text-secondary", children: formatBlockTime(block.startTime, block.endTime) })] }), block.tasks.length ? (_jsx("div", { className: "space-y-2", children: block.tasks.map((task) => (_jsx(TaskRow, { task: task, onToggle: onToggleTask, onOpenTask: onOpenTask }, task.id))) })) : (_jsx("p", { className: "text-xs text-text-secondary", children: "No tasks in this block." }))] }));
}
export default function TodayView() {
    const todayKey = useMemo(() => toDateKey(new Date()), []);
    const queryClient = useQueryClient();
    const { openTask } = useTaskQueryParam();
    const [taskOverrides, setTaskOverrides] = useState({});
    const [showCompleted, setShowCompleted] = useState(false);
    const [now, setNow] = useState(() => new Date());
    const todayQuery = useQuery({
        queryKey: [TODAY_QUERY_KEY, todayKey],
        queryFn: () => fetchTodayView(todayKey)
    });
    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setNow(new Date());
        }, 60000);
        return () => {
            window.clearInterval(intervalId);
        };
    }, []);
    useEffect(() => {
        const eventSource = new EventSource('/api/v1/events/stream', { withCredentials: true });
        const refetchToday = () => {
            void queryClient.invalidateQueries({ queryKey: [TODAY_QUERY_KEY, todayKey] });
        };
        const onTaskStatusChanged = () => {
            refetchToday();
        };
        eventSource.addEventListener('task.status_changed', onTaskStatusChanged);
        eventSource.addEventListener('TASK_STATUS_CHANGED', onTaskStatusChanged);
        eventSource.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                const eventType = typeof payload.event === 'string' ? payload.event : null;
                if (eventType === 'task.status_changed' || eventType === 'TASK_STATUS_CHANGED') {
                    refetchToday();
                }
            }
            catch {
                // Ignore non-JSON keepalive messages.
            }
        };
        return () => {
            eventSource.close();
        };
    }, [queryClient, todayKey]);
    const statusMutation = useMutation({
        mutationFn: ({ taskId, status }) => patchTaskStatus(taskId, status),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [TODAY_QUERY_KEY, todayKey] });
        }
    });
    const tasks = useMemo(() => {
        const payloadTasks = todayQuery.data?.tasks ?? [];
        return applyTaskOverrides(payloadTasks, taskOverrides);
    }, [todayQuery.data?.tasks, taskOverrides]);
    const timeBlocks = useMemo(() => {
        const payloadBlocks = todayQuery.data?.timeBlocks ?? [];
        return attachTasksToBlocks(payloadBlocks, tasks);
    }, [todayQuery.data?.timeBlocks, tasks]);
    const timeBlockById = useMemo(() => {
        return new Map(timeBlocks.map((block) => [block.id, block]));
    }, [timeBlocks]);
    const pendingTasks = useMemo(() => {
        return tasks.filter((task) => !isDoneStatus(task.status) && task.status.toLowerCase() !== 'cancelled');
    }, [tasks]);
    const overdueTasks = useMemo(() => {
        return sortTasks(pendingTasks.filter((task) => {
            const dueDate = normalizeDateKey(task.dueDate);
            return Boolean(dueDate && dueDate < todayKey);
        }));
    }, [pendingTasks, todayKey]);
    const scheduledTodayTasks = useMemo(() => {
        return sortTasks(pendingTasks.filter((task) => normalizeDateKey(task.scheduledDate) === todayKey));
    }, [pendingTasks, todayKey]);
    const scheduledBySlot = useMemo(() => {
        const groups = new Map();
        for (const task of scheduledTodayTasks) {
            const block = task.timeBlockId ? timeBlockById.get(task.timeBlockId) : null;
            const slotLabel = block ? formatBlockTime(block.startTime, block.endTime) : 'No assigned slot';
            const slotOrder = block ? parseTimeToMinutes(block.startTime) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
            const existing = groups.get(slotLabel) ?? { order: slotOrder, tasks: [] };
            existing.tasks.push(task);
            existing.order = Math.min(existing.order, slotOrder);
            groups.set(slotLabel, existing);
        }
        return [...groups.entries()]
            .map(([slotLabel, value]) => ({ slotLabel, order: value.order, tasks: sortTasks(value.tasks) }))
            .sort((left, right) => {
            if (left.order !== right.order) {
                return left.order - right.order;
            }
            return left.slotLabel.localeCompare(right.slotLabel);
        });
    }, [scheduledTodayTasks, timeBlockById]);
    const unscheduledTasks = useMemo(() => {
        return sortTasks(pendingTasks.filter((task) => normalizeDateKey(task.dueDate) === todayKey && !task.timeBlockId));
    }, [pendingTasks, todayKey]);
    const completedTodayTasks = useMemo(() => {
        return sortTasks(tasks.filter((task) => getTaskCompletionDate(task) === todayKey));
    }, [tasks, todayKey]);
    const timelineBounds = useMemo(() => getTimelineBounds(timeBlocks), [timeBlocks]);
    const timelineHeight = useMemo(() => {
        const duration = timelineBounds.end - timelineBounds.start;
        return Math.max(480, duration * PIXELS_PER_MINUTE);
    }, [timelineBounds]);
    const hourMarkers = useMemo(() => {
        const markers = [];
        const startHour = Math.floor(timelineBounds.start / 60);
        const endHour = Math.ceil(timelineBounds.end / 60);
        for (let hour = startHour; hour <= endHour; hour += 1) {
            const minutes = hour * 60;
            const top = (minutes - timelineBounds.start) * PIXELS_PER_MINUTE;
            if (top >= 0 && top <= timelineHeight) {
                markers.push({ label: `${String(hour).padStart(2, '0')}:00`, top });
            }
        }
        return markers;
    }, [timelineBounds, timelineHeight]);
    const nowLineTop = useMemo(() => {
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        return clamp((nowMinutes - timelineBounds.start) * PIXELS_PER_MINUTE, 0, timelineHeight);
    }, [now, timelineBounds, timelineHeight]);
    const handleToggleTask = (task) => {
        const nextStatus = isDoneStatus(task.status) ? 'todo' : 'done';
        const completedAt = nextStatus === 'done' ? new Date().toISOString() : null;
        setTaskOverrides((current) => ({
            ...current,
            [task.id]: {
                status: nextStatus,
                completedAt
            }
        }));
        statusMutation.mutate({ taskId: task.id, status: nextStatus });
    };
    const isLoading = todayQuery.isLoading && !todayQuery.data;
    const todayDateLabel = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    }).format(new Date(`${todayKey}T00:00:00`));
    return (_jsxs("div", { className: "mx-auto w-full max-w-[800px] space-y-4 pb-6", children: [_jsx(Card, { children: _jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Today" }), _jsx(CardDescription, { children: todayDateLabel })] }) }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-sm tracking-[0.16em] text-error", children: "OVERDUE" }), _jsx(CardDescription, { children: "Due before today and not marked done." })] }), _jsxs(CardContent, { children: [isLoading ? _jsx("p", { className: "text-sm text-text-secondary", children: "Loading tasks..." }) : null, !isLoading && !overdueTasks.length ? _jsx("p", { className: "text-sm text-text-secondary", children: "No overdue tasks." }) : null, overdueTasks.length ? (_jsx("div", { className: "space-y-2", children: overdueTasks.map((task) => (_jsx(TaskRow, { task: task, overdue: true, onToggle: handleToggleTask, onOpenTask: openTask }, task.id))) })) : null] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-sm tracking-[0.16em]", children: "TIME BLOCK TIMELINE" }), _jsx(CardDescription, { children: "Vertical timeline grouped by time block type." })] }), _jsx(CardContent, { children: _jsx("div", { className: "relative rounded-lg border border-border bg-bg-surface p-3", children: _jsxs("div", { className: "relative", style: { height: `${timelineHeight}px` }, children: [hourMarkers.map((marker) => (_jsx("div", { className: "absolute left-0 right-0", style: { top: marker.top }, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-14 text-[11px] font-mono text-text-tertiary", children: marker.label }), _jsx("div", { className: "h-px flex-1 bg-border-subtle" })] }) }, marker.label))), _jsx("div", { className: "absolute left-20 right-0 z-20", style: { top: nowLineTop }, "data-testid": "today-now-line", children: _jsx("div", { className: "relative h-px bg-error", children: _jsx("span", { className: "absolute -top-3 right-0 rounded bg-error px-2 py-0.5 text-[10px] font-semibold text-white", children: formatMinutesAsTime(now.getHours() * 60 + now.getMinutes()) }) }) }), timeBlocks.length ? (timeBlocks.map((block) => {
                                        const start = parseTimeToMinutes(block.startTime) ?? timelineBounds.start;
                                        const end = parseTimeToMinutes(block.endTime) ?? start + 60;
                                        const duration = Math.max(45, end - start);
                                        const top = (start - timelineBounds.start) * PIXELS_PER_MINUTE;
                                        const height = duration * PIXELS_PER_MINUTE;
                                        return (_jsx(TimelineTaskGroup, { block: block, top: top, height: height, onToggleTask: handleToggleTask, onOpenTask: openTask }, block.id));
                                    })) : (_jsx("p", { className: "absolute left-20 top-3 text-sm text-text-secondary", children: "No time blocks for today." }))] }) }) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-sm tracking-[0.16em]", children: "SCHEDULED" }), _jsx(CardDescription, { children: "Tasks scheduled for today, grouped by slot." })] }), _jsxs(CardContent, { children: [!scheduledBySlot.length ? _jsx("p", { className: "text-sm text-text-secondary", children: "No scheduled tasks for today." }) : null, scheduledBySlot.length ? (_jsx("div", { className: "space-y-3", children: scheduledBySlot.map((group) => (_jsxs("div", { className: "space-y-2 rounded-lg border border-border p-3", children: [_jsx("p", { className: "text-xs font-semibold tracking-[0.08em] text-text-secondary", children: group.slotLabel }), _jsx("div", { className: "space-y-2", children: group.tasks.map((task) => (_jsx(TaskRow, { task: task, onToggle: handleToggleTask, onOpenTask: openTask }, task.id))) })] }, group.slotLabel))) })) : null] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-sm tracking-[0.16em]", children: "UNSCHEDULED" }), _jsx(CardDescription, { children: "Due today with no assigned time block." })] }), _jsxs(CardContent, { children: [!unscheduledTasks.length ? _jsx("p", { className: "text-sm text-text-secondary", children: "No unscheduled tasks due today." }) : null, unscheduledTasks.length ? (_jsx("div", { className: "space-y-2", children: unscheduledTasks.map((task) => (_jsx(TaskRow, { task: task, onToggle: handleToggleTask, onOpenTask: openTask }, task.id))) })) : null] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { className: "mb-0 flex flex-row items-center justify-between space-y-0", children: [_jsxs("div", { className: "space-y-1", children: [_jsx(CardTitle, { className: "text-sm tracking-[0.16em]", children: "COMPLETED TODAY" }), _jsx(CardDescription, { children: "Completed tasks stay collapsed by default." })] }), _jsxs("button", { type: "button", className: "inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary", onClick: () => setShowCompleted((current) => !current), children: [showCompleted ? _jsx(ChevronDown, { className: "h-4 w-4" }) : _jsx(ChevronRight, { className: "h-4 w-4" }), _jsx("span", { children: showCompleted ? 'Collapse' : 'Expand' }), _jsxs("span", { children: ["(", completedTodayTasks.length, ")"] })] })] }), showCompleted ? (_jsxs(CardContent, { children: [!completedTodayTasks.length ? _jsx("p", { className: "text-sm text-text-secondary", children: "No completed tasks yet." }) : null, completedTodayTasks.length ? (_jsx("div", { className: "space-y-2", children: completedTodayTasks.map((task) => (_jsx(TaskRow, { task: task, onToggle: handleToggleTask, onOpenTask: openTask }, task.id))) })) : null] })) : null] })] }));
}
//# sourceMappingURL=TodayView.js.map