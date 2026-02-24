import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, PanelLeftClose, PanelLeftOpen, Pencil, Trash2 } from 'lucide-react';

import { apiRequest } from '../lib/api';
import { useI18n } from '../i18n';
import ChatPanelManager from '../components/ChatPanelManager';

interface Conversation {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Inline-editable conversation row ── */

function ConversationRow({
  conv,
  isSelected,
  onSelect,
  onDelete,
  onRename,
}: {
  conv: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conv.title);
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div
      onClick={() => { if (!editing) onSelect(); }}
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg mb-0.5 transition-all cursor-pointer ${
        isSelected
          ? 'text-zinc-200 bg-zinc-800/60'
          : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-300'
      }`}
    >
      <MessageSquare size={13} className="flex-shrink-0 opacity-40" />

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          onBlur={commit}
          className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-sm text-zinc-200 outline-none focus:border-violet-500/50"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-sm truncate">{conv.title}</span>
      )}

      {!editing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
          <button
            className="text-zinc-600 hover:text-zinc-300 transition-colors p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              setDraft(conv.title);
              setEditing(true);
            }}
            title="Rename"
          >
            <Pencil size={11} />
          </button>
          <button
            className="text-zinc-600 hover:text-red-400 transition-colors p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Chat page ── */

export default function Chat() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return localStorage.getItem('kira-sidebar') !== 'closed';
  });
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('kira-sidebar', sidebarOpen ? 'open' : 'closed');
  }, [sidebarOpen]);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: () => apiRequest('/api/v1/chat/conversations'),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const deleteConv = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/v1/chat/conversations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const renameConv = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      apiRequest(`/api/v1/chat/conversations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  return (
    <div className="relative flex h-full overflow-hidden -m-6">
      {/* Conversation sidebar */}
      <div
        className={`${sidebarOpen ? 'w-72' : 'w-0'} overflow-hidden transition-all duration-200 border-r border-zinc-800/50 flex-shrink-0 bg-zinc-950/80 flex flex-col`}
      >
        <div className="p-3 flex items-center min-w-[18rem]">
          <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{t('chat.history')}</div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 min-w-[18rem]">
          {conversations.map((conv) => (
            <ConversationRow
              key={conv.id}
              conv={conv}
              isSelected={selectedConversationId === conv.id}
              onSelect={() => setSelectedConversationId(conv.id)}
              onDelete={() => deleteConv.mutate(conv.id)}
              onRename={(title) => renameConv.mutate({ id: conv.id, title })}
            />
          ))}
        </div>
      </div>

      {/* Main chat area — managed by ChatPanelManager */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — single sidebar toggle button */}
        <div className="flex items-center gap-3 px-4 h-11 border-b border-zinc-800/40 flex-shrink-0">
          <button
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          <span className="text-sm text-zinc-300 font-medium">{t('nav.chat')}</span>
        </div>

        {/* Panel manager fills remaining space */}
        <div className="flex-1 min-h-0">
          <ChatPanelManager selectedConversationId={selectedConversationId} onConversationChanged={setSelectedConversationId} />
        </div>
      </div>
    </div>
  );
}
