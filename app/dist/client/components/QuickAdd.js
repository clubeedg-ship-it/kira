import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Command, CornerDownLeft, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { cn } from '../lib/cn';
import { parseQuickAddSyntax } from '../../shared/quick-add-parser';
const PRIORITY_LABELS = {
    0: { label: 'Critical', color: 'text-error' },
    1: { label: 'High', color: 'text-warning' },
    2: { label: 'Medium', color: 'text-info' },
    3: { label: 'Low', color: 'text-text-tertiary' },
};
function fuzzyMatch(query, target) {
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    if (t.includes(q))
        return true;
    // Simple character-by-character fuzzy
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi])
            qi++;
    }
    return qi === q.length;
}
function formatDueLabel(dateStr) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (dateStr === todayStr)
        return 'Today';
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    if (dateStr === tomorrowStr)
        return 'Tomorrow';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
export default function QuickAdd({ open, onClose }) {
    const [input, setInput] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [projectDropdownIndex, setProjectDropdownIndex] = useState(0);
    const [toastMessage, setToastMessage] = useState(null);
    const inputRef = useRef(null);
    const queryClient = useQueryClient();
    const { data: projects = [] } = useQuery({
        queryKey: ['projects-quick-add'],
        queryFn: () => apiRequest('/api/v1/projects'),
        enabled: open,
        staleTime: 60_000,
    });
    const parsed = useMemo(() => parseQuickAddSyntax(input), [input]);
    const matchingProjects = useMemo(() => {
        if (!parsed.projectQuery)
            return [];
        return projects.filter((p) => fuzzyMatch(parsed.projectQuery, p.title)).slice(0, 5);
    }, [parsed.projectQuery, projects]);
    useEffect(() => {
        if (parsed.projectQuery && matchingProjects.length > 0) {
            setShowProjectDropdown(true);
            setProjectDropdownIndex(0);
        }
        else {
            setShowProjectDropdown(false);
        }
    }, [parsed.projectQuery, matchingProjects.length]);
    // Auto-select first matching project
    useEffect(() => {
        if (matchingProjects.length === 1 && parsed.projectQuery) {
            setSelectedProjectId(matchingProjects[0].id);
        }
    }, [matchingProjects, parsed.projectQuery]);
    const selectedProject = useMemo(() => {
        if (selectedProjectId)
            return projects.find((p) => p.id === selectedProjectId) ?? null;
        return null;
    }, [selectedProjectId, projects]);
    const createTaskMutation = useMutation({
        mutationFn: async (parsed) => {
            const body = { title: parsed.title, source: 'quick_add' };
            if (parsed.priority !== null)
                body.priority = parsed.priority;
            if (parsed.tags.length > 0)
                body.tags = parsed.tags;
            if (parsed.executorType)
                body.executor_type = parsed.executorType;
            if (parsed.dueDate)
                body.due_date = parsed.dueDate;
            if (parsed.durationEst !== null)
                body.duration_est = parsed.durationEst;
            if (selectedProjectId)
                body.project_id = selectedProjectId;
            return apiRequest('/api/v1/tasks', {
                method: 'POST',
                body: JSON.stringify(body),
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['tasks'] });
            void queryClient.invalidateQueries({ queryKey: ['board-view'] });
            void queryClient.invalidateQueries({ queryKey: ['command-center'] });
            void queryClient.invalidateQueries({ queryKey: ['operations-today'] });
        },
    });
    const handleCreate = useCallback(async (keepOpen) => {
        if (!parsed.title.trim())
            return;
        try {
            await createTaskMutation.mutateAsync(parsed);
            if (keepOpen) {
                setInput('');
                setSelectedProjectId(null);
                setToastMessage('Task created');
                setTimeout(() => setToastMessage(null), 2000);
                inputRef.current?.focus();
            }
            else {
                onClose();
            }
        }
        catch {
            setToastMessage('Failed to create task');
            setTimeout(() => setToastMessage(null), 3000);
        }
    }, [parsed, createTaskMutation, onClose, selectedProjectId]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
            return;
        }
        if (showProjectDropdown) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setProjectDropdownIndex((i) => Math.min(i + 1, matchingProjects.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setProjectDropdownIndex((i) => Math.max(i - 1, 0));
                return;
            }
            if (e.key === 'Tab' && matchingProjects.length > 0) {
                e.preventDefault();
                const selected = matchingProjects[projectDropdownIndex];
                if (selected) {
                    setSelectedProjectId(selected.id);
                    // Replace the >query with nothing (project is now selected)
                    setInput((prev) => prev.replace(/>\S+/, '').trim());
                    setShowProjectDropdown(false);
                }
                return;
            }
        }
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            void handleCreate(true);
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            void handleCreate(false);
            return;
        }
    }, [showProjectDropdown, matchingProjects, projectDropdownIndex, handleCreate, onClose]);
    // Focus input on open
    useEffect(() => {
        if (open) {
            setInput('');
            setSelectedProjectId(null);
            setToastMessage(null);
            // small delay to ensure DOM mount
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);
    if (!open)
        return null;
    const hasParsedMeta = parsed.priority !== null || parsed.tags.length > 0 || parsed.executorType || parsed.dueDate || selectedProject || parsed.durationEst !== null;
    return (_jsx("div", { className: "fixed inset-0 z-modal flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm", onClick: onClose, children: _jsxs("div", { className: "w-full max-w-[600px] rounded-xl border border-border bg-bg-raised shadow-2xl", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center gap-2 border-b border-border px-4 py-3", children: [_jsx(Command, { className: "h-4 w-4 text-text-tertiary" }), _jsx("span", { className: "text-xs font-medium text-text-tertiary", children: "QUICK ADD" }), _jsx("div", { className: "ml-auto flex items-center gap-1", children: _jsx("kbd", { className: "rounded border border-border bg-bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary", children: "ESC" }) })] }), _jsx("div", { className: "px-4 py-3", children: _jsx("input", { ref: inputRef, type: "text", value: input, onChange: (e) => setInput(e.target.value), onKeyDown: handleKeyDown, placeholder: "Type a task... !priority #tag @executor due:date >project", className: "w-full bg-transparent text-base text-text-primary placeholder:text-text-tertiary outline-none", autoComplete: "off", spellCheck: false }) }), showProjectDropdown && matchingProjects.length > 0 && (_jsxs("div", { className: "border-t border-border px-4 py-2", children: [_jsx("p", { className: "mb-1 text-[10px] font-medium uppercase tracking-wider text-text-tertiary", children: "Projects" }), matchingProjects.map((project, i) => (_jsx("button", { className: cn('flex w-full items-center rounded px-2 py-1.5 text-sm text-text-secondary transition-colors', i === projectDropdownIndex ? 'bg-bg-overlay text-text-primary' : 'hover:bg-bg-overlay'), onClick: () => {
                                setSelectedProjectId(project.id);
                                setInput((prev) => prev.replace(/>\S+/, '').trim());
                                setShowProjectDropdown(false);
                                inputRef.current?.focus();
                            }, children: project.title }, project.id))), _jsx("p", { className: "mt-1 text-[10px] text-text-tertiary", children: "Tab to select" })] })), hasParsedMeta && (_jsx("div", { className: "border-t border-border px-4 py-3", children: _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [selectedProject && (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-md bg-primary-400/10 px-2 py-0.5 text-xs font-medium text-primary-300", children: [selectedProject.title, _jsx("button", { onClick: () => setSelectedProjectId(null), className: "ml-0.5 hover:text-primary-200", children: _jsx(X, { className: "h-3 w-3" }) })] })), parsed.priority !== null && (_jsx("span", { className: cn('inline-flex items-center rounded-md bg-bg-overlay px-2 py-0.5 text-xs font-medium', PRIORITY_LABELS[parsed.priority]?.color), children: PRIORITY_LABELS[parsed.priority]?.label })), parsed.dueDate && (_jsx("span", { className: "inline-flex items-center rounded-md bg-bg-overlay px-2 py-0.5 text-xs font-medium text-text-secondary", children: formatDueLabel(parsed.dueDate) })), parsed.executorType && (_jsx("span", { className: "inline-flex items-center rounded-md bg-bg-overlay px-2 py-0.5 text-xs font-medium text-text-secondary", children: parsed.executorType === 'agent' ? 'Agent' : 'Human' })), parsed.durationEst !== null && (_jsxs("span", { className: "inline-flex items-center rounded-md bg-bg-overlay px-2 py-0.5 text-xs font-medium text-text-secondary", children: ["~", parsed.durationEst >= 60 ? `${Math.floor(parsed.durationEst / 60)}h` : `${parsed.durationEst}m`] })), parsed.tags.map((tag) => (_jsxs("span", { className: "inline-flex items-center rounded-md bg-bg-overlay px-2 py-0.5 text-xs font-medium text-text-secondary", children: ["#", tag] }, tag)))] }) })), _jsxs("div", { className: "flex items-center justify-between border-t border-border px-4 py-2", children: [_jsxs("div", { className: "flex items-center gap-3 text-[11px] text-text-tertiary", children: [_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(CornerDownLeft, { className: "h-3 w-3" }), " Create"] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "font-medium", children: "Shift" }), "+", _jsx(CornerDownLeft, { className: "h-3 w-3" }), " Create & add another"] })] }), parsed.title.trim() && (_jsx("span", { className: "text-[11px] text-text-tertiary", children: parsed.title.length > 40 ? parsed.title.slice(0, 40) + '...' : parsed.title }))] }), toastMessage && (_jsx("div", { className: "absolute -bottom-12 left-1/2 -translate-x-1/2 rounded-lg border border-border bg-bg-raised px-4 py-2 text-sm font-medium text-text-primary shadow-lg", children: toastMessage }))] }) }));
}
//# sourceMappingURL=QuickAdd.js.map