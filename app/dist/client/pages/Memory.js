import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, Network, FileText, Search, Plus, Bot, Pencil, Clock } from 'lucide-react';
export default function Memory() {
    const [view, setView] = useState('notes');
    const [search, setSearch] = useState('');
    const [newNote, setNewNote] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const queryClient = useQueryClient();
    // Fetch memories from identity file + short-term
    const { data: memories = [], isLoading } = useQuery({
        queryKey: ['memories'],
        queryFn: async () => {
            // Get long-term memory file
            const identResp = await fetch('/api/v1/identity', { credentials: 'include' });
            const identData = await identResp.json();
            const memContent = identData.data?.memory?.content || '';
            // Parse memory entries from markdown
            const entries = [];
            const lines = memContent.split('\n').filter((l) => l.trim().startsWith('- ['));
            for (const line of lines) {
                const match = line.match(/^- \[(\d{4}-\d{2}-\d{2})\] \[(\w+)\] (.+)$/);
                if (match) {
                    entries.push({
                        id: `lt-${entries.length}`,
                        content: match[3],
                        category: match[2],
                        createdAt: match[1],
                        source: 'agent',
                    });
                }
            }
            // Get short-term memories
            try {
                const stResp = await fetch('/api/v1/memory/short-term', { credentials: 'include' });
                if (stResp.ok) {
                    const stData = await stResp.json();
                    for (const m of stData.data || []) {
                        entries.push({
                            id: `st-${m.id}`,
                            content: m.content,
                            createdAt: m.createdAt,
                            source: m.source || 'agent',
                        });
                    }
                }
            }
            catch {
                // short-term API may not exist yet
            }
            return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        },
    });
    const addMemoryMut = useMutation({
        mutationFn: async (content) => {
            const identResp = await fetch('/api/v1/identity', { credentials: 'include' });
            const identData = await identResp.json();
            const current = identData.data?.memory?.content || '# Long-Term Memory\n';
            const date = new Date().toISOString().split('T')[0];
            const updated = current + `\n- [${date}] [note] ${content}`;
            await fetch('/api/v1/identity/memory', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content: updated }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['memories'] });
            setNewNote('');
        },
    });
    const filtered = search
        ? memories.filter((m) => m.content.toLowerCase().includes(search.toLowerCase()))
        : memories;
    const TABS = [
        { key: 'notes', label: 'Notes', icon: Brain },
        { key: 'graph', label: 'Graph', icon: Network },
        { key: 'files', label: 'Files', icon: FileText },
    ];
    return (_jsxs("div", { className: "flex flex-col h-full", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-zinc-800", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-lg font-semibold text-zinc-200", children: "Memory" }), _jsxs("p", { className: "text-xs text-zinc-500", children: [memories.length, " memories stored"] })] }), _jsx("div", { className: "flex gap-1 bg-zinc-900 rounded-lg p-0.5", children: TABS.map((tab) => {
                            const Icon = tab.icon;
                            return (_jsxs("button", { onClick: () => setView(tab.key), className: `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === tab.key
                                    ? 'bg-zinc-800 text-zinc-200'
                                    : 'text-zinc-500 hover:text-zinc-300'}`, children: [_jsx(Icon, { size: 14 }), tab.label] }, tab.key));
                        }) })] }), view === 'notes' && (_jsxs("div", { className: "flex-1 overflow-auto p-6", children: [_jsx("div", { className: "flex gap-2 mb-4", children: _jsxs("div", { className: "flex-1 relative", children: [_jsx(Search, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" }), _jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search memories...", className: "w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50" })] }) }), _jsxs("div", { className: "flex gap-2 mb-6", children: [_jsx("input", { type: "text", value: newNote, onChange: (e) => setNewNote(e.target.value), placeholder: "Add a memory...", onKeyDown: (e) => {
                                    if (e.key === 'Enter' && newNote.trim())
                                        addMemoryMut.mutate(newNote.trim());
                                }, className: "flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50" }), _jsx("button", { onClick: () => newNote.trim() && addMemoryMut.mutate(newNote.trim()), disabled: !newNote.trim(), className: "px-3 py-2 bg-violet-500/20 text-violet-300 rounded-lg text-sm hover:bg-violet-500/30 disabled:opacity-50 transition-colors", children: _jsx(Plus, { size: 16 }) })] }), _jsxs("div", { className: "space-y-2", children: [filtered.map((mem) => (_jsxs("div", { className: "group flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-900/50 transition-colors", children: [_jsx("div", { className: `mt-0.5 p-1 rounded ${mem.source === 'agent'
                                            ? 'bg-violet-500/20 text-violet-400'
                                            : 'bg-zinc-800 text-zinc-500'}`, children: mem.source === 'agent' ? _jsx(Bot, { size: 12 }) : _jsx(Pencil, { size: 12 }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [editingId === mem.id ? (_jsx("input", { type: "text", value: editContent, onChange: (e) => setEditContent(e.target.value), onBlur: () => setEditingId(null), onKeyDown: (e) => {
                                                    if (e.key === 'Enter')
                                                        setEditingId(null);
                                                    if (e.key === 'Escape')
                                                        setEditingId(null);
                                                }, autoFocus: true, className: "w-full px-2 py-1 bg-zinc-950 border border-violet-500/50 rounded text-sm text-zinc-300" })) : (_jsx("p", { className: "text-sm text-zinc-300 cursor-pointer", onClick: () => {
                                                    setEditingId(mem.id);
                                                    setEditContent(mem.content);
                                                }, children: mem.content })), _jsxs("div", { className: "flex items-center gap-2 mt-1", children: [_jsxs("span", { className: "text-[10px] text-zinc-600 flex items-center gap-1", children: [_jsx(Clock, { size: 10 }), " ", mem.createdAt] }), mem.category && (_jsx("span", { className: "text-[10px] bg-zinc-800 text-zinc-500 px-1.5 rounded", children: mem.category }))] })] })] }, mem.id))), filtered.length === 0 && (_jsxs("div", { className: "text-center py-12 text-zinc-600", children: [_jsx(Brain, { size: 32, className: "mx-auto mb-2 opacity-50" }), _jsx("p", { className: "text-sm", children: search ? 'No memories match your search' : 'No memories yet. Start chatting!' })] }))] })] })), view === 'graph' && (_jsxs("div", { className: "flex-1 p-6", children: [_jsx("p", { className: "text-sm text-zinc-500 mb-4", children: "Knowledge graph visualization \u2014 entities and relationships" }), _jsx("div", { className: "bg-zinc-950 border border-zinc-800 rounded-xl h-[calc(100vh-200px)] flex items-center justify-center text-zinc-600", children: _jsx("p", { className: "text-sm", children: "Graph view \u2014 integrate existing Knowledge.tsx canvas here" }) })] })), view === 'files' && (_jsxs("div", { className: "flex-1 p-6", children: [_jsx("p", { className: "text-sm text-zinc-500 mb-4", children: "Your agent's identity files \u2014 edit directly" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: ['soul', 'profile', 'instructions', 'tools', 'memory'].map((key) => (_jsxs("a", { href: "/settings", className: "p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(FileText, { size: 14, className: "text-violet-400" }), _jsx("span", { className: "text-sm font-medium text-zinc-200 capitalize", children: key })] }), _jsxs("p", { className: "text-xs text-zinc-600", children: [key === 'soul' && 'Agent personality, tone, and boundaries', key === 'profile' && 'What the agent knows about you', key === 'instructions' && 'Operating rules and priorities', key === 'tools' && 'Learned tool preferences', key === 'memory' && 'Long-term curated knowledge'] })] }, key))) })] }))] }));
}
//# sourceMappingURL=Memory.js.map