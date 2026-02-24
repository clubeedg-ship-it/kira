import { useEffect, useRef, useState, useCallback } from 'react';

export interface AgentActivity {
  state: 'idle' | 'thinking' | 'streaming' | 'tool_call';
  sessionKey?: string;
  runId?: string;
  text?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  startedAt?: number;
  updatedAt: number;
}

export interface ChatEvent {
  type: 'delta' | 'final' | 'thinking' | 'tool_call' | 'tool_result' | 'error';
  runId?: string;
  sessionKey?: string;
  text?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  error?: string;
}

const IDLE: AgentActivity = { state: 'idle', updatedAt: Date.now() };

// Shared EventSource singleton — all hooks share one connection
let sharedES: EventSource | null = null;
let retryTimer: NodeJS.Timeout | null = null;
const activityListeners = new Set<(a: AgentActivity) => void>();
const chatListeners = new Set<(e: ChatEvent) => void>();
let currentActivity: AgentActivity = IDLE;

function ensureConnection() {
  if (sharedES && sharedES.readyState !== EventSource.CLOSED) return;
  if (sharedES) { try { sharedES.close(); } catch {} }
  
  const es = new EventSource('/api/v1/events/stream');
  sharedES = es;

  es.addEventListener('activity', (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data);
      currentActivity = data;
      activityListeners.forEach(cb => cb(data));
    } catch {}
  });

  es.addEventListener('chat', (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data);
      chatListeners.forEach(cb => cb(data));
    } catch {}
  });

  es.onerror = () => {
    es.close();
    sharedES = null;
    if (!retryTimer) {
      retryTimer = setTimeout(() => { retryTimer = null; ensureConnection(); }, 2000);
    }
  };
}

/**
 * Subscribe to real-time agent activity via SSE.
 * Survives page refresh — reconnects and gets current state immediately.
 */
export function useAgentActivity(): AgentActivity {
  const [activity, setActivity] = useState<AgentActivity>(currentActivity);

  useEffect(() => {
    ensureConnection();
    const cb = (a: AgentActivity) => setActivity(a);
    activityListeners.add(cb);
    return () => { activityListeners.delete(cb); };
  }, []);

  return activity;
}

/**
 * Subscribe to real-time chat events (delta, final, thinking, tool_call, error).
 */
export function useChatEvents(onEvent: (e: ChatEvent) => void) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    ensureConnection();
    const cb = (e: ChatEvent) => callbackRef.current(e);
    chatListeners.add(cb);
    return () => { chatListeners.delete(cb); };
  }, []);
}
