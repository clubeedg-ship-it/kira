import { useOrgQuery } from '../hooks/use-org-query';
import { PageHeader } from '../components/PageHeader';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Activity } from 'lucide-react';

type ActivityEvent = {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  source: string;
  createdAt: string;
};

const sourceColors: Record<string, string> = {
  admin: 'bg-blue-100 text-blue-700',
  system: 'bg-gray-100 text-gray-700',
  client: 'bg-green-100 text-green-700',
  integration: 'bg-purple-100 text-purple-700',
  worker: 'bg-orange-100 text-orange-700',
};

export function ActivityPage() {
  const { data, isLoading, error } = useOrgQuery<ActivityEvent[]>('activity', 'activity?limit=50');

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-8"><ErrorMessage message={error.message} /></div>;

  return (
    <div className="p-8 space-y-6">
      <PageHeader title="Activity" description="Recent events and operations" />

      {!data || data.length === 0 ? (
        <EmptyState icon={Activity} title="No activity" description="No events have been recorded yet." />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y divide-gray-100">
          {data.map((event) => (
            <div key={event.id} className="px-6 py-4 flex items-start gap-4">
              <div className="mt-0.5 p-2 bg-gray-50 rounded-lg shrink-0">
                <Activity size={16} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{event.title}</p>
                {event.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{event.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sourceColors[event.source] ?? sourceColors.system}`}>
                    {event.source}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
