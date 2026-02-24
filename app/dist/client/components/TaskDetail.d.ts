interface TaskDetailProps {
    open: boolean;
    taskId: string | null;
    onClose: () => void;
    onOpenTask: (taskId: string) => void;
}
export default function TaskDetail({ open, taskId, onClose, onOpenTask }: TaskDetailProps): import("react/jsx-runtime").JSX.Element | null;
export {};
