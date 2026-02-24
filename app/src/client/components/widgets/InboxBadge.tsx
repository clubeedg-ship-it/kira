import { Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '../../lib/cn';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '../ui';
import type { InboxBadgeData } from './types';

interface InboxBadgeProps {
  className?: string;
  data: InboxBadgeData;
}

function formatType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function InboxBadge({ className, data }: InboxBadgeProps) {
  return (
    <Link to="/inbox" className="block">
      <Card className={cn('transition-colors duration-fast hover:border-primary-300', className)}>
        <CardHeader className="mb-2">
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Inbox
            </span>
            <Badge variant="primary" size="md">
              {data.pendingCount}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-text-secondary">Pending input queue items</p>
          {data.breakdown.length ? (
            <div className="flex flex-wrap gap-2">
              {data.breakdown.map((entry) => (
                <Badge key={entry.type} variant="default">
                  {formatType(entry.type)}: {entry.count}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">No pending items.</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
