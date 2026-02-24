import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../i18n';
import { Globe, CheckSquare, Code, BarChart3, PenTool, Target, Zap, Download, Power, Trash2, Search, X, ExternalLink, Shield, Server, Database, Mail, Calendar, StickyNote, Share2, FileText, Languages, Table, DollarSign, Handshake, Heart, Wallet, Plane, GraduationCap, MessageCircle, BookOpen, Lightbulb, Scale, Star, Briefcase, TrendingUp, User, Grid, ChefHat, Megaphone, FileBarChart, Presentation, BadgeCheck, Sparkles, RefreshCw, Filter, } from 'lucide-react';
const ICON_MAP = {
    Globe, CheckSquare, Code, BarChart3, PenTool, Target, Zap, Shield, Server, Database,
    Mail, Calendar, StickyNote, Share2, FileText, Languages, Table, DollarSign, Handshake,
    Heart, Wallet, Plane, GraduationCap, MessageCircle, BookOpen, Lightbulb, Scale,
    Star, Briefcase, TrendingUp, User, Grid, ChefHat, Megaphone, FileBarChart, Presentation,
};
const getIcon = (name) => ICON_MAP[name] || Zap;
const CATEGORIES = [
    { key: 'all', label: 'All Skills', icon: Grid },
    { key: 'productivity', label: 'Productivity', icon: Briefcase },
    { key: 'coding', label: 'Coding', icon: Code },
    { key: 'writing', label: 'Writing', icon: PenTool },
    { key: 'data', label: 'Data & Analysis', icon: BarChart3 },
    { key: 'business', label: 'Business', icon: TrendingUp },
    { key: 'personal', label: 'Personal', icon: User },
    { key: 'learning', label: 'Learning', icon: GraduationCap },
    { key: 'creative', label: 'Creative', icon: Lightbulb },
    { key: 'legal', label: 'Legal', icon: Scale },
    { key: 'marketing', label: 'Marketing', icon: Megaphone },
    { key: 'health', label: 'Health', icon: Heart },
    { key: 'finance', label: 'Finance', icon: DollarSign },
];
export default function Skills() {
    const queryClient = useQueryClient();
    const { t } = useI18n();
    const [tab, setTab] = useState('library');
    const [category, setCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const { data: skills = [], isLoading } = useQuery({
        queryKey: ['skills'],
        queryFn: async () => {
            const resp = await fetch('/api/v1/skills', { credentials: 'include' });
            const json = await resp.json();
            return json.data;
        },
    });
    const installMut = useMutation({
        mutationFn: async (skillId) => {
            await fetch(`/api/v1/skills/${skillId}/install`, { method: 'POST', credentials: 'include' });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills'] }),
    });
    const uninstallMut = useMutation({
        mutationFn: async (skillId) => {
            await fetch(`/api/v1/skills/${skillId}/uninstall`, { method: 'POST', credentials: 'include' });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills'] }),
    });
    const toggleMut = useMutation({
        mutationFn: async ({ skillId, enabled }) => {
            await fetch(`/api/v1/skills/${skillId}/toggle`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled }),
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills'] }),
    });
    const discoverMut = useMutation({
        mutationFn: async () => {
            const resp = await fetch('/api/v1/skills/discover', { method: 'POST', credentials: 'include' });
            return resp.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills'] }),
    });
    const filtered = useMemo(() => {
        let list = skills;
        // Tab filter
        if (tab === 'installed') {
            list = list.filter(s => s.installed);
        }
        // Category filter (matches subcategory)
        if (category !== 'all') {
            list = list.filter(s => s.subcategory === category ||
                s.category === category ||
                (s.tags && s.tags.toLowerCase().includes(category)));
        }
        // Search
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(s => s.name.toLowerCase().includes(q) ||
                s.description.toLowerCase().includes(q) ||
                (s.tags && s.tags.toLowerCase().includes(q)) ||
                (s.author && s.author.toLowerCase().includes(q)));
        }
        return list;
    }, [skills, tab, category, search]);
    // Count skills per category for badges
    const categoryCounts = useMemo(() => {
        const base = tab === 'installed' ? skills.filter(s => s.installed) : skills;
        const counts = { all: base.length };
        for (const s of base) {
            const sub = s.subcategory || s.category || 'other';
            counts[sub] = (counts[sub] || 0) + 1;
            // Also count by tags
            if (s.tags) {
                for (const t of s.tags.split(',')) {
                    const tag = t.trim().toLowerCase();
                    if (tag)
                        counts[tag] = (counts[tag] || 0) + 1;
                }
            }
        }
        return counts;
    }, [skills, tab]);
    if (isLoading) {
        return (_jsx("div", { className: "flex items-center justify-center h-full", children: _jsx("div", { className: "animate-pulse text-zinc-500", children: "Loading skills marketplace..." }) }));
    }
    return (_jsxs("div", { className: "flex h-full overflow-hidden", children: [_jsxs("div", { className: "hidden lg:flex flex-col w-52 border-r border-zinc-800 p-3 gap-1 overflow-y-auto shrink-0", children: [_jsx("div", { className: "text-[10px] uppercase tracking-wider text-zinc-600 font-medium px-2 mb-1", children: "Categories" }), CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        const count = categoryCounts[cat.key] || 0;
                        const active = category === cat.key;
                        return (_jsxs("button", { onClick: () => setCategory(cat.key), className: `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${active
                                ? 'bg-violet-500/15 text-violet-300 font-medium'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`, children: [_jsx(Icon, { size: 14 }), _jsx("span", { className: "flex-1 text-left", children: cat.label }), count > 0 && (_jsx("span", { className: `text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-violet-500/20 text-violet-300' : 'bg-zinc-800 text-zinc-600'}`, children: count }))] }, cat.key));
                    })] }), _jsxs("div", { className: "flex-1 flex flex-col overflow-hidden", children: [_jsxs("div", { className: "p-4 pb-3 border-b border-zinc-800 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-lg font-semibold text-zinc-200 flex items-center gap-2", children: [_jsx(Sparkles, { size: 20, className: "text-violet-400" }), t('skills.title')] }), _jsxs("p", { className: "text-xs text-zinc-500 mt-0.5", children: [skills.length, " skills available \u00B7 ", skills.filter(s => s.installed).length, " installed"] })] }), _jsxs("button", { onClick: () => discoverMut.mutate(), disabled: discoverMut.isPending, className: "flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50", children: [_jsx(RefreshCw, { size: 12, className: discoverMut.isPending ? 'animate-spin' : '' }), "Discover"] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "flex bg-zinc-900 rounded-lg p-0.5", children: [_jsx("button", { onClick: () => setTab('library'), className: `px-3 py-1 text-xs rounded-md transition-all ${tab === 'library' ? 'bg-zinc-800 text-zinc-200 font-medium' : 'text-zinc-500 hover:text-zinc-400'}`, children: "Library" }), _jsxs("button", { onClick: () => setTab('installed'), className: `px-3 py-1 text-xs rounded-md transition-all ${tab === 'installed' ? 'bg-zinc-800 text-zinc-200 font-medium' : 'text-zinc-500 hover:text-zinc-400'}`, children: ["My Skills (", skills.filter(s => s.installed).length, ")"] })] }), _jsxs("div", { className: "flex-1 relative", children: [_jsx(Search, { size: 14, className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" }), _jsx("input", { type: "text", value: search, onChange: e => setSearch(e.target.value), placeholder: t('skills.search'), className: "w-full pl-8 pr-8 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700" }), search && (_jsx("button", { onClick: () => setSearch(''), className: "absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400", children: _jsx(X, { size: 12 }) }))] }), _jsx("button", { onClick: () => setShowFilters(!showFilters), className: "lg:hidden flex items-center gap-1 px-2 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400", children: _jsx(Filter, { size: 12 }) })] }), showFilters && (_jsx("div", { className: "lg:hidden flex flex-wrap gap-1.5", children: CATEGORIES.map(cat => {
                                    const active = category === cat.key;
                                    return (_jsx("button", { onClick: () => { setCategory(cat.key); setShowFilters(false); }, className: `px-2.5 py-1 text-[11px] rounded-full transition-all ${active ? 'bg-violet-500/20 text-violet-300' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-400'}`, children: cat.label }, cat.key));
                                }) }))] }), _jsx("div", { className: "flex-1 overflow-y-auto p-4", children: filtered.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 text-zinc-500", children: [_jsx(Search, { size: 32, className: "mb-3 opacity-50" }), _jsx("p", { className: "text-sm", children: "No skills found" }), _jsx("p", { className: "text-xs mt-1", children: "Try a different search or category" })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3", children: filtered.map(skill => (_jsx(SkillCard, { skill: skill, onInstall: () => installMut.mutate(skill.id), onUninstall: () => uninstallMut.mutate(skill.id), onToggle: (enabled) => toggleMut.mutate({ skillId: skill.id, enabled }), onClick: () => setSelectedSkill(skill) }, skill.id))) })) })] }), selectedSkill && (_jsx(SkillDetailModal, { skill: selectedSkill, onClose: () => setSelectedSkill(null), onInstall: () => { installMut.mutate(selectedSkill.id); }, onUninstall: () => { uninstallMut.mutate(selectedSkill.id); }, onToggle: (enabled) => { toggleMut.mutate({ skillId: selectedSkill.id, enabled }); } }))] }));
}
function SkillCard({ skill, onInstall, onUninstall, onToggle, onClick }) {
    const Icon = getIcon(skill.icon);
    const tags = skill.tags?.split(',').filter(Boolean).slice(0, 3) || [];
    return (_jsxs("div", { className: `group p-4 rounded-xl border transition-all cursor-pointer ${skill.installed && skill.enabled
            ? 'bg-violet-500/5 border-violet-500/20 hover:border-violet-500/30'
            : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}`, onClick: onClick, children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: `p-2 rounded-xl ${skill.installed && skill.enabled
                                    ? 'bg-violet-500/20 text-violet-400'
                                    : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-300'}`, children: _jsx(Icon, { size: 18 }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("h3", { className: "text-sm font-medium text-zinc-200", children: skill.name }), skill.isVerified && _jsx(BadgeCheck, { size: 12, className: "text-blue-400" })] }), _jsxs("div", { className: "flex items-center gap-1.5 mt-0.5", children: [_jsx("span", { className: "text-[10px] text-zinc-600", children: skill.author || 'Unknown' }), skill.version && _jsxs("span", { className: "text-[10px] text-zinc-700", children: ["v", skill.version] })] })] })] }), skill.isPremium && (_jsx("span", { className: "text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-medium", children: "PRO" }))] }), _jsx("p", { className: "text-xs text-zinc-500 mb-3 line-clamp-2", children: skill.description }), tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1 mb-3", children: tags.map(tag => (_jsx("span", { className: "text-[10px] px-1.5 py-0.5 bg-zinc-800/80 text-zinc-500 rounded", children: tag.trim() }, tag))) })), _jsxs("div", { className: "flex items-center gap-2", onClick: e => e.stopPropagation(), children: [!skill.installed ? (_jsxs("button", { onClick: onInstall, className: "flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-500/20 text-violet-300 rounded-lg hover:bg-violet-500/30 transition-colors font-medium", children: [_jsx(Download, { size: 12 }), " Install"] })) : (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => onToggle(!skill.enabled), className: `flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${skill.enabled
                                    ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                                    : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`, children: [_jsx(Power, { size: 12 }), " ", skill.enabled ? 'Enabled' : 'Disabled'] }), _jsx("button", { onClick: onUninstall, className: "p-1.5 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800", children: _jsx(Trash2, { size: 12 }) })] })), skill.sourceUrl && (_jsx("a", { href: skill.sourceUrl, target: "_blank", rel: "noopener noreferrer", className: "ml-auto p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors", onClick: e => e.stopPropagation(), children: _jsx(ExternalLink, { size: 12 }) }))] })] }));
}
function SkillDetailModal({ skill, onClose, onInstall, onUninstall, onToggle }) {
    const Icon = getIcon(skill.icon);
    const [showInstructions, setShowInstructions] = useState(false);
    const tags = skill.tags?.split(',').filter(Boolean) || [];
    const { data: instructionsData } = useQuery({
        queryKey: ['skill-instructions', skill.id],
        queryFn: async () => {
            const resp = await fetch(`/api/v1/skills/${skill.id}/instructions`, { credentials: 'include' });
            const json = await resp.json();
            return json.data?.instructions || '';
        },
        enabled: showInstructions,
    });
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm", onClick: onClose, children: _jsxs("div", { className: "bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col mx-4", onClick: e => e.stopPropagation(), children: [_jsx("div", { className: "p-5 border-b border-zinc-800", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `p-3 rounded-xl ${skill.installed && skill.enabled
                                            ? 'bg-violet-500/20 text-violet-400'
                                            : 'bg-zinc-800 text-zinc-400'}`, children: _jsx(Icon, { size: 24 }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h2", { className: "text-base font-semibold text-zinc-200", children: skill.name }), skill.isVerified && _jsx(BadgeCheck, { size: 14, className: "text-blue-400" }), skill.isPremium && (_jsx("span", { className: "text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-medium", children: "PRO" }))] }), _jsxs("div", { className: "flex items-center gap-2 mt-0.5 text-xs text-zinc-500", children: [_jsx("span", { children: skill.author || 'Unknown' }), skill.version && _jsxs("span", { children: ["\u00B7 v", skill.version] }), skill.subcategory && _jsxs("span", { children: ["\u00B7 ", skill.subcategory] })] })] })] }), _jsx("button", { onClick: onClose, className: "p-1 text-zinc-600 hover:text-zinc-400", children: _jsx(X, { size: 16 }) })] }) }), _jsxs("div", { className: "flex-1 overflow-y-auto p-5 space-y-4", children: [_jsx("p", { className: "text-sm text-zinc-400", children: skill.description }), skill.longDescription && (_jsx("div", { className: "text-xs text-zinc-500 whitespace-pre-wrap leading-relaxed", children: skill.longDescription })), tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1.5", children: tags.map(tag => (_jsx("span", { className: "text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full", children: tag.trim() }, tag))) })), skill.sourceUrl && (_jsxs("a", { href: skill.sourceUrl, target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300", children: [_jsx(ExternalLink, { size: 12 }), " View source"] })), _jsxs("div", { children: [_jsx("button", { onClick: () => setShowInstructions(!showInstructions), className: "text-xs text-zinc-500 hover:text-zinc-400 underline", children: showInstructions ? 'Hide instructions' : 'Show instructions' }), showInstructions && instructionsData && (_jsx("pre", { className: "mt-2 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-zinc-400 whitespace-pre-wrap overflow-x-auto max-h-60", children: instructionsData }))] })] }), _jsx("div", { className: "p-4 border-t border-zinc-800 flex items-center gap-2", children: !skill.installed ? (_jsxs("button", { onClick: onInstall, className: "flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors font-medium", children: [_jsx(Download, { size: 14 }), " Install Skill"] })) : (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => onToggle(!skill.enabled), className: `flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-xl transition-colors font-medium ${skill.enabled
                                    ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`, children: [_jsx(Power, { size: 14 }), " ", skill.enabled ? 'Enabled' : 'Disabled'] }), _jsx("button", { onClick: onUninstall, className: "px-4 py-2 text-sm text-red-400 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors", children: _jsx(Trash2, { size: 14 }) })] })) })] }) }));
}
//# sourceMappingURL=Skills.js.map