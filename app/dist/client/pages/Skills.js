import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../i18n';
import { Search, X, Download, Power, Trash2, RefreshCw, AlertTriangle, CheckCircle2, Package, Store, Star, ChevronRight, Loader2, Shield, Terminal, Key, Info, Grid, Code, Globe, MessageCircle, Camera, Mail, Bot, Home, Briefcase, Sparkles, } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Drawer } from '../components/ui/Drawer';
// ─── Status helpers ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    ready: { label: 'Ready', variant: 'success', icon: CheckCircle2 },
    'missing-deps': { label: 'Missing Deps', variant: 'warning', icon: AlertTriangle },
    blocked: { label: 'Blocked', variant: 'danger', icon: Shield },
    'not-installed': { label: 'Available', variant: 'default', icon: Package },
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
function inferCategory(slug) {
    for (const cat of CATEGORIES) {
        if (cat.match?.includes(slug))
            return cat.key;
    }
    // Fallback heuristics
    const s = slug.toLowerCase();
    if (s.includes('code') || s.includes('git') || s.includes('dev'))
        return 'coding';
    if (s.includes('chat') || s.includes('msg') || s.includes('voice') || s.includes('tts'))
        return 'communication';
    if (s.includes('image') || s.includes('video') || s.includes('cam') || s.includes('whisper'))
        return 'media';
    if (s.includes('note') || s.includes('task') || s.includes('remind'))
        return 'productivity';
    if (s.includes('hue') || s.includes('sonos') || s.includes('home'))
        return 'smarthome';
    if (s.includes('search') || s.includes('web') || s.includes('weather'))
        return 'web';
    if (s.includes('security') || s.includes('health') || s.includes('password'))
        return 'security';
    if (s.includes('agent') || s.includes('kira') || s.includes('ai'))
        return 'ai';
    return 'all';
}
// ─── Main Component ─────────────────────────────────────────────────────────
export default function Skills() {
    const queryClient = useQueryClient();
    const { t } = useI18n();
    const [tab, setTab] = useState('installed');
    const [search, setSearch] = useState('');
    const [marketplaceSearch, setMarketplaceSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [category, setCategory] = useState('all');
    const [selectedSkill, setSelectedSkill] = useState(null);
    // ─── Data fetching ──────────────────────────────────────────────────────
    const { data: skillsData, isLoading, error, isFetching } = useQuery({
        queryKey: ['skills'],
        queryFn: async () => {
            const resp = await fetch('/api/v1/skills', { credentials: 'include' });
            if (!resp.ok)
                throw new Error(`Failed to fetch skills: ${resp.status}`);
            return resp.json();
        },
        refetchInterval: 60_000,
        staleTime: 15_000,
    });
    const skills = skillsData?.data || [];
    const meta = skillsData?.meta;
    const { data: searchResults, isLoading: isSearching } = useQuery({
        queryKey: ['skills-search', marketplaceSearch],
        queryFn: async () => {
            const resp = await fetch(`/api/v1/skills/search?q=${encodeURIComponent(marketplaceSearch)}`, { credentials: 'include' });
            if (!resp.ok)
                throw new Error('Search failed');
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
        mutationFn: async (slug) => {
            const resp = await fetch(`/api/v1/skills/${slug}/install`, { method: 'POST', credentials: 'include' });
            if (!resp.ok) {
                const e = await resp.json();
                throw new Error(e.error || 'Install failed');
            }
            return resp.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills'] }),
    });
    const uninstallMut = useMutation({
        mutationFn: async (slug) => {
            const resp = await fetch(`/api/v1/skills/${slug}/uninstall`, { method: 'POST', credentials: 'include' });
            if (!resp.ok) {
                const e = await resp.json();
                throw new Error(e.error || 'Uninstall failed');
            }
            return resp.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills'] }),
    });
    const toggleMut = useMutation({
        mutationFn: async ({ slug, enabled }) => {
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
        if (marketplaceSearch.length >= 2 && searchResults?.data)
            return searchResults.data;
        return skills.filter(s => !s.installed);
    }, [skills, searchResults, marketplaceSearch]);
    // Category counts (for sidebar badges)
    const categoryCounts = useMemo(() => {
        const base = tab === 'installed' ? runtimeSkills : marketplaceSkills;
        const counts = { all: base.length };
        for (const s of base) {
            const cat = inferCategory(s.slug);
            counts[cat] = (counts[cat] || 0) + 1;
        }
        return counts;
    }, [runtimeSkills, marketplaceSkills, tab]);
    const filteredRuntime = useMemo(() => {
        let list = runtimeSkills;
        if (category !== 'all')
            list = list.filter(s => inferCategory(s.slug) === category);
        if (statusFilter !== 'all')
            list = list.filter(s => s.status === statusFilter);
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
        if (category !== 'all')
            list = list.filter(s => inferCategory(s.slug) === category);
        return list;
    }, [marketplaceSkills, category]);
    const statusCounts = useMemo(() => {
        const base = category !== 'all' ? runtimeSkills.filter(s => inferCategory(s.slug) === category) : runtimeSkills;
        const c = { all: base.length, ready: 0, 'missing-deps': 0, blocked: 0 };
        for (const s of base) {
            if (s.status === 'ready')
                c.ready++;
            else if (s.status === 'missing-deps')
                c['missing-deps']++;
            else if (s.status === 'blocked')
                c.blocked++;
        }
        return c;
    }, [runtimeSkills, category]);
    const handleSelectSkill = useCallback((skill) => setSelectedSkill(skill), []);
    if (isLoading)
        return _jsx(SkillsLoadingSkeleton, {});
    if (error) {
        return (_jsx("div", { className: "flex-1 flex items-center justify-center p-8", children: _jsx(EmptyState, { icon: _jsx(AlertTriangle, { className: "h-8 w-8" }), title: "Unable to connect to OpenClaw", description: "The gateway might be down. Check that OpenClaw is running and try again.", actionLabel: "Retry", onAction: () => queryClient.invalidateQueries({ queryKey: ['skills'] }) }) }));
    }
    return (_jsxs("div", { className: "flex h-full overflow-hidden", children: [_jsxs("div", { className: "hidden lg:flex flex-col w-52 border-r border-border p-3 gap-0.5 overflow-y-auto shrink-0", children: [_jsx("div", { className: "text-[10px] uppercase tracking-wider text-text-tertiary font-medium px-2 mb-2", children: "Categories" }), CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        const count = categoryCounts[cat.key] || 0;
                        const active = category === cat.key;
                        return (_jsxs("button", { onClick: () => setCategory(cat.key), className: `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${active
                                ? 'bg-primary-500/15 text-primary-300 font-medium'
                                : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-overlay'}`, children: [_jsx(Icon, { size: 14 }), _jsx("span", { className: "flex-1 text-left", children: cat.label }), count > 0 && (_jsx("span", { className: `text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-primary-500/20 text-primary-300' : 'bg-bg-overlay text-text-tertiary'}`, children: count }))] }, cat.key));
                    })] }), _jsxs("div", { className: "flex-1 flex flex-col overflow-hidden", children: [_jsxs("header", { className: "shrink-0 border-b border-border px-5 py-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "font-display text-lg font-semibold text-text-primary flex items-center gap-2", children: [_jsx(Sparkles, { size: 20, className: "text-primary-400" }), t('skills.title')] }), _jsxs("p", { className: "mt-0.5 text-xs text-text-secondary", children: [meta ? `${meta.runtime} runtime · ${meta.marketplace} marketplace` : `${skills.length} skills`, ' · ', runtimeSkills.filter(s => s.eligible).length, " active"] })] }), _jsxs(Button, { variant: "secondary", size: "sm", onClick: () => syncMut.mutate(), loading: syncMut.isPending || isFetching, children: [_jsx(RefreshCw, { className: "h-3.5 w-3.5" }), "Sync"] })] }), _jsx("div", { className: "mt-3 flex items-center gap-3", children: _jsxs("div", { className: "flex bg-bg-wash rounded-lg p-0.5", children: [_jsxs(TabButton, { active: tab === 'installed', onClick: () => setTab('installed'), children: [_jsx(Package, { className: "h-3.5 w-3.5" }), "My Skills", _jsx("span", { className: "ml-1 rounded-full bg-bg-overlay px-1.5 text-[10px] font-medium", children: runtimeSkills.length })] }), _jsxs(TabButton, { active: tab === 'marketplace', onClick: () => setTab('marketplace'), children: [_jsx(Store, { className: "h-3.5 w-3.5" }), "Marketplace"] })] }) }), _jsx("div", { className: "lg:hidden mt-3 flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1", children: CATEGORIES.map(cat => {
                                    const active = category === cat.key;
                                    const count = categoryCounts[cat.key] || 0;
                                    return (_jsxs("button", { onClick: () => setCategory(cat.key), className: `shrink-0 px-2.5 py-1 text-[11px] rounded-full transition-all whitespace-nowrap ${active ? 'bg-primary-500/20 text-primary-300 font-medium' : 'bg-bg-surface text-text-tertiary hover:text-text-secondary'}`, children: [cat.label, count > 0 ? ` (${count})` : ''] }, cat.key));
                                }) })] }), _jsx("div", { className: "flex-1 overflow-y-auto", children: tab === 'installed' ? (_jsx(InstalledSection, { skills: filteredRuntime, statusCounts: statusCounts, statusFilter: statusFilter, search: search, onSearchChange: setSearch, onStatusFilterChange: setStatusFilter, onSelect: handleSelectSkill, onToggle: (slug, enabled) => toggleMut.mutate({ slug, enabled }), togglePending: toggleMut.isPending })) : (_jsx(MarketplaceSection, { skills: filteredMarketplace, search: marketplaceSearch, onSearchChange: setMarketplaceSearch, isSearching: isSearching, onSelect: handleSelectSkill, onInstall: (slug) => installMut.mutate(slug), installPending: installMut.isPending, installingSlug: installMut.variables })) })] }), _jsx(Drawer, { open: !!selectedSkill, title: selectedSkill?.name || 'Skill Detail', onClose: () => setSelectedSkill(null), footer: selectedSkill ? (_jsx(SkillDrawerFooter, { skill: selectedSkill, onInstall: () => installMut.mutate(selectedSkill.slug), onUninstall: () => uninstallMut.mutate(selectedSkill.slug), onToggle: (enabled) => toggleMut.mutate({ slug: selectedSkill.slug, enabled }), installPending: installMut.isPending, uninstallPending: uninstallMut.isPending })) : undefined, children: selectedSkill && _jsx(SkillDetail, { skill: selectedSkill }) })] }));
}
// ─── Tab Button ─────────────────────────────────────────────────────────────
function TabButton({ active, onClick, children }) {
    return (_jsx("button", { onClick: onClick, className: `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'bg-bg-raised text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`, children: children }));
}
// ─── Installed Section ──────────────────────────────────────────────────────
function InstalledSection({ skills, statusCounts, statusFilter, search, onSearchChange, onStatusFilterChange, onSelect, onToggle, togglePending, }) {
    return (_jsxs("div", { className: "p-5 space-y-4", children: [_jsxs("div", { className: "flex flex-col sm:flex-row gap-3", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" }), _jsx("input", { type: "text", value: search, onChange: e => onSearchChange(e.target.value), placeholder: "Filter skills...", className: "w-full rounded-md border border-border bg-bg-surface py-1.5 pl-8 pr-8 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none" }), search && (_jsx("button", { onClick: () => onSearchChange(''), className: "absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary", children: _jsx(X, { className: "h-3.5 w-3.5" }) }))] }), _jsx("div", { className: "flex gap-1.5 flex-wrap", children: ['all', 'ready', 'missing-deps', 'blocked'].map(f => (_jsxs("button", { onClick: () => onStatusFilterChange(f), className: `rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === f ? 'bg-primary-500/15 text-primary-300' : 'bg-bg-surface text-text-tertiary hover:text-text-secondary'}`, children: [f === 'all' ? 'All' : f === 'ready' ? 'Ready' : f === 'missing-deps' ? 'Missing' : 'Blocked', _jsx("span", { className: "ml-1 opacity-60", children: statusCounts[f] ?? 0 })] }, f))) })] }), skills.length === 0 ? (_jsx(EmptyState, { icon: _jsx(Package, { className: "h-8 w-8" }), title: search ? 'No matching skills' : 'No skills in this category', description: search ? 'Try a different search term' : 'Select a different category or filter' })) : (_jsx("div", { className: "grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3", children: skills.map(skill => (_jsx(RuntimeSkillCard, { skill: skill, onSelect: () => onSelect(skill), onToggle: (enabled) => onToggle(skill.slug, enabled), togglePending: togglePending }, skill.slug))) }))] }));
}
// ─── Runtime Skill Card ─────────────────────────────────────────────────────
function RuntimeSkillCard({ skill, onSelect, onToggle, togglePending }) {
    const cfg = STATUS_CONFIG[skill.status];
    const StatusIcon = cfg.icon;
    const hasMissing = skill.missing && (skill.missing.bins.length > 0 || skill.missing.env.length > 0 || skill.missing.config.length > 0 || skill.missing.os.length > 0);
    return (_jsx("div", { className: `group relative cursor-pointer rounded-xl border p-4 transition-all hover:shadow-sm ${skill.status === 'ready' && skill.enabled
            ? 'bg-success-subtle/5 border-success/20 hover:border-success/30'
            : skill.status === 'ready'
                ? 'bg-bg-surface border-border hover:border-border-strong'
                : skill.status === 'missing-deps'
                    ? 'bg-warning-subtle/5 border-warning/20 hover:border-warning/30'
                    : 'bg-bg-surface border-border hover:border-border-strong'}`, onClick: onSelect, children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h3", { className: "text-sm font-medium text-text-primary truncate", children: skill.name }), _jsxs(Badge, { variant: cfg.variant, size: "sm", children: [_jsx(StatusIcon, { className: "mr-1 h-2.5 w-2.5" }), cfg.label] })] }), skill.description && _jsx("p", { className: "mt-1 text-xs text-text-secondary line-clamp-2", children: skill.description }), hasMissing && (_jsxs("div", { className: "mt-2 flex flex-wrap gap-1", children: [skill.missing.bins.map(b => (_jsxs("span", { className: "inline-flex items-center gap-1 rounded bg-warning-subtle/30 px-1.5 py-0.5 text-[10px] text-warning", children: [_jsx(Terminal, { className: "h-2.5 w-2.5" }), " ", b] }, b))), skill.missing.env.map(e => (_jsxs("span", { className: "inline-flex items-center gap-1 rounded bg-warning-subtle/30 px-1.5 py-0.5 text-[10px] text-warning", children: [_jsx(Key, { className: "h-2.5 w-2.5" }), " ", e] }, e))), skill.missing.os.map(o => (_jsxs("span", { className: "inline-flex items-center gap-1 rounded bg-error-subtle/30 px-1.5 py-0.5 text-[10px] text-error", children: ["requires ", o] }, o)))] }))] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", onClick: e => e.stopPropagation(), children: [skill.status === 'ready' && (_jsx("button", { onClick: () => onToggle(!skill.enabled), disabled: togglePending, className: `relative h-5 w-9 rounded-full transition-colors ${skill.enabled ? 'bg-success' : 'bg-bg-overlay'}`, children: _jsx("span", { className: `absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${skill.enabled ? 'left-[18px]' : 'left-0.5'}` }) })), _jsx(ChevronRight, { className: "h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" })] })] }) }));
}
// ─── Marketplace Section ────────────────────────────────────────────────────
function MarketplaceSection({ skills, search, onSearchChange, isSearching, onSelect, onInstall, installPending, installingSlug, }) {
    return (_jsxs("div", { className: "p-5 space-y-4", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" }), _jsx("input", { type: "text", value: search, onChange: e => onSearchChange(e.target.value), placeholder: "Search ClawHub marketplace...", className: "w-full rounded-lg border border-border bg-bg-surface py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none" }), search && (_jsx("button", { onClick: () => onSearchChange(''), className: "absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary", children: _jsx(X, { className: "h-4 w-4" }) })), isSearching && _jsx(Loader2, { className: "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary-400" })] }), skills.length === 0 ? (_jsx(EmptyState, { icon: _jsx(Store, { className: "h-8 w-8" }), title: search ? 'No results found' : 'Explore the marketplace', description: search ? `No skills matching "${search}" on ClawHub` : 'Search for skills to install from ClawHub, or browse available packages' })) : (_jsx("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3", children: skills.map(skill => (_jsx(MarketplaceCard, { skill: skill, onSelect: () => onSelect(skill), onInstall: () => onInstall(skill.slug), installing: installPending && installingSlug === skill.slug }, skill.slug))) }))] }));
}
// ─── Marketplace Card ───────────────────────────────────────────────────────
function MarketplaceCard({ skill, onSelect, onInstall, installing }) {
    return (_jsxs("div", { className: "group cursor-pointer rounded-xl border border-border bg-bg-surface p-4 transition-all hover:border-border-strong hover:shadow-sm", onClick: onSelect, children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsx("div", { className: "flex-1 min-w-0", children: _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("h3", { className: "text-sm font-medium text-text-primary truncate", children: skill.name }), skill.version && _jsxs("span", { className: "text-[10px] text-text-tertiary", children: ["v", skill.version] })] }) }), skill.installed ? (_jsx(Badge, { variant: "success", size: "sm", children: "Installed" })) : (_jsx("div", { onClick: e => e.stopPropagation(), children: _jsxs(Button, { variant: "primary", size: "sm", onClick: onInstall, loading: installing, disabled: installing, children: [_jsx(Download, { className: "h-3 w-3" }), " Install"] }) }))] }), skill.description && _jsx("p", { className: "mt-2 text-xs text-text-secondary line-clamp-2", children: skill.description }), _jsxs("div", { className: "mt-3 flex items-center gap-3 text-[10px] text-text-tertiary", children: [skill.downloads != null && _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Download, { className: "h-2.5 w-2.5" }), " ", skill.downloads] }), skill.stars != null && skill.stars > 0 && _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Star, { className: "h-2.5 w-2.5" }), " ", skill.stars] }), skill.tags.length > 0 && (_jsx("div", { className: "flex-1 flex gap-1 overflow-hidden", children: skill.tags.slice(0, 3).map(tag => _jsx("span", { className: "rounded bg-bg-overlay px-1.5 py-0.5 truncate", children: tag }, tag)) }))] })] }));
}
// ─── Skill Detail (Drawer) ──────────────────────────────────────────────────
function SkillDetail({ skill }) {
    const { data: detailData } = useQuery({
        queryKey: ['skill-detail', skill.slug],
        queryFn: async () => {
            const resp = await fetch(`/api/v1/skills/${skill.slug}`, { credentials: 'include' });
            if (!resp.ok)
                return null;
            return (await resp.json()).data;
        },
    });
    const cfg = STATUS_CONFIG[skill.status];
    const StatusIcon = cfg.icon;
    return (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsxs(Badge, { variant: cfg.variant, size: "md", children: [_jsx(StatusIcon, { className: "mr-1 h-3 w-3" }), cfg.label] }), skill.version && _jsxs("span", { className: "text-xs text-text-tertiary", children: ["v", skill.version] }), skill.source === 'both' && _jsx(Badge, { variant: "info", size: "sm", children: "Runtime + Hub" }), skill.source === 'runtime' && _jsx(Badge, { variant: "default", size: "sm", children: "Bundled" })] }), skill.description && _jsx("p", { className: "text-sm text-text-secondary leading-relaxed", children: skill.description }), skill.missing && (skill.missing.bins.length > 0 || skill.missing.env.length > 0 || skill.missing.config.length > 0) && (_jsxs("div", { className: "rounded-lg border border-warning/20 bg-warning-subtle/5 p-4 space-y-2", children: [_jsxs("h4", { className: "text-xs font-semibold text-warning flex items-center gap-1.5", children: [_jsx(AlertTriangle, { className: "h-3.5 w-3.5" }), " Missing Requirements"] }), skill.missing.bins.length > 0 && (_jsxs("div", { className: "text-xs text-text-secondary", children: [_jsx("span", { className: "font-medium", children: "Binaries:" }), ' ', skill.missing.bins.map(b => _jsx("code", { className: "mx-0.5 rounded bg-bg-overlay px-1.5 py-0.5 text-warning", children: b }, b))] })), skill.missing.env.length > 0 && (_jsxs("div", { className: "text-xs text-text-secondary", children: [_jsx("span", { className: "font-medium", children: "Environment:" }), ' ', skill.missing.env.map(e => _jsx("code", { className: "mx-0.5 rounded bg-bg-overlay px-1.5 py-0.5 text-warning", children: e }, e))] })), skill.missing.config.length > 0 && (_jsxs("div", { className: "text-xs text-text-secondary", children: [_jsx("span", { className: "font-medium", children: "Config:" }), ' ', skill.missing.config.map(c => _jsx("code", { className: "mx-0.5 rounded bg-bg-overlay px-1.5 py-0.5 text-warning", children: c }, c))] })), skill.installHints && skill.installHints.length > 0 && (_jsx("div", { className: "mt-2 space-y-1", children: skill.installHints.map(h => (_jsxs("div", { className: "flex items-center gap-2 text-xs text-text-secondary", children: [_jsx(Info, { className: "h-3 w-3 text-info shrink-0" }), h.label] }, h.id))) }))] })), skill.tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1.5", children: skill.tags.map(tag => _jsx("span", { className: "rounded-full bg-bg-overlay px-2 py-0.5 text-[11px] text-text-tertiary", children: tag }, tag)) })), (detailData?.changelog || skill.changelog) && (_jsxs("div", { children: [_jsx("h4", { className: "mb-2 text-xs font-semibold text-text-primary", children: "Changelog" }), _jsx("pre", { className: "rounded-lg border border-border bg-bg-wash p-3 text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto", children: detailData?.changelog || skill.changelog })] })), detailData?.instructions && (_jsxs("div", { children: [_jsx("h4", { className: "mb-2 text-xs font-semibold text-text-primary", children: "Instructions" }), _jsx("pre", { className: "rounded-lg border border-border bg-bg-wash p-3 text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto", children: detailData.instructions })] })), (skill.downloads != null || skill.stars != null) && (_jsxs("div", { className: "flex gap-4 text-xs text-text-tertiary", children: [skill.downloads != null && _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Download, { className: "h-3 w-3" }), " ", skill.downloads, " downloads"] }), skill.stars != null && skill.stars > 0 && _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Star, { className: "h-3 w-3" }), " ", skill.stars, " stars"] })] }))] }));
}
// ─── Drawer Footer ──────────────────────────────────────────────────────────
function SkillDrawerFooter({ skill, onInstall, onUninstall, onToggle, installPending, uninstallPending }) {
    if (!skill.installed) {
        return (_jsx("div", { className: "flex w-full gap-2", children: _jsxs(Button, { variant: "primary", className: "flex-1", onClick: onInstall, loading: installPending, children: [_jsx(Download, { className: "h-4 w-4" }), " Install from ClawHub"] }) }));
    }
    return (_jsxs("div", { className: "flex w-full items-center gap-2", children: [skill.status === 'ready' && (_jsxs(Button, { variant: skill.enabled ? 'secondary' : 'primary', className: "flex-1", onClick: () => onToggle(!skill.enabled), children: [_jsx(Power, { className: "h-4 w-4" }), " ", skill.enabled ? 'Disable' : 'Enable'] })), _jsx(Button, { variant: "danger", size: "sm", onClick: onUninstall, loading: uninstallPending, children: _jsx(Trash2, { className: "h-4 w-4" }) })] }));
}
// ─── Loading Skeleton ───────────────────────────────────────────────────────
function SkillsLoadingSkeleton() {
    return (_jsxs("div", { className: "flex h-full overflow-hidden", children: [_jsxs("div", { className: "hidden lg:flex flex-col w-52 border-r border-border p-3 gap-2 shrink-0", children: [_jsx(Skeleton, { className: "h-3 w-20 mb-2" }), Array.from({ length: 9 }).map((_, i) => _jsx(Skeleton, { className: "h-7 w-full rounded-lg" }, i))] }), _jsxs("div", { className: "flex-1 flex flex-col overflow-hidden", children: [_jsxs("div", { className: "shrink-0 border-b border-border px-5 py-4 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx(Skeleton, { className: "h-6 w-24" }), _jsx(Skeleton, { className: "mt-1 h-4 w-40" })] }), _jsx(Skeleton, { className: "h-7 w-16" })] }), _jsx(Skeleton, { className: "h-9 w-64" })] }), _jsx("div", { className: "flex-1 p-5", children: _jsx("div", { className: "grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3", children: Array.from({ length: 12 }).map((_, i) => (_jsxs("div", { className: "rounded-xl border border-border p-4 space-y-2", children: [_jsx(Skeleton, { className: "h-4 w-3/4" }), _jsx(Skeleton, { className: "h-3 w-full" }), _jsx(Skeleton, { className: "h-3 w-1/2" })] }, i))) }) })] })] }));
}
//# sourceMappingURL=Skills.js.map