import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, } from '@dnd-kit/core';
import { useQuery } from '@tanstack/react-query';
import { Bot, Calendar, User, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Card, EmptyState, Select, Skeleton, Toast } from '../../components/ui';
import { useTaskQueryParam } from '../../hooks/useTaskQueryParam';
import { cn } from '../../lib/cn';
const statusMeta = {
    todo: {
        label: 'To Do',
        columnClass: 'border-slate-300 bg-slate-100 text-slate-700',
    },
    in_progress: {
        label: 'In Progress',
        columnClass: 'border-blue-300 bg-blue-100 text-blue-700',
    },
    waiting: {
        label: 'Waiting',
        columnClass: 'border-amber-300 bg-amber-100 text-amber-700',
    },
    review: {
        label: 'Review',
        columnClass: 'border-violet-300 bg-violet-100 text-violet-700',
    },
    done: {
        label: 'Done',
        columnClass: 'border-emerald-300 bg-emerald-100 text-emerald-700',
    },
};
const priorityMeta = {
    0: { label: 'Critical', badgeVariant: 'danger' },
    1: { label: 'High', badgeVariant: 'warning' },
    2: { label: 'Medium', badgeVariant: 'info' },
    3: { label: 'Low', badgeVariant: 'default' },
};
const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
});
function getFilterValue(searchParams, key) {
    return searchParams.get(key) ?? 'all';
}
function toQueryString(filters) {
    const params = new URLSearchParams();
    if (filters.area !== 'all') {
        params.set('area', filters.area);
    }
    if (filters.project !== 'all') {
        params.set('project', filters.project);
    }
    if (filters.executor !== 'all') {
        params.set('executor', filters.executor);
    }
    if (filters.priority !== 'all') {
        params.set('priority', filters.priority);
    }
    return params.toString();
}
function sortByPriorityScore(cards) {
    return [...cards].sort((a, b) => {
        if (b.priority_score !== a.priority_score) {
            return b.priority_score - a.priority_score;
        }
        if (a.priority !== b.priority) {
            return a.priority - b.priority;
        }
        return a.title.localeCompare(b.title);
    });
}
function moveTaskToStatus(board, taskId, targetStatus) {
    let movedTask = null;
    const nextColumns = board.columns.map((column) => {
        const cardIndex = column.cards.findIndex((card) => card.id === taskId);
        if (cardIndex === -1) {
            return column;
        }
        const task = column.cards[cardIndex];
        movedTask = { ...task, status: targetStatus };
        const remainingCards = [
            ...column.cards.slice(0, cardIndex),
            ...column.cards.slice(cardIndex + 1),
        ];
        return {
            ...column,
            cards: sortByPriorityScore(remainingCards),
            count: remainingCards.length,
        };
    });
    if (!movedTask) {
        return board;
    }
    const destinationIndex = nextColumns.findIndex((column) => column.key === targetStatus);
    if (destinationIndex === -1) {
        return board;
    }
    const destinationColumn = nextColumns[destinationIndex];
    const withMovedTask = sortByPriorityScore([...destinationColumn.cards, movedTask]);
    nextColumns[destinationIndex] = {
        ...destinationColumn,
        cards: withMovedTask,
        count: withMovedTask.length,
    };
    return {
        ...board,
        columns: nextColumns,
    };
}
function formatDueDate(dueDate) {
    if (!dueDate) {
        return 'No due date';
    }
    const parsedDate = new Date(`${dueDate}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
        return dueDate;
    }
    return dateFormatter.format(parsedDate);
}
function getExecutorIcon(executorType) {
    if (executorType === 'agent') {
        return _jsx(Bot, { className: "h-4 w-4" });
    }
    if (executorType === 'ambiguous') {
        return _jsx(Users, { className: "h-4 w-4" });
    }
    return _jsx(User, { className: "h-4 w-4" });
}
function TaskCardView({ task, dragging = false, status, onOpenTask, }) {
    const priority = priorityMeta[task.priority] ?? priorityMeta[3];
    const dueDate = formatDueDate(task.due_date);
    const isOverdue = Boolean(task.due_date) &&
        new Date(`${task.due_date}T23:59:59`).getTime() < Date.now() &&
        status !== 'done';
    return (_jsxs("article", { className: cn('rounded-lg border border-border bg-bg-raised p-3 shadow-sm transition-shadow duration-fast ease-out', dragging ? 'shadow-lg ring-1 ring-primary-300' : 'hover:shadow-md'), children: [_jsx("button", { type: "button", onClick: (event) => {
                    event.stopPropagation();
                    onOpenTask(task.id);
                }, className: "line-clamp-2 text-left text-sm font-semibold text-text-primary hover:text-primary-300", children: task.title }), _jsx("p", { className: "mt-1 truncate text-xs text-text-tertiary", children: task.breadcrumb || 'No project' }), _jsxs("div", { className: "mt-3 flex items-center justify-between gap-2", children: [_jsx(Badge, { variant: priority.badgeVariant, children: priority.label }), _jsxs("span", { className: "inline-flex items-center gap-1 text-xs text-text-secondary", children: [getExecutorIcon(task.executor_type), _jsx("span", { className: "capitalize", children: task.executor_type })] })] }), _jsxs("p", { className: cn('mt-2 inline-flex items-center gap-1 text-xs text-text-secondary', isOverdue ? 'text-error' : ''), children: [_jsx(Calendar, { className: "h-3.5 w-3.5" }), dueDate] })] }));
}
function DraggableTaskCard({ status, task, onOpenTask, }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { status, task },
    });
    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
        : undefined;
    return (_jsx("div", { ref: setNodeRef, style: style, className: cn('cursor-grab touch-none', isDragging ? 'opacity-30' : ''), ...listeners, ...attributes, children: _jsx(TaskCardView, { task: task, status: status, onOpenTask: onOpenTask }) }));
}
function BoardColumnView({ column, onOpenTask, }) {
    const { setNodeRef, isOver } = useDroppable({
        id: column.key,
        data: { status: column.key },
    });
    return (_jsxs("section", { ref: setNodeRef, className: cn('flex h-full min-h-[420px] w-[280px] min-w-[280px] max-w-[360px] flex-col rounded-xl border bg-bg-surface p-3', isOver ? 'border-primary-300 shadow-glow-primary' : 'border-border'), children: [_jsxs("header", { className: cn('flex items-center justify-between rounded-lg border px-3 py-2', statusMeta[column.key].columnClass), children: [_jsx("h3", { className: "text-xs font-semibold uppercase tracking-wide", children: statusMeta[column.key].label }), _jsx("span", { className: "text-xs font-semibold", children: column.count })] }), _jsx("div", { className: "mt-3 flex-1 space-y-3 overflow-y-auto pr-1", children: column.cards.length ? (column.cards.map((task) => (_jsx(DraggableTaskCard, { task: task, status: column.key, onOpenTask: onOpenTask }, task.id)))) : (_jsx("div", { className: "grid h-24 place-items-center rounded-lg border border-dashed border-border text-xs text-text-tertiary", children: "Drag tasks here" })) })] }));
}
async function fetchBoardData(filters) {
    const queryString = toQueryString(filters);
    const response = await fetch(`/api/v1/views/board${queryString ? `?${queryString}` : ''}`, {
        credentials: 'include',
    });
    if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null));
        throw new Error(errorPayload?.error?.message ?? 'Unable to load board data.');
    }
    const payload = (await response.json());
    return payload.data;
}
async function updateTaskStatus(taskId, status) {
    const response = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
    });
    if (response.ok) {
        return;
    }
    const errorPayload = (await response.json().catch(() => null));
    throw new Error(errorPayload?.error?.message ?? 'Unable to move task.');
}
export default function BoardView() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { openTask } = useTaskQueryParam();
    const [board, setBoard] = useState(null);
    const [activeTask, setActiveTask] = useState(null);
    const [toasts, setToasts] = useState([]);
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: { distance: 6 },
    }));
    const filters = useMemo(() => ({
        area: getFilterValue(searchParams, 'area'),
        project: getFilterValue(searchParams, 'project'),
        executor: getFilterValue(searchParams, 'executor'),
        priority: getFilterValue(searchParams, 'priority'),
    }), [searchParams]);
    const boardQuery = useQuery({
        queryKey: ['board-view', filters],
        queryFn: () => fetchBoardData(filters),
    });
    useEffect(() => {
        if (boardQuery.data) {
            setBoard(boardQuery.data);
        }
    }, [boardQuery.data]);
    useEffect(() => {
        const eventSource = new EventSource('/api/v1/events/stream?channels=task');
        const statusListener = (event) => {
            try {
                const payload = JSON.parse(event.data);
                const taskId = payload.task_id;
                const nextStatus = payload.new_status;
                if (!taskId || !nextStatus) {
                    return;
                }
                setBoard((previous) => {
                    if (!previous) {
                        return previous;
                    }
                    return moveTaskToStatus(previous, taskId, nextStatus);
                });
            }
            catch {
                return;
            }
        };
        eventSource.addEventListener('task.status_changed', statusListener);
        return () => {
            eventSource.removeEventListener('task.status_changed', statusListener);
            eventSource.close();
        };
    }, []);
    const pushToast = (toast) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setToasts((current) => [...current, { id, ...toast }]);
        window.setTimeout(() => {
            setToasts((current) => current.filter((item) => item.id !== id));
        }, 4200);
    };
    const updateFilter = (key, value) => {
        const nextParams = new URLSearchParams(searchParams);
        if (value === 'all') {
            nextParams.delete(key);
        }
        else {
            nextParams.set(key, value);
        }
        if (key === 'area') {
            nextParams.delete('project');
        }
        setSearchParams(nextParams, { replace: true });
    };
    const handleDragStart = (event) => {
        const draggingTask = event.active.data.current?.task;
        setActiveTask(draggingTask ?? null);
    };
    const handleDragEnd = async (event) => {
        const targetStatus = event.over?.id;
        const sourceStatus = event.active.data.current?.status;
        const draggingTask = event.active.data.current?.task;
        setActiveTask(null);
        if (!targetStatus || !sourceStatus || !draggingTask || sourceStatus === targetStatus) {
            return;
        }
        const currentBoard = board;
        if (!currentBoard) {
            return;
        }
        const optimisticBoard = moveTaskToStatus(currentBoard, draggingTask.id, targetStatus);
        setBoard(optimisticBoard);
        try {
            await updateTaskStatus(draggingTask.id, targetStatus);
            void boardQuery.refetch();
        }
        catch (error) {
            setBoard(currentBoard);
            pushToast({
                title: 'Invalid status change',
                description: error instanceof Error
                    ? error.message
                    : 'Task could not be moved to that column.',
                variant: 'error',
            });
        }
    };
    const areaOptions = [
        { value: 'all', label: 'All Areas' },
        ...(board?.filters.areas ?? []).map((area) => ({
            value: area.id ?? 'all',
            label: area.name ?? 'Area',
        })),
    ];
    const projectOptions = [
        { value: 'all', label: 'All Projects' },
        ...(board?.filters.projects ?? []).map((project) => ({
            value: project.id ?? 'all',
            label: project.title ?? 'Project',
        })),
    ];
    const executorOptions = [
        { value: 'all', label: 'All Executors' },
        ...(board?.filters.executors ?? []).map((executor) => ({
            value: executor.value ?? 'all',
            label: executor.label ?? 'Executor',
        })),
    ];
    const priorityOptions = [
        { value: 'all', label: 'All Priorities' },
        ...(board?.filters.priorities ?? []).map((priority) => ({
            value: priority.value ?? 'all',
            label: priority.label ?? 'Priority',
        })),
    ];
    const hasCards = board?.columns.some((column) => column.cards.length > 0);
    return (_jsxs("div", { className: "flex h-full min-h-0 flex-col gap-4", children: [_jsxs(Card, { className: "space-y-4 p-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "font-display text-xl font-semibold text-text-primary", children: "Operations Board" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Drag tasks between status columns and filter by scope." })] }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2 xl:grid-cols-4", children: [_jsx(Select, { label: "Area", value: filters.area, options: areaOptions, onChange: (event) => updateFilter('area', event.target.value) }), _jsx(Select, { label: "Project", value: filters.project, options: projectOptions, onChange: (event) => updateFilter('project', event.target.value) }), _jsx(Select, { label: "Executor", value: filters.executor, options: executorOptions, onChange: (event) => updateFilter('executor', event.target.value) }), _jsx(Select, { label: "Priority", value: filters.priority, options: priorityOptions, onChange: (event) => updateFilter('priority', event.target.value) })] })] }), boardQuery.isLoading && !board ? (_jsx("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-5", children: Array.from({ length: 5 }).map((_, index) => (_jsx(Skeleton, { className: "h-[420px] rounded-xl" }, index))) })) : null, boardQuery.isError ? (_jsx(Card, { children: _jsx(EmptyState, { title: "Unable to load board", description: boardQuery.error instanceof Error
                        ? boardQuery.error.message
                        : 'Please refresh and try again.' }) })) : null, !boardQuery.isError && board ? (_jsxs(DndContext, { sensors: sensors, onDragStart: handleDragStart, onDragEnd: (event) => {
                    void handleDragEnd(event);
                }, children: [_jsx("div", { className: "min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-1", children: _jsx("div", { className: "flex h-full min-w-max gap-3 pr-1", children: board.columns.map((column) => (_jsx(BoardColumnView, { column: column, onOpenTask: openTask }, column.key))) }) }), _jsx(DragOverlay, { children: activeTask ? (_jsx("div", { className: "w-[280px] min-w-[280px] rotate-2", children: _jsx(TaskCardView, { task: activeTask, status: activeTask.status, dragging: true, onOpenTask: () => undefined }) })) : null })] })) : null, board && !hasCards ? (_jsx(Card, { children: _jsx(EmptyState, { title: "No tasks in this board", description: "Try changing filters or create a new task." }) })) : null, _jsx("div", { className: "pointer-events-none fixed right-4 top-16 z-toast flex w-full max-w-sm flex-col gap-2", children: toasts.map((toast) => (_jsx("div", { className: "pointer-events-auto", children: _jsx(Toast, { title: toast.title, description: toast.description, variant: toast.variant, onClose: () => setToasts((current) => current.filter((item) => item.id !== toast.id)) }) }, toast.id))) })] }));
}
//# sourceMappingURL=BoardView.js.map