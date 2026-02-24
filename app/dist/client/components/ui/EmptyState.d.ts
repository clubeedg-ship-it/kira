import { type ReactNode } from 'react';
export interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}
export declare function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps): import("react/jsx-runtime").JSX.Element;
