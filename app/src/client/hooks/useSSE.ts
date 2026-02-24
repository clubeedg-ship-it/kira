import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

const SSE_STREAM_URL = '/api/v1/events/stream';
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;
const RELEVANT_EVENT_TYPES = [
  'task.created',
  'task.updated',
  'task.status_changed',
  'input_queue.item_added',
  'input_queue.item_resolved',
  'input_queue.item_updated',
  'input_queue.count_changed',
  'agent.status_changed',
  'dependency.unblocked',
  'key_result.updated',
  'xp.gained',
  'xp.level_up',
  'xp.streak_updated',
  'xp.streak_broken',
] as const;

interface ParsedSseEvent {
  channel: string;
  data: unknown;
  timestamp: string | null;
  type: string;
}

interface UseSseResult {
  isConnected: boolean;
  lastEvent: ParsedSseEvent | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeChannel(channel: string): string {
  const normalized = channel.trim().toLowerCase();
  return normalized === 'inbox' ? 'input_queue' : normalized;
}

function parseEventData(eventType: string, rawData: string): ParsedSseEvent {
  let parsedData: unknown = rawData;

  try {
    parsedData = JSON.parse(rawData) as unknown;
  } catch {
    parsedData = rawData;
  }

  if (
    isRecord(parsedData) &&
    typeof parsedData.type === 'string' &&
    Object.prototype.hasOwnProperty.call(parsedData, 'data')
  ) {
    const nestedType = parsedData.type;
    return {
      channel: normalizeChannel(
        typeof parsedData.channel === 'string'
          ? parsedData.channel
          : nestedType.split('.')[0] ?? 'system',
      ),
      data: parsedData.data,
      timestamp: typeof parsedData.timestamp === 'string' ? parsedData.timestamp : null,
      type: nestedType,
    };
  }

  const normalizedType =
    eventType === 'message' &&
    isRecord(parsedData) &&
    typeof parsedData.event === 'string'
      ? parsedData.event
      : eventType;

  return {
    channel: normalizeChannel(normalizedType.split('.')[0] ?? 'system'),
    data: parsedData,
    timestamp:
      isRecord(parsedData) && typeof parsedData.timestamp === 'string'
        ? parsedData.timestamp
        : null,
    type: normalizedType,
  };
}

function getTaskId(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload.task_id === 'string') {
    return payload.task_id;
  }

  if (typeof payload.taskId === 'string') {
    return payload.taskId;
  }

  if (typeof payload.id === 'string') {
    return payload.id;
  }

  return null;
}

function invalidateForEvent(
  queryClient: ReturnType<typeof useQueryClient>,
  event: ParsedSseEvent,
): void {
  const eventType = event.type;

  if (eventType.startsWith('task.')) {
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['board-view'] });
    void queryClient.invalidateQueries({ queryKey: ['operations-today'] });
    void queryClient.invalidateQueries({ queryKey: ['command-center'] });

    const taskId = getTaskId(event.data);
    if (taskId) {
      void queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
    }

    return;
  }

  if (eventType.startsWith('input_queue.')) {
    void queryClient.invalidateQueries({ queryKey: ['input-queue-items'] });
    void queryClient.invalidateQueries({ queryKey: ['command-center'] });
    return;
  }

  if (eventType.startsWith('agent.')) {
    void queryClient.invalidateQueries({ queryKey: ['agents'] });
    void queryClient.invalidateQueries({ queryKey: ['command-center'] });
    return;
  }

  if (eventType.startsWith('dependency.')) {
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['board-view'] });
    void queryClient.invalidateQueries({ queryKey: ['operations-today'] });
    void queryClient.invalidateQueries({ queryKey: ['command-center'] });
    return;
  }

  if (eventType.startsWith('key_result.')) {
    void queryClient.invalidateQueries({ queryKey: ['objectives'] });
    void queryClient.invalidateQueries({ queryKey: ['command-center'] });
    return;
  }

  if (eventType.startsWith('xp.')) {
    void queryClient.invalidateQueries({ queryKey: ['user-xp'] });
    return;
  }
}

export function useSSE(): UseSseResult {
  const queryClient = useQueryClient();
  const [lastEvent, setLastEvent] = useState<ParsedSseEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempt = 0;
    let isUnmounted = false;

    const clearReconnectTimer = () => {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const closeSource = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    const handleEventMessage = (eventType: string, rawEvent: MessageEvent<string>) => {
      const parsedEvent = parseEventData(eventType, rawEvent.data);
      setLastEvent(parsedEvent);
      invalidateForEvent(queryClient, parsedEvent);
    };

    const scheduleReconnect = () => {
      if (isUnmounted || reconnectTimer !== null) {
        return;
      }

      const delay = Math.min(
        RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt,
        RECONNECT_MAX_DELAY_MS,
      );
      reconnectAttempt += 1;

      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (isUnmounted) {
        return;
      }

      clearReconnectTimer();
      closeSource();

      const nextSource = new EventSource(SSE_STREAM_URL, { withCredentials: true });
      eventSource = nextSource;

      nextSource.onopen = () => {
        reconnectAttempt = 0;
        setIsConnected(true);
      };

      nextSource.onerror = () => {
        setIsConnected(false);
        closeSource();
        scheduleReconnect();
      };

      nextSource.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          return;
        }

        handleEventMessage('message', event);
      };

      for (const eventType of RELEVANT_EVENT_TYPES) {
        nextSource.addEventListener(eventType, (event) => {
          if (!(event instanceof MessageEvent) || typeof event.data !== 'string') {
            return;
          }

          handleEventMessage(eventType, event);
        });
      }
    };

    connect();

    return () => {
      isUnmounted = true;
      clearReconnectTimer();
      closeSource();
    };
  }, [queryClient]);

  return { lastEvent, isConnected };
}
