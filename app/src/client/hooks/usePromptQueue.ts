import { useCallback, useRef, useState } from 'react';

export interface QueuedPrompt {
  id: string;
  text: string;
  files?: File[];
  queuedAt: number;
}

/**
 * Manages a queue of prompts that send one-by-one after each response.
 */
export function usePromptQueue() {
  const [queue, setQueue] = useState<QueuedPrompt[]>([]);
  const idCounter = useRef(0);

  const enqueue = useCallback((text: string, files?: File[]) => {
    const id = `q-${++idCounter.current}-${Date.now()}`;
    setQueue(prev => [...prev, { id, text, files, queuedAt: Date.now() }]);
    return id;
  }, []);

  const dequeue = useCallback((): QueuedPrompt | null => {
    let item: QueuedPrompt | null = null;
    setQueue(prev => {
      if (prev.length === 0) return prev;
      item = prev[0];
      return prev.slice(1);
    });
    return item;
  }, []);

  const remove = useCallback((id: string) => {
    setQueue(prev => prev.filter(p => p.id !== id));
  }, []);

  const update = useCallback((id: string, text: string) => {
    setQueue(prev => prev.map(p => p.id === id ? { ...p, text } : p));
  }, []);

  const clear = useCallback(() => setQueue([]), []);

  const peek = useCallback((): QueuedPrompt | null => {
    return queue[0] || null;
  }, [queue]);

  return { queue, enqueue, dequeue, remove, update, clear, peek };
}
