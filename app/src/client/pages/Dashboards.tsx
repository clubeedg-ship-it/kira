import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Flame,
  Layers,
  ListTodo,
  MessageSquare,
  Network,
  ShieldAlert,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';

import { apiRequest } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { useTaskQueryParam } from '../hooks/useTaskQueryParam';

// ── Types ──────────────────────────────────────────────────────────────────

interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | null;
  updatedAt: string;
}

interface DashboardStats {
  tasks: { total: number; todo: number; inProgress: number; done: number; blocked: number };
  projects: { total: number; active: number };
  documents: { total: number };
  entities: { total: number };
  conversations: { total: number; messagesTotal: number };
  xp: { level: number; currentXp: number; streak: number };
  recentActivity: { type: string; title: string; timestamp: string }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function xpForLevel(level: number): number {
  return level * 100;
}

// ── Donut Chart (pure SVG) ─────────────────────────────────────────────────

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

function DonutChart({ segments, size = 160 }: { segments: DonutSegment[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 36 36" className="mx-auto">
        <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" className="text-zinc-800" />
      </svg>
    );
  }

  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox="0 0 36 36" className="mx-auto -rotate-90">
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dashLen = pct * circumference;
        const dashOffset = -offset;
        offset += dashLen;
        return (
          <circle
            key={i}
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth="4"
            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        );
      })}
    </svg>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  value,
  label,
  accent = 'text-violet-400',
}: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  accent?: string;
}) {
  return (
    <Card className="flex items-center gap-4 bg-zinc-900/60 border-zinc-800 p-4">
      <div className={`rounded-lg bg-zinc-800/80 p-2.5 ${accent}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-100">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </Card>
  );
}

// ── Activity Icon ──────────────────────────────────────────────────────────

function ActivityIcon({ type }: { type: string }) {
  if (type === 'task_completed') return <CheckCircle2 size={16} className="text-emerald-400" />;
  if (type === 'message_sent') return <MessageSquare size={16} className="text-sky-400" />;
  return <Circle size={16} className="text-violet-400" />;
}

// ── Main Component ─────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  todo: 'text-zinc-400',
  in_progress: 'text-yellow-400',
  done: 'text-emerald-400',
  blocked: 'text-red-400',
  review: 'text-violet-400',
  waiting: 'text-amber-400',
};

const priorityLabels: Record<number, { label: string; color: string }> = {
  0: { label: 'Critical', color: 'text-red-400' },
  1: { label: 'High', color: 'text-orange-400' },
  2: { label: 'Medium', color: 'text-sky-400' },
  3: { label: 'Low', color: 'text-zinc-500' },
};

export default function Dashboards() {
  const { openTask } = useTaskQueryParam();
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboards', 'stats'],
    queryFn: () => apiRequest<DashboardStats>('/api/v1/dashboards/stats'),
  });

  const { data: recentTasks } = useQuery<RecentTask[]>({
    queryKey: ['dashboards', 'recent-tasks'],
    queryFn: () => apiRequest<RecentTask[]>('/api/v1/dashboards/recent-tasks'),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  const donutSegments: DonutSegment[] = [
    { value: data.tasks.todo, color: '#a78bfa', label: 'To Do' },
    { value: data.tasks.inProgress, color: '#facc15', label: 'In Progress' },
    { value: data.tasks.done, color: '#34d399', label: 'Done' },
    { value: data.tasks.blocked, color: '#f87171', label: 'Blocked' },
  ];

  const xpNeeded = xpForLevel(data.xp.level);
  const xpInLevel = data.xp.currentXp % xpNeeded || (data.xp.currentXp > 0 ? xpNeeded : 0);
  const xpPct = Math.min(100, (xpInLevel / xpNeeded) * 100);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>

      {/* ── Stats Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard icon={ListTodo} value={data.tasks.total} label="Total Tasks" />
        <StatCard icon={Layers} value={data.projects.active} label="Active Projects" accent="text-sky-400" />
        <StatCard icon={FileText} value={data.documents.total} label="Documents" accent="text-amber-400" />
        <StatCard icon={Trophy} value={data.xp.level} label="Level" accent="text-emerald-400" />
        <StatCard icon={Flame} value={data.xp.streak} label="Day Streak" accent="text-orange-400" />
      </div>

      {/* ── Two-column: Donut + Activity ──────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Task Breakdown */}
        <Card className="bg-zinc-900/60 border-zinc-800 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Task Breakdown</h2>
          <DonutChart segments={donutSegments} />
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {donutSegments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                {seg.label} ({seg.value})
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-zinc-900/60 border-zinc-800 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Recent Activity</h2>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-zinc-600">No recent activity yet.</p>
          ) : (
            <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {data.recentActivity.map((ev, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <ActivityIcon type={ev.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-300">{ev.title}</p>
                    <p className="text-xs text-zinc-600">{relativeTime(ev.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── XP Progress ───────────────────────────────────────────── */}
      <Card className="bg-zinc-900/60 border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">XP Progress</h2>
          <div className="flex items-center gap-2 text-zinc-400">
            <Sparkles size={14} className="text-violet-400" />
            <span className="text-sm font-medium text-zinc-300">{data.xp.currentXp} XP</span>
          </div>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-700"
            style={{ width: `${xpPct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
          <span>Level {data.xp.level}</span>
          <span>{Math.round(xpPct)}% to Level {data.xp.level + 1}</span>
        </div>
        {data.xp.streak > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-orange-400">
            <Flame size={16} />
            <span>{data.xp.streak}-day streak — keep it going!</span>
          </div>
        )}
      </Card>

      {/* ── Recent Tasks ─────────────────────────────────────────── */}
      <Card className="bg-zinc-900/60 border-zinc-800 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Recent Tasks</h2>
        {!recentTasks || recentTasks.length === 0 ? (
          <p className="text-sm text-zinc-600">No tasks yet.</p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {recentTasks.map((task) => {
              const pri = priorityLabels[task.priority] ?? priorityLabels[2];
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => openTask(task.id)}
                    className="flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2.5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/70"
                  >
                    <Clock size={14} className={statusColors[task.status] ?? 'text-zinc-400'} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-200">{task.title}</p>
                      <p className="text-xs text-zinc-500">
                        <span className={pri.color}>{pri.label}</span>
                        {' · '}
                        <span className="capitalize">{task.status.replace('_', ' ')}</span>
                        {task.dueDate && <> · Due {task.dueDate}</>}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* ── Extra stats row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Network} value={data.entities.total} label="Knowledge Entities" accent="text-purple-400" />
        <StatCard icon={MessageSquare} value={data.conversations.total} label="Conversations" accent="text-sky-400" />
        <StatCard icon={Zap} value={data.conversations.messagesTotal} label="Messages" accent="text-yellow-400" />
        <StatCard icon={ShieldAlert} value={data.tasks.blocked} label="Blocked Tasks" accent="text-red-400" />
      </div>
    </div>
  );
}
