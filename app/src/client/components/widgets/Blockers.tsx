import { AlertOctagon } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Card, CardContent, CardHeader, CardTitle } from '../ui';
import type { BlockerItem } from './types';

interface BlockersProps {
  className?: string;
  items: BlockerItem[];
}

export default function Blockers({ className, items }: BlockersProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="mb-3">
        <CardTitle className="inline-flex items-center gap-2 text-error">
          <AlertOctagon className="h-5 w-5" />
          Blockers & Warnings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <article key={item.id} className="rounded-md border border-error/50 bg-error/10 p-3">
              <p className="text-sm font-medium text-text-primary">{item.title}</p>
              <p className="mt-1 text-xs text-text-secondary">{item.reason}</p>
            </article>
          ))
        ) : (
          <p className="text-sm text-text-secondary">No blockers right now.</p>
        )}
      </CardContent>
    </Card>
  );
}
