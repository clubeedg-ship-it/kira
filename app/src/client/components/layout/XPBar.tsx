import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Flame, Zap } from 'lucide-react';

import { apiRequest } from '../../lib/api';
import { cn } from '../../lib/cn';

interface XPState {
  total_xp: number;
  level: number;
  title: string;
  icon: string;
  progress: number;
  xp_to_next_level: number;
  current_streak: number;
  longest_streak: number;
  streak_freezes: number;
}

const TIER_COLORS: Record<string, string> = {
  Newcomer: 'bg-emerald-500',
  Explorer: 'bg-blue-500',
  Builder: 'bg-indigo-500',
  Master: 'bg-purple-500',
  Architect: 'bg-violet-500',
  Visionary: 'bg-fuchsia-500',
  Legend: 'bg-amber-500',
};

function getTierColor(title: string): string {
  return TIER_COLORS[title] ?? 'bg-primary-400';
}

interface XPBarProps {
  collapsed: boolean;
}

export default function XPBar({ collapsed }: XPBarProps) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const { data: xp } = useQuery<XPState>({
    queryKey: ['user-xp'],
    queryFn: () => apiRequest<XPState>('/api/v1/xp'),
    staleTime: 30_000,
    retry: 1,
  });

  // Listen for SSE xp events to refetch
  useEffect(() => {
    const source = new EventSource('/api/v1/events/stream?channels=xp', { withCredentials: true });

    const handleXpGained = () => {
      void queryClient.invalidateQueries({ queryKey: ['user-xp'] });
    };

    source.addEventListener('xp.gained', handleXpGained);
    source.addEventListener('xp.level_up', handleXpGained);
    source.addEventListener('xp.streak_updated', handleXpGained);
    source.addEventListener('xp.streak_broken', handleXpGained);

    source.onerror = () => {
      // Silently reconnect handled by browser
    };

    return () => {
      source.removeEventListener('xp.gained', handleXpGained);
      source.removeEventListener('xp.level_up', handleXpGained);
      source.removeEventListener('xp.streak_updated', handleXpGained);
      source.removeEventListener('xp.streak_broken', handleXpGained);
      source.close();
    };
  }, [queryClient]);

  const toggleExpanded = useCallback(() => setExpanded((v) => !v), []);

  if (!xp) return null;

  const barColor = getTierColor(xp.title);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 px-1 py-2" title={`Lv ${xp.level} ${xp.title} — ${xp.icon}`}>
        <span className="text-base">{xp.icon}</span>
        <span className="text-[10px] font-bold text-text-secondary">{xp.level}</span>
        {xp.current_streak > 0 && (
          <span className="flex items-center text-[10px] text-orange-400">
            <Flame className="h-3 w-3" />
            {xp.current_streak}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="px-2 py-2">
      <button
        onClick={toggleExpanded}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg-overlay"
      >
        <span className="text-base">{xp.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary">
              {xp.title} <span className="text-text-tertiary">Lv {xp.level}</span>
            </span>
            <div className="flex items-center gap-1">
              {xp.current_streak > 0 && (
                <span className="flex items-center gap-0.5 text-[11px] font-medium text-orange-400">
                  <Flame className="h-3 w-3" />
                  {xp.current_streak}
                </span>
              )}
              {expanded ? (
                <ChevronUp className="h-3 w-3 text-text-tertiary" />
              ) : (
                <ChevronDown className="h-3 w-3 text-text-tertiary" />
              )}
            </div>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-overlay">
            <div
              className={cn('h-full rounded-full transition-all duration-500 ease-out', barColor)}
              style={{ width: `${xp.progress}%` }}
            />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 rounded-md bg-bg-overlay px-3 py-2 text-[11px]">
          <div className="flex justify-between text-text-secondary">
            <span>Total XP</span>
            <span className="font-medium text-text-primary">{xp.total_xp.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Next level</span>
            <span className="font-medium text-text-primary">{xp.xp_to_next_level.toLocaleString()} XP</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Streak</span>
            <span className="font-medium text-text-primary">{xp.current_streak} days</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Best streak</span>
            <span className="font-medium text-text-primary">{xp.longest_streak} days</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Freezes left</span>
            <span className="font-medium text-text-primary">{xp.streak_freezes}</span>
          </div>
        </div>
      )}
    </div>
  );
}
