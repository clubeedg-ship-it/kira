import { CheckCircle2 } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Card, CardContent, CardHeader, CardTitle } from '../ui';
import type { RecentCompletionItem } from './types';

interface RecentCompletionsProps {
  className?: string;
  items: RecentCompletionItem[];
}

function formatTimeAgo(completedAt: string | null): string {
  if (!completedAt) {
    return 'Recently';
  }

  const completedTime = new Date(completedAt).getTime();
  if (Number.isNaN(completedTime)) {
    return 'Recently';
  }

  const diffMs = Date.now() - completedTime;
  if (diffMs < 60_000) {
    return 'just now';
  }

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function RecentCompletions({ className, items }: RecentCompletionsProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="mb-3">
        <CardTitle>Recent Completions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <article key={item.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-bg-surface px-3 py-2">
              <p className="text-sm text-text-primary">{item.title}</p>
              <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                {formatTimeAgo(item.completedAt)}
              </span>
            </article>
          ))
        ) : (
          <p className="text-sm text-text-secondary">No completed tasks yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
