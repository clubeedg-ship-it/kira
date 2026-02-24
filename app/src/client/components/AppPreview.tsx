import { useState } from 'react';

interface AppPreviewProps {
  url: string;
  title?: string;
}

export default function AppPreview({ url, title }: AppPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <span className="text-xs text-zinc-400 truncate">{title || url}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setKey(k => k + 1); setLoading(true); }}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Open in new tab"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Iframe */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <iframe
          key={key}
          src={url}
          onLoad={() => setLoading(false)}
          className="w-full h-full border-0"
          title={title || 'App Preview'}
        />
      </div>
    </div>
  );
}
