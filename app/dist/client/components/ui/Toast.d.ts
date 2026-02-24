type ToastVariant = 'success' | 'error' | 'info' | 'warning';
export interface ToastProps {
    title: string;
    description?: string;
    variant?: ToastVariant;
    actionLabel?: string;
    onAction?: () => void;
    onClose?: () => void;
}
export declare function Toast({ title, description, variant, actionLabel, onAction, onClose }: ToastProps): import("react/jsx-runtime").JSX.Element;
export {};
