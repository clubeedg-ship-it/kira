import { useState, type FormEvent } from 'react';
import { useOrgQuery, useOrgMutation } from '../hooks/use-org-query';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Server } from 'lucide-react';

type Service = {
  id: string;
  name: string;
  type: string;
  status: string;
  healthStatus: string;
  description: string | null;
  externalUrl: string | null;
  lastCheckedAt: string | null;
};

type CreateInput = {
  name: string;
  type: string;
  status: string;
  description?: string;
  externalUrl?: string;
};

const serviceTypes = [
  { value: 'website', label: 'Website' },
  { value: 'cms', label: 'CMS' },
  { value: 'email', label: 'Email' },
  { value: 'dns', label: 'DNS' },
  { value: 'hosting', label: 'Hosting' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'custom', label: 'Custom' },
];

const serviceStatuses = ['active', 'paused', 'error', 'setup'];

export function ServicesPage() {
  const { data, isLoading, error } = useOrgQuery<Service[]>('services', 'services');
  const createMutation = useOrgMutation<CreateInput>('services', 'post', ['services', 'activity']);
  const statusMutation = useOrgMutation<{ status: string }, unknown>('', 'patch', ['services', 'activity']);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('website');
  const [status, setStatus] = useState('active');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const input: CreateInput = { name, type, status };
    if (description.trim()) input.description = description.trim();
    if (externalUrl.trim()) input.externalUrl = externalUrl.trim();
    createMutation.mutate(input, {
      onSuccess: () => {
        setName('');
        setType('website');
        setStatus('active');
        setDescription('');
        setExternalUrl('');
        setShowForm(false);
      },
    });
  }

  function handleStatusChange(serviceId: string, newStatus: string) {
    statusMutation.mutate(
      { status: newStatus },
      { mutationKey: [`services/${serviceId}/status`] } as any,
    );
  }

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-8"><ErrorMessage message={error.message} /></div>;

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Services"
        description="Manage client services and monitor their health"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
          >
            {showForm ? 'Cancel' : 'Add Service'}
          </button>
        }
      />

      {showForm && (
        <Card title="Add Service">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={200}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Main Website"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {serviceTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {serviceStatuses.map((s) => (
                    <option key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">External URL</label>
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={1000}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of this service"
              />
            </div>

            {createMutation.error && <ErrorMessage message={createMutation.error.message} />}

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Adding...' : 'Add Service'}
            </button>
          </form>
        </Card>
      )}

      {!data || data.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No services"
          description="Add your first service to start monitoring."
          action={
            !showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
              >
                Add Service
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((service) => (
            <Card key={service.id} className="!p-0">
              <div className="px-6 py-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{service.name}</h3>
                    <p className="text-xs text-gray-500 capitalize">{service.type.replace(/_/g, ' ')}</p>
                  </div>
                  <StatusBadge status={service.healthStatus} />
                </div>

                {service.description && (
                  <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <select
                    value={service.status}
                    onChange={(e) => handleStatusChange(service.id, e.target.value)}
                    className="text-xs px-2 py-1 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {serviceStatuses.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  {service.lastCheckedAt && (
                    <span className="text-xs text-gray-400">
                      Checked {new Date(service.lastCheckedAt).toLocaleString()}
                    </span>
                  )}
                </div>

                {service.externalUrl && (
                  <a
                    href={service.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block text-xs text-blue-600 hover:text-blue-800 truncate"
                  >
                    {service.externalUrl}
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
