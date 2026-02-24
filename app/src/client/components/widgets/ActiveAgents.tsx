import { Bot } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Card, CardContent, CardHeader, CardTitle } from '../ui';
import type { ActiveAgentItem } from './types';

interface ActiveAgentsProps {
  agents: ActiveAgentItem[];
  className?: string;
}

const STATUS_LABEL: Record<ActiveAgentItem['status'], string> = {
  idle: 'Idle',
  waiting: 'Waiting',
  working: 'Working',
};

const STATUS_DOT_CLASS: Record<ActiveAgentItem['status'], string> = {
  idle: 'bg-text-tertiary',
  waiting: 'bg-warning',
  working: 'bg-success',
};

export default function ActiveAgents({ agents, className }: ActiveAgentsProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="mb-3">
        <CardTitle className="inline-flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Active Agents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {agents.length ? (
          agents.map((agent) => (
            <article key={agent.id} className="rounded-md border border-border bg-bg-surface p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">{agent.name}</p>
                  <p className="mt-1 text-xs text-text-secondary">{agent.currentTask ?? 'Idle'}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-xs text-text-secondary">
                  <span
                    className={cn(
                      'inline-block h-2.5 w-2.5 rounded-full',
                      STATUS_DOT_CLASS[agent.status],
                      agent.status === 'working' ? 'animate-pulse' : '',
                    )}
                  />
                  {STATUS_LABEL[agent.status]}
                </span>
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm text-text-secondary">No agent activity yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
