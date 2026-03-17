import { useOrgQuery } from '../hooks/use-org-query';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { Server, Activity, LifeBuoy, Rocket } from 'lucide-react';

type Service = {
  id: string;
  name: string;
  type: string;
  status: string;
  healthStatus: string;
};

type ActivityEvent = {
  id: string;
  eventType: string;
  title: string;
  createdAt: string;
  source: string;
};

type SupportRequest = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
};

export function OverviewPage() {
  const services = useOrgQuery<Service[]>('services', 'services');
  const activity = useOrgQuery<ActivityEvent[]>('activity', 'activity?limit=5');
  const support = useOrgQuery<SupportRequest[]>('support', 'support');

  const isLoading = services.isLoading || activity.isLoading || support.isLoading;
  const error = services.error || activity.error || support.error;

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-8"><ErrorMessage message={error.message} /></div>;

  const activeServices = services.data?.filter((s) => s.status === 'active') ?? [];
  const openRequests = support.data?.filter((s) => s.status === 'open' || s.status === 'in_progress') ?? [];

  return (
    <div className="p-8 space-y-8">
      <PageHeader title="Overview" description="Your operations at a glance" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="!p-0">
          <div className="px-6 py-5 flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <Server className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-semibold">{activeServices.length}</p>
              <p className="text-sm text-gray-500">Active services</p>
            </div>
          </div>
        </Card>

        <Card className="!p-0">
          <div className="px-6 py-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Activity className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-semibold">{activity.data?.length ?? 0}</p>
              <p className="text-sm text-gray-500">Recent events</p>
            </div>
          </div>
        </Card>

        <Card className="!p-0">
          <div className="px-6 py-5 flex items-center gap-4">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <LifeBuoy className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-semibold">{openRequests.length}</p>
              <p className="text-sm text-gray-500">Open requests</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Services">
          {services.data && services.data.length > 0 ? (
            <div className="space-y-3">
              {services.data.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.type.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge status={s.status} />
                    <StatusBadge status={s.healthStatus} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No services configured yet.</p>
          )}
        </Card>

        <Card title="Recent Activity">
          {activity.data && activity.data.length > 0 ? (
            <div className="space-y-3">
              {activity.data.map((e) => (
                <div key={e.id} className="flex items-start gap-3 py-2">
                  <div className="mt-0.5 p-1 bg-gray-100 rounded">
                    <Activity size={14} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{e.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(e.createdAt).toLocaleString()} · {e.source}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recent activity.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
