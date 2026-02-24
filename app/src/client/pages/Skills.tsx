import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../i18n';
import {
  Search, X, Download, Power, Trash2, RefreshCw,
  Zap, AlertTriangle, CheckCircle2, Package, Store, ExternalLink,
  Star, ChevronRight, Loader2, Shield, Terminal, Key, Info,
  Grid, Code, PenTool, Globe, BarChart3, MessageCircle,
  Music, Camera, Mail, Calendar, FileText, Bot, Cpu,
  Home, Briefcase, Heart, Sparkles, Monitor,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Drawer } from '../components/ui/Drawer';

// ─── Types ──────────────────────────────────────────────────────────────────
interface MergedSkill {
  slug: string;
  name: string;
  description: string;
  source: 'runtime' | 'marketplace' | 'both';
  status: 'ready' | 'missing-deps' | 'blocked' | 'not-installed';
  eligible: boolean;
  installed: boolean;
  enabled: boolean;
  missing?: { bins: string[]; anyBins: string[]; env: string[]; config: string[]; os: string[] };
  installHints?: Array<{ id: string; kind: string; label: string; bins: string[] }>;
  tags: string[];
  version?: string;
  downloads?: number;
  stars?: number;
  changelog?: string;
  updatedAt?: number;
  instructions?: string;
}

type Tab = 'installed' | 'marketplace';
type StatusFilter = 'all' | 'ready' | 'missing-deps' | 'blocked';

// ─── Status helpers ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  ready: { label: 'Ready', variant: 'success' as const, icon: CheckCircle2 },
  'missing-deps': { label: 'Missing Deps', variant: 'warning' as const, icon: AlertTriangle },
  blocked: { label: 'Blocked', variant: 'danger' as const, icon: Shield },
  'not-installed': { label: 'Available', variant: 'default' as const, icon: Package },
};

// ─── Category inference ─────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all', label: 'All Skills', icon: Grid },
  { key: 'coding', label: 'Coding & Dev', icon: Code, match: ['coding-agent', 'github', 'gemini', 'oracle', 'skill-creator', 'tmux', 'agent-fleet', 'nano-pdf', 'mcporter', 'local-task-runner'] },
  { key: 'communication', label: 'Communication', icon: MessageCircle, match: ['slack', 'discord', 'imsg', 'bluebubbles', 'wacli', 'voice-call', 'sag', 'sherpa-onnx-tts'] },
  { key: 'media', label: 'Media & Vision', icon: Camera, match: ['camsnap', 'peekaboo', 'video-frames', 'gifgrep', 'songsee', 'openai-image-gen', 'nano-banana-pro', 'openai-whisper', 'openai-whisper-api', 'summarize', 'transcribe'] },
  { key: 'productivity', label: 'Productivity', icon: Briefcase, match: ['apple-notes', 'apple-reminders', 'bear-notes', 'notion', 'obsidian', 'things-mac', 'trello', 'session-logs', 'model-usage'] },
  { key: 'smarthome', label: 'Smart Home', icon: Home, match: ['openhue', 'sonoscli', 'eightctl', 'blucli', 'spotify-player', 'gog', 'goplaces', 'local-places'] },
  { key: 'web', label: 'Web & Search', icon: Globe, match: ['weather', 'blogwatcher', 'food-order', 'ordercli', 'bird'] },
  { key: 'security', label: 'Security & Ops', icon: Shield, match: ['healthcheck', '1password', '1sec-security'] },
  { key: 'ai', label: 'AI & Agents', icon: Bot, match: ['clawhub', 'kira-agents', 'kira-memory', 'kira-routine', 'voice-layer', 'skill-store'] },
  { key: 'data', label: 'Data & Mail', icon: Mail, match: ['himalaya', 'canvas'] },
];

function inferCategory(slug: string): string {
  for (const cat of CATEGORIES) {
    if (cat.match?.includes(slug)) return cat.key;
  }
  // Fallback heuristics
  const s = slug.toLowerCase();
  if (s.includes('code') || s.includes('git') || s.includes('dev')) return 'coding';
  if (s.includes('chat') || s.includes('msg') || s.includes('voice') || s.includes('tts')) return 'communication';
  if (s.includes('image') || s.includes('video') || s.includes('cam') || s.includes('whisper')) return 'media';
  if (s.includes('note') || s.includes('task') || s.includes('remind')) return 'productivity';
  if (s.includes('hue') || s.includes('sonos') || s.includes('home')) return 'smarthome';
  if (s.includes('search') || s.includes('web') || s.includes('weather')) return 'web';
  if (s.includes('security') || s.includes('health') || s.includes('password')) return 'security';
  if (s.includes('agent') || s.includes('kira') || s.includes('ai')) return 'ai';
  return 'all';
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function Skills() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('installed');
  const [search, setSearch] = useState('');
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [category, setCategory] = useState('all');
  const [selectedSkill, setSelectedSkill] = useState<MergedSkill | null>(null);

  // ─── Data fetching ──────────────────────────────────────────────────────
  const { data: skillsData, isLoading, error, isFetching } = useQuery<{ data: MergedSkill[]; meta: { runtime: number; marketplace: number } }>({
    queryKey: ['skills'],
    queryFn: async () => {
      const resp = await fetch('/api/v1/skills', { credentials: 'include' });
      if (!resp.ok) throw new Error(`Failed to fetch skills: ${resp.status}`);
      return resp.json();
    },
    refetchInterval: 60_000,
    staleTime: 15_000,
  });

  const skills = skillsData?.data || [];
  const meta = skillsData?.meta;

  const { data: searchResults, isLoading: isSearching } = useQuery<{ data: MergedSkill[] }>({
    queryKey: ['skills-search', marketplaceSearch],
    queryFn: async () => {
      const resp = await fetch(`/api/v1/skills/search?q=${encodeURIComponent(marketplaceSearch)}`, { credentials: 'include' });
      if (!resp.ok) throw new Error('Search failed');
      return resp.json();
    },
    enabled: marketplaceSearch.length >= 2,
    staleTime: 30_000,
  });

  const syncMut = useMutation({
    mutationFn: async () => { const resp = await fetch('/api/v1/skills/sync', { credentials: 'include' }); return resp.json(); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills'] }),
  });

  const installMut = useMutation({
    mutationFn: async (slug: string) => {
      const resp = await fetch(`/api/v1/skills/${slug}/install`, { method: 'POST', credentials: 'include' });
      if (!resp.ok) { const e = await resp.json(); throw new Error(e.error || 'Install failed'); }
      return resp.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills'] }),
  });

  const uninstallMut = useMutation({
    mutationFn: async (slug: string) => {
      const resp = await fetch(`/api/v1/skills/${slug}/uninstall`, { method: 'POST', credentials: 'include' });
      if (!resp.ok) { const e = await resp.json(); throw new Error(e.error || 'Uninstall failed'); }
      return resp.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills'] }),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ slug, enabled }: { slug: string; enabled: boolean }) => {
      const resp = await fetch(`/api/v1/skills/${slug}/toggle`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      return resp.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills'] }),
  });

  // ─── Derived data ───────────────────────────────────────────────────────
  const runtimeSkills = useMemo(() => skills.filter(s => s.installed), [skills]);
  const marketplaceSkills = useMemo(() => {
    if (marketplaceSearch.length >= 2 && searchResults?.data) return searchResults.data;
    return skills.filter(s => !s.installed);
  }, [skills, searchResults, marketplaceSearch]);

  // Category counts (for sidebar badges)
  const categoryCounts = useMemo(() => {
    const base = tab === 'installed' ? runtimeSkills : marketplaceSkills;
    const counts: Record<string, number> = { all: base.length };
    for (const s of base) {
      const cat = inferCategory(s.slug);
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [runtimeSkills, marketplaceSkills, tab]);

  const filteredRuntime = useMemo(() => {
    let list = runtimeSkills;
    if (category !== 'all') list = list.filter(s => inferCategory(s.slug) === category);
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.slug.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      const order = { ready: 0, 'missing-deps': 1, blocked: 2, 'not-installed': 3 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.name.localeCompare(b.name);
    });
  }, [runtimeSkills, statusFilter, search, category]);

  const filteredMarketplace = useMemo(() => {
    let list = marketplaceSkills;
    if (category !== 'all') list = list.filter(s => inferCategory(s.slug) === category);
    return list;
  }, [marketplaceSkills, category]);

  const statusCounts = useMemo(() => {
    const base = category !== 'all' ? runtimeSkills.filter(s => inferCategory(s.slug) === category) : runtimeSkills;
    const c = { all: base.length, ready: 0, 'missing-deps': 0, blocked: 0 };
    for (const s of base) {
      if (s.status === 'ready') c.ready++;
      else if (s.status === 'missing-deps') c['missing-deps']++;
      else if (s.status === 'blocked') c.blocked++;
    }
    return c;
  }, [runtimeSkills, category]);

  const handleSelectSkill = useCallback((skill: MergedSkill) => setSelectedSkill(skill), []);

  if (isLoading) return <SkillsLoadingSkeleton />;

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <EmptyState
          icon={<AlertTriangle className="h-8 w-8" />}
          title="Unable to connect to OpenClaw"
          description="The gateway might be down. Check that OpenClaw is running and try again."
          actionLabel="Retry"
          onAction={() => queryClient.invalidateQueries({ queryKey: ['skills'] })}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ─── Category Sidebar (desktop) ─────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-52 border-r border-border p-3 gap-0.5 overflow-y-auto shrink-0">
        <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium px-2 mb-2">Categories</div>
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const count = categoryCounts[cat.key] || 0;
          const active = category === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                active
                  ? 'bg-primary-500/15 text-primary-300 font-medium'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-overlay'
              }`}
            >
              <Icon size={14} />
              <span className="flex-1 text-left">{cat.label}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-primary-500/20 text-primary-300' : 'bg-bg-overlay text-text-tertiary'
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Main Content ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-lg font-semibold text-text-primary flex items-center gap-2">
                <Sparkles size={20} className="text-primary-400" />
                {t('skills.title')}
              </h1>
              <p className="mt-0.5 text-xs text-text-secondary">
                {meta ? `${meta.runtime} runtime · ${meta.marketplace} marketplace` : `${skills.length} skills`}
                {' · '}{runtimeSkills.filter(s => s.eligible).length} active
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => syncMut.mutate()} loading={syncMut.isPending || isFetching}>
              <RefreshCw className="h-3.5 w-3.5" />
              Sync
            </Button>
          </div>

          {/* Tabs + Mobile category filter */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex bg-bg-wash rounded-lg p-0.5">
              <TabButton active={tab === 'installed'} onClick={() => setTab('installed')}>
                <Package className="h-3.5 w-3.5" />
                My Skills
                <span className="ml-1 rounded-full bg-bg-overlay px-1.5 text-[10px] font-medium">{runtimeSkills.length}</span>
              </TabButton>
              <TabButton active={tab === 'marketplace'} onClick={() => setTab('marketplace')}>
                <Store className="h-3.5 w-3.5" />
                Marketplace
              </TabButton>
            </div>
          </div>

          {/* Mobile categories (horizontal scroll) */}
          <div className="lg:hidden mt-3 flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {CATEGORIES.map(cat => {
              const active = category === cat.key;
              const count = categoryCounts[cat.key] || 0;
              return (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={`shrink-0 px-2.5 py-1 text-[11px] rounded-full transition-all whitespace-nowrap ${
                    active ? 'bg-primary-500/20 text-primary-300 font-medium' : 'bg-bg-surface text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {cat.label}{count > 0 ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'installed' ? (
            <InstalledSection
              skills={filteredRuntime}
              statusCounts={statusCounts}
              statusFilter={statusFilter}
              search={search}
              onSearchChange={setSearch}
              onStatusFilterChange={setStatusFilter}
              onSelect={handleSelectSkill}
              onToggle={(slug, enabled) => toggleMut.mutate({ slug, enabled })}
              togglePending={toggleMut.isPending}
            />
          ) : (
            <MarketplaceSection
              skills={filteredMarketplace}
              search={marketplaceSearch}
              onSearchChange={setMarketplaceSearch}
              isSearching={isSearching}
              onSelect={handleSelectSkill}
              onInstall={(slug) => installMut.mutate(slug)}
              installPending={installMut.isPending}
              installingSlug={installMut.variables as string | undefined}
            />
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      <Drawer
        open={!!selectedSkill}
        title={selectedSkill?.name || 'Skill Detail'}
        onClose={() => setSelectedSkill(null)}
        footer={selectedSkill ? (
          <SkillDrawerFooter
            skill={selectedSkill}
            onInstall={() => installMut.mutate(selectedSkill.slug)}
            onUninstall={() => uninstallMut.mutate(selectedSkill.slug)}
            onToggle={(enabled) => toggleMut.mutate({ slug: selectedSkill.slug, enabled })}
            installPending={installMut.isPending}
            uninstallPending={uninstallMut.isPending}
          />
        ) : undefined}
      >
        {selectedSkill && <SkillDetail skill={selectedSkill} />}
      </Drawer>
    </div>
  );
}

// ─── Tab Button ─────────────────────────────────────────────────────────────
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-bg-raised text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Installed Section ──────────────────────────────────────────────────────
function InstalledSection({
  skills, statusCounts, statusFilter, search,
  onSearchChange, onStatusFilterChange, onSelect, onToggle, togglePending,
}: {
  skills: MergedSkill[];
  statusCounts: Record<string, number>;
  statusFilter: StatusFilter;
  search: string;
  onSearchChange: (v: string) => void;
  onStatusFilterChange: (v: StatusFilter) => void;
  onSelect: (s: MergedSkill) => void;
  onToggle: (slug: string, enabled: boolean) => void;
  togglePending: boolean;
}) {
  return (
    <div className="p-5 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
          <input
            type="text" value={search} onChange={e => onSearchChange(e.target.value)}
            placeholder="Filter skills..."
            className="w-full rounded-md border border-border bg-bg-surface py-1.5 pl-8 pr-8 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
          />
          {search && (
            <button onClick={() => onSearchChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'ready', 'missing-deps', 'blocked'] as const).map(f => (
            <button
              key={f}
              onClick={() => onStatusFilterChange(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === f ? 'bg-primary-500/15 text-primary-300' : 'bg-bg-surface text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {f === 'all' ? 'All' : f === 'ready' ? 'Ready' : f === 'missing-deps' ? 'Missing' : 'Blocked'}
              <span className="ml-1 opacity-60">{statusCounts[f] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {skills.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title={search ? 'No matching skills' : 'No skills in this category'}
          description={search ? 'Try a different search term' : 'Select a different category or filter'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {skills.map(skill => (
            <RuntimeSkillCard key={skill.slug} skill={skill} onSelect={() => onSelect(skill)} onToggle={(enabled) => onToggle(skill.slug, enabled)} togglePending={togglePending} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Runtime Skill Card ─────────────────────────────────────────────────────
function RuntimeSkillCard({ skill, onSelect, onToggle, togglePending }: {
  skill: MergedSkill; onSelect: () => void; onToggle: (enabled: boolean) => void; togglePending: boolean;
}) {
  const cfg = STATUS_CONFIG[skill.status];
  const StatusIcon = cfg.icon;
  const hasMissing = skill.missing && (skill.missing.bins.length > 0 || skill.missing.env.length > 0 || skill.missing.config.length > 0 || skill.missing.os.length > 0);

  return (
    <div
      className={`group relative cursor-pointer rounded-xl border p-4 transition-all hover:shadow-sm ${
        skill.status === 'ready' && skill.enabled
          ? 'bg-success-subtle/5 border-success/20 hover:border-success/30'
          : skill.status === 'ready'
          ? 'bg-bg-surface border-border hover:border-border-strong'
          : skill.status === 'missing-deps'
          ? 'bg-warning-subtle/5 border-warning/20 hover:border-warning/30'
          : 'bg-bg-surface border-border hover:border-border-strong'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-text-primary truncate">{skill.name}</h3>
            <Badge variant={cfg.variant} size="sm">
              <StatusIcon className="mr-1 h-2.5 w-2.5" />
              {cfg.label}
            </Badge>
          </div>
          {skill.description && <p className="mt-1 text-xs text-text-secondary line-clamp-2">{skill.description}</p>}
          {hasMissing && (
            <div className="mt-2 flex flex-wrap gap-1">
              {skill.missing!.bins.map(b => (
                <span key={b} className="inline-flex items-center gap-1 rounded bg-warning-subtle/30 px-1.5 py-0.5 text-[10px] text-warning">
                  <Terminal className="h-2.5 w-2.5" /> {b}
                </span>
              ))}
              {skill.missing!.env.map(e => (
                <span key={e} className="inline-flex items-center gap-1 rounded bg-warning-subtle/30 px-1.5 py-0.5 text-[10px] text-warning">
                  <Key className="h-2.5 w-2.5" /> {e}
                </span>
              ))}
              {skill.missing!.os.map(o => (
                <span key={o} className="inline-flex items-center gap-1 rounded bg-error-subtle/30 px-1.5 py-0.5 text-[10px] text-error">
                  requires {o}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          {skill.status === 'ready' && (
            <button
              onClick={() => onToggle(!skill.enabled)}
              disabled={togglePending}
              className={`relative h-5 w-9 rounded-full transition-colors ${skill.enabled ? 'bg-success' : 'bg-bg-overlay'}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${skill.enabled ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
          )}
          <ChevronRight className="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}

// ─── Marketplace Section ────────────────────────────────────────────────────
function MarketplaceSection({
  skills, search, onSearchChange, isSearching, onSelect, onInstall, installPending, installingSlug,
}: {
  skills: MergedSkill[]; search: string; onSearchChange: (v: string) => void; isSearching: boolean;
  onSelect: (s: MergedSkill) => void; onInstall: (slug: string) => void; installPending: boolean; installingSlug?: string;
}) {
  return (
    <div className="p-5 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <input
          type="text" value={search} onChange={e => onSearchChange(e.target.value)}
          placeholder="Search ClawHub marketplace..."
          className="w-full rounded-lg border border-border bg-bg-surface py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
        />
        {search && (
          <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary">
            <X className="h-4 w-4" />
          </button>
        )}
        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary-400" />}
      </div>

      {skills.length === 0 ? (
        <EmptyState
          icon={<Store className="h-8 w-8" />}
          title={search ? 'No results found' : 'Explore the marketplace'}
          description={search ? `No skills matching "${search}" on ClawHub` : 'Search for skills to install from ClawHub, or browse available packages'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {skills.map(skill => (
            <MarketplaceCard key={skill.slug} skill={skill} onSelect={() => onSelect(skill)} onInstall={() => onInstall(skill.slug)} installing={installPending && installingSlug === skill.slug} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Marketplace Card ───────────────────────────────────────────────────────
function MarketplaceCard({ skill, onSelect, onInstall, installing }: {
  skill: MergedSkill; onSelect: () => void; onInstall: () => void; installing: boolean;
}) {
  return (
    <div className="group cursor-pointer rounded-xl border border-border bg-bg-surface p-4 transition-all hover:border-border-strong hover:shadow-sm" onClick={onSelect}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-medium text-text-primary truncate">{skill.name}</h3>
            {skill.version && <span className="text-[10px] text-text-tertiary">v{skill.version}</span>}
          </div>
        </div>
        {skill.installed ? (
          <Badge variant="success" size="sm">Installed</Badge>
        ) : (
          <div onClick={e => e.stopPropagation()}>
            <Button variant="primary" size="sm" onClick={onInstall} loading={installing} disabled={installing}>
              <Download className="h-3 w-3" /> Install
            </Button>
          </div>
        )}
      </div>
      {skill.description && <p className="mt-2 text-xs text-text-secondary line-clamp-2">{skill.description}</p>}
      <div className="mt-3 flex items-center gap-3 text-[10px] text-text-tertiary">
        {skill.downloads != null && <span className="flex items-center gap-1"><Download className="h-2.5 w-2.5" /> {skill.downloads}</span>}
        {skill.stars != null && skill.stars > 0 && <span className="flex items-center gap-1"><Star className="h-2.5 w-2.5" /> {skill.stars}</span>}
        {skill.tags.length > 0 && (
          <div className="flex-1 flex gap-1 overflow-hidden">
            {skill.tags.slice(0, 3).map(tag => <span key={tag} className="rounded bg-bg-overlay px-1.5 py-0.5 truncate">{tag}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skill Detail (Drawer) ──────────────────────────────────────────────────
function SkillDetail({ skill }: { skill: MergedSkill }) {
  const { data: detailData } = useQuery({
    queryKey: ['skill-detail', skill.slug],
    queryFn: async () => {
      const resp = await fetch(`/api/v1/skills/${skill.slug}`, { credentials: 'include' });
      if (!resp.ok) return null;
      return (await resp.json()).data;
    },
  });

  const cfg = STATUS_CONFIG[skill.status];
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={cfg.variant} size="md"><StatusIcon className="mr-1 h-3 w-3" />{cfg.label}</Badge>
        {skill.version && <span className="text-xs text-text-tertiary">v{skill.version}</span>}
        {skill.source === 'both' && <Badge variant="info" size="sm">Runtime + Hub</Badge>}
        {skill.source === 'runtime' && <Badge variant="default" size="sm">Bundled</Badge>}
      </div>

      {skill.description && <p className="text-sm text-text-secondary leading-relaxed">{skill.description}</p>}

      {skill.missing && (skill.missing.bins.length > 0 || skill.missing.env.length > 0 || skill.missing.config.length > 0) && (
        <div className="rounded-lg border border-warning/20 bg-warning-subtle/5 p-4 space-y-2">
          <h4 className="text-xs font-semibold text-warning flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Missing Requirements
          </h4>
          {skill.missing.bins.length > 0 && (
            <div className="text-xs text-text-secondary">
              <span className="font-medium">Binaries:</span>{' '}
              {skill.missing.bins.map(b => <code key={b} className="mx-0.5 rounded bg-bg-overlay px-1.5 py-0.5 text-warning">{b}</code>)}
            </div>
          )}
          {skill.missing.env.length > 0 && (
            <div className="text-xs text-text-secondary">
              <span className="font-medium">Environment:</span>{' '}
              {skill.missing.env.map(e => <code key={e} className="mx-0.5 rounded bg-bg-overlay px-1.5 py-0.5 text-warning">{e}</code>)}
            </div>
          )}
          {skill.missing.config.length > 0 && (
            <div className="text-xs text-text-secondary">
              <span className="font-medium">Config:</span>{' '}
              {skill.missing.config.map(c => <code key={c} className="mx-0.5 rounded bg-bg-overlay px-1.5 py-0.5 text-warning">{c}</code>)}
            </div>
          )}
          {skill.installHints && skill.installHints.length > 0 && (
            <div className="mt-2 space-y-1">
              {skill.installHints.map(h => (
                <div key={h.id} className="flex items-center gap-2 text-xs text-text-secondary">
                  <Info className="h-3 w-3 text-info shrink-0" />{h.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skill.tags.map(tag => <span key={tag} className="rounded-full bg-bg-overlay px-2 py-0.5 text-[11px] text-text-tertiary">{tag}</span>)}
        </div>
      )}

      {(detailData?.changelog || skill.changelog) && (
        <div>
          <h4 className="mb-2 text-xs font-semibold text-text-primary">Changelog</h4>
          <pre className="rounded-lg border border-border bg-bg-wash p-3 text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {detailData?.changelog || skill.changelog}
          </pre>
        </div>
      )}

      {detailData?.instructions && (
        <div>
          <h4 className="mb-2 text-xs font-semibold text-text-primary">Instructions</h4>
          <pre className="rounded-lg border border-border bg-bg-wash p-3 text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
            {detailData.instructions}
          </pre>
        </div>
      )}

      {(skill.downloads != null || skill.stars != null) && (
        <div className="flex gap-4 text-xs text-text-tertiary">
          {skill.downloads != null && <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {skill.downloads} downloads</span>}
          {skill.stars != null && skill.stars > 0 && <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {skill.stars} stars</span>}
        </div>
      )}
    </div>
  );
}

// ─── Drawer Footer ──────────────────────────────────────────────────────────
function SkillDrawerFooter({ skill, onInstall, onUninstall, onToggle, installPending, uninstallPending }: {
  skill: MergedSkill; onInstall: () => void; onUninstall: () => void; onToggle: (enabled: boolean) => void;
  installPending: boolean; uninstallPending: boolean;
}) {
  if (!skill.installed) {
    return (
      <div className="flex w-full gap-2">
        <Button variant="primary" className="flex-1" onClick={onInstall} loading={installPending}>
          <Download className="h-4 w-4" /> Install from ClawHub
        </Button>
      </div>
    );
  }
  return (
    <div className="flex w-full items-center gap-2">
      {skill.status === 'ready' && (
        <Button variant={skill.enabled ? 'secondary' : 'primary'} className="flex-1" onClick={() => onToggle(!skill.enabled)}>
          <Power className="h-4 w-4" /> {skill.enabled ? 'Disable' : 'Enable'}
        </Button>
      )}
      <Button variant="danger" size="sm" onClick={onUninstall} loading={uninstallPending}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────
function SkillsLoadingSkeleton() {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="hidden lg:flex flex-col w-52 border-r border-border p-3 gap-2 shrink-0">
        <Skeleton className="h-3 w-20 mb-2" />
        {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-7 w-full rounded-lg" />)}
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div><Skeleton className="h-6 w-24" /><Skeleton className="mt-1 h-4 w-40" /></div>
            <Skeleton className="h-7 w-16" />
          </div>
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="flex-1 p-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
