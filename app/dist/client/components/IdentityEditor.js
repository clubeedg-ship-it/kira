import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Bot, User, Wrench, Brain, RotateCcw, Save } from 'lucide-react';
const FILE_TABS = [
    { key: 'soul', label: 'Soul', icon: Bot, description: 'Agent personality, tone, and boundaries' },
    { key: 'profile', label: 'Profile', icon: User, description: 'What the agent knows about you' },
    { key: 'instructions', label: 'Instructions', icon: FileText, description: 'Operating rules and priorities' },
    { key: 'tools', label: 'Tools', icon: Wrench, description: 'Learned tool preferences (agent-maintained)' },
    { key: 'memory', label: 'Memory', icon: Brain, description: 'Long-term curated knowledge' },
];
export default function IdentityEditor() {
    const [activeTab, setActiveTab] = useState('soul');
    const [editContent, setEditContent] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const queryClient = useQueryClient();
    const { data: identity, isLoading } = useQuery({
        queryKey: ['identity'],
        queryFn: async () => {
            const resp = await fetch('/api/v1/identity', { credentials: 'include' });
            const json = await resp.json();
            return json.data;
        },
    });
    const saveMutation = useMutation({
        mutationFn: async ({ fileKey, content }) => {
            await fetch(`/api/v1/identity/${fileKey}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['identity'] });
            setHasChanges(false);
        },
    });
    const resetMutation = useMutation({
        mutationFn: async (fileKey) => {
            await fetch(`/api/v1/identity/reset/${fileKey}`, {
                method: 'POST',
                credentials: 'include',
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['identity'] }),
    });
    useEffect(() => {
        if (identity && identity[activeTab]) {
            setEditContent(identity[activeTab].content);
            setHasChanges(false);
        }
    }, [activeTab, identity]);
    if (isLoading)
        return _jsx("div", { className: "text-zinc-500 p-4", children: "Loading identity..." });
    const currentFile = identity?.[activeTab];
    return (_jsxs("div", { className: "flex flex-col h-full", children: [_jsx("div", { className: "flex gap-1 p-2 border-b border-zinc-800 overflow-x-auto", children: FILE_TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (_jsxs("button", { onClick: () => setActiveTab(tab.key), className: `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                ${isActive ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`, children: [_jsx(Icon, { size: 14 }), tab.label, currentFile?.updatedBy === 'agent' && tab.key === activeTab && (_jsx("span", { className: "text-[10px] bg-violet-500/20 px-1 rounded", children: "\uD83E\uDD16" }))] }, tab.key));
                }) }), _jsxs("div", { className: "px-4 py-2 text-xs text-zinc-600 border-b border-zinc-800/50", children: [FILE_TABS.find(t => t.key === activeTab)?.description, currentFile?.version > 0 && (_jsxs("span", { className: "ml-2 text-zinc-700", children: ["v", currentFile.version, " \u00B7 Last updated by ", currentFile.updatedBy] }))] }), _jsx("div", { className: "flex-1 p-4 overflow-auto", children: _jsx("textarea", { value: editContent, onChange: (e) => { setEditContent(e.target.value); setHasChanges(true); }, className: "w-full h-full min-h-[400px] bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 font-mono resize-none focus:outline-none focus:border-violet-500/50", placeholder: "Start writing...", spellCheck: false }) }), _jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-t border-zinc-800", children: [_jsx("div", { className: "flex gap-2", children: _jsxs("button", { onClick: () => resetMutation.mutate(activeTab), className: "flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 rounded-lg transition-colors", children: [_jsx(RotateCcw, { size: 12 }), " Reset to default"] }) }), _jsxs("button", { onClick: () => saveMutation.mutate({ fileKey: activeTab, content: editContent }), disabled: !hasChanges || saveMutation.isPending, className: `flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg transition-colors
            ${hasChanges ? 'bg-violet-500 text-white hover:bg-violet-400' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`, children: [_jsx(Save, { size: 12 }), " ", saveMutation.isPending ? 'Saving...' : 'Save'] })] })] }));
}
//# sourceMappingURL=IdentityEditor.js.map