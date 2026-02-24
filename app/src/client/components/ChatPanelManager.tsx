import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Zap } from 'lucide-react';

import { apiRequest } from '../lib/api';
import ChatPanel from './ChatPanel';

/* ── Types ─────────────────────────────────────────── */

interface PanelData {
  id: string;
  agentId?: string | null;
  conversationId: string;
  title: string;
  position: number;
  isActive: boolean;
}

interface UserAgent {
  id: string;
  name: string;
  type: string;
  model: string;
  systemPrompt: string;
}

interface Conversation {
  id: string;
  title: string;
  model: string;
}

type LayoutMode = 'single' | 'split' | 'tabs';

/* ── Agent icon helper ─────────────────────────────── */

function agentIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('research')) return '🔍';
  if (lower.includes('code') || lower.includes('dev')) return '💻';
  if (lower.includes('write') || lower.includes('doc')) return '📝';
  if (lower.includes('data') || lower.includes('analy')) return '📊';
  return '🤖';
}

/* ── ChatPanelManager ──────────────────────────────── */

export default function ChatPanelManager({ selectedConversationId, onConversationChanged }: { selectedConversationId?: string | null; onConversationChanged?: (id: string | null) => void }) {
  const queryClient = useQueryClient();
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);

  // Fetch persisted panels
  const { data: panels = [] } = useQuery<PanelData[]>({
    queryKey: ['panels'],
    queryFn: () => apiRequest('/api/v1/panels'),
    refetchOnWindowFocus: true,
  });

  // Fetch user agents for the [+] dropdown
  const { data: userAgents = [] } = useQuery<UserAgent[]>({
    queryKey: ['user-agents'],
    queryFn: () => apiRequest('/api/v1/user-agents'),
  });

  // Create panel
  const createPanel = useMutation({
    mutationFn: (opts: { title: string; agentId?: string }) =>
      apiRequest<PanelData & { conversation: Conversation }>('/api/v1/panels', {
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
    mutationFn: (id: string) =>
      apiRequest(`/api/v1/panels/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panels'] });
    },
  });

  // Determine layout mode
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const layoutMode: LayoutMode = useMemo(() => {
    if (panels.length <= 1) return 'single';
    if (isMobile) return 'tabs';
    if (panels.length === 2) return 'split';
    return 'tabs';
  }, [panels.length, isMobile]);

  // Set active panel if none selected
  useEffect(() => {
    if (panels.length > 0 && (!activePanel || !panels.find(p => p.id === activePanel))) {
      setActivePanel(panels[0].id);
    }
  }, [panels, activePanel]);

  // Track override conversationId from sidebar
  const [overrideConversationId, setOverrideConversationId] = useState<string | null>(null);

  // Switch to panel matching selected conversation from sidebar
  // If no panel exists, override the active panel's displayed conversation
  useEffect(() => {
    if (!selectedConversationId || panels.length === 0) return;
    const matchingPanel = panels.find(p => p.conversationId === selectedConversationId);
    if (matchingPanel) {
      if (matchingPanel.id !== activePanel) {
        setActivePanel(matchingPanel.id);
      }
      setOverrideConversationId(null);
    } else {
      // No panel for this conversation — override active panel display
      setOverrideConversationId(selectedConversationId);
    }
  }, [selectedConversationId, panels, activePanel]);

  // Sync selected conversation back to sidebar when active panel changes
  useEffect(() => {
    if (!activePanel || panels.length === 0) return;
    const panel = panels.find(p => p.id === activePanel);
    if (panel && onConversationChanged) {
      onConversationChanged(panel.conversationId);
    }
  }, [activePanel, panels, onConversationChanged]);

  const handleClose = useCallback((panelId: string) => {
    closePanel.mutate(panelId);
    if (activePanel === panelId) {
      const remaining = panels.filter(p => p.id !== panelId);
      setActivePanel(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [closePanel, activePanel, panels]);

  const handleNewConversation = useCallback(() => {
    createPanel.mutate({ title: 'New Chat' });
  }, [createPanel]);

  const handleNewAgentPanel = useCallback((agent: UserAgent) => {
    createPanel.mutate({ title: agent.name, agentId: agent.id });
  }, [createPanel]);

  // If no panels, show a "start" state that creates one on first use
  if (panels.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 bg-zinc-950">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center">
          <Zap size={24} className="text-violet-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-medium text-zinc-200 mb-1">Kira</h2>
          <p className="text-sm text-zinc-500 max-w-sm">
            Your AI executive partner. Start a conversation or open multiple panels to work with different agents in parallel.
          </p>
        </div>
        <button
          onClick={handleNewConversation}
          className="mt-2 px-4 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 hover:bg-violet-500/20 transition-all"
        >
          Start a conversation
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Panel content area */}
      <div className="flex-1 flex min-h-0">
        {layoutMode === 'split' ? (
          // Split: show 2 panels side-by-side
          <>
            {panels.slice(0, 2).map((panel, idx) => (
              <div key={panel.id} className={`flex-1 min-w-0 ${idx === 0 ? 'border-r border-zinc-800' : ''}`}>
                <ChatPanel
                  conversationId={(panel.id === activePanel && overrideConversationId) ? overrideConversationId : panel.conversationId}
                  agentName={panel.title}
                  showHeader={true}
                  onClose={() => handleClose(panel.id)}
                />
              </div>
            ))}
          </>
        ) : (
          // Single or tabs: keep ALL panels mounted but only show active (prevents unmount/remount losing messages)
          panels.map(panel => (
              <div key={panel.id} className="flex-1 min-w-0" style={{ display: panel.id === activePanel ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
                <ChatPanel
                  conversationId={(panel.id === activePanel && overrideConversationId) ? overrideConversationId : panel.conversationId}
                  agentName={panels.length > 1 ? panel.title : undefined}
                  showHeader={panels.length > 1}
                  onClose={panels.length > 1 ? () => handleClose(panel.id) : undefined}
                />
              </div>
            ))
        )}
      </div>

      {/* Tab bar — shown when >1 panel or always to allow adding */}
      {(panels.length > 1 || layoutMode !== 'single') && (
        <div className="h-10 bg-zinc-900 border-t border-zinc-800 flex items-center px-2 gap-1 flex-shrink-0">
          {panels.map(panel => (
            <button
              key={panel.id}
              onClick={() => setActivePanel(panel.id)}
              className={`group relative flex items-center gap-1.5 px-3 h-8 rounded-md text-xs transition-all ${
                panel.id === activePanel
                  ? 'text-violet-400 bg-zinc-800/50'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
              }`}
            >
              <span>{panel.agentId ? agentIcon(panel.title) : '⚡'}</span>
              <span className="truncate max-w-[100px]">{panel.title}</span>
              {panels.length > 1 && (
                <span
                  onClick={(e) => { e.stopPropagation(); handleClose(panel.id); }}
                  className="opacity-0 group-hover:opacity-100 ml-1 text-zinc-600 hover:text-zinc-300 transition-all cursor-pointer"
                >
                  <X size={10} />
                </span>
              )}
              {/* Active indicator */}
              {panel.id === activePanel && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-500 rounded-full" />
              )}
            </button>
          ))}

          {/* Add panel button */}
          <div className="relative">
            <button
              onClick={() => setShowNewMenu(!showNewMenu)}
              className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/40 transition-all"
            >
              <Plus size={14} />
            </button>

            {/* Dropdown */}
            {showNewMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNewMenu(false)} />
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 py-1">
                  <button
                    onClick={handleNewConversation}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                  >
                    <Zap size={14} className="text-violet-400" />
                    New conversation
                  </button>
                  {userAgents.length > 0 && (
                    <>
                      <div className="h-px bg-zinc-800 my-1" />
                      <div className="px-3 py-1 text-[10px] text-zinc-600 uppercase tracking-wider">Agents</div>
                      {userAgents.map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => handleNewAgentPanel(agent)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                        >
                          <span>{agentIcon(agent.name)}</span>
                          {agent.name}
                          <span className="ml-auto text-[9px] text-zinc-600">{agent.model.split('/').pop()}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Show tab bar trigger for single panel mode */}
      {panels.length === 1 && layoutMode === 'single' && (
        <div className="h-10 bg-zinc-900 border-t border-zinc-800 flex items-center px-2 gap-1 flex-shrink-0">
          <button
            onClick={() => setActivePanel(panels[0].id)}
            className="group relative flex items-center gap-1.5 px-3 h-8 rounded-md text-xs text-violet-400 bg-zinc-800/50"
          >
            <span>⚡</span>
            <span className="truncate max-w-[100px]">{panels[0].title}</span>
            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-500 rounded-full" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowNewMenu(!showNewMenu)}
              className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/40 transition-all"
            >
              <Plus size={14} />
            </button>
            {showNewMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNewMenu(false)} />
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 py-1">
                  <button
                    onClick={handleNewConversation}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                  >
                    <Zap size={14} className="text-violet-400" />
                    New conversation
                  </button>
                  {userAgents.length > 0 && (
                    <>
                      <div className="h-px bg-zinc-800 my-1" />
                      <div className="px-3 py-1 text-[10px] text-zinc-600 uppercase tracking-wider">Agents</div>
                      {userAgents.map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => handleNewAgentPanel(agent)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                        >
                          <span>{agentIcon(agent.name)}</span>
                          {agent.name}
                          <span className="ml-auto text-[9px] text-zinc-600">{agent.model.split('/').pop()}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
