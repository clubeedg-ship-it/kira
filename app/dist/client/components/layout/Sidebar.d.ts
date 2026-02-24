interface SidebarProps {
    collapsed: boolean;
    canToggle: boolean;
    onToggle: () => void;
}
export default function Sidebar({ collapsed, canToggle, onToggle }: SidebarProps): import("react/jsx-runtime").JSX.Element;
export {};
