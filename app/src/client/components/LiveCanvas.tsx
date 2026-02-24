import { useEffect, useState } from 'react';
import FormRenderer, { type FormDefinition } from './FormRenderer';
import WizardRenderer, { type WizardDefinition } from './WizardRenderer';
import HtmlCanvas from './HtmlCanvas';
import AppPreview from './AppPreview';

interface CanvasState {
  id: string;
  type: string;
  title: string;
  content: unknown;
  status: string;
  response: unknown;
}

interface LiveCanvasProps {
  canvasId: string;
  onDismiss?: () => void;
}

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  return json.data;
}

export default function LiveCanvas({ canvasId, onDismiss }: LiveCanvasProps) {
  const [canvas, setCanvas] = useState<CanvasState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/api/v1/canvas/${canvasId}`)
      .then(setCanvas)
      .catch(e => setError(e.message));
  }, [canvasId]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    await apiFetch(`/api/v1/canvas/${canvasId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response: data }),
    });
  };

  const handleDismiss = async () => {
    await apiFetch(`/api/v1/canvas/${canvasId}`, { method: 'DELETE' });
    onDismiss?.();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm">
        Failed to load canvas: {error}
      </div>
    );
  }

  if (!canvas) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const content = canvas.content as Record<string, unknown>;

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-medium uppercase tracking-wider">
            {canvas.type}
          </span>
          <h2 className="text-sm font-medium text-zinc-100">{canvas.title}</h2>
        </div>
        <button
          onClick={handleDismiss}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          {canvas.type === 'form' && (
            <FormRenderer
              definition={content as unknown as FormDefinition}
              onSubmit={handleSubmit}
              onCancel={handleDismiss}
            />
          )}

          {canvas.type === 'wizard' && (
            <WizardRenderer
              definition={content as unknown as WizardDefinition}
              onSubmit={handleSubmit}
              onCancel={handleDismiss}
            />
          )}

          {canvas.type === 'html' && (
            <div className="h-[600px]">
              <HtmlCanvas html={(content as { html?: string }).html || String(content)} />
            </div>
          )}

          {canvas.type === 'visualization' && (
            <div className="h-[600px]">
              <HtmlCanvas html={(content as { html?: string }).html || '<p>Visualization</p>'} />
            </div>
          )}

          {canvas.type === 'app' && (
            <div className="h-[600px]">
              <AppPreview
                url={(content as { url?: string }).url || ''}
                title={canvas.title}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
