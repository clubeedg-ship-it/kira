import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiRequest } from '../lib/api';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Drawer } from './ui/Drawer';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Skeleton } from './ui/Skeleton';
const statusTransitions = {
    todo: ['in_progress'],
    in_progress: ['waiting', 'review'],
    waiting: ['in_progress', 'review'],
    review: ['done', 'cancelled'],
    done: [],
    cancelled: [],
};
const statusLabels = {
    todo: 'To do',
    in_progress: 'In progress',
    waiting: 'Waiting',
    review: 'Review',
    done: 'Done',
    cancelled: 'Cancelled',
};
const priorityOptions = [
    { value: '0', label: 'Critical' },
    { value: '1', label: 'High' },
    { value: '2', label: 'Medium' },
    { value: '3', label: 'Low' },
];
const dependencyPatchKeys = [
    'add_blocked_by_ids',
    'remove_blocked_by_ids',
    'add_blocking_ids',
    'remove_blocking_ids',
];
function uniqueStrings(values) {
    return [...new Set(values)];
}
function mergeTaskPatch(current, next) {
    const merged = { ...current, ...next };
    for (const key of dependencyPatchKeys) {
        if (current[key] || next[key]) {
            merged[key] = uniqueStrings([...(current[key] ?? []), ...(next[key] ?? [])]);
        }
    }
    return merged;
}
function formatStatus(status) {
    return status.replace(/_/g, ' ');
}
function formatTimestamp(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}
function formatDurationMs(value) {
    if (!value || value <= 0) {
        return '0m';
    }
    const minutes = Math.round(value / 60000);
    return `${minutes}m`;
}
export default function TaskDetail({ open, taskId, onClose, onOpenTask }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [draft, setDraft] = useState(null);
    const [tagsInput, setTagsInput] = useState('');
    const [newBlockedById, setNewBlockedById] = useState('');
    const [newBlockingId, setNewBlockingId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const descriptionRef = useRef(null);
    const pendingPatchRef = useRef({});
    const debounceTimerRef = useRef(null);
    const detailQuery = useQuery({
        queryKey: ['task-detail', taskId],
        queryFn: () => apiRequest(`/api/v1/tasks/${taskId}`),
        enabled: open && Boolean(taskId),
        staleTime: 10000,
        refetchOnWindowFocus: false,
    });
    const tasksQuery = useQuery({
        queryKey: ['tasks', 'all-for-dependencies'],
        queryFn: () => apiRequest('/api/v1/tasks?limit=200'),
        enabled: open,
        staleTime: 10000,
        refetchOnWindowFocus: false,
    });
    useEffect(() => {
        if (!detailQuery.data) {
            return;
        }
        setDraft(detailQuery.data);
        setTagsInput(detailQuery.data.task.tags.join(', '));
        setSaveError(null);
        setNewBlockedById('');
        setNewBlockingId('');
    }, [detailQuery.data]);
    const resizeDescription = useCallback(() => {
        if (!descriptionRef.current) {
            return;
        }
        const element = descriptionRef.current;
        element.style.height = 'auto';
        element.style.height = `${element.scrollHeight}px`;
    }, []);
    useEffect(() => {
        resizeDescription();
    }, [draft?.task.description, resizeDescription]);
    const flushPendingUpdate = useCallback(async () => {
        if (!taskId) {
            return;
        }
        const pendingPatch = pendingPatchRef.current;
        if (Object.keys(pendingPatch).length === 0) {
            return;
        }
        pendingPatchRef.current = {};
        setIsSaving(true);
        setSaveError(null);
        try {
            const updated = await apiRequest(`/api/v1/tasks/${taskId}`, {
                method: 'PUT',
                body: JSON.stringify(pendingPatch),
            });
            setDraft(updated);
            setTagsInput(updated.task.tags.join(', '));
            queryClient.setQueryData(['task-detail', taskId], updated);
            void queryClient.invalidateQueries({ queryKey: ['tasks'] });
            void queryClient.invalidateQueries({ queryKey: ['board-view'] });
        }
        catch (error) {
            const message = error instanceof ApiError ? error.message : 'Failed to save task changes.';
            setSaveError(message);
            void queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
        }
        finally {
            setIsSaving(false);
        }
    }, [queryClient, taskId]);
    const queueUpdate = useCallback((patch) => {
        pendingPatchRef.current = mergeTaskPatch(pendingPatchRef.current, patch);
        if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = window.setTimeout(() => {
            void flushPendingUpdate();
        }, 500);
    }, [flushPendingUpdate]);
    useEffect(() => () => {
        if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
        }
    }, []);
    useEffect(() => {
        if (!open) {
            return;
        }
        setSaveError(null);
    }, [open, taskId]);
    const taskById = useMemo(() => new Map((tasksQuery.data ?? []).map((task) => [task.id, task])), [tasksQuery.data]);
    const availableBlockedByTargets = useMemo(() => {
        if (!draft) {
            return [];
        }
        const blockedIds = new Set(draft.dependencies.blocked_by.map((dependency) => dependency.id));
        return (tasksQuery.data ?? []).filter((task) => task.id !== draft.task.id && !blockedIds.has(task.id));
    }, [draft, tasksQuery.data]);
    const availableBlockingTargets = useMemo(() => {
        if (!draft) {
            return [];
        }
        const blockingIds = new Set(draft.dependencies.blocks.map((dependency) => dependency.id));
        return (tasksQuery.data ?? []).filter((task) => task.id !== draft.task.id && !blockingIds.has(task.id));
    }, [draft, tasksQuery.data]);
    const statusOptions = draft
        ? uniqueStrings([draft.task.status, ...statusTransitions[draft.task.status]])
        : [];
    const navigateToHierarchy = (kind) => {
        if (!draft) {
            return;
        }
        if (kind === 'task') {
            onOpenTask(draft.task.id);
            return;
        }
        if (kind === 'area' && draft.hierarchy.area) {
            navigate(`/operations/board?area=${draft.hierarchy.area.id}`);
            return;
        }
        if (kind === 'objective' && draft.hierarchy.objective) {
            navigate(`/operations/board?objective=${draft.hierarchy.objective.id}`);
            return;
        }
        if (kind === 'project' && draft.hierarchy.project) {
            navigate(`/operations/board?project=${draft.hierarchy.project.id}`);
        }
    };
    const addBlockedByDependency = () => {
        if (!draft || !newBlockedById) {
            return;
        }
        const sourceTask = taskById.get(newBlockedById);
        if (!sourceTask) {
            return;
        }
        setDraft((current) => {
            if (!current || current.dependencies.blocked_by.some((dependency) => dependency.id === newBlockedById)) {
                return current;
            }
            return {
                ...current,
                dependencies: {
                    ...current.dependencies,
                    blocked_by: [
                        ...current.dependencies.blocked_by,
                        { id: sourceTask.id, title: sourceTask.title, status: sourceTask.status },
                    ],
                },
            };
        });
        setNewBlockedById('');
        queueUpdate({ add_blocked_by_ids: [newBlockedById] });
    };
    const removeBlockedByDependency = (dependencyTaskId) => {
        setDraft((current) => {
            if (!current) {
                return current;
            }
            return {
                ...current,
                dependencies: {
                    ...current.dependencies,
                    blocked_by: current.dependencies.blocked_by.filter((item) => item.id !== dependencyTaskId),
                },
            };
        });
        queueUpdate({ remove_blocked_by_ids: [dependencyTaskId] });
    };
    const addBlockingDependency = () => {
        if (!draft || !newBlockingId) {
            return;
        }
        const sourceTask = taskById.get(newBlockingId);
        if (!sourceTask) {
            return;
        }
        setDraft((current) => {
            if (!current || current.dependencies.blocks.some((dependency) => dependency.id === newBlockingId)) {
                return current;
            }
            return {
                ...current,
                dependencies: {
                    ...current.dependencies,
                    blocks: [...current.dependencies.blocks, { id: sourceTask.id, title: sourceTask.title, status: sourceTask.status }],
                },
            };
        });
        setNewBlockingId('');
        queueUpdate({ add_blocking_ids: [newBlockingId] });
    };
    const removeBlockingDependency = (dependencyTaskId) => {
        setDraft((current) => {
            if (!current) {
                return current;
            }
            return {
                ...current,
                dependencies: {
                    ...current.dependencies,
                    blocks: current.dependencies.blocks.filter((item) => item.id !== dependencyTaskId),
                },
            };
        });
        queueUpdate({ remove_blocking_ids: [dependencyTaskId] });
    };
    if (!open) {
        return null;
    }
    return (_jsxs(Drawer, { open: open, onClose: onClose, hideHeader: true, panelClassName: "max-w-[480px]", contentClassName: "p-0", children: [detailQuery.isLoading && !draft ? (_jsxs("div", { className: "space-y-4 p-4", children: [_jsx(Skeleton, { className: "h-8 w-3/4" }), _jsx(Skeleton, { className: "h-5 w-1/2" }), _jsx(Skeleton, { className: "h-24 w-full" }), _jsx(Skeleton, { className: "h-40 w-full" })] })) : null, detailQuery.isError && !draft ? (_jsxs("div", { className: "space-y-3 p-4", children: [_jsx("p", { className: "text-sm font-medium text-error", children: detailQuery.error instanceof ApiError
                            ? detailQuery.error.message
                            : 'Failed to load task details.' }), _jsx(Button, { type: "button", size: "sm", onClick: () => void detailQuery.refetch(), children: "Retry" })] })) : null, draft ? (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx("header", { className: "border-b border-border px-4 py-3", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsxs("div", { className: "min-w-0 flex-1 space-y-2", children: [_jsx("input", { value: draft.task.title, onChange: (event) => setDraft((current) => current
                                                ? {
                                                    ...current,
                                                    task: {
                                                        ...current.task,
                                                        title: event.target.value,
                                                    },
                                                }
                                                : current), onBlur: () => {
                                                const normalizedTitle = draft.task.title.trim();
                                                if (!normalizedTitle) {
                                                    setDraft((current) => current
                                                        ? {
                                                            ...current,
                                                            task: {
                                                                ...current.task,
                                                                title: detailQuery.data?.task.title ?? current.task.title,
                                                            },
                                                        }
                                                        : current);
                                                    return;
                                                }
                                                if (normalizedTitle !== draft.task.title) {
                                                    setDraft((current) => current
                                                        ? {
                                                            ...current,
                                                            task: {
                                                                ...current.task,
                                                                title: normalizedTitle,
                                                            },
                                                        }
                                                        : current);
                                                }
                                                queueUpdate({ title: normalizedTitle });
                                            }, className: "w-full border-none bg-transparent p-0 font-display text-xl font-semibold text-text-primary outline-none" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Badge, { variant: "info", size: "md", children: "Status" }), _jsx("select", { value: draft.task.status, onChange: (event) => {
                                                        const nextStatus = event.target.value;
                                                        setDraft((current) => current
                                                            ? {
                                                                ...current,
                                                                task: {
                                                                    ...current.task,
                                                                    status: nextStatus,
                                                                },
                                                            }
                                                            : current);
                                                        queueUpdate({ status: nextStatus });
                                                    }, className: "h-8 rounded-md border border-border bg-bg-surface px-2 text-sm text-text-primary", children: statusOptions.map((status) => (_jsx("option", { value: status, children: statusLabels[status] }, status))) }), isSaving ? _jsx("span", { className: "text-xs text-text-tertiary", children: "Saving\u2026" }) : null] }), saveError ? _jsx("p", { className: "text-xs text-error", children: saveError }) : null] }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", "aria-label": "Close task detail", onClick: onClose, children: _jsx(X, { className: "h-4 w-4" }) })] }) }), _jsxs("div", { className: "min-h-0 flex-1 space-y-6 overflow-y-auto p-4", children: [_jsx("section", { className: "space-y-2", children: _jsxs("div", { className: "flex flex-wrap items-center gap-1 text-xs text-text-tertiary", children: [_jsx("button", { type: "button", className: "rounded hover:text-text-primary", onClick: () => navigateToHierarchy('area'), children: draft.hierarchy.area?.name ?? 'Area' }), _jsx(ChevronRight, { className: "h-3 w-3" }), _jsx("button", { type: "button", className: "rounded hover:text-text-primary", onClick: () => navigateToHierarchy('objective'), children: draft.hierarchy.objective?.title ?? 'Objective' }), _jsx(ChevronRight, { className: "h-3 w-3" }), _jsx("button", { type: "button", className: "rounded hover:text-text-primary", onClick: () => navigateToHierarchy('project'), children: draft.hierarchy.project?.title ?? 'Project' }), _jsx(ChevronRight, { className: "h-3 w-3" }), _jsx("button", { type: "button", className: "rounded text-text-primary", onClick: () => navigateToHierarchy('task'), children: "Task" })] }) }), _jsxs("section", { className: "space-y-3", children: [_jsx("h4", { className: "text-xs font-semibold uppercase tracking-wide text-text-tertiary", children: "Properties" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Select, { label: "Priority", value: String(draft.task.priority), options: priorityOptions, onChange: (event) => {
                                                    const priority = Number(event.target.value);
                                                    setDraft((current) => current
                                                        ? {
                                                            ...current,
                                                            task: {
                                                                ...current.task,
                                                                priority,
                                                            },
                                                        }
                                                        : current);
                                                    queueUpdate({ priority });
                                                } }), _jsx(Select, { label: "Executor", value: draft.task.executor_type, options: [
                                                    { value: 'agent', label: 'Agent' },
                                                    { value: 'human', label: 'Human' },
                                                    { value: 'ambiguous', label: 'Ambiguous' },
                                                ], onChange: (event) => {
                                                    const executorType = event.target.value;
                                                    setDraft((current) => current
                                                        ? {
                                                            ...current,
                                                            task: {
                                                                ...current.task,
                                                                executor_type: executorType,
                                                            },
                                                        }
                                                        : current);
                                                    queueUpdate({ executor_type: executorType });
                                                } }), _jsx(Select, { label: "Requires Input", value: draft.task.requires_input, options: [
                                                    { value: 'no', label: 'No' },
                                                    { value: 'verify', label: 'Verify' },
                                                    { value: 'decide', label: 'Decide' },
                                                    { value: 'create', label: 'Create' },
                                                ], onChange: (event) => {
                                                    const requiresInput = event.target.value;
                                                    setDraft((current) => current
                                                        ? {
                                                            ...current,
                                                            task: {
                                                                ...current.task,
                                                                requires_input: requiresInput,
                                                            },
                                                        }
                                                        : current);
                                                    queueUpdate({ requires_input: requiresInput });
                                                } }), _jsx(Input, { label: "Due Date", type: "date", value: draft.task.due_date ?? '', onChange: (event) => {
                                                    const dueDate = event.target.value || null;
                                                    setDraft((current) => current
                                                        ? {
                                                            ...current,
                                                            task: {
                                                                ...current.task,
                                                                due_date: dueDate,
                                                            },
                                                        }
                                                        : current);
                                                    queueUpdate({ due_date: dueDate });
                                                } }), _jsx(Input, { label: "Scheduled Date", type: "date", value: draft.task.scheduled_date ?? '', onChange: (event) => {
                                                    const scheduledDate = event.target.value || null;
                                                    setDraft((current) => current
                                                        ? {
                                                            ...current,
                                                            task: {
                                                                ...current.task,
                                                                scheduled_date: scheduledDate,
                                                            },
                                                        }
                                                        : current);
                                                    queueUpdate({ scheduled_date: scheduledDate });
                                                } }), _jsx(Input, { label: "Duration (minutes)", type: "number", min: 0, value: draft.task.duration ?? '', onChange: (event) => {
                                                    const rawValue = event.target.value;
                                                    const duration = rawValue ? Number(rawValue) : null;
                                                    setDraft((current) => current
                                                        ? {
                                                            ...current,
                                                            task: {
                                                                ...current.task,
                                                                duration,
                                                            },
                                                        }
                                                        : current);
                                                }, onBlur: () => queueUpdate({ duration: draft.task.duration }) }), _jsx(Input, { label: "Context", value: draft.task.context ?? '', onChange: (event) => setDraft((current) => current
                                                    ? {
                                                        ...current,
                                                        task: {
                                                            ...current.task,
                                                            context: event.target.value,
                                                        },
                                                    }
                                                    : current), onBlur: () => queueUpdate({ context: draft.task.context?.trim() || null }) }), _jsx(Select, { label: "Energy", value: draft.task.energy, options: [
                                                    { value: 'low', label: 'Low' },
                                                    { value: 'medium', label: 'Medium' },
                                                    { value: 'high', label: 'High' },
                                                ], onChange: (event) => {
                                                    const energy = event.target.value;
                                                    setDraft((current) => current
                                                        ? {
                                                            ...current,
                                                            task: {
                                                                ...current.task,
                                                                energy,
                                                            },
                                                        }
                                                        : current);
                                                    queueUpdate({ energy });
                                                } }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("p", { className: "text-xs font-medium text-text-secondary", children: "Source" }), _jsx("div", { className: "flex h-9 items-center rounded-md border border-border bg-bg-overlay px-3 text-sm text-text-secondary", children: draft.task.source ?? '—' })] }), _jsx(Input, { label: "Tags", value: tagsInput, onChange: (event) => setTagsInput(event.target.value), onBlur: () => {
                                                    const tags = tagsInput
                                                        .split(',')
                                                        .map((tag) => tag.trim())
                                                        .filter(Boolean);
                                                    setDraft((current) => current
                                                        ? {
                                                            ...current,
                                                            task: {
                                                                ...current.task,
                                                                tags,
                                                            },
                                                        }
                                                        : current);
                                                    queueUpdate({ tags });
                                                } })] })] }), _jsxs("section", { className: "space-y-3", children: [_jsx("h4", { className: "text-xs font-semibold uppercase tracking-wide text-text-tertiary", children: "Description" }), _jsx("textarea", { ref: descriptionRef, value: draft.task.description ?? '', onChange: (event) => {
                                            const description = event.target.value;
                                            setDraft((current) => current
                                                ? {
                                                    ...current,
                                                    task: {
                                                        ...current.task,
                                                        description,
                                                    },
                                                }
                                                : current);
                                            resizeDescription();
                                        }, onBlur: () => queueUpdate({ description: draft.task.description ?? '' }), className: "min-h-[120px] w-full resize-none rounded-md border border-border bg-bg-surface p-3 text-sm text-text-primary outline-none focus-visible:border-border-accent", placeholder: "Add context for this task\u2026" })] }), _jsxs("section", { className: "space-y-4", children: [_jsx("h4", { className: "text-xs font-semibold uppercase tracking-wide text-text-tertiary", children: "Dependencies" }), _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-xs font-medium uppercase tracking-wide text-text-secondary", children: "Blocked by" }), _jsx("div", { className: "space-y-2", children: draft.dependencies.blocked_by.length === 0 ? (_jsx("p", { className: "text-sm text-text-tertiary", children: "None" })) : (draft.dependencies.blocked_by.map((dependency) => (_jsxs("div", { className: "flex items-center gap-2 rounded-md border border-border px-2 py-1.5", children: [_jsx("button", { type: "button", className: "min-w-0 flex-1 truncate text-left text-sm text-text-primary hover:text-primary-300", onClick: () => onOpenTask(dependency.id), children: dependency.title }), _jsx(Badge, { size: "sm", children: formatStatus(dependency.status) }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => removeBlockedByDependency(dependency.id), children: "Remove" })] }, dependency.id)))) }), _jsxs("div", { className: "flex items-end gap-2", children: [_jsx(Select, { label: "Add blocker", value: newBlockedById, onChange: (event) => setNewBlockedById(event.target.value), options: [
                                                            { value: '', label: 'Select a task' },
                                                            ...availableBlockedByTargets.map((task) => ({ value: task.id, label: task.title })),
                                                        ] }), _jsxs(Button, { type: "button", size: "sm", onClick: addBlockedByDependency, disabled: !newBlockedById, children: [_jsx(Plus, { className: "h-3.5 w-3.5" }), "Add"] })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-xs font-medium uppercase tracking-wide text-text-secondary", children: "Blocking" }), _jsx("div", { className: "space-y-2", children: draft.dependencies.blocks.length === 0 ? (_jsx("p", { className: "text-sm text-text-tertiary", children: "None" })) : (draft.dependencies.blocks.map((dependency) => (_jsxs("div", { className: "flex items-center gap-2 rounded-md border border-border px-2 py-1.5", children: [_jsx("button", { type: "button", className: "min-w-0 flex-1 truncate text-left text-sm text-text-primary hover:text-primary-300", onClick: () => onOpenTask(dependency.id), children: dependency.title }), _jsx(Badge, { size: "sm", children: formatStatus(dependency.status) }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => removeBlockingDependency(dependency.id), children: "Remove" })] }, dependency.id)))) }), _jsxs("div", { className: "flex items-end gap-2", children: [_jsx(Select, { label: "Add blocked task", value: newBlockingId, onChange: (event) => setNewBlockingId(event.target.value), options: [
                                                            { value: '', label: 'Select a task' },
                                                            ...availableBlockingTargets.map((task) => ({ value: task.id, label: task.title })),
                                                        ] }), _jsxs(Button, { type: "button", size: "sm", onClick: addBlockingDependency, disabled: !newBlockingId, children: [_jsx(Plus, { className: "h-3.5 w-3.5" }), "Add"] })] })] })] }), _jsxs("section", { className: "space-y-3", children: [_jsx("h4", { className: "text-xs font-semibold uppercase tracking-wide text-text-tertiary", children: "Activity Log" }), draft.work_log.length === 0 ? (_jsx("p", { className: "text-sm text-text-tertiary", children: "No agent activity yet." })) : (_jsx("div", { className: "space-y-3", children: draft.work_log.map((entry) => (_jsxs("div", { className: "rounded-md border border-border bg-bg-surface p-3", children: [_jsxs("p", { className: "text-xs text-text-tertiary", children: [formatTimestamp(entry.timestamp), " \u2022 ", entry.agent] }), _jsx("p", { className: "mt-1 text-sm font-medium text-text-primary", children: formatStatus(entry.action) }), entry.details ? _jsx("p", { className: "mt-1 text-sm text-text-secondary", children: entry.details }) : null, _jsxs("p", { className: "mt-2 text-xs text-text-tertiary", children: ["Duration ", formatDurationMs(entry.duration_ms), " \u2022 Cost $", entry.cost_usd !== null ? entry.cost_usd.toFixed(2) : '0.00'] }), entry.output_ref ? (_jsx("a", { href: entry.output_ref, target: "_blank", rel: "noreferrer", className: "mt-2 inline-block text-xs font-medium text-primary-300 hover:text-primary-200", children: "View output" })) : null] }, entry.id))) }))] })] })] })) : null] }));
}
//# sourceMappingURL=TaskDetail.js.map