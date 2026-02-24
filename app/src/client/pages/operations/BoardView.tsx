import { type ComponentProps, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useQuery } from '@tanstack/react-query';
import { Bot, Calendar, User, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { Badge, Card, EmptyState, Select, Skeleton, Toast } from '../../components/ui';
import { useTaskQueryParam } from '../../hooks/useTaskQueryParam';
import { cn } from '../../lib/cn';

type BoardStatus = 'todo' | 'in_progress' | 'waiting' | 'review' | 'done';
type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>;

interface TaskCard {
  breadcrumb: string;
  due_date: string | null;
  executor_type: string;
  id: string;
  priority: number;
  priority_score: number;
  status: BoardStatus;
  title: string;
}

interface BoardColumn {
  cards: TaskCard[];
  count: number;
  key: BoardStatus;
}

interface BoardFilterOption {
  id?: string | null;
  label?: string;
  name?: string;
  title?: string;
  value?: string;
}

interface BoardData {
  columns: BoardColumn[];
  filters: {
    areas: BoardFilterOption[];
    executors: BoardFilterOption[];
    priorities: BoardFilterOption[];
    projects: BoardFilterOption[];
  };
}

interface BoardResponse {
  data: BoardData;
}

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

interface BoardFilters {
  area: string;
  executor: string;
  priority: string;
  project: string;
}

interface ToastNotice {
  description?: string;
  id: number;
  title: string;
  variant: 'error' | 'info' | 'success' | 'warning';
}

const statusMeta: Record<BoardStatus, { columnClass: string; label: string }> = {
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

const priorityMeta: Record<number, { badgeVariant: BadgeVariant; label: string }> = {
  0: { label: 'Critical', badgeVariant: 'danger' },
  1: { label: 'High', badgeVariant: 'warning' },
  2: { label: 'Medium', badgeVariant: 'info' },
  3: { label: 'Low', badgeVariant: 'default' },
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

function getFilterValue(
  searchParams: URLSearchParams,
  key: keyof BoardFilters,
): string {
  return searchParams.get(key) ?? 'all';
}

function toQueryString(filters: BoardFilters): string {
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

function sortByPriorityScore(cards: TaskCard[]): TaskCard[] {
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

function moveTaskToStatus(
  board: BoardData,
  taskId: string,
  targetStatus: BoardStatus,
): BoardData {
  let movedTask: TaskCard | null = null;

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

  const destinationIndex = nextColumns.findIndex(
    (column) => column.key === targetStatus,
  );
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

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) {
    return 'No due date';
  }

  const parsedDate = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return dueDate;
  }

  return dateFormatter.format(parsedDate);
}

function getExecutorIcon(executorType: string) {
  if (executorType === 'agent') {
    return <Bot className="h-4 w-4" />;
  }
  if (executorType === 'ambiguous') {
    return <Users className="h-4 w-4" />;
  }

  return <User className="h-4 w-4" />;
}

function TaskCardView({
  task,
  dragging = false,
  status,
  onOpenTask,
}: {
  task: TaskCard;
  dragging?: boolean;
  status: BoardStatus;
  onOpenTask: (taskId: string) => void;
}) {
  const priority = priorityMeta[task.priority] ?? priorityMeta[3];
  const dueDate = formatDueDate(task.due_date);
  const isOverdue =
    Boolean(task.due_date) &&
    new Date(`${task.due_date}T23:59:59`).getTime() < Date.now() &&
    status !== 'done';

  return (
    <article
      className={cn(
        'rounded-lg border border-border bg-bg-raised p-3 shadow-sm transition-shadow duration-fast ease-out',
        dragging ? 'shadow-lg ring-1 ring-primary-300' : 'hover:shadow-md',
      )}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenTask(task.id);
        }}
        className="line-clamp-2 text-left text-sm font-semibold text-text-primary hover:text-primary-300"
      >
        {task.title}
      </button>
      <p className="mt-1 truncate text-xs text-text-tertiary">
        {task.breadcrumb || 'No project'}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Badge variant={priority.badgeVariant}>{priority.label}</Badge>
        <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
          {getExecutorIcon(task.executor_type)}
          <span className="capitalize">{task.executor_type}</span>
        </span>
      </div>

      <p
        className={cn(
          'mt-2 inline-flex items-center gap-1 text-xs text-text-secondary',
          isOverdue ? 'text-error' : '',
        )}
      >
        <Calendar className="h-3.5 w-3.5" />
        {dueDate}
      </p>
    </article>
  );
}

function DraggableTaskCard({
  status,
  task,
  onOpenTask,
}: {
  status: BoardStatus;
  task: TaskCard;
  onOpenTask: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { status, task },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('cursor-grab touch-none', isDragging ? 'opacity-30' : '')}
      {...listeners}
      {...attributes}
    >
      <TaskCardView task={task} status={status} onOpenTask={onOpenTask} />
    </div>
  );
}

function BoardColumnView({
  column,
  onOpenTask,
}: {
  column: BoardColumn;
  onOpenTask: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.key,
    data: { status: column.key },
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex h-full min-h-[420px] w-[280px] min-w-[280px] max-w-[360px] flex-col rounded-xl border bg-bg-surface p-3',
        isOver ? 'border-primary-300 shadow-glow-primary' : 'border-border',
      )}
    >
      <header
        className={cn(
          'flex items-center justify-between rounded-lg border px-3 py-2',
          statusMeta[column.key].columnClass,
        )}
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide">
          {statusMeta[column.key].label}
        </h3>
        <span className="text-xs font-semibold">{column.count}</span>
      </header>

      <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
        {column.cards.length ? (
          column.cards.map((task) => (
            <DraggableTaskCard key={task.id} task={task} status={column.key} onOpenTask={onOpenTask} />
          ))
        ) : (
          <div className="grid h-24 place-items-center rounded-lg border border-dashed border-border text-xs text-text-tertiary">
            Drag tasks here
          </div>
        )}
      </div>
    </section>
  );
}

async function fetchBoardData(filters: BoardFilters): Promise<BoardData> {
  const queryString = toQueryString(filters);
  const response = await fetch(
    `/api/v1/views/board${queryString ? `?${queryString}` : ''}`,
    {
      credentials: 'include',
    },
  );

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | ApiErrorResponse
      | null;
    throw new Error(
      errorPayload?.error?.message ?? 'Unable to load board data.',
    );
  }

  const payload = (await response.json()) as BoardResponse;
  return payload.data;
}

async function updateTaskStatus(taskId: string, status: BoardStatus): Promise<void> {
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

  const errorPayload = (await response.json().catch(() => null)) as
    | ApiErrorResponse
    | null;
  throw new Error(errorPayload?.error?.message ?? 'Unable to move task.');
}

export default function BoardView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openTask } = useTaskQueryParam();
  const [board, setBoard] = useState<BoardData | null>(null);
  const [activeTask, setActiveTask] = useState<TaskCard | null>(null);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const filters = useMemo<BoardFilters>(
    () => ({
      area: getFilterValue(searchParams, 'area'),
      project: getFilterValue(searchParams, 'project'),
      executor: getFilterValue(searchParams, 'executor'),
      priority: getFilterValue(searchParams, 'priority'),
    }),
    [searchParams],
  );

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

    const statusListener = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as {
          new_status?: BoardStatus;
          task_id?: string;
        };

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
      } catch {
        return;
      }
    };

    eventSource.addEventListener(
      'task.status_changed',
      statusListener as EventListener,
    );

    return () => {
      eventSource.removeEventListener(
        'task.status_changed',
        statusListener as EventListener,
      );
      eventSource.close();
    };
  }, []);

  const pushToast = (toast: Omit<ToastNotice, 'id'>) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, ...toast }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  };

  const updateFilter = (key: keyof BoardFilters, value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }

    if (key === 'area') {
      nextParams.delete('project');
    }

    setSearchParams(nextParams, { replace: true });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const draggingTask = event.active.data.current?.task as TaskCard | undefined;
    setActiveTask(draggingTask ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const targetStatus = event.over?.id as BoardStatus | undefined;
    const sourceStatus = event.active.data.current?.status as BoardStatus | undefined;
    const draggingTask = event.active.data.current?.task as TaskCard | undefined;
    setActiveTask(null);

    if (!targetStatus || !sourceStatus || !draggingTask || sourceStatus === targetStatus) {
      return;
    }

    const currentBoard = board;
    if (!currentBoard) {
      return;
    }

    const optimisticBoard = moveTaskToStatus(
      currentBoard,
      draggingTask.id,
      targetStatus,
    );
    setBoard(optimisticBoard);

    try {
      await updateTaskStatus(draggingTask.id, targetStatus);
      void boardQuery.refetch();
    } catch (error) {
      setBoard(currentBoard);
      pushToast({
        title: 'Invalid status change',
        description:
          error instanceof Error
            ? error.message
            : 'Task could not be moved to that column.',
        variant: 'error',
      });
    }
  };

  const areaOptions = [
    { value: 'all', label: 'All Areas' },
    ...((board?.filters.areas ?? []).map((area) => ({
      value: area.id ?? 'all',
      label: area.name ?? 'Area',
    })) as Array<{ label: string; value: string }>),
  ];

  const projectOptions = [
    { value: 'all', label: 'All Projects' },
    ...((board?.filters.projects ?? []).map((project) => ({
      value: project.id ?? 'all',
      label: project.title ?? 'Project',
    })) as Array<{ label: string; value: string }>),
  ];

  const executorOptions = [
    { value: 'all', label: 'All Executors' },
    ...((board?.filters.executors ?? []).map((executor) => ({
      value: executor.value ?? 'all',
      label: executor.label ?? 'Executor',
    })) as Array<{ label: string; value: string }>),
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    ...((board?.filters.priorities ?? []).map((priority) => ({
      value: priority.value ?? 'all',
      label: priority.label ?? 'Priority',
    })) as Array<{ label: string; value: string }>),
  ];

  const hasCards = board?.columns.some((column) => column.cards.length > 0);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Card className="space-y-4 p-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-text-primary">
            Operations Board
          </h1>
          <p className="text-sm text-text-secondary">
            Drag tasks between status columns and filter by scope.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select
            label="Area"
            value={filters.area}
            options={areaOptions}
            onChange={(event) => updateFilter('area', event.target.value)}
          />
          <Select
            label="Project"
            value={filters.project}
            options={projectOptions}
            onChange={(event) => updateFilter('project', event.target.value)}
          />
          <Select
            label="Executor"
            value={filters.executor}
            options={executorOptions}
            onChange={(event) => updateFilter('executor', event.target.value)}
          />
          <Select
            label="Priority"
            value={filters.priority}
            options={priorityOptions}
            onChange={(event) => updateFilter('priority', event.target.value)}
          />
        </div>
      </Card>

      {boardQuery.isLoading && !board ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-[420px] rounded-xl" />
          ))}
        </div>
      ) : null}

      {boardQuery.isError ? (
        <Card>
          <EmptyState
            title="Unable to load board"
            description={
              boardQuery.error instanceof Error
                ? boardQuery.error.message
                : 'Please refresh and try again.'
            }
          />
        </Card>
      ) : null}

      {!boardQuery.isError && board ? (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={(event) => {
            void handleDragEnd(event);
          }}
        >
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-1">
            <div className="flex h-full min-w-max gap-3 pr-1">
              {board.columns.map((column) => (
                <BoardColumnView key={column.key} column={column} onOpenTask={openTask} />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="w-[280px] min-w-[280px] rotate-2">
                <TaskCardView task={activeTask} status={activeTask.status} dragging onOpenTask={() => undefined} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : null}

      {board && !hasCards ? (
        <Card>
          <EmptyState
            title="No tasks in this board"
            description="Try changing filters or create a new task."
          />
        </Card>
      ) : null}

      <div className="pointer-events-none fixed right-4 top-16 z-toast flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              title={toast.title}
              description={toast.description}
              variant={toast.variant}
              onClose={() =>
                setToasts((current) =>
                  current.filter((item) => item.id !== toast.id),
                )
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
