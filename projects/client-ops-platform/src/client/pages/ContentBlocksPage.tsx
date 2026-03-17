import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { FileText, ChevronDown, ChevronUp, Eye } from 'lucide-react';

type ContentBlock = {
  id: string;
  key: string;
  label: string;
  type: string;
  status: string;
  value: Record<string, unknown>;
  version: number;
  updatedAt: string;
};

type PublishedSnapshot = {
  branding: Record<string, unknown>;
  blocks: Record<string, unknown>;
};

const blockTypes = ['hero', 'text', 'cta', 'faq', 'testimonial', 'gallery', 'contact', 'custom'];
const blockStatuses = ['draft', 'published', 'archived'];

export function ContentBlocksPage() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  const { data: blocks, isLoading, error } = useQuery<ContentBlock[]>({
    queryKey: ['content-blocks', orgId],
    queryFn: () => api.get<ContentBlock[]>(`/orgs/${orgId}/content-blocks`),
    enabled: !!orgId,
  });

  const { data: snapshot } = useQuery<PublishedSnapshot>({
    queryKey: ['snapshot', orgId],
    queryFn: () => api.get<PublishedSnapshot>(`/orgs/${orgId}/snapshot`),
    enabled: !!orgId,
  });

  const upsertMutation = useMutation({
    mutationFn: ({ key, ...body }: { key: string; label: string; type: string; status: string; value: Record<string, unknown> }) =>
      api.put(`/orgs/${orgId}/content-blocks/${key}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-blocks', orgId] });
      queryClient.invalidateQueries({ queryKey: ['snapshot', orgId] });
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formType, setFormType] = useState('text');
  const [formStatus, setFormStatus] = useState('draft');
  const [formValue, setFormValue] = useState('{}');

  function openNewForm() {
    setEditingKey(null);
    setFormKey('');
    setFormLabel('');
    setFormType('text');
    setFormStatus('draft');
    setFormValue('{}');
    setShowForm(true);
  }

  function openEditForm(block: ContentBlock) {
    setEditingKey(block.key);
    setFormKey(block.key);
    setFormLabel(block.label);
    setFormType(block.type);
    setFormStatus(block.status);
    setFormValue(JSON.stringify(block.value, null, 2));
    setShowForm(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    let parsedValue: Record<string, unknown>;
    try {
      parsedValue = JSON.parse(formValue);
    } catch {
      alert('Invalid JSON in value field');
      return;
    }

    const key = editingKey || formKey.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    upsertMutation.mutate(
      { key, label: formLabel, type: formType, status: formStatus, value: parsedValue },
      {
        onSuccess: () => {
          setShowForm(false);
          setEditingKey(null);
        },
      },
    );
  }

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-8"><ErrorMessage message={error.message} /></div>;

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Content Blocks"
        description="Edit your static website sections — hero, about, CTA, FAQ, and more"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Eye size={16} />
              {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
            <button
              onClick={() => showForm ? setShowForm(false) : openNewForm()}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
            >
              {showForm ? 'Cancel' : 'Add Block'}
            </button>
          </div>
        }
      />

      {showPreview && snapshot && (
        <Card title="Published Snapshot Preview">
          <div className="space-y-4">
            {snapshot.branding && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Branding</h4>
                <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto max-h-40">
                  {JSON.stringify(snapshot.branding, null, 2)}
                </pre>
              </div>
            )}
            {snapshot.blocks && Object.keys(snapshot.blocks).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Content Blocks</h4>
                <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto max-h-60">
                  {JSON.stringify(snapshot.blocks, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>
      )}

      {showForm && (
        <Card title={editingKey ? `Edit: ${editingKey}` : 'New Content Block'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
                <input
                  type="text"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  disabled={!!editingKey}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="e.g. hero, about, faq"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Hero Section"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {blockTypes.map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {blockStatuses.map((s) => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value (JSON)
              </label>
              <textarea
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder='{"title": "Welcome", "description": "Your text here"}'
              />
              <p className="text-xs text-gray-400 mt-1">
                Structure depends on block type. Common fields: title, description, items[], cta.label, cta.action
              </p>
            </div>

            {upsertMutation.error && <ErrorMessage message={upsertMutation.error.message} />}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={upsertMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {upsertMutation.isPending ? 'Saving...' : editingKey ? 'Update Block' : 'Create Block'}
              </button>
              {editingKey && formStatus !== 'published' && (
                <button
                  type="button"
                  onClick={() => {
                    setFormStatus('published');
                    // Auto-submit with published status
                  }}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                >
                  Publish
                </button>
              )}
            </div>
          </form>
        </Card>
      )}

      {!blocks || blocks.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No content blocks"
          description="Create your first content block to build your static website."
          action={
            !showForm ? (
              <button
                onClick={openNewForm}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
              >
                Add Block
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {blocks.map((block) => (
            <div key={block.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedBlock(expandedBlock === block.key ? null : block.key)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{block.label}</h3>
                    <p className="text-xs text-gray-500">
                      Key: <code className="bg-gray-100 px-1 rounded">{block.key}</code> · Type: {block.type} · v{block.version}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={block.status} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditForm(block);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Edit
                  </button>
                  {expandedBlock === block.key ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {expandedBlock === block.key && (
                <div className="px-6 pb-4 border-t border-gray-100 pt-3">
                  <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto max-h-60">
                    {JSON.stringify(block.value, null, 2)}
                  </pre>
                  <p className="text-xs text-gray-400 mt-2">
                    Last updated: {new Date(block.updatedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
