import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Eye, EyeOff, Bot, Sparkles, Zap, Check } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '../components/ui';
import { Toast } from '../components/ui/Toast';
import { cn } from '../lib/cn';
import { useI18n, LANGUAGE_OPTIONS } from '../i18n';
import IdentityEditor from '../components/IdentityEditor';

const SETTINGS_KEY = ['user-settings'] as const;

interface UserSettings {
  displayName?: string;
  avatarUrl?: string;
  openRouterKey?: string;
  selectedModel?: string;
  theme?: 'dark' | 'light' | 'system';
  agentName?: string;
  agentEmoji?: string;
  selfEvolutionEnabled?: boolean;
  [key: string]: unknown;
}

interface ConnectionStatus {
  openClawEnabled: boolean;
  connected: boolean;
  model: string | null;
  modelId: string | null;
  provider: string | null;
  providerLabel: string;
  fallbackProvider: string;
}

type ModelTier = 'frontier' | 'production' | 'fast' | 'coding';

interface ModelEntry {
  id: string;
  name: string;
  provider: string;
  tier: ModelTier;
  default?: boolean;
}

const AVAILABLE_MODELS: ModelEntry[] = [
  // Reasoning / Frontier
  { id: 'anthropic/claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'Anthropic', tier: 'frontier' },
  { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', tier: 'frontier' },
  { id: 'openai/gpt-5.4', name: 'GPT-5.4', provider: 'OpenAI', tier: 'frontier' },
  { id: 'openai-codex/gpt-5.4-codex', name: 'GPT-5.4 Codex', provider: 'OpenAI Codex', tier: 'coding' },
  { id: 'openai/o3', name: 'OpenAI o3', provider: 'OpenAI', tier: 'frontier' },
  { id: 'openai/o4-mini', name: 'OpenAI o4-mini', provider: 'OpenAI', tier: 'frontier' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', tier: 'frontier' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', tier: 'fast' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', tier: 'frontier' },
  // Production workhorses
  { id: 'minimax/minimax-m2.5', name: 'MiniMax M2.5', provider: 'MiniMax', tier: 'production', default: true },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', tier: 'production' },
  { id: 'openai/gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI', tier: 'production' },
  { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'OpenAI', tier: 'fast' },
  { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', tier: 'fast' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek', tier: 'production' },
  { id: 'qwen/qwen3-235b-a22b', name: 'Qwen3 235B', provider: 'Qwen', tier: 'production' },
  { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta', tier: 'production' },
  { id: 'moonshotai/kimi-k2', name: 'Kimi K2', provider: 'Moonshot', tier: 'production' },
  // Fast / cheap
  { id: 'anthropic/claude-haiku-3.5', name: 'Claude Haiku 3.5', provider: 'Anthropic', tier: 'fast' },
  { id: 'openai/gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'OpenAI', tier: 'fast' },
  { id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout', provider: 'Meta', tier: 'fast' },
  { id: 'qwen/qwen3-32b', name: 'Qwen3 32B', provider: 'Qwen', tier: 'fast' },
  // Coding specialists
  { id: 'anthropic/claude-code', name: 'Claude Code', provider: 'Anthropic', tier: 'coding' },
  { id: 'google/gemini-2.5-flash-lite-preview', name: 'Gemini 2.5 Flash Lite', provider: 'Google', tier: 'fast' },
];

const DEFAULT_MODEL = 'minimax/minimax-m2.5';

const TIER_GROUPS: { tier: ModelTier; label: string }[] = [
  { tier: 'frontier', label: 'Frontier / Reasoning' },
  { tier: 'production', label: 'Production' },
  { tier: 'fast', label: 'Fast' },
  { tier: 'coding', label: 'Coding' },
];

const TIER_BADGE_VARIANT: Record<ModelTier, 'primary' | 'success' | 'info' | 'warning'> = {
  frontier: 'primary',
  production: 'success',
  fast: 'info',
  coding: 'warning',
};

function ModelSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = AVAILABLE_MODELS.find((m) => m.id === value);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-border bg-bg-surface px-3 text-sm text-text-primary',
          'transition-colors duration-fast ease-out hover:border-border-accent focus-visible:border-border-accent focus-visible:outline-none',
        )}
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span className="font-medium">{selected.name}</span>
            <span className="text-text-tertiary">{selected.provider}</span>
            <Badge variant={TIER_BADGE_VARIANT[selected.tier]} size="sm">{selected.tier}</Badge>
          </span>
        ) : (
          <span className="text-text-tertiary">Select a model</span>
        )}
        <ChevronDown className={cn('h-4 w-4 text-text-tertiary transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-border bg-bg-raised shadow-lg">
          {TIER_GROUPS.map(({ tier, label }) => {
            const models = AVAILABLE_MODELS.filter((m) => m.tier === tier);
            if (models.length === 0) return null;
            return (
              <div key={tier}>
                <div className="sticky top-0 bg-bg-raised px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  {label}
                </div>
                {models.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => { onChange(model.id); setOpen(false); }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-overlay',
                      model.id === value && 'bg-bg-overlay',
                    )}
                  >
                    <span className="flex-1 font-medium text-text-primary">{model.name}</span>
                    <span className="text-xs text-text-tertiary">{model.provider}</span>
                    <Badge variant={TIER_BADGE_VARIANT[model.tier]} size="sm">{model.tier}</Badge>
                    {model.default && <Badge variant="warning" size="sm">default</Badge>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const THEME_OPTIONS = [
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
  { label: 'System', value: 'system' },
];

async function fetchSettings(): Promise<UserSettings> {
  const res = await fetch('/api/v1/settings', { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json();
  return (json.data ?? {}) as UserSettings;
}

async function patchSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
  const res = await fetch('/api/v1/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ settings }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json();
  return json.data as UserSettings;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { lang, setLang, t } = useI18n();
  const [showKey, setShowKey] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [local, setLocal] = useState<UserSettings>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const initialized = useRef(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: fetchSettings,
  });

  const { data: connStatus } = useQuery({
    queryKey: ['connection-status'],
    queryFn: async () => {
      const res = await fetch('/api/v1/settings/connection-status', { credentials: 'include' });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as ConnectionStatus;
    },
  });

  // Initialize local state from server
  useEffect(() => {
    if (settings && !initialized.current) {
      setLocal(settings);
      initialized.current = true;
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: patchSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
      setToast('Settings saved');
      setTimeout(() => setToast(null), 2500);
    },
  });

  const autoSave = useCallback(
    (patch: Partial<UserSettings>) => {
      const next = { ...local, ...patch };
      setLocal(next);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveMutation.mutate(patch);
      }, 1000);
    },
    [local, saveMutation],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-tertiary">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="font-display text-2xl font-bold text-text-primary">{t('settings.title')}</h1>

      {/* General */}
      <Card variant="raised">
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            label="Display Name"
            value={local.displayName ?? ''}
            onChange={(e) => autoSave({ displayName: e.target.value })}
            placeholder="Your name"
          />
          <Input
            label="Avatar URL"
            value={local.avatarUrl ?? ''}
            onChange={(e) => autoSave({ avatarUrl: e.target.value })}
            placeholder="https://…"
          />
        </CardContent>
      </Card>

      {/* Connections */}
      <Card variant="raised">
        <CardHeader>
          <CardTitle>Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* OpenClaw connection status */}
            {connStatus?.openClawEnabled && (
              <div className="flex items-center gap-3 rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/15">
                  <Zap size={16} className="text-violet-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    {connStatus.providerLabel}
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      <Check size={10} /> Connected
                    </span>
                  </div>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    Routing through OpenClaw using {connStatus.provider ?? 'the configured provider'}
                    {connStatus.model ? ` (${connStatus.model})` : ''}. The selector below is only used when OpenClaw is off.
                  </p>
                </div>
              </div>
            )}

            {/* Model selector — only effective when not routed through OpenClaw */}
            <div className={cn('space-y-1.5', connStatus?.openClawEnabled && 'opacity-40 pointer-events-none')}>
              <label className="text-sm font-semibold text-text-primary">Default Model</label>
              <p className="text-xs text-text-tertiary">
                {connStatus?.openClawEnabled
                  ? `Overridden by OpenClaw${connStatus.model ? ` — using ${connStatus.model}` : ''}`
                  : 'Choose the AI model for all non-OpenClaw interactions'}
              </p>
              <ModelSelector
                value={local.selectedModel ?? DEFAULT_MODEL}
                onChange={(id) => autoSave({ selectedModel: id })}
              />
            </div>

            <div className="border-t border-border pt-4" />

            <div className={cn('space-y-1.5', connStatus?.openClawEnabled && 'opacity-40 pointer-events-none')}>
              <label className="text-xs font-medium text-text-secondary">OpenRouter API Key (Fallback)</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={local.openRouterKey ?? ''}
                    onChange={(e) => autoSave({ openRouterKey: e.target.value })}
                    placeholder="sk-or-…"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-text-tertiary">
                Used by the app’s direct API path when OpenClaw routing is disabled.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card variant="raised">
        <CardHeader>
          <CardTitle>{t('settings.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select
              label={t('settings.theme')}
              value={local.theme ?? 'dark'}
              onChange={(e) => autoSave({ theme: e.target.value as UserSettings['theme'] })}
              options={THEME_OPTIONS}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text-primary">{t('settings.language')}</label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-bg-surface px-3 text-sm text-text-primary transition-colors duration-fast ease-out hover:border-border-accent focus-visible:border-border-accent focus-visible:outline-none"
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Identity */}
      <Card variant="raised">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" /> Agent Identity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                label="Agent Name"
                value={local.agentName ?? 'Kira'}
                onChange={(e) => autoSave({ agentName: e.target.value })}
                placeholder="Kira"
              />
              <Input
                label="Agent Emoji"
                value={local.agentEmoji ?? '⚡'}
                onChange={(e) => autoSave({ agentEmoji: e.target.value })}
                placeholder="⚡"
                className="max-w-[80px]"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  <Sparkles className="h-4 w-4" /> Self-Evolution
                </div>
                <p className="text-xs text-text-tertiary mt-0.5">Allow the agent to update its own soul files based on conversations</p>
              </div>
              <button
                onClick={() => autoSave({ selfEvolutionEnabled: !local.selfEvolutionEnabled })}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  local.selfEvolutionEnabled ? 'bg-violet-500' : 'bg-zinc-700'
                )}
              >
                <span className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  local.selfEvolutionEnabled ? 'translate-x-6' : 'translate-x-1'
                )} />
              </button>
            </div>
            <div className="border-t border-border pt-4 -mx-4 px-4" style={{ minHeight: 500 }}>
              <IdentityEditor />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast title={toast} variant="success" onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
