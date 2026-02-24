import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  ActiveAgents,
  Blockers,
  InboxBadge,
  KeyResultProgress,
  RecentCompletions,
  TodayHeader,
  TopPriorities,
  type ActiveAgentItem,
  type BlockerItem,
  type InboxBadgeData,
  type ObjectiveProgressItem,
  type RecentCompletionItem,
  type TodayHeaderData,
  type TopPriorityItem,
} from '../components/widgets';
import { Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton } from '../components/ui';

interface CommandCenterView {
  activeAgents: ActiveAgentItem[];
  blockers: BlockerItem[];
  hasData: boolean;
  inboxBadge: InboxBadgeData;
  keyResultProgress: ObjectiveProgressItem[];
  recentCompletions: RecentCompletionItem[];
  todayHeader: TodayHeaderData;
  topPriorities: TopPriorityItem[];
}

interface CommandCenterResponse {
  data: CommandCenterView;
}

const COMMAND_CENTER_QUERY_KEY = ['command-center', 'view'] as const;

async function fetchCommandCenterView(): Promise<CommandCenterView> {
  const response = await fetch('/api/v1/views/command-center', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Unable to load command center.');
  }

  const payload = (await response.json()) as CommandCenterResponse;
  return payload.data;
}

function CommandCenterSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-2">
      <Skeleton className="h-36 lg:col-span-2" />
      <Skeleton className="h-72" />
      <Skeleton className="h-48" />
      <Skeleton className="h-72" />
      <Skeleton className="h-72" />
      <Skeleton className="h-56" />
      <Skeleton className="h-44 lg:col-span-2" />
    </div>
  );
}

export default function CommandCenter() {
  const navigate = useNavigate();

  const commandCenterQuery = useQuery({
    queryKey: COMMAND_CENTER_QUERY_KEY,
    queryFn: fetchCommandCenterView,
    staleTime: 30_000,
  });

  if (commandCenterQuery.isLoading) {
    return <CommandCenterSkeleton />;
  }

  if (commandCenterQuery.isError || !commandCenterQuery.data) {
    const message =
      commandCenterQuery.error instanceof Error
        ? commandCenterQuery.error.message
        : 'Unable to load command center.';

    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Unable to Load Command Center</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">{message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const viewData = commandCenterQuery.data;

  if (!viewData.hasData) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Sparkles className="h-10 w-10" />}
          title="Welcome to Kira"
          description="Let's set up your operating system. You can define structure first, or start chatting and let Kira learn from context."
          actionLabel="Open chat"
          onAction={() => navigate('/chat')}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-2">
      <TodayHeader className="order-1 lg:order-1 lg:col-span-2" data={viewData.todayHeader} />
      {viewData.blockers.length > 0 ? (
        <Blockers className="order-2 lg:order-7 lg:col-span-2" items={viewData.blockers} />
      ) : null}
      <TopPriorities className="order-3 lg:order-2" items={viewData.topPriorities} />
      <InboxBadge className="order-4 lg:order-3" data={viewData.inboxBadge} />
      <ActiveAgents className="order-5 lg:order-4" agents={viewData.activeAgents} />
      <KeyResultProgress className="order-6 lg:order-5" objectives={viewData.keyResultProgress} />
      <RecentCompletions className="order-7 lg:order-6" items={viewData.recentCompletions} />
    </div>
  );
}
