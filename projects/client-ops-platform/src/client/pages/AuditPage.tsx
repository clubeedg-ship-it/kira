import { useOrgQuery } from '../hooks/use-org-query';
import { PageHeader } from '../components/PageHeader';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Shield } from 'lucide-react';

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
};

export function AuditPage() {
  const { data, isLoading, error } = useOrgQuery<AuditLog[]>('audit', 'audit?limit=100');

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-8"><ErrorMessage message={error.message} /></div>;

  return (
    <div className="p-8 space-y-6">
      <PageHeader title="Audit Log" description="Security and operations trail" />

      {!data || data.length === 0 ? (
        <EmptyState icon={Shield} title="No audit logs" description="No auditable actions have been recorded." />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {data.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{log.action.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{log.entityType}</td>
                  <td className="px-6 py-4 text-sm text-gray-400 font-mono">{log.ipAddress ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
