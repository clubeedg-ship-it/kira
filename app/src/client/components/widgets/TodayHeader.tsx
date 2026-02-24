import { AlertTriangle, CalendarDays, ListChecks } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Card } from '../ui';
import type { TodayHeaderData } from './types';

interface TodayHeaderProps {
  className?: string;
  data: TodayHeaderData;
}

export default function TodayHeader({ className, data }: TodayHeaderProps) {
  return (
    <Card className={cn('relative overflow-hidden border-border/80 bg-bg-raised', className)}>
      <div className="pointer-events-none absolute inset-0 kira-glow" aria-hidden="true" />
      <div className="relative">
        <h1 className="font-display text-2xl font-semibold text-text-primary md:text-3xl">{data.greeting}</h1>
        <p className="mt-1 inline-flex items-center gap-2 text-sm text-text-secondary">
          <CalendarDays className="h-4 w-4" />
          {data.dateLabel}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-bg-overlay px-3 py-1 text-text-secondary">
            <ListChecks className="h-4 w-4" />
            {data.tasksToday} tasks today
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-bg-overlay px-3 py-1 text-text-secondary">
            <AlertTriangle className="h-4 w-4" />
            {data.needAttention} need attention
          </span>
        </div>
      </div>
    </Card>
  );
}
