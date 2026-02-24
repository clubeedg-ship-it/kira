import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '../../lib/cn';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '../ui';
import type { TopPriorityItem } from './types';

type PriorityVariant = 'danger' | 'warning' | 'info' | 'default';

const PRIORITY_META: Record<number, { label: string; variant: PriorityVariant }> = {
  0: { label: 'Critical', variant: 'danger' },
  1: { label: 'High', variant: 'warning' },
  2: { label: 'Medium', variant: 'info' },
  3: { label: 'Low', variant: 'default' },
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
});

interface TopPrioritiesProps {
  className?: string;
  items: TopPriorityItem[];
}

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) {
    return 'No due date';
  }

  const parsedDate = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return dueDate;
  }

  return dateFormatter.format(parsedDate);
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) {
    return false;
  }

  return new Date(`${dueDate}T23:59:59`).getTime() < Date.now();
}

export default function TopPriorities({ className, items }: TopPrioritiesProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="mb-3">
        <CardTitle>Top Priorities</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? (
          items.map((item) => {
            const priority = PRIORITY_META[item.priority] ?? PRIORITY_META[3];

            return (
              <article key={item.id} className="rounded-md border border-border bg-bg-surface p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-text-primary">{item.title}</p>
                  <Badge variant={priority.variant} size="sm">
                    {priority.label}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-text-tertiary">{item.project ?? 'No project'}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-text-tertiary">score {item.priorityScore}</span>
                  <span className={cn('text-text-secondary', isOverdue(item.dueDate) ? 'text-error' : '')}>
                    {formatDueDate(item.dueDate)}
                  </span>
                </div>
              </article>
            );
          })
        ) : (
          <p className="text-sm text-text-secondary">No priority tasks yet.</p>
        )}

        <Link to="/operations" className="inline-flex items-center gap-1 text-sm font-medium text-primary-300 hover:text-primary-200">
          View all tasks
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
