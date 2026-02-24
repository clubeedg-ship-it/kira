import { Bell, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { Avatar, Button } from '../ui';

const segmentLabels: Record<string, string> = {
  inbox: 'Inbox',
  chat: 'Chat',
  operations: 'Operations',
  today: 'Today',
  board: 'Board',
  documents: 'Documents',
  knowledge: 'Knowledge',
  dashboards: 'Dashboards',
  settings: 'Settings',
  agents: 'Agents',
  signup: 'Signup',
  login: 'Login'
};

interface Crumb {
  label: string;
  to: string;
}

function getLabel(segment: string): string {
  return segmentLabels[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

function buildBreadcrumb(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);

  if (!segments.length) {
    return [{ label: 'Home', to: '/' }];
  }

  const crumbs: Crumb[] = [{ label: 'Home', to: '/' }];
  let currentPath = '';

  for (const segment of segments) {
    currentPath += `/${segment}`;
    crumbs.push({ label: getLabel(segment), to: currentPath });
  }

  return crumbs;
}

export default function TopBar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const breadcrumbs = buildBreadcrumb(location.pathname);

  return (
    <header className="sticky top-0 z-sticky flex h-14 items-center gap-4 border-b border-border bg-bg-base/95 px-4 backdrop-blur md:px-6 lg:px-8">
      <nav className="hidden min-w-0 flex-1 items-center gap-2 text-sm md:flex" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <div key={crumb.to} className="flex min-w-0 items-center gap-2">
              {isLast ? (
                <span className="truncate font-semibold text-text-primary">{crumb.label}</span>
              ) : (
                <Link className="truncate text-text-secondary transition-colors hover:text-text-primary" to={crumb.to}>
                  {crumb.label}
                </Link>
              )}
              {!isLast ? <span className="text-text-tertiary">/</span> : null}
            </div>
          );
        })}
      </nav>

      <div className="hidden h-9 min-w-[220px] items-center gap-2 rounded-md border border-border bg-bg-surface px-3 text-sm text-text-tertiary lg:flex">
        <Search className="h-4 w-4" />
        <span>Search (Cmd+K)</span>
      </div>

      <Button variant="ghost" size="sm" aria-label="Notifications placeholder">
        <Bell className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 rounded-md border border-border bg-bg-surface px-2 py-1">
        <Avatar size="sm" name={user?.name ?? undefined} src={user?.image ?? null} />
        <div className="hidden sm:block">
          <p className="max-w-[120px] truncate text-xs font-medium text-text-primary">{user?.name ?? 'User'}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
