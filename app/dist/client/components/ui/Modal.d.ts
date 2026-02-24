import { type ReactNode } from 'react';
type ModalSize = 'sm' | 'md' | 'lg';
export interface ModalProps {
    open: boolean;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: ModalSize;
    onClose: () => void;
}
export declare function Modal({ open, title, children, footer, size, onClose }: ModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
