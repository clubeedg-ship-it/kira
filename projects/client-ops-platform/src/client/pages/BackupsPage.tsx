import { useState } from 'react';
import { useOrgQuery, useOrgMutation } from '../hooks/use-org-query';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Archive } from 'lucide-react';

type Backup = {
  id: string;
  kind: string;
  status: string;
  sizeBytes: string | null;
  checksum: string | null;
  createdAt: string;
  restoredAt: string | null;
};

type CreateInput = { kind: string };

const backupKinds = [
  { value: 'site_bundle', label: 'Full Site Bundle' },
  { value: 'database', label: 'Database' },
  { value: 'media', label: 'Media Files' },
  { value: 'config', label: 'Configuration' },
];

function formatBytes(bytes: string | null): string {
  if (!bytes) return '—';
  const n = parseInt(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupsPage() {
  const { data, isLoading, error } = useOrgQuery<Backup[]>('backups', 'backups');
  const createMutation = useOrgMutation<CreateInput>('backups', 'post', ['backups', 'activity', 'audit']);

  const [selectedKind, setSelectedKind] = useState('site_bundle');

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-8"><ErrorMessage message={error.message} /></div>;

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Backups"
        description="Create and manage site backups"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {backupKinds.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
            <button
              onClick={() => createMutation.mutate({ kind: selectedKind })}
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Backup'}
            </button>
          </div>
        }
      />

      {createMutation.error && <ErrorMessage message={createMutation.error.message} />}

      {!data || data.length === 0 ? (
        <EmptyState icon={Archive} title="No backups" description="Create your first backup using the button above." />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kind</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restored</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {data.map((backup) => (
                <tr key={backup.id}>
                  <td className="px-6 py-4 text-sm text-gray-900 capitalize">{backup.kind.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-4"><StatusBadge status={backup.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatBytes(backup.sizeBytes)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(backup.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {backup.restoredAt ? new Date(backup.restoredAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
