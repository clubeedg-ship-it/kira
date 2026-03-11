import { useEffect, useRef, useState } from 'react';
const IDLE = { state: 'idle', updatedAt: Date.now() };
// Shared EventSource singleton — all hooks share one connection
let sharedES = null;
let retryTimer = null;
const activityListeners = new Set();
const chatListeners = new Set();
let currentActivity = IDLE;
function ensureConnection() {
    if (sharedES && sharedES.readyState !== EventSource.CLOSED)
        return;
    if (sharedES) {
        try {
            sharedES.close();
        }
        catch { }
    }
    const es = new EventSource('/api/v1/events/stream');
    sharedES = es;
    es.addEventListener('activity', (e) => {
        try {
            const data = JSON.parse(e.data);
            currentActivity = data;
            activityListeners.forEach(cb => cb(data));
        }
        catch { }
    });
    es.addEventListener('chat', (e) => {
        try {
            const data = JSON.parse(e.data);
            chatListeners.forEach(cb => cb(data));
        }
        catch { }
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
export function useAgentActivity() {
    const [activity, setActivity] = useState(currentActivity);
    useEffect(() => {
        ensureConnection();
        const cb = (a) => setActivity(a);
        activityListeners.add(cb);
        return () => { activityListeners.delete(cb); };
    }, []);
    return activity;
}
/**
 * Subscribe to real-time chat events (delta, final, thinking, tool_call, error).
 */
export function useChatEvents(onEvent) {
    const callbackRef = useRef(onEvent);
    callbackRef.current = onEvent;
    useEffect(() => {
        ensureConnection();
        const cb = (e) => callbackRef.current(e);
        chatListeners.add(cb);
        return () => { chatListeners.delete(cb); };
    }, []);
}
//# sourceMappingURL=useAgentActivity.js.map