import { useEffect } from 'react';
export function useGlobalShortcuts(onQuickAdd) {
    useEffect(() => {
        const handler = (e) => {
            // Cmd+K / Ctrl+K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                e.stopPropagation();
                onQuickAdd();
            }
        };
        window.addEventListener('keydown', handler, { capture: true });
        return () => window.removeEventListener('keydown', handler, { capture: true });
    }, [onQuickAdd]);
}
//# sourceMappingURL=useGlobalShortcuts.js.map