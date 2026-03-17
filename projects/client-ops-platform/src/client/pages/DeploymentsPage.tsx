import { useState, type FormEvent } from 'react';
import { useOrgQuery, useOrgMutation } from '../hooks/use-org-query';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Rocket } from 'lucide-react';

type DeploymentTarget = {
  id: string;
  name: string;
  targetType: string;
  status: string;
  isPrimary: boolean;
  createdAt: string;
};

type DeploymentJob = {
  id: string;
  jobType: string;
  status: string;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};

type CreateTargetInput = {
  name: string;
  targetType: string;
  config: Record<string, unknown>;
  isPrimary?: boolean;
};

type CreateJobInput = {
  deploymentTargetId: string;
  jobType: string;
};

const targetTypes = [
  { value: 'sftp', label: 'SFTP' },
  { value: 'local_fs', label: 'Local Filesystem' },
  { value: 's3', label: 'AWS S3' },
  { value: 'github_pages', label: 'GitHub Pages' },
  { value: 'netlify', label: 'Netlify' },
  { value: 'vercel', label: 'Vercel' },
  { value: 'cloudflare_pages', label: 'Cloudflare Pages' },
];

const jobTypes = ['publish', 'rollback', 'preview', 'backup_deploy'];

const configTemplates: Record<string, Record<string, string>> = {
  sftp: { host: '', port: '22', username: '', remotePath: '/var/www' },
  local_fs: { path: '/var/www/html' },
  s3: { bucket: '', region: 'eu-west-1', prefix: '' },
  github_pages: { repo: '', branch: 'gh-pages' },
  netlify: { siteId: '' },
  vercel: { projectId: '' },
  cloudflare_pages: { projectName: '' },
};

export function DeploymentsPage() {
  const targets = useOrgQuery<DeploymentTarget[]>('deployment-targets', 'deployment-targets');
  const jobs = useOrgQuery<DeploymentJob[]>('jobs', 'jobs');
  const createTarget = useOrgMutation<CreateTargetInput>('deployment-targets', 'post', ['deployment-targets', 'activity']);
  const createJob = useOrgMutation<CreateJobInput>('jobs', 'post', ['jobs', 'activity']);

  const [showTargetForm, setShowTargetForm] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);

  // Target form
  const [targetName, setTargetName] = useState('');
  const [targetType, setTargetType] = useState('sftp');
  const [targetConfig, setTargetConfig] = useState(JSON.stringify(configTemplates.sftp, null, 2));
  const [targetIsPrimary, setTargetIsPrimary] = useState(false);

  // Job form
  const [jobTargetId, setJobTargetId] = useState('');
  const [jobType, setJobType] = useState('publish');

  function handleTargetTypeChange(newType: string) {
    setTargetType(newType);
    setTargetConfig(JSON.stringify(configTemplates[newType] ?? {}, null, 2));
  }

  function handleTargetSubmit(e: FormEvent) {
    e.preventDefault();
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(targetConfig);
    } catch {
      alert('Invalid JSON in config field');
      return;
    }
    createTarget.mutate(
      { name: targetName, targetType, config, isPrimary: targetIsPrimary },
      {
        onSuccess: () => {
          setTargetName('');
          setTargetType('sftp');
          setTargetConfig(JSON.stringify(configTemplates.sftp, null, 2));
          setTargetIsPrimary(false);
          setShowTargetForm(false);
        },
      },
    );
  }

  function handleJobSubmit(e: FormEvent) {
    e.preventDefault();
    createJob.mutate(
      { deploymentTargetId: jobTargetId, jobType },
      {
        onSuccess: () => {
          setJobTargetId('');
          setJobType('publish');
          setShowJobForm(false);
        },
      },
    );
  }

  const isLoading = targets.isLoading || jobs.isLoading;
  const error = targets.error || jobs.error;

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-8"><ErrorMessage message={error.message} /></div>;

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Deployments"
        description="Manage deployment targets and run jobs"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => { setShowJobForm(!showJobForm); setShowTargetForm(false); }}
              disabled={!targets.data || targets.data.length === 0}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {showJobForm ? 'Cancel' : 'Deploy'}
            </button>
            <button
              onClick={() => { setShowTargetForm(!showTargetForm); setShowJobForm(false); }}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
            >
              {showTargetForm ? 'Cancel' : 'Add Target'}
            </button>
          </div>
        }
      />

      {showTargetForm && (
        <Card title="New Deployment Target">
          <form onSubmit={handleTargetSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Production SFTP"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={targetType}
                  onChange={(e) => handleTargetTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {targetTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Config (JSON)</label>
              <textarea
                value={targetConfig}
                onChange={(e) => setTargetConfig(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={targetIsPrimary}
                onChange={(e) => setTargetIsPrimary(e.target.checked)}
                className="rounded border-gray-300"
              />
              Primary target
            </label>

            {createTarget.error && <ErrorMessage message={createTarget.error.message} />}

            <button
              type="submit"
              disabled={createTarget.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createTarget.isPending ? 'Creating...' : 'Create Target'}
            </button>
          </form>
        </Card>
      )}

      {showJobForm && targets.data && targets.data.length > 0 && (
        <Card title="Run Deployment Job">
          <form onSubmit={handleJobSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
                <select
                  value={jobTargetId}
                  onChange={(e) => setJobTargetId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select target...</option>
                  {targets.data.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.targetType})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {jobTypes.map((j) => (
                    <option key={j} value={j} className="capitalize">{j.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            {createJob.error && <ErrorMessage message={createJob.error.message} />}

            <button
              type="submit"
              disabled={createJob.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createJob.isPending ? 'Starting...' : 'Start Job'}
            </button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Deployment Targets">
          {!targets.data || targets.data.length === 0 ? (
            <EmptyState icon={Rocket} title="No targets" description="Add a deployment target to get started." />
          ) : (
            <div className="space-y-3">
              {targets.data.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {t.name}
                      {t.isPrimary && <span className="ml-2 text-xs text-blue-600">(primary)</span>}
                    </p>
                    <p className="text-xs text-gray-500">{t.targetType.replace(/_/g, ' ')}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent Jobs">
          {!jobs.data || jobs.data.length === 0 ? (
            <EmptyState icon={Rocket} title="No jobs" description="Deploy to create your first job." />
          ) : (
            <div className="space-y-3">
              {jobs.data.map((j) => (
                <div key={j.id} className="py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 capitalize">{j.jobType.replace(/_/g, ' ')}</p>
                    <StatusBadge status={j.status} />
                  </div>
                  {j.errorMessage && <p className="text-xs text-red-600 mt-1">{j.errorMessage}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    <span>{new Date(j.createdAt).toLocaleString()}</span>
                    {j.finishedAt && <span>· Done {new Date(j.finishedAt).toLocaleString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
