import {
  Bot,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Brain,
  Network,
  Settings,
  Workflow,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/cn';
import { Avatar } from '../ui';
import XPBar from './XPBar';

interface SidebarProps {
  collapsed: boolean;
  canToggle: boolean;
  onToggle: () => void;
}

interface NavItem {
  labelKey: string;
  to: string;
  icon: typeof Home;
}

const navItems: NavItem[] = [
  { labelKey: 'nav.home', to: '/', icon: Home },
  { labelKey: 'nav.inbox', to: '/inbox', icon: Inbox },
  { labelKey: 'nav.chat', to: '/chat', icon: MessageSquare },
  { labelKey: 'nav.operations', to: '/operations', icon: Workflow },
  { labelKey: 'nav.documents', to: '/documents', icon: FileText },
  { labelKey: 'nav.knowledge', to: '/knowledge', icon: Network },
  { labelKey: 'nav.memory', to: '/memory', icon: Brain },
  { labelKey: 'nav.dashboards', to: '/dashboards', icon: LayoutDashboard },
  { labelKey: 'nav.skills', to: '/skills', icon: Zap },
  { labelKey: 'nav.settings', to: '/settings', icon: Settings },
  { labelKey: 'nav.agents', to: '/agents', icon: Bot }
];

function isActivePath(pathname: string, targetPath: string): boolean {
  if (targetPath === '/') {
    return pathname === '/';
  }

  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

function normalizePendingCount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }

  return null;
}

export default function Sidebar({ collapsed, canToggle, onToggle }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useI18n();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadPendingCount = async () => {
      try {
        const response = await fetch('/api/v1/input-queue/count', {
          credentials: 'include'
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json().catch(() => null)) as
          | {
              data?: {
                pendingCount?: unknown;
              };
            }
          | null;
        const nextPendingCount = normalizePendingCount(payload?.data?.pendingCount);
        if (isMounted && nextPendingCount !== null) {
          setPendingCount(nextPendingCount);
        }
      } catch {
        // Ignore transient network issues for nav badges.
      }
    };

    void loadPendingCount();

    const eventSource = new EventSource('/api/v1/events/stream?channels=input_queue');
    const onCountChanged = (event: Event) => {
      if (!(event instanceof MessageEvent) || typeof event.data !== 'string') {
        return;
      }

      try {
        const payload = JSON.parse(event.data) as {
          pendingCount?: unknown;
          pending_count?: unknown;
        };
        const nextPendingCount = normalizePendingCount(payload.pendingCount ?? payload.pending_count);
        if (nextPendingCount !== null) {
          setPendingCount(nextPendingCount);
        }
      } catch {
        // Ignore malformed event payloads.
      }
    };

    eventSource.addEventListener('input_queue.count_changed', onCountChanged as EventListener);

    return () => {
      isMounted = false;
      eventSource.removeEventListener('input_queue.count_changed', onCountChanged as EventListener);
      eventSource.close();
    };
  }, []);

  const inboxBadgeLabel = pendingCount > 99 ? '99+' : `${pendingCount}`;

  return (
    <aside
      className={cn(
        'z-sidebar flex h-screen shrink-0 flex-col border-r border-border bg-bg-surface px-2 py-3 transition-all duration-normal ease-in-out',
        collapsed ? 'w-16' : 'w-[240px]'
      )}
    >
      <div className={cn('mb-3 flex h-10 items-center', collapsed ? 'justify-center' : 'justify-between px-1')}>
        {!collapsed ? (
          <span className="truncate font-display text-lg font-semibold tracking-wide text-text-primary">KIRA</span>
        ) : null}
        <button
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-overlay hover:text-text-primary',
            !canToggle ? 'opacity-50' : ''
          )}
          onClick={onToggle}
          disabled={!canToggle}
          aria-label="Toggle sidebar"
          type="button"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="space-y-1" aria-label="Primary">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(location.pathname, item.to);
          const showInboxBadge = item.to === '/inbox' && pendingCount > 0;
          const label = t(item.labelKey);

          return (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? label : undefined}
              className={cn(
                'relative flex h-12 items-center rounded-md px-3 text-sm font-medium transition-colors duration-fast ease-out',
                collapsed ? 'justify-center' : 'gap-3',
                active
                  ? 'border-l-[3px] border-l-primary-400 bg-bg-overlay text-text-primary'
                  : 'text-text-secondary hover:bg-bg-overlay hover:text-text-primary'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed ? <span className="truncate">{label}</span> : null}
              {showInboxBadge ? (
                <span
                  className={cn(
                    'inline-flex items-center justify-center rounded-full bg-error px-1.5 py-0.5 text-[10px] font-semibold text-white',
                    collapsed ? 'absolute right-1.5 top-1.5 min-w-[20px]' : 'ml-auto min-w-[24px]'
                  )}
                >
                  {inboxBadgeLabel}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="border-t border-border">
          <XPBar collapsed={collapsed} />
        </div>
        <div className="border-t border-border pt-3">
          <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3 px-2')}>
            <Avatar size={collapsed ? 'sm' : 'md'} name={user?.name ?? undefined} src={user?.image ?? null} />
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">{user?.name ?? 'Kira User'}</p>
                <p className="truncate text-xs text-text-tertiary">{user?.email ?? 'Not signed in'}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
