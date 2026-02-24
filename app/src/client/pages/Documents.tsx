import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Badge, Button, Card, EmptyState, Input } from '../components/ui';
import { cn } from '../lib/cn';

interface Document {
  id: string;
  title: string;
  content: string;
  folder: string | null;
  tags: string[] | null;
  mimeType: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

const DOCS_KEY = ['documents'] as const;

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...opts,
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json();
  return json.data as T;
}

export default function Documents() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: [...DOCS_KEY, search],
    queryFn: () =>
      apiFetch<Document[]>(
        `/api/v1/documents${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      ),
  });

  const selected = docs.find((d) => d.id === selectedId) ?? null;

  // Sync editor when selection changes
  useEffect(() => {
    if (selected) {
      setEditTitle(selected.title);
      setEditContent(selected.content);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Document>('/api/v1/documents', {
        method: 'POST',
        body: JSON.stringify({ title: 'Untitled', content: '' }),
      }),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: DOCS_KEY });
      setSelectedId(doc.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; title?: string; content?: string }) =>
      apiFetch<Document>(`/api/v1/documents/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCS_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/api/v1/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: DOCS_KEY });
    },
  });

  const autoSave = useCallback(
    (title: string, content: string) => {
      if (!selectedId) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateMutation.mutate({ id: selectedId, title, content });
      }, 800);
    },
    [selectedId, updateMutation],
  );

  const handleTitleChange = (v: string) => {
    setEditTitle(v);
    autoSave(v, editContent);
  };

  const handleContentChange = (v: string) => {
    setEditContent(v);
    autoSave(editTitle, v);
  };

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Left panel */}
      <div className="flex w-80 shrink-0 flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search documents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <Button size="sm" onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-center text-sm text-text-tertiary">Loading…</p>
          ) : docs.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-10 w-10" />}
              title="No documents"
              description="Create your first document to get started."
              actionLabel="New Document"
              onAction={() => createMutation.mutate()}
            />
          ) : (
            docs.map((doc) => (
              <Card
                key={doc.id}
                variant={doc.id === selectedId ? 'elevated' : 'flat'}
                className={cn(
                  'cursor-pointer p-3 transition-colors hover:bg-bg-overlay',
                  doc.id === selectedId && 'ring-1 ring-primary-500',
                )}
                onClick={() => setSelectedId(doc.id)}
              >
                <h4 className="truncate text-sm font-semibold text-text-primary">{doc.title}</h4>
                <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
                  {doc.content.slice(0, 120) || 'Empty document'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-text-tertiary">
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </span>
                  {doc.tags?.map((tag) => (
                    <Badge key={tag} size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Right panel - editor */}
      <div className="flex flex-1 flex-col">
        {selected ? (
          <>
            <div className="mb-3 flex items-center gap-2">
              <input
                className="flex-1 border-none bg-transparent text-xl font-semibold text-text-primary outline-none placeholder:text-text-tertiary"
                value={editTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Document title"
              />
              <Button
                variant="danger"
                size="sm"
                onClick={() => deleteMutation.mutate(selected.id)}
                loading={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <textarea
              className="flex-1 resize-none rounded-lg border border-border bg-bg-surface p-4 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-accent focus:outline-none"
              value={editContent}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Start writing… (Markdown supported)"
            />
            {updateMutation.isPending && (
              <p className="mt-1 text-xs text-text-tertiary">Saving…</p>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="Select a document"
              description="Choose a document from the list or create a new one."
              actionLabel="New Document"
              onAction={() => createMutation.mutate()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
