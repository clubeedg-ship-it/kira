import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, PanelLeftClose, PanelLeftOpen, Pencil, Trash2 } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useI18n } from '../i18n';
import ChatPanelManager from '../components/ChatPanelManager';
/* ── Inline-editable conversation row ── */
function ConversationRow({ conv, isSelected, onSelect, onDelete, onRename, }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(conv.title);
    const inputRef = useRef(null);
    useEffect(() => {
        if (editing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [editing]);
    const commit = useCallback(() => {
        const trimmed = draft.trim();
        if (trimmed && trimmed !== conv.title) {
            onRename(trimmed);
        }
        setEditing(false);
    }, [draft, conv.title, onRename]);
    const cancel = useCallback(() => {
        setDraft(conv.title);
        setEditing(false);
    }, [conv.title]);
    return (_jsxs("div", { onClick: () => { if (!editing)
            onSelect(); }, className: `group flex items-center gap-2 px-3 py-2 rounded-lg mb-0.5 transition-all cursor-pointer ${isSelected
            ? 'text-zinc-200 bg-zinc-800/60'
            : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-300'}`, children: [_jsx(MessageSquare, { size: 13, className: "flex-shrink-0 opacity-40" }), editing ? (_jsx("input", { ref: inputRef, value: draft, onChange: (e) => setDraft(e.target.value), onKeyDown: (e) => {
                    if (e.key === 'Enter')
                        commit();
                    if (e.key === 'Escape')
                        cancel();
                }, onBlur: commit, className: "flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-sm text-zinc-200 outline-none focus:border-violet-500/50", onClick: (e) => e.stopPropagation() })) : (_jsx("span", { className: "flex-1 text-sm truncate", children: conv.title })), !editing && (_jsxs("div", { className: "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all", children: [_jsx("button", { className: "text-zinc-600 hover:text-zinc-300 transition-colors p-0.5", onClick: (e) => {
                            e.stopPropagation();
                            setDraft(conv.title);
                            setEditing(true);
                        }, title: "Rename", children: _jsx(Pencil, { size: 11 }) }), _jsx("button", { className: "text-zinc-600 hover:text-red-400 transition-colors p-0.5", onClick: (e) => {
                            e.stopPropagation();
                            onDelete();
                        }, title: "Delete", children: _jsx(Trash2, { size: 11 }) })] }))] }));
}
/* ── Chat page ── */
export default function Chat() {
    const queryClient = useQueryClient();
    const { t } = useI18n();
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        return localStorage.getItem('kira-sidebar') !== 'closed';
    });
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    useEffect(() => {
        localStorage.setItem('kira-sidebar', sidebarOpen ? 'open' : 'closed');
    }, [sidebarOpen]);
    const { data: conversations = [] } = useQuery({
        queryKey: ['conversations'],
        queryFn: () => apiRequest('/api/v1/chat/conversations'),
        refetchInterval: 5000,
        refetchOnWindowFocus: true,
    });
    const deleteConv = useMutation({
        mutationFn: (id) => apiRequest(`/api/v1/chat/conversations/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
    });
    const renameConv = useMutation({
        mutationFn: ({ id, title }) => apiRequest(`/api/v1/chat/conversations/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ title }),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
    });
    return (_jsxs("div", { className: "relative flex h-full overflow-hidden -m-6", children: [_jsxs("div", { className: `${sidebarOpen ? 'w-72' : 'w-0'} overflow-hidden transition-all duration-200 border-r border-zinc-800/50 flex-shrink-0 bg-zinc-950/80 flex flex-col`, children: [_jsx("div", { className: "p-3 flex items-center min-w-[18rem]", children: _jsx("div", { className: "text-xs text-zinc-500 font-medium uppercase tracking-wider", children: t('chat.history') }) }), _jsx("div", { className: "flex-1 overflow-y-auto px-2 min-w-[18rem]", children: conversations.map((conv) => (_jsx(ConversationRow, { conv: conv, isSelected: selectedConversationId === conv.id, onSelect: () => setSelectedConversationId(conv.id), onDelete: () => deleteConv.mutate(conv.id), onRename: (title) => renameConv.mutate({ id: conv.id, title }) }, conv.id))) })] }), _jsxs("div", { className: "flex-1 flex flex-col min-w-0", children: [_jsxs("div", { className: "flex items-center gap-3 px-4 h-11 border-b border-zinc-800/40 flex-shrink-0", children: [_jsx("button", { className: "text-zinc-500 hover:text-zinc-300 transition-colors", onClick: () => setSidebarOpen(!sidebarOpen), children: sidebarOpen ? _jsx(PanelLeftClose, { size: 16 }) : _jsx(PanelLeftOpen, { size: 16 }) }), _jsx("span", { className: "text-sm text-zinc-300 font-medium", children: t('nav.chat') })] }), _jsx("div", { className: "flex-1 min-h-0", children: _jsx(ChatPanelManager, { selectedConversationId: selectedConversationId, onConversationChanged: setSelectedConversationId }) })] })] }));
}
//# sourceMappingURL=Chat.js.map