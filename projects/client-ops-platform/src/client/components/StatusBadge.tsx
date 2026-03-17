const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  healthy: 'bg-green-100 text-green-800',
  connected: 'bg-green-100 text-green-800',
  published: 'bg-green-100 text-green-800',
  ready: 'bg-green-100 text-green-800',
  restored: 'bg-green-100 text-green-800',
  success: 'bg-green-100 text-green-800',
  open: 'bg-blue-100 text-blue-800',
  draft: 'bg-gray-100 text-gray-800',
  setup: 'bg-gray-100 text-gray-800',
  disconnected: 'bg-gray-100 text-gray-800',
  queued: 'bg-gray-100 text-gray-800',
  unknown: 'bg-gray-100 text-gray-800',
  creating: 'bg-blue-100 text-blue-800',
  publishing: 'bg-blue-100 text-blue-800',
  running: 'bg-blue-100 text-blue-800',
  restoring: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  warning: 'bg-yellow-100 text-yellow-800',
  degraded: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-yellow-100 text-yellow-800',
  paused: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
  down: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
  resolved: 'bg-purple-100 text-purple-800',
  closed: 'bg-purple-100 text-purple-800',
  rolled_back: 'bg-orange-100 text-orange-800',
  archived: 'bg-gray-100 text-gray-600',
};

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] ?? 'bg-gray-100 text-gray-800';
  const label = status.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${style}`}>
      {label}
    </span>
  );
}
