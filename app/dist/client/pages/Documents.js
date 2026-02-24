import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, EmptyState, Input } from '../components/ui';
import { cn } from '../lib/cn';
const DOCS_KEY = ['documents'];
async function apiFetch(url, opts) {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        ...opts,
    });
    if (!res.ok)
        throw new Error(`${res.status}`);
    const json = await res.json();
    return json.data;
}
export default function Documents() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const saveTimer = useRef();
    const { data: docs = [], isLoading } = useQuery({
        queryKey: [...DOCS_KEY, search],
        queryFn: () => apiFetch(`/api/v1/documents${search ? `?search=${encodeURIComponent(search)}` : ''}`),
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
        mutationFn: () => apiFetch('/api/v1/documents', {
            method: 'POST',
            body: JSON.stringify({ title: 'Untitled', content: '' }),
        }),
        onSuccess: (doc) => {
            queryClient.invalidateQueries({ queryKey: DOCS_KEY });
            setSelectedId(doc.id);
        },
    });
    const updateMutation = useMutation({
        mutationFn: (data) => apiFetch(`/api/v1/documents/${data.id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCS_KEY }),
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => apiFetch(`/api/v1/documents/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            setSelectedId(null);
            queryClient.invalidateQueries({ queryKey: DOCS_KEY });
        },
    });
    const autoSave = useCallback((title, content) => {
        if (!selectedId)
            return;
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            updateMutation.mutate({ id: selectedId, title, content });
        }, 800);
    }, [selectedId, updateMutation]);
    const handleTitleChange = (v) => {
        setEditTitle(v);
        autoSave(v, editContent);
    };
    const handleContentChange = (v) => {
        setEditContent(v);
        autoSave(editTitle, v);
    };
    return (_jsxs("div", { className: "flex h-full gap-4 p-4", children: [_jsxs("div", { className: "flex w-80 shrink-0 flex-col gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex-1", children: _jsx(Input, { placeholder: "Search documents\u2026", value: search, onChange: (e) => setSearch(e.target.value), icon: _jsx(Search, { className: "h-4 w-4" }) }) }), _jsx(Button, { size: "sm", onClick: () => createMutation.mutate(), loading: createMutation.isPending, children: _jsx(Plus, { className: "h-4 w-4" }) })] }), _jsx("div", { className: "flex-1 space-y-2 overflow-y-auto", children: isLoading ? (_jsx("p", { className: "p-4 text-center text-sm text-text-tertiary", children: "Loading\u2026" })) : docs.length === 0 ? (_jsx(EmptyState, { icon: _jsx(FileText, { className: "h-10 w-10" }), title: "No documents", description: "Create your first document to get started.", actionLabel: "New Document", onAction: () => createMutation.mutate() })) : (docs.map((doc) => (_jsxs(Card, { variant: doc.id === selectedId ? 'elevated' : 'flat', className: cn('cursor-pointer p-3 transition-colors hover:bg-bg-overlay', doc.id === selectedId && 'ring-1 ring-primary-500'), onClick: () => setSelectedId(doc.id), children: [_jsx("h4", { className: "truncate text-sm font-semibold text-text-primary", children: doc.title }), _jsx("p", { className: "mt-1 line-clamp-2 text-xs text-text-secondary", children: doc.content.slice(0, 120) || 'Empty document' }), _jsxs("div", { className: "mt-2 flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-text-tertiary", children: new Date(doc.updatedAt).toLocaleDateString() }), doc.tags?.map((tag) => (_jsx(Badge, { size: "sm", children: tag }, tag)))] })] }, doc.id)))) })] }), _jsx("div", { className: "flex flex-1 flex-col", children: selected ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-3 flex items-center gap-2", children: [_jsx("input", { className: "flex-1 border-none bg-transparent text-xl font-semibold text-text-primary outline-none placeholder:text-text-tertiary", value: editTitle, onChange: (e) => handleTitleChange(e.target.value), placeholder: "Document title" }), _jsx(Button, { variant: "danger", size: "sm", onClick: () => deleteMutation.mutate(selected.id), loading: deleteMutation.isPending, children: _jsx(Trash2, { className: "h-4 w-4" }) })] }), _jsx("textarea", { className: "flex-1 resize-none rounded-lg border border-border bg-bg-surface p-4 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-accent focus:outline-none", value: editContent, onChange: (e) => handleContentChange(e.target.value), placeholder: "Start writing\u2026 (Markdown supported)" }), updateMutation.isPending && (_jsx("p", { className: "mt-1 text-xs text-text-tertiary", children: "Saving\u2026" }))] })) : (_jsx("div", { className: "flex flex-1 items-center justify-center", children: _jsx(EmptyState, { icon: _jsx(FileText, { className: "h-12 w-12" }), title: "Select a document", description: "Choose a document from the list or create a new one.", actionLabel: "New Document", onAction: () => createMutation.mutate() }) })) })] }));
}
//# sourceMappingURL=Documents.js.map