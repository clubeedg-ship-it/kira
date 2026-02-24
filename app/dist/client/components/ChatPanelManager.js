import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Zap } from 'lucide-react';
import { apiRequest } from '../lib/api';
import ChatPanel from './ChatPanel';
/* ── Agent icon helper ─────────────────────────────── */
function agentIcon(name) {
    const lower = name.toLowerCase();
    if (lower.includes('research'))
        return '🔍';
    if (lower.includes('code') || lower.includes('dev'))
        return '💻';
    if (lower.includes('write') || lower.includes('doc'))
        return '📝';
    if (lower.includes('data') || lower.includes('analy'))
        return '📊';
    return '🤖';
}
/* ── ChatPanelManager ──────────────────────────────── */
export default function ChatPanelManager({ selectedConversationId, onConversationChanged }) {
    const queryClient = useQueryClient();
    const [activePanel, setActivePanel] = useState(null);
    const [showNewMenu, setShowNewMenu] = useState(false);
    // Fetch persisted panels
    const { data: panels = [] } = useQuery({
        queryKey: ['panels'],
        queryFn: () => apiRequest('/api/v1/panels'),
        refetchOnWindowFocus: true,
    });
    // Fetch user agents for the [+] dropdown
    const { data: userAgents = [] } = useQuery({
        queryKey: ['user-agents'],
        queryFn: () => apiRequest('/api/v1/user-agents'),
    });
    // Create panel
    const createPanel = useMutation({
        mutationFn: (opts) => apiRequest('/api/v1/panels', {
            method: 'POST',
            body: JSON.stringify(opts),
        }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['panels'] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            setActivePanel(data.id);
            setShowNewMenu(false);
        },
    });
    // Close panel
    const closePanel = useMutation({
        mutationFn: (id) => apiRequest(`/api/v1/panels/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['panels'] });
        },
    });
    // Determine layout mode
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const layoutMode = useMemo(() => {
        if (panels.length <= 1)
            return 'single';
        if (isMobile)
            return 'tabs';
        if (panels.length === 2)
            return 'split';
        return 'tabs';
    }, [panels.length, isMobile]);
    // Set active panel if none selected
    useEffect(() => {
        if (panels.length > 0 && (!activePanel || !panels.find(p => p.id === activePanel))) {
            setActivePanel(panels[0].id);
        }
    }, [panels, activePanel]);
    // Track override conversationId from sidebar
    const [overrideConversationId, setOverrideConversationId] = useState(null);
    // Switch to panel matching selected conversation from sidebar
    // If no panel exists, override the active panel's displayed conversation
    useEffect(() => {
        if (!selectedConversationId || panels.length === 0)
            return;
        const matchingPanel = panels.find(p => p.conversationId === selectedConversationId);
        if (matchingPanel) {
            if (matchingPanel.id !== activePanel) {
                setActivePanel(matchingPanel.id);
            }
            setOverrideConversationId(null);
        }
        else {
            // No panel for this conversation — override active panel display
            setOverrideConversationId(selectedConversationId);
        }
    }, [selectedConversationId, panels, activePanel]);
    // Sync selected conversation back to sidebar when active panel changes
    useEffect(() => {
        if (!activePanel || panels.length === 0)
            return;
        const panel = panels.find(p => p.id === activePanel);
        if (panel && onConversationChanged) {
            onConversationChanged(panel.conversationId);
        }
    }, [activePanel, panels, onConversationChanged]);
    const handleClose = useCallback((panelId) => {
        closePanel.mutate(panelId);
        if (activePanel === panelId) {
            const remaining = panels.filter(p => p.id !== panelId);
            setActivePanel(remaining.length > 0 ? remaining[0].id : null);
        }
    }, [closePanel, activePanel, panels]);
    const handleNewConversation = useCallback(() => {
        createPanel.mutate({ title: 'New Chat' });
    }, [createPanel]);
    const handleNewAgentPanel = useCallback((agent) => {
        createPanel.mutate({ title: agent.name, agentId: agent.id });
    }, [createPanel]);
    // If no panels, show a "start" state that creates one on first use
    if (panels.length === 0) {
        return (_jsxs("div", { className: "flex flex-col h-full items-center justify-center gap-4 bg-zinc-950", children: [_jsx("div", { className: "w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center", children: _jsx(Zap, { size: 24, className: "text-violet-400" }) }), _jsxs("div", { className: "text-center", children: [_jsx("h2", { className: "text-lg font-medium text-zinc-200 mb-1", children: "Kira" }), _jsx("p", { className: "text-sm text-zinc-500 max-w-sm", children: "Your AI executive partner. Start a conversation or open multiple panels to work with different agents in parallel." })] }), _jsx("button", { onClick: handleNewConversation, className: "mt-2 px-4 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 hover:bg-violet-500/20 transition-all", children: "Start a conversation" })] }));
    }
    return (_jsxs("div", { className: "flex flex-col h-full bg-zinc-950", children: [_jsx("div", { className: "flex-1 flex min-h-0", children: layoutMode === 'split' ? (
                // Split: show 2 panels side-by-side
                _jsx(_Fragment, { children: panels.slice(0, 2).map((panel, idx) => (_jsx("div", { className: `flex-1 min-w-0 ${idx === 0 ? 'border-r border-zinc-800' : ''}`, children: _jsx(ChatPanel, { conversationId: (panel.id === activePanel && overrideConversationId) ? overrideConversationId : panel.conversationId, agentName: panel.title, showHeader: true, onClose: () => handleClose(panel.id) }) }, panel.id))) })) : (
                // Single or tabs: keep ALL panels mounted but only show active (prevents unmount/remount losing messages)
                panels.map(panel => (_jsx("div", { className: "flex-1 min-w-0", style: { display: panel.id === activePanel ? 'flex' : 'none', flexDirection: 'column', height: '100%' }, children: _jsx(ChatPanel, { conversationId: (panel.id === activePanel && overrideConversationId) ? overrideConversationId : panel.conversationId, agentName: panels.length > 1 ? panel.title : undefined, showHeader: panels.length > 1, onClose: panels.length > 1 ? () => handleClose(panel.id) : undefined }) }, panel.id)))) }), (panels.length > 1 || layoutMode !== 'single') && (_jsxs("div", { className: "h-10 bg-zinc-900 border-t border-zinc-800 flex items-center px-2 gap-1 flex-shrink-0", children: [panels.map(panel => (_jsxs("button", { onClick: () => setActivePanel(panel.id), className: `group relative flex items-center gap-1.5 px-3 h-8 rounded-md text-xs transition-all ${panel.id === activePanel
                            ? 'text-violet-400 bg-zinc-800/50'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`, children: [_jsx("span", { children: panel.agentId ? agentIcon(panel.title) : '⚡' }), _jsx("span", { className: "truncate max-w-[100px]", children: panel.title }), panels.length > 1 && (_jsx("span", { onClick: (e) => { e.stopPropagation(); handleClose(panel.id); }, className: "opacity-0 group-hover:opacity-100 ml-1 text-zinc-600 hover:text-zinc-300 transition-all cursor-pointer", children: _jsx(X, { size: 10 }) })), panel.id === activePanel && (_jsx("div", { className: "absolute bottom-0 left-2 right-2 h-0.5 bg-violet-500 rounded-full" }))] }, panel.id))), _jsxs("div", { className: "relative", children: [_jsx("button", { onClick: () => setShowNewMenu(!showNewMenu), className: "flex items-center justify-center w-7 h-7 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/40 transition-all", children: _jsx(Plus, { size: 14 }) }), showNewMenu && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-40", onClick: () => setShowNewMenu(false) }), _jsxs("div", { className: "absolute bottom-full left-0 mb-2 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 py-1", children: [_jsxs("button", { onClick: handleNewConversation, className: "w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors", children: [_jsx(Zap, { size: 14, className: "text-violet-400" }), "New conversation"] }), userAgents.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "h-px bg-zinc-800 my-1" }), _jsx("div", { className: "px-3 py-1 text-[10px] text-zinc-600 uppercase tracking-wider", children: "Agents" }), userAgents.map(agent => (_jsxs("button", { onClick: () => handleNewAgentPanel(agent), className: "w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors", children: [_jsx("span", { children: agentIcon(agent.name) }), agent.name, _jsx("span", { className: "ml-auto text-[9px] text-zinc-600", children: agent.model.split('/').pop() })] }, agent.id)))] }))] })] }))] })] })), panels.length === 1 && layoutMode === 'single' && (_jsxs("div", { className: "h-10 bg-zinc-900 border-t border-zinc-800 flex items-center px-2 gap-1 flex-shrink-0", children: [_jsxs("button", { onClick: () => setActivePanel(panels[0].id), className: "group relative flex items-center gap-1.5 px-3 h-8 rounded-md text-xs text-violet-400 bg-zinc-800/50", children: [_jsx("span", { children: "\u26A1" }), _jsx("span", { className: "truncate max-w-[100px]", children: panels[0].title }), _jsx("div", { className: "absolute bottom-0 left-2 right-2 h-0.5 bg-violet-500 rounded-full" })] }), _jsxs("div", { className: "relative", children: [_jsx("button", { onClick: () => setShowNewMenu(!showNewMenu), className: "flex items-center justify-center w-7 h-7 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/40 transition-all", children: _jsx(Plus, { size: 14 }) }), showNewMenu && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-40", onClick: () => setShowNewMenu(false) }), _jsxs("div", { className: "absolute bottom-full left-0 mb-2 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 py-1", children: [_jsxs("button", { onClick: handleNewConversation, className: "w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors", children: [_jsx(Zap, { size: 14, className: "text-violet-400" }), "New conversation"] }), userAgents.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "h-px bg-zinc-800 my-1" }), _jsx("div", { className: "px-3 py-1 text-[10px] text-zinc-600 uppercase tracking-wider", children: "Agents" }), userAgents.map(agent => (_jsxs("button", { onClick: () => handleNewAgentPanel(agent), className: "w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors", children: [_jsx("span", { children: agentIcon(agent.name) }), agent.name, _jsx("span", { className: "ml-auto text-[9px] text-zinc-600", children: agent.model.split('/').pop() })] }, agent.id)))] }))] })] }))] })] }))] }));
}
//# sourceMappingURL=ChatPanelManager.js.map