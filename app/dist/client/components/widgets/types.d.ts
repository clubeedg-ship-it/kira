export interface TodayHeaderData {
    dateLabel: string;
    greeting: string;
    needAttention: number;
    tasksToday: number;
}
export interface TopPriorityItem {
    dueDate: string | null;
    id: string;
    priority: number;
    priorityScore: number;
    project: string | null;
    title: string;
}
export interface InboxBreakdownItem {
    count: number;
    type: string;
}
export interface InboxBadgeData {
    breakdown: InboxBreakdownItem[];
    pendingCount: number;
}
export type AgentStatus = 'working' | 'idle' | 'waiting';
export interface ActiveAgentItem {
    currentTask: string | null;
    id: string;
    name: string;
    status: AgentStatus;
}
export interface KeyResultMetric {
    current: number;
    id: string;
    label: string;
    progress: number;
    target: number;
}
export interface ObjectiveProgressItem {
    id: string;
    keyResults: KeyResultMetric[];
    progress: number;
    title: string;
}
export interface RecentCompletionItem {
    completedAt: string | null;
    id: string;
    title: string;
}
export interface BlockerItem {
    dueDate: string | null;
    id: string;
    reason: string;
    title: string;
}
