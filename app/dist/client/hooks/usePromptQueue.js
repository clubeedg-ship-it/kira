import { useCallback, useRef, useState } from 'react';
/**
 * Manages a queue of prompts that send one-by-one after each response.
 */
export function usePromptQueue() {
    const [queue, setQueue] = useState([]);
    const idCounter = useRef(0);
    const enqueue = useCallback((text, files) => {
        const id = `q-${++idCounter.current}-${Date.now()}`;
        setQueue(prev => [...prev, { id, text, files, queuedAt: Date.now() }]);
        return id;
    }, []);
    const dequeue = useCallback(() => {
        let item = null;
        setQueue(prev => {
            if (prev.length === 0)
                return prev;
            item = prev[0];
            return prev.slice(1);
        });
        return item;
    }, []);
    const remove = useCallback((id) => {
        setQueue(prev => prev.filter(p => p.id !== id));
    }, []);
    const update = useCallback((id, text) => {
        setQueue(prev => prev.map(p => p.id === id ? { ...p, text } : p));
    }, []);
    const clear = useCallback(() => setQueue([]), []);
    const peek = useCallback(() => {
        return queue[0] || null;
    }, [queue]);
    return { queue, enqueue, dequeue, remove, update, clear, peek };
}
//# sourceMappingURL=usePromptQueue.js.map