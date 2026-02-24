import { type ReactNode } from 'react';
export interface DrawerProps {
    open: boolean;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
    onClose: () => void;
    hideHeader?: boolean;
    panelClassName?: string;
    contentClassName?: string;
}
export declare function Drawer({ open, title, children, footer, onClose, hideHeader, panelClassName, contentClassName, }: DrawerProps): import("react/jsx-runtime").JSX.Element | null;
