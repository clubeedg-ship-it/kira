import { Target } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Card, CardContent, CardHeader, CardTitle, ProgressBar } from '../ui';
import type { ObjectiveProgressItem } from './types';

interface KeyResultProgressProps {
  className?: string;
  objectives: ObjectiveProgressItem[];
}

function getProgressColor(progress: number): string {
  if (progress <= 33) {
    return 'bg-error';
  }

  if (progress <= 66) {
    return 'bg-warning';
  }

  return 'bg-success';
}

export default function KeyResultProgress({ className, objectives }: KeyResultProgressProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="mb-3">
        <CardTitle className="inline-flex items-center gap-2">
          <Target className="h-5 w-5" />
          Key Result Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {objectives.length ? (
          objectives.map((objective) => (
            <article key={objective.id} className="rounded-md border border-border bg-bg-surface p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-text-primary">{objective.title}</p>
                <span className="text-xs text-text-secondary">{objective.progress}%</span>
              </div>

              <ProgressBar value={objective.progress} colorClassName={getProgressColor(objective.progress)} />

              <div className="mt-3 space-y-2">
                {objective.keyResults.map((result) => (
                  <div key={result.id} className="rounded bg-bg-overlay/60 px-2 py-1.5">
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="text-text-secondary">{result.label}</span>
                      <span className="font-mono text-text-tertiary">
                        {result.current}/{result.target}
                      </span>
                    </div>
                    <ProgressBar value={result.progress} colorClassName={getProgressColor(result.progress)} />
                  </div>
                ))}
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm text-text-secondary">No objectives are tracking progress yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
