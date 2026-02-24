import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Check, FileText } from 'lucide-react';
import { type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge, Button, EmptyState } from '../components/ui';
import { cn } from '../lib/cn';

type QueueType = 'verify' | 'decide' | 'create' | 'classify';
type InboxFilterTab = 'all' | QueueType;
type QueueActionPath = 'resolve' | 'dismiss' | 'snooze';

interface InputQueueItem {
  agentId: string | null;
  agentName: string | null;
  areaId: string | null;
  areaName: string | null;
  createdAt: string;
  deliverable: string | null;
  description: string | null;
  id: string;
  options: unknown;
  priority: number;
  queueType: QueueType;
  resolution: string | null;
  resolvedAt: string | null;
  scheduledFor: string | null;
  status: string;
  taskId: string | null;
  title: string;
}

interface QueueOptionCard {
  description: string | null;
  id: string;
  title: string;
}

interface QueueActionResponse {
  id: string;
  resolution?: string | null;
  scheduledFor?: string | null;
  status: string;
}

const INPUT_QUEUE_QUERY_KEY = ['input-queue-items'] as const;
const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const ACTIVE_QUEUE_STATUSES = new Set(['pending', 'scheduled']);

const queueTypeConfig: Record<
  QueueType,
  {
    badgeClassName: string;
    label: string;
    tabClassName: string;
  }
> = {
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

const filterTabs: Array<{ key: InboxFilterTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'verify', label: 'Verify' },
  { key: 'decide', label: 'Decide' },
  { key: 'create', label: 'Create' },
  { key: 'classify', label: 'Classify' },
];

const priorityBorderClassNames: Record<number, string> = {
  0: 'border-l-error',
  1: 'border-l-warning',
  2: 'border-l-info',
  3: 'border-l-border',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function normalizePriority(value: unknown): number {
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

function normalizeQueueType(value: unknown): QueueType | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'verify' || normalized === 'decide' || normalized === 'create' || normalized === 'classify') {
    return normalized;
  }

  return null;
}

function normalizeQueueItem(raw: unknown): InputQueueItem | null {
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

function normalizeOptionCards(raw: unknown): QueueOptionCard[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((option, index): QueueOptionCard | null => {
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
    .filter((option): option is QueueOptionCard => Boolean(option));
}

function parseEventData(event: Event): unknown | null {
  if (!(event instanceof MessageEvent) || typeof event.data !== 'string') {
    return null;
  }

  try {
    return JSON.parse(event.data);
  } catch {
    return null;
  }
}

function formatTimeAgo(timestamp: string): string {
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

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        data?: T;
        error?: {
          message?: string;
        };
      }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? 'Request failed.');
  }

  return payload?.data as T;
}

async function fetchInputQueueItems(): Promise<InputQueueItem[]> {
  const data = await requestJson<unknown[]>('/api/v1/input-queue?status=pending,scheduled');
  return data.map((item) => normalizeQueueItem(item)).filter((item): item is InputQueueItem => Boolean(item));
}

export default function Inbox() {
  const queryClient = useQueryClient();
  const resolutionInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [activeTab, setActiveTab] = useState<InboxFilterTab>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [newlyAddedItemId, setNewlyAddedItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: queueItems = [], isLoading } = useQuery({
    queryKey: INPUT_QUEUE_QUERY_KEY,
    queryFn: fetchInputQueueItems,
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      actionPath,
      itemId,
      payload,
    }: {
      actionPath: QueueActionPath;
      itemId: string;
      payload: Record<string, unknown>;
    }) => {
      return requestJson<QueueActionResponse>(`/api/v1/input-queue/${itemId}/${actionPath}`, {
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
    } else {
      setSelectedOptionId(null);
    }
    setActionError(null);
  }, [selectedItem]);

  const moveSelection = useCallback(
    (direction: 1 | -1) => {
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
    },
    [filteredItems, selectedItemId],
  );

  const runAction = useCallback(
    async ({
      actionLabel,
      actionPath,
      defaultResolution,
      scheduledFor,
    }: {
      actionLabel: string;
      actionPath: QueueActionPath;
      defaultResolution: string;
      scheduledFor?: string;
    }) => {
      if (!selectedItem) {
        return;
      }

      setActionError(null);

      const currentIndex = filteredItems.findIndex((item) => item.id === selectedItem.id);
      const nextSelectionId =
        currentIndex >= 0
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

        queryClient.setQueryData<InputQueueItem[]>(INPUT_QUEUE_QUERY_KEY, (currentItems = []) => {
          if (actionPath === 'snooze') {
            return currentItems.map((item) =>
              item.id === selectedItem.id
                ? {
                    ...item,
                    resolution: response.resolution ?? computedResolution,
                    scheduledFor: response.scheduledFor ?? scheduledFor ?? fallbackSchedule,
                    status: response.status,
                  }
                : item,
            );
          }

          return currentItems.filter((item) => item.id !== selectedItem.id);
        });

        if (actionPath === 'snooze') {
          setSelectedItemId(selectedItem.id);
          return;
        }

        setSelectedItemId(nextSelectionId);
        setResolutionText('');
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Action failed.');
      }
    },
    [actionMutation, filteredItems, queryClient, resolutionText, selectedItem],
  );

  const triggerApprove = useCallback(() => {
    if (!selectedItem) {
      return;
    }

    if (selectedItem.queueType === 'verify') {
      void runAction({ actionLabel: 'approve', actionPath: 'resolve', defaultResolution: 'Approved' });
      return;
    }

    if (selectedItem.queueType === 'decide') {
      const selectedOption =
        decisionOptions.find((option) => option.id === selectedOptionId) ?? decisionOptions[0];
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
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
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

    const onItemAdded = (event: Event) => {
      const parsed = parseEventData(event);
      const nextItem = normalizeQueueItem(parsed);
      if (!nextItem) {
        return;
      }

      queryClient.setQueryData<InputQueueItem[]>(INPUT_QUEUE_QUERY_KEY, (currentItems = []) => {
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

    const onItemResolved = (event: Event) => {
      const parsed = parseEventData(event);
      if (!isRecord(parsed)) {
        return;
      }

      const resolvedId = toNullableString(parsed.id);
      if (!resolvedId) {
        return;
      }

      queryClient.setQueryData<InputQueueItem[]>(INPUT_QUEUE_QUERY_KEY, (currentItems = []) =>
        currentItems.filter((item) => item.id !== resolvedId),
      );
    };

    const onItemUpdated = (event: Event) => {
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

      queryClient.setQueryData<InputQueueItem[]>(INPUT_QUEUE_QUERY_KEY, (currentItems = []) => {
        if (updatedStatus && !ACTIVE_QUEUE_STATUSES.has(updatedStatus)) {
          return currentItems.filter((item) => item.id !== updatedId);
        }

        return currentItems.map((item) =>
          item.id === updatedId
            ? {
                ...item,
                resolution: updatedResolution ?? item.resolution,
                scheduledFor: updatedScheduledFor ?? item.scheduledFor,
                status: updatedStatus ?? item.status,
              }
            : item,
        );
      });
    };

    eventSource.addEventListener('input_queue.item_added', onItemAdded as EventListener);
    eventSource.addEventListener('input_queue.item_resolved', onItemResolved as EventListener);
    eventSource.addEventListener('input_queue.item_updated', onItemUpdated as EventListener);

    return () => {
      eventSource.removeEventListener('input_queue.item_added', onItemAdded as EventListener);
      eventSource.removeEventListener('input_queue.item_resolved', onItemResolved as EventListener);
      eventSource.removeEventListener('input_queue.item_updated', onItemUpdated as EventListener);
      eventSource.close();
    };
  }, [queryClient]);

  const onResolutionKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
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
      return (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void runAction({ actionLabel: 'approve', actionPath: 'resolve', defaultResolution: 'Approved' })}>
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void runAction({ actionLabel: 'redo', actionPath: 'snooze', defaultResolution: 'Redo requested' })}
          >
            Redo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void runAction({
                actionLabel: 'edit',
                actionPath: 'resolve',
                defaultResolution: 'Edited and approved',
              })
            }
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => void runAction({ actionLabel: 'dismiss', actionPath: 'dismiss', defaultResolution: 'Dismissed' })}
          >
            Dismiss
          </Button>
        </div>
      );
    }

    if (selectedItem.queueType === 'decide') {
      const selectedOption = decisionOptions.find((option) => option.id === selectedOptionId) ?? decisionOptions[0];
      return (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!decisionOptions.length}
            onClick={() =>
              void runAction({
                actionLabel: 'select',
                actionPath: 'resolve',
                defaultResolution: selectedOption ? `Selected: ${selectedOption.title}` : 'Decision selected',
              })
            }
          >
            Select
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => void runAction({ actionLabel: 'dismiss', actionPath: 'dismiss', defaultResolution: 'Dismissed' })}
          >
            Dismiss
          </Button>
        </div>
      );
    }

    if (selectedItem.queueType === 'create') {
      return (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void runAction({ actionLabel: 'done', actionPath: 'resolve', defaultResolution: 'Done' })}>
            Done
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void runAction({ actionLabel: 'reschedule', actionPath: 'snooze', defaultResolution: 'Rescheduled' })}
          >
            Reschedule
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void runAction({ actionLabel: 'delegate', actionPath: 'snooze', defaultResolution: 'Delegated' })}
          >
            Delegate
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() =>
            void runAction({
              actionLabel: 'agent_can_do_it',
              actionPath: 'resolve',
              defaultResolution: 'Agent can do it',
            })
          }
        >
          Agent can do it
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void runAction({ actionLabel: 'ill_do_it', actionPath: 'resolve', defaultResolution: "I'll do it" })}
        >
          I&apos;ll do it
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void runAction({ actionLabel: 'split_it', actionPath: 'resolve', defaultResolution: 'Split it' })}
        >
          Split it
        </Button>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-9rem)] flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-bg-surface lg:flex-row">
        <aside className="w-full shrink-0 border-b border-border lg:w-[380px] lg:border-b-0 lg:border-r">
          <div className="border-b border-border px-4 py-4">
            <h1 className="font-display text-lg font-semibold text-text-primary">Input Queue</h1>
            <p className="mt-1 text-xs text-text-tertiary">Pending + scheduled items sorted by priority.</p>
          </div>

          <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
            {filterTabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const tabType = tab.key === 'all' ? null : queueTypeConfig[tab.key];

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                    isActive ? 'bg-bg-overlay text-text-primary' : 'text-text-secondary hover:bg-bg-overlay hover:text-text-primary',
                    tabType ? tabType.tabClassName : '',
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 overflow-y-auto p-3 lg:h-[calc(100vh-15.5rem)]">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-24 animate-pulse rounded-md border border-border bg-bg-overlay" />
                <div className="h-24 animate-pulse rounded-md border border-border bg-bg-overlay" />
                <div className="h-24 animate-pulse rounded-md border border-border bg-bg-overlay" />
              </div>
            ) : null}

            {!isLoading && filteredItems.length === 0 ? (
              <EmptyState
                title="All caught up!"
                description="No input queue items need attention right now."
              />
            ) : null}

            {!isLoading && filteredItems.length > 0 ? (
              <div className="space-y-2">
                {filteredItems.map((item) => {
                  const typeMeta = queueTypeConfig[item.queueType];
                  const selected = selectedItemId === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedItemId(item.id)}
                      className={cn(
                        'w-full rounded-md border border-border bg-bg-raised p-3 text-left transition-all duration-fast',
                        priorityBorderClassNames[item.priority] ?? 'border-l-border',
                        'border-l-4',
                        selected ? 'bg-bg-overlay shadow-sm' : 'hover:bg-bg-overlay',
                        newlyAddedItemId === item.id ? 'animate-pulse' : '',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            typeMeta.badgeClassName,
                          )}
                        >
                          {typeMeta.label}
                        </span>
                        <span className="text-xs text-text-tertiary">{formatTimeAgo(item.createdAt)}</span>
                      </div>

                      <p className="mt-2 text-sm font-semibold text-text-primary">{item.title}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 text-text-secondary">
                          <Bot className="h-3.5 w-3.5" />
                          {item.agentName ?? 'Unassigned agent'}
                        </span>
                        {item.areaName ? (
                          <span className="inline-flex items-center rounded-full bg-bg-overlay px-2 py-0.5 text-text-secondary">
                            {item.areaName}
                          </span>
                        ) : null}
                        {item.status === 'scheduled' ? (
                          <Badge variant="info" size="sm">
                            Scheduled
                          </Badge>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </aside>

        <section className="min-h-0 flex-1 overflow-hidden">
          {!selectedItem ? (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                title="All caught up!"
                description="Select an inbox item from the list to review details and resolve it."
              />
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="border-b border-border px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
                      queueTypeConfig[selectedItem.queueType].badgeClassName,
                    )}
                  >
                    {queueTypeConfig[selectedItem.queueType].label}
                  </span>
                  <span className="text-xs text-text-tertiary">{formatTimeAgo(selectedItem.createdAt)}</span>
                </div>
                <h2 className="mt-3 font-display text-2xl font-semibold text-text-primary">{selectedItem.title}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                  <span className="inline-flex items-center gap-1">
                    <Bot className="h-4 w-4" />
                    {selectedItem.agentName ?? 'Unassigned agent'}
                  </span>
                  {selectedItem.areaName ? (
                    <span className="inline-flex items-center rounded-full bg-bg-overlay px-2 py-0.5 text-xs text-text-secondary">
                      {selectedItem.areaName}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Description</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {selectedItem.description ?? 'No description provided.'}
                  </p>
                </section>

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Deliverable Preview</h3>
                  <div className="mt-2 rounded-md border border-border bg-bg-overlay p-3">
                    <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-text-secondary">
                      <FileText className="h-3.5 w-3.5" />
                      Deliverable
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm text-text-primary">
                      {selectedItem.deliverable ?? 'No deliverable attached.'}
                    </p>
                  </div>
                </section>

                {selectedItem.queueType === 'decide' ? (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Options</h3>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {decisionOptions.length === 0 ? (
                        <div className="rounded-md border border-dashed border-border p-3 text-sm text-text-secondary">
                          No options were provided for this decision.
                        </div>
                      ) : (
                        decisionOptions.map((option) => {
                          const isSelected = selectedOptionId === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setSelectedOptionId(option.id)}
                              className={cn(
                                'rounded-md border p-3 text-left transition-colors',
                                isSelected
                                  ? 'border-primary-400 bg-primary-900/20'
                                  : 'border-border bg-bg-raised hover:bg-bg-overlay',
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-text-primary">{option.title}</p>
                                {isSelected ? <Check className="h-4 w-4 text-primary-300" /> : null}
                              </div>
                              {option.description ? (
                                <p className="mt-2 text-xs leading-relaxed text-text-secondary">{option.description}</p>
                              ) : null}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </section>
                ) : null}

                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Actions</h3>
                  {renderTypeActions()}
                  <div className="space-y-2">
                    <label htmlFor="resolution-notes" className="text-xs font-medium text-text-secondary">
                      Resolution
                    </label>
                    <textarea
                      id="resolution-notes"
                      ref={resolutionInputRef}
                      rows={4}
                      value={resolutionText}
                      onChange={(event) => setResolutionText(event.target.value)}
                      onKeyDown={onResolutionKeyDown}
                      className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-primary-400"
                      placeholder="Add notes before resolving…"
                    />
                  </div>
                  {actionError ? <p className="text-sm text-error">{actionError}</p> : null}
                </section>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-bg-surface px-3 py-2 text-xs text-text-tertiary">
        <span className="rounded border border-border px-2 py-0.5 font-mono text-[11px]">j / k</span>
        <span>Navigate</span>
        <span className="rounded border border-border px-2 py-0.5 font-mono text-[11px]">a</span>
        <span>Approve</span>
        <span className="rounded border border-border px-2 py-0.5 font-mono text-[11px]">d</span>
        <span>Dismiss</span>
        <span className="rounded border border-border px-2 py-0.5 font-mono text-[11px]">r</span>
        <span>Reply / Redo</span>
      </div>
    </div>
  );
}
