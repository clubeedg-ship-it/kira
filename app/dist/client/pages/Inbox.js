import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Check, FileText } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, EmptyState } from '../components/ui';
import { cn } from '../lib/cn';
const INPUT_QUEUE_QUERY_KEY = ['input-queue-items'];
const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const ACTIVE_QUEUE_STATUSES = new Set(['pending', 'scheduled']);
const queueTypeConfig = {
    verify: {
        badgeClassName: 'bg-error-subtle text-error',
        label: 'Verify',
        tabClassName: 'text-error',
    },
    decide: {
        badgeClassName: 'bg-warning-subtle text-warning',
        label: 'Decide',
        tabClassName: 'text-warning',
    },
    create: {
        badgeClassName: 'bg-success-subtle text-success',
        label: 'Create',
        tabClassName: 'text-success',
    },
    classify: {
        badgeClassName: 'bg-bg-overlay text-text-secondary',
        label: 'Classify',
        tabClassName: 'text-text-tertiary',
    },
};
const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'verify', label: 'Verify' },
    { key: 'decide', label: 'Decide' },
    { key: 'create', label: 'Create' },
    { key: 'classify', label: 'Classify' },
];
const priorityBorderClassNames = {
    0: 'border-l-error',
    1: 'border-l-warning',
    2: 'border-l-info',
    3: 'border-l-border',
};
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function toNullableString(value) {
    return typeof value === 'string' && value.trim() ? value : null;
}
function normalizePriority(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.min(3, Math.max(0, Math.round(value)));
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return Math.min(3, Math.max(0, Math.round(parsed)));
        }
    }
    return 2;
}
function normalizeQueueType(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.toLowerCase();
    if (normalized === 'verify' || normalized === 'decide' || normalized === 'create' || normalized === 'classify') {
        return normalized;
    }
    return null;
}
function normalizeQueueItem(raw) {
    if (!isRecord(raw)) {
        return null;
    }
    const id = toNullableString(raw.id);
    const queueType = normalizeQueueType(raw.queueType ?? raw.queue_type);
    if (!id || !queueType) {
        return null;
    }
    return {
        agentId: toNullableString(raw.agentId ?? raw.agent_id),
        agentName: toNullableString(raw.agentName ?? raw.agent_name),
        areaId: toNullableString(raw.areaId ?? raw.area_id),
        areaName: toNullableString(raw.areaName ?? raw.area_name),
        createdAt: toNullableString(raw.createdAt ?? raw.created_at) ?? new Date().toISOString(),
        deliverable: toNullableString(raw.deliverable),
        description: toNullableString(raw.description),
        id,
        options: raw.options ?? null,
        priority: normalizePriority(raw.priority),
        queueType,
        resolution: toNullableString(raw.resolution),
        resolvedAt: toNullableString(raw.resolvedAt ?? raw.resolved_at),
        scheduledFor: toNullableString(raw.scheduledFor ?? raw.scheduled_for),
        status: toNullableString(raw.status) ?? 'pending',
        taskId: toNullableString(raw.taskId ?? raw.task_id),
        title: toNullableString(raw.title) ?? 'Untitled item',
    };
}
function normalizeOptionCards(raw) {
    if (!Array.isArray(raw)) {
        return [];
    }
    return raw
        .map((option, index) => {
        if (typeof option === 'string' && option.trim()) {
            return {
                description: null,
                id: `option-${index}`,
                title: option,
            };
        }
        if (!isRecord(option)) {
            return null;
        }
        const title = toNullableString(option.title ?? option.label ?? option.value);
        if (!title) {
            return null;
        }
        return {
            description: toNullableString(option.description),
            id: toNullableString(option.id) ?? `option-${index}`,
            title,
        };
    })
        .filter((option) => Boolean(option));
}
function parseEventData(event) {
    if (!(event instanceof MessageEvent) || typeof event.data !== 'string') {
        return null;
    }
    try {
        return JSON.parse(event.data);
    }
    catch {
        return null;
    }
}
function formatTimeAgo(timestamp) {
    const value = Date.parse(timestamp);
    if (Number.isNaN(value)) {
        return 'just now';
    }
    const diffInSeconds = Math.round((value - Date.now()) / 1000);
    const abs = Math.abs(diffInSeconds);
    if (abs < 60) {
        return relativeTimeFormatter.format(diffInSeconds, 'second');
    }
    const diffInMinutes = Math.round(diffInSeconds / 60);
    if (Math.abs(diffInMinutes) < 60) {
        return relativeTimeFormatter.format(diffInMinutes, 'minute');
    }
    const diffInHours = Math.round(diffInMinutes / 60);
    if (Math.abs(diffInHours) < 24) {
        return relativeTimeFormatter.format(diffInHours, 'hour');
    }
    const diffInDays = Math.round(diffInHours / 24);
    return relativeTimeFormatter.format(diffInDays, 'day');
}
async function requestJson(url, init) {
    const response = await fetch(url, {
        credentials: 'include',
        ...init,
    });
    const payload = (await response.json().catch(() => null));
    if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Request failed.');
    }
    return payload?.data;
}
async function fetchInputQueueItems() {
    const data = await requestJson('/api/v1/input-queue?status=pending,scheduled');
    return data.map((item) => normalizeQueueItem(item)).filter((item) => Boolean(item));
}
export default function Inbox() {
    const queryClient = useQueryClient();
    const resolutionInputRef = useRef(null);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [selectedOptionId, setSelectedOptionId] = useState(null);
    const [resolutionText, setResolutionText] = useState('');
    const [newlyAddedItemId, setNewlyAddedItemId] = useState(null);
    const [actionError, setActionError] = useState(null);
    const { data: queueItems = [], isLoading } = useQuery({
        queryKey: INPUT_QUEUE_QUERY_KEY,
        queryFn: fetchInputQueueItems,
    });
    const actionMutation = useMutation({
        mutationFn: async ({ actionPath, itemId, payload, }) => {
            return requestJson(`/api/v1/input-queue/${itemId}/${actionPath}`, {
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            });
        },
    });
    const filteredItems = useMemo(() => {
        if (activeTab === 'all') {
            return queueItems;
        }
        return queueItems.filter((item) => item.queueType === activeTab);
    }, [activeTab, queueItems]);
    const selectedItem = useMemo(() => {
        return filteredItems.find((item) => item.id === selectedItemId) ?? null;
    }, [filteredItems, selectedItemId]);
    const decisionOptions = useMemo(() => {
        if (!selectedItem || selectedItem.queueType !== 'decide') {
            return [];
        }
        return normalizeOptionCards(selectedItem.options);
    }, [selectedItem]);
    useEffect(() => {
        if (!filteredItems.length) {
            setSelectedItemId(null);
            return;
        }
        const selectedIsVisible = selectedItemId ? filteredItems.some((item) => item.id === selectedItemId) : false;
        if (!selectedIsVisible) {
            setSelectedItemId(filteredItems[0]?.id ?? null);
        }
    }, [filteredItems, selectedItemId]);
    useEffect(() => {
        if (!selectedItem) {
            setResolutionText('');
            setSelectedOptionId(null);
            setActionError(null);
            return;
        }
        setResolutionText(selectedItem.resolution ?? '');
        if (selectedItem.queueType === 'decide') {
            const options = normalizeOptionCards(selectedItem.options);
            setSelectedOptionId(options[0]?.id ?? null);
        }
        else {
            setSelectedOptionId(null);
        }
        setActionError(null);
    }, [selectedItem]);
    const moveSelection = useCallback((direction) => {
        if (!filteredItems.length) {
            return;
        }
        const currentIndex = selectedItemId ? filteredItems.findIndex((item) => item.id === selectedItemId) : -1;
        if (currentIndex === -1) {
            setSelectedItemId(filteredItems[0]?.id ?? null);
            return;
        }
        const nextIndex = Math.min(filteredItems.length - 1, Math.max(0, currentIndex + direction));
        setSelectedItemId(filteredItems[nextIndex]?.id ?? null);
    }, [filteredItems, selectedItemId]);
    const runAction = useCallback(async ({ actionLabel, actionPath, defaultResolution, scheduledFor, }) => {
        if (!selectedItem) {
            return;
        }
        setActionError(null);
        const currentIndex = filteredItems.findIndex((item) => item.id === selectedItem.id);
        const nextSelectionId = currentIndex >= 0
            ? (filteredItems[currentIndex + 1]?.id ?? filteredItems[currentIndex - 1]?.id ?? null)
            : null;
        const fallbackSchedule = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const computedResolution = resolutionText.trim() || defaultResolution;
        try {
            const response = await actionMutation.mutateAsync({
                actionPath,
                itemId: selectedItem.id,
                payload: {
                    action: actionLabel,
                    resolution: computedResolution,
                    ...(actionPath === 'snooze' ? { scheduledFor: scheduledFor ?? fallbackSchedule } : {}),
                },
            });
            queryClient.setQueryData(INPUT_QUEUE_QUERY_KEY, (currentItems = []) => {
                if (actionPath === 'snooze') {
                    return currentItems.map((item) => item.id === selectedItem.id
                        ? {
                            ...item,
                            resolution: response.resolution ?? computedResolution,
                            scheduledFor: response.scheduledFor ?? scheduledFor ?? fallbackSchedule,
                            status: response.status,
                        }
                        : item);
                }
                return currentItems.filter((item) => item.id !== selectedItem.id);
            });
            if (actionPath === 'snooze') {
                setSelectedItemId(selectedItem.id);
                return;
            }
            setSelectedItemId(nextSelectionId);
            setResolutionText('');
        }
        catch (error) {
            setActionError(error instanceof Error ? error.message : 'Action failed.');
        }
    }, [actionMutation, filteredItems, queryClient, resolutionText, selectedItem]);
    const triggerApprove = useCallback(() => {
        if (!selectedItem) {
            return;
        }
        if (selectedItem.queueType === 'verify') {
            void runAction({ actionLabel: 'approve', actionPath: 'resolve', defaultResolution: 'Approved' });
            return;
        }
        if (selectedItem.queueType === 'decide') {
            const selectedOption = decisionOptions.find((option) => option.id === selectedOptionId) ?? decisionOptions[0];
            const optionResolution = selectedOption ? `Selected: ${selectedOption.title}` : 'Decision selected';
            void runAction({
                actionLabel: 'select',
                actionPath: 'resolve',
                defaultResolution: optionResolution,
            });
            return;
        }
        if (selectedItem.queueType === 'create') {
            void runAction({ actionLabel: 'done', actionPath: 'resolve', defaultResolution: 'Done' });
            return;
        }
        void runAction({
            actionLabel: 'agent_can_do_it',
            actionPath: 'resolve',
            defaultResolution: 'Agent can do it',
        });
    }, [decisionOptions, runAction, selectedItem, selectedOptionId]);
    const triggerDismiss = useCallback(() => {
        if (!selectedItem) {
            return;
        }
        void runAction({ actionLabel: 'dismiss', actionPath: 'dismiss', defaultResolution: 'Dismissed' });
    }, [runAction, selectedItem]);
    const triggerReplyOrRedo = useCallback(() => {
        if (!selectedItem) {
            return;
        }
        if (selectedItem.queueType === 'verify') {
            void runAction({
                actionLabel: 'redo',
                actionPath: 'snooze',
                defaultResolution: 'Redo requested',
            });
            return;
        }
        resolutionInputRef.current?.focus();
    }, [runAction, selectedItem]);
    useEffect(() => {
        const onKeyDown = (event) => {
            const target = event.target;
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
                return;
            }
            if (event.altKey || event.ctrlKey || event.metaKey) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === 'j') {
                event.preventDefault();
                moveSelection(1);
                return;
            }
            if (key === 'k') {
                event.preventDefault();
                moveSelection(-1);
                return;
            }
            if (key === 'a') {
                event.preventDefault();
                triggerApprove();
                return;
            }
            if (key === 'd') {
                event.preventDefault();
                triggerDismiss();
                return;
            }
            if (key === 'r') {
                event.preventDefault();
                triggerReplyOrRedo();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [moveSelection, triggerApprove, triggerDismiss, triggerReplyOrRedo]);
    useEffect(() => {
        const eventSource = new EventSource('/api/v1/events/stream?channels=input_queue');
        const onItemAdded = (event) => {
            const parsed = parseEventData(event);
            const nextItem = normalizeQueueItem(parsed);
            if (!nextItem) {
                return;
            }
            queryClient.setQueryData(INPUT_QUEUE_QUERY_KEY, (currentItems = []) => {
                const existingIndex = currentItems.findIndex((item) => item.id === nextItem.id);
                if (existingIndex >= 0) {
                    return currentItems.map((item) => (item.id === nextItem.id ? nextItem : item));
                }
                return [nextItem, ...currentItems];
            });
            setNewlyAddedItemId(nextItem.id);
            window.setTimeout(() => {
                setNewlyAddedItemId((currentId) => (currentId === nextItem.id ? null : currentId));
            }, 1400);
        };
        const onItemResolved = (event) => {
            const parsed = parseEventData(event);
            if (!isRecord(parsed)) {
                return;
            }
            const resolvedId = toNullableString(parsed.id);
            if (!resolvedId) {
                return;
            }
            queryClient.setQueryData(INPUT_QUEUE_QUERY_KEY, (currentItems = []) => currentItems.filter((item) => item.id !== resolvedId));
        };
        const onItemUpdated = (event) => {
            const parsed = parseEventData(event);
            if (!isRecord(parsed)) {
                return;
            }
            const updatedId = toNullableString(parsed.id);
            if (!updatedId) {
                return;
            }
            const updatedStatus = toNullableString(parsed.status);
            const updatedResolution = toNullableString(parsed.resolution);
            const updatedScheduledFor = toNullableString(parsed.scheduledFor ?? parsed.scheduled_for);
            queryClient.setQueryData(INPUT_QUEUE_QUERY_KEY, (currentItems = []) => {
                if (updatedStatus && !ACTIVE_QUEUE_STATUSES.has(updatedStatus)) {
                    return currentItems.filter((item) => item.id !== updatedId);
                }
                return currentItems.map((item) => item.id === updatedId
                    ? {
                        ...item,
                        resolution: updatedResolution ?? item.resolution,
                        scheduledFor: updatedScheduledFor ?? item.scheduledFor,
                        status: updatedStatus ?? item.status,
                    }
                    : item);
            });
        };
        eventSource.addEventListener('input_queue.item_added', onItemAdded);
        eventSource.addEventListener('input_queue.item_resolved', onItemResolved);
        eventSource.addEventListener('input_queue.item_updated', onItemUpdated);
        return () => {
            eventSource.removeEventListener('input_queue.item_added', onItemAdded);
            eventSource.removeEventListener('input_queue.item_resolved', onItemResolved);
            eventSource.removeEventListener('input_queue.item_updated', onItemUpdated);
            eventSource.close();
        };
    }, [queryClient]);
    const onResolutionKeyDown = (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'enter') {
            event.preventDefault();
            triggerApprove();
        }
    };
    const renderTypeActions = () => {
        if (!selectedItem) {
            return null;
        }
        if (selectedItem.queueType === 'verify') {
            return (_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { size: "sm", onClick: () => void runAction({ actionLabel: 'approve', actionPath: 'resolve', defaultResolution: 'Approved' }), children: "Approve" }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => void runAction({ actionLabel: 'redo', actionPath: 'snooze', defaultResolution: 'Redo requested' }), children: "Redo" }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => void runAction({
                            actionLabel: 'edit',
                            actionPath: 'resolve',
                            defaultResolution: 'Edited and approved',
                        }), children: "Edit" }), _jsx(Button, { variant: "danger", size: "sm", onClick: () => void runAction({ actionLabel: 'dismiss', actionPath: 'dismiss', defaultResolution: 'Dismissed' }), children: "Dismiss" })] }));
        }
        if (selectedItem.queueType === 'decide') {
            const selectedOption = decisionOptions.find((option) => option.id === selectedOptionId) ?? decisionOptions[0];
            return (_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { size: "sm", disabled: !decisionOptions.length, onClick: () => void runAction({
                            actionLabel: 'select',
                            actionPath: 'resolve',
                            defaultResolution: selectedOption ? `Selected: ${selectedOption.title}` : 'Decision selected',
                        }), children: "Select" }), _jsx(Button, { variant: "danger", size: "sm", onClick: () => void runAction({ actionLabel: 'dismiss', actionPath: 'dismiss', defaultResolution: 'Dismissed' }), children: "Dismiss" })] }));
        }
        if (selectedItem.queueType === 'create') {
            return (_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { size: "sm", onClick: () => void runAction({ actionLabel: 'done', actionPath: 'resolve', defaultResolution: 'Done' }), children: "Done" }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => void runAction({ actionLabel: 'reschedule', actionPath: 'snooze', defaultResolution: 'Rescheduled' }), children: "Reschedule" }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => void runAction({ actionLabel: 'delegate', actionPath: 'snooze', defaultResolution: 'Delegated' }), children: "Delegate" })] }));
        }
        return (_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { size: "sm", onClick: () => void runAction({
                        actionLabel: 'agent_can_do_it',
                        actionPath: 'resolve',
                        defaultResolution: 'Agent can do it',
                    }), children: "Agent can do it" }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => void runAction({ actionLabel: 'ill_do_it', actionPath: 'resolve', defaultResolution: "I'll do it" }), children: "I'll do it" }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => void runAction({ actionLabel: 'split_it', actionPath: 'resolve', defaultResolution: 'Split it' }), children: "Split it" })] }));
    };
    return (_jsxs("div", { className: "flex h-full min-h-[calc(100vh-9rem)] flex-col gap-3", children: [_jsxs("div", { className: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-bg-surface lg:flex-row", children: [_jsxs("aside", { className: "w-full shrink-0 border-b border-border lg:w-[380px] lg:border-b-0 lg:border-r", children: [_jsxs("div", { className: "border-b border-border px-4 py-4", children: [_jsx("h1", { className: "font-display text-lg font-semibold text-text-primary", children: "Input Queue" }), _jsx("p", { className: "mt-1 text-xs text-text-tertiary", children: "Pending + scheduled items sorted by priority." })] }), _jsx("div", { className: "flex flex-wrap gap-1 border-b border-border px-3 py-2", children: filterTabs.map((tab) => {
                                    const isActive = activeTab === tab.key;
                                    const tabType = tab.key === 'all' ? null : queueTypeConfig[tab.key];
                                    return (_jsx("button", { type: "button", onClick: () => setActiveTab(tab.key), className: cn('rounded-md px-3 py-1.5 text-xs font-semibold transition-colors', isActive ? 'bg-bg-overlay text-text-primary' : 'text-text-secondary hover:bg-bg-overlay hover:text-text-primary', tabType ? tabType.tabClassName : ''), children: tab.label }, tab.key));
                                }) }), _jsxs("div", { className: "min-h-0 overflow-y-auto p-3 lg:h-[calc(100vh-15.5rem)]", children: [isLoading ? (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "h-24 animate-pulse rounded-md border border-border bg-bg-overlay" }), _jsx("div", { className: "h-24 animate-pulse rounded-md border border-border bg-bg-overlay" }), _jsx("div", { className: "h-24 animate-pulse rounded-md border border-border bg-bg-overlay" })] })) : null, !isLoading && filteredItems.length === 0 ? (_jsx(EmptyState, { title: "All caught up!", description: "No input queue items need attention right now." })) : null, !isLoading && filteredItems.length > 0 ? (_jsx("div", { className: "space-y-2", children: filteredItems.map((item) => {
                                            const typeMeta = queueTypeConfig[item.queueType];
                                            const selected = selectedItemId === item.id;
                                            return (_jsxs("button", { type: "button", onClick: () => setSelectedItemId(item.id), className: cn('w-full rounded-md border border-border bg-bg-raised p-3 text-left transition-all duration-fast', priorityBorderClassNames[item.priority] ?? 'border-l-border', 'border-l-4', selected ? 'bg-bg-overlay shadow-sm' : 'hover:bg-bg-overlay', newlyAddedItemId === item.id ? 'animate-pulse' : ''), children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("span", { className: cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', typeMeta.badgeClassName), children: typeMeta.label }), _jsx("span", { className: "text-xs text-text-tertiary", children: formatTimeAgo(item.createdAt) })] }), _jsx("p", { className: "mt-2 text-sm font-semibold text-text-primary", children: item.title }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2 text-xs", children: [_jsxs("span", { className: "inline-flex items-center gap-1 text-text-secondary", children: [_jsx(Bot, { className: "h-3.5 w-3.5" }), item.agentName ?? 'Unassigned agent'] }), item.areaName ? (_jsx("span", { className: "inline-flex items-center rounded-full bg-bg-overlay px-2 py-0.5 text-text-secondary", children: item.areaName })) : null, item.status === 'scheduled' ? (_jsx(Badge, { variant: "info", size: "sm", children: "Scheduled" })) : null] })] }, item.id));
                                        }) })) : null] })] }), _jsx("section", { className: "min-h-0 flex-1 overflow-hidden", children: !selectedItem ? (_jsx("div", { className: "flex h-full items-center justify-center p-6", children: _jsx(EmptyState, { title: "All caught up!", description: "Select an inbox item from the list to review details and resolve it." }) })) : (_jsxs("div", { className: "flex h-full flex-col", children: [_jsxs("div", { className: "border-b border-border px-5 py-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("span", { className: cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide', queueTypeConfig[selectedItem.queueType].badgeClassName), children: queueTypeConfig[selectedItem.queueType].label }), _jsx("span", { className: "text-xs text-text-tertiary", children: formatTimeAgo(selectedItem.createdAt) })] }), _jsx("h2", { className: "mt-3 font-display text-2xl font-semibold text-text-primary", children: selectedItem.title }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2 text-sm text-text-secondary", children: [_jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(Bot, { className: "h-4 w-4" }), selectedItem.agentName ?? 'Unassigned agent'] }), selectedItem.areaName ? (_jsx("span", { className: "inline-flex items-center rounded-full bg-bg-overlay px-2 py-0.5 text-xs text-text-secondary", children: selectedItem.areaName })) : null] })] }), _jsxs("div", { className: "min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4", children: [_jsxs("section", { children: [_jsx("h3", { className: "text-xs font-semibold uppercase tracking-wide text-text-tertiary", children: "Description" }), _jsx("p", { className: "mt-2 text-sm leading-relaxed text-text-secondary", children: selectedItem.description ?? 'No description provided.' })] }), _jsxs("section", { children: [_jsx("h3", { className: "text-xs font-semibold uppercase tracking-wide text-text-tertiary", children: "Deliverable Preview" }), _jsxs("div", { className: "mt-2 rounded-md border border-border bg-bg-overlay p-3", children: [_jsxs("div", { className: "mb-2 inline-flex items-center gap-2 text-xs font-medium text-text-secondary", children: [_jsx(FileText, { className: "h-3.5 w-3.5" }), "Deliverable"] }), _jsx("p", { className: "whitespace-pre-wrap break-words text-sm text-text-primary", children: selectedItem.deliverable ?? 'No deliverable attached.' })] })] }), selectedItem.queueType === 'decide' ? (_jsxs("section", { children: [_jsx("h3", { className: "text-xs font-semibold uppercase tracking-wide text-text-tertiary", children: "Options" }), _jsx("div", { className: "mt-2 grid gap-2 md:grid-cols-2", children: decisionOptions.length === 0 ? (_jsx("div", { className: "rounded-md border border-dashed border-border p-3 text-sm text-text-secondary", children: "No options were provided for this decision." })) : (decisionOptions.map((option) => {
                                                        const isSelected = selectedOptionId === option.id;
                                                        return (_jsxs("button", { type: "button", onClick: () => setSelectedOptionId(option.id), className: cn('rounded-md border p-3 text-left transition-colors', isSelected
                                                                ? 'border-primary-400 bg-primary-900/20'
                                                                : 'border-border bg-bg-raised hover:bg-bg-overlay'), children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("p", { className: "text-sm font-semibold text-text-primary", children: option.title }), isSelected ? _jsx(Check, { className: "h-4 w-4 text-primary-300" }) : null] }), option.description ? (_jsx("p", { className: "mt-2 text-xs leading-relaxed text-text-secondary", children: option.description })) : null] }, option.id));
                                                    })) })] })) : null, _jsxs("section", { className: "space-y-3", children: [_jsx("h3", { className: "text-xs font-semibold uppercase tracking-wide text-text-tertiary", children: "Actions" }), renderTypeActions(), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { htmlFor: "resolution-notes", className: "text-xs font-medium text-text-secondary", children: "Resolution" }), _jsx("textarea", { id: "resolution-notes", ref: resolutionInputRef, rows: 4, value: resolutionText, onChange: (event) => setResolutionText(event.target.value), onKeyDown: onResolutionKeyDown, className: "w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-primary-400", placeholder: "Add notes before resolving\u2026" })] }), actionError ? _jsx("p", { className: "text-sm text-error", children: actionError }) : null] })] })] })) })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 rounded-md border border-border bg-bg-surface px-3 py-2 text-xs text-text-tertiary", children: [_jsx("span", { className: "rounded border border-border px-2 py-0.5 font-mono text-[11px]", children: "j / k" }), _jsx("span", { children: "Navigate" }), _jsx("span", { className: "rounded border border-border px-2 py-0.5 font-mono text-[11px]", children: "a" }), _jsx("span", { children: "Approve" }), _jsx("span", { className: "rounded border border-border px-2 py-0.5 font-mono text-[11px]", children: "d" }), _jsx("span", { children: "Dismiss" }), _jsx("span", { className: "rounded border border-border px-2 py-0.5 font-mono text-[11px]", children: "r" }), _jsx("span", { children: "Reply / Redo" })] })] }));
}
//# sourceMappingURL=Inbox.js.map