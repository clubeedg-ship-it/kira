import { useEffect, useState } from 'react';

import { cn } from '../lib/cn';

interface LevelUpEvent {
  newLevel: number;
  title: string;
  icon: string;
  previousLevel: number;
}

export default function LevelUpToast() {
  const [event, setEvent] = useState<LevelUpEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const source = new EventSource('/api/v1/events/stream?channels=xp', { withCredentials: true });

    const handler = (e: Event) => {
      if (!(e instanceof MessageEvent) || typeof e.data !== 'string') return;
      try {
        const data = JSON.parse(e.data) as LevelUpEvent;
        setEvent(data);
        setVisible(true);
        setTimeout(() => setVisible(false), 4000);
        setTimeout(() => setEvent(null), 4500);
      } catch {
        // ignore
      }
    };

    source.addEventListener('xp.level_up', handler as EventListener);
    return () => {
      source.removeEventListener('xp.level_up', handler as EventListener);
      source.close();
    };
  }, []);

  if (!event) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-[100] rounded-xl border border-amber-500/30 bg-bg-raised px-5 py-3 shadow-xl transition-all duration-500',
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0 pointer-events-none',
        'ring-2 ring-amber-500/20'
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{event.icon}</span>
        <div>
          <p className="text-sm font-bold text-text-primary">
            Level {event.newLevel}
          </p>
          <p className="text-xs text-amber-400 font-medium">{event.title}</p>
        </div>
      </div>
    </div>
  );
}
