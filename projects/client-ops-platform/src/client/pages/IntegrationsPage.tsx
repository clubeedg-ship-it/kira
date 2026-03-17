import { useState, type FormEvent } from 'react';
import { useOrgQuery, useOrgMutation } from '../hooks/use-org-query';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Plug } from 'lucide-react';

type Integration = {
  id: string;
  type: string;
  name: string;
  status: string;
  lastTestedAt: string | null;
  lastError: string | null;
  createdAt: string;
};

type CreateInput = { type: string; name: string };

const integrationTypes = [
  { value: 'ghost', label: 'Ghost CMS' },
  { value: 'retell', label: 'Retell AI' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'smtp', label: 'SMTP / Email' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'custom', label: 'Custom' },
];

export function IntegrationsPage() {
  const { data, isLoading, error } = useOrgQuery<Integration[]>('integrations', 'integrations');
  const createMutation = useOrgMutation<CreateInput>('integrations', 'post', ['integrations', 'activity']);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('ghost');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate({ name, type }, {
      onSuccess: () => {
        setName('');
        setType('ghost');
        setShowForm(false);
      },
    });
  }

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-8"><ErrorMessage message={error.message} /></div>;

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect external services and APIs"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
          >
            {showForm ? 'Cancel' : 'Add Integration'}
          </button>
        }
      />

      {showForm && (
        <Card title="New Integration">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Production Blog"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {integrationTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {createMutation.error && <ErrorMessage message={createMutation.error.message} />}

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Adding...' : 'Add Integration'}
            </button>
          </form>
        </Card>
      )}

      {!data || data.length === 0 ? (
        <EmptyState icon={Plug} title="No integrations" description="Connect your first service." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((integration) => (
            <Card key={integration.id} className="!p-0">
              <div className="px-6 py-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{integration.name}</h3>
                    <p className="text-xs text-gray-500 capitalize">{integration.type}</p>
                  </div>
                  <StatusBadge status={integration.status} />
                </div>

                {integration.lastError && (
                  <p className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">{integration.lastError}</p>
                )}

                <p className="text-xs text-gray-400 mt-3">
                  Created {new Date(integration.createdAt).toLocaleString()}
                  {integration.lastTestedAt && (
                    <> · Tested {new Date(integration.lastTestedAt).toLocaleString()}</>
                  )}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
