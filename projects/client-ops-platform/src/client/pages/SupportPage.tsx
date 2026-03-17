import { useState, type FormEvent } from 'react';
import { useOrgQuery, useOrgMutation } from '../hooks/use-org-query';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { LifeBuoy } from 'lucide-react';

type SupportRequest = {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  channel: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

type CreateInput = {
  subject: string;
  message: string;
  priority: string;
};

export function SupportPage() {
  const { data, isLoading, error } = useOrgQuery<SupportRequest[]>('support', 'support');
  const createMutation = useOrgMutation<CreateInput>('support', 'post', ['support', 'activity']);

  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate(
      { subject, message, priority },
      {
        onSuccess: () => {
          setSubject('');
          setMessage('');
          setPriority('normal');
          setShowForm(false);
        },
      },
    );
  }

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-8"><ErrorMessage message={error.message} /></div>;

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Support"
        description="Submit requests and track their status"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
          >
            {showForm ? 'Cancel' : 'New Request'}
          </button>
        }
      />

      {showForm && (
        <Card title="New Support Request">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of what you need"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                maxLength={5000}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the request in detail"
              />
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {createMutation.error && <ErrorMessage message={createMutation.error.message} />}

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </Card>
      )}

      {!data || data.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="No support requests" description="Submit a request using the button above." />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y divide-gray-100">
          {data.map((req) => (
            <div key={req.id} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{req.subject}</p>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{req.message}</p>
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <StatusBadge status={req.priority} />
                  <StatusBadge status={req.status} />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span>{new Date(req.createdAt).toLocaleString()}</span>
                {req.resolvedAt && <span>· Resolved {new Date(req.resolvedAt).toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
