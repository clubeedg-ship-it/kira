import { type ReactNode, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Button } from './Button';

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

export function Drawer({
  open,
  title,
  children,
  footer,
  onClose,
  hideHeader = false,
  panelClassName,
  contentClassName,
}: DrawerProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-30" aria-hidden={!open}>
      <button className="absolute inset-0 bg-black/20" onClick={onClose} aria-label="Close drawer" />
      <aside
        className={cn(
          'absolute right-0 top-0 h-full w-full max-w-[480px] border-l border-border bg-bg-raised shadow-lg',
          'flex flex-col',
          panelClassName
        )}
        role="dialog"
        aria-modal="true"
      >
        {hideHeader ? null : (
          <header className="flex h-14 items-center justify-between border-b border-border px-4">
            <h3 className="font-display text-lg font-semibold text-text-primary">{title}</h3>
            <Button variant="ghost" size="sm" aria-label="Close drawer" onClick={onClose}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </header>
        )}

        <div className={cn('flex-1 overflow-y-auto p-4', contentClassName)}>{children}</div>
        {footer ? <footer className="border-t border-border px-4 py-3">{footer}</footer> : null}
      </aside>
    </div>
  );
}
