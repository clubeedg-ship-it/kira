import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Eye, EyeOff, Bot, Sparkles, Zap, Check } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '../components/ui';
import { Toast } from '../components/ui/Toast';
import { cn } from '../lib/cn';
import { useI18n, LANGUAGE_OPTIONS } from '../i18n';
import IdentityEditor from '../components/IdentityEditor';
const SETTINGS_KEY = ['user-settings'];
const AVAILABLE_MODELS = [
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
const TIER_GROUPS = [
    { tier: 'frontier', label: 'Frontier / Reasoning' },
    { tier: 'production', label: 'Production' },
    { tier: 'fast', label: 'Fast' },
    { tier: 'coding', label: 'Coding' },
];
const TIER_BADGE_VARIANT = {
    frontier: 'primary',
    production: 'success',
    fast: 'info',
    coding: 'warning',
};
function ModelSelector({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    // Close on outside click
    useEffect(() => {
        if (!open)
            return;
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target))
                setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);
    const selected = AVAILABLE_MODELS.find((m) => m.id === value);
    return (_jsxs("div", { ref: ref, className: "relative w-full", children: [_jsxs("button", { type: "button", onClick: () => setOpen(!open), className: cn('flex h-10 w-full items-center justify-between rounded-md border border-border bg-bg-surface px-3 text-sm text-text-primary', 'transition-colors duration-fast ease-out hover:border-border-accent focus-visible:border-border-accent focus-visible:outline-none'), children: [selected ? (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium", children: selected.name }), _jsx("span", { className: "text-text-tertiary", children: selected.provider }), _jsx(Badge, { variant: TIER_BADGE_VARIANT[selected.tier], size: "sm", children: selected.tier })] })) : (_jsx("span", { className: "text-text-tertiary", children: "Select a model" })), _jsx(ChevronDown, { className: cn('h-4 w-4 text-text-tertiary transition-transform', open && 'rotate-180') })] }), open && (_jsx("div", { className: "absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-border bg-bg-raised shadow-lg", children: TIER_GROUPS.map(({ tier, label }) => {
                    const models = AVAILABLE_MODELS.filter((m) => m.tier === tier);
                    if (models.length === 0)
                        return null;
                    return (_jsxs("div", { children: [_jsx("div", { className: "sticky top-0 bg-bg-raised px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary", children: label }), models.map((model) => (_jsxs("button", { type: "button", onClick: () => { onChange(model.id); setOpen(false); }, className: cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-overlay', model.id === value && 'bg-bg-overlay'), children: [_jsx("span", { className: "flex-1 font-medium text-text-primary", children: model.name }), _jsx("span", { className: "text-xs text-text-tertiary", children: model.provider }), _jsx(Badge, { variant: TIER_BADGE_VARIANT[model.tier], size: "sm", children: model.tier }), model.default && _jsx(Badge, { variant: "warning", size: "sm", children: "default" })] }, model.id)))] }, tier));
                }) }))] }));
}
const THEME_OPTIONS = [
    { label: 'Dark', value: 'dark' },
    { label: 'Light', value: 'light' },
    { label: 'System', value: 'system' },
];
async function fetchSettings() {
    const res = await fetch('/api/v1/settings', { credentials: 'include' });
    if (!res.ok)
        throw new Error(`${res.status}`);
    const json = await res.json();
    return (json.data ?? {});
}
async function patchSettings(settings) {
    const res = await fetch('/api/v1/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings }),
    });
    if (!res.ok)
        throw new Error(`${res.status}`);
    const json = await res.json();
    return json.data;
}
export default function Settings() {
    const queryClient = useQueryClient();
    const { lang, setLang, t } = useI18n();
    const [showKey, setShowKey] = useState(false);
    const [toast, setToast] = useState(null);
    const [local, setLocal] = useState({});
    const saveTimer = useRef();
    const initialized = useRef(false);
    const { data: settings, isLoading } = useQuery({
        queryKey: SETTINGS_KEY,
        queryFn: fetchSettings,
    });
    const { data: connStatus } = useQuery({
        queryKey: ['connection-status'],
        queryFn: async () => {
            const res = await fetch('/api/v1/settings/connection-status', { credentials: 'include' });
            if (!res.ok)
                return null;
            const json = await res.json();
            return json.data;
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
    const autoSave = useCallback((patch) => {
        const next = { ...local, ...patch };
        setLocal(next);
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            saveMutation.mutate(patch);
        }, 1000);
    }, [local, saveMutation]);
    if (isLoading) {
        return (_jsx("div", { className: "flex h-full items-center justify-center", children: _jsx("p", { className: "text-sm text-text-tertiary", children: "Loading settings\u2026" }) }));
    }
    return (_jsxs("div", { className: "mx-auto max-w-2xl space-y-6 p-6", children: [_jsx("h1", { className: "font-display text-2xl font-bold text-text-primary", children: t('settings.title') }), _jsxs(Card, { variant: "raised", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "General" }) }), _jsxs(CardContent, { children: [_jsx(Input, { label: "Display Name", value: local.displayName ?? '', onChange: (e) => autoSave({ displayName: e.target.value }), placeholder: "Your name" }), _jsx(Input, { label: "Avatar URL", value: local.avatarUrl ?? '', onChange: (e) => autoSave({ avatarUrl: e.target.value }), placeholder: "https://\u2026" })] })] }), _jsxs(Card, { variant: "raised", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Connections" }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-4", children: [connStatus?.openClawEnabled && (_jsxs("div", { className: "flex items-center gap-3 rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/15", children: _jsx(Zap, { size: 16, className: "text-violet-400" }) }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-medium text-text-primary", children: [connStatus.providerLabel, _jsxs("span", { className: "flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400", children: [_jsx(Check, { size: 10 }), " Connected"] })] }), _jsxs("p", { className: "text-xs text-text-tertiary mt-0.5", children: ["Routing through OpenClaw using ", connStatus.provider ?? 'the configured provider', connStatus.model ? ` (${connStatus.model})` : '', ". The selector below is only used when OpenClaw is off."] })] })] })), _jsxs("div", { className: cn('space-y-1.5', connStatus?.openClawEnabled && 'opacity-40 pointer-events-none'), children: [_jsx("label", { className: "text-sm font-semibold text-text-primary", children: "Default Model" }), _jsx("p", { className: "text-xs text-text-tertiary", children: connStatus?.openClawEnabled
                                                ? `Overridden by OpenClaw${connStatus.model ? ` — using ${connStatus.model}` : ''}`
                                                : 'Choose the AI model for all non-OpenClaw interactions' }), _jsx(ModelSelector, { value: local.selectedModel ?? DEFAULT_MODEL, onChange: (id) => autoSave({ selectedModel: id }) })] }), _jsx("div", { className: "border-t border-border pt-4" }), _jsxs("div", { className: cn('space-y-1.5', connStatus?.openClawEnabled && 'opacity-40 pointer-events-none'), children: [_jsx("label", { className: "text-xs font-medium text-text-secondary", children: "OpenRouter API Key (Fallback)" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("div", { className: "flex-1", children: _jsx(Input, { type: showKey ? 'text' : 'password', value: local.openRouterKey ?? '', onChange: (e) => autoSave({ openRouterKey: e.target.value }), placeholder: "sk-or-\u2026" }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setShowKey(!showKey), children: showKey ? _jsx(EyeOff, { className: "h-4 w-4" }) : _jsx(Eye, { className: "h-4 w-4" }) })] }), _jsx("p", { className: "text-xs text-text-tertiary", children: "Used by the app\u2019s direct API path when OpenClaw routing is disabled." })] })] }) })] }), _jsxs(Card, { variant: "raised", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: t('settings.title') }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-4", children: [_jsx(Select, { label: t('settings.theme'), value: local.theme ?? 'dark', onChange: (e) => autoSave({ theme: e.target.value }), options: THEME_OPTIONS }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-sm font-semibold text-text-primary", children: t('settings.language') }), _jsx("select", { value: lang, onChange: (e) => setLang(e.target.value), className: "flex h-10 w-full rounded-md border border-border bg-bg-surface px-3 text-sm text-text-primary transition-colors duration-fast ease-out hover:border-border-accent focus-visible:border-border-accent focus-visible:outline-none", children: LANGUAGE_OPTIONS.map((l) => (_jsxs("option", { value: l.code, children: [l.flag, " ", l.name] }, l.code))) })] })] }) })] }), _jsxs(Card, { variant: "raised", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Bot, { className: "h-5 w-5" }), " Agent Identity"] }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx(Input, { label: "Agent Name", value: local.agentName ?? 'Kira', onChange: (e) => autoSave({ agentName: e.target.value }), placeholder: "Kira" }), _jsx(Input, { label: "Agent Emoji", value: local.agentEmoji ?? '⚡', onChange: (e) => autoSave({ agentEmoji: e.target.value }), placeholder: "\u26A1", className: "max-w-[80px]" })] }), _jsxs("div", { className: "flex items-center justify-between rounded-lg border border-border p-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-medium text-text-primary", children: [_jsx(Sparkles, { className: "h-4 w-4" }), " Self-Evolution"] }), _jsx("p", { className: "text-xs text-text-tertiary mt-0.5", children: "Allow the agent to update its own soul files based on conversations" })] }), _jsx("button", { onClick: () => autoSave({ selfEvolutionEnabled: !local.selfEvolutionEnabled }), className: cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', local.selfEvolutionEnabled ? 'bg-violet-500' : 'bg-zinc-700'), children: _jsx("span", { className: cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', local.selfEvolutionEnabled ? 'translate-x-6' : 'translate-x-1') }) })] }), _jsx("div", { className: "border-t border-border pt-4 -mx-4 px-4", style: { minHeight: 500 }, children: _jsx(IdentityEditor, {}) })] }) })] }), toast && (_jsx("div", { className: "fixed bottom-6 right-6 z-50", children: _jsx(Toast, { title: toast, variant: "success", onClose: () => setToast(null) }) }))] }));
}
//# sourceMappingURL=Settings.js.map